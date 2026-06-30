// Bump this version whenever the caching strategy changes — the activate step
// deletes every cache that isn't the current name, purging stale assets.
const CACHE_NAME = 'flavor-finder-v3';

const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

if (isLocalhost) {
  // ----- Development (localhost) -----
  // The dev server (`npm start`) serves UN-hashed bundles like
  // /static/js/bundle.js. The cache-first strategy used in production (below)
  // would pin those, so a worker left registered on this port by a past
  // production build (or `serve -s build`) keeps serving stale JS through
  // `npm start` — which is what made the long-removed "intro shuffle" keep
  // replaying on localhost long after it was deleted from source.
  //
  // On localhost the worker therefore removes itself: purge caches, unregister,
  // and reload any open tabs onto fresh code. Registration is also gated to
  // production in index.js, so it won't come back.
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        await self.clients.claim();
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => client.navigate(client.url));
      })()
    );
  });
  // No fetch handler: every request goes straight to the dev server.
} else {
  // ----- Production -----
  // Only the app shell is precached. Hashed /static/* assets are cached on
  // demand (they're immutable, so their URL changes on every deploy).
  const PRECACHE_URLS = ['/'];

  self.addEventListener('install', (event) => {
    // Take over from the previous service worker right away instead of waiting
    // for every open tab to close — critical for shipping a fix to stale clients.
    self.skipWaiting();
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(PRECACHE_URLS))
        .catch((error) => console.error('Precache failed:', error))
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      (async () => {
        const names = await caches.keys();
        await Promise.all(names.map((name) => (name === CACHE_NAME ? null : caches.delete(name))));
        // Start controlling already-open pages so the network-first logic below
        // applies on the next navigation without a manual hard refresh.
        await self.clients.claim();
      })()
    );
  });

  self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const isNavigation = request.mode === 'navigate' || request.destination === 'document';

    if (isNavigation) {
      // Network-first for the HTML document: a fresh deploy ships a new
      // index.html pointing at new hashed bundles, so we must reach the network
      // when online. Fall back to the cached shell only when offline.
      event.respondWith(
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
            return response;
          })
          .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
      );
      return;
    }

    // Everything else (hashed JS/CSS, images): cache-first for speed, populating
    // the cache from the network on a miss. Hashed URLs make this safe.
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  });
}
