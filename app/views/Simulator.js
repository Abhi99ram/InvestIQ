import { useState, useMemo, useEffect } from 'react';

const LOADING_STEPS = [
  "Initializing institutional quant engine...",
  "Fetching live quotes and macro indicators...",
  "Computing 10-year historical return series...",
  "Extracting Trailing Dividend Yields & Sectors...",
  "Building N×N covariance matrix...",
  "Applying Cholesky decomp and Student's t-dist draws...",
  "Running 10,000 Monte Carlo paths...",
  "Calculating Efficient Frontier (Max Sharpe)...",
  "Computing VaR, CVaR, Sharpe, and Sortino ratios...",
  "Running deterministic stress tests...",
  "Sending payload to AI Intelligence Engine...",
  "Finalizing Dual-Layer Reallocation Strategy..."
];

const QUICK_ADD_ASSETS = [
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'SI=F', name: 'Silver' },
  { symbol: 'HG=F', name: 'Copper' },
  { symbol: 'CL=F', name: 'Crude Oil' },
  { symbol: '^NSEI', name: 'Nifty 50' },
  { symbol: '^GSPC', name: 'S&P 500' }
];

export default function Simulator() {
  const [portfolio, setPortfolio] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [periodValue, setPeriodValue] = useState(1);
  const [periodUnit, setPeriodUnit] = useState('Years');
  const [inflationRate, setInflationRate] = useState(6);
  const [includeInflation, setIncludeInflation] = useState(true);

  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowSearch(true);
    } catch { setSearchResults([]); } finally { setIsSearching(false); }
  };

  const addAsset = async (symbol, name, type = 'Equity') => {
    if (portfolio.length >= 15) { alert("Max 15 assets allowed."); return; }
    if (portfolio.find(p => p.symbol === symbol)) return;
    
    let displayName = name;
    if (symbol === 'GC=F') displayName = 'Gold (COMEX)';
    if (symbol === 'SI=F') displayName = 'Silver (COMEX)';
    if (symbol === 'HG=F') displayName = 'Copper (COMEX)';
    if (symbol === 'CL=F') displayName = 'Crude Oil (NYMEX)';
    if (symbol === '^NSEI') displayName = 'Nifty 50';

    try {
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      const price = data[symbol]?.price || 0;
      setPortfolio([...portfolio, { symbol, name: displayName, price, shares: 1, type }]);
      setSearchQuery(''); setShowSearch(false); setResults(null);
    } catch (e) { alert("Could not fetch price."); }
  };

  const currentPortfolioValue = useMemo(() => portfolio.reduce((acc, p) => acc + (p.price * p.shares), 0), [portfolio]);

  const handleSharesChange = (symbol, sharesStr) => {
    const s = Number(sharesStr);
    if (s < 0) return;
    setPortfolio(portfolio.map(p => p.symbol === symbol ? {...p, shares: s} : p));
    setResults(null);
  };

  const handleSliderChange = (symbol, newPercentage) => {
    if (portfolio.length <= 1) return;
    
    const targetFraction = newPercentage / 100;
    const currentTotalVal = currentPortfolioValue || 1;
    const targetValForSymbol = targetFraction * currentTotalVal;
    const remainingValForOthers = currentTotalVal - targetValForSymbol;
    
    const others = portfolio.filter(p => p.symbol !== symbol);
    const currentOthersVal = others.reduce((acc, p) => acc + (p.price * p.shares), 0);
    
    const newPortfolio = portfolio.map(p => {
      if (p.symbol === symbol) {
        let newShares = Math.max(1, Math.round(targetValForSymbol / p.price));
        return { ...p, shares: newShares };
      } else {
        if (currentOthersVal === 0) return p;
        let theirCurrentVal = p.price * p.shares;
        let theirFractionOfOthers = theirCurrentVal / currentOthersVal;
        let theirNewVal = theirFractionOfOthers * remainingValForOthers;
        let newShares = Math.max(1, Math.round(theirNewVal / p.price));
        return { ...p, shares: newShares };
      }
    });
    
    setPortfolio(newPortfolio);
    setResults(null);
  };

  const runAnalysis = async () => {
    if (portfolio.length === 0) return;
    setIsAnalyzing(true);
    setResults(null);
    setLoadingStepIdx(0);

    const interval = setInterval(() => {
      setLoadingStepIdx(prev => {
        if (prev < LOADING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 500);

    try {
      const res = await fetch('/api/simulator-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio, periodValue, periodUnit, inflationRate, includeInflation, totalInvested: currentPortfolioValue })
      });
      const data = await res.json();
      clearInterval(interval);
      
      if (!data.error) {
        setResults(data);
      } else {
        alert("Engine Failure: " + data.error);
      }
    } catch (e) {
      clearInterval(interval);
      alert("Failed to connect to Quant Engine.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyOptimalWeights = () => {
    if (!results || !results.metrics.optimalWeights) return;
    const opt = results.metrics.optimalWeights;
    
    const newPortfolio = portfolio.map(p => {
      const optData = opt.find(x => x.symbol === p.symbol);
      if (optData) {
        let targetVal = optData.weight * currentPortfolioValue;
        let newShares = Math.max(1, Math.round(targetVal / p.price));
        return { ...p, shares: newShares };
      }
      return p;
    });
    setPortfolio(newPortfolio);
    setResults(null);
  };

  const m = results?.metrics;
  const ai = results?.ai;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e2e8f0' }} className="simulator-container">
      
      <div style={{ marginBottom: '40px', textAlign: 'center', position: 'relative' }} className="hide-on-print">
        <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '20px', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Next-Gen Quant Engine
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 15px 0' }}>
          Institutional Simulator
        </h1>
        <p style={{ color: '#64748b', margin: '0 auto', maxWidth: '600px', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Build your portfolio and let our 10,000-path Monte Carlo Engine and Dual-Layer AI analyze your true risk exposure and future trajectory.
        </p>

        {results && results.metrics.hasAdvancedModeling && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#a78bfa', borderRadius: '12px' }}>⚡ EWMA Volatility</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#7dd3fc', borderRadius: '12px' }}>📊 Fama-French Overlay</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', borderRadius: '12px' }}>💱 FX Drift Adjusted</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', borderRadius: '12px' }}>🚨 Regime-Switching Crash Models</span>
          </div>
        )}

        {results && (
          <button onClick={() => window.print()} style={{ position: 'absolute', right: 0, top: '20px', background: 'rgba(51,65,85,0.3)', border: '1px solid rgba(51,65,85,0.6)', padding: '10px 20px', borderRadius: '12px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export PDF Tearsheet
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '30px', alignItems: 'start' }} className="layout-grid">
        
        {/* LEFT COLUMN: SETUP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }} className="hide-on-print">
          
          <div style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#38bdf8', width: '8px', height: '8px', borderRadius: '50%' }}></span>
              Asset Allocation
            </h3>
            
            <div style={{ position: 'relative', zIndex: 100, marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                <input type="text" placeholder="Search stocks, indices, metals..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onFocus={() => searchResults.length > 0 && setShowSearch(true)} style={{ width: '100%', padding: '14px 14px 14px 45px', borderRadius: '12px', border: '1px solid rgba(51,65,85,0.8)', background: 'rgba(2,6,23,0.5)', color: '#fff', fontSize: '0.95rem', outline: 'none', transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: '12px', marginTop: '8px', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => addAsset(r.symbol, r.name, r.type)} style={{ padding: '12px 15px', borderBottom: '1px solid rgba(51,65,85,0.4)', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="search-result-row">
                      <div>
                        <strong style={{color: '#fff', display: 'block', fontSize: '0.9rem'}}>{r.symbol}</strong>
                        <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '3px 8px', background: 'rgba(51,65,85,0.5)', borderRadius: '4px', color: '#cbd5e1' }}>{r.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '25px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', width: '100%', marginBottom: '4px' }}>Quick Add Commodities & Indices:</span>
              {QUICK_ADD_ASSETS.map(asset => (
                <button key={asset.symbol} onClick={() => addAsset(asset.symbol, asset.name)} style={{ background: 'rgba(51,65,85,0.3)', border: '1px solid rgba(51,65,85,0.6)', padding: '6px 12px', borderRadius: '20px', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }} className="quick-add-btn">
                  + {asset.name}
                </button>
              ))}
            </div>

            {portfolio.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {portfolio.map(p => {
                  let icon = '🏢';
                  if (p.symbol.includes('=F')) icon = '🏆';
                  if (p.symbol.startsWith('^')) icon = '📈';
                  if (p.symbol.includes('-USD')) icon = '🪙';
                  
                  const pVal = p.price * p.shares;
                  const pPct = currentPortfolioValue > 0 ? (pVal / currentPortfolioValue) * 100 : 0;
                  
                  return (
                    <div key={p.symbol} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(2,6,23,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(51,65,85,0.5)', transition: 'border-color 0.2s ease' }} className="asset-card">
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: 'rgba(51,65,85,0.4)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{icon}</div>
                          <div>
                            <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 'bold' }}>{p.symbol}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Val: ₹{pVal.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px' }}>Shares</span>
                            <input type="number" min="1" value={p.shares} onChange={(e) => handleSharesChange(p.symbol, e.target.value)} style={{ width: '70px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', outline: 'none' }} />
                          </div>
                          <button onClick={() => {setPortfolio(portfolio.filter(x => x.symbol !== p.symbol)); setResults(null);}} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', transition: 'background 0.2s' }} className="delete-btn">×</button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <input type="range" min="0" max="100" step="0.1" value={pPct} onChange={(e) => handleSliderChange(p.symbol, Number(e.target.value))} style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.85rem', color: '#e2e8f0', width: '45px', textAlign: 'right' }}>{pPct.toFixed(1)}%</span>
                      </div>
                      
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(15,23,42,0.6)', borderRadius: '12px', border: '1px dashed rgba(51,65,85,0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Total Invested</span>
              <strong style={{ color: '#38bdf8', fontSize: '1.4rem' }}>₹{currentPortfolioValue.toLocaleString('en-IN')}</strong>
            </div>

            {results && results.metrics.optimalWeights && (
              <button onClick={applyOptimalWeights} style={{ width: '100%', marginTop: '15px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} className="optimize-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Apply AI Optimized Weights
              </button>
            )}
          </div>

          <div style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: '#8b5cf6', width: '8px', height: '8px', borderRadius: '50%' }}></span>
              Projection Horizon
            </h3>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>Duration</label>
                <input type="number" min="1" value={periodValue} onChange={e => {setPeriodValue(Number(e.target.value)); setResults(null);}} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(51,65,85,0.8)', background: 'rgba(2,6,23,0.5)', color: '#fff', fontSize: '1rem', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>Unit</label>
                <select value={periodUnit} onChange={e => {setPeriodUnit(e.target.value); setResults(null);}} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(51,65,85,0.8)', background: 'rgba(2,6,23,0.5)', color: '#fff', fontSize: '1rem', outline: 'none', appearance: 'none' }}>
                  <option value="Days">Days</option><option value="Weeks">Weeks</option><option value="Months">Months</option><option value="Years">Years</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(51,65,85,0.2)', borderRadius: '10px', border: '1px solid rgba(51,65,85,0.4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: '40px', height: '22px', background: includeInflation ? '#38bdf8' : 'rgba(51,65,85,0.8)', borderRadius: '11px', transition: 'background 0.3s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: includeInflation ? '20px' : '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left 0.3s' }}></div>
                </div>
                <input type="checkbox" checked={includeInflation} onChange={e => {setIncludeInflation(e.target.checked); setResults(null);}} style={{ display: 'none' }} />
                <span style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Adjust for Inflation</span>
              </label>
              {includeInflation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <input type="number" step="0.1" value={inflationRate} onChange={e => {setInflationRate(e.target.value); setResults(null);}} style={{ width: '60px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '6px', padding: '4px', textAlign: 'center', fontSize: '0.9rem', outline: 'none' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>% p.a.</span>
                </div>
              )}
            </div>

            <button onClick={runAnalysis} disabled={isAnalyzing || portfolio.length === 0} style={{ width: '100%', padding: '16px', marginTop: '30px', background: isAnalyzing ? 'rgba(51,65,85,0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: isAnalyzing ? 'not-allowed' : 'pointer', boxShadow: isAnalyzing ? 'none' : '0 10px 20px -5px rgba(139, 92, 246, 0.4)', transition: 'all 0.3s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} className="run-btn">
              {isAnalyzing ? (
                <>
                  <span style={{ width: '18px', height: '18px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                  Computing Engine...
                </>
              ) : 'Run Quant Engine'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="print-full-width" style={{ minWidth: 0 }}>
          {isAnalyzing && !results && (
            <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', padding: '50px 40px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '30px' }}>
                <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(56,189,248,0.1)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite' }}></div>
                <div style={{ position: 'absolute', inset: '10px', border: '4px solid transparent', borderBottomColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite reverse' }}></div>
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '15px' }}>Executing Analytics</h3>
              <div style={{ color: '#38bdf8', fontSize: '1rem', minHeight: '24px', fontWeight: '500', textAlign: 'center' }}>{LOADING_STEPS[loadingStepIdx]}</div>
              <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(2,6,23,0.8)', height: '6px', borderRadius: '3px', marginTop: '40px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                <div style={{ width: `${(loadingStepIdx / (LOADING_STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)', height: '100%', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
              </div>
            </div>
          )}

          {results && m && ai && (
            <div style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              <div style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }} className="print-border-visible">
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>
                
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Expected Median Value (p50)</div>
                  <div style={{ fontSize: '5rem', fontWeight: '900', color: '#fff', textShadow: '0 10px 30px rgba(56, 189, 248, 0.3)', lineHeight: '1' }}>
                    ₹{m.netOfTaxValue ? m.netOfTaxValue.toLocaleString('en-IN', {maximumFractionDigits:0}) : m.estimatedValueReal.toLocaleString('en-IN', {maximumFractionDigits:0})}
                  </div>
                  {m.estimatedTax > 0 && <div style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '10px' }}>Net of ₹{m.estimatedTax.toLocaleString('en-IN', {maximumFractionDigits:0})} LTCG Tax</div>}
                  {includeInflation && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>*Purchasing power adjusted for {inflationRate}% inflation</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                  <MetricCard title="Real CAGR" value={`${(m.realCAGR * 100).toFixed(2)}%`} highlight={m.realCAGR > 0} sub={m.hasDividends ? "Includes Dividends" : "CAPM Derived"} />
                  <MetricCard title="Sharpe Ratio" value={m.sharpeRatio.toFixed(2)} highlight={m.sharpeRatio > 1} sub="Risk-adjusted Return" />
                  <MetricCard title="Sortino Ratio" value={m.sortino.toFixed(2)} highlight={m.sortino > 1.5} sub="Downside Protection" />
                  <MetricCard title="Vol (σ_annual)" value={`${(m.portVolAnnual * 100).toFixed(1)}%`} highlight={false} sub="Portfolio Volatility" color="#f59e0b" />
                </div>
              </div>

              {/* SECTOR & GEO HEATMAP */}
              <div style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} className="print-border-visible">
                <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.1rem' }}>Diversification Heatmap</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>Geographic Exposure</div>
                    <HeatmapBar data={m.assets} groupKey="geo" colors={['#38bdf8', '#8b5cf6', '#ec4899']} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>Sector Exposure</div>
                    <HeatmapBar data={m.assets} groupKey="sector" colors={['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']} />
                  </div>
                </div>
              </div>

              {/* INTERACTIVE CORRELATION MATRIX */}
              {m.corMat && (
                <div style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} className="print-border-visible">
                  <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.1rem' }}>Asset Correlation Matrix (Tail Dependence)</h4>
                  <CorrelationGrid corMat={m.corMat} assets={m.assets} />
                </div>
              )}

              {/* INTERACTIVE TRAJECTORY PATH */}
              {m.trajectoryPath && m.trajectoryPath.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} className="print-border-visible print-page-break">
                  <h4 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '1.1rem' }}>Monte Carlo Trajectory (Wealth Over Time)</h4>
                  <div style={{ width: '100%', height: '250px', position: 'relative' }}>
                    <TrajectoryChart pathData={m.trajectoryPath} startValue={currentPortfolioValue} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{width:'10px', height:'3px', background:'#22c55e'}}></div> Bull (p90)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{width:'10px', height:'3px', background:'#38bdf8'}}></div> Median (p50)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{width:'10px', height:'3px', background:'#ef4444'}}></div> Bear (p5)</div>
                  </div>
                </div>
              )}

              {/* RISK PANEL */}
              <div style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(51,65,85,0.4)', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }} className="print-border-visible">
                <h4 style={{ margin: '0 0 25px 0', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem' }}>Risk Exposure & Tails</span>
                  <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: m.riskScore > 70 ? 'rgba(239,68,68,0.15)' : m.riskScore > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: m.riskScore > 70 ? '#ef4444' : m.riskScore > 40 ? '#f59e0b' : '#22c55e', border: `1px solid ${m.riskScore > 70 ? 'rgba(239,68,68,0.3)' : m.riskScore > 40 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
                    {m.riskLevel} ({m.riskScore}/100)
                  </span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                  <div style={{ background: 'rgba(2,6,23,0.6)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>VaR (95%)</div>
                    <div style={{ fontSize: '1.1rem', color: '#ef4444', fontWeight: 'bold' }}>-₹{m.VaR_95.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                  </div>
                  <div style={{ background: 'rgba(2,6,23,0.6)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>CVaR (95%)</div>
                    <div style={{ fontSize: '1.1rem', color: '#ef4444', fontWeight: 'bold' }}>-₹{m.CVaR_95.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                  </div>
                  <div style={{ background: 'rgba(2,6,23,0.6)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(51,65,85,0.5)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>Concentration (HHI)</div>
                    <div style={{ fontSize: '1.1rem', color: '#fff' }}>{m.HHI.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'rgba(2,6,23,0.6)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(51,65,85,0.5)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>Macro Vol (VIX)</div>
                    <div style={{ fontSize: '1.1rem', color: '#fff' }}>{m.macro.VIX.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* AI INTELLIGENCE */}
              <div style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(30,58,138,0.3) 100%)', backdropFilter: 'blur(20px)', padding: '35px', borderRadius: '24px', border: '1px solid rgba(59,130,246,0.3)', position: 'relative', overflow: 'hidden' }} className="print-border-visible">
                <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '3px', background: 'linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)' }}></div>
                <h4 style={{ margin: '0 0 20px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🧠</span> AI Chief Investment Officer
                </h4>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#cbd5e1', margin: '0 0 25px 0' }}>{ai.narrativeSummary}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                  <div style={{ background: 'rgba(2,6,23,0.5)', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #ef4444' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Top Risk Vector</strong>
                    <span style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{ai.topRisk}</span>
                  </div>
                  <div style={{ background: 'rgba(2,6,23,0.5)', padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Macro Impact</strong>
                    <span style={{ fontSize: '0.95rem', color: '#f8fafc' }}>{ai.macroImpact}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <span style={{ fontSize: '0.85rem', background: 'rgba(2,6,23,0.8)', padding: '8px 16px', borderRadius: '20px', color: '#fff', border: '1px solid rgba(51,65,85,0.6)' }}>Verdict: <strong>{ai.allocationVerdict}</strong></span>
                </div>

                <h5 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '1rem' }}>Actionable Reallocation Strategy</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {ai.suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '15px', background: 'rgba(2,6,23,0.6)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(51,65,85,0.4)' }}>
                      <div style={{ flexShrink: 0, width: '4px', background: s.urgency === 'High' ? '#ef4444' : s.urgency === 'Medium' ? '#f59e0b' : '#22c55e', borderRadius: '2px' }}></div>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>{s.action}</div>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>{s.reason}</div>
                        <div style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          {s.probableResult}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .search-result-row:hover { background: rgba(56, 189, 248, 0.1) !important; }
        .quick-add-btn:hover { background: rgba(56, 189, 248, 0.1) !important; border-color: rgba(56, 189, 248, 0.4) !important; color: #38bdf8 !important; }
        .asset-card:hover { border-color: rgba(56, 189, 248, 0.4) !important; }
        .delete-btn:hover { background: rgba(239, 68, 68, 0.2) !important; }
        .run-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(139, 92, 246, 0.5) !important; }
        .run-btn:active:not(:disabled) { transform: translateY(1px); }
        .optimize-btn:hover { background: rgba(16, 185, 129, 0.2) !important; transform: translateY(-1px); }
        
        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #38bdf8;
          cursor: pointer;
          margin-top: -6px;
          box-shadow: 0 0 10px rgba(56,189,248,0.5);
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(51,65,85,0.8);
          border-radius: 2px;
        }
        input[type=range]:focus {
          outline: none;
        }

        @media print {
          body { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hide-on-print { display: none !important; }
          .layout-grid { display: block !important; }
          .print-full-width { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .simulator-container { padding: 0 !important; }
          .print-border-visible { border: 1px solid #334155 !important; margin-bottom: 20px !important; page-break-inside: avoid; }
          .print-page-break { page-break-before: always; }
        }
      `}} />
    </div>
  );
}

