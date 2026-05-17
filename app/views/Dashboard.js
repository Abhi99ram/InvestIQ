'use client';
import { useState, useEffect, useRef } from 'react';
import { MAJOR_INDICES, SECTORS } from '../../lib/sectors';
import NewsFeed from '../components/NewsFeed';

export default function Dashboard({ onSelectStock, onSelectSector }) {
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState('android');

  useEffect(() => {
    // Capture PWA install prompt (Android/Desktop Chrome)
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    fetchIndices();
    const interval = setInterval(() => {
      fetchIndices();
      setLastUpdate(new Date().toLocaleTimeString('en-IN'));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchIndices() {
    try {
      const symbols = MAJOR_INDICES.map(i => i.symbol).join(',');
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}`);
      const data = await res.json();
      setIndices(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const formatNum = (n, unit) => {
    if (n == null) return '-';
    if (unit === '₹' || unit === 'USD/oz' || unit === 'USD/bbl') {
      return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }
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
          : <div className="index-value">{formatNum(d.price, idx.unit)}</div>
        }
        {!loading && (
          <div className={`index-change ${isGain ? 'gain' : 'loss'}`}>
            {d.changePercent != null
              ? <>{isGain ? '▲' : '▼'} {Math.abs(d.changePercent).toFixed(2)}%</>
              : <span style={{ color: 'var(--text-muted)' }}>No data</span>
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
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

      {/* ── GET THE APP CARD ─────────────────────────────────────────────── */}
      {!isInstalled && (
        <div style={{
          marginTop: 32,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(7,15,35,0.98) 100%)',
          border: '1px solid rgba(56,189,248,0.25)',
          borderRadius: 24,
          padding: '32px 36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 60px -15px rgba(56,189,248,0.15)',
        }}>
          {/* Glow blob */}
          <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, left:80, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0ea5e9,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📱</div>
                <div>
                  <h2 style={{ margin:0, color:'#fff', fontSize:'1.3rem', fontWeight:700 }}>Get InvestIQ on Your Device</h2>
                  <p style={{ margin:0, color:'#64748b', fontSize:'0.85rem' }}>Install as an app — works offline, auto-updates instantly</p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                {['⚡ Instant updates','📴 Works offline','🔔 Price alerts','📊 Full access'].map(f => (
                  <span key={f} style={{ fontSize:'0.72rem', color:'#38bdf8', background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:20, padding:'3px 10px' }}>{f}</span>
                ))}
              </div>
            </div>

            {/* 3 Platform Buttons */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <PlatformButton
                icon="🤖"
                label="Android"
                sub="Phone & Tablet"
                color="#22c55e"
                onClick={() => { setActiveInstallTab('android'); setShowInstallModal(true); }}
                installPrompt={installPrompt}
              />
              <PlatformButton
                icon=""
                label="iPhone / iPad"
                sub="iOS & iPadOS"
                color="#38bdf8"
                onClick={() => { setActiveInstallTab('ios'); setShowInstallModal(true); }}
              />
              <PlatformButton
                icon="🖥️"
                label="Desktop"
                sub="Windows & Mac"
                color="#a855f7"
                onClick={() => { setActiveInstallTab('desktop'); setShowInstallModal(true); }}
                installPrompt={installPrompt}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── INSTALL MODAL ─────────────────────────────────────────────────── */}
      {showInstallModal && (
        <InstallModal
          tab={activeInstallTab}
          setTab={setActiveInstallTab}
          installPrompt={installPrompt}
          onInstall={async () => {
            if (installPrompt) {
              installPrompt.prompt();
              const { outcome } = await installPrompt.userChoice;
              if (outcome === 'accepted') { setIsInstalled(true); setShowInstallModal(false); }
            }
          }}
          onClose={() => setShowInstallModal(false)}
        />
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function PlatformButton({ icon, label, sub, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `rgba(${color === '#22c55e' ? '34,197,94' : color === '#38bdf8' ? '56,189,248' : '168,85,247'},0.15)` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hov ? color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 16,
        padding: '14px 20px',
        cursor: 'pointer',
        textAlign: 'center',
        minWidth: 130,
        transition: 'all 0.2s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 24px -8px ${color}44` : 'none',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Inter,sans-serif' }}>{label}</div>
      <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function InstallModal({ tab, setTab, installPrompt, onInstall, onClose }) {
  const tabs = [
    { id: 'android', label: '🤖 Android', color: '#22c55e' },
    { id: 'ios',     label: ' iOS / iPad', color: '#38bdf8' },
    { id: 'desktop', label: '🖥️ Desktop',  color: '#a855f7' },
  ];

  const instructions = {
    android: {
      title: 'Install on Android Phone or Tablet',
      color: '#22c55e',
      steps: [
        { icon: '🌐', text: 'Open investiq-green.vercel.app in Chrome on your Android device' },
        { icon: '⋮',  text: 'Tap the 3-dot menu (⋮) in the top-right corner of Chrome' },
        { icon: '📲', text: 'Tap "Add to Home screen" or "Install app"' },
        { icon: '✅', text: 'Tap "Install" — InvestIQ appears on your home screen like a native app!' },
      ],
      note: 'Works on all Android phones and tablets (Samsung, OnePlus, Pixel, etc.)',
      autoInstall: true,
    },
    ios: {
      title: 'Install on iPhone or iPad',
      color: '#38bdf8',
      steps: [
        { icon: '🌐', text: 'Open investiq-green.vercel.app in Safari on your iPhone or iPad' },
        { icon: '⬆️', text: 'Tap the Share button (box with arrow) at the bottom of Safari' },
        { icon: '📲', text: 'Scroll down and tap "Add to Home Screen"' },
        { icon: '✅', text: 'Tap "Add" — InvestIQ appears on your home screen like a native app!' },
      ],
      note: '⚠️ Must use Safari browser (not Chrome) on iOS for home screen install',
      autoInstall: false,
    },
    desktop: {
      title: 'Install on Windows or Mac',
      color: '#a855f7',
      steps: [
        { icon: '🌐', text: 'Open investiq-green.vercel.app in Chrome or Edge on your computer' },
        { icon: '📥', text: 'Click the install icon (⊕) in the address bar, or open the browser menu (⋮)' },
        { icon: '📲', text: 'Click "Install InvestIQ" or "Add to Desktop"' },
        { icon: '✅', text: 'Click "Install" — InvestIQ opens in its own window like a desktop app!' },
      ],
      note: 'Works on Windows 10/11, macOS, and Chromebooks via Chrome or Edge',
      autoInstall: true,
    },
  };

  const active = instructions[tab];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.99),rgba(2,6,23,0.99))', border:'1px solid rgba(255,255,255,0.12)', borderRadius:28, padding:40, maxWidth:520, width:'100%', position:'relative', boxShadow:'0 40px 80px -20px rgba(0,0,0,0.8)' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:32, height:32, color:'#94a3b8', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>

        <h3 style={{ margin:'0 0 24px', color:'#fff', fontSize:'1.2rem', fontWeight:700 }}>📱 Install InvestIQ</h3>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:28, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:600,
              background: tab === t.id ? t.color + '22' : 'transparent',
              color: tab === t.id ? t.color : '#64748b',
              outline: tab === t.id ? `1px solid ${t.color}55` : 'none',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        <h4 style={{ margin:'0 0 20px', color:active.color, fontSize:'1rem', fontWeight:600 }}>{active.title}</h4>

        {/* Steps */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:24 }}>
          {active.steps.map((s, i) => (
            <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${active.color}18`, border:`1px solid ${active.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{s.icon}</div>
              <div style={{ paddingTop:8, color:'#cbd5e1', fontSize:'0.88rem', lineHeight:1.5 }}>
                <strong style={{ color:'#e2e8f0' }}>Step {i + 1}:</strong> {s.text}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'12px 16px', marginBottom:24, fontSize:'0.8rem', color:'#94a3b8' }}>
          💡 {active.note}
        </div>

        {/* Auto-install button for Android/Desktop */}
        {active.autoInstall && installPrompt && (
          <button onClick={onInstall} style={{
            width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:'pointer', fontWeight:700, fontSize:'1rem',
            background:`linear-gradient(135deg, ${active.color}, ${active.color}bb)`,
            color:'#000', boxShadow:`0 8px 24px -8px ${active.color}66`,
            transition:'all 0.2s',
          }}>
            ⚡ Install Now — One Click
          </button>
        )}

        {/* Auto-update notice */}
        <div style={{ marginTop:16, textAlign:'center', fontSize:'0.75rem', color:'#475569' }}>
          🔄 Updates are <strong style={{color:'#22c55e'}}>automatic</strong> — every improvement is pushed instantly to all your devices
        </div>
      </div>
    </div>
  );
}

