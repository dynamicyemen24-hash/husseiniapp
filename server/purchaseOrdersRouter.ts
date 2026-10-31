/**
 * server/purchaseOrdersRouter.ts
 * -------------------------------
 * دورة التوريد الكاملة: أوامر الشراء (Purchase Orders) ثم سندات الاستلام (GRN).
 *
 * سلسلة الحوكمة:
 *   draft ← issue (اعتماد + إصدار) ← receive (استلام وترحيل مخزون + SND) ← close
 * كل عملية تنتقل عبر `db.transaction` واحدة، وترحيل المخزون يحدث فقط في receive (GRN)
 * حتى لا يتضاعف عند فوترة سند الاستلام لاحقاً.
 *
 * تكامل المطابقة الثلاثية: الاستلام يُسند للكميات المتبقية في الأمر فقط
 * (matchGrnAgainstPo) دون استلام زائد — قبل أي ترحيل.
 */

import { z } from "zod";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  ilike,
  inArray,
  isNull,
  gte,
} from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import { PERMISSIONS } from "../shared/permissions";
import { matchGrnAgainstPo } from "./threeWayMatch";
import { assertPeriodOpen } from "./services/accountingEngine";
import {
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  products,
  warehouses,
  warehouseStock,
  inventoryValuationLayers,
  inventoryMovements,
  branches,
  accounts,
  journalEntries,
  transactions,
  activityLogs,
  purchaseInvoices,
  procurements,
} from "../drizzle/schema";

const PO_ALLOWED_CANCEL = new Set(["draft", "issued"]);
const PO_RECEIVABLE = new Set(["issued", "partially_received"]);

const toNum = (v: string | number | null | undefined): number =>
  v === null || v === undefined ? 0 : Number(v) || 0;

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const dateStamp = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

async function docNextNumber(
  tx: any,
  table: any,
  tenantId: number,
  column: string,
  prefix: string
) {
  const stamp = dateStamp(new Date());
  const [row] = await tx
    .select({ c: sql<number>`count(*)` })
    .from(table)
    .where(
      and(
        eq(table.tenantId, tenantId),
        ilike(table[column], `${prefix}-${stamp}-%`)
      )
    );
  return `${prefix}-${stamp}-${String(Number(row?.c ?? 0) + 1).padStart(3, "0")}`;
}

/** ترحيل المخزون الفعلي لسند استلام: المنتجات + رصيد المخزن + طبقة تقييم + حركة. */
async function postGrnStock(
  tx: any,
  opts: {
    tenantId: number;
    grnId: number;
    grnNumber: string;
    poNumber: string;
    lines: Array<{
      productId: number;
      quantityReceived: number;
      unitPrice: string | number;
    }>;
  }
) {
  const defaultWarehouse = await tx
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(
      and(eq(warehouses.tenantId, opts.tenantId), eq(warehouses.isActive, true))
    )
    .orderBy(asc(warehouses.code))
    .limit(1);
  const warehouseId = defaultWarehouse[0]?.id ?? null;

  for (const line of opts.lines) {
    await tx
      .update(products)
      .set({
        currentStock: sql`${products.currentStock} + ${line.quantityReceived}`,
      })
      .where(eq(products.id, line.productId));

    if (warehouseId) {
      await tx
        .insert(warehouseStock)
        .values({
          tenantId: opts.tenantId,
          productId: line.productId,
          warehouseId,
          quantity: line.quantityReceived,
          reservedQty: 0,
          availableQty: line.quantityReceived,
          lastMovementAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            warehouseStock.productId,
            warehouseStock.warehouseId,
            warehouseStock.tenantId,
          ],
          set: {
            quantity: sql`${warehouseStock.quantity} + ${line.quantityReceived}`,
            availableQty: sql`${warehouseStock.availableQty} + ${line.quantityReceived}`,
            lastMovementAt: new Date(),
            updatedAt: new Date(),
          },
        });

      const unitCost = toNum(line.unitPrice);
      await tx.insert(inventoryValuationLayers).values({
        tenantId: opts.tenantId,
        productId: line.productId,
        warehouseId,
        layerDate: new Date(),
        quantity: line.quantityReceived,
        remainingQty: line.quantityReceived,
        unitCost: unitCost.toFixed(4),
        totalCost: (unitCost * line.quantityReceived).toFixed(2),
        sourceType: "purchase-grn",
        sourceId: opts.grnId,
        referenceType: "goods_receipt",
        referenceId: opts.grnId,
      });
    }

    await tx.insert(inventoryMovements).values({
      tenantId: opts.tenantId,
      productId: line.productId,
      warehouseId: warehouseId ?? null,
      type: "in",
      quantity: line.quantityReceived,
      referenceId: opts.grnId,
      referenceType: "goods_receipt",
      notes: `سند استلام ${opts.grnNumber} (أمر شراء ${opts.poNumber})`,
    });
  }
}

