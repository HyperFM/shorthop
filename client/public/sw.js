const CACHE_NAME = 'shorthop-v8';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const SHELL_ASSETS = [
  '/app-icon-192.png',
  '/app-icon.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  const url = new URL(event.request.url);
  const isNavigate = event.request.mode === 'navigate';
  const isCodeAsset = url.pathname.match(/\.(js|css|mjs)(\?|$)/);
  const isHtml = url.pathname.endsWith('.html') || url.pathname === '/';

  if (isNavigate || isCodeAsset || isHtml) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
