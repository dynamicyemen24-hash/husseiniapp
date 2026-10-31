import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Grid,
  List,
  Barcode,
  Camera,
  Package,
  Tag,
  ChevronLeft,
  ChevronRight,
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/modules/pos/utils/currency";
import type { ProductSearchResult } from "@/modules/pos/types";

interface ProductCardProps {
  product: ProductSearchResult;
  onAddToCart: (product: ProductSearchResult, quantity?: number) => void;
  onQuickView?: (product: ProductSearchResult) => void;
  currency: string;
  decimals: number;
  viewMode: "grid" | "list";
  showStock: boolean;
  showCategories: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  onQuickView,
  currency,
  decimals,
  viewMode,
  showStock,
  showCategories,
}: ProductCardProps) {
  const stock = product.currentStock || 0;
  const isOutOfStock = product.type === "goods" && stock <= 0;
  const isLowStock = product.type === "goods" && stock > 0 && stock <= 5;

  if (viewMode === "list") {
    return (
      <button
        onClick={() => onAddToCart(product)}
        disabled={isOutOfStock}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-all hover:border-brand hover:bg-brand/5 disabled:opacity-50 disabled:cursor-not-allowed ${isOutOfStock ? "bg-muted/50" : ""}`}
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{product.name}</span>
            {product.nameAr && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {product.nameAr}
              </span>
            )}
            {showCategories && product.category && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 whitespace-nowrap"
              >
                {product.category}
              </Badge>
            )}
            {product.type === "service" && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                خدمة
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            <span>كود: {product.code}</span>
            {product.barcode && <span>باركود: {product.barcode}</span>}
            {showStock && product.type === "goods" && (
              <span
                className={
                  isOutOfStock
                    ? "text-destructive"
                    : isLowStock
                      ? "text-amber-600"
                      : "text-emerald-600"
                }
              >
                {isOutOfStock
                  ? "نفد"
                  : isLowStock
                    ? `منخفض (${stock})`
                    : `متوفر ${stock}`}
              </span>
            )}
          </div>
        </div>
        <div className="text-left">
          <div className="font-bold text-ink">
            {formatCurrency(product.salePrice, currency, decimals)}
          </div>
          {product.wholesalePrice && product.wholesalePrice > 0 && (
            <div className="text-[10px] text-muted-foreground line-through">
              {formatCurrency(product.wholesalePrice, currency, decimals)}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onAddToCart(product)}
      disabled={isOutOfStock}
      className={`flex flex-col items-start gap-2 p-3 rounded-2xl border border-border bg-card transition-all hover:border-brand hover:bg-brand/5 disabled:opacity-50 disabled:cursor-not-allowed ${isOutOfStock ? "bg-muted/50" : ""}`}
    >
      <div className="relative w-full aspect-square rounded-xl bg-muted/50 overflow-hidden flex items-center justify-center">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-10 w-10 text-muted-foreground" />
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm px-2 py-1 bg-destructive/90 rounded">
              نفد المخزون
            </span>
          </div>
        )}
        {isLowStock && (
          <div className="absolute top-1 left-1">
            <Badge variant="destructive" className="text-[9px] h-3.5 px-1">
              مخزون منخفض
            </Badge>
          </div>
        )}
      </div>
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground truncate">
            {product.code}
          </span>
          {product.type === "service" ? (
            <Badge variant="outline" className="text-[9px] h-3.5 px-1">
              خدمة
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
              سلعة
            </Badge>
          )}
        </div>
        <span className="line-clamp-2 text-sm font-medium text-foreground">
          {product.name}
        </span>
        {product.nameAr && (
          <span className="line-clamp-1 text-[10px] text-muted-foreground">
            {product.nameAr}
          </span>
        )}
        {showCategories && product.category && (
          <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
            {product.category}
          </Badge>
        )}
        <div className="flex items-center justify-between w-full">
          <span className="font-bold text-ink">
            {formatCurrency(product.salePrice, currency, decimals)}
          </span>
          {showStock && product.type === "goods" && (
            <span
              className={`text-[10px] ${isOutOfStock ? "text-destructive" : isLowStock ? "text-amber-600" : "text-emerald-600"}`}
            >
              {isOutOfStock ? "نفد" : isLowStock ? `${stock}` : `${stock}`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

interface ProductCatalogProps {
  products: ProductSearchResult[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onSearch: (query: string) => void;
  onBarcodeScan: (barcode: string) => void;
  onCategoryChange: (categoryId: number | null) => void;
  onAddToCart: (product: ProductSearchResult, quantity?: number) => void;
  categories: Array<{
    id: number;
    name: string;
    nameAr?: string;
    productCount: number;
  }>;
  selectedCategory: number | null;
  searchQuery: string;
  currency: string;
  decimals: number;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  showStock: boolean;
  showCategories: boolean;
  columns: number;
}

export function ProductCatalog({
  products,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onSearch,
  onBarcodeScan,
  onCategoryChange,
  onAddToCart,
  categories,
  selectedCategory,
  searchQuery,
  currency,
  decimals,
  viewMode,
  onViewModeChange,
  showStock,
  showCategories,
  columns,
}: ProductCatalogProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [scannerValue, setScannerValue] = useState("");

  const handleScan = () => {
    if (scannerValue.trim()) {
      onBarcodeScan(scannerValue.trim());
      setScannerValue("");
      setShowScanner(false);
    }
  };

  const columnClass = useMemo(() => {
    switch (columns) {
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-2 sm:grid-cols-3";
      case 4:
        return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
      case 5:
        return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
      default:
        return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
    }
  }, [columns]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-10 pr-10 pl-3 text-sm bg-card border-border"
            placeholder="ابحث عن منتج بالاسم، الكود، أو الباركود..."
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <Select
              value={selectedCategory?.toString() || ""}
              onValueChange={v => onCategoryChange(v ? parseInt(v) : null)}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع التصنيفات</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name} ({cat.productCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onViewModeChange("grid")}
              aria-label="عرض شبكة"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onViewModeChange("list")}
              aria-label="عرض قائمة"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowScanner(true)}
          >
            <Barcode className="h-4 w-4" />
            <span>مسح</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onLoadMore}
            disabled={isLoading || !hasMore}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">مسح الباركود</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowScanner(false)}
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
            <Input
              className="h-12 text-center text-xl font-mono tracking-wider mb-3"
              value={scannerValue}
              onChange={e => setScannerValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              placeholder="أدخل الباركود أو امسح بالكاميرا"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowScanner(false)}
              >
                إلغاء
              </Button>
              <Button
                className="flex-1"
                onClick={handleScan}
                disabled={!scannerValue.trim()}
              >
                بحث
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading && products.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent mx-auto mb-2" />
            جاري تحميل المنتجات...
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-sm text-destructive p-4">
            <Tag className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {!isLoading && products.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-sm text-muted-foreground p-4">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد منتجات مطابقة</p>
          </div>
        </div>
      )}

      {!isLoading && products.length > 0 && (
        <ScrollArea className="flex-1" style={{ scrollbarWidth: "thin" }}>
          {viewMode === "grid" ? (
            <div className={`grid gap-3 ${columnClass}`}>
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  currency={currency}
                  decimals={decimals}
                  viewMode="grid"
                  showStock={showStock}
                  showCategories={showCategories}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  currency={currency}
                  decimals={decimals}
                  viewMode="list"
                  showStock={showStock}
                  showCategories={showCategories}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? "جاري التحميل..." : "تحميل المزيد"}
            </Button>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
