/**
 * ChartCard — AI-analyzed dashboard card with insights.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";

interface ChartCardProps {
  title: string;
  value: string | number;
  change?: { label: string; positive: boolean; percentage: number };
  sparkline?: number[];
  insight?: string;
  icon?: React.ElementType;
  className?: string;
}

export function ChartCard({
  title,
  value,
  change,
  sparkline = [],
  insight,
  icon: Icon,
  className,
}: ChartCardProps) {
  const TrendIcon = change
    ? change.positive
      ? TrendingUp
      : TrendingDown
    : Minus;

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200 bg-card p-6 transition-all hover:shadow-lg dark:border-neutral-700",
        className
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Top accent bar */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand to-brand-300 rounded-l-2xl" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-black text-neutral-900 mt-1">{value}</h3>
        </div>
        {Icon && (
          <div className="rounded-xl bg-brand-50 p-3">
            <Icon className="size-6 text-brand-600" />
          </div>
        )}
      </div>

      {change && (
        <motion.div
          className="mt-4 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold",
              change.positive
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}
          >
            <TrendIcon className="size-3" />
            {change.percentage}%
          </span>
          <span className="text-xs text-neutral-500">{change.label}</span>
        </motion.div>
      )}

      {sparkline.length > 0 && (
        <div className="mt-4 flex items-end gap-0.5 h-12">
          {sparkline.map((val, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-brand-200 transition-all hover:bg-brand-400"
              style={{ height: `${val}%` }}
              initial={{ height: 0 }}
              animate={{ height: `${val}%` }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            />
          ))}
        </div>
      )}

      {insight && (
        <motion.div
          className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Sparkles className="size-3 mt-0.5 shrink-0" />
          {insight}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * DashboardGrid — Responsive dashboard grid with bento layout.
 */
export function DashboardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * BentoCard — Modern bento grid card.
 */
export function BentoCard({
  children,
  className,
  featured = false,
}: {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-neutral-200 bg-card p-6 transition-all hover:shadow-lg dark:border-neutral-700",
        featured && "md:col-span-2",
        className
      )}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.div>
  );
}
