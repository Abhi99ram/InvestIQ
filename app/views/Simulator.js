import { useState, useMemo, useEffect, useCallback } from 'react';

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

    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      const price = data.price || 0;
      
      setPortfolio([...portfolio, { symbol, name, price, shares: 1, type }]);
      setSearchQuery('');
      setShowSearch(false);
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
  };

  const removeAsset = (symbol) => {
    setPortfolio(portfolio.filter(p => p.symbol !== symbol));
  };

  // Calculations
  const analysis = useMemo(() => {
    const currentPortfolioValue = portfolio.reduce((acc, p) => acc + (p.price * p.shares), 0);
    
    // Assign expected returns and risks based on asset type
    let weightedReturn = 0;
    let riskScore = 0; // 1 to 10
    
    if (currentPortfolioValue > 0) {
      portfolio.forEach(p => {
        const weight = (p.price * p.shares) / currentPortfolioValue;
        let expectedReturn = 12; // default equity
        let assetRisk = 7;
        
        if (p.type === 'Commodity' || p.symbol.includes('GC=F') || p.name.toLowerCase().includes('gold')) {
          expectedReturn = 8;
          assetRisk = 4;
        } else if (p.symbol.includes('SI=F') || p.name.toLowerCase().includes('silver')) {
          expectedReturn = 9;
          assetRisk = 6;
        } else if (p.type === 'Index') {
          expectedReturn = 11;
          assetRisk = 5;
        }

        weightedReturn += weight * expectedReturn;
        riskScore += weight * assetRisk;
      });
    } else {
      weightedReturn = 12; // default
      riskScore = 5;
    }

    const months = years * 12;
    const monthlyRate = weightedReturn / 100 / 12;
    const totalInvestedSIP = monthlyContribution * months;
    
    // Future Value of Current Portfolio
    const fvLumpsum = currentPortfolioValue * Math.pow(1 + (weightedReturn / 100), years);
    
    // Future Value of SIP
    let fvSip = 0;
    if (monthlyRate > 0) {
      fvSip = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    }
    
    let totalFutureValue = fvLumpsum + fvSip;
    let adjustedValue = totalFutureValue;
    
    if (includeInflation) {
      adjustedValue = totalFutureValue / Math.pow(1 + (inflationRate / 100), years);
    }

    const totalInvested = currentPortfolioValue + totalInvestedSIP;
    const wealthGained = adjustedValue - totalInvested;

    // Wealth that may be lost (Drawdown estimation based on risk)
    const maxDrawdownPct = riskScore * 5; // e.g., risk 7 = 35% potential drop in bad years
    const wealthAtRisk = totalFutureValue * (maxDrawdownPct / 100);

    let riskLevel = 'Moderate';
    if (riskScore < 4) riskLevel = 'Low';
    else if (riskScore > 7) riskLevel = 'High';

    return {
      currentValue: currentPortfolioValue,
      totalInvested,
      futureValue: totalFutureValue,
      adjustedValue,
      wealthGained,
      riskLevel,
      riskScore: Math.round(riskScore * 10), // out of 100
      wealthAtRisk,
      weightedReturn
    };
  }, [portfolio, years, monthlyContribution, inflationRate, includeInflation]);

  return (
    <div className="simulator-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      <div className="section-header" style={{ marginBottom: '30px' }}>
        <h1 className="section-title" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, var(--accent-cyan), #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Real-Time AI Simulator
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Build your portfolio with up to 10 assets. Our engine runs realistic, real-time projections.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        
        {/* Left Column: Asset Selection & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ background: 'var(--bg-card)', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
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
            <div style={{ position: 'relative' }}>
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
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '5px', zIndex: 10, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
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
                </div>
              )}
            </div>

            {/* Portfolio List */}
            {portfolio.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Current Allocation</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {portfolio.map(p => (
                    <div key={p.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', color: 'var(--accent-cyan)' }}>{p.symbol}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{p.price.toLocaleString('en-IN', {minimumFractionDigits: 2})} / share</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="number" 
                          value={p.shares} 
                          onChange={(e) => updateShares(p.symbol, e.target.value)}
                          style={{ width: '70px', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', textAlign: 'center' }}
                          min="1"
                        />
                        <button 
                          onClick={() => removeAsset(p.symbol)}
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                      </div>
                    </div>
                  ))}
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
                value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))}
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
                value={years} onChange={(e) => setYears(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <input 
                type="checkbox" id="inflation-sim" checked={includeInflation} 
                onChange={(e) => setIncludeInflation(e.target.checked)} 
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
                  value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Insights & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '30px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <p style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>Estimated Value ({years} Yrs)</p>
              <h2 style={{ fontSize: '3.5rem', margin: 0, fontWeight: '800', textShadow: '0 0 20px rgba(56,189,248,0.3)', color: '#fff' }}>
                ₹{(includeInflation ? analysis.adjustedValue : analysis.futureValue).toLocaleString('en-IN', {maximumFractionDigits: 0})}
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
                  +₹{analysis.wealthGained.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📉</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Max Value at Risk</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>
                  -₹{analysis.wealthAtRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Risk Level</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: analysis.riskLevel === 'Low' ? '#22c55e' : analysis.riskLevel === 'Moderate' ? 'var(--accent-amber)' : '#ef4444' }}>
                  {analysis.riskLevel} ({analysis.riskScore}%)
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📈</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Projected CAGR</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                  {analysis.weightedReturn.toFixed(1)}% p.a.
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Total Capital Invested</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>₹{analysis.totalInvested.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px 16px', borderRadius: '20px', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                AI Optimized Projection
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
