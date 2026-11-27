# Nottingham Space Society

A static Astro website for the University of Nottingham Space Society. All 19
public pages are generated at build time, with the existing `.html` URLs.
There is no application server or React runtime in production.

## Development

Use Node.js 22.23.4 or newer.

```sh
npm ci
npm run dev
```

Open the URL Astro prints (normally http://127.0.0.1:4173). If the port is busy,
Astro chooses another. Astro may run development in the background; use
`npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop` to manage it.

```sh
npm run check          # Astro and TypeScript diagnostics
npm run format         # Format source, including Astro components
npm run format:check   # Check formatting without editing
npm run build          # Generate production files in dist/
npm run preview        # Preview the production build
```

## Source structure

- `src/pages/`: homepage, contact, sponsors, project directory and one project
  detail route. `build.format: "file"` preserves the existing `.html` URLs.
- `src/layouts/SiteLayout.astro`: shared metadata, local fonts, header and footer.
- `src/components/`: navigation, project cards, optimised images and video player.
- `src/content/projects/`: one JSON file per project. Astro validates the schema
  in `src/content.config.ts`; the filename determines the public project slug.
- `src/data/`: navigation links, project group labels and sponsor details.
- `src/styles/`: formatted shared and page-specific CSS. Import page styles only
  where they are used; edit shared card styles in `cards.css`.
- `src/scripts/`: small TypeScript enhancements for navigation and hero scrolling.
- `src/assets/`: original photographs and logos. Astro generates responsive WebP
  raster images; unreferenced originals are not published as public assets.
- `public/`: files published unchanged, including the favicon and font licences.
- `tests/`: production-output checks and Playwright browser acceptance tests.

To add a project, copy a JSON file in `src/content/projects/`, choose a unique
filename, add the original image under `src/assets/projects/`, and update its
content. Use `group` (`recent`, `upcoming`, or `archive`) and `order` for its
position in the directory. The card and detail page share that content. Optional
`featured` fields supply homepage card copy; the homepage selects featured IDs.
Run the checks and build before committing. Adding/removing a public project also
requires updating the intentional route inventory in the acceptance tests.

## Testing

Install Chromium once after installing npm dependencies:

```sh
npx playwright install chromium
npm test
```

`npm test` builds production files, validates metadata, local links, anchors and
published assets, then tests desktop and mobile Chromium against those exact
files. The isolated test server uses port 4381 and never reuses another server.
For an already built site, run `npm run test:build` or `npm run test:browser`.

Browser coverage includes direct public URLs, project navigation, mobile and
tablet navigation, Escape and focus restoration, navigation without JavaScript,
reduced motion, skip links, covered hero links, automated WCAG AA checks,
responsive hero image budgets and deferred video loading. YouTube playback is
stubbed in its test: it verifies when and how the embed is requested, without
relying on YouTube's network or player implementation. Browser tests do not
replace human accessibility and visual review.

For a new feature or bug fix, first add a behaviour test and demonstrate the
failure, implement the change, then refactor while keeping the suite green.
See `docs/migration-validation.md` for the migration's red/green evidence and
asset-size comparisons. Failure traces are saved in ignored `test-results/`.

## Hosting

GitHub Actions validates pull requests and changes pushed to `dev`. It installs
locked dependencies, checks formatting and types, builds, and runs output and
browser tests. Only passing pushes to `dev` or manual workflow runs deploy
`dist/` to GitHub Pages. Pull requests never deploy.

Set Settings → Pages → Source to **GitHub Actions**. The site address is
https://uon-space-society.github.io/. Change `site` in `astro.config.mjs` if the
canonical domain changes. This configuration targets the domain root.

Local environment files, hosting configuration and `.private/` notes are ignored
by Git. Ignoring a file does not remove copies from earlier commits. Project
image provenance is retained locally in `.private/project-asset-sources.json`;
tracked sponsor provenance is in `docs/asset-sources/sponsors.json`, outside the
published asset tree. Never put private source notes in `public/`.

## Design

The homepage opens with a full-viewport team photograph at SSC Space, transparent navigation, centered society name and a scroll cue inspired by https://imperialrocketry.com/. Its sticky hero fades as the next section covers it; reduced-motion preferences disable the fade. The SSC Space photograph was provided by the user. HELIA and CRES link to their existing project pages.

The rest of the site uses an editorial field-notes identity: warm paper, forest green, acid lime, large typography and annotated lunar imagery. References reviewed from Awwwards: MECHA (restrained palette, technical illustration and typographic contrast) and Overworld Audio (exploration as an interaction model). These principles inform an original composition, rather than reproducing either design.

## Content and assets

Society activities and community links are based on https://su.nottingham.ac.uk/activities/view/spacesoc and https://linktr.ee/spacesoc. HELIA information: https://projecthelia.org/. Events link to the community rather than presenting unverified dates. Project illustrations are original conceptual SVG/CSS drawings, not photographs of society hardware.

Moon rendering: NASA / LRO / Scientific Visualization Studio / Ernie Wright, https://svs.gsfc.nasa.gov/5415/. Locally stored in assets/moon.jpg. DM Sans and Space Mono are self-hosted WOFF2 fonts with system fallbacks. Their OFL licences ship in `public/licenses/`. Astro generates static HTML and optimises raster images at build time. The video player connects to YouTube only after a visitor presses Play. No first-party cookies or analytics.

Before public launch, the committee should review copy, contact links and current project availability, and can replace conceptual illustrations with its own project photographs.

Header social icons: Instagram, YouTube and LinkedIn SVG paths extracted from the Font Awesome font served by https://purdueseds.space/wp-content/themes/salient/css/fonts/fontawesome-webfont.svg. Discord uses Font Awesome 6 Free Brands (https://github.com/FortAwesome/Font-Awesome). Font Awesome icons are licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Icons are embedded locally; social links open in a new tab.
