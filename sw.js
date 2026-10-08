// Offline support. Network first, so a new release always wins; the cache is only a fallback.
const CACHE = 'zroute-offline-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      // Keep one copy per file, whatever its ?v= version.
      caches.open(CACHE).then(cache => cache.keys().then(keys => Promise.all(keys
        .filter(key => new URL(key.url).pathname === new URL(request.url).pathname && key.url !== request.url)
        .map(key => cache.delete(key)))).then(() => cache.put(request, copy)));
    }
    return response;
  }).catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
