import { eq, and, inArray, sql, count } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { salesReps, salesInvoices, offers } from "../drizzle/schema";

/**
 * reportsRouter — منفصل معيارياً لتقارير الربحية والتحليلات التشغيلية
 * تم استخراجه من modulesRouter لخفض ترابط النواة وتحسين قابلية الاختبار
 *
 * Computes real values from the ledger-backed source tables instead of
 * returning fabricated zero placeholders.
 */
export const reportsRouter = router({
  profitability: tenantProcedure.query(async ({ ctx }) => {
    const empty = {
      byRep: [] as Array<{
        rep: { id: number; name: string };
        salesTotal: number;
        commission: number;
        bonus: number;
      }>,
      discountTotal: 0,
      discountedInvoices: 0,
      offers: 0,
    };
    if (!ctx.tenantId) return empty;
    const db = await getDb();
    if (!db) return empty;

    const reps = await db
      .select()
      .from(salesReps)
      .where(eq(salesReps.tenantId, ctx.tenantId));

    const invoiceRows = await db
      .select({
        salesRepId: salesInvoices.salesRepId,
        total: salesInvoices.total,
        discount: salesInvoices.discount,
        status: salesInvoices.status,
      })
      .from(salesInvoices)
      .where(eq(salesInvoices.tenantId, ctx.tenantId));

    const activeInvoices = invoiceRows.filter(i => i.status !== "cancelled");

    let discountTotal = 0;
    let discountedInvoices = 0;
    for (const i of activeInvoices) {
      const d = parseFloat(i.discount || "0");
      if (d > 0) {
        discountTotal += d;
        discountedInvoices += 1;
      }
    }

    const [offersCount] = await db
      .select({ n: count() })
      .from(offers)
      .where(and(eq(offers.tenantId, ctx.tenantId), eq(offers.isActive, true)));

    const repIds = reps.map(r => String(r.id));
    const perf = reps.map(r => {
      const sales = activeInvoices.filter(i => i.salesRepId === String(r.id));
      const salesTotal = sales.reduce(
        (s, i) => s + parseFloat(i.total || "0"),
        0
      );
      const value = parseFloat(r.commissionValue || "0");
      const commission =
        r.commissionType === "percent" ? (salesTotal * value) / 100 : value;
      const threshold = r.bonusThreshold ? parseFloat(r.bonusThreshold) : null;
      const bonus =
        threshold != null && salesTotal >= threshold
          ? parseFloat(r.bonusAmount || "0")
          : 0;
      return {
        rep: { id: r.id, name: r.name },
        salesTotal,
        commission,
        bonus,
        hasSales: sales.length > 0,
      };
    });

    return {
      byRep: perf
        .filter(p => p.hasSales || repIds.length === 0)
        .map(({ hasSales, ...rest }) => rest),
      discountTotal,
      discountedInvoices,
      offers: Number(offersCount?.n ?? 0),
    };
  }),
});
