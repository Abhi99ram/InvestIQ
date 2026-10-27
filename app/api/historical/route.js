import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { resolveCurrency } from '../../../lib/market';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const cache = new Map();

const DAY = 24 * 3600000;
// lookback is longer than the visible range so weekends/holidays never leave a period empty
const PERIODS = {
  '1d': { lookback: 7 * DAY, interval: '1m', ttl: 10000, sessions: 1 },
  '1w': { lookback: 10 * DAY, interval: '5m', ttl: 30000, sessions: 5 },
  '1m': { lookback: 31 * DAY, interval: '30m', ttl: 60000 },
  '3m': { lookback: 92 * DAY, interval: '1d', ttl: 5 * 60000 },
  '6m': { lookback: 183 * DAY, interval: '1d', ttl: 5 * 60000 },
  '1y': { lookback: 366 * DAY, interval: '1d', ttl: 5 * 60000 },
  '5y': { lookback: 5 * 366 * DAY, interval: '1wk', ttl: 30 * 60000 },
};
const INTERVAL_SECONDS = { '1m': 60, '5m': 300, '30m': 1800, '1d': 86400, '1wk': 604800 };

// Exchange-local calendar date of a UTC timestamp, e.g. "2026-10-27"
const localDate = (ms, gmtoffset) => new Date(ms + gmtoffset * 1000).toISOString().slice(0, 10);

async function fetchChart(symbol, config) {
  const opts = { period1: new Date(Date.now() - config.lookback), interval: config.interval, includePrePost: false };
  try {
    return await yahooFinance.chart(symbol, opts);
  } catch (err) {
    // one retry: Yahoo intermittently drops requests
    await new Promise(r => setTimeout(r, 400));
    return yahooFinance.chart(symbol, opts);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period = PERIODS[searchParams.get('period')] ? searchParams.get('period') : '1y';
  if (!symbol) return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });

  const config = PERIODS[period];
  const cacheKey = `hist_${symbol}_${period}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < config.ttl) return NextResponse.json(cached.data);

  try {
    const result = await fetchChart(symbol, config);
    const meta = result.meta || {};
    const gmtoffset = meta.gmtoffset ?? 0;

    // Drop empty bars and the trailing in-progress tick; keep the order Yahoo gives (ascending time)
    let bars = (result.quotes || [])
      .filter(q => q.close != null && q.open != null && q.high != null && q.low != null)
      .map(q => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume || 0,
      }));

    // Yahoo appends the latest trade as a partial bar whose timestamp is not on the interval grid
    // (e.g. 18:12:45 on a 1m chart). Fold it into the bar it belongs to.
    const step = INTERVAL_SECONDS[config.interval];
    if (step < 86400 && bars.length > 1) {
      const last = bars[bars.length - 1];
      const bucket = Math.floor(last.time / step) * step;
      if (bucket !== last.time) {
        const prev = bars[bars.length - 2];
        if (prev.time === bucket) {
          prev.high = Math.max(prev.high, last.high);
          prev.low = Math.min(prev.low, last.low);
          prev.close = last.close;
          prev.volume += last.volume;
          bars.pop();
        } else {
          last.time = bucket;
        }
      }
    }

    // Keep only the most recent N trading sessions for intraday ranges (1D = today's session only)
    if (config.sessions) {
      const dates = [...new Set(bars.map(b => localDate(b.time * 1000, gmtoffset)))];
      const keep = new Set(dates.slice(-config.sessions));
      bars = bars.filter(b => keep.has(localDate(b.time * 1000, gmtoffset)));
    }

    const regular = meta.currentTradingPeriod?.regular;
    const data = {
      symbol,
      period,
      interval: config.interval,
      intervalSeconds: step,
      intraday: step < 86400,
      currency: resolveCurrency(symbol, meta.currency),
      exchangeTimezone: meta.exchangeTimezoneName || null,
      timezoneAbbr: regular?.timezone || meta.timezone || null,
      gmtoffset,
      session: regular ? { start: new Date(regular.start).getTime(), end: new Date(regular.end).getTime() } : null,
      bars,
      fetchedAt: Date.now(),
    };
    cache.set(cacheKey, { data, time: Date.now() });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
  } catch (err) {
    // Serve the last good response rather than blanking the chart when Yahoo hiccups
    if (cached) return NextResponse.json({ ...cached.data, stale: true });
    return NextResponse.json({ error: err.message, symbol }, { status: 502 });
  }
}
