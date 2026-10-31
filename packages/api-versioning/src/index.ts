/**
 * ALHUSAINIA API Versioning — Main Entry
 * ======================================
 * Public API exports for versioning system.
 */

// Types
export * from "./types";

// Negotiation engine
export {
  resolveConfig,
  extractVersionInfo,
  negotiateVersion,
  generateVersionHeaders,
  isDeprecated,
  isSunset,
  getDeprecationInfo,
  getLatestVersion,
  getVersionStatuses,
  validateRegistry,
  createVersionedKey,
  compareVersions,
  parseVersion,
} from "./negotiate";

// Middleware
export {
  createVersioningMiddleware,
  createTRPCVersioningMiddleware,
  versioningContextMiddleware,
  versionedRoute,
  getRequestVersion,
  isRequestVersionDeprecated,
  getRequestDeprecationWarning,
} from "./middleware";

// Re-export validation
export { validateRegistry } from "./negotiate";

// Default config helper
import type { VersioningConfig, VersionRegistry, ApiVersion } from "./types";
import { apiVersion } from "./types";

/** Creates a standard versioning configuration */
export function createVersioningConfig(
  defaultVersion: ApiVersion,
  versions: VersionRegistry,
  options?: Partial<VersioningConfig>
): VersioningConfig {
  return {
    defaultVersion,
    versions,
    versionHeader: "accept-version",
    clientHeader: "x-client-version",
    negotiate: true,
    strict: false,
    ...options,
  };
}

/** Predefined version registry for common use cases */
export const COMMON_VERSIONS: VersionRegistry = {
  [apiVersion("2024-01-01")]: {
    version: apiVersion("2024-01-01"),
    status: "active",
    releasedAt: "2024-01-01",
    changelog: ["Initial stable release"],
  },
  [apiVersion("2024-06-15")]: {
    version: apiVersion("2024-06-15"),
    status: "active",
    releasedAt: "2024-06-15",
    changelog: ["Added advanced reporting", "Improved inventory tracking"],
  },
  [apiVersion("2025-01-01")]: {
    version: apiVersion("2025-01-01"),
    status: "active",
    releasedAt: "2025-01-01",
    changelog: ["New pricing engine", "Enhanced security", "Breaking changes in auth"],
  },
};