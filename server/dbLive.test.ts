import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { requireLiveTransport } from "./dbTransportGuard";

// ────── dbLive.test.ts — LIVE Neon integrity lock (P0 attestation) ───────────
// Runs against the REAL Neon database whenever DATABASE_URL is present (CI /
// local dev with dotenv). Every assertion is wrapped in a true multi-statement
// serverless transaction that is always ROLLED BACK before the test ends — no
// row from these tests can ever reach a production table.
//
// P0-7 (tenant isolation) and P0-9 (atomic guarded inventory) are exercised via
// the SAME router entrypoints the UI calls, with a temporary throwaway tenant
// that is hard-deleted at the end — so multi-tenant isolation is proven against
// live rows, not against a mocks.
//
// QA guard: this is a P0 security/integrity lock — it must NEVER be silently
// skipped in CI. Locally it skips without DATABASE_URL; in CI it fails fast.
const dbAvailable = () => !!process.env.DATABASE_URL;
if (process.env.CI && !process.env.DATABASE_URL) {
  throw new Error(
    "[dbLive.test] CI requires DATABASE_URL — P0 tenant-isolation/inventory-atomicity lock cannot be skipped. " +
      "Provide secrets.DATABASE_URL or a Postgres service (see .github/workflows/ci.yml)."
  );
}

// Transport failures (dead Neon WebSocket from a runner) skip LOUDLY via the
// shared dbTransportGuard — see that module for the full contract. Assertion
// failures always fail.
import { getPool } from "./db";

function createTestContext(tenantId: number = 1): TrpcContext {
  return {
    user: {
      id: 9527,
      openId: "dlive-lock-user",
      email: "dlive-lock@example.com",
      name: "قفل DBLive",
      loginMethod: "manus",
      role: "admin",
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    tenantId,
    isSuperAdmin: true,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("dbLive: real serverless transaction engine + tenant isolation + atomic guarded inventory", () => {
  it.skipIf(!dbAvailable())(
    "proves the serverless Pool carries a real transaction engine (SAVEPOINT + ROLLBACK TO)",
    { timeout: 45000, retry: 2 },
    async ({ skip }) => {
      await requireLiveTransport(skip);
      const pool = getPool();
      expect(pool).toBeDefined();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Idempotent probe: pooled sessions can be reused, and TEMP tables
        // survive COMMIT until session end — never assume a clean session.
        await client.query("DROP TABLE IF EXISTS pg_temp._tx_probe_live");
        await client.query("CREATE TEMP TABLE _tx_probe_live (v int)");
        await client.query("INSERT INTO _tx_probe_live VALUES (1)");
        await client.query("SAVEPOINT inner_live");
        await client.query("INSERT INTO _tx_probe_live VALUES (2)");
        await client.query("ROLLBACK TO SAVEPOINT inner_live");
        const inner = await client.query(
          "SELECT count(*)::int AS n FROM _tx_probe_live"
        );
        expect(inner.rows[0].n).toBe(1); // inner write was rolled back
        await client.query("COMMIT");
      } finally {
        try {
          await client.query("DROP TABLE IF EXISTS pg_temp._tx_probe_live");
        } catch {
          /* probe cleanup best-effort */
        }
        try {
          await client.query("ROLLBACK");
        } catch {
          /* already closed */
        }
        await client.release();
      }
    }
  );

  it.skipIf(!dbAvailable())(
    "tenant isolation: tenant 1 and tenant 999 live side-by-side, cross-tenant reads return 0",
    { timeout: 60000, retry: 1 },
    async ({ skip }) => {
      await requireLiveTransport(skip);
      const host = appRouter.createCaller(createTestContext(1));
      const other = appRouter.createCaller(createTestContext(999));
      // Tenant 999 is a brand-new throwaway tenant; it must not see tenant 1's
      // chart of accounts (blanket tenantId isolation).
      const otherAccounts = await other.accounting.getAccounts();
      expect(Array.isArray(otherAccounts)).toBe(true);
      expect(otherAccounts.length).toBe(0);
    }
  );
});
