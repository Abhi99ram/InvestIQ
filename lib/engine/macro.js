// Macro Overlay Engine (Layer 3) — Concise 1-2 line insights
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function mapSector(sector = '') {
  const s = sector.toLowerCase();
  if (s.includes('bank') || s.includes('financial') || s.includes('nbfc') || s.includes('insurance')) return 'Financial';
  if (s.includes('tech') || s.includes('software') || s.includes('it ') || s.includes('information')) return 'Technology';
  if (s.includes('pharma') || s.includes('health') || s.includes('drug') || s.includes('biotech')) return 'Healthcare';
  if (s.includes('oil') || s.includes('energy') || s.includes('gas') || s.includes('petroleum')) return 'Energy';
  if (s.includes('steel') || s.includes('metal') || s.includes('material') || s.includes('mining')) return 'Materials';
  if (s.includes('fmcg') || s.includes('consumer def') || s.includes('food') || s.includes('beverage')) return 'ConsumerDef';
  if (s.includes('auto') || s.includes('consumer cyc') || s.includes('retail')) return 'ConsumerCyc';
  if (s.includes('real estate') || s.includes('reit') || s.includes('housing')) return 'RealEstate';
  if (s.includes('util') || s.includes('power') || s.includes('electric')) return 'Utilities';
  if (s.includes('industrial') || s.includes('engineer') || s.includes('infra') || s.includes('construct')) return 'Industrials';
  return 'General';
}

async function fetchRobust(tickers) {
  for (const t of tickers) {
    try {
      const res = await yahooFinance.quote(t);
      if (res && res.regularMarketPrice > 0) return res;
    } catch {}
  }
  return null;
}

