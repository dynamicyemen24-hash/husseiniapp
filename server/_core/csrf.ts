/**
 * CSRF Protection — Double-submit cookie pattern.
 *
 * Implements OWASP CSRF Prevention Cheat Sheet:
 * - Double-submit cookie pattern (synchronizer token alternative)
 * - SameSite cookie attribute
 * - Origin/Referer header validation
 * - Time-limited tokens (10 min expiry)
 *
 * Standards: OWASP ASVS 3.5 (session management),
 * PCI-DSS 6.5.9 (cross-site request forgery).
 */

import type { Request, Response, NextFunction } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { parse as parseCookie } from "cookie";

/**
 * Cookie name. The `__Host-` prefix is mandatory-Secure per spec — browsers
 * silently drop such cookies over plain HTTP, which would break local
 * dev/E2E entirely. Production keeps the prefix; dev uses a plain name.
 */
const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-csrf_token" : "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function resolveCsrfSecret(): string {
  const configured = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (configured) return configured;
  // Fail closed in production: a predictable HMAC secret makes every CSRF
  // token forgeable. Dev/test keep a throwaway fallback for local boot.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CSRF_SECRET (or JWT_SECRET) must be configured in production"
    );
  }
  return "csrf-dev-only-fallback-secret";
}
const CSRF_SECRET = resolveCsrfSecret();
const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a CSRF token with timestamp.
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString(36);
  const nonce = randomBytes(16).toString("hex");
  const payload = `${timestamp}:${nonce}`;
  const signature = createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/**
 * Verify a CSRF token is valid and not expired.
 */
export function verifyCsrfToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [timestampHex, nonce, signature] = parts;
    const payload = `${timestampHex}:${nonce}`;
    const expectedSig = createHmac("sha256", CSRF_SECRET)
      .update(payload)
      .digest("hex");

    // Constant-time comparison
    if (
      !timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSig, "hex")
      )
    ) {
      return false;
    }

    // Check expiry
    const timestamp = parseInt(timestampHex, 36);
    if (Date.now() - timestamp > TOKEN_EXPIRY_MS) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Set CSRF token cookie on response.
 *
 * `secure` follows the environment: `__Host-` cookies are rejected by
 * browsers over plain HTTP, so local dev/E2E (http://localhost) must not
 * set Secure or the cookie — and the whole double-submit flow — silently
 * dies. Production (HTTPS) keeps Secure.
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // NOTE: Express `maxAge` is in MILLISECONDS (it emits Max-Age seconds).
    // Dividing here once produced Max-Age=0 — an instantly-dead cookie.
    maxAge: TOKEN_EXPIRY_MS,
  });
}

/**
 * Pre-authentication tRPC procedures that may run WITHOUT a double-submit
 * token (no session/cookie exists yet — chicken-and-egg). They stay
 * protected by Origin/Referer validation + auth rate limiting + lockout.
 *
 * Everything else (any authenticated mutation) still requires the token.
 */
const CSRF_EXEMPT_PROCEDURES = new Set([
  "auth.login",
  "auth.verifyMfa",
  "auth.register",
  "auth.ownerLogin",
  "auth.logout",
  "auth.forgotPassword",
  "auth.resetPassword",
  "auth.verifyEmail",
  "auth.resendVerificationEmail",
]);

/**
 * True when a tRPC batch targets ONLY pre-auth procedures.
 * Handles both single (`/api/trpc/auth.login`) and batched
 * (`/api/trpc/auth.login,auth.me`) shapes.
 */
export function isCsrfExemptBatch(req: Request): boolean {
  const prefix = "/api/trpc/";
  if (!req.path.startsWith(prefix)) return false;
  const batch = req.path.slice(prefix.length).split(",");
  if (batch.length === 0 || batch.some(p => !p)) return false;
  return batch.every(p => CSRF_EXEMPT_PROCEDURES.has(p));
}

/**
 * Extract CSRF token from request (header or body).
 */
function extractCsrfToken(req: Request): string | null {
  // Check header first
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  if (headerToken) return headerToken;

  // Check body
  if (req.body && typeof req.body._csrf === "string") {
    return req.body._csrf;
  }

  return null;
}

/**
 * Extract CSRF token from cookie.
 */
function extractCsrfCookie(req: Request): string | null {
  const cookies = parseCookie(req.headers.cookie || "");
  return cookies[CSRF_COOKIE_NAME] || null;
}

/**
 * Validate Origin header against allowed origins.
 */
function validateOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (!origin) return true; // Some clients don't send Origin

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return true;
    return getTrustedExternalOrigins().has(originUrl.origin);
  } catch {
    return false;
  }
}

/**
 * Validate Referer header against allowed origins.
 */
function validateReferer(req: Request): boolean {
  const referer = req.headers.referer;
  const host = req.headers.host;

  if (!referer) return true; // Some clients don't send Referer

  try {
    const refererUrl = new URL(referer);
    if (refererUrl.host === host) return true;
    return getTrustedExternalOrigins().has(refererUrl.origin);
  } catch {
    return false;
  }
}

/** Exact-origin allowlist for trusted same-site frontends behind a server proxy. */
function getTrustedExternalOrigins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_CSRF_ORIGINS ?? "")
      .split(",")
      .map(value => {
        try {
          const parsed = new URL(value.trim());
          return parsed.protocol === "https:" ? parsed.origin : "";
        } catch {
          return "";
        }
      })
      .filter(Boolean)
  );
}

/**
 * CSRF protection middleware.
 * Applies to state-changing methods (POST, PUT, PATCH, DELETE).
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip for safe methods
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }

  // Skip for API health check
  if (req.path === "/api/health" || req.path === "/api/performance") {
    next();
    return;
  }

  // Skip for webhooks (they use signature verification)
  if (req.path.startsWith("/api/webhook")) {
    next();
    return;
  }

  // Validate Origin/Referer (applies to every state-changing call,
  // including the pre-auth allowlist below).
  if (!validateOrigin(req) || !validateReferer(req)) {
    res.status(403).json({
      error: "CSRF validation failed",
      code: "CSRF_ORIGIN_MISMATCH",
    });
    return;
  }

  // Pre-auth procedures carry no token yet — allowlisted above.
  if (isCsrfExemptBatch(req)) {
    next();
    return;
  }

  // Extract tokens
  const headerToken = extractCsrfToken(req);
  const cookieToken = extractCsrfCookie(req);

  if (!headerToken || !cookieToken) {
    res.status(403).json({
      error: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
    return;
  }

  // Compare tokens (constant-time)
  try {
    if (!timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
      res.status(403).json({
        error: "CSRF token mismatch",
        code: "CSRF_TOKEN_MISMATCH",
      });
      return;
    }
  } catch {
    res.status(403).json({
      error: "CSRF token invalid",
      code: "CSRF_TOKEN_INVALID",
    });
    return;
  }

  // Verify token validity
  if (!verifyCsrfToken(headerToken)) {
    res.status(403).json({
      error: "CSRF token expired or invalid",
      code: "CSRF_TOKEN_EXPIRED",
    });
    return;
  }

  next();
}

/**
 * Generate and set CSRF token for the response.
 * Call this after successful authentication.
 */
export function refreshCsrfToken(req: Request, res: Response): void {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  // Also send in response body for SPA usage
  res.setHeader("X-CSRF-Token", token);
}
