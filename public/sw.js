// Kill-switch service worker: clears all caches, unregisters itself, reloads tabs.
// Replaces any broken legacy SW that cached stale HTML/JS after deploys.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await self.registration.unregister();
      await Promise.all(
        clients.map((client) => {
          if (client.url && 'navigate' in client) {
            return client.navigate(client.url);
          }
          return client.focus();
        })
      );
    })()
  );
});

// Intentionally NO fetch handler — all requests go directly to the network.
