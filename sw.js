/* ST- & MÅLOPKBT Reunion – service worker
   VERSION opdateres ved hver levering. Gamle caches slettes automatisk,
   og siden genindlæses selv, når en ny version er aktiv. */
const VERSION = '2026-09-26-7';
const CACHE = 'malopkbt-reunion-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './supabase.js',
  './manifest.json',
  './hero-banner.jpg',
  './hero-login.jpg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('malopkbt-reunion-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Kun egne filer. Supabase og andre eksterne kald går altid direkte til netværket.
  if (url.origin !== self.location.origin) return;

  // HTML: netværk først, så nye versioner slår igennem; cache som offline-fallback.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Øvrige filer: cache først, opdateres i baggrunden.
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
