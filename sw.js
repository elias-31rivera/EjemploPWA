const CACHE = 'inventario-v5'; // Nueva versión para forzar limpieza
const ASSETS = [
  './', './index.html', './app.js', './styles.css', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png'
  // NOTA: Quitamos el CDN de Supabase de aquí para evitar que bloquee la instalación
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // allSettled garantiza que si un archivo local falla, los demás se guarden
      await Promise.allSettled(ASSETS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Si es una petición a Supabase, intenta ir a red, si falla, responde offline
  if (e.request.url.includes('supabase')) {
    e.respondWith(fetch(e.request).catch(() => 
      new Response(JSON.stringify({ error: 'offline' }), { 
        headers: { 'Content-Type': 'application/json' }, status: 503 
      })
    ));
    return;
  }
  // Para el resto, intenta caché primero, si no está, va a red
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});