function MetricCard({ title, value, highlight, sub, color }) {
  const mainColor = color || (highlight ? '#22c55e' : '#fff');
  return (
    <div style={{ background: 'rgba(2,6,23,0.5)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: mainColor }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>{sub}</div>}
    </div>
  );
}

function HeatmapBar({ data, groupKey, colors }) {
  if (!data) return null;
  const groups = {};
  data.forEach(a => {
    const k = a[groupKey] || 'Other';
    if(!groups[k]) groups[k] = 0;
    groups[k] += a.weight;
  });
  
  const entries = Object.entries(groups).sort((a,b) => b[1] - a[1]);
  
  return (
    <div>
      <div style={{ display: 'flex', width: '100%', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '15px' }}>
        {entries.map(([k, w], i) => (
          <div key={k} style={{ width: \`\${w * 100}%\`, background: colors[i % colors.length], transition: 'width 0.5s ease' }} title={\`\${k}: \${(w*100).toFixed(1)}%\`}></div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {entries.map(([k, w], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[i % colors.length] }}></span>
            {k} ({(w*100).toFixed(1)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationGrid({ corMat, assets }) {
  if (!corMat || !assets || assets.length === 0) return null;
  const N = assets.length;
  
  const getColor = (r) => {
    if (r >= 0) return \`rgba(34, 197, 94, \${Math.max(0.1, r * 0.8)})\`;
    return \`rgba(239, 68, 68, \${Math.max(0.1, Math.abs(r) * 0.8)})\`;
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: \`100px repeat(\${N}, 1fr)\`, gap: '4px', minWidth: \`\${N * 60 + 100}px\` }}>
        {/* Header Row */}
        <div></div>
        {assets.map((a, i) => (
          <div key={\`h-\${i}\`} style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', transform: 'rotate(-45deg)', transformOrigin: 'bottom center', height: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {a.symbol.split('.')[0]}
          </div>
        ))}
        
        {/* Matrix Rows */}
        {corMat.map((row, i) => (
          <div key={\`r-\${i}\`} style={{ display: 'contents' }}>
            <div style={{ fontSize: '0.75rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px' }}>
              {assets[i].symbol.split('.')[0]}
            </div>
            {row.map((val, j) => {
              const isSelf = i === j;
              return (
                <div key={\`c-\${i}-\${j}\`} style={{ background: isSelf ? 'rgba(51,65,85,0.5)' : getColor(val), color: isSelf ? '#64748b' : '#fff', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '45px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }} title={\`\${assets[i].symbol} vs \${assets[j].symbol}: \${val.toFixed(2)}\`}>
                  {isSelf ? '-' : val.toFixed(2)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrajectoryChart({ pathData, startValue }) {
  if (!pathData || pathData.length === 0) return null;
  
  const width = 1000;
  const height = 250;
  
  const years = pathData.map(d => d.year);
  const maxYear = Math.max(...years);
  
  let minVal = startValue;
  let maxVal = startValue;
  pathData.forEach(d => {
    if(d.p5 < minVal) minVal = d.p5;
    if(d.p90 > maxVal) maxVal = d.p90;
  });
  
  const range = maxVal - minVal || 1;
  minVal = Math.max(0, minVal - range * 0.1);
  maxVal = maxVal + range * 0.1;
  
  const getX = (year) => (year / maxYear) * width;
  const getY = (val) => height - ((val - minVal) / (maxVal - minVal)) * height;

  let d5 = \`M \${getX(pathData[0].year)} \${getY(pathData[0].p5)}\`;
  let d50 = \`M \${getX(pathData[0].year)} \${getY(pathData[0].p50)}\`;
  let d90 = \`M \${getX(pathData[0].year)} \${getY(pathData[0].p90)}\`;

  pathData.forEach((d, i) => {
    if (i === 0) return;
    d5 += \` L \${getX(d.year)} \${getY(d.p5)}\`;
    d50 += \` L \${getX(d.year)} \${getY(d.p50)}\`;
    d90 += \` L \${getX(d.year)} \${getY(d.p90)}\`;
  });

  return (
    <svg viewBox={\`0 0 \${width} \${height}\`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <line x1="0" y1={getY(startValue)} x2={width} y2={getY(startValue)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />
      <path d={\`\${d90} \${pathData.slice().reverse().map(d => \`L \${getX(d.year)} \${getY(d.p5)}\`).join(' ')} Z\`} fill="rgba(56, 189, 248, 0.05)" />
      
      <path d={d5} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" vectorEffect="non-scaling-stroke" />
      <path d={d50} fill="none" stroke="#38bdf8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      <path d={d90} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="6,4" vectorEffect="non-scaling-stroke" />
      
      <circle cx={width} cy={getY(pathData[pathData.length-1].p90)} r="4" fill="#22c55e" />
      <circle cx={width} cy={getY(pathData[pathData.length-1].p50)} r="5" fill="#38bdf8" />
      <circle cx={width} cy={getY(pathData[pathData.length-1].p5)} r="4" fill="#ef4444" />
    </svg>
  );
}
