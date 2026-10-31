/**
 * BadgeModern — Premium modern badges.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BadgeModernProps {
  children: React.ReactNode;
  variant?: "default" | "brand" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  dashed?: boolean;
  className?: string;
}

export function BadgeModern({
  children,
  variant = "default",
  size = "md",
  pulse = false,
  dashed = false,
  className,
}: BadgeModernProps) {
  const variants = {
    default: "bg-neutral-100 text-neutral-700 border-neutral-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        variants[variant],
        sizes[size],
        pulse && "animate-pulse",
        dashed && "border-dashed",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {pulse && (
        <span className="size-1.5 rounded-full bg-current animate-pulse" />
      )}
      {children}
    </motion.span>
  );
}

/**
 * AwardBadge — Premium award/achievement badge.
 */
export function AwardBadge({
  title,
  icon,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  className?: string;
}) {
  const Icon = icon;

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center",
        className
      )}
      whileHover={{ scale: 1.05, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="absolute -top-2 -right-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold shadow-lg">
          ⭐
        </span>
      </div>
      {Icon && <Icon className="size-8 text-amber-600 mx-auto mb-2" />}
      <p className="text-xs font-bold text-amber-900">{title}</p>
    </motion.div>
  );
}
