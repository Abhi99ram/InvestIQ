// Strict financial data validation & sanitization before UI payload

const BEARISH_PHRASES = /\b(headwind|headwinds|negative impact|overvaluat|overvalued|downside risk|bearish|weak demand|margin pressure|decelerat|deteriorat|unfavorable|sell[- ]?off|downgrade)\b/i;
const BULLISH_PHRASES = /\b(tailwind|undervalued|upside|bullish|strong growth|margin expansion|favorable|accumulate|buy signal)\b/i;

export function resolveCurrency(symbol = '') {
  const s = symbol.toUpperCase();
  if (s.endsWith('.NS') || s.endsWith('.BO') || s.endsWith('.NSE') || s.endsWith('.BSE')) return 'INR';
  if (s.endsWith('.L') || s.endsWith('.LON')) return 'GBP';
  if (s.endsWith('.TO') || s.endsWith('.V')) return 'CAD';
  if (s.endsWith('.HK')) return 'HKD';
  if (s.endsWith('.DE') || s.endsWith('.F') || s.endsWith('.PA')) return 'EUR';
  return 'USD';
}

function formatMoney(value, currency) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  const n = Number(value);
  if (currency === 'INR') return `₹${n.toFixed(0)}`;
  if (currency === 'EUR') return `€${n.toFixed(2)}`;
  if (currency === 'GBP') return `£${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}

function hasMixedCurrencyText(text, currency) {
  if (!text) return false;
  const hasInr = /₹|INR\b|rupee/i.test(text);
  const hasUsd = /\$|USD\b|dollar/i.test(text);
  if (currency === 'INR') return hasUsd && !hasInr;
  if (currency === 'USD') return hasInr && !hasUsd;
  return false;
}

function normalizeDebtToEquity(fundamental, financialData) {
  const totalDebt = financialData?.totalDebt;
  const totalEquity = financialData?.totalStockholderEquity;
  if (totalDebt == null && totalEquity == null) {
    fundamental.debtToEquity = null;
    return;
  }
  if (totalDebt === 0) {
    fundamental.debtToEquity = 0;
    return;
  }
  if (fundamental.debtToEquity == null && totalDebt != null && totalEquity != null && totalEquity > 0) {
    fundamental.debtToEquity = totalDebt / totalEquity;
  }
}

function validateFundamentals(fundamental, currency) {
  const cmp = fundamental.currentPrice;
  const iv = fundamental.intrinsicValue;

  if (cmp != null && iv != null && iv > 0) {
    fundamental.premiumDiscount = ((cmp - iv) / iv) * 100;
    fundamental.marginOfSafety = cmp <= iv ? ((iv - cmp) / iv) * 100 : 0;

    if (cmp > iv) {
      fundamental.isUndervalued = false;
      fundamental.verdict = 'Overvalued';
      fundamental.isBullish = false;
      const prem = fundamental.premiumDiscount.toFixed(1);
      fundamental.trigger = `⚠️ Overvalued — trading at ${prem}% premium to intrinsic (${formatMoney(cmp, currency)} vs ${formatMoney(iv, currency)}). Margin of safety: 0%.`;
    } else if (fundamental.premiumDiscount > 15) {
      fundamental.verdict = 'Overvalued';
      fundamental.isBullish = false;
    } else if (fundamental.marginOfSafety >= 15) {
      fundamental.verdict = 'Undervalued';
    } else {
      fundamental.verdict = 'Fair Value';
    }

    if (fundamental.premiumDiscount > 15) {
      fundamental.isBullish = false;
    }
  } else {
    fundamental.premiumDiscount = null;
    if (fundamental.isBullish && fundamental.marginOfSafety < 0) {
      fundamental.isBullish = false;
      fundamental.verdict = 'Bearish';
    }
  }
}

function validateTechnicals(technical) {
  const { currentPrice: cmp, ema200, ema50, rsi14 } = technical;
  let signal = technical.signal || null;
  let verdict = technical.verdict || null;

  if (rsi14 != null) {
    if (rsi14 > 70) {
      signal = 'Overbought';
      const warn = ' Potential pullback risk as RSI indicates stretched momentum.';
      if (!technical.trigger?.includes('pullback') && !technical.trigger?.includes('Pullback')) {
        technical.trigger = (technical.trigger || '') + warn;
      }
    } else if (rsi14 < 30) {
      signal = 'Oversold';
    }
  }

  const trendBullish = cmp != null && ema200 != null && ema50 != null && cmp > ema200 && cmp > ema50;
  technical.trend = trendBullish ? 'Bullish' : (cmp != null && ema200 != null && cmp < ema200 ? 'Bearish' : 'Neutral');

  if (rsi14 != null && rsi14 > 75) {
    verdict = 'Cautious / Pullback Risk';
    technical.isBullish = false;
  } else if (rsi14 != null && rsi14 < 25) {
    verdict = 'Oversold Bounce';
    technical.isBullish = false;
  } else if (signal === 'Overbought') {
    verdict = verdict || 'Cautious / Pullback Risk';
    if (rsi14 > 70) technical.isBullish = false;
  } else if (signal === 'Oversold') {
    verdict = verdict || 'Oversold Bounce';
  } else if (!verdict) {
    verdict = technical.isBullish ? 'Bullish' : 'Bearish';
  }

  if (rsi14 != null && rsi14 > 70 && technical.isBullish && !verdict.includes('Cautious')) {
    verdict = 'Cautious / Pullback Risk';
    technical.isBullish = false;
  }

  technical.signal = signal;
  technical.verdict = verdict;
}

function validateTargets(payload, cmp, currency, thesisBullish) {
  let entry = payload.targetEntry != null ? Number(payload.targetEntry) : null;
  let exit = payload.targetExit != null ? Number(payload.targetExit) : null;

  if (cmp != null) {
    if (entry != null && entry < cmp * 0.8) entry = null;
    if (exit != null && exit < cmp * 0.8) exit = null;
  }

  if (cmp != null && (entry == null || exit == null)) {
    const support = payload.layers?.technical?.ema50 || payload.layers?.technical?.ema200 || cmp * 0.97;
    entry = entry ?? Math.min(cmp, support);
    exit = exit ?? Math.max(cmp * 1.08, entry * 1.05);
  }

  if (thesisBullish && cmp != null && entry != null && entry > cmp) {
    entry = cmp * 0.99;
  }

  if (entry != null && exit != null && cmp != null) {
    if (exit <= entry) exit = Math.max(entry * 1.05, cmp * 1.05);
    if (exit <= cmp) exit = cmp * 1.08;
    if (exit <= entry) exit = entry * 1.05;
  }

  payload.targetEntry = entry != null ? entry.toFixed(2) : null;
  payload.targetExit = exit != null ? exit.toFixed(2) : null;
  payload.targetEntryFormatted = formatMoney(entry, currency);
  payload.targetExitFormatted = formatMoney(exit, currency);
}

function alignCommentary(layer, layerName) {
  const text = [layer.trigger, layer.catalyst].filter(Boolean).join(' ');
  if (!text) return;

  const bearishInText = BEARISH_PHRASES.test(text);
  const bullishInText = BULLISH_PHRASES.test(text);

  if (bearishInText && layer.isBullish) {
    layer.isBullish = false;
    layer.sentimentConflict = true;
    if (!layer.trigger?.includes('Adjusted')) {
      layer.trigger = `${layer.trigger || ''} [${layerName}: sentiment aligned to Bearish/Neutral due to commentary keywords.]`.trim();
    }
  } else if (bullishInText && !layer.isBullish && layerName === 'macro' && bearishInText) {
    layer.sentimentConflict = true;
  }
}

function sanitizeCurrencyInText(layer, currency) {
  for (const key of ['trigger', 'catalyst']) {
    if (!layer[key] || !hasMixedCurrencyText(layer[key], currency)) continue;
    layer[key] = layer[key]
      .replace(/₹/g, currency === 'USD' ? '$' : '₹')
      .replace(/\$/g, currency === 'INR' ? '₹' : '$');
  }
}

export function validateAndSanitizeAnalysis(raw, symbol, financialData = {}) {
  const payload = JSON.parse(JSON.stringify(raw));
  const currency = resolveCurrency(symbol);
  const cmp = payload.layers?.fundamental?.currentPrice ?? payload.layers?.technical?.currentPrice ?? financialData?.currentPrice ?? null;
  const errors = [];

  payload.currency = currency;

  if (financialData?.currency && financialData.currency !== currency) {
    errors.push(`Currency mismatch: feed=${financialData.currency} vs listing=${currency}`);
  }

  const fundamental = payload.layers?.fundamental;
  const technical = payload.layers?.technical;
  const macro = payload.layers?.macro;

  if (fundamental) {
    normalizeDebtToEquity(fundamental, financialData);
    validateFundamentals(fundamental, currency);
    sanitizeCurrencyInText(fundamental, currency);
    if (hasMixedCurrencyText(fundamental.trigger, currency)) errors.push('Mixed currency in fundamental text');
    alignCommentary(fundamental, 'Fundamental');
  }

  if (technical) {
    validateTechnicals(technical);
    sanitizeCurrencyInText(technical, currency);
    alignCommentary(technical, 'Technical');
  }

  if (macro) {
    sanitizeCurrencyInText(macro, currency);
    alignCommentary(macro, 'Macro');
  }

  const thesisBullish = Boolean(
    fundamental?.isBullish || technical?.trend === 'Bullish' || macro?.isBullish
  );
  validateTargets(payload, cmp, currency, thesisBullish);

  if (fundamental?.isBullish && fundamental?.premiumDiscount > 15) {
    fundamental.isBullish = false;
    errors.push('Blocked Bullish fundamental badge: premium > 15%');
  }

  if (cmp != null && fundamental?.intrinsicValue != null && cmp > fundamental.intrinsicValue && fundamental.isBullish) {
    fundamental.isBullish = false;
    errors.push('Blocked Bullish fundamental badge: CMP above intrinsic value');
  }

  payload.validation = {
    passed: errors.length === 0,
    errors,
    verifiedAt: new Date().toISOString(),
  };

  return payload;
}
