/**
 * ALHUSAINIA API Versioning — Core Types
 * ======================================
 * Type-safe API version definitions with deprecation support.
 */

import { z } from "zod";

/** API version format: YYYY-MM-DD or semantic version */
export type ApiVersion = string & { readonly __brand: unique symbol };

/** Creates a typed API version */
export function apiVersion<V extends string>(version: V): ApiVersion {
  return version as ApiVersion;
}

/** Supported version formats */
export const VersionSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Date-based: 2024-01-15
  z.string().regex(/^v\d+(\.\d+){0,2}$/),  // Semantic: v1, v1.0, v1.0.0
]);

/** Validates and parses version string */
export function parseVersion(version: string): ApiVersion {
  const result = VersionSchema.safeParse(version);
  if (!result.success) {
    throw new Error(`Invalid API version format: ${version}. Use YYYY-MM-DD or vX.Y.Z`);
  }
  return result.data as ApiVersion;
}

/** Version comparison result */
export type VersionComparison = -1 | 0 | 1;

/** Compares two API versions */
export function compareVersions(a: ApiVersion, b: ApiVersion): VersionComparison {
  // Try semantic version comparison first
  const semA = parseSemanticVersion(a);
  const semB = parseSemanticVersion(b);

  if (semA && semB) {
    for (let i = 0; i < 3; i++) {
      if (semA[i] !== semB[i]) {
        return semA[i] < semB[i] ? -1 : 1;
      }
    }
    return 0;
  }

  // Fall back to date-based comparison
  const dateA = parseDateVersion(a);
  const dateB = parseDateVersion(b);

  if (dateA && dateB) {
    return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
  }

  // String comparison as last resort
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseSemanticVersion(v: ApiVersion): [number, number, number] | null {
  const match = v.match(/^v(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) return null;
  return [
    parseInt(match[1], 10),
    parseInt(match[2] || "0", 10),
    parseInt(match[3] || "0", 10),
  ];
}

function parseDateVersion(v: ApiVersion): Date | null {
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
}

/** Version status */
export type VersionStatus = "active" | "deprecated" | "sunset" | "archived";

/** Deprecation metadata */
export interface DeprecationInfo {
  /** When deprecation was announced */
  announcedAt: string; // ISO date
  /** When version will be sunset (removed) */
  sunsetAt?: string; // ISO date
  /** Replacement version */
  replacement?: ApiVersion;
  /** Migration guide URL */
  migrationGuide?: string;
  /** Custom warning message */
  message?: string;
}

/** API version definition */
export interface VersionDefinition {
  version: ApiVersion;
  status: VersionStatus;
  releasedAt: string; // ISO date
  deprecation?: DeprecationInfo;
  /** Features/changes in this version */
  changelog?: string[];
  /** Minimum client version required */
  minClientVersion?: string;
}

/** Version registry */
export type VersionRegistry = Record<ApiVersion, VersionDefinition>;

/** Request version info extracted from headers */
export interface RequestVersionInfo {
  /** Requested version */
  version: ApiVersion | null;
  /** Whether version was explicitly requested */
  explicit: boolean;
  /** Client identifier */
  clientId?: string;
  /** Client version */
  clientVersion?: string;
}

/** Response headers for versioning */
export interface VersionHeaders {
  /** Current API version */
  "api-version": ApiVersion;
  /** Deprecated version warning */
  "deprecation"?: string;
  /** Sunset date if applicable */
  "sunset"?: string;
  /** Link to migration guide */
  "link"?: string;
  /** Supported versions */
  "supported-versions"?: string;
}

/** Configuration for versioning */
export interface VersioningConfig {
  /** Default version if none specified */
  defaultVersion: ApiVersion;
  /** All supported versions */
  versions: VersionRegistry;
  /** Header name for version negotiation */
  versionHeader: string;
  /** Header for client identification */
  clientHeader: string;
  /** Enable version negotiation */
  negotiate: boolean;
  /** Strict mode - reject unsupported versions */
  strict: boolean;
}

/** Default configuration */
export const DEFAULT_VERSIONING_CONFIG: Partial<VersioningConfig> = {
  versionHeader: "accept-version",
  clientHeader: "x-client-version",
  negotiate: true,
  strict: false,
};

/** Version negotiation result */
export interface NegotiationResult {
  version: ApiVersion;
  negotiated: boolean;
  warning?: string;
}