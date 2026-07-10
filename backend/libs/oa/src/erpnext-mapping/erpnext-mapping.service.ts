import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { ErpNextService } from '../erpnext/erpnext.service';
import { CreateErpNextMappingDto } from './dto/create-erp-next-mapping.dto';
import { UpdateErpNextMappingDto } from './dto/update-erp-next-mapping.dto';
import { QueryErpNextMappingDto } from './dto/query-erp-next-mapping.dto';

@Injectable()
export class ErpNextMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly erpNextService: ErpNextService,
  ) {}

  async findPage(query: QueryErpNextMappingDto) {
    const { current = 1, size = 10, type, sourceKey } = query;
    const where: {
      type?: string;
      sourceKey?: { contains: string };
    } = {};
    if (type) where.type = type;
    if (sourceKey) where.sourceKey = { contains: sourceKey };

    const [records, total] = await Promise.all([
      this.prisma.erpNextMapping.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
        orderBy: [{ type: 'asc' }, { sourceKey: 'asc' }],
      }),
      this.prisma.erpNextMapping.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const mapping = await this.prisma.erpNextMapping.findUnique({ where: { id } });
    if (!mapping) throw new NotFoundException('映射不存在');
    return mapping;
  }

  async create(dto: CreateErpNextMappingDto) {
    const existing = await this.prisma.erpNextMapping.findUnique({
      where: { type_sourceKey: { type: dto.type, sourceKey: dto.sourceKey } },
    });
    if (existing) throw new BadRequestException(`映射 ${dto.type}/${dto.sourceKey} 已存在`);

    const mapping = await this.prisma.erpNextMapping.create({ data: dto });
    await this.erpNextService.reloadMappings();
    return mapping;
  }

  async update(id: number, dto: UpdateErpNextMappingDto) {
    const existing = await this.prisma.erpNextMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('映射不存在');

    const mapping = await this.prisma.erpNextMapping.update({ where: { id }, data: dto });
    await this.erpNextService.reloadMappings();
    return mapping;
  }

  async remove(id: number) {
    const existing = await this.prisma.erpNextMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('映射不存在');

    await this.prisma.erpNextMapping.delete({ where: { id } });
    await this.erpNextService.reloadMappings();
    return null;
  }
}
