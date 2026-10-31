import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  assertRefsInTenant,
  assertTenantRow,
  ensureIdInTenant,
} from "./_core/tenantGuard";

const TENANT_A = 1;
const TENANT_B = 2;

/** Queue-mock drizzle db: each select().from().where().limit() pops one row. */
function queueDb(queue: Array<{ tenantId: number } | undefined>) {
  let i = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const row = queue[i++];
            return row ? [row] : [];
          },
        }),
      }),
    }),
  };
}

const fakeTable: { id: unknown; tenantId: unknown } = {
  id: {},
  tenantId: {},
};

async function expectForbidden(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(TRPCError);
    expect((e as TRPCError).code).toBe("FORBIDDEN");
    return;
  }
  throw new Error(
    "expected FORBIDDEN but the call succeeded (isolation breach)"
  );
}

describe("tenant isolation — negative traversal (A → B must be 403)", () => {
  it("blocks reading a Tenant B row from a Tenant A context (pure guard)", () => {
    const tenantBInvoice = { id: 999, tenantId: TENANT_B };
    expect(() =>
      assertTenantRow(tenantBInvoice, TENANT_A, "فاتورة المبيعات")
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("allows reading an own-tenant row", () => {
    expect(() =>
      assertTenantRow(
        { id: 1, tenantId: TENANT_A },
        TENANT_A,
        "فاتورة المبيعات"
      )
    ).not.toThrow();
  });

  it("ensureIdInTenant: Tenant A editing Tenant B invoice id => FORBIDDEN", async () => {
    const db = queueDb([{ tenantId: TENANT_B }]);
    await expectForbidden(
      ensureIdInTenant(db, fakeTable, 999, TENANT_A, "فاتورة المبيعات")
    );
  });

  it("ensureIdInTenant: missing row (guessed id) => FORBIDDEN, not silent success", async () => {
    const db = queueDb([undefined]);
    await expectForbidden(
      ensureIdInTenant(db, fakeTable, 424242, TENANT_A, "فاتورة المبيعات")
    );
  });

  it("assertRefsInTenant: mixed basket with one Tenant B product => FORBIDDEN (composite FK check)", async () => {
    // Simulates posRouter.createSale / returns: [customer(A) ok, branch(A) ok, product(B) evil]
    const db = queueDb([
      { tenantId: TENANT_A },
      { tenantId: TENANT_A },
      { tenantId: TENANT_B },
    ]);
    await expectForbidden(
      assertRefsInTenant(db, TENANT_A, [
        { table: fakeTable, id: 10, label: "العميل" },
        { table: fakeTable, id: 20, label: "الفرع" },
        { table: fakeTable, id: 30, label: "الصنف" },
      ])
    );
  });

  it("assertRefsInTenant: all refs in own tenant => passes", async () => {
    const db = queueDb([{ tenantId: TENANT_A }, { tenantId: TENANT_A }]);
    await expect(
      assertRefsInTenant(db, TENANT_A, [
        { table: fakeTable, id: 11, label: "الحساب" },
        { table: fakeTable, id: 22, label: "المستودع" },
      ])
    ).resolves.toBeUndefined();
  });
});
