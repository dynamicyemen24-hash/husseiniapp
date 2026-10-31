/**
 * inventoryService — CENTRAL STOCK GUARD (الحارس المركزي الوحيد للمخزون).
 *
 * RULE: every write that changes a stock balance (`products.currentStock`,
 * `warehouse_stock.quantity/availableQty/reservedQty`, `inventory_batches.*`)
 * MUST go through this module. Direct `db.update(products/warehouseStock/…)`
 * from routers (POS, store, inventory, …) is forbidden — it bypasses the
 * atomic guarded decrement (`UPDATE … WHERE available >= qty`) and the
 * mandatory source-document linkage on every movement.
 *
 * - Deduction uses a single conditional UPDATE and checks `returning().length`
 *   so two concurrent sales on the last unit cannot both succeed and the
 *   balance can never go negative (DB CHECK constraints are defense in depth).
 * - Every movement row MUST carry `referenceId` + `referenceType`
 *   (order / pos_invoice / transfer / adjustment / …) — see
 *   `recordStockMovement`, which throws `movement_requires_source_document`
 *   otherwise.
 */
import { eq, and, gte, sql, asc } from "drizzle-orm";
import {
  warehouseStock,
  inventoryBatches,
  inventoryMovements,
  inventoryValuationLayers,
  products,
} from "../../drizzle/schema";

/** Canonical stock error codes (stable API — clients switch on these). */
export const INVENTORY_ERRORS = {
  INSUFFICIENT_STOCK: "insufficient_stock",
  INSUFFICIENT_PRODUCT_STOCK: "insufficient_product_stock",
  INSUFFICIENT_BATCH_STOCK: "insufficient_batch_stock",
  INSUFFICIENT_STOCK_FOR_ADJUSTMENT: "insufficient_stock_for_adjustment",
  INVALID_QUANTITY: "invalid_quantity",
  SAME_WAREHOUSE_TRANSFER: "same_warehouse_transfer",
  MOVEMENT_REQUIRES_SOURCE: "movement_requires_source_document",
} as const;

/** Guard: quantities moving through the stock guard must be positive integers. */
export function assertValidQuantity(
  quantity: unknown,
  field = "quantity"
): void {
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(`${INVENTORY_ERRORS.INVALID_QUANTITY}:${field}`);
  }
}

/** Guard: DB identifiers must be positive integers (blocks 0/NaN/floats). */
export function assertValidId(id: unknown, field = "id"): void {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    throw new Error(`${INVENTORY_ERRORS.INVALID_QUANTITY}:${field}`);
  }
}

/**
 * True when `err` is a Postgres unique-violation (SQLSTATE 23505) — the
 * signal that a concurrent request already claimed the same idempotency key
 * (or order number). Callers must then re-read the existing row and return it
 * instead of inserting a second order / second stock movement.
 * Works for drizzle, neon-serverless and node-postgres error shapes.
 */
export function isUniqueViolationDatabaseError(err: unknown): boolean {
  const e = err as
    | { code?: unknown; cause?: { code?: unknown }; message?: unknown }
    | null
    | undefined;
  if (!e || typeof e !== "object") return false;
  if ((e as { code?: unknown }).code === "23505") return true;
  const cause = (e as { cause?: { code?: unknown } }).cause;
  if (cause && cause.code === "23505") return true;
  const msg = String((e as { message?: unknown }).message ?? e);
  return (
    msg.includes("23505") ||
    msg.includes("duplicate key value violates unique constraint")
  );
}

type DrizzleExecutor = {
  update: (table: any) => any;
  insert: (table: any) => any;
};

interface DeductWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export async function deductWarehouseStock(
  db: DrizzleExecutor,
  params: DeductWarehouseStockParams
): Promise<{ success: boolean; error?: string }> {
  assertValidQuantity(params.quantity);
  assertValidId(params.productId, "productId");
  assertValidId(params.warehouseId, "warehouseId");
  const result = await db
    .update(warehouseStock)
    .set({
      quantity: sql`${warehouseStock.quantity} - ${params.quantity}`,
      availableQty: sql`${warehouseStock.availableQty} - ${params.quantity}`,
      lastMovementAt: new Date(),
    })
    .where(
      and(
        eq(warehouseStock.tenantId, params.tenantId),
        eq(warehouseStock.productId, params.productId),
        eq(warehouseStock.warehouseId, params.warehouseId),
        gte(warehouseStock.availableQty, params.quantity)
      )
    )
    .returning({ id: warehouseStock.id });

  if (result.length === 0) {
    return { success: false, error: "insufficient_stock" };
  }
  return { success: true };
}

