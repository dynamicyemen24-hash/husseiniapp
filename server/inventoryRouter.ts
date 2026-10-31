import { z } from "zod";
import { eq, and, sql, desc, lte, isNull } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import {
  products,
  warehouses,
  warehouseStock,
  warehouseTransfers,
  stockAdjustments,
  inventoryBatches,
  inventoryMovements,
  inventoryValuationLayers,
  products as productsTable,
} from "../drizzle/schema";
import {
  addWarehouseStock,
  deductWarehouseStock,
  setWarehouseStock,
  transferWarehouseStock,
  recordStockMovement,
  isUniqueViolationDatabaseError,
  addValuationLayer,
} from "./services/inventoryService";
import { PERMISSIONS } from "../shared/permissions";
import { recordAuditEvent } from "./_core/audit";

/**
 * Idempotency for stock writes — WORLD-CLASS OFFLINE/POS SAFETY.
 *
 * `stock_adjustments.globalCode` and `warehouse_transfers.globalCode` are
 * UNIQUE per (tenant, globalCode), so a retried request carrying the same
 * `idempotencyKey` collapses to zero inserted rows instead of a duplicate
 * deduction. On conflict we re-read the winner row and return it with
 * `idempotent: true` — no second balance change, no second movement.
 */
const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9:_-]+$/, "صيغة مفتاح عدم التكرار غير صالحة")
  .optional();

