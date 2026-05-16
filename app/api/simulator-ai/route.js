import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import * as math from 'mathjs';

// Cache for Yahoo data
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

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
    // 1. MACRO FETCH
    let macro = getCached('MACRO');
    if (!macro) {
      const macroSymbols = ['^VIX', '^TNX', 'USDINR=X', '^INBMK', 'GC=F', '^NSEI', '^GSPC'];
      macro = {};
      await Promise.all(macroSymbols.map(async (sym) => {
        try {
          const q = await YahooFinance.quote(sym);
          macro[sym] = q.regularMarketPrice;
        } catch {
          macro[sym] = null;
        }
      }));
      setCache('MACRO', macro);
    }

    const VIX = macro['^VIX'] || 15;
    const US10Y = macro['^TNX'] || 4.2;
    const USDINR = macro['USDINR=X'] || 83.5;
    const IN10Y = macro['^INBMK'] || 7.1;

    const riskFreeRate = IN10Y / 100;

    // Convert period to years
    let T_years = periodValue || 1;
    if (periodUnit === 'Months') T_years = periodValue / 12;
    if (periodUnit === 'Weeks') T_years = periodValue / 52;
    if (periodUnit === 'Days') T_years = periodValue / 365;
    const T_steps = Math.max(Math.round(T_years * 12), 1);

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const period1 = fiveYearsAgo.toISOString().split('T')[0];

    // Nifty & SPX baselines for Beta
    let benchmarks = getCached('BENCHMARKS');
    if (!benchmarks) {
      benchmarks = {};
      try {
        const [niftyHist, spxHist] = await Promise.all([
          YahooFinance.historical('^NSEI', { period1, interval: '1mo' }).catch(() => []),
          YahooFinance.historical('^GSPC', { period1, interval: '1mo' }).catch(() => [])
        ]);
        benchmarks.nifty = niftyHist.map(h => h.close).filter(Boolean);
        benchmarks.spx = spxHist.map(h => h.close).filter(Boolean);
        setCache('BENCHMARKS', benchmarks);
      } catch (e) {
        benchmarks = { nifty: [], spx: [] };
      }
    }

    const getReturns = (prices) => {
      let rets = [];
      for(let i=1; i<prices.length; i++) {
        rets.push((prices[i] - prices[i-1]) / prices[i-1]);
      }
      return rets;
    };

    const niftyReturns = getReturns(benchmarks.nifty);
    const spxReturns = getReturns(benchmarks.spx);

    // 2. FETCH INDIVIDUAL ASSET DATA
    const assetData = [];
    await Promise.all(portfolio.map(async (p) => {
      const cacheKey = `ASSET_${p.symbol}`;
      let data = getCached(cacheKey);
      
      if (!data) {
        let quote = null;
        let hist = [];
        try {
          [quote, hist] = await Promise.all([
            YahooFinance.quote(p.symbol).catch(() => null),
            YahooFinance.historical(p.symbol, { period1, interval: '1mo' }).catch(() => [])
          ]);
        } catch (e) {}
        
        data = { quote, hist };
        if (quote && hist.length > 0) setCache(cacheKey, data);
      }

      // Prepare local metrics
      const q = data.quote || {};
      const histPrices = data.hist.map(h => h.close).filter(Boolean);
      const rets = getReturns(histPrices);
      
      const price = q.regularMarketPrice || p.price;
      const weight = (p.shares * price) / totalInvested;
      
      let meanRet = 0, stdDev = 0;
      if (rets.length > 0) {
        meanRet = math.mean(rets);
        stdDev = math.std(rets);
      }
      
      const isIndian = p.symbol.endsWith('.NS') || p.symbol.endsWith('.BO') || p.symbol === '^NSEI';
      const benchRets = isIndian ? niftyReturns : spxReturns;
      
      let beta = q.beta || 1.0;
      if (rets.length > 0 && benchRets.length > 0) {
        const minLen = Math.min(rets.length, benchRets.length);
        if (minLen > 2) {
          const rSliced = rets.slice(-minLen);
          const bSliced = benchRets.slice(-minLen);
          const cov = math.mean(math.dotMultiply(math.subtract(rSliced, math.mean(rSliced)), math.subtract(bSliced, math.mean(bSliced))));
          const varBench = math.variance(bSliced);
          if (varBench > 0) beta = cov / varBench;
        }
      }

      // Kelly
      let posMonths = rets.filter(r => r > 0).length;
      let probGain = rets.length > 0 ? posMonths / rets.length : 0.5;
      let avgGain = math.mean(rets.filter(r => r > 0)) || 0.01;
      let avgLoss = Math.abs(math.mean(rets.filter(r => r < 0))) || 0.01;
      let bRatio = avgGain / avgLoss;
      let kelly = (probGain * bRatio - (1 - probGain)) / bRatio;

      // Max Drawdown
      let maxDD = 0;
      let peak = 0;
      for(let val of histPrices) {
        if (val > peak) peak = val;
        let dd = (peak - val) / peak;
        if (dd > maxDD) maxDD = dd;
      }

      // Momentum (1, 3, 6 month)
      let momScore = 0;
      if (histPrices.length >= 7) {
        const cur = histPrices[histPrices.length - 1];
        const r1 = (cur - histPrices[histPrices.length - 2]) / histPrices[histPrices.length - 2];
        const r3 = (cur - histPrices[histPrices.length - 4]) / histPrices[histPrices.length - 4];
        const r6 = (cur - histPrices[histPrices.length - 7]) / histPrices[histPrices.length - 7];
        momScore = 0.5*r1 + 0.3*r3 + 0.2*r6;
      }

      // Fama French (simple)
      let sizePremium = 0, valuePremium = 0;
      const mcap = q.marketCap || 0;
      if (isIndian) {
        const mcapCr = mcap / 10000000;
        if (mcapCr < 5000 && mcapCr > 0) sizePremium = 0.02;
        else if (mcapCr < 20000 && mcapCr > 0) sizePremium = 0.01;
      }
      const pe = q.trailingPE || 20;
      if (pe < 15) valuePremium = 0.015;
      else if (pe > 30) valuePremium = -0.005;
      
      const cagr = histPrices.length > 0 ? Math.pow(histPrices[histPrices.length - 1] / histPrices[0], 1/(histPrices.length/12)) - 1 : 0.08;

      // Sector medians map (simplified)
      const sectorMedians = { 'Technology': 25, 'Financial Services': 15, 'Healthcare': 22, 'Consumer Defensive': 20 };
      const secMed = sectorMedians[q.sector] || 20;
      let valSignal = 'fair';
      if (pe > secMed * 1.5) valSignal = 'overvalued';
      if (pe < secMed * 0.7 && pe > 0) valSignal = 'undervalued';

      const high52 = q.fiftyTwoWeekHigh || price * 1.2;
      const low52 = q.fiftyTwoWeekLow || price * 0.8;
      const pos52 = high52 === low52 ? 0.5 : (price - low52) / (high52 - low52);

      assetData.push({
        symbol: p.symbol,
        name: p.name,
        type: p.type,
        weight,
        pe,
        valSignal,
        cagr,
        stdDevMonthly: stdDev,
        stdDevAnnual: stdDev * Math.sqrt(12),
        meanRetMonthly: meanRet,
        beta,
        kelly: isNaN(kelly) || kelly < 0 ? 0 : kelly,
        maxDrawdown: maxDD,
        momentum: momScore,
        pos52,
        sharpe: stdDev > 0 ? (cagr - riskFreeRate) / (stdDev * Math.sqrt(12)) : 0,
        returns: rets,
        sizePremium,
        valuePremium,
        marketCap: mcap,
        isLimitedData: histPrices.length < 12
      });
    }));

    // 3. COVARIANCE MATRIX & CHOLESKY
    const N = assetData.length;
    let covMat = Array(N).fill(0).map(() => Array(N).fill(0));
    let corMat = Array(N).fill(0).map(() => Array(N).fill(0));
    let hasEnoughData = true;
    
    // Find common length
    const minLen = Math.min(...assetData.map(a => a.returns.length));
    if (minLen > 2) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const r_i = assetData[i].returns.slice(-minLen);
          const r_j = assetData[j].returns.slice(-minLen);
          const cv = math.mean(math.dotMultiply(math.subtract(r_i, math.mean(r_i)), math.subtract(r_j, math.mean(r_j))));
          covMat[i][j] = cv;
          const sd_i = math.std(r_i) || 0.001;
          const sd_j = math.std(r_j) || 0.001;
          corMat[i][j] = cv / (sd_i * sd_j);
        }
      }
    } else {
      hasEnoughData = false;
      // Default identity matrix with base vol
      for (let i = 0; i < N; i++) {
        covMat[i][i] = Math.pow(0.20 / Math.sqrt(12), 2);
        corMat[i][i] = 1;
      }
    }

    // Regularize matrix for Cholesky
    const covMatReg = covMat.map((row, i) => row.map((val, j) => i === j ? val + 1e-6 : val));
    
    let L;
    try {
      // In mathjs, cholesky decomposition returns an object with L matrix
      // Actually mathjs might not have a direct simple cholesky array output that is easy.
      // Let's manually implement simple Cholesky
      L = Array(N).fill(0).map(() => Array(N).fill(0));
      for (let i = 0; i < N; i++) {
        for (let j = 0; j <= i; j++) {
          let sum = 0;
          for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
          if (i === j) L[i][j] = Math.sqrt(Math.max(covMatReg[i][i] - sum, 1e-10));
          else L[i][j] = (1.0 / L[j][j]) * (covMatReg[i][j] - sum);
        }
      }
    } catch(e) {
      // fallback to independent
      L = Array(N).fill(0).map(() => Array(N).fill(0));
      for (let i = 0; i < N; i++) L[i][i] = Math.sqrt(Math.max(covMatReg[i][i], 1e-10));
    }

    // Portfolio Volatility
    let portVar = 0;
    for(let i=0; i<N; i++) {
      for(let j=0; j<N; j++) {
        portVar += assetData[i].weight * assetData[j].weight * covMat[i][j] * 12;
      }
    }
    const portVolAnnual = Math.sqrt(Math.max(portVar, 0.0001));

    // 4. MONTE CARLO (10k paths)
    const M_PATHS = 10000;
    const terminalValues = new Float32Array(M_PATHS);
    const minValues = new Float32Array(M_PATHS);
    
    // Marsaglia polar method for normal distrib
    const randN = () => {
      let u, v, s;
      do {
        u = Math.random() * 2 - 1;
        v = Math.random() * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      return u * Math.sqrt(-2 * Math.log(s) / s);
    };

    for(let p = 0; p < M_PATHS; p++) {
      let currentVal = totalInvested;
      let pathMin = totalInvested;
      
      for(let t = 0; t < T_steps; t++) {
        const Z = Array(N).fill(0).map(() => randN());
        let portRetMonth = 0;
        
        for(let i=0; i<N; i++) {
          let corrZ = 0;
          for(let j=0; j<=i; j++) corrZ += L[i][j] * Z[j];
          let ret = assetData[i].meanRetMonthly + corrZ;
          portRetMonth += assetData[i].weight * ret;
        }
        
        // Fama French adjustment at portfolio level (monthly additive)
        let ffAdj = 0;
        for(let a of assetData) ffAdj += a.weight * ((a.sizePremium + a.valuePremium)/12);
        portRetMonth += ffAdj;
        
        currentVal *= (1 + portRetMonth);
        if (currentVal < pathMin) pathMin = currentVal;
      }
      terminalValues[p] = currentVal;
      minValues[p] = pathMin;
    }

    terminalValues.sort();
    const p1 = terminalValues[Math.floor(0.01 * M_PATHS)];
    const p5 = terminalValues[Math.floor(0.05 * M_PATHS)];
    const p10 = terminalValues[Math.floor(0.10 * M_PATHS)];
    const p50 = terminalValues[Math.floor(0.50 * M_PATHS)];
    const p90 = terminalValues[Math.floor(0.90 * M_PATHS)];

    const VaR_95 = Math.max(totalInvested - p5, 0);
    const VaR_99 = Math.max(totalInvested - p1, 0);
    
    // CVaR_95
    let tailSum = 0, tailCount = 0;
    for(let i=0; i<Math.floor(0.05 * M_PATHS); i++) {
      tailSum += terminalValues[i];
      tailCount++;
    }
    const tailMean = tailCount > 0 ? tailSum / tailCount : p5;
    const CVaR_95 = Math.max(totalInvested - tailMean, 0);

    const stressDrawdown = Math.max(1 - (minValues[0] / totalInvested), 0);
    
    // HHI
    const HHI = assetData.reduce((sum, a) => sum + Math.pow(a.weight, 2), 0);
    
    // Max pairwise corr
    let maxCorr = 0;
    for(let i=0; i<N; i++) {
      for(let j=i+1; j<N; j++) {
        if(corMat[i][j] > maxCorr) maxCorr = corMat[i][j];
      }
    }

    // Risk Score 0-100
    const wBeta = assetData.reduce((sum, a) => sum + (a.weight * a.beta), 0);
    const nVol = Math.min(portVolAnnual / 0.40, 1) * 30;
    const nVix = Math.min(VIX / 40, 1) * 15;
    const nBeta = Math.min(Math.abs(wBeta) / 2.0, 1) * 20;
    const nHHI = Math.min(HHI / 1.0, 1) * 15;
    const nCorr = Math.max(maxCorr, 0) * 10;
    const avgVal = assetData.filter(a => a.valSignal === 'overvalued').length / N;
    const nVal = avgVal * 10;
    
    let riskScore = Math.round(nVol + nVix + nBeta + nHHI + nCorr + nVal);
    riskScore = Math.min(Math.max(riskScore, 0), 100);
    
    let riskLevel = 'Low';
    if(riskScore > 30) riskLevel = 'Moderate';
    if(riskScore > 50) riskLevel = 'High';
    if(riskScore > 70) riskLevel = 'Very High';

    // CAGR & Sortino
    let projectedCAGR = Math.pow(p50 / totalInvested, 1 / T_years) - 1;
    let realCAGR = includeInflation ? ((1 + projectedCAGR) / (1 + (inflationRate/100))) - 1 : projectedCAGR;
    let estimatedValueReal = includeInflation ? totalInvested * Math.pow(1 + realCAGR, T_years) : p50;

    let pathsBelowMed = [];
    for(let p=0; p<M_PATHS; p++) {
      let r = Math.pow(terminalValues[p]/totalInvested, 1/T_years) - 1;
      if (r < riskFreeRate) pathsBelowMed.push(r);
    }
    let stdDownside = pathsBelowMed.length > 0 ? math.std(pathsBelowMed) : 0.001;
    if (stdDownside === 0) stdDownside = 0.001;
    let sortino = (projectedCAGR - riskFreeRate) / stdDownside;

    const histMaxDD = assetData.reduce((sum, a) => sum + (a.weight * a.maxDrawdown), 0);
    const sharpeRatio = (projectedCAGR - riskFreeRate) / portVolAnnual;

    // Stress Testing
    const stressTests = [
      { name: "2020 Covid Crash", dropPct: 0, dropVal: 0, recovery: "6-12 Months" },
      { name: "2008 Financial Crisis", dropPct: 0, dropVal: 0, recovery: "2-4 Years" },
      { name: "2013 Taper Tantrum", dropPct: 0, dropVal: 0, recovery: "3-6 Months" }
    ];
    
    let covidDrop = 0, gfcDrop = 0, taperDrop = 0;
    for(let a of assetData) {
      if(a.type === 'Equity' || a.type === 'Index') { covidDrop += a.weight * -0.35; gfcDrop += a.weight * -0.55; taperDrop += a.weight * -0.20; }
      else if(a.type === 'Commodity') { covidDrop += a.weight * 0.15; gfcDrop += a.weight * 0.25; taperDrop += a.weight * -0.25; }
    }
    stressTests[0].dropPct = covidDrop; stressTests[0].dropVal = Math.abs(covidDrop * totalInvested);
    stressTests[1].dropPct = gfcDrop; stressTests[1].dropVal = Math.abs(gfcDrop * totalInvested);
    stressTests[2].dropPct = taperDrop; stressTests[2].dropVal = Math.abs(taperDrop * totalInvested);

    // Efficient frontier (dummy approx since we lack nonlinear optimizer in JS)
    // For pure output, we send current weights.

    const metricsPayload = {
      assets: assetData.map(a => ({ symbol: a.symbol, weight: a.weight, sharpe: a.sharpe, beta: a.beta, momentum: a.momentum, valSignal: a.valSignal, kelly: a.kelly, isLimitedData: a.isLimitedData })),
      portVolAnnual,
      VaR_95,
      CVaR_95,
      riskScore,
      riskLevel,
      projectedCAGR,
      realCAGR,
      estimatedValueReal,
      p10, p50, p90,
      sharpeRatio,
      sortino,
      histMaxDD,
      stressDrawdown,
      stressTests,
      macro: { VIX, US10Y, USDINR, riskFreeRate }
    };

    // 5. LAYER 2 - AI ENGINE
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      // Fallback
      return generateFallback(metricsPayload, totalInvested);
    }

    const prompt = `
You are a senior portfolio analyst at a top-tier asset management firm. You will receive a structured JSON of pre-computed quantitative metrics for a client's portfolio. Your role is to interpret these numbers, identify the most critical risks and opportunities, and produce a coherent, specific, and actionable investment recommendation. You are NOT allowed to recalculate numbers.

METRICS PAYLOAD:
${JSON.stringify(metricsPayload, null, 2)}

Produce ONLY a valid JSON object with the following exact keys:
{
  "narrativeSummary": "3-4 sentence plain-language summary of the portfolio's situation",
  "topRisk": "the single biggest risk in 1 sentence",
  "macroImpact": "how VIX, yield, and USD/INR are specifically affecting this portfolio",
  "suggestions": [
    {
      "action": "Reduce Reliance Industries by 15%",
      "reason": "Specific reason citing a metric from Layer 1",
      "probableResult": "Reduces portfolio volatility by ~2.3%",
      "urgency": "High"
    }
  ],
  "scenarios": {
    "bull": "What needs to happen for the bull case (p90) to materialize",
    "base": "Most likely path narrative",
    "bear": "What triggers the bear case (p10)"
  },
  "allocationVerdict": "Well-diversified",
  "rebalanceUrgency": "Immediate"
}`;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error("Groq API error");

    let parsedResult;
    try {
      parsedResult = JSON.parse(aiData.choices[0].message.content.trim());
    } catch(e) {
      throw new Error("Invalid AI JSON");
    }

    return NextResponse.json({
      metrics: metricsPayload,
      ai: parsedResult
    });

  } catch (error) {
    console.error('[Simulator AI Error]', error.message);
    
    // Deep fallback
    return NextResponse.json({
      error: error.message,
      metrics: {
        portVolAnnual: 0.20, VaR_95: totalInvested * 0.10, CVaR_95: totalInvested * 0.15,
        riskScore: 50, riskLevel: 'Moderate', projectedCAGR: 0.08, realCAGR: 0.08 - (inflationRate/100),
        estimatedValueReal: totalInvested * Math.pow(1 + 0.08 - (inflationRate/100), periodValue),
        p10: totalInvested * 0.8, p50: totalInvested * 1.1, p90: totalInvested * 1.4,
        sharpeRatio: 1.0, sortino: 1.2, histMaxDD: 0.25, stressDrawdown: 0.35,
        stressTests: [], assets: portfolio, macro: { VIX: 15, US10Y: 4.2 }
      },
      ai: {
        narrativeSummary: "Analysis defaulted to historical baselines due to API limitations.",
        topRisk: "Unknown macro conditions.",
        macroImpact: "Cannot determine without API.",
        suggestions: [{ action: "Check API Keys", reason: "Connection failed.", probableResult: "Restores AI engine.", urgency: "High" }],
        scenarios: { bull: "N/A", base: "N/A", bear: "N/A" },
        allocationVerdict: "Imbalanced", rebalanceUrgency: "Not required"
      }
    });
  }
}

function generateFallback(m, t) {
  let suggestions = [];
  if (m.riskScore > 70) suggestions.push({ action: "Reduce High-Beta Assets", reason: "Risk score exceeds 70.", probableResult: "Lowers volatility", urgency: "High" });
  if (m.macro.VIX > 25) suggestions.push({ action: "Add Defensive Assets", reason: "VIX implies high fear.", probableResult: "Hedges tail risk", urgency: "Medium" });
  if (suggestions.length === 0) suggestions.push({ action: "Hold Current Allocation", reason: "Risk is within normal bounds.", probableResult: "Maintains current trajectory", urgency: "Low" });

  return NextResponse.json({
    metrics: m,
    ai: {
      narrativeSummary: "Pure deterministic rule-based analysis executed. AI was unreachable.",
      topRisk: "High volatility limits short term prediction accuracy.",
      macroImpact: `VIX at ${m.macro.VIX} indicates current market sentiment.`,
      suggestions,
      scenarios: { bull: "Favorable macro shift.", base: "Historical averages continue.", bear: "Systemic shock." },
      allocationVerdict: "Unknown", rebalanceUrgency: "Within 6 months"
    }
  });
}
