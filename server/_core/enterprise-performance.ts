/**
 * Enterprise Performance Middleware — Uamex_erp
 * ============================================
 * - In-memory LRU cache with TTL (Redis-like without Redis dependency)
 * - Query result caching for hot dashboard data
 * - Connection pooling via tRPC context reuse
 * - Rate limiting per IP and per tenant
 * - Request queuing for bulk operations
 *
 * Scale target: 10M+ records, 1000+ concurrent users
 * Latency target: P99 < 100ms for cached, P99 < 500ms for uncached
 */

import { AsyncLocalStorage } from "async_hooks";

// ====================================================================
// TYPES & INTERFACES
// ====================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Unix timestamp ms
  hits: number;
  size: number; // bytes
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

interface QueryResult<T> {
  data: T | null;
  cached: boolean;
  latencyMs: number;
  fromCache: boolean;
}

interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  cacheHitRate: number;
  cacheSize: number;
}

// ====================================================================
// LRU CACHE — In-memory, TTL-based, size-limited
// ====================================================================

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number; // ms
  private currentSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(maxSizeMB = 100, defaultTTLMs = 5 * 60 * 1000) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.maxAge = defaultTTLMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    const size = this.estimateSize(data);
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.maxAge),
      hits: 0,
      size,
    };

    // Evict if necessary
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.delete(oldestKey);
    }

    // Remove existing entry size if updating
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  getStats(): PoolStats {
    return {
      activeConnections: 0, // Not applicable for in-memory cache
      idleConnections: 0,
      waitingRequests: 0,
      cacheHitRate: this.getHitRate(),
      cacheSize: this.currentSize,
    };
  }

  private estimateSize(data: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(data), "utf8");
    } catch {
      return 1024; // Default 1KB estimate
    }
  }
}

// ====================================================================
// CACHE INSTANCES — Per domain
// ====================================================================

export const dashboardCache = new LRUCache<unknown>(50, 30 * 1000); // 50MB, 30s TTL
export const accountingCache = new LRUCache<unknown>(100, 60 * 1000); // 100MB, 1min TTL
export const inventoryCache = new LRUCache<unknown>(80, 15 * 1000); // 80MB, 15s TTL
export const reportsCache = new LRUCache<unknown>(200, 5 * 60 * 1000); // 200MB, 5min TTL
export const lookupCache = new LRUCache<unknown>(20, 30 * 60 * 1000); // 20MB, 30min TTL

// ====================================================================
// RATE LIMITER — Token bucket algorithm
// ====================================================================

class RateLimiter {
  private buckets = new Map<string, RateLimitBucket>();
  private windowMs: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms

  constructor(maxRequestsPerMinute = 60, burstSize = 10) {
    this.windowMs = 60 * 1000;
    this.maxTokens = maxRequestsPerMinute;
    this.refillRate = maxRequestsPerMinute / this.windowMs;
    this.burstSize = burstSize;
  }

  private getBucket(key: string): RateLimitBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: Date.now() };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refill(bucket: RateLimitBucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  consume(
    key: string,
    cost = 1
  ): { allowed: boolean; remaining: number; resetMs: number } {
    const bucket = this.getBucket(key);
    this.refill(bucket);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetMs: Math.ceil((this.maxTokens - bucket.tokens) / this.refillRate),
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.ceil((cost - bucket.tokens) / this.refillRate),
    };
  }

  private burstSize: number;

  // Cleanup old buckets periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }
}

// Per-IP rate limiter (public API)
export const ipRateLimiter = new RateLimiter(60, 10); // 60 req/min, burst 10

// Per-tenant rate limiter (authenticated API)
export const tenantRateLimiter = new RateLimiter(300, 50); // 300 req/min, burst 50

// Strict rate limiter for auth endpoints
export const authRateLimiter = new RateLimiter(10, 3); // 10 req/min, burst 3

// ====================================================================
// CACHED QUERY DECORATOR
// ====================================================================

interface CachedQueryOptions {
  cache: LRUCache<unknown>;
  keyPrefix: string;
  ttlMs?: number;
  keyBuilder?: (...args: unknown[]) => string;
}

export function cachedQuery<T>(
  options: CachedQueryOptions,
  queryFn: (...args: unknown[]) => Promise<T>
): (...args: unknown[]) => Promise<QueryResult<T>> {
  return async (...args: unknown[]): Promise<QueryResult<T>> => {
    const start = Date.now();
    const cacheKey = options.keyBuilder
      ? `${options.keyPrefix}:${options.keyBuilder(...args)}`
      : `${options.keyPrefix}:${JSON.stringify(args)}`;

    // Try cache first
    const cached = options.cache.get(cacheKey) as T | null;
    if (cached !== null) {
      return {
        data: cached,
        cached: true,
        latencyMs: Date.now() - start,
        fromCache: true,
      };
    }

    // Execute query
    const data = await queryFn(...args);

    // Store in cache
    options.cache.set(cacheKey, data, options.ttlMs);

    return {
      data,
      cached: false,
      latencyMs: Date.now() - start,
      fromCache: false,
    };
  };
}

// ====================================================================
// BATCH QUERY PROCESSOR — Queue and batch multiple queries
// ====================================================================