interface AddWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export async function addWarehouseStock(
  db: DrizzleExecutor,
  params: AddWarehouseStockParams
): Promise<{ success: boolean }> {
  assertValidQuantity(params.quantity);
  assertValidId(params.productId, "productId");
  assertValidId(params.warehouseId, "warehouseId");
  await db
    .insert(warehouseStock)
    .values({
      tenantId: params.tenantId,
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity,
      reservedQty: 0,
      availableQty: params.quantity,
      lastMovementAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        warehouseStock.productId,
        warehouseStock.warehouseId,
        warehouseStock.tenantId,
      ],
      set: {
        quantity: sql`${warehouseStock.quantity} + ${params.quantity}`,
        availableQty: sql`${warehouseStock.availableQty} + ${params.quantity}`,
        lastMovementAt: new Date(),
        updatedAt: new Date(),
      },
    });
  return { success: true };
}

interface SetWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
}

export async function setWarehouseStock(
  db: DrizzleExecutor,
  params: SetWarehouseStockParams
): Promise<{ success: boolean }> {
  await db
    .insert(warehouseStock)
    .values({
      tenantId: params.tenantId,
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity,
      reservedQty: 0,
      availableQty: params.quantity,
      lastMovementAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        warehouseStock.productId,
        warehouseStock.warehouseId,
        warehouseStock.tenantId,
      ],
      set: {
        quantity: params.quantity,
        availableQty: params.quantity,
        lastMovementAt: new Date(),
        updatedAt: new Date(),
      },
    });
  return { success: true };
}

interface DeductProductStockParams {
  productId: number;
  quantity: number;
}

export async function deductProductStock(
  db: DrizzleExecutor,
  params: DeductProductStockParams
): Promise<{ success: boolean; error?: string }> {
  assertValidQuantity(params.quantity);
  assertValidId(params.productId, "productId");
  const result = await db
    .update(products)
    .set({
      currentStock: sql`${products.currentStock} - ${params.quantity}`,
    })
    .where(
      and(
        eq(products.id, params.productId),
        gte(products.currentStock, params.quantity)
      )
    )
    .returning({ id: products.id });

  if (result.length === 0) {
    return { success: false, error: "insufficient_product_stock" };
  }
  return { success: true };
}

interface AddProductStockParams {
  productId: number;
  quantity: number;
}

export async function addProductStock(
  db: DrizzleExecutor,
  params: AddProductStockParams
): Promise<{ success: boolean }> {
  await db
    .update(products)
    .set({
      currentStock: sql`${products.currentStock} + ${params.quantity}`,
    })
    .where(eq(products.id, params.productId));
  return { success: true };
}

interface SetProductStockParams {
  productId: number;
  quantity: number;
}

export async function setProductStock(
  db: DrizzleExecutor,
  params: SetProductStockParams
): Promise<{ success: boolean }> {
  await db
    .update(products)
    .set({ currentStock: params.quantity })
    .where(eq(products.id, params.productId));
  return { success: true };
}

interface ReserveStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  batchId?: number;
}

