import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import {
  router,
  tenantProcedure,
  adminProcedure,
  requirePermissions,
} from "../_core/trpc";
import { PERMISSIONS } from "../../shared/permissions";
import { getDb } from "../db";
import { requireTenantId } from "../_core/tenant";
import { auditLogs, users } from "../../drizzle/schema";
import {
  getAuditLogs,
  exportAuditLogs,
  verifyAuditChain,
} from "../_core/audit";

export const auditRouter = router({
  // ─── List Audit Logs ────────────────────────────────────────────────
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.AUDIT_VIEW))
    .input(
      z
        .object({
          actorId: z.number().optional(),
          action: z.string().optional(),
          resourceType: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          cursor: z.number().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tid = requireTenantId(ctx);
      const filters = {
        actorId: input?.actorId,
        action: input?.action,
        resourceType: input?.resourceType,
        dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
        cursor: input?.cursor,
        limit: input?.limit ?? 50,
      };
      return getAuditLogs(tid, filters);
    }),

  // ─── Get Audit Log By ID ────────────────────────────────────────────
  getById: tenantProcedure
    .use(requirePermissions(PERMISSIONS.AUDIT_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tid = requireTenantId(ctx);

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.id, input.id), eq(auditLogs.tenantId, tid)))
        .limit(1);

      return log ?? null;
    }),

  // ─── Export Audit Logs (CSV) ────────────────────────────────────────
  export: tenantProcedure
    .use(requirePermissions(PERMISSIONS.AUDIT_EXPORT))
    .input(
      z
        .object({
          actorId: z.number().optional(),
          action: z.string().optional(),
          resourceType: z.string().optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const tid = requireTenantId(ctx);
      const filters = {
        actorId: input?.actorId,
        action: input?.action,
        resourceType: input?.resourceType,
        dateFrom: input?.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input?.dateTo ? new Date(input.dateTo) : undefined,
      };
      const csv = await exportAuditLogs(tid, filters);
      return { csv };
    }),

  // ─── Verify Audit Chain Integrity ───────────────────────────────────
  verifyIntegrity: adminProcedure
    .use(requirePermissions(PERMISSIONS.AUDIT_VIEW))
    .mutation(async ({ ctx }) => {
      const tid = requireTenantId(ctx);
      const broken = await verifyAuditChain(tid);
      return {
        intact: broken.length === 0,
        brokenLinks: broken,
        checkedAt: new Date().toISOString(),
      };
    }),

  // ─── Get Audit Statistics ───────────────────────────────────────────
  getStats: tenantProcedure
    .use(requirePermissions(PERMISSIONS.AUDIT_VIEW))
    .input(
      z
        .object({
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return { total: 0, byAction: {}, byResourceType: {}, byActor: {} };
      const tid = requireTenantId(ctx);

      const conditions = [eq(auditLogs.tenantId, tid)];
      if (input?.dateFrom)
        conditions.push(gte(auditLogs.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo)
        conditions.push(lte(auditLogs.createdAt, new Date(input.dateTo)));

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(and(...conditions));

      const byAction = await db
        .select({
          action: auditLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(auditLogs.action)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      const byResourceType = await db
        .select({
          resourceType: auditLogs.entityType,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .where(and(...conditions))
        .groupBy(auditLogs.entityType)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      const byActor = await db
        .select({
          actorId: auditLogs.userId,
          actorName: users.name,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(...conditions))
        .groupBy(auditLogs.userId, users.name)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      return {
        total: totalResult?.count ?? 0,
        byAction: Object.fromEntries(byAction.map(r => [r.action, r.count])),
        byResourceType: Object.fromEntries(
          byResourceType.map(r => [r.resourceType, r.count])
        ),
        byActor: byActor.map(r => ({
          actorId: r.actorId,
          actorName: r.actorName ?? "System",
          count: r.count,
        })),
      };
    }),
});
