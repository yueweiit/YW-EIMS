import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { QueryUnitDto } from './dto/query-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryUnitDto) {
    const { current = 1, size = 10, unitCode, unit } = query;
    const where: {
      unitCode?: { contains: string };
      unit?: { contains: string };
    } = {};
    if (unitCode) where.unitCode = { contains: unitCode };
    if (unit) where.unit = { contains: unit };

    const [records, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.unit.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(unitCode: string) {
    const unit = await this.prisma.unit.findUnique({ where: { unitCode } });
    if (!unit) throw new NotFoundException('单位不存在');
    return unit;
  }

  async create(dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: dto });
  }

  async update(unitCode: string, dto: UpdateUnitDto) {
    if (dto.unitCode && dto.unitCode !== unitCode) {
      throw new BadRequestException('单位编码不允许修改');
    }

    const existing = await this.prisma.unit.findUnique({ where: { unitCode } });
    if (!existing) throw new NotFoundException('单位不存在');

    const data: { unit?: string } = {};
    if (dto.unit !== undefined) data.unit = dto.unit;

    return this.prisma.unit.update({ where: { unitCode }, data });
  }

  async remove(unitCode: string) {
    const existing = await this.prisma.unit.findUnique({ where: { unitCode } });
    if (!existing) throw new NotFoundException('单位不存在');

    const count = await this.prisma.material.count({ where: { unitCode } });
    if (count > 0) {
      throw new ConflictException(
        `无法删除单位编码 ${unitCode}：该编码被物料主表的 ${count} 条记录引用`,
      );
    }
    await this.prisma.unit.delete({ where: { unitCode } });
    return null;
  }
}
