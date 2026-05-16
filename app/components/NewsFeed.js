'use client';
import { useState, useEffect, useRef } from 'react';

// Human-readable labels for market metric symbols
const METRIC_LABELS = {
  '^NSEI':    'Nifty 50',
  '^BSESN':   'Sensex / BSE',
  '^NSEBANK': 'Bank Nifty',
  'GC=F':     'Gold',
  'GLD':      'Gold ETF',
  'SI=F':     'Silver',
  'SLV':      'Silver ETF',
  'CL=F':     'Crude Oil',
  'BZ=F':     'Brent Crude',
  'USDINR=X': 'USD/INR',
  'INRUSD=X': 'INR/USD',
  '^GSPC':    'S&P 500',
  '^DJI':     'Dow Jones',
  '^IXIC':    'NASDAQ',
  '^FTSE':    'FTSE 100',
  '^N225':    'Nikkei 225',
};

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function buildUrl({ symbol, sector, region, query }) {
  const params = new URLSearchParams();
  if (symbol) params.set('symbol', symbol);
  else if (sector) params.set('sector', sector);
  else if (region) params.set('region', region);
  else if (query) params.set('q', query);
  return `/api/news${params.toString() ? '?' + params.toString() : ''}`;
}

function getSourceColor(source = '') {
  const s = source.toLowerCase();
  if (s.includes('economic times') || s.includes('moneycontrol') || s.includes('ndtv') || s.includes('mint') || s.includes('india')) return '#f97316';
  if (s.includes('cnbc') || s.includes('marketwatch') || s.includes('nyt') || s.includes('us')) return '#06b6d4';
  if (s.includes('reuters') || s.includes('bbc')) return '#8b5cf6';
  if (s.includes('yahoo')) return '#6366f1';
  return '#10b981';
}

function getFlag(source = '') {
  const s = source.toLowerCase();
  if (s.includes('india') || s.includes('et ') || s.includes('economic times') || s.includes('moneycontrol') || s.includes('ndtv') || s.includes('mint') || s.includes('livemint')) return '🇮🇳';
  if (s.includes('cnbc') || s.includes('marketwatch') || s.includes('nyt') || s.includes('us')) return '🇺🇸';
  return '🌐';
}

/**
 * Smart NewsFeed component
 * Props:
 *   symbol  – e.g. "AAPL" or "RELIANCE.NS" — company-specific news
 *   sector  – e.g. "Banking & Finance"       — sector-specific news
 *   region  – "IN" | "US"                    — region-specific news
 *   query   – free-text search               — custom query news
 *   compact – show fewer items, no tabs
 *   title   – custom header title
 *   refreshEvery – ms interval (default 30000)
 */
export default function NewsFeed({
  symbol,
  sector,
  region,
  query,
  compact = false,
  title,
  refreshEvery = 30000,
}) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const intervalRef = useRef(null);

  // Build context label for the title
  const contextLabel = symbol
    ? (METRIC_LABELS[symbol] || symbol.replace('.NS', '').replace('.BO', ''))
    : sector || (region === 'IN' ? 'India' : region === 'US' ? 'US Markets' : null) || query || 'Market';

  const displayTitle = title || `📰 ${contextLabel} News`;

  async function fetchNews() {
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl({ symbol, sector, region, query });
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNews(data.news || []);
      setLastFetched(new Date());
    } catch (err) {
      setError('Could not load news. Retrying...');
      console.error('NewsFeed error:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchNews();
    // Auto-refresh
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchNews, refreshEvery);
    return () => clearInterval(intervalRef.current);
  }, [symbol, sector, region, query]);

  const displayNews = compact ? news.slice(0, 8) : news;

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: compact ? '1rem' : '1.1rem' }}>
            {displayTitle}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fetching...</span>
            )}
            {!loading && news.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {news.length} stories
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#10b981' }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: '#10b981', animation: 'pulse 2s infinite'
              }} />
              LIVE
            </span>
            <button
              onClick={fetchNews}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 6px' }}
              title="Refresh"
            >🔄</button>
          </div>
        </div>
        {lastFetched && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Updated {timeAgo(lastFetched.toISOString())}
            {symbol && <span style={{ marginLeft: 6, opacity: 0.6 }}>• {METRIC_LABELS[symbol] || symbol.replace('.NS','').replace('.BO','')} news</span>}
            {sector && <span style={{ marginLeft: 6, opacity: 0.6 }}>• {sector} sector only</span>}
          </div>
        )}
      </div>

      {/* News items */}
      <div style={{ maxHeight: compact ? 380 : 520, overflowY: 'auto', paddingRight: 2 }}>
        {loading && news.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                height: 64, background: 'var(--bg-glass)', borderRadius: 8,
                animation: 'shimmer 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--loss)', fontSize: '0.85rem' }}>
            ⚠️ {error}
            <button onClick={fetchNews} style={{ display: 'block', margin: '8px auto 0', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : displayNews.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            No news found for this context.
          </div>
        ) : (
          displayNews.map((item, i) => {
            const color = getSourceColor(item.source);
            const flag = getFlag(item.source);
            const sentColor = item.sentiment === 'Bullish' ? '#10b981' : item.sentiment === 'Bearish' ? '#f87171' : '#94a3b8';
            const impactColor = item.impact === 'High' ? '#f59e0b' : item.impact === 'Medium' ? '#06b6d4' : '#6b7280';
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    padding: '11px 12px',
                    marginBottom: 8,
                    background: 'var(--bg-glass)',
                    borderRadius: 8,
                    borderLeft: `3px solid ${color}`,
                    transition: 'background 0.15s, transform 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 4 }}>
                    {item.title}
                  </div>
                  {item.brief && (
                    <div style={{ fontSize: '0.78rem', color: '#a5b4fc', lineHeight: 1.4, marginBottom: 5, fontStyle: 'italic' }}>
                      🤖 {item.brief}
                    </div>
                  )}
                  {!item.brief && item.description && !compact && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 5 }}>
                      {item.description}...
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.7rem', flexWrap: 'wrap' }}>
                    <span style={{ color, fontWeight: 600 }}>{flag} {item.source}</span>
                    {item.sentiment && (
                      <span style={{ background: sentColor + '22', color: sentColor, border: '1px solid ' + sentColor + '44', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                        {item.sentiment === 'Bullish' ? '▲' : item.sentiment === 'Bearish' ? '▼' : '●'} {item.sentiment}
                      </span>
                    )}
                    {item.impact && (
                      <span style={{ background: impactColor + '22', color: impactColor, border: '1px solid ' + impactColor + '44', borderRadius: 10, padding: '1px 7px' }}>
                        {item.impact} Impact
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>🕐 {timeAgo(item.publishedAt)}</span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>

      {!compact && news.length > 0 && (
        <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          RBI • SEBI • PIB • Reuters • Bloomberg • CNBC • ET • MoneyControl • Livemint • Business Line • WSJ • FT + more • 7-day window • Market-signal filtered • AI-scored
        </div>
      )}
    </div>
  );
}