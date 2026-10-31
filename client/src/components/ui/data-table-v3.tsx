import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableV3Props<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  toolbar?: React.ReactNode;
}

export function DataTableV3<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 10,
  loading,
  emptyMessage = "لا توجد بيانات",
  selectable = false,
  onSelectionChange,
  toolbar,
}: DataTableV3Props<T>) {
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const totalPages = Math.ceil(data.length / pageSize);
  const start = page * pageSize;
  const pageData = data.slice(start, start + pageSize);

  const toggleAll = () => {
    if (selected.size === pageData.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const newSet = new Set(pageData.map((_, i) => start + i));
      setSelected(newSet);
      onSelectionChange?.(pageData);
    }
  };

  const toggleRow = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
    const rows = pageData.filter((_, i) => newSelected.has(start + i));
    onSelectionChange?.(rows);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 skeleton-shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div data-slot="data-table-v3" className="datagrid-v3 rounded-xl border">
      {toolbar && (
        <div className="flex items-center justify-between border-b p-4">
          {toolbar}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="بحث..." className="w-64 pl-9" />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {selectable && (
                <th className="w-12 p-4">
                  <Checkbox
                    checked={
                      selected.size === pageData.length && pageData.length > 0
                    }
                    onCheckedChange={toggleAll}
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className="p-4 text-left font-semibold text-sm"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b last:border-0 hover:bg-accent transition-colors"
                >
                  {selectable && (
                    <td className="p-4">
                      <Checkbox
                        checked={selected.has(start + rowIndex)}
                        onCheckedChange={() => toggleRow(start + rowIndex)}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={String(col.key)} className="p-4">
                      {col.render
                        ? col.render((row as any)[col.key], row)
                        : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t p-4">
        <p className="text-sm text-muted-foreground">
          عرض {start + 1} - {Math.min(start + pageSize, data.length)} من{" "}
          {data.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
