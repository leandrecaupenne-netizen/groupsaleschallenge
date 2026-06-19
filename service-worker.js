// Devoteam World Cup 2026 — minimal service worker.
// Network-first for navigations (always fresh HTML after a deploy), cache-first
// for static assets. The Apps Script API (POST / script.google.com) is never touched.
const CACHE = 'dwc-shell-v37';

// Precache the app shell so an offline relaunch still paints. Done per-URL with a
// catch so a single 404 can't make the whole install reject (addAll is atomic).
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await Promise.all(SHELL.map(u => cache.add(u).catch(() => {})));
    } catch (err) { /* best-effort precache */ }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // leave the data POST alone
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // let cross-origin (Google Fonts, analytics) pass straight through
  if (url.hostname.indexOf('script.google.com') !== -1) return; // never cache the API

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r; })
        // Offline: serve the cached page, then the precached shell, in that order.
        .catch(async () => (await caches.match(req)) || (await caches.match('./index.html')) || (await caches.match('./')))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first, with a clean failure when both
  // the cache and the network miss (never resolve to `undefined`).
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r;
    }).catch(() => new Response('', { status: 504, statusText: 'Offline' })))
  );
});
