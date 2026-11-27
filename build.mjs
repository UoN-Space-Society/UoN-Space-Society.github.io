import { mkdir, cp, copyFile, rm } from "node:fs/promises";
await rm(".astro-public", { recursive: true, force: true });
await mkdir(".astro-public", { recursive: true });
for (const file of [
  "sponsors.html",
  "contact.html",
  "projects.html",
  "style.css",
  "script.js",
])
  await copyFile(file, `.astro-public/${file}`);
await cp("projects", ".astro-public/projects", { recursive: true });
await cp("assets", ".astro-public/assets", {
  recursive: true,
  filter: (source) => !source.endsWith("/sources.json"),
});
console.log("Legacy static files prepared for Astro.");
