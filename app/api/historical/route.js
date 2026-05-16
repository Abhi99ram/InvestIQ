import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const cache = new Map();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || '1y';
  if (!symbol) return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });

  // Short cache for intraday, longer for historical
  const TTL = (period === '1d' || period === '1w') ? 30000 : 5 * 60 * 1000;
  const cacheKey = `hist_${symbol}_${period}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < TTL) return NextResponse.json(cached.data);

  try {
    const periodMap = {
      '1d': { period1: new Date(Date.now() - 2 * 24 * 3600000), interval: '5m' },
      '1w': { period1: new Date(Date.now() - 7 * 24 * 3600000), interval: '15m' },
      '1m': { period1: new Date(Date.now() - 30 * 24 * 3600000), interval: '1d' },
      '3m': { period1: new Date(Date.now() - 90 * 24 * 3600000), interval: '1d' },
      '6m': { period1: new Date(Date.now() - 180 * 24 * 3600000), interval: '1d' },
      '1y': { period1: new Date(Date.now() - 365 * 24 * 3600000), interval: '1d' },
      '5y': { period1: new Date(Date.now() - 5 * 365 * 24 * 3600000), interval: '1wk' },
    };
    const config = periodMap[period] || periodMap['1y'];
    const result = await yahooFinance.chart(symbol, { period1: config.period1, interval: config.interval });
    const data = {
      symbol,
      period,
      interval: config.interval,
      quotes: (result.quotes || []).map(q => ({
        date: q.date, open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume,
      })).filter(q => q.close != null),
    };
    cache.set(cacheKey, { data, time: Date.now() });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message, symbol }, { status: 500 });
  }
}
