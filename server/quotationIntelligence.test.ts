/**
 * server/quotationIntelligence.test.ts
 * Unit tests for the Quotation Intelligence Engine (pure, explainable).
 */
import { describe, expect, it } from "vitest";
import {
  benchmarkHistory,
  detectAnomalies,
  forecastWin,
  rankOptions,
  recommendActions,
  scoreQuotation,
  whatIfScenarios,
} from "./services/quotationIntelligence";

describe("scoreQuotation", () => {
  it("rewards competitive pricing and explains every dimension", () => {
    const s = scoreQuotation({
      grandTotal: 8500,
      marginPct: 22,
      benchmarkAvg: 10000,
      hasDeliveryTerms: true,
      hasPaymentTerms: true,
      hasWarrantyOrPenalty: false,
      alternativesCount: 1,
      negotiationRounds: 2,
      validityDaysLeft: 20,
    });
    expect(s.price).toBeGreaterThanOrEqual(85);
    expect(s.total).toBeGreaterThan(60);
    expect(s.reasons.length).toBeGreaterThan(3);
    expect(
      s.weights.price +
        s.weights.technical +
        s.weights.commercial +
        s.weights.risk
    ).toBeCloseTo(1);
  });

  it("penalizes expired validity and negative margin", () => {
    const s = scoreQuotation({
      grandTotal: 15000,
      marginPct: -5,
      benchmarkAvg: 10000,
      hasDeliveryTerms: false,
      hasPaymentTerms: false,
      hasWarrantyOrPenalty: false,
      alternativesCount: 0,
      negotiationRounds: 6,
      validityDaysLeft: -2,
    });
    expect(s.total).toBeLessThan(50);
    expect(s.reasons.join(" ")).toContain("انتهت صلاحية العرض");
  });
});

describe("rankOptions", () => {
  it("ranks desc and assigns 1-based ranks", () => {
    const r = rankOptions([
      { id: "a", label: "بديل أ", score: 60 },
      { id: "b", label: "بديل ب", score: 90 },
      { id: "c", label: "بديل ج", score: 75 },
    ]);
    expect(r.map(x => x.id)).toEqual(["b", "c", "a"]);
    expect(r[0].rank).toBe(1);
  });
});

describe("benchmarkHistory", () => {
  it("returns null without history and robust stats with history", () => {
    expect(benchmarkHistory([])).toBeNull();
    const b = benchmarkHistory([
      { id: 1, total: 9000 },
      { id: 2, total: 10000 },
      { id: 3, total: 11000 },
      { id: 4, total: 50000 }, // outlier — median resists it
    ])!;
    expect(b.historyCount).toBe(4);
    expect(b.fairValue).toBe(10500); // median of [9k,10k,11k,50k]
    expect(b.expectedLow).toBeLessThan(b.fairValue);
    expect(b.expectedHigh).toBeGreaterThan(b.fairValue);
  });

  it("computes win rate when outcomes exist", () => {
    const b = benchmarkHistory([
      { id: 1, total: 100, won: true },
      { id: 2, total: 200, won: false },
      { id: 3, total: 300, won: true },
      { id: 4, total: 400, won: true },
    ])!;
    expect(b.winRate).toBe(75);
  });
});

describe("detectAnomalies", () => {
  const history = [
    { id: 1, total: 10000 },
    { id: 2, total: 10100 },
    { id: 3, total: 9900 },
    { id: 4, total: 10050 },
    { id: 5, total: 9950 },
  ];

  it("flags statistical outliers", () => {
    const a = detectAnomalies({ grandTotal: 20000, marginPct: 10 }, history);
    expect(
      a.some(x => x.type === "price_outlier" && x.severity === "critical")
    ).toBe(true);
  });

  it("flags duplicates, manipulation discounts and negative margins", () => {
    const a = detectAnomalies(
      {
        grandTotal: 10000,
        marginPct: -2,
        itemsHash: "abc",
        discountPctTotal: 35,
      },
      [{ id: 9, total: 9000, itemsHash: "abc" }]
    );
    expect(a.some(x => x.type === "duplicate")).toBe(true);
    expect(a.some(x => x.type === "margin_manipulation")).toBe(true);
    expect(
      a.some(x => x.type === "negative_margin" && x.severity === "critical")
    ).toBe(true);
  });
});

describe("forecastWin", () => {
  it("stays within bounds and returns drivers", () => {
    const f = forecastWin({
      grandTotal: 9000,
      marginPct: 15,
      benchmarkAvg: 10000,
      scoreTotal: 80,
      negotiationRounds: 1,
      validityDaysLeft: 25,
      historyWinRate: 60,
    });
    expect(f.winProbability).toBeGreaterThan(50);
    expect(f.winProbability).toBeLessThanOrEqual(97);
    expect(f.expectedValue).toBeCloseTo(9000 * (f.winProbability / 100), 0);
    expect(f.drivers.length).toBeGreaterThan(0);
  });
});

describe("recommendActions", () => {
  it("prioritizes critical anomalies and fair-value correction", () => {
    const recs = recommendActions({
      doc: {
        lines: [
          { kind: "product", quantity: 1, unitPrice: 20000, costPrice: 15000 },
        ],
      },
      score: scoreQuotation({
        grandTotal: 20000,
        marginPct: 25,
        benchmarkAvg: 10000,
        hasDeliveryTerms: false,
        hasPaymentTerms: false,
        hasWarrantyOrPenalty: false,
        alternativesCount: 0,
        negotiationRounds: 0,
        validityDaysLeft: 20,
      }),
      benchmarks: {
        historyCount: 5,
        avgTotal: 10000,
        medianTotal: 10000,
        minTotal: 9000,
        maxTotal: 11000,
        stddev: 800,
        fairValue: 10000,
        expectedLow: 9200,
        expectedHigh: 10800,
        marginAvg: 20,
        winRate: 60,
      },
      anomalies: [
        {
          type: "price_outlier",
          severity: "critical",
          message: "شاذ",
          evidence: {},
        },
      ],
      forecast: {
        winProbability: 25,
        expectedValue: 5000,
        expectedCloseDays: 14,
        drivers: [],
      },
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].priority).toBe(1);
    expect(recs.some(r => r.rationale.length > 0 && r.evidence)).toBe(true);
  });
});

describe("whatIfScenarios", () => {
  it("simulates discount ladders with margin notes", () => {
    const s = whatIfScenarios({
      lines: [
        { kind: "service", quantity: 1, unitPrice: 1000, costPrice: 600 },
      ],
    });
    expect(s.length).toBe(4);
    expect(s[0].scenario).toBe("الوضع الحالي");
    expect(s[s.length - 1].resultTotal).toBeLessThan(s[0].resultTotal);
    expect(s.every(x => x.note.length > 0)).toBe(true);
  });
});
