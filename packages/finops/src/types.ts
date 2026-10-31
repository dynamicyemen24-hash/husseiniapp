/**
 * ALHUSAINIA FinOps — Core Types
 * ================================
 * Type-safe cost monitoring and budget management.
 */

import { z } from "zod";

/** Cost category for grouping expenses */
export type CostCategory = 
  | "compute" 
  | "database" 
  | "storage" 
  | "network" 
  | "cdn" 
  | "monitoring" 
  | "security" 
  | "support"
  | "licenses"
  | "other";

/** Cost entry with metadata */
export interface CostEntry {
  id: string;
  timestamp: Date;
  category: CostCategory;
  service: string;
  resourceId?: string;
  amount: number; // USD cents
  currency: string;
  metadata?: Record<string, unknown>;
}

/** Budget definition */
export interface Budget {
  id: string;
  name: string;
  category?: CostCategory;
  service?: string;
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  amount: number; // USD cents
  currency: string;
  alertThreshold: number; // 0-1 (e.g., 0.8 = 80%)
  alertChannels: ("email" | "slack" | "webhook" | "pagerduty")[];
  enabled: boolean;
}

/** Budget status */
export interface BudgetStatus {
  budgetId: string;
  periodStart: Date;
  periodEnd: Date;
  spent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  status: "ok" | "warning" | "critical" | "exceeded";
  projectedEndOfPeriod: number;
}

/** Cost anomaly detection */
export interface CostAnomaly {
  id: string;
  detectedAt: Date;
  category: CostCategory;
  service: string;
  expectedAmount: number;
  actualAmount: number;
  deviationPercent: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, unknown>;
}

/** Resource utilization */
export interface ResourceUtilization {
  resourceId: string;
  resourceType: string;
  service: string;
  cpuPercent?: number;
  memoryPercent?: number;
  storagePercent?: number;
  networkPercent?: number;
  timestamp: Date;
  costPerHour?: number;
}

/** Right-sizing recommendation */
export interface RightSizingRecommendation {
  resourceId: string;
  resourceType: string;
  currentSpec: string;
  recommendedSpec: string;
  currentCostPerMonth: number;
  estimatedCostPerMonth: number;
  savingsPerMonth: number;
  confidence: number; // 0-1
  reasoning: string;
}

/** Cost allocation by team/project */
export interface CostAllocation {
  teamId: string;
  teamName: string;
  projectId?: string;
  projectName?: string;
  amount: number;
  percentage: number;
  periodStart: Date;
  periodEnd: Date;
}

/** Cost report */
export interface CostReport {
  periodStart: Date;
  periodEnd: Date;
  totalCost: number;
  currency: string;
  byCategory: Record<CostCategory, number>;
  byService: Record<string, number>;
  byTeam: CostAllocation[];
  topAnomalies: CostAnomaly[];
  recommendations: RightSizingRecommendation[];
  generatedAt: Date;
}

/** Alert configuration */
export interface AlertConfig {
  budgetId: string;
  threshold: number;
  channels: ("email" | "slack" | "webhook" | "pagerduty")[];
  recipients: string[];
  cooldownMinutes: number;
}

/** Cost trends */
export interface CostTrend {
  period: string;
  amount: number;
  changePercent: number;
  category: CostCategory;
}

/** FinOps configuration */
export interface FinOpsConfig {
  defaultCurrency: string;
  budgets: Budget[];
  alertConfigs: AlertConfig[];
  anomalyDetection: {
    enabled: boolean;
    sensitivity: "low" | "medium" | "high";
    minDeviationPercent: number;
  };
  rightSizing: {
    enabled: boolean;
    analysisWindowDays: number;
    minSavingsThreshold: number; // USD cents
  };
  dataRetentionDays: number;
}

/** Validates cost entry */
export const CostEntrySchema = z.object({
  category: z.enum(["compute", "database", "storage", "network", "cdn", "monitoring", "security", "support", "licenses", "other"]),
  service: z.string().min(1),
  resourceId: z.string().optional(),
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
  metadata: z.record(z.unknown()).optional(),
});

/** Validates budget */
export const BudgetSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["compute", "database", "storage", "network", "cdn", "monitoring", "security", "support", "licenses", "other"]).optional(),
  service: z.string().optional(),
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  alertThreshold: z.number().min(0).max(1).default(0.8),
  alertChannels: z.array(z.enum(["email", "slack", "webhook", "pagerduty"])).default(["email"]),
  enabled: z.boolean().default(true),
});

/** Validates cost report request */
export const CostReportRequestSchema = z.object({
  periodStart: z.date(),
  periodEnd: z.date(),
  groupBy: z.array(z.enum(["category", "service", "team", "project"])).optional(),
  includeAnomalies: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
});

/** FinOps event types for event-driven architecture */
export type FinOpsEventType = 
  | "budget_created"
  | "budget_updated"
  | "budget_exceeded"
  | "budget_warning"
  | "anomaly_detected"
  | "anomaly_resolved"
  | "right_sizing_recommendation"
  | "cost_report_generated";

export interface FinOpsEvent {
  type: FinOpsEventType;
  timestamp: Date;
  payload: unknown;
  correlationId?: string;
}