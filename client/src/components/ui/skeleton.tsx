/**
 * Skeleton — Legacy Skeleton component for backward compatibility.
 */
export function Skeleton({
  className,
  width,
  height,
}: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <Shimmer
      className={cn("h-4 rounded", className)}
      width={width}
      height={height}
    />
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

/**
 * Shimmer effect — the premium loading animation used by Apple, Google, etc.
 */
export function Shimmer({ className, width, height, style }: ShimmerProps) {
  return (
    <div
      className={cn("skeleton-shimmer rounded", className)}
      style={{ width, height, ...style }}
    />
  );
}

/**
 * Text Skeleton with multiple lines and shimmer.
 */
export function SkeletonText({
  lines = 3,
  className,
  lineHeight = "h-4",
  gap = "gap-2",
}: {
  lines?: number;
  className?: string;
  lineHeight?: string;
  gap?: string;
}) {
  return (
    <div className={cn("space-y-2", gap, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn(lineHeight, i === lines - 1 && "w-3/4")}
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

/**
 * Card Skeleton — Premium card loading state.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <Shimmer className="size-12 rounded-full" />
        <div className="space-y-3 flex-1">
          <Shimmer className="h-5 w-3/4" />
          <Shimmer className="h-4 w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonText lines={3} lineHeight="h-3" gap="gap-1" />
      </div>
      <div className="flex gap-2">
        <Shimmer className="h-9 flex-1 rounded-lg" />
        <Shimmer className="h-9 flex-1 rounded-lg" />
      </div>
    </motion.div>
  );
}

/**
 * Table Skeleton — Premium table loading state.
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header row */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer
            key={`header-${i}`}
            className="h-5 rounded"
            style={{ width: i === 0 ? "25%" : "15%" }}
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={`row-${rowIndex}`}
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: rowIndex * 0.05 }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Shimmer
              key={`${rowIndex}-${colIndex}`}
              className="h-4 rounded"
              style={{ width: colIndex === 0 ? "20%" : "15%" }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Chart Skeleton — For loading chart states.
 */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-6",
        className
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between mb-6">
        <Shimmer className="h-6 w-40" />
        <Shimmer className="h-8 w-24" />
      </div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <Shimmer
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Profile Skeleton — For loading user profile states.
 */
export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-6">
        <Shimmer className="size-20 rounded-full" />
        <div className="space-y-3 flex-1">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-5 w-32" />
        </div>
        <Shimmer className="h-10 w-24 rounded-lg" />
      </div>
      <SkeletonText lines={4} lineHeight="h-3" gap="gap-2" />
    </motion.div>
  );
}

/**
 * Dashboard Skeleton — For loading dashboard states.
 */
export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Shimmer className="h-4 w-24" />
                <Shimmer className="size-8 rounded-lg" />
              </div>
              <Shimmer className="h-8 w-32" />
              <Shimmer className="h-3 w-48" />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <SkeletonChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <Shimmer className="h-6 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Shimmer className="size-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Shimmer className="h-4 w-3/4" />
                  <Shimmer className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
