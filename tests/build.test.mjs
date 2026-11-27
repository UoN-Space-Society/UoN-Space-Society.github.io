import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { load } from 'cheerio';
import { navigationLinks, membershipLink } from '../src/data/navigation.ts';

const root = resolve('dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesIn(path) : [path];
      }),
    )
  ).flat();
}
const files = await filesIn(root);
const pages = await Promise.all(
  files
    .filter((file) => file.endsWith('.html'))
    .map(async (file) => ({ file, $: load(await readFile(file, 'utf8')) })),
);

test('all 20 public pages have useful metadata and unique page titles', () => {
  assert.equal(pages.length, 20);
  const titles = new Set();
  for (const { file, $ } of pages) {
    assert.equal($('html').attr('lang'), 'en', file);
    assert.equal($('main').length, 1, file);
    assert.equal($('h1').length, 1, file);
    assert.ok($('meta[name=description]').attr('content')?.trim(), file);
    assert.ok(
      $('link[rel=canonical]')
        .attr('href')
        ?.startsWith('https://uon-space-society.github.io/'),
      file,
    );
    const title = $('title').text();
    assert.ok(!titles.has(title), `Duplicate title: ${title}`);
    titles.add(title);
    for (const image of $('img').toArray()) {
      assert.notEqual(
        $(image).attr('alt'),
        undefined,
        `Missing alt in ${file}`,
      );
      assert.ok(
        Number($(image).attr('width')) > 0,
        `Missing image width in ${file}`,
      );
      assert.ok(
        Number($(image).attr('height')) > 0,
        `Missing image height in ${file}`,
      );
    }
  }
});

test('every local link, anchor, and referenced asset resolves', async () => {
  for (const { file, $ } of pages) {
    const current = new URL(`https://example.test/${relative(root, file)}`);
    for (const element of $('[href], [src]').toArray()) {
      const value = $(element).attr('href') ?? $(element).attr('src');
      const url = new URL(value, current);
      if (url.origin !== current.origin) continue;
      const path = resolve(
        root,
        `.${decodeURIComponent(url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname)}`,
      );
      assert.ok(path.startsWith(`${root}/`), value);
      assert.ok((await stat(path)).isFile(), `${file}: ${value}`);
      if (url.hash && path.endsWith('.html')) {
        const target = pages.find((page) => page.file === path);
        assert.ok(
          target
            ?.$('[id]')
            .toArray()
            .some(
              (node) =>
                target.$(node).attr('id') ===
                decodeURIComponent(url.hash.slice(1)),
            ),
          `${file}: ${value}`,
        );
      }
    }
  }
});

test('published files exclude private metadata and unneeded source files', () => {
  for (const file of files) {
    assert.ok(!/sources\.json$|\.env|\.map$|\.ts$|\.astro$/.test(file), file);
  }
});

test('all Astro routes share one ordered Analytics integration', () => {
  for (const { file, $ } of pages) {
    const scripts = $('script[src]')
      .toArray()
      .map((node) => $(node).attr('src'));
    assert.equal(
      scripts.filter((src) => src === '/analytics-config.js').length,
      1,
      file,
    );
    assert.equal(
      scripts.filter((src) => src === '/analytics.js').length,
      1,
      file,
    );
    assert.ok(
      scripts.indexOf('/analytics-config.js') <
        scripts.indexOf('/analytics.js'),
      file,
    );
  }
});

test('division pages retain every project and introduce all three teams', async () => {
  const $ = load(await readFile(resolve(root, 'projects.html'), 'utf8'));
  const about = load(await readFile(resolve(root, 'about.html'), 'utf8'));
  const sourceFiles = await readdir('src/content/projects');
  const actualLinks = $('main .project-photo-card')
    .map((_, element) => $(element).attr('href'))
    .get();
  const expectedLinks = sourceFiles
    .filter((file) => file.endsWith('.json'))
    .map((file) => `/projects/${file.replace('.json', '.html')}`);
  assert.deepEqual(actualLinks.sort(), expectedLinks.sort());
  for (const division of ['rocketry', 'spacecraft', 'research']) {
    assert.equal($(`#${division} h2`).length, 1);
    assert.ok($(`#${division} .project-photo-card`).length > 0);
    assert.equal(about(`#about-${division}`).length, 1);
    assert.equal(about(`a[href="/projects.html#${division}"]`).length, 1);
  }
  assert.equal(about('.about-team img').length, 3);
});

test('every page shares the current desktop/mobile menu and SU membership icon', () => {
  for (const { file, $ } of pages) {
    assert.equal($('header.site-header').length, 1, file);
    for (const selector of ['header .desktop-nav a', 'header #mobile-nav a']) {
      const actual = $(selector)
        .map((_, link) => ({
          label: $(link).text().trim(),
          href: $(link).attr('href'),
        }))
        .get();
      assert.deepEqual(actual, navigationLinks, `${file}: ${selector}`);
    }
    const membership = $(`header a[href="${membershipLink.href}"]`);
    assert.equal(membership.length, 1, `${file}: missing membership link`);
    assert.match(membership.attr('aria-label'), /Students’ Union membership/);
    assert.equal(membership.find('.union-logo').length, 1, file);
    assert.match(membership.find('.union-logo').attr('style'), /url\(/, file);
  }
});

test('secondary logo appears in footers and subpage headers only', () => {
  for (const { file, $ } of pages) {
    const home = relative(root, file) === 'index.html';
    const headerLogo = $('header .brand img').attr('src');
    const footerLogo = $('footer .footer-brand img').attr('src');
    assert.match(footerLogo, /nottingham-space-society-badge\./, file);
    if (home) {
      assert.match(headerLogo, /nottingham-space-society\./, file);
      assert.doesNotMatch(headerLogo, /secondary/, file);
    } else {
      assert.match(headerLogo, /nottingham-space-society-badge\./, file);
    }
  }
});
