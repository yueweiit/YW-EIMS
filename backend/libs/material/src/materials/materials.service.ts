import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { ErpNextService } from '@eims/oa';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';
import type { ImportMaterialRowDto } from './dto/import-material.dto';

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

  async remove(id: number) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('物料不存在');
    await this.prisma.material.delete({ where: { id } });
    return null;
  }
}
