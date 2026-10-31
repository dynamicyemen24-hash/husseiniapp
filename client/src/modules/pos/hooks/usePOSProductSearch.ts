import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { ProductSearchResult } from "@/modules/pos/types";

interface UsePOSProductSearchOptions {
  limit?: number;
  debounceMs?: number;
  includeInactive?: boolean;
  warehouseId?: number;
  categoryId?: number;
}

export function usePOSProductSearch(options: UsePOSProductSearchOptions = {}) {
  const {
    limit = 50,
    debounceMs = 300,
    includeInactive = false,
    warehouseId,
    categoryId,
  } = options;
  const utils = trpc.useUtils();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debounceMs]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await utils.products.list.fetch({
          search: debouncedQuery || undefined,
          limit,
          offset: cursor ? parseInt(cursor) : 0,
        });

        const items = ((data.items || []) as any[]).map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          nameAr: p.nameAr,
          type: p.type,
          category: p.category,
          salePrice: parseFloat(p.salePrice || "0"),
          wholesalePrice: parseFloat(p.wholesalePrice || "0"),
          currentStock: p.currentStock || 0,
          minStock: p.minStock || 0,
          barcode: p.barcode,
          unitId: p.unitId,
          unitName: p.unitName || p.unit,
          conversionFactor: parseFloat(p.conversionFactor || "1"),
          imageUrl: p.imageUrl,
          isActive: p.isActive,
          taxRate: p.taxRate || 0,
          loyaltyPoints: p.loyaltyPoints || 0,
        }));

        if (cursor) {
          setProducts(prev => [...prev, ...items]);
        } else {
          setProducts(items);
        }

        setHasMore(items.length === limit);
        setCursor(
          cursor
            ? String(parseInt(cursor) + items.length)
            : items.length === limit
              ? String(limit)
              : null
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "فشل تحميل المنتجات");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [
    debouncedQuery,
    limit,
    warehouseId,
    categoryId,
    includeInactive,
    cursor,
    utils,
  ]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && cursor) {
      setCursor(cursor);
    }
  }, [hasMore, isLoading, cursor]);

  const searchByBarcode = useCallback(
    async (barcode: string): Promise<ProductSearchResult | null> => {
      try {
        const data = await utils.products.byBarcode.fetch({ barcode });
        return data as ProductSearchResult | null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل البحث بالباركود");
        return null;
      }
    },
    [utils]
  );

  const searchByCode = useCallback(
    async (code: string): Promise<ProductSearchResult | null> => {
      try {
        const data = await utils.products.byCode.fetch({ code });
        return data as ProductSearchResult | null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل البحث بالكود");
        return null;
      }
    },
    [utils]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setProducts([]);
    setCursor(null);
    setHasMore(false);
  }, []);

  const getProductById = useCallback(
    (id: number) => {
      return products.find(p => p.id === id) || null;
    },
    [products]
  );

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    products.forEach(p => {
      if (p.category) {
        cats.set(p.category, (cats.get(p.category) || 0) + 1);
      }
    });
    return Array.from(cats.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  return {
    query,
    setQuery,
    products,
    isLoading,
    error,
    hasMore,
    loadMore,
    searchByBarcode,
    searchByCode,
    clearSearch,
    getProductById,
    categories,
    totalCount: products.length,
  };
}

interface UsePOSCategoriesOptions {
  includeInactive?: boolean;
}

export function usePOSCategories(options: UsePOSCategoriesOptions = {}) {
  const { includeInactive = false } = options;
  const utils = trpc.useUtils();

  const [categories, setCategories] = useState<
    Array<{ id: number; name: string; nameAr?: string; productCount: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await utils.modules.masterData.listCategories.fetch();
      setCategories(
        (data || []).map((c: any, i: number) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          productCount: 0,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل التصنيفات");
    } finally {
      setIsLoading(false);
    }
  }, [utils]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error, refetch: fetchCategories };
}

interface UsePOSProductUnitsOptions {
  productId: number;
}

export function usePOSProductUnits({ productId }: UsePOSProductUnitsOptions) {
  const utils = trpc.useUtils();
  const [units, setUnits] = useState<
    Array<{
      id: number;
      unitId: number;
      unitName: string;
      conversionFactor: number;
      isBase: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await utils.modules.productUnits.list.fetch({ productId });
      setUnits(
        (data || []).map((u: any) => ({
          id: u.id,
          unitId: u.unitId,
          unitName: u.unitName,
          conversionFactor: parseFloat(u.conversionFactor || "1"),
          isBase: u.isBase,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الوحدات");
    } finally {
      setIsLoading(false);
    }
  }, [productId, utils]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  return { units, isLoading, error, refetch: fetchUnits };
}
