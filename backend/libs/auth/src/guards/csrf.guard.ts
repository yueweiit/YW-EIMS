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
    // rely on a CSRF cookie yet. Existing sessions are protected by the guard.
    if (
      request.path === '/auth/login' ||
      request.path === '/auth/dingtalk/exchange'
    ) {
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

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
