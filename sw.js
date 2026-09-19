const CACHE = 'vimak-crm-v6-25-6-iphone-icon';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './apple-touch-icon-precomposed.png',
  './icon-192.png',
  './icon-512.png',
  './assets/crm-icon-180.png',
  './assets/crm-icon-192.png',
  './assets/crm-icon-512.png',
  './assets/favicon-32.png',
  './notifications-v62420.js',
  './captura.html',
  './captura.css',
  './captura.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Nunca interceptar Supabase, CDN ou qualquer domínio externo.
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar POST/PUT/PATCH/DELETE.
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
