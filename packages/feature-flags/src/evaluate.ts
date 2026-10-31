/**
 * ALHUSAINIA Feature Flags — Evaluation Engine
 * ============================================
 * Pure, deterministic flag evaluation with targeting rules.
 */

import type {
  FlagDefinition,
  EvaluationContext,
  EvaluationResult,
  TargetingRule,
  FlagKey,
} from "./types";

/**
 * Checks if a context matches a targeting rule
 */
export function matchesRule(context: EvaluationContext, rule: TargetingRule): boolean {
  // Environment check
  if (rule.environments && !rule.environments.includes(context.environment)) {
    return false;
  }

  // User ID check (explicit allowlist)
  if (rule.userIds && rule.userIds.length > 0) {
    if (!context.userId || !rule.userIds.includes(context.userId)) {
      return false;
    }
  }

  // Tenant ID check
  if (rule.tenantIds && rule.tenantIds.length > 0) {
    if (!context.tenantId || !rule.tenantIds.includes(context.tenantId)) {
      return false;
    }
  }

  // Role check
  if (rule.roles && rule.roles.length > 0) {
    if (!context.role || !rule.roles.includes(context.role)) {
      return false;
    }
  }

  // Custom attributes check
  if (rule.attributes && Object.keys(rule.attributes).length > 0) {
    for (const [key, expectedValue] of Object.entries(rule.attributes)) {
      const actualValue = context.attributes?.[key];
      if (actualValue === undefined) return false;

      const expectedArray = Array.isArray(expectedValue) ? expectedValue : [expectedValue];
      const actualArray = Array.isArray(actualValue) ? actualValue : [actualValue];

      if (!actualArray.some(v => expectedArray.includes(v as string))) {
        return false;
      }
    }
  }

  // Percentage rollout (deterministic based on userId + flagKey)
  if (rule.percentage !== undefined && rule.percentage < 100) {
    if (!context.userId) return false;

    // Deterministic hash: userId + flagKey (would need flagKey passed in)
    // For now, simple hash of userId
    const hash = simpleHash(context.userId);
    const bucket = hash % 100;
    if (bucket >= rule.percentage) return false;
  }

  return true;
}

/**
 * Simple string hash for deterministic bucketing
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Evaluates a single flag against context
 */
export function evaluateFlag<TValue>(
  flag: FlagDefinition<TValue>,
  context: EvaluationContext,
  overrides?: Map<FlagKey, TValue>
): EvaluationResult<TValue> {
  const flagKey = flag.key;

  // Check override first (highest priority)
  if (overrides?.has(flagKey)) {
    return {
      value: overrides.get(flagKey)!,
      reason: "override",
      flagKey,
      evaluatedAt: new Date(),
    };
  }

  // Check if globally disabled
  if (flag.enabled === false) {
    return {
      value: flag.defaultValue,
      reason: "disabled",
      flagKey,
      evaluatedAt: new Date(),
    };
  }

  // Check targeting rules in order
  if (flag.targeting && flag.targeting.length > 0) {
    for (const rule of flag.targeting) {
      if (matchesRule(context, rule)) {
        return {
          value: flag.defaultValue, // In real impl, rule could have value override
          reason: "targeting",
          matchedRule: rule,
          flagKey,
          evaluatedAt: new Date(),
        };
      }
    }
  }

  // Return default
  return {
    value: flag.defaultValue,
    reason: "default",
    flagKey,
    evaluatedAt: new Date(),
  };
}

/**
 * Evaluates all flags for a context
 */
export function evaluateAllFlags<T extends Record<FlagKey, FlagDefinition<any>>>(
  flags: T,
  context: EvaluationContext,
  overrides?: Map<FlagKey, any>
): Record<FlagKey, EvaluationResult<any>> {
  const results: Record<string, EvaluationResult<any>> = {};

  for (const [key, flag] of Object.entries(flags)) {
    results[key] = evaluateFlag(flag, context, overrides);
  }

  return results as Record<FlagKey, EvaluationResult<any>>;
}

/**
 * Type-safe flag getter for client/server use
 */
export function createFlagClient<T extends Record<FlagKey, FlagDefinition<any>>>(
  flags: T,
  defaultContext: EvaluationContext
) {
  const overrides = new Map<FlagKey, any>();

  return {
    /** Get flag value with full result */
    getFlag<K extends FlagKey>(key: K, context?: Partial<EvaluationContext>): EvaluationResult<T[K]["defaultValue"]> {
      const flag = flags[key];
      if (!flag) {
        throw new Error(`Flag not found: ${key}`);
      }
      const mergedContext = { ...defaultContext, ...context };
      return evaluateFlag(flag, mergedContext, overrides);
    },

    /** Get just the value (convenience) */
    getValue<K extends FlagKey>(key: K, context?: Partial<EvaluationContext>): T[K]["defaultValue"] {
      return this.getFlag(key, context).value;
    },

    /** Boolean check convenience */
    isEnabled<K extends FlagKey>(key: K, context?: Partial<EvaluationContext>): boolean {
      const value = this.getValue(key, context);
      return Boolean(value);
    },

    /** Set runtime override (for testing/debugging) */
    setOverride<K extends FlagKey>(key: K, value: T[K]["defaultValue"]): void {
      overrides.set(key, value);
    },

    /** Clear override */
    clearOverride<K extends FlagKey>(key: K): void {
      overrides.delete(key);
    },

    /** Clear all overrides */
    clearOverrides(): void {
      overrides.clear();
    },

    /** Get all flag values */
    getAllValues(context?: Partial<EvaluationContext>): Record<FlagKey, any> {
      const results = evaluateAllFlags(flags, { ...defaultContext, ...context }, overrides);
      const values: Record<string, any> = {};
      for (const [key, result] of Object.entries(results)) {
        values[key] = result.value;
      }
      return values as Record<FlagKey, any>;
    },

    /** Debug: get evaluation reasons for all flags */
    debug(context?: Partial<EvaluationContext>): Record<FlagKey, EvaluationResult<any>> {
      return evaluateAllFlags(flags, { ...defaultContext, ...context }, overrides);
    },
  };
}