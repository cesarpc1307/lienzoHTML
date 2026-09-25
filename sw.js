/* ============================================
   LIENZO HTML — Service Worker
   ============================================
   Estrategia "network-first": siempre intenta traer la versión más
   reciente de la red; si no hay conexión, sirve la copia guardada en
   caché para que la herramienta funcione también sin internet.

   IMPORTANTE: cuando actualices index.html / css / js, sube el número
   de CACHE_VERSION para que los navegadores descarten la caché vieja
   y no se queden atascados mostrando una versión anterior.
   ============================================ */

const CACHE_VERSION = 'lienzo-html-v2';

const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  // Solo manejamos peticiones GET del mismo origen; todo lo demás
  // (si algún día hubiera llamadas externas) pasa directo a la red.
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
