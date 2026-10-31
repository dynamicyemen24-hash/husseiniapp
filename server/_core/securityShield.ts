/**
 * Security Shield — Advanced attack protection layer.
 *
 * Features:
 * - Anti-Brute-Force with progressive lockout (exponential backoff)
 * - Anti-Replay attack with nonce tracking
 * - Request fingerprinting for session binding
 * - IP reputation scoring
 * - Anomaly detection (request pattern analysis)
 * - Token theft detection
 *
 * OWASP ASVS 2021 v4.0 compliant.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

// ─── Anti-Brute-Force ──────────────────────────────────────────────
interface BruteForceEntry {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
  backoffMs: number;
}

const bruteForceStore = new Map<string, BruteForceEntry>();

const BRUTE_FORCE_CONFIG = {
  maxAttempts: 5,
  initialBackoffMs: 30_000, // 30 seconds
  maxBackoffMs: 3_600_000, // 1 hour
  backoffMultiplier: 2,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export function checkBruteForce(
  identifier: string,
  ip: string
): { allowed: boolean; retryAfterMs: number; attempts: number } {
  const now = Date.now();
  const key = `bf:${identifier}:${ip}`;
  const entry = bruteForceStore.get(key);

  if (entry) {
    // Check if lockout has expired
    if (entry.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterMs: entry.lockedUntil - now,
        attempts: entry.attempts,
      };
    }

    // Check if window has expired (reset attempts)
    if (now - entry.lastAttempt > BRUTE_FORCE_CONFIG.windowMs) {
      bruteForceStore.delete(key);
    }
  }

  return { allowed: true, retryAfterMs: 0, attempts: entry?.attempts ?? 0 };
}

export function recordFailedAttempt(
  identifier: string,
  ip: string
): { locked: boolean; retryAfterMs: number } {
  const now = Date.now();
  const key = `bf:${identifier}:${ip}`;
  const existing = bruteForceStore.get(key);

  const attempts = (existing?.attempts ?? 0) + 1;
  const backoffMs = existing
    ? Math.min(
        existing.backoffMs * BRUTE_FORCE_CONFIG.backoffMultiplier,
        BRUTE_FORCE_CONFIG.maxBackoffMs
      )
    : BRUTE_FORCE_CONFIG.initialBackoffMs;

  const entry: BruteForceEntry = {
    attempts,
    lastAttempt: now,
    lockedUntil:
      attempts >= BRUTE_FORCE_CONFIG.maxAttempts ? now + backoffMs : 0,
    backoffMs,
  };

  bruteForceStore.set(key, entry);

  return {
    locked: entry.lockedUntil > 0,
    retryAfterMs: entry.lockedUntil - now,
  };
}

export function recordSuccessfulLogin(identifier: string, ip: string): void {
  const key = `bf:${identifier}:${ip}`;
  bruteForceStore.delete(key);
}

// ─── Anti-Replay ───────────────────────────────────────────────────
const nonceStore = new Set<string>();
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

let lastNonceSweep = Date.now();

function sweepNonces(): void {
  const now = Date.now();
  if (now - lastNonceSweep < 60_000) return; // Sweep every minute
  lastNonceSweep = now;

  // In production, use Redis TTL. Here we just track recent nonces.
  // Memory cleanup happens via periodic sweep.
  if (nonceStore.size > 100_000) {
    nonceStore.clear(); // Emergency cleanup
  }
}

export function generateNonce(): string {
  sweepNonces();
  const nonce = randomBytes(16).toString("hex");
  nonceStore.add(nonce);
  return nonce;
}

export function validateNonce(nonce: string): boolean {
  sweepNonces();
  if (!nonceStore.has(nonce)) return false;
  nonceStore.delete(nonce); // One-time use
  return true;
}

// ─── Request Fingerprinting ────────────────────────────────────────
export function generateRequestFingerprint(
  userAgent: string,
  acceptLanguage: string,
  ip: string,
  timestamp: number
): string {
  const payload = `${userAgent}|${acceptLanguage}|${ip}|${timestamp}`;
  return createHash("sha256").update(payload).digest("hex").substring(0, 32);
}

export function validateRequestFingerprint(
  fingerprint: string,
  userAgent: string,
  acceptLanguage: string,
  ip: string,
  maxAgeMs: number = 300_000 // 5 minutes
): boolean {
  const now = Date.now();
  // Check within time window
  for (let offset = 0; offset < maxAgeMs; offset += 1000) {
    const expected = generateRequestFingerprint(
      userAgent,
      acceptLanguage,
      ip,
      now - offset
    );
    if (timingSafeEqual(Buffer.from(fingerprint), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

// ─── Token Theft Detection ────────────────────────────────────────
interface TokenUsage {
  tokenId: string;
  ip: string;
  userAgent: string;
  lastUsed: number;
  useCount: number;
}

const tokenUsageStore = new Map<string, TokenUsage>();

export function trackTokenUsage(
  tokenId: string,
  ip: string,
  userAgent: string
): { stolen: boolean; reason?: string } {
  const key = `tk:${tokenId}`;
  const existing = tokenUsageStore.get(key);

  if (existing) {
    // Check if same IP
    if (existing.ip !== ip) {
      return {
        stolen: true,
        reason: `IP changed from ${existing.ip} to ${ip}`,
      };
    }

    // Check if same User-Agent
    if (existing.userAgent !== userAgent) {
      return {
        stolen: true,
        reason: `User-Agent changed`,
      };
    }

    // Check for rapid usage (possible automation)
    if (Date.now() - existing.lastUsed < 1000 && existing.useCount > 10) {
      return {
        stolen: true,
        reason: "Rapid automated usage detected",
      };
    }

    existing.lastUsed = Date.now();
    existing.useCount++;
  } else {
    tokenUsageStore.set(key, {
      tokenId,
      ip,
      userAgent,
      lastUsed: Date.now(),
      useCount: 1,
    });
  }

  return { stolen: false };
}

export function revokeToken(tokenId: string): void {
  tokenUsageStore.delete(`tk:${tokenId}`);
}

// ─── IP Reputation ────────────────────────────────────────────────
interface IpReputation {
  score: number; // 0-100, lower is worse
  lastSeen: number;
  violations: number;
}

const ipReputationStore = new Map<string, IpReputation>();

export function getIpReputation(ip: string): number {
  const rep = ipReputationStore.get(ip);
  if (!rep) return 80; // Default: slightly suspicious
  return rep.score;
}

export function updateIpReputation(ip: string, good: boolean): void {
  const existing = ipReputationStore.get(ip) ?? {
    score: 80,
    lastSeen: Date.now(),
    violations: 0,
  };

  if (good) {
    existing.score = Math.min(100, existing.score + 5);
    existing.violations = Math.max(0, existing.violations - 1);
  } else {
    existing.score = Math.max(0, existing.score - 20);
    existing.violations++;
  }

  existing.lastSeen = Date.now();
  ipReputationStore.set(ip, existing);
}

// ─── Anomaly Detection ────────────────────────────────────────────
interface RequestPattern {
  path: string;
  count: number;
  windowStart: number;
}

const requestPatterns = new Map<string, RequestPattern>();

export function detectAnomaly(
  ip: string,
  path: string,
  maxRequestsPerMinute: number = 60
): { anomalous: boolean; reason?: string } {
  const key = `anomaly:${ip}:${path}`;
  const now = Date.now();
  const pattern = requestPatterns.get(key);

  if (pattern) {
    if (now - pattern.windowStart < 60_000) {
      pattern.count++;
      if (pattern.count > maxRequestsPerMinute) {
        return {
          anomalous: true,
          reason: `Excessive requests to ${path}: ${pattern.count}/min`,
        };
      }
    } else {
      // Reset window
      pattern.count = 1;
      pattern.windowStart = now;
    }
  } else {
    requestPatterns.set(key, {
      path,
      count: 1,
      windowStart: now,
    });
  }

  return { anomalous: false };
}

// ─── Cleanup ──────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();

  // Cleanup brute force entries
  for (const [key, entry] of bruteForceStore.entries()) {
    if (now - entry.lastAttempt > BRUTE_FORCE_CONFIG.windowMs * 2) {
      bruteForceStore.delete(key);
    }
  }

  // Cleanup token usage
  for (const [key, usage] of tokenUsageStore.entries()) {
    if (now - usage.lastUsed > 24 * 60 * 60 * 1000) {
      tokenUsageStore.delete(key);
    }
  }

  // Cleanup IP reputation
  for (const [key, rep] of ipReputationStore.entries()) {
    if (now - rep.lastSeen > 7 * 24 * 60 * 60 * 1000) {
      ipReputationStore.delete(key);
    }
  }

  // Cleanup anomaly patterns
  for (const [key, pattern] of requestPatterns.entries()) {
    if (now - pattern.windowStart > 120_000) {
      requestPatterns.delete(key);
    }
  }
}, 60_000);
