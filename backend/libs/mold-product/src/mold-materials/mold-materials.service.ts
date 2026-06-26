import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateMoldMaterialDto } from './dto/create-mold-material.dto';
import { UpdateMoldMaterialDto } from './dto/update-mold-material.dto';
import { QueryMoldMaterialDto } from './dto/query-mold-material.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class MoldMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryMoldMaterialDto) {
    const { current = 1, size = 10, typeCode, typeName } = query;
    const where: {
      typeCode?: { contains: string };
      typeName?: { contains: string };
    } = {};
    if (typeCode) where.typeCode = { contains: typeCode };
    if (typeName) where.typeName = { contains: typeName };

    const [records, total] = await Promise.all([
      this.prisma.moldMaterial.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.moldMaterial.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const moldMaterial = await this.prisma.moldMaterial.findUnique({ where: { id } });
    if (!moldMaterial) throw new NotFoundException('材质不存在');
    return moldMaterial;
  }

  async create(dto: CreateMoldMaterialDto) {
    try {
      return await this.prisma.moldMaterial.create({ data: dto });
    } catch (e) {
      handlePrismaError(e, '材质');
    }
  }

  async update(id: number, dto: UpdateMoldMaterialDto) {
    const existing = await this.prisma.moldMaterial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('材质不存在');

    // 如果修改了 typeCode，检查是否被 mold_codes 引用
    if (dto.typeCode !== undefined && dto.typeCode !== existing.typeCode) {
      const refCount = await this.prisma.moldCode.count({
        where: { typeCode: existing.typeCode },
      });
      if (refCount > 0) {
        throw new ConflictException(
          `无法修改材质编码 ${existing.typeCode}：该编码被模具编码表的 ${refCount} 条记录引用`,
        );
      }
    }

    try {
      return await this.prisma.moldMaterial.update({ where: { id }, data: dto });
    } catch (e) {
      handlePrismaError(e, '材质');
    }
  }

  async remove(id: number) {
    const existing = await this.prisma.moldMaterial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('材质不存在');

    const count = await this.prisma.moldCode.count({
      where: { typeCode: existing.typeCode },
    });
    if (count > 0) {
      throw new ConflictException(
        `无法删除材质 ${existing.typeCode}：该材质被模具编码表的 ${count} 条记录引用`,
      );
    }

    await this.prisma.moldMaterial.delete({ where: { id } });
    return null;
  }
}
