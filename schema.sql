-- Trillium 1300 — Condition Survey
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- SECURITY MODEL
-- The anon key ships in the page, so it cannot be a secret. Instead:
--   * RLS is ON for every table and NO policies are defined, so the anon role
--     can never read or write a table directly, even holding the anon key.
--   * All access goes through SECURITY DEFINER functions that verify a bcrypt
--     passphrase hash server-side before touching a row.
-- The passphrase is the actual credential. The anon key alone gets you nothing.

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────── tables ───────────────────────────

create table if not exists public.surveys (
  slug        text primary key,
  title       text not null default 'Trillium 1300 — Condition Survey',
  pass_hash   text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.records (
  survey_slug   text not null references public.surveys(slug) on delete cascade,
  checkpoint_id text not null,
  state         text check (state is null or state in ('sound','serviceable','repair','failed','na')),
  note          text not null default '',
  cost_estimate numeric(10,2),
  updated_by    text not null default '',
  updated_at    timestamptz not null default now(),
  primary key (survey_slug, checkpoint_id)
);

-- Photos live in Postgres rather than Storage on purpose: Storage bucket policies
-- can't check our passphrase, so a bucket reachable by the anon key would be a
-- hole in the gate. Images are downscaled client-side before upload.
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  survey_slug   text not null references public.surveys(slug) on delete cascade,
  checkpoint_id text not null,
  thumb         bytea not null,          -- ~240px, shown in the strip
  data          bytea not null,          -- ~1600px, fetched only when tapped
  mime          text not null default 'image/jpeg',
  caption       text not null default '',
  uploaded_by   text not null default '',
  uploaded_at   timestamptz not null default now()
);

create index if not exists photos_lookup on public.photos (survey_slug, checkpoint_id, uploaded_at);
create index if not exists records_touched on public.records (survey_slug, updated_at desc);

-- Project pages are a parallel area to the survey: "how do we do this job"
-- rather than "what condition is this in". Their state is a different shape —
-- one boolean per tickable item — so it gets its own table rather than being
-- bent into `records`.
--
-- The key is (survey_slug, project_slug, item_id). survey_slug is in there
-- beyond what the checkbox needs so the cascade below works and the shape
-- matches `records`; without it, deleting a survey would orphan these rows.
--
-- item_id is namespaced by the data file: "part.pump-4008", "step.jug-season".
-- It is a primary key column, so an id in projects.js is permanent — rewording
-- a part's display name is free, renaming its id orphans everyone's tick.
create table if not exists public.project_items (
  survey_slug   text not null references public.surveys(slug) on delete cascade,
  project_slug  text not null,
  item_id       text not null,
  checked       boolean not null default false,
  updated_by    text not null default '',
  updated_at    timestamptz not null default now(),
  primary key (survey_slug, project_slug, item_id)
);

create index if not exists project_items_touched on public.project_items (survey_slug, updated_at desc);

-- ─────────────────────────── lockdown ───────────────────────────

alter table public.surveys enable row level security;
alter table public.records enable row level security;
alter table public.photos  enable row level security;
alter table public.project_items enable row level security;

-- No policies are created. With RLS enabled and zero policies, PostgreSQL denies
-- every row to any non-owner role. Revoke the table grants too, belt and braces.
revoke all on public.surveys from anon, authenticated;
revoke all on public.records from anon, authenticated;
revoke all on public.photos  from anon, authenticated;
revoke all on public.project_items from anon, authenticated;

-- ─────────────────────────── gate ───────────────────────────

create or replace function public.assert_pass(p_slug text, p_pass text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.surveys
    where slug = p_slug and pass_hash = crypt(p_pass, pass_hash)
  ) then
    -- Slow the loop down. bcrypt is already costly; this makes online guessing
    -- pointless without needing a rate-limit table.
    perform pg_sleep(0.5);
    raise exception 'Wrong passphrase' using errcode = '28000';
  end if;
end $$;

