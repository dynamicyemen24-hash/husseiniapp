/**
 * Financial Ratios Engine - Core Calculation Utilities
 * ====================================================
 * Implements globally accepted financial ratio calculations per IFRS/GAAP standards.
 * Supports multi-company/multi-tenant environments with multi-currency FX revaluation.
 * All functions are pure, type-safe, and WCAG 2.1 accessible.
 */

import { safeToNumber, roundTo, approximatelyEqual } from "../numeric";
import type {
  RatioData,
  RatioInputs,
  CalculatedRatio,
  CurrencyCode,
  FxRate,
} from "./types";

/** Default precision for ratio calculations */
const RATIO_PRECISION = 4;

/**
 * قسمة آمنة: تُعيد `null` عندما يكون المقام صفراً أو غير صالح.
 * لا مقامات اصطناعية — النسبة غير القابلة للحساب تبقى غير معرّفة.
 */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  return roundTo(numerator / denominator, RATIO_PRECISION);
}

/**
 * نسبة مئوية آمنة: `null` عندما يكون المقام صفراً أو غير صالح.
 */
function percent(numerator: number, denominator: number): number | null {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? null : roundTo(ratio * 100, RATIO_PRECISION);
}

/** حالة النسبة من قيمتها (null = لا حكم). */
function statusFrom(
  value: number | null,
  favorable: number,
  neutral: number,
  higherBetter = true
): "favorable" | "unfavorable" | "neutral" {
  if (value === null) return "neutral";
  if (higherBetter) {
    return value >= favorable
      ? "favorable"
      : value >= neutral
        ? "neutral"
        : "unfavorable";
  }
  return value <= favorable
    ? "favorable"
    : value <= neutral
      ? "neutral"
      : "unfavorable";
}

/**
 * معدل إعادة تقييم آمن: أي قيمة غير صالحة أو غير موجبة تُعامل كـ 1
 * (بلا إعادة تقييم). كان `safeToNumber(rate) || 1` يحوّل الصفر إلى 1
 * بصمت — الشرط صريح الآن بدل الاعتماد على truthiness.
 */
