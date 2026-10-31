import React from "react";
import { cn } from "@/lib/utils";

/**
 * HeatmapCalendar — GitHub-style contribution heatmap for the dashboard.
 * Useful for "sales activity", "attendance", "expense heat".
 * 7 rows × N columns. Each cell color intensity reflects the value bucket.
 */
export type HeatmapCell = {
  date: string; // ISO date
  value: number;
};

export function HeatmapCalendar({
  cells,
  weeks = 26,
  className,
  ariaLabel = "نشاط آخر 6 أشهر",
}: {
  cells: HeatmapCell[];
  weeks?: number;
  className?: string;
  ariaLabel?: string;
}) {
  // Build a date → value map.
  const map = new Map<string, number>();
  for (const c of cells) map.set(c.date.slice(0, 10), c.value);

  // Find max for intensity scaling.
  let max = 0;
  for (const v of map.values()) if (v > max) max = v;
  max = max || 1;

  // Generate date list for the last `weeks * 7` days.
  const today = new Date();
  const days: { date: Date; iso: string }[] = [];
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: d, iso: d.toISOString().slice(0, 10) });
  }

  // Group by week (column).
  const columns: { date: Date; iso: string; value: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { date: Date; iso: string; value: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = days[w * 7 + d];
      if (!day) continue;
      col.push({
        date: day.date,
        iso: day.iso,
        value: map.get(day.iso) ?? 0,
      });
    }
    columns.push(col);
  }

  // Compute intensity bucket.
  function intensity(v: number): number {
    if (v <= 0 || max === 0) return 0;
    const r = v / max;
    if (r > 0.75) return 4;
    if (r > 0.5) return 3;
    if (r > 0.25) return 2;
    return 1;
  }

  const weekdayLabels = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

  return (
    <div
      className={cn("flex gap-1 overflow-x-auto", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex flex-col gap-1 text-[9px] text-muted-foreground pt-0 shrink-0">
        {weekdayLabels.map((l, i) => (
          <div
            key={l}
            className="h-3 flex items-center"
            style={{ visibility: i % 2 === 0 ? "visible" : "hidden" }}
          >
            {l}
          </div>
        ))}
      </div>
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1 shrink-0">
          {col.map(cell => {
            const k = intensity(cell.value);
            return (
              <div
                key={cell.iso}
                title={`${cell.iso} • ${cell.value}`}
                className={cn(
                  "h-3 w-3 rounded-[3px] transition-colors",
                  k === 0 && "bg-muted",
                  k === 1 && "bg-brand/30",
                  k === 2 && "bg-brand/55",
                  k === 3 && "bg-brand/80",
                  k === 4 && "bg-brand"
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
