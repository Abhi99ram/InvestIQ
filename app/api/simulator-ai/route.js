import { NextResponse } from 'next/server';


export async function POST(request) {
  try {
    const { portfolio, years, monthlyContribution, inflationRate, includeInflation } = await request.json();

    if (!portfolio || portfolio.length === 0) {
      return NextResponse.json({ error: 'Portfolio is empty' }, { status: 400 });
    }

    const prompt = `
    You are an expert financial AI. Analyze the following portfolio and provide realistic projections.
    Portfolio:
    ${portfolio.map(p => `- ${p.name} (${p.symbol}): ${p.shares} units at ₹${p.price} each. Type: ${p.type}`).join('\n')}
    
    Simulation Parameters:
    - Time Horizon: ${years} years
    - Monthly SIP: ₹${monthlyContribution}
    - Expected Inflation: ${inflationRate}%

    Based on the current macroeconomic conditions and the historical performance of these asset classes (Equities, Commodities like Gold/Silver, Indices), calculate the following:
    1. A realistic expected CAGR (Compound Annual Growth Rate) in percentage for this specific portfolio blend.
    2. A Risk Level (Low, Moderate, High, or Very High).
    3. A Risk Score (0-100, where 100 is maximum risk).
    4. Maximum Value at Risk (Max Drawdown percentage) in a severe market crash.
    5. A brief 2-sentence rationale for these metrics.

    Return ONLY a valid JSON object with the following keys exactly:
    "projectedCAGR" (number), "riskLevel" (string), "riskScore" (number), "maxDrawdownPct" (number), "rationale" (string).
    Do not include markdown blocks like \`\`\`json.
    `;

    const groqApiKey = process.env.GROQ_API_KEY;
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const aiData = await aiResponse.json();
    let resultText = aiData.choices[0].message.content.trim();
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsedResult = JSON.parse(resultText);

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error('[Simulator AI Error]', error);
    // Fallback if AI fails
    return NextResponse.json({
      projectedCAGR: 12,
      riskLevel: "Moderate",
      riskScore: 50,
      maxDrawdownPct: 25,
      rationale: "Fallback analysis used due to AI timeout. Equities generally average 12% long-term, with a 25% max drawdown risk."
    });
  }
}
