/* Privacy Check — Service Worker (v3.8.1)
   Goal: Fast offline + controlled update toast (user clicks Update).
*/
const CACHE_NAME = 'privacy-check-v3.8.4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@latest/dist/sui-tokens.min.css',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@latest/dist/sui-components.min.css',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@latest/dist/sui.min.js'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

// Helpers
function isHTMLRequest(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}
function isDynamic(reqUrl) {
  // Never cache Netlify Functions, API endpoints, or anything that should always be fresh.
  // (VPN/Public-IP checks must not be cached.)
  return (
    reqUrl.pathname.startsWith('/.netlify/functions/') ||
    reqUrl.pathname.startsWith('/api/')
  );
}

// Fetch strategy:
// - HTML navigations: network-first (fallback cache)
// - Static assets: cache-first
// - CDN assets: cache-first
// - Dynamic endpoints: network-only (no cache)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin + jsdelivr (keeps scope tight)
  const isSameOrigin = url.origin === self.location.origin;
  const isJsDelivr = url.hostname.includes('cdn.jsdelivr.net');

  if (!isSameOrigin && !isJsDelivr) return;

  // Dynamic: never cache
  if (isSameOrigin && isDynamic(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // HTML: network-first
  if (isSameOrigin && isHTMLRequest(req)) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  // Assets: cache-first (fast)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // keep cache warm
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return res;
    }))
  );
});

// Message listener: user clicked Update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
