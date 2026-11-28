# Instagram Activities feed

The Activities page shows recent public posts from `@uonspacesoc`, newest first.
The feed includes posts published on or after 18 September 2026 (Europe/London).

`tools/instagram-sync.mjs` reads posts from Apify or the official Instagram API,
upserts retained metadata into the private Supabase table, and exports an ignored
`.cache/instagram-posts.json` snapshot. Astro reads that snapshot at build time
to render `/activities.html`. The desktop grid shows five posts per row, with
fewer columns on smaller screens. Each card links to the original post.

## Hosted project and verification

Project `nottingham-space-society` on Supabase Free (Ireland) has the
`public.instagram_posts` table with row-level security enabled. Project
reference: `nolypimujiwyufzjxkol`.

The [live import check](https://github.com/UoN-Space-Society/UoN-Space-Society.github.io/actions/runs/46135672069)
verified the repository credentials for Apify and Supabase and read back nine
retained posts. The `activities` branch is for review. Production deployment
and the daily schedule require the workflow on `main` and the enablement
variable below.

## Create the database

1. Create a Supabase Free project in the society's organisation/account. Record
   the project URL; keep database credentials and secret keys private.
2. Run `supabase/schema.sql` in that project's SQL editor. It is the bootstrap
   copy of `supabase/migrations/202611280001_instagram_posts.sql`; run either one,
   not both as independent schema versions. Future changes belong in migrations.
3. Verify that `public.instagram_posts` exists, RLS is enabled and no anonymous
   read/write policy exists. No bucket is required for this implementation.

The table stores IDs, captions, original links, publication timestamps, media
URLs, media type and sync/expiry timestamps. Actual photos, videos, comments,
access tokens and database credentials are not archived in this table. Instagram
media URLs are external references and are not a guarantee of permanent access.

## Choose a source

For the public `@uonspacesoc` profile, set the Actions variable
`INSTAGRAM_SOURCE` to `apify` and add `APIFY_TOKEN` as an Actions secret.
This uses [Apify Instagram Post Scraper](https://apify.com/apify/instagram-post-scraper)
and needs an Apify account. No Instagram administrator access or AI service is
required for this route. The default limit is 50 results per run. Use
`APIFY_RESULTS_LIMIT` to change it if you need a larger initial backfill.
The accepted range is 1–100 results per run. Check the oldest returned post
against the date cutoff if you need to confirm backfill coverage.
Each importer request caps the Actor charge at USD 0.20. Check reported usage
before enabling daily runs.

The official API remains available when the society can authorise the account.

## Optional official Instagram API

An account administrator must connect the society's Business/Creator Instagram
account to a Meta developer app and grant the read access needed for its own
media. Use a supported official Instagram API login route. Confirm that the
chosen route and token return captions and the other required fields with an
actual society post before enabling the unattended importer. API field coverage
and permissions differ between login routes and can change.

Use the current supported API version deliberately rather than an unversioned
endpoint. The importer verifies the authorised username against `uonspacesoc`;
a public profile URL alone does not grant API access. Access to the Meta app and
account should remain with the society for committee handover.

## Configure GitHub Actions

Set these repository Actions secrets and variables:

| Setting                  | Kind     | Provider | Value                                                                    |
| ------------------------ | -------- | -------- | ------------------------------------------------------------------------ |
| `SUPABASE_URL`           | Secret   | Both     | Supabase project URL                                                     |
| `SUPABASE_SECRET_KEY`    | Secret   | Both     | Server-side Supabase secret key or compatible legacy service-role key    |
| `APIFY_TOKEN`            | Secret   | Apify    | Token with access to run the Instagram Post Scraper and read its results |
| `INSTAGRAM_ACCESS_TOKEN` | Secret   | Meta     | Authorised account's valid long-lived API token                          |
| `INSTAGRAM_USER_ID`      | Secret   | Meta     | Account ID returned by the Instagram API                                 |
| `INSTAGRAM_SOURCE`       | Variable | Both     | `apify` for the tested public feed, or `meta` for the official API       |
| `APIFY_RESULTS_LIMIT`    | Variable | Apify    | Optional, defaults to 50                                                 |
| `INSTAGRAM_API_VERSION`  | Variable | Meta     | Supported Graph API version including the `v` prefix                     |
| `INSTAGRAM_FEED_ENABLED` | Variable | Both     | Set to `true` when ready to activate                                     |

Keep the Supabase key server-side because it bypasses RLS. Keep generated
snapshots and credentials out of Git. The site only receives the generated
public content.

The sync workflow is scheduled daily at 06:23 UTC and deploys only from
`main`. Once activated, the regular Pages workflow also exports the current
feed before building so unrelated site changes preserve the feed. Both
workflows use standard GitHub-hosted runners.

## Preview and troubleshoot

With `SUPABASE_URL` and `SUPABASE_SECRET_KEY` securely supplied in your local
environment, run the following to read existing posts without calling Apify
or changing Supabase:

```sh
node tools/instagram-sync.mjs --export-only
npm run build
npm run preview
```

Open `/activities.html` on the preview server. The page shows a link to the
profile when there is no local snapshot. Run the importer tests with
`node --test tests/instagram-sync.test.mjs`. Check the workflow import and
build steps if the live feed stops updating.

## Meta token lifecycle

Meta documents long-lived Instagram tokens lasting 60 days. An unexpired token
at least 24 hours old can be refreshed. Expired or revoked tokens may require an
administrator to reconnect the account. The current importer does not establish
a durable, unattended token-renewal system: assign an owner to renew the secret
before expiry until secure renewal and persistence are implemented. Do not claim
permanent unattended operation based only on an initial token.

## Retention and storage

The default policy expires a post one calendar year after its original
publication timestamp in UTC. Database triggers calculate `expires_at` on every
write so repeated daily imports cannot extend the lifetime. Importers must skip
already-expired posts, exclude them from snapshots and delete expired rows.
Manual deletion from Supabase is also possible, but a recent post will be
re-imported unless its source is removed or an explicit suppression mechanism is
implemented. Changing the retention duration requires updating the database
function and importer cutoff consistently.

A failed daily deployment can leave previously published content visible. The
one-year policy therefore has daily-job/deployment tolerance; it is not an exact
hard-deletion SLA. Earlier owner/platform deletion requests need explicit handling.
Do not commit the post archive to Git: ordinary file deletion does not remove
historical commits. Backups, workflow artifacts and published snapshots also need
retention decisions.

This version stores no media binaries, so deleting rows does not need a Storage
API call. If image caching is added later, use Supabase Storage, delete objects
through its API, then finalize row deletion with retry handling. Deleting a row
or `storage.objects` metadata alone does not delete stored file bytes.

## Free-tier operating limits

At the time of setup research, Supabase Free lists 500 MB database storage,
1 GB file storage, 5 GB egress plus 5 GB cached egress and two active projects.
Free projects may pause after one week of inactivity; daily use is not a paid
availability guarantee. Metadata-only storage should be modest, but monitor
actual usage rather than assume the tier will always suffice. Supabase Free does
not include the paid plans' automatic backups; plan any private exports and their
retention separately. Database backups do not include Storage file bytes.

GitHub schedules can be delayed or dropped. Failed imports must preserve the
previous published site, report the problem and avoid replacing content with an
empty feed. Run the workflow manually for recovery after fixing access issues.

## Official references

- [Instagram API](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login)
- [Instagram authentication and renewal](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects)
- [Backups](https://supabase.com/docs/guides/platform/backups)
- [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
