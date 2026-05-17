import { NextResponse } from 'next/server';

/**
 * Permanently prevents broken PWA service workers from hijacking navigations.
 * "executionContexts" clears SW registration; "cache" clears stale HTML/JS (keeps cookies/localStorage).
 */
const SW_PURGE = '"cache", "executionContexts"';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Legacy service worker URL — return self-destruct script (no fetch handler)
  if (pathname === '/sw.js') {
    const body = `
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.registration.unregister(); })
  );
});
`.trim();
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Clear-Site-Data': SW_PURGE,
      },
    });
  }

  const response = NextResponse.next();

  // Purge service workers on every document navigation (keeps login in localStorage)
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html') || pathname === '/') {
    response.headers.set('Clear-Site-Data', SW_PURGE);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/sw.js',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)',
  ],
};
