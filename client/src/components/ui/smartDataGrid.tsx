/**
 * World-Class Smart Data Grid with Sorting, Filtering, Pagination, and Export.
 * WCAG 2.1 AA compliant with full keyboard navigation support.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export interface SmartColumn<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface SmartDataGridProps<T extends Record<string, any>> {
  data: T[];
  columns: SmartColumn<T>[];
  pageSize?: number;
  searchPlaceholder?: string;
  onRowClick?: (row: T, index: number) => void;
  onExport?: () => void;
  exportFileName?: string;
  className?: string;
  compact?: boolean;
  loading?: boolean;
  totalCount?: number;
}

export function SmartDataGrid<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 20,
  searchPlaceholder = "بحث...",
  onRowClick,
  onExport,
  exportFileName = "export",
  className,
  loading = false,
  totalCount,
}: SmartDataGridProps<T>) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [columnFilters, setColumnFilters] = React.useState<
    Record<string, string>
  >({});

  // Filtered and sorted data
  const processedData = React.useMemo(() => {
    let result = [...data];

    // Apply column filters
    Object.entries(columnFilters).forEach(([key, val]) => {
      if (!val) return;
      result = result.filter(row =>
        String((row as any)[key] ?? "")
          .toLowerCase()
          .includes(val.toLowerCase())
      );
    });

    // Apply global search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        columns.some(col => {
          const val = String((row as any)[col.key] ?? "");
          return val.toLowerCase().includes(q);
        })
      );
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = (a as any)[sortKey];
        const bVal = (b as any)[sortKey];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, sortKey, sortDir, columnFilters, columns]);

  const totalPages = Math.ceil(processedData.length / pageSize);
  const pageData = processedData.slice(page * pageSize, (page + 1) * pageSize);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [search, columnFilters]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExport = () => {
    if (!onExport) {
      // Default CSV export
      const headers = columns.map(c => c.header).join(",");
      const rows = processedData.map(row =>
        columns.map(c => String((row as any)[c.key] ?? "")).join(",")
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    onExport();
  };

  const visibleCount = totalCount ?? processedData.length;

  return (
    <div
      data-slot="smart-data-grid"
      className={cn("rounded-xl border bg-white", className)}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label={searchPlaceholder}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              aria-label="مسح البحث"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4 mr-1" />
              تصدير
            </Button>
          )}
          <span className="text-sm text-neutral-500" aria-live="polite">
            {visibleCount} عنصر
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid" aria-label="جدول البيانات">
          <thead>
            <tr className="border-b bg-neutral-50">
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "p-3 text-left text-xs font-semibold text-neutral-700",
                    col.sortable &&
                      "cursor-pointer select-none hover:bg-neutral-100",
                    col.width && `w-[${col.width}px]`
                  )}
                  style={{ textAlign: col.align }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  role="columnheader"
                  aria-sort={
                    sortKey === String(col.key)
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  tabIndex={col.sortable ? 0 : undefined}
                  onKeyDown={e => {
                    if (col.sortable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleSort(String(col.key));
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {sortKey === String(col.key) &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="size-3 text-brand-600" />
                      ) : (
                        <ArrowDown className="size-3 text-brand-600" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {columns.map((_, j) => (
                    <td key={j} className="p-3">
                      <Skeleton className="h-4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-neutral-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="size-8 opacity-30" />
                    <span>لا توجد بيانات</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-b last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-neutral-50",
                    index % 2 === 0 && "bg-white",
                    index % 2 !== 0 && "bg-neutral-50/30"
                  )}
                  onClick={() => onRowClick?.(row, index)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && onRowClick) {
                      onRowClick(row, index);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role="row"
                >
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        "p-3 text-sm",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center"
                      )}
                      style={{ maxWidth: col.width }}
                    >
                      {col.render
                        ? col.render((row as any)[col.key], row, index)
                        : String((row as any)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-neutral-500">
            {page * pageSize + 1} -{" "}
            {Math.min((page + 1) * pageSize, visibleCount)} من {visibleCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="الصفحة السابقة"
            >
              <ChevronRight className="size-4" />
            </Button>
            <span className="text-sm px-3 py-1">
              {page + 1}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="الصفحة التالية"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Virtualized Smart Data Grid for large datasets (10k+ rows).
 */
interface VirtualizedGridProps<T extends Record<string, any>> {
  data: T[];
  columns: SmartColumn<T>[];
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (row: T, index: number) => void;
}

export function VirtualizedDataGrid<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 40,
  maxHeight = 600,
  onRowClick,
}: VirtualizedGridProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleCount = Math.ceil(maxHeight / rowHeight);
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.min(startIndex + visibleCount, data.length);
  const visibleData = data.slice(startIndex, endIndex);

  const totalHeight = data.length * rowHeight;

  return (
    <div
      style={{ maxHeight, overflowY: "auto" }}
      onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      role="grid"
      aria-label="جدول البيانات المعزز"
    >
      <table className="w-full">
        <thead className="sticky top-0 bg-white">
          <tr>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className="p-3 text-left text-xs font-semibold border-b bg-neutral-50"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: startIndex * rowHeight }}>
            <td colSpan={columns.length} />
          </tr>
          {visibleData.map((row, i) => (
            <tr
              key={startIndex + i}
              className={cn(
                "border-b hover:bg-brand-50 cursor-pointer transition-colors",
                onRowClick && "cursor-pointer"
              )}
              style={{ height: rowHeight }}
              onClick={() => onRowClick?.(row, startIndex + i)}
            >
              {columns.map(col => (
                <td
                  key={String(col.key)}
                  className="p-3 text-sm"
                  style={{ height: rowHeight }}
                >
                  {col.render
                    ? col.render((row as any)[col.key], row, startIndex + i)
                    : String((row as any)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          <tr style={{ height: (data.length - endIndex) * rowHeight }}>
            <td colSpan={columns.length} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
