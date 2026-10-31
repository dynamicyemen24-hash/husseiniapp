import { describe, it, expect } from "vitest";
import { LRUCache, CacheManager } from "./cache";

describe("LRUCache", () => {
  it("يخزّن ويقرأ القيم", () => {
    const cache = new LRUCache<string>({ defaultTtlMs: 1000 });
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
    expect(cache.get("missing")).toBeUndefined();
  });

  it("ينتهي أجل المدخلات بعد TTL", async () => {
    const cache = new LRUCache<string>({ defaultTtlMs: 10 });
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
    await new Promise(r => setTimeout(r, 25));
    expect(cache.get("a")).toBeUndefined();
  });

  it("يبطل المدخل عند تجاوز الحجم الأقصى (LRU)", () => {
    const cache = new LRUCache<string>({ maxSize: 2, defaultTtlMs: 60_000 });
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // "a" يصبح الأكثر استخداماً
    cache.set("c", "3");

    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
  });

  it("getOrSet ينشئ القيمة مرة واحدة فقط", async () => {
    const cache = new LRUCache<number>({ defaultTtlMs: 60_000 });
    let calls = 0;
    const factory = () => {
      calls++;
      return 42;
    };
    expect(cache.getOrSet("k", factory)).toBe(42);
    expect(cache.getOrSet("k", factory)).toBe(42);
    expect(calls).toBe(1);
  });

  it("يبطل بنمط وبادئة", () => {
    const cache = new LRUCache<string>({ defaultTtlMs: 60_000 });
    cache.set("user:1", "x");
    cache.set("user:2", "y");
    cache.set("product:1", "z");

    expect(cache.invalidatePattern("^user:")).toBe(2);
    expect(cache.get("user:1")).toBeUndefined();
    expect(cache.get("product:1")).toBe("z");
    expect(cache.invalidatePrefix("product:")).toBe(1);
    expect(cache.get("product:1")).toBeUndefined();
  });

  it("يتتبع الإحصاءات ونسبة الإصابة", () => {
    const cache = new LRUCache<string>({ defaultTtlMs: 60_000 });
    cache.set("a", "1");
    cache.get("a");
    cache.get("b");

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5, 5);
    expect(stats.size).toBe(1);
  });

  it("يحافظ على توازن الذاكرة بعد الإبطال", () => {
    const cache = new LRUCache<string>({ defaultTtlMs: 60_000 });
    cache.set("a", "1".repeat(100));
    const before = cache.getStats().memoryBytes;
    cache.delete("a");
    expect(cache.getStats().memoryBytes).toBeLessThan(before);
  });
});

describe("CacheManager", () => {
  it("يعيد نفس المخزن لنفس الاسم", () => {
    const manager = new CacheManager();
    const a = manager.getCache("x");
    const b = manager.getCache("x");
    expect(a).toBe(b);
  });

  it("يبطل عبر كل المخازن", () => {
    const manager = new CacheManager();
    manager.getCache("a").set("k:1", "v");
    manager.getCache("b").set("k:2", "v");
    expect(manager.invalidatePattern("^k:")).toBe(2);
    expect(manager.getStats().a.hits).toBe(0);
  });
});
