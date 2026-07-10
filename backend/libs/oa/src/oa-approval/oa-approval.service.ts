import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { DingTalkService } from '../dingtalk/dingtalk.service';
import { ErpService } from '../erp/erp.service';
import { MaterialMatcher } from '../helpers/material-matcher';
import type { ParsedApprovalDetail, TimelineEntry, DingTalkProcessInstance } from '../dingtalk/dingtalk.interface';
import type { SyncErpDto, ErpPurchaseOrderPayload, ErpPurchaseOrderLine } from '../erp/erp.interface';
import * as fs from 'fs';
import * as path from 'path';

const FALLBACK_MATERIAL_CODE = 'RC000079';
const FALLBACK_VENDOR_CODE = 'GYS00029';
const ERP_FIELD_OA_CODE = 'tz0001';
const ERP_FIELD_WAYBILL = 'TZ05';

@Injectable()
export class OaApprovalService {
  private readonly logger = new Logger(OaApprovalService.name);
  private processCodesCache: string[] | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dingTalkService: DingTalkService,
    private readonly erpService: ErpService,
    private readonly materialMatcher: MaterialMatcher,
  ) {}

  async checkCache(oaCode: string): Promise<boolean> {
    const mapping = await this.prisma.oaMapping.findUnique({
      where: { oaCode },
    });
    return !!mapping;
  }

  async getApprovalDetail(oaCode: string): Promise<ParsedApprovalDetail | null> {
    // Check cache first
    const cached = await this.prisma.oaMapping.findUnique({
      where: { oaCode: String(oaCode) },
    });

    if (cached) {
      this.logger.log(`Cache hit for OA code: ${oaCode}`);
      const instance = await this.dingTalkService.getInstanceDetail(cached.instanceId);
      if (instance) {
        return this.parseDingtalkInstanceDetail(instance, oaCode, cached.instanceId);
      }
    }

    // Carpet search
    this.logger.log(`Cache miss, starting carpet search for: ${oaCode}`);
    return this.carpetSearch(oaCode);
  }

  private async carpetSearch(oaCode: string): Promise<ParsedApprovalDetail | null> {
    const processCodes = await this.loadProcessCodes();
    if (processCodes.length === 0) return null;

    const token = await this.dingTalkService.getAccessToken();
    if (!token) return null;

    // Determine time range from OA code
    const match = String(oaCode).match(/^(\d{4})(\d{2})(\d{2})/);
    let startTime: number;
    let endTime: number;

    if (match) {
      const [, year, month, day] = match;
      try {
        const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        startTime = targetDate.getTime() - 2 * 24 * 60 * 60 * 1000;
        endTime = targetDate.getTime() + 2 * 24 * 60 * 60 * 1000;
      } catch {
        endTime = Date.now();
        startTime = endTime - 365 * 24 * 60 * 60 * 1000;
      }
    } else {
      endTime = Date.now();
      startTime = endTime - 365 * 24 * 60 * 60 * 1000;
    }

    // Search across all process codes concurrently
    const searchPromises = processCodes.map(processCode =>
      this.searchInSingleProcess(token, processCode, oaCode, startTime, endTime),
    );

    const results = await Promise.allSettled(searchPromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const detail = result.value;
        // Cache the result
        await this.cacheResult(oaCode, detail);
        return detail;
      }
    }

    return null;
  }

  private async searchInSingleProcess(
    token: string,
    processCode: string,
    targetBizId: string,
    startTime: number,
    endTime: number,
  ): Promise<ParsedApprovalDetail | null> {
    const instanceIds = await this.dingTalkService.getInstanceIds(processCode, startTime, endTime);

    for (const instanceId of instanceIds) {
      const instance = await this.dingTalkService.getInstanceDetail(instanceId);
      if (instance && instance.business_id === targetBizId) {
        const detail = this.parseDingtalkInstanceDetail(instance, targetBizId, instanceId);
        return detail;
      }
    }

    return null;
  }

  private async cacheResult(oaCode: string, detail: ParsedApprovalDetail): Promise<void> {
    try {
      const dingCreateTime = this.normalizeDingCreateTime(detail['创建时间']);
      await this.prisma.oaMapping.upsert({
        where: { oaCode: String(oaCode) },
        create: {
          oaCode: String(oaCode),
          instanceId: detail.instance_id,
          formName: detail['表单名称'],
          dingCreateTime,
        },
        update: {
          instanceId: detail.instance_id,
          formName: detail['表单名称'],
          dingCreateTime,
          updateTime: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to cache OA mapping: ${error.message}`);
    }
  }

  private normalizeDingCreateTime(value: any): Date | null {
    if (!value || value === '--') return null;
    const text = String(value).trim();
    if (/^\d+$/.test(text)) {
      let timestamp = parseInt(text, 10);
      if (timestamp > 10_000_000_000) {
        timestamp = timestamp / 1000;
      }
      return new Date(timestamp * 1000);
    }
    const date = new Date(text);
    return isNaN(date.getTime()) ? null : date;
  }

  private async parseDingtalkInstanceDetail(
    processInstance: DingTalkProcessInstance,
    targetBizId: string,
    instanceId: string,
  ): Promise<ParsedApprovalDetail> {
    const creatorId = processInstance.originator_userid || '';
    const deptId = processInstance.originator_dept_id || '';
    const formName = (processInstance.title || '未命名表单').replace('的审批', '');
    const officialUrl = processInstance.url ||
      `https://aflow.dingtalk.com/dingtalk/pc/query/pchomepage.htm#/approval?procInstId=${instanceId}`;

    const [creatorName, deptName] = await Promise.all([
      this.materialMatcher.resolveEmployeeName(creatorId),
      this.materialMatcher.resolveDepartmentName(deptId),
    ]);

    const result: ParsedApprovalDetail = {
      '表单名称': formName,
      '审批编号': targetBizId,
      '审批状态': processInstance.status || '未知',
      '创建人': creatorId ? creatorName : '--',
      '创建人部门': deptId ? deptName : '--',
      '创建时间': processInstance.create_time || '--',
      'instance_id': instanceId,
      'dingtalk_url': officialUrl,
      '抄送人列表': [],
      'timeline': [],
    };

    // Resolve CC users
    const ccUserids = processInstance.cc_userids || [];
    result['抄送人列表'] = await Promise.all(
      ccUserids.filter(Boolean).map(uid => this.materialMatcher.resolveEmployeeName(uid)),
    );

    // Build timeline
    const timeline: TimelineEntry[] = [];
    for (const op of processInstance.operation_records || []) {
      const opUserid = op.userid || '';
      const opType = op.operation_type || '';
      let remark = op.remark || '';
      const stepImgs: { name: string; url: string }[] = [];
      const stepFiles: { name: string; url: string }[] = [];
      let hasRestrictedAttachment = false;

      // Extract images from markdown in remark
      if (remark) {
        const mdImgs = remark.match(/!\[.*?\]\((.*?)\)/g) || [];
        for (const mdImg of mdImgs) {
          const urlMatch = mdImg.match(/!\[.*?\]\((.*?)\)/);
          if (urlMatch?.[1]?.startsWith('http')) {
            stepImgs.push({ name: '留言附图', url: urlMatch[1] });
          }
        }
        remark = remark.replace(/!\[.*?\]\(.*?\)/g, '').trim();
      }

      // Process attachments
      let attachments: any[] = [];
      if (typeof op.attachments === 'string') {
        try { attachments = JSON.parse(op.attachments); } catch { attachments = []; }
      } else if (Array.isArray(op.attachments)) {
        attachments = op.attachments;
      } else if (op.attachments && typeof op.attachments === 'object') {
        attachments = [op.attachments];
      }

      for (const att of attachments) {
        const fileUrl = String(att.url || att.file_url || att.download_url || '');
        if (fileUrl.startsWith('http')) {
          const fileName = String(att.file_name || att.fileName || '附件');
          stepFiles.push({ name: fileName, url: fileUrl });
        } else {
          hasRestrictedAttachment = true;
        }
      }

      if (op.images?.length) {
        hasRestrictedAttachment = true;
      }

      // Determine action text
      let actionText = opType;
      if (opType === 'START_PROCESS_INSTANCE') actionText = '发起申请';
      else if (opType === 'EXECUTE_TASK_NORMAL') {
        if (op.operation_result === 'AGREE') actionText = '审批同意';
        else if (op.operation_result === 'REFUSE') actionText = '审批拒绝';
        else actionText = '审批';
      } else if (opType === 'ADD_REMARK') actionText = '添加了评论';
      else if (opType === 'CC') actionText = '抄送给对方';
      else if (opType === 'REDIRECT_PROCESS') actionText = '转交';

      const opName = opUserid ? await this.materialMatcher.resolveEmployeeName(opUserid) : '系统';

      timeline.push({
        time: op.date || '',
        name: opName,
        action: actionText,
        remark,
        images: stepImgs,
        files: stepFiles,
        has_restricted: hasRestrictedAttachment,
      });
    }
    result['timeline'] = timeline;

    // Parse form component values
    for (const item of processInstance.form_component_values || []) {
      const name = item.name || '未命名';
      let value = item.value || '';
      if (value === 'null' || !value || !String(value).trim()) continue;
      result[name] = value;
    }

    // Auto-match material codes in table fields
    await this.autoMatchMaterialCodes(result);

    return result;
  }

  private async autoMatchMaterialCodes(result: ParsedApprovalDetail): Promise<void> {
    const INVALID_CODES = new Set([
      '/', 'S/C', '无', 'N/A', 'NA', '0', '-', '\\', 'S/C.', 'S/C ', 'S/C\n',
    ]);

    for (const [key, val] of Object.entries(result)) {
      if (typeof val !== 'string' || !val.trim().startsWith('[')) continue;

      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].rowValue) continue;

        let modified = false;
        for (const row of parsed) {
          let codeField: any = null;
          let nameField: any = null;

          for (const c of row.rowValue || []) {
            const lbl = c.label || '';
            if (lbl.includes('编码') || lbl.includes('Código')) codeField = c;
            else if (lbl.includes('名称') || lbl.includes('Nombre')) nameField = c;
          }

          if (codeField && nameField) {
            const codeVal = String(codeField.value || '').trim().toUpperCase();
            const nameVal = String(nameField.value || '').trim();

            if (!codeVal || INVALID_CODES.has(codeVal)) {
              const matched = await this.materialMatcher.getMaterialInfo(nameVal);
              codeField.value = matched ? matched.code : '⚠️需手动匹配';
              modified = true;
            }
          }
        }

        if (modified) {
          result[key] = JSON.stringify(parsed);
        }
      } catch {
        // Skip non-JSON values
      }
    }
  }

  async syncToErp(dto: SyncErpDto, oaDetails: Record<string, any>) {
    const approvalStatus = oaDetails['审批状态'] || '';
    if (approvalStatus && approvalStatus !== 'COMPLETED' && approvalStatus !== '已完成') {
      throw new BadRequestException(`审批状态为 ${approvalStatus}，仅已完成审批允许推送`);
    }

    const orgCode = dto.org === '星铭' ? '80' : '81';
    const deptCode = dto.org === '星铭' ? '8001' : '8101';

    // Resolve vendor code
    let vendorCode = dto.supplier_code || await this.materialMatcher.getSupplierCode(dto.supplier);

    // Find table rows from OA details
    let tableRows: any[] = [];
    for (const val of Object.values(oaDetails)) {
      if (typeof val !== 'string' || !val.trim().startsWith('[')) continue;
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].rowValue) {
          tableRows = parsed;
          break;
        }
      } catch {
        // skip
      }
    }

    if (!tableRows.length) {
      throw new BadRequestException('未识别到可推送的明细行');
    }

    // Build purchase order lines
    const purchaseOrders: ErpPurchaseOrderLine[] = [];
    let totalDocSum = 0;

    for (const row of tableRows) {
      const rowMap: Record<string, string> = {};
      for (const c of row.rowValue || []) {
        rowMap[c.label] = c.value || '';
      }

      const oaMaterialName = rowMap['物品名称Nombre del artículo'] || rowMap['物品名称'] || rowMap['物料名称'] || '';
      const rawMaterialCode = rowMap['物品编码Código'] || rowMap['物品编码'] || rowMap['ODT / 订单号'] || '';

      let realMaterialCode: string;
      if (rawMaterialCode && !this.materialMatcher.isInvalidCode(rawMaterialCode)) {
        realMaterialCode = rawMaterialCode.trim().toUpperCase();
      } else {
        realMaterialCode = await this.materialMatcher.getMaterialCode(oaMaterialName);
      }

      const oaUnitName = rowMap['单位Unidad'] || rowMap['单位'] || rowMap['计量单位'] || '';
      const realUnitCode = await this.materialMatcher.getUnitCode(oaUnitName);

      const taxCodeFromFront = dto.tax_code;
      let realTaxCode: string;
      if (taxCodeFromFront) {
        realTaxCode = taxCodeFromFront;
      } else {
        const oaTaxName = rowMap['税率'] || rowMap['税'] || '';
        realTaxCode = await this.materialMatcher.getTaxCode(oaTaxName);
      }

      let qty = this.parseFloat(rowMap['数量Cantidad'] || rowMap['数量'] || '0');
      let price = this.parseFloat(rowMap['单价Precio'] || rowMap['单价'] || '0');
      let total = this.parseFloat(rowMap['总金额Monto Total'] || rowMap['总金额'] || '0');

      if (total === 0 && qty > 0 && price > 0) {
        total = qty * price;
      }

      totalDocSum += total;

      purchaseOrders.push({
        _status: 'Insert',
        product_cCode: realMaterialCode,
        qty, subQty: qty, priceQty: qty,
        oriTaxUnitPrice: price, oriUnitPrice: price,
        oriSum: total, oriMoney: total, oriTax: 0,
        natTaxUnitPrice: price, natUnitPrice: price,
        natSum: total, natMoney: total, natTax: 0,
        purUOM_Code: realUnitCode, priceUOM_Code: realUnitCode, unit_code: realUnitCode,
        invExchRate: 1, invPriceExchRate: 1,
        unitExchangeTypePrice: 0, unitExchangeType: 0,
        taxitems_code: realTaxCode,
        inInvoiceOrg_code: orgCode, inOrg_code: orgCode, demandOrg_code: orgCode,
      });
    }

    const remarkText = dto.remark || '';
    const memo = remarkText ? `由系统自动推送。备注:${remarkText}` : '由系统自动推送。';

    const payload: ErpPurchaseOrderPayload = {
      data: {
        _status: 'Insert',
        org_code: orgCode,
        department_code: deptCode,
        department: deptCode,
        vouchdate: dto.doc_date || '',
        bustype_code: 'A20001',
        vendor_code: vendorCode,
        invoiceVendor_code: vendorCode,
        currency_code: 'CNY',
        natCurrency_code: 'CNY',
        exchRate: 1,
        exchRateType: '01',
        exchRateType_code: '01',
        bAutoGetPriceForApi: false,
        natMoney: totalDocSum,
        natSum: totalDocSum,
        oriMoney: totalDocSum,
        oriSum: totalDocSum,
        memo,
        purchaseOrderDefineCharacter: {
          [ERP_FIELD_OA_CODE]: dto.oa_code || '',
          [ERP_FIELD_WAYBILL]: dto.waybill || '',
        },
        purchaseOrders,
      },
    };

    return this.erpService.pushPurchaseOrder(payload);
  }

  private parseFloat(value: string): number {
    const num = parseFloat(String(value).trim().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
  }

  private async loadProcessCodes(): Promise<string[]> {
    if (this.processCodesCache) return this.processCodesCache;

    try {
      const filePath = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'EIMS-System', 'backend', 'oa', 'all_forms_list.txt');
      const content = fs.readFileSync(filePath, 'utf-8');
      const codes = content.match(/PROC-[A-Z0-9\-]+/g) || [];
      this.processCodesCache = [...new Set(codes)];
    } catch {
      this.logger.warn('Could not load all_forms_list.txt, carpet search will not work');
      this.processCodesCache = [];
    }

    return this.processCodesCache;
  }
}
