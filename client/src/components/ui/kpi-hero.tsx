import React from "react";
import { cn } from "@/lib/utils";
import { Sparkline, TrendArrow } from "@/components/ui/sparkline";
import { Donut } from "@/components/ui/donut";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/**
 * KpiHero — premium hero KPI tile for the world-class dashboard.
 *
 * Design language:
 * - Glass morphism card with tinted soft shadow (Heritage Futurism v3.0)
 * - Inline sparkline showing the trend inside the card
 * - Donut ring for multi-dimensional metrics (e.g. utilization, target vs actual)
 * - Supports both positive (growth) and negative (decline) deltas
 * - Animated entrance via CSS stagger
 *
 * Inspired by: SAP Fiori KPI tiles, Linear's metric cards, Apple's health rings.
 */

export type KpiVariant =
  | "neutral"
  | "positive"
  | "negative"
  | "info"
  | "warning";

const VARIANT_ACCENT: Record<KpiVariant, string> = {
  neutral: "var(--brand)",
  positive: "var(--success, #10b981)",
  negative: "var(--danger, #f43f5e)",
  info: "var(--info, #0ea5e9)",
  warning: "var(--warning, #f59e0b)",
};

const VARIANT_GRADIENT: Record<KpiVariant, string> = {
  neutral: "from-brand/8 via-brand/4 to-transparent",
  positive:
    "from-emerald-50 via-emerald-25 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/15",
  negative:
    "from-rose-50 via-rose-25 to-transparent dark:from-rose-950/30 dark:via-rose-950/15",
  info: "from-sky-50 via-sky-25 to-transparent dark:from-sky-950/30 dark:via-sky-950/15",
  warning:
    "from-amber-50 via-amber-25 to-transparent dark:from-amber-950/30 dark:via-amber-950/15",
};

const VARIANT_ICON_BG: Record<KpiVariant, string> = {
  neutral: "bg-brand/15 text-brand",
  positive: "bg-success/15 text-success dark:text-success",
  negative: "bg-destructive/15 text-destructive dark:text-destructive",
  info: "bg-info/15 text-info dark:text-info",
  warning: "bg-warning/15 text-warning dark:text-warning",
};

export type KpiHeroProps = {
  /** Arabic label */
  label: string;
  /** Primary value to display */
  value: string | number;
  /** Optional unit label appended to value */
  unit?: string;
  /** Percentage delta vs previous period. Positive = growth. */
  delta?: number;
  /** Trend sparkline data (array of numbers). */
  sparkline?: number[];
  /** Donut ring: 0..1 fill ratio. Shows a ring chart beside the metric. */
  donut?: { value: number; label?: string };
  /** Color variant */
  variant?: KpiVariant;
  /** Sub-label or secondary metric */
  hint?: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Click handler */
  onClick?: () => void;
  className?: string;
};

export function KpiHero({
  label,
  value,
  unit,
  delta,
  sparkline,
  donut,
  variant = "neutral",
  hint,
  icon: Icon,
  onClick,
  className,
}: KpiHeroProps) {
  const accent = VARIANT_ACCENT[variant];
  const trend =
    delta !== undefined
      ? delta > 0
        ? "up"
        : delta < 0
          ? "down"
          : "flat"
      : undefined;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "surface rounded-3xl overflow-hidden transition-all duration-300 group relative cursor-default",
        "bg-gradient-to-br shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.14)] hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        VARIANT_GRADIENT[variant],
        className
      )}
      style={{ animationDelay: "var(--stagger-delay, 0ms)" }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 inset-x-0 h-[2.5px] opacity-80"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />

      {/* Soft radial glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-20"
        style={{
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
        }}
      />

      <CardContent className="relative z-10 p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: text block */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-muted-foreground leading-tight">
              {label}
            </p>

            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl font-black text-foreground tabular-nums tracking-tight leading-none">
                {typeof value === "number"
                  ? value.toLocaleString("en-US")
                  : value}
              </span>
              {unit && (
                <span className="text-xs text-muted-foreground font-medium">
                  {unit}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {trend && <TrendArrow delta={delta!} />}
              {hint && (
                <span className="text-[10px] text-muted-foreground">
                  {hint}
                </span>
              )}
            </div>
          </div>

          {/* Right: icon or donut */}
          <div className="flex items-center gap-2 shrink-0">
            {Icon && (
              <div
                className={cn(
                  "w-9 h-9 rounded-2xl flex items-center justify-center",
                  VARIANT_ICON_BG[variant]
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
            {donut && (
              <Donut
                size={64}
                thickness={7}
                tracks={[
                  {
                    value: Math.max(0, Math.min(1, donut.value)),
                    color: accent,
                    label: donut.label,
                  },
                ]}
              />
            )}
          </div>
        </div>

        {/* Sparkline below */}
        {sparkline && sparkline.length > 1 && (
          <div className="mt-3 -mx-1">
            <Sparkline
              data={sparkline}
              tone={
                variant === "neutral"
                  ? "brand"
                  : variant === "positive"
                    ? "emerald"
                    : variant === "negative"
                      ? "rose"
                      : variant === "info"
                        ? "sky"
                        : "amber"
              }
              height={32}
              filled
              smooth
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * KpiGrid — responsive bento-style grid of KpiHero tiles.
 * 2 cols on mobile, 3 on md, 4 on lg.
 */
export function KpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
        className
      )}
    >
      {React.Children.map(children, (child, i) => (
        <div
          style={{ animationDelay: `${i * 60}ms` }}
          className="animate-in fade-in slide-in-from-bottom-2 duration-400"
        >
          {child}
        </div>
      ))}
    </div>
  );
}
