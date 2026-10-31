/**
 * server/_core/tenantCache.ts — ذاكرة قراءة مؤقتة لكل مؤسسة
 * ==========================================================================
 * القراءة المتكرّرة لنفس البيانات (المؤشرات المالية، ملخص لوحة القيادة،
 * الفترات المالية، مراكز التكلفة، الأصناف) كانت تذهب لقاعدة Neon في كل
 * طلب. هنا نخزّنها في الذاكرة لمدة قصيرة (60–120 ثانية) ونبطلها فوراً
 * عند أي تعديل على بيانات المؤسسة.
 *
 * الإبطال مركزي: `requireTenant` (middleware لكل procedures المؤسسة) يبطل
 * ذاكرة المؤسسة بعد أي mutation — فلا تبقى بيانات قديمة بعد الكتابة.
 *
 * @module server/_core/tenantCache
 */
import { cacheManager } from "./cache";

const CACHE_NAME = "tenant-read-models";

const tenantReadCache = cacheManager.getCache(CACHE_NAME, {
  maxSize: 5_000,
  maxMemoryBytes: 32 * 1024 * 1024,
  defaultTtlMs: 60 * 1000,
});

export const TENANT_CACHE_TTL = {
  /** المؤشرات المالية — تتغير مع كل قيد */
  kpis: 30 * 1000,
  /** ملخص لوحة القيادة */
  dashboard: 30 * 1000,
  /** الفترات المالية — نادراً ما تتغير */
  fiscalPeriods: 120 * 1000,
  /** مراكز التكلفة */
  costCenters: 120 * 1000,
  /** الأصناف */
  products: 120 * 1000,
} as const;

/** يبني مفتاح تخزين مؤهل لكل مؤسسة. */
export function tenantCacheKey(
  tenantId: number,
  scope: string,
  parts?: Record<string, unknown>
): string {
  const suffix =
    parts && Object.keys(parts).length > 0 ? `:${JSON.stringify(parts)}` : "";
  return `t:${tenantId}:${scope}${suffix}`;
}

/**
 * يقرأ من الذاكرة، وعند غيابها ينفّذ `loader` ثم يخزّن النتيجة.
 * `loader` يجب أن يكون خالصاً (read-only) — القراءة فقط تُخزَّن.
 */
export async function cachedForTenant<T>(
  tenantId: number,
  scope: string,
  parts: Record<string, unknown> | undefined,
  loader: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const key = tenantCacheKey(tenantId, scope, parts);
  const hit = tenantReadCache.get(key);
  if (hit !== undefined) return hit as T;

  const value = await loader();
  tenantReadCache.set(key, value, ttlMs);
  return value;
}

/** يبطل كل ما يخزّنته مؤسسة — يُستدعى بعد أي كتابة. */
export function invalidateTenantReadModels(tenantId: number): number {
  return tenantReadCache.invalidatePrefix(`t:${tenantId}:`);
}

/** إحصاءات الذاكرة (لوحة التشغيل). */
export function tenantCacheStats() {
  return tenantReadCache.getStats();
}
