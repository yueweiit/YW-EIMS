export const DINGTALK_LOGIN_ORIGIN = 'https://login.dingtalk.com';
const redirectStorageKey = 'eims:dingtalk-login-redirect';

/** Restrict the embedded document to DingTalk's official OAuth endpoint. */
export function parseDingTalkQrUrl(value: string) {
  const url = new URL(value);
  const callback = new URL(url.searchParams.get('redirect_uri') || '');
  if (
    url.origin !== DINGTALK_LOGIN_ORIGIN ||
    url.pathname !== '/oauth2/auth' ||
    url.username ||
    url.password ||
    url.searchParams.get('iframe') !== 'true' ||
    !url.searchParams.get('client_id') ||
    !url.searchParams.get('state') ||
    !['http:', 'https:'].includes(callback.protocol) ||
    callback.username ||
    callback.password ||
    callback.hash
  ) {
    throw new Error('Invalid DingTalk QR configuration');
  }
  return url;
}

/** Validate the provider message, then construct our own configured callback URL. */
export function resolveDingTalkCallback(data: unknown, authorizationUrl: string): string | null {
  if (
    !data ||
    typeof data !== 'object' ||
    !('success' in data) ||
    data.success !== true ||
    !('redirectUrl' in data) ||
    typeof data.redirectUrl !== 'string'
  )
    return null;

  try {
    const authorization = parseDingTalkQrUrl(authorizationUrl);
    const expected = new URL(authorization.searchParams.get('redirect_uri')!);
    const received = new URL(data.redirectUrl);
    const state = authorization.searchParams.get('state')!;
    const code = received.searchParams.get('authCode') || received.searchParams.get('code');
    if (
      received.origin !== expected.origin ||
      received.pathname !== expected.pathname ||
      received.username ||
      received.password ||
      received.hash ||
      received.searchParams.get('state') !== state ||
      !code ||
      received.searchParams.has('error')
    )
      return null;

    expected.searchParams.set('authCode', code);
    expected.searchParams.set('state', state);
    return expected.toString();
  } catch {
    return null;
  }
}

function safeRedirect(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

/** Preserve only a same-origin return path across the full-page OAuth callback. */
export function rememberDingTalkRedirect(value: unknown) {
  try {
    sessionStorage.removeItem(redirectStorageKey);
    const path = safeRedirect(value);
    if (path) sessionStorage.setItem(redirectStorageKey, JSON.stringify({ path, expiresAt: Date.now() + 600000 }));
  } catch {
    // Storage can be disabled; login should still work, returning to the home page.
  }
}

export function consumeDingTalkRedirect() {
  try {
    const raw = sessionStorage.getItem(redirectStorageKey);
    sessionStorage.removeItem(redirectStorageKey);
    if (!raw) return undefined;
    const saved: unknown = JSON.parse(raw);
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('expiresAt' in saved) ||
      typeof saved.expiresAt !== 'number' ||
      saved.expiresAt <= Date.now() ||
      !('path' in saved)
    )
      return undefined;
    return safeRedirect(saved.path);
  } catch {
    return undefined;
  }
}
