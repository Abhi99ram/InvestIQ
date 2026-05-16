import { useState, useMemo, useEffect } from 'react';

const LOADING_STEPS = [
  "Initializing institutional quant engine...",
  "Fetching live quotes and macro indicators...",
  "Computing 5-year historical return series...",
  "Building N×N covariance matrix...",
  "Applying Cholesky decomp and Student's t-dist draws...",
  "Running 10,000 Monte Carlo paths...",
  "Computing VaR, CVaR, Sharpe, and Sortino ratios...",
  "Running deterministic stress tests...",
  "Sending payload to AI Intelligence Engine...",
  "Finalizing Dual-Layer Reallocation Strategy..."
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
    }, 600);

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

  const m = results?.metrics;
  const ai = results?.ai;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 10px 0' }}>
          Institutional Quant Simulator
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Powered by a 10,000-path Monte Carlo Engine, Cholesky Decomposition, CAPM Drift, and Dual-Layer AI Intelligence.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: SETUP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#fff' }}>1. Build Portfolio</h3>
            <div style={{ position: 'relative', zIndex: 100 }}>
              <input type="text" placeholder="Search stocks by name or symbol..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onFocus={() => searchResults.length > 0 && setShowSearch(true)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#020617', color: '#fff' }} />
              {showSearch && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', marginTop: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map((r, i) => (
                    <div key={i} onClick={() => addAsset(r.symbol, r.name)} style={{ padding: '10px', borderBottom: '1px solid #1e293b', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <strong style={{color: '#fff'}}>{r.symbol}</strong> <span style={{color: '#94a3b8'}}>{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {portfolio.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {portfolio.map(p => (
                  <div key={p.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020617', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 'bold' }}>{p.symbol}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>₹{(p.price * p.shares).toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="number" min="1" value={p.shares} onChange={(e) => {
                        setPortfolio(portfolio.map(x => x.symbol === p.symbol ? {...x, shares: Number(e.target.value)} : x));
                        setResults(null);
                      }} style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', textAlign: 'center' }} />
                      <button onClick={() => {setPortfolio(portfolio.filter(x => x.symbol !== p.symbol)); setResults(null);}} style={{ background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #1e293b', fontSize: '0.9rem' }}>
              Total Invested: <strong style={{ color: '#fff' }}>₹{currentPortfolioValue.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#fff' }}>2. Simulation Params</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="number" min="1" value={periodValue} onChange={e => {setPeriodValue(Number(e.target.value)); setResults(null);}} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#020617', color: '#fff' }} />
              <select value={periodUnit} onChange={e => {setPeriodUnit(e.target.value); setResults(null);}} style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#020617', color: '#fff' }}>
                <option value="Days">Days</option><option value="Weeks">Weeks</option><option value="Months">Months</option><option value="Years">Years</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={includeInflation} onChange={e => {setIncludeInflation(e.target.checked); setResults(null);}} /> Inflation Adj ({inflationRate}%)
            </div>
            <button onClick={runAnalysis} disabled={isAnalyzing || portfolio.length === 0} style={{ width: '100%', padding: '12px', marginTop: '20px', background: isAnalyzing ? '#334155' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}>
              {isAnalyzing ? 'Processing...' : 'Run Quant Engine'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div>
          {isAnalyzing && !results && (
            <div style={{ background: '#0f172a', padding: '40px', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
              <div style={{ width: '60px', height: '60px', border: '4px solid #334155', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>Institutional Engine Processing...</h3>
              <div style={{ color: '#38bdf8', fontSize: '0.95rem', minHeight: '20px' }}>{LOADING_STEPS[loadingStepIdx]}</div>
              <div style={{ width: '100%', maxWidth: '400px', background: '#1e293b', height: '8px', borderRadius: '4px', marginTop: '30px', overflow: 'hidden' }}>
                <div style={{ width: `${(loadingStepIdx / (LOADING_STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #8b5cf6)', height: '100%', transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
          )}

          {results && m && ai && (
            <div style={{ animation: 'fadeIn 0.5s ease', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: '#0f172a', padding: '30px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '5px' }}>Expected Value (p50 Median)</div>
                  <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#fff', textShadow: '0 0 30px rgba(56, 189, 248, 0.2)' }}>
                    ₹{m.estimatedValueReal.toLocaleString('en-IN', {maximumFractionDigits:0})}
                  </div>
                  {includeInflation && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>*Purchasing power adjusted for {inflationRate}% inflation</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  <MetricCard title="Real CAGR" value={`${(m.realCAGR * 100).toFixed(2)}%`} highlight={m.realCAGR > 0} sub="CAPM Derived" />
                  <MetricCard title="Sharpe Ratio" value={m.sharpeRatio.toFixed(2)} highlight={m.sharpeRatio > 1} sub="Risk-adjusted Return" />
                  <MetricCard title="Sortino Ratio" value={m.sortino.toFixed(2)} highlight={m.sortino > 1.5} sub="Downside Protection" />
                  <MetricCard title="Vol (σ_annual)" value={`${(m.portVolAnnual * 100).toFixed(1)}%`} highlight={false} sub="Portfolio Volatility" />
                </div>
              </div>

              {/* RISK & DISTRIBUTION GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* RISK PANEL */}
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Risk Matrix & Tail Exposures</span>
                    <span style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '4px', background: m.riskScore > 70 ? '#ef444430' : m.riskScore > 40 ? '#eab30830' : '#22c55e30', color: m.riskScore > 70 ? '#ef4444' : m.riskScore > 40 ? '#eab308' : '#22c55e' }}>
                      {m.riskLevel} Risk ({m.riskScore}/100)
                    </span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ background: '#020617', padding: '15px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>VaR (95%) <span title="Value at Risk: The maximum expected loss with 95% confidence." style={{cursor: 'help', color: '#38bdf8'}}>?</span></div>
                      <div style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold' }}>-₹{m.VaR_95.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                    </div>
                    <div style={{ background: '#020617', padding: '15px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>CVaR (95%) <span title="Conditional VaR / Expected Shortfall: The average loss of the worst 5% of paths. The true tail risk." style={{cursor: 'help', color: '#38bdf8'}}>?</span></div>
                      <div style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 'bold' }}>-₹{m.CVaR_95.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
                    </div>
                    <div style={{ background: '#020617', padding: '15px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>HHI (Concentration)</div>
                      <div style={{ fontSize: '1.1rem', color: '#fff' }}>{m.HHI.toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#020617', padding: '15px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Macro Volatility (VIX)</div>
                      <div style={{ fontSize: '1.1rem', color: '#fff' }}>{m.macro.VIX.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* DISTRIBUTION CURVE */}
                <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                  <h4 style={{ margin: '0 0 20px 0', color: '#fff' }}>Monte Carlo 10k Distribution</h4>
                  <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                    <DistributionChart points={m.distributionPoints} p5={m.p5} p50={m.p50} p90={m.p90} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75rem' }}>
                    <div style={{ color: '#ef4444' }}>Bear (p5)<br/>₹{m.p5.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                    <div style={{ color: '#38bdf8', textAlign: 'center' }}>Median (p50)<br/>₹{m.p50.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                    <div style={{ color: '#22c55e', textAlign: 'right' }}>Bull (p90)<br/>₹{m.p90.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                  </div>
                </div>
              </div>

              {/* AI INTELLIGENCE */}
              <div style={{ background: 'linear-gradient(145deg, #0f172a, #172554)', padding: '25px', borderRadius: '16px', border: '1px solid #1e40af' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}><span>🧠</span> CIO Intelligence Summary</h4>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#e2e8f0', margin: '0 0 15px 0' }}>{ai.narrativeSummary}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ background: '#02061750', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase' }}>Top Risk Vector</strong>
                    <span style={{ fontSize: '0.85rem' }}>{ai.topRisk}</span>
                  </div>
                  <div style={{ background: '#02061750', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #eab308' }}>
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: '#eab308', textTransform: 'uppercase' }}>Macro Impact</strong>
                    <span style={{ fontSize: '0.85rem' }}>{ai.macroImpact}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', background: '#1e293b', padding: '6px 12px', borderRadius: '6px', color: '#fff', border: '1px solid #334155' }}>Verdict: {ai.allocationVerdict}</span>
                </div>

                <h5 style={{ color: '#fff', margin: '20px 0 10px 0' }}>Actionable Reallocation Strategy</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ai.suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '15px', background: '#020617', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                      <div style={{ flexShrink: 0, width: '4px', background: s.urgency === 'High' ? '#ef4444' : s.urgency === 'Medium' ? '#eab308' : '#22c55e', borderRadius: '2px' }}></div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginBottom: '5px' }}>{s.action}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>{s.reason}</div>
                        <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '500' }}>→ {s.probableResult}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STRESS TESTS */}
              <div style={{ background: '#0f172a', padding: '25px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#fff' }}>Deterministic Stress Tests</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {m.stressTests.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#020617', padding: '15px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff', width: '250px' }}>{st.name}</div>
                      <div style={{ color: '#ef4444', fontWeight: 'bold', width: '100px' }}>{(st.dropPct * 100).toFixed(1)}%</div>
                      <div style={{ color: '#94a3b8' }}>-₹{st.dropVal.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
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
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

function MetricCard({ title, value, highlight, sub }) {
  return (
    <div style={{ background: '#020617', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: highlight ? '#22c55e' : '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '5px' }}>{sub}</div>}
    </div>
  );
}

// Very simple SVG Distribution Curve renderer
function DistributionChart({ points, p5, p50, p90 }) {
  if (!points || points.length === 0) return null;
  
  // Create a simple histogram density to draw a curve
  const bins = 40;
  const min = points[0];
  const max = points[points.length - 1];
  const range = max - min;
  const binWidth = range / bins;
  
  let histogram = Array(bins).fill(0);
  points.forEach(p => {
    let b = Math.floor((p - min) / binWidth);
    if (b >= bins) b = bins - 1;
    histogram[b]++;
  });

  const maxCount = Math.max(...histogram);
  const height = 180;
  const width = 1000; // viewBox width

  let pathD = `M 0 ${height}`;
  histogram.forEach((count, i) => {
    const x = (i / bins) * width;
    const y = height - ((count / maxCount) * height * 0.9);
    pathD += ` L ${x} ${y}`;
  });
  pathD += ` L ${width} ${height} Z`;

  const getX = (val) => ((val - min) / range) * width;
  const x5 = getX(p5);
  const x50 = getX(p50);
  const x90 = getX(p90);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', preserveAspectRatio: 'none' }}>
      <defs>
        <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathD} fill="url(#distGrad)" stroke="#38bdf8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      
      {/* P5 Line */}
      <line x1={x5} y1={0} x2={x5} y2={height} stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
      
      {/* P50 Line */}
      <line x1={x50} y1={0} x2={x50} y2={height} stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
      
      {/* P90 Line */}
      <line x1={x90} y1={0} x2={x90} y2={height} stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