/**
 * قيد موثق لسند الاستلام عند وجود حساب مقاصة 2015 (بضاعة مستلمة غير مفوترة):
 *   مدين  1060 مخزون البضاعة
 *   دائن  2015 بضاعة مستلمة غير مفوترة
 * الغياب الافتراضي لحساب المقاصة يعني اكتفاءً آمن بترحيل المخزون دون قيد مالي
 * — لا يوجد قيد خاطئ إذا لم يكن الرسم البياني مهيأً لحساب المقاصة.
 */
async function postGrnGlEntries(
  tx: any,
  opts: {
    tenantId: number;
    userId: number | null;
    grnId: number;
    grnNumber: string;
    total: number;
  }
) {
  await assertPeriodOpen(
    tx,
    opts.tenantId,
    new Date(),
    `سند استلام ${opts.grnNumber}`
  );
  const findAccount = async (code: string) => {
    const rows = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.code, code), eq(accounts.tenantId, opts.tenantId)))
      .limit(1);
    return rows[0];
  };
  const inventoryAcc = await findAccount("1060");
  const clearingAcc = await findAccount("2015");
  if (!inventoryAcc || !clearingAcc) return; // no clearing account — stock only

  const bRows = await tx
    .select()
    .from(branches)
    .where(eq(branches.tenantId, opts.tenantId))
    .orderBy(desc(branches.isMain))
    .limit(1);
  const effectiveBranchId = bRows[0]?.id ?? null;

  const amt = opts.total.toFixed(2);
  const pending = [
    {
      tenantId: opts.tenantId,
      accountId: inventoryAcc.id,
      branchId: effectiveBranchId,
      amount: amt,
      type: "debit" as const,
      transactionDate: new Date(),
      narration: `استلام بضاعة — ${opts.grnNumber}`,
      lifecycleStatus: "posted",
      referenceType: "goods_receipt",
      referenceId: opts.grnId,
      sourceModule: "procurement",
      userId: opts.userId,
    },
    {
      tenantId: opts.tenantId,
      accountId: clearingAcc.id,
      branchId: effectiveBranchId,
      amount: amt,
      type: "credit" as const,
      transactionDate: new Date(),
      narration: `بضاعة مستلمة غير مفوترة — ${opts.grnNumber}`,
      lifecycleStatus: "posted",
      referenceType: "goods_receipt",
      referenceId: opts.grnId,
      sourceModule: "procurement",
      userId: opts.userId,
    },
  ];
  const [je] = await tx
    .insert(journalEntries)
    .values({
      tenantId: opts.tenantId,
      branchId: effectiveBranchId,
      sourceModule: "procurement",
      sourceRefType: "goods_receipt",
      sourceRefId: opts.grnId,
      referenceNo: opts.grnNumber,
      status: "posted",
      totalAmount: opts.total.toFixed(2),
      createdById: opts.userId,
      postedAt: new Date(),
    })
    .returning();
  for (const e of pending) {
    await tx.insert(transactions).values({ ...e, journalEntryId: je.id });
  }
}

/** استرجاع سطر أمر شراء بصيغة متوافقة مع محرك المطابقة. */
async function loadOrderLines(db: Db, poId: number) {
  const rows = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.poId, poId));
  return rows.map(r => ({
    poItemId: r.id,
    productId: r.productId,
    productName: r.productName,
    quantity: r.quantity,
    receivedQty: r.receivedQty,
    unitPrice: r.unitPrice,
    discount: r.discount,
  }));
}