interface BatchRequest<T> {
  id: string;
  query: () => Promise<T>;
  priority: number;
}

class BatchProcessor<T> {
  private queue: BatchRequest<T>[] = [];
  private processing = false;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor(batchSize = 50, flushIntervalMs = 100) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
  }

  async add(id: string, query: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest<T> = { id, query, priority };
      this.queue.push(request);
      this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first

      // Setup timeout
      const timeout = setTimeout(() => {
        const idx = this.queue.findIndex(r => r.id === id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(new Error(`Batch timeout for ${id}`));
        }
      }, 30000);

      // Setup resolver
      request.query = async () => {
        clearTimeout(timeout);
        return query();
      };

      // Trigger flush if batch is full
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else {
        // Schedule flush
        setTimeout(() => this.flush(), this.flushIntervalMs);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await Promise.all(batch.map(req => req.query()));
    } catch (error) {
      console.error("Batch processing error:", error);
    }

    this.processing = false;

    // Continue if more items
    if (this.queue.length > 0) {
      setTimeout(() => this.flush(), 10);
    }
  }
}

export const batchProcessor = new BatchProcessor<unknown>(50, 100);

// ====================================================================
// ASYNC LOCAL STORAGE — Request context
// ====================================================================

export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  startTime: number;
  tenantId?: string;
  userId?: string;
  ip?: string;
}>();

// ====================================================================
// PERFORMANCE MIDDLEWARE — Express integration
// ====================================================================

import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";
import {
  classifyHttpRoute,
  deriveTraceId,
  recordHttpRequest,
} from "./observability";

export function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // UNIFIED correlation: reuse the x-request-id assigned at the edge
  // (app.ts, first middleware). Never fork a second ID per request.
  // The traceId extends x-request-id (or honours W3C `traceparent`).
  const incoming =
    (req as unknown as Record<string, unknown>).requestId ??
    req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.length > 0
      ? incoming
      : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  (req as unknown as Record<string, unknown>).requestId = requestId;
  const traceId = deriveTraceId(requestId, req.headers["traceparent"]);
  (req as unknown as Record<string, unknown>).traceId = traceId;
  const startTime = Date.now();

  requestContext.run(
    {
      requestId,
      startTime,
      tenantId: (req as Request & { tenantId?: string }).tenantId,
      userId: (req as Request & { userId?: string }).userId,
      ip: req.ip,
    },
    () => {
      // Add request ID to response headers (don't overwrite the edge value)
      if (!res.getHeader("X-Request-ID")) {
        res.setHeader("X-Request-ID", requestId);
      }
      if (!res.getHeader("X-Trace-ID")) {
        res.setHeader("X-Trace-ID", traceId);
      }

      // Log on response finish — structured JSON via the SINGLE
      // logger/redact() entrypoint, plus the in-memory SLI sample that
      // feeds GET /api/slo (p50/p95 windows).
      res.on("finish", () => {
        const ctx = requestContext.getStore();
        const durationMs = Date.now() - startTime;
        const kind = classifyHttpRoute(req.method);
        const tenantId =
          ctx?.tenantId ??
          (typeof req.headers["x-tenant-id"] === "string"
            ? req.headers["x-tenant-id"]
            : undefined);
        recordHttpRequest({
          route: req.path,
          kind,
          durationMs,
          ok: res.statusCode < 500,
        });
        logger.info("http", {
          requestId,
          traceId,
          method: req.method,
          route: req.path,
          path: req.path,
          status: res.statusCode,
          durationMs,
          tenantId,
          userId: ctx?.userId,
        });
      });

      next();
    }
  );
}

// ====================================================================
// RATE LIMITING MIDDLEWARE
// ====================================================================

export function rateLimitMiddleware(
  limiter: RateLimiter,
  keyGenerator: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const result = limiter.consume(key);

    res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    res.setHeader("X-RateLimit-Reset", result.resetMs.toString());

    if (!result.allowed) {
      res.setHeader("Retry-After", Math.ceil(result.resetMs / 1000).toString());
      res.status(429).json({
        error: "Too Many Requests",
        retryAfterMs: result.resetMs,
      });
      return;
    }

    next();
  };
}

// ====================================================================
// CACHE INVALIDATION HELPERS
// ====================================================================

export function invalidateTenantCache(tenantId: string): void {
  const prefix = `tenant:${tenantId}`;
  dashboardCache.invalidate(prefix);
  accountingCache.invalidate(prefix);
  inventoryCache.invalidate(prefix);
  reportsCache.invalidate(prefix);
}

export function invalidateUserCache(userId: string): void {
  lookupCache.invalidate(`user:${userId}`);
}

export function invalidateAllCaches(): void {
  dashboardCache.clear();
  accountingCache.clear();
  inventoryCache.clear();
  reportsCache.clear();
  lookupCache.clear();
}

// ====================================================================
// HEALTH CHECK
// ====================================================================

export function getPerformanceStats(): {
  caches: PoolStats[];
  uptime: number;
} {
  return {
    caches: [
      dashboardCache.getStats(),
      accountingCache.getStats(),
      inventoryCache.getStats(),
      reportsCache.getStats(),
      lookupCache.getStats(),
    ],
    uptime: process.uptime(),
  };
}