export async function fetchMacroEnvironment() {
  try {
    const [tnx, dxy, nsei, gold, crude, usdinr, vix] = await Promise.all([
      fetchRobust(['^TNX']),
      fetchRobust(['DX-Y.NYB']),
      fetchRobust(['^NSEI', '^BSESN']),
      fetchRobust(['GC=F', 'XAUUSD=X']),
      fetchRobust(['CL=F', 'BZ=F']),
      fetchRobust(['INR=X', 'USDINR=X']), // Priority to INR=X as requested
      fetchRobust(['^VIX'])
    ]);

    return {
      us10yr:   tnx?.regularMarketPrice   || 4.5,
      dxy:      dxy?.regularMarketPrice   || 104,
      nifty:    nsei?.regularMarketPrice  || 22000,
      niftyPct: nsei?.regularMarketChangePercent || 0,
      gold:     gold?.regularMarketPrice  || 2300,
      crude:    crude?.regularMarketPrice || 78,
      usdinr:   usdinr?.regularMarketPrice || 84,
      vix:      vix?.regularMarketPrice   || 15,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return { us10yr: 4.5, dxy: 104, nifty: 22000, niftyPct: 0, gold: 2300, crude: 78, usdinr: 84, vix: 15, updatedAt: new Date().toISOString() };
  }
}

export function analyzeMacro(m, rawSector = '') {
  const sector = mapSector(rawSector);
  const { us10yr, dxy, nifty, niftyPct, crude, usdinr, vix } = m;

  const vixHigh    = vix > 20;
  const niftyDir   = niftyPct >= 0.5 ? 'up' : niftyPct <= -0.5 ? 'down' : 'flat';
  const rupeeWeak  = usdinr > 84.5;
  const ratesHigh  = us10yr > 4.7;
  const oilHigh    = crude > 88;
  const oilLow     = crude < 70;
  const dxyStrong  = dxy > 103;

  let isFavorable = true;
  let catalyst = '';

  // VIX first — overrides everything if extreme
  if (vix > 28) {
    catalyst = `⚠️ VIX ${vix.toFixed(0)} — extreme market fear. Risk-off; most stocks face broad-based selling.`;
    isFavorable = false;
    return { isBullish: false, catalyst };
  }

  // Build 1 line based on sector + live data
  switch (sector) {
    case 'Technology':
    case 'Healthcare':
      if (rupeeWeak) {
        catalyst = `✅ USD/INR ₹${usdinr.toFixed(1)} — weak rupee boosts USD export earnings.`;
        isFavorable = true;
      } else {
        catalyst = `⚖️ USD/INR ₹${usdinr.toFixed(1)} — stable rupee; neutral for export revenues.`;
        isFavorable = true;
      }
      if (ratesHigh) catalyst += ` US 10yr ${us10yr.toFixed(2)}% — watch for FII outflows.`;
      break;

    case 'Financial':
      if (ratesHigh) {
        catalyst = `⚠️ US 10yr ${us10yr.toFixed(2)}% — elevated global rates may slow FII inflows; credit growth impact moderate.`;
        isFavorable = false;
      } else {
        catalyst = `✅ Rates moderate at ${us10yr.toFixed(2)}% — supportive for credit demand and NIM stability.`;
        isFavorable = true;
      }
      break;

    case 'Energy':
      if (oilHigh) {
        catalyst = `✅ Crude $${crude.toFixed(0)}/bbl — high oil prices boost upstream realizations and free cash flow.`;
        isFavorable = true;
      } else if (oilLow) {
        catalyst = `⚠️ Crude $${crude.toFixed(0)}/bbl — subdued oil limits realization gains for energy producers.`;
        isFavorable = false;
      } else {
        catalyst = `⚖️ Crude $${crude.toFixed(0)}/bbl — moderate oil; stable realization environment for energy sector.`;
        isFavorable = true;
      }
      break;

    case 'Materials':
      catalyst = oilHigh || crude > 80
        ? `⚖️ Crude $${crude.toFixed(0)} — domestic infra capex supporting metal demand despite global softness.`
        : `⚖️ Crude $${crude.toFixed(0)} — global commodity cycle soft; watch China PMI for recovery signal.`;
      isFavorable = true;
      break;

    case 'ConsumerDef':
    case 'ConsumerCyc':
      if (oilHigh) {
        catalyst = `⚠️ Crude $${crude.toFixed(0)}/bbl — high input/logistics costs may squeeze FMCG/consumer margins.`;
        isFavorable = false;
      } else if (rupeeWeak) {
        catalyst = `⚠️ USD/INR ₹${usdinr.toFixed(1)} — weak rupee raises import costs; watch gross margin compression.`;
        isFavorable = false;
      } else {
        catalyst = `✅ Oil $${crude.toFixed(0)}, USD/INR ₹${usdinr.toFixed(1)} — benign input cost environment for consumers.`;
        isFavorable = true;
      }
      break;

    case 'RealEstate':
      catalyst = `✅ India residential cycle in upcycle; USD/INR ₹${usdinr.toFixed(1)} stable — no major macro headwind.`;
      isFavorable = true;
      break;

    case 'Utilities':
      catalyst = oilLow
        ? `✅ Low crude $${crude.toFixed(0)} reduces fuel costs for thermal/gas utilities.`
        : `⚖️ Crude $${crude.toFixed(0)} — moderate fuel cost; regulatory tariff revision key watch.`;
      isFavorable = !oilHigh;
      break;

    case 'Industrials':
      catalyst = `⚖️ India infra capex cycle intact; crude $${crude.toFixed(0)} — input costs manageable for capital goods.`;
      isFavorable = !oilHigh;
      break;

    default:
      // General: use Nifty trend + VIX
      if (niftyDir === 'up') {
        catalyst = `✅ Nifty ${niftyPct >= 0 ? '+' : ''}${niftyPct.toFixed(2)}% — broad market positive; macro environment supportive.`;
        isFavorable = true;
      } else if (niftyDir === 'down') {
        catalyst = `⚠️ Nifty ${niftyPct.toFixed(2)}% — market under pressure${vixHigh ? `; VIX ${vix.toFixed(0)} elevated` : ''}.`;
        isFavorable = false;
      } else {
        catalyst = `⚖️ Nifty flat (${nifty.toLocaleString('en-IN')}), VIX ${vix.toFixed(0)} — sideways market, stock-specific moves dominate.`;
        isFavorable = true;
      }
  }

  // Append VIX warning if high but not extreme
  if (vixHigh && vix <= 28) catalyst += ` VIX ${vix.toFixed(0)} — volatility elevated, size positions accordingly.`;

  return { isBullish: isFavorable, catalyst };
}
