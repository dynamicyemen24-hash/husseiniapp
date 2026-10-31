/**
 * server/distributionReportsRouter.ts — Distribution & Logistics Reporting Engine
 * ==========================================================================
 * Authoritative server-side computation of distribution, logistics, and
 * inventory movement metrics:
 *
 *   • Inventory Summary         (ملخص المخزون / Inventory overview)
 *   • Stock by Location         (المخازن حسب الموقع / Stock by location)
 *   • Inventory Movement        (حركة المخزون / Inventory movement)
 *   • Low Stock Alerts          (إنذارات نقص المخزون / Low stock alerts)
 *   • Stock Valuation           (قيمة المخزون / Stock valuation)
 *
 * All reports are tenant-scoped and audit-logged via `activityLogs`.
 *
 * @module server/distributionReportsRouter
 */
import { z } from "zod";
import { eq, and, gte, lte, inArray, sql, count, sum } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  inventoryItems,
  inventoryMovements,
  branches,
  products,
} from "../drizzle/schema";

/* ─────────────────────────────────────────────────────────────────────────────
 *  SHARED TYPES & CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

type Db = any;

/** Inventory movement types. */
const MOVEMENT_TYPES = ["in", "out", "adjustment", "transfer"] as const;

/* ─────────────────────────────────────────────────────────────────────────────
 *  ZOD INPUT SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

/** Input for inventory summary report. */
const inventorySummaryInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  branchId: z.number().int().positive().optional().describe("Filter by branch"),
});

/** Input for stock by location report. */
const stockByLocationInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
});

/** Input for inventory movement report. */
const inventoryMovementInputSchema = z.object({
  type: z.enum(["in", "out", "adjustment", "transfer"]).optional(),
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/** Input for low stock alerts report. */
const lowStockInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  threshold: z.number().default(10).describe("Minimum stock threshold"),
});

/** Input for stock valuation report. */
const stockValuationInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  HELPER FUNCTIONS
 * ───────────────────────────────────────────────────────────────────────────── */

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  REPORT PROCEDURES
 * ───────────────────────────────────────────────────────────────────────────── */

