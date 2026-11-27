# Nottingham Space Society

A responsive, buildless website for the University of Nottingham Space Society.

Run `npm run dev` and open http://127.0.0.1:4173. Run `npm run build` to produce `dist/`. The root is also ready for GitHub Pages.

## Hosting

The GitHub Pages workflow checks and builds the website, then publishes `dist/` whenever a change is pushed or merged into `main`. It can also be run manually from GitHub Actions. Set Settings → Pages → Source to **GitHub Actions**. The site address is https://uon-space-society.github.io/.

Local environment files, hosting configuration and `.private/` notes are ignored by Git. Project image provenance is kept locally in `.private/project-asset-sources.json`; source manifests named `sources.json` are excluded from the published assets. Ignoring a file does not remove copies from earlier commits.

## Design

The homepage opens with a full-viewport team photograph at SSC Space, transparent navigation, centered society name and a scroll cue inspired by https://imperialrocketry.com/. Its sticky hero fades as the next section covers it; reduced-motion preferences disable the fade. The SSC Space photograph was provided by the user. HELIA and CRES link to their existing project pages.

The rest of the site uses an editorial field-notes identity: warm paper, forest green, acid lime, large typography and annotated lunar imagery. References reviewed from Awwwards: MECHA (restrained palette, technical illustration and typographic contrast) and Overworld Audio (exploration as an interaction model). These principles inform an original composition, rather than reproducing either design.

## Content and assets

Society activities and community links are based on https://su.nottingham.ac.uk/activities/view/spacesoc and https://linktr.ee/spacesoc. HELIA information: https://projecthelia.org/. Events link to the community rather than presenting unverified dates. Project illustrations are original conceptual SVG/CSS drawings, not photographs of society hardware.

Moon rendering: NASA / LRO / Scientific Visualization Studio / Ernie Wright, https://svs.gsfc.nasa.gov/5415/. Locally stored in assets/moon.jpg. DM Sans and Space Mono load from Google Fonts, with local system fallbacks. The static build uses Node.js built-ins. Optional Google Analytics uses cookies only after visitor consent.

Before public launch, the committee should review copy, contact links and current project availability, and can replace conceptual illustrations with its own project photographs.

Header social icons: Instagram, YouTube and LinkedIn SVG paths extracted from the Font Awesome font served by https://purdueseds.space/wp-content/themes/salient/css/fonts/fontawesome-webfont.svg. Discord uses Font Awesome 6 Free Brands (https://github.com/FortAwesome/Font-Awesome). Font Awesome icons are licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Icons are embedded locally; social links open in a new tab.

## Code formatting

Run `npm ci` once to install the formatter. Use `npm run format` to format HTML, CSS, JavaScript, JSON, SVG and workflow files, and `npm run format:check` to check formatting. The shared settings use two-space indentation, an 80-column target and one HTML attribute per line. Generated output and local files are excluded.


## Google Analytics 4

Tracking is installed on every page, including project pages, using the society's
web-stream measurement ID `G-5678YGQX46`. The numeric property ID is `566066828`
and stream ID is `16428511066`. These identifiers are public, not API credentials.
The configuration works from the source folder and in the GitHub Pages build.
Collection starts only after consent. Set the measurement ID to an empty string
to disable the integration.

1. Open https://analytics.google.com/, create an Analytics account if needed, then
   create a GA4 property and a **Web** data stream for
   `https://uon-space-society.github.io/`.
2. Copy the stream's measurement ID into `window.SPACE_ANALYTICS_ID` in
   `analytics-config.js`. This ID is public; no API key is required for collection.
3. In the stream's Enhanced measurement settings, enable scroll measurement if
   wanted. Disable outbound-click, site-search, form-interaction, video-engagement
   and file-download measurement: our custom clicks use sanitized destinations.
   The society stream has already been configured this way, with page views and
   scrolls enabled.
   Disable page views based on browser history changes (this is a multi-page site).
   Do not install a second GA tag through Tag Manager.
4. Deploy through the normal main-branch Pages workflow. Accept analytics on the
   deployed site and check Realtime / Tag Assistant for a page view and a
   `site_link_click` event. Rejecting on a fresh visit must make no requests to
   googletagmanager.com or google-analytics.com. Check nested project pages too.

The banner offers equal accept/reject controls, remembers the choice for 180 days
in local storage, and includes a persistent Analytics settings button. Withdrawal
stops collection and clears GA cookies accessible to this site. Blocked storage
falls back to a choice for the current page. Advertising consent stays denied.
Only consenting visitors appear in reports; ad blockers can also reduce counts.

