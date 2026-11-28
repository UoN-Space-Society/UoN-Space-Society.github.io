import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expiry, record, run } from '../tools/instagram-sync.mjs';

test('retention uses original publication date rather than sync date', () => {
  assert.equal(expiry('2025-06-01T12:00:00Z'), '2026-06-01T12:00:00.000Z');
  const row = record(
    {
      id: '123',
      caption: 'Launch',
      permalink: 'https://www.instagram.com/p/example/',
      timestamp: '2025-06-01T12:00:00Z',
      media_type: 'IMAGE',
    },
    new Date('2026-01-01T00:00:00Z'),
  );
  assert.equal(row.expires_at, '2026-06-01T12:00:00.000Z');
  assert.equal(row.synced_at, '2026-01-01T00:00:00.000Z');
});
test('untrusted permalinks and invalid timestamps cannot enter records', () => {
  const post = {
    id: '123',
    permalink: 'https://example.com/',
    timestamp: '2026-01-01',
    media_type: 'IMAGE',
  };
  assert.throws(() => record(post), /permalink/);
  assert.throws(() => expiry('invalid'), /timestamp/);
});
test('wrong Instagram account aborts before any database write', async () => {
  const calls = [];
  const env = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'test',
    INSTAGRAM_ACCESS_TOKEN: 'test',
    INSTAGRAM_USER_ID: '123',
    INSTAGRAM_API_VERSION: 'v99.0',
  };
  await assert.rejects(
    run(env, async (url, options) => {
      calls.push({ url: String(url), method: options.method ?? 'GET' });
      return new Response(JSON.stringify({ username: 'someoneelse' }), {
        status: 200,
      });
    }),
    /uonspacesoc/,
  );
  assert.equal(calls.length, 1);
});
test('missing credentials fail closed', async () => {
  await assert.rejects(run({}), /Missing SUPABASE_URL/);
});
