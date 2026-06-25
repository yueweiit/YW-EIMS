import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateProductCodeDto } from './dto/create-product-code.dto';
import { UpdateProductCodeDto } from './dto/update-product-code.dto';
import { QueryProductCodeDto } from './dto/query-product-code.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class ProductCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryProductCodeDto) {
    const { current = 1, size = 10, productCode, productType, productName } = query;
    const where: {
      productCode?: { contains: string };
      productType?: { contains: string };
      productName?: { contains: string };
    } = {};
    if (productCode) where.productCode = { contains: productCode };
    if (productType) where.productType = { contains: productType };
    if (productName) where.productName = { contains: productName };

    const [records, total] = await Promise.all([
      this.prisma.productCode.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.productCode.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const productCode = await this.prisma.productCode.findUnique({ where: { id } });
    if (!productCode) throw new NotFoundException('产品编码不存在');
    return productCode;
  }

  async create(dto: CreateProductCodeDto) {
    // 校验颜色编码存在
    const color = await this.prisma.color.findUnique({
      where: { colorCode: dto.colorCode },
    });
    if (!color) throw new BadRequestException(`颜色编码 ${dto.colorCode} 不存在`);

    try {
      return await this.prisma.productCode.create({
        data: {
          productCode: dto.productCode,
          productType: dto.productType,
          productName: dto.productName,
          colorName: dto.colorName,
          colorCode: dto.colorCode,
        },
      });
    } catch (e) {
      handlePrismaError(e, '产品编码');
    }
  }

  async update(id: number, dto: UpdateProductCodeDto) {
    const existing = await this.prisma.productCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('产品编码不存在');

    // 如果要修改 productCode，检查是否被 products 表引用
    if (dto.productCode && dto.productCode !== existing.productCode) {
      const refCount = await this.prisma.product.count({
        where: { productCode: existing.productCode },
      });
      if (refCount > 0) {
        throw new ConflictException(
          `无法修改产品编码 ${existing.productCode}：该编码被产品表的 ${refCount} 条记录引用`,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.productCode !== undefined) data.productCode = dto.productCode;
    if (dto.productType !== undefined) data.productType = dto.productType;
    if (dto.productName !== undefined) data.productName = dto.productName;
    if (dto.colorName !== undefined) data.colorName = dto.colorName;
    if (dto.colorCode !== undefined) {
      // 校验颜色编码存在
      const color = await this.prisma.color.findUnique({
        where: { colorCode: dto.colorCode },
      });
      if (!color) throw new BadRequestException(`颜色编码 ${dto.colorCode} 不存在`);
      data.colorCode = dto.colorCode;
      data.colorName = dto.colorName ?? color.colorName;
    }

    try {
      return await this.prisma.productCode.update({ where: { id }, data });
    } catch (e) {
      handlePrismaError(e, '产品编码');
    }
  }

  async remove(id: number) {
    const existing = await this.prisma.productCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('产品编码不存在');

    const count = await this.prisma.product.count({
      where: { productCode: existing.productCode },
    });
    if (count > 0) {
      throw new ConflictException(
        `无法删除产品编码 ${existing.productCode}：该编码被产品表的 ${count} 条记录引用`,
      );
    }

    await this.prisma.productCode.delete({ where: { id } });
    return null;
  }
}
