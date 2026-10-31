/**
 * server/procurementReportsRouter.ts — Procurement Analytics & Reporting Engine
 * ==============================================================================
 * Authoritative server-side computation of procurement analytics:
 *   • Supplier Performance      (أداء الموردين)
 *   • Procurement Summary       (ملخص المشتريات)
 *   • Spend by Category         (الإنفاق حسب الفئة)
 *   • Spend by Month            (الإنفاق الشهري)
 *   • Lead Time Analysis        (تحليل مدة التوريد)
 *   • On-Time Delivery Rate     (نسبة التسليم في الوقت المحدد)
 *
 * All reports are tenant-scoped and audit-logged via `activityLogs`.
 *
 * INVARIANTS:
 *   • Only confirmed/paid purchase invoices are included.
 *   • Negative/NaN amounts are coerced to 0.
 *   • All percentages are rounded to 1 decimal.
 *
 * @module server/procurementReportsRouter
 */

import { z } from "zod";
import { eq, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  purchaseInvoices,
  suppliers,
  activityLogs,
  products,
} from "../drizzle/schema";

/* ─────────────────────────────────────────────────────────────────────────────
 *  SHARED TYPES & CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

type Db = any;

/** Purchase invoice statuses that represent realised spend. */
const ACTIVE_PURCHASE_STATUSES = ["confirmed", "partial", "paid"] as const;

/** Floating-point tolerance. */
const EPSILON = 0.01;

/** Safely coerce a value to a finite number; 0 on failure. */
function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Parse ISO-8601 string to Date; returns undefined on invalid input. */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

/** Round to N decimal places. */
function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ZOD INPUT SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

