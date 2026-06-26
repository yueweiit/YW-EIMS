import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@eims/database';
import { CreatePhoneModelDto } from './dto/create-phone-model.dto';
import { UpdatePhoneModelDto } from './dto/update-phone-model.dto';
import { QueryPhoneModelDto } from './dto/query-phone-model.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class PhoneModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryPhoneModelDto) {
    const { current = 1, size = 10, phoneName } = query;
    const where: {
      phoneName?: { contains: string };
    } = {};
    if (phoneName) where.phoneName = { contains: phoneName };

    const [records, total] = await Promise.all([
      this.prisma.phoneModel.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.phoneModel.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const phoneModel = await this.prisma.phoneModel.findUnique({ where: { id } });
    if (!phoneModel) throw new NotFoundException('手机型号不存在');
    return phoneModel;
  }

  async create(dto: CreatePhoneModelDto) {
    const phoneCode = await this.generatePhoneCode();
    try {
      return await this.prisma.phoneModel.create({
        data: {
          phoneName: dto.phoneName,
          phoneShortName: dto.phoneShortName ?? null,
          phoneCode,
        },
      });
    } catch (e) {
      handlePrismaError(e, '手机型号');
    }
  }

  async update(id: number, dto: UpdatePhoneModelDto) {
    const existing = await this.prisma.phoneModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('手机型号不存在');

    const data: Prisma.PhoneModelUncheckedUpdateInput = {};
    if (dto.phoneName !== undefined) data.phoneName = dto.phoneName;
    if (dto.phoneShortName !== undefined) data.phoneShortName = dto.phoneShortName;

    try {
      return await this.prisma.phoneModel.update({ where: { id }, data });
    } catch (e) {
      handlePrismaError(e, '手机型号');
    }
  }

  async remove(id: number) {
    const existing = await this.prisma.phoneModel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('手机型号不存在');

    const [moldCount, productCount] = await Promise.all([
      this.prisma.mold.count({ where: { phoneCode: existing.phoneCode } }),
      this.prisma.product.count({ where: { phoneCode: existing.phoneCode } }),
    ]);
    if (moldCount > 0) {
      throw new ConflictException(
        `无法删除手机型号 ${existing.phoneName}：该型号被模具表的 ${moldCount} 条记录引用`,
      );
    }
    if (productCount > 0) {
      throw new ConflictException(
        `无法删除手机型号 ${existing.phoneName}：该型号被产品表的 ${productCount} 条记录引用`,
      );
    }

    await this.prisma.phoneModel.delete({ where: { id } });
    return null;
  }

  /**
   * 通过 phoneName 查找手机型号，不存在则自动创建。
   * 使用 SELECT ... FOR UPDATE 保证 phoneCode 并发安全生成。
   * tx 可传入 Prisma.TransactionClient 以在事务内调用，也可为 null 独立使用。
   */
  async findByPhoneNameOrCreate(
    tx: Prisma.TransactionClient | null,
    phoneName: string,
  ) {
    const client = tx ?? this.prisma;

    const existing = await client.phoneModel.findUnique({ where: { phoneName } });
    if (existing) return existing;

    // 使用 FOR UPDATE 锁定序列表，安全生成 phoneCode
    const sequenceRows = await client.$queryRaw<
      { id: number; current_value: number }[]
    >`SELECT id, current_value FROM mold.phone_code_sequence WHERE id = 1 FOR UPDATE`;

    const current = sequenceRows[0]?.current_value ?? 0;
    const nextValue = current + 1;
    const phoneCode = String(nextValue).padStart(4, '0');

    await client.phoneCodeSequence.update({
      where: { id: 1 },
      data: { currentValue: nextValue },
    });

    return client.phoneModel.create({
      data: {
        phoneName,
        phoneCode,
      },
    });
  }

  /**
   * 通过 phoneShortName 查找手机型号，不存在则自动创建。
   * phoneShortName 非唯一，用 findFirst 查找。
   */
  async findByShortNameOrCreate(
    tx: Prisma.TransactionClient | null,
    phoneShortName: string,
  ) {
    const client = tx ?? this.prisma;

    // phoneShortName 非唯一，用 findFirst
    const existing = await client.phoneModel.findFirst({
      where: { phoneShortName },
    });
    if (existing) return existing;

    // 使用 FOR UPDATE 锁定序列表，安全生成 phoneCode
    const sequenceRows = await client.$queryRaw<
      { id: number; current_value: number }[]
    >`SELECT id, current_value FROM mold.phone_code_sequence WHERE id = 1 FOR UPDATE`;

    const current = sequenceRows[0]?.current_value ?? 0;
    const nextValue = current + 1;
    const phoneCode = String(nextValue).padStart(4, '0');

    await client.phoneCodeSequence.update({
      where: { id: 1 },
      data: { currentValue: nextValue },
    });

    return client.phoneModel.create({
      data: {
        phoneName: phoneShortName, // phoneName 用简称作为默认值
        phoneShortName,
        phoneCode,
      },
    });
  }

  private async generatePhoneCode(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const sequenceRows = await tx.$queryRaw<
        { id: number; current_value: number }[]
      >`SELECT id, current_value FROM mold.phone_code_sequence WHERE id = 1 FOR UPDATE`;

      const current = sequenceRows[0]?.current_value ?? 0;
      const nextValue = current + 1;
      const phoneCode = String(nextValue).padStart(4, '0');

      await tx.phoneCodeSequence.update({
        where: { id: 1 },
        data: { currentValue: nextValue },
      });

      return phoneCode;
    });
  }
}
