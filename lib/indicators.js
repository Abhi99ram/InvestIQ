// Technical Analysis Indicators Engine

export function SMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j];
    result.push(sum / period);
  }
  return result;
}

export function EMA(data, period) {
  const result = [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) { result.push(ema); continue; }
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

export function RSI(closes, period = 14) {
  const result = [];
  const gains = [];
  const losses = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(null); continue; }
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    if (avgLoss === 0) { result.push(100); continue; }
    const rs = avgGain / avgLoss;
    result.push(100 - (100 / (1 + rs)));
  }
  return result;
}

export function MACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = EMA(closes, fast);
  const emaSlow = EMA(closes, slow);
  const macdLine = emaFast.map((v, i) => v != null && emaSlow[i] != null ? v - emaSlow[i] : null);
  const validMacd = macdLine.filter(v => v !== null);
  const signalLine = EMA(validMacd, signal);
  const paddedSignal = new Array(macdLine.length - validMacd.length).fill(null).concat(signalLine);
  const histogram = macdLine.map((v, i) => v != null && paddedSignal[i] != null ? v - paddedSignal[i] : null);
  return { macdLine, signalLine: paddedSignal, histogram };
}

export function BollingerBands(closes, period = 20, multiplier = 2) {
  const sma = SMA(closes, period);
  const upper = [];
  const lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + multiplier * std);
    lower.push(mean - multiplier * std);
  }
  return { upper, middle: sma, lower };
}

export function generateInsights(symbol, closes, currentPrice) {
  const insights = [];
  if (!closes || closes.length < 200) return insights;

  const sma20 = SMA(closes, 20);
  const sma50 = SMA(closes, 50);
  const sma200 = SMA(closes, 200);
  const rsi = RSI(closes);
  const macd = MACD(closes);

  const lastRSI = rsi.filter(v => v !== null).pop();
  const lastSMA20 = sma20.filter(v => v !== null).pop();
  const lastSMA50 = sma50.filter(v => v !== null).pop();
  const lastSMA200 = sma200.filter(v => v !== null).pop();
  const lastMACD = macd.macdLine.filter(v => v !== null).pop();
  const lastSignal = macd.signalLine.filter(v => v !== null).pop();

  // Price vs Moving Averages
  if (currentPrice > lastSMA200) {
    insights.push({ type: 'bullish', category: 'Trend', text: `${symbol} is trading above its 200-day SMA (₹${lastSMA200?.toFixed(2)}) — long-term uptrend intact.` });
  } else if (lastSMA200) {
    insights.push({ type: 'bearish', category: 'Trend', text: `${symbol} is below its 200-day SMA (₹${lastSMA200?.toFixed(2)}) — long-term downtrend signal.` });
  }

  if (lastSMA20 && lastSMA50 && lastSMA20 > lastSMA50) {
    insights.push({ type: 'bullish', category: 'Golden Cross', text: `${symbol}: 20-day SMA crossed above 50-day SMA — bullish crossover signal.` });
  } else if (lastSMA20 && lastSMA50 && lastSMA20 < lastSMA50) {
    insights.push({ type: 'bearish', category: 'Death Cross', text: `${symbol}: 20-day SMA is below 50-day SMA — bearish crossover signal.` });
  }

  // RSI
  if (lastRSI > 70) {
    insights.push({ type: 'bearish', category: 'RSI', text: `${symbol} RSI is ${lastRSI?.toFixed(1)} — overbought territory. Consider caution or profit booking.` });
  } else if (lastRSI < 30) {
    insights.push({ type: 'bullish', category: 'RSI', text: `${symbol} RSI is ${lastRSI?.toFixed(1)} — oversold territory. Potential buying opportunity.` });
  } else {
    insights.push({ type: 'neutral', category: 'RSI', text: `${symbol} RSI is ${lastRSI?.toFixed(1)} — neutral momentum range.` });
  }

  // MACD
  if (lastMACD != null && lastSignal != null) {
    if (lastMACD > lastSignal) {
      insights.push({ type: 'bullish', category: 'MACD', text: `${symbol} MACD line is above signal line — bullish momentum.` });
    } else {
      insights.push({ type: 'bearish', category: 'MACD', text: `${symbol} MACD line is below signal line — bearish momentum.` });
    }
  }

  // Volatility
  const last20 = closes.slice(-20);
  const avg = last20.reduce((a, b) => a + b, 0) / 20;
  const volatility = Math.sqrt(last20.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / 20) / avg * 100;
  if (volatility > 3) {
    insights.push({ type: 'neutral', category: 'Volatility', text: `${symbol} showing high volatility (${volatility.toFixed(1)}%) over last 20 sessions — trade with caution.` });
  }

  return insights;
}
