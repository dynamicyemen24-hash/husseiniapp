/**
 * SmartPage — Animated page wrapper with transitions.
 * Wrap each page component with this for consistent page transitions.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  pageVariants,
  staggerContainer,
  cardVariants,
  slideUp,
} from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * AnimatedPage — Smooth page transitions with AnimatePresence.
 */
export function AnimatedPage({
  children,
  className,
  variants = pageVariants,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: typeof pageVariants;
}) {
  return (
    <motion.div
      className={cn("w-full", className)}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        when: "beforeChildren",
        staggerChildren: 0.05,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * SmartLayout — Layout wrapper with animated header, sidebar, and content.
 */
export function SmartLayout({
  header,
  sidebar,
  children,
  className,
}: {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen", className)}>
      {sidebar && (
        <motion.aside
          className="w-64 border-r border-neutral-200 bg-white/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {sidebar}
        </motion.aside>
      )}
      <div className="flex flex-1 flex-col">
        {header && (
          <motion.header
            className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-lg p-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {header}
          </motion.header>
        )}
        <motion.main
          className="flex-1 p-6"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

/**
 * StatCard — Animated stat card with counter animation.
 */
export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  className,
}: {
  title: string;
  value: number;
  change?: { label: string; positive: boolean };
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border bg-card p-6 transition-shadow hover:shadow-md",
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover="hover"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-neutral-900">
            {value.toLocaleString()}
          </h3>
        </div>
        <motion.div
          className="rounded-lg bg-brand-50 p-3"
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
        >
          <Icon className="size-6 text-brand-600" />
        </motion.div>
      </div>
      {change && (
        <motion.div
          className="mt-4 flex items-center gap-1 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.3 } }}
        >
          <span className={change.positive ? "text-green-600" : "text-red-600"}>
            {change.positive ? "↑" : "↓"} {change.label}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Card with hover animation.
 */
export function AnimatedCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={cn("rounded-xl border bg-card p-6", className)}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={hover ? "hover" : undefined}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedGrid — Responsive grid with staggered child animations.
 */
export function AnimatedGrid({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        `grid gap-6`,
        `grid-cols-1 md:grid-cols-${columns}`,
        className
      )}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              variants: slideUp,
            } as never)
          : child
      )}
    </motion.div>
  );
}
