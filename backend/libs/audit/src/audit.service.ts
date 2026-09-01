import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '@eims/database';

export type AuditResult = 'success' | 'failure' | 'denied';
export type AuditValue = string | number | boolean | null | string[];

export interface AuditRecordInput {
  event: string;
  result?: AuditResult;
  userId?: number;
  userName?: string;
  clientId?: string;
  systemCode?: string;
  request?: Request;
  detail?: Record<string, AuditValue>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput) {
    try {
      await this.prisma.securityAuditLog.create({
        data: {
          event: input.event.slice(0, 80),
          result: input.result || 'success',
          userId: input.userId,
          userName: input.userName?.slice(0, 100),
          clientId: input.clientId?.slice(0, 128),
          systemCode: input.systemCode?.slice(0, 50),
          ipAddress: this.getIpAddress(input.request),
          userAgent: input.request?.headers['user-agent']?.slice(0, 500),
          detail: this.sanitizeDetail(input.detail),
        },
      });
    } catch (error) {
      // An audit failure must never turn a successful login or OAuth exchange
      // into an application failure, but it should remain observable.
      this.logger.error(
        `Failed to write audit record: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findPage(
    current = 1,
    size = 20,
    event?: string,
    result?: string,
  ) {
    const page = Math.max(1, current);
    const pageSize = Math.min(100, Math.max(1, size));
    const where = {
      ...(event?.trim() ? { event: { contains: event.trim(), mode: 'insensitive' as const } } : {}),
      ...(result?.trim() ? { result: result.trim() } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.securityAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.securityAuditLog.count({ where }),
    ]);
    return { records, total, current: page, size: pageSize };
  }

  private getIpAddress(request?: Request) {
    if (!request) return undefined;
    // Express parses X-Forwarded-For only after the trusted proxy is
    // configured in main.ts. Never prefer the raw header here because a
    // direct client could spoof it and poison the audit trail.
    return (request.ip || request.socket.remoteAddress || '').slice(0, 64) || undefined;
  }

  private sanitizeDetail(detail?: Record<string, AuditValue>) {
    if (!detail) return undefined;
    const blockedKeys = new Set([
      'password',
      'token',
      'access_token',
      'refresh_token',
      'client_secret',
      'code',
      'code_verifier',
      'state',
      'id_token_hint',
    ]);
    const safe: Record<string, AuditValue> = {};
    for (const [key, value] of Object.entries(detail)) {
      if (!blockedKeys.has(key.toLowerCase())) safe[key.slice(0, 80)] = value;
    }
    return safe;
  }
}
