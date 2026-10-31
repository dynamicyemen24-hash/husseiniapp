import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "./memory";
import { cacheKey, CacheKeyBuilder } from "./types";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      maxSize: 100,
      defaultTtlMs: 1000,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it("sets and gets a value", async () => {
    const key = cacheKey("test-key");
    await cache.set(key, "hello");
    const value = await cache.get<string>(key);
    expect(value).toBe("hello");
  });

  it("returns null for missing key", async () => {
    const value = await cache.get<string>(cacheKey("missing"));
    expect(value).toBeNull();
  });

  it("respects TTL", async () => {
    const key = cacheKey("ttl-test");
    await cache.set(key, "expires", 50);
    expect(await cache.get<string>(key)).toBe("expires");

    await new Promise((r) => setTimeout(r, 100));
    expect(await cache.get<string>(key)).toBeNull();
  });

  it("tracks hits and misses", async () => {
    const key = cacheKey("stats-test");
    await cache.set(key, "value");

    await cache.get(key);
    await cache.get(key);
    await cache.get(cacheKey("missing"));

    const stats = await cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(2 / 3);
  });

  it("evicts LRU when over capacity", async () => {
    const smallCache = new MemoryCache({ maxSize: 2, defaultTtlMs: 60000 });

    await smallCache.set(cacheKey("a"), "1");
    await smallCache.set(cacheKey("b"), "2");
    await smallCache.get(cacheKey("a"));
    await smallCache.set(cacheKey("c"), "3");

    expect(await smallCache.get(cacheKey("a"))).toBe("1");
    expect(await smallCache.get(cacheKey("b"))).toBeNull();
    expect(await smallCache.get(cacheKey("c"))).toBe("3");

    smallCache.destroy();
  });

  it("deletes a key", async () => {
    const key = cacheKey("delete-test");
    await cache.set(key, "value");
    expect(await cache.get(key)).toBe("value");

    await cache.delete(key);
    expect(await cache.get(key)).toBeNull();
  });

  it("invalidates by tags", async () => {
    await cache.set(cacheKey("a"), "1", 60000, ["tag1"]);
    await cache.set(cacheKey("b"), "2", 60000, ["tag2"]);
    await cache.set(cacheKey("c"), "3", 60000, ["tag1", "tag2"]);

    const invalidated = await cache.invalidate(["tag1"]);
    expect(invalidated).toBe(2);

    expect(await cache.get(cacheKey("a"))).toBeNull();
    expect(await cache.get(cacheKey("b"))).toBe("2");
    expect(await cache.get(cacheKey("c"))).toBeNull();
  });

  it("clears all entries", async () => {
    await cache.set(cacheKey("a"), "1");
    await cache.set(cacheKey("b"), "2");
    await cache.clear();
    expect(await cache.get(cacheKey("a"))).toBeNull();
    expect(await cache.get(cacheKey("b"))).toBeNull();
    const stats = await cache.getStats();
    expect(stats.totalEntries).toBe(0);
  });

  it("provides health check", async () => {
    const health = await cache.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns stats with correct structure", async () => {
    await cache.set(cacheKey("test"), "value");
    await cache.get(cacheKey("test"));

    const stats = await cache.getStats();
    expect(stats).toEqual(expect.objectContaining({
      hits: expect.any(Number),
      misses: expect.any(Number),
      hitRate: expect.any(Number),
      totalEntries: expect.any(Number),
      memoryUsageBytes: expect.any(Number),
      avgResponseTimeMs: expect.any(Number),
      evictions: expect.any(Number),
      errors: expect.any(Number),
    }));
  });
});

describe("CacheKeyBuilder", () => {
  it("builds keys with namespace", () => {
    const builder = new CacheKeyBuilder("products");
    builder.add("category").add(123);
    expect(builder.build()).toBe("products:category:123");
  });
});