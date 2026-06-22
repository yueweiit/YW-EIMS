import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { QueryMaterialDto } from './dto/query-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const codePrefix = dto.code
      ? (/^[A-Za-z]+/.exec(dto.code)?.[0]?.toUpperCase() ?? null)
      : null;
    const rule = codePrefix
      ? await this.prisma.materialCodeRule.findUnique({ where: { codePrefix } })
      : null;
    const explainContent = rule?.explainContent ?? '未定义前缀说明';
    const unitRecord = dto.unit
      ? await this.prisma.unit.findFirst({ where: { unit: dto.unit } })
      : null;
    const unitCode = unitRecord?.unitCode ?? null;

    return this.prisma.material.create({
      data: {
        applicant: dto.applicant,
        materialName: dto.materialName,
        code: dto.code,
        unit: dto.unit,
        specifications: dto.specifications,
        codePrefix,
        explainContent,
        unitCode,
      },
    });
  }

  async update(id: number, dto: UpdateMaterialDto) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('物料不存在');

    const data: Prisma.MaterialUncheckedUpdateInput = {
      applicant: dto.applicant,
      materialName: dto.materialName,
      code: dto.code,
      unit: dto.unit,
      specifications: dto.specifications,
    };
    // Remove undefined keys so Prisma doesn't set them to null
    for (const key of Object.keys(data)) {
      const k = key as keyof typeof data;
      if (data[k] === undefined) delete data[k];
    }

    if (dto.code) {
      data.codePrefix = /^[A-Za-z]+/.exec(dto.code)?.[0]?.toUpperCase() ?? null;
      const rule = data.codePrefix
        ? await this.prisma.materialCodeRule.findUnique({
            where: { codePrefix: data.codePrefix },
          })
        : null;
      data.explainContent = rule?.explainContent ?? '未定义前缀说明';
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

  async remove(id: number) {
    const existing = await this.prisma.material.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('物料不存在');
    await this.prisma.material.delete({ where: { id } });
    return null;
  }
}
