/**
 * invoiceDetailExport.ts - pure, deterministic helpers for turning invoice
 * and quote detail lines (item x unit of measure) into exportable rows,
 * aggregates, per-source groups, and a CSV string.
 *
 * The module is deliberately DB-free and DOM-free: it never touches the
 * database, the filesystem, the clock, or any random source, so identical
 * input always yields identical output in tests, CI, and the browser.
 */

export type InvoiceLine = {
  line: number;
  item: string;
  unit?: string;
  qty: number;
  price: number;
  taxRate?: number;
  tenantId: number;
  source?: "favorites" | "history" | "requests" | "catalog";
};

export type ExportLine = {
  line: number;
  item: string;
  unit: string;
  qty: number;
  net: number;
  tax: number;
  total: number;
};

/** Source label used when an invoice line carries no explicit source. */
export const DEFAULT_SOURCE: NonNullable<InvoiceLine["source"]> = "catalog";

/** Grand total (net + tax) of a single invoice line. */
function lineTotal(line: InvoiceLine): number {
  const net = line.qty * line.price;
  return net + net * (line.taxRate ?? 0);
}

/**
 * De-normalises raw invoice lines into exportable rows.
 * net = qty x price; tax = net x (taxRate ?? 0); total = net + tax.
 * Line numbers are preserved as given.
 */
export function buildInvoiceRows(lines: InvoiceLine[]): ExportLine[] {
  return lines.map(line => {
    const net = line.qty * line.price;
    const tax = net * (line.taxRate ?? 0);
    return {
      line: line.line,
      item: line.item,
      unit: line.unit ?? "",
      qty: line.qty,
      net,
      tax,
      total: net + tax,
    };
  });
}

export type DetailSummary = {
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  lines: number;
};

/** Deterministic aggregation of export rows: sums of net, tax and total. */
export function detailSummary(rows: ExportLine[]): DetailSummary {
  return rows.reduce(
    (acc, row) => ({
      subtotal: acc.subtotal + row.net,
      totalTax: acc.totalTax + row.tax,
      grandTotal: acc.grandTotal + row.total,
      lines: acc.lines + 1,
    }),
    { subtotal: 0, totalTax: 0, grandTotal: 0, lines: 0 }
  );
}

/**
 * Groups invoice lines by source. Each group reports its line count and the
 * sum of per-line grand totals. Output is sorted by total descending, then
 * by source ascending - always stable.
 */
export function groupBySource(
  lines: InvoiceLine[]
): Array<{ source: string; lines: number; total: number }> {
  const bySource = new Map<string, { lines: number; total: number }>();
  for (const line of lines) {
    const source = line.source ?? DEFAULT_SOURCE;
    const current = bySource.get(source);
    bySource.set(source, {
      lines: (current?.lines ?? 0) + 1,
      total: (current?.total ?? 0) + lineTotal(line),
    });
  }
  return Array.from(bySource.entries())
    .map(([source, value]) => ({
      source,
      lines: value.lines,
      total: value.total,
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        (a.source < b.source ? -1 : a.source > b.source ? 1 : 0)
    );
}

/** Quotes a CSV field only when it contains a comma, quote, or line break. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Locale-agnostic numeric formatting with two decimals. */
function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Renders export rows as a CSV text (header + rows). Numeric values use a
 * fixed two-decimal, locale-agnostic format. Empty input yields the header
 * only. Pure text - never writes to disk.
 */
export function renderCSV(rows: ExportLine[]): string {
  const header = ["Line", "Item", "Unit", "Qty", "Net", "Tax", "Total"];
  const body = rows.map(row =>
    [
      String(row.line),
      csvField(row.item),
      csvField(row.unit),
      fmt(row.qty),
      fmt(row.net),
      fmt(row.tax),
      fmt(row.total),
    ].join(",")
  );
  return [header.join(","), ...body].join("\n");
}
