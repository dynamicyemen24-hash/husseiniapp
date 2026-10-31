/**
 * server/pricingResolver.test.ts
 * Unit tests for the flexible price list resolver (pure functions).
 */
import { describe, expect, it } from "vitest";
import {
  applyResolvedPrice,
  computeInvoiceTotals,
  pickPrice,
  type PriceListRow,
} from "./services/pricingResolver";

const baseRow: Omit<PriceListRow, "id"> = {
  productId: 10,
  branchId: null,
  warehouseId: null,
  countryCode: null,
  unitId: null,
  priceType: "sale",
  price: "100",
  discountPct: "0",
  effectiveFrom: null,
  effectiveTo: null,
  isActive: true,
};

function row(overrides: Partial<PriceListRow>, id = 1): PriceListRow {
  return { id, ...baseRow, ...overrides } as PriceListRow;
}

describe("pickPrice", () => {
  it("returns null when there are no rows", () => {
    expect(pickPrice([], { branchId: 1 })).toBeNull();
  });

  it("falls back to a default row (no scope fields)", () => {
    const r = pickPrice([row({})], {});
    expect(r).toMatchObject({ price: 100, matchedBy: "default" });
  });

  it("prefers the branch-scoped row over the default", () => {
    const rows = [row({}, 1), row({ branchId: 7, price: "120" }, 2)];
    const r = pickPrice(rows, { branchId: 7 });
    expect(r).toMatchObject({ price: 120, matchedBy: "branch" });
  });

  it("prefers unit+branch over branch alone", () => {
    const rows = [
      row({ branchId: 7, price: "120" }, 1),
      row({ branchId: 7, unitId: 3, price: "150" }, 2),
    ];
    const r = pickPrice(rows, { branchId: 7, unitId: 3 });
    expect(r).toMatchObject({ price: 150, matchedBy: "unit+branch" });
  });

  it("penalizes rows scoped to a different branch", () => {
    const rows = [
      row({ branchId: 99, price: "500" }, 1),
      row({ branchId: 7, price: "120" }, 2),
    ];
    const r = pickPrice(rows, { branchId: 7 });
    expect(r).toMatchObject({ price: 120, matchedBy: "branch" });
  });

  it("respects the effective date window", () => {
    const at = new Date("2026-06-15T00:00:00Z");
    const rows = [
      row(
        {
          price: "90",
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: new Date("2026-03-31"),
        },
        1
      ),
      row({ price: "110", effectiveFrom: new Date("2026-06-01") }, 2),
    ];
    const r = pickPrice(rows, {}, { at });
    expect(r).toMatchObject({ price: 110 });
  });

  it("ignores inactive rows and wrong price types", () => {
    const rows = [
      row({ price: "10", isActive: false }, 1),
      row({ price: "20", priceType: "purchase" }, 2),
    ];
    expect(pickPrice(rows, {})).toBeNull();
    const purchase = pickPrice(rows, {}, { priceType: "purchase" });
    expect(purchase).toMatchObject({ price: 20 });
  });

  it("breaks ties by the most recent effectiveFrom", () => {
    const at = new Date("2026-06-01");
    const rows = [
      row({ price: "100", effectiveFrom: new Date("2026-01-01") }, 1),
      row({ price: "130", effectiveFrom: new Date("2026-05-01") }, 2),
    ];
    const r = pickPrice(rows, {}, { at });
    expect(r).toMatchObject({ price: 130 });
  });

  it("matches country case-insensitively and reports 'none' for unscoped default", () => {
    const rows = [row({ countryCode: "ye", price: "77" }, 1)];
    const r = pickPrice(rows, { countryCode: "YE" });
    expect(r).toMatchObject({ price: 77, matchedBy: "country" });
    const defaultMatch = pickPrice([row({})], {});
    expect(defaultMatch?.matchedBy).toBe("default");
  });
});

describe("computeInvoiceTotals", () => {
  it("reduces to the legacy header-tax formula when no per-line tax", () => {
    const t = computeInvoiceTotals({
      lines: [
        { quantity: 3, unitPrice: 100, discountAmount: 50 },
        { quantity: 1, unitPrice: 200 },
      ],
      headerDiscountAmount: 100,
      headerTaxPct: 15,
    });
    // subtotal 500, discounts 150 → net 350, tax 52.5 → total 402.5
    expect(t.subtotal).toBe(500);
    expect(t.discountTotal).toBe(150);
    expect(t.headerTaxableBase).toBe(350);
    expect(t.headerTax).toBe(52.5);
    expect(t.taxTotal).toBe(52.5);
    expect(t.grandTotal).toBe(402.5);
  });

  it("applies per-line taxPct and excludes those lines from the header base", () => {
    const t = computeInvoiceTotals({
      lines: [
        { quantity: 2, unitPrice: 100, taxPct: 5 }, // net 200, tax 10
        { quantity: 1, unitPrice: 100 }, // net 100 → header base
      ],
      headerTaxPct: 15,
    });
    expect(t.lineTaxTotal).toBe(10);
    expect(t.headerTaxableBase).toBe(100);
    expect(t.headerTax).toBe(15);
    expect(t.taxTotal).toBe(25);
    expect(t.grandTotal).toBe(325);
  });

  it("clamps a line discount to the line gross and floors the header base at 0", () => {
    const t = computeInvoiceTotals({
      lines: [{ quantity: 1, unitPrice: 100, discountAmount: 500 }],
      headerDiscountAmount: 1000,
      headerTaxPct: 15,
    });
    expect(t.lines[0].net).toBe(0);
    expect(t.headerTaxableBase).toBe(0);
    expect(t.grandTotal).toBe(0);
  });
});

describe("applyResolvedPrice", () => {
  it("keeps the base price when nothing resolved", () => {
    expect(applyResolvedPrice(250, null)).toEqual({
      unitPrice: 250,
      autoDiscountPct: 0,
    });
  });

  it("applies the resolved price and its discount percentage", () => {
    const resolved = pickPrice([row({ price: "180", discountPct: "5" })], {});
    expect(applyResolvedPrice(250, resolved)).toEqual({
      unitPrice: 180,
      autoDiscountPct: 5,
    });
  });
});
