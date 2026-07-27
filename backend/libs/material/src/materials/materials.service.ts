import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { ErpNextService } from '@eims/oa';
import type { ErpNextItemQueryResult } from '@eims/oa';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import type { ImportMaterialRowDto } from './dto/import-material.dto';

export interface ImportExistingMaterialRow {
  applicant?: string;
  materialName: string;
  code: string;
  unit?: string;
  specifications?: string;
  applicationDate?: string;
}

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly erpNextService: ErpNextService,
  ) {}

  async findPage(query: QueryMaterialDto) {
    const {
      current = 1,
      size = 10,
      applicant,
      materialName,
      code,
      codePrefix,
      unitCode,
      unit,
    } = query;
    const where: {
      applicant?: { contains: string };
      materialName?: { contains: string };
      code?: { contains: string };
      codePrefix?: { contains: string };
      unitCode?: { contains: string };
      unit?: { contains: string };
    } = {};
    if (applicant) where.applicant = { contains: applicant };
    if (materialName) where.materialName = { contains: materialName };
    if (code) where.code = { contains: code };
    if (codePrefix) where.codePrefix = { contains: codePrefix };
    if (unitCode) where.unitCode = { contains: unitCode };
    if (unit) where.unit = { contains: unit };

    const [records, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.material.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('物料不存在');
    return material;
  }

  async create(dto: CreateMaterialDto) {
    const codePrefix = dto.codePrefix.toUpperCase();
    const rule = await this.prisma.materialCodeRule.findUnique({ where: { codePrefix } });
    if (!rule) throw new NotFoundException(`编码前缀 ${codePrefix} 不存在`);
    const explainContent = rule.explainContent;
    const codeKey = rule.prefixLength
      ? codePrefix.substring(0, rule.prefixLength)
      : codePrefix;
    const code = await this.generateCode(codeKey);
    const unitRecord = dto.unit
      ? await this.prisma.unit.findFirst({ where: { unit: dto.unit } })
      : null;
    const unitCode = unitRecord?.unitCode ?? null;

    const material = await this.prisma.material.create({
      data: {
        applicant: dto.applicant,
        materialName: dto.materialName,
        code,
        unit: dto.unit,
        specifications: dto.specifications,
        codePrefix,
        explainContent,
        unitCode,
      },
    });

    this.erpNextService.syncMaterial(material).catch(err => {
      this.logger.error(`ERPNext sync failed for material ${material.code}: ${err}`);
    });

    return material;
  }

  async update(id: number, dto: UpdateMaterialDto) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('物料不存在');

    const data: Prisma.MaterialUncheckedUpdateInput = {
      applicant: dto.applicant,
      materialName: dto.materialName,
      unit: dto.unit,
      specifications: dto.specifications,
    };
    // Remove undefined keys so Prisma doesn't set them to null
    for (const key of Object.keys(data)) {
      const k = key as keyof typeof data;
      if (data[k] === undefined) delete data[k];
    }

    if (dto.codePrefix) {
      data.codePrefix = dto.codePrefix.toUpperCase();
      const rule = await this.prisma.materialCodeRule.findUnique({
        where: { codePrefix: data.codePrefix },
      });
      if (!rule) throw new NotFoundException(`编码前缀 ${data.codePrefix} 不存在`);
      data.explainContent = rule.explainContent;
      const codeKey = rule.prefixLength
        ? data.codePrefix.substring(0, rule.prefixLength)
        : data.codePrefix;
      data.code = await this.generateCode(codeKey);
    }

    if (dto.unit) {
      const unitRecord = await this.prisma.unit.findFirst({
        where: { unit: dto.unit },
      });
      data.unitCode = unitRecord?.unitCode ?? null;
    }

    return this.prisma.material.update({ where: { id }, data });
  }

  async generateCode(prefix: string) {
    const latest = await this.prisma.material.findFirst({
      where: { codePrefix: prefix },
      orderBy: { code: 'desc' },
    });

    if (!latest || !latest.code) {
      return `${prefix}000001`;
    }

    const currentNum = parseInt(latest.code.slice(prefix.length), 10);
    const nextNum = currentNum + 1;
    return `${prefix}${String(nextNum).padStart(6, '0')}`;
  }

  async batchCreate(rows: ImportMaterialRowDto[]) {
    if (!rows.length) throw new BadRequestException('导入数据不能为空');

    const rules = await this.prisma.materialCodeRule.findMany();
    const ruleMap = new Map(rules.map(r => [r.codePrefix, r]));

    const units = await this.prisma.unit.findMany();
    const unitMap = new Map(units.map(u => [u.unit, u]));

    const errors: string[] = [];
    const toCreate: {
      applicant: string;
      materialName: string;
      code: string;
      unit: string | null;
      specifications: string | null;
      codePrefix: string;
      explainContent: string;
      unitCode: string | null;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2;
      const prefix = row.codePrefix.toUpperCase();
      const rule = ruleMap.get(prefix);

      if (!rule) {
        errors.push(`第${line}行: 编码前缀 "${row.codePrefix}" 不存在`);
        continue;
      }

      const codeKey = rule.prefixLength
        ? prefix.substring(0, rule.prefixLength)
        : prefix;
      const code = await this.generateCode(codeKey);

      const unitRecord = row.unit ? unitMap.get(row.unit) : null;
      if (row.unit && !unitRecord) {
        errors.push(`第${line}行: 单位 "${row.unit}" 不存在，已跳过单位`);
      }

      toCreate.push({
        applicant: row.applicant,
        materialName: row.materialName,
        code,
        unit: row.unit || null,
        specifications: row.specifications || null,
        codePrefix: prefix,
        explainContent: rule.explainContent,
        unitCode: unitRecord?.unitCode ?? null,
      });
    }

    if (toCreate.length > 0) {
      const createdMaterials = await this.prisma.$transaction(
        toCreate.map(data => this.prisma.material.create({ data }))
      );

      this.erpNextService.syncMaterials(createdMaterials).catch(err => {
        this.logger.error(`ERPNext batch sync failed for materials: ${err}`);
      });
    }

    return {
      success: toCreate.length,
      failed: errors.length,
      errors,
    };
  }

  /**
   * 按物料编码查詢：先查本地，本地没有则从 DeepLinkERP 查詢
   */
  async lookupByCode(code: string) {
    // 1. 先查本地数据库
    const local = await this.prisma.material.findFirst({
      where: { code },
    });

    if (local) {
      return {
        source: 'local' as const,
        data: local,
      };
    }

    // 2. 本地没有，从 DeepLinkERP 查询
    const erpItem = await this.erpNextService.getItem(code);

    if (erpItem) {
      return {
        source: 'erp' as const,
        data: erpItem,
      };
    }

    // 3. 都没有
    throw new NotFoundException(`物料编码 ${code} 在本地和 ERP 中均未找到`);
  }

  /**
   * 从 DeepLinkERP 同步所有物料到本地
   * 已存在的跳过，不存在的自动创建
   */
  async syncFromErp() {
    const result = {
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 1. 先取出本地已有的所有物料编码
    const existingCodes = new Set(
      (
        await this.prisma.material.findMany({
          select: { code: true },
          where: { code: { not: null } },
        })
      )
        .map((m) => m.code)
        .filter((c): c is string => c !== null),
    );

    // 2. 分页拉取 ERP 全部物料
    const pageSize = 200;
    let limitStart = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await this.erpNextService.listItems(limitStart, pageSize);
      result.total += page.items.length;
      hasMore = page.hasMore;
      limitStart += pageSize;

      // 3. 过滤出本地不存在的
      const newItems = page.items.filter(
        (item) => !existingCodes.has(item.item_code),
      );

      // 4. 批量插入
      for (const item of newItems) {
        try {
          await this.prisma.material.create({
            data: {
              applicant: 'ERP_SYNC',
              materialName: item.item_name,
              code: item.item_code,
              unit: item.stock_uom || null,
              specifications: item.description || null,
              codePrefix: null,
              explainContent: item.item_group || null,
              unitCode: null,
            },
          });
          existingCodes.add(item.item_code);
          result.created++;
        } catch (err: any) {
          result.failed++;
          const msg = `${item.item_code}: ${err?.message || err}`;
          result.errors.push(msg);
          this.logger.error(`同步物料失败: ${msg}`);
        }
      }

      result.skipped += page.items.length - newItems.length;
    }

    this.logger.log(
      `ERP 物料同步完成: 共 ${result.total} 条, 新增 ${result.created}, 跳过 ${result.skipped}, 失败 ${result.failed}`,
    );

    return result;
  }

  /**
   * 导入已有编码的物料（不生成新编码，已存在的跳过）
   */
  async importExisting(rows: ImportExistingMaterialRow[]) {
    if (!rows.length) throw new BadRequestException('导入数据不能为空');

    // 1. 取出所有编码
    const codes = rows.map((r) => r.code).filter(Boolean);

    // 2. 查本地已存在的
    const existing = new Set(
      (
        await this.prisma.material.findMany({
          where: { code: { in: codes } },
          select: { code: true },
        })
      )
        .map((m) => m.code)
        .filter((c): c is string => c !== null),
    );

    // 3. 过滤出需要新增的
    const toCreate = rows.filter((r) => !existing.has(r.code));

    if (toCreate.length === 0) {
      return { created: 0, skipped: rows.length, failed: 0, errors: [] };
    }

    // 4. 批量插入
    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of toCreate) {
      try {
        await this.prisma.material.create({
          data: {
            applicant: row.applicant || 'IMPORT',
            materialName: row.materialName,
            code: row.code,
            unit: row.unit || null,
            specifications: row.specifications || null,
            applicationDate: row.applicationDate
              ? new Date(row.applicationDate)
              : new Date(),
            codePrefix: null,
            explainContent: null,
            unitCode: null,
          },
        });
        created++;
      } catch (err: any) {
        failed++;
        const msg = `${row.code}: ${err?.message || err}`;
        errors.push(msg);
        this.logger.error(`导入物料失败: ${msg}`);
      }
    }

    this.logger.log(
      `导入完成: 共 ${rows.length} 条, 新增 ${created}, 跳过 ${existing.size}, 失败 ${failed}`,
    );

    return { created, skipped: existing.size, failed, errors };
  }

  async remove(id: number) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('物料不存在');
    await this.prisma.material.delete({ where: { id } });
    return null;
  }
}
