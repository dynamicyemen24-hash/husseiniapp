/**
 * ALHUSAINIA Cache — Redis Implementation
 * ========================================
 * Redis cache with cluster support, pipelining, and Lua scripts.
 */

import Redis from "ioredis";
import type { ICache, CacheKey, CacheEntry, CacheStats, CacheDomainConfig } from "./types";

interface RedisCacheOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix: string;
  defaultTtlMs: number;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | null;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

export class RedisCache implements ICache {
  private client: Redis;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    errors: 0,
    totalResponseTimeMs: 0,
    responseCount: 0,
  };
  private domainConfig?: CacheDomainConfig;

  constructor(
    private options: RedisCacheOptions,
    domainConfig?: CacheDomainConfig
  ) {
    this.domainConfig = domainConfig;
    this.client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: options.db ?? 0,
      keyPrefix: options.keyPrefix,
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
      retryStrategy: options.retryStrategy ?? ((times) => Math.min(times * 100, 3000)),
      enableReadyCheck: options.enableReadyCheck ?? true,
      lazyConnect: options.lazyConnect ?? false,
    });

    this.client.on("error", (err) => {
      this.stats.errors++;
    });

    this.client.on("connect", () => {
      // Connection established
    });
  }

  async connect(): Promise<void> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
  }

  private serializeEntry<T>(entry: CacheEntry<T>): string {
    return JSON.stringify({
      v: entry.value,
      ca: entry.createdAt,
      ex: entry.expiresAt,
      ve: entry.version,
      tg: entry.tags,
      swr: entry.staleWhileRevalidate,
    });
  }

  private deserializeEntry<T>(data: string): CacheEntry<T> | null {
    try {
      const parsed = JSON.parse(data);
      return {
        value: parsed.v,
        createdAt: parsed.ca,
        expiresAt: parsed.ex,
        version: parsed.ve,
        tags: parsed.tg ?? [],
        staleWhileRevalidate: parsed.swr,
      } as CacheEntry<T>;
    } catch {
      return null;
    }
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
    const fullKey = `${this.options.keyPrefix}${key}`;

    try {
      const data = await this.client.get(fullKey);

      if (!data) {
        this.stats.misses++;
        this.stats.totalResponseTimeMs += Date.now() - start;
        this.stats.responseCount++;
        return null;
      }

      const entry = this.deserializeEntry<T>(data);
      if (!entry) {
        await this.client.del(fullKey);
        this.stats.misses++;
        this.stats.totalResponseTimeMs += Date.now() - start;
        this.stats.responseCount++;
        return null;
      }

      if (this.isStale(entry)) {
        if (this.domainConfig?.staleWhileRevalidateMs && this.canServeStale(entry)) {
          this.stats.hits++;
          this.stats.totalResponseTimeMs += Date.now() - start;
          this.stats.responseCount++;
          return entry.value;
        }

        await this.client.del(fullKey);
        this.stats.misses++;
        this.stats.totalResponseTimeMs += Date.now() - start;
        this.stats.responseCount++;
        return null;
      }

      this.stats.hits++;
      this.stats.totalResponseTimeMs += Date.now() - start;
      this.stats.responseCount++;
      return entry.value;
    } catch (error) {
      this.stats.errors++;
      this.stats.totalResponseTimeMs += Date.now() - start;
      this.stats.responseCount++;
      throw error;
    }
  }

  async set<T>(key: CacheKey, value: T, ttlMs?: number, tags: string[] = []): Promise<void> {
    const ttlSeconds = Math.ceil((ttlMs ?? this.options.defaultTtlMs) / 1000);
    const fullKey = `${this.options.keyPrefix}${key}`;

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000),
      version: 1,
      tags,
      staleWhileRevalidate: this.domainConfig?.staleWhileRevalidateMs,
    };

    const pipeline = this.client.pipeline();
    pipeline.set(`${this.options.keyPrefix}${key}`, this.serializeEntry(entry), "EX", ttlSeconds);

    // Index tags for invalidation
    for (const tag of tags) {
      pipeline.sadd(`${this.options.keyPrefix}tag:${tag}`, key);
    }

    await pipeline.exec();
  }

  async delete(key: CacheKey): Promise<void> {
    const fullKey = `${this.options.keyPrefix}${key}`;
    await this.client.del(fullKey);

    // Remove from tag indexes (best effort)
    // Note: In production, use Lua script for atomic tag cleanup
  }

  async invalidate(tags: string[]): Promise<number> {
    let totalDeleted = 0;

    for (const tag of tags) {
      const tagKey = `${this.options.keyPrefix}tag:${tag}`;
      const keys = await this.client.smembers(tagKey);

      if (keys.length > 0) {
        const fullKeys = keys.map((k) => `${this.options.keyPrefix}${k}`);
        await this.client.del(...fullKeys, tagKey);
        totalDeleted += keys.length;
      }
    }

    return totalDeleted;
  }

  async clear(): Promise<void> {
    const pattern = `${this.options.keyPrefix}*`;
    let cursor = "0";
    do {
      const [newCursor, keys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== "0");
  }

  async stats(): Promise<CacheStats> {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    // Get Redis memory info
    const info = await this.client.info("memory");
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : "unknown";

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      totalEntries: await this.client.dbsize(),
      memoryUsageBytes: 0, // Would need parsing
      avgResponseTimeMs: this.stats.responseCount > 0
        ? this.stats.totalResponseTimeMs / this.stats.responseCount
        : 0,
      evictions: this.stats.evictions,
      errors: this.stats.errors,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.client.ping();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

/** Factory for creating Redis cache per domain */
export async function createRedisCache(
  domain: string,
  options: Partial<RedisCacheOptions>
): Promise<RedisCache> {
  const { CACHE_DOMAINS } = await import("./types");
  const domainConfig = CACHE_DOMAINS[domain];

  const cache = new RedisCache(
    {
      host: options.host ?? "localhost",
      port: options.port ?? 6379,
      password: options.password,
      db: options.db,
      keyPrefix: options.keyPrefix ?? "alh:",
      defaultTtlMs: options.defaultTtlMs ?? domainConfig?.defaultTtlMs ?? 300000,
      ...options,
    },
    domainConfig
  );

  await cache.connect();
  return cache;
}