/**
 * ALHUSAINIA FinOps — Cost Tracker
 * =================================
 * Tracks costs, budgets, and generates alerts.
 */

import type {
  CostEntry,
  Budget,
  BudgetStatus,
  CostAnomaly,
  CostReport,
  FinOpsConfig,
  FinOpsEvent,
  FinOpsEventType,
  CostCategory,
  RightSizingRecommendation,
} from "./types";
import { v4 as uuidv4 } from "uuid";

export class CostTracker {
  private costs: CostEntry[] = [];
  private budgets: Map<string, Budget> = new Map();
  private events: FinOpsEvent[] = [];
  private config: FinOpsConfig;

  constructor(config: Partial<FinOpsConfig> = {}) {
    this.config = {
      defaultCurrency: "USD",
      budgets: [],
      alertConfigs: [],
      anomalyDetection: {
        enabled: true,
        sensitivity: "medium",
        minDeviationPercent: 20,
      },
      rightSizing: {
        enabled: true,
        analysisWindowDays: 30,
        minSavingsThreshold: 1000, // $10
      },
      dataRetentionDays: 90,
      ...config,
    };

    // Initialize budgets
    for (const budget of this.config.budgets) {
      this.budgets.set(budget.id, budget);
      this.emitEvent("budget_created", budget);
    }
  }

  /** Record a cost entry */
  async recordCost(entry: Omit<CostEntry, "id" | "timestamp">): Promise<CostEntry> {
    const costEntry: CostEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date(),
    };

    this.costs.push(costEntry);
    await this.checkBudgetAlerts(costEntry);
    await this.detectAnomalies(costEntry);

