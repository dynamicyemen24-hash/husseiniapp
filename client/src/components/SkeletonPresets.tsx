/**
 * SkeletonPresets — Pre-built skeleton patterns for the dashboard
 * Derived from NexoraOS enterprise skeleton patterns with Husseiniya styling
 */

import React from "react";
import { SkeletonLoader, type SkeletonShape } from "./SkeletonLoaderUpgrade";

// ─── Text Skeleton ────────────────────────────────────────────────────────────

export function SkeletonText({
  lines = 3,
  className,
  lastWidth = "70%",
}: {
  lines?: number;
  className?: string;
  lastWidth?: string;
}) {
  const shapes: SkeletonShape[] = Array.from({ length: lines }).map((_, i) => ({
    id: `text-${i}`,
    variant: "text",
    width: i === lines - 1 ? lastWidth : "100%",
    height: i === 0 ? 14 : 12,
  }));

  return <SkeletonLoader shapes={shapes} className={className} />;
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────

export function SkeletonCard({
  lines = 3,
  header = true,
  className,
}: {
  lines?: number;
  header?: boolean;
  className?: string;
}) {
  const shapes: SkeletonShape[] = [];

  if (header) {
    shapes.push(
      { id: "card-avatar", variant: "circular", width: 36, height: 36 },
      { id: "card-title", variant: "text", width: "60%", height: 14 },
      { id: "card-subtitle", variant: "text", width: "40%", height: 10 }
    );
  }

  Array.from({ length: lines }).forEach((_, i) => {
    shapes.push({
      id: `card-line-${i}`,
      variant: "text",
      width: i === 0 ? "100%" : "70%",
      height: 12,
    });
  });

  return <SkeletonLoader shapes={shapes} className={className} />;
}

// ─── KPI Card Skeleton ────────────────────────────────────────────────────────

export function SkeletonKPI({ className }: { className?: string }) {
  const shapes: SkeletonShape[] = [
    { id: "kpi-label", variant: "text", width: "40%", height: 12 },
    { id: "kpi-icon", variant: "circular", width: 32, height: 32 },
    { id: "kpi-value", variant: "text", width: "60%", height: 32 },
    { id: "kpi-sub", variant: "text", width: "50%", height: 12 },
  ];

  return <SkeletonLoader shapes={shapes} className={className} />;
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

export function SkeletonTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: number;
}) {
  const shapes: SkeletonShape[] = [];

  // Header
  columns.forEach((col, i) => {
    shapes.push({
      id: `header-${i}`,
      variant: "text",
      width: i === columns.length - 1 ? "100px" : "auto",
      height: 12,
    });
  });

  // Rows
  Array.from({ length: rows }).forEach((_, row) => {
    Array.from({ length: columns.length }).forEach((_, col) => {
      shapes.push({
        id: `row-${row}-${col}`,
        variant: "text",
        width: col === 0 ? "80px" : "120px",
        height: 12,
        className: "mt-2",
      });
    });
  });

  return <SkeletonLoader shapes={shapes} className="space-y-2" />;
}

// ─── List Skeleton ────────────────────────────────────────────────────────────

export function SkeletonList({
  items = 5,
  className,
}: {
  items?: number;
  className?: string;
}) {
  const shapes: SkeletonShape[] = [];

  Array.from({ length: items }).forEach((_, i) => {
    shapes.push(
      { id: `item-${i}-avatar`, variant: "circular", width: 32, height: 32 },
      {
        id: `item-${i}-title`,
        variant: "text",
        width: "60%",
        height: 14,
        className: "ml-2",
      },
      {
        id: `item-${i}-sub`,
        variant: "text",
        width: "40%",
        height: 10,
        className: "ml-2 mt-1",
      }
    );
  });

  return <SkeletonLoader shapes={shapes} className={className} />;
}

// ─── Dashboard Hero Skeleton ──────────────────────────────────────────────────

export function SkeletonHero({ className }: { className?: string }) {
  const shapes: SkeletonShape[] = [
    // KPI row
    { id: "hero-kpi-1", variant: "text", width: "40%", height: 12 },
    { id: "hero-kpi-2", variant: "text", width: "40%", height: 12 },
    { id: "hero-kpi-3", variant: "text", width: "40%", height: 12 },
    { id: "hero-kpi-4", variant: "text", width: "40%", height: 12 },
    // Main content
    { id: "hero-title", variant: "text", width: "60%", height: 24 },
    { id: "hero-desc", variant: "text", width: "80%", height: 14 },
    { id: "hero-desc-2", variant: "text", width: "50%", height: 14 },
    // Chart placeholder
    {
      id: "hero-chart",
      variant: "rounded",
      width: "100%",
      height: 200,
      borderRadius: "12px",
    },
  ];

  return <SkeletonLoader shapes={shapes} className={className} />;
}

// ─── Grid Skeleton ────────────────────────────────────────────────────────────

export function SkeletonGrid({
  columns = 3,
  rows = 2,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  const shapes: SkeletonShape[] = [];

  Array.from({ length: columns * rows }).forEach((_, i) => {
    shapes.push({
      id: `grid-${i}`,
      variant: "card",
      width: "100%",
      height: 120,
      className: i < columns ? "" : "mt-4",
    });
  });

  return <SkeletonLoader shapes={shapes} className={className} />;
}

// ─── Module Card Skeleton ─────────────────────────────────────────────────────

export function SkeletonModuleCard({ className }: { className?: string }) {
  const shapes: SkeletonShape[] = [
    { id: "module-icon", variant: "circular", width: 40, height: 40 },
    { id: "module-title", variant: "text", width: "70%", height: 14 },
    { id: "module-desc", variant: "text", width: "50%", height: 10 },
    {
      id: "module-action",
      variant: "rounded",
      width: "80%",
      height: 28,
      borderRadius: "6px",
    },
  ];

  return <SkeletonLoader shapes={shapes} className={className} />;
}
