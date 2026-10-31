import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOURCE,
  buildInvoiceRows,
  detailSummary,
  groupBySource,
  renderCSV,
} from "./invoiceDetailExport";
import type { ExportLine, InvoiceLine } from "./invoiceDetailExport";

const rowsSet: ExportLine[] = [
  { line: 1, item: "Rice", unit: "kg", qty: 2, net: 10, tax: 1, total: 11 },
  {
    line: 2,
    item: "Olive Oil",
    unit: "liter",
    qty: 1,
    net: 12,
    tax: 0.6,
    total: 12.6,
  },
  {
    line: 3,
    item: "Tomato Paste",
    unit: "",
    qty: 3,
    net: 6,
    tax: 0,
    total: 6,
  },
];

const linesSet: InvoiceLine[] = [
  {
    line: 1,
    item: "Rice",
    unit: "kg",
    qty: 2,
    price: 5,
    taxRate: 0.1,
    tenantId: 1,
    source: "favorites",
  },
  {
    line: 2,
    item: "Olive Oil",
    unit: "liter",
    qty: 1,
    price: 12,
    taxRate: 0.05,
    tenantId: 1,
    source: "history",
  },
  {
    line: 3,
    item: "Tomato Paste",
    qty: 3,
    price: 2,
    tenantId: 2,
    source: "requests",
  },
];

const mixedLines: InvoiceLine[] = [
  {
    line: 1,
    item: "Rice",
    unit: "kg",
    qty: 2,
    price: 5,
    taxRate: 0.1,
    tenantId: 1,
    source: "favorites",
  },
  {
    line: 2,
    item: "Olive Oil",
    unit: "liter",
    qty: 1,
    price: 12,
    taxRate: 0.05,
    tenantId: 1,
    source: "history",
  },
  {
    line: 3,
    item: "Tomato Paste",
    qty: 3,
    price: 2,
    tenantId: 2,
    source: "requests",
  },
  {
    line: 4,
    item: "Cooking Oil",
    unit: "bottle",
    qty: 2,
    price: 8,
    taxRate: 0.05,
    tenantId: 1,
    source: "favorites",
  },
  {
    line: 5,
    item: "Cement",
    unit: "bag",
    qty: 5,
    price: 3,
    tenantId: 3,
  },
];

describe("buildInvoiceRows", () => {
  it("computes net, tax and total per line and preserves line numbers", () => {
    const rows = buildInvoiceRows(linesSet);
    expect(rows).toHaveLength(3);
    expect(rows.map(row => row.line)).toEqual([1, 2, 3]);

    expect(rows[0].net).toBe(10);
    expect(rows[0].tax).toBe(1);
    expect(rows[0].total).toBe(11);

    expect(rows[1].net).toBe(12);
    expect(rows[1].tax).toBeCloseTo(0.6, 10);
    expect(rows[1].total).toBeCloseTo(12.6, 10);

    expect(rows[2].net).toBe(6);
    expect(rows[2].tax).toBe(0);
    expect(rows[2].total).toBe(6);
  });

  it("defaults a missing unit to an empty string", () => {
    const rows = buildInvoiceRows([linesSet[2]]);
    expect(rows[0].unit).toBe("");
  });

  it("treats a missing tax rate as zero tax", () => {
    const rows = buildInvoiceRows([linesSet[2]]);
    expect(rows[0].tax).toBe(0);
    expect(rows[0].total).toBe(6);
  });

  it("returns an empty array for empty input", () => {
    expect(buildInvoiceRows([])).toEqual([]);
  });

  it("is deterministic across repeated calls", () => {
    expect(buildInvoiceRows(linesSet)).toEqual(buildInvoiceRows(linesSet));
  });
});

describe("detailSummary", () => {
  it("aggregates subtotal, totalTax and grandTotal across rows", () => {
    const summary = detailSummary(rowsSet);
    expect(summary.subtotal).toBe(28);
    expect(summary.totalTax).toBeCloseTo(1.6, 10);
    expect(summary.grandTotal).toBeCloseTo(29.6, 10);
    expect(summary.lines).toBe(3);
  });

  it("returns a zeroed summary for an empty row set", () => {
    expect(detailSummary([])).toEqual({
      subtotal: 0,
      totalTax: 0,
      grandTotal: 0,
      lines: 0,
    });
  });
});

describe("groupBySource", () => {
  it("groups lines by source and reports line counts and totals", () => {
    const groups = groupBySource(mixedLines);
    const favorites = groups.find(group => group.source === "favorites");
    const history = groups.find(group => group.source === "history");
    const requests = groups.find(group => group.source === "requests");
    const catalog = groups.find(group => group.source === DEFAULT_SOURCE);

    expect(favorites?.lines).toBe(2);
    expect(favorites?.total).toBeCloseTo(27.8, 10);
    expect(history?.lines).toBe(1);
    expect(history?.total).toBeCloseTo(12.6, 10);
    expect(requests?.lines).toBe(1);
    expect(requests?.total).toBe(6);
    expect(catalog?.lines).toBe(1);
    expect(catalog?.total).toBe(15);
  });

  it("sorts groups by total descending, then source ascending", () => {
    const groups = groupBySource(mixedLines);
    const totals = groups.map(group => group.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(groups.map(group => group.source)).toEqual([
      "favorites",
      DEFAULT_SOURCE,
      "history",
      "requests",
    ]);
  });

  it("breaks total ties by source ascending for deterministic output", () => {
    const tied: InvoiceLine[] = [
      {
        line: 1,
        item: "Rice",
        unit: "kg",
        qty: 2,
        price: 5,
        tenantId: 1,
        source: "history",
      },
      {
        line: 2,
        item: "Sugar",
        unit: "kg",
        qty: 1,
        price: 10,
        tenantId: 1,
        source: "favorites",
      },
    ];
    const groups = groupBySource(tied);
    expect(groups[0].source).toBe("favorites");
    expect(groups[1].source).toBe("history");
    expect(groups[0].total).toBe(groups[1].total);
  });

  it("falls back to the default source when a line has no source", () => {
    const groups = groupBySource([mixedLines[4]]);
    expect(groups).toHaveLength(1);
    expect(groups[0].source).toBe(DEFAULT_SOURCE);
    expect(groups[0].lines).toBe(1);
    expect(groups[0].total).toBe(15);
  });

  it("returns an empty array for empty input", () => {
    expect(groupBySource([])).toEqual([]);
  });
});

describe("renderCSV", () => {
  it("emits only the header when there are no rows", () => {
    expect(renderCSV([])).toBe("Line,Item,Unit,Qty,Net,Tax,Total");
  });

  it("formats numeric values with two decimal places", () => {
    const csv = renderCSV([rowsSet[0]]);
    expect(csv).toBe(
      [
        "Line,Item,Unit,Qty,Net,Tax,Total",
        "1,Rice,kg,2.00,10.00,1.00,11.00",
      ].join("\n")
    );
  });

  it("quotes fields that contain commas or quotes", () => {
    const rows: ExportLine[] = [
      {
        line: 2,
        item: "Olive, Oil",
        unit: "",
        qty: 3,
        net: 6,
        tax: 0,
        total: 6,
      },
      {
        line: 3,
        item: 'Plaster "Fine"',
        unit: "bag",
        qty: 1,
        net: 5,
        tax: 0,
        total: 5,
      },
    ];
    const lines = renderCSV(rows).split("\n");
    expect(lines[1]).toBe('2,"Olive, Oil",,3.00,6.00,0.00,6.00');
    expect(lines[2]).toBe('3,"Plaster ""Fine""",bag,1.00,5.00,0.00,5.00');
  });
});
