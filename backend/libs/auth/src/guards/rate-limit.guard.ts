import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RateLimitRule {
  max: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Small bounded in-process limiter for authentication and OAuth endpoints. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private lastCleanupAt = 0;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const rule = this.getRule(request);
    if (!rule) return true;

    const now = Date.now();
    this.cleanup(now);
    const key = `${request.method}:${request.path}:${this.getClientKey(request)}`;
    const current = this.buckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 1, resetAt: now + rule.windowMs }
        : { count: current.count + 1, resetAt: current.resetAt };
    this.buckets.set(key, bucket);

    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('X-RateLimit-Limit', rule.max.toString());
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, rule.max - bucket.count).toString(),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(bucket.resetAt / 1000).toString(),
    );

    if (bucket.count > rule.max) {
      response.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)).toString(),
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
    const clientId =
      typeof request.body?.client_id === 'string'
        ? request.body.client_id.slice(0, 128)
        : '';
    return `${request.ip || 'unknown'}:${clientId}`;
  }

  private cleanup(now: number) {
    if (now - this.lastCleanupAt < 60_000 && this.buckets.size < 10_000) return;
    this.lastCleanupAt = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    if (this.buckets.size <= 10_000) return;
    const entries = [...this.buckets.entries()]
      .sort((left, right) => left[1].resetAt - right[1].resetAt)
      .slice(0, this.buckets.size - 10_000);
    for (const [key] of entries) this.buckets.delete(key);
  }
}
