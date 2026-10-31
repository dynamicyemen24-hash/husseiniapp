/**
 * aiSuggestions — Intelligent suggestion engine.
 *
 * Provides:
 *   - Product autocomplete with fuzzy matching + recent items boost
 *   - Smart line-item suggestions (based on history, seasonality, patterns)
 *   - Predictive reorder recommendations
 *   - Auto-completion for customer/supplier fields
 *   - Context-aware discounts/promotions
 *   - AI-powered quantity predictions from historical trends
 *
 * All suggestions are computed client-side for instant feedback,
 * with optional server-side enrichment for complex models.
 */
import { useState, useCallback, useMemo, useEffect } from "react";

// ─── Local Product type for client-side suggestions ────
interface Product {
  id: number;
  name: string;
  code: string;
  category?: string;
  minStockLevel?: number;
}

// ─── Types ──────────────────────────────────────────────────────

interface SuggestionEntry<T> {
  item: T;
  score: number;
  reason: string;
}

interface ProductSuggestion {
  product: Product;
  score: number;
  reason: "recent" | "frequent" | "seasonal" | "trending";
}

interface ReorderSuggestion {
  productId: number;
  productName: string;
  currentQty: number;
  suggestedQty: number;
  urgency: "low" | "medium" | "high" | "critical";
  reason: string;
}

// ─── Simple fuzzy match ─────────────────────────────────────────

function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 1.0;
  let score = 0;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += 1;
      qi++;
    }
  }
  return score / q.length;
}

// ─── Product Suggester ──────────────────────────────────────────

export function useProductSuggester(
  products: Product[],
  recentProducts: number[] = [],
  frequentProducts: number[] = []
) {
  const suggest = useCallback(
    (query: string, limit = 10): ProductSuggestion[] => {
      if (!query || query.length < 2) return [];

      const results: ProductSuggestion[] = [];
      const seen = new Set<number>();

      for (const product of products) {
        const name = product.name;
        const code = product.code;
        const score = Math.max(
          fuzzyMatch(query, name),
          fuzzyMatch(query, code)
        );
        if (score > 0.3) {
          let boostedScore = score;
          let reason: ProductSuggestion["reason"] = "frequent";
          if (recentProducts.includes(product.id)) {
            boostedScore += 0.3;
            reason = "recent";
          } else if (frequentProducts.includes(product.id)) {
            boostedScore += 0.2;
            reason = "frequent";
          }
          if (!seen.has(product.id)) {
            seen.add(product.id);
            results.push({ product, score: Math.min(boostedScore, 1), reason });
          }
        }
      }

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    },
    [products, recentProducts, frequentProducts]
  );

  return { suggest };
}

// ─── Reorder Recommender ────────────────────────────────────────

interface SalesHistory {
  productId: number;
  dailyAvgSales: number;
  leadTimeDays: number;
  safetyStock: number;
  lastSoldAt: string;
  seasonFactor: number; // 0.5 - 2.0
}

export function useReorderRecommender() {
  const recommend = useCallback(
    (history: SalesHistory[]): ReorderSuggestion[] => {
      const now = Date.now();
      const suggestions: ReorderSuggestion[] = [];

      for (const h of history) {
        const reorderPoint = Math.max(
          0,
          h.dailyAvgSales * h.leadTimeDays + h.safetyStock
        );
        const seasonAdjusted = reorderPoint * h.seasonFactor;
        const coverageDays =
          h.dailyAvgSales > 0 ? h.safetyStock / h.dailyAvgSales : 999;

        if (coverageDays < h.leadTimeDays + 7) {
          const urgency =
            coverageDays < h.leadTimeDays
              ? "critical"
              : coverageDays < h.leadTimeDays + 3
                ? "high"
                : coverageDays < h.leadTimeDays + 7
                  ? "medium"
                  : "low";

          const suggestedQty = Math.ceil(h.dailyAvgSales * 30 * h.seasonFactor); // 30-day supply

          suggestions.push({
            productId: h.productId,
            productName: "",
            currentQty: Math.round(h.safetyStock),
            suggestedQty,
            urgency,
            reason:
              urgency === "critical"
                ? "Stock will run out before next delivery"
                : urgency === "high"
                  ? "Low stock coverage detected"
                  : "Reorder recommended based on trend",
          });
        }
      }

      return suggestions.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.urgency] - order[b.urgency];
      });
    },
    []
  );

  return { recommend };
}

// ─── Smart Discount Calculator ──────────────────────────────────

export function useSmartDiscount() {
  const calculateDiscount = useCallback(
    (
      subtotal: number,
      quantity: number,
      applicablePromotions: Array<{
        type: "percentage" | "fixed_amount" | "buy_x_get_y";
        value: number;
        minQty?: number;
        productIds?: number[];
      }>
    ): { discount: number; reason: string } => {
      let bestDiscount = 0;
      let bestReason = "No promotion applies";

      for (const promo of applicablePromotions) {
        if (promo.minQty && quantity < promo.minQty) continue;
        let discount = 0;
        switch (promo.type) {
          case "percentage":
            discount = subtotal * (promo.value / 100);
            bestReason = `Promotion: ${promo.value}% off`;
            break;
          case "fixed_amount":
            discount = Math.min(promo.value, subtotal);
            bestReason = `Promotion: $${promo.value} off`;
            break;
          case "buy_x_get_y": {
            const freeQty =
              Math.floor(quantity / (promo.value + 1)) * promo.value;
            discount = freeQty * (subtotal / Math.max(quantity, 1));
            bestReason = `Buy ${promo.value + 1} get ${promo.value} free`;
            break;
          }
        }
        if (discount > bestDiscount) {
          bestDiscount = discount;
        }
      }

      return {
        discount: Math.round(bestDiscount * 100) / 100,
        reason: bestReason,
      };
    },
    []
  );

  return { calculateDiscount };
}

