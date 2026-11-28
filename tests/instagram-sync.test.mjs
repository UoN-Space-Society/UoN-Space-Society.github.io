import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('leap-day retention agrees with Postgres calendar-year expiry', () => {
  assert.equal(expiry('2024-02-29T12:00:00Z'), '2025-02-28T12:00:00.000Z');
});

async function temporarySnapshot(work) {
  const original = process.cwd();
  const dir = await mkdtemp(join(tmpdir(), 'instagram-sync-'));
  process.chdir(dir);
  try {
    await work(async () =>
      readFile(join(dir, '.cache/instagram-posts.json'), 'utf8'),
    );
  } finally {
    process.chdir(original);
    await rm(dir, { recursive: true, force: true });
  }
}
const credentials = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_private-test-key',
  INSTAGRAM_ACCESS_TOKEN: 'private-instagram-test-token',
  INSTAGRAM_USER_ID: '123',
  INSTAGRAM_API_VERSION: 'v99.0',
};

test('daily sync upserts retained posts, cleans expired data and exports public snapshot', async () => {
  await temporarySnapshot(async (readSnapshot) => {
    const post = {
      id: '456',
      caption: 'Next launch',
      permalink: 'https://www.instagram.com/p/example/',
      timestamp: new Date().toISOString(),
      media_type: 'IMAGE',
      media_url: 'https://example.com/post.jpg',
    };
    const expired = { ...post, id: '789', timestamp: '2000-01-01T00:00:00Z' };
    const calls = [];
    await run(credentials, async (input, options) => {
      const url = new URL(input);
      const method = options.method ?? 'GET';
      calls.push({ url, method });
      if (url.hostname === 'graph.instagram.com') {
        assert.equal(
          options.headers.Authorization,
          `Bearer ${credentials.INSTAGRAM_ACCESS_TOKEN}`,
        );
        return Response.json(
          url.pathname.endsWith('/media')
            ? { data: [post, expired] }
            : { username: 'uonspacesoc' },
        );
      }
      assert.equal(options.headers.apikey, credentials.SUPABASE_SECRET_KEY);
      assert.equal(options.headers.Authorization, undefined);
      if (method === 'POST') {
        const rows = JSON.parse(options.body);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].id, post.id);
        assert.equal(url.searchParams.get('on_conflict'), 'id');
        assert.equal(rows[0].expires_at, expiry(post.timestamp));
        return new Response(null, { status: 201 });
      }
      if (method === 'DELETE') {
        assert.match(url.searchParams.get('expires_at'), /^lte\./);
        return new Response(null, { status: 204 });
      }
      assert.match(url.searchParams.get('expires_at'), /^gt\./);
      assert.equal(url.searchParams.get('select').includes('synced_at'), false);
      return Response.json([post]);
    });
    assert.deepEqual(
      calls.map((call) => call.method),
      ['GET', 'GET', 'POST', 'DELETE', 'GET'],
    );
    const output = await readSnapshot();
    assert.deepEqual(JSON.parse(output).posts, [post]);
    assert.ok(JSON.parse(output).fetched_at);
    assert.equal(output.includes(credentials.SUPABASE_SECRET_KEY), false);
    assert.equal(output.includes(credentials.INSTAGRAM_ACCESS_TOKEN), false);
  });
});

test('export-only reads Supabase without Instagram credentials or writes', async () => {
  await temporarySnapshot(async (readSnapshot) => {
    let requests = 0;
    await run(
      {
        SUPABASE_URL: credentials.SUPABASE_URL,
        SUPABASE_SECRET_KEY: credentials.SUPABASE_SECRET_KEY,
      },
      async (input, options) => {
        requests++;
        assert.equal(new URL(input).hostname, 'example.supabase.co');
        assert.equal(options.method, undefined);
        assert.equal(options.headers.apikey, credentials.SUPABASE_SECRET_KEY);
        assert.equal(options.headers.Authorization, undefined);
        return Response.json([]);
      },
      true,
    );
    assert.equal(requests, 1);
    assert.deepEqual(JSON.parse(await readSnapshot()).posts, []);
  });
});

test('Apify imports eligible public posts without Meta credentials or paid add-ons', async () => {
  await temporarySnapshot(async (readSnapshot) => {
    const token = 'private-apify-test-token';
    const post = {
      id: '123',
      type: 'Video',
      caption: 'Launch',
      url: 'https://www.instagram.com/reel/Example/',
      displayUrl: 'https://example.com/cover.jpg',
      timestamp: '2026-09-17T23:00:00.000Z',
    };
    let exported;
    await run(
      {
        SUPABASE_URL: credentials.SUPABASE_URL,
        SUPABASE_SECRET_KEY: credentials.SUPABASE_SECRET_KEY,
        INSTAGRAM_SOURCE: 'apify',
        APIFY_TOKEN: token,
      },
      async (input, options) => {
        const url = new URL(input);
        if (url.hostname === 'api.apify.com') {
          assert.equal(options.headers.Authorization, 'Bearer ' + token);
          assert.equal(url.searchParams.get('maxTotalChargeUsd'), '0.20');
          assert.equal(url.searchParams.has('token'), false);
          const settings = JSON.parse(options.body);
          assert.deepEqual(settings.username, ['uonspacesoc']);
          assert.equal(settings.resultsLimit, 50);
          assert.equal(settings.dataDetailLevel, 'basicData');
          return Response.json([
            post,
            { ...post, id: '456', timestamp: '2026-09-17T22:59:59.999Z' },
          ]);
        }
        assert.equal(url.hostname, 'example.supabase.co');
        if (options.method === 'POST') {
          const rows = JSON.parse(options.body);
          assert.equal(rows.length, 1);
          const { synced_at, expires_at, ...publicFields } = rows[0];
          assert.equal(expires_at, '2027-09-17T23:00:00.000Z');
          assert.ok(synced_at);
          exported = publicFields;
          return new Response(null, { status: 201 });
        }
        if (options.method === 'DELETE')
          return new Response(null, { status: 204 });
        return Response.json([exported]);
      },
    );
    const snapshot = await readSnapshot();
    assert.equal(snapshot.includes(token), false);
    assert.deepEqual(JSON.parse(snapshot).posts, [
      {
        id: post.id,
        caption: post.caption,
        permalink: post.url,
        timestamp: post.timestamp,
        media_type: 'VIDEO',
        media_url: null,
        thumbnail_url: post.displayUrl,
      },
    ]);
  });
});

test('a failed actor launch is not retried and does not touch Supabase', async () => {
  let calls = 0;
  await assert.rejects(
    run(
      { ...credentials, INSTAGRAM_SOURCE: 'apify', APIFY_TOKEN: 'test' },
      async (input) => {
        calls++;
        assert.equal(new URL(input).hostname, 'api.apify.com');
        return new Response(null, { status: 504 });
      },
    ),
    /Apify Instagram run failed/,
  );
  assert.equal(calls, 1);
});
