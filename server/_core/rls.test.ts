import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  CROSS_TENANT_DB_ERROR,
  TENANT_SETTING_KEY,
  assertSameTenant,
  assertValidTenantId,
  tenantIsolationPredicate,
  withTenantTx,
} from "./rls";

/** Minimal mock: records execute() calls, runs fn with itself as tx. */
function mockDb(calls: unknown[] = []) {
  return {
    execute: async (q: unknown) => {
      calls.push(q);
      return [];
    },
    transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const tx = {
        execute: async (q: unknown) => {
          calls.push(q);
          return [];
        },
      };
      return fn(tx);
    },
  };
}

const MIGRATION_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "drizzle",
  "0023_nuclear_fortress.sql"
);

describe("withTenantTx — RLS tenant context (mocked, no DB)", () => {
  it("pins SET LOCAL app.tenant_id BEFORE running the work", async () => {
    const calls: unknown[] = [];
    const db = mockDb(calls);
    let workRanAfter = -1;

    const result = await withTenantTx(db as never, 7, async () => {
      workRanAfter = calls.length;
      return "SALE-OK";
    });

    expect(result).toBe("SALE-OK");
    // The context call must be the FIRST statement in the transaction.
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(workRanAfter).toBe(1);
    // drizzle `sql` objects serialize chunks+params to JSON: the GUC call,
    // key and tenant value must all be present in the first statement.
    const first = JSON.stringify(calls[0]);
    expect(first).toContain("set_config");
    expect(first).toContain(TENANT_SETTING_KEY);
    const blob = JSON.stringify(calls);
    expect(blob).toContain("7");
  });

  it("fail-closed: invalid tenantId throws WITHOUT touching the DB", async () => {
    for (const bad of [0, -3, NaN, 1.5, "7", null, undefined]) {
      let txOpened = false;
      const db = {
        transaction: async <T>(): Promise<T> => {
          txOpened = true;
          throw new Error("must not open");
        },
      };
      await expect(
        withTenantTx(db as never, bad as never, async () => null)
      ).rejects.toThrow(/TENANT_REQUIRED/);
      expect(txOpened).toBe(false);
      expect(() => assertValidTenantId(bad)).toThrow(/TENANT_REQUIRED/);
    }
  });

  it("propagates work errors (no silent swallow of COMMIT failures)", async () => {
    const db = mockDb();
    await expect(
      withTenantTx(db as never, 7, async () => {
        throw new Error("INSUFFICIENT_STOCK");
      })
    ).rejects.toThrow("INSUFFICIENT_STOCK");
  });
});

describe("cross-tenant rejection — trigger semantics mirror (no DB)", () => {
  it("rejects a parent row from another tenant (42501 branch)", () => {
    expect(() => assertSameTenant(1, { tenantId: 2 }, "العميل")).toThrowError(
      new RegExp(CROSS_TENANT_DB_ERROR)
    );
  });

  it("rejects a missing parent row (23503 branch)", () => {
    expect(() => assertSameTenant(1, null, "الصنف")).toThrowError(
      new RegExp(CROSS_TENANT_DB_ERROR)
    );
    expect(() => assertSameTenant(1, undefined, "الصنف")).toThrowError(
      new RegExp(CROSS_TENANT_DB_ERROR)
    );
  });

  it("allows same-tenant linkage", () => {
    expect(() => assertSameTenant(5, { tenantId: 5 }, "المخزن")).not.toThrow();
  });
});

describe("0023_nuclear_fortress.sql — artifact contract (no DB)", () => {
  const readSql = () => fs.readFileSync(MIGRATION_FILE, "utf8");

  it("migration file exists and wires the full fortress", () => {
    const s = readSql();
    // (أ) RLS
    expect(s).toContain("ENABLE ROW LEVEL SECURITY");
    expect(s).toContain("tenant_isolation");
    expect(s).toContain(tenantIsolationPredicate().slice(0, 24));
    // (ب) same-tenant trigger + balance triggers
    expect(s).toContain("validate_same_tenant");
    expect(s).toContain("CROSS_TENANT_DENIED");
    expect(s).toContain("validate_voucher_balance");
    expect(s).toContain("validate_journal_balance");
    // (ج) no-negative-stock
    expect(s).toContain("chk_products_current_stock_nonneg");
    // (د) hot composite indexes
    expect(s).toContain("idx_nf_sales_invoices_tenant_created");
    expect(s).toContain("idx_nf_transactions_tenant_id");
    // (ه) idempotency ledger
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "idempotency_keys"');
    expect(s).toContain("uq_idempotency_keys_tenant_key");
    // (و) world-class document engine tables
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "intermediary_parties"');
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "document_party_links"');
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "document_expenses"');
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "promotions"');
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "approval_queues"');
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "line_item_history"');
    expect(s).toContain('CREATE TABLE IF NOT EXISTS "flexible_line_items"');
    // safety: no destructive top-level statements
    for (const line of s.split("\n")) {
      const t = line.trim().toUpperCase();
      if (t.startsWith("--") || t.length === 0) continue;
      expect(t.startsWith("DROP ")).toBe(false);
      expect(t.startsWith("TRUNCATE ")).toBe(false);
    }
  });
});

// Live-DB contract: runs ONLY in CI/staging where DATABASE_URL exists,
// fails fast there if the fortress was not applied. Skipped otherwise.
// Transport outages skip LOUDLY via dbTransportGuard (same contract as
// dbLive.test.ts) — assertion failures always fail.
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
describeIfDb("nuclear fortress — live DB contract", () => {
  it(
    "tenant_isolation policy is enforced on sales_invoices",
    { timeout: 45000, retry: 1 },
    async ({ skip }) => {
      const { requireLiveTransport, isTransportError } = await import(
        "../dbTransportGuard"
      );
      await requireLiveTransport(skip);
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL as string);
        const rows = (await sql.query(
          `SELECT polname FROM pg_policy WHERE polrelid = 'public."sales_invoices"'::regclass`
        )) as Array<{ polname: string }>;
        expect(rows.map(r => r.polname)).toContain("tenant_isolation");
      } catch (e) {
        if (isTransportError(e)) return skip("neon transport unreachable");
        throw e;
      }
    }
  );
});
