// Minimal service worker for installability + light offline resilience.
// Deliberately conservative: it never caches API, auth, or admin data — only
// static assets and a network-first shell for navigations.
const CACHE = 'sar-v1'
const STATIC_PREFIXES = ['/_next/static/', '/icons/']
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never intercept API, auth, or Supabase traffic.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Cache-first for immutable static assets.
  if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((res) => {
          // Only cache successful responses — never persist a transient
          // 404/500/redirect, which cache-first would then replay forever.
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
      )
    )
    return
  }

  // Network-first for page navigations, falling back to an offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || new Response('Offline', { status: 503 })))
    )
  }
})
