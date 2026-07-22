// ═══════════════════════════════════════════════════════════════════════
// MISSION CS Test Series - Service Worker
// Cache versioning: bump CACHE_VERSION to force cache refresh
// ═══════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `mission-cs-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mission-cs-dynamic-${CACHE_VERSION}`;
const API_CACHE = `mission-cs-api-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo.svg',
];

// API paths that should use network-first strategy
const API_PATHS = ['/api/'];

// Maximum entries in dynamic cache to prevent unbounded growth
const MAX_DYNAMIC_ENTRIES = 100;
const MAX_API_ENTRIES = 50;

// ─── Install Event ──────────────────────────────────────────────────
// Pre-cache static assets and skip waiting to activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache what we can; don't block install on failures
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to pre-cache:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── Activate Event ─────────────────────────────────────────────────
// Clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete caches that don't match current version
            return !name.endsWith(CACHE_VERSION);
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── Message Event ──────────────────────────────────────────────────
// Listen for SKIP_WAITING from the client to activate new SW immediately
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch Event ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js hot reload / dev requests
  if (url.pathname.includes('/_next/') && url.pathname.includes('hot-')) return;
  if (url.pathname.startsWith('/_next/webpack')) return;

  // Network-first for API calls
  if (API_PATHS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(networkFirstThenCache(request, API_CACHE, MAX_API_ENTRIES));
    return;
  }

  // Stale-while-revalidate for Next.js build assets (JS/CSS) to prevent stale-code crashes after deployment
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Cache-first for other static assets (images, fonts, icons)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstThenNetwork(request, STATIC_CACHE));
    return;
  }

  // Stale-while-revalidate for HTML pages (balance speed & freshness)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Default: network-first with cache fallback for everything else
  event.respondWith(networkFirstThenCache(request, DYNAMIC_CACHE, MAX_DYNAMIC_ENTRIES));
});

// ─── Caching Strategies ─────────────────────────────────────────────

/**
 * Cache-first: Serve from cache if available, otherwise fetch from network.
 * Best for static assets that rarely change (images, fonts, compiled JS/CSS).
 */
async function cacheFirstThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback(request);
  }
}

/**
 * Network-first: Try network first, fall back to cache if offline.
 * Best for API calls where fresh data is preferred but cached data is acceptable.
 */
async function networkFirstThenCache(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      // Trim cache to prevent unbounded growth
      trimCache(cacheName, maxEntries);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * Stale-while-revalidate: Serve from cache immediately, then update cache in background.
 * Best for HTML pages where speed matters but we also want updates.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  // Return cached version if available, otherwise wait for network
  return cached || fetchPromise;
}

// ─── Offline Fallback ──────────────────────────────────────────────

async function offlineFallback(request) {
  if (request.url.includes('/api/')) {
    return new Response(
      JSON.stringify({ error: 'You are offline. Please check your internet connection.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (request.headers.get('accept')?.includes('text/html')) {
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// ─── Utility ────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.eot')
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries first
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}
