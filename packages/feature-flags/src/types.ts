/**
 * ALHUSAINIA Feature Flags — Core Types
 * =====================================
 * Type-safe feature flag definitions with targeting rules.
 */

import { z } from "zod";

/** Flag key — must match exactly in config */
export type FlagKey = string & { readonly __brand: unique symbol };

/** Creates a typed flag key */
export function flagKey<K extends string>(key: K): FlagKey {
  return key as FlagKey;
}

/** Targeting rule for gradual rollouts */
export interface TargetingRule {
  /** Percentage of users (0-100) */
  percentage?: number;
  /** Specific user IDs (override percentage) */
  userIds?: string[];
  /** Tenant IDs */
  tenantIds?: number[];
  /** User roles */
  roles?: string[];
  /** Custom attribute matchers */
  attributes?: Record<string, string | string[]>;
  /** Environment restriction */
  environments?: ("development" | "staging" | "production")[];
}

/** Flag definition with metadata */
export interface FlagDefinition<TValue = boolean> {
  key: FlagKey;
  description: string;
  defaultValue: TValue;
  /** Targeting rules — evaluated in order, first match wins */
  targeting?: TargetingRule[];
  /** Whether flag is active (can be toggled off globally) */
  enabled?: boolean;
  /** Owner/team responsible */
  owner?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Deprecation info */
  deprecated?: {
    since: string;
    removalDate?: string;
    replacement?: FlagKey;
  };
}

/** Evaluation context passed at runtime */
export interface EvaluationContext {
  userId?: string;
  tenantId?: number;
  role?: string;
  environment: "development" | "staging" | "production";
  attributes?: Record<string, unknown>;
  /** Request ID for tracing */
  requestId?: string;
}

/** Evaluation result with reason */
export interface EvaluationResult<TValue> {
  value: TValue;
  /** Why this value was returned */
  reason: "default" | "targeting" | "override" | "disabled";
  /** Matched rule (if any) */
  matchedRule?: TargetingRule;
  /** Flag key for debugging */
  flagKey: FlagKey;
  /** Timestamp of evaluation */
  evaluatedAt: Date;
}

/** Flag configuration schema for validation */
export const FlagDefinitionSchema = z.object({
  key: z.string().min(1),
  description: z.string().min(1),
  defaultValue: z.unknown(),
  enabled: z.boolean().optional(),
  targeting: z.array(z.object({
    percentage: z.number().min(0).max(100).optional(),
    userIds: z.array(z.string()).optional(),
    tenantIds: z.array(z.number()).optional(),
    roles: z.array(z.string()).optional(),
    attributes: z.record(z.union([z.string(), z.array(z.string())])).optional(),
    environments: z.array(z.enum(["development", "staging", "production"])).optional(),
  })).optional(),
  owner: z.string().optional(),
  tags: z.array(z.string()).optional(),
  deprecated: z.object({
    since: z.string(),
    removalDate: z.string().optional(),
    replacement: z.string().optional(),
  }).optional(),
});

/** All flags registry type */
export type FlagsRegistry = Record<FlagKey, FlagDefinition<any>>;

/** Client-side flag state for React */
export interface ClientFlagState<TValue> {
  value: TValue;
  loading: boolean;
  error: Error | null;
}