export const purchaseOrdersRouter = router({
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_VIEW))
    .input(
      z
        .object({
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
          status: z
            .enum([
              "draft",
              "issued",
              "partially_received",
              "received",
              "cancelled",
              "closed",
            ])
            .optional(),
          supplierId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { items: [], total: 0 };
      const conditions: any[] = [eq(purchaseOrders.tenantId, ctx.tenantId)];
      if (input?.status)
        conditions.push(eq(purchaseOrders.status, input.status));
      if (input?.supplierId)
        conditions.push(eq(purchaseOrders.supplierId, input.supplierId));
      const where = and(...conditions);
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseOrders)
        .where(where);
      const items = await db
        .select()
        .from(purchaseOrders)
        .where(where)
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      return { items, total: countRow?.count ?? 0 };
    }),

  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!po) return null;
      const lines = await loadOrderLines(db, po.id);
      const grns = await db
        .select()
        .from(goodsReceipts)
        .where(
          and(
            eq(goodsReceipts.poId, po.id),
            eq(goodsReceipts.tenantId, ctx.tenantId)
          )
        )
        .orderBy(desc(goodsReceipts.createdAt));
      return { po, lines, grns };
    }),

  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_CREATE))
    .input(
      z.object({
        supplierId: z.number().int().positive(),
        requisitionId: z.number().optional(),
        warehouseId: z.number().optional(),
        branchId: z.number().optional(),
        costCenterId: z.number().optional(),
        projectId: z.number().optional(),
        expectedDeliveryDate: z.string().optional(),
        notes: z.string().optional(),
        taxRate: z.string().default("0"),
        discount: z.string().default("0"),
        idempotencyKey: z.string().max(255).optional(),
        items: z
          .array(
            z.object({
              productId: z.number(),
              quantity: z.number().int().min(1),
              unitPrice: z
                .string()
                .refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
                  message: "السعر يجب أن يكون رقماً غير سالب",
                }),
              discount: z.string().default("0"),
            })
          )
          .min(1, "يجب إضافة صنف واحد على الأقل"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Idempotency: إعادة إرسال الطلب لا ينشئ أمراً مكرراً.
      if (input.idempotencyKey) {
        const [existing] = await db
          .select()
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.tenantId, ctx.tenantId),
              eq(purchaseOrders.idempotencyKey, input.idempotencyKey)
            )
          )
          .limit(1);
        if (existing)
          return {
            success: true,
            reused: true,
            id: existing.id,
            poNumber: existing.poNumber,
          };
      }

      const productIds = input.items.map(i => i.productId);
      const productRows = await db
        .select()
        .from(products)
        .where(
          and(inArray(products.id, productIds), isNull(products.deletedAt))
        );
      const productMap = new Map(productRows.map(p => [p.id, p]));
      for (const item of input.items) {
        if (!productMap.has(item.productId))
          throw new Error(`المنتج رقم ${item.productId} غير موجود`);
      }

      const discount = parseFloat(input.discount);
      const taxRate = parseFloat(input.taxRate);
      if (isNaN(discount) || discount < 0) throw new Error("الخصم غير صحيح");
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100)
        throw new Error("نسبة الضريبة غير صحيحة");

      const subtotal = input.items.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      );
      const taxAmount = ((subtotal - discount) * taxRate) / 100;
      const total = subtotal - discount + taxAmount;

      const result = await (db as any).transaction(async (tx: any) => {
        const poNumber = await docNextNumber(
          tx,
          purchaseOrders,
          ctx.tenantId!,
          "poNumber",
          "PO"
        );
        const [po] = await tx
          .insert(purchaseOrders)
          .values({
            tenantId: ctx.tenantId,
            poNumber,
            supplierId: input.supplierId,
            requisitionId: input.requisitionId ?? null,
            branchId: input.branchId ?? null,
            costCenterId: input.costCenterId ?? null,
            warehouseId: input.warehouseId ?? null,
            projectId: input.projectId ?? null,
            expectedDeliveryDate: input.expectedDeliveryDate
              ? new Date(input.expectedDeliveryDate)
              : null,
            notes: input.notes ?? null,
            status: "draft",
            subtotal: subtotal.toFixed(2),
            taxRate: input.taxRate,
            taxAmount: taxAmount.toFixed(2),
            discount: input.discount,
            total: total.toFixed(2),
            idempotencyKey: input.idempotencyKey ?? null,
            userId: ctx.user.id,
          })
          .returning();

        const itemValues = input.items.map(item => {
          const lineTotal =
            parseFloat(item.unitPrice) * item.quantity -
            parseFloat(item.discount);
          return {
            poId: po.id,
            productId: item.productId,
            productName:
              productMap.get(item.productId)?.name ??
              productMap.get(item.productId)?.nameAr ??
              `منتج ${item.productId}`,
            quantity: item.quantity,
            receivedQty: 0,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: lineTotal.toFixed(2),
          };
        });
        await tx.insert(purchaseOrderItems).values(itemValues);

        if (input.requisitionId) {
          await tx
            .update(procurements)
            .set({ status: "ordered" })
            .where(
              and(
                eq(procurements.id, input.requisitionId),
                eq(procurements.tenantId, ctx.tenantId!)
              )
            );
        }

        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `إنشاء أمر شراء: ${poNumber}`,
          details: `الإجمالي: ${total.toFixed(2)} — المورد: ${input.supplierId} (${input.items.length} صنف)`,
        });

        return { id: po.id, poNumber };
      });

      return { success: true, reused: false, ...result };
    }),

  /** اعتماد وإصدار الأمر (لا يُصدر إلا عبر صلاحية اعتماد المشتريات). */
  issue: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_APPROVE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("Database not available");
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!po) throw new Error("أمر الشراء غير موجود");
      if (po.status !== "draft")
        throw new Error("لا يمكن إصدار أمر شراء إلا من الحالة مسودة");
      await (db as any).transaction(async (tx: any) => {
        await tx
          .update(purchaseOrders)
          .set({
            status: "issued",
            issuedAt: new Date(),
            issuedById: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrders.id, po.id));
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `إصدار أمر شراء: ${po.poNumber}`,
          details: `اعتماد وإصدار التزام الشراء للمورد ${po.supplierId}`,
        });
      });
      return { success: true, id: po.id, status: "issued" };
    }),

  /** إلغاء أمر شراء — مسودات وأوامر صادرة فقط، ويمنع إذا بدأ الاستلام. */
  cancel: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_APPROVE))
    .input(z.object({ id: z.number(), reason: z.string().max(255).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("Database not available");
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!po) throw new Error("أمر الشراء غير موجود");
      if (!PO_ALLOWED_CANCEL.has(po.status))
        throw new Error(
          "أمر الشراء بدأ استلامه ولا يمكن إلغاؤه — أغلق المتبقي لا غير"
        );
      const lines = await loadOrderLines(db, po.id);
      if (lines.some(l => l.receivedQty > 0))
        throw new Error(
          "هناك كميات مستلمة — الإلغاء مرفوض حفاظاً على سلامة المخزون"
        );

      await (db as any).transaction(async (tx: any) => {
        await tx
          .update(purchaseOrders)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledById: ctx.user.id,
            cancelReason: input.reason ?? null,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrders.id, po.id));
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `إلغاء أمر شراء: ${po.poNumber}`,
          details: input.reason ?? "بدون سبب",
        });
      });
      return { success: true, id: po.id, status: "cancelled" };
    }),

  /** إغلاق أمر شراء مستلم بالكامل — نهائي قبل الأرشفة. */
  close: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_APPROVE))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("Database not available");
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.id),
            eq(purchaseOrders.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!po) throw new Error("أمر الشراء غير موجود");
      if (po.status !== "received")
        throw new Error("لا يُغلق الأمر إلا بعد اكتمال استلام جميع الأصناف");

      await (db as any).transaction(async (tx: any) => {
        await tx
          .update(purchaseOrders)
          .set({
            status: "closed",
            closedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrders.id, po.id));
        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `إغلاق أمر شراء: ${po.poNumber}`,
          details: "اكتمال الدورة واستلام جميع الأصناف",
        });
      });
      return { success: true, id: po.id, status: "closed" };
    }),

  /**
   * استلام جزئي/كامل: يُنشئ سند استلام ويُرحّل المخزون ويرفع عدد المستلم
   * ويفرس حالة الأمر. ممنوع الاستلام الزائد (تفاوت 0%) عبر محرك المطابقة.
   */
  receive: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_RECEIVE))
    .input(
      z.object({
        poId: z.number(),
        warehouseId: z.number().optional(),
        notes: z.string().optional(),
        items: z
          .array(
            z.object({
              poItemId: z.number(),
              productId: z.number(),
              quantityReceived: z.number().int().min(1),
            })
          )
          .min(1, "يجب استلام صنف واحد على الأقل"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) throw new Error("يجب إنشاء مؤسسة أولاً");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, input.poId),
            eq(purchaseOrders.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!po) throw new Error("أمر الشراء غير موجود");
      if (!PO_RECEIVABLE.has(po.status))
        throw new Error("لا يمكن الاستلام على أمر غير صادر أو ملغي");

      const lines = await loadOrderLines(db, po.id);
      const byItemId = new Map(lines.map(l => [l.poItemId, l]));
      for (const rc of input.items) {
        if (!byItemId.has(rc.poItemId))
          throw new Error(`سطر أمر شراء غير صالح: ${rc.poItemId}`);
        const line = byItemId.get(rc.poItemId)!;
        if (rc.productId !== line.productId)
          throw new Error(`صنف غير مطابق لسطر الأمر: ${rc.productId}`);
      }

      // المطابقة الثنائية: GRN مقابل PO — ممنوع الاستلام الزائد.
      const match = matchGrnAgainstPo(
        lines,
        input.items.map(rc => {
          const line = byItemId.get(rc.poItemId)!;
          return {
            productId: rc.productId,
            productName: line.productName,
            quantityReceived: rc.quantityReceived,
            unitPrice: line.unitPrice,
          };
        })
      );
      if (!match.ok) {
        throw new Error(
          `تعذر الاستلام — ${match.issues.map(i => i.message).join(" | ")}`
        );
      }

      const receivedMap = new Map(
        input.items.map(rc => [rc.poItemId, rc.quantityReceived])
      );

      const result = await (db as any).transaction(async (tx: any) => {
        const grnNumber = await docNextNumber(
          tx,
          goodsReceipts,
          ctx.tenantId!,
          "grnNumber",
          "GRN"
        );
        const [grn] = await tx
          .insert(goodsReceipts)
          .values({
            tenantId: ctx.tenantId,
            grnNumber,
            poId: po.id,
            supplierId: po.supplierId,
            branchId: po.branchId,
            warehouseId: input.warehouseId ?? po.warehouseId ?? null,
            status: "posted",
            receivedAt: new Date(),
            notes: input.notes ?? null,
            postedAt: new Date(),
            postedById: ctx.user.id,
            userId: ctx.user.id,
          })
          .returning();

        let grnTotal = 0;
        const grnLines: Array<{
          productId: number;
          quantityReceived: number;
          unitPrice: string | number;
        }> = [];
        for (const item of input.items) {
          const line = byItemId.get(item.poItemId)!;
          const itemCost = toNum(line.unitPrice) * item.quantityReceived;
          grnTotal += itemCost;
          grnLines.push({
            productId: line.productId,
            quantityReceived: item.quantityReceived,
            unitPrice: line.unitPrice,
          });
          await tx.insert(goodsReceiptItems).values({
            grnId: grn.id,
            poItemId: line.poItemId,
            productId: line.productId,
            productName: line.productName,
            quantityReceived: item.quantityReceived,
            unitPrice: line.unitPrice,
            receivedAt: new Date(),
          });
          await tx
            .update(purchaseOrderItems)
            .set({
              receivedQty: sql`${purchaseOrderItems.receivedQty} + ${item.quantityReceived}`,
            })
            .where(eq(purchaseOrderItems.id, line.poItemId));
        }

        const allReceived = lines.every(
          l => l.receivedQty + (receivedMap.get(l.poItemId) ?? 0) >= l.quantity
        );
        const poStatus = allReceived ? "received" : "partially_received";
        await tx
          .update(purchaseOrders)
          .set({ status: poStatus, updatedAt: new Date() })
          .where(eq(purchaseOrders.id, po.id));

        await postGrnStock(tx, {
          tenantId: ctx.tenantId!,
          grnId: grn.id,
          grnNumber,
          poNumber: po.poNumber,
          lines: grnLines,
        });

        await postGrnGlEntries(tx, {
          tenantId: ctx.tenantId!,
          userId: ctx.user.id,
          grnId: grn.id,
          grnNumber,
          total: grnTotal,
        });

        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `سند استلام: ${grnNumber}`,
          details: `استلام ضد أمر شراء ${po.poNumber} — الإجمالي ${grnTotal.toFixed(2)}`,
        });

        return { grnId: grn.id, grnNumber, poStatus };
      });

      return { success: true, ...result };
    }),
});

