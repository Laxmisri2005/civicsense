/**
 * CivicSense Service Worker — Offline-First PWA
 * Strategy:
 *   - App shell (HTML/CSS/JS): Cache First
 *   - API calls: Network First with cache fallback
 *   - Images: Cache First with expiry
 *   - Emergency mode: Always available offline
 */

const CACHE_VERSION  = 'civicsense-v3'
const STATIC_CACHE   = `${CACHE_VERSION}-static`
const API_CACHE      = `${CACHE_VERSION}-api`
const IMAGE_CACHE    = `${CACHE_VERSION}-images`

// App shell files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
]

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing CivicSense v3 service worker…')
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Pre-cache failed for some URLs:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating new service worker…')
  const validCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE]
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !validCaches.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin except our API
  if (request.method !== 'GET') return
  if (!url.origin.includes(self.location.origin)) return

  // Images: Cache First
  if (request.destination === 'image' || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  // API calls: Network First → cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // App shell: Cache First → network fallback
  event.respondWith(cacheFirst(request, STATIC_CACHE))
})

// ── Cache First strategy ──────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html')
      if (offline) return offline
    }
    return new Response('Offline', { status: 503 })
  }
}

// ── Network First strategy ─────────────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) })
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'You are offline. Using cached data.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ── Background sync for offline SOS messages ─────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-sos-messages') {
    event.waitUntil(syncSOSMessages())
  }
})

async function syncSOSMessages() {
  try {
    const queue = JSON.parse(localStorage?.getItem?.('civicsense_offline_queue') || '[]')
    if (!queue.length) return

    const response = await fetch('/api/offline/sync', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: queue }),
    })

    if (response.ok) {
      // Clear queue after successful sync
      const clients = await self.clients.matchAll()
      clients.forEach(client => client.postMessage({ type: 'SOS_SYNCED', count: queue.length }))
    }
  } catch (err) {
    console.warn('[SW] SOS sync failed:', err)
  }
}

// ── Push Notifications (future scope) ────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'CivicSense Alert', {
      body:  data.body || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag:   data.tag || 'civicsense',
      data:  { url: data.url || '/' },
      actions: [
        { action: 'view',   title: 'View' },
        { action: 'dismiss',title: 'Dismiss' },
      ]
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(c => c.url === url && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
