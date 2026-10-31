import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface POSAnalyticsData {
  period: string;
  startDate: Date;
  totalSales: number;
  invoiceCount: number;
  averageTicket: number;
  byMethod: Array<{ method: string; total: number; count: number }>;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export function usePOSAnalytics() {
  const [period, setPeriod] = useState("today");
  const utils = trpc.useUtils();

  const analyticsQuery = trpc.modules.posIntelligence.analytics.useQuery(
    { period: period as any },
    { staleTime: 60_000 }
  );

  const data = (analyticsQuery.data || {}) as POSAnalyticsData;

  const refetch = useCallback(() => {
    utils.modules.posIntelligence.analytics.invalidate();
  }, [utils]);

  const changePeriod = useCallback((newPeriod: string) => {
    setPeriod(newPeriod);
  }, []);

  return {
    data,
    isLoading: analyticsQuery.isLoading,
    error: analyticsQuery.error,
    period,
    changePeriod,
    refetch,
  };
}
