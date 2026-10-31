/**
 * Grid model — pure, framework-free data engine behind DataGrid v2.
 *
 * Extracted so sorting / filtering / pagination / export are unit-tested
 * in node (no DOM needed) while the .tsx view stays a thin renderer.
 *
 * Correctness notes (the "deep" part):
 * - Numeric-aware comparison via Intl.Collator (ar + numeric:true), so
 *   "10" sorts after "9" and Arabic-Indic digits collate with Latin ones.
 * - ISO dates detected and compared chronologically, not lexically.
 * - Nullish values always sink (asc) regardless of direction symmetry.
 * - CSV quoting follows RFC 4180 with a BOM-friendly plain-string output
 *   (the caller prepends \uFEFF for Arabic Excel).
 */

export type SortDir = "asc" | "desc";

export interface GridColumnDef<T> {
  key: string;
  /** Value used for sort/filter when the cell renders something else. */
  accessor?: (row: T) => unknown;
  sortable?: boolean;
  /** Force numeric comparison (otherwise auto-detected). */
  numeric?: boolean;
  filterType?: "text" | "select" | "date" | "number";
}

export interface GridQuery {
  globalFilter?: string;
  columnFilters?: Record<string, string>;
  sortKey?: string | null;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

const collator = new Intl.Collator("ar", {
  numeric: true,
  sensitivity: "base",
});

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    // Arabic-Indic digits → Latin before parsing.
    const latin = v.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    // Decimal ٫ → dot; strip thousands (٬ , ،) and spaces.
    const normalized = latin.replace(/٫/g, ".").replace(/[٬,،\s']/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Total order: nullish sinks, numbers/ISO-dates exact, else collated. */
export function compareGridValues(a: unknown, b: unknown): number {
  const aNil = a === null || a === undefined || a === "";
  const bNil = b === null || b === undefined || b === "";
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;

  const an = toNumber(a);
  const bn = toNumber(b);
  if (an !== null && bn !== null) return an - bn;

  if (typeof a === "string" && typeof b === "string") {
    if (ISO_DATE.test(a) && ISO_DATE.test(b)) {
      return Date.parse(a) - Date.parse(b);
    }
  }
  return collator.compare(String(a), String(b));
}

export function resolveCell<T>(
  row: T,
  col: GridColumnDef<T>,
  fallbackKey?: keyof T
): unknown {
  if (col.accessor) return col.accessor(row);
  if (fallbackKey !== undefined) return row[fallbackKey];
  return (row as Record<string, unknown>)[col.key];
}

export interface GridPage<T> {
  rows: T[];
  total: number;
  totalPages: number;
  page: number;
}

export function applyGridQuery<T>(
  data: T[],
  columns: GridColumnDef<T>[],
  query: GridQuery
): GridPage<T> {
  const {
    globalFilter = "",
    columnFilters = {},
    sortKey = null,
    sortDir = "asc",
    page = 0,
    pageSize = 50,
  } = query;

  let out = [...data];

  const g = globalFilter.trim().toLowerCase();
  if (g) {
    out = out.filter(row =>
      columns.some(col => {
        const key = col.accessor ? undefined : (col.key as keyof T);
        return String(resolveCell(row, col, key) ?? "")
          .toLowerCase()
          .includes(g);
      })
    );
  }

  for (const [k, v] of Object.entries(columnFilters)) {
    if (!v) continue;
    const col = columns.find(c => c.key === k);
    if (!col) continue;
    const key = col.accessor ? undefined : (col.key as keyof T);
    if (col.filterType === "select") {
      out = out.filter(row => String(resolveCell(row, col, key) ?? "") === v);
    } else if (col.filterType === "date") {
      out = out.filter(row =>
        String(resolveCell(row, col, key) ?? "").includes(v)
      );
    } else if (col.filterType === "number") {
      const [minRaw, maxRaw] = v.split("-").map(Number);
      out = out.filter(row => {
        const n = toNumber(resolveCell(row, col, key));
        if (n === null) return false;
        if (!Number.isNaN(minRaw) && n < minRaw) return false;
        if (!Number.isNaN(maxRaw) && n > maxRaw) return false;
        return true;
      });
    } else {
      out = out.filter(row =>
        String(resolveCell(row, col, key) ?? "")
          .toLowerCase()
          .includes(v.toLowerCase())
      );
    }
  }

  if (sortKey) {
    const col = columns.find(c => c.key === sortKey);
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((ra, rb) => {
      const key = col?.accessor ? undefined : (sortKey as keyof T);
      const cmp = col
        ? compareGridValues(
            resolveCell(ra, col, key),
            resolveCell(rb, col, key)
          )
        : compareGridValues(
            (ra as Record<string, unknown>)[sortKey],
            (rb as Record<string, unknown>)[sortKey]
          );
      return cmp * dir;
    });
  }

  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(out.length / safeSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  return {
    rows: out.slice(safePage * safeSize, (safePage + 1) * safeSize),
    total: out.length,
    totalPages,
    page: safePage,
  };
}

/** RFC 4180 quoting for one CSV/TSV cell. */
export function quoteCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Build a delimited payload (caller prepends \uFEFF for Excel Arabic). */
export function buildDelimited(
  headers: string[],
  rows: string[][],
  delimiter: "," | "\t" = ","
): string {
  const esc = (cells: string[]) => cells.map(quoteCell).join(delimiter);
  return [esc(headers), ...rows.map(esc)].join("\r\n");
}
