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
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="InvestIQ" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{__html: `
          (function () {
            async function setupServiceWorker() {
              if (!('serviceWorker' in navigator)) return;
              try {
                const res = await fetch('/api/version?_t=' + Date.now(), { cache: 'no-store' });
                const data = await res.json();
                const key = 'investiq_sw_version';
                const prev = localStorage.getItem(key);
                if (prev && prev !== data.version) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                  if (window.caches && caches.keys) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                }
                localStorage.setItem(key, data.version);
                const reg = await navigator.serviceWorker.register('/sw.js');
                if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                reg.update();
              } catch (e) {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              }
            }
            window.addEventListener('load', setupServiceWorker);
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}

