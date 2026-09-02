import { randomBytes } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';

export const EIMS_ACCESS_COOKIE = 'eims_access';
export const EIMS_REFRESH_COOKIE = 'eims_refresh';
export const EIMS_CSRF_COOKIE = 'eims_csrf';
export const EIMS_CSRF_HEADER = 'x-csrf-token';

export interface AuthTokenPair {
  token: string;
  refreshToken: string;
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const item of header.split(';')) {
    const separator = item.indexOf('=');
    if (separator <= 0) continue;
    const key = item.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeCookieValue(item.slice(separator + 1).trim());
  }
  return undefined;
}

export function getAuthCookieSecure(): boolean {
  return process.env.AUTH_COOKIE_SECURE === 'true';
}

export function setAuthCookies(response: Response, tokens: AuthTokenPair) {
  const secure = getAuthCookieSecure();
  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  response.cookie(EIMS_ACCESS_COOKIE, tokens.token, {
    ...baseOptions,
    maxAge: parseDurationMs(process.env.JWT_EXPIRES_IN, 2 * 60 * 60 * 1000),
  });
  response.cookie(EIMS_REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    maxAge: parseDurationMs(
      process.env.JWT_REFRESH_EXPIRES_IN,
      7 * 24 * 60 * 60 * 1000,
    ),
  });
  response.cookie(EIMS_CSRF_COOKIE, randomBytes(32).toString('base64url'), {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: parseDurationMs(
      process.env.JWT_REFRESH_EXPIRES_IN,
      7 * 24 * 60 * 60 * 1000,
    ),
  });
}

export function clearAuthCookies(response: Response) {
  const options: CookieOptions = {
    secure: getAuthCookieSecure(),
    sameSite: 'lax',
    path: '/',
  };
  response.clearCookie(EIMS_ACCESS_COOKIE, options);
  response.clearCookie(EIMS_REFRESH_COOKIE, options);
  response.clearCookie(EIMS_CSRF_COOKIE, options);
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseDurationMs(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return fallback;

  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}
