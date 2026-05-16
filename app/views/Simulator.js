import { useState, useMemo } from 'react';

export default function Simulator() {
  const [sip, setSip] = useState(5000);
  const [years, setYears] = useState(10);
  const [returnRate, setReturnRate] = useState(12);
  const [inflationRate, setInflationRate] = useState(6);
  const [includeInflation, setIncludeInflation] = useState(true);

  const calculateReturns = () => {
    const months = years * 12;
    const monthlyRate = returnRate / 100 / 12;
    const totalInvested = sip * months;
    
    // Future Value of SIP formula
    let futureValue = sip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    
    let adjustedValue = futureValue;
    if (includeInflation) {
      adjustedValue = futureValue / Math.pow(1 + (inflationRate / 100), years);
    }
    
    return {
      totalInvested: Math.round(totalInvested),
      futureValue: Math.round(futureValue),
      adjustedValue: Math.round(adjustedValue),
      wealthGained: Math.round(futureValue - totalInvested)
    };
  };

  const results = useMemo(() => calculateReturns(), [sip, years, returnRate, inflationRate, includeInflation]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="section-header">
        <h1 className="section-title">🧮 Investment Simulator</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        Experiment with different investment strategies risk-free. Adjust your allocation and see potential outcomes in real-time.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Controls */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontWeight: '600' }}>Monthly Investment (SIP)</label>
              <span style={{ color: 'var(--accent-cyan)' }}>₹{sip.toLocaleString('en-IN')}</span>
            </div>
            <input 
              type="range" 
              min="500" 
              max="100000" 
              step="500" 
              value={sip} 
              onChange={(e) => setSip(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontWeight: '600' }}>Investment Period (Years)</label>
              <span style={{ color: 'var(--accent-cyan)' }}>{years} Yrs</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="40" 
              step="1" 
              value={years} 
              onChange={(e) => setYears(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontWeight: '600' }}>Expected Return Rate (p.a)</label>
              <span style={{ color: 'var(--accent-cyan)' }}>{returnRate}%</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="0.5" 
              value={returnRate} 
              onChange={(e) => setReturnRate(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <input 
              type="checkbox" 
              id="inflation" 
              checked={includeInflation} 
              onChange={(e) => setIncludeInflation(e.target.checked)} 
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
            />
            <label htmlFor="inflation" style={{ fontWeight: '600', cursor: 'pointer' }}>Adjust for Inflation</label>
          </div>

          {includeInflation && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Expected Inflation Rate (p.a)</label>
                <span style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>{inflationRate}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="15" 
                step="0.5" 
                value={inflationRate} 
                onChange={(e) => setInflationRate(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
              />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Total Value After {years} Years</h2>
          
          {includeInflation ? (
            <>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#22c55e', margin: '10px 0' }}>
                ₹{results.adjustedValue.toLocaleString('en-IN')}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', marginBottom: '20px' }}>
                *Adjusted for {inflationRate}% inflation (Purchasing Power)
              </p>
              <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                Nominal: ₹{results.futureValue.toLocaleString('en-IN')}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '3rem', fontWeight: '800', color: '#22c55e', margin: '20px 0' }}>
              ₹{results.futureValue.toLocaleString('en-IN')}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Total Invested</p>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>₹{results.totalInvested.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Wealth Gained</p>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>+₹{results.wealthGained.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
