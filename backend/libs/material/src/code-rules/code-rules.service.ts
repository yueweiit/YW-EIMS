import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { CreateCodeRuleDto } from './dto/create-code-rule.dto';
import { UpdateCodeRuleDto } from './dto/update-code-rule.dto';
import { QueryCodeRuleDto } from './dto/query-code-rule.dto';

@Injectable()
export class MaterialCodeRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(query: QueryCodeRuleDto) {
    const { current = 1, size = 10, codePrefix, explainContent } = query;
    const where: {
      codePrefix?: { contains: string };
      explainContent?: { contains: string };
    } = {};
    if (codePrefix) where.codePrefix = { contains: codePrefix };
    if (explainContent) where.explainContent = { contains: explainContent };

    const [records, total] = await Promise.all([
      this.prisma.materialCodeRule.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
      }),
      this.prisma.materialCodeRule.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(codePrefix: string) {
    const rule = await this.prisma.materialCodeRule.findUnique({
      where: { codePrefix },
    });
    if (!rule) throw new NotFoundException('编码规则不存在');
    return rule;
  }

  async create(dto: CreateCodeRuleDto) {
    return this.prisma.materialCodeRule.create({ data: dto });
  }

  async update(codePrefix: string, dto: UpdateCodeRuleDto) {
    const existing = await this.prisma.materialCodeRule.findUnique({
      where: { codePrefix },
    });
    if (!existing) throw new NotFoundException('编码规则不存在');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.materialCodeRule.update({
        where: { codePrefix },
        data: dto,
      });

      if (dto.explainContent !== undefined) {
        await tx.material.updateMany({
          where: { codePrefix },
          data: { explainContent: dto.explainContent },
        });
      }

      return updated;
    });
  }

  async remove(codePrefix: string) {
    const existing = await this.prisma.materialCodeRule.findUnique({
      where: { codePrefix },
    });
    if (!existing) throw new NotFoundException('编码规则不存在');

    return this.prisma.$transaction(async (tx) => {
      await tx.material.updateMany({
        where: { codePrefix },
        data: { explainContent: null },
      });

      await tx.materialCodeRule.delete({ where: { codePrefix } });
      return null;
    });
  }
}
