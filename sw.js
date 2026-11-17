/* Privacy Check v4.0.0 — one local, versioned app shell. */
const VERSION = 'v4.0.0';
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `privacy-check:${SCOPE.pathname}:`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const ASSETS = [
  'index.html',
  'styles.css',
  'privacy-core.js',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
].map(path => new URL(path, SCOPE).href);
const SHELL_URL = new URL('index.html', SCOPE).href;
const ASSET_URLS = new Set(ASSETS);

self.addEventListener('install', event => {
  // Installation succeeds only when every asset in this release is available.
  // The old worker keeps serving its complete release until Update is chosen.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(
    ASSETS.map(url => new Request(url, { cache: 'reload' }))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key =>
      (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) ||
      // Migrate the earlier root installation without touching other apps.
      (SCOPE.pathname === '/' && /^privacy-check-v\d/.test(key))
    ).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin) return;

  // Never intercept or cache API requests, IP results, unrelated pages, or
  // external resources. The app does not need a third-party offline cache.
  const isShell = request.mode === 'navigate' &&
    (url.pathname === SCOPE.pathname || url.pathname === new URL(SHELL_URL).pathname);
  const isAsset = !url.search && ASSET_URLS.has(url.href);
  if (!isShell && !isAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = isShell ? SHELL_URL : url.href;
    const cached = await cache.match(key);
    if (cached) return cached;

    // Storage can be evicted. Fail over to the network without storing errors,
    // redirects or arbitrary responses under a trusted app-shell cache key.
    return fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});
