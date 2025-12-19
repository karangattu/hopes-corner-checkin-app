/**
 * Service Worker for Hopes Corner Check-in App (Next.js)
 * 
 * Features:
 * - Offline page support
 * - Static asset caching
 * - Network-first for dynamic routes
 * - Background sync for offline data
 */

const CACHE_NAME = 'hopes-corner-nextjs-v1';

// Static assets to precache
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
];

// Next.js static file patterns
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /\.(?:js|css|woff2?|ttf|otf|ico|png|jpg|jpeg|svg|webp)$/i,
];

// API routes that should always go to network
const API_PATTERNS = [
  /^\/api\//,
];

// Routes that should use network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /^\/$/, // Home
  /^\/login$/,
  /^\/check-in$/,
  /^\/services$/,
  /^\/admin$/,
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching static assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Take over immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Handle client messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'SYNC_NOW') {
    console.log('[ServiceWorker] Manual sync requested');
    event.waitUntil(triggerSync());
  }
});

// Background sync support
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(triggerSync());
  }
});

// Notify clients to sync
async function triggerSync() {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    console.log(`[ServiceWorker] Notifying ${clients.length} client(s) to sync`);

    for (const client of clients) {
      client.postMessage({
        type: 'TRIGGER_SYNC',
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync error:', error);
    throw error;
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Skip non-same-origin requests
  if (url.origin !== self.location.origin) return;

  // API routes - always network
  if (API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'You appear to be offline' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Static assets - cache first
  if (STATIC_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // Return cached but also update in background
          event.waitUntil(
            fetch(event.request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response);
                });
              }
            }).catch(() => {})
          );
          return cached;
        }
        
        // Not cached, fetch and cache
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation / HTML pages - network first with cache fallback
  if (
    event.request.mode === 'navigate' ||
    NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try cache first
          const cached = await caches.match(event.request);
          if (cached) return cached;
          
          // Fall back to offline page
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification support (for future use)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Hopes Corner', {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'general',
        data: data.data || {},
      })
    );
  } catch (error) {
    console.error('[ServiceWorker] Push notification error:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
