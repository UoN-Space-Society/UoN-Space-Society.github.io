import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

const httpsUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
});
const postSchema = z.object({
  id: z.string().min(1),
  caption: z.string().default(''),
  permalink: httpsUrl.refine((value) => {
    const url = new URL(value);
    return (
      ['instagram.com', 'www.instagram.com'].includes(url.hostname) &&
      /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
    );
  }),
  timestamp: z.iso.datetime({ offset: true }),
  media_type: z.string(),
  media_url: httpsUrl.optional().nullable(),
  thumbnail_url: httpsUrl.optional().nullable(),
});
const snapshotSchema = z.object({
  posts: z.array(postSchema),
  fetched_at: z.iso.datetime({ offset: true }).optional(),
});

// This module runs during the Astro build, never in a visitor's browser.
export async function loadInstagramSnapshot() {
  let source: string;
  try {
    source = await readFile(resolve('.cache/instagram-posts.json'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { posts: [], fetched_at: undefined };
    }
    throw error;
  }
  const parsed: unknown = JSON.parse(source);
  const snapshot = snapshotSchema.parse(
    Array.isArray(parsed) ? { posts: parsed } : parsed,
  );
  return {
    ...snapshot,
    posts: [
      ...new Map(snapshot.posts.map((post) => [post.id, post])).values(),
    ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
  };
}
