import { z } from "zod";
import { router, tenantProcedure, protectedProcedure } from "./_core/trpc";
import { eq, and, sql } from "drizzle-orm";
import { costCenters, transactions } from "../drizzle/schema";
import { getDb } from "./db";
import { requireTenantId } from "./_core/tenant";
import { safeToNumber, roundTo } from "@shared/numeric";

/**
 * محاسبة التكاليف المتقدمة — توزيع الأنشطة (ABC) وفروقات التكاليف.
 *
 * الحاسابات تعمل على مدخلات المستخدم (لا تقرأ الدفاتر) لكنها حاسبات داخلية
 * ف تتطلب جلسة مسجّلة. مراكز التكلفة تُتحقق من انتمائها للمؤسسة قبل
 * توزيع أي مبلغ عليها.
 */
export const advancedCostAccountingRouter = router({
  abcAllocation: protectedProcedure
    .input(
      z.object({
        poolName: z.string().min(1),
        totalPoolCost: z.number().positive(),
        costDrivers: z
          .array(
            z.object({
              costCenterId: z.number().int().positive(),
              driverQuantity: z.number().positive(),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const totalDrivers = input.costDrivers.reduce(
        (sum, d) => sum + d.driverQuantity,
        0
      );
      if (totalDrivers <= 0) {
        throw new Error("إجمالي محفزات التكلفة يجب أن يكون أكبر من صفر");
      }
      const allocationRate = input.totalPoolCost / totalDrivers;
      const tenantId = requireTenantId(ctx);

      // التحقق من أن مراكز التكلفة تخص المؤسسة
      const db = await getDb();
      if (db) {
        const centerIds = [
          ...new Set(input.costDrivers.map(d => d.costCenterId)),
        ];
        const validCenters = await db
          .select({ id: costCenters.id })
          .from(costCenters)
          .where(
            and(
              sql`${costCenters.id} IN ${centerIds}`,
              eq(costCenters.tenantId, tenantId)
            )
          );
        if (validCenters.length !== centerIds.length) {
          throw new Error("بعض مراكز التكلفة المحددة لا تخص هذه المؤسسة");
        }
      }

      const allocations = input.costDrivers.map(d => {
        const allocatedAmount = d.driverQuantity * allocationRate;
        return {
          costCenterId: d.costCenterId,
          driverQuantity: d.driverQuantity,
          allocatedAmount: Number(allocatedAmount.toFixed(2)),
        };
      });

      return {
        poolName: input.poolName,
        totalPoolCost: input.totalPoolCost,
        allocationRate: Number(allocationRate.toFixed(4)),
        allocations,
      };
    }),

  costVariance: protectedProcedure
    .input(
      z.object({
        standardQty: z.number().positive(),
        actualQty: z.number().positive(),
        standardPrice: z.number().positive(),
        actualPrice: z.number().positive(),
      })
    )
    .query(({ input }) => {
      const { standardQty, actualQty, standardPrice, actualPrice } = input;
      const materialPriceVariance = (standardPrice - actualPrice) * actualQty;
      const materialUsageVariance = (standardQty - actualQty) * standardPrice;
      const totalCostVariance =
        standardQty * standardPrice - actualQty * actualPrice;

      return {
        materialPriceVariance: Number(materialPriceVariance.toFixed(2)),
        materialUsageVariance: Number(materialUsageVariance.toFixed(2)),
        totalCostVariance: Number(totalCostVariance.toFixed(2)),
        favorable: totalCostVariance >= 0,
      };
    }),

  costCenterSummary: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = requireTenantId(ctx);

    // أرصدة كل مركز تكلفة من الحركات الفعلية — لا أرقام ثابتة
    const centers = await db
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        type: costCenters.type,
        allocationBase: costCenters.allocationBase,
      })
      .from(costCenters)
      .where(eq(costCenters.tenantId, tenantId));

    if (centers.length === 0) return [];

    const totals = await db
      .select({
        costCenterId: transactions.costCenterId,
        amount: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .groupBy(transactions.costCenterId);

    const totalByCenter = new Map<number, number>();
    for (const row of totals) {
      if (row.costCenterId == null) continue;
      totalByCenter.set(row.costCenterId, safeToNumber(row.amount));
    }

    return centers.map(cc => ({
      id: cc.id,
      code: cc.code,
      name: cc.name,
      type: cc.type,
      allocationBase: cc.allocationBase,
      actualAmount: roundTo(totalByCenter.get(cc.id) ?? 0, 2),
    }));
  }),
});
