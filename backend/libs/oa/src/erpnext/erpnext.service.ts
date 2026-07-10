import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';
import type { Mold, Product, Material } from '@prisma/client';
import { PrismaService } from '@eims/database';
import type { ErpNextItemPayload, ErpNextSyncResult } from './erpnext.interface';
import {
  DEFAULT_ITEM_API_URL,
  DEFAULT_STOCK_UOM,
  DEFAULT_MOLD_ITEM_GROUP,
  DEFAULT_PRODUCT_ITEM_GROUP,
} from './erpnext.constants';

const MAPPING_TYPES = ['ITEM_GROUP', 'MOLD_ITEM_GROUP', 'PRODUCT_ITEM_GROUP', 'UNIT'] as const;
type MappingType = (typeof MAPPING_TYPES)[number];

@Injectable()
export class ErpNextService implements OnModuleInit {
  private readonly logger = new Logger(ErpNextService.name);

  private readonly apiUrl: string;
  private readonly authToken: string;

  private mappingCache: Map<string, Map<string, string>> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiUrl = this.configService.get<string>('ERPNEXT_ITEM_API_URL', DEFAULT_ITEM_API_URL);
    this.authToken = this.configService.get<string>('ERPNEXT_AUTH_TOKEN', '');
  }

  async onModuleInit() {
    await this.loadMappings();
  }

  async reloadMappings() {
    await this.loadMappings();
  }

  private async loadMappings() {
    const rows = await this.prisma.erpNextMapping.findMany();
    const grouped = new Map<string, Map<string, string>>();

    for (const type of MAPPING_TYPES) {
      grouped.set(type, new Map());
    }

    for (const row of rows) {
      const group = grouped.get(row.type);
      if (group) {
        group.set(row.sourceKey, row.targetValue);
      }
    }

    this.mappingCache = grouped;
    this.logger.log(`已加载 ${rows.length} 条 ERPNext 映射配置`);
  }

  private getMapping(type: MappingType, key: string, fallback: string): string {
    const normalizedKey = String(key || '').trim();
    const group = this.mappingCache.get(type);
    return group?.get(normalizedKey) || fallback;
  }

  // ─── Public API ────────────────────────────────────────

  async syncMold(mold: Mold): Promise<ErpNextSyncResult> {
    const payload = this.buildMoldItemPayload(mold);
    return this.createItem(payload);
  }

  async syncProduct(product: Product): Promise<ErpNextSyncResult> {
    const payload = this.buildProductItemPayload(product);
    return this.createItem(payload);
  }

  async syncMolds(molds: Mold[]): Promise<ErpNextSyncResult[]> {
    const results: ErpNextSyncResult[] = [];
    for (const mold of molds) {
      try {
        results.push(await this.syncMold(mold));
      } catch (error) {
        this.logger.error(`ERPNext sync failed for mold ${mold.itemCode}: ${error}`);
        results.push({
          success: false,
          message: error instanceof Error ? error.message : String(error),
          itemCode: mold.itemCode,
        });
      }
    }
    return results;
  }

  async syncProducts(products: Product[]): Promise<ErpNextSyncResult[]> {
    const results: ErpNextSyncResult[] = [];
    for (const product of products) {
      try {
        results.push(await this.syncProduct(product));
      } catch (error) {
        this.logger.error(`ERPNext sync failed for product ${product.itemCode}: ${error}`);
        results.push({
          success: false,
          message: error instanceof Error ? error.message : String(error),
          itemCode: product.itemCode,
        });
      }
    }
    return results;
  }

  async syncMaterial(material: Material): Promise<ErpNextSyncResult> {
    const payload = this.buildMaterialItemPayload(material);
    return this.createItem(payload);
  }

  async syncMaterials(materials: Material[]): Promise<ErpNextSyncResult[]> {
    const results: ErpNextSyncResult[] = [];
    for (const material of materials) {
      try {
        results.push(await this.syncMaterial(material));
      } catch (error) {
        this.logger.error(`ERPNext sync failed for material ${material.code}: ${error}`);
        results.push({
          success: false,
          message: error instanceof Error ? error.message : String(error),
          itemCode: material.code ?? undefined,
        });
      }
    }
    return results;
  }

  // ─── Payload builders ──────────────────────────────────

  private buildMoldItemPayload(mold: Mold): ErpNextItemPayload {
    const itemGroup = this.getMoldItemGroup(mold.typeCode);

    return {
      item_code: mold.itemCode,
      item_name: mold.moldName || mold.itemCode,
      item_group: itemGroup,
      stock_uom: DEFAULT_STOCK_UOM,
      custom_specifications: mold.typeName || '',
      custom_external_code: mold.itemCode,
      custom_short_name: mold.phoneName || mold.moldName,
      custom_mnemonic_code: mold.itemCode,
      custom_dpci: '',
      is_stock_item: 1,
      is_sales_item: 1,
      is_purchase_item: 1,
    };
  }

  private buildProductItemPayload(product: Product): ErpNextItemPayload {
    const itemGroup = this.getProductItemGroup(product.productCode);

    return {
      item_code: product.itemCode,
      item_name: product.productName || product.itemCode,
      item_group: itemGroup,
      stock_uom: DEFAULT_STOCK_UOM,
      custom_specifications: product.colorName || '',
      custom_external_code: product.itemCode,
      custom_short_name: product.phoneShortName || product.productName,
      custom_mnemonic_code: product.itemCode,
      custom_dpci: '',
      is_stock_item: 1,
      is_sales_item: 1,
      is_purchase_item: 1,
    };
  }

  // ─── ERPNext API call ──────────────────────────────────

  private async createItem(payload: ErpNextItemPayload): Promise<ErpNextSyncResult> {
    if (!this.authToken) {
      return {
        success: false,
        skipped: true,
        message: 'ERPNext 未配置 ERPNEXT_AUTH_TOKEN，已跳过创建物料',
      };
    }

    this.logger.log(`创建物料: item_code=${payload.item_code}, item_group=${payload.item_group}`);

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            Authorization: this.getAuthorizationHeader(),
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      return {
        success: true,
        message: 'ERPNext 物料创建成功',
        itemCode: payload.item_code,
        itemGroup: payload.item_group,
        data: response.data,
      };
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { _server_messages?: string; exception?: string; message?: string; exc_type?: string }; status?: number };
        message?: string;
      };

      const responseData = axiosError.response?.data;
      const statusCode = axiosError.response?.status;
      const serverMessage =
        responseData?._server_messages || responseData?.exception || responseData?.message;

      // Duplicate item — treat as success (skipped)
      if (
        statusCode === 409 ||
        (typeof serverMessage === 'string' && serverMessage.includes('already exists')) ||
        responseData?.exc_type === 'DuplicateEntryError'
      ) {
        this.logger.warn(`物料已存在: item_code=${payload.item_code}`);
        return {
          success: true,
          skipped: true,
          message: 'Item already exists',
          itemCode: payload.item_code,
          itemGroup: payload.item_group,
          status: statusCode,
        };
      }

      this.logger.error(
        `创建物料失败: item_code=${payload.item_code}, status=${statusCode || ''}, message=${serverMessage || axiosError.message}`,
      );

      return {
        success: false,
        message: (typeof serverMessage === 'string' ? serverMessage : null) || axiosError.message || 'ERPNext 物料创建失败',
        status: statusCode,
        itemCode: payload.item_code,
        itemGroup: payload.item_group,
        data: responseData,
      };
    }
  }

  // ─── Helpers ───────────────────────────────────────────

  private buildMaterialItemPayload(material: Material): ErpNextItemPayload {
    const itemGroup = this.getMaterialItemGroup(material.codePrefix ?? undefined);
    const stockUom = this.getMapping('UNIT', material.unit ?? '', DEFAULT_STOCK_UOM);

    return {
      item_code: material.code || '',
      item_name: material.materialName,
      item_group: itemGroup,
      stock_uom: stockUom,
      custom_specifications: material.specifications || '',
      custom_external_code: material.code || '',
      custom_short_name: material.materialName,
      custom_mnemonic_code: material.code || '',
      custom_dpci: '',
      is_stock_item: 1,
      is_sales_item: 1,
      is_purchase_item: 1,
    };
  }

  private getMaterialItemGroup(codePrefix?: string): string {
    const prefix = String(codePrefix || '').trim().toUpperCase();
    return this.getMapping('ITEM_GROUP', prefix, DEFAULT_MOLD_ITEM_GROUP);
  }

  private getMoldItemGroup(typeCode: string): string {
    const code = String(typeCode || '').trim().toUpperCase();
    return this.getMapping('MOLD_ITEM_GROUP', code, DEFAULT_MOLD_ITEM_GROUP);
  }

  private getProductItemGroup(processCode: string): string {
    const code = String(processCode || '').trim().toUpperCase();
    return this.getMapping('PRODUCT_ITEM_GROUP', code, DEFAULT_PRODUCT_ITEM_GROUP);
  }

  private getAuthorizationHeader(): string {
    const token = String(this.authToken || '').trim();
    if (!token) return '';
    if (/^(token|bearer)\s+/i.test(token)) return token;
    return `token ${token}`;
  }

  /** Exposed for tests or external callers that need the group mapping. */
  getItemGroup(prefix: string, itemCode?: string): string | null {
    const normalizedPrefix = String(prefix || '').trim().toUpperCase();
    const result = this.getMapping('ITEM_GROUP', normalizedPrefix, '');
    if (result) return result;
    const codePrefix = String(itemCode || '').trim().slice(0, 2).toUpperCase();
    return this.getMapping('ITEM_GROUP', codePrefix, '') || null;
  }
}
