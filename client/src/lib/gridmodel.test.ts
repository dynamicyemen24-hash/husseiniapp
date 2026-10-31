/**
 * Unit tests for the grid model (pure — no DOM).
 */
import { describe, expect, it } from "vitest";
import {
  applyGridQuery,
  buildDelimited,
  compareGridValues,
  quoteCell,
  type GridColumnDef,
} from "./gridmodel";

type Row = {
  id: number;
  name: string;
  total: number;
  date: string;
  tag?: string | null;
};

const rows: Row[] = [
  { id: 1, name: "ب", total: 9, date: "2026-03-01", tag: "x" },
  { id: 2, name: "أ", total: 10, date: "2026-01-15", tag: null },
  { id: 3, name: "ت", total: 100, date: "2026-02-10", tag: "x" },
  { id: 4, name: "ث", total: 2, date: "2026-01-05" },
];

const cols: GridColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "total", sortable: true, numeric: true },
  { key: "date", sortable: true },
];

describe("compareGridValues", () => {
  it("sorts numbers numerically, not lexically", () => {
    expect([9, 10, 100, 2].sort(compareGridValues)).toEqual([2, 9, 10, 100]);
  });

  it("parses Arabic-Indic digits and grouped strings", () => {
    expect(compareGridValues("١٬٢٠٠", 1200)).toBe(0);
    expect(compareGridValues("1,200", "900")).toBeGreaterThan(0);
  });

  it("compares ISO dates chronologically", () => {
    expect(compareGridValues("2026-01-05", "2026-03-01")).toBeLessThan(0);
  });

  it("sinks nullish values", () => {
    expect(
      [null, "ب", undefined, "أ"].sort(compareGridValues).slice(0, 2)
    ).toEqual(["أ", "ب"]);
  });

  it("collates Arabic alphabetically", () => {
    expect(["ت", "أ", "ب"].sort(compareGridValues)).toEqual(["أ", "ب", "ت"]);
  });
});

describe("applyGridQuery", () => {
  it("sorts by numeric column both directions", () => {
    const asc = applyGridQuery(rows, cols, {
      sortKey: "total",
      sortDir: "asc",
      pageSize: 10,
    });
    expect(asc.rows.map(r => r.total)).toEqual([2, 9, 10, 100]);
    const desc = applyGridQuery(rows, cols, {
      sortKey: "total",
      sortDir: "desc",
      pageSize: 10,
    });
    expect(desc.rows.map(r => r.total)).toEqual([100, 10, 9, 2]);
  });

  it("sorts dates chronologically", () => {
    const r = applyGridQuery(rows, cols, { sortKey: "date", pageSize: 10 });
    expect(r.rows.map(x => x.id)).toEqual([4, 2, 3, 1]);
  });

  it("global filter searches rendered values", () => {
    const r = applyGridQuery(rows, cols, { globalFilter: "أ", pageSize: 10 });
    expect(r.total).toBe(1);
  });

  it("select + number column filters compose", () => {
    const filterable: GridColumnDef<Row>[] = [
      { key: "name", sortable: true },
      { key: "total", sortable: true, numeric: true, filterType: "number" },
      { key: "date", sortable: true },
      { key: "tag", filterType: "select" },
    ];
    const r = applyGridQuery(rows, filterable, {
      columnFilters: { tag: "x" },
      pageSize: 10,
    });
    expect(r.rows.map(x => x.id)).toEqual([1, 3]);
    const ranged = applyGridQuery(rows, filterable, {
      columnFilters: { total: "5-50" },
      pageSize: 10,
    });
    expect(ranged.rows.map(x => x.total)).toEqual([9, 10]);
  });

  it("paginates and clamps out-of-range pages", () => {
    const p0 = applyGridQuery(rows, cols, { page: 0, pageSize: 3 });
    expect(p0.rows.length).toBe(3);
    expect(p0.totalPages).toBe(2);
    const p9 = applyGridQuery(rows, cols, { page: 9, pageSize: 3 });
    expect(p9.page).toBe(1);
    expect(p9.rows.length).toBe(1);
  });

  it("supports accessor columns for computed values", () => {
    const withVat: GridColumnDef<Row>[] = [
      ...cols,
      {
        key: "withVat",
        accessor: r => r.total * 1.15,
        sortable: true,
        numeric: true,
      },
    ];
    const r = applyGridQuery(rows, withVat, {
      sortKey: "withVat",
      sortDir: "desc",
      pageSize: 10,
    });
    expect(r.rows[0].id).toBe(3);
  });
});

describe("csv", () => {
  it("quotes per RFC 4180", () => {
    expect(quoteCell('قال "نعم"')).toBe('"قال ""نعم"""');
    expect(quoteCell(null)).toBe('""');
  });

  it("builds CRLF-delimited payloads", () => {
    const out = buildDelimited(["a", "b"], [["1", "2"]]);
    expect(out).toBe('"a","b"\r\n"1","2"');
    expect(buildDelimited(["a"], [["1"]], "\t")).toBe('"a"\r\n"1"');
  });
});
