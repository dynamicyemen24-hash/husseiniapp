/**
 * server/queryRouter.ts
 * ---------------------
 * Smart query layer backed by the enterprise VIEWs (`drizzle/0010_*`) and the
 * unified global search engine.
 *
 * Every procedure here is tenantProcedure-scoped (real tenant id resolved via
 * requireTenantId) and every SQL statement filters by that tenantId — full
 * isolation across multi-entity tenants, branches, warehouses and currencies.
 *
 * Screens powered:
 *   - SearchBar / CommandPalette autocomplete  → `erp.globalSearch`
 *   - WorkspaceDashboard KPIs                  → `erp.dashboardSummary`
 *   - Reports financial statement screens      → `erp.accountBalances`
 *   - Inventory health / low stock             → `erp.inventoryHealth`
 *   - Spatial-temporal audit trail (Audit.tsx) → `erp.activityTrace`
 */
import { z } from "zod";
import { eq, desc, asc, and, sql, gte } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import { searchEntities, suggestQuickActions } from "./_core/globalSearch";
import {
  accountBalancesView,
  inventoryHealthView,
  salesTrendView,
  activityTraceView,
  tenantMasterSummaryView,
} from "./_core/views";

type Db = any;

export const queryRouter = router({
  /** Unified autocomplete (products/accounts/customers/suppliers/transactions). */
  globalSearch: tenantProcedure
    .input(
      z.object({
        query: z.string().min(1).max(120),
        branchId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(20).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = requireTenantId(ctx);
      const db: Db = await getDb();
      if (!db) return { items: [], suggestions: [] };

      const items = await searchEntities({
        db,
        tenantId,
        query: input.query,
        branchId: input.branchId,
        limit: input.limit,
      });
      return { items, suggestions: suggestQuickActions(input.query) };
    }),

  /** Account balances (trial-balance style) — powers statements & dashboards. */
  accountBalances: tenantProcedure
    .input(
      z.object({
        accountType: z.string().optional(),
        accountId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = requireTenantId(ctx);
      const db: Db = await getDb();
      if (!db) return [];
      const filters: any[] = [eq(accountBalancesView.tenantId, tenantId)];
      if (input.accountType)
        filters.push(eq(accountBalancesView.type, input.accountType));
      if (input.accountId)
        filters.push(eq(accountBalancesView.accountId, input.accountId));
      return db
        .select()
        .from(accountBalancesView)
        .where(sql.join(filters, sql` and `))
        .orderBy(asc(accountBalancesView.code))
        .limit(input.limit ?? 300);
    }),

  /** Inventory health (stock vs reorder/min per warehouse) — low-stock screens. */
  inventoryHealth: tenantProcedure
    .input(
      z.object({
        warehouseId: z.number().int().positive().optional(),
        onlyLow: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = requireTenantId(ctx);
      const db: Db = await getDb();
      if (!db) return [];
      const filters: any[] = [eq(inventoryHealthView.tenantId, tenantId)];
      if (input.warehouseId)
        filters.push(eq(inventoryHealthView.warehouseId, input.warehouseId));
      if (input.onlyLow)
        filters.push(eq(inventoryHealthView.needsReplenishment, true));
      return db
        .select()
        .from(inventoryHealthView)
        .where(and(...filters))
        .orderBy(asc(inventoryHealthView.availableQty))
        .limit(input.limit ?? 200);
    }),

  /** Daily sales trend (per branch & currency) — dashboard charts. */
  salesTrend: tenantProcedure
    .input(
      z.object({
        branchId: z.number().int().positive().optional(),
        days: z.number().int().min(1).max(365).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = requireTenantId(ctx);
      const db: Db = await getDb();
      if (!db) return [];
      const filters: any[] = [eq(salesTrendView.tenantId, tenantId)];
      if (input.branchId)
        filters.push(eq(salesTrendView.branchId, input.branchId));
      if (input.days) {
        filters.push(
          gte(salesTrendView.saleDate, sql`CURRENT_DATE - ${input.days}::int`)
        );
      }
      return db
        .select()
        .from(salesTrendView)
        .where(and(...filters))
        .orderBy(desc(salesTrendView.saleDate))
        .limit(input.days ? input.days * 10 : 120);
    }),

  /** Spatial-temporal audit trail (geo + device + hash chain) — Audit screen. */
  activityTrace: tenantProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        country: z.string().max(100).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = requireTenantId(ctx);
      const db: Db = await getDb();
      if (!db) return [];
      const filters: any[] = [eq(activityTraceView.tenantId, tenantId)];
      if (input.userId)
        filters.push(eq(activityTraceView.userId, input.userId));
      if (input.country)
        filters.push(eq(activityTraceView.country, input.country));
      return db
        .select()
        .from(activityTraceView)
        .where(and(...filters))
        .orderBy(desc(activityTraceView.createdAt))
        .limit(input.limit ?? 100);
    }),

  /** Master-data KPIs per tenant (branches/warehouses/currencies/UOM...). */
  tenantMasterSummary: tenantProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenantId(ctx);
    const db: Db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(tenantMasterSummaryView)
      .where(eq(tenantMasterSummaryView.tenantId, tenantId))
      .limit(1);
    return rows[0] ?? null;
  }),

  /** Dashboard one-shot summary: KPIs from the live VIEWs in parallel. */
  dashboardSummary: tenantProcedure
    .input(
      z.object({
        branchId: z.number().int().positive().optional(),
        days: z.number().int().min(1).max(365).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = requireTenantId(ctx);
      const db: Db = await getDb();
      if (!db) {
        return {
          salesTrend: [],
          lowStockCount: 0,
          inventoryRows: 0,
          recentActivity: [],
          master: null,
        };
      }
      const days = input.days ?? 30;
      const salesFilters: any[] = [
        eq(salesTrendView.tenantId, tenantId),
        gte(salesTrendView.saleDate, sql`CURRENT_DATE - ${days}::int`),
      ];
      if (input.branchId)
        salesFilters.push(eq(salesTrendView.branchId, input.branchId));

      const invFilters: any[] = [eq(inventoryHealthView.tenantId, tenantId)];
      if (input.branchId)
        invFilters.push(eq(inventoryHealthView.warehouseId, input.branchId));

      const [sales, lowStock, recent, master] = await Promise.all([
        db
          .select()
          .from(salesTrendView)
          .where(and(...salesFilters))
          .orderBy(desc(salesTrendView.saleDate))
          .limit(days),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(inventoryHealthView)
          .where(
            and(...invFilters, eq(inventoryHealthView.needsReplenishment, true))
          ),
        db
          .select()
          .from(activityTraceView)
          .where(eq(activityTraceView.tenantId, tenantId))
          .orderBy(desc(activityTraceView.createdAt))
          .limit(10),
        db
          .select()
          .from(tenantMasterSummaryView)
          .where(eq(tenantMasterSummaryView.tenantId, tenantId))
          .limit(1),
      ]);

      return {
        salesTrend: sales,
        lowStockCount: lowStock[0]?.count ?? 0,
        inventoryRows: 0,
        recentActivity: recent,
        master: master[0] ?? null,
      };
    }),
});
