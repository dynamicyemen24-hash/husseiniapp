/**
 * AutoFillEngine — Intelligent form auto-fill using AI patterns.
 * Integrates the AI engine to provide real-time suggestions.
 */

import * as React from "react";
import { AISuggestionEngine, type Suggestion } from "@/lib/aiEngine";
import { getAIEngine } from "@/lib/aiEngine";

interface AutoFillResult {
  fieldName: string;
  field: string;
  suggestedValue: string;
  confidence: number;
  source: string;
}

interface AutoFillOptions {
  debounceMs?: number;
  minConfidence?: number;
  maxSuggestions?: number;
}

/**
 * AutoFillEngine wraps the AISuggestionEngine with form-specific logic.
 */
export class AutoFillEngine {
  private engine: AISuggestionEngine;
  private options: AutoFillOptions;
  private listeners: Map<string, Set<(results: AutoFillResult[]) => void>> =
    new Map();

  constructor(options?: AutoFillOptions) {
    this.engine = getAIEngine();
    this.options = {
      debounceMs: options?.debounceMs ?? 300,
      minConfidence: options?.minConfidence ?? 0.3,
      maxSuggestions: options?.maxSuggestions ?? 5,
    };
  }

  getOptions(): AutoFillOptions {
    return this.options;
  }

  /** Record a form interaction for future suggestions */
  record(field: string, value: string): void {
    this.engine.record(field, value);
  }

  /** Get auto-fill suggestions for a form field */
  suggest(formData: Record<string, unknown>): AutoFillResult[] {
    const predictions = this.engine.predict(formData);
    const opts = this.options;
    return predictions
      .filter(p => p.confidence >= (opts?.minConfidence ?? 0))
      .slice(0, opts?.maxSuggestions ?? 5)
      .map(p => ({
        fieldName: p.fieldName,
        field: p.fieldName,
        suggestedValue: p.predictedValue,
        confidence: p.confidence,
        source: p.source,
      }));
  }

  /** Check if a field has high-confidence auto-fill */
  hasSuggestion(field: string, formData: Record<string, unknown>): boolean {
    const predictions = this.suggest(formData);
    return predictions.some(
      p =>
        p.fieldName === field &&
        p.confidence >= (this.options?.minConfidence ?? 0)
    );
  }

  /** Get the highest-confidence suggestion for a field */
  getBestSuggestion(
    field: string,
    formData: Record<string, unknown>
  ): AutoFillResult | null {
    const predictions = this.suggest(formData);
    const match = predictions.find(p => p.fieldName === field);
    return match ?? null;
  }
}

/**
 * React hook for AI-powered form auto-fill.
 */
export function useAutoFill(formData: Record<string, unknown>) {
  const engine = React.useMemo(() => new AutoFillEngine(), []);
  const [suggestions, setSuggestions] = React.useState<AutoFillResult[]>([]);
  const [activeField, setActiveField] = React.useState<string | null>(null);

  const opts = engine.getOptions();

  React.useEffect(() => {
    const results = engine.suggest(formData);
    setSuggestions(results);
  }, [formData, engine]);

  const record = React.useCallback(
    (field: string, value: string) => {
      engine.record(field, value);
    },
    [engine]
  );

  const getSuggestion = React.useCallback(
    (field: string): AutoFillResult | null => {
      return engine.getBestSuggestion(field, formData);
    },
    [engine, formData]
  );

  return {
    suggestions,
    activeField,
    setActiveField,
    record,
    getSuggestion,
    hasSuggestion: (field: string) =>
      suggestions.some(
        s =>
          s.fieldName === field && s.confidence >= (opts.minConfidence ?? 0.3)
      ),
  };
}
