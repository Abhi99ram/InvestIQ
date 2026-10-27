'use client';
import { formatPriceFromQuote, formatChange } from '../../lib/market';
import { useState, useEffect, useRef } from 'react';
import NewsFeed from '../components/NewsFeed';
import PriceChart from '../components/PriceChart';

// Market metric symbols — get human-readable labels for news title
const METRIC_LABELS = {
  '^NSEI':    'Nifty 50',
  '^BSESN':   'Sensex / BSE',
  '^NSEBANK': 'Bank Nifty',
  'GC=F':     'Gold',
  'GLD':      'Gold ETF',
  'SI=F':     'Silver',
  'SLV':      'Silver ETF',
  'CL=F':     'Crude Oil (WTI)',
  'BZ=F':     'Brent Crude Oil',
  'USDINR=X': 'USD / INR',
  'INRUSD=X': 'INR / USD',
  '^GSPC':    'S&P 500',
  '^DJI':     'Dow Jones',
  '^IXIC':    'NASDAQ',
  '^FTSE':    'FTSE 100',
  '^N225':    'Nikkei 225',
};

export default function Companies({ selectedSymbol, onSelectStock }) {
  const [symbol, setSymbol] = useState(selectedSymbol || '');
  const [quote, setQuote] = useState(null);
  const [period, setPeriod] = useState('1d');
  const [chartType, setChartType] = useState('candles');
  const [companyNews, setCompanyNews] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0); // bump to reload chart + quote now
  const symbolRef = useRef(symbol);

  useEffect(() => {
    if (selectedSymbol) {
      setSymbol(selectedSymbol);
      symbolRef.current = selectedSymbol;
      setQuote(null);
      setPeriod('1d'); // default to intraday for real-time
      fetchCompanyNews(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Live quote loop: every second while the exchange is trading, every 15s otherwise (so a market
  // open is picked up), paused while the tab is hidden. One request in flight at a time.
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    let timer = null;
    let inFlight = null;

    const tick = async () => {
      if (cancelled) return;
      let next = 15000;
      if (!document.hidden) {
        inFlight = new AbortController();
        try {
          const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbol)}&_t=${Date.now()}`, { signal: inFlight.signal });
          const data = await res.json();
          const q = data[symbol];
          if (cancelled || symbolRef.current !== symbol) return;
          if (q && !q.error && q.price != null) {
            setQuote(q);
            setLastUpdate(new Date());
            setFeedError(false);
            if (q.marketState === 'REGULAR') next = 1000;
          } else {
            setFeedError(true);
            next = 5000;
          }
        } catch (e) {
          if (e.name === 'AbortError' || cancelled) return;
          setFeedError(true);
          next = 5000;
        }
      }
      if (!cancelled && isLive) timer = setTimeout(tick, next);
    };

    const onVisible = () => { if (!document.hidden && isLive) { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVisible);
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      inFlight?.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [symbol, isLive, refreshTick]);

  async function fetchCompanyNews(sym) {
    try {
      const cleanSym = sym.replace('.NS','').replace('.BO','');
      const res = await fetch(`/api/news?q=${encodeURIComponent(cleanSym)}`);
      const data = await res.json();
      setCompanyNews((data.news || []).slice(0, 8));
    } catch (e) { console.error(e); }
  }

  const isGain = (quote?.changePercent || 0) >= 0;
  const marketOpen = quote?.marketState === 'REGULAR';
  const tz = quote?.timezoneAbbr || '';
  // Exchange-local time of the last trade, e.g. "15:29:58 IST"
  const tradeTime = quote?.marketTime && quote?.gmtOffsetMs != null
    ? new Date(quote.marketTime + quote.gmtOffsetMs).toISOString().slice(11, 19) + (tz ? ` ${tz}` : '')
    : null;
  const marketStateLabel = { PRE: 'Pre-market', PREPRE: 'Closed', POST: 'After hours', POSTPOST: 'Closed', CLOSED: 'Closed' }[quote?.marketState] || quote?.marketState;
  const periods = [
    { key: '1d', label: '1D', desc: 'Latest session, 1-minute candles' },
    { key: '1w', label: '1W', desc: '5 sessions, 5-minute candles' },
    { key: '1m', label: '1M', desc: '1 month, 30-minute candles' },
    { key: '3m', label: '3M', desc: '3 months, daily candles' },
    { key: '6m', label: '6M', desc: '6 months, daily candles' },
    { key: '1y', label: '1Y', desc: '1 year, daily candles' },
    { key: '5y', label: '5Y', desc: '5 years, weekly candles' },
  ];

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">🏢 Company Explorer</h1>
        {symbol && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {quote && !marketOpen ? (
              <button className="btn btn-secondary" disabled style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                ⏸ Market {marketStateLabel}
              </button>
            ) : (
              <button className={`btn ${isLive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsLive(v => !v)} style={{ fontSize: '0.8rem' }}>
                {isLive ? '🔴 LIVE' : '⏸ Paused'}
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setRefreshTick(t => t + 1)} style={{ fontSize: '0.8rem' }}>
              🔄 Refresh
            </button>
          </div>
        )}
      </div>

      {!symbol && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>Search for a company using the search bar above, or select one from Sectors</p>
        </div>
      )}

      {symbol && !quote && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          {feedError ? <p style={{ color: 'var(--text-muted)' }}>Couldn’t load a quote for {symbol}. Retrying…</p> : <div className="spinner"></div>}
        </div>
      )}

      {symbol && quote && (
        <div className="fade-in">
          {/* Company Header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>{quote.name}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="tag tag-neutral">{quote.symbol}</span>
                  <span className="tag tag-neutral">{quote.exchange}</span>
                  <span className="tag tag-neutral">{quote.currency}</span>
                  {quote.marketState && (
                    <span className={`tag ${marketOpen ? 'tag-gain' : 'tag-neutral'}`}>
                      {marketOpen ? '🟢 Market Open' : '🔴 ' + marketStateLabel}
                    </span>
                  )}
                  {quote.delayMinutes != null && (
                    <span className="tag" title={quote.quoteSource || ''} style={quote.delayMinutes === 0
                      ? { background: 'rgba(34,211,238,0.12)', color: 'var(--accent-cyan)' }
                      : { background: 'rgba(251,191,36,0.12)', color: 'var(--accent-amber)' }}>
                      {quote.delayMinutes === 0 ? '⚡ Real-time' : `⏱ Delayed ${quote.delayMinutes} min`}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {formatPriceFromQuote(quote)}
                </div>
                <div className={`index-change ${isGain ? 'gain' : 'loss'}`} style={{ fontSize: '1.1rem' }}>
                  {isGain ? '▲' : '▼'} {formatChange(quote.change, quote.changePercent, quote.currency)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {tradeTime && <>Last trade {tradeTime} · </>}
                  {feedError
                    ? <span style={{ color: 'var(--accent-amber)' }}>Reconnecting…</span>
                    : lastUpdate && <>checked {lastUpdate.toLocaleTimeString()} {isLive && marketOpen && <span style={{ color: '#fb7185' }}>● LIVE</span>}</>}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <h3 className="card-title">Price Chart</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="chart-controls" style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                  {[['candles', 'Candles'], ['line', 'Line']].map(([k, l]) => (
                    <button key={k} className={`tab ${chartType === k ? 'active' : ''}`} onClick={() => setChartType(k)}>{l}</button>
                  ))}
                </div>
                <div className="chart-controls" style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                  {periods.map(p => (
                    <button key={p.key} className={`tab ${period === p.key ? 'active' : ''}`}
                      onClick={() => setPeriod(p.key)} title={p.desc}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <PriceChart key={`${symbol}-${refreshTick}`} symbol={symbol} period={period} chartType={chartType} quote={quote} />
          </div>

          <div className="grid-2">
            {/* Key Metrics */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">📊 Key Metrics</h3></div>
              <table className="data-table">
                <tbody>
                  {[
                    ['Open', quote.open], ['Prev Close', quote.previousClose],
                    ['Day High', quote.dayHigh], ['Day Low', quote.dayLow],
                    ['52W High', quote.fiftyTwoWeekHigh], ['52W Low', quote.fiftyTwoWeekLow],
                    ['Volume', quote.volume?.toLocaleString()],
                    ['Market Cap', quote.marketCap ? (quote.marketCap > 1e12 ? (quote.marketCap/1e12).toFixed(2)+'T' : quote.marketCap > 1e9 ? (quote.marketCap/1e9).toFixed(2)+'B' : (quote.marketCap/1e6).toFixed(2)+'M') : '-'],
                    ['P/E Ratio', quote.pe?.toFixed(2)], ['EPS', quote.eps?.toFixed(2)],
                    ['Div Yield', quote.dividendYield ? quote.dividendYield.toFixed(2) + '%' : '-'], // Yahoo already reports this in percent
                  ].map(([label, val]) => (
                    <tr key={label}><td style={{ color: 'var(--text-muted)' }}>{label}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{val || '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Company / Market News */}
            <NewsFeed
              symbol={symbol}
              compact={true}
              title={`📰 ${METRIC_LABELS[symbol] || quote.name} News`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
