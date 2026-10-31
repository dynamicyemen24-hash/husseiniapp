/**
 * client/src/lib/numeric.ts — Defensive numeric helpers
 * ==========================================================================
 * Small, dependency-free helpers for parsing and validating numeric inputs
 * that arrive from the API (decimal strings), form fields, or legacy code
 * that mixes `string` and `number`. Centralising this logic here means
 * every accounting / inventory / reporting surface agrees on:
 *
 *  • What "missing / empty / NaN" means
 *  • How to coerce strings without crashing
 *  • How to detect non-positive values for safety checks
 *
 * The helpers are intentionally side-effect-free and tree-shakeable so
 * they can be imported by both client and (transpiled) server bundles.
 *
 * @module lib/numeric
 */

/** Default fallback when coercion fails (zero is safest for sum-style maths). */
export const NUMERIC_FALLBACK = 0;

/** Tolerance for floating-point comparison (matches `accountingReports.EPSILON`). */
export const NUMERIC_EPSILON = 0.01;

/**
 * Coerce a value into a finite number, falling back to `fallback` on
 * any non-numeric / null / undefined input. Pure: no exceptions thrown.
 *
 * @param value     Anything stringifiable to a number.
 * @param fallback  Value to return when coercion fails (default 0).
 */
export function safeToNumber(
  value: unknown,
  fallback: number = NUMERIC_FALLBACK
): number {
  if (value === null || value === undefined || value === "") return fallback;
  // Already a number? Only accept finite values.
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  // Booleans coerce to 0/1 in JS; treat as invalid to avoid surprise.
  if (typeof value === "boolean") return fallback;
  // Strings, bigints, objects with toString(), etc.
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * True when the value is a strictly positive number (> 0). Zero, NaN,
 * and negative values all return `false`. Used by accounting guards to
 * reject negative or zero amounts that would break double-entry totals.
 */
export function isPositiveNumber(value: unknown): boolean {
  const n = safeToNumber(value, NaN);
  return Number.isFinite(n) && n > 0;
}

/**
 * True when the value is a non-negative number (≥ 0). Used for stock
 * quantities and amortised balances that legitimately may be zero.
 */
export function isNonNegativeNumber(value: unknown): boolean {
  const n = safeToNumber(value, NaN);
  return Number.isFinite(n) && n >= 0;
}

/**
 * True when |a − b| < EPSILON. Centralised here so every report /
 * balance-check uses the same tolerance instead of inlining magic 0.01.
 */
export function approximatelyEqual(
  a: number,
  b: number,
  epsilon: number = NUMERIC_EPSILON
): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Round a value to a fixed number of decimal places, returning a number
 * (not a string) for downstream math. Defaults to 2 decimal places,
 * which matches the precision used throughout the ledger.
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
