// Devoteam World Cup 2026 — minimal service worker.
// Network-first for navigations (always fresh HTML after a deploy), cache-first
// for static assets. The Apps Script API (POST / script.google.com) is never touched.
const CACHE = 'dwc-shell-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
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
  if (url.hostname.indexOf('script.google.com') !== -1) return; // never cache the API

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./')))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first.
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => {
      const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); return r;
    }).catch(() => m))
  );
});
