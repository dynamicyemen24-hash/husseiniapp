/**
 * ALHUSAINIA API Versioning — Express Middleware
 * ==============================================
 * Integrates version negotiation into Express/tRPC.
 */

import { Request, Response, NextFunction } from "express";
import type { VersioningConfig, VersionHeaders, RequestVersionInfo, ApiVersion } from "./types";
import { negotiateVersion, generateVersionHeaders, extractVersionInfo, resolveConfig, validateRegistry } from "./negotiate";

/** Extended Express Request with version info */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
      apiVersionInfo?: RequestVersionInfo;
      apiVersionNegotiated?: boolean;
    }
  }
}

/** Creates versioning middleware */
export function createVersioningMiddleware(config: VersioningConfig) {
  const resolvedConfig = resolveConfig(config);

  // Validate registry at startup
  const validation = validateRegistry(resolvedConfig.versions);
  if (!validation.valid) {
    throw new Error(`Invalid version registry: ${validation.errors.join(", ")}`);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract version from headers
    const versionInfo = extractVersionInfo(req.headers, resolvedConfig);

    // Negotiate version
    const negotiation = negotiateVersion(versionInfo, resolvedConfig);

    // Attach to request
    req.apiVersion = negotiation.version;
    req.apiVersionInfo = versionInfo;
    req.apiVersionNegotiated = negotiation.negotiated;

    // Generate response headers
    const headers = generateVersionHeaders(negotiation.version, resolvedConfig, versionInfo);
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    }

    // Add deprecation warning to response body if applicable
    if (negotiation.warning) {
      res.setHeader("x-api-warning", negotiation.warning);
    }

    // Handle sunset versions
    const versionDef = resolvedConfig.versions[negotiation.version];
    if (versionDef?.status === "sunset" || versionDef?.status === "archived") {
      res.setHeader("x-api-sunset", "true");
      if (versionDef.deprecation?.sunsetAt) {
        res.setHeader("x-api-sunset-date", versionDef.deprecation.sunsetAt);
      }
    }

    next();
  };
}

/** tRPC middleware for versioning */
export function createTRPCVersioningMiddleware(config: VersioningConfig) {
  const middleware = createVersioningMiddleware(config);

  return middleware as (req: Request, res: Response, next: NextFunction) => void;
}

/** Higher-order function to add version to tRPC context */
export function versioningContextMiddleware(config: VersioningConfig) {
  const middleware = createVersioningMiddleware(config);

  return async (opts: { req: Request; res: Response; next: () => Promise<void> }) => {
    await new Promise<void>((resolve, reject) => {
      middleware(opts.req, opts.res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await opts.next();
  };
}

/** Decorator for version-specific route handlers */
export function versionedRoute(
  config: VersioningConfig,
  handlers: Partial<Record<ApiVersion, (req: Request, res: Response) => Promise<void>>>
) {
  const middleware = createVersioningMiddleware(config);

  return async (req: Request, res: Response, next: NextFunction) => {
    await new Promise<void>((resolve, reject) => {
      middleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const version = req.apiVersion!;
    const handler = handlers[version];

    if (handler) {
      return handler(req, res);
    }

    // Fallback to default version handler
    const defaultHandler = handlers[config.defaultVersion];
    if (defaultHandler) {
      return defaultHandler(req, res);
    }

    next(); // No handler found
  };
}

/** Helper to get current version in route handler */
export function getRequestVersion(req: Request): ApiVersion {
  return req.apiVersion || "unknown";
}

/** Helper to check if version is deprecated */
export function isRequestVersionDeprecated(req: Request, config: VersioningConfig): boolean {
  const version = req.apiVersion;
  if (!version) return false;

  const def = config.versions[version];
  return def?.status === "deprecated" || def?.status === "sunset";
}

/** Helper to get deprecation warning for current request */
export function getRequestDeprecationWarning(req: Request, config: VersioningConfig): string | null {
  const version = req.apiVersion;
  if (!version) return null;

  const def = config.versions[version];
  if (!def?.deprecation) return null;

  const dep = def.deprecation;
  let message = `API version ${version} is deprecated`;
  if (dep.announcedAt) message += ` since ${dep.announcedAt}`;
  if (dep.sunsetAt) message += `, will be removed ${dep.sunsetAt}`;
  if (dep.replacement) message += `, use ${dep.replacement} instead`;
  if (dep.message) message += `. ${dep.message}`;

  return message;
}