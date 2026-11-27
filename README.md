# Nottingham Space Society

A responsive, buildless website for the University of Nottingham Space Society.

Run `npm run dev` and open http://127.0.0.1:4173. Run `npm run build` to produce `dist/`. The root is also ready for GitHub Pages.

## Hosting

The GitHub Pages workflow checks and builds the website, then publishes `dist/` whenever a change is pushed or merged into `main`. It can also be run manually from GitHub Actions. Set Settings → Pages → Source to **GitHub Actions**. The site address is https://uon-space-society.github.io/.

Local environment files, hosting configuration and `.private/` notes are ignored by Git. Project image provenance is kept locally in `.private/project-asset-sources.json`; source manifests named `sources.json` are excluded from the published assets. Ignoring a file does not remove copies from earlier commits.

## Design

An editorial field-notes identity: warm paper, forest green, acid lime, large typography and annotated lunar imagery. References reviewed from Awwwards: MECHA (restrained palette, technical illustration and typographic contrast) and Overworld Audio (exploration as an interaction model). These principles inform an original composition, rather than reproducing either design.

## Content and assets

Society activities and community links are based on https://su.nottingham.ac.uk/activities/view/spacesoc and https://linktr.ee/spacesoc. HELIA information: https://projecthelia.org/. Events link to the community rather than presenting unverified dates. Project illustrations are original conceptual SVG/CSS drawings, not photographs of society hardware.

Moon rendering: NASA / LRO / Scientific Visualization Studio / Ernie Wright, https://svs.gsfc.nasa.gov/5415/. Locally stored in assets/moon.jpg. DM Sans and Space Mono load from Google Fonts, with local system fallbacks. No build dependencies, cookies or analytics.

Before public launch, the committee should review copy, contact links and current project availability, and can replace conceptual illustrations with its own project photographs.
