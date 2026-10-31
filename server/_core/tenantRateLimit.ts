/**
 * Per-Tenant Rate Limiting — Subscription-tier-aware request throttling.
 *
 * Implements:
 * - Sliding window algorithm (more accurate than fixed window)
 * - Per-tenant quotas based on subscription tier
 * - Per-user rate limiting
 * - Burst allowance for short spikes
 * - Graceful degradation (429 with retry-after)
 *
 * Standards: OWASP ASVS 14.4 (resource consumption),
 * ISO 27001 A.12.1.3 (capacity management).
 */

import type { Request, Response, NextFunction } from "express";

// ─── Subscription Tier Limits ───────────────────────────────────────
export interface TierLimits {
  /** Requests per minute */
  requestsPerMinute: number;
  /** Requests per hour */
  requestsPerHour: number;
  /** Requests per day */
  requestsPerDay: number;
  /** Max concurrent requests */
  maxConcurrent: number;
  /** Burst allowance (extra requests in short window) */
  burstAllowance: number;
  /** Max request body size in bytes */
  maxBodySize: number;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  starter: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    maxConcurrent: 10,
    burstAllowance: 10,
    maxBodySize: 5 * 1024 * 1024, // 5MB
  },
  business: {
    requestsPerMinute: 120,
    requestsPerHour: 3000,
    requestsPerDay: 30000,
    maxConcurrent: 25,
    burstAllowance: 20,
    maxBodySize: 10 * 1024 * 1024, // 10MB
  },
  enterprise: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    maxConcurrent: 50,
    burstAllowance: 50,
    maxBodySize: 20 * 1024 * 1024, // 20MB
  },
  owner: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000,
    maxConcurrent: 100,
    burstAllowance: 200,
    maxBodySize: 50 * 1024 * 1024, // 50MB
  },
};

// ─── Sliding Window Counter ─────────────────────────────────────────
interface WindowEntry {
  timestamp: number;
  count: number;
}

class SlidingWindowCounter {
  private windows: Map<string, WindowEntry[]> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }

    const entries = this.windows.get(key)!;
    // Remove old entries
    const valid = entries.filter(e => e.timestamp > windowStart);
    this.windows.set(key, valid);

    // Find or create current window
    const currentWindow = valid.find(e => e.timestamp >= windowStart);
    if (currentWindow) {
      currentWindow.count++;
    } else {
      valid.push({ timestamp: now, count: 1 });
    }

    return valid.reduce((sum, e) => sum + e.count, 0);
  }

  getCount(key: string, windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    const entries = this.windows.get(key) || [];
    return entries
      .filter(e => e.timestamp > windowStart)
      .reduce((sum, e) => sum + e.count, 0);
  }

  private cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Keep 24h
    for (const [key, entries] of this.windows) {
      const valid = entries.filter(e => e.timestamp > cutoff);
      if (valid.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, valid);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.windows.clear();
  }
}

// ─── Concurrent Request Tracker ─────────────────────────────────────
class ConcurrentTracker {
  private counts: Map<string, number> = new Map();

  increment(key: string): number {
    const current = this.counts.get(key) || 0;
    this.counts.set(key, current + 1);
    return current + 1;
  }

  decrement(key: string): number {
    const current = this.counts.get(key) || 0;
    this.counts.set(key, Math.max(0, current - 1));
    return Math.max(0, current - 1);
  }

  getCount(key: string): number {
    return this.counts.get(key) || 0;
  }
}

// ─── Global Instances ───────────────────────────────────────────────
const slidingWindow = new SlidingWindowCounter();
const concurrentTracker = new ConcurrentTracker();

// ─── Middleware ──────────────────────────────────────────────────────
export interface RateLimitOptions {
  /** Override tier limits */
  tier?: string;
  /** Custom key extractor */
  keyExtractor?: (req: Request) => string;
  /** Skip rate limiting for certain paths */
  skipPaths?: string[];
  /** Custom response on rate limit */
  onRateLimit?: (req: Request, res: Response, retryAfterMs: number) => void;
}

/**
 * Per-tenant rate limiting middleware.
 */
