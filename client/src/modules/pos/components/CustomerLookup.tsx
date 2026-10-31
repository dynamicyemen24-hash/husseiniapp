"use client";

import { useState, useRef, useEffect } from "react";
import { Search, User, X, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePOSCustomerLookup } from "@/modules/pos/hooks/usePOSCustomerLookup";
import { formatCurrency } from "@/modules/pos/utils/currency";
import { Badge } from "@/components/ui/badge";

interface CustomerLookupProps {
  onSelect: (customer: {
    id: number;
    name: string;
    nameAr?: string;
    phone: string;
    balance: number;
    loyaltyPoints: number;
    creditLimit: number;
  }) => void;
  selectedCustomer?: {
    id: number;
    name: string;
    nameAr?: string;
    phone: string;
    balance: number;
    loyaltyPoints: number;
  } | null;
}

export function CustomerLookup({
  onSelect,
  selectedCustomer,
}: CustomerLookupProps) {
  const {
    query,
    results,
    isLoading,
    showResults,
    setShowResults,
    search,
    selectCustomer,
  } = usePOSCustomerLookup();
  const [inputValue, setInputValue] = useState(selectedCustomer?.name || "");

  useEffect(() => {
    if (selectedCustomer) {
      setInputValue(selectedCustomer.name);
    }
  }, [selectedCustomer]);

  const handleSelect = (customer: any) => {
    selectCustomer(customer);
    setInputValue(customer.name);
    onSelect(customer);
  };

  return (
    <div className="relative">
      <Button
        variant={selectedCustomer ? "default" : "outline"}
        className="h-9 gap-2"
        onClick={() => setShowResults(!showResults)}
      >
        <User className="h-4 w-4" />
        <span className="text-sm">
          {selectedCustomer ? selectedCustomer.name : "اختر عميل..."}
        </span>
      </Button>
      {showResults && (
        <div className="absolute z-50 w-80 p-2 mt-1 bg-card border border-border rounded-xl shadow-xl">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pr-8 text-sm"
              placeholder="بحث عن عميل..."
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                search(e.target.value);
              }}
              onFocus={() => setShowResults(true)}
            />
          </div>
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
            {results.map((customer, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-right"
                onClick={() => handleSelect(customer)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{customer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {customer.phone} • رصيد:{" "}
                    {formatCurrency(customer.balance, "YER", 0)}
                  </div>
                  {customer.loyaltyPoints > 0 && (
                    <div className="text-[10px] text-success">
                      نقاط ولاء: {customer.loyaltyPoints}
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {customer.customerType}
                </Badge>
              </button>
            ))}
            {results.length === 0 && !isLoading && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <User className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p>لا يوجد عملاء</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
