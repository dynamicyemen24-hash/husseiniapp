import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import { projects, activityLogs } from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";

export const projectsRouter = router({
  // PAGINATION (mandatory-limit audit): default 200 / max 500. Clients that
  // need more must paginate with offset.
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROJECTS_VIEW))
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      return db
        .select()
        .from(projects)
        .where(eq(projects.tenantId, ctx.tenantId))
        .orderBy(desc(projects.createdAt))
        .limit(input?.limit ?? 200)
        .offset(input?.offset ?? 0);
    }),

  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROJECTS_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const [row] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.tenantId, ctx.tenantId!))
        );
      return row;
    }),

  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROJECTS_CREATE))
    .input(
      z.object({
        name: z.string().min(2).max(150),
        code: z.string().min(1).max(30).optional(),
        description: z.string().optional(),
        budget: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z
          .enum(["planning", "active", "on_hold", "completed", "cancelled"])
          .default("planning"),
        managerId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await db
        .insert(projects)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          code: input.code ?? `PRJ-${Date.now().toString(36).toUpperCase()}`,
          description: input.description,
          budget: input.budget !== undefined ? String(input.budget) : undefined,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          status: input.status,
          managerId: input.managerId ?? ctx.user?.id ?? null,
        })
        .returning();
      return row;
    }),

  edit: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROJECTS_EDIT))
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).max(150).optional(),
        description: z.string().optional(),
        budget: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z
          .enum(["planning", "active", "on_hold", "completed", "cancelled"])
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const { id, budget, startDate, endDate, ...rest } = input;
      const [row] = await db
        .update(projects)
        .set({
          ...rest,
          ...(budget !== undefined ? { budget: String(budget) } : {}),
          ...(startDate !== undefined
            ? { startDate: startDate ? new Date(startDate) : null }
            : {}),
          ...(endDate !== undefined
            ? { endDate: endDate ? new Date(endDate) : null }
            : {}),
        })
        .where(and(eq(projects.id, id), eq(projects.tenantId, ctx.tenantId!)))
        .returning();
      return row;
    }),

  delete: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROJECTS_DELETE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await db
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.tenantId, ctx.tenantId!))
        );
      return { success: true };
    }),

  governance: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROJECTS_GOVERNANCE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      // Log governance action
      await db.insert(activityLogs).values({
        tenantId: ctx.tenantId,
        userId: ctx.user?.id,
        action: "project_governance",
        details: `Governance action on project ${input.id}`,
        createdAt: new Date(),
      });
      return { success: true, id: input.id };
    }),
});
