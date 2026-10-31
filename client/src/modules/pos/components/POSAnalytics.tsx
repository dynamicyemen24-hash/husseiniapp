"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calculator,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/pos/utils/currency";
import { usePOSAnalytics } from "@/modules/pos/hooks/usePOSAnalytics";

export function POSAnalytics() {
  const { data, isLoading, period, changePeriod } = usePOSAnalytics();
  const [expanded, setExpanded] = useState(false);

  if (isLoading && !data.totalSales) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand" />
            تحليلات نقاط البيع
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={changePeriod}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">الأسبوع</SelectItem>
                <SelectItem value="month">الشهر</SelectItem>
                <SelectItem value="quarter">الربع</SelectItem>
                <SelectItem value="year">السنة</SelectItem>
              </SelectContent>
            </Select>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <div className="text-[10px] text-muted-foreground">
                إجمالي المبيعات
              </div>
              <div className="text-lg font-bold text-ink">
                {formatCurrency(data.totalSales || 0, "YER", 0)}
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <div className="text-[10px] text-muted-foreground">
                عدد الفواتير
              </div>
              <div className="text-lg font-bold text-ink">
                {data.invoiceCount || 0}
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <div className="text-[10px] text-muted-foreground">
                متوسط الفاتورة
              </div>
              <div className="text-lg font-bold text-ink">
                {formatCurrency(data.averageTicket || 0, "YER", 0)}
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-center">
              <div className="text-[10px] text-muted-foreground">
                أكثر المنتجات مبيعاً
              </div>
              <div className="text-sm font-bold text-ink truncate">
                {data.topProducts?.[0]?.productName || "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> حسب طريقة الدفع
              </h4>
              <div className="space-y-1">
                {(data.byMethod || []).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/20"
                  >
                    <span>{m.method}</span>
                    <span className="font-medium">
                      {formatCurrency(m.total, "YER", 0)} ({m.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> أهم المنتجات
              </h4>
              <div className="space-y-1">
                {(data.topProducts || []).slice(0, 5).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/20"
                  >
                    <span>{p.productName}</span>
                    <span className="font-medium">
                      {p.quantity} × {formatCurrency(p.revenue, "YER", 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
