# Astro migration validation

## Acceptance tests before implementation

Tests describe public behaviour and output requirements, rather than internal
functions or component structure. They were run against the legacy production
build before migrating the implementation.

- Browser baseline: 56 passed, 6 failed (desktop and mobile Chromium).
- Expected browser failures: navigation without JavaScript, responsive hero
  images, and homepage ARIA accessibility.
- Build baseline: 2 passed, 1 failed (missing canonical URLs).
- Preserved behaviour already passed; it was not deliberately broken to create
  a failing test.

Original source assets: hero photograph 1,092,072 bytes; society logo 700,619
bytes; stylesheet 30,218 bytes; browser JavaScript 1,852 bytes.

These are asset sizes, not measurements of real-world loading time. Browser
acceptance tests use a local production server; they do not establish field
Core Web Vitals or guarantee accessibility beyond their automated checks.
