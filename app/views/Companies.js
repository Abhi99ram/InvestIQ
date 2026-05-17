'use client';
import { formatPriceFromQuote, formatChange } from '../../lib/market';
import { useState, useEffect, useRef, useCallback } from 'react';
import NewsFeed from '../components/NewsFeed';

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
  const [history, setHistory] = useState([]);
  const [period, setPeriod] = useState('1d');
  const [companyNews, setCompanyNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const seriesRef = useRef(null);
  const liveInterval = useRef(null);

  useEffect(() => {
    if (selectedSymbol) {
      setSymbol(selectedSymbol);
      setPeriod('1d'); // default to intraday for real-time
      loadCompany(selectedSymbol, '1d');
    }
  }, [selectedSymbol]);

  // Cleanup live interval on unmount
  useEffect(() => {
    return () => { if (liveInterval.current) clearInterval(liveInterval.current); };
  }, []);

  async function loadCompany(sym, p) {
    setLoading(true);
    await Promise.all([fetchQuote(sym), fetchHistory(sym, p || period), fetchCompanyNews(sym)]);
    setLoading(false);
    // Start live updates
    startLiveUpdates(sym);
  }

  async function fetchQuote(sym) {
    try {
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(sym)}&_t=${Date.now()}`);
      const data = await res.json();
      const q = data[sym] || null;
      setQuote(q);
      setLastUpdate(new Date());
      return q;
    } catch (e) { console.error(e); return null; }
  }

  async function fetchHistory(sym, p) {
    try {
      const res = await fetch(`/api/historical?symbol=${encodeURIComponent(sym)}&period=${p}&_t=${Date.now()}`);
      const data = await res.json();
      setHistory(data.quotes || []);
    } catch (e) { console.error(e); }
  }

  async function fetchCompanyNews(sym) {
    try {
      const cleanSym = sym.replace('.NS','').replace('.BO','');
      const res = await fetch(`/api/news?q=${encodeURIComponent(cleanSym)}`);
      const data = await res.json();
      setCompanyNews((data.news || []).slice(0, 8));
    } catch (e) { console.error(e); }
  }

  // Start real-time price updates every 1 second
  function startLiveUpdates(sym) {
    if (liveInterval.current) clearInterval(liveInterval.current);
    if (!isLive) return;

    liveInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/quote?symbols=${encodeURIComponent(sym)}&_t=${Date.now()}`);
        const data = await res.json();
        const q = data[sym];
        if (!q || !q.price) return;

        setQuote(q);
        setLastUpdate(new Date());

        // Update the last candle on the chart with current price
        if (seriesRef.current && q.price) {
          const tzOffset = new Date().getTimezoneOffset() * 60;
          const now = Math.floor(Date.now() / 1000) - tzOffset;
          // Round to nearest minute for intraday, or day for daily
          const timeUnit = period === '1d' ? 60 : period === '1w' ? 900 : 86400;
          const roundedTime = Math.floor(now / timeUnit) * timeUnit;

          seriesRef.current.update({
            time: roundedTime,
            open: q.open || q.price,
            high: Math.max(q.dayHigh || q.price, q.price),
            low: Math.min(q.dayLow || q.price, q.price),
            close: q.price,
          });
        }
      } catch (e) { /* silent */ }
    }, 1000); // Every 1 second
  }

  // Toggle live updates
  function toggleLive() {
    if (isLive) {
      if (liveInterval.current) clearInterval(liveInterval.current);
      setIsLive(false);
    } else {
      setIsLive(true);
      if (symbol) startLiveUpdates(symbol);
    }
  }

  useEffect(() => {
    if (history.length > 0 && chartRef.current) renderChart();
  }, [history]);

  async function renderChart() {
    if (chartInstance.current) { chartInstance.current.remove(); chartInstance.current = null; seriesRef.current = null; }
    try {
      const lc = await import('lightweight-charts');
      const chart = lc.createChart(chartRef.current, {
        width: chartRef.current.clientWidth, height: 420,
        layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
        crosshair: { mode: 0 },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: period === '1d' },
      });
      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#34d399', downColor: '#f87171',
        borderUpColor: '#34d399', borderDownColor: '#f87171',
        wickUpColor: '#34d399', wickDownColor: '#f87171',
      });
      const tzOffset = new Date().getTimezoneOffset() * 60;
      const chartData = history.map(q => ({
        time: Math.floor(new Date(q.date).getTime() / 1000) - tzOffset,
        open: q.open, high: q.high, low: q.low, close: q.close,
      })).filter(d => d.open && d.close);
      series.setData(chartData);
      chart.timeScale().fitContent();
      chartInstance.current = chart;
      seriesRef.current = series;

      // Handle resize
      const resizeObserver = new ResizeObserver(entries => {
        if (chartRef.current && chartInstance.current) {
          chartInstance.current.applyOptions({ width: chartRef.current.clientWidth });
        }
      });
      resizeObserver.observe(chartRef.current);
    } catch (e) { console.error('Chart error:', e); }
  }

  const changePeriod = (p) => {
    setPeriod(p);
    if (symbol) {
      fetchHistory(symbol, p);
      // Restart live updates for new period
      if (isLive) startLiveUpdates(symbol);
    }
  };

  // Refresh all data now
  async function refreshNow() {
    if (!symbol) return;
    await Promise.all([fetchQuote(symbol), fetchHistory(symbol, period)]);
    if (isLive) startLiveUpdates(symbol);
  }

  const isGain = (quote?.changePercent || 0) >= 0;
  const periods = [
    { key: '1d', label: '1D', desc: 'Intraday' },
    { key: '1w', label: '1W', desc: '1 Week' },
    { key: '1m', label: '1M', desc: '1 Month' },
    { key: '3m', label: '3M', desc: '3 Months' },
    { key: '6m', label: '6M', desc: '6 Months' },
    { key: '1y', label: '1Y', desc: '1 Year' },
    { key: '5y', label: '5Y', desc: '5 Years' },
  ];

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">🏢 Company Explorer</h1>
        {symbol && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className={`btn ${isLive ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleLive} style={{ fontSize: '0.8rem' }}>
              {isLive ? '🔴 LIVE' : '⏸ Paused'}
            </button>
            <button className="btn btn-secondary" onClick={refreshNow} style={{ fontSize: '0.8rem' }}>
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

      {symbol && quote && (
        <div className="fade-in">
          {/* Company Header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>{quote.name}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <span className="tag tag-neutral">{quote.symbol}</span>
                  <span className="tag tag-neutral">{quote.exchange}</span>
                  <span className="tag tag-neutral">{quote.currency}</span>
                  {quote.marketState && (
                    <span className={`tag ${quote.marketState === 'REGULAR' ? 'tag-gain' : 'tag-neutral'}`}>
                      {quote.marketState === 'REGULAR' ? '🟢 Market Open' : '🔴 ' + quote.marketState}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, transition: 'color 0.3s' }}>
                  {formatPriceFromQuote(quote)}
                </div>
                <div className={`index-change ${isGain ? 'gain' : 'loss'}`} style={{ fontSize: '1.1rem' }}>
                  {isGain ? '▲' : '▼'} {formatChange(quote.change, quote.changePercent, quote.currency)}
                </div>
                {lastUpdate && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Last update: {lastUpdate.toLocaleTimeString()} {isLive && <span style={{ color: '#f87171' }}>● LIVE</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Price Chart</h3>
              <div className="chart-controls" style={{ display: 'flex', gap: 4 }}>
                {periods.map(p => (
                  <button key={p.key} className={`tab ${period === p.key ? 'active' : ''}`}
                    onClick={() => changePeriod(p.key)} title={p.desc}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chartRef} style={{ width: '100%', height: 420 }}>
              {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner"></div></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Updates every 1 second when LIVE • {period === '1d' ? '5-min candles' : period === '1w' ? '15-min candles' : 'Daily candles'}</span>
              <span>{lastUpdate && `Last: ${lastUpdate.toLocaleTimeString()}`}</span>
            </div>
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
                    ['Div Yield', quote.dividendYield ? (quote.dividendYield * 100).toFixed(2) + '%' : '-'],
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

      {symbol && loading && !quote && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner"></div></div>
      )}
    </div>
  );
}
