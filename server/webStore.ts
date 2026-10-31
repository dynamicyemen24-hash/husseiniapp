import { eq, and, or, ilike, inArray, asc, isNull } from "drizzle-orm";
import { z } from "zod";
import { products, customers, orders, orderItems } from "../drizzle/schema";
import type { getDb } from "./db";
import {
  deductProductStock,
  isUniqueViolationDatabaseError,
  recordStockMovement,
} from "./services/inventoryService";

export type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const catalogInputSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

export const placeOrderInputSchema = z.object({
  customerName: z
    .string()
    .min(1)
    .transform(v => v.trim()),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().max(255).optional(),
  items: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

function escapeIlikePattern(raw: string): string {
  return raw.replace(/[%_\\]/g, "\\$&");
}

export async function getCatalog(
  db: Db,
  tenantId: number,
  input?: z.infer<typeof catalogInputSchema>
) {
  const conditions = [
    eq(products.tenantId, tenantId),
    eq(products.isActive, true),
    isNull(products.deletedAt),
  ];
  if (input?.search) {
    const safe = escapeIlikePattern(input.search.trim());
    conditions.push(
      or(
        ilike(products.name, `%${safe}%`),
        ilike(products.code, `%${safe}%`),
        ilike(products.barcode, `%${safe}%`)
      )!
    );
  }
  if (input?.category && input.category !== "all")
    conditions.push(eq(products.category, input.category));
  const items = await db
    .select({
      id: products.id,
      code: products.code,
      name: products.name,
      category: products.category,
      unit: products.unit,
      salePrice: products.salePrice,
      currentStock: products.currentStock,
      minStock: products.minStock,
      barcode: products.barcode,
    })
    .from(products)
    .where(and(...conditions)!)
    .orderBy(asc(products.category), asc(products.name))
    .limit(500);
  const cats = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.isActive, true),
        isNull(products.deletedAt)
      )
    );
  return {
    items,
    categories: cats
      .map(c => c.category)
      .filter((c): c is string => !!c)
      .sort(),
  };
}

