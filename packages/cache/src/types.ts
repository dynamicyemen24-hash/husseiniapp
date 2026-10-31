/**
 * ALHUSAINIA Cache — Core Types
 * ==============================
 * Type-safe caching interfaces with multi-tier support.
 */

import { z } from "zod";

/** Cache key with namespace support */
export type CacheKey = string & { readonly __brand: unique symbol };

/** Creates a typed cache key */
export function cacheKey<K extends string>(key: K): CacheKey {
  return key as CacheKey;
}

/** Cache entry with metadata */
export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  version: number;
  tags: string[];
  staleWhileRevalidate?: number;
}

/** Cache tier configuration */
export type CacheTier = "memory" | "redis" | "cdn";

export interface TierConfig {
  memory?: {
    maxSize: number;
    ttlMs: number;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix: string;
    ttlMs: number;
  };
  cdn?: {
    baseUrl: string;
    purgeApiKey?: string;
    ttlMs: number;
  };
}

/** Cache configuration per domain */
export interface CacheDomainConfig {
  /** Domain name (e.g., "products", "users", "reports") */
  domain: string;
  /** Default TTL in milliseconds */
  defaultTtlMs: number;
  /** Stale-while-revalidate window in milliseconds */
  staleWhileRevalidateMs?: number;
  /** Tags for invalidation */
  tags?: string[];
  /** Tier-specific overrides */
  tiers?: Partial<Record<CacheTier, { ttlMs: number; enabled: boolean }>>;
  /** Invalidation patterns */
  invalidation?: {
    onWrite?: string[]; // Tags to invalidate on write
    onDelete?: string[];
    onUpdate?: string[];
  };
}

/** Cache statistics */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsageBytes: number;
  avgResponseTimeMs: number;
  evictions: number;
  errors: number;
}

/** Multi-tier cache interface */
export interface ICache {
  get<T>(key: CacheKey): Promise<T | null>;
  set<T>(key: CacheKey, value: T, ttlMs?: number, tags?: string[]): Promise<void>;
  delete(key: CacheKey): Promise<void>;
  invalidate(tags: string[]): Promise<number>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number }>;
}

/** Cache key builder for consistent key generation */
export class CacheKeyBuilder {
  private parts: string[] = [];

  constructor(private namespace: string) {}

  add(part: string | number): this {
    this.parts.push(String(part));
    return this;
  }

  addAll(parts: (string | number)[]): this {
    this.parts.push(...parts.map(String));
    return this;
  }

  build(): CacheKey {
    return `${this.namespace}:${this.parts.join(":")}` as CacheKey;
  }
}

/** Predefined domain configurations */
export const CACHE_DOMAINS: Record<string, CacheDomainConfig> = {
  products: {
    domain: "products",
    defaultTtlMs: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidateMs: 30 * 60 * 1000, // 30 minutes
    tags: ["products", "catalog"],
    tiers: {
      memory: { ttlMs: 2 * 60 * 1000, enabled: true },
      redis: { ttlMs: 10 * 60 * 1000, enabled: true },
    },
    invalidation: {
      onWrite: ["products", "catalog"],
      onDelete: ["products"],
      onUpdate: ["products"],
    },
  },
  users: {
    domain: "users",
    defaultTtlMs: 15 * 60 * 1000, // 15 minutes
    staleWhileRevalidateMs: 60 * 60 * 1000, // 1 hour
    tags: ["users", "auth"],
    tiers: {
      memory: { ttlMs: 5 * 60 * 1000, enabled: true },
      redis: { ttlMs: 30 * 60 * 1000, enabled: true },
    },
    invalidation: {
      onWrite: ["users", "auth"],
      onDelete: ["users"],
      onUpdate: ["users"],
    },
  },
  reports: {
    domain: "reports",
    defaultTtlMs: 60 * 60 * 1000, // 1 hour
    staleWhileRevalidateMs: 4 * 60 * 60 * 1000, // 4 hours
    tags: ["reports", "analytics"],
    tiers: {
      memory: { ttlMs: 30 * 60 * 1000, enabled: true },
      redis: { ttlMs: 2 * 60 * 60 * 1000, enabled: true },
    },
    invalidation: {
      onWrite: ["reports", "analytics"],
      onDelete: ["reports"],
      onUpdate: ["reports", "analytics"],
    },
  },
  inventory: {
    domain: "inventory",
    defaultTtlMs: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidateMs: 10 * 60 * 1000, // 10 minutes
    tags: ["inventory", "stock"],
    tiers: {
      memory: { ttlMs: 1 * 60 * 1000, enabled: true },
      redis: { ttlMs: 5 * 60 * 1000, enabled: true },
    },
    invalidation: {
      onWrite: ["inventory", "stock"],
      onDelete: ["inventory"],
      onUpdate: ["inventory", "stock"],
    },
  },
  settings: {
    domain: "settings",
    defaultTtlMs: 60 * 60 * 1000, // 1 hour
    staleWhileRevalidateMs: 24 * 60 * 60 * 1000, // 24 hours
    tags: ["settings", "config"],
    tiers: {
      memory: { ttlMs: 30 * 60 * 1000, enabled: true },
      redis: { ttlMs: 60 * 60 * 1000, enabled: true },
    },
    invalidation: {
      onWrite: ["settings", "config"],
      onDelete: ["settings"],
      onUpdate: ["settings", "config"],
    },
  },
};

/** Validates cache domain config */
export const CacheDomainConfigSchema = z.object({
  domain: z.string().min(1),
  defaultTtlMs: z.number().int().positive(),
  staleWhileRevalidateMs: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  tiers: z
    .record(
      z.enum(["memory", "redis", "cdn"]),
      z.object({
        ttlMs: z.number().int().positive(),
        enabled: z.boolean(),
      })
    )
    .optional(),
  invalidation: z
    .object({
      onWrite: z.array(z.string()).optional(),
      onDelete: z.array(z.string()).optional(),
      onUpdate: z.array(z.string()).optional(),
    })
    .optional(),
});