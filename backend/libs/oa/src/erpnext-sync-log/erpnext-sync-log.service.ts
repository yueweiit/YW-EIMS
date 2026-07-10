import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@eims/database';
import { ErpNextService } from '../erpnext/erpnext.service';
import { SyncLogStatus } from './sync-log-status';
import { QuerySyncLogDto } from './dto/query-sync-log.dto';
import type { ErpNextItemPayload } from '../erpnext/erpnext.interface';

@Injectable()
export class ErpNextSyncLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly erpNextService: ErpNextService,
  ) {}

  async findPage(query: QuerySyncLogDto) {
    const { current = 1, size = 10, entityType, status, entityCode } = query;
    const where: Record<string, any> = {};
    if (entityType) where.entityType = entityType;
    if (status) where.status = status;
    if (entityCode) where.entityCode = { contains: entityCode };

    const [records, total] = await Promise.all([
      this.prisma.erpNextSyncLog.findMany({
        where,
        skip: (current - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.erpNextSyncLog.count({ where }),
    ]);

    return { records, total, current, size };
  }

  async findOne(id: number) {
    const log = await this.prisma.erpNextSyncLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('同步日志不存在');
    return log;
  }

  async retry(id: number) {
    const log = await this.prisma.erpNextSyncLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('同步日志不存在');

    if (log.status === SyncLogStatus.SUCCESS || log.status === SyncLogStatus.SKIPPED) {
      throw new BadRequestException('该记录已同步成功，无需重试');
    }

    if (!log.requestPayload) {
      throw new BadRequestException('缺少请求参数，无法重试');
    }

    // 乐观锁：抢占为 PENDING
    const { count } = await this.prisma.erpNextSyncLog.updateMany({
      where: { id, status: { not: SyncLogStatus.PENDING } },
      data: {
        status: SyncLogStatus.PENDING,
        retryCount: { increment: 1 },
        lastTriedAt: new Date(),
      },
    });

    if (count !== 1) {
      throw new BadRequestException('正在重试中或记录不存在');
    }

    // 执行重试（skipLog 避免重复写入）
    const payload = log.requestPayload as unknown as ErpNextItemPayload;
    const result = await this.erpNextService.createItem(payload, { skipLog: true });

    // 更新同一条日志
    const updated = await this.prisma.erpNextSyncLog.update({
      where: { id },
      data: {
        status: result.success ? (result.skipped ? SyncLogStatus.SKIPPED : SyncLogStatus.SUCCESS) : SyncLogStatus.FAILED,
        message: result.message,
        responseData: result.data ? { data: result.data } : (result.status ? { status: result.status } : undefined),
      },
    });

    return updated;
  }
}
