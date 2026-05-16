import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import * as math from 'mathjs';
import { jStat } from 'jstat';

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

    // Use Indian 10Y if all assets are Indian, otherwise US 10Y
    const isAllIndian = portfolio.every(p => p.symbol.endsWith('.NS') || p.symbol.endsWith('.BO') || p.symbol === '^NSEI');
    const riskFreeRateAnnual = (isAllIndian ? IN10Y : US10Y) / 100;
    const equityRiskPremium = 0.055; 

    let T_years = periodValue || 1;
    if (periodUnit === 'Months') T_years = periodValue / 12;
    if (periodUnit === 'Weeks') T_years = periodValue / 52;
    if (periodUnit === 'Days') T_years = periodValue / 365;
    const T_steps = Math.max(Math.round(T_years * 12), 1);

    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const period10Yr = tenYearsAgo.toISOString().split('T')[0];

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const period5Yr = fiveYearsAgo.toISOString().split('T')[0];

    let benchmarks = getCached('BENCHMARKS');
    if (!benchmarks) {
      benchmarks = {};
      try {
        const [niftyHist, spxHist, goldHist] = await Promise.all([
          YahooFinance.historical('^NSEI', { period1: period10Yr, interval: '1mo' }).catch(() => []),
          YahooFinance.historical('^GSPC', { period1: period5Yr, interval: '1mo' }).catch(() => []),
          YahooFinance.historical('GC=F', { period1: period5Yr, interval: '1mo' }).catch(() => [])
        ]);
        benchmarks.nifty = niftyHist.map(h => h.close).filter(Boolean);
        benchmarks.spx = spxHist.map(h => h.close).filter(Boolean);
        benchmarks.gold = goldHist.map(h => h.close).filter(Boolean);
        setCache('BENCHMARKS', benchmarks);
      } catch (e) {
        benchmarks = { nifty: [], spx: [], gold: [] };
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
    const goldReturns = getReturns(benchmarks.gold);

    const assetData = [];
    await Promise.all(portfolio.map(async (p) => {
      const cacheKey = `ASSET_${p.symbol}`;
      let data = getCached(cacheKey);
      
      const isIndian = p.symbol.endsWith('.NS') || p.symbol.endsWith('.BO') || p.symbol === '^NSEI';
      const isMetal = p.symbol.includes('=F');
      const fetchPeriod = isIndian ? period10Yr : period5Yr;

      if (!data) {
        let quote = null;
        let hist = [];
        try {
          [quote, hist] = await Promise.all([
            YahooFinance.quote(p.symbol).catch(() => null),
            YahooFinance.historical(p.symbol, { period1: fetchPeriod, interval: '1mo' }).catch(() => [])
          ]);
        } catch (e) {}
        
        data = { quote, hist };
        if (quote && hist.length > 0) setCache(cacheKey, data);
      }

      const q = data.quote || {};
      const histPrices = data.hist.map(h => h.close).filter(Boolean);
      const rets = getReturns(histPrices);
      
      const price = q.regularMarketPrice || p.price;
      const weight = (p.shares * price) / totalInvested;
      
      let stdDevMonthly = 0;
      if (rets.length > 0) {
        stdDevMonthly = math.std(rets);
      } else {
        stdDevMonthly = 0.20 / Math.sqrt(12);
      }
      const stdDevAnnual = stdDevMonthly * Math.sqrt(12);
      
      let benchRets = spxReturns;
      if (isIndian) benchRets = niftyReturns;
      else if (isMetal) benchRets = goldReturns;
      
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

      const expectedReturnAnnual = riskFreeRateAnnual + beta * equityRiskPremium;
      const expectedReturnMonthly = Math.pow(1 + expectedReturnAnnual, 1/12) - 1;

      let liquidityPenalty = 0;
      if (q.averageVolume && q.marketCap) {
        const dailyTradedValue = q.averageVolume * price;
        const turnoverRatio = dailyTradedValue / q.marketCap;
        if (turnoverRatio < 0.001) liquidityPenalty = 0.02;
      }

      assetData.push({
        symbol: p.symbol,
        name: p.name,
        type: p.type,
        weight,
        targetWeight: weight,
        pe: q.trailingPE || 'N/A',
        beta,
        stdDevMonthly,
        stdDevAnnual,
        expectedReturnMonthly: expectedReturnMonthly - (liquidityPenalty/12),
        returns: rets,
        isLimitedData: histPrices.length < 12,
        liquidityPenalty
      });
    }));

    const N = assetData.length;
    let covMat = Array(N).fill(0).map(() => Array(N).fill(0));
    let corMat = Array(N).fill(0).map(() => Array(N).fill(0));
    
    // Intersection for correlation matrix (e.g. 5 yrs if mixed, 10 yrs if all Indian)
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
      for (let i = 0; i < N; i++) {
        covMat[i][i] = Math.pow(assetData[i].stdDevMonthly, 2);
        corMat[i][i] = 1;
      }
    }

    const buildCholesky = (covarianceMatrix) => {
      const regCov = covarianceMatrix.map((row, i) => row.map((val, j) => i === j ? val + 1e-6 : val));
      let L = Array(N).fill(0).map(() => Array(N).fill(0));
      try {
        for (let i = 0; i < N; i++) {
          for (let j = 0; j <= i; j++) {
            let sum = 0;
            for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
            if (i === j) L[i][j] = Math.sqrt(Math.max(regCov[i][i] - sum, 1e-10));
            else L[i][j] = (1.0 / L[j][j]) * (regCov[i][j] - sum);
          }
        }
      } catch(e) {
        L = Array(N).fill(0).map(() => Array(N).fill(0));
        for (let i = 0; i < N; i++) L[i][i] = Math.sqrt(Math.max(regCov[i][i], 1e-10));
      }
      return L;
    };

    const L_normal = buildCholesky(covMat);

    let crisisCovMat = Array(N).fill(0).map(() => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) {
          crisisCovMat[i][j] = Math.pow(assetData[i].stdDevMonthly, 2);
        } else {
          crisisCovMat[i][j] = 0.85 * assetData[i].stdDevMonthly * assetData[j].stdDevMonthly;
        }
      }
    }
    const L_crisis = buildCholesky(crisisCovMat);

    let portVar = 0;
    for(let i=0; i<N; i++) {
      for(let j=0; j<N; j++) {
        portVar += assetData[i].weight * assetData[j].weight * covMat[i][j] * 12;
      }
    }
    const portVolAnnual = Math.sqrt(Math.max(portVar, 0.0001));

    const M_PATHS = 10000;
    const terminalValues = new Float32Array(M_PATHS);
    const crisisTerminalValues = new Float32Array(M_PATHS);
    const tDistScale = Math.sqrt(3 / 5);

    for(let p = 0; p < M_PATHS; p++) {
      let currentVal = totalInvested;
      let crisisVal = totalInvested;
      let currentWeights = assetData.map(a => a.weight);
      
      for(let t = 0; t < T_steps; t++) {
        if (t > 0 && t % 12 === 0) {
          currentWeights = assetData.map(a => a.targetWeight);
        }

        const T_draws = Array(N).fill(0).map(() => jStat.studentt.inv(Math.random(), 5) * tDistScale);
        
        let portRetMonth = 0;
        let crisisRetMonth = 0;
        
        for(let i=0; i<N; i++) {
          let corrZ = 0;
          let corrZCrisis = 0;
          for(let j=0; j<=i; j++) {
            corrZ += L_normal[i][j] * T_draws[j];
            corrZCrisis += L_crisis[i][j] * T_draws[j];
          }
          
          let ret = assetData[i].expectedReturnMonthly + corrZ;
          let retCrisis = assetData[i].expectedReturnMonthly + corrZCrisis;
          
          portRetMonth += currentWeights[i] * ret;
          crisisRetMonth += currentWeights[i] * retCrisis;
        }
        
        currentVal *= (1 + portRetMonth);
        crisisVal *= (1 + crisisRetMonth);
      }
      terminalValues[p] = currentVal;
      crisisTerminalValues[p] = crisisVal;
    }

    terminalValues.sort();
    crisisTerminalValues.sort();
    
    const p5 = terminalValues[Math.floor(0.05 * M_PATHS)];
    const p10 = terminalValues[Math.floor(0.10 * M_PATHS)];
    const p50 = terminalValues[Math.floor(0.50 * M_PATHS)];
    const p90 = terminalValues[Math.floor(0.90 * M_PATHS)];

    const VaR_95 = Math.max(totalInvested - p5, 0);
    const crisisVaR_95 = Math.max(totalInvested - crisisTerminalValues[Math.floor(0.05 * M_PATHS)], 0);
    
    let tailSum = 0, tailCount = 0;
    for(let i=0; i<Math.floor(0.05 * M_PATHS); i++) {
      tailSum += terminalValues[i];
      tailCount++;
    }
    const CVaR_95 = Math.max(totalInvested - (tailSum / tailCount), 0);

    const HHI = assetData.reduce((sum, a) => sum + Math.pow(a.weight, 2), 0);
    
    let maxCorr = 0;
    for(let i=0; i<N; i++) {
      for(let j=i+1; j<N; j++) {
        if(corMat[i][j] > maxCorr) maxCorr = corMat[i][j];
      }
    }

    const nVol = Math.min(portVolAnnual / 0.40, 1) * 30;
    const nVix = Math.min(VIX / 40, 1) * 20;
    const nHHI = Math.min(HHI / 1.0, 1) * 25;
    const nCorr = Math.max(maxCorr, 0) * 25;
    
    let riskScore = Math.round(nVol + nVix + nHHI + nCorr);
    riskScore = Math.min(Math.max(riskScore, 0), 100);
    
    let riskLevel = 'Low';
    if(riskScore > 30) riskLevel = 'Moderate';
    if(riskScore > 50) riskLevel = 'High';
    if(riskScore > 70) riskLevel = 'Very High';

    let projectedCAGR = Math.pow(p50 / totalInvested, 1 / T_years) - 1;
    let inflationVal = Number(inflationRate) || 0;
    let realCAGR = includeInflation ? ((1 + projectedCAGR) / (1 + (inflationVal/100))) - 1 : projectedCAGR;
    let estimatedValueReal = includeInflation ? totalInvested * Math.pow(1 + realCAGR, T_years) : p50;

    const sharpeRatio = (projectedCAGR - riskFreeRateAnnual) / portVolAnnual;

    let pathsBelowMed = [];
    for(let p=0; p<M_PATHS; p++) {
      let r = Math.pow(terminalValues[p]/totalInvested, 1/T_years) - 1;
      if (r < riskFreeRateAnnual) pathsBelowMed.push(r);
    }
    let stdDownside = pathsBelowMed.length > 0 ? math.std(pathsBelowMed) : 0.001;
    if (stdDownside === 0) stdDownside = 0.001;
    let sortino = (projectedCAGR - riskFreeRateAnnual) / stdDownside;

    const stressTests = [
      { name: "2008 Financial Crisis", dropPct: 0.55, dropVal: totalInvested * 0.55 },
      { name: "2020 Covid Crash", dropPct: 0.35, dropVal: totalInvested * 0.35 },
      { name: "Crisis Correlation (r=0.85)", dropPct: crisisVaR_95 / totalInvested, dropVal: crisisVaR_95 }
    ];

    const distributionPoints = [];
    const step = Math.floor(M_PATHS / 50);
    for (let i = 0; i < M_PATHS; i += step) {
      distributionPoints.push(terminalValues[i]);
    }

    const metricsPayload = {
      assets: assetData.map(a => ({ symbol: a.symbol, weight: a.weight, beta: a.beta, pe: a.pe, isLimitedData: a.isLimitedData, liquidityPenalty: a.liquidityPenalty })),
      portVolAnnual, VaR_95, CVaR_95, riskScore, riskLevel, projectedCAGR, realCAGR, estimatedValueReal,
      p5, p10, p50, p90, sharpeRatio, sortino, HHI, stressTests, distributionPoints,
      macro: { VIX, US10Y, USDINR, riskFreeRateAnnual }
    };

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return generateFallback(metricsPayload, totalInvested);

    const prompt = `
You are a senior portfolio analyst at a top-tier asset management firm. You will receive a structured JSON of pre-computed quantitative metrics for a client's portfolio. Your role is to interpret these numbers, identify the most critical risks and opportunities, and produce a coherent, specific, and actionable investment recommendation. You are NOT allowed to recalculate numbers.

METRICS PAYLOAD:
${JSON.stringify(metricsPayload, null, 2)}

Produce ONLY a valid JSON object with the following exact keys:
{
  "narrativeSummary": "3-4 sentence plain-language summary of the portfolio's situation",
  "topRisk": "the single biggest risk in 1 sentence",
  "macroImpact": "how VIX and Yields are specifically affecting this portfolio",
  "suggestions": [
    {
      "action": "Reduce Reliance Industries by 15%",
      "reason": "Specific reason citing a metric from Layer 1",
      "probableResult": "Reduces portfolio volatility by ~2.3%",
      "urgency": "High"
    }
  ],
  "allocationVerdict": "Well-diversified | Concentrated | Overweight growth | Imbalanced"
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
    } catch(e) { throw new Error("Invalid AI JSON"); }

    return NextResponse.json({ metrics: metricsPayload, ai: parsedResult });

  } catch (error) {
    console.error('[Simulator AI Error]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateFallback(m, t) {
  let suggestions = [];
  if (m.riskScore > 70) suggestions.push({ action: "Reduce High-Beta Assets", reason: "Risk score exceeds 70.", probableResult: "Lowers volatility", urgency: "High" });
  if (m.HHI > 0.35) suggestions.push({ action: "Diversify Holdings", reason: `HHI of ${m.HHI.toFixed(2)} indicates extreme concentration.`, probableResult: "Reduces idiosyncratic risk.", urgency: "High" });
  if (m.macro.VIX > 25) suggestions.push({ action: "Add Defensive Assets", reason: "VIX implies high fear.", probableResult: "Hedges tail risk", urgency: "Medium" });
  if (suggestions.length === 0) suggestions.push({ action: "Hold Current Allocation", reason: "Risk is within normal bounds.", probableResult: "Maintains current trajectory", urgency: "Low" });

  return NextResponse.json({
    metrics: m,
    ai: {
      narrativeSummary: "Pure deterministic rule-based analysis executed. AI was unreachable.",
      topRisk: "High volatility limits short term prediction accuracy.",
      macroImpact: `VIX at ${m.macro.VIX} indicates current market sentiment.`,
      suggestions,
      allocationVerdict: m.HHI > 0.35 ? "Concentrated" : "Diversified"
    }
  });
}
