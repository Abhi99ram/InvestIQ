'use client';
import { useState, useEffect } from 'react';
import { SECTORS, getAllSectorNames } from '../../lib/sectors';
import { formatPrice, resolveCurrency } from '../../lib/market';
import NewsFeed from '../components/NewsFeed';

export default function Sectors({ selectedSector, onSelectStock }) {
  const [activeSector, setActiveSector] = useState(selectedSector || null);
  const [sectorData, setSectorData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (selectedSector) setActiveSector(selectedSector); }, [selectedSector]);
  useEffect(() => { if (activeSector) fetchSectorData(activeSector); }, [activeSector]);

  async function fetchSectorData(sector) {
    setLoading(true);
    const s = SECTORS[sector];
    if (!s) return;
    const symbols = [...s.nse.slice(0, 5), ...s.us.slice(0, 5)].join(',');
    try {
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}&_t=${Date.now()}`);
      const data = await res.json();
      setSectorData(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const sectors = getAllSectorNames();

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">🏭 Sector Analysis</h1>
      </div>

      {/* Sector Chips */}
      <div className="chip-group" style={{ marginBottom: 24 }}>
        {sectors.map(s => (
          <button key={s} className={`chip ${activeSector === s ? 'selected' : ''}`}
            onClick={() => setActiveSector(s)}>
            {SECTORS[s].icon} {s}
          </button>
        ))}
      </div>

      {!activeSector && (
        <div className="empty-state">
          <div className="empty-icon">🏭</div>
          <p>Select a sector above to view detailed analysis</p>
        </div>
      )}

      {activeSector && (
        <div className="fade-in">
          <h2 style={{ marginBottom: 16, color: SECTORS[activeSector]?.color }}>
            {SECTORS[activeSector]?.icon} {activeSector}
          </h2>

          <div className="grid-2">
            {/* Stocks Table */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">Top Companies</h3></div>
              {loading ? (
                <div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner"></div></div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Change</th></tr></thead>
                  <tbody>
                    {Object.entries(sectorData)
                      .filter(([sym]) => sym !== 'USDINR=X')
                      .map(([sym, d]) => {
                      if (d.error) return null;
                      const isGain = (d.changePercent || 0) >= 0;
                      return (
                        <tr key={sym} onClick={() => onSelectStock(sym)} style={{ cursor: 'pointer' }}>
                          <td><strong>{sym}</strong></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{d.name}</td>
                          <td>{d.price != null ? formatPrice(d.price, resolveCurrency(sym, d.currency), { symbol: sym }) : '-'}</td>
                          <td className={isGain ? 'gain' : 'loss'}>
                            {isGain ? '▲' : '▼'} {d.changePercent?.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sector News — context-aware, real-time */}
            <NewsFeed sector={activeSector} compact={true} />
          </div>

          {/* All Stocks in Sector */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3 className="card-title">All {activeSector} Stocks</h3></div>
            <div className="grid-3">
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>🇮🇳 NSE</h4>
                {SECTORS[activeSector]?.nse.map(s => (
                  <button key={s} className="chip" onClick={() => onSelectStock(s)} style={{ margin: '4px 4px 4px 0' }}>{s.replace('.NS','')}</button>
                ))}
              </div>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>🇮🇳 BSE</h4>
                {(SECTORS[activeSector]?.bse || []).map(s => (
                  <button key={s} className="chip" onClick={() => onSelectStock(s)} style={{ margin: '4px 4px 4px 0' }}>{s.replace('.BO','')}</button>
                ))}
              </div>
              <div>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>🇺🇸 US</h4>
                {SECTORS[activeSector]?.us.map(s => (
                  <button key={s} className="chip" onClick={() => onSelectStock(s)} style={{ margin: '4px 4px 4px 0' }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
