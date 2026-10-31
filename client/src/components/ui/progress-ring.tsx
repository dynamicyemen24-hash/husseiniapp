import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Zap,
  Clock,
  Target,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

/**
 * BusinessHealthScore — composite health indicator widget.
 * Inspired by: SAP Fiori KPI tile, Odoo dashboard health indicators, Daftara scorecards.
 *
 * Computes a 0–100 score across 5 dimensions:
 *   1. Liquidity   — cash flow / current liabilities
 *   2. Profitability — net income / revenue
 *   3. Receivables  — DSO vs industry benchmark
 *   4. Payables     — DPO vs industry benchmark
 *   5. Inventory    — stock turnover vs target
 */
export type HealthDimension = {
  key: string;
  label: string;
  score: number; // 0..100
  icon: React.ComponentType<{ className?: string }>;
  detail?: string;
};

export type BusinessHealthScoreProps = {
  title?: string;
  overall: number; // 0..100
  dimensions: HealthDimension[];
  className?: string;
};

const SCORE_LABEL: Record<string, { text: string; color: string; bg: string }> =
  {
    excellent: {
      text: "ممتاز",
      color: "text-success dark:text-success",
      bg: "bg-success/15 dark:bg-emerald-900/30",
    },
    good: {
      text: "جيد",
      color: "text-info dark:text-info",
      bg: "bg-info/15 dark:bg-sky-900/30",
    },
    fair: {
      text: "مقبول",
      color: "text-warning dark:text-warning",
      bg: "bg-warning/15 dark:bg-amber-900/30",
    },
    poor: {
      text: "ضعيف",
      color: "text-destructive dark:text-destructive",
      bg: "bg-destructive/15 dark:bg-rose-900/30",
    },
    critical: {
      text: "حرج",
      color: "text-destructive dark:text-destructive",
      bg: "bg-rose-200 dark:bg-rose-900/50",
    },
  };

function scoreBand(s: number) {
  if (s >= 85) return "excellent";
  if (s >= 70) return "good";
  if (s >= 50) return "fair";
  if (s >= 25) return "poor";
  return "critical";
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const s = Math.max(0, Math.min(100, score));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const fill = (s / 100) * c;
  const band = scoreBand(s);
  const cfg = SCORE_LABEL[band];
  const color =
    band === "excellent"
      ? "#10b981"
      : band === "good"
        ? "#0ea5e9"
        : band === "fair"
          ? "#f59e0b"
          : "#f43f5e";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${c - fill}`}
          strokeDashoffset={c / 4}
          style={{
            filter: `drop-shadow(0 0 4px ${color}55)`,
            transition: "stroke-dasharray 0.8s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-foreground tabular-nums leading-none">
          {s}
        </span>
        <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
          {cfg.text}
        </span>
      </div>
    </div>
  );
}

export function BusinessHealthScore({
  title = "مؤشر صحة المنشأة",
  overall,
  dimensions,
  className,
}: BusinessHealthScoreProps) {
  const band = scoreBand(overall);
  const cfg = SCORE_LABEL[band];

  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
        <CardTitle className="text-xs font-bold flex-1">{title}</CardTitle>
        <Badge
          className={cn("text-[10px] font-bold px-2 py-0.5", cfg.color, cfg.bg)}
        >
          {cfg.text}
        </Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <ScoreRing score={overall} size={80} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              التقييم الإجمالي لصحة المنشأة
            </p>
            <div className="mt-1.5 space-y-1">
              {dimensions.slice(0, 3).map(d => (
                <div key={d.key} className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${d.score}%`,
                        background:
                          scoreBand(d.score) === "excellent"
                            ? "#10b981"
                            : scoreBand(d.score) === "good"
                              ? "#0ea5e9"
                              : scoreBand(d.score) === "fair"
                                ? "#f59eb"
                                : "#f43f5e",
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground w-6 text-left tabular-nums">
                    {d.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dimensions.map(d => {
            const Icon = d.icon;
            return (
              <div
                key={d.key}
                className="rounded-xl border border-border bg-muted/30 p-2 text-center"
              >
                <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{d.label}</p>
                <p
                  className={cn(
                    "text-sm font-black tabular-nums mt-0.5",
                    cfg.color
                  )}
                >
                  {d.score}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * BenchmarkComparison — compares a metric vs industry benchmark.
 * Inspired by SAP Fiori benchmark tiles and Odoo KPI comparisons.
 */
export function BenchmarkComparison({
  label,
  actual,
  benchmark,
  unit = "%",
  className,
}: {
  label: string;
  actual: number;
  benchmark: number;
  unit?: string;
  className?: string;
}) {
  const ratio = actual / (benchmark || 1);
  const delta = ((actual - benchmark) / (benchmark || 1)) * 100;
  const above = delta >= 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-black text-foreground tabular-nums">
            {actual.toFixed(1)}
          </span>
          <span className="text-[9px] text-muted-foreground">
            / {benchmark.toFixed(1)}
            {unit}
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              above ? "bg-success" : "bg-destructive"
            )}
            style={{ width: `${Math.min(100, Math.max(0, ratio * 50))}%` }}
          />
        </div>
      </div>
      <div
        className={cn(
          "text-[10px] font-bold flex items-center gap-0.5 shrink-0",
          above ? "text-success" : "text-destructive"
        )}
      >
        {above ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        <span dir="ltr">{Math.abs(delta).toFixed(1)}%</span>
      </div>
    </div>
  );
}
