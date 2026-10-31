import React from "react";
import { cn } from "@/lib/utils";

/**
 * Sparkline — minimal inline chart for KPI cards.
 * Pure SVG (no external chart library) — zero JS overhead, sharp on retina.
 * Inspired by Stripe/Linear's compact trend visualizations.
 */
export type SparkPoint = number;

export type SparklineProps = {
  data: SparkPoint[];
  /** Stroke / fill tone — all CSS color tokens. */
  tone?: "brand" | "emerald" | "rose" | "sky" | "amber" | "violet" | "warning";
  /** Chart height in px. */
  height?: number;
  /** Filled area below the line. */
  filled?: boolean;
  /** Smooth (cubic) line vs straight segments. */
  smooth?: boolean;
  /** Show baseline at zero. */
  showBaseline?: boolean;
  className?: string;
};

const TONE_STROKE: Record<NonNullable<SparklineProps["tone"]>, string> = {
  brand: "var(--brand)",
  emerald: "var(--success, #10b981)",
  rose: "var(--danger, #f43f5e)",
  sky: "var(--info, #0ea5e9)",
  amber: "var(--warning, #f59e0b)",
  violet: "#7c3aed",
  warning: "var(--warning, #f59e0b)",
};

const TONE_FILL: Record<NonNullable<SparklineProps["tone"]>, string> = {
  brand: "var(--brand)",
  emerald: "var(--success, #10b981)",
  rose: "var(--danger, #f43f5e)",
  sky: "var(--info, #0ea5e9)",
  amber: "var(--warning, #f59e0b)",
  violet: "#7c3aed",
  warning: "var(--warning, #f59e0b)",
};

function buildPath(
  points: { x: number; y: number }[],
  smooth: boolean
): string {
  if (points.length === 0) return "";
  if (!smooth) {
    return points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`
      )
      .join(" ");
  }
  // Catmull–Rom → cubic Bezier for gentle curves.
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export function Sparkline({
  data,
  tone = "brand",
  height = 36,
  filled = true,
  smooth = true,
  showBaseline = false,
  className,
}: SparklineProps) {
  const width = 100; // viewBox width, scales to container
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  if (!data || data.length === 0) {
    return (
      <div
        className={cn("text-[10px] text-muted-foreground", className)}
        style={{ height }}
      >
        لا توجد بيانات
      </div>
    );
  }

  // Single point: render a flat dash to avoid divide-by-zero.
  if (data.length === 1) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={cn("w-full block", className)}
        style={{ height }}
        aria-label="sparkline"
      >
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke={TONE_STROKE[tone]}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.6"
        />
      </svg>
    );
  }

  const min = Math.min(...data, 0);
  const max = Math.max(...data, min + 1);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + (1 - (v - min) / range) * h,
  }));

  const path = buildPath(points, smooth);
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(2)},${(height - pad).toFixed(2)} L${points[0].x.toFixed(2)},${(height - pad).toFixed(2)} Z`;

  const last = points[points.length - 1];
  const first = points[0];
  const trend = last.y < first.y ? "up" : last.y > first.y ? "down" : "flat";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full block", className)}
      style={{ height }}
      role="img"
      aria-label={`sparkline trend ${trend}`}
    >
      <defs>
        <linearGradient
          id={`spark-grad-${tone}-${height}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={TONE_FILL[tone]} stopOpacity="0.35" />
          <stop offset="100%" stopColor={TONE_FILL[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showBaseline && (
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.15"
        />
      )}
      {filled && (
        <path d={areaPath} fill={`url(#spark-grad-${tone}-${height})`} />
      )}
      <path
        d={path}
        fill="none"
        stroke={TONE_STROKE[tone]}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* End-point dot. */}
      <circle
        cx={last.x}
        cy={last.y}
        r={1.8}
        fill={TONE_STROKE[tone]}
        stroke="var(--card, #fff)"
        strokeWidth="1"
      />
    </svg>
  );
}

/** Trend arrow helper, decoupled from the chart. */
export function TrendArrow({
  delta,
  className,
}: {
  delta: number;
  className?: string;
}) {
  if (!isFinite(delta) || delta === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground",
          className
        )}
      >
        <span>—</span>
        <span>ثابت</span>
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-bold",
        up ? "text-success" : "text-destructive",
        className
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span dir="ltr">{Math.abs(delta).toFixed(1)}%</span>
    </span>
  );
}
