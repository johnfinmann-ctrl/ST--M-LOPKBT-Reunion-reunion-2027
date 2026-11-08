/* ST- & MÅLOPKBT Reunion – service worker (informationsversion)
   VERSION opdateres ved hver levering. Alle tidligere caches slettes automatisk,
   og siden genindlæses selv, når en ny version er aktiv.
   Kun egne filer håndteres; kald til andre domæner berøres ikke og caches aldrig. */
const VERSION = '2026-11-08-2';
const CACHE = 'malopkbt-reunion-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './hero-login.jpg',
  './baggrund-radar.jpg'
];
const CONTENT = ['reunion', 'program', 'nyheder', 'arrangementer', 'historie', 'billeder', 'kontakt']
  .map(f => './indhold/' + f + '.json');

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.concat(CONTENT).map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Sletter ALLE tidligere caches – også dem fra login-versionen.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, cacheKey) {
  return fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(cacheKey || req, copy)); }
    return res;
  }).catch(() => caches.match(cacheKey || req, { ignoreSearch: true }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML: netværk først, så nye versioner slår igennem; cache som offline-fallback.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(networkFirst(req, './index.html').then(r => r || caches.match('./')));
    return;
  }

  // Indhold (nyheder, program …): altid nyeste fra netværket, seneste kopi offline.
  if (url.pathname.includes('/indhold/') && url.pathname.endsWith('.json')) {
    e.respondWith(networkFirst(new Request(url.origin + url.pathname)));
    return;
  }

  // Billeder og øvrige filer: cache først, opdateres i baggrunden.
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
