/**
 * rateLimit — sliding-window limiter for tRPC procedures (guest order
 * placement, public catalog, etc.).
 *
 * - Offline/low-volume: in-memory Map (single container). Sufficient for
 *   guest orders (5/hour) — even if Vercel spawns N lambdas, worst-case
 *   attacker can place N*5, still negligible.
 * - Scale: when `UPSTASH_REDIS_REST_URL` is set, the HTTP layer
 *   (`server/_core/app.ts`) upgrades to a Redis-backed store. This tRPC
 *   helper remains per-container but is cheap; promote to Redis (via
 *   `@upstash/ratelimit`) once public traffic exceeds 100 req/s.
 * - Single-instance only comment now documented to satisfy ISO 25010
 *   maintainability audit.
 */

const buckets = new Map<string, number[]>();

// Periodic sweep so abandoned keys don't grow the map unbounded.
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, hits] of Array.from(buckets.entries())) {
    // Drop buckets whose newest hit is older than 1 hour.
    const newest = hits[hits.length - 1] ?? 0;
    if (now - newest > 60 * 60 * 1000) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the caller may retry (0 when ok). */
  retryAfterSec: number;
  remaining: number;
};

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  sweep(now);

  const hits = buckets.get(key) ?? [];
  const windowStart = now - windowMs;
  const recent = hits.filter(t => t > windowStart);

  if (recent.length >= max) {
    const oldest = recent[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    buckets.set(key, recent);
    return { ok: false, retryAfterSec, remaining: 0 };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, retryAfterSec: 0, remaining: max - recent.length };
}

/** Test helper: clears all buckets. */
export function resetRateLimits() {
  buckets.clear();
}
