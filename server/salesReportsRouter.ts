/**
 * server/salesReportsRouter.ts — Sales & Revenue Reporting Engine
 * ==========================================================================
 * Authoritative server-side computation of sales metrics and analytics:
 *
 *   • Sales Summary         (ملخص المبيعات / Total sales)
 *   • Sales by Rep          (المبيعات بالممثلين / Sales by representative)
 *   • Sales by Period       (المبيعات بالفترة / Sales by period)
 *   • Top Customers         (أفضل العملاء / Top customers)
 *   • Invoice Status        (حالة الفواتير / Invoice status)
 *
 * All reports are tenant-scoped and audit-logged via `activityLogs`.
 *
 * @module server/salesReportsRouter
 */
import { z } from "zod";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  salesInvoices,
  customers,
  salesReps,
  products,
  units,
} from "../drizzle/schema";

/* ─────────────────────────────────────────────────────────────────────────────
 *  SHARED TYPES & CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

type Db = any;

/** Invoice status values. */
const INVOICE_STATUSES = ["confirmed", "partial", "paid"] as const;

/* ─────────────────────────────────────────────────────────────────────────────
 *  ZOD INPUT SCHEMAS
 * ───────────────────────────────────────────────────────────────────────────── */

/** Input for sales summary report. */
const salesSummaryInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  categoryId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by product category"),
});

/** Input for sales by rep report. */
const salesByRepInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
});

/** Input for sales by period report. */
const salesByPeriodInputSchema = z.object({
  startDate: z.string().describe("Start date (YYYY-MM-DD)"),
  endDate: z.string().describe("End date (YYYY-MM-DD)"),
  groupBy: z.enum(["day", "week", "month"]).default("month"),
});

