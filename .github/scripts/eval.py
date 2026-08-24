#!/usr/bin/env python3
"""Eval over the whole setup: this repo, the notes repo, and the live systems.

Checks claims against reality rather than restating them — every check runs
something or reads the real artefact. Anything unreachable is skipped with a
reason rather than silently passing.

    node   .github/scripts/validate-projects.mjs   gates one file
    python3 .github/scripts/eval.py                gates everything

Exits non-zero only on a real failure. Skips don't fail the run, so a laptop
with no network still gets the file checks.

Paths are derived from this file's location, so it runs from anywhere and on
anyone's machine. Set HANDBOOK_HTML to also check the published handbook.

Notably, the file checks alone cannot catch a database that has drifted from
schema.sql — the audit query at the bottom of schema.sql covers that, and it is
what found the one real bug this eval was written to look for.
"""
import json, os, re, shutil, subprocess, sys

HERE  = os.path.dirname(os.path.abspath(__file__))
APP   = os.path.abspath(os.path.join(HERE, "..", ".."))
NOTES = os.path.abspath(os.path.join(APP, "..", "trillium-notes"))
HANDBOOK = os.environ.get("HANDBOOK_HTML", "")

SKIP = "skip"
results = []
def check(group, name, ok, detail=""):  results.append((group, name, bool(ok), detail))
def skip(group, name, why):             results.append((group, name, SKIP, why))

def read(p):
    try: return open(p, encoding="utf-8").read()
    except Exception: return ""

def sh(cmd, cwd=None):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()

# ═══════════════════════ app repo ═══════════════════════
rc, out, err = sh("node .github/scripts/validate-projects.mjs", cwd=APP)
check("app", "projects.js passes the validator", rc == 0,
      out.splitlines()[-1] if out else err[:80])

rc, ids, _ = sh("node .github/scripts/validate-projects.mjs --ids", cwd=APP)
n_ids = len(ids.splitlines()) if rc == 0 else -1
check("app", "--ids lists tickable items", n_ids > 0, f"{n_ids} ids")

rc, _, _ = sh("node --check .github/scripts/validate-projects.mjs", cwd=APP)
check("app", "validator is valid JS", rc == 0)

idx = read(f"{APP}/index.html")
root = re.search(r":root\{(.*?)\n\}", idx, re.S)
if root:
    used = set(re.findall(r"var\((--[a-z0-9-]+)\)", idx))
    declared = set(re.findall(r"(--[a-z0-9-]+)\s*:", root.group(1)))
    check("app", "no undefined CSS variables", not (used - declared), str(sorted(used - declared)))

# strip script/style first — "<section>" inside a JS comment is not a tag
markup = re.sub(r"<script\b.*?</script>", "", idx, flags=re.S)
markup = re.sub(r"<style\b.*?</style>", "", markup, flags=re.S)
for tag in ["div", "section", "nav", "main", "footer", "header"]:
    o = len(re.findall(rf"<{tag}[\s>]", markup)); c = len(re.findall(rf"</{tag}>", markup))
    check("app", f"<{tag}> balanced", o == c, f"{o} open / {c} close")

check("app", "Clear survey button stays removed", 'id="reset"' not in idx)
check("app", "survey keeps its sync chip",        'id="sync"' in idx)
check("app", "projects.js is loaded",             'src="projects.js"' in idx)

sw = read(f"{APP}/sw.js")
check("app", "service worker caches projects.js", '"./projects.js"' in sw)
m = re.search(r'VERSION\s*=\s*"([^"]+)"', sw)
check("app", "service worker version past v5", bool(m) and m.group(1) != "trillium-v5",
      m.group(1) if m else "not found")

wf = read(f"{APP}/.github/workflows/validate-projects.yml")
check("app", "workflow points at a script that exists",
      os.path.exists(f"{APP}/.github/scripts/validate-projects.mjs") and "validate-projects.mjs" in wf)
check("app", "workflow needs only CI_PASS",
      wf.count("secrets.") == 1 and "secrets.CI_PASS" in wf, f"{wf.count('secrets.')} secret refs")

