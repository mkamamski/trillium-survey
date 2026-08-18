#!/usr/bin/env node
/* Gate for projects.js.
 *
 * This is what lets someone publish a project page without a human reading the
 * diff first. Three checks, in order of how bad the thing they catch is:
 *
 *   1. SYNTAX  — projects.js is a plain <script>. A stray quote means
 *                window.PROJECTS is never defined and EVERY project page goes
 *                blank. (The survey survives: index.html guards the read. But
 *                the whole projects area disappears until someone reverts.)
 *
 *   2. SHAPE   — an unknown block kind or a missing required field renders as
 *                nothing, silently. The renderer skips what it doesn't know.
 *
 *   3. IDS     — the expensive one. The part and step ids are primary-key
 *                columns in Postgres. Rename one and the tick someone made
 *                still exists in the database, pointing at an id that is gone.
 *                Nothing surfaces. The box just shows unticked forever.
 *
 * Check 3 needs the database and is skipped with a warning when unconfigured,
 * so 1 and 2 work with no secrets at all.
 *
 * No dependencies, deliberately — the app has none and its tooling shouldn't
 * introduce the first package.json.
 *
 * Run locally:  node .github/scripts/validate-projects.mjs
 * List ids:     node .github/scripts/validate-projects.mjs --ids
 */

import { readFileSync } from "node:fs";
import vm from "node:vm";

const FILE = "projects.js";
const KINDS = ["diagram", "notes", "parts", "sequence", "gates", "refs"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

/* ── 1. syntax ─────────────────────────────────────────────── */

let PROJECTS;
try {
  const src = readFileSync(FILE, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: FILE });
  PROJECTS = sandbox.window.PROJECTS;
} catch (e) {
  console.error(`\n✗ ${FILE} does not parse.\n`);
  console.error(`  ${e.message}`);
  console.error(`\n  Every project page would be blank. Nothing else was checked.\n`);
  process.exit(1);
}

if (!Array.isArray(PROJECTS)) {
  console.error(`\n✗ ${FILE} parsed but did not set window.PROJECTS to an array.\n`);
  process.exit(1);
}

/* ── 2. shape ──────────────────────────────────────────────── */

const str = (v) => typeof v === "string" && v.trim() !== "";
const num = (v) => typeof v === "number" && Number.isFinite(v);

/* Collected for check 3 and for the duplicate test. */
const idsByProject = new Map();

function checkPart(where, it, seen) {
  if (!str(it.id)) return err(where, "part is missing `id`");
  if (!SLUG.test(it.id)) err(`${where}.${it.id}`, "`id` must be lower-case kebab-case");
  if (seen.has(`part.${it.id}`)) err(`${where}.${it.id}`, "duplicate part id in this project");
  seen.add(`part.${it.id}`);
  if (!str(it.name)) err(`${where}.${it.id}`, "missing `name`");
  if (!num(it.price)) err(`${where}.${it.id}`, "`price` must be a number (use 0, not \"TBD\")");
  if (it.qty !== undefined && (!num(it.qty) || it.qty < 1))
    err(`${where}.${it.id}`, "`qty` must be a number >= 1 when present");
  if (!["quoted", "est"].includes(it.confidence))
    err(`${where}.${it.id}`, '`confidence` must be "quoted" or "est"');
}

