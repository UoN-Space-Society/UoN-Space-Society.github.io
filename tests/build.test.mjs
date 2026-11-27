import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { load } from "cheerio";

const root = resolve("dist");
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }))).flat();
}
const files = await filesIn(root);
const pages = await Promise.all(files.filter((file) => file.endsWith(".html")).map(async (file) => ({ file, $: load(await readFile(file, "utf8")) })));

test("all 19 public pages have useful metadata and unique page titles", () => {
  assert.equal(pages.length, 19);
  const titles = new Set();
  for (const { file, $ } of pages) {
    assert.equal($("html").attr("lang"), "en", file);
    assert.equal($("main").length, 1, file);
    assert.equal($("h1").length, 1, file);
    assert.ok($("meta[name=description]").attr("content")?.trim(), file);
    assert.ok($("link[rel=canonical]").attr("href")?.startsWith("https://uon-space-society.github.io/"), file);
    const title = $("title").text();
    assert.ok(!titles.has(title), `Duplicate title: ${title}`);
    titles.add(title);
    for (const image of $("img").toArray()) {
      assert.notEqual($(image).attr("alt"), undefined, `Missing alt in ${file}`);
      assert.ok(Number($(image).attr("width")) > 0, `Missing image width in ${file}`);
      assert.ok(Number($(image).attr("height")) > 0, `Missing image height in ${file}`);
    }
  }
});

test("every local link, anchor, and referenced asset resolves", async () => {
  for (const { file, $ } of pages) {
    const current = new URL(`https://example.test/${relative(root, file)}`);
    for (const element of $("[href], [src]").toArray()) {
      const value = $(element).attr("href") ?? $(element).attr("src");
      const url = new URL(value, current);
      if (url.origin !== current.origin) continue;
      const path = resolve(root, `.${decodeURIComponent(url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname)}`);
      assert.ok(path.startsWith(`${root}/`), value);
      assert.ok((await stat(path)).isFile(), `${file}: ${value}`);
      if (url.hash && path.endsWith(".html")) {
        const target = pages.find((page) => page.file === path);
        assert.ok(target?.$("[id]").toArray().some((node) => target.$(node).attr("id") === decodeURIComponent(url.hash.slice(1))), `${file}: ${value}`);
      }
    }
  }
});

test("published files exclude private metadata and unneeded source files", () => {
  for (const file of files) {
    assert.ok(!/sources\.json$|\.env|\.map$|\.ts$|\.astro$/.test(file), file);
  }
});
