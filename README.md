# Trillium 1300 — Condition Survey & Projects

Two areas behind one passphrase.

**Survey** — 84 checkpoints across 9 sections, graded on five states, shared
live between devices. A side elevation of the trailer takes the colour of the
worst finding in each area, so a red seam is legible without opening anything.

**Projects** — one page per job: what the design is, what to buy, what order to
do it in, and what is still undecided. Parts and steps tick off and sync the
same way grades do.

Static HTML. No build step, no framework, no bundler. Postgres does the merging.

```
index.html         the whole app — both areas, one router
checkpoints.json   the 84 checkpoints — the durable asset, single source of truth
projects.js        the project pages, same role for the other area
config.js          Supabase URL + publishable key (safe to commit)
schema.sql         the tables and the twelve passphrase-gated functions
```

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) (free tier is plenty —
this uses a few MB).

Open **SQL Editor → New query**, paste all of [`schema.sql`](schema.sql), and
**change `CHANGE-ME` on the last line to your real passphrase** before running it.

The file is idempotent — every table is `if not exists`, every function is
`or replace`, and the survey row is `on conflict do nothing`, so re-running it
after a schema change is safe and will **not** reset your passphrase.

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

Because of that, **`survey_clear` is not granted to `anon` and has no button.**
It was the only action that could destroy everyone's work at once, there is no
history table to recover from, and Postgres holds the only copy of the grades
and photos. It survives as a function you can run deliberately from the SQL
editor. If you ever re-add a destructive action, revoke it here first.

The passphrase is stored in `localStorage` when "stay unlocked" is ticked, so a
phone doesn't re-prompt every time. **Lock** clears it.

## Project pages

`#/survey` · `#/projects` · `#/projects/<slug>`, switched by a two-tab bar
pinned to the bottom of the screen. Bottom rather than a header switcher for the
same reason "Next ungraded" lives there: the app is used one-handed and the top
of a phone is the hardest place to reach. On the survey the two bars stack, tabs
underneath.

**Hash routing, not clean paths.** GitHub Pages has no rewrites, so
`/projects/water-pressurized` as a real path would need a `404.html` kept
identical to `index.html` plus a `<base href="/">` — and that `<base>` changes
how `config.js`, `checkpoints.json`, `projects.js`, the icons, the manifest's
`./` scope and the service worker's `./` shell entries all resolve. A lot of
blast radius on the offline machinery to buy a prettier URL. The fragment is
never sent to the server and the service worker never sees it, so offline
behaviour is unchanged. Deep links land correctly after unlocking — the gate
wraps the whole app and the fragment simply waits in the URL.

### Adding a project

Add an entry to [`projects.js`](projects.js). Nothing else: no new HTML file, no
script tag, no service-worker edit. A page is `sections[] → blocks[]`, where
blocks are tagged by `kind` so each project orders its own page rather than
filling in a fixed template:

| kind | holds |
|---|---|
| `diagram` | a hand-drawn SVG string, an aria-label, an optional legend |
| `notes` | callouts at three levels — `info`, `key`, `stop` |
| `parts` | grouped shopping list, prices, `quoted`/`est` confidence, tallies |
| `sequence` | numbered order of work |
| `gates` | open decisions and what each is waiting on |
| `refs` | external links with a blurb and a source label |

There is deliberately **no generic HTML block**. Every part of the water page
fits the six kinds above; adding an escape hatch now would guarantee it gets
used to dodge the schema later. If a project genuinely doesn't fit, add a kind
and a renderer in `BLOCKS`.

The schematic is a per-project slot, not a diagram engine — it takes an SVG
string or a function returning an element, and its `.pth-*` styles live in
`index.html` under "water project schematic". Another project's drawing brings
its own class block.

**Part and step ids are permanent.** They are primary-key columns in
`project_items`. Reword a display name freely; change an `id` and you orphan
everyone's ticks. Same rule as a checkpoint id — and unlike that one, this is
now enforced rather than asked for. See below.

### Publishing a project page

Every change to `projects.js` is gated by
[`validate-projects.mjs`](.github/scripts/validate-projects.mjs), run by
[a workflow](.github/workflows/validate-projects.yml) on pull requests. That
gate is what lets someone publish without another person reading the diff.
Three checks:

1. **Syntax.** `projects.js` is a plain `<script>`. One stray quote and
   `window.PROJECTS` is never defined, so *every* project page renders blank.
   (The survey itself survives — `index.html` guards that read — but the whole
   projects area disappears until someone reverts.)
2. **Shape.** Unknown block kinds and missing required fields render as
   *nothing*, silently, because the renderer skips what it doesn't recognise.
   Every error names the exact project, section and field.
3. **Id stability.** Reads the ids that actually have state in Postgres and
   hard-fails if the edit drops one, naming the id and who ticked it. This is
   the check that stops a rename from silently orphaning real work.

Run it yourself any time:

```bash
node .github/scripts/validate-projects.mjs
```

