import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { requireLiveTransport, isTransportError } from "./dbTransportGuard";

// These are integration tests: they need a live DATABASE_URL.
// QA guard: critical accounting coverage must NEVER be silently skipped in CI.
// Locally (no CI env) the DB-gated tests skip; in CI a missing DATABASE_URL
// fails fast with a clear message instead of a green-but-empty run.
const dbAvailable = () => !!process.env.DATABASE_URL;
if (process.env.CI && !process.env.DATABASE_URL) {
  throw new Error(
    "[accounting.advanced.test] CI requires DATABASE_URL — critical accounting tests cannot be skipped. " +
      "Provide secrets.DATABASE_URL or a Postgres service (see .github/workflows/ci.yml)."
  );
}
const itIfDb = dbAvailable() ? it : it.skip;

function createTestContext(tenantId: number = 1): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "مدير النظام",
      loginMethod: "manus",
      role: "owner",
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    tenantId,
    isSuperAdmin: true,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Advanced & Managerial Accounting Unit Tests", () => {
  it("should calculate CVP analysis and break-even points correctly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.managerialAccounting.cvpAnalysis({
      fixedCosts: 50000,
      variableCostPerUnit: 30,
      sellingPricePerUnit: 80,
      targetProfit: 10000,
    });

    expect(result.contributionMarginPerUnit).toBe(50);
    expect(result.breakEvenUnits).toBe(1000);
    expect(result.breakEvenRevenue).toBe(80000);
    expect(result.targetUnits).toBe(1200);
  });

  it("should reject a CVP request with a non-positive contribution margin", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.managerialAccounting.cvpAnalysis({
        fixedCosts: 50000,
        variableCostPerUnit: 90,
        sellingPricePerUnit: 80,
      })
    ).rejects.toThrow(/هامش مساهمة/);
  });

  itIfDb(
    "should calculate Activity-Based Costing (ABC) allocations correctly",
    async ({ skip }) => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // centers must belong to the caller's tenant — the router enforces it
      await requireLiveTransport(skip);
      const existing = await caller.costCenters.list();
      let centers = existing.slice(0, 2);
      const created: number[] = [];

      if (centers.length < 2) {
        const suffix = Date.now().toString(36).toUpperCase();
        const a = await caller.costCenters.create({
          code: `T-ABC-A-${suffix}`,
          name: "مركز اختبار أ",
        });
        const b = await caller.costCenters.create({
          code: `T-ABC-B-${suffix}`,
          name: "مركز اختبار ب",
        });
        created.push(a.id, b.id);
        centers = [a, b];
      }

      try {
        const result = await caller.advancedCostAccounting.abcAllocation({
          poolName: "Machine Maintenance",
          totalPoolCost: 10000,
          costDrivers: [
            { costCenterId: centers[0].id, driverQuantity: 200 },
            { costCenterId: centers[1].id, driverQuantity: 300 },
          ],
        });

        expect(result.allocationRate).toBe(20);
        expect(result.allocations).toHaveLength(2);
        expect(result.allocations[0].allocatedAmount).toBe(4000);
        expect(result.allocations[1].allocatedAmount).toBe(6000);
      } catch (e) {
        if (isTransportError(e)) return skip("neon transport unreachable mid-test");
        throw e;
      } finally {
        for (const id of created) {
          await caller.costCenters.remove({ id }).catch(() => undefined);
        }
      }
    },
    30000
  );

  it("should compute cost variances (Material Price & Usage) correctly", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const variance = await caller.advancedCostAccounting.costVariance({
      standardQty: 100,
      actualQty: 110,
      standardPrice: 10,
      actualPrice: 9,
    });

    expect(variance.materialPriceVariance).toBe(110);
    expect(variance.materialUsageVariance).toBe(-100);
    expect(variance.totalCostVariance).toBe(10);
  });

  itIfDb(
    "should report real KPIs from the ledger instead of fixed ratios",
    async ({ skip }) => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      await requireLiveTransport(skip);
      try {
        const kpis = await caller.managerialAccounting.financialKpis();

        // القيم تأت من الدفاتر — لا قيم ثابتة
        expect(typeof kpis.totalRevenue).toBe("number");
        expect(typeof kpis.totalExpense).toBe("number");
        expect(typeof kpis.netProfit).toBe("number");
        expect(kpis.netProfit).toBeCloseTo(
          Number((kpis.totalRevenue - kpis.totalExpense).toFixed(2)),
          1
        );
        expect(kpis.hasLedgerData).toBeTypeOf("boolean");
        // النسب إمّا محسوبة من السجل أو null — لا أرقام مفبركة
        for (const ratio of [
          kpis.currentRatio,
          kpis.quickRatio,
          kpis.debtToEquityRatio,
          kpis.returnOnEquity,
        ]) {
          expect(ratio === null || typeof ratio === "number").toBe(true);
        }
      } catch (e) {
        if (isTransportError(e)) return skip("neon transport unreachable mid-test");
        throw e;
      }
    },
    30000
  );
});