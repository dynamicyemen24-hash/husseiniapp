"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ShoppingCart,
  TrendingUp,
  Package,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/pos/utils/currency";
import { usePOSRecommendations } from "@/modules/pos/hooks/usePOSRecommendations";
import type { ProductSearchResult } from "@/modules/pos/types";

interface RecommendationsPanelProps {
  onProductClick: (product: ProductSearchResult & { type: "product" }) => void;
  recentProductIds?: number[];
}

export function RecommendationsPanel({
  onProductClick,
  recentProductIds = [],
}: RecommendationsPanelProps) {
  const { recommendations, isLoading, fetchRecommendations } =
    usePOSRecommendations();

  useEffect(() => {
    if (recentProductIds.length > 0) {
      fetchRecommendations(recentProductIds);
    } else {
      fetchRecommendations();
    }
  }, [recentProductIds, fetchRecommendations]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-warning" />
          اقتراحات ذكية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {recommendations.map((rec, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto p-3 flex-col items-start gap-1 hover:bg-warning/15 hover:border-warning/25"
              onClick={() =>
                onProductClick({
                  id: rec.productId,
                  code: "",
                  name: rec.productName,
                  nameAr: rec.productNameAr,
                  type: "product",
                  category: "",
                  salePrice: rec.salePrice,
                  wholesalePrice: rec.salePrice,
                  currentStock: rec.currentStock,
                  minStock: 0,
                  isActive: true,
                  taxRate: 0,
                  loyaltyPoints: 0,
                } as ProductSearchResult & { type: "product" })
              }
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium truncate">
                  {rec.productName}
                </span>
                <Badge variant="secondary" className="text-[9px]">
                  {rec.reason}
                </Badge>
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(rec.salePrice, "YER", 0)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  تقييم: {rec.score?.toFixed(1) ?? "—"}
                </span>
              </div>
            </Button>
          ))}
        </div>
        {recommendations.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>لا توجد اقتراحات حالياً</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
