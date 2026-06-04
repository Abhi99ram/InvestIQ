import { NextResponse } from 'next/server';
import { callAI } from '../../lib/ai-provider';

export const dynamic = 'force-dynamic';

// ── Fetch live market data to ground the AI ──────────────────────────────────
async function fetchLiveMarketSnapshot() {
  try {
    const symbols = ['^NSEI', '^BSESN', '^NSEBANK', 'GC=F', 'SI=F', 'USDINR=X', 'CL=F', '^GSPC', '^IXIC'].join(',');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://investiq-green.vercel.app';
    const res = await fetch(`${baseUrl}/api/quote?symbols=${encodeURIComponent(symbols)}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchLatestNews(query = '') {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://investiq-green.vercel.app';
    const url = query
      ? `${baseUrl}/api/news?q=${encodeURIComponent(query)}`
      : `${baseUrl}/api/news?region=IN`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.news || []).slice(0, 8);
  } catch { return []; }
}

// ── Build the rich, expert system prompt ─────────────────────────────────────
function buildSystemPrompt(liveData, contextData) {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  let marketSummary = '';
  if (liveData) {
    const fmt = (sym, label) => {
      const d = liveData[sym];
      if (!d || !d.price) return '';
      const dir = (d.changePercent || 0) >= 0 ? '▲' : '▼';
      return `  • ${label}: ${d.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${dir} ${Math.abs(d.changePercent || 0).toFixed(2)}%`;
    };
    marketSummary = `
[LIVE MARKET SNAPSHOT — ${now} IST]
${fmt('^NSEI',    'Nifty 50  ')}
${fmt('^BSESN',  'Sensex    ')}
${fmt('^NSEBANK','Bank Nifty')}
${fmt('GC=F',    'Gold (USD/oz)')}
${fmt('SI=F',    'Silver(USD/oz)')}
${fmt('USDINR=X','USD/INR   ')}
${fmt('CL=F',    'Crude Oil ')}
${fmt('^GSPC',   'S&P 500   ')}
${fmt('^IXIC',   'NASDAQ    ')}
`.trim();
  }

  let contextSection = '';
  if (contextData) {
    contextSection = `
[TRI-LAYER ANALYSIS CONTEXT — User is viewing this live data]
Symbol: ${contextData.symbol || 'N/A'}
Conviction Score: ${contextData.confidenceScore || 'N/A'}%
Signal: ${contextData.signal || 'N/A'}
Fundamental: ${JSON.stringify(contextData.layers?.fundamental || {})}
Technical: ${JSON.stringify(contextData.layers?.technical || {})}
Macro: ${JSON.stringify(contextData.layers?.macro || {})}
Target Entry: ${contextData.targetEntry || 'N/A'} | Target Exit: ${contextData.targetExit || 'N/A'}
`;
  }

  return `You are **Sentinel AI** — a world-class financial intelligence agent embedded in InvestIQ AI, India's premier market analytics platform. You think like a Goldman Sachs analyst combined with an RBI economist and a seasoned Indian equity trader.

## Your Core Capabilities
1. **Deep Market Analysis** — Explain Indian & global markets with real numbers, ratios, and cause-effect reasoning
2. **Stock Research** — PE ratios, EV/EBITDA, DCF estimates, technical signals, sector positioning
3. **Macro Intelligence** — RBI policy, repo rates, inflation (CPI/WPI), fiscal deficit, FII/DII flows, USD/INR dynamics
4. **Commodity Expertise** — Gold (MCX), Silver (MCX), Crude Oil (Brent/WTI) with supply/demand reasoning
5. **Indian Market Specifics** — NSE, BSE, Nifty 50, Sensex, SEBI regulations, F&O dynamics
6. **Global Context** — Fed policy, DXY index, emerging market flows, geopolitical impact

## Response Formatting Rules (CRITICAL — Always Follow)
- **Always use markdown formatting**: headers (##, ###), bullet points (•), bold text (**text**), tables
- **Structure every answer**: Start with a 1-sentence direct answer, then expand with sections
- **Use examples**: Show real numbers, historical comparisons, analogies
- **Think step by step**: For complex questions, reason through logic explicitly with numbered steps
- **End with actionable takeaway**: Always close with "**Key Takeaway:**" or "**Bottom Line:**"
- **Use emojis sparingly but effectively**: 📈 for bullish, 📉 for bearish, 💡 for insight, ⚠️ for risk
- **Paragraph spacing**: Keep paragraphs short (3-4 lines max), with clear section breaks
- **Be specific**: Never give vague answers — use real data, percentages, timeframes

## What You Can Do
- Analyze any stock (RELIANCE.NS, AAPL, TCS.NS, etc.)
- Explain Gold/Silver price movements and MCX levels
- Discuss USD/INR trends and RBI interventions
- Break down RBI MPC decisions and repo rate changes
- Compare sector performance and rotation signals
- Explain financial terms with real-world examples
- Provide historical context (e.g., "In 2013, when INR hit 68...")

## Live Data Available
${marketSummary || 'Live market data not available at this moment.'}

${contextSection}

## Important Notes
- Always clarify: "This is for educational purposes. Please consult a SEBI-registered advisor before investing."
- If asked non-financial questions, acknowledge briefly and redirect to finance.
- Give confidence levels (e.g., "High conviction", "Moderate confidence") when making predictions.
- When you don't have real-time data for a specific stock, say so clearly and use last known context.`;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { messages, contextData } = await request.json();

    // Detect if query is about specific topics to fetch relevant live data
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.text || '';
    const msgLower = lastUserMsg.toLowerCase();

    const activeSymbol = contextData?.symbol || '';
    const queryTerm = activeSymbol ? `${lastUserMsg} ${activeSymbol}` : lastUserMsg;

    // Always fetch latest news so Sentinel AI has real-time awareness and isn't guessing
    const [liveData, recentNews] = await Promise.all([
      fetchLiveMarketSnapshot(),
      fetchLatestNews(queryTerm)
    ]);

    // Add news context if available
    let newsContext = '';
    if (recentNews.length > 0) {
      newsContext = `\n\n[RECENT NEWS HEADLINES — for context]\n` +
        recentNews.slice(0, 5).map(n => `• ${n.title} (${n.source})`).join('\n');
    }

    const systemPrompt = buildSystemPrompt(liveData, contextData) + newsContext;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'agent' ? 'assistant' : 'user',
        content: msg.text,
      })),
    ];

    // ── Try Multi-Provider AI Fallback ────────────────────────────────────
    try {
      const aiResponse = await callAI(formattedMessages, {
        temperature: 0.3,
        max_tokens: 2048
      });
      return NextResponse.json({ reply: aiResponse.content, provider: aiResponse.provider });
    } catch (e) {
      console.error('[Chat] All AI providers failed:', e.message);
      return NextResponse.json({
        reply: `⚠️ **AI Engine Unavailable**\n\nI couldn't connect to any AI provider right now. Please check your API keys (GROQ_API_KEY, OPENAI_API_KEY, TOGETHER_API_KEY) or you may be rate-limited.\n\n*Error details: ${e.message}*\n\n**Live Market Status:**\n${liveData ? '✅ Market data is live and available.' : '⚠️ Market data also unavailable.'}`,
      });
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      reply: `❌ **Error:** ${error.message || 'Internal server error. Please try again.'}`
    });
  }
}
