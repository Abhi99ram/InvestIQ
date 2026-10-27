'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CircleCheck, ArrowRight, ArrowDown, User, LayoutDashboard, Factory, Building2, BellRing, Newspaper, Bot,
  Brain, Activity, Globe, Calculator, Mail, TrendingUp, TrendingDown, Search, Star, Gauge,
} from 'lucide-react';
import Auth from './Auth';

/* ---------- Market data shown in the ticker + device mock-up (live via /api/quote) ---------- */
const TICKER = [
  { sym: '^NSEI', name: 'NIFTY 50', inr: true },
  { sym: '^BSESN', name: 'SENSEX', inr: true },
  { sym: '^NSEBANK', name: 'BANK NIFTY', inr: true },
  { sym: '^GSPC', name: 'S&P 500' },
  { sym: '^IXIC', name: 'NASDAQ' },
  { sym: '^DJI', name: 'DOW JONES' },
  { sym: 'GC=F', name: 'GOLD' },
  { sym: 'SI=F', name: 'SILVER' },
  { sym: 'CL=F', name: 'CRUDE OIL' },
  { sym: 'USDINR=X', name: 'USD / INR', inr: true },
  { sym: 'RELIANCE.NS', name: 'RELIANCE', inr: true },
  { sym: 'TCS.NS', name: 'TCS', inr: true },
  { sym: 'HDFCBANK.NS', name: 'HDFC BANK', inr: true },
  { sym: 'AAPL', name: 'APPLE' },
  { sym: 'NVDA', name: 'NVIDIA' },
];

const SHOWCASE = [
  { sym: '^NSEI', name: 'NIFTY 50', tag: 'N', color: '#b6f24a' },
  { sym: '^BSESN', name: 'SENSEX', tag: 'S', color: '#22d3ee' },
  { sym: '^GSPC', name: 'S&P 500', tag: 'SP', color: '#a78bfa' },
  { sym: '^IXIC', name: 'NASDAQ', tag: 'NQ', color: '#f472b6' },
  { sym: 'GC=F', name: 'GOLD', tag: 'AU', color: '#fbbf24' },
  { sym: 'USDINR=X', name: 'USD / INR', tag: '₹', color: '#38bdf8' },
];

// Illustrative values for the feature previews (not live data)
const SECTORS = [
  ['IT', 1.24], ['Banking', 0.82], ['Auto', 2.11], ['Pharma', -0.46],
  ['FMCG', -0.91], ['Energy', 0.34], ['Metals', -1.58], ['Realty', 2.73],
];

const NEWS_STREAMS = ['🇮🇳 India Markets', '📈 NSE · BSE · Sensex', '🥇 Gold', '⚪ Silver', '💱 Dollar vs ₹', '🏛️ Monetary Policy'];

/* ---------- Helpers ---------- */
function rng(seed) { // mulberry32 — deterministic so server/client and re-renders match
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sparkPoints(seed, up, n = 32) {
  const r = rng(seed);
  const pts = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5) * 9 + (up ? 0.9 : -0.9);
    pts.push(v);
  }
  const min = Math.min(...pts), max = Math.max(...pts);
  return pts.map((p, i) => [(i / (n - 1)) * 100, 34 - ((p - min) / (max - min || 1)) * 30]);
}

function fmtPrice(price, inr) {
  if (price == null) return '—';
  return price.toLocaleString(inr ? 'en-IN' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: price < 1000 ? 2 : 0 });
}

