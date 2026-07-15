// Minimal service worker — enables PWA installability on Android/Chrome.
// A full offline-capable worker (with caching strategies) will be added in Stage 8.
const CACHE = 'sgm-v1'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim())
})

// Cache the app shell icons and manifest on first load so the install prompt fires
self.addEventListener('fetch', e => {
  // Pass-through all requests — no offline caching yet
})
