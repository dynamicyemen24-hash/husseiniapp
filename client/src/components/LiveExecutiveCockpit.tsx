import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkline, type SparklineProps } from "@/components/ui/sparkline";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  LucideIcon,
} from "lucide-react";

export interface CockpitMetric {
  label: string;
  value: string | number;
  delta?: number;
  direction?: "up" | "down" | "neutral";
  sparkline?: number[];
  icon?: LucideIcon;
  href?: string;
}

export interface CockpitAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: Date;
  actionable?: boolean;
  actionHref?: string;
}

export interface CockpitAiInsight {
  id: string;
  category: string;
  headline: string;
  summary: string;
  score?: number;
  recommended?: boolean;
  actionHref?: string;
  timestamp: Date;
}

interface LiveExecutiveCockpitProps {
  showAiPanel?: boolean;
  loading?: boolean;
  title?: string;
  onRefresh?: () => void;
  compact?: boolean;
  detailPage?: string;
}

export function LiveExecutiveCockpit({
  showAiPanel = true,
  loading = false,
  title = "لوحة القيادة التنفيذية",
  onRefresh,
  compact = false,
  detailPage = "/analytics",
}: LiveExecutiveCockpitProps) {
  const [alerts, setAlerts] = useState<CockpitAlert[]>([]);
  const [insights, setInsights] = useState<CockpitAiInsight[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<CockpitMetric[]>([]);
  const [hideInsights, setHideInsights] = useState(false);

  useEffect(() => {
    if (loading) return;
    const buildMetrics = (): CockpitMetric[] => {
      return [
        {
          label: "الإيرادات اليومية",
          value: "12,847 ر.ي",
          delta: 8.4,
          direction: "up",
          sparkline: [3, 5, 6, 7, 8, 9, 11, 12],
          icon: DollarSign,
        },
        {
          label: "عدد المعاملات",
          value: "342",
          delta: 11.2,
          direction: "up",
          sparkline: [10, 12, 11, 14, 16, 15, 17, 18],
          icon: ShoppingCart,
        },
        {
          label: "المخزون المتاح",
          value: "1,284 صنف",
          delta: -2.1,
          direction: "down",
          sparkline: [60, 58, 56, 53, 50, 47, 44, 42],
          icon: Package,
        },
        {
          label: "العملاء الجدد",
          value: "18",
          delta: 5.5,
          direction: "up",
          sparkline: [1, 2, 3, 4, 4, 6, 5, 9],
          icon: Users,
        },
        {
          label: "كفاءة المبيعات",
          value: "87%",
          delta: 0,
          direction: "neutral",
          sparkline: [70, 72, 75, 76, 78, 80, 82, 80],
          icon: BarChart3,
        },
      ];
    };
    const buildAlerts = (): CockpitAlert[] => {
      return [
        {
          id: "a1",
          severity: "critical",
          title: "انخفاض في مخزون منتج حرج",
          message: "المنتج POS-0012 وصل إلى الحد الأدنى (3 وحدات)",
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
          actionable: true,
          actionHref: "/inventory?filter=low-stock",
        },
        {
          id: "a2",
          severity: "warning",
          title: "ارتفاع في عدد المرتجعات",
          message: "23 مرتجعة خلال ساعة (4.2% من المعاملات)",
          timestamp: new Date(Date.now() - 35 * 60 * 1000),
        },
        {
          id: "a3",
          severity: "info",
          title: "حملة تسويقية قيد التنفيذ",
          message: "847 مشارك خلال ساعتين",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ];
    };
    const buildInsights = (): CockpitAiInsight[] => {
      return [
        {
          id: "i1",
          category: "المبيعات",
          headline: "رقم قياسي في مبيعات المنتجات العضوية",
          summary: "ارتفعت المبيعات 34% هذا الأسبوع",
          score: 92,
          recommended: true,
          actionHref: `${detailPage}#organic`,
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
        },
        {
          id: "i2",
          category: "المخزون",
          headline: "منتج قيد النقص",
          summary: "ثلاثة منتجات وصلت إلى 15% من المخزون المستهدف",
          score: 78,
          recommended: true,
          actionHref: "/inventory?filter=low-stock",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: "i3",
          category: "العملاء",
          headline: "أنماط شراء جديدة في فئة الشباب",
          summary: "زادت نسبة الشباب الذين يشترون المنتجات الرقمية 22%",
          score: 85,
          recommended: false,
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        },
      ];
    };
    setMetrics(buildMetrics());
    setAlerts(buildAlerts());
    setInsights(buildInsights());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, [onRefresh]);

  const getSeverityIcon = (severity: CockpitAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case "warning":
        return <Zap className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-sky-500" />;
    }
  };

  const getDirectionIcon = (direction: CockpitMetric["direction"]) => {
    switch (direction) {
      case "up":
        return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case "down":
        return <ArrowDownRight className="h-4 w-4 text-rose-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDelta = (delta?: number) => {
    if (delta === undefined || delta === 0) return null;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)}%`;
  };

  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  const currentTime = new Date();

  const timeAgo = (date: Date) => {
    const diff = currentTime.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} أيام`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-muted mt-1">
              رؤية شاملة فورية لأداء الأعمال
            </p>
          </div>
          <div className="flex items-center gap-3">
            {criticalAlerts > 0 && (
              <Badge className="bg-rose-500/15 text-rose-600 border-rose-200 px-3 py-1 text-xs font-bold">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticalAlerts} حرجة
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              تحديث
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {metrics.map(m => {
            const Icon = m.icon ?? Activity;
            const tone: SparklineProps["tone"] =
              m.direction === "up"
                ? "emerald"
                : m.direction === "down"
                  ? "rose"
                  : "brand";
            return (
              <Card key={m.label} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    {getDirectionIcon(m.direction)}
                  </div>
                  <CardTitle className="text-[13px] font-semibold text-muted-foreground mt-3">
                    {m.label}
                  </CardTitle>
                  <p className="text-2xl font-bold text-ink mt-1">{m.value}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {formatDelta(m.delta) && (
                      <span
                        className={`text-xs font-bold ${
                          m.direction === "up"
                            ? "text-emerald-600"
                            : m.direction === "down"
                              ? "text-rose-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {formatDelta(m.delta)}
                      </span>
                    )}
                    {m.sparkline && (
                      <Sparkline
                        data={m.sparkline}
                        tone={tone}
                        height={28}
                        className="flex-1 max-w-[110px]"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alerts + AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-brand" /> التنبيهات الحية
              </CardTitle>
              <Badge variant="outline">{alerts.length} تنبيه</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد تنبيهات حالياً
                </p>
              ) : (
                alerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border p-3"
                  >
                    {getSeverityIcon(a.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink">{a.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          منذ {timeAgo(a.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.message}
                      </p>
                      {a.actionable && a.actionHref && (
                        <a
                          href={a.actionHref}
                          className="inline-flex items-center gap-0.5 text-xs font-bold text-brand mt-1.5 hover:underline"
                        >
                          عرض التفاصيل
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {showAiPanel && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-brand" /> رؤى الذكاء الاصطناعي
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={() => setHideInsights(h => !h)}
                >
                  {hideInsights ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs">
                    {hideInsights ? "إظهار الرؤى" : "إخفاء الرؤى"}
                  </span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {hideInsights ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    الرؤى مخفية — اضغط "إظهار الرؤى" مرة أخرى
                  </p>
                ) : insights.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    لا توجد رؤى متاحة حالياً
                  </p>
                ) : (
                  insights.map(i => (
                    <div key={i.id} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-brand/10 text-brand border-brand/20 text-[10px]">
                          {i.category}
                        </Badge>
                        {i.recommended && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                            مُوصى به
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-bold text-ink mt-2">
                        {i.headline}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {i.summary}
                      </p>
                      {typeof i.score === "number" && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>درجة الثقة</span>
                            <span>{i.score}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${i.score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