`site_link_click` records `link_domain`, `link_path`, `link_type` (internal,
outbound or contact) and `link_placement` (navigation, content or footer). It does
not send email addresses, link text, URL fragments or destination query strings.
Page URLs retain only utm_source, utm_medium and utm_campaign; use campaign labels
without personal information. GA also receives normal technical usage data.
Review the society's privacy notice before enabling collection.

Use Traffic acquisition for session sources, Landing page for entry pages, and
Pages and screens for popular content. Register the four click parameters as
event-scoped custom dimensions to break them down in Explore. Mark selected
business outcomes as key events after deciding what counts as success.
For campaign attribution, share links such as
`https://uon-space-society.github.io/?utm_source=instagram&utm_medium=social&utm_campaign=recruitment`.

### Reporting API (local use)

The Data API reads reports; it is separate from the browser collection tag.
The Cloud project is **SpaceSoc Analytics** (`lucid-forklift-516011-j1`).
Google Analytics Data API is enabled and billing is unlinked. The service account
`spacesoc-analytics-reader-01@lucid-forklift-516011-j1.iam.gserviceaccount.com`
has Viewer access to property `566066828`. The supplied key belongs to
`spacesoc-analytics-reader@lucid-forklift-516011-j1.iam.gserviceaccount.com`;
Viewer access for that separate identity is also granted and the supplied key
is installed for it.

Run `npm ci` and then `npm run analytics:report`. The authentication helper uses
Google's official `google-auth-library` with only `analytics.readonly` scope.
It reads a service-account JSON key from
`~/.config/spacesoc-analytics/reader.json`, or the path specified by
`GOOGLE_APPLICATION_CREDENTIALS`. The supplied key is installed locally at the default path.
Keep that directory private (0700) and the key readable only by you (0600).
Never place the key under this repository, its static server root, or `dist/`.

The property defaults to `566066828`; set `GA4_PROPERTY_ID` to override it.
An explicitly supplied `GOOGLE_ACCESS_TOKEN` takes precedence over key-file
authentication. Access tokens and private keys are never logged by the helper.
The command prints the top 100 traffic-source / landing-page combinations for
the last 28 days. An empty successful report is expected before visits arrive.
The local report tool and its dependencies are excluded from the published site.

To revoke a downloaded key, open Cloud Console → IAM & Admin → Service accounts →
spacesoc-analytics-reader → Keys, and disable/delete the corresponding key.
If a key is exposed, revoke it rather than merely deleting the local file.

References: [Google tag consent setup](https://developers.google.com/tag-platform/security/guides/consent)
and [Analytics API setup](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart).


### Tests and the red/green/refactor cycle

Run `npm test`. Tests use Node's built-in test runner with a small simulated
browser boundary; no testing dependencies are required. The Pages workflow runs
them before building. Browser checks complement these tests; simulated Google
commands do not prove that Google received an event.

The existing consent behavior first received characterization tests. Then a new
future-dated consent test failed against the existing code (red). Extracting
`readChoice()` with explicit value, timestamp and age validation made it pass
(green) and kept storage handling in one readable function (refactor).
Two further tests failed for the missing stream ID and the nonstandard tag queue;
adding the observed ID and using Google's documented arguments-object queue made
both pass. Tests also cover rejection, expiry, blocked storage, redacted clicks,
withdrawal and malformed saved choices.

Manual local verification confirmed zero Google tag script elements before
acceptance and the correct tag URL after acceptance, plus reopening and rejecting
through Analytics settings. Live production receipt still requires deployment and
verification in Realtime. Viewer authorization is provisioned. Local authentication support is tested;
the supplied key authenticates successfully. The first request returned 403 because
the key belonged to a different account from the initially authorized reader.
Viewer access for the matching account without the `-01` suffix was then granted;
the live report request succeeded with the expected headers and no traffic rows.


### Cloud authorization issue resolved

The organization enforced `iam.disableServiceAccountKeyCreation`, and the signed-in
account initially lacked permissions to edit it. After the owner granted
Organization Policy Administrator access, a project-only override was saved for
SpaceSoc Analytics with the constraint not enforced. The organization policy was
not changed. A key was subsequently supplied for `spacesoc-analytics-reader` and
installed outside the repository. The owner retains the policy-administrator role;
key creation remains allowed by this project override.

Merging this feature into `dev` does not publish it: the Pages workflow deploys
from `main`. After promotion to `main`, verify page views and `site_link_click`
events in GA4 Realtime with consent accepted. Custom click dimensions still need
registration in GA4 if parameter breakdowns in Explore are wanted.
