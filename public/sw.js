/* PhytoScan service worker
 *
 * Minimal, App-Router-safe strategy:
 *  - PRE_CACHE  : immutable, hashed build assets under /_next/static + the
 *                 offline fallback + core icons (CacheFirst).
 *  - NAVIGATIONS: NetworkFirst with an offline fallback to /offline.html when
 *                 the network is unavailable.
 *  - EVERYTHING ELSE (RSC/Flight, XHR/fetch to Supabase/N8N, the manifest is
 *    excluded too) : NetworkOnly. Caching dynamic App Router responses breaks
 *    navigation and auth, so we never intercept them.
 *
 * Whitespace in the install precache list below is stripped on purpose so the
 * array stays readable here while generating clean URLs.
 */

const CACHE = "phytoscan-v1";

// Precached immutable static assets and the offline fallback. The full list of
// hashed chunks is added dynamically at runtime (see the fetch handler); here
// we only need the shell so the app can render offline immediately.
const PRECACHE = [
  "/",
  "/offline.html",
  "/favicon.ico",
  "/icon/192",
  "/icon/512",
  "/icon/maskable-512",
  "/apple-icon", // Apple touch icon (image, not a navigable page)
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Add an immutable asset to the cache lazily once we see it, so we don't have
// to guess hashed chunk names at install time.
function cacheImmutable(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // 1) Immutable, hashed static build assets -> CacheFirst + lazy cache.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          event.waitUntil(
            (async () => {
              const response = await fetch(request);
              if (response.ok) {
                const cache = await caches.open(CACHE);
                cache.put(request, response.clone());
              }
              return response;
            })(),
          ),
      ),
    );
    return;
  }

  // 2) Image optimization and other assets served by Next.
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheImmutable(request));
    return;
  }

  // 3) Navigation -> NetworkFirst, offline fallback to the app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() =>
          caches.match("/").then((cached) => cached || caches.match("/offline.html")),
        ),
    );
    return;
  }

  // 4) Everything else (RSC/Flight, Supabase, N8N, etc.) -> NetworkOnly.
  //    Never cached: stale payloads break App Router navigation.
});
