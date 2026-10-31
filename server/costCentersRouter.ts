import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import { costCenters, transactions } from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";
import { requireTenantId } from "./_core/tenant";
import { cachedForTenant, TENANT_CACHE_TTL } from "./_core/tenantCache";

export const costCentersRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.tenantId) return [];
    const tenantId = requireTenantId(ctx);
    return cachedForTenant(
      tenantId,
      "costCenters",
      undefined,
      async () =>
        db
          .select()
          .from(costCenters)
          .where(eq(costCenters.tenantId, tenantId))
          .orderBy(costCenters.code),
      TENANT_CACHE_TTL.costCenters
    );
  }),
  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.COST_CENTERS_MANAGE))
    .input(
      z.object({
        code: z.string().min(1).max(30),
        name: z.string().min(1).max(150),
        parentId: z.number().nullable().optional(),
        costType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await db
        .insert(costCenters)
        .values({
          tenantId: ctx.tenantId,
          code: input.code,
          name: input.name,
          parentId: input.parentId ?? null,
          type: (input.costType as any) || "cost",
        })
        .returning();
      return row;
    }),
  remove: tenantProcedure
    .use(requirePermissions(PERMISSIONS.COST_CENTERS_MANAGE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      // منع حذف مركز تكلفة مرتبط بقيود محاسبية — يحمي سلامة دفتر الأستاذ
      const linked = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, ctx.tenantId!),
            eq(transactions.costCenterId, input.id)
          )
        )
        .limit(1);
      if (linked.length > 0) {
        throw new Error(
          "لا يمكن حذف مركز التكلفة — مرتبط بقيود محاسبية. أرشفه بدلاً من حذفه."
        );
      }
      await db
        .delete(costCenters)
        .where(
          and(
            eq(costCenters.id, input.id),
            eq(costCenters.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),
});
