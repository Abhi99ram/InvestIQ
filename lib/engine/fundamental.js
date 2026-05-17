// Fundamental Analysis Engine (Layer 1) — Concise 1-2 line insights
import { formatPrice, resolveCurrency } from '../market';

export function calculateDCF(fcf, growthRate, discountRate, terminalGrowthRate, sharesOutstanding) {
  if (!fcf || !sharesOutstanding || fcf <= 0) return null;
  let pvOfFCF = 0, projectedFCF = fcf;
  for (let year = 1; year <= 5; year++) {
    projectedFCF *= (1 + growthRate);
    pvOfFCF += projectedFCF / Math.pow(1 + discountRate, year);
  }
  const terminalValue = (projectedFCF * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  return (pvOfFCF + terminalValue / Math.pow(1 + discountRate, 5)) / sharesOutstanding;
}

export function analyzeFundamentals(financialData) {
  const fcf          = financialData?.freeCashflow;
  const shares       = financialData?.sharesOutstanding;
  const totalDebt    = financialData?.totalDebt;
  const totalEquity  = financialData?.totalStockholderEquity;
  const currentPrice = financialData?.currentPrice;
  const currency     = financialData?.currency || resolveCurrency(financialData?.symbol);
  const sector       = (financialData?.sector || '').toLowerCase();
  const revenueGrowth = financialData?.revenueGrowth;
  const roe          = financialData?.roe;

  const debtToEquity = (totalDebt && totalEquity) ? totalDebt / totalEquity : null;
  const marketCap    = (currentPrice && shares) ? currentPrice * shares : null;
  const fcfYield     = (fcf && marketCap) ? (fcf / marketCap) * 100 : null;

  // Sector-adjusted DCF
  let wacc = 0.10, growth = 0.08, terminal = 0.03;
  if (sector.includes('tech') || sector.includes('software') || sector.includes('it')) { growth = revenueGrowth > 0 ? Math.min(revenueGrowth, 0.20) : 0.12; wacc = 0.11; }
  else if (sector.includes('bank') || sector.includes('financial')) { growth = 0.10; wacc = 0.13; }
  else if (sector.includes('energy') || sector.includes('util')) { growth = 0.05; wacc = 0.09; }
  else if (revenueGrowth > 0) growth = Math.min(revenueGrowth, 0.15);

  const intrinsicValue = calculateDCF(fcf, growth, wacc, terminal, shares);
  const isUndervalued  = intrinsicValue ? currentPrice < intrinsicValue : false;
  const marginOfSafety = intrinsicValue ? ((intrinsicValue - currentPrice) / intrinsicValue) * 100 : 0;

  // ── Single crisp insight line ──────────────────────────────────────────────
  let trigger = '';

  if (intrinsicValue && currentPrice) {
    const mos = marginOfSafety.toFixed(1);
    if (marginOfSafety >= 20)       trigger = `✅ Undervalued by ${mos}% — CMP ${formatPrice(currentPrice, currency)} vs fair value ${formatPrice(intrinsicValue, currency)}.`;
    else if (marginOfSafety >= 0)   trigger = `⚖️ Fairly valued — CMP ${formatPrice(currentPrice, currency)} near fair value ${formatPrice(intrinsicValue, currency)} (${mos}% upside).`;
    else                            trigger = `⚠️ Overvalued by ${Math.abs(mos)}% — CMP ${formatPrice(currentPrice, currency)} exceeds DCF fair value ${formatPrice(intrinsicValue, currency)}.`;
  } else if (fcfYield !== null) {
    trigger = fcfYield > 3
      ? `✅ FCF yield ${fcfYield.toFixed(1)}% — healthy cash generation relative to market cap.`
      : `⚠️ Thin FCF yield ${fcfYield.toFixed(1)}% — watch revenue acceleration for improvement.`;
  } else {
    trigger = `⚖️ Insufficient FCF data for DCF. Use P/E and sector comparatives for valuation.`;
  }

  // Append one debt note if significant
  if (debtToEquity !== null && !sector.includes('bank') && !sector.includes('financial')) {
    if (debtToEquity > 2.5) trigger += ` High leverage (D/E ${debtToEquity.toFixed(1)}x) — monitor interest coverage.`;
    else if (debtToEquity < 0.5) trigger += ` Near debt-free (D/E ${debtToEquity.toFixed(1)}x).`;
  }

  const premiumDiscount = intrinsicValue && currentPrice
    ? ((currentPrice - intrinsicValue) / intrinsicValue) * 100
    : null;

  let isFundamentallyStrong = isUndervalued && (debtToEquity === null || debtToEquity < 2) && (fcfYield === null || fcfYield > 2);
  let verdict = 'Neutral';

  if (intrinsicValue && currentPrice) {
    if (currentPrice > intrinsicValue) {
      isFundamentallyStrong = false;
      verdict = 'Overvalued';
    } else if (premiumDiscount != null && premiumDiscount > 15) {
      isFundamentallyStrong = false;
      verdict = 'Overvalued';
    } else if (marginOfSafety >= 15) {
      verdict = 'Undervalued';
    } else {
      verdict = 'Fair Value';
    }
  }

  return {
    intrinsicValue,
    currentPrice,
    marginOfSafety,
    premiumDiscount,
    debtToEquity,
    fcfYield,
    revenueGrowth,
    roe,
    currency,
    isUndervalued,
    verdict,
    isBullish: isFundamentallyStrong,
    trigger,
  };
}
