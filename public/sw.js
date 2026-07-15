const CACHE_NAME = 'siteverify-v3';

// Only pin tiny static icons — never cache HTML/JS (Vite hashes change every deploy)
const ASSETS_TO_CACHE = ['/favicon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isHtml =
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/';
  const isBuildAsset = url.pathname.startsWith('/assets/');

  // Always network for pages + built JS/CSS so deploys are not stuck on white screens
  if (isHtml || isBuildAsset) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
