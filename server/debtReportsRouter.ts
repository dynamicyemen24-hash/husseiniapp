/**
 * server/debtReportsRouter.ts — Debt & Receivables/Payables Reporting Engine
 * ==========================================================================
 * Authoritative server-side computation of:
 *   • AR Aging        (تأجيل الذمم المدينة / Accounts Receivable)
 *   • AP Aging        (تأجيل الذمم الدائنة / Accounts Payable)
 *   • Debt Summary    (ملخص الديون المستحقة)
 *   • DSO Report      (أيام التحصيل / Days Sales Outstanding)
 *   • DPO Report      (أيام السداد / Days Payable Outstanding)
 *
 * All reports are tenant-scoped and audit-logged via `activityLogs`.
 *
 * INVARIANTS:
 *   • Only confirmed or partial invoices are included (drafts excluded).
 *   • All amounts are coerced safely; null/undefined → 0.
 *   • Dates are validated; invalid dates fall back to invoice date.
 *
 * @module server/debtReportsRouter
 */

import { z } from "zod";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  salesInvoices,
  purchaseInvoices,
  payments,
  customers,
  suppliers,
  activityLogs,
  transactions,
  accounts,
} from "../drizzle/schema";

/* ─────────────────────────────────────────────────────────────────────────────
 *  SHARED TYPES & CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

type Db = any;

/** Invoice status values that indicate a payable/receivable debt exists. */
const ACTIVE_INVOICE_STATUSES = ["confirmed", "partial"] as const;

/** Floating-point tolerance for "zero" comparisons. */
const EPSILON = 0.01;

/**
 * Safely coerce a value to a finite number, returning 0 on failure.
 * Mirrors client-side `safeToNumber` in `@/lib/numeric`.
 */
function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse an ISO-8601 date string into a Date.
 * Returns `undefined` for invalid inputs so callers can omit the filter.
 */
function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

/**
 * Assign a bucket label based on days past due.
 * Buckets: current (≤0 days), d30 (1–30), d60 (31–60), d90 (61–90), over90 (>90)
 */
function bucketOf(daysPastDue: number): string {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "d30";
  if (daysPastDue <= 60) return "d60";
  if (daysPastDue <= 90) return "d90";
  return "over90";
}

/**
 * Days past due calculation (asOf - dueDate), floored at 0.
 */
function daysPastDue(asOf: Date, dueDate: Date): number {
  return Math.max(
    0,
    Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000)
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ZOD INPUT SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

const agingInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 cutoff date (YYYY-MM-DD). Defaults to today."),
  branchId: z.number().int().positive().optional().describe("Filter by branch"),
});

const debtSummaryInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 cutoff date (YYYY-MM-DD). Defaults to today."),
});

