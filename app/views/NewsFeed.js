'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import NewsFeed from '../components/NewsFeed';

export default function NewsFeedView() {
  const [mode, setMode] = useState('india');   // 'all' | 'india' | 'us' | 'gold' | 'silver' | 'forex' | 'indices' | 'policy' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [policyLastUpdate, setPolicyLastUpdate] = useState(null);

  // Policy feed auto-refreshes every 5 minutes (breaking policy news)
  useEffect(() => {
    if (mode === 'policy') {
      setPolicyLastUpdate(new Date());
      const interval = setInterval(() => setPolicyLastUpdate(new Date()), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowDropdown(true);
    } catch { setSearchResults([]); }
  }, []);

  function triggerSearch() {
    if (!searchQuery.trim()) return;
    setActiveQuery(searchQuery.trim());
    setMode('search');
    setShowDropdown(false);
  }

  const TABS = [
    { key: 'india',   label: '🇮🇳 India',          title: '🇮🇳 India Market News' },
    { key: 'indices', label: '📈 NSE · BSE · Sensex', title: '📈 NSE / BSE / Sensex Updates' },
    { key: 'gold',    label: '🥇 Gold',             title: '🥇 Gold Market Intelligence' },
    { key: 'silver',  label: '⚪ Silver',           title: '⚪ Silver Market Intelligence' },
    { key: 'forex',   label: '💱 Dollar vs ₹',     title: '💱 USD / INR Exchange Rate News' },
    { key: 'policy',  label: '🏛️ Monetary Policy', title: '🏛️ Monetary Policy Updates' },
    { key: 'us',      label: '🇺🇸 US Markets',     title: '🇺🇸 US Markets News' },
    { key: 'all',     label: '🌍 All Markets',     title: '🌍 All Markets Intelligence' },
  ];

  // Quick pills — mapped to tab/query
  const QUICK_PILLS = [
    // Removed 'RBI Policy' pill as requested
    { label: 'Interest Rates India', action: () => { setSearchQuery('Interest Rates India'); setActiveQuery('Interest Rates India'); setMode('search'); } },
    { label: 'Monetary Policy RBI',  action: () => { setMode('policy'); } },
    { label: 'Fiscal Policy India',  action: () => { setSearchQuery('Fiscal Policy India'); setActiveQuery('Fiscal Policy India'); setMode('search'); } },
    { label: 'SEBI',                 action: () => { setSearchQuery('SEBI'); setActiveQuery('SEBI'); setMode('search'); } },
    { label: 'NSE',                  action: () => { setSearchQuery('NSE'); setActiveQuery('NSE'); setMode('search'); } },
    { label: 'BSE',                  action: () => { setSearchQuery('BSE'); setActiveQuery('BSE'); setMode('search'); } },
    { label: 'Sensex',               action: () => { setSearchQuery('Sensex'); setActiveQuery('Sensex'); setMode('search'); } },
    { label: 'Nifty 50',             action: () => { setSearchQuery('Nifty 50'); setActiveQuery('Nifty 50'); setMode('search'); } },
    { label: 'Gold Price',           action: () => { setMode('gold'); } },
    { label: 'Silver Price',         action: () => { setMode('silver'); } },
    { label: 'Dollar vs Rupee',      action: () => { setMode('forex'); } },
    { label: 'Crude Oil',            action: () => { setSearchQuery('Crude oil'); setActiveQuery('Crude oil'); setMode('search'); } },
    { label: 'Inflation India',      action: () => { setSearchQuery('Inflation India CPI'); setActiveQuery('Inflation India CPI'); setMode('search'); } },
    { label: 'S&P 500',              action: () => { setSearchQuery('S&P 500'); setActiveQuery('S&P 500'); setMode('search'); } },
  ];

  const activeTab = TABS.find(t => t.key === mode);

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">📰 Market Intelligence Feed</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Real-time • RBI • SEBI • Yahoo Finance • ET • MoneyControl • Bloomberg • Reuters + 20+ sources
        </span>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 20, overflow: 'visible', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <input
              className="form-input"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onKeyDown={e => e.key === 'Enter' && triggerSearch()}
              placeholder="Search company, sector, policy… e.g. HDFC, RBI rate, Gold MCX, Dollar Rupee"
              style={{ marginBottom: 0 }}
            />
            {showDropdown && searchResults.length > 0 && (
              <div style={{
                top: '100%', zIndex: 9999, position: 'absolute', width: '100%',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.7)', borderRadius: '8px', overflow: 'hidden'
              }}>
                {searchResults.map((r, i) => (
                  <div key={i} className="search-result-item" onMouseDown={() => {
                    setSearchQuery(r.symbol);
                    setActiveQuery(r.symbol);
                    setMode('search');
                    setShowDropdown(false);
                  }}>
                    <div>
                      <strong style={{ color: '#fff' }}>{r.symbol}</strong><br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.name}</span>
                    </div>
                    <span className="tag tag-neutral">{r.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={triggerSearch}>🔍 Search News</button>
          {mode === 'search' && (
            <button className="btn btn-secondary" onClick={() => { setMode('india'); setSearchQuery(''); setActiveQuery(''); }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Quick pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {QUICK_PILLS.map(p => (
            <button key={p.label} onClick={p.action}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                border: '1px solid var(--border-color)', background: 'transparent',
                color: 'var(--text-muted)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = '#38bdf8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Region/Topic Tabs */}
      {mode !== 'search' && (
        <div className="tabs" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab ${mode === t.key ? 'active' : ''}`} onClick={() => setMode(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Policy tab special banner */}
      {mode === 'policy' && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.08))',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '1.2rem' }}>🏛️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#a78bfa', fontSize: '0.9rem' }}>Monetary Policy</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              RBI MPC decisions · Repo rate · Interest rates · Inflation targeting · Auto-refreshes every 5 minutes
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            LIVE
          </span>
        </div>
      )}

      {/* Gold tab banner */}
      {mode === 'gold' && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.04))',
          border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '1.4rem' }}>🥇</span>
          <div>
            <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.9rem' }}>Gold Market Intelligence</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              MCX Gold · COMEX Futures · International bullion · RBI gold reserves · Import duty · ETF flows
            </div>
          </div>
        </div>
      )}

      {/* Silver tab banner */}
      {mode === 'silver' && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(148,163,184,0.15),rgba(148,163,184,0.04))',
          border: '1px solid rgba(148,163,184,0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '1.4rem' }}>⚪</span>
          <div>
            <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.9rem' }}>Silver Market Intelligence</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              MCX Silver · COMEX SI Futures · Industrial demand · Solar sector demand · Import data
            </div>
          </div>
        </div>
      )}

      {/* Forex tab banner */}
      {mode === 'forex' && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.04))',
          border: '1px solid rgba(16,185,129,0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '1.4rem' }}>💱</span>
          <div>
            <div style={{ fontWeight: 600, color: '#10b981', fontSize: '0.9rem' }}>USD / INR Exchange Rate</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              RBI reference rate · Forex reserves · FII/FDI flows · Dollar index (DXY) · Import/Export impact
            </div>
          </div>
        </div>
      )}

      {/* Indices tab banner */}
      {mode === 'indices' && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(56,189,248,0.04))',
          border: '1px solid rgba(56,189,248,0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '1.4rem' }}>📈</span>
          <div>
            <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.9rem' }}>NSE · BSE · Sensex · Nifty Updates</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Nifty 50 · Sensex · Bank Nifty · FII/DII data · Circuit breakers · F&O expiry · Bulk deals
            </div>
          </div>
        </div>
      )}

      {/* Feed Content */}
      {mode === 'all'     && <NewsFeed key="all"     refreshEvery={30000} title="🌍 All Markets Intelligence" />}
      {mode === 'india'   && <NewsFeed key="india"   region="IN" refreshEvery={30000} title="🇮🇳 India Market Intelligence" />}
      {mode === 'us'      && <NewsFeed key="us"      region="US" refreshEvery={30000} title="🇺🇸 US Markets News" />}
      {mode === 'gold'    && <NewsFeed key="gold"    query="gold price MCX bullion India international COMEX" refreshEvery={30000} title="🥇 Gold Market Intelligence" />}
      {mode === 'silver'  && <NewsFeed key="silver"  query="silver price MCX India COMEX futures industrial" refreshEvery={30000} title="⚪ Silver Market Intelligence" />}
      {mode === 'forex'   && <NewsFeed key="forex"   query="dollar rupee USD INR exchange rate RBI forex reserves" refreshEvery={30000} title="💱 USD/INR Exchange Rate" />}
      {mode === 'indices' && <NewsFeed key="indices" query="NSE BSE Sensex Nifty50 India stock market" refreshEvery={30000} title="📈 NSE · BSE · Sensex Updates" />}
      {mode === 'policy'  && (
        <NewsFeed
          key="policy"
          query="RBI MPC repo rate monetary policy interest rate"
          refreshEvery={30000}
          title="🏛️ Monetary Policy"
        />
      )}
      {mode === 'search' && activeQuery && (
        <NewsFeed key={activeQuery} query={activeQuery} title={`🔍 News for "${activeQuery}"`} refreshEvery={60000} />
      )}
    </div>
  );
}
