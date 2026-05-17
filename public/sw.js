const CACHE_NAME = 'investiq-static-v1.5.1';
const STATIC_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API or Next.js data — always live
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return;

  // HTML / app shell: network only (prevents stale chunk 404 after deploy)
  if (isNavigation(request) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/manifest.json').then(() =>
          new Response(
            '<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px"><div><h1>Offline</h1><p>Check your connection and reload.</p><button onclick="location.reload()" style="padding:12px 24px;border-radius:8px;border:none;background:#38bdf8;color:#fff;cursor:pointer">Reload</button></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        )
      )
    );
    return;
  }

  // Next.js JS/CSS: network first, do not persist (avoids broken deploy mismatch)
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Small static files only
  if (STATIC_ASSETS.some((p) => url.pathname === p)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      }))
    );
  }
});
