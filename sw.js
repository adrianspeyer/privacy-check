const CACHE_NAME = 'privacy-check-v3.2'; // MUST MATCH APP_VERSION in index.html
const ASSETS = [
  '/', 
  '/index.html', 
  '/manifest.json', 
  '/icon-192.png', 
  '/icon-512.png',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@2.0.7/dist/sui-tokens.min.css',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@2.0.7/dist/sui-components.min.css',
  'https://cdn.jsdelivr.net/gh/adrianspeyer/speyer-ui@2.0.7/dist/sui.min.js'
];

// 1. Install: Download files, but wait in line
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

// 2. Activate: Clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(k => k !== CACHE_NAME && caches.delete(k))
  )));
});

// 3. Fetch: Serve from cache
self.addEventListener('fetch', e => {
  if (e.request.url.startsWith(self.location.origin) || e.request.url.includes('cdn.jsdelivr')) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
  }
});

// 4. Message Listener: Wait for user "Update" click
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});