function Change({ pct }) {
  if (pct == null) return <span className="lp-flat">—</span>;
  const up = pct >= 0;
  return <span className={up ? 'lp-up' : 'lp-down'}>{up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%</span>;
}

function Sparkline({ seed, up, color, id }) {
  const pts = sparkPoints(seed, up);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,36 L0,36 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MonteCarlo() {
  const { paths, band, median, worst } = useMemo(() => {
    const r = rng(42), sims = 26, steps = 40, W = 520, H = 230;
    const all = [];
    for (let s = 0; s < sims; s++) {
      let v = 100;
      const p = [v];
      for (let i = 1; i <= steps; i++) {
        const shock = (r() + r() + r() - 1.5) * 0.11; // ~normal
        v *= 1 + 0.009 + shock * 0.55;
        p.push(v);
      }
      all.push(p);
    }
    const flat = all.flat();
    const min = Math.min(...flat) * 0.95, max = Math.max(...flat) * 1.02;
    const x = i => (i / steps) * W;
    const y = v => H - ((v - min) / (max - min)) * H;
    const pct = (i, q) => { const col = all.map(p => p[i]).sort((a, b) => a - b); return col[Math.floor(q * (col.length - 1))]; };
    const toD = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const p5 = [], p50 = [], p95 = [];
    for (let i = 0; i <= steps; i++) { p5.push(pct(i, 0.05)); p50.push(pct(i, 0.5)); p95.push(pct(i, 0.95)); }
    const bandD = toD(p95) + ' ' + p5.map((v, i) => `L${x(steps - i).toFixed(1)},${y(p5[steps - i]).toFixed(1)}`).join(' ') + ' Z';
    return { paths: all.map(toD), band: bandD, median: toD(p50), worst: toD(p5) };
  }, []);

  return (
    <svg viewBox="0 0 520 230" aria-label="Illustrative Monte Carlo simulation of portfolio value">
      <path d={band} fill="rgba(34,211,238,0.08)" />
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength={1000} className="lp-mc-path"
          stroke={i % 3 === 0 ? 'rgba(34,211,238,0.35)' : 'rgba(124,92,255,0.32)'}
          style={{ transitionDelay: `${(i % 9) * 0.06}s` }} />
      ))}
      <path d={worst} pathLength={1000} className="lp-mc-path" stroke="#fb7185" style={{ strokeWidth: 1.8, transitionDelay: '0.6s' }} />
      <path d={median} pathLength={1000} className="lp-mc-path" stroke="#b6f24a" style={{ strokeWidth: 2.6, transitionDelay: '0.5s' }} />
    </svg>
  );
}

