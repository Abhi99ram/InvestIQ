'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

const LoadingPlaceholder = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '350px', width: '100%', gap: '15px' }}>
    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
      <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(34,211,238,0.1)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#22d3ee', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>
    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Loading section...</span>
  </div>
);

const Dashboard = dynamic(() => import('./views/Dashboard'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Sectors = dynamic(() => import('./views/Sectors'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Companies = dynamic(() => import('./views/Companies'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Watchlist = dynamic(() => import('./views/Watchlist'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Analysis = dynamic(() => import('./views/Analysis'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const NewsFeed = dynamic(() => import('./views/NewsFeed'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Admin = dynamic(() => import('./views/Admin'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const MyAccount = dynamic(() => import('./views/MyAccount'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Support = dynamic(() => import('./views/Support'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Simulator = dynamic(() => import('./views/Simulator'), { ssr: false, loading: () => <LoadingPlaceholder /> });
const Landing = dynamic(() => import('./views/Landing'), { ssr: false, loading: () => <LoadingPlaceholder /> });


import { LayoutDashboard, Factory, Building2, Star, LineChart, Newspaper, Calculator, UserIcon, Headphones } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'sectors', label: 'Sectors', icon: <Factory size={20} /> },
  { id: 'companies', label: 'Companies', icon: <Building2 size={20} /> },
  { id: 'watchlist', label: 'Watchlist & Alerts', icon: <Star size={20} /> },
  { id: 'analysis', label: 'Analysis', icon: <LineChart size={20} /> },
  { id: 'news', label: 'News & Updates', icon: <Newspaper size={20} /> },
  { id: 'simulator', label: 'Simulator & Risk', icon: <Calculator size={20} /> },
  { id: 'account', label: 'My Account', icon: <UserIcon size={20} /> },
  { id: 'support', label: 'Support', icon: <Headphones size={20} /> },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  // System Update Checker State
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(null);

  // Helper to change page state and sync with URL query params
  const changePage = useCallback((pageId) => {
    setActivePage(pageId);
    setSidebarOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('page', pageId);
      window.history.pushState({}, '', url.pathname + url.search);
    } catch (e) {
      console.error('Failed to update URL query parameter:', e);
    }
  }, []);

  // Sync page state with URL query parameter '?page=...' on mount and popstate events
  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get('page');
        if (pageParam && NAV_ITEMS.some(item => item.id === pageParam)) {
          setActivePage(pageParam);
        }
      } catch (e) {
        console.error('Failed to sync page from URL:', e);
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Load user from localStorage on mount (safe parse — corrupt data must not crash the app)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('investiq_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch {
      localStorage.removeItem('investiq_user');
    }
  }, []);

  // Poll for system updates (runs on all installed devices: Android, iOS, PC desktop)
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version');
        const data = await res.json();
        const storedVer = localStorage.getItem('investiq_version');

        if (!storedVer) {
          localStorage.setItem('investiq_version', data.version);
        } else if (storedVer !== data.version) {
          setUpdateAvailable(true);
          setUpdateVersion(data.version);
        }
      } catch (err) {
        console.error('Failed to check app version', err);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Poll for real-time USD/INR rate to populate global currency formatter registry
  useEffect(() => {
    const fetchUsdInr = async () => {
      try {
        const res = await fetch(`/api/quote?symbols=USDINR=X&_t=${Date.now()}`);
        const data = await res.json();
        if (data && data['USDINR=X'] && data['USDINR=X'].price) {
          globalThis.USD_INR_RATE = data['USDINR=X'].price;
        }
      } catch (e) {
        console.error('Failed to pre-fetch USD/INR rate', e);
      }
    };
    fetchUsdInr();
    const interval = setInterval(fetchUsdInr, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll for alerts notification count
  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`/api/user/notifications?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.count !== undefined) setNotifCount(data.count);
      } catch (e) { console.error(e); }
    };
    fetchNotifs();
    const int = setInterval(fetchNotifs, 30000);
    return () => clearInterval(int);
  }, [user]);

  const handleApplyUpdate = () => {
    if (updateVersion) {
      localStorage.setItem('investiq_version', updateVersion);
      window.location.reload(true);
    }
  };


  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('investiq_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('investiq_user');
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('investiq_user', JSON.stringify(updatedUser));
  };


  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowSearch(true);
    } catch { setSearchResults([]); }
  }, []);

  const selectStock = (symbol) => {
    setSelectedSymbol(symbol);
    changePage('companies');
    setShowSearch(false);
    setSearchQuery('');
  };

  const viewSector = (sector) => {
    setSelectedSector(sector);
    changePage('sectors');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onSelectStock={selectStock} onSelectSector={viewSector} />;
      case 'sectors': return <Sectors selectedSector={selectedSector} onSelectStock={selectStock} />;
      case 'companies': return <Companies selectedSymbol={selectedSymbol} onSelectStock={selectStock} />;
      case 'watchlist': return <Watchlist onSelectStock={selectStock} setNotifCount={setNotifCount} user={user} />;
      case 'analysis': return <Analysis selectedSymbol={selectedSymbol} onSelectStock={selectStock} />;
      case 'news': return <NewsFeed />;
      case 'simulator': return <Simulator />;
      case 'account': return <MyAccount user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />;
      case 'support': return <Support />;
      default: return <Dashboard onSelectStock={selectStock} onSelectSector={viewSector} />;
    }
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        {updateAvailable && (
          <div onClick={handleApplyUpdate} style={{
            background: 'linear-gradient(90deg, #b6f24a, #22d3ee, #a855f7)',
            padding: '14px 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(34,211,238,0.3)',
            position: 'fixed', left: 0, right: 0, bottom: 0, // landing nav is fixed to the top
            zIndex: 99999,
            transition: 'all 0.3s ease'
          }}>
            <span>🚀 SYSTEM UPDATE DETECTED!</span>
            <span style={{ fontWeight: 400 }}>InvestIQ v{updateVersion} has been deployed successfully.</span>
            <span style={{ background:'rgba(255,255,255,0.22)', padding:'4px 10px', borderRadius:8, fontSize:'0.72rem', letterSpacing:1, fontWeight:700 }}>RELOAD & UPDATE NOW ⚡</span>
          </div>
        )}
        <Landing onLogin={handleLogin} />
      </div>
    );
  }


  if (user.email === 'alapatisubhashchowdary1233@gmail.com' || user.email === 'investiq.helpdesk@gmail.com') {
    return (
      <div className="app-layout">
        <div className="main-content" style={{ marginLeft: 0 }}>
          <header className="header" style={{ justifyContent: 'space-between' }}>
            <div className="sidebar-logo">
              <img src="/logo.png" alt="InvestIQ Admin" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }} />
              <h1 style={{ margin: 0 }}>InvestIQ AI Admin</h1>
            </div>
            <button onClick={handleLogout} className="btn-secondary btn-sm">Logout</button>
          </header>
          <div className="page-container fade-in">
            <Admin />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 249,
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="InvestIQ Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(34,211,238,0.25)' }} />
          <h1>InvestIQ AI</h1>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Menu</div>
            {NAV_ITEMS.map(item => (
              <button key={item.id} className={`nav-link ${activePage === item.id ? 'active' : ''}`}
                onClick={() => changePage(item.id)}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </nav>
        <div style={{ padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: '#5a6188', lineHeight: 1.6 }}>
          <div style={{ color: '#8a93b2', fontWeight: 600, marginBottom: 4 }}>InvestIQ AI v1.0</div>
          <div style={{ marginBottom: 12 }}>Data via Yahoo Finance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontWeight: 600 }}>
            <span>⚠️</span>
            <span>Not financial advice</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Dynamic Auto-Update Notification Banner (Play Store, App Store, and PC Wrapper updates) */}
        {updateAvailable && (
          <div onClick={handleApplyUpdate} style={{
            background: 'linear-gradient(90deg, #b6f24a, #22d3ee, #a855f7)',
            padding: '12px 20px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(34,211,238,0.3)',
            zIndex: 9999,
            transition: 'all 0.3s ease'
          }}>
            <span>🚀 SYSTEM UPDATE DETECTED!</span>
            <span style={{ fontWeight: 400 }}>InvestIQ v{updateVersion} has been deployed successfully.</span>
            <span style={{ background:'rgba(255,255,255,0.22)', padding:'4px 10px', borderRadius:8, fontSize:'0.72rem', letterSpacing:1, fontWeight:700 }}>RELOAD & UPDATE NOW ⚡</span>
          </div>
        )}

        {/* Header */}
        <header className="header">

          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search stocks (e.g. RELIANCE, AAPL, TCS)..."
              value={searchQuery} onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)} />
            {showSearch && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((r, i) => (
                  <div key={i} className="search-result-item" onMouseDown={() => selectStock(r.symbol)}>
                    <div><strong>{r.symbol}</strong><br/><span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{r.name}</span></div>
                    <span className="tag tag-neutral">{r.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="market-status" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.name || user.email}</span>
            <div className="market-badge"><span className="dot"></span>LIVE</div>
          </div>
          <button className="notification-btn" onClick={async () => {
            changePage('watchlist');
            if (notifCount > 0) {
              setNotifCount(0);
              fetch('/api/user/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
              }).catch(console.error);
            }
          }}>
            🔔 {notifCount > 0 && <span className="notification-badge">{notifCount}</span>}
          </button>
          <button onClick={handleLogout} className="btn-secondary btn-sm header-logout-btn" style={{ marginLeft: '10px' }}>
            <span className="logout-text">Logout</span>
            <span className="logout-icon" style={{ display: 'none' }}>🚪</span>
          </button>
        </header>

        <div className="page-container fade-in" key={activePage}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

