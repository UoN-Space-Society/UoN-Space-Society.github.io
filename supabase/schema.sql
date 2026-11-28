-- Private Instagram metadata store. Run with the Supabase SQL editor or migrations.
-- Media files and access tokens are deliberately not stored in this table.
create table if not exists public.instagram_posts (
  id text primary key,
  caption text not null default '',
  permalink text not null,
  timestamp timestamptz not null,
  media_type text not null,
  media_url text,
  thumbnail_url text,
  synced_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists instagram_posts_timestamp_idx
  on public.instagram_posts (timestamp desc);
create index if not exists instagram_posts_expires_at_idx
  on public.instagram_posts (expires_at);

-- Anchor retention to publication, never the latest sync. UTC makes the policy
-- consistent regardless of the importing client's session timezone.
create or replace function public.set_instagram_post_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.expires_at := (new.timestamp at time zone 'UTC' + interval '1 year')
    at time zone 'UTC';
  return new;
end;
$$;

create or replace trigger instagram_post_expiry
before insert or update on public.instagram_posts
for each row execute function public.set_instagram_post_expiry();

alter table public.instagram_posts enable row level security;
-- No public policies: browsers cannot read or write the archive.
revoke all on table public.instagram_posts from anon, authenticated;
grant select, insert, update, delete on table public.instagram_posts to service_role;
revoke all on function public.set_instagram_post_expiry() from public;
