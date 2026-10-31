/**
 * client/src/lib/procurementReports.test.ts
 * ===========================================
 * Unit tests for the procurement analytics helpers.
 */

import { describe, expect, it } from "vitest";
import {
  computeSupplierPerformance,
  computeSpendByMonth,
  computeSpendBySupplier,
  computeProcurementSummary,
} from "./procurementReports";

/* ─────────────────────────────────────────────────────────────────────────────
 *  Test data helpers
 * ───────────────────────────────────────────────────────────────────────────── */

function makeInvoice(
  overrides: Partial<{
    id: number;
    supplierId: number;
    invoiceDate: Date;
    total: number;
    paidAmount: number;
    status: string;
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    supplierId: overrides.supplierId ?? 1,
    invoiceDate: overrides.invoiceDate ?? new Date("2024-01-15"),
    total: String(overrides.total ?? 1000),
    paidAmount: String(overrides.paidAmount ?? 0),
    status: overrides.status ?? "confirmed",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeSupplierPerformance
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeSupplierPerformance", () => {
  const supplierMap = new Map([
    [1, "مورد الأثاث"],
    [2, "مورد إلكترونيات"],
    [3, "مورد أغذية"],
  ]);

  it("handles null/undefined invoices gracefully", () => {
    expect(computeSupplierPerformance(null, supplierMap)).toEqual([]);
    expect(computeSupplierPerformance(undefined, supplierMap)).toEqual([]);
  });

  it("skips draft invoices", () => {
    const invoices = [
      makeInvoice({ id: 1, total: 1000, status: "draft" }),
      makeInvoice({ id: 2, total: 2000, status: "confirmed" }),
    ];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result).toHaveLength(1);
    expect(result[0].totalSpend).toBe(2000);
  });

  it("computes totals per supplier", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 5000 }),
      makeInvoice({ id: 2, supplierId: 1, total: 3000 }),
      makeInvoice({ id: 3, supplierId: 2, total: 8000 }),
    ];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result).toHaveLength(2);
    const byId = new Map(result.map(r => [r.supplierId, r]));
    expect(byId.get(1)?.totalSpend).toBe(8000);
    expect(byId.get(2)?.totalSpend).toBe(8000);
  });

  it("computes avgInvoiceValue", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 1000 }),
      makeInvoice({ id: 2, supplierId: 1, total: 3000 }),
    ];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result[0].avgInvoiceValue).toBe(2000);
  });

  it("computes outstanding correctly", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 5000, paidAmount: 2000 }),
    ];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result[0].outstanding).toBe(3000);
    expect(result[0].totalPaid).toBe(2000);
  });

  it("computes paidRatio correctly", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 1000, paidAmount: 400 }),
    ];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result[0].paidRatio).toBe(40); // 400/1000 * 100
  });

  it("includes zero-spend suppliers when allSuppliers is provided", () => {
    const invoices: any[] = [
      makeInvoice({ id: 1, supplierId: 1, total: 5000 }),
    ];
    const allSuppliers = [
      { id: 1, name: "مورد الأثاث" },
      { id: 2, name: "مورد إلكترونيات" },
      { id: 3, name: "مورد أغذية" },
    ];
    const result = computeSupplierPerformance(
      invoices,
      supplierMap,
      allSuppliers
    );
    expect(result).toHaveLength(3);
    const zeroSpend = result.find(r => r.supplierId === 3);
    expect(zeroSpend?.totalSpend).toBe(0);
    expect(zeroSpend?.totalInvoices).toBe(0);
  });

  it("sorts by totalSpend descending", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 1000 }),
      makeInvoice({ id: 2, supplierId: 2, total: 5000 }),
      makeInvoice({ id: 3, supplierId: 3, total: 3000 }),
    ];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result[0].supplierId).toBe(2); // highest spend
    expect(result[1].supplierId).toBe(3);
    expect(result[2].supplierId).toBe(1); // lowest spend
  });

  it("uses unknown supplier name for missing supplierId", () => {
    const invoices = [makeInvoice({ supplierId: 999, total: 1000 })];
    const result = computeSupplierPerformance(invoices, supplierMap);
    expect(result[0].supplierName).toBe("مورد غير مُعرّف");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeSpendByMonth
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeSpendByMonth", () => {
  it("aggregates by year-month key", () => {
    const invoices = [
      makeInvoice({ id: 1, invoiceDate: new Date("2024-01-15"), total: 5000 }),
      makeInvoice({ id: 2, invoiceDate: new Date("2024-01-20"), total: 3000 }),
      makeInvoice({ id: 3, invoiceDate: new Date("2024-02-10"), total: 7000 }),
    ];
    const result = computeSpendByMonth(invoices);
    expect(result).toHaveLength(2);
    const jan = result.find(r => r.month === "2024-01");
    const feb = result.find(r => r.month === "2024-02");
    expect(jan?.totalSpend).toBe(8000);
    expect(jan?.invoiceCount).toBe(2);
    expect(feb?.totalSpend).toBe(7000);
  });

  it("sorts chronologically", () => {
    const invoices = [
      makeInvoice({ id: 1, invoiceDate: new Date("2024-03-01"), total: 1000 }),
      makeInvoice({ id: 2, invoiceDate: new Date("2024-01-01"), total: 2000 }),
    ];
    const result = computeSpendByMonth(invoices);
    expect(result[0].month).toBe("2024-01");
    expect(result[1].month).toBe("2024-03");
  });

  it("computes outstanding per month", () => {
    const invoices = [
      makeInvoice({
        id: 1,
        invoiceDate: new Date("2024-01-15"),
        total: 5000,
        paidAmount: 2000,
      }),
    ];
    const result = computeSpendByMonth(invoices);
    expect(result[0].paidAmount).toBe(2000);
    expect(result[0].outstanding).toBe(3000);
  });

  it("skips draft invoices", () => {
    const invoices = [
      makeInvoice({
        id: 1,
        invoiceDate: new Date("2024-01-15"),
        total: 5000,
        status: "draft",
      }),
      makeInvoice({
        id: 2,
        invoiceDate: new Date("2024-01-20"),
        total: 3000,
        status: "confirmed",
      }),
    ];
    const result = computeSpendByMonth(invoices);
    expect(result[0].totalSpend).toBe(3000);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeSpendBySupplier
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeSpendBySupplier", () => {
  const supplierMap = new Map([
    [1, "مورد أثاث"],
    [2, "مورد إلكترونيات"],
  ]);

  it("aggregates spend by supplier", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 5000 }),
      makeInvoice({ id: 2, supplierId: 2, total: 3000 }),
    ];
    const result = computeSpendBySupplier(invoices, supplierMap);
    const s1 = result.find(r => r.supplierId === 1);
    const s2 = result.find(r => r.supplierId === 2);
    expect(s1?.totalSpend).toBe(5000);
    expect(s2?.totalSpend).toBe(3000);
  });

  it("computes share as percentage of total", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 7500 }),
      makeInvoice({ id: 2, supplierId: 2, total: 2500 }),
    ];
    const result = computeSpendBySupplier(invoices, supplierMap);
    const s1 = result.find(r => r.supplierId === 1);
    const s2 = result.find(r => r.supplierId === 2);
    expect(s1?.share).toBe(75);
    expect(s2?.share).toBe(25);
  });

  it("respects the limit parameter", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 1000 }),
      makeInvoice({ id: 2, supplierId: 2, total: 900 }),
      makeInvoice({ id: 3, supplierId: 3, total: 800 }),
      makeInvoice({ id: 4, supplierId: 4, total: 700 }),
    ];
    const result = computeSpendBySupplier(invoices, supplierMap, 2);
    expect(result).toHaveLength(2);
    expect(result[0].totalSpend).toBe(1000);
    expect(result[1].totalSpend).toBe(900);
  });

  it("handles null invoices", () => {
    expect(computeSpendBySupplier(null, supplierMap)).toEqual([]);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  computeProcurementSummary
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeProcurementSummary", () => {
  it("computes total spend", () => {
    const invoices = [
      makeInvoice({ id: 1, total: 5000 }),
      makeInvoice({ id: 2, total: 3000 }),
    ];
    const result = computeProcurementSummary(invoices);
    expect(result.totalSpend).toBe(8000);
  });

  it("counts active invoices (not drafts)", () => {
    const invoices = [
      makeInvoice({ id: 1, total: 1000, status: "confirmed" }),
      makeInvoice({ id: 2, total: 2000, status: "draft" }),
      makeInvoice({ id: 3, total: 3000, status: "paid" }),
    ];
    const result = computeProcurementSummary(invoices);
    expect(result.totalInvoices).toBe(2);
    expect(result.totalSpend).toBe(4000);
  });

  it("computes avgInvoiceValue", () => {
    const invoices = [
      makeInvoice({ id: 1, total: 2000, status: "confirmed" }),
      makeInvoice({ id: 2, total: 4000, status: "confirmed" }),
    ];
    const result = computeProcurementSummary(invoices);
    expect(result.avgInvoiceValue).toBe(3000);
  });

  it("counts unique suppliers", () => {
    const invoices = [
      makeInvoice({ id: 1, supplierId: 1, total: 1000 }),
      makeInvoice({ id: 2, supplierId: 2, total: 2000 }),
      makeInvoice({ id: 3, supplierId: 1, total: 3000 }), // same as inv 1
    ];
    const result = computeProcurementSummary(invoices);
    expect(result.uniqueSuppliers).toBe(2);
  });

  it("computes outstandingAmount", () => {
    const invoices = [makeInvoice({ id: 1, total: 5000, paidAmount: 2000 })];
    const result = computeProcurementSummary(invoices);
    expect(result.outstandingAmount).toBe(3000);
    expect(result.paidAmount).toBe(2000);
  });

  it("computes paidRatio as percentage", () => {
    const invoices = [makeInvoice({ id: 1, total: 1000, paidAmount: 250 })];
    const result = computeProcurementSummary(invoices);
    expect(result.paidRatio).toBe(25); // 250/1000 * 100
  });

  it("returns zero for null/undefined invoices", () => {
    const result = computeProcurementSummary(null);
    expect(result.totalSpend).toBe(0);
    expect(result.totalInvoices).toBe(0);
    expect(result.uniqueSuppliers).toBe(0);
  });
});
