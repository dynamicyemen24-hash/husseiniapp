/**
 * API Security — Anti-Reverse Engineering & Response Protection.
 *
 * Features:
 * - Response signature verification
 * - API key rotation support
 * - Request signing validation
 * - Debug mode detection
 * - Environment integrity checks
 * - Code obfuscation helpers
 *
 * Protects against:
 * - API scraping and data extraction
 * - Replay attacks
 * - Man-in-the-middle
 * - Code tampering
 * - Unauthorized API access
 */

import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

// ─── Response Signing ─────────────────────────────────────────────
const RESPONSE_SECRET =
  process.env.API_RESPONSE_SECRET || process.env.JWT_SECRET || "";

export function signResponse(data: string): string {
  if (!RESPONSE_SECRET) return "";
  return createHmac("sha256", RESPONSE_SECRET).update(data).digest("hex");
}

export function verifyResponseSignature(
  data: string,
  signature: string
): boolean {
  if (!RESPONSE_SECRET) return false;
  const expected = signResponse(data);
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// ─── Request Signing ──────────────────────────────────────────────
export function generateRequestSignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  secret: string
): string {
  const payload = `${method}:${path}:${timestamp}:${body}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyRequestSignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  signature: string,
  secret: string,
  maxAgeMs: number = 300_000
): { valid: boolean; reason?: string } {
  // Check timestamp freshness
  if (Math.abs(Date.now() - timestamp) > maxAgeMs) {
    return { valid: false, reason: "Request expired" };
  }

  const expected = generateRequestSignature(
    method,
    path,
    body,
    timestamp,
    secret
  );

  if (
    !timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    )
  ) {
    return { valid: false, reason: "Invalid signature" };
  }

  return { valid: true };
}

// ─── Debug Detection ──────────────────────────────────────────────
export function isDebugEnvironment(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.DEBUG === "true" ||
    process.env.DEBUGGER === "true" ||
    process.env.NODE_DEBUG === "true"
  );
}

export function detectDebugger(): boolean {
  // Detect Node.js --inspect flag
  if (process.execArgv.some(arg => arg.includes("--inspect"))) {
    return true;
  }

  // Detect common debugging ports
  const debugPort = process.env.NODE_OPTIONS?.includes("--inspect");
  return !!debugPort;
}

// ─── Environment Integrity ────────────────────────────────────────
const ENV_CHECKSUMS: Record<string, string> = {};

export function calculateEnvChecksum(): string {
  const relevantVars = [
    "NODE_ENV",
    "DATABASE_URL",
    "JWT_SECRET",
    "CSRF_SECRET",
    "BACKUP_ENCRYPTION_KEY",
  ];

  const payload = relevantVars
    .map(v => `${v}=${process.env[v] || ""}`)
    .join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function verifyEnvIntegrity(): {
  valid: boolean;
  tampered: string[];
} {
  const current = calculateEnvChecksum();
  const stored = ENV_CHECKSUMS["main"];

  if (!stored) {
    ENV_CHECKSUMS["main"] = current;
    return { valid: true, tampered: [] };
  }

  if (current !== stored) {
    return {
      valid: false,
      tampered: ["Environment variables modified after startup"],
    };
  }

  return { valid: true, tampered: [] };
}

// ─── API Key Management ───────────────────────────────────────────
interface ApiKey {
  id: string;
  key: string;
  hash: string;
  name: string;
  permissions: string[];
  expiresAt: number;
  createdAt: number;
  lastUsedAt: number;
  revoked: boolean;
}

const apiKeys = new Map<string, ApiKey>();

export function generateApiKey(
  name: string,
  permissions: string[],
  expiresInMs: number = 365 * 24 * 60 * 60 * 1000 // 1 year
): { id: string; key: string; hash: string } {
  const id = randomBytes(8).toString("hex");
  const key = `ahk_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");

  apiKeys.set(id, {
    id,
    key,
    hash,
    name,
    permissions,
    expiresAt: Date.now() + expiresInMs,
    createdAt: Date.now(),
    lastUsedAt: 0,
    revoked: false,
  });

  return { id, key, hash };
}

export function validateApiKey(key: string): {
  valid: boolean;
  apiKey?: ApiKey;
  reason?: string;
} {
  if (!key.startsWith("ahk_")) {
    return { valid: false, reason: "Invalid key format" };
  }

  const hash = createHash("sha256").update(key).digest("hex");

  for (const apiKey of apiKeys.values()) {
    if (apiKey.revoked) continue;
    if (apiKey.hash !== hash) continue;

    if (apiKey.expiresAt < Date.now()) {
      return { valid: false, reason: "API key expired" };
    }

    apiKey.lastUsedAt = Date.now();
    return { valid: true, apiKey };
  }

  return { valid: false, reason: "API key not found" };
}

export function revokeApiKey(id: string): boolean {
  const apiKey = apiKeys.get(id);
  if (!apiKey) return false;
  apiKey.revoked = true;
  return true;
}

// ─── Response Obfuscation ─────────────────────────────────────────
export function obfuscateResponse<T extends Record<string, any>>(
  data: T,
  fields: string[] = []
): T {
  const obfuscated = { ...data };

  for (const field of fields) {
    if (field in obfuscated) {
      const value = obfuscated[field];
      if (typeof value === "string") {
        (obfuscated as any)[field] = "***REDACTED***";
      } else if (typeof value === "number") {
        (obfuscated as any)[field] = 0;
      } else if (typeof value === "object" && value !== null) {
        (obfuscated as any)[field] = {};
      }
    }
  }

  return obfuscated;
}

export function stripSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = [
    "password",
    "passwordHash",
    "jwtSecret",
    "apiKey",
    "secret",
    "token",
    "creditCard",
    "ssn",
    "taxId",
  ]
): Partial<T> {
  const result = { ...data };

  for (const field of sensitiveFields) {
    if (field in result) {
      delete result[field];
    }
  }

  return result;
}

// ─── Rate Limit Headers ───────────────────────────────────────────
export function setRateLimitHeaders(
  res: any,
  limit: number,
  remaining: number,
  resetMs: number
): void {
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil((Date.now() + resetMs) / 1000));
}

// ─── Security Headers ─────────────────────────────────────────────
export function setSecurityHeaders(res: any): void {
  // Prevent caching of sensitive responses
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // HSTS
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Prevent referrer leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
}
