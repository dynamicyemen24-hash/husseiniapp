import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import { procurements, products } from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";

export const procurementRouter = router({
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_VIEW))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      return db
        .select()
        .from(procurements)
        .where(eq(procurements.tenantId, ctx.tenantId))
        .orderBy(desc(procurements.createdAt));
    }),

  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const [row] = await db
        .select()
        .from(procurements)
        .where(
          and(
            eq(procurements.id, input.id),
            eq(procurements.tenantId, ctx.tenantId!)
          )
        );
      return row;
    }),

  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_CREATE))
    .input(
      z.object({
        requisitionNumber: z.string().min(1).max(40),
        itemName: z.string().min(1).max(200),
        quantity: z.union([z.string(), z.number()]),
        estimatedCost: z.union([z.string(), z.number()]).optional(),
        supplierId: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const quantityStr = String(input.quantity);
      const estimatedCostStr =
        input.estimatedCost != null ? String(input.estimatedCost) : "0";
      const [row] = await db
        .insert(procurements)
        .values({
          tenantId: ctx.tenantId,
          requisitionNumber: input.requisitionNumber,
          itemName: input.itemName,
          quantity: quantityStr,
          estimatedCost: estimatedCostStr,
          supplierId: input.supplierId ?? null,
          description: input.description ?? null,
          requestedById: ctx.user?.id ?? null,
          status: "draft",
        })
        .returning();
      return row;
    }),

  approve: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_APPROVE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await db
        .update(procurements)
        .set({ status: "approved", approvedById: ctx.user?.id ?? null })
        .where(
          and(
            eq(procurements.id, input.id),
            eq(procurements.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),

  receive: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_RECEIVE))
    .input(
      z.object({
        id: z.number(),
        receivedCost: z.union([z.string(), z.number()]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tenantId = ctx.tenantId!;
      const [rec] = await db
        .select()
        .from(procurements)
        .where(
          and(
            eq(procurements.id, input.id),
            eq(procurements.tenantId, tenantId)
          )
        )
        .limit(1);
      if (!rec) throw new Error("Procurement not found");
      const receivedCostStr =
        input.receivedCost != null
          ? String(input.receivedCost)
          : (rec.estimatedCost ?? "0");
      // Update procurement status to received with actual cost
      await db
        .update(procurements)
        .set({ status: "received", receivedCost: receivedCostStr })
        .where(
          and(
            eq(procurements.id, input.id),
            eq(procurements.tenantId, tenantId)
          )
        );
      // Add received quantity to stock: match product by item name within tenant
      const qty = Math.trunc(Number(rec.quantity) || 0);
      if (qty > 0) {
        const [matched] = await db
          .select({ id: products.id })
          .from(products)
          .where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.name, rec.itemName)
            )
          )
          .limit(1);
        if (matched) {
          await db
            .update(products)
            .set({ currentStock: sql`${products.currentStock} + ${qty}` })
            .where(
              and(eq(products.id, matched.id), eq(products.tenantId, tenantId))
            );
        }
      }
      return { success: true };
    }),
});
