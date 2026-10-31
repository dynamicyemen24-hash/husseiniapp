/**
 * Performance Optimizer — تحسينات الأداء المتقدمة.
 *
 * Features:
 * - Request Deduplication (identical concurrent requests)
 * - Response Compression Tuning (Brotli + ETag)
 * - Query Result Caching
 * - Memory-efficient Serialization
 * - Lazy Loading for Heavy Operations
 */

import { createHash } from "crypto";

// ─── Request Deduplication ────────────────────────────────────────
const pendingRequests = new Map<string, Promise<any>>();

export function deduplicateRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

export function generateDeduplicationKey(
  method: string,
  path: string,
  body?: any
): string {
  const payload = `${method}:${path}:${body ? JSON.stringify(body) : ""}`;
  return createHash("sha256").update(payload).digest("hex").substring(0, 16);
}

// ─── Response Compression ─────────────────────────────────────────
export function shouldCompress(path: string): boolean {
  // Skip compression for very small payloads
  const skipPatterns = [
    "/api/health",
    "/api/live",
    "/api/cache/stats",
    "/api/circuit-breaker",
  ];

  return !skipPatterns.some(p => path.includes(p));
}

// ─── ETag Generation ──────────────────────────────────────────────
export function generateETag(data: string | Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

export function checkETag(
  reqETag: string | undefined,
  currentETag: string
): boolean {
  if (!reqETag) return false;
  return reqETag === currentETag || reqETag === `W/"${currentETag}"`;
}

// ─── Query Result Caching ─────────────────────────────────────────
interface QueryCacheEntry<T> {
  result: T;
  timestamp: number;
  ttlMs: number;
}

const queryCache = new Map<string, QueryCacheEntry<any>>();
const QUERY_CACHE_TTL = 30_000; // 30 seconds

export function getCachedQuery<T>(key: string): T | null {
  const entry = queryCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.ttlMs) {
    queryCache.delete(key);
    return null;
  }

  return entry.result as T;
}

export function setCachedQuery<T>(
  key: string,
  result: T,
  ttlMs: number = QUERY_CACHE_TTL
): void {
  queryCache.set(key, {
    result,
    timestamp: Date.now(),
    ttlMs,
  });
}

export function invalidateQueryCache(pattern?: string): number {
  if (!pattern) {
    const size = queryCache.size;
    queryCache.clear();
    return size;
  }

  const regex = new RegExp(pattern);
  let count = 0;

  for (const key of Array.from(queryCache.keys())) {
    if (regex.test(key)) {
      queryCache.delete(key);
      count++;
    }
  }

  return count;
}

// ─── Memory-Efficient Serialization ───────────────────────────────
export function createStreamSerializer(writable: NodeJS.WritableStream): {
  write: (data: any) => boolean;
  end: () => void;
} {
  let buffer: any[] = [];
  const backpressure = false;

  return {
    write(data: any) {
      buffer.push(data);

      if (buffer.length > 1000) {
        const json = JSON.stringify(buffer);
        buffer = [];
        return writable.write(json);
      }

      return true;
    },
    end() {
      if (buffer.length > 0) {
        writable.write(JSON.stringify(buffer));
      }
      writable.end();
    },
  };
}

// ─── Lazy Loading ─────────────────────────────────────────────────
const lazyModules = new Map<string, Promise<any>>();

export async function loadLazyModule<T>(modulePath: string): Promise<T> {
  if (lazyModules.has(modulePath)) {
    return lazyModules.get(modulePath)!;
  }

  const promise = import(modulePath);
  lazyModules.set(modulePath, promise);

  return promise;
}

// ─── Batch Processing ─────────────────────────────────────────────
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Yield to event loop
    if (i + batchSize < items.length) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  return results;
}

// ─── Performance Monitoring ───────────────────────────────────────
interface PerformanceMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 10_000;

export function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return fn()
    .then(result => {
      recordMetric(operation, Date.now() - start, true);
      return result;
    })
    .catch((error: any) => {
      recordMetric(operation, Date.now() - start, false);
      throw error;
    });
}

function recordMetric(
  operation: string,
  durationMs: number,
  success: boolean
): void {
  performanceMetrics.push({
    operation,
    durationMs,
    timestamp: Date.now(),
    success,
  });

  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.splice(0, 1000);
  }
}

export function getPerformanceStats(): {
  operations: Record<
    string,
    {
      count: number;
      avgMs: number;
      p95Ms: number;
      errorRate: number;
    }
  >;
  memory: NodeJS.MemoryUsage;
  uptime: number;
} {
  const ops: Record<string, number[]> = {};

  for (const metric of performanceMetrics) {
    if (!ops[metric.operation]) {
      ops[metric.operation] = [];
    }
    ops[metric.operation].push(metric.durationMs);
  }

  const operations: Record<string, any> = {};

  for (const [op, durations] of Object.entries(ops)) {
    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);

    const errorCount = performanceMetrics.filter(
      m => m.operation === op && !m.success
    ).length;

    operations[op] = {
      count: durations.length,
      avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95Ms: durations[p95Index] || 0,
      errorRate: errorCount / durations.length,
    };
  }

  return {
    operations,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };
}

// ─── Cleanup ──────────────────────────────────────────────────────
setInterval(() => {
  // Cleanup pending requests (stale after 30s)
  const now = Date.now();
  for (const [key, promise] of pendingRequests.entries()) {
    // Promise should resolve within 30s
    setTimeout(() => {
      if (pendingRequests.has(key)) {
        pendingRequests.delete(key);
      }
    }, 30_000);
  }

  // Cleanup old performance metrics
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.splice(0, 1000);
  }
}, 60_000);
