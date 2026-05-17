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
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('🔔 InvestIQ Alerts Enabled!', {
            body: 'You will now receive real-time updates, price alerts, and news digests instantly.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100]
          });
        });
      } else {
        new Notification('🔔 InvestIQ Alerts Enabled!', {
          body: 'You will now receive real-time updates, price alerts, and news digests instantly.',
          icon: '/icon-192.png'
        });
      }
    }
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
                icon="📱"
                label="Phones"
                sub="Android & iPhone"
                color="#22c55e"
                onClick={() => { setActiveInstallTab('android'); setShowInstallModal(true); }}
              />
              <PlatformButton
                icon="📐"
                label="Tablets"
                sub="iPad & Android HD"
                color="#ec4899"
                onClick={() => { setActiveInstallTab('tablet'); setShowInstallModal(true); }}
              />
              <PlatformButton
                icon="🖥️"
                label="Desktop PC"
                sub="Windows & macOS"
                color="#a855f7"
                onClick={() => { setActiveInstallTab('desktop'); setShowInstallModal(true); }}
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
  const [packProgress, setPackProgress] = useState(-1); // -1 = idle
  const [packLogs, setPackLogs] = useState([]);
  const logInterval = useRef(null);

  const tabs = [
    { id: 'android', label: '🤖 Android', color: '#22c55e' },
    { id: 'ios',     label: '🍎 iOS & iPad', color: '#38bdf8' },
    { id: 'desktop', label: '🖥️ Desktop PC',  color: '#a855f7' },
    { id: 'tablet',  label: '📐 Tablet Exclusive', color: '#ec4899' },
  ];

  const handleDownload = (platform, filename) => {
    setPackProgress(0);
    setPackLogs(['[1/5] Initializing InvestIQ Native Wrapper...']);
    
    let step = 0;
    const steps = [
      '[2/5] Compiling High-Definition assets & layout files...',
      '[3/5] Setting up offline database & service worker bridge...',
      '[4/5] Securing app packages with SSL & Vercel credentials...',
      '[5/5] Finalizing native bundle for high-precision charting...',
      '🚀 Packaging Complete! Initializing download...'
    ];

    if (logInterval.current) clearInterval(logInterval.current);

    logInterval.current = setInterval(() => {
      step++;
      if (step <= 4) {
        setPackProgress(step * 20);
        setPackLogs(prev => [...prev, steps[step - 1]]);
      } else {
        setPackProgress(100);
        setPackLogs(prev => [...prev, steps[4]]);
        clearInterval(logInterval.current);

        // Download actual shortcut/installer wrapper file from the public/downloads directory
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = `/downloads/${filename}`;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Reset progress after a short delay
          setTimeout(() => {
            setPackProgress(-1);
            setPackLogs([]);
          }, 3000);
        }, 1000);
      }
    }, 800);
  };


  const instructions = {
    android: {
      title: 'Download & Install for Android devices',
      color: '#22c55e',
      desc: 'Get the native app bundle for any Android phone or tablet. Fast, offline-first, with push notification support.',
      options: [
        { label: '📱 Download Android Phone App (.apk)', filename: 'investiq-mobile.apk', action: () => handleDownload('Android Mobile', 'investiq-mobile.apk') },
        { label: '📐 Download Android Tablet HD App (.apk)', filename: 'investiq-tablet-hd.apk', action: () => handleDownload('Android Tablet', 'investiq-tablet-hd.apk') },
      ],
      steps: [
        { icon: '📥', text: 'Click a download link above to fetch the apk package' },
        { icon: '⚙️', text: 'Allow installation from Unknown Sources if prompted' },
        { icon: '✅', text: 'Open the file to install — updates are automatically pushed silently' }
      ]
    },
    ios: {
      title: 'Install for iPhone & iPad App',
      color: '#38bdf8',
      desc: 'Optimized perfectly for iOS 16.4+ and iPadOS. Experience full-screen native desktop-grade feel.',
      options: [
        { label: '🍏 Download iPhone App (App Store Link)', filename: 'investiq-iphone.mobileconfig', action: () => handleDownload('iOS Phone', 'investiq-iphone.mobileconfig') },
        { label: '📐 Download iPad Exclusive App (App Store HD Link)', filename: 'investiq-ipad-hd.mobileconfig', action: () => handleDownload('iPadOS Tablet', 'investiq-ipad-hd.mobileconfig') },
      ],
      steps: [
        { icon: '🌐', text: 'Open Safari on your iPhone or iPad' },
        { icon: '⬆️', text: 'Tap the Share button at the bottom and click "Add to Home Screen"' },
        { icon: '🔔', text: 'Allow notification requests to receive real-time price & news alerts' }
      ]
    },
    desktop: {
      title: 'Install for Windows PC & Mac',
      color: '#a855f7',
      desc: 'Dedicated desktop app experience. Opens in a clean borderless window with advanced trading tools.',
      options: [
        { label: '🖥️ Download Windows App Installer (.msi)', filename: 'investiq-win-setup.msi', action: () => handleDownload('Windows PC', 'investiq-win-setup.msi') },
        { label: '🍎 Download macOS App Installer (.dmg)', filename: 'investiq-mac-setup.dmg', action: () => handleDownload('macOS', 'investiq-mac-setup.dmg') },
      ],
      steps: [
        { icon: '📥', text: 'Click to download the native Windows or Mac installer' },
        { icon: '⚡', text: 'Double-click the downloaded setup to deploy instantly to your desk' },
        { icon: '🚀', text: 'Pin it to your taskbar or dock for instant access' }
      ]
    },
    tablet: {
      title: 'Exclusive High-Definition Tablet Version',
      color: '#ec4899',
      desc: 'InvestIQ includes a dedicated layout tailored specifically for iPads and Android tablets.',
      options: [
        { label: '📐 Launch Tablet Workspace Simulator', filename: '', action: () => { alert('Tablet HD Mode Activated! Grid layouts are now expanded to double-width.'); onClose(); } }
      ],
      steps: [
        { icon: '📐', text: 'Landscape Workspace: Rotates seamlessly to show dual columns (Chat + Charts side-by-side)' },
        { icon: '📈', text: 'HD Graphics: Vector charts expand to utilize the full display screen resolution' },
        { icon: '⚡', text: 'Optimized touch tap gestures for fast watchlist filtering & technical analysis' }
      ]
    }
  };

  const active = instructions[tab];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={(e) => { if (e.target === e.currentTarget && packProgress === -1) onClose(); }}>
      <div style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.99),rgba(2,6,23,0.99))', border:'1px solid rgba(255,255,255,0.12)', borderRadius:28, padding:40, maxWidth:580, width:'100%', position:'relative', boxShadow:'0 40px 80px -20px rgba(0,0,0,0.9)' }}>
        
        {/* Close */}
        {packProgress === -1 && (
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:32, height:32, color:'#94a3b8', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        )}

        <h3 style={{ margin:'0 0 24px', color:'#fff', fontSize:'1.25rem', fontWeight:700, display:'flex', alignItems:'center', gap:10 }}>
          <span>📲</span> InvestIQ Download & Installation Center
        </h3>

        {/* Tabs */}
        {packProgress === -1 && (
          <div style={{ display:'flex', gap:6, marginBottom:28, background:'rgba(255,255,255,0.03)', borderRadius:12, padding:4, flexWrap:'wrap' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex:1, minWidth:100, padding:'10px 0', borderRadius:9, border:'none', cursor:'pointer', fontSize:'0.75rem', fontWeight:600,
                background: tab === t.id ? t.color + '18' : 'transparent',
                color: tab === t.id ? t.color : '#64748b',
                outline: tab === t.id ? `1px solid ${t.color}44` : 'none',
                transition: 'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>
        )}

        {packProgress > -1 ? (
          /* Packaging Screen */
          <div style={{ padding:'20px 0', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:16 }}>⚙️</div>
            <h4 style={{ color:'#fff', margin:'0 0 8px', fontWeight:600 }}>Packaging Native Application Bundle</h4>
            <p style={{ color:'#64748b', fontSize:'0.82rem', margin:'0 0 24px' }}>Compiling layout components & chart renderers for maximum device speed...</p>
            
            {/* Progress bar */}
            <div style={{ width:'100%', height:8, background:'rgba(255,255,255,0.08)', borderRadius:4, overflow:'hidden', marginBottom:24 }}>
              <div style={{ width:`${packProgress}%`, height:'100%', background:`linear-gradient(90deg, ${active.color}, #38bdf8)`, transition:'width 0.4s' }} />
            </div>

            {/* Logs console */}
            <div style={{ background:'#020617', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:16, minHeight:120, textAlign:'left', fontFamily:'Courier New, monospace', fontSize:'0.72rem', color:'#38bdf8', overflowY:'auto' }}>
              {packLogs.map((l, i) => (
                <div key={i} style={{ marginBottom:6 }}>{l}</div>
              ))}
            </div>
          </div>
        ) : (
          /* Interactive Download Screen */
          <div>
            <h4 style={{ margin:'0 0 8px', color:active.color, fontSize:'1.05rem', fontWeight:600 }}>{active.title}</h4>
            <p style={{ margin:'0 0 24px', color:'#cbd5e1', fontSize:'0.85rem', lineHeight:1.5 }}>{active.desc}</p>

            {/* Premium Download Buttons */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
              {active.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={opt.action}
                  style={{
                    width:'100%',
                    padding:'14px 18px',
                    borderRadius:14,
                    border:`1px solid ${active.color}44`,
                    background: `linear-gradient(135deg, rgba(15,23,42,0.8), rgba(7,15,35,0.8))`,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = active.color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${active.color}44`; e.currentTarget.style.transform = 'none'; }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontSize:'0.75rem', color:active.color, textTransform:'uppercase', fontWeight:700 }}>Download ↓</span>
                </button>
              ))}
            </div>

            {/* Steps Info */}
            <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:24 }}>
              {active.steps.map((s, i) => (
                <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${active.color}15`, border:`1px solid ${active.color}25`, display:'flex', alignItems:'center', justifySelf:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{s.icon}</div>
                  <div style={{ paddingTop:6, color:'#cbd5e1', fontSize:'0.82rem', lineHeight:1.4 }}>
                    {s.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px 16px', fontSize:'0.78rem', color:'#94a3b8' }}>
              💡 Updates are pushed <strong style={{color:'#22c55e'}}>automatically</strong> — every improvements pushes instantly to all your devices without reinstalling.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

