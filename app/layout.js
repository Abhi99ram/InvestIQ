import './globals.css';
import './landing.css';

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#060a1c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Web app only — no service worker / no standalone PWA shell (prevents cache breakages) */}
      </head>
      <body>{children}</body>
    </html>
  );
}
