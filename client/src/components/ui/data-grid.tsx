import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Printer,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export type DataGridColumn<T> = {
  key: keyof T | (string & {});
  header: string;
  sortable?: boolean;
  filterType?: "text" | "select" | "date" | "number";
  options?: string[];
  numeric?: boolean;
  align?: "left" | "right" | "center";
  accessor?: (row: T) => any;
  render?: (value: any, row: T) => React.ReactNode;
};

interface DataGridProps<T extends Record<string, any>> {
  data: T[];
  columns: DataGridColumn<T>[];
  permissions?: { canPrint?: boolean; canExport?: boolean };
  pageSize?: number;
  idKey?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: React.ReactNode;
  density?: "compact" | "normal" | "comfortable";
  initialSort?: { key: string; dir: "asc" | "desc" };
  footer?: React.ReactNode;
  selectedId?: number | string | null;
  toolbar?: React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
}

export function DataGrid<T extends Record<string, any>>({
  data,
  columns,
  permissions = { canPrint: true, canExport: true },
  pageSize = 50,
  loading,
  error,
  onRetry,
  onRowClick,
  ariaLabel,
  emptyTitle,
  emptyHint,
  emptyAction,
  density,
  initialSort,
  footer,
  selectedId,
  toolbar,
  idKey: _idKey,
  selectable = false,
  onSelectionChange,
}: DataGridProps<T>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [sortKey, setSortKey] = useState<string | null>(
    initialSort?.key ?? null
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    initialSort?.dir ?? "asc"
  );
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const getValue = useCallback(
    (row: T, col: DataGridColumn<T>) =>
      col.accessor ? col.accessor(row) : row[col.key as keyof T],
    []
  );

  const filtered = useMemo(() => {
    let out = [...data];
    if (globalFilter) {
      const g = globalFilter.toLowerCase();
      out = out.filter(row =>
        columns.some(col =>
          String(getValue(row, col) ?? "")
            .toLowerCase()
            .includes(g)
        )
      );
    }
    for (const [k, v] of Object.entries(columnFilters)) {
      if (!v) continue;
      const col = columns.find(c => String(c.key) === k);
      if (!col) continue;
      if (col.filterType === "select") {
        out = out.filter(row => String(getValue(row, col)) === v);
      } else if (col.filterType === "date") {
        out = out.filter(row => String(getValue(row, col) ?? "").includes(v));
      } else if (col.filterType === "number") {
        const [min, max] = v.split("-").map(Number);
        out = out.filter(row => {
          const n = Number(getValue(row, col));
          if (!isNaN(min) && n < min) return false;
          if (!isNaN(max) && n > max) return false;
          return true;
        });
      } else {
        out = out.filter(row =>
          String(row[col.key] ?? "")
            .toLowerCase()
            .includes(v.toLowerCase())
        );
      }
    }
    if (sortKey) {
      const col = columns.find(c => String(c.key) === sortKey);
      out.sort((a, b) => {
        const av = col ? getValue(a, col) : a[sortKey];
        const bv = col ? getValue(b, col) : b[sortKey];
        if (typeof av === "number" && typeof bv === "number") {
          const cmp = av - bv;
          return sortDir === "asc" ? cmp : -cmp;
        }
        if (av === bv) return 0;
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""), "ar");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [data, globalFilter, columnFilters, sortKey, sortDir, columns, getValue]);

  const allPageSelected =
    selectable && filtered.length > 0 && selected.size === filtered.length;

  const toggleSelectAll = () => {
    const next = new Set(selected);
    if (allPageSelected) {
      filtered.forEach((_, i) => next.delete(i));
    } else {
      filtered.forEach((_, i) => next.add(i));
    }
    setSelected(next);
    onSelectionChange?.(filtered.filter((_, i) => next.has(i)));
  };

  const toggleRow = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
    onSelectionChange?.(filtered.filter((_, i) => next.has(i)));
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handlePrint = () => {
    if (!permissions.canPrint) return toast.error("ليس لديك صلاحية الطباعة");
    const win = window.open("", "_blank");
    if (!win) return;
    const headers = columns.map(c => `<th>${c.header}</th>`).join("");
    const rows = filtered
      .map(
        row =>
          `<tr>${columns.map(c => `<td>${String(row[c.key] ?? "")}</td>`).join("")}</tr>`
      )
      .join("");
    win.document.write(
      `<html dir="rtl"><head><title>طباعة</title><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#0e2a2b;color:#fff}</style></head><body><h3>تقرير — ${new Date().toLocaleDateString("ar-EG")}</h3><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`
    );
    win.document.close();
  };

  const handleExport = (type: "csv" | "excel") => {
    if (!permissions.canExport) return toast.error("ليس لديك صلاحية التصدير");
    const headers = columns
      .map(c => c.header)
      .join(type === "csv" ? "," : "\t");
    const rows = filtered
      .map(row =>
        columns
          .map(c => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`)
          .join(type === "csv" ? "," : "\t")
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${headers}\n${rows}`], {
      type:
        type === "csv" ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${new Date().toISOString().slice(0, 10)}.${type === "csv" ? "csv" : "xls"}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`تم التصدير ${type.toUpperCase()} — ${filtered.length} صف`);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar — فلاتر متعددة */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={e => {
              setGlobalFilter(e.target.value);
              setPage(0);
            }}
            placeholder="بحث شامل في الجدول"
            className="pr-8 h-8 text-xs"
          />
        </div>
        {columns
          .filter(c => c.filterType)
          .map(col => (
            <div key={String(col.key)} className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-muted-foreground" />
              {col.filterType === "select" && col.options ? (
                <select
                  value={columnFilters[String(col.key)] || ""}
                  onChange={e => {
                    setColumnFilters({
                      ...columnFilters,
                      [String(col.key)]: e.target.value,
                    });
                    setPage(0);
                  }}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="">{col.header}</option>
                  {col.options.map(o => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={columnFilters[String(col.key)] || ""}
                  onChange={e => {
                    setColumnFilters({
                      ...columnFilters,
                      [String(col.key)]: e.target.value,
                    });
                    setPage(0);
                  }}
                  placeholder={col.header}
                  className="h-8 text-xs w-32"
                />
              )}
            </div>
          ))}
        <div className="flex items-center gap-1 mr-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={handlePrint}
            disabled={!permissions.canPrint}
          >
            <Printer className="w-3.5 h-3.5" /> طباعة
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => handleExport("csv")}
            disabled={!permissions.canExport}
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => handleExport("excel")}
            disabled={!permissions.canExport}
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Table — big data via pagination (50/100) */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label={ariaLabel}>
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-2 w-8">
                  {selectable && (
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-muted-foreground"
                        aria-label="تحديد كل صفوف الصفحة"
                      />
                    </label>
                  )}
                </th>
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    aria-sort={
                      sortKey === String(col.key)
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={`p-2 font-bold whitespace-nowrap ${col.align === "center" ? "text-center" : col.align === "left" ? "text-left" : "text-right"} ${col.sortable ? "cursor-pointer hover:text-brand" : ""}`}
                    onClick={() => {
                      if (!col.sortable) return;
                      if (sortKey === String(col.key))
                        setSortDir(d => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortKey(String(col.key));
                        setSortDir("asc");
                      }
                    }}
                  >
                    {col.header}{" "}
                    {sortKey === String(col.key) &&
                      (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="text-center py-10 text-muted-foreground"
                  >
                    <span className="skeleton-heritage inline-block animate-pulse">
                      جاري التحميل…
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8">
                    <span className="text-destructive">{error}</span>
                    {onRetry && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ms-2 h-7 text-xs"
                        onClick={onRetry}
                      >
                        إعادة المحاولة
                      </Button>
                    )}
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {emptyTitle ?? "لا توجد بيانات"}
                    {emptyHint ? (
                      <div className="text-[11px] mt-1">{emptyHint}</div>
                    ) : null}
                    {emptyAction ? (
                      <div className="mt-3 flex justify-center">
                        {emptyAction}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b hover:bg-muted/20 ${selectedId != null && Number(row.id) === Number(selectedId) ? "bg-brand/5" : ""} ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="p-2 text-center">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.has(i)}
                            onChange={() => toggleRow(i)}
                            className="w-3.5 h-3.5 rounded border-muted-foreground"
                            aria-label={`تحديد الصف ${i + 1}`}
                          />
                        </label>
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={String(col.key)}
                        className={`p-2 whitespace-nowrap ${col.align === "center" ? "text-center" : col.align === "left" ? "text-left" : "text-right"}`}
                      >
                        {col.render
                          ? col.render(getValue(row, col), row)
                          : String(getValue(row, col) ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer / Pagination — big data */}
        <div className="flex items-center justify-between p-2 border-t bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            {footer ?? (
              <>
                {filtered.length} صف — صفحة {page + 1} من {totalPages} — معروض{" "}
                {paged.length}
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="w-7 h-7"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Badge variant="outline" className="font-mono text-xs">
              {page + 1} / {totalPages}
            </Badge>
            <Button
              size="icon"
              variant="outline"
              className="w-7 h-7"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