export const goodsReceiptsRouter = router({
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_VIEW))
    .input(
      z
        .object({
          poId: z.number().optional(),
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return { items: [], total: 0 };
      const conditions: any[] = [eq(goodsReceipts.tenantId, ctx.tenantId)];
      if (input?.poId) conditions.push(eq(goodsReceipts.poId, input.poId));
      const where = and(...conditions);
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(goodsReceipts)
        .where(where);
      const items = await db
        .select()
        .from(goodsReceipts)
        .where(where)
        .orderBy(desc(goodsReceipts.receivedAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      return { items, total: countRow?.count ?? 0 };
    }),

  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_VIEW))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const [grn] = await db
        .select()
        .from(goodsReceipts)
        .where(
          and(
            eq(goodsReceipts.id, input.id),
            eq(goodsReceipts.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!grn) return null;
      const lines = await db
        .select()
        .from(goodsReceiptItems)
        .where(eq(goodsReceiptItems.grnId, grn.id));
      return { grn, lines };
    }),

  /**
   * إلغاء سند استلام: عكس الترحيب (مخزون) وتحرير الكميات المستلمة في الأمر —
   * ممنوع إذا ارتبط السند بفاتورة (حماية سلسلة المطابقة الثلاثية).
   */
  cancel: tenantProcedure
    .use(requirePermissions(PERMISSIONS.PROCUREMENT_APPROVE))
    .input(z.object({ id: z.number(), reason: z.string().max(255).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("Database not available");
      const [grn] = await db
        .select()
        .from(goodsReceipts)
        .where(
          and(
            eq(goodsReceipts.id, input.id),
            eq(goodsReceipts.tenantId, ctx.tenantId)
          )
        )
        .limit(1);
      if (!grn) throw new Error("سند الاستلام غير موجود");
      if (grn.status === "cancelled") throw new Error("السند ملغى مسبقاً");
      const [linked] = await db
        .select({ id: purchaseInvoices.id })
        .from(purchaseInvoices)
        .where(eq(purchaseInvoices.grnId, grn.id))
        .limit(1);
      if (linked)
        throw new Error("السند مرتبط بفاتورة — عكس السند ممنوع بعد الفوترة");

      const lines = await db
        .select()
        .from(goodsReceiptItems)
        .where(eq(goodsReceiptItems.grnId, grn.id));

      await (db as any).transaction(async (tx: any) => {
        for (const line of lines) {
          const updated = await tx
            .update(products)
            .set({
              currentStock: sql`${products.currentStock} - ${line.quantityReceived}`,
            })
            .where(
              and(
                eq(products.id, line.productId),
                gte(products.currentStock, line.quantityReceived)
              )
            )
            .returning({ id: products.id });
          if (updated.length === 0)
            throw new Error(
              `المخزون غير كافٍ لعكس سند الاستلام — المنتج ${line.productId}`
            );

          if (line.poItemId) {
            await tx
              .update(purchaseOrderItems)
              .set({
                receivedQty: sql`${purchaseOrderItems.receivedQty} - ${line.quantityReceived}`,
              })
              .where(eq(purchaseOrderItems.id, line.poItemId));
          }
          await tx.insert(inventoryMovements).values({
            tenantId: ctx.tenantId,
            productId: line.productId,
            warehouseId: grn.warehouseId ?? null,
            type: "out",
            quantity: line.quantityReceived,
            referenceId: grn.id,
            referenceType: "goods_receipt_cancel",
            notes: `عكس سند استلام ${grn.grnNumber} — ${input.reason ?? "إلغاء"}`,
          });
        }

        const remaining = (await tx
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.poId, grn.poId))) as Array<{
          receivedQty: number;
          quantity: number;
        }>;
        const nextStatus = remaining.every(l => l.receivedQty <= 0)
          ? "issued" // لم يبقَ أي استلام على الأمر
          : remaining.every(l => l.receivedQty >= l.quantity)
            ? "received"
            : "partially_received";
        await tx
          .update(purchaseOrders)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(purchaseOrders.id, grn.poId));

        await tx
          .update(goodsReceipts)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledById: ctx.user.id,
            cancelReason: input.reason ?? null,
            updatedAt: new Date(),
          })
          .where(eq(goodsReceipts.id, grn.id));

        await tx.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `إلغاء سند استلام: ${grn.grnNumber}`,
          details: input.reason ?? "بدون سبب",
        });
      });

      return { success: true, id: grn.id, status: "cancelled" };
    }),
});