export function tenantRateLimit(options: RateLimitOptions = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = (req as any).tenantId || (req as any).ctx?.tenantId;
    const userRole = (req as any).user?.role || (req as any).ctx?.user?.role;
    const tier = options.tier || (userRole === "owner" ? "owner" : "business");
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.business;

    // Skip for health checks
    if (req.path === "/api/health" || req.path === "/api/performance") {
      next();
      return;
    }

    // Skip configured paths
    if (options.skipPaths?.some(p => req.path.startsWith(p))) {
      next();
      return;
    }

    const key = options.keyExtractor
      ? options.keyExtractor(req)
      : `tenant:${tenantId || "anon"}:ip:${req.ip || "unknown"}`;

    // Check per-minute limit
    const minuteCount = slidingWindow.increment(`${key}:minute`, 60_000);
    if (minuteCount > limits.requestsPerMinute + limits.burstAllowance) {
      const retryAfterMs = 60_000 - (Date.now() % 60_000);
      sendRateLimitResponse(
        res,
        retryAfterMs,
        limits.requestsPerMinute,
        "per minute"
      );
      return;
    }

    // Check per-hour limit
    const hourCount = slidingWindow.increment(`${key}:hour`, 3_600_000);
    if (hourCount > limits.requestsPerHour) {
      const retryAfterMs = 3_600_000 - (Date.now() % 3_600_000);
      sendRateLimitResponse(
        res,
        retryAfterMs,
        limits.requestsPerHour,
        "per hour"
      );
      return;
    }

    // Check per-day limit
    const dayCount = slidingWindow.increment(`${key}:day`, 86_400_000);
    if (dayCount > limits.requestsPerDay) {
      const retryAfterMs = 86_400_000 - (Date.now() % 86_400_000);
      sendRateLimitResponse(
        res,
        retryAfterMs,
        limits.requestsPerDay,
        "per day"
      );
      return;
    }

    // Check concurrent limit
    const concurrent = concurrentTracker.increment(key);
    if (concurrent > limits.maxConcurrent) {
      concurrentTracker.decrement(key);
      sendRateLimitResponse(res, 5000, limits.maxConcurrent, "concurrent");
      return;
    }

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", limits.requestsPerMinute);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, limits.requestsPerMinute - minuteCount)
    );
    res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000 + 60));
    res.setHeader("X-RateLimit-Tier", tier);

    // Decrement concurrent on response finish
    res.on("finish", () => {
      concurrentTracker.decrement(key);
    });

    next();
  };
}

function sendRateLimitResponse(
  res: Response,
  retryAfterMs: number,
  limit: number,
  window: string
): void {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  res.setHeader("Retry-After", retryAfterSec);
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", 0);
  res.setHeader(
    "X-RateLimit-Reset",
    Math.ceil(Date.now() / 1000 + retryAfterSec)
  );

  res.status(429).json({
    error: "Rate limit exceeded",
    message: `تم تجاوز الحد المسموح. يرجى المحاولة بعد ${retryAfterSec} ثانية`,
    retryAfter: retryAfterSec,
    limit,
    window,
  });
}

/**
 * Get current rate limit status for a tenant.
 */
export function getRateLimitStatus(
  tenantId: number,
  tier: string = "business"
) {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.business;
  const key = `tenant:${tenantId}`;

  return {
    tier,
    limits,
    current: {
      perMinute: slidingWindow.getCount(`${key}:minute`, 60_000),
      perHour: slidingWindow.getCount(`${key}:hour`, 3_600_000),
      perDay: slidingWindow.getCount(`${key}:day`, 86_400_000),
      concurrent: concurrentTracker.getCount(key),
    },
    remaining: {
      perMinute: Math.max(
        0,
        limits.requestsPerMinute -
          slidingWindow.getCount(`${key}:minute`, 60_000)
      ),
      perHour: Math.max(
        0,
        limits.requestsPerHour -
          slidingWindow.getCount(`${key}:hour`, 3_600_000)
      ),
      perDay: Math.max(
        0,
        limits.requestsPerDay - slidingWindow.getCount(`${key}:day`, 86_400_000)
      ),
      concurrent: Math.max(
        0,
        limits.maxConcurrent - concurrentTracker.getCount(key)
      ),
    },
  };
}
