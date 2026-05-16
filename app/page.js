'use client';
import { useState, useEffect, useCallback } from 'react';
import Dashboard from './views/Dashboard';
import Sectors from './views/Sectors';
import Companies from './views/Companies';
import Watchlist from './views/Watchlist';
import Analysis from './views/Analysis';
import NewsFeed from './views/NewsFeed';
import Auth from './views/Auth';
import Admin from './views/Admin';
import MyAccount from './views/MyAccount';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'sectors', label: 'Sectors', icon: '🏭' },
  { id: 'companies', label: 'Companies', icon: '🏢' },
  { id: 'watchlist', label: 'Watchlist & Alerts', icon: '⭐' },
  { id: 'analysis', label: 'Analysis', icon: '📈' },
  { id: 'news', label: 'News & Updates', icon: '📰' },
  { id: 'account', label: 'My Account', icon: '👤' },
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

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('investiq_user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

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
      case 'account': return <MyAccount user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />;
      default: return <Dashboard onSelectStock={selectStock} onSelectSector={viewSector} />;
    }
  };

  if (!user) {
    return (
      <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ padding: '20px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div className="logo-icon" style={{ fontSize: '3rem' }}>📊</div>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>InvestIQ</h1>
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
              <div className="logo-icon">📊</div>
              <h1 style={{ margin: 0 }}>InvestIQ Admin</h1>
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
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">📊</div>
          <h1>InvestIQ</h1>
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
        <div style={{padding:'16px 20px',borderTop:'1px solid var(--border-color)',fontSize:'0.75rem',color:'var(--text-muted)'}}>
          InvestIQ v1.0<br/>Data via Yahoo Finance<br/>
          <span style={{color:'var(--accent-amber)'}}>⚠ Not financial advice</span>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <button className="btn-secondary btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{display:'none','@media(maxWidth:900px)':{display:'block'}}}>☰</button>
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
          <button className="notification-btn" onClick={() => setActivePage('watchlist')}>
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
