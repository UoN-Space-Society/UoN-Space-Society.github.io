import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://uon-space-society.github.io",
  output: "static",
  // Temporary staging area until the legacy pages and assets are migrated.
  publicDir: "./.astro-public",
});
