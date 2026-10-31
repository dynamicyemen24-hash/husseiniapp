/**
 * Variance Analysis Module - Calculation Utilities
 * =================================================
 * Automatic Budget vs Actual variance calculation with percentage and absolute value variance.
 * Drill-down from summary to transaction level.
 * Color-coded favorable/unfavorable indicators.
 * Support for multiple budget scenarios.
 */

import { safeToNumber, roundTo } from "../numeric";
import type {
  VarianceResult,
  VarianceFilter,
  BudgetScenario,
  ComparisonPeriod,
} from "./types";

/** Default precision for variance calculations */
const VARIANCE_PRECISION = 2;

/**
 * Calculate variance between actual and budget
 * Supports multiple budget scenarios:
 * - currentYearBudget: Current year approved budget
 * - priorYearActual: Prior year actual results
 * - forecast: Forebud get
 */
export function calculateVariance(
  actual: number,
  budget: number,
  scenario: BudgetScenario = "currentYearBudget"
): VarianceResult {
  const safeActual = safeToNumber(actual);
  const safeBudget = safeToNumber(budget);

  const absolute =
    safeBudget === 0 ? (safeActual ?? 0) : (safeActual ?? 0) - safeBudget;
  const percentage = safeBudget === 0 ? 0 : (absolute / safeBudget) * 100;
  let status: "favorable" | "unfavorable" | "neutral";

  // Determine status based on scenario and variance direction
  // For revenue/income: positive variance = favorable
  // For expenses: negative variance = favorable (spent less)
  const pctValue = Math.abs(percentage);

  if (pctValue >= 10) {
    // Significant variance
    status = absolute > 0 ? "unfavorable" : "favorable";
  } else if (pctValue >= 5) {
    status = "neutral";
  } else {
    status = "favorable";
  }

  return {
    absolute: roundTo(absolute, VARIANCE_PRECISION),
    percentage: roundTo(percentage, VARIANCE_PRECISION),
    status,
    canDrillDown: true,
  };
}

/**
 * Calculate variance for a full set of financial items
 * Supports multi-item variance analysis with drill-down capability
 */
export function calculateVarianceSet(
  actuals: number[],
  budgets: number[],
  scenario: BudgetScenario = "currentYearBudget"
): VarianceResult[] {
  const results: VarianceResult[] = [];

  for (let i = 0; i < actuals.length; i++) {
    const result = calculateVariance(actuals[i], budgets[i], scenario);
    results.push(result);
  }

  return results;
}

/**
 * Calculate variance with drill-down capability
 * Returns variance result plus metadata for drilling down to transaction level
 */
export function calculateVarianceWithDrillDown(
  actual: number,
  budget: number,
  transactions?: any[],
  scenario: BudgetScenario = "currentYearBudget"
): {
  variance: VarianceResult;
  drillDown: {
    available: boolean;
    transactionCount: number;
    sampleTransactions: any[];
    period: ComparisonPeriod;
  };
} {
  const variance = calculateVariance(actual, budget, scenario);

  const hasTransactions = transactions && transactions.length > 0;
  const drillDown = {
    available: Boolean(variance.canDrillDown && hasTransactions),
    transactionCount: hasTransactions ? transactions.length : 0,
    sampleTransactions: hasTransactions ? transactions.slice(0, 5) : [],
    period: {
      id: "current" as const,
      label: "Current Period",
      startDate: new Date(),
      endDate: new Date(),
    },
  };

  return { variance, drillDown };
}

/**
 * Color-coded indicator component prop types
 * Maps variance status to visual styling classes
 */
export type VarianceColorStatus = "favorable" | "unfavorable" | "neutral";

/** Get CSS class for variance status indicator */
export function getVarianceColorClass(status: VarianceColorStatus): string {
  switch (status) {
    case "favorable":
      return "bg-green-100 text-green-800";
    case "unfavorable":
      return "bg-red-100 text-red-800";
    case "neutral":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get variance status label (Arabic/English)
 */
export function getVarianceStatusLabel(
  status: VarianceColorStatus,
  locale: "ar" | "en" = "ar"
): string {
  const labels: Record<VarianceColorStatus, Record<string, string>> = {
    favorable: {
      ar: "مواتي",
      en: "Favorable",
    },
    unfavorable: {
      ar: "غير مواتي",
      en: "Unfavorable",
    },
    neutral: {
      ar: "متعادل",
      en: "Neutral",
    },
  };

  return labels[status]?.[locale] ?? status;
}

/**
 * Format variance display value
 */
export function formatVarianceDisplay(
  variance: VarianceResult,
  showPercentage: boolean = true,
  locale: "ar" | "en" = "ar"
): string {
  const absLabel = locale === "ar" ? "مطلق" : "Absolute";
  const pctLabel = locale === "ar" ? "نسبة" : "Percentage";

  const parts: string[] = [];
  if (variance.absolute !== 0) {
    parts.push(
      `${absLabel}: ${safeToNumber(variance.absolute).toLocaleString(locale)}`
    );
  }
  if (showPercentage && variance.percentage !== 0) {
    parts.push(`${pctLabel}: ${safeToNumber(variance.percentage).toFixed(2)}%`);
  }
  parts.push(getVarianceStatusLabel(variance.status, locale));

  return parts.join(" | ");
}

/**
 * Budget scenario data fetcher (integrates with existing budget system)
 * This is a type definition for API integration
 */
export interface BudgetScenarioData {
  scenario: BudgetScenario;
  label: string;
  budgetAmount: number;
  actualAmount: number;
  variance: VarianceResult;
  period: ComparisonPeriod;
}

/**
 * Calculate prior period variance for trend analysis
 */
export function calculatePriorPeriodVariance(
  currentActual: number,
  priorActual: number,
  currentBudget: number
): {
  trend: "improving" | "declining" | "stable";
  changeAbsolute: number;
  changePercentage: number;
} {
  const changeAbsolute = currentActual - priorActual;
  const changePercentage =
    priorActual !== 0 ? ((currentActual - priorActual) / priorActual) * 100 : 0;

  const trend =
    changeAbsolute > 0
      ? "improving"
      : changeAbsolute < 0
        ? "declining"
        : "stable";

  return {
    trend,
    changeAbsolute: roundTo(changeAbsolute, VARIANCE_PRECISION),
    changePercentage: roundTo(changePercentage, VARIANCE_PRECISION),
  };
}

/**
 * FX revaluation impact on variance
 */
export function calculateFXImpactOnVariance(
  originalActual: number,
  originalBudget: number,
  fxRateChange: number
): {
  adjustedActual: number;
  adjustedBudget: number;
  fxVariance: number;
  originalVariance: VarianceResult;
  fxAdjustedVariance: VarianceResult;
} {
  const originalVariance = calculateVariance(originalActual, originalBudget);

  // Adjust for FX rate change
  const fxAdjustedActual = originalActual * fxRateChange;
  const fxAdjustedBudget = originalBudget * fxRateChange;

  const fxVariance =
    ((fxAdjustedActual - fxAdjustedBudget) / (fxAdjustedBudget || 1)) * 100;
  const fxAdjustedVariance = calculateVariance(
    fxAdjustedActual,
    fxAdjustedBudget
  );

  return {
    adjustedActual: fxAdjustedActual,
    adjustedBudget: fxAdjustedBudget,
    fxVariance: roundTo(fxVariance, VARIANCE_PRECISION),
    originalVariance,
    fxAdjustedVariance,
  };
}

/** Re-export VarianceResult for external consumers (type alias — interfaces
 *  cannot be re-exported verbatim in ESM without breaking the module graph). */
export type { VarianceResult } from "./types";