export async function reserveStock(
  db: DrizzleExecutor,
  params: ReserveStockParams
): Promise<{ success: boolean; error?: string }> {
  assertValidQuantity(params.quantity);
  assertValidId(params.productId, "productId");
  if (params.batchId) {
    const result = await db
      .update(inventoryBatches)
      .set({
        reservedQty: sql`${inventoryBatches.reservedQty} + ${params.quantity}`,
      })
      .where(
        and(
          eq(inventoryBatches.id, params.batchId),
          gte(
            sql`${inventoryBatches.quantity} - ${inventoryBatches.reservedQty}`,
            params.quantity
          )
        )
      )
      .returning({ id: inventoryBatches.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_batch_stock" };
    }
  } else {
    const result = await db
      .update(warehouseStock)
      .set({
        reservedQty: sql`${warehouseStock.reservedQty} + ${params.quantity}`,
        availableQty: sql`${warehouseStock.availableQty} - ${params.quantity}`,
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId),
          gte(warehouseStock.availableQty, params.quantity)
        )
      )
      .returning({ id: warehouseStock.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_stock" };
    }
  }
  return { success: true };
}

interface ReleaseReservationParams {
  tenantId: number;
  productId: number;
  warehouseId?: number;
  batchId?: number;
  quantity: number;
}

export async function releaseReservation(
  db: DrizzleExecutor,
  params: ReleaseReservationParams
): Promise<{ success: boolean }> {
  if (params.batchId) {
    await db
      .update(inventoryBatches)
      .set({
        reservedQty: sql`${inventoryBatches.reservedQty} - ${params.quantity}`,
      })
      .where(eq(inventoryBatches.id, params.batchId));
  } else if (params.warehouseId) {
    await db
      .update(warehouseStock)
      .set({
        reservedQty: sql`${warehouseStock.reservedQty} - ${params.quantity}`,
        availableQty: sql`${warehouseStock.availableQty} + ${params.quantity}`,
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId)
        )
      );
  }
  return { success: true };
}

interface FulfillReservationParams {
  tenantId: number;
  productId: number;
  warehouseId?: number;
  batchId?: number;
  quantity: number;
}

export async function fulfillReservation(
  db: DrizzleExecutor,
  params: FulfillReservationParams
): Promise<{ success: boolean; error?: string }> {
  if (params.batchId) {
    const result = await db
      .update(inventoryBatches)
      .set({
        quantity: sql`${inventoryBatches.quantity} - ${params.quantity}`,
        reservedQty: sql`${inventoryBatches.reservedQty} - ${params.quantity}`,
      })
      .where(
        and(
          eq(inventoryBatches.id, params.batchId),
          gte(inventoryBatches.quantity, params.quantity)
        )
      )
      .returning({ id: inventoryBatches.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_batch_stock" };
    }
  } else if (params.warehouseId) {
    const result = await db
      .update(warehouseStock)
      .set({
        quantity: sql`${warehouseStock.quantity} - ${params.quantity}`,
        reservedQty: sql`${warehouseStock.reservedQty} - ${params.quantity}`,
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId),
          gte(warehouseStock.quantity, params.quantity)
        )
      )
      .returning({ id: warehouseStock.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_stock" };
    }
  }
  return { success: true };
}

interface AdjustWarehouseStockParams {
  tenantId: number;
  productId: number;
  warehouseId: number;
  adjustmentQty: number;
}

export async function adjustWarehouseStock(
  db: DrizzleExecutor,
  params: AdjustWarehouseStockParams
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(params.adjustmentQty)) {
    return { success: false, error: INVENTORY_ERRORS.INVALID_QUANTITY };
  }
  assertValidId(params.productId, "productId");
  assertValidId(params.warehouseId, "warehouseId");
  if (params.adjustmentQty > 0) {
    await db
      .insert(warehouseStock)
      .values({
        tenantId: params.tenantId,
        productId: params.productId,
        warehouseId: params.warehouseId,
        quantity: params.adjustmentQty,
        reservedQty: 0,
        availableQty: params.adjustmentQty,
        lastMovementAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          warehouseStock.productId,
          warehouseStock.warehouseId,
          warehouseStock.tenantId,
        ],
        set: {
          quantity: sql`${warehouseStock.quantity} + ${params.adjustmentQty}`,
          availableQty: sql`${warehouseStock.availableQty} + ${params.adjustmentQty}`,
          lastMovementAt: new Date(),
          updatedAt: new Date(),
        },
      });
  } else if (params.adjustmentQty < 0) {
    const absQty = Math.abs(params.adjustmentQty);
    const result = await db
      .update(warehouseStock)
      .set({
        quantity: sql`${warehouseStock.quantity} - ${absQty}`,
        availableQty: sql`${warehouseStock.availableQty} - ${absQty}`,
        lastMovementAt: new Date(),
      })
      .where(
        and(
          eq(warehouseStock.tenantId, params.tenantId),
          eq(warehouseStock.productId, params.productId),
          eq(warehouseStock.warehouseId, params.warehouseId),
          gte(warehouseStock.quantity, absQty)
        )
      )
      .returning({ id: warehouseStock.id });
    if (result.length === 0) {
      return { success: false, error: "insufficient_stock_for_adjustment" };
    }
  }
  return { success: true };
}

