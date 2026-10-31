import { describe, expect, it } from "vitest";
import {
  TENANT_CACHE_TTL,
  cachedForTenant,
  invalidateTenantReadModels,
  tenantCacheKey,
  tenantCacheStats,
} from "./tenantCache";

/**
 * server/_core/tenantCache.test.ts — ذاكرة القراءة المؤقتة لكل مؤسسة
 * ==========================================================================
 * العقد:
 *  1. نفس المفتاح لنفس المؤسسة → تنفيذ واحد فقط (لا تكرار استعلامات Neon).
 *  2. المفاتيح مختلفة بين المؤسسات (لا تسريب بيانات بين مستأجرين).
 *  3. الإبطال يزيل مفاتيح المؤسسة المستهدفة فقط.
 *  4. انتهاء الصلاحية (TTL) يعيد التحميل.
 */
describe("tenantCache — scoped read models", () => {
  it("builds tenant-scoped keys", () => {
    expect(tenantCacheKey(7, "products")).toBe("t:7:products");
    expect(tenantCacheKey(7, "products", { limit: 10 })).toContain(
      "t:7:products:"
    );
    expect(tenantCacheKey(8, "products")).not.toBe(
      tenantCacheKey(7, "products")
    );
  });

  it("executes the loader once per key and serves the cached value after", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return { value: calls };
    };

    const first = await cachedForTenant(901, "unit-test-a", undefined, loader);
    const second = await cachedForTenant(901, "unit-test-a", undefined, loader);

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(calls).toBe(1);
  });

  it("does not share values between tenants", async () => {
    const a = await cachedForTenant(
      902,
      "unit-test-b",
      undefined,
      async () => "A"
    );
    const b = await cachedForTenant(
      903,
      "unit-test-b",
      undefined,
      async () => "B"
    );

    expect(a).toBe("A");
    expect(b).toBe("B");
  });

  it("invalidates only the targeted tenant", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return calls;
    };

    await cachedForTenant(904, "unit-test-c", undefined, loader);
    await cachedForTenant(905, "unit-test-c", undefined, loader);
    expect(calls).toBe(2);

    invalidateTenantReadModels(904);

    await cachedForTenant(904, "unit-test-c", undefined, loader);
    expect(calls).toBe(3); // مؤسسة 904 أُبطلت ذاكرتها
    await cachedForTenant(905, "unit-test-c", undefined, loader);
    expect(calls).toBe(3); // مؤسسة 905 لم تُمس
  });

  it("reloads after the TTL expires", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return calls;
    };

    await cachedForTenant(906, "unit-test-d", undefined, loader, 30);
    await cachedForTenant(906, "unit-test-d", undefined, loader, 30);
    expect(calls).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 60));
    await cachedForTenant(906, "unit-test-d", undefined, loader, 30);
    expect(calls).toBe(2);
  });

  it("exposes the expected TTL contract and cache statistics", () => {
    expect(TENANT_CACHE_TTL.kpis).toBeGreaterThan(0);
    expect(TENANT_CACHE_TTL.dashboard).toBeGreaterThan(0);
    expect(TENANT_CACHE_TTL.fiscalPeriods).toBeGreaterThanOrEqual(
      TENANT_CACHE_TTL.kpis
    );
    const stats = tenantCacheStats();
    expect(typeof stats.size).toBe("number");
  });
});
