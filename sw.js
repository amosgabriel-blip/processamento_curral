const CACHE_NAME = 'processamento-gol-v36';
const SHELL_FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './firebase-bundle.js', './jspdf.umd.min.js', './jspdf.plugin.autotable.min.js', './xlsx.full.min.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache:'reload' ignora o cache HTTP do GitHub Pages e baixa a versão mais nova
      Promise.all(SHELL_FILES.map((f) =>
        fetch(new Request(f, { cache: 'reload' })).then((res) => cache.put(f, res))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTML: rede primeiro (sempre a versão mais nova), cache só se estiver offline.
// Demais arquivos do app: cache primeiro. Firebase continua sempre online.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        return res;
      }).catch(() => caches.match(event.request).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
      return res;
    }).catch(() => cached))
  );
});
