/* Service worker: la app abre rápido y sin señal; los datos siempre se piden nuevos. */
const CACHE = 'cpn-rutas-v65';
const SHELL = ['./', 'index.html', 'app.js', 'runtime.js', 'cli-nombre.js', 'd3.min.js', 'leaflet.js', 'leaflet.css', 'mapa-real.js', 'modulos.js', 'modulos2.js', 'hallazgos.js', 'envase-filtro.js', 'pronostico.js', 'invrep.js', 'crec.js', 'clidet.js', 'ventascli.js', 'cedis.js', 'clientes-mes.js', 'envase.js', 'presentacion.js', 'programa.js', 'html2canvas.min.js', 'motum.js', 'abasto.js', 'direccion.js', 'equipo.js', 'persona.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

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
  // (24-nov-2026) sin la copia de 10 minutos del navegador: así un arreglo llega en cuanto se recarga
  const pide = e.request.mode === 'navigate' ? fetch(e.request) : fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' });
  e.respondWith(pide.then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
