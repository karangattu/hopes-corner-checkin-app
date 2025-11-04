const CACHE_NAME = 'hopes-corner-cache-v3'; // Bumped version for offline support
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
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching offline assets');
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', key);
            return caches.delete(key);
          }
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

  // Handle sync trigger from client
  if (event.data && event.data.type === 'SYNC_NOW') {
    console.log('[ServiceWorker] Sync requested from client');
    event.waitUntil(triggerSync());
  }
});

// Background Sync - triggers when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync event:', event.tag);

  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(triggerSync());
  }
});

// Trigger sync by posting message to all clients
async function triggerSync() {
  console.log('[ServiceWorker] Triggering sync for all clients');

  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    console.log(`[ServiceWorker] Found ${clients.length} client(s)`);

    clients.forEach((client) => {
      client.postMessage({
        type: 'TRIGGER_SYNC',
        timestamp: Date.now(),
      });
    });

    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] Error triggering sync:', error);
    return Promise.reject(error);
  }
}

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
