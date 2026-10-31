import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { ProductSearchResult } from "@/modules/pos/types";

interface UnifiedSearchResult {
  products: Array<ProductSearchResult & { type: "goods" }>;
  services: Array<ProductSearchResult & { type: "service" }>;
  customers: Array<{
    id: number;
    name: string;
    nameAr?: string;
    phone: string;
    email: string;
    balance: number;
    creditLimit: number;
    loyaltyPoints: number;
    customerType: string;
    groupName?: string;
  }>;
  knowledge: Array<{
    id: number;
    title: string;
    type: string;
    excerpt: string;
    fileUrl?: string;
  }>;
}

interface UsePOSUnifiedSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  types?: string[];
}

export function usePOSUnifiedSearch(options: UsePOSUnifiedSearchOptions = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    types = ["product", "service"],
  } = options;
  const utils = trpc.useUtils();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult>({
    products: [],
    services: [],
    customers: [],
    knowledge: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      if (searchQuery.length < minQueryLength) {
        setResults({
          products: [],
          services: [],
          customers: [],
          knowledge: [],
        });
        setShowResults(false);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const data = await utils.modules.posIntelligence.unifiedSearch.fetch({
            query: searchQuery,
            types: types as any,
            limit: 20,
          });
          setResults(data as UnifiedSearchResult);
          setShowResults(true);
        } catch {
          setResults({
            products: [],
            services: [],
            customers: [],
            knowledge: [],
          });
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, minQueryLength, types, utils]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults({ products: [], services: [], customers: [], knowledge: [] });
    setShowResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return {
    query,
    results,
    isLoading,
    showResults,
    setShowResults,
    search,
    clearSearch,
    totalResults:
      results.products.length +
      results.services.length +
      results.customers.length +
      results.knowledge.length,
  };
}