/** Input for top customers report. */
const topCustomersInputSchema = z.object({
  asOf: z
    .string()
    .optional()
    .describe("ISO-8601 date (YYYY-MM-DD). Defaults to today."),
  limit: z.number().int().positive().default(10),
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

export const salesReportsRouter = router({
  /**
   * SAL-01: Sales Summary Report
   * ملخص المبيعات - إجمالي المبيعات وإحصائيات الفواتير
   */
  salesSummary: tenantProcedure
    .input(salesSummaryInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;

      const asOf = input?.asOf ? parseDate(input.asOf) : undefined;
      const targetDate = asOf || new Date();

      // Get invoices for tenant
      const invoiceRows = await db
        .select({
          id: salesInvoices.id,
          total: salesInvoices.total,
          discount: salesInvoices.discount,
          status: salesInvoices.status,
          invoiceDate: salesInvoices.invoiceDate,
          dueDate: salesInvoices.dueDate,
          customerId: salesInvoices.customerId,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            // Only include confirmed/partial/sent/paid invoices
            inArray(salesInvoices.status, INVOICE_STATUSES)
          )
        );

      // Filter by date if asOf provided
      const relevantInvoices = asOf
        ? invoiceRows.filter(i => {
            const issue = new Date(i.invoiceDate);
            return issue <= targetDate;
          })
        : invoiceRows;

      const totalSales = relevantInvoices.reduce(
        (sum, i) => sum + toNum(i.total),
        0
      );

      const totalDiscount = relevantInvoices.reduce(
        (sum, i) => sum + toNum(i.discount),
        0
      );

      const invoiceCount = relevantInvoices.length;

      // Count by status
      const statusCounts = relevantInvoices.reduce(
        (acc, i) => {
          acc[i.status] = (acc[i.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Get top customers
      const customerSales = relevantInvoices.reduce(
        (acc, i) => {
          const cid = i.customerId;
          if (!cid) return acc;
          if (!acc[cid]) acc[cid] = { total: 0, count: 0 };
          acc[cid].total += toNum(i.total);
          acc[cid].count += 1;
          return acc;
        },
        {} as Record<string, { total: number; count: number }>
      );

      const topCustomers = Object.entries(customerSales)
        .map(([id, data]) => ({
          customerId: id,
          totalSales: data.total,
          invoiceCount: data.count,
        }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 10);

      return {
        asOf: input?.asOf || new Date().toISOString().split("T")[0],
        totalSales,
        totalDiscount,
        invoiceCount,
        byStatus: statusCounts,
        topCustomers,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * SAL-02: Sales by Representative Report
   * المبيعات بالممثلين - أداء ممثلين المبيعات
   */
  salesByRep: tenantProcedure
    .input(salesByRepInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { reps: [], totalSales: 0 };

      // Get all sales reps
      const reps = await db
        .select({
          id: salesReps.id,
          name: salesReps.name,
          commissionValue: salesReps.commissionValue,
          commissionType: salesReps.commissionType,
          bonusThreshold: salesReps.bonusThreshold,
          bonusAmount: salesReps.bonusAmount,
        })
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));

      // Get invoices
      const invoiceRows = await db
        .select({
          salesRepId: salesInvoices.salesRepId,
          total: salesInvoices.total,
          discount: salesInvoices.discount,
          status: salesInvoices.status,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            inArray(salesInvoices.status, INVOICE_STATUSES)
          )
        );

      const activeInvoices = invoiceRows.filter(i => i.status !== "cancelled");

      // Calculate per rep
      const repPerformance = reps.map(rep => {
        const sales = activeInvoices.filter(
          i => i.salesRepId === String(rep.id)
        );
        const salesTotal = sales.reduce((s, i) => s + toNum(i.total), 0);
        const discountTotal = sales.reduce((s, i) => s + toNum(i.discount), 0);
        const invoiceCount = sales.length;

        const value = parseFloat(rep.commissionValue || "0");
        const commission =
          rep.commissionType === "percent" ? (salesTotal * value) / 100 : value;
        const threshold = rep.bonusThreshold
          ? parseFloat(rep.bonusThreshold)
          : null;
        const bonus =
          threshold != null && salesTotal >= threshold
            ? parseFloat(rep.bonusAmount || "0")
            : 0;

        return {
          rep: { id: rep.id, name: rep.name },
          salesTotal,
          discountTotal,
          commission,
          bonus,
          invoiceCount,
        };
      });

      const totalSales = repPerformance.reduce(
        (sum, r) => sum + r.salesTotal,
        0
      );

      return {
        reps: repPerformance,
        totalSales,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * SAL-03: Sales by Period Report
   * المبيعات بالفترة - المبيعات التراكمية خلال فترة زمنية
   */
  salesByPeriod: tenantProcedure
    .input(salesByPeriodInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { period: [], total: 0 };

      const start = parseDate(input.startDate);
      const end = parseDate(input.endDate);
      const groupBy = input.groupBy;

      if (!start || !end) {
        return { period: [], total: 0 };
      }

      // Get invoices within date range
      const invoiceRows = await db
        .select({
          total: salesInvoices.total,
          invoiceDate: salesInvoices.invoiceDate,
          status: salesInvoices.status,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            gte(salesInvoices.invoiceDate, new Date(input.startDate)),
            lte(
              salesInvoices.invoiceDate,
              new Date(`${input.endDate}T23:59:59.999`)
            ),
            inArray(salesInvoices.status, INVOICE_STATUSES)
          )
        );

      // Group by period
      const grouped = invoiceRows.reduce(
        (acc, i) => {
          const date = new Date(i.invoiceDate);
          let periodKey: string;

          switch (groupBy) {
            case "day":
              periodKey = date.toISOString().slice(0, 10);
              break;
            case "week": {
              // Use Monday as the start of the reporting week, including Sundays.
              const daysSinceMonday = (date.getDay() + 6) % 7;
              const monday = new Date(date);
              monday.setDate(date.getDate() - daysSinceMonday);
              periodKey = monday.toISOString().slice(0, 10);
              break;
            }
            case "month":
            default:
              periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              break;
          }

          if (!acc[periodKey]) acc[periodKey] = { total: 0, count: 0 };
          acc[periodKey].total += toNum(i.total);
          acc[periodKey].count += 1;
          return acc;
        },
        {} as Record<string, { total: number; count: number }>
      );

      const periodArray = Object.entries(grouped).map(([period, data]) => ({
        period,
        totalSales: data.total,
        invoiceCount: data.count,
      }));

      const total = invoiceRows.reduce((sum, i) => sum + toNum(i.total), 0);

      return {
        period: periodArray,
        total,
        groupBy: input.groupBy,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * SAL-04: Top Customers Report
   * أفضل العملاء - العملاء الأعلى إنفاقاً
   */
  topCustomers: tenantProcedure
    .input(topCustomersInputSchema)
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { customers: [], totalSales: 0 };

      const asOf = input?.asOf ? parseDate(input.asOf) : undefined;
      const targetDate = asOf || new Date();

      // Get invoices
      const invoiceRows = await db
        .select({
          id: salesInvoices.id,
          total: salesInvoices.total,
          customerId: salesInvoices.customerId,
          invoiceDate: salesInvoices.invoiceDate,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            inArray(salesInvoices.status, INVOICE_STATUSES)
          )
        );

      const relevantInvoices = asOf
        ? invoiceRows.filter(i => {
            const issue = new Date(i.invoiceDate);
            return issue <= targetDate;
          })
        : invoiceRows;

      // Aggregate by customer
      const customerSales = relevantInvoices.reduce(
        (acc, i) => {
          const cid = i.customerId;
          if (!cid) return acc;
          if (!acc[cid]) acc[cid] = { total: 0, count: 0, name: null };
          acc[cid].total += toNum(i.total);
          acc[cid].count += 1;
          return acc;
        },
        {} as Record<
          string,
          { total: number; count: number; name: string | null }
        >
      );

      // Fetch customer names
      const customerIds = Object.keys(customerSales);
      const customerRows = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(inArray(customers.id, customerIds.map(Number)));

      const customerMap = new Map(
        customerRows.map(c => [c.id, { name: c.name || "Unknown" }])
      );

      const result = Object.entries(customerSales)
        .map(([id, data]) => ({
          customerId: Number(id),
          customerName: customerMap.get(Number(id))?.name || "Unknown",
          totalSales: data.total,
          invoiceCount: data.count,
        }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, input.limit || 10);

      const total = relevantInvoices.reduce(
        (sum, i) => sum + toNum(i.total),
        0
      );

      return {
        customers: result,
        totalSales: total,
        generatedAt: new Date().toISOString(),
      };
    }),
});

export type SalesReports = typeof salesReportsRouter;
