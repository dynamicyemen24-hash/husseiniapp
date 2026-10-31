/**
 * server/quotationEngine.test.ts
 * Unit tests for the Universal Quotation Pricing Engine (pure functions).
 */
import { describe, expect, it } from "vitest";
import {
  computeDocument,
  computeLine,
  simulateWhatIf,
  validateDocument,
} from "./services/quotationEngine";

describe("computeLine", () => {
  it("computes gross → discount → net → tax → total", () => {
    const l = computeLine({
      kind: "product",
      quantity: 2,
      unitPrice: 1000,
      discountPct: 10,
      taxPct: 15,
    });
    expect(l.gross).toBe(2000);
    expect(l.discount).toBe(200);
    expect(l.net).toBe(1800);
    expect(l.tax).toBe(270);
    expect(l.lineTotal).toBe(2070);
  });

  it("clamps discount pct to 100 and fixed discount to remaining net", () => {
    const l = computeLine({
      kind: "service",
      quantity: 1,
      unitPrice: 500,
      discountPct: 150,
      discountAmount: 9999,
    });
    expect(l.net).toBe(0);
    expect(l.lineTotal).toBe(0);
  });

  it("tracks cost and margin per line", () => {
    const l = computeLine({
      kind: "product",
      quantity: 4,
      unitPrice: 100,
      costPrice: 60,
    });
    expect(l.lineCost).toBe(240);
    expect(l.lineMargin).toBe(160);
    expect(l.lineMarginPct).toBe(40);
  });
});

describe("computeDocument", () => {
  const doc = {
    lines: [
      {
        kind: "product",
        quantity: 2,
        unitPrice: 1000,
        costPrice: 600,
        taxPct: 15,
      },
      {
        kind: "service",
        quantity: 1,
        unitPrice: 500,
        costPrice: 200,
        discountPct: 10,
      },
    ],
    headerDiscountPct: 5,
    parties: [{ role: "broker", commissionPct: 2 }],
    currencyRate: 1,
  };

  it("aggregates subtotal, header discount, taxes, commissions, margin", () => {
    const c = computeDocument(doc);
    // line1 net=2000 tax=300; line2 net=450; subtotal=2450
    expect(c.subtotal).toBe(2450);
    // header 5% = 122.5 → taxable base 2327.5, line tax preserved 300
    expect(c.taxableBase).toBe(2327.5);
    expect(c.taxTotal).toBe(300);
    expect(c.grandTotal).toBe(2627.5);
    // commission 2% of 2327.5 = 46.55
    expect(c.commissionTotal).toBe(46.55);
    // cost = 1200+200=1400; margin = 2327.5-1400 = 927.5
    expect(c.costTotal).toBe(1400);
    expect(c.marginTotal).toBe(927.5);
  });

  it("applies header tax fallback only when lines carry no tax", () => {
    const c = computeDocument({
      lines: [{ kind: "subscription", quantity: 12, unitPrice: 100 }],
      headerTaxPct: 10,
    });
    expect(c.taxTotal).toBe(120);
    expect(c.grandTotal).toBe(1320);
  });

  it("converts to base currency", () => {
    const c = computeDocument({
      lines: [{ kind: "product", quantity: 1, unitPrice: 100 }],
      currencyRate: 500,
    });
    expect(c.baseTotal).toBe(50000);
  });
});

describe("validateDocument", () => {
  it("errors on empty lines and bad quantities", () => {
    expect(validateDocument({ lines: [] })[0].code).toBe("EMPTY_LINES");
    const issues = validateDocument({
      lines: [{ kind: "product", quantity: 0, unitPrice: 10 }],
    });
    expect(
      issues.some(i => i.code === "BAD_QTY" && i.severity === "error")
    ).toBe(true);
  });

  it("warns on high discount and negative margin", () => {
    const issues = validateDocument({
      lines: [
        {
          kind: "service",
          quantity: 1,
          unitPrice: 100,
          costPrice: 150,
          discountPct: 60,
        },
      ],
    });
    expect(issues.some(i => i.code === "HIGH_DISCOUNT")).toBe(true);
    expect(issues.some(i => i.code === "NEG_MARGIN")).toBe(true);
  });
});

describe("simulateWhatIf", () => {
  it("recomputes under discount/cost deltas", () => {
    const base = {
      lines: [
        { kind: "product", quantity: 1, unitPrice: 1000, costPrice: 700 },
      ],
    };
    const sim = simulateWhatIf(base, {
      discountPctDelta: 10,
      costDeltaPct: 10,
    });
    expect(sim.grandTotal).toBe(900);
    expect(sim.costTotal).toBe(770);
    expect(sim.marginTotal).toBe(130);
  });
});
