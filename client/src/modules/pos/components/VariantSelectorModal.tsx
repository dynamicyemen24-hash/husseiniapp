"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VariantOption {
  id: number;
  name: string;
  nameAr?: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  sku?: string;
  imageUrl?: string;
}

interface VariantSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (variant: VariantOption) => void;
  productName: string;
  productNameAr?: string;
  variants: VariantOption[];
  dimensions: string[];
}

export function VariantSelectorModal({
  open,
  onClose,
  onSelect,
  productName,
  productNameAr,
  variants,
  dimensions,
}: VariantSelectorModalProps) {
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});

  const toggleFilter = (dimension: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [dimension]: prev[dimension] === value ? "" : value,
    }));
  };

  const filteredVariants = variants.filter(v =>
    Object.entries(selectedFilters).every(
      ([dim, val]) => !val || v.attributes[dim] === val
    )
  );

  const getDimensionValues = (dimension: string) => {
    const values = new Set<string>();
    variants.forEach(v => {
      if (v.attributes[dimension]) values.add(v.attributes[dimension]);
    });
    return Array.from(values);
  };

  const handleSelect = (variant: VariantOption) => {
    onSelect(variant);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">اختيار النوع</h2>
            <p className="text-sm text-muted-foreground">
              {productNameAr || productName}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {dimensions.map(dimension => (
            <div key={dimension} className="space-y-2">
              <label className="text-sm font-medium">{dimension}</label>
              <div className="flex flex-wrap gap-2">
                {getDimensionValues(dimension).map(value => (
                  <Button
                    key={value}
                    size="sm"
                    variant={
                      selectedFilters[dimension] === value
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleFilter(dimension, value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredVariants.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                لا توجد أنواع مطابقة
              </p>
            ) : (
              filteredVariants.map(variant => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleSelect(variant)}
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {variant.nameAr || variant.name}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(variant.attributes).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-xs">
                          {k}: {v}
                        </Badge>
                      ))}
                    </div>
                    {variant.sku && (
                      <div className="text-xs text-muted-foreground mt-1">
                        SKU: {variant.sku}
                      </div>
                    )}
                  </div>
                  <div className="text-left ml-3">
                    <div className="font-bold">
                      {variant.price.toLocaleString("ar-YE")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      مخزون: {variant.stock}
                      {variant.stock === 0 && (
                        <Badge variant="destructive" className="mr-1">
                          نفذ
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground ml-2" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}
