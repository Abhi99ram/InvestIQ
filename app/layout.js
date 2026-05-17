import './globals.css';

export const metadata = {
  title: 'InvestIQ AI — Financial Intelligence Dashboard',
  description: 'Real-time stock market data, sector analysis, trend insights, and investment tools for BSE, NSE, and US exchanges.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="InvestIQ" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Remove broken legacy service workers immediately (before React loads) */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function () {
            function purgeLegacyPwa() {
              if (!('serviceWorker' in navigator)) return Promise.resolve();
              return navigator.serviceWorker.getRegistrations()
                .then(function (regs) { return Promise.all(regs.map(function (r) { return r.unregister(); })); })
                .then(function () {
                  if (!window.caches || !caches.keys) return;
                  return caches.keys().then(function (keys) {
                    return Promise.all(keys.map(function (k) { return caches.delete(k); }));
                  });
                })
                .catch(function () {});
            }
            purgeLegacyPwa();
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(function () {});
            }
          })();
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
