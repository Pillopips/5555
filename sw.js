/* Editor de fotos · modo sin conexión.
   Guarda una copia de la página la primera vez que se abre con internet. Después:
   - con internet: pide siempre la versión más reciente (si tarda más de 4 s, usa la copia mientras termina de descargar);
   - sin internet: abre la copia guardada. Las fotos nunca salen del teléfono.
   Para forzar una limpieza total, cambia el número de CACHE. */
const CACHE = 'editor-fotos-v1';
const LIMITE_MS = 4000;

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add(new Request('./', { cache: 'reload' }))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.headers.has('x-version-check')) return;            // la comprobación de versión de la app va directa a internet
  e.respondWith(redPrimero(r));
});

async function redPrimero(r){
  const cache = await caches.open(CACHE);
  const red = fetch(r, { cache: 'no-cache' }).then(res => {
    if (res && res.ok) cache.put(r, res.clone());
    return res;
  });
  const limite = new Promise((_, no) => setTimeout(() => no(new Error('lento')), LIMITE_MS));
  try {
    return await Promise.race([red, limite]);
  } catch (err) {
    const copia = (await cache.match(r)) || (r.mode === 'navigate' ? await cache.match('./') : undefined);
    if (copia) { red.catch(() => {}); return copia; }       // sin red (o muy lenta): la copia guardada
    return red;                                             // sin copia: esperar a la red de verdad
  }
}
