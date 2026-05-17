// Central market currency & price formatting (Yahoo Finance aligned)

const SYMBOL_MAP = {
  USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥',
  CAD: 'C$', AUD: 'A$', CHF: 'CHF ', HKD: 'HK$',
  CNY: '¥', KRW: '₩', SGD: 'S$', SEK: 'kr ', NOK: 'kr ',
  DKK: 'kr ', NZD: 'NZ$', ZAR: 'R', BRL: 'R$',
  MXN: 'MX$', TRY: '₺', RUB: '₽', PLN: 'zł',
};

const LOCALE_MAP = {
  USD: 'en-US', INR: 'en-IN', EUR: 'de-DE', GBP: 'en-GB',
  JPY: 'ja-JP', CAD: 'en-CA', AUD: 'en-AU', HKD: 'en-HK',
};

export function resolveCurrency(symbol = '', quoteCurrency = null) {
  if (quoteCurrency && typeof quoteCurrency === 'string') {
    return quoteCurrency.toUpperCase();
  }
  const s = (symbol || '').toUpperCase();
  if (s.endsWith('.NS') || s.endsWith('.BO') || s.endsWith('.NSE') || s.endsWith('.BSE')) return 'INR';
  if (s.endsWith('.L') || s.endsWith('.LON')) return 'GBP';
  if (s.endsWith('.TO') || s.endsWith('.V')) return 'CAD';
  if (s.endsWith('.HK')) return 'HKD';
  if (s.endsWith('.DE') || s.endsWith('.F') || s.endsWith('.PA') || s.endsWith('.MI')) return 'EUR';
  if (s.endsWith('.T')) return 'JPY';
  if (s.endsWith('.AX')) return 'AUD';
  if (s === 'USDINR=X' || s === 'INR=X' || s === 'INRUSD=X') return 'INR';
  if (s === 'GC=F' || s === 'SI=F' || s === 'HG=F' || s === 'CL=F' || s === 'BZ=F' || s === 'NG=F') return 'USD';
  if (s.startsWith('^')) {
    if (['^NSEI', '^NSEBANK', '^BSESN', '^CNXIT', '^CNXAUTO', '^CNXFMCG'].includes(s)) return 'INR';
    return 'USD';
  }
  return 'USD';
}

export function currencySymbol(currency = 'USD') {
  return SYMBOL_MAP[(currency || 'USD').toUpperCase()] || `${currency} `;
}

export function localeForCurrency(currency = 'USD') {
  return LOCALE_MAP[(currency || 'USD').toUpperCase()] || 'en-US';
}

export function formatPrice(value, currency = 'USD', options = {}) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  const n = Number(value);
  const cur = (currency || 'USD').toUpperCase();
  const sym = currencySymbol(cur);
  const maxFrac = options.maximumFractionDigits ?? (n >= 1000 ? 0 : n >= 100 ? 2 : 2);
  const minFrac = options.minimumFractionDigits ?? (cur === 'INR' && n >= 100 ? 0 : 2);
  const formatted = n.toLocaleString(localeForCurrency(cur), { maximumFractionDigits: maxFrac, minimumFractionDigits: minFrac });
  return `${sym}${formatted}`;
}

export function formatPriceFromQuote(quote, value = quote?.price) {
  const currency = resolveCurrency(quote?.symbol, quote?.currency);
  return formatPrice(value, currency);
}

export function formatChange(change, changePercent, currency = 'USD') {
  const sym = currencySymbol(currency);
  const ch = change != null ? `${change >= 0 ? '+' : ''}${sym}${Math.abs(change).toFixed(2)}` : '';
  const pct = changePercent != null ? ` (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)` : '';
  return `${ch}${pct}`.trim() || '-';
}

/** Short format for large INR values (Cr/L) — only when currency is INR */
export function formatPriceCompact(value, currency = 'USD') {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  const n = Number(value);
  const cur = (currency || 'USD').toUpperCase();
  const sym = currencySymbol(cur);
  if (cur === 'INR') {
    if (Math.abs(n) >= 1e7) return `${sym}${(n / 1e7).toFixed(1)}Cr`;
    if (Math.abs(n) >= 1e5) return `${sym}${(n / 1e5).toFixed(1)}L`;
    if (Math.abs(n) >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
  }
  if (Math.abs(n) >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
  return formatPrice(n, cur, { maximumFractionDigits: 0 });
}

export function sumByCurrency(items, valueFn = (i) => i.price * (i.shares || 1)) {
  const totals = {};
  for (const item of items) {
    const cur = resolveCurrency(item.symbol, item.currency);
    totals[cur] = (totals[cur] || 0) + (valueFn(item) || 0);
  }
  return totals;
}

export function formatMultiCurrencyTotals(totals) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  if (entries.length === 0) return formatPrice(0, 'USD');
  if (entries.length === 1) return formatPrice(entries[0][1], entries[0][0]);
  return entries.map(([cur, val]) => formatPrice(val, cur)).join(' + ');
}
