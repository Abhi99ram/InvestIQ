'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SMA, RSI, MACD, BollingerBands, generateInsights } from '../../lib/indicators';
import { formatPrice, formatPriceFromQuote, resolveCurrency } from '../../lib/market';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import NewsFeed from '../components/NewsFeed';

// ── Markdown-like renderer for chatbot messages ───────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2 headers
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} style={{ color: '#22d3ee', fontWeight: 700, fontSize: '1rem', margin: '14px 0 6px', borderBottom: '1px solid rgba(34,211,238,0.2)', paddingBottom: 4 }}>
          {renderInline(line.slice(3))}
        </h3>
      );
    }
    // H3 headers
    else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.9rem', margin: '12px 0 4px' }}>
          {renderInline(line.slice(4))}
        </h4>
      );
    }
    // Bullet points
    else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      const bulletContent = line.slice(2);
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
          <span style={{ color: '#22d3ee', flexShrink: 0, marginTop: 2 }}>•</span>
          <span style={{ lineHeight: 1.6 }}>{renderInline(bulletContent)}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. (.*)/);
      if (match) {
        elements.push(
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 4 }}>
            <span style={{ color: '#22d3ee', flexShrink: 0, fontWeight: 700, minWidth: 18 }}>{match[1]}.</span>
            <span style={{ lineHeight: 1.6 }}>{renderInline(match[2])}</span>
          </div>
        );
      }
    }
    // Horizontal rule
    else if (line === '---' || line === '___') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }} />);
    }
    // Empty line — spacing
    else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} style={{ margin: '0 0 6px', lineHeight: 1.65, color: '#e6e9f7' }}>
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }
  return elements;
}

function renderInline(text) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#f4f6ff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', padding: '1px 5px', borderRadius: 4, fontSize: '0.85em', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

const CHAT_SUGGESTIONS = [
  '📈 Why is Nifty rising today?',
  '🥇 Gold price outlook this week',
  '💱 USD/INR trend and RBI stance',
  '🏦 Analyze HDFC Bank fundamentals',
  '⚡ What is repo rate and its effect?',
  '📊 Sensex vs Nifty difference',
  '🛢️ Crude oil impact on Indian stocks',
  '⚪ Silver MCX price analysis',
];

// ── AnalysisCard: compact card with key metrics + 1-2 line insight ────────────
function AnalysisCard({ icon, title, isBullish, badgeLabel, trigger, metrics }) {
  const borderColor = isBullish ? '#b6f24a' : badgeLabel?.includes('Cautious') || badgeLabel?.includes('Oversold') ? '#f59e0b' : '#fb7185';
  const badge = badgeLabel || (isBullish ? '▲ Bullish' : '▼ Bearish');
  const badgeColor = isBullish ? '#b6f24a' : badge.includes('Cautious') || badge.includes('Oversold') ? '#f59e0b' : '#fb7185';
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: `6px solid ${borderColor}`, borderRadius: 16, padding: '24px 30px' }}>
      {/* Title + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#f4f6ff' }}>{title}</span>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44` }}>
          {badge}
        </span>
      </div>
      {/* Key metrics row */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        {metrics.map(m => (
          <div key={m.label}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: m.color, fontFamily: 'monospace' }}>{m.value}</div>
          </div>
        ))}
      </div>
      {/* 1-2 line insight */}
      <div style={{ fontSize: '1rem', color: '#8a93b2', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {trigger}
      </div>
    </div>
  );
}

