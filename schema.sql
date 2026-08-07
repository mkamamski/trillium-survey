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

-- ─────────────────────────── lockdown ───────────────────────────

alter table public.surveys enable row level security;
alter table public.records enable row level security;
alter table public.photos  enable row level security;

-- No policies are created. With RLS enabled and zero policies, PostgreSQL denies
-- every row to any non-owner role. Revoke the table grants too, belt and braces.
revoke all on public.surveys from anon, authenticated;
revoke all on public.records from anon, authenticated;
revoke all on public.photos  from anon, authenticated;

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
           'photos',(select count(*) from public.photos where survey_slug = p_slug)
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
grant execute on function public.survey_clear(text, text)                           to anon, authenticated;
grant execute on function public.survey_photos(text, text)                          to anon, authenticated;
grant execute on function public.survey_photo_data(text, text, uuid)                to anon, authenticated;
grant execute on function public.survey_photo_add(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.survey_photo_del(text, text, uuid)                 to anon, authenticated;

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
