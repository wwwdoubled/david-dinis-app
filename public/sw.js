// v3.20.18: Service worker simples — cache-first para assets estáticos,
// network-first para tudo o resto (incluindo Supabase). App funciona
// offline para navegação básica (UI/HTML/JS/CSS) e dados em IndexedDB.

const CACHE_VERSION = 'dd-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Apenas assets estáticos cacheados eagerly. Outros vão sendo cached on-demand.
const CORE_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(CORE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Bypass: requests não-GET, Supabase, workers, outras origens
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/workers/')) return; // worker scripts servidos directamente
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first para next.js static assets
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/i)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(STATIC_CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        return resp;
      }).catch(() => hit))
    );
    return;
  }

  // Network-first para HTML/JS dinâmico, com fallback para cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