sch = read(f"{APP}/schema.sql")
defined = set(re.findall(r"create or replace function public\.(\w+)\(", sch))
granted = set(re.findall(r"grant execute on function public\.(\w+)\(", sch))
revoked = set(re.findall(r"revoke (?:all|execute) on function public\.(\w+)\(", sch))
check("app", "every granted function is defined", granted <= defined, str(sorted(granted - defined)))
for fn in ["survey_clear", "project_clear", "assert_pass", "log_record_history", "log_project_history"]:
    check("app", f"{fn} revoked, never granted", fn in revoked and fn not in granted)
    check("app", f"{fn} revoke names the `public` role",
          bool(re.search(rf"revoke (?:all|execute) on function public\.{fn}\([^)]*\)\s*from public", sch)))
check("app", "schema.sql carries the audit query", "callable_by_anon" in sch)
check("app", "record_history documented in README", "record_history" in read(f"{APP}/README.md"))

# ═══════════════════════ live systems ═══════════════════════
_, sha, _    = sh("git rev-parse HEAD", cwd=APP)
_, status, _ = sh("git status --porcelain", cwd=APP)
check("live", "app repo clean", status == "", status[:60])
_, ahead, _  = sh("git rev-list --count origin/main..HEAD", cwd=APP)
check("live", "app repo pushed", ahead == "0", f"{ahead} unpushed")

if os.path.isdir(NOTES):
    _, ns, _ = sh("git status --porcelain", cwd=NOTES)
    check("live", "notes repo clean", ns == "", ns[:60])
    _, na, _ = sh("git rev-list --count origin/main..HEAD", cwd=NOTES)
    check("live", "notes repo pushed", na == "0", f"{na} unpushed")

if shutil.which("gh"):
    _, built, _ = sh("gh api repos/mkamamski/trillium-survey/pages/builds/latest "
                     "--jq '.commit + \" \" + .status'", cwd=APP)
    check("live", "deployed commit is current main",
          built.startswith(sha) and built.endswith("built"), built[:52] or "no response")
    _, ci, _ = sh("gh run list --workflow=validate-projects.yml --limit 1 "
                  "--json conclusion --jq '.[0].conclusion'", cwd=APP)
    check("live", "last CI run succeeded", ci == "success", ci or "none")
    _, priv, _ = sh("gh repo view mkamamski/trillium-notes --json isPrivate --jq .isPrivate", cwd=APP)
    check("live", "notes repo still private", priv == "true", priv or "unknown")
else:
    skip("live", "GitHub checks", "gh CLI not on PATH")

_, code, _ = sh("curl -s -m 15 -o /dev/null -w '%{http_code}' https://trillium.kamanski.com/projects.js")
if code == "000": skip("live", "live site reachable", "no network")
else:              check("live", "live site serves projects.js", code == "200", f"HTTP {code}")

# ═══════════════════════ notes repo ═══════════════════════
cm = read(f"{NOTES}/CLAUDE.md")
if not cm:
    skip("notes", "notes repo checks", f"not found at {NOTES}")
