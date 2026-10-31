/**
 * ALHUSAINIA Feature Flags — Configuration
 * ========================================
 * Loads flags from JSON config with environment overrides.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
import type { FlagDefinition, FlagsRegistry, EvaluationContext, FlagKey } from "./types";
import { FlagDefinitionSchema } from "./types";

/** Configuration file schema */
const ConfigSchema = z.object({
  flags: z.record(FlagDefinitionSchema),
  environments: z.record(z.object({
    overrides: z.record(z.unknown()).optional(),
  })).optional(),
});

export type FeatureFlagsConfig = z.infer<typeof ConfigSchema>;

/**
 * Loads feature flags from config file
 */
export function loadFlags(configPath?: string): FlagsRegistry {
  const path = configPath || resolve(process.cwd(), "feature-flags.config.json");

  if (!existsSync(path)) {
    console.warn(`[FeatureFlags] Config not found at ${path}, using empty registry`);
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content);
    const validated = ConfigSchema.parse(parsed);

    // Apply environment-specific overrides
    const env = process.env.NODE_ENV || "development";
    const envConfig = validated.environments?.[env];

    const flags: FlagsRegistry = {};
    for (const [key, flag] of Object.entries(validated.flags)) {
      let finalFlag = { ...flag };

      if (envConfig?.overrides?.[key]) {
        finalFlag = { ...finalFlag, ...envConfig.overrides[key] };
      }

      flags[key as FlagKey] = finalFlag;
    }

    console.log(`[FeatureFlags] Loaded ${Object.keys(flags).length} flags for ${env}`);
    return flags;
  } catch (error) {
    console.error(`[FeatureFlags] Failed to load config:`, error);
    throw error;
  }
}

/**
 * Creates evaluation context from request
 */
export function createContextFromRequest(
  request: {
    userId?: string;
    tenantId?: number;
    role?: string;
    headers?: Record<string, string>;
    requestId?: string;
  }
): EvaluationContext {
  const env = (process.env.NODE_ENV as "development" | "staging" | "production") || "development";

  return {
    userId: request.userId,
    tenantId: request.tenantId,
    role: request.role,
    environment: env,
    requestId: request.requestId,
    attributes: {
      // Extract custom attributes from headers
      ...Object.fromEntries(
        Object.entries(request.headers || {})
          .filter(([k]) => k.startsWith("x-ff-"))
          .map(([k, v]) => [k.slice(5), v])
      ),
    },
  };
}

/**
 * Middleware factory for Express/tRPC context
 */
export function createContextMiddleware(flags: FlagsRegistry) {
  return (request: any): EvaluationContext => {
    // Extract from various auth contexts
    const userId = request.user?.id || request.ctx?.user?.id;
    const tenantId = request.user?.tenantId || request.ctx?.tenantId;
    const role = request.user?.role || request.ctx?.user?.role;
    const requestId = request.headers?.["x-request-id"] || request.ctx?.requestId;

    return createContextFromRequest({
      userId,
      tenantId,
      role,
      headers: request.headers,
      requestId,
    });
  };
}

/**
 * Validates all flags at startup
 */
export function validateFlags(flags: FlagsRegistry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, flag] of Object.entries(flags)) {
    if (!flag.description || flag.description.trim().length === 0) {
      errors.push(`Flag "${key}": missing description`);
    }

    if (flag.targeting) {
      for (let i = 0; i < flag.targeting.length; i++) {
        const rule = flag.targeting[i];
        if (rule.percentage !== undefined && (rule.percentage < 0 || rule.percentage > 100)) {
          errors.push(`Flag "${key}" rule ${i}: percentage must be 0-100`);
        }
      }
    }

    if (flag.deprecated) {
      if (!flag.deprecated.since) {
        errors.push(`Flag "${key}": deprecated.since is required`);
      }
      if (flag.deprecated.replacement && !flags[flag.deprecated.replacement as FlagKey]) {
        errors.push(`Flag "${key}": replacement flag "${flag.deprecated.replacement}" not found`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}