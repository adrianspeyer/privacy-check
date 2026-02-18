/* privacy-check sw.js — v3.6
 * Goals:
 * - Always update detection logic quickly
 * - Keep app working offline
 * - Make "Update" button apply immediately
 */

const CACHE_NAME = 'privacy-check-v3.7'; // MUST MATCH APP_VERSION in index.html
const RUNTIME_CACHE = 'privacy-check-runtime-v3.7';

// Only cache same-origin paths (no leading domain)
const CORE_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// External assets (SUI via CDN)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@2.0.7/dist/sui-tokens.min.css',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@2.0.7/dist/sui-components.min.css',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@2.0.7/dist/sui.min.js'
];

// ---- 1) INSTALL ----
// Pre-cache core + CDN. If CDN fails, we still want install to succeed.
// So cache core strictly, CDN best-effort.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);

    // Best-effort cache CDN assets (don’t fail install if CDN is blocked)
    await Promise.allSettled(CDN_ASSETS.map(u => cache.add(u)));
    // Keep waiting; user clicks Update -> SKIP_WAITING
  })());
});

// ---- 2) ACTIVATE ----
// Clean old caches + take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
    }));
    await self.clients.claim(); // IMPORTANT: new SW controls pages now
  })());
});

// ---- Helpers ----
function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isHTMLRequest(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

function isSWRequest(req) {
  return new URL(req.url).pathname.endsWith('/sw.js') || new URL(req.url).pathname === '/sw.js';
}

function isCoreAsset(url) {
  const p = url.pathname;
  return CORE_ASSETS.includes(p);
}

function isCDN(url) {
  return url.hostname.includes('cdn.jsdelivr.net');
}

// Network-first for HTML and sw.js to avoid staleness.
// Cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // 1) NAVIGATION / HTML: network-first (fresh logic), fallback cache
  if (isHTMLRequest(req) && isSameOrigin(url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put('/index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // 2) Service worker file: always network-first, fallback cache
  if (isSWRequest(req) && isSameOrigin(url)) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // 3) Core assets: cache-first
  if (isSameOrigin(url) && isCoreAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    })());
    return;
  }

  // 4) CDN assets: cache-first, then fill cache
  if (isCDN(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    })());
    return;
  }

  // 5) Everything else: runtime stale-while-revalidate (safe default)
  event.respondWith((async () => {
    const runtime = await caches.open(RUNTIME_CACHE);
    const cached = await runtime.match(req);

    const fetchPromise = fetch(req).then(res => {
      // Only cache successful, basic responses
      if (res && res.ok && res.type === 'basic') runtime.put(req, res.clone());
      return res;
    }).catch(() => null);

    return cached || (await fetchPromise) || Response.error();
  })());
});

// ---- 4) MESSAGE: "Update" click ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
