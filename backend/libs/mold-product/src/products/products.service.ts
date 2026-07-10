import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Product } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { ErpNextService } from '@eims/oa';
import { PhoneModelsService } from '../phone-models/phone-models.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ImportProductRowDto } from './dto/import-product.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneModelsService: PhoneModelsService,
    private readonly erpNextService: ErpNextService,
  ) {}

  async findPage(query: QueryProductDto) {
    const { current = 1, size = 10, productType, phoneShortName, itemCode } = query;
    const where: {
      productType?: { contains: string };
      phoneShortName?: { contains: string };
      itemCode?: { contains: string };
    } = {};
    if (productType) where.productType = { contains: productType };
    if (phoneShortName) where.phoneShortName = { contains: phoneShortName };
    if (itemCode) where.itemCode = { contains: itemCode };

    const [records, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
        orderBy: { id: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('产品不存在');
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      const products = await this.prisma.$transaction(async (tx) => {
        // 1. 按产品类型查产品编码表（查出所有匹配记录）
        const productCodeRecords = await tx.productCode.findMany({
          where: { productType: dto.productType },
        });
        if (productCodeRecords.length === 0) {
          throw new BadRequestException(`产品类型 ${dto.productType} 不存在`);
        }

        // 2. 查找或创建手机型号（按手机简称）
        const phoneModel = await this.phoneModelsService.findByShortNameOrCreate(
          tx,
          dto.phoneShortName,
        );

        // 3. 为每条匹配的产品编码生成一条产品记录
        const created: Product[] = [];
        for (const pc of productCodeRecords) {
          const itemCode = (
            pc.productCode +
            phoneModel.phoneCode +
            pc.colorCode
          ).toUpperCase();

          const product = await tx.product.create({
            data: {
              productType: pc.productType,
              productName: pc.productName,
              productCode: pc.productCode,
              phoneShortName: phoneModel.phoneShortName ?? phoneModel.phoneName,
              phoneCode: phoneModel.phoneCode,
              colorName: pc.colorName,
              colorCode: pc.colorCode,
              itemCode,
            },
          });
          created.push(product);
        }

        return created;
      });

      // 事务提交后批量同步 ERPNext（best-effort）
      this.erpNextService.syncProducts(products).catch((err) =>
        this.logger.error(`ERPNext sync failed: ${err}`),
      );

      return products;
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
      handlePrismaError(e, '产品');
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.product.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('产品不存在');

        const data: Record<string, unknown> = {};

        if (dto.productType !== undefined && dto.productType !== existing.productType) {
          const productCodeRecord = await tx.productCode.findFirst({
            where: { productType: dto.productType },
          });
          if (!productCodeRecord) {
            throw new BadRequestException(`产品类型 ${dto.productType} 不存在`);
          }
          data.productType = productCodeRecord.productType;
          data.productName = productCodeRecord.productName;
          data.productCode = productCodeRecord.productCode;
          data.colorName = productCodeRecord.colorName;
          data.colorCode = productCodeRecord.colorCode;
        }

        if (dto.phoneShortName !== undefined && dto.phoneShortName !== existing.phoneShortName) {
          const phoneModel = await this.phoneModelsService.findByShortNameOrCreate(
            tx,
            dto.phoneShortName,
          );
          data.phoneShortName = phoneModel.phoneShortName ?? phoneModel.phoneName;
          data.phoneCode = phoneModel.phoneCode;
        }

        // 重新计算 itemCode
        const productCodeForItem = (data.productCode as string) ?? existing.productCode;
        const phoneCodeForItem = (data.phoneCode as string) ?? existing.phoneCode;
        const colorCodeForItem = (data.colorCode as string) ?? existing.colorCode;
        data.itemCode = (productCodeForItem + phoneCodeForItem + colorCodeForItem).toUpperCase();

        return tx.product.update({ where: { id }, data });
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
      handlePrismaError(e, '产品');
    }
  }

  async batchCreate(rows: ImportProductRowDto[]) {
    if (!rows.length) throw new BadRequestException('导入数据不能为空');

    const errors: string[] = [];
    const allCreated: Product[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2;

      try {
        const result = await this.create({
          productType: row.productType,
          phoneShortName: row.phoneShortName,
        });
        if (Array.isArray(result)) {
          allCreated.push(...result);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`第${line}行: ${msg}`);
      }
    }

    // 批量同步 ERPNext（best-effort）
    if (allCreated.length > 0) {
      this.erpNextService.syncProducts(allCreated).catch((err) =>
        this.logger.error(`ERPNext batch sync failed: ${err}`),
      );
    }

    return {
      success: allCreated.length,
      failed: errors.length,
      errors,
    };
  }

  async remove(id: number) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('产品不存在');
    await this.prisma.product.delete({ where: { id } });
    return null;
  }
}
