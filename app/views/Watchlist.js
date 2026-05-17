'use client';
import { formatPrice, formatPriceFromQuote, resolveCurrency } from '../../lib/market';
import { useState, useEffect, useCallback } from 'react';
import { getAllSectorNames } from '../../lib/sectors';

export default function Watchlist({ onSelectStock, setNotifCount, user }) {
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sectorAlerts, setSectorAlerts] = useState([]);
  const [newsAlerts, setNewsAlerts] = useState([]);
  const [watchlistData, setWatchlistData] = useState({});
  const [showAddStock, setShowAddStock] = useState(false);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [alertType, setAlertType] = useState('stock');
  const [newSymbol, setNewSymbol] = useState('');
  const [alertSymbol, setAlertSymbol] = useState('');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDir, setAlertDir] = useState('above');
  const [activeTab, setActiveTab] = useState('watchlist');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [alertSymbolPrice, setAlertSymbolPrice] = useState(null);

  useEffect(() => {
    if (!alertSymbol || alertType !== 'stock') {
      setAlertSymbolPrice(null);
      return;
    }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quote?symbols=${encodeURIComponent(alertSymbol)}`);
        const data = await res.json();
        if (data[alertSymbol] && data[alertSymbol].price) {
          setAlertSymbolPrice(data[alertSymbol].price);
        } else {
          setAlertSymbolPrice(null);
        }
      } catch {
        setAlertSymbolPrice(null);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [alertSymbol, alertType]);

  const testAlertAPI = async () => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user || { email: 'test@example.com', mobile: '1234567890' },
          alertDetails: { symbol: 'TEST.NS', message: 'Price crossed test threshold.' }
        })
      });
      const data = await res.json();
      if (data.emailPreviewUrl) {
        window.open(data.emailPreviewUrl, '_blank');
        alert('Test alert triggered! Check the opened tab for the Ethereal Email, and check server logs for the SMS.');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to trigger test alert');
    }
  };

  const handleSearch = useCallback(async (q, setter, isNews = false) => {
    setter(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      let extraSectors = [];
      if (isNews) {
        const allSectors = getAllSectorNames();
        extraSectors = allSectors.filter(s => s.toLowerCase().includes(q.toLowerCase())).map(s => ({ symbol: s, name: 'Sector', exchange: 'Macro' }));
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults([...extraSectors, ...(data.results || [])]);
      setShowSearch(true);
    } catch { setSearchResults([]); }
  }, []);

  // Load from localStorage
  useEffect(() => {
    const userKey = user?.email ? `_${user.email}` : '';
    const saved = JSON.parse(localStorage.getItem(`iq_watchlist${userKey}`) || '[]');
    const savedAlerts = JSON.parse(localStorage.getItem(`iq_alerts${userKey}`) || '[]');
    const savedSectorAlerts = JSON.parse(localStorage.getItem(`iq_sector_alerts${userKey}`) || '[]');
    const savedNewsAlerts = JSON.parse(localStorage.getItem(`iq_news_alerts${userKey}`) || '[]');
    
    setWatchlist(saved);
    setAlerts(savedAlerts);
    setSectorAlerts(savedSectorAlerts);
    setNewsAlerts(savedNewsAlerts);
    if (saved.length) fetchWatchlistData(saved);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check alerts and update data periodically (10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (watchlist.length) fetchWatchlistData(watchlist);
    }, 5000);
    return () => clearInterval(interval);
  }, [watchlist]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (newsAlerts.length) checkNewsAlerts();
    }, 60000); // Poll news alerts every 60 seconds
    return () => clearInterval(interval);
  }, [newsAlerts]);

  // Sentinel 24/7 Tri-Layer Market Scanner Background Worker Mock
  useEffect(() => {
    const interval = setInterval(() => {
      if (watchlist.length > 0) checkSentinelAlerts();
    }, 120000); // Every 2 minutes
    return () => clearInterval(interval);
  }, [watchlist]);

  async function checkSentinelAlerts() {
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: watchlist })
      });
      const data = await res.json();
      if (data.success && data.alerts?.length > 0) {
        setNotifCount(prev => prev + data.alerts.length);
        if ('Notification' in window && Notification.permission === 'granted') {
          data.alerts.forEach(alert => {
            new Notification(`🚀 HIGH CONVICTION: ${alert.symbol}`, { 
              body: `Sentinel 24/7 generated a ${alert.confidence}% confidence signal.` 
            });
          });
        }
      }
    } catch (e) {
      console.error("Sentinel Worker Error:", e);
    }
  }

  async function checkNewsAlerts() {
    let triggered = 0;
    const updated = [...newsAlerts];
    for (let i = 0; i < updated.length; i++) {
      const a = updated[i];
      try {
        const res = await fetch(`/api/news?q=${encodeURIComponent(a.symbol)}`);
        const data = await res.json();
        const latest = data.news?.[0];
        if (latest) {
          const time = new Date(latest.publishedAt).getTime();
          if (time > a.lastSeen) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`News: ${a.symbol}`, { body: latest.title });
            }
            updated[i].lastSeen = time;
            triggered++;
          }
        }
      } catch (e) {}
    }
    if (triggered > 0) {
      setNewsAlerts(updated);
      const userKey = user?.email ? `_${user.email}` : '';
      localStorage.setItem(`iq_news_alerts${userKey}`, JSON.stringify(updated));
      setNotifCount(prev => prev + triggered);
    }
  }

  useEffect(() => {
    checkAlerts();
  }, [watchlistData]);

  function checkAlerts() {
    let triggered = 0;
    alerts.forEach(async a => {
      if (!a.active) return;
      const price = watchlistData[a.symbol]?.price;
      if (!price) return;
      
      const conditionMet = (a.direction === 'above' && price >= a.targetPrice) || 
                           (a.direction === 'below' && price <= a.targetPrice) || 
                           (a.direction === 'equal' && price === a.targetPrice);
      
      if (conditionMet) {
        triggered++;
        
        // 1. Send browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const dirText = a.direction === 'above' ? 'above' : a.direction === 'below' ? 'below' : 'equal to';
          new Notification(`🔔 ${a.symbol} Alert`, { body: `Price ${dirText} ${a.targetPrice} — now at ${formatPrice(price, resolveCurrency(a.symbol, watchlistData[a.symbol]?.currency))}` });
        }

        // 2. Automatically trigger the Email/SMS Backend API
        try {
          await fetch('/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: user,
              alertDetails: { 
                symbol: a.symbol, 
                message: `Price moved ${a.direction} your target of ${a.targetPrice}. Current price: ${price.toFixed(2)}` 
              }
            })
          });
        } catch(e) {
          console.error("Failed to trigger automatic alert", e);
        }

        // 3. Mark alert as inactive so it doesn't spam
        const updated = alerts.map(alert => alert.id === a.id ? { ...alert, active: false } : alert);
        setAlerts(updated);
        const userKey = user?.email ? `_${user.email}` : '';
        localStorage.setItem(`iq_alerts${userKey}`, JSON.stringify(updated));
      }
    });
    setNotifCount(triggered);
  }

  async function fetchWatchlistData(symbols) {
    setLoading(true);
    try {
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(','))}&_t=${Date.now()}`);
      const data = await res.json();
      setWatchlistData(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function addStock() {
    if (!newSymbol.trim()) return;
    const sym = newSymbol.trim().toUpperCase();
    if (watchlist.includes(sym)) return;
    const updated = [...watchlist, sym];
    setWatchlist(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_watchlist${userKey}`, JSON.stringify(updated));
    fetchWatchlistData(updated);
    setNewSymbol('');
    setShowAddStock(false);
  }

  function removeStock(sym) {
    const updated = watchlist.filter(s => s !== sym);
    setWatchlist(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_watchlist${userKey}`, JSON.stringify(updated));
  }

  async function addAlert() {
    if (!alertSymbol || !alertPrice) return;
    const alert = { symbol: alertSymbol.toUpperCase(), targetPrice: parseFloat(alertPrice), direction: alertDir, active: true, id: Date.now(), createdAt: new Date().toISOString() };
    const updated = [...alerts, alert];
    setAlerts(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_alerts${userKey}`, JSON.stringify(updated));
    setAlertSymbol(''); setAlertPrice(''); setShowAddAlert(false);

    if (user && user.email) {
      try {
        await fetch('/api/alerts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, alert })
        });
      } catch (e) {
        console.error('Failed to save alert to DB', e);
      }
    }
  }

  function deleteAlert(id) {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_alerts${userKey}`, JSON.stringify(updated));
  }

  function addSectorAlert() {
    if (!alertSymbol || !alertPrice) return;
    const alert = { sector: alertSymbol, threshold: parseFloat(alertPrice), direction: alertDir, active: true, id: Date.now(), createdAt: new Date().toISOString() };
    const updated = [...sectorAlerts, alert];
    setSectorAlerts(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_sector_alerts${userKey}`, JSON.stringify(updated));
    setAlertSymbol(''); setAlertPrice(''); setShowAddAlert(false);
  }

  function deleteSectorAlert(id) {
    const updated = sectorAlerts.filter(a => a.id !== id);
    setSectorAlerts(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_sector_alerts${userKey}`, JSON.stringify(updated));
  }

  function addNewsAlert() {
    if (!alertSymbol) return;
    const alert = { symbol: alertSymbol, id: Date.now(), lastSeen: Date.now(), createdAt: new Date().toISOString() };
    const updated = [...newsAlerts, alert];
    setNewsAlerts(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_news_alerts${userKey}`, JSON.stringify(updated));
    setAlertSymbol(''); setShowAddAlert(false);
  }

  function deleteNewsAlert(id) {
    const updated = newsAlerts.filter(a => a.id !== id);
    setNewsAlerts(updated);
    const userKey = user?.email ? `_${user.email}` : '';
    localStorage.setItem(`iq_news_alerts${userKey}`, JSON.stringify(updated));
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">⭐ Watchlist & Alerts</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowAddStock(true)}>+ Add Stock</button>
          <button className="btn btn-secondary" onClick={() => setShowAddAlert(true)}>🔔 Set Alert</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>Watchlist ({watchlist.length})</button>
        <button className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>Stock Alerts ({alerts.length})</button>
        <button className={`tab ${activeTab === 'sector-alerts' ? 'active' : ''}`} onClick={() => setActiveTab('sector-alerts')}>Sector Alerts ({sectorAlerts.length})</button>
        <button className={`tab ${activeTab === 'news-alerts' ? 'active' : ''}`} onClick={() => setActiveTab('news-alerts')}>News Alerts ({newsAlerts.length})</button>
      </div>

      {activeTab === 'watchlist' && (
        <div className="card">
          {watchlist.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">⭐</div><p>Your watchlist is empty. Add stocks to track them.</p></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Change</th><th>Volume</th><th></th></tr></thead>
              <tbody>
                {watchlist.map(sym => {
                  const d = watchlistData[sym] || {};
                  const isGain = (d.changePercent || 0) >= 0;
                  const isInvalid = d.error || (Object.keys(d).length > 0 && d.price == null);
                  return (
                    <tr key={sym}>
                      <td><strong style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }} onClick={() => onSelectStock(sym)}>{sym}</strong></td>
                      <td style={{ color: isInvalid ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {isInvalid ? 'Invalid Symbol' : (d.name || '-')}
                      </td>
                      <td>{d.price != null ? formatPrice(d.price, resolveCurrency(sym, d.currency)) : '-'}</td>
                      <td className={isGain ? 'gain' : 'loss'}>{d.changePercent != null ? `${isGain ? '▲' : '▼'} ${d.changePercent.toFixed(2)}%` : '-'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{d.volume?.toLocaleString() || '-'}</td>
                      <td><button className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)', border: 'none' }} onClick={() => removeStock(sym)}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="card">
          {alerts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🔔</div><p>No stock alerts set. Create one to get notified.</p></div>
          ) : (
            alerts.map(a => (
              <div key={a.id} className="alert-item">
                <div>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{a.symbol}</strong>
                  <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>
                    {a.direction === 'above' ? '≥' : a.direction === 'below' ? '≤' : '='} {a.targetPrice}
                  </span>
                  <span className={`tag ${a.active ? 'tag-gain' : 'tag-neutral'}`}>{a.active ? 'Active' : 'Triggered'}</span>
                </div>
                <button className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)', border: 'none' }} onClick={() => deleteAlert(a.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sector-alerts' && (
        <div className="card">
          {sectorAlerts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏭</div><p>No sector alerts set.</p></div>
          ) : (
            sectorAlerts.map(a => (
              <div key={a.id} className="alert-item">
                <div>
                  <strong style={{ color: 'var(--accent-purple)' }}>{a.sector}</strong>
                  <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>
                    Change {a.direction === 'above' ? '≥' : '≤'} {a.threshold}%
                  </span>
                  <span className="tag tag-gain">Active</span>
                </div>
                <button className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)', border: 'none' }} onClick={() => deleteSectorAlert(a.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'news-alerts' && (
        <div className="card">
          {newsAlerts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📰</div><p>No news alerts set. Track specific companies/sectors.</p></div>
          ) : (
            newsAlerts.map(a => (
              <div key={a.id} className="alert-item">
                <div>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{a.symbol}</strong>
                  <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>Tracking News</span>
                  <span className="tag tag-gain">Active</span>
                </div>
                <button className="btn btn-sm" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)', border: 'none' }} onClick={() => deleteNewsAlert(a.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="modal-overlay" onClick={() => setShowAddStock(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Stock to Watchlist</h3>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Symbol (e.g. RELIANCE.NS, AAPL, TCS.BO)</label>
              <input className="form-input" value={newSymbol} onChange={e => handleSearch(e.target.value, setNewSymbol)} 
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="Enter stock symbol..." onKeyDown={e => e.key === 'Enter' && addStock()} />
              {showSearch && searchResults.length > 0 && newSymbol.length >= 2 && (
                <div className="search-results" style={{ top: '100%', zIndex: 100 }}>
                  {searchResults.map((r, i) => (
                    <div key={i} className="search-result-item" onMouseDown={() => { setNewSymbol(r.symbol); setShowSearch(false); }}>
                      <div><strong>{r.symbol}</strong><br/><span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{r.name}</span></div>
                      <span className="tag tag-neutral">{r.exchange}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" onClick={addStock}>Add</button><button className="btn btn-secondary" onClick={() => setShowAddStock(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAddAlert && (
        <div className="modal-overlay" onClick={() => setShowAddAlert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Set Alert</h3>
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button className={`tab ${alertType === 'stock' ? 'active' : ''}`} onClick={() => setAlertType('stock')}>Stock Alert</button>
              <button className={`tab ${alertType === 'sector' ? 'active' : ''}`} onClick={() => setAlertType('sector')}>Sector Alert</button>
              <button className={`tab ${alertType === 'news' ? 'active' : ''}`} onClick={() => setAlertType('news')}>News Alert</button>
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">{alertType === 'stock' ? 'Stock Symbol' : alertType === 'sector' ? 'Sector Name' : 'Company/Sector Name'}</label>
              {(alertType === 'stock' || alertType === 'news') ? (
                <>
                  <input className="form-input" value={alertSymbol} onChange={e => handleSearch(e.target.value, setAlertSymbol, alertType === 'news')} 
                    onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    placeholder={alertType === 'news' ? 'e.g. Reliance, Banking' : 'e.g. RELIANCE.NS'} />
                  {showSearch && searchResults.length > 0 && alertSymbol.length >= 2 && (
                    <div className="search-results" style={{ top: '100%', zIndex: 100 }}>
                      {searchResults.map((r, i) => (
                        <div key={i} className="search-result-item" onMouseDown={() => { setAlertSymbol(r.symbol); setShowSearch(false); }}>
                          <div><strong>{r.symbol}</strong><br/><span style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>{r.name}</span></div>
                          <span className="tag tag-neutral">{r.exchange}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {alertSymbolPrice !== null && alertType === 'stock' && (
                    <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Current Price: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(alertSymbolPrice, resolveCurrency(alertSymbol))}</strong>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input className="form-input" value={alertSymbol} onChange={e => {
                    setAlertSymbol(e.target.value);
                    const v = e.target.value;
                    if (v.length >= 1) {
                      const allSectors = getAllSectorNames();
                      const matchingSectors = allSectors.filter(s => s.toLowerCase().includes(v.toLowerCase())).map(s => ({ symbol: s }));
                      setSearchResults(matchingSectors);
                      setShowSearch(true);
                    } else {
                      setSearchResults([]);
                      setShowSearch(false);
                    }
                  }} 
                    onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    placeholder="e.g. Banking, IT" />
                  {showSearch && searchResults.length > 0 && alertSymbol.length >= 1 && (
                    <div className="search-results" style={{ top: '100%', zIndex: 100 }}>
                      {searchResults.map((r, i) => (
                        <div key={i} className="search-result-item" onMouseDown={() => { setAlertSymbol(r.symbol); setShowSearch(false); }}>
                          <div><strong>{r.symbol}</strong></div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {alertType !== 'news' && (
              <>
                <div className="form-group">
                  <label className="form-label">{alertType === 'stock' ? 'Target Price' : 'Change Threshold (%)'}</label>
                  <input className="form-input" type="number" value={alertPrice} onChange={e => setAlertPrice(e.target.value)} placeholder="Enter value..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Direction</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`chip ${alertDir === 'above' ? 'selected' : ''}`} onClick={() => setAlertDir('above')}>▲ Above / ≥</button>
                    <button className={`chip ${alertDir === 'below' ? 'selected' : ''}`} onClick={() => setAlertDir('below')}>▼ Below / ≤</button>
                    <button className={`chip ${alertDir === 'equal' ? 'selected' : ''}`} onClick={() => setAlertDir('equal')}>= Equal / =</button>
                  </div>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={alertType === 'stock' ? addAlert : alertType === 'news' ? addNewsAlert : addSectorAlert}>Set Alert</button>
              <button className="btn btn-secondary" onClick={() => setShowAddAlert(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