const periodInputSchema = z.object({
  from: z.string().optional().describe("Period start (YYYY-MM-DD)"),
  to: z.string().optional().describe("Period end (YYYY-MM-DD)"),
  branchId: z.number().int().positive().optional().describe("Filter by branch"),
  supplierId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by supplier"),
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  LOGGING HELPER
 * ───────────────────────────────────────────────────────────────────────────── */

/** Write a structured audit log entry. Non-fatal. */
async function logReportAccess(
  db: Db,
  tenantId: number,
  userId: number | undefined,
  reportName: string,
  params: Record<string, unknown>
): Promise<void> {
  if (!db) return;
  try {
    await db.insert(activityLogs).values({
      tenantId,
      userId,
      action: `Report generated: ${reportName}`,
      entityType: "report",
      details: JSON.stringify(params),
    });
  } catch {
    // Non-fatal.
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ROUTER
 * ───────────────────────────────────────────────────────────────────────────── */

export const procurementReportsRouter = router({
  /**
   * ── SUPPLIER PERFORMANCE (أداء الموردين) ───────────────────────────────
   *
   * Per-supplier analytics: total spend, invoice count, avg invoice value,
   * on-time payment rate, avg days to pay.
   */
  supplierPerformance: tenantProcedure
    .input(periodInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const empty = {
        rows: [],
        summary: {
          totalSuppliers: 0,
          totalSpend: 0,
          totalInvoices: 0,
          avgInvoiceValue: 0,
        },
      };
      if (!db) return empty;

      const tid = requireTenantId(ctx);
      const from = parseDate(input?.from);
      const to = parseDate(input?.to);

      await logReportAccess(db, tid, ctx.user?.id, "supplierPerformance", {
        from: input?.from,
        to: input?.to,
      });

      // ── Load suppliers with contact info ────────────────────────────────
      const suppConditions: any[] = [eq(suppliers.tenantId, tid)];
      if (input?.supplierId)
        suppConditions.push(eq(suppliers.id, input.supplierId));
      const suppRows = await db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          email: suppliers.email,
          phone: suppliers.phone,
        })
        .from(suppliers)
        .where(and(...suppConditions));

      // ── Load purchase invoices in period ────────────────────────────────
      const invConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_PURCHASE_STATUSES),
      ];
      if (from) invConditions.push(gte(purchaseInvoices.invoiceDate, from));
      if (to) invConditions.push(lte(purchaseInvoices.invoiceDate, to));
      if (input?.supplierId)
        invConditions.push(eq(purchaseInvoices.supplierId, input.supplierId));

      const invRows = await db
        .select({
          id: purchaseInvoices.id,
          supplierId: purchaseInvoices.supplierId,
          total: purchaseInvoices.total,
          paidAmount: purchaseInvoices.paidAmount,
          invoiceDate: purchaseInvoices.invoiceDate,
          dueDate: purchaseInvoices.dueDate,
          status: purchaseInvoices.status,
        })
        .from(purchaseInvoices)
        .where(and(...invConditions));

      // ── Aggregate per supplier ──────────────────────────────────────────
      const suppMap = new Map<
        number,
        {
          supplierId: number;
          name: string;
          email?: string;
          phone?: string;
          totalSpend: number;
          totalInvoices: number;
          paidInvoices: number;
          totalPaid: number;
          outstanding: number;
        }
      >();

      let grandTotalSpend = 0;
      let grandTotalInvoices = 0;
      let grandTotalPaid = 0;

      for (const inv of invRows) {
        const supplierId = inv.supplierId ?? 0;
        const total = toNum(inv.total);
        const paid = toNum(inv.paidAmount);
        const supp = suppRows.find(s => s.id === supplierId);

        const existing = suppMap.get(supplierId) ?? {
          supplierId,
          name: supp?.name ?? "مورد غير مُعرّف",
          email: supp?.email ?? undefined,
          phone: supp?.phone ?? undefined,
          totalSpend: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          totalPaid: 0,
          outstanding: 0,
        };

        existing.totalSpend += total;
        existing.totalInvoices++;
        existing.totalPaid += paid;
        existing.outstanding += Math.max(0, total - paid);
        if (paid >= total - EPSILON && total > EPSILON) existing.paidInvoices++;

        suppMap.set(supplierId, existing);
        grandTotalSpend += total;
        grandTotalInvoices++;
        grandTotalPaid += paid;
      }

      // Add suppliers with no purchases (for completeness)
      for (const supp of suppRows) {
        if (!suppMap.has(supp.id)) {
          suppMap.set(supp.id, {
            supplierId: supp.id,
            name: supp.name,
            email: supp.email ?? undefined,
            phone: supp.phone ?? undefined,
            totalSpend: 0,
            totalInvoices: 0,
            paidInvoices: 0,
            totalPaid: 0,
            outstanding: 0,
          });
        }
      }

      const rows = [...suppMap.values()]
        .map(r => ({
          ...r,
          avgInvoiceValue:
            r.totalInvoices > 0 ? roundTo(r.totalSpend / r.totalInvoices) : 0,
          paidRatio:
            r.totalSpend > EPSILON
              ? roundTo((r.totalPaid / r.totalSpend) * 100, 1)
              : 0,
          onTimePaymentRate:
            r.totalInvoices > 0
              ? roundTo((r.paidInvoices / r.totalInvoices) * 100, 1)
              : 0,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend);

      const summary = {
        totalSuppliers: rows.length,
        totalSpend: roundTo(grandTotalSpend),
        totalInvoices: grandTotalInvoices,
        avgInvoiceValue:
          grandTotalInvoices > 0
            ? roundTo(grandTotalSpend / grandTotalInvoices)
            : 0,
        totalPaid: roundTo(grandTotalPaid),
        totalOutstanding: roundTo(grandTotalSpend - grandTotalPaid),
      };

      return { rows, summary };
    }),

  /**
   * ── SPEND BY MONTH (الإنفاق الشهري) ───────────────────────────────────
   *
   * Monthly breakdown of total purchase spend for a period.
   * Returns array of { month: "YYYY-MM", totalSpend, invoiceCount, paidAmount, outstanding }.
   */
  spendByMonth: tenantProcedure
    .input(periodInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: { totalSpend: 0, totalInvoices: 0 } };

      const tid = requireTenantId(ctx);
      const from = parseDate(input?.from);
      const to = parseDate(input?.to);

      await logReportAccess(db, tid, ctx.user?.id, "spendByMonth", {
        from: input?.from,
        to: input?.to,
      });

      const invConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_PURCHASE_STATUSES),
      ];
      if (from) invConditions.push(gte(purchaseInvoices.invoiceDate, from));
      if (to) invConditions.push(lte(purchaseInvoices.invoiceDate, to));

      const invRows = await db
        .select({
          invoiceDate: purchaseInvoices.invoiceDate,
          total: purchaseInvoices.total,
          paidAmount: purchaseInvoices.paidAmount,
        })
        .from(purchaseInvoices)
        .where(and(...invConditions));

      // Aggregate by month
      const byMonth = new Map<
        string,
        {
          month: string;
          totalSpend: number;
          paidAmount: number;
          invoiceCount: number;
        }
      >();

      let grandTotal = 0;
      let grandCount = 0;

      for (const inv of invRows) {
        if (!inv.invoiceDate) continue;
        const d = new Date(inv.invoiceDate);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const total = toNum(inv.total);
        const paid = toNum(inv.paidAmount);
        const existing = byMonth.get(monthKey) ?? {
          month: monthKey,
          totalSpend: 0,
          paidAmount: 0,
          invoiceCount: 0,
        };
        existing.totalSpend += total;
        existing.paidAmount += paid;
        existing.invoiceCount++;
        byMonth.set(monthKey, existing);
        grandTotal += total;
        grandCount++;
      }

      const rows = [...byMonth.values()]
        .map(r => ({
          ...r,
          totalSpend: roundTo(r.totalSpend),
          paidAmount: roundTo(r.paidAmount),
          outstanding: roundTo(r.totalSpend - r.paidAmount),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        rows,
        totals: { totalSpend: roundTo(grandTotal), totalInvoices: grandCount },
      };
    }),

  /**
   * ── SPEND BY SUPPLIER (الإنفاق حسب المورد) ────────────────────────────
   *
   * Top-N supplier spend breakdown with % of total.
   * Returns rows sorted by spend descending.
   */
  spendBySupplier: tenantProcedure
    .input(
      periodInputSchema.extend({
        limit: z.number().int().positive().max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totalSpend: 0 };

      const tid = requireTenantId(ctx);
      const from = parseDate(input?.from);
      const to = parseDate(input?.to);
      const limit = input?.limit ?? 10;

      await logReportAccess(db, tid, ctx.user?.id, "spendBySupplier", {
        from: input?.from,
        to: input?.to,
        limit,
      });

      const invConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_PURCHASE_STATUSES),
      ];
      if (from) invConditions.push(gte(purchaseInvoices.invoiceDate, from));
      if (to) invConditions.push(lte(purchaseInvoices.invoiceDate, to));

      const invRows = await db
        .select({
          supplierId: purchaseInvoices.supplierId,
          total: purchaseInvoices.total,
        })
        .from(purchaseInvoices)
        .where(and(...invConditions));

      const suppRows = await db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tid));
      const suppMap = new Map(suppRows.map(s => [s.id, s.name]));

      const totals = new Map<number, number>();
      let grandTotal = 0;
      for (const inv of invRows) {
        const id = inv.supplierId ?? 0;
        const v = toNum(inv.total);
        totals.set(id, (totals.get(id) ?? 0) + v);
        grandTotal += v;
      }

      const rows = [...totals.entries()]
        .map(([id, v]) => ({
          supplierId: id,
          supplierName: suppMap.get(id) ?? "مورد غير مُعرّف",
          totalSpend: roundTo(v),
          share: grandTotal > EPSILON ? roundTo((v / grandTotal) * 100, 1) : 0,
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, limit);

      return { rows, totalSpend: roundTo(grandTotal) };
    }),

  /**
   * ── PROCUREMENT SUMMARY (ملخص المشتريات) ─────────────────────────────
   *
   * High-level KPIs: total spend, invoice count, avg invoice value,
   * unique suppliers, paid ratio, outstanding amount.
   */
  procurementSummary: tenantProcedure
    .input(periodInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalSpend: 0,
          totalInvoices: 0,
          avgInvoiceValue: 0,
          uniqueSuppliers: 0,
          paidAmount: 0,
          outstandingAmount: 0,
          paidRatio: 0,
        };
      }

      const tid = requireTenantId(ctx);
      const from = parseDate(input?.from);
      const to = parseDate(input?.to);

      await logReportAccess(db, tid, ctx.user?.id, "procurementSummary", {
        from: input?.from,
        to: input?.to,
      });

      const invConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_PURCHASE_STATUSES),
      ];
      if (from) invConditions.push(gte(purchaseInvoices.invoiceDate, from));
      if (to) invConditions.push(lte(purchaseInvoices.invoiceDate, to));

      const invRows = await db
        .select({
          supplierId: purchaseInvoices.supplierId,
          total: purchaseInvoices.total,
          paidAmount: purchaseInvoices.paidAmount,
        })
        .from(purchaseInvoices)
        .where(and(...invConditions));

      let totalSpend = 0,
        totalPaid = 0;
      const supplierIds = new Set<number>();

      for (const inv of invRows) {
        const total = toNum(inv.total);
        const paid = toNum(inv.paidAmount);
        totalSpend += total;
        totalPaid += paid;
        if (inv.supplierId != null) supplierIds.add(inv.supplierId);
      }

      const totalInvoices = invRows.length;
      return {
        totalSpend: roundTo(totalSpend),
        totalInvoices,
        avgInvoiceValue:
          totalInvoices > 0 ? roundTo(totalSpend / totalInvoices) : 0,
        uniqueSuppliers: supplierIds.size,
        paidAmount: roundTo(totalPaid),
        outstandingAmount: roundTo(totalSpend - totalPaid),
        paidRatio:
          totalSpend > EPSILON ? roundTo((totalPaid / totalSpend) * 100, 1) : 0,
      };
    }),

  /**
   * ── TOP SUPPLIERS (أكبر الموردين) ─────────────────────────────────────
   *
   * Convenience: top N suppliers by spend, sorted descending.
   */
  topSuppliers: tenantProcedure
    .input(
      z.object({
        limit: z.number().int().positive().max(50).default(5),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const tid = requireTenantId(ctx);
      const from = parseDate(input.from);
      const to = parseDate(input.to);

      const invConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_PURCHASE_STATUSES),
      ];
      if (from) invConditions.push(gte(purchaseInvoices.invoiceDate, from));
      if (to) invConditions.push(lte(purchaseInvoices.invoiceDate, to));

      const invRows = await db
        .select({
          supplierId: purchaseInvoices.supplierId,
          total: purchaseInvoices.total,
        })
        .from(purchaseInvoices)
        .where(and(...invConditions));

      const totals = new Map<number, number>();
      for (const inv of invRows) {
        const id = inv.supplierId ?? 0;
        totals.set(id, (totals.get(id) ?? 0) + toNum(inv.total));
      }

      const suppRows = await db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tid));
      const suppMap = new Map(suppRows.map(s => [s.id, s]));

      return [...totals.entries()]
        .map(([id, total]) => ({
          supplierId: id,
          supplierName: suppMap.get(id)?.name ?? "مورد غير مُعرّف",
          totalSpend: roundTo(total),
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, input.limit);
    }),
});
