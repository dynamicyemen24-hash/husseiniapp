import { sql } from "drizzle-orm";

/**
 * server/_core/rls.ts — Row-Level Security tenant-context helper.
 * ---------------------------------------------------------------
 * Postgres RLS policies created in `drizzle/0023_nuclear_fortress.sql`
 * (`tenant_isolation` on every tenant-scoped table) evaluate:
 *
 *   "tenantId" = nullif(current_setting('app.tenant_id', true), '')::integer
 *
 * This module is the ONLY sanctioned way to set that GUC: `withTenantTx`
 * opens a transaction, runs `SELECT set_config('app.tenant_id', ?, true)`
 * (functionally identical to `SET LOCAL`, but bind-parameter safe — `SET`
 * does not accept bind parameters on all drivers) and then executes the
 * caller's work. The setting auto-resets on COMMIT/ROLLBACK, so a pooled
 * Neon connection can never leak one tenant's context into the next.
 *
 * Defense-in-depth order for every financial/inventory write:
 *   1. tRPC `tenantProcedure` + `requireTenantId(ctx)` (never trust client)
 *   2. `assertRefsInTenant` app-layer FK ownership check (fails fast, 403)
 *   3. `withTenantTx` RLS context (DB-layer backstop)
 *   4. `validate_same_tenant()` triggers (reject cross-tenant FK at COMMIT)
 */

export const TENANT_SETTING_KEY = "app.tenant_id";

/** Prefix used by the DB triggers; asserted by tests on both layers. */
export const CROSS_TENANT_DB_ERROR = "CROSS_TENANT_DENIED";

export function assertValidTenantId(
  tenantId: unknown
): asserts tenantId is number {
  if (
    typeof tenantId !== "number" ||
    !Number.isInteger(tenantId) ||
    tenantId <= 0
  ) {
    throw new Error(`TENANT_REQUIRED: invalid tenantId (${String(tenantId)})`);
  }
}

type ExecutableTx = {
  execute: (query: unknown) => Promise<unknown>;
};

type TransactableDb = {
  transaction: <T>(fn: (tx: never) => Promise<T>) => Promise<T>;
};

/** Set the RLS tenant context inside an ALREADY-OPEN transaction. */
export async function setTenantContext(
  tx: ExecutableTx,
  tenantId: number
): Promise<void> {
  assertValidTenantId(tenantId);
  await tx.execute(
    sql`SELECT set_config(${TENANT_SETTING_KEY}, ${String(tenantId)}, true)`
  );
}

/**
 * Run `fn` inside a transaction with the RLS tenant GUC pinned via SET LOCAL
 * semantics. Fail-closed: invalid tenantId throws BEFORE touching the DB.
 */
export async function withTenantTx<T>(
  db: TransactableDb,
  tenantId: number,
  fn: (tx: never) => Promise<T>
): Promise<T> {
  assertValidTenantId(tenantId);
  if (!db || typeof db.transaction !== "function") {
    throw new Error("DB_TRANSACTION_UNAVAILABLE: لا يمكن فتح معاملة آمنة");
  }
  return db.transaction(async tx => {
    await setTenantContext(tx as unknown as ExecutableTx, tenantId);
    return fn(tx);
  });
}

/**
 * JS mirror of the `validate_same_tenant()` trigger semantics, so the
 * cross-tenant rejection rule is unit-testable without a live database.
 * - unknown parent row → throws (mirrors the trigger's 23503 branch)
 * - tenant mismatch    → throws CROSS_TENANT_DENIED (trigger's 42501 branch)
 */
export function assertSameTenant(
  childTenantId: number | null | undefined,
  parentRow: { tenantId: number | null } | null | undefined,
  resource = "السجل"
): void {
  if (!parentRow) {
    throw new Error(`${CROSS_TENANT_DB_ERROR}: ${resource} غير موجود`);
  }
  if (parentRow.tenantId !== childTenantId) {
    throw new Error(
      `${CROSS_TENANT_DB_ERROR}: ${resource} ينتمي للمستأجر ${parentRow.tenantId} وليس ${childTenantId}`
    );
  }
}

/** The exact predicate the `tenant_isolation` RLS policies evaluate. */
export function tenantIsolationPredicate(): string {
  return `"tenantId" = nullif(current_setting('app.tenant_id', true), '')::integer`;
}