else:
    for folder in ["research", "decisions", "questions", "log", "inbox"]:
        check("notes", f"CLAUDE.md documents {folder}/ and it exists",
              folder in cm and os.path.isdir(f"{NOTES}/{folder}"))
    check("notes", "measurements.md exists as documented",
          "measurements.md" in cm and os.path.exists(f"{NOTES}/measurements.md"))

    refs = set(re.findall(r"\.\./Wander/([A-Za-z0-9_./-]+)", cm))
    for p in ["capture-research", "draft-project-page"]:
        sk = read(f"{NOTES}/.claude/skills/{p}/SKILL.md")
        check("notes", f"{p}: skill file exists", bool(sk))
        if not sk: continue
        m = re.match(r"^---\n(.*?)\n---\n", sk, re.S)
        fm = dict(re.findall(r"^(\w+):\s*(.+)$", m.group(1), re.M)) if m else {}
        check("notes", f"{p}: frontmatter name matches folder", fm.get("name") == p, fm.get("name", "missing"))
        check("notes", f"{p}: has a description", len(fm.get("description", "")) > 40,
              f"{len(fm.get('description',''))} chars")
        check("notes", f"{p}: mentions plan mode", "plan mode" in sk.lower())
        check("notes", f"{p}: referenced by CLAUDE.md", p in cm)
        refs |= set(re.findall(r"\.\./Wander/([A-Za-z0-9_./-]+)", sk))

    for r in sorted(refs):
        check("notes", f"referenced app file exists: {r}", os.path.exists(os.path.join(APP, r)))

    dec = [f for f in os.listdir(f"{NOTES}/decisions") if f.endswith(".md") and f != "README.md"]
    check("notes", "at least one decision record exists", len(dec) > 0, f"{len(dec)} found")
    for d in dec:
        s = read(f"{NOTES}/decisions/{d}")
        m = re.match(r"^---\n(.*?)\n---\n", s, re.S)
        fm = dict(re.findall(r"^(\w+):\s*(.+)$", m.group(1), re.M)) if m else {}
        check("notes", f"{d}: required front matter", {"type","date","author"} <= set(fm), str(sorted(fm)))
        check("notes", f"{d}: filename is YYYY-MM-DD-slug.md",
              bool(re.match(r"^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$", d)))
        check("notes", f"{d}: records the alternative it beat", "lternative" in s)
        srcs = [l for l in s.splitlines() if l.startswith("- [")]
        check("notes", f"{d}: sources carry credibility labels",
              all("·" in l for l in srcs), f"{len(srcs)} sources")

# ═══════════════════════ cross-document ═══════════════════════
cp = read(f"{APP}/checkpoints.json")
n_cp = sum(len(s["items"]) for s in json.loads(cp)["sections"]) if cp else 0
check("cross", "84 checkpoints claim is true", n_cp == 84, str(n_cp))

if cm:
    for label, needle in {"old chat-session loop": "often a chat session",
                          "old Sync-button advice": "Sync** button"}.items():
        check("cross", f"CLAUDE.md free of: {label}", needle not in cm)

hb = read(HANDBOOK) if HANDBOOK else ""
if not hb:
    skip("cross", "handbook checks", "set HANDBOOK_HTML to include these")
else:
    check("cross", "handbook is non-trivial", len(hb) > 10000, f"{len(hb)} bytes")
    for label, needle in {"Context panel as the main path": "under project knowledge",
                          "old Sync instruction": "press it at the start of a session",
                          "dead install URL": "installations/new",
                          "removed Clear survey": "Clear survey"}.items():
        check("cross", f"handbook free of: {label}", needle not in hb)
    check("cross", "handbook's 84 claim matches", "84" in hb)
    if cm:
        check("cross", "both docs start the loop at the trailer",
              "trailer" in hb.lower() and "trailer" in cm.lower())
        check("cross", "both say phones can't reach the folder",
              "phone" in hb.lower() and "no path" in cm.lower())

# ═══════════════════════ report ═══════════════════════
groups = {}
for g, n, ok, d in results: groups.setdefault(g, []).append((n, ok, d))

fails = skips = 0
for g in ["app", "live", "notes", "cross"]:
    if g not in groups: continue
    print(f"\n{'═'*70}\n  {g.upper()}\n{'═'*70}")
    for n, ok, d in groups[g]:
        if ok is SKIP:
            skips += 1; print(f"  – {n}   ({d})")
        else:
            if not ok: fails += 1
            print(f"  {'✓' if ok else '✗'} {n}" + (f"   [{d}]" if d and not ok else (f"   ({d})" if d else "")))

total = len(results)
tail = f"  —  {fails} FAILED" if fails else "  —  all clear"
print(f"\n{'─'*70}\n  {total-fails-skips}/{total-skips} passed" +
      (f", {skips} skipped" if skips else "") + tail)
sys.exit(1 if fails else 0)
