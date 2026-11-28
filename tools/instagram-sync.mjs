import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FIELDS =
  'id,caption,permalink,timestamp,media_type,media_url,thumbnail_url';
export function expiry(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime()))
    throw new Error('Invalid Instagram timestamp');
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
}
export function record(post, now = new Date()) {
  if (
    !/^\d+$/.test(post.id) ||
    !['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(post.media_type)
  )
    throw new Error('Unsupported Instagram media record');
  const link = new URL(post.permalink);
  if (
    link.protocol !== 'https:' ||
    !['www.instagram.com', 'instagram.com'].includes(link.hostname)
  )
    throw new Error('Invalid post permalink');
  const timestamp = new Date(post.timestamp).toISOString();
  return {
    id: post.id,
    caption: post.caption ?? '',
    permalink: link.href,
    timestamp,
    media_type: post.media_type,
    media_url: post.media_url ?? null,
    thumbnail_url: post.thumbnail_url ?? null,
    synced_at: now.toISOString(),
    expires_at: expiry(timestamp),
  };
}
function required(env, key) {
  if (!env[key]) throw new Error(`Missing ${key}`);
  return env[key];
}
export async function run(
  env = process.env,
  fetcher = fetch,
  exportOnly = false,
) {
  const base = new URL(required(env, 'SUPABASE_URL'));
  if (base.protocol !== 'https:')
    throw new Error('SUPABASE_URL must use HTTPS');
  const key = required(env, 'SUPABASE_SECRET_KEY');
  const now = new Date();
  async function request(url, options = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try {
        response = await fetcher(url, {
          ...options,
          signal: AbortSignal.timeout(30000),
        });
      } catch {
        if (attempt === 2) throw new Error('Network request failed');
      }
      if (response?.ok) {
        const body = await response.text();
        return body ? JSON.parse(body) : null;
      }
      if (response && response.status !== 429 && response.status < 500)
        throw new Error(
          `Remote request failed (${response.status}); check credentials and API access`,
        );
      if (attempt < 2)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** attempt),
        );
    }
    throw new Error('Remote service unavailable after retries');
  }
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  const rest = new URL('/rest/v1/instagram_posts', base);
  if (!exportOnly) {
    const token = required(env, 'INSTAGRAM_ACCESS_TOKEN');
    const id = required(env, 'INSTAGRAM_USER_ID');
    const version = required(env, 'INSTAGRAM_API_VERSION');
    if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(id))
      throw new Error('Invalid Instagram API version or account ID');
    const graph = `https://graph.instagram.com/${version}`;
    const igHeaders = { Authorization: `Bearer ${token}` };
    const account = await request(`${graph}/${id}?fields=id,username`, {
      headers: igHeaders,
    });
    if (account.username?.toLowerCase() !== 'uonspacesoc')
      throw new Error('Authorised Instagram account must be uonspacesoc');
    let cursor;
    const collected = new Map();
    for (let page = 0; page < 20; page++) {
      const url = new URL(`${graph}/${id}/media`);
      url.searchParams.set('fields', FIELDS);
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('after', cursor);
      const result = await request(url, { headers: igHeaders });
      if (!Array.isArray(result.data))
        throw new Error('Invalid Instagram media response');
      let older = false;
      for (const post of result.data) {
        const row = record(post, now);
        if (new Date(row.expires_at) <= now) {
          older = true;
          continue;
        }
        collected.set(row.id, row);
      }
      cursor = result.paging?.cursors?.after;
      if (!result.paging?.next || !cursor || older) break;
      if (page === 19)
        throw new Error(
          'Instagram pagination exceeded bounded import; narrow the import or inspect account',
        );
    }
    if (collected.size) {
      const url = new URL(rest);
      url.searchParams.set('on_conflict', 'id');
      await request(url, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify([...collected.values()]),
      });
    }
    // Only metadata is stored: no Storage objects to orphan when deleting rows.
    const cleanup = new URL(rest);
    cleanup.searchParams.set('expires_at', `lte.${now.toISOString()}`);
    await request(cleanup, { method: 'DELETE', headers });
  }
  const posts = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const url = new URL(rest);
    url.searchParams.set('select', FIELDS);
    url.searchParams.set('expires_at', `gt.${now.toISOString()}`);
    url.searchParams.set('order', 'timestamp.desc,id.desc');
    url.searchParams.set('limit', '500');
    url.searchParams.set('offset', String(offset));
    const rows = await request(url, { headers });
    if (!Array.isArray(rows)) throw new Error('Invalid database response');
    posts.push(...rows);
    if (rows.length < 500) break;
    if (offset === 9500) throw new Error('Snapshot exceeds bounded export');
  }
  const file = resolve('.cache/instagram-posts.json');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(
    file,
    JSON.stringify({ posts, fetched_at: now.toISOString() }),
  );
  console.log(`Exported ${posts.length} retained Instagram posts`);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  run(process.env, fetch, process.argv.includes('--export-only')).catch(
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