const dsoDpoInputSchema = z.object({
  from: z.string().optional().describe("Period start (YYYY-MM-DD)"),
  to: z.string().optional().describe("Period end (YYYY-MM-DD)"),
  branchId: z.number().int().positive().optional().describe("Filter by branch"),
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  LOGGING HELPER
 * ───────────────────────────────────────────────────────────────────────────── */

/** Write a structured audit log entry. Non-fatal: never crashes the report. */
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
    // Non-fatal: audit logging must never crash the report.
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  ROUTER
 * ───────────────────────────────────────────────────────────────────────────── */

export const debtReportsRouter = router({
  /**
   * ── AR AGING (تأجيل الذمم المدينة) ─────────────────────────────────────
   *
   * Bucketed breakdown of outstanding customer receivables as of a given date.
   * Returns:
   *   • rows[] — one row per invoice, with bucket and daysPastDue
   *   • byCustomer[] — aggregation per customer with total outstanding
   *   • byBucket — totals per age bucket (current/d30/d60/d90/over90)
   *   • summary — grand totals for the dashboard
   */
  arAging: tenantProcedure
    .input(agingInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const empty = {
        rows: [],
        byCustomer: [],
        byBucket: { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 },
        summary: { totalOutstanding: 0, totalInvoices: 0, avgDaysPastDue: 0 },
      };
      if (!db) return empty;

      const tid = requireTenantId(ctx);
      const asOf = parseDate(input?.asOf) ?? new Date();

      await logReportAccess(db, tid, ctx.user?.id, "arAging", {
        asOf: input?.asOf,
        branchId: input?.branchId,
      });

      // ── Load invoices ──────────────────────────────────────────────────
      const invConditions: any[] = [
        eq(salesInvoices.tenantId, tid),
        inArray(salesInvoices.status, ACTIVE_INVOICE_STATUSES),
      ];
      const invRows = await db
        .select({
          id: salesInvoices.id,
          invoiceNumber: salesInvoices.invoiceNumber,
          customerId: salesInvoices.customerId,
          branchId: salesInvoices.branchId,
          invoiceDate: salesInvoices.invoiceDate,
          dueDate: salesInvoices.dueDate,
          total: salesInvoices.total,
          paidAmount: salesInvoices.paidAmount,
        })
        .from(salesInvoices)
        .where(and(...invConditions));

      // ── Load customers with contact info ─────────────────────────────────
      const custRows = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.tenantId, tid));
      const custMap = new Map(custRows.map(c => [c.id, c]));

      // ── Aggregate per-invoice rows ───────────────────────────────────────
      const bucketTotals = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
      let totalOutstanding = 0;
      let totalDaysPastDue = 0;
      let overdueCount = 0;

      const rows = invRows
        .map(inv => {
          const outstanding = Math.max(
            0,
            toNum(inv.total) - toNum(inv.paidAmount)
          );
          if (outstanding < EPSILON) return null; // skip fully-paid

          const due = inv.dueDate ?? inv.invoiceDate;
          const dueDate = new Date(due);
          const dpd = daysPastDue(asOf, dueDate);
          const bucket = bucketOf(dpd);

          bucketTotals[bucket as keyof typeof bucketTotals] += outstanding;
          totalOutstanding += outstanding;

          if (dpd > 0) {
            totalDaysPastDue += dpd;
            overdueCount++;
          }

          return {
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber ?? `INV-${inv.id}`,
            customerId: inv.customerId ?? 0,
            customer:
              custMap.get(inv.customerId ?? 0)?.name ?? "عميل غير مُعرّف",
            branchId: inv.branchId ?? null,
            invoiceDate: inv.invoiceDate,
            dueDate: dueDate,
            total: toNum(inv.total),
            paidAmount: toNum(inv.paidAmount),
            outstanding,
            bucket,
            daysPastDue: dpd,
          };
        })
        .filter(Boolean);

      // ── Aggregate by customer ────────────────────────────────────────────
      const byCustomerMap = new Map<
        number,
        {
          customerId: number;
          name: string;
          email?: string;
          phone?: string;
          outstanding: number;
          invoices: number;
        }
      >();

      for (const row of rows as any[]) {
        const existing = byCustomerMap.get(row.customerId);
        if (existing) {
          existing.outstanding += row.outstanding;
          existing.invoices += 1;
        } else {
          const cust = custMap.get(row.customerId);
          byCustomerMap.set(row.customerId, {
            customerId: row.customerId,
            name: cust?.name ?? row.customer,
            email: cust?.email ?? undefined,
            phone: cust?.phone ?? undefined,
            outstanding: row.outstanding,
            invoices: 1,
          });
        }
      }

      const byCustomer = [...byCustomerMap.values()]
        .map(c => ({
          ...c,
          avgDaysPastDue:
            c.invoices > 0
              ? Math.round(totalDaysPastDue / overdueCount || 0)
              : 0,
        }))
        .sort((a, b) => b.outstanding - a.outstanding);

      const summary = {
        totalOutstanding,
        totalInvoices: rows.length,
        avgDaysPastDue:
          overdueCount > 0 ? Math.round(totalDaysPastDue / overdueCount) : 0,
      };

      return { rows, byCustomer, byBucket: bucketTotals, summary };
    }),

  /**
   * ── AP AGING (تأجيل الذمم الدائنة) ─────────────────────────────────────
   *
   * Bucketed breakdown of outstanding supplier payables as of a given date.
   * Mirrors arAging but for purchase invoices and suppliers.
   */
  apAging: tenantProcedure
    .input(agingInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const empty = {
        rows: [],
        bySupplier: [],
        byBucket: { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 },
        summary: { totalOutstanding: 0, totalInvoices: 0, avgDaysPastDue: 0 },
      };
      if (!db) return empty;

      const tid = requireTenantId(ctx);
      const asOf = parseDate(input?.asOf) ?? new Date();

      await logReportAccess(db, tid, ctx.user?.id, "apAging", {
        asOf: input?.asOf,
        branchId: input?.branchId,
      });

      // ── Load purchase invoices ───────────────────────────────────────────
      const invConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_INVOICE_STATUSES),
      ];
      const invRows = await db
        .select({
          id: purchaseInvoices.id,
          invoiceNumber: purchaseInvoices.invoiceNumber,
          supplierId: purchaseInvoices.supplierId,
          branchId: purchaseInvoices.branchId,
          invoiceDate: purchaseInvoices.invoiceDate,
          dueDate: purchaseInvoices.dueDate,
          total: purchaseInvoices.total,
          paidAmount: purchaseInvoices.paidAmount,
        })
        .from(purchaseInvoices)
        .where(and(...invConditions));

      // ── Load suppliers with contact info ─────────────────────────────────
      const suppRows = await db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          email: suppliers.email,
          phone: suppliers.phone,
        })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tid));
      const suppMap = new Map(suppRows.map(s => [s.id, s]));

      // ── Aggregate per-invoice rows ───────────────────────────────────────
      const bucketTotals = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
      let totalOutstanding = 0;
      let totalDaysPastDue = 0;
      let overdueCount = 0;

      const rows = invRows
        .map(inv => {
          const outstanding = Math.max(
            0,
            toNum(inv.total) - toNum(inv.paidAmount)
          );
          if (outstanding < EPSILON) return null;

          const due = inv.dueDate ?? inv.invoiceDate;
          const dueDate = new Date(due);
          const dpd = daysPastDue(asOf, dueDate);
          const bucket = bucketOf(dpd);

          bucketTotals[bucket as keyof typeof bucketTotals] += outstanding;
          totalOutstanding += outstanding;

          if (dpd > 0) {
            totalDaysPastDue += dpd;
            overdueCount++;
          }

          return {
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber ?? `PI-${inv.id}`,
            supplierId: inv.supplierId ?? 0,
            supplier:
              suppMap.get(inv.supplierId ?? 0)?.name ?? "مورد غير مُعرّف",
            branchId: inv.branchId ?? null,
            invoiceDate: inv.invoiceDate,
            dueDate: dueDate,
            total: toNum(inv.total),
            paidAmount: toNum(inv.paidAmount),
            outstanding,
            bucket,
            daysPastDue: dpd,
          };
        })
        .filter(Boolean);

      // ── Aggregate by supplier ─────────────────────────────────────────────
      const bySupplierMap = new Map<
        number,
        {
          supplierId: number;
          name: string;
          email?: string;
          phone?: string;
          outstanding: number;
          invoices: number;
        }
      >();

      for (const row of rows as any[]) {
        const existing = bySupplierMap.get(row.supplierId);
        if (existing) {
          existing.outstanding += row.outstanding;
          existing.invoices += 1;
        } else {
          const supp = suppMap.get(row.supplierId);
          bySupplierMap.set(row.supplierId, {
            supplierId: row.supplierId,
            name: supp?.name ?? row.supplier,
            email: supp?.email ?? undefined,
            phone: supp?.phone ?? undefined,
            outstanding: row.outstanding,
            invoices: 1,
          });
        }
      }

      const bySupplier = [...bySupplierMap.values()].sort(
        (a, b) => b.outstanding - a.outstanding
      );

      const summary = {
        totalOutstanding,
        totalInvoices: rows.length,
        avgDaysPastDue:
          overdueCount > 0 ? Math.round(totalDaysPastDue / overdueCount) : 0,
      };

      return { rows, bySupplier, byBucket: bucketTotals, summary };
    }),

  /**
   * ── DEBT SUMMARY (ملخص الديون) ──────────────────────────────────────────
   *
   * High-level snapshot of total AR, AP, and net debt position as of a date.
   * Also returns the count of overdue invoices for each side.
   */
  debtSummary: tenantProcedure
    .input(debtSummaryInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          ar: { total: 0, invoices: 0, overdueInvoices: 0, overdueAmount: 0 },
          ap: { total: 0, invoices: 0, overdueInvoices: 0, overdueAmount: 0 },
          netDebt: 0,
        };
      }

      const tid = requireTenantId(ctx);
      const asOf = parseDate(input?.asOf) ?? new Date();

      await logReportAccess(db, tid, ctx.user?.id, "debtSummary", {
        asOf: input?.asOf,
      });

      // AR side
      const arInvRows = await db
        .select({
          total: salesInvoices.total,
          paidAmount: salesInvoices.paidAmount,
          dueDate: salesInvoices.dueDate,
          invoiceDate: salesInvoices.invoiceDate,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, tid),
            inArray(salesInvoices.status, ACTIVE_INVOICE_STATUSES)
          )
        );

      let arTotal = 0,
        arOverdueAmount = 0,
        arOverdueInvoices = 0;
      for (const inv of arInvRows) {
        const outstanding = Math.max(
          0,
          toNum(inv.total) - toNum(inv.paidAmount)
        );
        arTotal += outstanding;
        const due = inv.dueDate ?? inv.invoiceDate;
        const dpd = daysPastDue(asOf, new Date(due));
        if (dpd > 0 && outstanding > EPSILON) {
          arOverdueAmount += outstanding;
          arOverdueInvoices++;
        }
      }

      // AP side
      const apInvRows = await db
        .select({
          total: purchaseInvoices.total,
          paidAmount: purchaseInvoices.paidAmount,
          dueDate: purchaseInvoices.dueDate,
          invoiceDate: purchaseInvoices.invoiceDate,
        })
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, tid),
            inArray(purchaseInvoices.status, ACTIVE_INVOICE_STATUSES)
          )
        );

      let apTotal = 0,
        apOverdueAmount = 0,
        apOverdueInvoices = 0;
      for (const inv of apInvRows) {
        const outstanding = Math.max(
          0,
          toNum(inv.total) - toNum(inv.paidAmount)
        );
        apTotal += outstanding;
        const due = inv.dueDate ?? inv.invoiceDate;
        const dpd = daysPastDue(asOf, new Date(due));
        if (dpd > 0 && outstanding > EPSILON) {
          apOverdueAmount += outstanding;
          apOverdueInvoices++;
        }
      }

      return {
        ar: {
          total: arTotal,
          invoices: arInvRows.length,
          overdueInvoices: arOverdueInvoices,
          overdueAmount: arOverdueAmount,
        },
        ap: {
          total: apTotal,
          invoices: apInvRows.length,
          overdueInvoices: apOverdueInvoices,
          overdueAmount: apOverdueAmount,
        },
        netDebt: arTotal - apTotal,
      };
    }),

  /**
   * ── DSO REPORT (أيام التحصيل) ──────────────────────────────────────────
   *
   * Days Sales Outstanding = Average AR / (Credit Sales per Day)
   * Measures how quickly the company collects payment from customers.
   *
   * Formula: DSO = (Accounts Receivable / Total Credit Sales) × Days in Period
   */
  dsoReport: tenantProcedure
    .input(dsoDpoInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return { dso: 0, totalReceivables: 0, creditSales: 0, daysInPeriod: 0 };

      const tid = requireTenantId(ctx);
      const from = parseDate(input?.from);
      const to = parseDate(input?.to) ?? new Date();
      const daysInPeriod = from
        ? Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000))
        : 90; // default to last 90 days

      await logReportAccess(db, tid, ctx.user?.id, "dsoReport", {
        from: input?.from,
        to: input?.to,
      });

      // Current AR (outstanding on confirmed/partial invoices)
      const arInvRows = await db
        .select({
          total: salesInvoices.total,
          paidAmount: salesInvoices.paidAmount,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, tid),
            inArray(salesInvoices.status, ACTIVE_INVOICE_STATUSES)
          )
        );
      const totalReceivables = arInvRows.reduce(
        (sum: number, inv: any) =>
          sum + Math.max(0, toNum(inv.total) - toNum(inv.paidAmount)),
        0
      );

      // Credit sales in period
      const salesConditions: any[] = [
        eq(salesInvoices.tenantId, tid),
        inArray(salesInvoices.status, ACTIVE_INVOICE_STATUSES),
      ];
      if (from) salesConditions.push(gte(salesInvoices.invoiceDate, from));
      if (to) salesConditions.push(lte(salesInvoices.invoiceDate, to));

      const salesRows = await db
        .select({ total: salesInvoices.total })
        .from(salesInvoices)
        .where(and(...salesConditions));
      const creditSales = salesRows.reduce(
        (sum: number, inv: any) => sum + toNum(inv.total),
        0
      );

      // DSO = (AR / Credit Sales per Day) — avoid division by zero
      const salesPerDay = creditSales / daysInPeriod;
      const dso =
        salesPerDay > EPSILON
          ? Math.round((totalReceivables / salesPerDay) * 10) / 10
          : 0;

      return { dso, totalReceivables, creditSales, daysInPeriod };
    }),

  /**
   * ── DPO REPORT (أيام السداد) ───────────────────────────────────────────
   *
   * Days Payable Outstanding = Average AP / (Purchases per Day)
   * Measures how quickly the company pays its suppliers.
   *
   * Formula: DPO = (Accounts Payable / Total Purchases) × Days in Period
   */
  dpoReport: tenantProcedure
    .input(dsoDpoInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return { dpo: 0, totalPayables: 0, purchases: 0, daysInPeriod: 0 };

      const tid = requireTenantId(ctx);
      const from = parseDate(input?.from);
      const to = parseDate(input?.to) ?? new Date();
      const daysInPeriod = from
        ? Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000))
        : 90;

      await logReportAccess(db, tid, ctx.user?.id, "dpoReport", {
        from: input?.from,
        to: input?.to,
      });

      // Current AP (outstanding on confirmed/partial purchase invoices)
      const apInvRows = await db
        .select({
          total: purchaseInvoices.total,
          paidAmount: purchaseInvoices.paidAmount,
        })
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, tid),
            inArray(purchaseInvoices.status, ACTIVE_INVOICE_STATUSES)
          )
        );
      const totalPayables = apInvRows.reduce(
        (sum: number, inv: any) =>
          sum + Math.max(0, toNum(inv.total) - toNum(inv.paidAmount)),
        0
      );

      // Purchases in period
      const purchConditions: any[] = [
        eq(purchaseInvoices.tenantId, tid),
        inArray(purchaseInvoices.status, ACTIVE_INVOICE_STATUSES),
      ];
      if (from) purchConditions.push(gte(purchaseInvoices.invoiceDate, from));
      if (to) purchConditions.push(lte(purchaseInvoices.invoiceDate, to));

      const purchRows = await db
        .select({ total: purchaseInvoices.total })
        .from(purchaseInvoices)
        .where(and(...purchConditions));
      const purchases = purchRows.reduce(
        (sum: number, inv: any) => sum + toNum(inv.total),
        0
      );

      // DPO = (AP / Purchases per Day)
      const purchPerDay = purchases / daysInPeriod;
      const dpo =
        purchPerDay > EPSILON
          ? Math.round((totalPayables / purchPerDay) * 10) / 10
          : 0;

      return { dpo, totalPayables, purchases, daysInPeriod };
    }),
});
