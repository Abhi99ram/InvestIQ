import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { resolveCurrency } from '../../../lib/market';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const cache = new Map();

function getCached(key, ttl) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < ttl) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// 4-layer redundant real-time USD/INR fetcher with NO static fallback
async function fetchLiveUSDINR() {
  // Source 1: Yahoo Finance
  try {
    const quote = await yahooFinance.quote('USDINR=X');
    if (quote && quote.regularMarketPrice) {
      return quote.regularMarketPrice;
    }
  } catch (e) {
    console.error('Yahoo Finance USDINR=X quote fetch failed:', e.message);
  }

  // Source 2: open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.rates && data.rates.INR) {
      return data.rates.INR;
    }
  } catch (e) {
    console.error('Open ER-API USD/INR fetch failed:', e.message);
  }

  // Source 3: exchangerate-api.com
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    if (data && data.rates && data.rates.INR) {
      return data.rates.INR;
    }
  } catch (e) {
    console.error('ExchangeRate-API USD/INR fetch failed:', e.message);
  }

  // Source 4: fawazahmed0 currency-api
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    const data = await res.json();
    if (data && data.usd && data.usd.inr) {
      return data.usd.inr;
    }
  } catch (e) {
    console.error('Fawazahmed0 Currency-API USD/INR fetch failed:', e.message);
  }

  throw new Error('All 4 real-time exchange rate sources failed.');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols');
  if (!symbols) return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
  const isSingleStock = symbolList.length === 1;
  const TTL = isSingleStock ? 2000 : 15000;

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
          currency: resolveCurrency(symbol, quote.currency),
          marketState: quote.marketState,
          fetchedAt: new Date().toISOString(),
        };
        setCache(`quote_${symbol}`, data);
        return { symbol, data };
      } catch (err) { return { symbol, data: { symbol, error: err.message } }; }
    });
    const fetched = await Promise.all(fetchPromises);
    for (const { symbol, data } of fetched) { results[symbol] = data; }
  }

  // Always fetch the live real-time USD/INR rate from our 4 redundant layers
  // and inject it into the response as standard 'USDINR=X' so the frontend has it 100% of the time!
  try {
    const liveRate = await fetchLiveUSDINR();
    results['USDINR=X'] = {
      symbol: 'USDINR=X',
      name: 'USD/INR Forex',
      price: liveRate,
      currency: 'INR',
      exchange: 'FOREX',
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Failed to resolve live USD/INR exchange rate:', err.message);
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  });
}
