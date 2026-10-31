import { z } from "zod";
import { router, tenantProcedure, protectedProcedure } from "./_core/trpc";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { accounts, budgets, transactions } from "../drizzle/schema";
import { getDb } from "./db";
import { computeLedgerMetrics } from "./_core/ledgerMetrics";
import { calculateVariance } from "@shared/financialAnalytics/varianceCalculations";
import { requireTenantId } from "./_core/tenant";
import { cachedForTenant, TENANT_CACHE_TTL } from "./_core/tenantCache";
import { safeToNumber, roundTo } from "@shared/numeric";

/**
 * المحاسبة الإدارية — أرقام حقيقية من الدفاتر.
 *
 * ملاحظة مهمة: كل مؤشر هنا يُشتق من `accounts` + `transactions` عبر
 * `computeLedgerMetrics`، ولا توجد قيم ثابتة. إن لم توجد بيانات كافية
 * تُعاد `null` بدل نسبة مفبركة.
 */
export const managerialAccountingRouter = router({
  /**
   * تحليل نقطة التعادل — حاسبة نقية (مدخلات المستخدم فقط)، لا تقرأ الدفاتر.
   * تتطلب تسجيل دخول لأنها حاسبة داخلية والمحرك المرجعي هو الخادم.
   */
  cvpAnalysis: protectedProcedure
    .input(
      z.object({
        fixedCosts: z.number().positive(),
        variableCostPerUnit: z.number().nonnegative(),
        sellingPricePerUnit: z.number().positive(),
        targetProfit: z.number().default(0),
      })
    )
    .query(({ input }) => {
      const {
        fixedCosts,
        variableCostPerUnit,
        sellingPricePerUnit,
        targetProfit,
      } = input;
      const contributionMarginPerUnit =
        sellingPricePerUnit - variableCostPerUnit;
      if (contributionMarginPerUnit <= 0) {
        throw new Error(
          "سعر البيع يجب أن يكون أكبر من التكلفة المتغيرة للوحدة لتحقيق هامش مساهمة إيجابي"
        );
      }

      const contributionMarginRatio =
        contributionMarginPerUnit / sellingPricePerUnit;
      const breakEvenUnits = Math.ceil(fixedCosts / contributionMarginPerUnit);
      const breakEvenRevenue = breakEvenUnits * sellingPricePerUnit;
      const targetUnits = Math.ceil(
        (fixedCosts + targetProfit) / contributionMarginPerUnit
      );
      const targetRevenue = targetUnits * sellingPricePerUnit;

      return {
        contributionMarginPerUnit,
        contributionMarginRatio: Number(
          (contributionMarginRatio * 100).toFixed(2)
        ),
        breakEvenUnits,
        breakEvenRevenue: Number(breakEvenRevenue.toFixed(2)),
        targetUnits,
        targetRevenue: Number(targetRevenue.toFixed(2)),
      };
    }),

  /**
   * المؤشرات المالية — من دفتر الأستاذ الفعلي.
   */
  financialKpis: tenantProcedure
    .input(
      z
        .object({
          periodStart: z.coerce.date().optional(),
          periodEnd: z.coerce.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error(
          "قاعدة البيانات غير متاحة — تعذّر حساب المؤشرات المالية"
        );
      }

      const tenantId = requireTenantId(ctx);
      const periodStart = input?.periodStart
        ? new Date(input.periodStart).toISOString()
        : null;

      // قراءة متكرّرة لنفس الفترة → ذاكرة قصيرة المدى (تُبطَل عند أي كتابة)
      return cachedForTenant(
        tenantId,
        "kpis",
        { periodStart },
        async () => {
          const metrics = await computeLedgerMetrics(
            db,
            tenantId,
            input?.periodStart
          );
          return {
            ...metrics,
            periodStart: input?.periodStart ?? null,
            periodEnd: input?.periodEnd ?? null,
          };
        },
        TENANT_CACHE_TTL.kpis
      );
    }),

  /**
   * تحليل الفروقات — مقارنة فعلية مقابل الميزانية.
   *
   * كان يُرجع `varianceNet = targetRevenue - targetExpense` أي فرق الميزانية
   * مع نفسه (وهو صفر دائماً). الآن يُقارن الفعلي في الفترة بالميزانية
   * المعتمدة لنفس الفترة.
   */
  varianceAnalysis: tenantProcedure
    .input(
      z
        .object({
          periodName: z.string().optional(),
          year: z.number().int().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("قاعدة البيانات غير متاحة — تعذّر تحليل الفروقات");
      }

      const tenantId = requireTenantId(ctx);
      const budgetRows = await db
        .select()
        .from(budgets)
        .where(eq(budgets.tenantId, tenantId));

      const filteredBudgets = budgetRows.filter(b => {
        if (input?.periodName && b.periodName !== input.periodName)
          return false;
        if (input?.year && !String(b.periodName).includes(String(input.year)))
          return false;
        return true;
      });

      if (filteredBudgets.length === 0) return [];

      const results = [];
      for (const budget of filteredBudgets) {
        const { start, end } = resolvePeriodRange(String(budget.periodName));

        // كل ميزانية تُقارن بالحركات الفعلية في الفترة المسماة
        const actualRows = await db
          .select({
            type: transactions.type,
            amount: transactions.amount,
            accountType: accounts.type,
          })
          .from(transactions)
          .innerJoin(accounts, eq(accounts.id, transactions.accountId))
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              sql`${transactions.isReversed} = false`,
              gte(transactions.transactionDate, start),
              lte(transactions.transactionDate, end)
            )
          );

        let actualRevenue = 0;
        let actualExpense = 0;
        for (const row of actualRows) {
          const amount = safeToNumber(row.amount);
          if (row.accountType === "revenue") {
            if (row.type === "credit") actualRevenue += amount;
          } else if (row.accountType === "expense") {
            if (row.type === "debit") actualExpense += amount;
          }
        }

        const budgetRevenue = safeToNumber(budget.targetRevenue);
        const budgetExpense = safeToNumber(budget.targetExpense);

        const revenueVariance = calculateVariance(actualRevenue, budgetRevenue);
        const expenseVariance = calculateVariance(actualExpense, budgetExpense);

        results.push({
          periodName: budget.periodName,
          budgetId: budget.id,
          targetRevenue: roundTo(budgetRevenue, 2),
          targetExpense: roundTo(budgetExpense, 2),
          actualRevenue: roundTo(actualRevenue, 2),
          actualExpense: roundTo(actualExpense, 2),
          revenueVariance,
          expenseVariance,
          /** فرق صافي الميزانية مقابل الفعلي */
          varianceNet: roundTo(
            actualRevenue - actualExpense - (budgetRevenue - budgetExpense),
            2
          ),
          notes: budget.notes,
        });
      }

      return results;
    }),
});

/**
 * يحوّل اسم الفترة (مثل "2026-01" أو "يناير 2026" أو "Q1-2026") إلى نطاق
 * تاريخي. الفترات غير المعروفة تُغطّي نطاق عام (السنة كاملة).
 */
function resolvePeriodRange(periodName: string): { start: Date; end: Date } {
  const yearMatch = periodName.match(/(20\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const monthMatch = periodName.match(/(0?[1-9]|1[0-2])/);
  const qMatch = periodName.match(/q([1-4])/i);

  if (qMatch) {
    const quarter = Number(qMatch[1]);
    const startMonth = (quarter - 1) * 3;
    return {
      start: new Date(Date.UTC(year, startMonth, 1)),
      end: new Date(Date.UTC(year, startMonth + 3, 1)),
    };
  }

  if (monthMatch) {
    const month = Number(monthMatch[1]) - 1;
    return {
      start: new Date(Date.UTC(year, month, 1)),
      end: new Date(Date.UTC(year, month + 1, 1)),
    };
  }

  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}
