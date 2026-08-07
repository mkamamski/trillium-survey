/* Offline shell for the condition survey.
 *
 * The guiding constraint: a service worker that serves stale HTML forever is
 * worse than no service worker at all, because you cannot fix it by deploying.
 * So navigations are ALWAYS network-first — a deploy lands on the next load
 * whenever there is signal, and the cache is only a fallback for when there
 * isn't. Everything else can be stale for one load without harm.
 *
 * Supabase is never intercepted. Survey data must never come from a cache. */

const VERSION = "trillium-v2";

/* The Supabase client and the font CSS are pulled in at install time rather
   than left to be picked up opportunistically. cache.add() fetches them in
   CORS mode, which yields a real inspectable response — the page's own tags
   carry crossorigin="anonymous" for the same reason. Without the client in
   here the shell loads offline and then cannot talk to Postgres at all. */
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..700;1,9..144,500..600&family=Karla:ital,wght@0,400..800;1,400..600&display=swap";
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.js";

const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./checkpoints.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  SUPABASE_JS,
  FONT_CSS
];

/* Fonts and the Supabase client. Without these cached the app loads offline
   but looks wrong and cannot talk to Postgres when signal returns. */
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      /* per-item catch: one 404 must not fail the whole install and leave the
         worker permanently unactivated */
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  /* res.ok is false for opaque (no-cors) responses, so anything fetched
     without CORS never lands here — that is why the tags and the shell list
     both request CORS explicitly. */
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // The API is off limits. Grades must be live or fail loudly, never stale.
  if (url.hostname.endsWith("supabase.co")) return;

  // HTML: network first, cache only as the offline fallback.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => put("./index.html", res))
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Same-origin assets: serve cached immediately, refresh in the background.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => put(req, res)).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Fonts and CDN: cache first, they are immutable at these URLs.
  if (CDN.test(req.url)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res)).catch(() => hit))
    );
  }
});
