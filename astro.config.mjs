import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://uon-space-society.github.io",
  output: "static",
  // Preserve the society's existing public .html URLs on GitHub Pages.
  build: { format: "file" },
});
