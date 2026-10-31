/**
 * ALHUSAINIA Feature Flags — Main Entry
 * =====================================
 * Public API exports.
 */

// Types
export * from "./types";

// Core evaluation
export {
  evaluateFlag,
  evaluateAllFlags,
  createFlagClient,
  simpleHash,
  matchesRule,
} from "./evaluate";

// Configuration
export {
  loadFlags,
  createContextFromRequest,
  createContextMiddleware,
  validateFlags,
  ConfigSchema,
  type FeatureFlagsConfig,
} from "./config";

// React client
export {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFlag,
  useFeatureFlag,
  useAllFlags,
  withFeatureFlag,
} from "./client";

// Utilities
import type { FlagsRegistry, EvaluationContext, FlagKey } from "./types";

/** Creates a fully configured feature flags system */
export function createFeatureFlagsSystem(flags: FlagsRegistry, defaultContext: EvaluationContext) {
  const validation = validateFlags(flags);
  if (!validation.valid) {
    throw new Error(`Invalid flags configuration: ${validation.errors.join(", ")}`);
  }

  const client = createFlagClient(flags, defaultContext);

  return {
    ...client,
    flags,
    defaultContext,
    middleware: createContextMiddleware(flags),
  };
}

// Re-export validation
export { validateFlags } from "./config";