function checkBlock(where, b, seen) {
  if (!KINDS.includes(b.kind))
    return err(where, `unknown block kind ${JSON.stringify(b.kind)} — expected one of ${KINDS.join(", ")}. An unknown kind renders as nothing.`);

  if (b.kind === "diagram") {
    const isFn = typeof b.svg === "function";
    if (!isFn && !str(b.svg)) err(where, "diagram needs `svg` (a string) or a function");
    if (!str(b.label)) err(where, "diagram needs `label` — it is the only description a screen reader gets");
    if (!isFn && str(b.svg) && b.svg.includes("__LABEL__") && !str(b.label))
      err(where, "diagram svg contains __LABEL__ but no `label` to substitute");
    if (b.minWidth !== undefined && !num(b.minWidth)) err(where, "`minWidth` must be a number");
    for (const k of b.key ?? []) {
      if (!["line", "line-dashed", "dot", "none"].includes(k.swatch))
        err(where, `legend swatch ${JSON.stringify(k.swatch)} is not one of line, line-dashed, dot, none`);
      if (!str(k.text)) err(where, "legend entry missing `text`");
    }
  }

  if (b.kind === "notes") {
    if (!Array.isArray(b.items) || !b.items.length) return err(where, "notes block has no items");
    b.items.forEach((n, i) => {
      const w = `${where}.notes[${i}]`;
      if (!["info", "key", "stop"].includes(n.level))
        err(w, '`level` must be "info", "key" or "stop"');
      if (!str(n.tag)) err(w, "missing `tag`");
      if (!Array.isArray(n.body) || !n.body.length || !n.body.every(str))
        err(w, "`body` must be a non-empty array of paragraphs");
    });
  }

  if (b.kind === "parts") {
    if (!Array.isArray(b.groups) || !b.groups.length) return err(where, "parts block has no groups");
    b.groups.forEach((g, i) => {
      const w = `${where}.groups[${i}]`;
      if (!str(g.id)) err(w, "group missing `id`");
      if (!str(g.title)) err(w, "group missing `title`");
      if (!Array.isArray(g.items) || !g.items.length) return err(w, "group has no items");
      g.items.forEach((it) => checkPart(`${where}.${g.id ?? i}`, it, seen));
    });
    if (b.copy && !str(b.copy.title))
      err(where, "`copy.title` must be a string when `copy` is present");
  }

  if (b.kind === "sequence") {
    if (!Array.isArray(b.steps) || !b.steps.length) return err(where, "sequence has no steps");
    b.steps.forEach((s, i) => {
      const w = `${where}.steps[${i}]`;
      if (!str(s.id)) return err(w, "step missing `id`");
      if (!SLUG.test(s.id)) err(w, "step `id` must be lower-case kebab-case");
      if (seen.has(`step.${s.id}`)) err(w, `duplicate step id "${s.id}" in this project`);
      seen.add(`step.${s.id}`);
      if (!str(s.title)) err(w, "step missing `title`");
    });
  }

  if (b.kind === "gates") {
    if (!Array.isArray(b.items) || !b.items.length) return err(where, "gates block has no items");
    b.items.forEach((g, i) => {
      const w = `${where}.gates[${i}]`;
      if (!str(g.id)) err(w, "gate missing `id`");
      if (!str(g.title)) err(w, "gate missing `title`");
      if (!str(g.gatedOn)) err(w, "gate missing `gatedOn` — a gate with nothing to wait on is a decision nobody wants to make");
      if (!str(g.body)) err(w, "gate missing `body`");
    });
  }

  if (b.kind === "refs") {
    if (!Array.isArray(b.items) || !b.items.length) return err(where, "refs block has no items");
    b.items.forEach((r, i) => {
      const w = `${where}.refs[${i}]`;
      if (!str(r.url)) err(w, "reference missing `url`");
      else if (!/^https?:\/\//.test(r.url)) err(w, `\`url\` must be http(s): ${r.url}`);
      if (!str(r.title)) err(w, "reference missing `title`");
      if (!str(r.source)) err(w, "reference missing `source` — the credibility label is the point");
    });
  }
}

const slugs = new Set();
for (const p of PROJECTS) {
  const where = p.slug ?? "(no slug)";
  if (!str(p.slug)) { err("(project)", "missing `slug`"); continue; }
  if (!SLUG.test(p.slug)) err(where, "`slug` must be lower-case kebab-case — it appears in the URL and as a database key");
  if (slugs.has(p.slug)) err(where, "duplicate project slug");
  slugs.add(p.slug);
  if (!str(p.name)) err(where, "missing `name`");

  if (!p.sections) {
    /* a planned entry: name only, shows on the index as "not written yet" */
    if (p.planned !== true) err(where, "has no `sections` and is not marked `planned: true`");
    continue;
  }

  if (!str(p.summary)) err(where, "missing `summary`");
  if (!str(p.blurb)) err(where, "missing `blurb` — the projects index shows it");
  for (const c of p.chips ?? []) {
    if (!str(c.label)) err(where, "chip missing `label`");
    if (!["on", "open", "warn"].includes(c.tone)) err(where, `chip tone ${JSON.stringify(c.tone)} must be on, open or warn`);
  }

  const seen = new Set();
  if (!Array.isArray(p.sections) || !p.sections.length) err(where, "`sections` is empty");
  (p.sections ?? []).forEach((s, i) => {
    const w = `${where}.sections[${i}]`;
    if (!str(s.id)) err(w, "section missing `id`");
    if (!str(s.title)) err(w, "section missing `title`");
    if (!Array.isArray(s.blocks) || !s.blocks.length) return err(w, "section has no blocks");
    s.blocks.forEach((b, j) => checkBlock(`${where}.${s.id ?? i}.blocks[${j}]`, b, seen));
  });
  idsByProject.set(p.slug, seen);
}

/* ── 3. id stability ───────────────────────────────────────── */

const { SUPABASE_URL, SUPABASE_ANON_KEY, SURVEY_SLUG, CI_PASS } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !CI_PASS) {
  warnings.push(
    "id-stability check SKIPPED — SUPABASE_URL, SUPABASE_ANON_KEY or CI_PASS not set.\n" +
    "    Renaming an id will not be caught. See README, \"Publishing a project page\"."
  );
} else {
  const slug = SURVEY_SLUG || "trillium-1300";
  let rows;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/project_item_ids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ p_slug: slug, p_pass: CI_PASS })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    rows = await res.json();
  } catch (e) {
    /* A database we cannot reach must not silently pass the check it exists to
       perform. Fail loudly and let a human decide. */
    errors.push(`id-stability check could not reach the database: ${e.message}`);
    rows = null;
  }

  for (const r of rows ?? []) {
    const seen = idsByProject.get(r.project);
    if (!seen) {
      warnings.push(`${r.project}/${r.item} has recorded state but that project is no longer in ${FILE}.`);
      continue;
    }
    if (seen.has(r.item)) continue;
    const who = r.by ? ` by ${r.by}` : "";
    const state = r.checked ? `ticked${who}` : `recorded${who}`;
    errors.push(
      `${r.project}: id "${r.item}" is ${state} in the database but is missing from this edit.\n` +
      `    Renaming an id orphans that tick silently — the box just shows unticked forever.\n` +
      `    Keep the id and change the display name instead, or remove the item deliberately.`
    );
  }
}

/* ── --ids: print every tickable id ─────────────────────────
   The single source of truth for "what ids exist", so nothing has to
   re-derive it with a grep that also catches section and group ids. */

if (process.argv.includes("--ids")) {
  if (errors.length) {
    console.error("Cannot list ids — projects.js has errors. Run without --ids.");
    process.exit(1);
  }
  for (const [slug, ids] of idsByProject)
    for (const id of [...ids].sort()) console.log(`${slug}\t${id}`);
  process.exit(0);
}

/* ── report ────────────────────────────────────────────────── */

const real = PROJECTS.filter((p) => p.sections).length;
const planned = PROJECTS.length - real;
const items = [...idsByProject.values()].reduce((n, s) => n + s.size, 0);

for (const w of warnings) console.warn(`  ! ${w}`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem${errors.length === 1 ? "" : "s"} in ${FILE}:\n`);
  for (const e of errors) console.error(`  • ${e}\n`);
  process.exit(1);
}

console.log(`\n✓ ${FILE} — ${real} project page${real === 1 ? "" : "s"}, ${planned} planned, ${items} tickable items.\n`);
