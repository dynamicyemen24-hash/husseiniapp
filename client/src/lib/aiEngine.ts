/**
 * AI Suggestion Engine — Intelligent prediction and recommendation system.
 * Analyzes historical patterns to suggest actions, detect anomalies,
 * and automate routine decisions.
 */

export interface Suggestion {
  id: string;
  type: "auto-number" | "field-fill" | "validation" | "workflow" | "insight";
  title: string;
  description: string;
  confidence: number; // 0–1
  action?: () => void;
  metadata?: Record<string, unknown>;
}

export interface PatternRule {
  id: string;
  name: string;
  trigger: string; // pattern identifier
  condition: (context: Record<string, unknown>) => boolean;
  action: (context: Record<string, unknown>) => Suggestion | null;
  weight: number;
}

export interface PredictionResult {
  fieldName: string;
  predictedValue: string;
  confidence: number;
  source: string;
}

/**
 * Simple pattern-matching engine for auto-suggestions.
 * Uses frequency analysis and rule-based matching.
 */
export class AISuggestionEngine {
  private rules: PatternRule[] = [];
  private history: Map<string, number[]> = new Map();
  private cache: Map<string, Suggestion[]> = new Map();

  constructor(rules?: PatternRule[]) {
    if (rules) this.rules = rules;
  }

  /** Register a new pattern rule */
  addRule(rule: PatternRule): void {
    this.rules.push(rule);
    this.cache.clear();
  }

  /** Record an event for frequency analysis */
  record(field: string, value: string): void {
    const key = `${field}:${value}`;
    const arr = this.history.get(key) ?? [];
    arr.push(Date.now());
    this.history.set(key, arr);
  }

  /** Get frequency of a value for a field (0–1 normalized) */
  getFrequency(field: string, value: string): number {
    const key = `${field}:${value}`;
    const total = this.history.size;
    if (total === 0) return 0;
    const count = this.history.get(key)?.length ?? 0;
    return count / total;
  }

  /**
   * Analyze context and return ranked suggestions.
   * Suggestions are sorted by confidence descending.
   */
  suggest(context: Record<string, unknown>): Suggestion[] {
    const cacheKey = JSON.stringify(context);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const suggestions: Suggestion[] = [];

    for (const rule of this.rules) {
      if (rule.condition(context)) {
        const suggestion = rule.action(context);
        if (suggestion) suggestions.push(suggestion);
      }
    }

    // Add frequency-based predictions
    for (const [key, values] of this.history.entries()) {
      const [field, value] = key.split(":");
      const freq = values.length / Math.max(this.history.size, 1);
      if (freq > 0.3 && context[field] === undefined) {
        suggestions.push({
          id: `freq-${key}`,
          type: "field-fill",
          title: `اقتراح: ${value}`,
          description: `هذا القيمة تتكرر بشكل متكرر (${Math.round(freq * 100)}%)`,
          confidence: freq,
          metadata: { field, value },
        });
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence);
    this.cache.set(cacheKey, suggestions);
    return suggestions;
  }

  /** Get the top N highest-confidence suggestions */
  topSuggestions(context: Record<string, unknown>, n = 5): Suggestion[] {
    return this.suggest(context).slice(0, n);
  }

  /** Predict a field value based on historical patterns */
  predict(context: Record<string, unknown>): PredictionResult[] {
    const results: PredictionResult[] = [];
    for (const [key, values] of this.history.entries()) {
      const [field, value] = key.split(":");
      if (context[field] !== undefined) continue;
      const freq = values.length / Math.max(this.history.size, 1);
      if (freq > 0.2) {
        results.push({
          fieldName: field,
          predictedValue: value,
          confidence: freq,
          source: "frequency-analysis",
        });
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /** Detect anomalies in numeric data */
  detectAnomalies(
    data: number[]
  ): { index: number; value: number; zScore: number }[] {
    if (data.length < 3) return [];
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const std = Math.sqrt(
      data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length
    );
    if (std === 0) return [];

    return data
      .map((v, i) => ({ index: i, value: v, zScore: (v - mean) / std }))
      .filter(d => Math.abs(d.zScore) > 2);
  }

  /** Clear all history and cache */
  reset(): void {
    this.history.clear();
    this.cache.clear();
  }
}

/**
 * Predefined rules for accounting/business automation.
 */
export function createDefaultRules(engine: AISuggestionEngine): void {
  // Auto-number rule
  engine.addRule({
    id: "auto-number",
    name: "ترقيم تلقائي",
    trigger: "document-create",
    condition: ctx => ctx.documentType !== undefined,
    action: ctx => {
      const type = ctx.documentType as string;
      const prefix =
        type === "invoice" ? "INV" : type === "voucher" ? "VCH" : "DOC";
      return {
        id: `auto-${type}`,
        type: "auto-number" as const,
        title: `اقتراح ترقيم: ${prefix}-2024-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        description: `الرقم التلقائي المستند إلى النوع ${type}`,
        confidence: 0.95,
        metadata: { prefix, type },
      };
    },
    weight: 1,
  });

  // Customer priority rule
  engine.addRule({
    id: "customer-priority",
    name: "أولوية الزبون",
    trigger: "customer-select",
    condition: ctx =>
      (ctx.customerTotal as number) !== undefined &&
      (ctx.customerTotal as number) > 10000,
    action: ctx => ({
      id: "priority-high",
      type: "insight" as const,
      title: "زبون ذو أولوية عالية",
      description: `إجمالي مشتريات الزبون يتجاوز ${ctx.customerTotal} — يُنصح بتطبيق خصم خاص`,
      confidence: 0.88,
      metadata: { threshold: 10000 },
    }),
    weight: 0.9,
  });

  // Low stock alert rule
  engine.addRule({
    id: "low-stock",
    name: "تنبيه المخزون المنخفض",
    trigger: "stock-check",
    condition: ctx =>
      (ctx.stockQty as number) !== undefined &&
      (ctx.stockQty as number) < (ctx.reorderQty as number),
    action: ctx => ({
      id: "stock-alert",
      type: "workflow" as const,
      title: "المخزون منخفض — يُنصح بإعادة الطلب",
      description: `الكمية المتاحة (${ctx.stockQty}) أقل من مستوى إعادة الطلب (${ctx.reorderQty})`,
      confidence: 0.92,
      metadata: { stockQty: ctx.stockQty, reorderQty: ctx.reorderQty },
    }),
    weight: 0.95,
  });
}

// Singleton instance
let engineInstance: AISuggestionEngine | null = null;

export function getAIEngine(): AISuggestionEngine {
  if (!engineInstance) {
    engineInstance = new AISuggestionEngine();
    createDefaultRules(engineInstance);
  }
  return engineInstance;
}