export async function placePublicOrder(
  db: Db,
  tenantId: number,
  input: PlaceOrderInput
) {
  if (input.idempotencyKey) {
    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing.length > 0) {
      return {
        orderId: existing[0].id,
        orderNumber: existing[0].orderNumber,
        idempotent: true,
      };
    }
  }

  // Merge duplicate cart lines before anything else (same product twice in the basket)
  const mergedMap = new Map<number, number>();
  for (const it of input.items)
    mergedMap.set(
      it.productId,
      (mergedMap.get(it.productId) || 0) + it.quantity
    );
  const effectiveItems = Array.from(mergedMap.entries()).map(
    ([productId, quantity]) => ({ productId, quantity })
  );

  const productIds = effectiveItems.map(i => i.productId);
  const productRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        inArray(products.id, productIds),
        isNull(products.deletedAt)
      )
    );
  if (productRows.length !== productIds.length)
    throw new Error("واحد أو أكثر من الأصناف غير متوفر حالياً");
  const productMap = new Map(productRows.map(p => [p.id, p]));
  // Fast-fail on the requested quantity (the guarded atomic decrement inside
  // the transaction below is the real concurrency barrier — this is only UX).
  for (const item of effectiveItems) {
    const p = productMap.get(item.productId)!;
    const stock = p.currentStock || 0;
    if (stock < item.quantity)
      throw new Error(
        `الكمية المطلوبة من «${p.name}» تجاوزت المتوفر حالياً (المتاح: ${stock})`
      );
  }

  const itemValues = effectiveItems.map(item => {
    const p = productMap.get(item.productId)!;
    const unitPrice =
      p.salePrice && parseFloat(p.salePrice) > 0 ? p.salePrice : "0";
    return {
      productId: p.id,
      productName: p.name,
      quantity: item.quantity,
      unitPrice,
      total: (parseFloat(unitPrice) * item.quantity).toFixed(2),
    };
  });
  const total = itemValues.reduce((s, it) => s + parseFloat(it.total), 0);

  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const uuidPart = crypto
    .randomUUID()
    .slice(0, 6)
    .toUpperCase()
    .replace(/-/g, "");
  const orderNumber = `WEB-${datePart}-${uuidPart}`;

  let customerId: number | null = null;
  const phone = input.customerPhone
    ? input.customerPhone.replace(/[\s-]/g, "")
    : "";
  if (phone) {
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else if (input.customerName.trim()) {
      const [cust] = await db
        .insert(customers)
        .values({
          tenantId,
          code: `WEB-${datePart}-${uuidPart}`,
          name: input.customerName.trim(),
          phone,
          address: input.deliveryAddress || null,
          city: null,
          creditLimit: "0",
          balance: "0",
          notes: "عميل المتجر الإلكتروني",
        })
        .returning();
      customerId = cust.id;
    }
  }

  // Reads the winner row after a lost idempotency race (pre-check missed it or
  // the INSERT hit the 0022 unique index). No new movement is ever written here.
  const readExistingByKey = async (key: string) => {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, key))
      .limit(1);
    return rows.length > 0 ? rows[0] : null;
  };

  let result: { orderId: number; orderNumber: string; idempotent?: boolean };
  try {
    result = await (db as any).transaction(async (tx: any) => {
      // Idempotent insert: a concurrent retry with the same key collapses to
      // zero inserted rows instead of a duplicate order + duplicate movement.
      // (orders.idempotency_key_unique comes from drizzle/0022_idempotency_keys.sql)
      const insertQuery = tx.insert(orders).values({
        tenantId,
        orderNumber,
        customerId,
        total: total.toFixed(2),
        deliveryAddress: input.deliveryAddress || null,
        deliveryNotes: input.notes || "طلب من المتجر الإلكتروني",
        assignedTo: "المتجر الإلكتروني",
        status: "pending",
        idempotencyKey: input.idempotencyKey ?? null,
      });
      const inserted = input.idempotencyKey
        ? await insertQuery
            .onConflictDoNothing({ target: orders.idempotencyKey })
            .returning()
        : await insertQuery.returning();
      if (inserted.length === 0) {
        const winner = await tx
          .select()
          .from(orders)
          .where(eq(orders.idempotencyKey, input.idempotencyKey!))
          .limit(1);
        return {
          orderId: winner[0].id,
          orderNumber: winner[0].orderNumber,
          idempotent: true,
        };
      }
      const [order] = inserted;

      await tx
        .insert(orderItems)
        .values(itemValues.map(it => ({ ...it, orderId: order.id })));

      for (const it of itemValues) {
        // Atomic guarded decrement via the CENTRAL STOCK GUARD —
        // a single `UPDATE … WHERE currentStock >= qty`; exactly one of two
        // concurrent buyers of the last unit gets a row back (no oversell,
        // balance never goes negative).
        const deducted = await deductProductStock(tx, {
          productId: it.productId,
          quantity: it.quantity,
        });
        if (!deducted.success)
          throw new Error(
            `الكمية المطلوبة من «${it.productName}» تجاوزت المتوفر عند تأكيد الطلب`
          );
        // Every movement is linked to its source order (no orphans).
        await recordStockMovement(tx, {
          tenantId,
          productId: it.productId,
          type: "out",
          quantity: it.quantity,
          referenceId: order.id,
          referenceType: "order",
          notes: `طلب متجر إلكتروني ${orderNumber}`,
        });
      }
      return { orderId: order.id, orderNumber };
    });
  } catch (e) {
    // Lost the race between pre-check and INSERT (or inside the tx):
    // return the winner instead of failing / double-deducting.
    if (input.idempotencyKey && isUniqueViolationDatabaseError(e)) {
      const winner = await readExistingByKey(input.idempotencyKey);
      if (winner)
        return {
          orderId: winner.id,
          orderNumber: winner.orderNumber,
          idempotent: true,
        };
    }
    throw e;
  }

  if (process.env.ORDER_WEBHOOK_URL) {
    const payload = {
      event: "order.created",
      orderNumber,
      customerName: input.customerName,
      customerPhone: phone || null,
      deliveryAddress: input.deliveryAddress || null,
      notes: input.notes || null,
      total: total.toFixed(2),
      items: itemValues.map(it => ({
        name: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
      timestamp: new Date().toISOString(),
    };
    fetch(process.env.ORDER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(e => {
      console.warn("[webStore] order webhook failed:", e?.message || e);
    });
  }

  return result;
}
