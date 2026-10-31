import React from "react";
import { cn } from "@/lib/utils";

/**
 * DonutChart — pure-SVG ring chart for dashboard hero tiles.
 * - Static export (no runtime data) for zero-dep; for dynamic data, pass numeric `value` + `max`.
 * - Concentric rings possible via `tracks`.
 * Inspired by Apple Health rings, Linear's usage meters, and SAP Fiori KPI tiles.
 */
export type DonutTrack = {
  /** 0..1 fill ratio. */
  value: number;
  /** CSS color string (token or hex). */
  color: string;
  /** Track label rendered in the legend. */
  label?: string;
  /** Optional unit for the center caption (e.g. "YER", "%"). */
  unit?: string;
  /** Optional caption shown beneath the headline. */
  caption?: string;
  /** Optional raw value displayed in the center. */
  displayValue?: string | number;
};

export function Donut({
  size = 140,
  thickness = 14,
  tracks,
  className,
}: {
  size?: number;
  thickness?: number;
  tracks: DonutTrack[];
  className?: string;
}) {
  const radius = (size - thickness) / 2;
  const c = 2 * Math.PI * radius;
  const gap = 4; // gap between tracks in degrees
  const totalGap = gap * tracks.length;
  const usable = 360 - totalGap;
  let offset = -90; // start at 12 o'clock

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border, rgba(0,0,0,0.06))"
          strokeWidth={thickness}
        />
        {tracks.map((t, i) => {
          const ratio = Math.max(0, Math.min(1, t.value));
          const len = (usable * ratio) / 360;
          const arc = (usable * (1 - ratio)) / 360;
          const rotate = offset + (usable - arc) / 2;
          offset += usable + gap;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={t.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${len} ${c - len}`}
              transform={`rotate(${rotate} ${size / 2} ${size / 2})`}
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.08))" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {tracks[0]?.displayValue !== undefined && (
          <span className="text-lg font-black text-foreground tabular-nums">
            {tracks[0].displayValue}
            {tracks[0].unit && (
              <span className="text-[10px] text-muted-foreground mr-1">
                {tracks[0].unit}
              </span>
            )}
          </span>
        )}
        {tracks[0]?.caption && (
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {tracks[0].caption}
          </span>
        )}
      </div>
    </div>
  );
}