interface LogInventoryMovementParams {
  tenantId: number;
  productId: number;
  warehouseId?: number | null;
  type: string;
  quantity: number;
  referenceId?: number | null;
  referenceType?: string | null;
  notes?: string | null;
}

/**
 * The ONLY sanctioned way to append a stock-movement row.
 * `referenceId` + `referenceType` are mandatory: an orphan movement (no source
 * document) is rejected so every balance change stays traceable to the order /
 * POS invoice / transfer / adjustment that caused it.
 */
export async function recordStockMovement(
  db: DrizzleExecutor,
  params: LogInventoryMovementParams
): Promise<void> {
  if (params.referenceId == null || !params.referenceType) {
    throw new Error(
      "movement_requires_source_document: every stock_movement must link referenceId + referenceType"
    );
  }
  await db.insert(inventoryMovements).values({
    tenantId: params.tenantId,
    productId: params.productId,
    warehouseId: params.warehouseId ?? null,
    type: params.type as any,
    quantity: params.quantity,
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    notes: params.notes ?? null,
  });
}

export async function logInventoryMovement(
  db: DrizzleExecutor,
  params: LogInventoryMovementParams
): Promise<void> {
  return recordStockMovement(db, params);
}

interface TransferWarehouseStockParams {
  tenantId: number;
  productId: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  quantity: number;
}

/**
 * WORLD-CLASS ATOMIC TRANSFER — the ONLY sanctioned warehouse→warehouse move.
 *
 * - Rejects same-warehouse transfers closed (no-op transfers corrupt the ledger).
 * - Source deduction is a guarded conditional UPDATE (never goes negative,
 *   safe under concurrency); destination credit is an upsert.
 * - Callers must wrap source+drain records (adjustments/movements/transfer doc)
 *   in the SAME transaction — this function performs only the balance leg.
 */
export async function transferWarehouseStock(
  db: DrizzleExecutor,
  params: TransferWarehouseStockParams
): Promise<{ success: boolean; error?: string }> {
  assertValidQuantity(params.quantity);
  assertValidId(params.productId, "productId");
  assertValidId(params.fromWarehouseId, "fromWarehouseId");
  assertValidId(params.toWarehouseId, "toWarehouseId");
  if (params.fromWarehouseId === params.toWarehouseId) {
    return {
      success: false,
      error: INVENTORY_ERRORS.SAME_WAREHOUSE_TRANSFER,
    };
  }
  const deducted = await deductWarehouseStock(db, {
    tenantId: params.tenantId,
    productId: params.productId,
    warehouseId: params.fromWarehouseId,
    quantity: params.quantity,
  });
  if (!deducted.success) return deducted;
  await addWarehouseStock(db, {
    tenantId: params.tenantId,
    productId: params.productId,
    warehouseId: params.toWarehouseId,
    quantity: params.quantity,
  });
  return { success: true };
}

// ─── Valuation engine (WAC + FIFO) ────────────────────────────────────

/** Pure WAC update: (prevQty*prevCost + newQty*newCost) / (prevQty+newQty). */
export function computeWeightedAverageCost(
  prevQty: number,
  prevUnitCost: number,
  newQty: number,
  newUnitCost: number
): number {
  const totalQty = prevQty + newQty;
  if (totalQty <= 0) return 0;
  const total =
    Math.max(0, prevQty) * Math.max(0, prevUnitCost) +
    Math.max(0, newQty) * Math.max(0, newUnitCost);
  return Math.round((total / totalQty) * 10000) / 10000;
}

