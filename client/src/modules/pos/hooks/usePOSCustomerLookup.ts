import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

interface CustomerLookupResult {
  id: number;
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  customerCode: string;
  balance: number;
  creditLimit: number;
  loyaltyPoints: number;
  customerType: string;
  groupName?: string;
}

export function usePOSCustomerLookup() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerLookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      if (searchQuery.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const data = await utils.modules.posIntelligence.customerLookup.fetch(
            {
              query: searchQuery,
              limit: 10,
            }
          );
          setResults((data || []) as CustomerLookupResult[]);
          setShowResults(true);
        } catch {
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 250);
    },
    [utils]
  );

  const selectCustomer = useCallback((customer: CustomerLookupResult) => {
    setQuery(customer.name);
    setResults([]);
    setShowResults(false);
    return customer;
  }, []);

  const clearLookup = useCallback(() => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  }, []);

  return {
    query,
    results,
    isLoading,
    showResults,
    setShowResults,
    search,
    selectCustomer,
    clearLookup,
  };
}