function safeFxRate(fxRate: number | undefined): number {
  const parsed = safeToNumber(fxRate, 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Calculate Liquidity Ratios
 * - Current Ratio = Current Assets / Current Liabilities
 * - Quick Ratio = Quick Assets / Current Liabilities
 * - Cash Ratio = Cash / Current Liabilities
 */
export function calculateLiquidityRatios(inputs: RatioInputs): {
  currentRatio: CalculatedRatio;
  quickRatio: CalculatedRatio;
  cashRatio: CalculatedRatio;
} {
  const { data, fxRate = 1, showPercentages = false } = inputs;
  const { currentAssets, quickAssets, cash, currentLiabilities } = data;

  const safeFx = safeFxRate(fxRate);

  // Apply FX revaluation if multi-currency
  const fxCurrentAssets = currentAssets * safeFx;
  const fxQuickAssets = quickAssets * safeFx;
  const fxCash = cash * safeFx;
  const fxCurrentLiab = currentLiabilities * safeFx;

  const currentRatioValue = safeDivide(fxCurrentAssets, fxCurrentLiab);
  const quickRatioValue = safeDivide(fxQuickAssets, fxCurrentLiab);
  const cashRatioValue = safeDivide(fxCash, fxCurrentLiab);

  const currentRatio: CalculatedRatio = {
    key: "currentRatio",
    name: showPercentages ? "النسبة الحالية (%)" : "Current Ratio",
    value: currentRatioValue,
    percentage: showPercentages,
    higherBetter: true,
    status: statusFrom(currentRatioValue, 1.0, 0.0),
  };

  const quickRatio: CalculatedRatio = {
    key: "quickRatio",
    name: showPercentages ? "النسبة السريعة (%)" : "Quick Ratio",
    value: quickRatioValue,
    percentage: showPercentages,
    higherBetter: true,
    status: statusFrom(quickRatioValue, 0.5, 0.0),
  };

  const cashRatio: CalculatedRatio = {
    key: "cashRatio",
    name: showPercentages ? "نسبة النقد (%)" : "Cash Ratio",
    value: cashRatioValue,
    percentage: showPercentages,
    higherBetter: true,
    status: statusFrom(cashRatioValue, 0.2, 0.0),
  };

  return { currentRatio, quickRatio, cashRatio };
}

/**
 * Calculate Profitability Ratios
 * - Gross Margin = Gross Profit / Revenue
 * - Operating Margin = Operating Income / Revenue
 * - Net Profit Margin = Net Income / Revenue
 * - ROE = Net Income / Shareholder's Equity
 * - ROA = Net Income / Total Assets
 */
export function calculateProfitabilityRatios(inputs: RatioInputs): {
  grossMargin: CalculatedRatio;
  operatingMargin: CalculatedRatio;
  netProfitMargin: CalculatedRatio;
  roe: CalculatedRatio;
  roa: CalculatedRatio;
} {
  const { data, fxRate = 1, showPercentages = false } = inputs;
  const {
    grossProfit,
    revenue,
    operatingIncome,
    netIncome,
    totalEquity,
    totalAssets,
  } = data;

  const safeFx = safeFxRate(fxRate);

  // Apply FX revaluation to income statement items
  const fxGrossProfit = grossProfit * safeFx;
  const fxRevenue = revenue * safeFx;
  const fxOperatingIncome = operatingIncome * safeFx;
  const fxNetIncome = netIncome * safeFx;

  const grossMarginValue = percent(fxGrossProfit, fxRevenue);
  const operatingMarginValue = percent(fxOperatingIncome, fxRevenue);
  const netProfitMarginValue = percent(fxNetIncome, fxRevenue);
  const roeValue = percent(fxNetIncome, totalEquity * safeFx);
  const roaValue = percent(fxNetIncome, totalAssets * safeFx);

  const grossMargin: CalculatedRatio = {
    key: "grossMargin",
    name: showPercentages ? "هامش الربح الإجمالي (%)" : "Gross Margin",
    value: grossMarginValue,
    percentage: true,
    higherBetter: true,
    status: statusFrom(grossMarginValue, 30, 15),
  };

  const operatingMargin: CalculatedRatio = {
    key: "operatingMargin",
    name: showPercentages ? "هامش التشغيل (%)" : "Operating Margin",
    value: operatingMarginValue,
    percentage: true,
    higherBetter: true,
    status: statusFrom(operatingMarginValue, 20, 10),
  };

  const netProfitMargin: CalculatedRatio = {
    key: "netProfitMargin",
    name: showPercentages ? "هامش الربح الصافي (%)" : "Net Profit Margin",
    value: netProfitMarginValue,
    percentage: true,
    higherBetter: true,
    status: statusFrom(netProfitMarginValue, 15, 5),
  };

  const roe: CalculatedRatio = {
    key: "roe",
    name: showPercentages
      ? "عائد على حقوق الملكية (%)"
      : "Return on Equity (ROE)",
    value: roeValue,
    percentage: true,
    higherBetter: true,
    status: statusFrom(roeValue, 20, 10),
  };

  const roa: CalculatedRatio = {
    key: "roa",
    name: showPercentages ? "عائد على الأصول (%)" : "Return on Assets (ROA)",
    value: roaValue,
    percentage: true,
    higherBetter: true,
    status: statusFrom(roaValue, 5, 2),
  };

  return { grossMargin, operatingMargin, netProfitMargin, roe, roa };
}

/**
 * Calculate Efficiency Ratios
 * - Asset Turnover = Revenue / Total Assets
 * - Inventory Turnover = COGS / Average Inventory
 */
export function calculateEfficiencyRatios(inputs: RatioInputs): {
  assetTurnover: CalculatedRatio;
  inventoryTurnover: CalculatedRatio;
} {
  const { data, fxRate = 1, showPercentages = false } = inputs;
  const { totalSales, cogs, inventory } = data;
  const safeFx = safeFxRate(fxRate);

  const fxTotalSales = totalSales * safeFx;
  const fxCogs = cogs * safeFx;
  const fxInventory = inventory * safeFx;

  // Average inventory (if beginning and ending available, otherwise use ending)
  const avgInventory = fxInventory; // Simplified: use current inventory

  const assetTurnoverValue = safeDivide(
    fxTotalSales,
    data.totalAssets * safeFx
  );
  const inventoryTurnoverValue = safeDivide(fxCogs, avgInventory);

  const assetTurnover: CalculatedRatio = {
    key: "assetTurnover",
    name: showPercentages ? "دوران الأصول (%)" : "Asset Turnover",
    value: assetTurnoverValue,
    percentage: false,
    higherBetter: true,
    status: statusFrom(assetTurnoverValue, 1, 0.5),
  };

  const inventoryTurnover: CalculatedRatio = {
    key: "inventoryTurnover",
    name: showPercentages ? "دوران المخزون (%)" : "Inventory Turnover",
    value: inventoryTurnoverValue,
    percentage: false,
    higherBetter: true,
    status: statusFrom(inventoryTurnoverValue, 6, 3),
  };

  return { assetTurnover, inventoryTurnover };
}

/**
 * Calculate Solvency Ratios
 * - Debt-to-Equity = Total Liabilities / Total Equity
 * - Interest Coverage = EBIT / Interest Expense
 */
export function calculateSolvencyRatios(inputs: RatioInputs): {
  debtToEquity: CalculatedRatio;
  interestCoverage: CalculatedRatio;
} {
  const { data, fxRate = 1, showPercentages = false } = inputs;
  const { totalLiabilities, totalEquity } = data;
  const safeFx = safeFxRate(fxRate);

  const fxTotalLiab = totalLiabilities * safeFx;
  const fxTotalEquity = totalEquity * safeFx;

  // Simplified: interest expense would come from additional data
  const interestExpense = 0; // Placeholder - would need interest line from P&L

  const debtToEquityValue = safeDivide(fxTotalLiab, fxTotalEquity);
  const interestCoverageValue =
    interestExpense > 0 ? percent(fxTotalLiab, interestExpense) : null; // EBIT/Interest يحتاج بند فوائد من قائمة الدخل

  const debtToEquity: CalculatedRatio = {
    key: "debtToEquity",
    name: showPercentages ? "ديون إلى حقوق الملكية (%)" : "Debt-to-Equity",
    value: debtToEquityValue,
    percentage: false,
    higherBetter: false, // Lower D/E is better
    status: statusFrom(debtToEquityValue, 0.5, 1.0, false),
  };

  const interestCoverage: CalculatedRatio = {
    key: "interestCoverage",
    name: showPercentages ? "تغطية الفائدة (%)" : "Interest Coverage",
    value: interestCoverageValue,
    percentage: true,
    higherBetter: true,
    status: statusFrom(interestCoverageValue, 3.0, 1.5),
  };

  return { debtToEquity, interestCoverage };
}

/**
 * Apply FX revaluation impact to ratio data
 */
export function applyFXRevaluation(data: RatioData, fxRate: number): RatioData {
  const safeFx = safeFxRate(fxRate);
  return {
    currentAssets: data.currentAssets * safeFx,
    quickAssets: data.quickAssets * safeFx,
    cash: data.cash * safeFx,
    currentLiabilities: data.currentLiabilities * safeFx,
    totalAssets: data.totalAssets * safeFx,
    totalEquity: data.totalEquity * safeFx,
    totalLiabilities: data.totalLiabilities * safeFx,
    revenue: data.revenue * safeFx,
    grossProfit: data.grossProfit * safeFx,
    operatingIncome: data.operatingIncome * safeFx,
    netIncome: data.netIncome * safeFx,
    cogs: data.cogs * safeFx,
    totalExpenses: data.totalExpenses * safeFx,
    inventory: data.inventory * safeFx,
    totalSales: data.totalSales * safeFx,
  };
}

/**
 * Get all globally accepted financial ratios in one call
 */
export function calculateAllRatios(inputs: RatioInputs): CalculatedRatio[] {
  const liquidity = calculateLiquidityRatios(inputs);
  const profitability = calculateProfitabilityRatios(inputs);
  const efficiency = calculateEfficiencyRatios(inputs);
  const solvency = calculateSolvencyRatios(inputs);

  return [
    ...Object.values(liquidity),
    ...Object.values(profitability),
    ...Object.values(efficiency),
    ...Object.values(solvency),
  ];
}

/**
 * Compare ratios between two periods
 */
export function compareRatios(
  current: CalculatedRatio[],
  previous: CalculatedRatio[]
): {
  [key: string]: {
    change: number;
    status: "improved" | "declined" | "unchanged";
  };
} {
  const result: Record<
    string,
    { change: number; status: "improved" | "declined" | "unchanged" }
  > = {};

  current.forEach(currentRatio => {
    const prevRatio = previous.find(r => r.key === currentRatio.key);
    if (!prevRatio) return;
    // نسبة غير معرّفة في أي من الفترتين لا تُقارَن — نتجنّب أرقاماً مفبركة.
    if (currentRatio.value === null || prevRatio.value === null) {
      result[currentRatio.key] = { change: 0, status: "unchanged" };
      return;
    }
    const change = currentRatio.value - prevRatio.value;
    const isImproved = currentRatio.higherBetter ? change > 0 : change < 0;
    result[currentRatio.key] = {
      change: Math.round(change * 10000) / 10000,
      status: change === 0 ? "unchanged" : isImproved ? "improved" : "declined",
    };
  });

  return result;
}
