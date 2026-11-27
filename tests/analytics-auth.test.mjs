import test from 'node:test';
import assert from 'node:assert/strict';
import { getReportingToken } from '../tools/analytics-auth.mjs';

test('explicit short-lived token takes precedence', async () => {
  assert.equal(
    await getReportingToken({ GOOGLE_ACCESS_TOKEN: 'test-token' }),
    'test-token',
  );
});

test('service account requests only read-only Analytics scope', async () => {
  let options;
  const createAuth = (config) => {
    options = config;
    return { getAccessToken: async () => 'test-token' };
  };
  assert.equal(
    await getReportingToken(
      { GOOGLE_APPLICATION_CREDENTIALS: '/test/key.json' },
      createAuth,
    ),
    'test-token',
  );
  assert.equal(options.keyFile, '/test/key.json');
  assert.deepEqual(options.scopes, [
    'https://www.googleapis.com/auth/analytics.readonly',
  ]);
});

test('empty token fails without returning credentials', async () => {
  await assert.rejects(
    getReportingToken({}, () => ({ getAccessToken: async () => null })),
    /No access token/,
  );
});

test('authentication errors do not expose secrets', async () => {
  await assert.rejects(
    getReportingToken({}, () => ({
      getAccessToken: async () => {
        throw Error('private-key-secret');
      },
    })),
    (error) => {
      assert.ok(!error.message.includes('private-key-secret'));
      return /Authentication failed/.test(error.message);
    },
  );
});
