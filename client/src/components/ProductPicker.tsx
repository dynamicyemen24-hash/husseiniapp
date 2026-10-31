import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Wrench, AlertTriangle } from "lucide-react";

type Product = {
  id: number;
  code: string;
  name: string;
  type: "goods" | "service";
  salePrice: string | number;
  purchasePrice: string | number;
  currentStock?: number;
  minStock?: number;
  unit?: string;
  barcode?: string | null;
};

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: Product) => void;
  title?: string;
  priceField?: "salePrice" | "purchasePrice";
  typeFilter?: "goods" | "service";
  placeholder?: string;
}

export function ProductPicker({
  open,
  onOpenChange,
  onSelect,
  title = "اختر صنفاً",
  priceField = "salePrice",
  typeFilter,
  placeholder = "ابحث بالاسم أو الكود أو الباركود...",
}: ProductPickerProps) {
  const [search, setSearch] = useState("");

  const { data, isFetching, isLoading } = trpc.products.list.useQuery(
    { search: search || undefined, limit: 100 },
    { enabled: open, staleTime: 30_000 }
  );

  const products = useMemo(() => {
    const items = (data?.items ?? []) as Product[];
    return typeFilter ? items.filter(p => p.type === typeFilter) : items;
  }, [data, typeFilter]);

  const fmtPrice = (v?: string | number) => {
    const n = parseFloat(v == null ? "0" : String(v));
    return (isNaN(n) ? 0 : n).toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-3 border-b">
          <DialogTitle className="text-sm text-ink">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-9 text-xs pr-8"
            />
          </div>
          {typeFilter && (
            <p className="text-[10px] text-gray-400 mt-1">
              {typeFilter === "goods" ? "الأصناف فقط" : "الخدمات فقط"}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">
              {search ? "لا توجد نتائج مطابقة" : "لا توجد أصناف"}
            </p>
          ) : (
            products.map(p => {
              const lowStock =
                p.type === "goods" &&
                typeof p.currentStock === "number" &&
                typeof p.minStock === "number" &&
                p.currentStock <= p.minStock;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    onOpenChange(false);
                    setSearch("");
                  }}
                  className="w-full text-right flex items-center gap-2 p-2 rounded-lg border hover:bg-brand-50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      p.type === "goods"
                        ? "bg-brand/15 text-brand"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {p.type === "goods" ? (
                      <Package className="w-4 h-4" />
                    ) : (
                      <Wrench className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {p.code}
                      {p.unit ? ` • ${p.unit}` : ""}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-xs font-bold text-ink">
                      {fmtPrice(p[priceField])} ر.ي
                    </p>
                    {p.type === "goods" && (
                      <p
                        className={`text-[10px] flex items-center gap-1 ${
                          lowStock ? "text-red-500" : "text-gray-400"
                        }`}
                      >
                        {lowStock && <AlertTriangle className="w-3 h-3" />}
                        المخزون: {p.currentStock ?? 0}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
          {!isLoading &&
            products.length > 0 &&
            data &&
            data.total > products.length && (
              <p className="text-center text-[10px] text-gray-400 py-1">
                يتم عرض أول {products.length} نتيجة — زد دقة البحث
              </p>
            )}
        </div>

        <div className="p-3 border-t flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              onOpenChange(false);
              setSearch("");
            }}
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { Product as PickedProduct };
