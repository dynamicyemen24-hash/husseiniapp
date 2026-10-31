/**
 * ALHUSAINIA Cache — Unified Multi-Tier Cache Manager
 * ====================================================
 * Orchestrates memory (L1) and Redis (L2) caches with intelligent routing.
 */

import type { ICache, CacheKey, CacheEntry, CacheStats, CacheDomainConfig, CacheDomainConfigSchema } from "./types";
import { MemoryCache } from "./memory";
import { RedisCache } from "./redis";
import { CACHE_DOMAINS } from "./types";

export interface UnifiedCacheOptions {
  memory?: {
    maxSize: number;
    defaultTtlMs: number;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix: string;
    defaultTtlMs: number;
  };
  domains?: Partial<Record<string, CacheDomainConfig>>;
}

export class UnifiedCache {
  private memoryCaches = new Map<string, MemoryCache>();
  private redisCaches = new Map<string, RedisCache>();
  private domainConfigs: Map<string, CacheDomainConfig> = new Map();

  constructor(
    private options: UnifiedCacheOptions = {}
  ) {
    // Merge default and custom domain configs
    for (const [domain, config] of Object.entries(CACHE_DOMAINS)) {
      this.domainConfigs.set(domain, {
        ...config,
        ...options.domains?.[domain],
      });
    }
  }

  private getDomainConfig(domain: string) {
    return this.domainConfigs.get(domain) ?? {
      domain,
      defaultTtlMs: 300000,
      tags: [domain],
    };
  }

  private getMemoryCache(domain: string): MemoryCache {
    if (!this.memoryCaches.has(domain)) {
      const config = this.getDomainConfig(domain);
      this.memoryCaches.set(domain, new MemoryCache(
        {
          maxSize: this.options.memory?.maxSize ?? 10000,
          defaultTtlMs: this.options.memory?.defaultTtlMs ?? 300000,
        },
        config
      ));
    }
    return this.memoryCaches.get(domain)!;
  }

  async getRedisCache(domain: string): Promise<RedisCache | null> {
    if (!this.options.redis) return null;

    if (!this.redisCaches.has(domain)) {
      const { RedisCache } = await import("./redis");
      const config = this.getDomainConfig(domain);
      const redis = new RedisCache(
        {
          host: this.options.redis!.host,
          port: this.options.redis!.port,
          password: this.options.redis!.password,
          db: this.options.redis!.db,
          keyPrefix: this.options.redis!.keyPrefix,
          defaultTtlMs: this.options.redis!.defaultTtlMs,
        },
        this.getDomainConfig(domain)
      );
      await redis.connect();
      this.redisCaches.set(domain, redis);
    }
    return this.redisCaches.get(domain)!;
  }

  /** Get value with L1 -> L2 fallback */
  async get<T>(domain: string, key: CacheKey): Promise<T | null> {
    const memoryCache = this.getMemoryCache(domain);
    const value = await memoryCache.get<T>(key);

    if (value !== null) return value;

    // Try L2 (Redis)
    const redisCache = await this.getRedisCache(domain);
    if (redisCache) {
      const value = await redisCache.get<T>(key);
      if (value !== null) {
        // Promote to L1
        const domainConfig = this.getDomainConfig(domain);
        const ttlMs = domainConfig.defaultTtlMs;
        await memoryCache.set(key, value, domainConfig.defaultTtlMs, domainConfig.tags);
        return value;
      }
    }

    return null;
  }

  /** Set value in both L1 and L2 */
  async set<T>(domain: string, key: CacheKey, value: T, ttlMs?: number, tags?: string[]): Promise<void> {
    const domainConfig = this.getDomainConfig(domain);
    const ttlMs_ = ttlMs ?? domainConfig.defaultTtlMs;
    const tags_ = tags ?? domainConfig.tags ?? [];

    const memoryCache = this.getMemoryCache(domain);
    await memoryCache.set(key, value, ttlMs, tags_);

    const redisCache = await this.getRedisCache(domain);
    if (redisCache) {
      await redisCache.set(key, value, ttlMs, tags_);
    }
  }

  async delete(domain: string, key: CacheKey): Promise<void> {
    const memoryCache = this.getMemoryCache(domain);
    await memoryCache.delete(key);

    const redisCache = await this.getRedisCache(domain);
    if (redisCache) {
      await redisCache.delete(key);
    }
  }

