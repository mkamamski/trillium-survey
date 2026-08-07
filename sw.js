/* Offline shell for the condition survey.
 *
 * The guiding constraint: a service worker that serves stale HTML forever is
 * worse than no service worker at all, because you cannot fix it by deploying.
 * So navigations are ALWAYS network-first — a deploy lands on the next load
 * whenever there is signal, and the cache is only a fallback for when there
 * isn't. Everything else can be stale for one load without harm.
 *
 * Supabase is never intercepted. Survey data must never come from a cache. */

const VERSION = "trillium-v1";

const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./checkpoints.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png"
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
