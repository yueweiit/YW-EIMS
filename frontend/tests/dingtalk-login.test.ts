import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  consumeDingTalkRedirect,
  parseDingTalkQrUrl,
  rememberDingTalkRedirect,
  resolveDingTalkCallback
} from '../src/utils/dingtalk-login';

const callback = 'https://eims.example.com/api/auth/dingtalk/callback';
const params = new URLSearchParams({
  iframe: 'true',
  client_id: 'public-client-id',
  state: 'signed-state',
  redirect_uri: callback
});
const authorizationUrl = `https://login.dingtalk.com/oauth2/auth?${params}`;
const response = (url = callback, state = 'signed-state') => ({
  success: true,
  redirectUrl: `${url}?authCode=one-time-code&state=${state}`
});

test('accepts the official embedded URL and returns the configured callback', () => {
  assert.equal(parseDingTalkQrUrl(authorizationUrl).origin, 'https://login.dingtalk.com');
  assert.equal(
    resolveDingTalkCallback(response(), authorizationUrl),
    `${callback}?authCode=one-time-code&state=signed-state`
  );
});

test('rejects lookalike iframe domains and non-HTTP callback protocols', () => {
  assert.throws(() =>
    parseDingTalkQrUrl(authorizationUrl.replace('login.dingtalk.com', 'login.dingtalk.com.attacker.test'))
  );
  const invalid = new URL(authorizationUrl);
  invalid.searchParams.set('redirect_uri', 'javascript:alert(1)');
  assert.throws(() => parseDingTalkQrUrl(invalid.toString()));
});

test('does not accept a different state, callback host, or callback path', () => {
  assert.equal(resolveDingTalkCallback(response(callback, 'another-state'), authorizationUrl), null);
  assert.equal(resolveDingTalkCallback(response('https://attacker.test/callback'), authorizationUrl), null);
  assert.equal(resolveDingTalkCallback(response('https://eims.example.com/other'), authorizationUrl), null);
});

test('ignores incomplete or denied provider messages', () => {
  for (const data of [
    null,
    'message',
    {},
    { success: false },
    { success: true },
    { success: true, redirectUrl: callback }
  ]) {
    assert.equal(resolveDingTalkCallback(data, authorizationUrl), null);
  }
  const denied = response();
  denied.redirectUrl += '&error=access_denied';
  assert.equal(resolveDingTalkCallback(denied, authorizationUrl), null);
});

test('does not carry extra provider-supplied redirects into the callback', () => {
  const data = response();
  data.redirectUrl += '&redirect=https://attacker.test';
  const result = new URL(resolveDingTalkCallback(data, authorizationUrl)!);
  assert.equal(result.searchParams.has('redirect'), false);
});

test('preserves encoded codes and supports the code callback parameter', () => {
  const data = { success: true, redirectUrl: `${callback}?code=a%2Bb%3Dc&state=signed-state` };
  const result = new URL(resolveDingTalkCallback(data, authorizationUrl)!);
  assert.equal(result.searchParams.get('authCode'), 'a+b=c');
});

test('return paths are same-origin, expire, and are consumed only once', t => {
  const values = new Map<string, string>();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { origin: 'https://eims.example.com' } }
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      }
    }
  });
  rememberDingTalkRedirect('/login/oauth-consent?transaction_id=example');
  assert.equal(consumeDingTalkRedirect(), '/login/oauth-consent?transaction_id=example');
  assert.equal(consumeDingTalkRedirect(), undefined);
  for (const path of ['https://attacker.test', '//attacker.test', '/\\attacker.test']) {
    rememberDingTalkRedirect(path);
    assert.equal(consumeDingTalkRedirect(), undefined);
  }
  rememberDingTalkRedirect('/home');
  const now = Date.now();
  t.mock.method(Date, 'now', () => now + 600001);
  assert.equal(consumeDingTalkRedirect(), undefined);
});
