/**
 * ALHUSAINIA API Versioning — Negotiation Engine
 * ==============================================
 * Handles version negotiation, deprecation warnings, and sunset enforcement.
 */

import type {
  ApiVersion,
  VersionDefinition,
  VersionRegistry,
  VersioningConfig,
  RequestVersionInfo,
  VersionHeaders,
  NegotiationResult,
  VersionStatus,
  DeprecationInfo,
} from "./types";
import { parseVersion, compareVersions, DEFAULT_VERSIONING_CONFIG, apiVersion } from "./types";

/** Re-export core functions for public API */
export { parseVersion, compareVersions, apiVersion };

/** Resolves the effective versioning config */
export function resolveConfig(config: Partial<VersioningConfig>): VersioningConfig {
  return {
    defaultVersion: config.defaultVersion ?? apiVersion("2024-01-01"),
    versions: config.versions ?? {},
    versionHeader: config.versionHeader ?? DEFAULT_VERSIONING_CONFIG.versionHeader!,
    clientHeader: config.clientHeader ?? DEFAULT_VERSIONING_CONFIG.clientHeader!,
    negotiate: config.negotiate ?? DEFAULT_VERSIONING_CONFIG.negotiate!,
    strict: config.strict ?? DEFAULT_VERSIONING_CONFIG.strict!,
  };
}

/** Extracts version info from request headers (case-insensitive) */
export function extractVersionInfo(
  headers: Record<string, string | string[] | undefined>,
  config: VersioningConfig
): RequestVersionInfo {
  const headerName = config.versionHeader.toLowerCase();
  const clientHeaderName = config.clientHeader.toLowerCase();

  // Case-insensitive header lookup
  const findHeader = (name: string): string | string[] | undefined => {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }
    return undefined;
  };

  const versionHeader = findHeader(headerName);
  const clientHeader = findHeader(clientHeaderName);

  let version: ApiVersion | null = null;
  let explicit = false;

  if (versionHeader) {
    const versionStr = Array.isArray(versionHeader) ? versionHeader[0] : versionHeader;
    try {
      version = parseVersion(versionStr.trim());
      explicit = true;
    } catch {
      // Invalid version format - will use default
    }
  }

  const clientId = Array.isArray(clientHeader) ? clientHeader[0] : clientHeader;

  return {
    version,
    explicit,
    clientId,
    clientVersion: clientId,
  };
}

/** Negotiates the best version for the request */
export function negotiateVersion(
  requestInfo: RequestVersionInfo,
  config: VersioningConfig
): NegotiationResult {
  const { version, explicit } = requestInfo;
  const versions = Object.keys(config.versions) as ApiVersion[];

  // No version requested - use default
  if (!version) {
    return {
      version: config.defaultVersion,
      negotiated: false,
    };
  }

  // Check if requested version exists
  if (!config.versions[version]) {
    if (config.strict) {
      throw new Error(`Unsupported API version: ${version}`);
    }
    // Fall back to default with warning
    return {
      version: config.defaultVersion,
      negotiated: true,
      warning: `Version ${version} not supported, using ${config.defaultVersion}`,
    };
  }

  const versionDef = config.versions[version];

  // Check if version is sunset
  if (versionDef.status === "sunset" || versionDef.status === "archived") {
    if (config.strict) {
      throw new Error(`API version ${version} has been sunset`);
    }
    // Allow but warn
    return {
      version,
      negotiated: false,
      warning: `Version ${version} is sunset and will be removed`,
    };
  }

  // Version is supported
  return {
    version,
    negotiated: false,
  };
}

/** Generates version headers for response */
export function generateVersionHeaders(
  negotiatedVersion: ApiVersion,
  config: VersioningConfig,
  requestInfo: RequestVersionInfo
): VersionHeaders {
  const versionDef = config.versions[negotiatedVersion];
  const headers: VersionHeaders = {
    "api-version": negotiatedVersion,
    "supported-versions": Object.keys(config.versions)
      .filter(v => config.versions[v].status === "active")
      .join(", "),
  };

  if (versionDef?.deprecation) {
    const dep = versionDef.deprecation;
    headers.deprecation = `true; announced=${dep.announcedAt}`;
    if (dep.sunsetAt) {
      headers.sunset = dep.sunsetAt;
    }
    if (dep.migrationGuide) {
      headers.link = `<${dep.migrationGuide}>; rel="migration-guide"`;
    }
  }

  return headers;
}

/** Checks if a version is deprecated */
export function isDeprecated(version: ApiVersion, config: VersioningConfig): boolean {
  const def = config.versions[version];
  return def?.status === "deprecated" || def?.status === "sunset";
}

/** Checks if a version is sunset */
export function isSunset(version: ApiVersion, config: VersioningConfig): boolean {
  const def = config.versions[version];
  return def?.status === "sunset" || def?.status === "archived";
}

/** Gets deprecation info for a version */
export function getDeprecationInfo(version: ApiVersion, config: VersioningConfig): DeprecationInfo | null {
  return config.versions[version]?.deprecation ?? null;
}

/** Gets the latest active version */
export function getLatestVersion(config: VersioningConfig): ApiVersion {
  const activeVersions = Object.entries(config.versions)
    .filter(([, def]) => def.status === "active")
    .map(([v]) => v);

  if (activeVersions.length === 0) {
    return config.defaultVersion;
  }

  return activeVersions.reduce((latest, current) =>
    compareVersions(current, latest) > 0 ? current : latest
  );
}

/** Gets all versions with status */
export function getVersionStatuses(config: VersioningConfig): Record<ApiVersion, VersionStatus> {
  const statuses: Record<string, VersionStatus> = {};
  for (const [version, def] of Object.entries(config.versions)) {
    statuses[version] = def.status;
  }
  return statuses as Record<ApiVersion, VersionStatus>;
}

/** Validates version registry */
export function validateRegistry(versions: VersionRegistry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [version, def] of Object.entries(versions)) {
    if (def.version !== version) {
      errors.push(`Version mismatch: key="${version}" but def.version="${def.version}"`);
    }

    if (def.deprecation) {
      const dep = def.deprecation;
      if (!dep.announcedAt) {
        errors.push(`Version ${version}: deprecation.announcedAt is required`);
      }
      if (dep.replacement && !versions[dep.replacement]) {
        errors.push(`Version ${version}: replacement ${dep.replacement} not found in registry`);
      }
      if (dep.sunsetAt && new Date(dep.sunsetAt) <= new Date(dep.announcedAt)) {
        errors.push(`Version ${version}: sunsetAt must be after announcedAt`);
      }
    }

    if (def.status === "deprecated" && !def.deprecation) {
      errors.push(`Version ${version}: deprecated status requires deprecation info`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Creates a versioned API key for caching */
export function createVersionedKey(baseKey: string, version: ApiVersion): string {
  // Remove any existing 'v' prefix and non-alphanumeric chars
  const cleanVersion = version.replace(/^v/, "").replace(/[^a-zA-Z0-9]/g, "");
  return `${baseKey}:v${cleanVersion}`;
}