/**
 * server/fiscalPeriodsRouter.ts — Fiscal Period Management (إدارة الفترات المالية)
 *
 * Enables the previously-dead `fiscal_periods` table: create/list/open/close/reopen.
 * Combined with `accountingEngine.assertPeriodOpen`, this gives real period-lock
 * control so no posting can land in a locked period without an exceptional reopen.
 *
 * Model:
 *   open   ──► closing ──► closed        (close locks the period & records actor)
 *   closed ──► reopened                   (reopen is exceptional & requires a reason)
 *
 * Non-destructive: the `closing.execute` flow is wired to mark a matching period
 * closed once everything posts (see routers.ts).
 */
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  router,
  tenantProcedure,
  adminProcedure,
  requirePermissions,
} from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { cachedForTenant, TENANT_CACHE_TTL } from "./_core/tenantCache";
import { getDb } from "./db";
import { fiscalPeriods, activityLogs } from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";

export const fiscalPeriodsRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = requireTenantId(ctx);
    return cachedForTenant(
      tenantId,
      "fiscalPeriods",
      undefined,
      async () =>
        db
          .select()
          .from(fiscalPeriods)
          .where(eq(fiscalPeriods.tenantId, tenantId))
          .orderBy(desc(fiscalPeriods.startDate)),
      TENANT_CACHE_TTL.fiscalPeriods
    );
  }),

  create: adminProcedure
    .use(requirePermissions(PERMISSIONS.FISCAL_PERIODS_MANAGE))
    .input(
      z.object({
        name: z.string().min(1).max(50),
        label: z.string().max(100).optional(),
        startDate: z.string(),
        endDate: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tid = requireTenantId(ctx);
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
        throw new Error("تواريخ غير صحيحة");
      if (startDate > endDate)
        throw new Error("تاريخ البداية يجب أن يسبق تاريخ النهاية");

      const existing = await db
        .select()
        .from(fiscalPeriods)
        .where(
          and(
            eq(fiscalPeriods.tenantId, tid),
            eq(fiscalPeriods.name, input.name)
          )
        )
        .limit(1);
      if (existing.length > 0)
        throw new Error("توجد فترة مالية بنفس الاسم لهذه المؤسسة");

      const [row] = await db
        .insert(fiscalPeriods)
        .values({
          tenantId: tid,
          name: input.name,
          label: input.label || input.name,
          startDate,
          endDate,
          status: "open",
          notes: input.notes || null,
        })
        .returning();
      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `إنشاء فترة مالية: ${input.name}`,
        details: `${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`,
      });
      return row;
    }),

  /** Mark a period closed (locks posting into its range). */
  close: adminProcedure
    .use(requirePermissions(PERMISSIONS.PERIOD_CLOSURES_EXECUTE))
    .input(
      z.object({ periodId: z.number(), closingEntryId: z.number().optional() })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tid = requireTenantId(ctx);
      const existing = await db
        .select()
        .from(fiscalPeriods)
        .where(
          and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.tenantId, tid)
          )
        )
        .limit(1);
      if (existing.length === 0) throw new Error("الفترة المالية غير موجودة");
      const period = existing[0];
      if (period.status === "closed")
        throw new Error(`الفترة "${period.name}" مغلقة مسبقاً`);
      if (period.status === "closing")
        throw new Error(`الفترة "${period.name}" قيد الإغلاق`);

      await db
        .update(fiscalPeriods)
        .set({
          status: "closed",
          closedAt: new Date(),
          closedById: ctx.user.id,
          closingEntryId: input.closingEntryId ?? period.closingEntryId ?? null,
        })
        .where(eq(fiscalPeriods.id, period.id));

      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `إقفال الفترة المالية: ${period.name}`,
        details:
          "تم قفل الفترة — لا يمكن الترحيل إليها دون إعادة فتح استثنائية",
      });
      return { success: true, status: "closed", name: period.name };
    }),

  /** Exceptional reopen of a closed period — requires a reason (audited). */
  reopen: adminProcedure
    .use(requirePermissions(PERMISSIONS.FISCAL_PERIODS_MANAGE))
    .input(z.object({ periodId: z.number(), reason: z.string().min(3) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const tid = requireTenantId(ctx);
      const existing = await db
        .select()
        .from(fiscalPeriods)
        .where(
          and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.tenantId, tid)
          )
        )
        .limit(1);
      if (existing.length === 0) throw new Error("الفترة المالية غير موجودة");
      const period = existing[0];
      if (period.status !== "closed")
        throw new Error("لا يمكن إعادة فتح فترة غير مغلقة");

      await db
        .update(fiscalPeriods)
        .set({
          status: "reopened",
          reopenedAt: new Date(),
          reopenedById: ctx.user.id,
          reopenReason: input.reason,
          closedAt: null,
          closedById: null,
        })
        .where(eq(fiscalPeriods.id, period.id));

      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `إعادة فتح الفترة المالية: ${period.name} (استثنائي)`,
        details: `السبب: ${input.reason}`,
      });
      return { success: true, status: "reopened", name: period.name };
    }),
});
