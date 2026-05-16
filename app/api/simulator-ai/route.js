import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export async function POST(request) {
  let reqBody = {};
  try {
    reqBody = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { portfolio = [], periodValue = 1, periodUnit = 'Years', inflationRate = 6, includeInflation = true, totalInvested = 10000 } = reqBody;

  if (portfolio.length === 0) {
    return NextResponse.json({ error: 'Portfolio is empty' }, { status: 400 });
  }

  try {
    // LAYER 1: Fetch Real-Time Market Data for Portfolio
    const enrichedPortfolio = await Promise.all(portfolio.map(async (p) => {
      try {
        const quote = await YahooFinance.quote(p.symbol);
        return {
          ...p,
          pe: quote.trailingPE || 'N/A',
          changePct: quote.regularMarketChangePercent || 0,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 'N/A',
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 'N/A'
        };
      } catch (err) {
        return { ...p, pe: 'N/A', changePct: 0 };
      }
    }));

    // LAYER 2: Fetch Macro Indicators
    let vix = 15;
    let us10yr = 4.2;
    try {
      const [vixQuote, yieldQuote] = await Promise.all([
        YahooFinance.quote('^VIX').catch(() => ({ regularMarketPrice: 15 })),
        YahooFinance.quote('^TNX').catch(() => ({ regularMarketPrice: 4.2 }))
      ]);
      vix = vixQuote.regularMarketPrice;
      us10yr = yieldQuote.regularMarketPrice;
    } catch (e) {
      console.log("Macro fetch failed, using defaults");
    }

    const prompt = `
    You are an expert dual-layer financial AI intelligence engine designed to provide 90%+ accuracy on projections.
    
    Current Portfolio (Total Invested: ₹${totalInvested}):
    ${enrichedPortfolio.map(p => `- ${p.name} (${p.symbol}): ${p.shares} units at ₹${p.price} each (Total: ₹${p.price * p.shares}). Type: ${p.type}. Live Metrics: Daily Change ${p.changePct}%, P/E: ${p.pe}, 52W High: ${p.fiftyTwoWeekHigh}`).join('\n')}
    
    Simulation Parameters & Macro Environment:
    - Investment Horizon: ${periodValue} ${periodUnit}
    - Expected Inflation: ${includeInflation ? inflationRate + '%' : 'Not Included'}
    - Current Market Volatility (VIX): ${vix} (High > 20 means higher risk of drawdowns)
    - US 10-Year Yield: ${us10yr}% (Higher yield pressures equities, impacts gold)

    Please execute your Dual-Layer analysis:
    - Layer 1: Evaluate the individual performance, live technical metrics, and valuation (P/E) of each specific asset listed above. Give strict mathematical weightage to assets based on the amount invested in them.
    - Layer 2: Analyze real-world macroeconomic developments (VIX, Yields), inflation, and market conditions to project the portfolio's overall trajectory over the exactly stated horizon (${periodValue} ${periodUnit}). A 1-month horizon should have drastically different (smaller) growth than a 10-year horizon.

    Based on these combined layers, provide a highly realistic mathematical financial projection and specific reallocation strategy.
    
    Calculate and estimate:
    1. "projectedCAGR": Expected Compound Annual Growth Rate (number). For short periods (< 1 year), estimate the annualized rate.
    2. "riskLevel": Risk Level (string: Low, Moderate, High, or Very High).
    3. "riskScore": Risk Score (number: 0-100).
    4. "maxDrawdownPct": Maximum expected drawdown or value at risk in percentage (number).
    5. "estimatedValue": The final projected monetary value of the portfolio at the end of the period (number). E.g. if 1 month, it should be very close to the current totalInvested.
    6. "wealthGained": Net wealth gained or lost (number).
    7. "suggestions": An array of objects. Each object should have:
        - "action": string (e.g., "Reduce Tata Consultancy", "Increase Gold (COMEX)")
        - "reason": string (Explanation based on your Layer 1 and Layer 2 analysis)
        - "probableResult": string (e.g., "Lowers portfolio volatility by 5%")

    Return ONLY a valid JSON object matching the exact keys above. Do not wrap in markdown.
    `;

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY missing");
    }

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiResponse.json();
    
    if (aiData.error) {
      throw new Error("Groq API returned an error: " + JSON.stringify(aiData.error));
    }

    let resultText = aiData.choices[0].message.content.trim();
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsedResult = JSON.parse(resultText);
    parsedResult.wealthAtRisk = totalInvested * ((parsedResult.maxDrawdownPct || 10) / 100);

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error('[Simulator AI Error]', error.message);
    
    // Dynamic math fallback based on time if AI fails
    let years = periodValue || 1;
    if (periodUnit === 'Months') years = years / 12;
    if (periodUnit === 'Weeks') years = years / 52;
    if (periodUnit === 'Days') years = years / 365;

    const fallbackRate = 0.08; 
    const finalVal = totalInvested * Math.pow(1 + fallbackRate, years);

    return NextResponse.json({
      projectedCAGR: fallbackRate * 100,
      riskLevel: "Moderate",
      riskScore: 50,
      maxDrawdownPct: 15,
      estimatedValue: finalVal,
      wealthGained: finalVal - totalInvested,
      wealthAtRisk: totalInvested * 0.15,
      suggestions: [
        {
          action: "Optimize API Connectivity",
          reason: "The AI Intelligence API is currently unreachable. Real-time reallocation suggestions are paused.",
          probableResult: "System will rely on historical baseline metrics until connection is restored."
        }
      ]
    });
  }
}
