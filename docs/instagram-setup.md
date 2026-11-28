# Instagram Activities feed

This integration imports the authorised `@uonspacesoc` account into a private
Supabase table and renders a public static snapshot with Astro. Creating these
files does not create a hosted project, connect Instagram, or enable the schedule.
Real posts require account authorisation and configured secrets.

## Current hosted project

Project `nottingham-space-society` has been created on Supabase Free in Ireland.
Project reference: `nolypimujiwyufzjxkol`.
The `public.instagram_posts` schema has been applied and RLS verified enabled.
The database is not yet connected to GitHub Actions or an authorised Instagram
account. No live posts have been imported. The branch is not deployed.

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
Check the oldest returned post against the date cutoff during the first run.
Check the Actor's reported usage before enabling daily runs.

The official API remains available when the society can authorise the account.

## Authorise Instagram

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

Both sources need the Supabase URL and server key. The official API also needs the
Instagram token, user ID and API version. Save the credentials below as repository
Actions secrets.

| Secret                   | Value                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| `SUPABASE_URL`           | Supabase project URL, such as `https://PROJECT.supabase.co`            |
| `SUPABASE_SECRET_KEY`    | Server-side Supabase secret key, or compatible legacy service-role key |
| `INSTAGRAM_ACCESS_TOKEN` | Authorised account's valid long-lived API token                        |
| `INSTAGRAM_USER_ID`      | Account ID returned by the selected Instagram API                      |

For the official API, set the Actions variable `INSTAGRAM_API_VERSION` to the supported version
(e.g. the version selected in your Meta dashboard). For either source, set
`INSTAGRAM_FEED_ENABLED` to `true` only after the database and secrets are configured. Until then the daily
job is disabled.

Supabase secret/service-role credentials are privileged and bypass RLS. They are
for server-side jobs only; do not prefix them with `PUBLIC_` or put them in
browser code. The public site receives only generated public post content.

The daily workflow must be present on the repository's default branch to run on
a schedule. Branch/manual testing must not deploy to production. Review the
workflow, configure the secrets and test an actual import before merging. GitHub
Pages environment approvals or branch protection may need deliberate setup for
unattended deployment; do not bypass them silently.

The integration is intended for standard GitHub-hosted Ubuntu runners in this
public repository, not paid larger runners. Keep generated snapshots out of Git
history, keep artifact retention short and deploy only successful builds. A
single workflow can import and deploy without needing to push data commits to
`main`.

## Token lifecycle

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

The Activities feed starts on 18 September 2026 (Europe/London), inclusive.
