const CACHE_NAME = 'nes-emulator-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  // Voeg hier eventuele extra library-bestanden toe (zoals jsnes.min.js)
];

// Installeren van de cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Bestanden ophalen uit cache indien offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