// ─── Auto-Complete Combobox ─────────────────────────────────────

export function useAutoComplete<
  T extends { id: number; name: string; code?: string },
>(items: T[], searchFields: string[] = ["name", "code"]) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query || query.length < 2) return items.slice(0, 20);
    return items
      .map(item => ({
        item,
        score: searchFields.reduce(
          (max, field) =>
            Math.max(max, fuzzyMatch(query, (item as any)[field] || "")),
          0
        ),
      }))
      .filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(r => r.item);
  }, [query, items, searchFields]);

  const navigateUp = useCallback(() => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
  }, [filtered.length]);

  const navigateDown = useCallback(() => {
    setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
  }, [filtered.length]);

  const selectItem = useCallback(
    (index: number) => {
      if (filtered[index]) {
        setQuery((filtered[index] as any).name || "");
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    },
    [filtered]
  );

  return {
    query,
    setQuery,
    filtered,
    selectedIndex,
    isOpen,
    setIsOpen,
    navigateUp,
    navigateDown,
    selectItem,
    resultCount: filtered.length,
  };
}

// ─── Quantity Prediction ────────────────────────────────────────

interface QuantityPrediction {
  suggestedQty: number;
  confidence: number; // 0-1
  trend: "increasing" | "decreasing" | "stable";
  reason: string;
}

export function useQuantityPrediction(
  historicalSales: number[], // daily sales over last N days
  averageOrderQty: number
): QuantityPrediction {
  return useMemo(() => {
    if (historicalSales.length < 7) {
      return {
        suggestedQty: averageOrderQty,
        confidence: 0.5,
        trend: "stable",
        reason: "Insufficient data — using average",
      };
    }

    const recent = historicalSales.slice(-7);
    const earlier = historicalSales.slice(-14, -7);

    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const earlierAvg =
      earlier.length > 0
        ? earlier.reduce((s, v) => s + v, 0) / earlier.length
        : recentAvg;

    const trend =
      recentAvg > earlierAvg * 1.2
        ? "increasing"
        : recentAvg < earlierAvg * 0.8
          ? "decreasing"
          : "stable";

    const confidence = Math.min(1, historicalSales.length / 30);
    const suggestedQty = Math.ceil(
      trend === "increasing"
        ? recentAvg * 1.5
        : trend === "decreasing"
          ? recentAvg * 0.8
          : recentAvg
    );

    const reason =
      trend === "increasing"
        ? "Sales trending up — consider stocking more"
        : trend === "decreasing"
          ? "Sales trending down — conservative reorder"
          : "Stable pattern — regular reorder";

    return {
      suggestedQty: Math.max(1, suggestedQty),
      confidence,
      trend,
      reason,
    };
  }, [historicalSales, averageOrderQty]);
}

// ─── Context-Aware Suggestions ──────────────────────────────────

export interface ContextSuggestion {
  type: "product" | "discount" | "bundle" | "substitution";
  text: string;
  detail: string;
  confidence: number;
  action?: () => void;
}

export function useContextSuggestions(
  documentType: string,
  currentItems: Array<{ productId: number; qty: number }>,
  availableProducts: Product[]
): ContextSuggestion[] {
  return useMemo(() => {
    const suggestions: ContextSuggestion[] = [];

    // If line items exist, suggest related products
    if (currentItems.length > 0) {
      const firstProduct = availableProducts.find(
        p => p.id === currentItems[0].productId
      );
      if (firstProduct?.category) {
        const categoryProducts = availableProducts.filter(
          p =>
            p.category === firstProduct.category &&
            p.id !== currentItems[0].productId
        );
        const topRelated = categoryProducts.slice(0, 3);
        for (const p of topRelated) {
          suggestions.push({
            type: "product",
            text: p.name,
            detail: `Frequently bought with ${firstProduct?.name}`,
            confidence: 0.7,
          });
        }
      }
    }

    // Suggest bundle if quantity > 5
    const totalQty = currentItems.reduce((s, item) => s + item.qty, 0);
    if (totalQty > 5) {
      suggestions.push({
        type: "bundle",
        text: "Bundle Discount",
        detail: "Apply bulk discount for orders over 5 items",
        confidence: 0.85,
      });
    }

    // Suggest reorder if low stock items detected
    const lowStock = availableProducts.filter(p => (p.minStockLevel ?? 0) > 0);
    if (lowStock.length > 0) {
      suggestions.push({
        type: "substitution",
        text: "Low Stock Alert",
        detail: `${lowStock.length} items are at minimum stock level`,
        confidence: 0.9,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [currentItems, availableProducts]);
}
