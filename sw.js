const CACHE_NAME = 'privacy-check-v3.8.1';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
    )).then(() => self.clients.claim())
  );
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  if (fresh && fresh.ok) cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put('/index.html', fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache dynamic endpoints
  if (url.pathname.startsWith('/.netlify/functions/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }
  if (url.hostname.includes('api.ipify.org') || url.hostname.includes('api64.ipify.org')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  if (url.origin === self.location.origin || url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(cacheFirst(e.request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});