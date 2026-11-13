/* Service worker: la app abre rápido y sin señal; los datos siempre se piden nuevos. */
const CACHE = 'cpn-rutas-v14';
const SHELL = ['./', 'index.html', 'app.js', 'runtime.js', 'd3.min.js', 'leaflet.js', 'leaflet.css', 'mapa-real.js', 'modulos.js', 'modulos2.js', 'hallazgos.js', 'envase.js', 'motum.js', 'abasto.js', 'direccion.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('datos.enc.json')) {
    // Datos: primero internet; si no hay señal, lo último que se bajó.
    e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('datos.enc.json', copia)); return r; }).catch(() => caches.match('datos.enc.json')));
    return;
  }
  // App: primero internet para tomar cambios; si no hay, la copia guardada.
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
