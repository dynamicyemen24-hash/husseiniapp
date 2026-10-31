/**
 * ALHUSAINIA — Client Design System
 * =================================
 * Advanced design system application for the React client.
 * Composes the shared design tokens into reusable React primitives,
 * theming utilities, and component patterns.
 *
 * This module bridges the shared design-tokens with the React UI layer,
 * providing a consistent theming experience across all components.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Design tokens placeholder - will be replaced by @alhusseiniya/design-tokens when built
const designTokens = {
  colors: {
    brand: { 50: "#f0f9ff", 100: "#e0f2fe", 500: "#0ea5e9", 600: "#0284c7" },
    neutral: { 50: "#fafafa", 100: "#f5f5f5", 500: "#737373", 900: "#171717" },
    success: { 500: "#22c55e" },
    warning: { 500: "#f59e0b" },
    error: { 500: "#ef4444" },
    info: { 500: "#3b82f6" },
  },
  radius: { none: "0", sm: "0.125rem", base: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem", "2xl": "1rem", full: "9999px" },
  shadows: { sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)", base: "0 1px 3px 0 rgb(0 0 0 / 0.1)", md: "0 4px 6px -1px rgb(0 0 0 / 0.1)", lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)", xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)", brand: "0 0 0 3px rgb(14 165 233 / 0.4)", glow: "0 0 20px rgb(14 165 233 / 0.5)" },
  transition: { duration: { instant: "0ms", fast: "150ms", normal: "200ms", slow: "300ms" }, easing: { easeIn: "cubic-bezier(0.4, 0, 1, 1)", easeOut: "cubic-bezier(0, 0, 0.2, 1)", easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)" } },
  zIndex: { dropdown: 1000, modal: 1100, popover: 1200, tooltip: 1300, toast: 1400 },
};

type DesignTokens = typeof designTokens;

// Internal cache for whether tokens have already been injected
let tokensInjected = false;

/**
 * Ensures design tokens are injected into the DOM only once.
 * Runs on both client and server (no-op on server).
 */
export function ensureDesignTokensInjected(): void {
  if (typeof window === "undefined") return;
  if (!tokensInjected) {
    // Inject CSS custom properties
    const root = document.documentElement;
    Object.entries(designTokens.colors).forEach(([category, values]) => {
      Object.entries(values).forEach(([shade, value]) => {
        root.style.setProperty(`--color-${category}-${shade}`, value);
      });
    });
    Object.entries(designTokens.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });
    Object.entries(designTokens.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    tokensInjected = true;
  }
}

type ThemeContextValue = {
  tokens: DesignTokens;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "light" }: { children: ReactNode; defaultTheme?: "light" | "dark" }) {
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(defaultTheme);

  useEffect(() => {
    ensureDesignTokensInjected();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ tokens: designTokens, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** useTheme — Hook to access design tokens within components.
 * Provides typed access to the full design token object.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Token utilities — commonly used token getters with TypeScript types.
 */

export type ColorKey = keyof DesignTokens["colors"];
export type RadiusKey = keyof DesignTokens["radius"];
export type ShadowKey = keyof DesignTokens["shadows"];
export type TransitionKey = keyof DesignTokens["transition"];
export type ZIndexKey = keyof DesignTokens["zIndex"];

export const getColor = (key: ColorKey) => designTokens.colors[key];
export const getRadius = (key: RadiusKey) => designTokens.radius[key];
export const getShadow = (key: ShadowKey) => designTokens.shadows[key];
export const getTransition = (key: TransitionKey) => designTokens.transition[key];
export const getZIndex = (key: ZIndexKey) => designTokens.zIndex[key];

/**
 * CSS class generation from design tokens.
 * Converts token paths to Tailwind-compatible class names.
 */

export function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Responsive token mapping for common design properties.
 */

export type ResponsiveToken = {
  base: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
};

export const resolveResponsive = (
  token: ResponsiveToken,
  scale: "sm" | "md" | "lg" | "xl" = "base"
): string => token[scale] || token.base;

/**
 * Z-index layer utilities.
 */
export const zIndex = {
  dropdown: designTokens.zIndex.dropdown,
  modal: designTokens.zIndex.modal,
  popover: designTokens.zIndex.popover,
  tooltip: designTokens.zIndex.tooltip,
  toast: designTokens.zIndex.toast,
  header: 1010,
  sidebar: 1020,
  overlay: 1030,
} as const;

/**
 * Shadow utilities.
 */
export const shadow = {
  none: "none",
  sm: designTokens.shadows.sm,
  base: designTokens.shadows.base,
  md: designTokens.shadows.md,
  lg: designTokens.shadows.lg,
  xl: designTokens.shadows.xl,
  brand: designTokens.shadows.brand,
  glow: designTokens.shadows.glow,
} as const;

/**
 * Border radius utilities.
 */
export const radius = {
  none: designTokens.radius.none,
  sm: designTokens.radius.sm,
  base: designTokens.radius.base,
  md: designTokens.radius.md,
  lg: designTokens.radius.lg,
  xl: designTokens.radius.xl,
  "2xl": designTokens.radius["2xl"],
  full: designTokens.radius.full,
} as const;

/**
 * Color utilities (Tailwind-compatible).
 */
export const color = {
  brand: designTokens.colors.brand,
  neutral: designTokens.colors.neutral,
  success: designTokens.colors.success,
  warning: designTokens.colors.warning,
  error: designTokens.colors.error,
  info: designTokens.colors.info,
} as const;

/**
 * Transition utilities.
 */
export const transition = {
  instant: designTokens.transition.duration.instant,
  fast: designTokens.transition.duration.fast,
  normal: designTokens.transition.duration.normal,
  slow: designTokens.transition.duration.slow,
  easeIn: designTokens.transition.easing.easeIn,
  easeOut: designTokens.transition.easing.easeOut,
  easeInOut: designTokens.transition.easing.easeInOut,
} as const;

/**
 * Exports the design system for external consumption.
 * Clients can import specific utilities as needed.
 */
export type {
  DesignTokens,
  ColorKey,
  RadiusKey,
  ShadowKey,
  TransitionKey,
  ZIndexKey,
  ResponsiveToken,
};

export {
  designTokens,
  ensureDesignTokensInjected,
  ThemeProvider,
  useTheme,
  getColor,
  getRadius,
  getShadow,
  getTransition,
  getZIndex,
  cn,
  resolveResponsive,
  zIndex,
  shadow,
  radius,
  color,
  transition,
};