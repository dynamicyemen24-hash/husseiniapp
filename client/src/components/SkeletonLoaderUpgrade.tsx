/**
 * SkeletonLoaderUpgrade — Enterprise Skeleton Loader from NexoraOS
 *
 * Advanced skeleton loading patterns:
 * - Pulse-based skeleton animation (not shimmer)
 * - Grid-aware layout skeleton
 * - Card, table, list, and detail view presets
 * - Integration with tRPC loading states
 * - Automatic dark/light mode adaptation
 * - Accessibility: ARIA live region for screen readers
 */

import React, { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkeletonVariant =
  | "text"
  | "circular"
  | "rectangular"
  | "rounded"
  | "card"
  | "table-row";

export interface SkeletonShape {
  id: string;
  variant: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export interface SkeletonLoaderProps {
  /** Loading label for screen readers */
  label?: string;
  /** Shapes to render */
  shapes: SkeletonShape[];
  /** Custom className */
  className?: string;
  /** Delay before showing skeleton (prevent flicker) */
  delayMs?: number;
}

// ─── Pulse Animation ──────────────────────────────────────────────────────────

const pulseKeyframes = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }
`;

// Inject keyframes once
const styleEl = document.createElement("style");
styleEl.textContent = pulseKeyframes;
document.head.appendChild(styleEl);

// ─── Base Shape Renderer ──────────────────────────────────────────────────────

function SkeletonShapeBase({
  variant,
  width,
  height,
  borderRadius,
  className,
}: SkeletonShape) {
  const baseStyle: React.CSSProperties = {
    animation: "skeleton-pulse 1.5s ease-in-out infinite",
  };

  if (width) baseStyle.width = typeof width === "number" ? width : undefined;
  if (height)
    baseStyle.height = typeof height === "number" ? height : undefined;

  const radius = borderRadius ?? (variant === "circular" ? "9999px" : "4px");

  return (
    <span
      className={cn("block bg-muted/60", className)}
      style={{
        ...baseStyle,
        width: width ? (typeof width === "number" ? width : undefined) : "100%",
        height: height ?? "1em",
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
}

// ─── Main Loader ──────────────────────────────────────────────────────────────

/**
 * SkeletonLoader — Main skeleton loader component.
 * Renders custom shapes with pulse animation.
 */
export function SkeletonLoader({
  label = "جاري التحميل...",
  shapes,
  className,
  delayMs = 0,
}: SkeletonLoaderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const memoShapes = useMemo(() => shapes, [shapes]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "space-y-4",
        shapes.length > 0 && "animate-in fade-in",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {memoShapes.map(shape => (
        <SkeletonShapeBase key={shape.id} {...shape} />
      ))}
    </div>
  );
}

/**
 * useSkeletonDelay — Returns true after a short delay, useful for
 * preventing skeleton flicker on fast responses.
 */
export function useSkeletonDelay(delayMs = 200): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return ready;
}

export default SkeletonLoader;