async function findAdjustmentByIdempotencyKey(
  tx: any,
  tenantId: number,
  key: string
) {
  const rows = await tx
    .select()
    .from(stockAdjustments)
    .where(
      and(
        eq(stockAdjustments.tenantId, tenantId),
        eq(stockAdjustments.globalCode, key)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function findTransferByIdempotencyKey(
  tx: any,
  tenantId: number,
  key: string
) {
  const rows = await tx
    .select()
    .from(warehouseTransfers)
    .where(
      and(
        eq(warehouseTransfers.tenantId, tenantId),
        eq(warehouseTransfers.globalCode, key)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Fail closed: referenced warehouse must exist + belong to the tenant. */
async function assertTenantWarehouse(
  db: any,
  tenantId: number,
  warehouseId: number
): Promise<void> {
  const rows = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(eq(warehouses.id, warehouseId), eq(warehouses.tenantId, tenantId))
    )
    .limit(1);
  if (rows.length === 0) throw new Error("المستودع غير موجود في هذه المؤسسة");
}

/** Fail closed: referenced product must exist + belong to the tenant. */
async function assertTenantProduct(
  db: any,
  tenantId: number,
  productId: number
): Promise<void> {
  const rows = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId))
    )
    .limit(1);
  if (rows.length === 0) throw new Error("الصنف غير موجود في هذه المؤسسة");
}

export const inventoryRouter = router({
  // PAGINATION (mandatory): inventory is the highest-cardinality tenant table.
  // Default 200 / max 500 prevents full-table scans on large catalogs.
  // Clients needing more must paginate with offset.
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
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
        .from(productsTable)
        .where(eq(productsTable.tenantId, ctx.tenantId))
        .orderBy(productsTable.name)
        .limit(input?.limit ?? 200)
        .offset(input?.offset ?? 0);
    }),

  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const [row] = await db
        .select()
        .from(productsTable)
        .where(
          and(
            eq(productsTable.id, input.id),
            eq(productsTable.tenantId, ctx.tenantId!)
          )
        );
      return row;
    }),

  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_CREATE))
    .input(
      z.object({
        code: z.string().min(1).max(30),
        name: z.string().min(2).max(150),
        type: z.enum(["goods", "service"]).default("goods"),
        salePrice: z.string().optional(),
        purchasePrice: z.string().optional(),
        currentStock: z.number().int().default(0),
        minStock: z.number().int().default(0),
        // products.reorderPoint is decimal (string); numbers are stringified.
        reorderPoint: z.number().optional(),
        unitId: z.number().optional(),
        category: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await db
        .insert(productsTable)
        .values({
          tenantId: ctx.tenantId,
          code: input.code,
          name: input.name,
          type: input.type,
          salePrice: input.salePrice,
          purchasePrice: input.purchasePrice,
          currentStock: input.currentStock,
          minStock: input.minStock,
          reorderPoint:
            input.reorderPoint !== undefined
              ? String(input.reorderPoint)
              : undefined,
          unitId: input.unitId,
          category: input.category,
          isActive: input.isActive,
        })
        .returning();
      return row;
    }),

  edit: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        id: z.number(),
        code: z.string().min(1).max(30).optional(),
        name: z.string().min(2).max(150).optional(),
        type: z.enum(["goods", "service"]).optional(),
        salePrice: z.string().optional(),
        purchasePrice: z.string().optional(),
        // Direct balance edits are FORBIDDEN here: every quantity change must
        // flow through adjustStock/physicalCount (→ inventoryService atomic
        // guarded writes + source-linked movement). Rejected at the Zod
        // boundary (contract-testable) AND at runtime (defense in depth).
        currentStock: z
          .never()
          .optional()
          .refine(v => v === undefined, {
            message:
              "تعديل الرصيد المباشر ممنوع — استخدم adjustStock أو physicalCount حتى تُسجَّل حركة مرتبطة بمستند مصدر",
          }),
        minStock: z.number().int().optional(),
        reorderPoint: z.number().optional(),
        unitId: z.number().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      if (input.currentStock !== undefined)
        throw new Error(
          "تعديل الرصيد المباشر ممنوع — استخدم adjustStock أو physicalCount حتى تُسجَّل حركة مرتبطة بمستند مصدر"
        );
      const { id, currentStock: _forbidden, reorderPoint, ...rest } = input;
      const [row] = await db
        .update(productsTable)
        .set({
          ...rest,
          ...(reorderPoint !== undefined
            ? { reorderPoint: String(reorderPoint) }
            : {}),
        })
        .where(
          and(
            eq(productsTable.id, id),
            eq(productsTable.tenantId, ctx.tenantId!)
          )
        )
        .returning();
      return row;
    }),

  delete: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_DELETE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await db
        .delete(productsTable)
        .where(
          and(
            eq(productsTable.id, input.id),
            eq(productsTable.tenantId, ctx.tenantId!)
          )
        );
      return { success: true };
    }),

  adjustStock: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_ADJUST))
    .input(
      z.object({
        productId: z.number().int().positive(),
        // warehouse_stock.warehouseId is NOT NULL — the warehouse is required
        // (the old optional+null comparison never matched any row).
        warehouseId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(1_000_000_000),
        type: z.enum(["add", "remove", "set"]).default("add"),
        notes: z.string().trim().max(500).optional(),
        // Batch-aware: optional inventory_batches ID (expiry/FEFO traceability).
        // Applied INSIDE the same transaction via the guarded batch update —
        // never via raw SQL outside the tx (the legacy product_batches path
        // was broken + non-atomic and has been removed).
        batchId: z.number().int().positive().optional(),
        unitCost: z.number().positive().max(1_000_000_000_000).optional(),
        // Idempotency: POS/offline retries reuse the same key → single deduction.
        // Stored as stock_adjustments.globalCode (unique per tenant).
        idempotencyKey: IdempotencyKeySchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;
      await assertTenantProduct(db, tid, input.productId);
      await assertTenantWarehouse(db, tid, input.warehouseId);

      // Idempotent replay: a retried key returns the original result.
      if (input.idempotencyKey) {
        const winner = await findAdjustmentByIdempotencyKey(
          db,
          tid,
          input.idempotencyKey
        );
        if (winner) {
          return {
            success: true,
            previousQty: winner.previousQty,
            newQty: winner.newQty,
            adjustmentId: winner.id,
            idempotent: true as const,
          };
        }
      }

      const prevRows = await db
        .select({ quantity: warehouseStock.quantity })
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.tenantId, tid),
            eq(warehouseStock.productId, input.productId),
            eq(warehouseStock.warehouseId, input.warehouseId)
          )
        )
        .limit(1);
      const previousQty = prevRows[0]?.quantity ?? 0;
      const newQty =
        input.type === "add"
          ? previousQty + input.quantity
          : input.type === "remove"
            ? previousQty - input.quantity
            : input.quantity;

      let adjustmentId = 0;
      try {
        await (db as any).transaction(async (tx: any) => {
          // All balance writes go through the CENTRAL STOCK GUARD
          // (atomic conditional UPDATE — never read-modify-write).
          if (input.type === "add") {
            await addWarehouseStock(tx, {
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.warehouseId,
              quantity: input.quantity,
            });
            // Valuation layer for inbound stock (WAC/FIFO foundation).
            if (input.unitCost != null && input.unitCost > 0) {
              await addValuationLayer(tx, {
                tenantId: tid,
                productId: input.productId,
                warehouseId: input.warehouseId,
                batchId: input.batchId ?? null,
                quantity: input.quantity,
                unitCost: input.unitCost,
                sourceType: "stock_adjustment",
                referenceType: "stock_adjustment",
                referenceId: null,
              });
            }
          } else if (input.type === "remove") {
            const deducted = await deductWarehouseStock(tx, {
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.warehouseId,
              quantity: input.quantity,
            });
            if (!deducted.success)
              throw new Error(
                `المخزون المتاح غير كافٍ — المطلوب: ${input.quantity}، المتاح: ${previousQty}`
              );
          } else {
            await setWarehouseStock(tx, {
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.warehouseId,
              quantity: input.quantity,
            });
          }
          // Batch-aware leg (same tx, guarded — keeps batch/warehouse in sync).
          if (input.batchId) {
            const batchRows = await tx
              .select({
                id: inventoryBatches.id,
                quantity: inventoryBatches.quantity,
              })
              .from(inventoryBatches)
              .where(
                and(
                  eq(inventoryBatches.id, input.batchId),
                  eq(inventoryBatches.tenantId, tid),
                  eq(inventoryBatches.productId, input.productId),
                  eq(inventoryBatches.warehouseId, input.warehouseId)
                )
              )
              .limit(1);
            if (batchRows.length === 0)
              throw new Error("التشغيلة غير موجودة لهذا الصنف والمستودع");
            if (input.type === "add") {
              await tx
                .update(inventoryBatches)
                .set({
                  quantity: sql`${inventoryBatches.quantity} + ${input.quantity}`,
                  updatedAt: new Date(),
                })
                .where(eq(inventoryBatches.id, input.batchId));
            } else if (input.type === "remove") {
              const done = await tx
                .update(inventoryBatches)
                .set({
                  quantity: sql`${inventoryBatches.quantity} - ${input.quantity}`,
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(inventoryBatches.id, input.batchId),
                    sql`${inventoryBatches.quantity} >= ${input.quantity}`
                  )
                )
                .returning({ id: inventoryBatches.id });
              if (done.length === 0)
                throw new Error("رصيد التشغيلة غير كافٍ لهذا الإخراج");
            } else {
              await tx
                .update(inventoryBatches)
                .set({
                  quantity: input.quantity,
                  updatedAt: new Date(),
                })
                .where(eq(inventoryBatches.id, input.batchId));
            }
          }
          // Source document for the movement (audit trail). The globalCode
          // doubles as the idempotency key (unique per tenant).
          const insertQuery = tx.insert(stockAdjustments).values({
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            previousQty,
            newQty,
            reason:
              input.type === "add"
                ? "إدخال"
                : input.type === "remove"
                  ? "إخراج"
                  : "تسوية",
            notes: input.notes ?? null,
            userId: ctx.user.id,
            globalCode: input.idempotencyKey ?? null,
          });
          let adjRows;
          if (input.idempotencyKey) {
            adjRows = await insertQuery
              .onConflictDoNothing({
                target: [
                  stockAdjustments.tenantId,
                  stockAdjustments.globalCode,
                ],
              })
              .returning({ id: stockAdjustments.id });
            if (adjRows.length === 0) {
              // Lost the idempotency race — the winner owns the deduction.
              // Abort this tx (rolls back our duplicate deduction) and
              // return the winner below.
              throw new Error("__IDEMPOTENT_REPLAY__");
            }
          } else {
            adjRows = await insertQuery.returning({
              id: stockAdjustments.id,
            });
          }
          const [adj] = adjRows;
          adjustmentId = adj.id;
          // Link valuation layer back to its source document when created.
          if (input.type === "add" && input.unitCost != null) {
            await tx
              .update(inventoryValuationLayers)
              .set({ sourceId: adj.id, referenceId: adj.id })
              .where(
                and(
                  eq(inventoryValuationLayers.tenantId, tid),
                  eq(inventoryValuationLayers.productId, input.productId),
                  isNull(inventoryValuationLayers.sourceId)
                )
              );
          }
          const diff = newQty - previousQty;
          if (diff !== 0 && adj) {
            await recordStockMovement(tx, {
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.warehouseId,
              type: diff > 0 ? "in" : "out",
              quantity: Math.abs(diff),
              referenceId: adj.id,
              referenceType: "stock_adjustment",
              notes: input.notes ?? null,
            });
          }
        });
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "__IDEMPOTENT_REPLAY__" ||
            isUniqueViolationDatabaseError(err))
        ) {
          const winner = input.idempotencyKey
            ? await findAdjustmentByIdempotencyKey(
                db,
                tid,
                input.idempotencyKey
              )
            : null;
          if (winner) {
            return {
              success: true,
              previousQty: winner.previousQty,
              newQty: winner.newQty,
              adjustmentId: winner.id,
              idempotent: true as const,
            };
          }
        }
        throw err;
      }

      // Audit log
      await recordAuditEvent(ctx, {
        action: "STOCK_ADJUSTED",
        resourceType: "product",
        resourceId: String(input.productId),
        before: { quantity: previousQty },
        after: { quantity: newQty, adjustmentType: input.type },
        metadata: {
          route: "inventory.adjustStock",
          warehouseId: input.warehouseId,
          batchId: input.batchId,
          adjustmentId,
        },
      });

      return { success: true, previousQty, newQty, adjustmentId };
    }),

  physicalCount: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_PHYSICAL_COUNT))
    .input(
      z.object({
        productId: z.number().int().positive(),
        warehouseId: z.number().int().positive(),
        countedQty: z.number().int().min(0).max(1_000_000_000),
        notes: z.string().trim().max(500).optional(),
        batchId: z.number().int().positive().optional(),
        idempotencyKey: IdempotencyKeySchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;
      await assertTenantProduct(db, tid, input.productId);
      await assertTenantWarehouse(db, tid, input.warehouseId);

      if (input.idempotencyKey) {
        const winner = await findAdjustmentByIdempotencyKey(
          db,
          tid,
          input.idempotencyKey
        );
        if (winner) {
          return {
            success: true,
            previousQty: winner.previousQty,
            newQty: winner.newQty,
            adjustmentId: winner.id,
            idempotent: true as const,
          };
        }
      }

      const prevRows = await db
        .select({ quantity: warehouseStock.quantity })
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.tenantId, tid),
            eq(warehouseStock.productId, input.productId),
            eq(warehouseStock.warehouseId, input.warehouseId)
          )
        )
        .limit(1);
      const previousQty = prevRows[0]?.quantity ?? 0;
      let adjustmentId = 0;

      try {
        await (db as any).transaction(async (tx: any) => {
          await setWarehouseStock(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.countedQty,
          });
          if (input.batchId) {
            const batchRows = await tx
              .select({ id: inventoryBatches.id })
              .from(inventoryBatches)
              .where(
                and(
                  eq(inventoryBatches.id, input.batchId),
                  eq(inventoryBatches.tenantId, tid),
                  eq(inventoryBatches.productId, input.productId),
                  eq(inventoryBatches.warehouseId, input.warehouseId)
                )
              )
              .limit(1);
            if (batchRows.length === 0)
              throw new Error("التشغيلة غير موجودة لهذا الصنف والمستودع");
            await tx
              .update(inventoryBatches)
              .set({ quantity: input.countedQty, updatedAt: new Date() })
              .where(eq(inventoryBatches.id, input.batchId));
          }
          const insertQuery = tx.insert(stockAdjustments).values({
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.warehouseId,
            previousQty,
            newQty: input.countedQty,
            reason: "جرد فعلي",
            notes: input.notes ?? null,
            userId: ctx.user.id,
            globalCode: input.idempotencyKey ?? null,
          });
          let adjRows;
          if (input.idempotencyKey) {
            adjRows = await insertQuery
              .onConflictDoNothing({
                target: [
                  stockAdjustments.tenantId,
                  stockAdjustments.globalCode,
                ],
              })
              .returning({ id: stockAdjustments.id });
            if (adjRows.length === 0) throw new Error("__IDEMPOTENT_REPLAY__");
          } else {
            adjRows = await insertQuery.returning({
              id: stockAdjustments.id,
            });
          }
          const [adj] = adjRows;
          adjustmentId = adj.id;
          const diff = input.countedQty - previousQty;
          if (diff !== 0 && adj) {
            await recordStockMovement(tx, {
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.warehouseId,
              type: diff > 0 ? "in" : "out",
              quantity: Math.abs(diff),
              referenceId: adj.id,
              referenceType: "stock_adjustment",
              notes:
                input.notes ?? `جرد فعلي: ${previousQty} ← ${input.countedQty}`,
            });
          }
        });
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "__IDEMPOTENT_REPLAY__" ||
            isUniqueViolationDatabaseError(err))
        ) {
          const winner = input.idempotencyKey
            ? await findAdjustmentByIdempotencyKey(
                db,
                tid,
                input.idempotencyKey
              )
            : null;
          if (winner) {
            return {
              success: true,
              previousQty: winner.previousQty,
              newQty: winner.newQty,
              adjustmentId: winner.id,
              idempotent: true as const,
            };
          }
        }
        throw err;
      }

      // Audit log
      await recordAuditEvent(ctx, {
        action: "PHYSICAL_COUNT_PERFORMED",
        resourceType: "product",
        resourceId: String(input.productId),
        before: { quantity: previousQty },
        after: { quantity: input.countedQty },
        metadata: {
          route: "inventory.physicalCount",
          warehouseId: input.warehouseId,
          batchId: input.batchId,
          adjustmentId,
        },
      });

      return {
        success: true,
        previousQty,
        newQty: input.countedQty,
        adjustmentId,
      };
    }),

  transferStock: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_ADJUST))
    .input(
      z
        .object({
          fromWarehouseId: z.number().int().positive(),
          toWarehouseId: z.number().int().positive(),
          productId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(1_000_000_000),
          batchId: z.number().int().positive().optional(),
          notes: z.string().trim().max(500).optional(),
          idempotencyKey: IdempotencyKeySchema,
        })
        .refine(d => d.fromWarehouseId !== d.toWarehouseId, {
          message: "مستودع المصدر والوجهة يجب أن يكونا مختلفين",
          path: ["toWarehouseId"],
        })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;
      await assertTenantProduct(db, tid, input.productId);
      await assertTenantWarehouse(db, tid, input.fromWarehouseId);
      await assertTenantWarehouse(db, tid, input.toWarehouseId);

      if (input.idempotencyKey) {
        const winner = await findTransferByIdempotencyKey(
          db,
          tid,
          input.idempotencyKey
        );
        if (winner) {
          return {
            success: true,
            transferId: winner.id,
            fromWarehouseId: winner.fromWarehouseId,
            toWarehouseId: winner.toWarehouseId,
            productId: winner.productId,
            quantity: winner.quantity,
            idempotent: true as const,
          };
        }
      }

      let transferId = 0;
      try {
        await (db as any).transaction(async (tx: any) => {
          // Read BOTH balances inside the tx so dst previousQty is truthful
          // (the legacy code hardcoded 0 — corrupting the audit trail).
          const srcRows = await tx
            .select({ quantity: warehouseStock.quantity })
            .from(warehouseStock)
            .where(
              and(
                eq(warehouseStock.tenantId, tid),
                eq(warehouseStock.productId, input.productId),
                eq(warehouseStock.warehouseId, input.fromWarehouseId)
              )
            )
            .limit(1);
          const dstRows = await tx
            .select({ quantity: warehouseStock.quantity })
            .from(warehouseStock)
            .where(
              and(
                eq(warehouseStock.tenantId, tid),
                eq(warehouseStock.productId, input.productId),
                eq(warehouseStock.warehouseId, input.toWarehouseId)
              )
            )
            .limit(1);
          const srcAvailable = srcRows[0]?.quantity ?? 0;
          const dstPrevious = dstRows[0]?.quantity ?? 0;
          if (srcAvailable < input.quantity) {
            throw new Error(
              `المخزون في المستودع المصدر غير كافٍ — المطلوب: ${input.quantity}، المتاح: ${srcAvailable}`
            );
          }

          // 1+2. Atomic guarded balance leg (source can never go negative,
          // even under concurrent transfers of the last units).
          const moved = await transferWarehouseStock(tx, {
            tenantId: tid,
            productId: input.productId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            quantity: input.quantity,
          });
          if (!moved.success)
            throw new Error(
              `المخزون في المستودع المصدر غير كافٍ — المطلوب: ${input.quantity}`
            );

          // 3. Batch leg (same tx): move the batch reservation with the stock.
          if (input.batchId) {
            const batchRows = await tx
              .select({
                id: inventoryBatches.id,
                quantity: inventoryBatches.quantity,
                warehouseId: inventoryBatches.warehouseId,
              })
              .from(inventoryBatches)
              .where(
                and(
                  eq(inventoryBatches.id, input.batchId),
                  eq(inventoryBatches.tenantId, tid),
                  eq(inventoryBatches.productId, input.productId)
                )
              )
              .limit(1);
            if (batchRows.length === 0)
              throw new Error("التشغيلة غير موجودة لهذا الصنف");
            if (batchRows[0].warehouseId !== input.fromWarehouseId)
              throw new Error("التشغيلة ليست في مستودع المصدر");
            const done = await tx
              .update(inventoryBatches)
              .set({
                quantity: sql`${inventoryBatches.quantity} - ${input.quantity}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(inventoryBatches.id, input.batchId),
                  sql`${inventoryBatches.quantity} >= ${input.quantity}`
                )
              )
              .returning({ id: inventoryBatches.id });
            if (done.length === 0)
              throw new Error("رصيد التشغيلة في المصدر غير كافٍ");
            // Destination batch row (same batch number, new warehouse).
            const [srcBatch] = await tx
              .select({ batchNumber: inventoryBatches.batchNumber })
              .from(inventoryBatches)
              .where(eq(inventoryBatches.id, input.batchId))
              .limit(1);
            await tx
              .insert(inventoryBatches)
              .values({
                tenantId: tid,
                productId: input.productId,
                warehouseId: input.toWarehouseId,
                batchNumber: srcBatch.batchNumber,
                quantity: input.quantity,
                reservedQty: 0,
                isActive: true,
              })
              .onConflictDoUpdate({
                target: [
                  inventoryBatches.productId,
                  inventoryBatches.warehouseId,
                  inventoryBatches.batchNumber,
                  inventoryBatches.tenantId,
                ],
                set: {
                  quantity: sql`${inventoryBatches.quantity} + ${input.quantity}`,
                  updatedAt: new Date(),
                },
              });
          }

          // 4. Transfer document (idempotent via globalCode) + adjustments.
          const transferInsert = tx.insert(warehouseTransfers).values({
            tenantId: tid,
            productId: input.productId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            quantity: input.quantity,
            notes: input.notes ?? null,
            userId: ctx.user.id,
            globalCode: input.idempotencyKey ?? null,
          });
          let transferRows;
          if (input.idempotencyKey) {
            transferRows = await transferInsert
              .onConflictDoNothing({
                target: [
                  warehouseTransfers.tenantId,
                  warehouseTransfers.globalCode,
                ],
              })
              .returning({ id: warehouseTransfers.id });
            if (transferRows.length === 0)
              throw new Error("__IDEMPOTENT_REPLAY__");
          } else {
            transferRows = await transferInsert.returning({
              id: warehouseTransfers.id,
            });
          }
          const [transfer] = transferRows;
          transferId = transfer.id;

          const [srcAdj] = await tx
            .insert(stockAdjustments)
            .values({
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.fromWarehouseId,
              previousQty: srcAvailable,
              newQty: srcAvailable - input.quantity,
              reason: "نقل مخزون",
              notes:
                input.notes ??
                `Transfer #${transfer.id} to WH ${input.toWarehouseId}`,
              userId: ctx.user.id,
            })
            .returning({ id: stockAdjustments.id });

          const [dstAdj] = await tx
            .insert(stockAdjustments)
            .values({
              tenantId: tid,
              productId: input.productId,
              warehouseId: input.toWarehouseId,
              previousQty: dstPrevious,
              newQty: dstPrevious + input.quantity,
              reason: "نقل مخزون",
              notes:
                input.notes ??
                `Transfer #${transfer.id} from WH ${input.fromWarehouseId}`,
              userId: ctx.user.id,
            })
            .returning({ id: stockAdjustments.id });

          await recordStockMovement(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.fromWarehouseId,
            type: "transfer",
            quantity: -input.quantity,
            referenceId: transfer.id,
            referenceType: "transfer",
            notes: input.notes ?? `Transfer #${transfer.id} out`,
          });

          await recordStockMovement(tx, {
            tenantId: tid,
            productId: input.productId,
            warehouseId: input.toWarehouseId,
            type: "transfer",
            quantity: input.quantity,
            referenceId: transfer.id,
            referenceType: "transfer",
            notes: input.notes ?? `Transfer #${transfer.id} in`,
          });

          // Keep adjustment linkage for backward-compat reports.
          void srcAdj;
          void dstAdj;
        });
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "__IDEMPOTENT_REPLAY__" ||
            isUniqueViolationDatabaseError(err))
        ) {
          const winner = input.idempotencyKey
            ? await findTransferByIdempotencyKey(db, tid, input.idempotencyKey)
            : null;
          if (winner) {
            return {
              success: true,
              transferId: winner.id,
              fromWarehouseId: winner.fromWarehouseId,
              toWarehouseId: winner.toWarehouseId,
              productId: winner.productId,
              quantity: winner.quantity,
              idempotent: true as const,
            };
          }
        }
        throw err;
      }

      // Audit log
      await recordAuditEvent(ctx, {
        action: "TRANSFER_STOCK",
        resourceType: "product",
        resourceId: String(input.productId),
        before: {
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          quantity: input.quantity,
        },
        after: {
          transferId,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          quantity: input.quantity,
        },
        metadata: { route: "inventory.transferStock" },
      });

      return {
        success: true,
        transferId,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        productId: input.productId,
        quantity: input.quantity,
      };
    }),

  // ─── WORLD-CLASS OBSERVABILITY ──────────────────────────────────────

  /** Paginated stock ledger — every balance change, traceable to its source. */
  movements: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z
        .object({
          productId: z.number().int().positive().optional(),
          warehouseId: z.number().int().positive().optional(),
          type: z.string().max(30).optional(),
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      const conditions = [eq(inventoryMovements.tenantId, ctx.tenantId)];
      if (input?.productId)
        conditions.push(eq(inventoryMovements.productId, input.productId));
      if (input?.warehouseId)
        conditions.push(eq(inventoryMovements.warehouseId, input.warehouseId));
      if (input?.type)
        conditions.push(eq(inventoryMovements.type as any, input.type as any));
      return db
        .select()
        .from(inventoryMovements)
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.id))
        .limit(limit)
        .offset(offset);
    }),

  /** Low-stock alerts — computed live from balances vs min/reorder points. */
  lowStockAlerts: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z
        .object({
          warehouseId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      const limit = input?.limit ?? 200;
      const stockConds = [eq(warehouseStock.tenantId, ctx.tenantId)];
      if (input?.warehouseId)
        stockConds.push(eq(warehouseStock.warehouseId, input.warehouseId));
      const rows = await db
        .select({
          productId: warehouseStock.productId,
          warehouseId: warehouseStock.warehouseId,
          quantity: warehouseStock.quantity,
          availableQty: warehouseStock.availableQty,
          reservedQty: warehouseStock.reservedQty,
          productName: productsTable.name,
          productCode: productsTable.code,
          minStock: productsTable.minStock,
          reorderPoint: productsTable.reorderPoint,
        })
        .from(warehouseStock)
        .innerJoin(
          productsTable,
          eq(productsTable.id, warehouseStock.productId)
        )
        .where(and(...stockConds))
        .limit(limit);
      return rows
        .map(r => {
          const min = r.minStock ?? 0;
          const reorder = Number(r.reorderPoint ?? 0);
          const threshold = Math.max(min, reorder);
          const severity =
            r.availableQty <= 0
              ? ("out_of_stock" as const)
              : r.availableQty <= threshold
                ? ("critical" as const)
                : null;
          if (!severity) return null;
          return { ...r, threshold, severity };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.availableQty - b.availableQty);
    }),

  /** Stock valuation — WAC proxy (qty × purchase price) + FIFO layers value. */
  valuation: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VALUATION_VIEW))
    .input(
      z
        .object({
          warehouseId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { lines: [], totalValue: 0 };
      const limit = input?.limit ?? 200;
      const offset = input?.offset ?? 0;
      const stockConds = [eq(warehouseStock.tenantId, ctx.tenantId)];
      if (input?.warehouseId)
        stockConds.push(eq(warehouseStock.warehouseId, input.warehouseId));
      const rows = await db
        .select({
          productId: warehouseStock.productId,
          warehouseId: warehouseStock.warehouseId,
          quantity: warehouseStock.quantity,
          productName: productsTable.name,
          productCode: productsTable.code,
          purchasePrice: productsTable.purchasePrice,
        })
        .from(warehouseStock)
        .innerJoin(
          productsTable,
          eq(productsTable.id, warehouseStock.productId)
        )
        .where(and(...stockConds))
        .limit(limit)
        .offset(offset);
      const lines = rows.map(r => {
        const unitCost = Number(r.purchasePrice ?? 0);
        return {
          ...r,
          unitCost,
          lineValue: Math.round(r.quantity * unitCost * 100) / 100,
        };
      });
      const totalValue =
        Math.round(lines.reduce((s, l) => s + l.lineValue, 0) * 100) / 100;
      return { lines, totalValue };
    }),

  /**
   * Consistency check — detects drift between balance legs:
   * negative balances, quantity < reserved, orphaned reservations.
   * Run on a schedule (cron) + before period close.
   */
  consistencyCheck: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z
        .object({
          warehouseId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { ok: true, issues: [] as string[] };
      const limit = input?.limit ?? 500;
      const conds = [eq(warehouseStock.tenantId, ctx.tenantId)];
      if (input?.warehouseId)
        conds.push(eq(warehouseStock.warehouseId, input.warehouseId));
      const rows = await db
        .select()
        .from(warehouseStock)
        .where(and(...conds))
        .limit(limit);
      const issues: Array<{
        productId: number;
        warehouseId: number;
        code: string;
        detail: string;
      }> = [];
      for (const r of rows) {
        if (r.quantity < 0)
          issues.push({
            productId: r.productId,
            warehouseId: r.warehouseId,
            code: "NEGATIVE_QUANTITY",
            detail: `quantity=${r.quantity}`,
          });
        if (r.availableQty < 0)
          issues.push({
            productId: r.productId,
            warehouseId: r.warehouseId,
            code: "NEGATIVE_AVAILABLE",
            detail: `availableQty=${r.availableQty}`,
          });
        if (r.reservedQty < 0)
          issues.push({
            productId: r.productId,
            warehouseId: r.warehouseId,
            code: "NEGATIVE_RESERVED",
            detail: `reservedQty=${r.reservedQty}`,
          });
        if (r.quantity < r.reservedQty)
          issues.push({
            productId: r.productId,
            warehouseId: r.warehouseId,
            code: "RESERVED_EXCEEDS_ON_HAND",
            detail: `quantity=${r.quantity} reserved=${r.reservedQty}`,
          });
        if (r.availableQty !== r.quantity - r.reservedQty)
          issues.push({
            productId: r.productId,
            warehouseId: r.warehouseId,
            code: "AVAILABLE_DRIFT",
            detail: `available=${r.availableQty} expected=${r.quantity - r.reservedQty}`,
          });
      }
      // Expiring batches (next 30 days) — FEFO signal for pharmacy/food.
      const soon = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      const expiring = await db
        .select({
          id: inventoryBatches.id,
          productId: inventoryBatches.productId,
          warehouseId: inventoryBatches.warehouseId,
          batchNumber: inventoryBatches.batchNumber,
          expiryDate: inventoryBatches.expiryDate,
          quantity: inventoryBatches.quantity,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.tenantId, ctx.tenantId),
            eq(inventoryBatches.isActive, true),
            lte(inventoryBatches.expiryDate, soon)
          )
        )
        .limit(100);
      const expiringBatches = expiring.filter(e => e.expiryDate != null);
      return { ok: issues.length === 0, issues, expiringBatches };
    }),
});