export default function Analysis({ selectedSymbol, onSelectStock }) {
  const [symbol, setSymbol] = useState(selectedSymbol || '');
  const [inputSym, setInputSym] = useState('');
  const [history, setHistory] = useState([]);
  const [insights, setInsights] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [triLayer, setTriLayer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [chatHistory, setChatHistory] = useState([{
    role: 'agent',
    text: '## 👋 Hello! I\'m **Sentinel AI**\n\nI\'m your expert financial intelligence agent with access to **live market data**. I can help you with:\n\n• **Stock analysis** — Ask me about any NSE/BSE/US stock\n• **Gold & Silver** — MCX prices, trends, global outlook\n• **USD/INR** — Exchange rate dynamics and RBI interventions\n• **Market outlook** — Nifty, Sensex, Bank Nifty signals\n• **Macro economics** — RBI repo rate, inflation, fiscal policy\n• **Sector rotation** — Which sectors to watch and why\n\n💡 **Try asking:** *"Why is gold rising?"* or *"Analyze RELIANCE.NS"* or *"What is the USD/INR trend?"*'
  }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const handleSearch = useCallback(async (q) => {
    setInputSym(q);
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowSearch(true);
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => { if (selectedSymbol) { setSymbol(selectedSymbol); analyze(selectedSymbol); } }, [selectedSymbol]);

  async function analyze(sym) {
    setLoading(true);
    try {
      const bust = Date.now();
      const [histRes, quoteRes, analyzeRes] = await Promise.all([
        fetch(`/api/historical?symbol=${encodeURIComponent(sym)}&period=1y&_t=${bust}`),
        fetch(`/api/quote?symbols=${encodeURIComponent(sym)}&_t=${bust}`),
        fetch(`/api/analyze?symbol=${encodeURIComponent(sym)}&_t=${bust}`)
      ]);
      const histData = await histRes.json();
      const quoteData = await quoteRes.json();
      const analyzeData = await analyzeRes.json();
      
      const quotes = histData.quotes || [];
      const q = quoteData[sym] || null;
      const currency = resolveCurrency(sym, q?.currency || histData.currency);
      setHistory(quotes);
      setQuote(q ? { ...q, currency } : null);
      if (!analyzeData.error) setTriLayer(analyzeData);

      const closes = quotes.map(q => q.close).filter(Boolean);
      const livePrice = q?.price ?? closes[closes.length - 1];
      if (closes.length > 50) {
        const sma20 = SMA(closes, 20);
        const sma50 = SMA(closes, 50);
        const rsi = RSI(closes);
        const macd = MACD(closes);
        const bb = BollingerBands(closes);
        setIndicators({
          sma20: sma20[sma20.length - 1]?.toFixed(2),
          sma50: sma50[sma50.length - 1]?.toFixed(2),
          rsi: rsi.filter(v => v !== null).pop()?.toFixed(1),
          macd: macd.macdLine.filter(v => v !== null).pop()?.toFixed(2),
          signal: macd.signalLine.filter(v => v !== null).pop()?.toFixed(2),
          bbUpper: bb.upper.filter(v => v !== null).pop()?.toFixed(2),
          bbLower: bb.lower.filter(v => v !== null).pop()?.toFixed(2),
        });
        const ins = generateInsights(sym, closes, livePrice, currency);
        setInsights(ins);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Live quote refresh while viewing a symbol
  useEffect(() => {
    if (!symbol) return;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbol)}&_t=${Date.now()}`);
        const data = await res.json();
        const q = data[symbol];
        if (q?.price != null) {
          setQuote(prev => ({ ...(prev || {}), ...q, currency: resolveCurrency(symbol, q.currency) }));
        }
      } catch { /* ignore */ }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [symbol]);

  function handleAnalyze() {
    if (!inputSym.trim()) return;
    const s = inputSym.trim().toUpperCase();
    setSymbol(s);
    analyze(s);
  }

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  async function sendChat(msg) {
    if (!msg.trim() || chatLoading) return;
    const newHistory = [...chatHistory, { role: 'user', text: msg }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    // If user says "analyze TICKER"
    const analyzeMatch = msg.match(/analyze\s+([A-Z0-9.^=]+)/i);
    if (analyzeMatch) {
      const ticker = analyzeMatch[1].toUpperCase();
      setChatHistory(prev => [...prev, { role: 'agent', text: `## ⏳ Analyzing ${ticker}\n\nRunning the Tri-Layer Confluence Engine for **${ticker}**...\n\n• Fetching fundamental data\n• Computing technical indicators\n• Overlaying macro context` }]);
      setInputSym(ticker);
      setSymbol(ticker);
      analyze(ticker).then(() => {
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'agent', text: `## ✅ Analysis Ready — ${ticker}\n\nI've loaded the **${ticker}** Tri-Layer analysis above. You can see:\n\n• **Conviction Score** — Overall signal strength\n• **Fundamental Layer** — Intrinsic value vs market price\n• **Technical Layer** — RSI, MACD, and moving average signals\n• **Macro Overlay** — Sector and macro environment context\n\n💡 Ask me *"explain the conviction score for ${ticker}"* for a deep dive!` };
          return updated;
        });
        setChatLoading(false);
      });
      return;
    }

    // Otherwise call AI
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, contextData: triLayer })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'agent', text: data.reply || '❌ No response received. Please try again.' }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'agent', text: '❌ **Connection Error**\n\nCouldn\'t reach the AI engine. Please check your internet connection and try again.' }]);
    }
    setChatLoading(false);
  }

  async function handleChat(e) {
    e.preventDefault();
    await sendChat(chatInput.trim());
  }

  return (
    <div>
      <div className="section-header"><h1 className="section-title">📈 Trend Analysis & Insights</h1></div>

      {/* Search */}
      <div className="card analysis-search-card" style={{ marginBottom: 20 }}>
        <div className="analysis-search-toolbar">
          <div className="form-group analysis-search-field">
            <label className="form-label">Stock Symbol</label>
            <input className="form-input" value={inputSym} onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              placeholder="e.g. RELIANCE.NS, AAPL, TCS.NS..." onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
            {showSearch && searchResults.length > 0 && inputSym.length >= 2 && (
              <div className="search-results" style={{ top: '100%', zIndex: 9999, position: 'absolute', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: '0 12px 24px rgba(0,0,0,0.7)', borderRadius: '8px', overflow: 'hidden' }}>
                {searchResults.map((r, i) => (
                  <div key={i} className="search-result-item" onMouseDown={() => { 
                    setInputSym(r.symbol); 
                    setShowSearch(false); 
                    setSymbol(r.symbol);
                    analyze(r.symbol);
                  }}>
                    <div><strong style={{color: '#ffffff', fontSize: '1.05rem'}}>{r.symbol}</strong><br/><span style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>{r.name}</span></div>
                    <span className="tag tag-neutral">{r.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="analysis-search-actions">
            <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>
              {loading ? '⏳ Analyzing...' : '🔍 Analyze'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setInputSym('INFY.NS'); setSymbol('INFY.NS'); analyze('INFY.NS'); }}>Try INFY</button>
            <button className="btn btn-secondary" onClick={() => { setInputSym('AAPL'); setSymbol('AAPL'); analyze('AAPL'); }}>Try AAPL</button>
          </div>
        </div>
      </div>

      {!symbol && (
        <div className="empty-state"><div className="empty-icon">📊</div><p>Enter a stock symbol to get technical analysis and insights</p></div>
      )}

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner"></div></div>}

      {symbol && !loading && insights.length > 0 && (
        <div className="fade-in" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>Analysis for <span style={{ color: 'var(--accent-cyan)' }}>{symbol}</span></h2>
            {triLayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conviction Score</div>
                  <strong style={{ fontSize: '1.2rem', color: triLayer.isHighConviction ? 'var(--gain)' : 'var(--text-primary)' }}>{triLayer.confidenceScore}%</strong>
                </div>
                <div className={`tag ${triLayer.isHighConviction ? 'tag-gain' : triLayer.confidenceScore < 40 ? 'tag-loss' : 'tag-neutral'}`} style={{ fontSize: '1.1rem', padding: '8px 16px' }}>
                  {triLayer.signal}
                </div>
              </div>
            )}
          </div>

          {/* Tri-Layer Engine Output — Premium Cards */}
          {triLayer && (() => {
            const cur = triLayer.currency || 'INR';
            const f = triLayer.layers.fundamental;
            const t = triLayer.layers.technical;
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>

              {/* FUNDAMENTAL */}
              <AnalysisCard
                icon="1️⃣"
                title="Fundamental Analysis"
                isBullish={f.isBullish}
                badgeLabel={f.verdict === 'Overvalued' ? '▼ Overvalued' : f.isBullish ? '▲ Bullish' : '▼ Bearish'}
                trigger={f.trigger}
                metrics={[
                  { label: 'Intrinsic Value', value: f.intrinsicValue ? formatPrice(f.intrinsicValue, cur, { symbol }) : 'N/A', color: f.isUndervalued ? 'var(--gain)' : 'var(--text-primary)' },
                  { label: 'Premium / Discount', value: f.premiumDiscount != null ? `${f.premiumDiscount > 0 ? '+' : ''}${f.premiumDiscount.toFixed(1)}%` : 'N/A', color: f.premiumDiscount > 15 ? 'var(--loss)' : f.premiumDiscount < 0 ? 'var(--gain)' : 'var(--text-primary)' },
                  { label: 'Margin of Safety', value: f.intrinsicValue ? `${Math.max(0, f.marginOfSafety).toFixed(1)}%` : 'N/A', color: f.marginOfSafety > 10 ? 'var(--gain)' : f.marginOfSafety <= 0 ? 'var(--loss)' : 'var(--text-primary)' },
                  { label: 'Debt / Equity', value: f.debtToEquity != null ? `${f.debtToEquity.toFixed(2)}x` : 'N/A', color: f.debtToEquity != null && f.debtToEquity < 1.5 ? 'var(--gain)' : 'var(--loss)' },
                  { label: 'FCF Yield', value: f.fcfYield != null ? `${f.fcfYield.toFixed(2)}%` : 'N/A', color: f.fcfYield > 3 ? 'var(--gain)' : 'var(--text-primary)' },
                ]}
              />

              {/* TECHNICAL */}
              <AnalysisCard
                icon="2️⃣"
                title="Technical Analysis"
                isBullish={t.isBullish}
                badgeLabel={t.verdict || (t.isBullish ? '▲ Bullish' : '▼ Bearish')}
                trigger={t.trigger}
                metrics={[
                  { label: 'RSI (14)', value: triLayer.layers.technical.rsi14?.toFixed(1) || 'N/A', color: triLayer.layers.technical.rsi14 > 70 ? 'var(--loss)' : triLayer.layers.technical.rsi14 < 30 ? 'var(--gain)' : 'var(--gain)' },
                  { label: '200 EMA', value: triLayer.layers.technical.ema200 != null ? formatPrice(triLayer.layers.technical.ema200, cur, { symbol }) : 'N/A', color: triLayer.layers.technical.currentPrice > triLayer.layers.technical.ema200 ? 'var(--gain)' : 'var(--loss)' },
                  { label: '50 EMA', value: triLayer.layers.technical.ema50 != null ? formatPrice(triLayer.layers.technical.ema50, cur, { symbol }) : 'N/A', color: triLayer.layers.technical.ema50 > triLayer.layers.technical.ema200 ? 'var(--gain)' : 'var(--loss)' },
                  { label: 'MACD', value: triLayer.layers.technical.macd?.isBullish ? '▲ Bullish' : '▼ Bearish', color: triLayer.layers.technical.macd?.isBullish ? 'var(--gain)' : 'var(--loss)' },
                  { label: 'Volume', value: triLayer.layers.technical.volumeConfirmed ? '✅ Confirmed' : '⚠️ Weak', color: triLayer.layers.technical.volumeConfirmed ? 'var(--gain)' : 'var(--text-muted)' },
                  { label: 'Signals', value: `${triLayer.layers.technical.bullishCount || 0}/5 Bullish`, color: (triLayer.layers.technical.bullishCount || 0) >= 3 ? 'var(--gain)' : 'var(--loss)' },
                ]}
              />

              {/* MACRO */}
              <AnalysisCard
                icon="3️⃣"
                title="Macro Overlay"
                isBullish={triLayer.layers.macro.isBullish}
                trigger={triLayer.layers.macro.catalyst}
                metrics={[
                  { label: 'Market Verdict', value: triLayer.layers.macro.isBullish ? 'Favorable' : 'Unfavorable', color: triLayer.layers.macro.isBullish ? 'var(--gain)' : 'var(--loss)' },
                  ...(triLayer.targetEntry && triLayer.targetExit ? [
                    { label: 'Target Entry', value: triLayer.targetEntryFormatted || formatPrice(triLayer.targetEntry, cur, { symbol }), color: 'var(--accent-cyan)' },
                    { label: 'Target Exit', value: triLayer.targetExitFormatted || formatPrice(triLayer.targetExit, cur, { symbol }), color: 'var(--gain)' },
                  ] : []),
                ]}
              />

            </div>
            );
          })()}

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Price Action & Moving Averages</h3>
              <div className="chart-controls">
                <button className="tab active">1Y</button>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-muted)" 
                    tickFormatter={t => {
                      const d = new Date(t);
                      if (isNaN(d)) return String(t).split('T')[0];
                      const day = d.getDate();
                      const month = d.toLocaleString('en-US', { month: 'short' });
                      const year = d.getFullYear().toString().slice(-2);
                      return `${day} ${month} '${year}`;
                    }} 
                    minTickGap={40}
                  >
                    <Label value="Timeline" offset={-15} position="insideBottom" fill="var(--text-muted)" fontSize={12} />
                  </XAxis>
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="var(--text-muted)" 
                    tickFormatter={v => v.toFixed(0)} 
                    width={65}
                  >
                    <Label value="Price" angle={-90} position="insideLeft" offset={-10} fill="var(--text-muted)" fontSize={12} />
                  </YAxis>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                    labelFormatter={label => {
                      const d = new Date(label);
                      return isNaN(d) ? label : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                    }}
                    formatter={(value) => [formatPrice(Number(value), quote?.currency || triLayer?.currency || 'USD', { symbol }), 'Closing Price']}
                  />
                  <Line type="monotone" dataKey="close" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  <ReferenceLine y={history.length > 0 ? history[history.length-1].close : 0} stroke="var(--accent-cyan)" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <NewsFeed symbol={symbol} />
          </div>

          <div className="grid-2">
            {/* Technical Indicators */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">📐 Technical Indicators</h3></div>
              <table className="data-table">
                <tbody>
                  {[
                    ['Current Price', quote?.price != null ? formatPriceFromQuote(quote) : '-'],
                    ['SMA (20)', indicators.sma20],
                    ['SMA (50)', indicators.sma50],
                    ['RSI (14)', indicators.rsi],
                    ['MACD', indicators.macd],
                    ['MACD Signal', indicators.signal],
                    ['Bollinger Upper', indicators.bbUpper],
                    ['Bollinger Lower', indicators.bbLower],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ color: 'var(--text-muted)' }}>{k}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{v || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 16, padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>RSI Interpretation</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="tag tag-loss">{'< 30 Oversold'}</span>
                  <span className="tag tag-neutral">30-70 Neutral</span>
                  <span className="tag tag-gain">{'> 70 Overbought'}</span>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">💡 AI Insights</h3></div>
              {insights.map((ins, i) => (
                <div key={i} className={`insight-card ${ins.type}`}>
                  <div className="insight-type" style={{ color: ins.type === 'bullish' ? 'var(--gain)' : ins.type === 'bearish' ? 'var(--loss)' : 'var(--text-muted)' }}>
                    {ins.type === 'bullish' ? '🟢' : ins.type === 'bearish' ? '🔴' : '⚪'} {ins.category}
                  </div>
                  <div className="insight-text">{ins.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h3 className="card-title">📊 Price Summary (Last {history.length} sessions)</h3></div>
            <div className="grid-4">
              {[
                { label: 'Highest', value: Math.max(...history.map(h => h.high || 0)).toFixed(2), color: 'var(--gain)' },
                { label: 'Lowest', value: Math.min(...history.filter(h => h.low).map(h => h.low)).toFixed(2), color: 'var(--loss)' },
                { label: 'Avg Close', value: (history.reduce((s, h) => s + (h.close || 0), 0) / history.length).toFixed(2), color: 'var(--accent-cyan)' },
                { label: 'Avg Volume', value: Math.round(history.reduce((s, h) => s + (h.volume || 0), 0) / history.length).toLocaleString(), color: 'var(--accent-purple)' },
              ].map(item => (
                <div key={item.label} style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Sentinel AI Chatbot */}
          <div className="card" style={{ marginTop: 20, border: '1px solid rgba(34,211,238,0.35)', background: 'linear-gradient(180deg,rgba(13,19,33,0.9),rgba(10,15,26,0.98))' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(34,211,238,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#22d3ee,#7c5cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🤖</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Sentinel AI Agent</div>
                  <div style={{ fontSize: '0.72rem', color: '#b6f24a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b6f24a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                    Live • Groq LLaMA 70B • Real market data
                  </div>
                </div>
              </div>
              <button onClick={() => setChatHistory([chatHistory[0]])} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}>Clear</button>
            </div>

            {/* Messages */}
            <div style={{ height: 420, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {msg.role === 'agent'
                      ? <><span style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg,#22d3ee,#7c5cff)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>🤖</span> Sentinel AI</>  
                      : <>You <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#22d3ee', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>👤</span></>}
                  </div>
                  <div style={{
                    maxWidth: '88%',
                    padding: msg.role === 'user' ? '10px 14px' : '14px 18px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg,#22d3ee,#7c5cff)'
                      : 'rgba(255,255,255,0.04)',
                    border: msg.role === 'agent' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    color: '#e6e9f7',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                  }}>
                    {msg.role === 'agent' ? renderMarkdown(msg.text) : msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sentinel is thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            {chatHistory.length <= 2 && (
              <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CHAT_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendChat(s)}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer', border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.06)', color: '#8a93b2', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.15)'; e.currentTarget.style.color = '#22d3ee'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.06)'; e.currentTarget.style.color = '#8a93b2'; }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <form onSubmit={handleChat} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, marginBottom: 0, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(34,211,238,0.2)' }}
                  placeholder="Ask anything: Gold outlook, USD/INR, analyze RELIANCE.NS, RBI policy..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat(e)}
                  disabled={chatLoading}
                />
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 12, padding: '10px 20px', minWidth: 80 }} disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? '⏳' : '➤ Send'}
                </button>
              </form>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                Powered by Groq LLaMA 70B • Live market data • For education only — not financial advice
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
