import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "negative" | "info" | "warning";

const toneChip: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-rose-100 text-rose-700",
  info: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
};

const toneBar: Record<Tone, string> = {
  neutral: "from-brand/50 via-brand-300/30 to-transparent",
  positive: "from-emerald-400 via-emerald-200/40 to-transparent",
  negative: "from-rose-400 via-rose-200/40 to-transparent",
  info: "from-sky-400 via-sky-200/40 to-transparent",
  warning: "from-amber-400 via-amber-200/40 to-transparent",
};

/** Reusable KPI / metric card — the atomic unit of every dashboard. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  trend,
  className,
  interactive = true,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { dir: "up" | "down"; value: string };
  className?: string;
  interactive?: boolean;
}) {
  return (
    <Card
      className={cn(
        "surface relative p-4 rounded-2xl overflow-hidden transition-all duration-300",
        interactive &&
          "group hover:-translate-y-1 hover:shadow-[0_14px_36px_-14px_rgba(15,42,43,0.30)]",
        className ?? ""
      )}
    >
      {/* Accent bar — subtle brand signal, tone-aware. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80",
          toneBar[tone]
        )}
      />
      {/* Soft brand glow on hover for depth. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 -bottom-14 h-32 w-32 rounded-full bg-brand/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
          <p className="text-xl font-black mt-1.5 tabular-nums tracking-tight text-foreground truncate">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-xl shrink-0", toneChip[tone])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="relative z-10 flex items-center justify-between mt-2">
        {hint && (
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        )}
        {trend && (
          <span
            className={cn(
              "text-[10px] font-bold flex items-center gap-0.5",
              trend.dir === "up" ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {trend.dir === "up" ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
    </Card>
  );
}
