import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const cache = new Map();

// 5-second cache for single stocks (live view), 30-second for batch
function getCached(key, ttl) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < ttl) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols');
  if (!symbols) return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const isSingleStock = symbolList.length === 1;
  // Single stock = 5s cache (real-time), batch = 30s cache (dashboard)
  const TTL = isSingleStock ? 5000 : 30000;

  const results = {};
  const toFetch = [];

  for (const symbol of symbolList) {
    const cached = getCached(`quote_${symbol}`, TTL);
    if (cached) { results[symbol] = cached; } else { toFetch.push(symbol); }
  }

  if (toFetch.length > 0) {
    const fetchPromises = toFetch.map(async (symbol) => {
      try {
        const quote = await yahooFinance.quote(symbol);
        const COMMODITY_MAP = { 'GC=F': 'Gold', 'SI=F': 'Silver', 'CL=F': 'Crude Oil', 'BZ=F': 'Brent Crude', 'NG=F': 'Natural Gas' };
        const data = {
          symbol: quote.symbol, name: COMMODITY_MAP[symbol] || quote.shortName || quote.longName || symbol,
          price: quote.regularMarketPrice, change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          previousClose: quote.regularMarketPreviousClose, open: quote.regularMarketOpen,
          dayHigh: quote.regularMarketDayHigh, dayLow: quote.regularMarketDayLow,
          volume: quote.regularMarketVolume, marketCap: quote.marketCap,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh, fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
          pe: quote.trailingPE, eps: quote.epsTrailingTwelveMonths,
          dividendYield: quote.dividendYield, exchange: quote.exchange,
          currency: quote.currency, marketState: quote.marketState,
          fetchedAt: new Date().toISOString(),
        };
        setCache(`quote_${symbol}`, data);
        return { symbol, data };
      } catch (err) { return { symbol, data: { symbol, error: err.message } }; }
    });
    const fetched = await Promise.all(fetchPromises);
    for (const { symbol, data } of fetched) { results[symbol] = data; }
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  });
}
