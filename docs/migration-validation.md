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

## Green implementation

- All 19 pages now render through shared Astro components; the raw HTML bridge
  and custom copy build are removed. Existing public `.html` paths are retained.
- Project content is validated once and shared by the directory, featured cards,
  metadata and detail route.
- A new video-loading test was demonstrated red before implementing the
  click-to-load player. It verifies the iframe request with a stubbed response.
- A failing skip-link focus test led to explicit focusable main landmarks.
- The hero keyboard test asserts focus behaviour rather than assuming every
  browser accessibility tree omits inert links from role queries.
- Final result: **68 browser tests pass**, **3 build tests pass**, and Astro /
  TypeScript diagnostics report **0 errors, warnings or hints**.
- Formatting checks and the production build pass. The full checks and test
  suite also pass on Node 22.23.5, matching CI's Node 22 major version, as well as
  the development environment's Node 26.
- Manual browser checks found no horizontal overflow across five representative
  pages at 320, 650, 800, 1100 and 1440 pixels. All project and sponsor gallery
  images were scrolled into view and successfully decoded. Desktop and mobile
  screenshots were reviewed against the original design.

## Asset comparison

The baseline used the legacy build from commit `5a7bbfa`. New figures come from
production output, before HTTP compression. Hero and logo selections were
checked in fresh browser contexts; cache state, viewport and device pixel ratio
can change which responsive image is selected.

| Asset                                      | Legacy bytes | Astro bytes |        Change |
| ------------------------------------------ | -----------: | ----------: | ------------: |
| Hero, desktop 1440×900 at DPR 1            |    1,092,072 |     119,634 | 89.0% smaller |
| Hero, mobile 393×851 at DPR 2.75           |    1,092,072 |     332,182 | 69.6% smaller |
| Header logo, desktop DPR 1                 |      700,619 |       9,360 | 98.7% smaller |
| Header logo, mobile DPR 2.75               |      700,619 |      24,248 | 96.5% smaller |
| Homepage stylesheets                       |       30,218 |       9,630 | 68.1% smaller |
| Homepage scripts, including inline modules |        1,852 |       1,536 | 17.1% smaller |

Hero image `sizes` accounts for the wider image needed by `object-fit: cover`
inside a tall mobile viewport. This preserves sharpness rather than selecting a
small landscape image and stretching it. Small originals are not upscaled.

Fonts are served locally with `font-display: swap`; the main font is preloaded.
The homepage made no external resource requests before video playback in the
fresh local browser checks. The YouTube player and its third-party fonts now
load only on demand. No client framework or hydration runtime is shipped.

These reductions improve the amount of work and data needed to render the site.
They do **not** establish a percentage improvement in load time. Production
network performance, field Core Web Vitals, other browser engines and GitHub's
hosted Actions run still need their own verification. Astro's image processing
also adds work to a clean build; it is not a claim that builds are faster than
copying static files.

## Reconciliation with later dev changes

The conflict resolution preserves dev's compact contact section, removes its
redundant video link and homepage back-to-top control, and retains the
translucent sliding navigation. Navigation uses native details and CSS size
interpolation rather than a second JavaScript height/state implementation.
Browsers without size interpolation keep working native navigation; reduced
motion disables the slide.

Shared EditorConfig and formatter settings are retained with Astro support.
Formatted SVGs were checked for equivalent geometry, text and styling. Legacy
HTML and the old copy-build script remain removed. The lockfile was regenerated
from the combined package configuration and installed with `npm ci`.

Additional acceptance tests cover the compact contact section and dropdown
layout across resizing. The full result is **72 passing browser tests**, three
passing build checks, and no Astro/TypeScript diagnostics. The resize case also
passed ten repeated desktop/mobile executions. A manual check confirmed the
native slide interpolates its height and the open menu passes automated WCAG
AA checks.
