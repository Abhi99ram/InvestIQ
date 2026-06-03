import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { SECTORS } from '../../../lib/sectors';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance({ validation: { logErrors: false } });
const cache = new Map();
const CACHE_TTL = 30 * 1000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  const cacheKey = `search_${q}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return NextResponse.json(cached.data);

  try {
    let result;
    try {
      result = await yahooFinance.search(q);
    } catch (err) {
      if (err.name === 'FailedYahooValidationError' && err.result) {
        result = err.result;
      } else {
        throw err;
      }
    }
    
    const data = {
      results: (result.quotes || [])
        .filter(r => ['EQUITY', 'ETF', 'INDEX', 'FUTURE', 'CRYPTOCURRENCY', 'CURRENCY'].includes(r.quoteType))
        .map(r => ({ symbol: r.symbol, name: r.shortname || r.longname || r.symbol, exchange: r.exchange, type: r.quoteType }))
        .slice(0, 10)
    };
    cache.set(cacheKey, { data, time: Date.now() });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ results: [], error: err.message }); }
}
