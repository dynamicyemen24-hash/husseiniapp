/**
 * DataGrid v2 render tests — server-side rendering (no browser needed).
 * Exercises the full render path: headers, rows, states, a11y attributes.
 */
import { describe, expect, it } from "vitest";
import React, { createElement as h } from "react";
import { renderToString } from "react-dom/server";
// The repo compiles TSX with the classic runtime under Vitest, so components
// reference the free `React` binding — provide it without touching sources.
(globalThis as { React?: typeof React }).React = React;
import { DataGrid, type DataGridColumn } from "./data-grid";

type Row = Record<string, unknown>;

const cols: DataGridColumn<Row>[] = [
  { key: "no", header: "الرقم", sortable: true },
  { key: "total", header: "الإجمالي", sortable: true, numeric: true },
  {
    key: "status",
    header: "الحالة",
    render: v => h("b", null, String(v)),
  },
];

const rows: Row[] = [
  { id: 1, no: "Q-1", total: 900, status: "مقبول" },
  { id: 2, no: "Q-2", total: 12000, status: "مسودة" },
];

function render(props: Record<string, unknown>): string {
  return renderToString(
    h(DataGrid, { data: rows, columns: cols, ...props } as never)
  );
}

describe("DataGrid v2", () => {
  it("renders headers and rows with numeric sorting applied", () => {
    const html = render({ initialSort: { key: "total", dir: "desc" } });
    expect(html).toContain("الرقم");
    expect(html).toContain("Q-1");
    // 12000 before 900 → numeric, not lexical.
    expect(html.indexOf("Q-2")).toBeLessThan(html.indexOf("Q-1"));
    expect(html).toContain('aria-sort="descending"');
  });

  it("shows heritage skeletons while loading", () => {
    const html = render({ loading: true });
    expect(html).toContain("skeleton-heritage");
    expect(html).toContain("جاري التحميل");
  });

  it("shows error with retry affordance", () => {
    const html = render({ error: "تعذر الجلب", onRetry: () => undefined });
    expect(html).toContain("تعذر الجلب");
    expect(html).toContain("إعادة المحاولة");
  });

  it("shows guided empty state", () => {
    const html = render({
      data: [],
      emptyTitle: "فارغ",
      emptyHint: "أضف",
    });
    expect(html).toContain("فارغ");
    expect(html).toContain("أضف");
  });

  it("renders selection checkboxes with labels", () => {
    const html = render({ selectable: true });
    expect(html).toContain("تحديد كل صفوف الصفحة");
    expect(html).toContain("تحديد الصف 1");
  });

  it("exposes toolbar search/print/export controls", () => {
    const html = render({});
    expect(html).toContain("بحث شامل في الجدول");
    expect(html).toContain("طباعة");
    expect(html).toContain("CSV");
  });
});
