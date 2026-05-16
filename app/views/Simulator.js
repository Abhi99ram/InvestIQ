import { useState, useMemo, useEffect } from 'react';

export default function Simulator() {
  const [portfolio, setPortfolio] = useState([]); // { symbol, name, price, shares, type }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [years, setYears] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);
  const [includeInflation, setIncludeInflation] = useState(true);
  const [monthlyContribution, setMonthlyContribution] = useState(5000); // SIP

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch search results
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowSearch(true);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add stock to portfolio
  const addAsset = async (symbol, name, type = 'Equity') => {
    if (portfolio.length >= 10) {
      alert("You can add up to 10 assets to the simulator.");
      return;
    }
    if (portfolio.find(p => p.symbol === symbol)) {
      alert("Asset already added.");
      return;
    }

    // Fix names for specific symbols
    let displayName = name;
    let displayType = type;
    if (symbol === 'GC=F') { displayName = 'Gold (COMEX)'; displayType = 'Commodity'; }
    else if (symbol === 'SI=F') { displayName = 'Silver (COMEX)'; displayType = 'Commodity'; }
    else if (symbol === '^NSEI') { displayName = 'Nifty 50'; displayType = 'Index'; }

    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      const price = data.price || 0;
      
      setPortfolio([...portfolio, { symbol, name: displayName, price, shares: 1, type: displayType }]);
      setSearchQuery('');
      setShowSearch(false);
      setAiAnalysis(null); // Reset AI analysis on change
    } catch (e) {
      console.error(e);
      alert("Could not fetch price for this asset.");
    }
  };

  // Pre-defined safe assets
  const quickAdd = [
    { symbol: 'GC=F', name: 'Gold (COMEX)', type: 'Commodity' },
    { symbol: 'SI=F', name: 'Silver (COMEX)', type: 'Commodity' },
    { symbol: '^NSEI', name: 'Nifty 50', type: 'Index' },
  ];

  const updateShares = (symbol, shares) => {
    if (shares < 0) return;
    setPortfolio(portfolio.map(p => p.symbol === symbol ? { ...p, shares: Number(shares) } : p));
    setAiAnalysis(null);
  };

  const removeAsset = (symbol) => {
    setPortfolio(portfolio.filter(p => p.symbol !== symbol));
    setAiAnalysis(null);
  };

  // Static Calculations for Invested Amount
  const baseMetrics = useMemo(() => {
    const currentPortfolioValue = portfolio.reduce((acc, p) => acc + (p.price * p.shares), 0);
    const months = years * 12;
    const totalInvestedSIP = monthlyContribution * months;
    const totalInvested = currentPortfolioValue + totalInvestedSIP;
    return { currentPortfolioValue, totalInvested };
  }, [portfolio, years, monthlyContribution]);

  const runAiAnalysis = async () => {
    if (portfolio.length === 0) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/simulator-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio, years, monthlyContribution, inflationRate, includeInflation })
      });
      const data = await res.json();
      
      if (!data.error) {
        setAiAnalysis(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate final numbers if AI is ready
  const finalAnalysis = useMemo(() => {
    if (!aiAnalysis) return null;

    const currentPortfolioValue = baseMetrics.currentPortfolioValue;
    const weightedReturn = aiAnalysis.projectedCAGR || 12;
    
    const months = years * 12;
    const monthlyRate = weightedReturn / 100 / 12;
    
    const fvLumpsum = currentPortfolioValue * Math.pow(1 + (weightedReturn / 100), years);
    let fvSip = 0;
    if (monthlyRate > 0) {
      fvSip = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    }
    
    let totalFutureValue = fvLumpsum + fvSip;
    let adjustedValue = totalFutureValue;
    
    if (includeInflation) {
      adjustedValue = totalFutureValue / Math.pow(1 + (inflationRate / 100), years);
    }

    const wealthGained = adjustedValue - baseMetrics.totalInvested;
    const wealthAtRisk = totalFutureValue * ((aiAnalysis.maxDrawdownPct || 20) / 100);

    return {
      futureValue: totalFutureValue,
      adjustedValue,
      wealthGained,
      wealthAtRisk,
      ...aiAnalysis
    };
  }, [aiAnalysis, baseMetrics, years, monthlyContribution, includeInflation, inflationRate]);

  return (
    <div className="simulator-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <div className="section-header" style={{ marginBottom: '30px' }}>
        <h1 className="section-title" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, var(--accent-cyan), #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Real-Time AI Simulator
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Build your portfolio with up to 10 assets. Our AI engine runs realistic, real-time projections based on live market conditions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        
        {/* Left Column: Asset Selection & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'var(--accent-cyan)', color: '#000', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem' }}>Step 1</span>
              Add Assets ({portfolio.length}/10)
            </h3>
            
            {/* Quick Add */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {quickAdd.map(asset => (
                <button 
                  key={asset.symbol} 
                  className="tag" 
                  style={{ cursor: 'pointer', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                  onClick={() => addAsset(asset.symbol, asset.name, asset.type)}
                >
                  + {asset.name}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', zIndex: 1000 }}>
              <input 
                type="text" 
                placeholder="Search stocks by name or symbol..." 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
              {isSearching && <div style={{ position: 'absolute', right: '15px', top: '12px', color: 'var(--text-muted)' }}>⏳</div>}
              
              {showSearch && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '5px', zIndex: 1000, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                  {searchResults.map((r, i) => (
                    <div 
                      key={i} 
                      onClick={() => addAsset(r.symbol, r.name)}
                      style={{ padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{r.symbol}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.name}</span>
                      </div>
                      <span className="tag" style={{ fontSize: '0.7rem' }}>{r.exchange}</span>
                    </div>
                  ))}
                  <div style={{ padding: '8px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <button onClick={() => setShowSearch(false)} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Close Suggestions</button>
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio List */}
            {portfolio.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Current Allocation</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {portfolio.map(p => {
                    let unitLabel = 'Shares';
                    if (p.type === 'Commodity') unitLabel = 'Units (10g/oz)';
                    else if (p.type === 'Index') unitLabel = 'Lots';
                    const rowTotal = p.price * p.shares;

                    return (
                      <div key={p.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', color: 'var(--accent-cyan)' }}>{p.name} <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>({p.symbol})</span></strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{p.price.toLocaleString('en-IN', {minimumFractionDigits: 2})} • Total: <strong style={{color: '#fff'}}>₹{rowTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{unitLabel}</span>
                            <input 
                              type="number" 
                              value={p.shares} 
                              onChange={(e) => updateShares(p.symbol, e.target.value)}
                              style={{ width: '60px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', textAlign: 'center' }}
                              min="1"
                            />
                          </div>
                          <button 
                            onClick={() => removeAsset(p.symbol)}
                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '14px' }}
                          >×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
             <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'var(--accent-amber)', color: '#000', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem' }}>Step 2</span>
              Configure SIP & Conditions
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Monthly SIP Addition</label>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>₹{monthlyContribution.toLocaleString('en-IN')}</span>
              </div>
              <input 
                type="range" min="0" max="100000" step="1000" 
                value={monthlyContribution} onChange={(e) => { setMonthlyContribution(Number(e.target.value)); setAiAnalysis(null); }}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Simulation Period</label>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{years} Years</span>
              </div>
              <input 
                type="range" min="1" max="30" step="1" 
                value={years} onChange={(e) => { setYears(Number(e.target.value)); setAiAnalysis(null); }}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <input 
                type="checkbox" id="inflation-sim" checked={includeInflation} 
                onChange={(e) => { setIncludeInflation(e.target.checked); setAiAnalysis(null); }} 
                style={{ accentColor: 'var(--accent-amber)', width: '18px', height: '18px' }}
              />
              <label htmlFor="inflation-sim" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Adjust results for Inflation</label>
            </div>

            {includeInflation && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Inflation Rate</label>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>{inflationRate}%</span>
                </div>
                <input 
                  type="range" min="2" max="12" step="0.5" 
                  value={inflationRate} onChange={(e) => { setInflationRate(Number(e.target.value)); setAiAnalysis(null); }}
                  style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
                />
              </div>
            )}
            
            <button 
              onClick={runAiAnalysis}
              disabled={isAnalyzing || portfolio.length === 0}
              style={{ marginTop: '20px', width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(90deg, #38bdf8, #6366f1)', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: isAnalyzing || portfolio.length === 0 ? 'not-allowed' : 'pointer', opacity: isAnalyzing || portfolio.length === 0 ? 0.6 : 1 }}
            >
              {isAnalyzing ? '🧠 AI Analyzing Real-Time Trends...' : '🚀 Generate AI Analysis'}
            </button>
          </div>
        </div>

        {/* Right Column: AI Insights & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '30px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {!finalAnalysis ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                {isAnalyzing ? (
                  <div style={{ animation: 'pulse 1.5s infinite' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧠</div>
                    <p>Fetching real-time market data...</p>
                    <p>AI is assessing portfolio risk and projections...</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                    <p>Add assets and configure your SIP, then click "Generate AI Analysis" to see your real-time optimized projections.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <p style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Estimated Value ({years} Yrs)</p>
                  <h2 style={{ fontSize: '3.5rem', margin: 0, fontWeight: '800', textShadow: '0 0 20px rgba(56,189,248,0.3)', color: '#fff' }}>
                    ₹{(includeInflation ? finalAnalysis.adjustedValue : finalAnalysis.futureValue).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                  </h2>
                  {includeInflation && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '10px' }}>*Purchasing power adjusted</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>💰</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Wealth Gained</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#22c55e' }}>
                      +₹{finalAnalysis.wealthGained.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>📉</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Max Value at Risk</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>
                      -₹{finalAnalysis.wealthAtRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Risk Level</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: finalAnalysis.riskLevel.includes('Low') ? '#22c55e' : finalAnalysis.riskLevel.includes('Moderate') ? 'var(--accent-amber)' : '#ef4444' }}>
                      {finalAnalysis.riskLevel} ({finalAnalysis.riskScore}%)
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.2rem' }}>📈</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Projected CAGR</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                      {finalAnalysis.projectedCAGR.toFixed(1)}% p.a.
                    </div>
                  </div>
                </div>
                
                {/* AI Rationale */}
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--accent-cyan)' }}>AI Insights:</strong> {finalAnalysis.rationale}
                  </p>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Total Capital Invested</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>₹{baseMetrics.totalInvested.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px 16px', borderRadius: '20px', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    AI Optimized Projection
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
