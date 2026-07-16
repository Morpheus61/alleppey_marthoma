// Minimal service worker — enables PWA installability.
// Clears all legacy caches on every activation so stale entries never serve wrong pages.
const CACHE_VERSION = 'sgm-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  // Delete every cache from previous versions
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// No fetch interception — all requests go straight to the network.
// (Offline caching will be added in Stage 8 with @serwist/next)