    return costEntry;
  }

  /** Get costs for a period */
  async getCosts(
    start: Date,
    end: Date,
    filters?: { category?: CostCategory; service?: string }
  ): Promise<CostEntry[]> {
    return this.costs.filter((c) => {
      if (c.timestamp < start || c.timestamp > end) return false;
      if (filters?.category && c.category !== filters.category) return false;
      if (filters?.service && c.service !== filters.service) return false;
      return true;
    });
  }

  /** Get cost summary for period */
  async getCostSummary(start: Date, end: Date): Promise<{
    total: number;
    byCategory: Record<CostCategory, number>;
    byService: Record<string, number>;
    count: number;
  }> {
    const costs = await this.getCosts(start, end);
    
    const byCategory: Record<CostCategory, number> = {
      compute: 0, database: 0, storage: 0, network: 0, cdn: 0,
      monitoring: 0, security: 0, support: 0, licenses: 0, other: 0,
    };
    const byService: Record<string, number> = {};
    let total = 0;

    for (const cost of costs) {
      total += cost.amount;
      byCategory[cost.category] += cost.amount;
      byService[cost.service] = (byService[cost.service] || 0) + cost.amount;
    }

    return { total, byCategory, byService, count: costs.length };
  }

  /** Create or update budget */
  async setBudget(budget: Budget): Promise<void> {
    this.budgets.set(budget.id, budget);
    this.emitEvent("budget_created", budget);
  }

  /** Get budget status */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatus | null> {
    const budget = this.budgets.get(budgetId);
    if (!budget) return null;

    const { periodStart, periodEnd } = this.getBudgetPeriod(budget);
    const costs = await this.getCosts(periodStart, periodEnd, { 
      category: budget.category, 
      service: budget.service 
    });
    
    const spent = costs.reduce((sum, c) => sum + c.amount, 0);
    const percentUsed = spent / budget.amount;
    
    let status: BudgetStatus["status"] = "ok";
    if (percentUsed >= 1) status = "exceeded";
    else if (percentUsed >= budget.alertThreshold) status = "critical";
    else if (percentUsed >= budget.alertThreshold * 0.75) status = "warning";

    // Project end-of-period spend
    const daysElapsed = (Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const projectedEndOfPeriod = daysElapsed > 0 ? (spent / daysElapsed) * daysInPeriod : spent;

    return {
      budgetId: budget.id,
      periodStart,
      periodEnd,
      spent,
      budget: budget.amount,
      remaining: Math.max(0, budget.amount - spent),
      percentUsed,
      status,
      projectedEndOfPeriod,
    };
  }

  /** Get all budget statuses */
  async getAllBudgetStatuses(): Promise<BudgetStatus[]> {
    const statuses: BudgetStatus[] = [];
    for (const budget of this.budgets.values()) {
      const status = await this.getBudgetStatus(budget.id);
      if (status) statuses.push(status);
    }
    return statuses;
  }

  /** Detect cost anomalies */
  async detectAnomalies(newCost?: CostEntry): Promise<CostAnomaly[]> {
    if (!this.config.anomalyDetection.enabled) return [];

    const anomalies: CostAnomaly[] = [];
    const windowDays = 7;
    const end = new Date();
    const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const costs = await this.getCosts(start, end);
    const byServiceCategory = new Map<string, CostEntry[]>();

    for (const cost of costs) {
      const key = `${cost.service}:${cost.category}`;
      if (!byServiceCategory.has(key)) byServiceCategory.set(key, []);
      byServiceCategory.get(key)!.push(cost);
    }

    for (const [key, entries] of byServiceCategory) {
      const [service, category] = key.split(":");
      const dailyTotals = this.aggregateByDay(entries);
      
      if (dailyTotals.length < 3) continue; // Need minimum data

      const avg = dailyTotals.reduce((sum, d) => sum + d.amount, 0) / dailyTotals.length;
      const stdDev = Math.sqrt(
        dailyTotals.reduce((sum, d) => sum + Math.pow(d.amount - avg, 2), 0) / dailyTotals.length
      );

      const threshold = this.config.anomalyDetection.minDeviationPercent / 100;
      
      for (const day of dailyTotals) {
        const deviation = Math.abs(day.amount - avg) / avg;
        if (deviation > threshold && day.amount > avg) {
          anomalies.push({
            id: uuidv4(),
            detectedAt: new Date(),
            category: category as CostCategory,
            service,
            expectedAmount: avg,
            actualAmount: day.amount,
            deviationPercent: deviation * 100,
            severity: this.getSeverity(deviation),
            description: `${service} (${category}) cost spiked ${(deviation * 100).toFixed(1)}% above average`,
            metadata: { date: day.date, avg, stdDev },
          });
        }
      }
    }

    // Emit events for new anomalies
    for (const anomaly of anomalies) {
      this.emitEvent("anomaly_detected", anomaly);
    }

    return anomalies;
  }

  /** Generate cost report */
  async generateReport(start: Date, end: Date): Promise<CostReport> {
    const costs = await this.getCosts(start, end);
    const summary = await this.getCostSummary(start, end);
    const anomalies = await this.detectAnomalies();
    const recommendations = await this.generateRightSizingRecommendations();

    const byTeam: CostAllocation[] = []; // Would integrate with team/project data

    return {
      periodStart: start,
      periodEnd: end,
      totalCost: summary.total,
      currency: this.config.defaultCurrency,
      byCategory: summary.byCategory,
      byService: summary.byService,
      byTeam,
      topAnomalies: anomalies.slice(0, 10),
      recommendations,
      generatedAt: new Date(),
    };
  }

  /** Generate right-sizing recommendations */
  async generateRightSizingRecommendations(): Promise<RightSizingRecommendation[]> {
    if (!this.config.rightSizing.enabled) return [];

    // In real implementation, this would analyze resource utilization
    // For now, return mock recommendations
    return [
      {
        resourceId: "db-primary",
        resourceType: "database",
        currentSpec: "db.r6g.xlarge",
        recommendedSpec: "db.r6g.large",
        currentCostPerMonth: 35000,
        estimatedCostPerMonth: 17500,
        savingsPerMonth: 17500,
        confidence: 0.85,
        reasoning: "CPU utilization avg 15% over 30 days, memory avg 40%",
      },
      {
        resourceId: "cache-cluster",
        resourceType: "cache",
        currentSpec: "cache.r6g.2xlarge",
        recommendedSpec: "cache.r6g.xlarge",
        currentCostPerMonth: 28000,
        estimatedCostPerMonth: 14000,
        savingsPerMonth: 14000,
        confidence: 0.75,
        reasoning: "Memory utilization avg 35%, can downsize with minimal impact",
      },
    ];
  }

  /** Check budget alerts */
  private async checkBudgetAlerts(cost: CostEntry): Promise<void> {
    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue;
      if (budget.category && budget.category !== cost.category) continue;
      if (budget.service && budget.service !== cost.service) continue;

      const status = await this.getBudgetStatus(budget.id);
      if (!status) continue;

      if (status.status === "exceeded" || status.status === "critical") {
        await this.sendBudgetAlert(budget, status);
      }
    }
  }

  /** Send budget alert */
  private async sendBudgetAlert(budget: Budget, status: BudgetStatus): Promise<void> {
    const alertConfig = this.config.alertConfigs.find((a) => a.budgetId === budget.id);
    if (!alertConfig) return;

    // Check cooldown
    const lastAlert = this.events
      .filter((e) => e.type === "budget_exceeded" || e.type === "budget_warning")
      .filter((e) => e.payload?.budgetId === budget.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (lastAlert) {
      const minutesSince = (Date.now() - lastAlert.timestamp.getTime()) / (1000 * 60);
      if (minutesSince < alertConfig.cooldownMinutes) return;
    }

    const eventType = status.status === "exceeded" ? "budget_exceeded" : "budget_warning";
    this.emitEvent(eventType, { budget, status });

    // In real implementation, send to configured channels
    console.warn(`[FinOps] Budget alert: ${budget.name} - ${status.status} (${(status.percentUsed * 100).toFixed(1)}%)`);
  }

  /** Get budget period */
  private getBudgetPeriod(budget: Budget): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    let periodStart: Date;

    switch (budget.period) {
      case "daily": {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
      case "weekly": {
        const day = now.getDay();
        periodStart = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
        periodStart.setHours(0, 0, 0, 0);
        break;
      }
      case "monthly": {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case "quarterly": {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case "yearly": {
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      }
      default: {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
    }

    const periodEnd = new Date(now);
    return { periodStart, periodEnd };
  }

  /** Aggregate costs by day */
  private aggregateByDay(costs: CostEntry[]): Array<{ date: Date; amount: number }> {
    const byDay = new Map<string, number>();
    for (const cost of costs) {
      const dateKey = cost.timestamp.toISOString().split("T")[0];
      byDay.set(dateKey, (byDay.get(dateKey) || 0) + cost.amount);
    }
    return Array.from(byDay.entries())
      .map(([date, amount]) => ({ date: new Date(date), amount }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /** Get anomaly severity */
  private getSeverity(deviation: number): CostAnomaly["severity"] {
    if (deviation > 2) return "critical";
    if (deviation > 1) return "high";
    if (deviation > 0.5) return "medium";
    return "low";
  }

  /** Emit FinOps event */
  private emitEvent(type: FinOpsEventType, payload: unknown): void {
    this.events.push({
      type,
      timestamp: new Date(),
      payload,
      correlationId: uuidv4(),
    });
  }

  /** Get recent events */
  getEvents(limit = 100): FinOpsEvent[] {
    return this.events.slice(-limit);
  }

  /** Clean up old data */
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    this.costs = this.costs.filter((c) => c.timestamp > cutoff);
    this.events = this.events.filter((e) => e.timestamp > cutoff);
  }

}