Checks 1 and 2 need nothing. Check 3 needs `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `CI_PASS`, and is skipped with a warning when they're
absent — so a fork PR still gets the first two.

**`CI_PASS` is not the survey passphrase.** It's a second credential in
`surveys.ci_hash` that unlocks exactly one function, `project_item_ids`,
returning item ids and whether they're ticked. No grades, no notes, no costs,
no photos. Handing a CI runner the real passphrase would give it read and write
over everything; this way, leaking the CI secret costs you the knowledge that
`part.pump-4008` exists. Set it with:

```sql
update public.surveys
   set ci_hash = extensions.crypt('a different phrase', extensions.gen_salt('bf', 10))
 where slug = 'trillium-1300';
```

Then add `CI_PASS`, `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repository
secrets under **Settings → Secrets and variables → Actions**.

Projects with no `sections` show on the index as "not written yet" — that's all
the six planned entries are.

## How syncing works

One row per checkpoint, keyed `(survey_slug, checkpoint_id)`. Each grade is a
single atomic upsert, so two phones editing different checkpoints never contend
— the read-modify-write race the prototype had is gone by construction. When
both edit the *same* checkpoint, the newer timestamp wins and the older write is
dropped server-side.

Timestamps come from `now()` in Postgres, not the phone, so clock drift between
devices can't reorder anything. The importer is the one exception: it passes the
original timestamps, which is why importing can't clobber newer work.

Project state works the same way, one row per tickable item keyed
`(survey_slug, project_slug, item_id)`, merged by `project_set`. A checkbox is a
single field, so it can't even have the field-level version of this problem.

Clients poll `survey_rev` every 5s — a tiny call returning a count and a max
timestamp — and only pull the full record set when that signature moves. The
project counters ride along in that same call rather than getting their own
poller: every RPC runs `assert_pass`, and `assert_pass` is a bcrypt compare, so
a second timer would double the server's bcrypt work just to ask "anything new?"

One caveat on the survey's merge, which project state does not share: a grade is
pushed as a whole row, so if one person types a note while the other sets a
state **on the same checkpoint**, the note-writer's push carries their stale
copy of the state. Row-level conflicts are handled; same-row field-level ones
are not. Left alone deliberately — fixing it means per-field timestamps.

**Why not Realtime?** Supabase Realtime evaluates the same RLS policies. With
RLS denying everything to `anon`, a subscription delivers nothing. Realtime and
the passphrase gate are mutually exclusive here; the gate was worth more. At two
people and a 5s poll the difference isn't perceptible.

## In the field

The real use is one-handed, outdoors, in sunlight, over 84 checkpoints. That
drove most of the interface decisions:

- **Next ungraded**, in a bar fixed to the bottom of the screen where a thumb
  actually is. Skips what's already graded, opens and scrolls to the target,
  flashes it, wraps around at the end, and respects the active filter — press it
  in "Critical only" and you stay on critical items.
- **Resume banner** offers the checkpoint you last touched instead of starting
  you at the top every time.
- **Notes grow with the text.** Findings run long and a one-line input hides the
  end of them.
- **Unsaved count.** Writes that fail are tracked apart from writes merely in
  flight, so the badge says `2 unsaved` rather than a vague "Retrying", and
  closing the tab with outstanding work warns you.
- **Screen wake lock** while the survey is open, so the phone stops sleeping
  every thirty seconds. Requested again on first tap, since some browsers only
  grant it off a user gesture, and it fails silently where unsupported.

### Installing it

It's a PWA — "Add to Home Screen" gives it an icon and a full-screen window with
no browser chrome. The service worker caches the shell, the fonts and the
Supabase client, so **the app opens with no signal at all**; writes then queue
and retry until they land.

Two rules the service worker follows, both deliberate:

- **Navigations are always network-first.** A worker that serves stale HTML
  forever cannot be fixed by deploying, so the cache is only ever a fallback for
  when there is genuinely no network.
- **Supabase is never intercepted.** Grades must be live or fail loudly. A
  cached survey response would be worse than an error.

Two things here were learned the hard way and are easy to undo by accident:

- **Manifest icons must be PNG.** Safari has no SVG icon support, and when the
  manifest advertised SVG icons, iOS "Add to Home Screen" ran through its whole
  flow and then silently created nothing — no icon, no error. Confirmed by
  swapping to PNG. `icon.svg` is still referenced as `rel="icon"` for desktop
  browsers, which is fine; it just must not be what the manifest offers.
- **Cross-origin `<script>` and `<link rel=stylesheet>` need
  `crossorigin="anonymous"` to be cacheable at all.** Without it they come back
  opaque, `.ok` is false, and a service worker cannot store them. That is why
  those two tags carry it, and why the Supabase client is also precached by URL
  at install rather than left to be picked up opportunistically.

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

type ProjectItem = {           // one per ticked part or step
  checked: boolean;
  updatedBy: string;
  updatedAt: number;
};
```

The same rule applies on the projects side, for the same reason: part and step
`id`s are what ticks are keyed to. `projects.js` namespaces them `part.<id>` and
`step.<id>` so both can share one table.

## Not built

- Read-only share link for a seller or shop (would need a second passphrase and
  a read-only function set — the RPC layer is already the right seam for it).
- Timestamped history per checkpoint, to compare a re-survey against the first.
  Would want an append-only `record_history` table written by a trigger.
