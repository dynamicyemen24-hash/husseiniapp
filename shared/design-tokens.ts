/**
 * ALHUSAINIA — Shared Design Tokens
 * ==================================
 * Single source of truth for design tokens, shared between client and server.
 * Exported as a consistent object so both environments can rely on the same values.
 *
 * Usage (client):
 *   import { designTokens, injectDesignTokens } from "@husseiniya/design-tokens";
 * Usage (server / runtime):
 *   import { designTokens } from "@husseiniya/design-tokens";
 */

export const designTokens = {
  colors: {
    brand: {
      50: "#fef3f2",
      100: "#fde8e6",
      200: "#fcd1cc",
      300: "#f9b1ad",
      400: "#f58578",
      500: "#F27059",
      600: "#E85A40",
      700: "#D44730",
      800: "#B83827",
      900: "#9A3024",
      950: "#5D1A16",
    },
    neutral: {
      0: "#FFFFFF",
      50: "#F8F9FA",
      100: "#F1F3F5",
      200: "#E9ECEF",
      300: "#DEE2E6",
      400: "#CED4DA",
      500: "#ADB5BD",
      600: "#868E96",
      700: "#495057",
      800: "#343A40",
      900: "#212529",
      950: "#1A1D20",
    },
    success: { 50: "#E6FFED", 100: "#C6F6D5", 500: "#22C55E", 600: "#16A34A" },
    warning: { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 600: "#D97706" },
    error: { 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444", 600: "#DC2626" },
    info: { 50: "#EFF6FF", 100: "#DBEAFE", 500: "#3B82F6", 600: "#2563EB" },
  },
  radius: {
    none: "0",
    sm: "0.125rem",
    base: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    brand: "0 4px 14px 0 rgb(242 112 89 / 0.35)",
    glow: "0 0 20px 4px rgb(242 112 89 / 0.25)",
  },
  transition: {
    duration: {
      instant: "150ms",
      fast: "200ms",
      normal: "300ms",
      slow: "500ms",
    },
    easing: {
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
  zIndex: {
    dropdown: 1000,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
} as const;

/**
 * Injects the design tokens as CSS custom properties on the root element.
 * Must be called once at app startup (e.g., in a root Layout component).
 */
export function injectDesignTokens(): void {
  const root = document.documentElement;
  const brand = designTokens.colors.brand;
  const neutral = designTokens.colors.neutral;
  const success = designTokens.colors.success;
  const warning = designTokens.colors.warning;
  const error = designTokens.colors.error;
  const info = designTokens.colors.info;

  Object.entries(brand).forEach(([k, v]) =>
    root.style.setProperty(`--brand-${k}`, v)
  );
  Object.entries(neutral).forEach(([k, v]) =>
    root.style.setProperty(`--neutral-${k}`, v)
  );
  Object.entries(success).forEach(([k, v]) =>
    root.style.setProperty(`--success-${k}`, v)
  );
  Object.entries(warning).forEach(([k, v]) =>
    root.style.setProperty(`--warning-${k}`, v)
  );
  Object.entries(error).forEach(([k, v]) =>
    root.style.setProperty(`--error-${k}`, v)
  );
  Object.entries(info).forEach(([k, v]) =>
    root.style.setProperty(`--info-${k}`, v)
  );
}

/**
 * Extracts the computed token value for a given path.
 * Useful for server-side rendering or runtime theming.
 */
export function getToken(path: keyof typeof designTokens): unknown {
  const parts = path.toString().split(".");
  let value: unknown = designTokens;
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}