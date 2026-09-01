import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { PrismaService } from '@eims/database';

interface RateLimitRule {
  max: number;
  windowMs: number;
}

interface RateLimitBucketRow {
  request_count: number;
  reset_at: Date;
}

/** Database-backed limiter shared by every API instance. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private lastCleanupAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rule = this.getRule(request);
    if (!rule) return true;

    const now = new Date();
    await this.cleanup(now);

    const bucketKey = `${request.method}:${request.path}:${this.getClientKey(request)}`;
    const resetAt = new Date(now.getTime() + rule.windowMs);
    const rows = await this.prisma.$queryRaw<RateLimitBucketRow[]>(Prisma.sql`
      INSERT INTO "public"."security_rate_limit_buckets"
        ("bucket_key", "request_count", "reset_at", "updated_at")
      VALUES (${bucketKey}, 1, ${resetAt}, ${now})
      ON CONFLICT ("bucket_key") DO UPDATE SET
        "request_count" = CASE
          WHEN "security_rate_limit_buckets"."reset_at" <= ${now}
            THEN 1
          ELSE "security_rate_limit_buckets"."request_count" + 1
        END,
        "reset_at" = CASE
          WHEN "security_rate_limit_buckets"."reset_at" <= ${now}
            THEN ${resetAt}
          ELSE "security_rate_limit_buckets"."reset_at"
        END,
        "updated_at" = ${now}
      RETURNING "request_count", "reset_at"
    `);
    const bucket = rows[0];
    if (!bucket) {
      throw new HttpException(
        '请求限流服务暂不可用',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const response = context.switchToHttp().getResponse<Response>();
    const bucketResetAt = new Date(bucket.reset_at).getTime();
    response.setHeader('X-RateLimit-Limit', rule.max.toString());
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, rule.max - bucket.request_count).toString(),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(bucketResetAt / 1000).toString(),
    );

    if (bucket.request_count > rule.max) {
      response.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil((bucketResetAt - now.getTime()) / 1000)).toString(),
      );
      throw new HttpException(
        '请求过于频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private getRule(request: Request): RateLimitRule | undefined {
    if (request.method === 'POST' && request.path === '/auth/login') {
      return { max: 10, windowMs: 60_000 };
    }
    if (request.method === 'POST' && request.path === '/auth/refreshToken') {
      return { max: 30, windowMs: 60_000 };
    }
    if (request.method === 'GET' && request.path === '/oauth/authorize') {
      return { max: 30, windowMs: 60_000 };
    }
    if (
      request.method === 'POST' &&
      (request.path === '/oauth/token' ||
        request.path === '/oauth/authorize/confirm')
    ) {
      return { max: 30, windowMs: 60_000 };
    }
    return undefined;
  }

  private getClientKey(request: Request) {
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  private async cleanup(now: Date) {
    const nowMs = now.getTime();
    if (nowMs - this.lastCleanupAt < 60_000) return;
    this.lastCleanupAt = nowMs;
    await this.prisma.securityRateLimitBucket.deleteMany({
      where: { resetAt: { lte: now } },
    });
  }
}
