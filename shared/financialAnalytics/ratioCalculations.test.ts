import { describe, expect, it } from "vitest";
import {
  applyFXRevaluation,
  calculateAllRatios,
  calculateEfficiencyRatios,
  calculateLiquidityRatios,
  calculateProfitabilityRatios,
  calculateSolvencyRatios,
  compareRatios,
} from "./ratioCalculations";
import type { RatioData } from "./types";

/**
 * shared/financialAnalytics/ratioCalculations.test.ts
 * ==========================================================================
 * العقد الحاسم: النسبة التي لا يمكن حسابها يجب أن تكون `null` — لا رقم
 * مفبرك. قبل هذا الإصلاح كان المقام `0.001` يُنتج نسباً مضللة (مثلاً
 * "نسبة سيولة 1000×" لمؤسسة بلا التزامات).
 */

const data: RatioData = {
  currentAssets: 100,
  quickAssets: 70,
  cash: 30,
  currentLiabilities: 50,
  totalAssets: 400,
  totalEquity: 200,
  totalLiabilities: 200,
  revenue: 1000,
  grossProfit: 400,
  operatingIncome: 200,
  netIncome: 150,
  cogs: 600,
  totalExpenses: 850,
  inventory: 30,
  totalSales: 1000,
};

const period = {
  id: "current" as const,
  label: "الفترة",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-12-31"),
};

describe("ratio engine — liquidity", () => {
  it("computes the standard liquidity ratios", () => {
    const r = calculateLiquidityRatios({ data, period });
    expect(r.currentRatio.value).toBe(2);
    expect(r.quickRatio.value).toBe(1.4);
    expect(r.cashRatio.value).toBe(0.6);
  });

  it("returns null (not a fabricated number) when liabilities are zero", () => {
    const r = calculateLiquidityRatios({
      data: { ...data, currentLiabilities: 0 },
      period,
    });
    expect(r.currentRatio.value).toBeNull();
    expect(r.quickRatio.value).toBeNull();
    expect(r.cashRatio.value).toBeNull();
    expect(r.currentRatio.status).toBe("neutral");
  });

  it("applies the FX revaluation rate to both sides of the ratio", () => {
    const r = calculateLiquidityRatios({ data, period, fxRate: 2 });
    expect(r.currentRatio.value).toBe(2); // (200 / 100) — نسبة بلا أثر
  });
});

describe("ratio engine — profitability", () => {
  it("computes margins and returns as percentages", () => {
    const r = calculateProfitabilityRatios({ data, period });
    expect(r.grossMargin.value).toBe(40);
    expect(r.operatingMargin.value).toBe(20);
    expect(r.netProfitMargin.value).toBe(15);
    expect(r.roe.value).toBe(75);
    expect(r.roa.value).toBe(37.5);
  });

  it("returns null when the denominator is zero instead of dividing by a fake number", () => {
    const r = calculateProfitabilityRatios({
      data: {
        ...data,
        revenue: 0,
        grossProfit: 0,
        operatingIncome: 0,
        netIncome: 0,
      },
      period,
    });
    expect(r.grossMargin.value).toBeNull();
    expect(r.operatingMargin.value).toBeNull();
    expect(r.netProfitMargin.value).toBeNull();
    // ROE/ROA تبقى قابلة للحساب لأن حقوق الملكية والأصول غير صفرية
    expect(r.roe.value).toBe(0);
    expect(r.roa.value).toBe(0);

    const noEquity = calculateProfitabilityRatios({
      data: { ...data, totalEquity: 0, totalAssets: 0 },
      period,
    });
    expect(noEquity.roe.value).toBeNull();
    expect(noEquity.roa.value).toBeNull();
  });

  it("marks a strong margin as favorable and a weak one as unfavorable", () => {
    const strong = calculateProfitabilityRatios({ data, period });
    expect(strong.netProfitMargin.status).toBe("favorable");

    const weak = calculateProfitabilityRatios({
      data: { ...data, netIncome: 10 },
      period,
    });
    expect(weak.netProfitMargin.status).toBe("unfavorable");
  });
});

describe("ratio engine — efficiency & solvency", () => {
  it("computes turnover ratios and nulls them when the base is zero", () => {
    const r = calculateEfficiencyRatios({ data, period });
    expect(r.assetTurnover.value).toBe(2.5);
    expect(r.inventoryTurnover.value).toBe(20);

    const zero = calculateEfficiencyRatios({
      data: { ...data, totalAssets: 0, inventory: 0 },
      period,
    });
    expect(zero.assetTurnover.value).toBeNull();
    expect(zero.inventoryTurnover.value).toBeNull();
  });

  it("computes debt-to-equity and treats a lower ratio as better", () => {
    const r = calculateSolvencyRatios({ data, period });
    expect(r.debtToEquity.value).toBe(1);
    expect(r.debtToEquity.higherBetter).toBe(false);
    expect(r.interestCoverage.value).toBeNull(); // لا يوجد بند فوائد
  });
});

describe("ratio engine — aggregate helpers", () => {
  it("calculateAllRatios returns every ratio keyed uniquely", () => {
    const all = calculateAllRatios({ data, period });
    const keys = all.map(r => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("currentRatio");
    expect(keys).toContain("netProfitMargin");
    expect(keys).toContain("debtToEquity");
  });

  it("compareRatios reports improved/declined/unchanged", () => {
    const current = calculateAllRatios({ data, period });
    const previous = calculateAllRatios({
      data: { ...data, currentAssets: 50, currentLiabilities: 50 },
      period,
    });
    const diff = compareRatios(current, previous);
    expect(diff.currentRatio.change).toBe(1);
    expect(diff.currentRatio.status).toBe("improved");
  });

  it("compareRatios treats a null ratio as unchanged (no fabricated delta)", () => {
    const current = calculateAllRatios({ data, period });
    const previous = calculateAllRatios({
      data: { ...data, currentLiabilities: 0 },
      period,
    });
    const diff = compareRatios(current, previous);
    expect(diff.currentRatio.change).toBe(0);
    expect(diff.currentRatio.status).toBe("unchanged");
  });

  it("compareRatios ignores ratios that do not exist in the previous period", () => {
    const current = calculateAllRatios({ data, period });
    const diff = compareRatios(current, []);
    expect(Object.keys(diff)).toHaveLength(0);
  });

  it("applyFXRevaluation scales every line by the rate", () => {
    const revalued = applyFXRevaluation(data, 2);
    expect(revalued.currentAssets).toBe(200);
    expect(revalued.revenue).toBe(2000);
    // A zero/invalid rate means "no revaluation" (rate 1) — never a silent
    // zero-scale of the whole statement.
    expect(applyFXRevaluation(data, 0).revenue).toBe(1000);
    expect(applyFXRevaluation(data, NaN).revenue).toBe(1000);
  });
});