export interface FifoLayerInput {
  id: number;
  remainingQty: number;
  unitCost: number;
}

export interface FifoConsumption {
  layerId: number;
  consumedQty: number;
  unitCost: number;
  lineCost: number;
}

/**
 * Pure FIFO consumption planner — oldest layer first.
 * Returns per-layer consumption + total COGS. Throws on shortfall so callers
 * fail closed instead of posting a partial COGS.
 */
export function planFifoConsumption(
  layers: FifoLayerInput[],
  quantity: number
): { consumption: FifoConsumption[]; totalCogs: number } {
  assertValidQuantity(quantity);
  const ordered = [...layers]
    .filter(l => l.remainingQty > 0)
    .sort((a, b) => a.id - b.id);
  const consumption: FifoConsumption[] = [];
  let needed = quantity;
  for (const layer of ordered) {
    if (needed <= 0) break;
    const take = Math.min(layer.remainingQty, needed);
    const lineCost = Math.round(take * layer.unitCost * 100) / 100;
    consumption.push({
      layerId: layer.id,
      consumedQty: take,
      unitCost: layer.unitCost,
      lineCost,
    });
    needed -= take;
  }
  if (needed > 0) {
    throw new Error(
      `${INVENTORY_ERRORS.INSUFFICIENT_STOCK}:valuation_layers_shortfall`
    );
  }
  const totalCogs =
    Math.round(consumption.reduce((s, c) => s + c.lineCost, 0) * 100) / 100;
  return { consumption, totalCogs };
}

interface ValuationLayerParams {
  tenantId: number;
  productId: number;
  warehouseId?: number | null;
  batchId?: number | null;
  quantity: number;
  unitCost: number;
  sourceType: string;
  sourceId?: number | null;
  referenceType?: string | null;
  referenceId?: number | null;
}

/** Append a valuation layer (goods receipt / purchase / production output). */
export async function addValuationLayer(
  db: DrizzleExecutor,
  params: ValuationLayerParams
): Promise<{ id: number }> {
  assertValidQuantity(params.quantity);
  if (!(params.unitCost > 0)) {
    throw new Error(`${INVENTORY_ERRORS.INVALID_QUANTITY}:unitCost`);
  }
  const totalCost = (
    Math.round(params.quantity * params.unitCost * 100) / 100
  ).toFixed(2);
  const [row] = await (db as any)
    .insert(inventoryValuationLayers)
    .values({
      tenantId: params.tenantId,
      productId: params.productId,
      warehouseId: params.warehouseId ?? null,
      batchId: params.batchId ?? null,
      layerDate: new Date(),
      quantity: params.quantity,
      remainingQty: params.quantity,
      unitCost: String(params.unitCost),
      totalCost,
      sourceType: params.sourceType,
      sourceId: params.sourceId ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      isActive: true,
    })
    .returning({ id: inventoryValuationLayers.id });
  return { id: row.id };
}

interface ConsumeValuationParams {
  tenantId: number;
  productId: number;
  warehouseId?: number | null;
  quantity: number;
}

/**
 * Consume valuation layers FIFO (oldest `id` first per product/warehouse).
 * Each layer is decremented with a guarded UPDATE so concurrent issues
 * cannot double-consume the same layer. Returns total COGS.
 */