  async invalidate(domain: string, tags: string[]): Promise<number> {
    let total = 0;
    const memoryCache = this.getMemoryCache(domain);
    total += await memoryCache.invalidate(tags);

    const redisCache = await this.getRedisCache(domain);
    if (redisCache) {
      total += await redisCache.invalidate(tags);
    }
    return total;
  }

  async clear(domain: string): Promise<void> {
    const memoryCache = this.getMemoryCache(domain);
    await memoryCache.clear();

    const redisCache = await this.getRedisCache(domain);
    if (redisCache) {
      await redisCache.clear();
    }
  }

  async stats(domain: string): Promise<CacheStats> {
    const memoryCache = this.getMemoryCache(domain);
    const memStats = await memoryCache.stats();

    const redisCache = await this.getRedisCache(domain);
    if (!redisCache) return memStats;

    const redisStats = await redisCache.stats();

    return {
      hits: memStats.hits + redisStats.hits,
      misses: memStats.misses + redisStats.misses,
      hitRate: (memStats.hits + redisStats.hits) / (memStats.hits + memStats.misses + redisStats.hits + redisStats.misses),
      totalEntries: memStats.totalEntries + redisStats.totalEntries,
      memoryUsageBytes: memStats.memoryUsageBytes + redisStats.memoryUsageBytes,
      avgResponseTimeMs: (memStats.avgResponseTimeMs + redisStats.avgResponseTimeMs) / 2,
      evictions: memStats.evictions + redisStats.evictions,
      errors: memStats.errors + redisStats.errors,
    };
  }

  async healthCheck(domain: string): Promise<{ healthy: boolean; latencyMs: number; tiers: Record<string, { healthy: boolean; latencyMs: number }> }> {
    const memoryCache = this.getMemoryCache(domain);
    const memHealth = await memoryCache.healthCheck();

    const redisCache = await this.getRedisCache(domain);
    const redisHealth = redisCache ? await redisCache.healthCheck() : { healthy: false, latencyMs: 0 };

    return {
      healthy: memHealth.healthy || redisHealth.healthy,
      latencyMs: Math.min(memHealth.latencyMs, redisHealth.latencyMs),
      tiers: {
        memory: memHealth,
        redis: redisHealth,
      },
    };
  }

  async warmUp(domain: string, keys: Array<{ key: CacheKey; value: unknown; ttlMs?: number }>): Promise<void> {
    const domainConfig = this.getDomainConfig(domain);
    await Promise.all(keys.map(async ({ key, value, ttlMs }) => {
      await this.set(domain, key, value, ttlMs ?? domainConfig.defaultTtlMs);
    }));
  }

  /** Invalidate across all domains by tag */
  async invalidateGlobal(tags: string[]): Promise<number> {
    let total = 0;
    for (const domain of this.memoryCaches.keys()) {
      total += await this.invalidate(domain, tags);
    }
    return total;
  }

  /** Get all domain stats */
  async allStats(): Promise<Record<string, CacheStats>> {
    const result: Record<string, CacheStats> = {};
    for (const domain of this.memoryCaches.keys()) {
      result[domain] = await this.stats(domain);
    }
    return result;
  }

  async shutdown(): Promise<void> {
    for (const cache of this.memoryCaches.values()) {
      cache.destroy();
    }
    for (const cache of this.redisCaches.values()) {
      await cache.disconnect();
    }
    this.memoryCaches.clear();
    this.redisCaches.clear();
  }
}

/** Singleton instance for application-wide use */
let unifiedCacheInstance: UnifiedCache | null = null;

export function getUnifiedCache(options?: UnifiedCacheOptions): UnifiedCache {
  if (!unifiedCacheInstance) {
    unifiedCacheInstance = new UnifiedCache(options);
  }
  return unifiedCacheInstance;
}

export function resetUnifiedCache(): void {
  if (unifiedCacheInstance) {
    unifiedCacheInstance.shutdown();
    unifiedCacheInstance = null;
  }
}

/** React hook for cache access (client-side stub) */
export function useCache() {
  // Client-side would use SWR/React Query with cache headers
  return {
    get: async <T>(domain: string, key: string): Promise<T | null> => {
      // Client uses HTTP caching via fetch
      const response = await fetch(`/api/cache/${domain}/${key}`);
      if (!response.ok) return null;
      return response.json();
    },
    invalidate: async (domain: string, tags: string[]): Promise<void> => {
      await fetch(`/api/cache/${domain}/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
    },
  };
}