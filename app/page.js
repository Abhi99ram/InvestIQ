'use client';
import { useState, useEffect, useCallback } from 'react';
import Dashboard from './views/Dashboard';
import Sectors from './views/Sectors';
import Companies from './views/Companies';
import Watchlist from './views/Watchlist';
import Analysis from './views/Analysis';
import NewsFeed from './views/NewsFeed';
import Admin from './views/Admin';
import MyAccount from './views/MyAccount';
import Support from './views/Support';
import Simulator from './views/Simulator';
import Auth from './views/Auth';

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

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('investiq_user');
    if (savedUser) setUser(JSON.parse(savedUser));
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
    setActivePage('companies');
    setShowSearch(false);
    setSearchQuery('');
  };

  const viewSector = (sector) => {
    setSelectedSector(sector);
    setActivePage('sectors');
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
      <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ padding: '20px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img src="/logo.png" alt="InvestIQ Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 8px 32px rgba(56,189,248,0.3)' }} />
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>InvestIQ AI</h1>
            <p style={{ color: 'var(--text-muted)' }}>Financial Intelligence Dashboard</p>
          </div>
          <Auth onLogin={handleLogin} />
        </div>
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
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/logo.png" alt="InvestIQ Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(56,189,248,0.25)' }} />
          <h1>InvestIQ AI</h1>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Menu</div>
            {NAV_ITEMS.map(item => (
              <button key={item.id} className={`nav-link ${activePage === item.id ? 'active' : ''}`}
                onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}>
                <span className="nav-icon">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </nav>
        <div style={{ padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
          <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>InvestIQ AI v1.0</div>
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
            background: 'linear-gradient(90deg, #22c55e, #0ea5e9, #a855f7)',
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
            boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
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
            setActivePage('watchlist');
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
          <button onClick={handleLogout} className="btn-secondary btn-sm" style={{ marginLeft: '10px' }}>
            Logout
          </button>
        </header>

        <div className="page-container fade-in" key={activePage}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

