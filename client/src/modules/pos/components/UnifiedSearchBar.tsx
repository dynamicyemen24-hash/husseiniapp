"use client";

import { useRef, useEffect, useState } from "react";
import {
  Search,
  X,
  Package,
  User,
  BookOpen,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { usePOSUnifiedSearch } from "@/modules/pos/hooks/usePOSUnifiedSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/pos/utils/currency";
import type { ProductSearchResult } from "@/modules/pos/types";

interface UnifiedSearchBarProps {
  onProductSelect: (product: ProductSearchResult & { type: "goods" }) => void;
  onServiceSelect: (product: ProductSearchResult & { type: "service" }) => void;
  onCustomerSelect: (customer: {
    id: number;
    name: string;
    nameAr?: string;
    phone: string;
    balance: number;
    loyaltyPoints: number;
  }) => void;
  onKnowledgeSelect?: (doc: {
    id: number;
    title: string;
    url?: string;
  }) => void;
  disabled?: boolean;
}

export function UnifiedSearchBar({
  onProductSelect,
  onServiceSelect,
  onCustomerSelect,
  onKnowledgeSelect,
  disabled = false,
}: UnifiedSearchBarProps) {
  const {
    query,
    results,
    isLoading,
    showResults,
    setShowResults,
    search,
    clearSearch,
  } = usePOSUnifiedSearch({
    types: ["product", "service", "customer", "knowledge"],
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && showResults) {
        setShowResults(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResults, setShowResults]);

  const handleSelect = (type: string, item: any) => {
    setShowResults(false);
    clearSearch();
    if (type === "product")
      onProductSelect(item as ProductSearchResult & { type: "goods" });
    else if (type === "service")
      onServiceSelect(item as ProductSearchResult & { type: "service" });
    else if (type === "customer") onCustomerSelect(item);
    else if (type === "knowledge" && onKnowledgeSelect) onKnowledgeSelect(item);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="h-12 pr-12 text-base bg-card border-border"
          placeholder="ابحث عن منتج، خدمة، عميل... (Ctrl+K)"
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && query.length >= 2 && (
        <div className="fixed inset-x-4 top-16 z-50 mx-auto">
          <div className="bg-card border border-border rounded-xl shadow-xl max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {results.products.length > 0 && (
                  <div className="border-b border-border pb-2 mb-2">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                      المنتجات
                    </h4>
                    {results.products.map((item, i) => (
                      <div
                        key={`product-${i}`}
                        className="cursor-pointer flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                        onClick={() => handleSelect("product", item)}
                      >
                        <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.code} •{" "}
                            {formatCurrency(item.salePrice, "YER", 0)}
                            {item.currentStock > 0 &&
                              ` • مخزون: ${item.currentStock}`}
                          </div>
                        </div>
                        <Badge variant="secondary">منتج</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {results.services.length > 0 && (
                  <div className="border-b border-border pb-2 mb-2">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                      الخدمات
                    </h4>
                    {results.services.map((item, i) => (
                      <div
                        key={`service-${i}`}
                        className="cursor-pointer flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                        onClick={() => handleSelect("service", item)}
                      >
                        <Sparkles className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.code} •{" "}
                            {formatCurrency(item.salePrice, "YER", 0)}
                          </div>
                        </div>
                        <Badge variant="outline">خدمة</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {results.customers.length > 0 && (
                  <div className="border-b border-border pb-2 mb-2">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                      العملاء
                    </h4>
                    {results.customers.map((item, i) => (
                      <div
                        key={`customer-${i}`}
                        className="cursor-pointer flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                        onClick={() => handleSelect("customer", item)}
                      >
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.phone} • رصيد:{" "}
                            {formatCurrency(item.balance, "YER", 0)}
                          </div>
                        </div>
                        <Badge variant="secondary">عميل</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {results.knowledge.length > 0 && onKnowledgeSelect && (
                  <div className="border-b border-border pb-2 mb-2">
                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                      المعرفة والمعلومات
                    </h4>
                    {results.knowledge.map((item, i) => (
                      <div
                        key={`knowledge-${i}`}
                        className="cursor-pointer flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                        onClick={() => handleSelect("knowledge", item)}
                      >
                        <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {item.excerpt}
                          </div>
                        </div>
                        <Badge variant="outline">معرفة</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {results.products.length === 0 &&
                  results.services.length === 0 &&
                  results.customers.length === 0 &&
                  results.knowledge.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>لا توجد نتائج</p>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