-- Not callable from the browser; it is a helper for the functions below.
revoke all on function public.assert_pass(text, text) from public, anon, authenticated;

-- ─────────────────────────── read ───────────────────────────

create or replace function public.survey_unlock(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_title text;
begin
  perform public.assert_pass(p_slug, p_pass);
  select title into v_title from public.surveys where slug = p_slug;
  return json_build_object('ok', true, 'title', v_title);
end $$;

-- Cheap "has anything changed?" probe. The client polls this every few seconds
-- and only pulls the full record set when the signature moves.
--
-- The project counters ride along here rather than getting their own poller.
-- Every RPC runs assert_pass, and assert_pass is a bcrypt compare — a second
-- 5s timer would double the bcrypt work server-side just to ask "anything new?".
-- Two extra subqueries on one round trip is much cheaper than a second call.
create or replace function public.survey_rev(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v json;
begin
  perform public.assert_pass(p_slug, p_pass);
  select json_build_object(
           'n',     count(*),
           'last',  coalesce(max(extract(epoch from updated_at) * 1000), 0),
           'photos',(select count(*) from public.photos where survey_slug = p_slug),
           'pn',    (select count(*) from public.project_items where survey_slug = p_slug),
           'plast', (select coalesce(max(extract(epoch from updated_at) * 1000), 0)
                       from public.project_items where survey_slug = p_slug)
         )
    into v
    from public.records where survey_slug = p_slug;
  return v;
end $$;

create or replace function public.survey_records(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v json;
begin
  perform public.assert_pass(p_slug, p_pass);
  select coalesce(json_object_agg(
           checkpoint_id,
           json_build_object(
             'state',        state,
             'note',         note,
             'costEstimate', cost_estimate,
             'updatedBy',    updated_by,
             'updatedAt',    extract(epoch from updated_at) * 1000
           )), '{}'::json)
    into v
    from public.records where survey_slug = p_slug;
  return v;
end $$;

-- ─────────────────────────── write ───────────────────────────

-- One atomic upsert per checkpoint. Because each grade is its own row, two
-- phones editing different checkpoints never contend. When they edit the SAME
-- checkpoint, the newer timestamp wins and the older write is dropped.
--
-- p_updated_at is normally null, meaning "stamp it now, server-side" — that
-- avoids trusting phone clocks. The importer passes the original timestamps.
create or replace function public.survey_upsert(
  p_slug text, p_pass text, p_checkpoint text,
  p_state text, p_note text, p_cost numeric, p_by text,
  p_updated_at double precision default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_ts timestamptz;
begin
  perform public.assert_pass(p_slug, p_pass);

  v_ts := case when p_updated_at is null then now()
               else to_timestamp(p_updated_at / 1000.0) end;

  insert into public.records as r
    (survey_slug, checkpoint_id, state, note, cost_estimate, updated_by, updated_at)
  values
    (p_slug, p_checkpoint, p_state, coalesce(p_note,''), p_cost, coalesce(p_by,''), v_ts)
  on conflict (survey_slug, checkpoint_id) do update
    set state         = excluded.state,
        note          = excluded.note,
        cost_estimate = excluded.cost_estimate,
        updated_by    = excluded.updated_by,
        updated_at    = excluded.updated_at
    where excluded.updated_at >= r.updated_at;

  return json_build_object('ok', true);
end $$;

-- NOT granted to anon — see the revoke in the grants block. This wipes every
-- grade and every photo for everyone, there is no history table to recover
-- from, and Postgres holds the only copy. It is kept only so it can be run
-- deliberately from the SQL editor, never from a phone.
create or replace function public.survey_clear(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_pass(p_slug, p_pass);
  delete from public.records where survey_slug = p_slug;
  delete from public.photos  where survey_slug = p_slug;
  return json_build_object('ok', true);
end $$;

-- ─────────────────────────── project pages ───────────────────────────

-- Everything ticked, keyed project -> item. Nested json_object_agg: the inner
-- one builds a project's items, the outer one keys those by project slug.
create or replace function public.project_items_all(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v json;
begin
  perform public.assert_pass(p_slug, p_pass);
  select coalesce(json_object_agg(project_slug, items), '{}'::json)
    into v
    from (
      select project_slug,
             json_object_agg(
               item_id,
               json_build_object(
                 'checked',   checked,
                 'updatedBy', updated_by,
                 'updatedAt', extract(epoch from updated_at) * 1000
               )) as items
        from public.project_items
       where survey_slug = p_slug
       group by project_slug
    ) g;
  return v;
end $$;

-- One atomic upsert per item, the same shape as survey_upsert. Two phones
-- ticking different parts never contend; ticking the same part resolves
-- server-side on the timestamp, newest wins.
--
-- A checkbox is a single field, so the field-level merge problem the survey has
-- within one checkpoint (someone typing a note while someone else sets a state)
-- cannot arise here — there is nothing else in the row to clobber.
create or replace function public.project_set(
  p_slug text, p_pass text, p_project text, p_item text,
  p_checked boolean, p_by text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_pass(p_slug, p_pass);

  insert into public.project_items as t
    (survey_slug, project_slug, item_id, checked, updated_by, updated_at)
  values
    (p_slug, p_project, p_item, coalesce(p_checked, false), coalesce(p_by, ''), now())
  on conflict (survey_slug, project_slug, item_id) do update
    set checked    = excluded.checked,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    where excluded.updated_at >= t.updated_at;

  return json_build_object('ok', true);
end $$;

-- Scoped to one project on purpose. "Clear survey" does not touch project
-- state — the two areas have separate lifecycles, and wiping a shopping list
-- because someone reset the grading would be a nasty surprise.
create or replace function public.project_clear(p_slug text, p_pass text, p_project text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_pass(p_slug, p_pass);
  delete from public.project_items where survey_slug = p_slug and project_slug = p_project;
  return json_build_object('ok', true);
end $$;

-- ─────────────────────────── CI ───────────────────────────

-- Continuous integration needs to answer one question before a project page is
-- allowed to merge: "does this edit delete an item id that someone has already
-- ticked?" Answering it needs database access, and giving a CI runner the
-- survey passphrase would hand it read/write over every grade, note and photo.
--
-- So CI gets its own credential and its own function. `ci_hash` unlocks exactly
-- one thing: a list of opaque item ids and whether they are ticked. No grades,
-- no notes, no costs, no photos. Leaking it costs you the knowledge that
-- "part.pump-4008" exists.
--
-- Set it separately from the real passphrase:
--   update public.surveys
--      set ci_hash = extensions.crypt('some other phrase', extensions.gen_salt('bf', 10))
--    where slug = 'trillium-1300';
alter table public.surveys add column if not exists ci_hash text;

create or replace function public.assert_pass_or_ci(p_slug text, p_pass text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.surveys
    where slug = p_slug
      and (pass_hash = crypt(p_pass, pass_hash)
        or (ci_hash is not null and ci_hash = crypt(p_pass, ci_hash)))
  ) then
    perform pg_sleep(0.5);
    raise exception 'Wrong passphrase' using errcode = '28000';
  end if;
end $$;

revoke all on function public.assert_pass_or_ci(text, text) from public, anon, authenticated;

-- Deliberately the narrowest possible payload. Accepts the survey passphrase
-- too, so a human can run the same check locally without a second credential.
create or replace function public.project_item_ids(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v json;
begin
  perform public.assert_pass_or_ci(p_slug, p_pass);
  select coalesce(json_agg(json_build_object(
           'project', project_slug,
           'item',    item_id,
           'checked', checked,
           'by',      updated_by
         ) order by project_slug, item_id), '[]'::json)
    into v
    from public.project_items where survey_slug = p_slug;
  return v;
end $$;

-- ─────────────────────────── photos ───────────────────────────

-- Metadata plus thumbnails only. Full-size bytes are never in this payload.
create or replace function public.survey_photos(p_slug text, p_pass text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v json;
begin
  perform public.assert_pass(p_slug, p_pass);
  select coalesce(json_agg(json_build_object(
           'id',         id,
           'checkpoint', checkpoint_id,
           'thumb',      encode(thumb, 'base64'),
           'mime',       mime,
           'caption',    caption,
           'uploadedBy', uploaded_by,
           'uploadedAt', extract(epoch from uploaded_at) * 1000
         ) order by uploaded_at), '[]'::json)
    into v
    from public.photos where survey_slug = p_slug;
  return v;
end $$;

create or replace function public.survey_photo_data(p_slug text, p_pass text, p_id uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v json;
begin
  perform public.assert_pass(p_slug, p_pass);
  select json_build_object('data', encode(data, 'base64'), 'mime', mime)
    into v
    from public.photos where id = p_id and survey_slug = p_slug;
  return v;
end $$;

create or replace function public.survey_photo_add(
  p_slug text, p_pass text, p_checkpoint text,
  p_thumb text, p_data text, p_mime text, p_caption text, p_by text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_id uuid;
begin
  perform public.assert_pass(p_slug, p_pass);
  insert into public.photos
    (survey_slug, checkpoint_id, thumb, data, mime, caption, uploaded_by)
  values
    (p_slug, p_checkpoint,
     decode(p_thumb, 'base64'), decode(p_data, 'base64'),
     coalesce(p_mime, 'image/jpeg'), coalesce(p_caption, ''), coalesce(p_by, ''))
  returning id into v_id;
  return json_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.survey_photo_del(p_slug text, p_pass text, p_id uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.assert_pass(p_slug, p_pass);
  delete from public.photos where id = p_id and survey_slug = p_slug;
  return json_build_object('ok', true);
end $$;

-- ─────────────────────────── grants ───────────────────────────
-- Only these entry points are reachable with the anon key, and every one of
-- them calls assert_pass before doing anything.

grant execute on function public.survey_unlock(text, text)                          to anon, authenticated;
grant execute on function public.survey_rev(text, text)                             to anon, authenticated;
grant execute on function public.survey_records(text, text)                         to anon, authenticated;
grant execute on function public.survey_upsert(text, text, text, text, text, numeric, text, double precision) to anon, authenticated;
-- Explicitly revoked rather than merely omitted, and `public` MUST be in the
-- list: CREATE FUNCTION grants EXECUTE to PUBLIC by default and anon inherits
-- it, so revoking from anon alone leaves the function callable. (Verified the
-- hard way — the first revoke here listed only anon and changed nothing.)
-- assert_pass above revokes from `public` for exactly this reason.
revoke execute on function public.survey_clear(text, text)         from public, anon, authenticated;
revoke execute on function public.project_clear(text, text, text)  from public, anon, authenticated;
grant execute on function public.survey_photos(text, text)                          to anon, authenticated;
grant execute on function public.survey_photo_data(text, text, uuid)                to anon, authenticated;
grant execute on function public.survey_photo_add(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.survey_photo_del(text, text, uuid)                 to anon, authenticated;
grant execute on function public.project_items_all(text, text)                      to anon, authenticated;
grant execute on function public.project_set(text, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.project_item_ids(text, text)                       to anon, authenticated;

-- ─────────────────────────── create the survey ───────────────────────────
-- CHANGE THE PASSPHRASE on the next line before running this file.
-- To change it later:
--   update public.surveys set pass_hash = crypt('new passphrase', gen_salt('bf', 10)) where slug = 'trillium-1300';

insert into public.surveys (slug, title, pass_hash)
values (
  'trillium-1300',
  'Trillium 1300 — Condition Survey',
  extensions.crypt('CHANGE-ME', extensions.gen_salt('bf', 10))
)
on conflict (slug) do nothing;
