import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface Recommendation {
  productId: number;
  productName: string;
  productNameAr?: string;
  salePrice: number;
  currentStock: number;
  category?: string;
  imageUrl?: string;
  score?: number;
  reason?: string;
}

export function usePOSRecommendations() {
  const utils = trpc.useUtils();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecommendations = useCallback(
    async (recentProductIds?: number[]) => {
      setIsLoading(true);
      try {
        const data = await utils.modules.posIntelligence.recommendations.fetch({
          recentProducts: recentProductIds,
          limit: 8,
        });
        setRecommendations((data || []) as Recommendation[]);
        return data as Recommendation[];
      } catch {
        setRecommendations([]);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [utils]
  );

  const fetchTopSelling = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await utils.modules.posIntelligence.recommendations.fetch({
        limit: 8,
      });
      setRecommendations((data || []) as Recommendation[]);
      return data as Recommendation[];
    } catch {
      setRecommendations([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [utils]);

  const refetch = useCallback(
    (recentProductIds?: number[]) => {
      return fetchRecommendations(recentProductIds);
    },
    [fetchRecommendations]
  );

  return {
    recommendations,
    isLoading,
    fetchRecommendations,
    fetchTopSelling,
    refetch,
  };
}