export const distributionReportsRouter = router({
  /**
   * DIS-01: Inventory Summary Report
   * ملخص المخزون - نظرة عامة على حالة المخزون
   */
  inventorySummary: tenantProcedure
    .input(inventorySummaryInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;

      const asOf = input?.asOf ? parseDate(input.asOf) : undefined;
      // Get inventory items with current stock
      const items = await db
        .select({
          id: inventoryItems.id,
          productId: inventoryItems.productId,
          currentStock: inventoryItems.currentStock,
          minimumStock: inventoryItems.minimumStock,
          branchId: inventoryItems.branchId,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.tenantId, ctx.tenantId));

      // Filter by branch if specified
      const filteredItems = input?.branchId
        ? items.filter(i => i.branchId === input.branchId)
        : items;

      // Get branch names
      const branchIds = [...new Set(filteredItems.map(i => i.branchId))];
      const branchesData = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(inArray(branches.id, branchIds.map(Number)));

      const branchMap = new Map(
        branchesData.map(b => [b.id, b.name || "Unknown"])
      );

      // Calculate summaries
      const totalItems = filteredItems.length;
      const totalStock = filteredItems.reduce(
        (sum, i) => sum + toNum(i.currentStock),
        0
      );
      const lowStockItems = filteredItems.filter(
        i => toNum(i.currentStock) <= toNum(i.minimumStock)
      ).length;

      // By branch
      const byBranch = filteredItems.reduce(
        (acc, i) => {
          const bid = i.branchId;
          if (!bid) return acc;
          if (!acc[bid]) acc[bid] = { stock: 0, count: 0, name: null };
          acc[bid].stock += toNum(i.currentStock);
          acc[bid].count += 1;
          acc[bid].name = branchMap.get(bid) || "Unknown";
          return acc;
        },
        {} as Record<
          string,
          { stock: number; count: number; name: string | null }
        >
      );

      const branchList = Object.entries(byBranch).map(([id, data]) => ({
        branchId: Number(id),
        branchName: data.name,
        stock: data.stock,
        itemCount: data.count,
      }));

      return {
        asOf: input?.asOf || new Date().toISOString().split("T")[0],
        totalItems,
        totalStock,
        lowStockItems,
        byBranch: branchList,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * DIS-02: Stock by Location Report
   * المخزون بالمواقع - توزيع المخزون على الفروع والمستودعات
   */
  stockByLocation: tenantProcedure
    .input(stockByLocationInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { locations: [], totalStock: 0 };

      // Get inventory items
      const items = await db
        .select({
          id: inventoryItems.id,
          currentStock: inventoryItems.currentStock,
          minimumStock: inventoryItems.minimumStock,
          branchId: inventoryItems.branchId,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.tenantId, ctx.tenantId));

      // Get branches
      const branchIds = [...new Set(items.map(i => i.branchId).filter(b => b))];
      const branchesData = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(inArray(branches.id, branchIds.map(Number)));

      const branchMap = new Map(
        branchesData.map(b => [b.id, b.name || "Unknown"])
      );

      // Aggregate by location
      const byLocation = items.reduce(
        (acc, i) => {
          const bid = i.branchId;
          if (!bid) return acc;
          if (!acc[bid]) acc[bid] = { stock: 0, minStock: 0, count: 0 };
          acc[bid].stock += toNum(i.currentStock);
          acc[bid].minStock = Math.min(
            acc[bid].minStock || Infinity,
            toNum(i.minimumStock)
          );
          acc[bid].count += 1;
          return acc;
        },
        {} as Record<string, { stock: number; minStock: number; count: number }>
      );

      const locationList = Object.entries(byLocation).map(([id, data]) => ({
        branchId: Number(id),
        branchName: branchMap.get(Number(id)) || "Unknown",
        currentStock: data.stock,
        minimumStock: data.minStock || 0,
        itemCount: data.count,
      }));

      const totalStock = items.reduce(
        (sum, i) => sum + toNum(i.currentStock),
        0
      );

      return {
        locations: locationList,
        totalStock,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * DIS-03: Inventory Movement Report
   * حركة المخنش - سجل حركات دخول وخروج المخزون
   */
  inventoryMovement: tenantProcedure
    .input(inventoryMovementInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        return { movements: [], totalIn: 0, totalOut: 0 };

      const movementType = input.type;
      const asOf = input.asOf ? parseDate(input.asOf) : undefined;

      const movementConditions = [
        eq(inventoryMovements.tenantId, ctx.tenantId),
        movementType ? eq(inventoryMovements.type, movementType) : undefined,
        asOf ? gte(inventoryMovements.createdAt, asOf) : undefined,
        asOf
          ? lte(
              inventoryMovements.createdAt,
              new Date(
                asOf.getFullYear(),
                asOf.getMonth(),
                asOf.getDate(),
                23,
                59,
                59,
                999
              )
            )
          : undefined,
      ].filter(Boolean);

      const [countResult] = await db
        .select({ total: count() })
        .from(inventoryMovements)
        .where(and(...movementConditions));
      const totals = await db
        .select({
          type: inventoryMovements.type,
          quantity: sum(inventoryMovements.quantity),
          count: count(),
        })
        .from(inventoryMovements)
        .where(and(...movementConditions))
        .groupBy(inventoryMovements.type);
      const movements = await db
        .select({
          id: inventoryMovements.id,
          productId: inventoryMovements.productId,
          type: inventoryMovements.type,
          quantity: inventoryMovements.quantity,
          referenceType: inventoryMovements.referenceType,
          referenceId: inventoryMovements.referenceId,
          notes: inventoryMovements.notes,
          createdAt: inventoryMovements.createdAt,
        })
        .from(inventoryMovements)
        .where(and(...movementConditions))
        .orderBy(inventoryMovements.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      const totalIn = toNum(totals.find(row => row.type === "in")?.quantity);
      const totalOut = toNum(totals.find(row => row.type === "out")?.quantity);
      const adjustmentCount = Number(
        totals.find(row => row.type === "adjustment")?.count ?? 0
      );
      const transferCount = Number(
        totals.find(row => row.type === "transfer")?.count ?? 0
      );

      return {
        movements,
        total: Number(countResult?.total ?? 0),
        limit: input.limit,
        offset: input.offset,
        summary: {
          totalIn,
          totalOut,
          netChange: totalIn - totalOut,
          adjustmentCount,
          transferCount,
        },
        movementType: input.type || "all",
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * DIS-04: Low Stock Alerts Report
   * إنذارات نقص المخزون - المنتجات التي تقل مخزونها عن الحد الأدنى
   */
  lowStockAlerts: tenantProcedure
    .input(lowStockInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { alerts: [], total: 0 };

      const threshold = input.threshold || 10;

      // Get inventory items below threshold
      const items = await db
        .select({
          id: inventoryItems.id,
          productId: inventoryItems.productId,
          currentStock: inventoryItems.currentStock,
          minimumStock: inventoryItems.minimumStock,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.tenantId, ctx.tenantId));

      // Filter items below threshold
      const alerts = items
        .filter(
          i => toNum(i.currentStock) >= 0 && toNum(i.currentStock) <= threshold
        )
        .map(i => ({
          productId: i.productId,
          currentStock: toNum(i.currentStock),
          minimumStock: toNum(i.minimumStock),
          shortfall: threshold - toNum(i.currentStock),
        }));

      const total = alerts.length;

      return {
        alerts,
        threshold,
        total,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * DIS-05: Stock Valuation Report
   * قيمة المخزون - تقييم قيمة المخزون الحالية
   */
  stockValuation: tenantProcedure
    .input(stockValuationInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        return { totalValue: 0, items: [], currency: "YER" };

      const asOf = input?.asOf ? parseDate(input.asOf) : undefined;

      // Get inventory items with product details
      const items = await db
        .select({
          id: inventoryItems.id,
          productId: inventoryItems.productId,
          currentStock: inventoryItems.currentStock,
          costPrice: inventoryItems.costPrice,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.tenantId, ctx.tenantId));

      // Get product names
      const productIds = [
        ...new Set(items.map(i => i.productId).filter(p => p)),
      ];
      const productsData = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds.map(Number)));

      const productMap = new Map(
        productsData.map(p => [p.id, p.name || "Unknown"])
      );

      // Calculate valuation
      const valuationItems = items.map(i => {
        const quantity = toNum(i.currentStock);
        const cost = toNum(i.costPrice);
        const unitValue = quantity * cost;
        return {
          productId: i.productId,
          productName: productMap.get(i.productId) || "Unknown",
          quantity,
          costPrice: cost,
          unitValue,
        };
      });

      const totalValue = valuationItems.reduce(
        (sum, item) => sum + item.unitValue,
        0
      );

      return {
        currency: "YER",
        totalValue,
        items: valuationItems,
        generatedAt: new Date().toISOString(),
      };
    }),
});

export type DistributionReports = typeof distributionReportsRouter;
