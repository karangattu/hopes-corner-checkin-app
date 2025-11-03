const CACHE_NAME = 'hopes-corner-cache-v2';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/manifest.json',
];

// Additional runtime caching for JS/CSS bundles
const RUNTIME_CACHE_PATTERNS = [
  /\.(?:js|css|woff2?|ttf|otf)$/i,
  /\/assets\//i,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const shouldCache = RUNTIME_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache JS/CSS bundles, fonts, and assets
          if (
            response &&
            response.status === 200 &&
            (response.type === 'basic' || response.type === 'cors') &&
            shouldCache
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If both cache and network fail, return the offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
    })
  );
});