/* ---------- Page ---------- */
export default function Landing({ onLogin }) {
  const rootRef = useRef(null);
  const deviceRef = useRef(null);
  const [authMode, setAuthMode] = useState('signup');
  const [scrolled, setScrolled] = useState(false);
  const [quotes, setQuotes] = useState({});

  // Live quotes for the ticker + showcase
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/quote?symbols=${encodeURIComponent(TICKER.map(t => t.sym).join(','))}`);
        const data = await res.json();
        if (alive && data && !data.error) setQuotes(data);
      } catch { /* keep placeholders */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('[data-reveal]') || [];
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Nav background + device tilt-to-flat on scroll
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        const el = deviceRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.85)));
        el.style.setProperty('--lp-tilt', `${(22 * (1 - p)).toFixed(2)}deg`);
        el.style.setProperty('--lp-scale', (0.92 + 0.08 * p).toFixed(3));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const openAuth = useCallback((mode) => {
    setAuthMode(mode);
    document.getElementById('lp-auth')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.querySelector('#lp-auth input')?.focus({ preventScroll: true }), 650);
  }, []);

  const spotlight = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const q = (sym) => quotes[sym] || {};
  const tickerItems = [...TICKER, ...TICKER]; // duplicated for a seamless loop

  const features = [
    { icon: <LayoutDashboard size={22} />, title: 'Market Overview', wide: true,
      text: 'A live command centre for NSE, BSE and US exchanges — benchmark indices, commodities, currency and the day’s movers, refreshed in real time.',
      visual: (
        <div className="lp-metrics">
          {SHOWCASE.slice(0, 4).map(s => (
            <div className="lp-metric" key={s.sym}>
              <small>{s.name}</small>
              <b>{fmtPrice(q(s.sym).price, s.sym === '^NSEI' || s.sym === '^BSESN')}</b>
              <div style={{ fontSize: '0.74rem' }}><Change pct={q(s.sym).changePercent} /></div>
            </div>
          ))}
        </div>
      ) },
    { icon: <Factory size={22} />, title: 'Sector Analysis',
      text: 'See where money is rotating. Compare sectors at a glance and drill into the top companies driving each one.',
      visual: (
        <div className="lp-heat">
          {SECTORS.slice(0, 4).map(([n, v]) => (
            <div key={n} style={{ background: v >= 0 ? `rgba(182,242,74,${0.08 + v * 0.08})` : `rgba(251,113,133,${0.08 + -v * 0.1})`, color: v >= 0 ? '#d9f99d' : '#fecdd3' }}>
              {n}<small>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</small>
            </div>
          ))}
        </div>
      ) },
    { icon: <Building2 size={22} />, title: 'Company Explorer',
      text: 'Search any listed stock and get interactive price charts, key metrics and fundamentals on a single page.',
      visual: (
        <div className="lp-mini-rows">
          <div className="lp-mini-row"><span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--lp-muted)' }}><Search size={14} /> RELIANCE, TCS, AAPL…</span></div>
          <div className="lp-mini-row"><b>P/E · ROE · Market cap</b><span className="lp-up">Key metrics</span></div>
        </div>
      ) },
    { icon: <Newspaper size={22} />, title: 'News Intelligence',
      text: 'Curated streams for the forces that actually move Indian markets — from RBI policy to the rupee and bullion.',
      visual: <div className="lp-chips">{NEWS_STREAMS.map(n => <span key={n}>{n}</span>)}</div> },
    { icon: <Star size={22} />, title: 'Watchlist & Alerts',
      text: 'Track the stocks you care about and set target prices. We’ll email you the moment they’re hit.',
      link: ['See how alerts work', 'alerts'] },
    { icon: <Bot size={22} />, title: 'AI Analyst Chat', full: true,
      text: 'Ask about any stock in plain English. The assistant reads fundamentals, technicals and macro context before it answers.',
      visual: (
        <div className="lp-chat">
          <div className="lp-bubble me">Is TCS overvalued right now?</div>
          <div className="lp-bubble ai">Running the Confluence Engine for <b style={{ color: '#fff' }}>TCS</b>… I&apos;ll compare intrinsic value with price, check RSI and EMA trend, then weigh USD/INR and US yields for IT exporters.</div>
        </div>
      ) },
  ];

  return (
    <div className="lp" ref={rootRef}>
      {/* ---------- NAV ---------- */}
      <nav className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-wrap lp-nav-inner">
          <button className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="InvestIQ AI home">
            <img src="/logo.png" alt="" />
            <span>InvestIQ <b>AI</b></span>
          </button>
          <div className="lp-links">
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('engine')}>AI Engine</button>
            <button onClick={() => scrollTo('simulator')}>Simulator</button>
            <button onClick={() => scrollTo('how')}>How it works</button>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-login-btn" onClick={() => openAuth('login')}><User size={18} /><span>Login</span></button>
            <button className="lp-btn lp-btn-lime lp-btn-sm" onClick={() => openAuth('signup')}>Get started</button>
          </div>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <header className="lp-hero">
        <div className="lp-stars" /><div className="lp-stars-2" />
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-copy">
            <span className="lp-chip" data-reveal><i /> Live · NSE · BSE · NYSE · NASDAQ</span>
            <h1 data-reveal style={{ '--d': '0.08s' }}>Quantify your<br /><span className="lp-grad">market edge</span></h1>
            <p className="lp-hero-lead" data-reveal style={{ '--d': '0.16s' }}>
              Reliable, data-driven market intelligence powered by AI. Real-time quotes, a three-layer Confluence Engine
              and institutional-grade risk modelling for Indian and US markets — in one dashboard.
            </p>
            <ul className="lp-checks" data-reveal style={{ '--d': '0.24s' }}>
              <li><CircleCheck size={20} /> Real-time quotes across NSE, BSE &amp; US exchanges</li>
              <li><CircleCheck size={20} /> AI analysis of fundamentals, technicals &amp; macro</li>
              <li><CircleCheck size={20} /> Monte Carlo risk simulator &amp; email price alerts</li>
            </ul>
            <div className="lp-hero-cta" data-reveal style={{ '--d': '0.32s' }}>
              <button className="lp-btn lp-btn-ghost" onClick={() => scrollTo('showcase')}>Explore features <ArrowDown size={16} /></button>
            </div>
          </div>
          <div data-reveal style={{ '--d': '0.2s' }}>
            <Auth onLogin={onLogin} mode={authMode} onModeChange={setAuthMode} />
          </div>
        </div>
      </header>

      {/* ---------- LIVE TICKER ---------- */}
      <div className="lp-ticker" aria-label="Live market ticker">
        <div className="lp-ticker-track">
          {tickerItems.map((t, i) => (
            <div className="lp-tick" key={i} aria-hidden={i >= TICKER.length}>
              <span className="lp-tick-name">{t.name}</span>
              <span className="lp-tick-price">{fmtPrice(q(t.sym).price, t.inr)}</span>
              <Change pct={q(t.sym).changePercent} />
            </div>
          ))}
        </div>
      </div>

      {/* ---------- DEVICE SHOWCASE ---------- */}
      <section className="lp-section lp-showcase" id="showcase">
        <div className="lp-wrap">
          <div className="lp-section-head" data-reveal>
            <span className="lp-eyebrow is-lime">One intelligent terminal</span>
            <h2>A secure &amp; dependable market intelligence platform</h2>
            <p>Everything you need to research, decide and monitor — built on live market data and explained by AI.</p>
          </div>
          <div className="lp-device-stage">
            <div className="lp-device" ref={deviceRef}>
              <div className="lp-screen">
                <div className="lp-screen-bar">
                  <span className="lp-brand"><img src="/logo.png" alt="" /><span>InvestIQ <b>AI</b></span></span>
                  <span className="lp-screen-nav"><span>Dashboard</span><span>Sectors</span><span>Analysis</span><span>Simulator</span></span>
                  <span className="lp-screen-pill">LIVE</span>
                </div>
                <div className="lp-screen-title">
                  <h3>Today&apos;s markets, at a glance</h3>
                  <p>Benchmark indices, bullion and the rupee — updated in real time</p>
                </div>
                <div className="lp-quote-grid">
                  {SHOWCASE.map((s, i) => {
                    const d = q(s.sym);
                    const up = d.changePercent == null || d.changePercent >= 0;
                    const lineColor = d.changePercent == null ? '#22d3ee' : up ? '#b6f24a' : '#fb7185';
                    return (
                      <div className="lp-quote" key={s.sym}>
                        <div className="lp-quote-top">
                          <span className="lp-quote-sym"><i style={{ background: s.color }}>{s.tag}</i>{s.name}</span>
                          <span className="lp-quote-chg"><Change pct={d.changePercent} /></span>
                        </div>
                        <div className="lp-quote-price">{fmtPrice(d.price, s.sym === '^NSEI' || s.sym === '^BSESN' || s.sym === 'USDINR=X')}</div>
                        <Sparkline seed={i * 97 + 13} up={up} color={lineColor} id={`lp-sp-${i}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURE BENTO ---------- */}
      <section className="lp-section" id="features">
        <div className="lp-wrap">
          <div className="lp-section-head" data-reveal>
            <span className="lp-eyebrow">Features</span>
            <h2>Built for every market move</h2>
            <p>From a quick morning check to a deep valuation study, every tool works together on the same live data.</p>
          </div>
          <div className="lp-bento">
            {features.map((f, i) => (
              <article key={f.title} className={`lp-card ${f.wide ? 'lp-card-wide' : ''} ${f.full ? 'lp-card-full' : ''}`} onMouseMove={spotlight} data-reveal style={{ '--d': `${(i % 3) * 0.08}s` }}>
                <div>
                  <div className="lp-card-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  {f.link && <button className="lp-card-link" onClick={() => scrollTo(f.link[1])}>{f.link[0]} <ArrowRight size={15} /></button>}
                </div>
                {f.visual && <div className="lp-card-visual">{f.visual}</div>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- DEEP DIVES ---------- */}
      <section className="lp-section" style={{ paddingTop: 40 }}>
        <div className="lp-wrap">
          {/* Confluence engine */}
          <div className="lp-split" id="engine" style={{ scrollMarginTop: 110 }}>
            <div className="lp-split-copy" data-reveal>
              <span className="lp-eyebrow">Confluence AI Engine</span>
              <h2>Three lenses.<br /><span className="lp-grad">One clear verdict.</span></h2>
              <p>Most tools show you numbers. InvestIQ weighs them. Every analysis blends valuation, price action and the macro backdrop into a single, explainable signal.</p>
              <ul className="lp-bullets">
                <li><span><Brain size={17} /></span><div><b>Fundamental</b><small>Intrinsic value, margin of safety, debt/equity and free-cash-flow yield</small></div></li>
                <li><span><Activity size={17} /></span><div><b>Technical</b><small>RSI (14), 50 &amp; 200 EMA, MACD and volume trend</small></div></li>
                <li><span><Globe size={17} /></span><div><b>Macro</b><small>USD/INR, crude oil, US 10-year yield and market volatility</small></div></li>
              </ul>
              <button className="lp-btn lp-btn-primary" onClick={() => openAuth('signup')}>Analyse a stock <ArrowRight size={16} /></button>
            </div>
            <div className="lp-panel" data-reveal style={{ '--d': '0.12s' }}>
              <div className="lp-panel-head"><b>Confluence score · Sample</b><span className="lp-note">Illustrative preview</span></div>
              <div className="lp-gauge-wrap">
                <div className="lp-gauge">
                  <svg viewBox="0 0 170 170">
                    <defs>
                      <linearGradient id="lp-gauge-g" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#b6f24a" />
                      </linearGradient>
                    </defs>
                    <circle cx="85" cy="85" r="70" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
                    <circle cx="85" cy="85" r="70" fill="none" stroke="url(#lp-gauge-g)" strokeWidth="12" strokeLinecap="round"
                      className="lp-gauge-arc" strokeDasharray="439.8" />
                  </svg>
                  <div className="lp-gauge-val"><b>78</b><small>BULLISH</small></div>
                </div>
                <div className="lp-bars">
                  {[['Fundamental', 82, '#a78bfa'], ['Technical', 71, '#22d3ee'], ['Macro', 64, '#b6f24a']].map(([n, v, c]) => (
                    <div key={n}>
                      <div className="lp-bar-top"><span>{n}</span><b>{v}</b></div>
                      <div className="lp-bar"><i style={{ '--w': `${v}%`, background: c }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lp-signal-grid">
                <div className="lp-metric"><small>Margin of safety</small><b className="lp-up">+18.4%</b></div>
                <div className="lp-metric"><small>RSI (14)</small><b>58.2</b></div>
                <div className="lp-metric"><small>200 EMA</small><b className="lp-up">Above</b></div>
              </div>
            </div>
          </div>

          {/* Simulator */}
          <div className="lp-split is-flip" id="simulator" style={{ scrollMarginTop: 110 }}>
            <div className="lp-split-copy" data-reveal>
              <span className="lp-eyebrow is-lime">Simulator &amp; Risk</span>
              <h2>Stress-test before<br />you invest.</h2>
              <p>Run thousands of possible futures for your portfolio. The Monte Carlo engine and dual-layer AI show the realistic range of outcomes — not just the best case.</p>
              <ul className="lp-bullets">
                <li><span><Calculator size={17} /></span><div><b>Monte Carlo trajectories</b><small>Wealth paths with best, median and worst-case bands</small></div></li>
                <li><span><Gauge size={17} /></span><div><b>Risk metrics</b><small>CAGR, VaR (95%), CVaR, Sharpe and Sortino ratios</small></div></li>
                <li><span><TrendingUp size={17} /></span><div><b>Macro-aware</b><small>Factors in volatility (VIX) and macro conditions</small></div></li>
              </ul>
              <button className="lp-btn lp-btn-primary" onClick={() => openAuth('signup')}>Run a simulation <ArrowRight size={16} /></button>
            </div>
            <div className="lp-panel is-lime lp-mc" data-reveal style={{ '--d': '0.12s' }}>
              <div className="lp-panel-head"><b>Wealth over time</b><span className="lp-note">Illustrative preview</span></div>
              <MonteCarlo />
              <div className="lp-metrics" style={{ marginTop: 18 }}>
                <div className="lp-metric"><small>CAGR</small><b className="lp-up">12.6%</b></div>
                <div className="lp-metric"><small>VaR 95%</small><b className="lp-down">−8.9%</b></div>
                <div className="lp-metric"><small>Sharpe</small><b>1.42</b></div>
                <div className="lp-metric"><small>Sortino</small><b>1.97</b></div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="lp-split" id="alerts" style={{ scrollMarginTop: 110 }}>
            <div className="lp-split-copy" data-reveal>
              <span className="lp-eyebrow">Watchlist &amp; Alerts</span>
              <h2>Never miss<br /><span className="lp-grad">your price.</span></h2>
              <p>Set a target above or below the market and get back to your day. InvestIQ watches the tape and emails you the moment your level is crossed.</p>
              <ul className="lp-bullets">
                <li><span><Star size={17} /></span><div><b>Personal watchlist</b><small>Indian and US stocks side by side</small></div></li>
                <li><span><Mail size={17} /></span><div><b>Email notifications</b><small>Triggered automatically when a target is hit</small></div></li>
                <li><span><BellRing size={17} /></span><div><b>In-app badge</b><small>See every triggered alert the next time you log in</small></div></li>
              </ul>
              <button className="lp-btn lp-btn-primary" onClick={() => openAuth('signup')}>Create a watchlist <ArrowRight size={16} /></button>
            </div>
            <div className="lp-panel is-cyan" data-reveal style={{ '--d': '0.12s' }}>
              <div className="lp-panel-head"><b>Alerts</b><span className="lp-note">Illustrative preview</span></div>
              <div className="lp-alerts">
                <div className="lp-alert">
                  <span className="lp-alert-ic" style={{ background: 'rgba(182,242,74,0.12)', color: '#b6f24a' }}><TrendingUp size={20} /></span>
                  <div><b>RELIANCE crossed ₹3,000</b><small>Target above · email sent</small></div><time>now</time>
                </div>
                <div className="lp-alert">
                  <span className="lp-alert-ic" style={{ background: 'rgba(251,113,133,0.12)', color: '#fb7185' }}><TrendingDown size={20} /></span>
                  <div><b>INFY dropped below ₹1,450</b><small>Target below · email sent</small></div><time>12m</time>
                </div>
                <div className="lp-alert">
                  <span className="lp-alert-ic" style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}><BellRing size={20} /></span>
                  <div><b>NVDA reached $150</b><small>Target above · email sent</small></div><time>1h</time>
                </div>
                <div className="lp-alert">
                  <span className="lp-alert-ic" style={{ background: 'rgba(167,139,250,0.14)', color: '#a78bfa' }}><Mail size={20} /></span>
                  <div><b>3 alerts delivered today</b><small>Straight to your inbox</small></div><time>today</time>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PILLARS ---------- */}
      <section className="lp-section" style={{ paddingTop: 40 }}>
        <div className="lp-wrap">
          <div className="lp-pillars">
            {[['4', 'Major exchanges — NSE, BSE, NYSE & NASDAQ'], ['3', 'Analysis layers in every AI verdict'], ['6', 'Dedicated market news streams'], ['24/7', 'Automated price-alert monitoring']].map(([n, t], i) => (
              <div className="lp-pillar" key={t} data-reveal style={{ '--d': `${i * 0.08}s` }}>
                <b className={i % 2 ? 'lp-grad' : undefined} style={i % 2 ? undefined : { color: '#b6f24a' }}>{n}</b>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="lp-section" id="how">
        <div className="lp-wrap">
          <div className="lp-section-head" data-reveal>
            <span className="lp-eyebrow">How it works</span>
            <h2>From sign-up to insight in minutes</h2>
          </div>
          <div className="lp-steps">
            {[
              ['Create your free account', 'Sign up with your email and mobile number — no card, no trial clock.'],
              ['Search & build a watchlist', 'Find any stock on NSE, BSE or US exchanges and add the ones you follow.'],
              ['Act on AI insights', 'Read the confluence verdict, stress-test with the simulator and let alerts do the watching.'],
            ].map(([t, d], i) => (
              <div className="lp-step" key={t} data-reveal style={{ '--d': `${i * 0.12}s` }}>
                <div className="lp-step-num">{i + 1}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="lp-wrap">
        <div className="lp-cta" data-reveal>
          <span className="lp-eyebrow is-lime">Start today</span>
          <h2>Start making data-driven investment decisions.</h2>
          <p>Join InvestIQ AI and get the full intelligence suite — live data, AI analysis, risk simulation and alerts.</p>
          <div className="lp-hero-cta">
            <button className="lp-btn lp-btn-lime" onClick={() => openAuth('signup')}>Create free account <ArrowRight size={16} /></button>
            <button className="lp-btn lp-btn-ghost" onClick={() => openAuth('login')}>I already have an account</button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <span className="lp-brand"><img src="/logo.png" alt="" /><span>InvestIQ <b>AI</b></span></span>
          <p>Market data via Yahoo Finance · © {new Date().getFullYear()} InvestIQ AI</p>
          <p className="lp-disclaimer">⚠️ For information and education only — not financial advice.</p>
        </div>
      </footer>
    </div>
  );
}
