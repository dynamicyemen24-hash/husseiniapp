/**
 * Glass Morphism Components — Premium frosted glass UI effects.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";

interface GlassProps {
  className?: string;
  variant?: "light" | "dark" | "brand";
  blur?: number;
  opacity?: number;
  border?: boolean;
  shadow?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  whileHover?: boolean;
  whileTap?: boolean;
}

const glassVariants: Record<string, Variants> = {
  light: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  dark: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  brand: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.98 },
  },
};

export function Glass({
  className,
  variant = "light",
  blur = 20,
  opacity = 0.85,
  border = true,
  shadow = false,
  children,
  onClick,
  whileHover = true,
  whileTap = true,
}: GlassProps) {
  const variants = glassVariants[variant];

  const blurClass = `backdrop-blur-[${blur}px]`;

  const baseClasses = cn(
    "relative overflow-hidden",
    "transition-all duration-300",
    blurClass,
    variant === "light" && "bg-white/5 border-white/20 shadow-sm",
    variant === "dark" && "bg-neutral-900/60 border-neutral-700/30",
    variant === "brand" && "bg-brand-500/10 border-brand-500/20",
    border && "border",
    shadow && "shadow-lg",
    onClick && "cursor-pointer",
    className
  );

  const style = {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    backgroundColor:
      variant === "dark"
        ? `rgba(26, 29, 32, ${opacity})`
        : variant === "brand"
          ? `rgba(242, 112, 89, ${opacity * 0.15})`
          : `rgba(255, 255, 255, ${opacity})`,
  };

  if (onClick) {
    return (
      <motion.div
        className={baseClasses}
        style={style}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={baseClasses}
      style={style}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/**
 * Glass Card — A premium card with glass effect.
 */
export function GlassCard({
  className,
  children,
  padding = "p-6",
  hover = true,
}: {
  className?: string;
  children: React.ReactNode;
  padding?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-sm hover:shadow-md transition-shadow duration-300",
        hover && "hover:bg-white/10",
        padding,
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Glass Badge — Frosted glass badge/pill.
 */
export function GlassBadge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "brand";
}) {
  const variants = {
    default: "bg-white/10 text-white border-white/20",
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    brand: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Glass Panel — A larger glass panel for sections.
 */
export function GlassPanel({
  className,
  children,
  header,
}: {
  className?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl",
        "shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {header && (
        <div className="border-b border-white/10 px-6 py-4">{header}</div>
      )}
      <div className="p-6">{children}</div>
    </motion.div>
  );
}