export async function consumeValuationLayersFifo(
  db: any,
  params: ConsumeValuationParams
): Promise<{ success: boolean; totalCogs?: number; error?: string }> {
  assertValidQuantity(params.quantity);
  const where =
    params.warehouseId != null
      ? and(
          eq(inventoryValuationLayers.tenantId, params.tenantId),
          eq(inventoryValuationLayers.productId, params.productId),
          eq(inventoryValuationLayers.warehouseId, params.warehouseId),
          eq(inventoryValuationLayers.isActive, true),
          gte(inventoryValuationLayers.remainingQty, 1)
        )
      : and(
          eq(inventoryValuationLayers.tenantId, params.tenantId),
          eq(inventoryValuationLayers.productId, params.productId),
          eq(inventoryValuationLayers.isActive, true),
          gte(inventoryValuationLayers.remainingQty, 1)
        );
  const layers = await db
    .select({
      id: inventoryValuationLayers.id,
      remainingQty: inventoryValuationLayers.remainingQty,
      unitCost: inventoryValuationLayers.unitCost,
    })
    .from(inventoryValuationLayers)
    .where(where)
    .orderBy(
      asc(inventoryValuationLayers.layerDate),
      asc(inventoryValuationLayers.id)
    )
    .limit(500);
  let needed = params.quantity;
  let totalCogs = 0;
  for (const layer of layers) {
    if (needed <= 0) break;
    const take = Math.min(layer.remainingQty, needed);
    const updated = await db
      .update(inventoryValuationLayers)
      .set({
        remainingQty: sql`${inventoryValuationLayers.remainingQty} - ${take}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryValuationLayers.id, layer.id),
          gte(inventoryValuationLayers.remainingQty, take)
        )
      )
      .returning({ id: inventoryValuationLayers.id });
    if (updated.length === 0) continue; // lost race on this layer — try next
    totalCogs += take * Number(layer.unitCost);
    needed -= take;
  }
  if (needed > 0) {
    return { success: false, error: INVENTORY_ERRORS.INSUFFICIENT_STOCK };
  }
  return { success: true, totalCogs: Math.round(totalCogs * 100) / 100 };
}

interface InvoiceItem {
  productId: number;
  warehouseId: number;
  quantity: number;
}

interface DeductStockForInvoiceParams {
  tenantId: number;
  items: InvoiceItem[];
  referenceId?: number;
  referenceType: string;
  movementNotes?: string;
}

/**
 * ATOMIC multi-line invoice deduction with compensation.
 *
 * The legacy implementation deducted line-by-line and returned partial
 * errors, leaving half an invoice deducted. This version validates every
 * line first, then deducts sequentially; if any line fails mid-way, all
 * previously deducted lines are credited back (compensating transaction)
 * so the invoice is all-or-nothing from the caller's perspective.
 *
 * NOTE: for true DB-atomicity call this INSIDE a drizzle transaction and
 * pass the tx handle as `db`.
 */
export async function deductStockForInvoice(
  db: DrizzleExecutor,
  params: DeductStockForInvoiceParams
): Promise<{ success: boolean; errors?: string[] }> {
  if (!Array.isArray(params.items) || params.items.length === 0) {
    return { success: false, errors: ["empty_invoice_items"] };
  }
  for (const item of params.items) {
    assertValidId(item.productId, "productId");
    assertValidId(item.warehouseId, "warehouseId");
    assertValidQuantity(item.quantity);
  }

  const errors: string[] = [];
  const deducted: InvoiceItem[] = [];

  for (const item of params.items) {
    const productResult = await deductProductStock(db, {
      productId: item.productId,
      quantity: item.quantity,
    });
    if (!productResult.success) {
      errors.push(
        `Insufficient product stock for product ${item.productId}: ${productResult.error}`
      );
      break;
    }

    const warehouseResult = await deductWarehouseStock(db, {
      tenantId: params.tenantId,
      productId: item.productId,
      warehouseId: item.warehouseId,
      quantity: item.quantity,
    });
    if (!warehouseResult.success) {
      // Compensate the product leg of THIS line before aborting.
      await addProductStock(db, {
        productId: item.productId,
        quantity: item.quantity,
      });
      errors.push(
        `Insufficient warehouse stock for product ${item.productId} in warehouse ${item.warehouseId}: ${warehouseResult.error}`
      );
      break;
    }
    deducted.push(item);

    if (params.referenceId != null) {
      await recordStockMovement(db, {
        tenantId: params.tenantId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        type: "out",
        quantity: item.quantity,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        notes: params.movementNotes ?? null,
      });
    }
  }

  if (errors.length > 0) {
    // Roll back every previously deducted line (both legs).
    for (const item of deducted) {
      await addWarehouseStock(db, {
        tenantId: params.tenantId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantity: item.quantity,
      });
      await addProductStock(db, {
        productId: item.productId,
        quantity: item.quantity,
      });
    }
    return { success: false, errors };
  }
  return { success: true };
}
