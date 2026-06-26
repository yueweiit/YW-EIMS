import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { QueryColorDto } from './dto/query-color.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class ColorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryColorDto) {
    const { current = 1, size = 10, colorCode, colorName } = query;
    const where: {
      colorCode?: { contains: string };
      colorName?: { contains: string };
    } = {};
    if (colorCode) where.colorCode = { contains: colorCode };
    if (colorName) where.colorName = { contains: colorName };

    const [records, total] = await Promise.all([
      this.prisma.color.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.color.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const color = await this.prisma.color.findUnique({ where: { id } });
    if (!color) throw new NotFoundException('颜色不存在');
    return color;
  }

  async create(dto: CreateColorDto) {
    try {
      return await this.prisma.color.create({ data: dto });
    } catch (e) {
      handlePrismaError(e, '颜色');
    }
  }

  async update(id: number, dto: UpdateColorDto) {
    const existing = await this.prisma.color.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('颜色不存在');

    // 如果修改了 colorCode，检查是否被 product_codes 或 products 引用
    if (dto.colorCode !== undefined && dto.colorCode !== existing.colorCode) {
      const [productCodeCount, productCount] = await Promise.all([
        this.prisma.productCode.count({ where: { colorCode: existing.colorCode } }),
        this.prisma.product.count({ where: { colorCode: existing.colorCode } }),
      ]);
      if (productCodeCount > 0) {
        throw new ConflictException(
          `无法修改颜色编码 ${existing.colorCode}：该编码被产品编码表的 ${productCodeCount} 条记录引用`,
        );
      }
      if (productCount > 0) {
        throw new ConflictException(
          `无法修改颜色编码 ${existing.colorCode}：该编码被产品表的 ${productCount} 条记录引用`,
        );
      }
    }

    try {
      return await this.prisma.color.update({ where: { id }, data: dto });
    } catch (e) {
      handlePrismaError(e, '颜色');
    }
  }

  async remove(id: number) {
    const existing = await this.prisma.color.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('颜色不存在');

    const count = await this.prisma.product.count({
      where: { colorCode: existing.colorCode },
    });
    if (count > 0) {
      throw new ConflictException(
        `无法删除颜色 ${existing.colorCode}：该颜色被产品表的 ${count} 条记录引用`,
      );
    }

    await this.prisma.color.delete({ where: { id } });
    return null;
  }
}
