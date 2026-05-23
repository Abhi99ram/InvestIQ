'use client';
import { useState, useEffect, useRef } from 'react';
import { MAJOR_INDICES, SECTORS } from '../../lib/sectors';
import { formatPrice, resolveCurrency } from '../../lib/market';
import NewsFeed from '../components/NewsFeed';

export default function Dashboard({ onSelectStock, onSelectSector }) {
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    fetchIndices();
    const interval = setInterval(() => {
      fetchIndices();
      setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchIndices() {
    try {
      const symbols = MAJOR_INDICES.map(i => i.symbol).join(',');
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}&_t=${Date.now()}`);
      const data = await res.json();
      setIndices(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const formatNum = (n, unit, currency) => {
    if (n == null) return '-';
    if (currency) return formatPrice(n, currency);
    if (unit === '₹' || unit === 'INR') return formatPrice(n, 'INR');
    if (unit === 'USD/oz' || unit === 'USD/bbl') return formatPrice(n, 'USD');
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const indiaIndices  = MAJOR_INDICES.filter(i => i.group === 'india');
  const usIndices     = MAJOR_INDICES.filter(i => i.group === 'us');
  const commodities   = MAJOR_INDICES.filter(i => i.group === 'commodity' || i.group === 'forex');

  const renderCard = (idx) => {
    const d = indices[idx.symbol] || {};
    const isGain = (d.changePercent || 0) >= 0;
    const isForex = idx.group === 'forex';
    const isCommodity = idx.group === 'commodity';

    const cardBg = isCommodity
      ? 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))'
      : isForex
      ? 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04))'
      : 'var(--bg-glass)';

    const borderColor = isCommodity
      ? 'rgba(245,158,11,0.3)'
      : isForex
      ? 'rgba(16,185,129,0.3)'
      : 'var(--border-color)';

    const usdinrRate = indices['USDINR=X']?.price || 83.50;

    return (
      <div
        key={idx.symbol}
        className="index-card"
        onClick={() => onSelectStock(idx.symbol)}
        style={{ background: cardBg, border: `1px solid ${borderColor}`, cursor: 'pointer' }}
      >
        <div className="index-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{idx.country}</span>
          <span style={{ fontWeight: 600 }}>{idx.name}</span>
          {idx.unit && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2 }}>({idx.unit})</span>}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{idx.exchange}</div>
        {loading
          ? <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 6 }} />
          : (
            <div>
              <div className="index-value">{formatNum(d.price, idx.unit, d.currency || resolveCurrency(idx.symbol))}</div>
              {isCommodity && d.price != null && (
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>≈</span>
                  <span>{formatPrice(d.price * usdinrRate, 'INR')}</span>
                </div>
              )}
            </div>
          )
        }
        {!loading && (
          <div className={`index-change ${isGain ? 'gain' : 'loss'}`} style={{ marginTop: isCommodity ? 4 : 0 }}>
            {d.changePercent != null
              ? <>{isGain ? '▲' : '▼'} {Math.abs(d.changePercent).toFixed(2)}%</>
              : <span style={{ color: 'var(--text-muted)' }}>No data</span>
            }
          </div>
        )}
      </div>
    );
  };

  const [notifPermission, setNotifPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support desktop notifications.');
      return;
    }

    // Chrome for Android blocks notifications if clicked while button hover/ripple CSS animations are active (clickjacking security check)
    // We wait 450ms for all animations to settle completely before prompting, guaranteeing successful native permission trigger!
    setTimeout(async () => {
      try {
        const permission = await Notification.requestPermission();
        setNotifPermission(permission);
        if (permission === 'granted') {
          new Notification('🔔 InvestIQ Alerts Enabled!', {
            body: 'You will now receive real-time updates, price alerts, and news digests instantly.',
            icon: '/icon-192.png',
          });
        } else if (permission === 'denied') {
          alert('🔔 Notification permission was blocked. To receive price alerts on your mobile device, please go to settings -> Apps -> Chrome / InvestIQ, and enable Notifications permission.');
        }
      } catch (err) {
        console.error('Notification permission prompt failed', err);
      }
    }, 450);
  };


  return (
    <div>
      {/* Live Notification Permission Banner */}
      {notifPermission !== 'granted' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(34,197,94,0.04) 100%)',
          border: '1px solid rgba(14, 165, 233, 0.2)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
          boxShadow: '0 4px 20px rgba(14,165,233,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔔</span>
            <div>
              <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>Enable Live Price & News Alerts</h4>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>Get real-time push notifications for watchlist movements and sector trends on your device.</p>
            </div>
          </div>
          <button onClick={requestNotifPermission} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', borderRadius: 8 }}>
            Enable Notifications
          </button>
        </div>
      )}

      <div className="section-header">
        <h1 className="section-title">📊 Market Overview</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Auto-refreshes every 60s {lastUpdate ? `• ${lastUpdate} IST` : ''}
        </span>
      </div>

      {/* Indian Indices */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          🇮🇳 Indian Indices — NSE · BSE
        </div>
        <div className="index-cards">
          {indiaIndices.map(renderCard)}
        </div>
      </div>

      {/* Gold, Silver, USD/INR, Crude */}
      <div style={{ marginBottom: 8, marginTop: 16 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          🥇 Commodities & Forex — Gold · Silver · USD/INR · Crude
        </div>
        <div className="index-cards">
          {commodities.map(renderCard)}
        </div>
      </div>

      {/* US Indices */}
      <div style={{ marginBottom: 8, marginTop: 16 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          🇺🇸 US Markets — S&P 500 · NASDAQ · Dow
        </div>
        <div className="index-cards">
          {usIndices.map(renderCard)}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        {/* Sector Heatmap */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🏭 Sector Overview</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => onSelectSector(null)}>View All →</button>
          </div>
          <div className="heatmap">
            {Object.entries(SECTORS).map(([name, data]) => (
              <div key={name} className="heatmap-cell" onClick={() => onSelectSector(name)}
                style={{ background: `${data.color}22`, borderColor: `${data.color}44` }}>
                <div className="cell-name">{data.icon} {name.split(' ')[0]}</div>
                <div className="cell-value" style={{ color: data.color }}>{data.nse.length + data.us.length} stocks</div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest News */}
        <NewsFeed region="IN" compact={true} refreshEvery={30000} />
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header"><h2 className="card-title">🚀 Quick Actions</h2></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onSelectStock('^NSEI')}>📈 Nifty 50</button>
          <button className="btn btn-primary" onClick={() => onSelectStock('^BSESN')}>📈 Sensex</button>
          <button className="btn btn-primary" onClick={() => onSelectStock('GC=F')}>🥇 Gold</button>
          <button className="btn btn-primary" onClick={() => onSelectStock('SI=F')}>⚪ Silver</button>
          <button className="btn btn-primary" onClick={() => onSelectStock('USDINR=X')}>💱 USD/INR</button>
          <button className="btn btn-primary" onClick={() => onSelectSector('Banking & Finance')}>🏦 Banking</button>
          <button className="btn btn-primary" onClick={() => onSelectStock('RELIANCE.NS')}>View RELIANCE</button>
          <button className="btn btn-primary" onClick={() => onSelectStock('TCS.NS')}>View TCS</button>
        </div>
      </div>

    </div>
  );
}


