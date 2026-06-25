import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateMoldCodeDto } from './dto/create-mold-code.dto';
import { UpdateMoldCodeDto } from './dto/update-mold-code.dto';
import { QueryMoldCodeDto } from './dto/query-mold-code.dto';
import { handlePrismaError } from '../helpers';

@Injectable()
export class MoldCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryMoldCodeDto) {
    const { current = 1, size = 10, moldCode, moldType, typeCode } = query;
    const where: {
      moldCode?: { contains: string };
      moldType?: { contains: string };
      typeCode?: { contains: string };
    } = {};
    if (moldCode) where.moldCode = { contains: moldCode };
    if (moldType) where.moldType = { contains: moldType };
    if (typeCode) where.typeCode = { contains: typeCode };

    const [records, total] = await Promise.all([
      this.prisma.moldCode.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.moldCode.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const moldCode = await this.prisma.moldCode.findUnique({ where: { id } });
    if (!moldCode) throw new NotFoundException('模具编码不存在');
    return moldCode;
  }

  async create(dto: CreateMoldCodeDto) {
    // 按材质名称查材质表获取 typeCode
    const material = await this.prisma.moldMaterial.findFirst({
      where: { typeName: dto.materialName },
    });
    if (!material) {
      throw new BadRequestException(`材质名称 ${dto.materialName} 不存在`);
    }

    // 自动生成 moldCode = moldPrefix + typeCode（大写）
    const moldCode = (dto.moldPrefix + material.typeCode).toUpperCase();

    // 检查 moldCode 是否已存在
    const existing = await this.prisma.moldCode.findUnique({
      where: { moldCode },
    });
    if (existing) {
      throw new ConflictException(`模具编码 ${moldCode} 已存在`);
    }

    try {
      return await this.prisma.moldCode.create({
        data: {
          moldCode,
          moldType: dto.moldType,
          moldName: dto.moldName,
          moldPrefix: dto.moldPrefix,
          typeCode: material.typeCode,
          typeName: material.typeName,
        },
      });
    } catch (e) {
      handlePrismaError(e, '模具编码');
    }
  }

  async update(id: number, dto: UpdateMoldCodeDto) {
    const existing = await this.prisma.moldCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('模具编码不存在');

    // 如果要修改 moldCode，检查是否被 molds 表引用
    if (dto.moldCode && dto.moldCode !== existing.moldCode) {
      const refCount = await this.prisma.mold.count({
        where: { moldCode: existing.moldCode },
      });
      if (refCount > 0) {
        throw new ConflictException(
          `无法修改模具编码 ${existing.moldCode}：该编码被模具表的 ${refCount} 条记录引用`,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.moldType !== undefined) data.moldType = dto.moldType;
    if (dto.moldName !== undefined) data.moldName = dto.moldName;

    // 如果修改了材质名称，重新查 typeCode 并重新生成 moldCode
    if (dto.materialName !== undefined) {
      const material = await this.prisma.moldMaterial.findFirst({
        where: { typeName: dto.materialName },
      });
      if (!material) {
        throw new BadRequestException(`材质名称 ${dto.materialName} 不存在`);
      }
      data.typeCode = material.typeCode;
      data.typeName = material.typeName;

      // 如果同时修改了前缀，用新前缀；否则用原前缀
      const prefix = dto.moldPrefix ?? existing.moldPrefix;
      const newMoldCode = (prefix + material.typeCode).toUpperCase();
      if (newMoldCode !== existing.moldCode) {
        // 检查新编码是否冲突
        const conflict = await this.prisma.moldCode.findUnique({
          where: { moldCode: newMoldCode },
        });
        if (conflict) {
          throw new ConflictException(`模具编码 ${newMoldCode} 已存在`);
        }
        data.moldCode = newMoldCode;
      }
    } else if (dto.moldPrefix !== undefined && dto.moldPrefix !== existing.moldPrefix) {
      // 只改前缀，用原 typeCode
      const newMoldCode = (dto.moldPrefix + existing.typeCode).toUpperCase();
      if (newMoldCode !== existing.moldCode) {
        const conflict = await this.prisma.moldCode.findUnique({
          where: { moldCode: newMoldCode },
        });
        if (conflict) {
          throw new ConflictException(`模具编码 ${newMoldCode} 已存在`);
        }
        data.moldCode = newMoldCode;
      }
      data.moldPrefix = dto.moldPrefix;
    }

    try {
      return await this.prisma.moldCode.update({ where: { id }, data });
    } catch (e) {
      handlePrismaError(e, '模具编码');
    }
  }

  async remove(id: number) {
    const existing = await this.prisma.moldCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('模具编码不存在');

    const count = await this.prisma.mold.count({
      where: { moldCode: existing.moldCode },
    });
    if (count > 0) {
      throw new ConflictException(
        `无法删除模具编码 ${existing.moldCode}：该编码被模具表的 ${count} 条记录引用`,
      );
    }

    await this.prisma.moldCode.delete({ where: { id } });
    return null;
  }
}
