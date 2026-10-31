/**
 * ALHUSAINIA Cache — In-Memory Implementation
 * ============================================
 * LRU cache with TTL, tags, and stale-while-revalidate support.
 */

import { CACHE_DOMAINS } from "./types";
import type { ICache, CacheKey, CacheEntry, CacheStats, CacheDomainConfig } from "./types";

interface MemoryCacheOptions {
  maxSize: number;
  defaultTtlMs: number;
  cleanupIntervalMs?: number;
}

export class MemoryCache implements ICache {
  private cache = new Map<CacheKey, CacheEntry<unknown>>();
  private accessOrder = new Map<CacheKey, number>();
  private accessCounter = 0;
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    errors: 0,
    totalResponseTimeMs: 0,
    responseCount: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private options: MemoryCacheOptions,
    private domainConfig?: CacheDomainConfig
  ) {
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    const interval = this.options.cleanupIntervalMs ?? 60000;
    this.cleanupTimer = setInterval(() => this.cleanup(), interval);
    this.cleanupTimer.unref();
  }

  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        evicted++;
      }
    }

    // LRU eviction if over max size
    if (this.cache.size > this.options.maxSize) {
      const sortedKeys = [...this.accessOrder.entries()].sort((a, b) => a[1] - b[1]);
      const toEvict = sortedKeys.slice(0, this.cache.size - this.options.maxSize);
      for (const [key] of toEvict) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        evicted++;
      }
    }

    this.metrics.evictions += evicted;
  }

  private recordAccess(key: CacheKey): void {
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
  }

  private isStale(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private canServeStale(entry: CacheEntry<unknown>): boolean {
    if (!this.domainConfig?.staleWhileRevalidateMs) return false;
    const staleLimit = entry.expiresAt + this.domainConfig.staleWhileRevalidateMs;
    return Date.now() < staleLimit;
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    const start = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.metrics.misses++;
      this.metrics.totalResponseTimeMs += Date.now() - start;
      this.metrics.responseCount++;
      return null;
    }

    if (this.isStale(entry)) {
      if (this.canServeStale(entry)) {
        // Serve stale but trigger background refresh
        this.metrics.hits++;
        this.recordAccess(key);
        this.metrics.totalResponseTimeMs += Date.now() - start;
        this.metrics.responseCount++;
        return entry.value;
      }

      // Expired and no stale-while-revalidate
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.misses++;
      this.metrics.totalResponseTimeMs += Date.now() - start;
      this.metrics.responseCount++;
      return null;
    }

    this.metrics.hits++;
    this.recordAccess(key);
    this.metrics.totalResponseTimeMs += Date.now() - start;
    this.metrics.responseCount++;
    return entry.value;
  }

  async set<T>(key: CacheKey, value: T, ttlMs?: number, tags: string[] = []): Promise<void> {
    const now = Date.now();
    const ttl = ttlMs ?? this.options.defaultTtlMs;

    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      version: 1,
      tags,
      staleWhileRevalidate: this.domainConfig?.staleWhileRevalidateMs,
    };

    // Evict LRU if at capacity
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      const oldestKey = [...this.accessOrder.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
        this.metrics.evictions++;
      }
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  async delete(key: CacheKey): Promise<void> {
    this.cache.delete(key);
    this.accessOrder.delete(key);
  }

  async invalidate(tags: string[]): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some((t) => tags.includes(t))) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        count++;
      }
    }
    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
  }

  async getStats(): Promise<CacheStats> {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      : 0;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate,
      totalEntries: this.cache.size,
      memoryUsageBytes: this.estimateMemoryUsage(),
      avgResponseTimeMs: this.metrics.responseCount > 0
        ? this.metrics.totalResponseTimeMs / this.metrics.responseCount
        : 0,
      evictions: this.metrics.evictions,
      errors: this.metrics.errors,
    };
  }

  private estimateMemoryUsage(): number {
    let bytes = 0;
    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 200; // overhead
    }
    return bytes;
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.get("health-check" as CacheKey);
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

/** Factory for creating memory caches per domain */
export function createMemoryCache(domain: string, options?: Partial<MemoryCacheOptions>): MemoryCache {
  const domainConfig = CACHE_DOMAINS[domain];
  return new MemoryCache(
    {
      maxSize: options?.maxSize ?? 10000,
      defaultTtlMs: options?.defaultTtlMs ?? domainConfig?.defaultTtlMs ?? 300000,
      cleanupIntervalMs: options?.cleanupIntervalMs,
    },
    domainConfig
  );
}
