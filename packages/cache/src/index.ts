/**
 * ALHUSAINIA Cache — Main Entry
 * ==============================
 * Unified caching exports.
 */

export * from "./types";
export { MemoryCache, createMemoryCache } from "./memory";
export { RedisCache, createRedisCache } from "./redis";
export { UnifiedCache, getUnifiedCache, resetUnifiedCache, useCache } from "./unified";

// Re-validate config
export { CacheDomainConfigSchema } from "./types";

// Convenience: create domain cache
export async function createDomainCache(domain: string, options?: {
  memory?: { maxSize: number; defaultTtlMs: number };
  redis?: { host: string; port: number; password?: string; db?: number; keyPrefix: string; defaultTtlMs: number };
}) {
  const { UnifiedCache } = await import("./unified");
  const cache = new (await import("./unified")).UnifiedCache(options);
  return {
    get: <T>(key: string) => cache.get(domain, key as any),
    set: <T>(key: string, value: T, ttlMs?: number, tags?: string[]) => cache.set(domain, key as any, value, options?.memory?.defaultTtlMs, []),
    delete: (key: string) => cache.delete(domain, key as any),
    invalidate: (tags: string[]) => cache.invalidate(domain, tags),
    stats: () => cache.stats(domain),
  };
}