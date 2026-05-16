import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { generateTriLayerAnalysis } from '../../../lib/engine/confluence';
import { dispatchNotifications } from '../../../lib/engine/dispatch';

const yahooFinance = new YahooFinance();

export async function POST(request) {
  try {
    const { symbols } = await request.json();
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'symbols array required' }, { status: 400 });
    }

    const dispatchedAlerts = [];

    // Process all symbols sequentially to avoid rate limits
    for (const symbol of symbols) {
      try {
        const quoteSummary = await yahooFinance.quoteSummary(symbol, { 
          modules: ['financialData', 'defaultKeyStatistics', 'summaryProfile'] 
        }).catch(() => ({}));
        
        const financialData = {
          currentPrice: quoteSummary.financialData?.currentPrice,
          freeCashflow: quoteSummary.financialData?.freeCashflow,
          totalDebt: quoteSummary.financialData?.totalDebt,
          totalStockholderEquity: quoteSummary.defaultKeyStatistics?.sharesOutstanding * (quoteSummary.financialData?.currentPrice || 1),
          sharesOutstanding: quoteSummary.defaultKeyStatistics?.sharesOutstanding,
          revenueGrowth: quoteSummary.financialData?.revenueGrowth,
          sector: quoteSummary.summaryProfile?.sector
        };

        const queryOptions = { period1: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000), interval: '1d' };
        const history = await yahooFinance.chart(symbol, queryOptions).then(res => res.quotes || []).catch(() => []);
        const priceData = history.map(h => h.close).filter(Boolean);
        const volumeData = history.map(h => h.volume).filter(Boolean);

        const analysis = await generateTriLayerAnalysis(symbol, priceData, volumeData, financialData);
        
        // Check if High Conviction and Dispatch
        const dispatchResult = await dispatchNotifications(analysis);
        
        if (dispatchResult.dispatched) {
          dispatchedAlerts.push({
            symbol,
            confidence: analysis.confidenceScore,
            ...dispatchResult
          });
        }
      } catch (err) {
        console.error(`Error analyzing ${symbol} for dispatch:`, err);
      }
    }

    return NextResponse.json({ success: true, alerts: dispatchedAlerts });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
