import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { load } from 'cheerio';

const repo = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://www.instagram.com';
const longCaption = `Build a rocket, test a satellite, or watch our next launch.

${'Our teams welcome anyone curious about space. '.repeat(16).trim()}
Meet us at the Coates Road Auditorium.`;
const shortCaption = 'Thanks for coming!';
const makePost = (id, date, caption, media) => ({
  id,
  caption,
  permalink: `${base}/p/${id}/`,
  timestamp: date,
  media_type: media ? 'VIDEO' : 'IMAGE',
  ...(media && {
    thumbnail_url: 'https://cdn.example.test/preview.jpg',
    media_url: 'https://cdn.example.test/video.mp4',
  }),
});
const latest = makePost('latest', '2026-09-18T23:30:00Z', longCaption, true);
const earlier = makePost('earlier', '2026-09-18T10:00:00Z', shortCaption);
const noCaption = makePost('oldest', '2026-09-18T02:00:00Z', '');
const additionalPosts = [17, 16, 15].map((day) =>
  makePost(`post-${day}`, `2026-09-${day}T12:00:00Z`, shortCaption),
);
const orderedPosts = [latest, earlier, noCaption, ...additionalPosts];
let scratch;
let populated;
let empty;

before(() => {
  scratch = mkdtempSync(join(tmpdir(), 'activities-test-'));
  for (const entry of [
    'astro.config.mjs',
    'src',
    'public',
    'package.json',
    'tsconfig.json',
  ]) {
    cpSync(join(repo, entry), join(scratch, entry), { recursive: true });
  }
  symlinkSync(
    join(repo, 'node_modules'),
    join(scratch, 'node_modules'),
    'junction',
  );
  const build = () => {
    execFileSync(
      process.execPath,
      [join(repo, 'node_modules/astro/bin/astro.mjs'), 'build'],
      {
        cwd: scratch,
        stdio: 'pipe',
      },
    );
    return load(readFileSync(join(scratch, 'dist/activities.html'), 'utf8'));
  };

  // Build in a private fixture directory to preserve the developer's local snapshot.
  empty = build();
  mkdirSync(join(scratch, '.cache'), { recursive: true });
  writeFileSync(
    join(scratch, '.cache/instagram-posts.json'),
    JSON.stringify({
      posts: [earlier, noCaption, ...additionalPosts, latest, latest],
      fetched_at: '2026-09-20T09:00:00Z',
    }),
  );
  populated = build();
});

after(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

test('Activities puts a compact preview and native caption disclosure on long posts', () => {
  const card = populated('main article').first();
  const disclosure = card.find('details');
  assert.equal(
    disclosure.length,
    1,
    'Long captions must start behind a native disclosure',
  );
  assert.equal(disclosure.attr('open'), undefined);
  assert.equal(disclosure.find('summary').text().trim(), 'Read full caption');

  const closed = card.clone();
  closed.find('details').remove();
  assert.ok(closed.text().includes('Build a rocket'));
  assert.ok(!closed.text().includes('Coates Road Auditorium'));
  assert.ok(disclosure.text().includes(longCaption));
});

test('Activities preserves original links, London dates, and newest-first order', () => {
  const cards = populated('main article');
  assert.equal(
    cards.length,
    orderedPosts.length,
    'Duplicate IDs produce only one card',
  );
  assert.deepEqual(
    cards
      .find('time')
      .map((_, time) => populated(time).attr('datetime'))
      .get(),
    orderedPosts.map((post) => post.timestamp),
  );
  const featured = cards.first();
  assert.equal(featured.find('time').text().trim(), '19 Sept 2026');
  const links = featured.find(`a[href="${latest.permalink}"]`);
  assert.equal(links.length, 2);
  assert.equal(links.find('img').attr('src'), latest.thumbnail_url);
  assert.equal(featured.find('time + a').text().trim(), 'View on Instagram');
  assert.ok(populated('main').text().includes('Last updated'));
});

test('Short and empty posts need no disclosure and work without media', () => {
  const cards = populated('main article');
  for (const index of [1, 2]) {
    assert.equal(cards.eq(index).find('img, details').length, 0);
    assert.equal(cards.eq(index).find('a').length, 1);
  }
  assert.ok(cards.eq(1).text().includes(shortCaption));
  assert.equal(cards.eq(2).find('p').length, 0);
});

test('Activities has an honest profile link when no snapshot is available', () => {
  assert.equal(empty('main article').length, 0);
  assert.equal(empty('main a').last().attr('href'), `${base}/uonspacesoc/`);
  assert.match(empty('main').text(), /latest society activities/);
});

test(
  'Activities stays compact and expands captions by keyboard without JavaScript',
  {
    skip: process.env.ACTIVITIES_BROWSER_TEST !== '1',
  },
  async () => {
    const { chromium } = await import('@playwright/test');
    const dist = join(scratch, 'dist');
    const server = createServer((request, response) => {
      const path = new URL(request.url, 'http://localhost').pathname;
      const type =
        path === '/activities.html'
          ? 'text/html; charset=utf-8'
          : path.startsWith('/_astro/') && extname(path) === '.css'
            ? 'text/css'
            : null;
      if (!type) return response.writeHead(404).end();
      response.writeHead(200, { 'Content-Type': type });
      response.end(readFileSync(join(dist, path)));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
      browser = await chromium.launch();
      const origin = `http://127.0.0.1:${server.address().port}`;
      const page = await browser.newPage({
        javaScriptEnabled: false,
        viewport: { width: 1440, height: 900 },
      });
      await page.route('**/*', (route) =>
        route.request().url().startsWith(origin)
          ? route.continue()
          : route.abort(),
      );
      await page.goto(`${origin}/activities.html`);
      const cards = page.locator('main article');
      const bounds = await cards.evaluateAll((items) =>
        items.map((card) => {
          const { top, bottom } = card.getBoundingClientRect();
          return { top, bottom };
        }),
      );
      assert.equal(bounds.length, 6);
      assert.ok(bounds.slice(0, 5).every(({ top }) => top === bounds[0].top));
      assert.ok(bounds[5].top > bounds[0].bottom);
      assert.ok(
        bounds[0].bottom - bounds[0].top < 500,
        'The closed caption keeps its card compact',
      );
      assert.ok(
        bounds[1].bottom < bounds[0].bottom,
        'Shorter cards do not stretch',
      );

      const summary = cards.first().locator('summary');
      const fullCaption = cards.first().locator('details p');
      assert.equal(await fullCaption.isVisible(), false);
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await fullCaption.isVisible(), true);
      assert.equal(
        await summary.evaluate((node) => node === document.activeElement),
        true,
      );
      await page.keyboard.press('Enter');
      assert.equal(await fullCaption.isVisible(), false);

      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
      );
      assert.ok(
        (await cards.nth(1).boundingBox()).y >
          (await cards.first().boundingBox()).y,
      );
    } finally {
      await browser?.close();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
