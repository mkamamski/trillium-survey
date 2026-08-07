# Trillium 1300 — Condition Survey

84 checkpoints across 9 sections, graded on five states, shared live between
devices. A side elevation of the trailer takes the colour of the worst finding
in each area, so a red seam is legible without opening anything.

Static HTML. No build step, no framework, no bundler. Postgres does the merging.

```
index.html         the whole app
checkpoints.json   the 84 checkpoints — the durable asset, single source of truth
config.js          Supabase URL + publishable key (safe to commit)
schema.sql         the tables and the nine passphrase-gated functions
```

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) (free tier is plenty —
this uses a few MB).

Open **SQL Editor → New query**, paste all of [`schema.sql`](schema.sql), and
**change `CHANGE-ME` on the last line to your real passphrase** before running it.

To change the passphrase later:

```sql
update public.surveys
   set pass_hash = extensions.crypt('the new passphrase', extensions.gen_salt('bf', 10))
 where slug = 'trillium-1300';
```

### 2. config.js

From **Project Settings → Data API**, copy the Project URL and the `anon` key
into [`config.js`](config.js).

### 3. Serve it

Any static host. It's committed here for GitHub Pages at
`trillium.kamanski.com` — see [Deploying](#deploying).

Locally, anything that serves a directory over HTTP works (`index.html` fetches
`checkpoints.json`, so `file://` will not).

### 4. Import the old data

**Already done** — 13 records were imported from the artifact prototype on
2026-08-07. The exported transfer code and the archived prototype live outside
this repo, in `~/Documents/trillium-migration-backup/`; they are deliberately not
committed, because a stale export sitting in the tree invites someone to re-run
it and resurrect old values over newer grading.

The **Import** panel at the bottom of the survey still accepts a transfer code
if another device ever surfaces with work that never made it across. It merges
per checkpoint using the original timestamps, so it cannot clobber newer grades.

## How the security actually works

The anon key ships inside the page. It has to — the browser talks to Postgres
directly. So it cannot be the secret, and a login screen that merely hides the
UI would be decoration: view source, take the key, read the table.

Instead:

- Every table has **RLS enabled with zero policies**. Postgres denies every row
  to the `anon` role. Holding the anon key gets you nothing at all.
- All access goes through `SECURITY DEFINER` functions that call `assert_pass()`
  first, comparing a bcrypt hash. Only those nine functions are granted to `anon`.
- A wrong guess costs a bcrypt round plus a forced 0.5s sleep, which makes online
  guessing impractical without a rate-limit table.

**The passphrase is the credential.** Anyone who has it can read and write the
survey; there are no per-person permissions. That is the right shape for two
people surveying one trailer, and the wrong shape for anything else.

The passphrase is stored in `localStorage` when "stay unlocked" is ticked, so a
phone doesn't re-prompt every time. **Lock** clears it.

## How syncing works

One row per checkpoint, keyed `(survey_slug, checkpoint_id)`. Each grade is a
single atomic upsert, so two phones editing different checkpoints never contend
— the read-modify-write race the prototype had is gone by construction. When
both edit the *same* checkpoint, the newer timestamp wins and the older write is
dropped server-side.

Timestamps come from `now()` in Postgres, not the phone, so clock drift between
devices can't reorder anything. The importer is the one exception: it passes the
original timestamps, which is why importing can't clobber newer work.

Clients poll `survey_rev` every 5s — a tiny call returning a count and a max
timestamp — and only pull the full record set when that signature moves.

**Why not Realtime?** Supabase Realtime evaluates the same RLS policies. With
RLS denying everything to `anon`, a subscription delivers nothing. Realtime and
the passphrase gate are mutually exclusive here; the gate was worth more. At two
people and a 5s poll the difference isn't perceptible.

## Photos

Stored as `bytea` in Postgres, not Supabase Storage. Storage bucket policies
can't check the passphrase, so a bucket the anon key could reach would be a hole
straight through the gate.

Images are downscaled in the browser before upload — a 240px thumbnail for the
strip and a 1600px version behind it — so a 4MB phone photo becomes roughly
200KB. EXIF orientation is applied, otherwise every portrait shot lands sideways.
Listing photos returns thumbnails only; full-size bytes load when you tap one.

At a few hundred photos this stays well inside the free tier's 500MB. If it ever
becomes a real photo library, that's the point to move to Storage and put a
signed-URL service in front of it.

## Deploying

Committed for GitHub Pages. The `CNAME` file points at `trillium.kamanski.com`.

DNS lives at Google Cloud DNS. `kamanski.com` and `www` belong to Squarespace
and are left alone — this adds one record only:

| Type | Name | Value |
|---|---|---|
| CNAME | `trillium` | `<your-github-username>.github.io.` |

Then in the repo: **Settings → Pages → Custom domain** → `trillium.kamanski.com`,
and tick **Enforce HTTPS** once the certificate is issued (a few minutes).

## Notes on the data model

Checkpoint definitions are static and versioned here, never in the database.
If a checkpoint is reworded its `id` must not change — the `id` is what grades
are keyed to, and changing one orphans its record.

```ts
type Record = {
  state: 'sound' | 'serviceable' | 'repair' | 'failed' | 'na' | null;
  note: string;
  costEstimate: number | null;
  updatedBy: string;
  updatedAt: number;   // epoch ms, set by Postgres
};
```

## Not built

- Read-only share link for a seller or shop (would need a second passphrase and
  a read-only function set — the RPC layer is already the right seam for it).
- Timestamped history per checkpoint, to compare a re-survey against the first.
  Would want an append-only `record_history` table written by a trigger.
