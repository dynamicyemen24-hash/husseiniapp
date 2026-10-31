import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { requireTenantId } from "./tenant";
import type { TrpcContext } from "./context";

/**
 * Unified application-layer tenant-access enforcement.
 *
 * Every tenant-scoped procedure MUST:
 *  1. resolve `tid = requireTenantId(ctx)` (never trust client-sent tenantId),
 *  2. scope every read/update/delete with `and(eq(table.id, x), eq(table.tenantId, tid))`,
 *  3. verify every FK reference (accountId/branchId/productId/warehouseId/…)
 *     belongs to the same tenant via {@link assertRefsInTenant}.
 *
 * RLS (Postgres Row-Level Security) is intentionally NOT done here —
 * it is documented as the next step (see recommendation in the task report).
 */

export function crossTenantDenied(resource = "السجل"): never {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `CROSS_TENANT_DENIED: ${resource} لا ينتمي لمؤسستك`,
  });
}

/**
 * Pure (DB-free) ownership assertion used by routers AND by the negative test.
 * - missing row → FORBIDDEN (deliberately not NOT_FOUND to avoid ID-oracle
 *   probing across tenants; callers that need silent null can pre-check).
 * - tenant mismatch → FORBIDDEN (403) — the required negative-test outcome.
 */
export function assertTenantRow<T extends { tenantId: number | null }>(
  row: T | null | undefined,
  tenantId: number,
  resource = "السجل"
): asserts row is T {
  if (!row || row.tenantId !== tenantId) crossTenantDenied(resource);
}

/** Resolve tid from ctx or throw TENANT_REQUIRED (403). */
export function tenantIdFromCtx(ctx: TrpcContext): number {
  return requireTenantId(ctx);
}

type TenantTable = {
  id: unknown;
  tenantId: unknown;
};

/**
 * Verify a single row id lives in the caller's tenant.
 * Throws FORBIDDEN when the row is missing OR belongs to another tenant.
 */
export async function ensureIdInTenant(
  db: unknown,
  table: TenantTable,
  id: number,
  tenantId: number,
  resource = "السجل"
): Promise<void> {
  const rows = (await (
    db as {
      select: (c: unknown) => {
        from: (t: unknown) => {
          where: (w: unknown) => {
            limit: (n: number) => Promise<Array<{ tenantId: number | null }>>;
          };
        };
      };
    }
  )
    .select({ tenantId: (table as { tenantId: unknown }).tenantId })
    .from(table)
    .where(
      eq((table as { id: Parameters<typeof eq>[0] }).id as never, id as never)
    )
    .limit(1)) as Array<{ tenantId: number | null }>;
  assertTenantRow(
    rows[0] as { tenantId: number | null } | undefined,
    tenantId,
    resource
  );
}

export type TenantRef = {
  table: TenantTable;
  /** undefined/null ids are skipped (optional FK). */
  id: number | null | undefined;
  label: string;
};

/**
 * Composite server-side check that every FK reference belongs to the same
 * tenant (accountId / branchId / productId / warehouseId / customerId / …).
 * Fails closed on the FIRST offending reference with 403/FORBIDDEN.
 */
export async function assertRefsInTenant(
  db: unknown,
  tenantId: number,
  refs: TenantRef[]
): Promise<void> {
  for (const ref of refs) {
    if (ref.id == null) continue;
    await ensureIdInTenant(db, ref.table, ref.id, tenantId, ref.label);
  }
}
