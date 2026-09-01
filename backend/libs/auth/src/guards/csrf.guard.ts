import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import {
  EIMS_ACCESS_COOKIE,
  EIMS_CSRF_COOKIE,
  EIMS_CSRF_HEADER,
  EIMS_REFRESH_COOKIE,
  getCookie,
} from '../auth-cookies';

/** Double-submit CSRF protection for browser sessions authenticated by cookies. */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

    // Login and the one-time DingTalk exchange create a session; they cannot
    // rely on a CSRF cookie yet. Validate the browser origin to prevent login
    // CSRF, while still allowing non-browser clients that send no Origin.
    if (
      request.path === '/auth/login' ||
      request.path === '/auth/dingtalk/exchange'
    ) {
      assertTrustedOrigin(request);
      return true;
    }

    const hasCookieSession = Boolean(
      getCookie(request, EIMS_ACCESS_COOKIE) ||
        getCookie(request, EIMS_REFRESH_COOKIE),
    );
    if (!hasCookieSession) return true;

    const cookieToken = getCookie(request, EIMS_CSRF_COOKIE);
    const headerToken = request.headers[EIMS_CSRF_HEADER];
    const submittedToken = Array.isArray(headerToken)
      ? headerToken[0]
      : headerToken;
    if (!cookieToken || !submittedToken || !safeEqual(cookieToken, submittedToken)) {
      throw new ForbiddenException('CSRF token missing or invalid');
    }
    return true;
  }
}

function assertTrustedOrigin(request: Request) {
  const originHeader = request.headers.origin;
  const refererHeader = request.headers.referer;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader;
  let browserOrigin = origin?.trim();

  if (!browserOrigin && referer) {
    try {
      browserOrigin = new URL(referer).origin;
    } catch {
      throw new ForbiddenException('请求来源无效');
    }
  }
  if (!browserOrigin) return;

  const allowedOrigins = [
    process.env.EIMS_FRONTEND_URL || 'http://localhost:9527',
    ...(process.env.CORS_ORIGINS || 'http://localhost:9527').split(','),
  ]
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (!allowedOrigins.includes(browserOrigin.replace(/\/$/, ''))) {
    throw new ForbiddenException('请求来源不受信任');
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
