import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { generateTriLayerAnalysis } from '../../../lib/engine/confluence';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    // ── 1. Fetch all fundamental modules in parallel ───────────────────────
    const [quoteSummary, quoteData] = await Promise.all([
      yahooFinance.quoteSummary(symbol, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryProfile', 'price']
      }).catch(() => ({})),
      yahooFinance.quote(symbol).catch(() => null),
    ]);

    // ── 2. Build enriched financialData object ────────────────────────────
    const fd     = quoteSummary.financialData || {};
    const dks    = quoteSummary.defaultKeyStatistics || {};
    const prof   = quoteSummary.summaryProfile || {};
    const pr     = quoteSummary.price || {};

    const currentPrice  = fd.currentPrice || quoteData?.regularMarketPrice;
    const sharesOut     = dks.sharesOutstanding;
    const marketCap     = pr.marketCap || (currentPrice && sharesOut ? currentPrice * sharesOut : null);

    const financialData = {
      currentPrice,
      freeCashflow:       fd.freeCashflow,
      totalDebt:          fd.totalDebt,
      // Equity = Market Cap - Debt (proxy when book equity unavailable)
      totalStockholderEquity: fd.totalStockholderEquity || (marketCap && fd.totalDebt ? marketCap - fd.totalDebt : null),
      sharesOutstanding:  sharesOut,
      revenueGrowth:      fd.revenueGrowth,          // e.g. 0.12 → 12%
      sector:             prof.sector || '',
      industry:           prof.industry || '',
      longBusinessSummary: prof.longBusinessSummary || '',
      // Additional valuation metrics
      pe:  dks.trailingPE || (currentPrice && dks.trailingEps ? currentPrice / dks.trailingEps : null),
      pb:  pr.priceToBook || null,
      roe: fd.returnOnEquity || null,
      ebitdaMargins: fd.ebitdaMargins || null,
      grossMargins:  fd.grossMargins  || null,
    };

    // ── 3. Fetch 2-year daily price history for technicals ────────────────
    const history = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000),
      interval: '1d',
    }).then(res => res.quotes || []).catch(() => []);

    const priceData  = history.map(h => h.close).filter(v => v != null && !isNaN(v));
    const volumeData = history.map(h => h.volume).filter(v => v != null && !isNaN(v));

    // ── 4. Run the Tri-Layer Confluence Engine ────────────────────────────
    const analysis = await generateTriLayerAnalysis(symbol, priceData, volumeData, financialData);

    return NextResponse.json(analysis);

  } catch (err) {
    console.error('[Analyze]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
