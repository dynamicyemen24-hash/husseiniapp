/**
 * Financial Analytics Engine - Type Definitions
 * ==============================================
 * World-class financial ratios and analytics types for the Husseiniya Platform.
 * Multi-tenant compatible, multi-currency aware, WCAG 2.1 accessible.
 *
 * lives in `shared/` so the server computes the same ratios the client renders.
 */

/** Currency code ISO 4217 */
export type CurrencyCode = "YER" | "SAR" | "AED" | "USD" | "EUR" | "GBP";

/** FX rate relative to base currency */
export interface FxRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number; // units of `to` per 1 unit of `from`
  date: Date;
}

/** Period identifier for multi-period comparison */
export type PeriodId = "current" | "previous" | "budget" | "forecast";

/** Comparison period configuration */
export interface ComparisonPeriod {
  id: PeriodId;
  label: string;
  startDate: Date;
  endDate: Date;
}

/** Base data for ratio calculations extracted from financial statements */
export interface RatioData {
  /** Current assets */
  currentAssets: number;
  /** Quick assets (current assets - inventory - prepaid) */
  quickAssets: number;
  /** Cash and cash equivalents */
  cash: number;
  /** Current liabilities */
  currentLiabilities: number;
  /** Total assets */
  totalAssets: number;
  /** Total equity */
  totalEquity: number;
  /** Total liabilities */
  totalLiabilities: number;
  /** Revenue (net) */
  revenue: number;
  /** Gross profit */
  grossProfit: number;
  /** Operating income */
  operatingIncome: number;
  /** Net income */
  netIncome: number;
  /** Cost of goods sold */
  cogs: number;
  /** Total expenses */
  totalExpenses: number;
  /** Inventory value */
  inventory: number;
  /** Total sales (net) */
  totalSales: number;
}

/** Input parameters for ratio calculations */
export interface RatioInputs {
  /** Period data context */
  period: ComparisonPeriod;
  /** Extracted ratio data from financial statements */
  data: RatioData;
  /** Current FX rate if multi-currency */
  fxRate?: number;
  /** Whether to show percentages */
  showPercentages: boolean;
}

/** Calculated financial ratio result */
export interface CalculatedRatio {
  /** Ratio key/identifier */
  key: string;
  /** Ratio name (Arabic/English) */
  name: string;
  /**
   * Ratio value — `null` عندما لا يكفي المقام لحساب النسبة.
   * لا تُستبدل الأصفار بمقامات اصطناعية (0.001) لأن ذلك ينتج أرقاماً
   * مضلّلة (مثل هامش 100,000% في فترة بلا إيرادات).
   */
  value: number | null;
  /** Percentage format */
  percentage: boolean;
  /** Whether higher is better */
  higherBetter: boolean;
  /** Comparison to budget (if available) */
  budgetVariance?: number;
  /** Comparison to previous period */
  previousVariance?: number;
  /** Favorable/unfavorable indicator */
  status: "favorable" | "unfavorable" | "neutral";
}

/** Budget vs Actual variance result */
export interface VarianceResult {
  /** Absolute variance (actual - budget) */
  absolute: number;
  /** Percentage variance ((actual - budget) / budget * 100) */
  percentage: number;
  /** Status indicator */
  status: "favorable" | "unfavorable" | "neutral";
  /** Drill-down available */
  canDrillDown: boolean;
}

/** Cash flow projection for 13-week forecast */
export interface CashFlowWeek {
  week: number;
  dateRange: [Date, Date];
  operatingCash: number;
  investingCash: number;
  financingCash: number;
  netCashFlow: number;
  cumulativeCash: number;
}

/** Scenario modeling for cash flow */
export type CashFlowScenario = "conservative" | "base" | "optimistic";

/** Cash flow forecast result */
export interface CashFlowForecast {
  scenario: CashFlowScenario;
  weeks: CashFlowWeek[];
  openingBalance: number;
  closingBalance: number;
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

/** Drill-down target for ratio details */
export interface RatioDrillDown {
  ratioKey: string;
  selectedPeriod: ComparisonPeriod;
  transactionLevel: boolean;
  accountLevel: boolean;
  fromDate: Date;
  toDate: Date;
}

/** Main dashboard state */
export interface FinancialDashboardState {
  /** Active company/tenant ID */
  tenantId: number;
  /** Comparison periods */
  periods: ComparisonPeriod[];
  /** Selected period */
  selectedPeriod: ComparisonPeriod;
  /** Calculated ratios */
  ratios: CalculatedRatio[];
  /** Variance analysis data */
  varianceData: VarianceResult[];
  /** Cash flow forecast */
  cashFlow: CashFlowForecast | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
}

/** Budget scenario types for variance analysis */
export type BudgetScenario =
  | "currentYearBudget"
  | "priorYearActual"
  | "forecast";

/** Variance analysis filter options */
export interface VarianceFilter {
  budgetScenario: BudgetScenario;
  period: ComparisonPeriod;
  accountCategories?: string[];
  minVariancePercentage?: number;
}

/** FX revaluation impact */
export interface FxRevaluationImpact {
  /** Original amount in original currency */
  originalAmount: number;
  /** FX rate at transaction date */
  fxRateAtTransaction: number;
  /** FX rate at reporting date */
  fxRateAtReporting: number;
  /** Revaluation gain/loss */
  revaluationGainLoss: number;
  /** Impact on ratios */
  impactOnRatios: number[];
}

/** Export types for API integration (aliases for external consumption) */
export type {
  RatioData as FinancialRatioData,
  RatioInputs as FinancialRatioInputs,
  CalculatedRatio as FinancialCalculatedRatio,
  VarianceResult as FinancialVarianceResult,
  CashFlowForecast as FinancialCashFlowForecast,
};
