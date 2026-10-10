// SLATE PWA High-Performance Service Worker
// Enables silent zero-prompt auto-updates, offline asset caching, and web push notifications.

const CACHE_NAME = 'slate-cache-v1';

// Critical static assets to cache for instant loading & offline resilience
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icon',
  '/apple-icon',
];

// Install Event: Cache essential shell and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Precache non-critical fetch skipped:', err);
        });
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately without waiting
  );
});

// Activate Event: Claim all clients and purge obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Purging outdated cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Take immediate control of open pages
  );
});

// Fetch Event: Intelligent routing
// - API routes & mutations: Network-only (always fresh data, never stale schedules)
// - Navigation requests (pages): Network-first with cache fallback
// - Static assets (CSS/JS/images/fonts): Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and non-HTTP(S)
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // API calls must always be fresh from network (never serve stale duty assignments or leaves)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Page Navigations: Network-first, fallback to cached HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const shell = await caches.match('/');
        if (shell) return shell;
        return new Response('Offline: Please check your network connection.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
    return;
  }

  // Static Assets (Next.js static chunks, icons, images): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/icon' ||
    url.pathname === '/apple-icon' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Push Event: Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'SLATE - NIBM Roster', body: event.data ? event.data.text() : 'Operational update available.' };
  }

  const title = payload.title || 'SLATE - NIBM Roster';
  const options = {
    body: payload.body || 'New operational update available.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag || 'slate-notification',
    data: payload.data || { url: '/' },
    vibrate: [150, 50, 150],
    renotify: true,
    actions: [
      { action: 'open', title: 'Open SLATE' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event: Focus existing window or open deep-linked tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (targetUrl && client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Message Event: Allow client to manually command skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
