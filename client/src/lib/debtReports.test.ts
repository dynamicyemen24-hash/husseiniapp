/**
 * client/src/lib/debtReports.test.ts
 * ===================================
 * Unit tests for the debt/aging report helpers.
 */

import { describe, expect, it } from "vitest";
import {
  bucketOf,
  daysPastDue,
  computeAging,
  computeDebtSummary,
  computeDSO,
  computeDPO,
  cashConversionCycle,
} from "./debtReports";

/* ─────────────────────────────────────────────────────────────────────────────
 *  Test data helpers
 * ───────────────────────────────────────────────────────────────────────────── */

function makeARInvoice(
  overrides: Partial<{
    id: number;
    customerId: number;
    invoiceDate: Date;
    dueDate: Date | null;
    total: number;
    paidAmount: number;
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    invoiceNumber: `INV-${overrides.id ?? 1}`,
    customerId: overrides.customerId ?? 1,
    invoiceDate: overrides.invoiceDate ?? new Date("2024-01-01"),
    dueDate: overrides.dueDate ?? null,
    total: String(overrides.total ?? 1000),
    paidAmount: String(overrides.paidAmount ?? 0),
  };
}

function makeAPInvoice(
  overrides: Partial<{
    id: number;
    supplierId: number;
    invoiceDate: Date;
    dueDate: Date | null;
    total: number;
    paidAmount: number;
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    invoiceNumber: `PI-${overrides.id ?? 1}`,
    supplierId: overrides.supplierId ?? 1,
    invoiceDate: overrides.invoiceDate ?? new Date("2024-01-01"),
    dueDate: overrides.dueDate ?? null,
    total: String(overrides.total ?? 2000),
    paidAmount: String(overrides.paidAmount ?? 0),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  bucketOf
 * ───────────────────────────────────────────────────────────────────────────── */

describe("bucketOf", () => {
  it("returns 'current' for 0 days past due", () => {
    expect(bucketOf(0)).toBe("current");
  });
  it("returns 'current' for negative days (future due)", () => {
    expect(bucketOf(-5)).toBe("current");
  });
  it("returns 'd30' for 1–30 days past due", () => {
    expect(bucketOf(1)).toBe("d30");
    expect(bucketOf(15)).toBe("d30");
    expect(bucketOf(30)).toBe("d30");
  });
  it("returns 'd60' for 31–60 days past due", () => {
    expect(bucketOf(31)).toBe("d60");
    expect(bucketOf(45)).toBe("d60");
    expect(bucketOf(60)).toBe("d60");
  });
  it("returns 'd90' for 61–90 days past due", () => {
    expect(bucketOf(61)).toBe("d90");
    expect(bucketOf(75)).toBe("d90");
    expect(bucketOf(90)).toBe("d90");
  });
  it("returns 'over90' for >90 days past due", () => {
    expect(bucketOf(91)).toBe("over90");
    expect(bucketOf(365)).toBe("over90");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  daysPastDue
 * ───────────────────────────────────────────────────────────────────────────── */

describe("daysPastDue", () => {
  const asOf = new Date("2024-03-01");

  it("returns 0 when due date is in the future", () => {
    const due = new Date("2024-03-15");
    expect(daysPastDue(asOf, due)).toBe(0);
  });
  it("returns positive days when due date is past", () => {
    const due = new Date("2024-02-01");
    expect(daysPastDue(asOf, due)).toBe(29);
  });
  it("returns 0 when due date equals asOf date", () => {
    const due = new Date("2024-03-01");
    expect(daysPastDue(asOf, due)).toBe(0);
  });
  it("handles invalid dates gracefully", () => {
    expect(daysPastDue(asOf, new Date("invalid"))).toBe(0);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeAging — AR (customerId)
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeAging (AR)", () => {
  const customerMap = new Map([
    [1, "عميل أحمد"],
    [2, "عميل خالد"],
  ]);

  const asOf = new Date("2024-03-15");

  it("handles null/undefined invoices array gracefully", () => {
    expect(computeAging(null, customerMap, asOf).rows).toEqual([]);
    expect(computeAging(undefined, customerMap, asOf).rows).toEqual([]);
  });

  it("skips fully paid invoices (outstanding ≈ 0)", () => {
    const invoices = [makeARInvoice({ total: 1000, paidAmount: 1000 })];
    const result = computeAging(invoices, customerMap, asOf);
    expect(result.rows).toHaveLength(0);
    expect(result.summary.totalOutstanding).toBe(0);
  });

  it("computes outstanding correctly", () => {
    const invoices = [makeARInvoice({ total: 1000, paidAmount: 300 })];
    const result = computeAging(invoices, customerMap, asOf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].outstanding).toBe(700);
    expect(result.summary.totalOutstanding).toBe(700);
  });

  it("assigns correct bucket based on due date", () => {
    const invoices = [
      makeARInvoice({ id: 1, total: 100, dueDate: new Date("2024-03-10") }), // 5 days ago → d30
      makeARInvoice({ id: 2, total: 200, dueDate: new Date("2024-03-20") }), // future → current
    ];
    const result = computeAging(invoices, customerMap, asOf);
    const map = new Map(result.rows.map(r => [r.invoiceId, r.bucket]));
    expect(map.get(1)).toBe("d30");
    expect(map.get(2)).toBe("current");
  });

  it("accumulates byBucket totals", () => {
    const invoices = [
      makeARInvoice({ id: 1, total: 100, dueDate: new Date("2024-03-10") }),
      makeARInvoice({ id: 2, total: 200, dueDate: new Date("2024-04-10") }),
    ];
    const result = computeAging(invoices, customerMap, asOf);
    expect(result.byBucket.d30).toBe(100);
    expect(result.byBucket.current).toBe(200);
  });

  it("groups by customer in byParty", () => {
    const invoices = [
      makeARInvoice({ id: 1, customerId: 1, total: 500 }),
      makeARInvoice({ id: 2, customerId: 1, total: 300 }),
      makeARInvoice({ id: 3, customerId: 2, total: 200 }),
    ];
    const result = computeAging(invoices, customerMap, asOf);
    expect(result.byParty).toHaveLength(2);
    const byCust = new Map(result.byParty.map(p => [p.partyId, p]));
    expect(byCust.get(1)?.outstanding).toBe(800);
    expect(byCust.get(2)?.outstanding).toBe(200);
    expect(byCust.get(1)?.invoices).toBe(2);
  });

  it("returns correct daysPastDue per row", () => {
    const due = new Date("2024-02-15"); // 29 days before 2024-03-15
    const invoices = [makeARInvoice({ total: 100, dueDate: due })];
    const result = computeAging(invoices, customerMap, asOf);
    expect(result.rows[0].daysPastDue).toBe(29);
  });

  it("uses invoice date as fallback when due date is null", () => {
    const inv = makeARInvoice({ dueDate: null });
    const result = computeAging([inv], customerMap, asOf);
    expect(result.rows).toHaveLength(1);
  });

  it("sorts rows by outstanding descending", () => {
    const invoices = [
      makeARInvoice({ id: 1, total: 100 }),
      makeARInvoice({ id: 2, total: 500 }),
      makeARInvoice({ id: 3, total: 300 }),
    ];
    const result = computeAging(invoices, customerMap, asOf);
    expect(result.rows[0].invoiceId).toBe(2);
    expect(result.rows[1].invoiceId).toBe(3);
    expect(result.rows[2].invoiceId).toBe(1);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeAging — AP (supplierId)
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeAging (AP — supplierId)", () => {
  const supplierMap = new Map([
    [1, "مورد الأثاث"],
    [2, "مورد إلكترونيات"],
  ]);
  const asOf = new Date("2024-03-15");

  it("respects supplierId for party aggregation", () => {
    const invoices = [
      makeAPInvoice({ id: 1, supplierId: 1, total: 1000 }),
      makeAPInvoice({ id: 2, supplierId: 2, total: 2000 }),
    ];
    const result = computeAging(invoices, supplierMap, asOf, "supplierId");
    expect(result.byParty).toHaveLength(2);
    const bySupp = new Map(result.byParty.map(p => [p.partyId, p.outstanding]));
    expect(bySupp.get(1)).toBe(1000);
    expect(bySupp.get(2)).toBe(2000);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeDebtSummary
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeDebtSummary", () => {
  const asOf = new Date("2024-03-15");

  it("returns zero for null inputs", () => {
    const result = computeDebtSummary(null, null, asOf);
    expect(result.ar.total).toBe(0);
    expect(result.ap.total).toBe(0);
    expect(result.netDebt).toBe(0);
  });

  it("computes AR and AP totals correctly", () => {
    const arInvoices = [makeARInvoice({ total: 5000, paidAmount: 2000 })];
    const apInvoices = [makeAPInvoice({ total: 3000, paidAmount: 1000 })];
    const result = computeDebtSummary(arInvoices, apInvoices, asOf);
    expect(result.ar.total).toBe(3000);
    expect(result.ap.total).toBe(2000);
    expect(result.netDebt).toBe(1000);
  });

  it("counts overdue invoices correctly", () => {
    const arInvoices = [
      makeARInvoice({ id: 1, total: 1000, dueDate: new Date("2024-02-01") }), // overdue
      makeARInvoice({ id: 2, total: 500, dueDate: new Date("2024-04-01") }), // not overdue
    ];
    const result = computeDebtSummary(arInvoices, [], asOf);
    expect(result.ar.overdueInvoices).toBe(1);
    expect(result.ar.overdueAmount).toBe(1000);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  DSO / DPO / CCC
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeDSO", () => {
  it("calculates DSO correctly", () => {
    // DSO = (AR / (Sales/90 days)) = (9000 / (90000/90)) = (9000 / 1000) = 9
    expect(computeDSO(9000, 90000, 90)).toBe(9);
  });
  it("returns 0 when purchases are 0", () => {
    expect(computeDSO(1000, 0, 90)).toBe(0);
  });
  it("returns 0 for zero days in period", () => {
    expect(computeDSO(1000, 500, 0)).toBe(0);
  });
});

describe("computeDPO", () => {
  it("calculates DPO correctly", () => {
    // DPO = (AP / (Purchases/90 days))
    expect(computeDPO(18000, 90000, 90)).toBe(18);
  });
  it("returns 0 when purchases are 0", () => {
    expect(computeDPO(1000, 0, 90)).toBe(0);
  });
});

describe("cashConversionCycle", () => {
  it("calculates CCC correctly", () => {
    // DSO=9, DPO=18 → CCC = 9 - 18 = -9 (good: collect faster than pay)
    expect(cashConversionCycle(9, 18)).toBe(-9);
  });
});
