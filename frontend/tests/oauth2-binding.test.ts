import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveWithSharedAccountConfirmation } from '../src/utils/oauth2-binding';

const shared = { error: { response: { status: 409, data: { msg: 'OAUTH2_SHARED_ACCOUNT_CONFIRMATION_REQUIRED' } } } };
const success = { error: null };

test('canceling shared binding performs no confirmed write', async () => {
  const calls: boolean[] = [];
  const result = await saveWithSharedAccountConfirmation(async confirmed => {
    calls.push(confirmed);
    return shared;
  }, async () => false);
  assert.equal(result, null);
  assert.deepEqual(calls, [false]);
});

test('confirmation retries once with explicit acknowledgement', async () => {
  const calls: boolean[] = [];
  const result = await saveWithSharedAccountConfirmation(async confirmed => {
    calls.push(confirmed);
    return confirmed ? success : shared;
  }, async () => true);
  assert.equal(result, success);
  assert.deepEqual(calls, [false, true]);
});

test('unshared binding saves directly without a dialog', async () => {
  const result = await saveWithSharedAccountConfirmation(async () => success, async () => {
    assert.fail('must not prompt');
  });
  assert.equal(result, success);
});

test('other conflicts and uncertain network failures are never retried', async () => {
  for (const error of [
    { response: { status: 409, data: { msg: 'existing binding' } } },
    { response: { status: 500, data: { msg: 'OAUTH2_SHARED_ACCOUNT_CONFIRMATION_REQUIRED' } } },
    {}
  ]) {
    let calls = 0;
    const result = await saveWithSharedAccountConfirmation(async () => {
      calls += 1;
      return { error };
    }, async () => { assert.fail('must not prompt'); });
    assert.equal(result?.error, error);
    assert.equal(calls, 1);
  }
});

test('a failed confirmed save does not start another confirmation loop', async () => {
  let calls = 0;
  let prompts = 0;
  const result = await saveWithSharedAccountConfirmation(async () => {
    calls += 1;
    return shared;
  }, async () => { prompts += 1; return true; });
  assert.equal(result, shared);
  assert.equal(calls, 2);
  assert.equal(prompts, 1);
});
