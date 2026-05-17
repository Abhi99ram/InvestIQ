// Technical Analysis Engine (Layer 2) — Concise 1-2 line insights

export function calculateEMA(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < data.length; i++) ema = (data[i] - ema) * k + ema;
  return ema;
}

export function calculateSMA(data, period) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calculateRSI(data, period = 14) {
  if (data.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i] - data[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    if (d >= 0) { ag = (ag * (period - 1) + d) / period; al = al * (period - 1) / period; }
    else        { ag = ag * (period - 1) / period; al = (al * (period - 1) - d) / period; }
  }
  return 100 - (100 / (1 + (al === 0 ? 100 : ag / al)));
}

export function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
  if (data.length < slow + signal) return null;
  const emaArr = (arr, p) => {
    const k = 2 / (p + 1), res = [];
    let e = arr.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p - 1; i < arr.length; i++) { if (i === p - 1) { res.push(e); continue; } e = (arr[i] - e) * k + e; res.push(e); }
    return res;
  };
  const fe = emaArr(data, fast), se = emaArr(data, slow);
  const ml = se.map((v, i) => fe[i + (slow - fast)] - v);
  const sl = emaArr(ml, signal);
  const cm = ml[ml.length - 1], cs = sl[sl.length - 1];
  return { macd: cm, signal: cs, histogram: cm - cs, isBullish: cm > cs };
}

export function analyzeTechnicals(priceData, volumeData) {
  if (!priceData || priceData.length < 50) {
    return { error: 'Insufficient data', isBullish: false, trigger: '⚠️ Less than 50 days of price data — technical analysis unavailable.', bullishCount: 0 };
  }

  const cur    = priceData[priceData.length - 1];
  const prev   = priceData[priceData.length - 2] || cur;
  const ema200 = priceData.length >= 200 ? calculateEMA(priceData, 200) : null;
  const ema50  = priceData.length >= 50  ? calculateEMA(priceData, 50)  : null;
  const rsi14  = calculateRSI(priceData, 14);
  const macd   = calculateMACD(priceData);

  const rv5  = volumeData?.length >= 5  ? volumeData.slice(-5).reduce((a, b) => a + b, 0) / 5 : null;
  const rv20 = volumeData?.length >= 20 ? volumeData.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;
  const volConfirmed = rv5 && rv20 ? rv5 > rv20 * 1.1 : false;

  // Signal count
  const signals = [
    ema200 && cur > ema200,
    ema50 && ema200 && ema50 > ema200,
    rsi14 && rsi14 > 50 && rsi14 < 70,
    macd?.isBullish,
    volConfirmed && cur > prev,
  ].filter(Boolean).length;

  let isBullish = signals >= 3;
  let signal = null;
  let verdict = signals >= 4 ? 'Bullish' : signals === 3 ? 'Bullish' : signals === 2 ? 'Neutral' : 'Bearish';
  const trendBullish = ema200 && ema50 && cur > ema200 && cur > ema50;

  // ── Single crisp insight line ──────────────────────────────────────────────
  let parts = [];

  // Trend
  if (ema200) {
    const pct = (((cur - ema200) / ema200) * 100).toFixed(1);
    parts.push(cur > ema200 ? `Price ${pct}% above 200 EMA` : `Price ${Math.abs(pct)}% below 200 EMA`);
  }
  if (trendBullish) parts.push('Trend Bullish (CMP > 50 & 200 EMA)');

  // RSI
  if (rsi14 != null) {
    if (rsi14 > 70) {
      signal = 'Overbought';
      parts.push(`RSI overbought (${rsi14.toFixed(0)}) — warning: potential pullback even if trend is up`);
      isBullish = false;
      verdict = rsi14 > 75 ? 'Cautious / Pullback Risk' : 'Cautious / Pullback Risk';
    } else if (rsi14 < 30) {
      signal = 'Oversold';
      parts.push(`RSI oversold (${rsi14.toFixed(0)}) — potential reversal`);
      verdict = rsi14 < 25 ? 'Oversold Bounce' : 'Oversold Bounce';
      isBullish = false;
    } else {
      parts.push(`RSI ${rsi14.toFixed(0)}`);
    }
  }

  // MACD
  if (macd) parts.push(macd.isBullish ? 'MACD bullish' : 'MACD bearish');

  // Golden/Death cross
  if (ema50 && ema200) {
    if (ema50 > ema200 * 1.01) parts.push('Golden Cross ✅');
    else if (ema50 < ema200 * 0.99) parts.push('Death Cross ⚠️');
  }

  const triggerLabel = verdict === 'Cautious / Pullback Risk'
    ? '⚠️ Cautious / Pullback Risk'
    : verdict === 'Oversold Bounce'
      ? '🔄 Oversold Bounce'
      : verdict === 'Bullish'
        ? '📈 Bullish'
        : verdict === 'Neutral'
          ? '⚖️ Neutral'
          : '📉 Bearish';
  const trigger = `${triggerLabel} — ${parts.join(', ')}. (${signals}/5 signals)`;

  return {
    currentPrice: cur,
    ema200,
    ema50,
    rsi14,
    macd,
    volumeConfirmed: volConfirmed,
    bullishCount: signals,
    trend: trendBullish ? 'Bullish' : (ema200 && cur < ema200 ? 'Bearish' : 'Neutral'),
    signal,
    verdict,
    isBullish,
    trigger,
  };
}
