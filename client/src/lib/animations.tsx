/**
 * Global Animation System — Framer Motion page transitions and micro-interactions.
 * Provides consistent animation patterns across the entire application.
 */

import * as React from "react";
import { type Variants, motion } from "framer-motion";

/**
 * Page transition variants for route changes.
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const flipIn: Variants = {
  hidden: { opacity: 0, rotateX: -15 },
  show: {
    opacity: 1,
    rotateX: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  hover: {
    y: -4,
    boxShadow: "0 20px 40px -20px rgba(0,0,0,0.15)",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.2 } },
};

export const chartVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const popVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 15 },
  },
  exit: { scale: 0, opacity: 0, transition: { duration: 0.2 } },
};

export const tabVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 100 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: 100, transition: { duration: 0.3 } },
};

export const shimmerKeyframes = `@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } } .animate-shimmer { animation: shimmer 2s infinite; }`;

/**
 * Higher-order component for animated page wrapper.
 */
export function createPageAnimation(
  variants: Variants = pageVariants,
  options: { delay?: number; duration?: number } = {}
) {
  return function PageAnimation({ children }: { children: React.ReactNode }) {
    return (
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: options.duration ?? 0.4, delay: options.delay }}
      >
        {children}
      </motion.div>
    );
  };
}

/**
 * Creates staggered list animation.
 */
export function createListAnimation(itemVariants: Variants = listItemVariants) {
  return function ListAnimation({ children }: { children: React.ReactNode }) {
    return (
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { variants: itemVariants } as never)
            : child
        )}
      </motion.div>
    );
  };
}

/**
 * Counter animation — animates numbers from 0 to target.
 */
export function useCounterAnimation(
  target: number,
  duration = 1000,
  format?: (n: number) => string
): { displayValue: string; ref: React.RefObject<HTMLSpanElement | null> } {
  const [displayValue, setDisplayValue] = React.useState(
    format ? format(0) : "0"
  );
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setDisplayValue(format ? format(current) : String(current));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, format]);

  return { displayValue, ref };
}
