import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { PhoneModelsService } from '../phone-models/phone-models.service';
import { CreateMoldDto } from './dto/create-mold.dto';
import { UpdateMoldDto } from './dto/update-mold.dto';
import { QueryMoldDto } from './dto/query-mold.dto';
import { ImportMoldRowDto } from './dto/import-mold.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class MoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneModelsService: PhoneModelsService,
  ) {}

  async findPage(query: QueryMoldDto) {
    const { current = 1, size = 10, moldCode, phoneName, itemCode } = query;
    const where: {
      moldCode?: { contains: string };
      phoneName?: { contains: string };
      itemCode?: { contains: string };
    } = {};
    if (moldCode) where.moldCode = { contains: moldCode };
    if (phoneName) where.phoneName = { contains: phoneName };
    if (itemCode) where.itemCode = { contains: itemCode };

    const [records, total] = await Promise.all([
      this.prisma.mold.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.mold.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const mold = await this.prisma.mold.findUnique({ where: { id } });
    if (!mold) throw new NotFoundException('模具不存在');
    return mold;
  }

  async create(dto: CreateMoldDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. 查找模具编码
        const moldCodeRecord = await tx.moldCode.findUnique({
          where: { moldCode: dto.moldCode },
        });
        if (!moldCodeRecord) {
          throw new NotFoundException(`模具编码 ${dto.moldCode} 不存在`);
        }

        // 2. 查找或创建手机型号
        const phoneModel = await this.phoneModelsService.findByPhoneNameOrCreate(
          tx,
          dto.phoneName,
        );

        // 3. 生成 itemCode
        const itemCode = (moldCodeRecord.moldCode + phoneModel.phoneCode).toUpperCase();

        // 4. 创建模具记录
        return tx.mold.create({
          data: {
            moldType: moldCodeRecord.moldType,
            moldName: moldCodeRecord.moldName,
            moldCode: moldCodeRecord.moldCode,
            phoneName: phoneModel.phoneName,
            phoneCode: phoneModel.phoneCode,
            typeCode: moldCodeRecord.typeCode,
            typeName: moldCodeRecord.typeName,
            itemCode,
          },
        });
      });
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      handlePrismaError(e, '模具');
    }
  }

  async update(id: number, dto: UpdateMoldDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.mold.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('模具不存在');

        const data: Record<string, unknown> = {};

        if (dto.moldCode !== undefined && dto.moldCode !== existing.moldCode) {
          const moldCodeRecord = await tx.moldCode.findUnique({
            where: { moldCode: dto.moldCode },
          });
          if (!moldCodeRecord) {
            throw new NotFoundException(`模具编码 ${dto.moldCode} 不存在`);
          }
          data.moldCode = moldCodeRecord.moldCode;
          data.moldType = moldCodeRecord.moldType;
          data.moldName = moldCodeRecord.moldName;
          data.typeCode = moldCodeRecord.typeCode;
          data.typeName = moldCodeRecord.typeName;
        }

        if (dto.phoneName !== undefined && dto.phoneName !== existing.phoneName) {
          const phoneModel = await this.phoneModelsService.findByPhoneNameOrCreate(
            tx,
            dto.phoneName,
          );
          data.phoneName = phoneModel.phoneName;
          data.phoneCode = phoneModel.phoneCode;
        }

        // 重新计算 itemCode
        const moldCodeForItem = (data.moldCode as string) ?? existing.moldCode;
        const phoneCodeForItem = (data.phoneCode as string) ?? existing.phoneCode;
        data.itemCode = (moldCodeForItem + phoneCodeForItem).toUpperCase();

        return tx.mold.update({ where: { id }, data });
      });
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      handlePrismaError(e, '模具');
    }
  }

  async batchCreate(rows: ImportMoldRowDto[]) {
    if (!rows.length) throw new BadRequestException('导入数据不能为空');

    const moldCodes = await this.prisma.moldCode.findMany();
    const moldCodeMap = new Map(moldCodes.map(r => [r.moldCode, r]));

    const errors: string[] = [];
    const toCreate: {
      moldType: string;
      moldName: string;
      moldCode: string;
      phoneName: string;
      phoneCode: string;
      typeCode: string;
      typeName: string;
      itemCode: string;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2;
      const moldCodeRecord = moldCodeMap.get(row.moldCode);

      if (!moldCodeRecord) {
        errors.push(`第${line}行: 模具编码 "${row.moldCode}" 不存在`);
        continue;
      }

      try {
        const phoneModel = await this.phoneModelsService.findByPhoneNameOrCreate(
          null,
          row.phoneName,
        );
        const itemCode = (moldCodeRecord.moldCode + phoneModel.phoneCode).toUpperCase();

        // 检查是否已存在相同的 itemCode
        const existing = await this.prisma.mold.findUnique({ where: { itemCode } });
        if (existing) {
          errors.push(`第${line}行: 模具 "${row.moldCode}" + 手机 "${row.phoneName}" 已存在（项目编码: ${itemCode}）`);
          continue;
        }

        toCreate.push({
          moldType: moldCodeRecord.moldType,
          moldName: moldCodeRecord.moldName,
          moldCode: moldCodeRecord.moldCode,
          phoneName: phoneModel.phoneName,
          phoneCode: phoneModel.phoneCode,
          typeCode: moldCodeRecord.typeCode,
          typeName: moldCodeRecord.typeName,
          itemCode,
        });
      } catch {
        errors.push(`第${line}行: 处理手机名称 "${row.phoneName}" 失败`);
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.$transaction(
        toCreate.map(data => this.prisma.mold.create({ data }))
      );
    }

    return {
      success: toCreate.length,
      failed: errors.length,
      errors,
    };
  }

  async remove(id: number) {
    const existing = await this.prisma.mold.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('模具不存在');
    await this.prisma.mold.delete({ where: { id } });
    return null;
  }
}
