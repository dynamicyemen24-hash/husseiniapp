import { z } from "zod";
import { router, tenantProcedure } from "./_core/trpc";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  accounts,
  billsOfMaterials,
  costCenters,
  inventoryItems,
  productionOrders,
  products,
  warehouses,
} from "../drizzle/schema";
import { postBalancedJournalInTx } from "./services/accountingEngine";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { requireTenantId } from "./_core/tenant";
import { safeToNumber } from "@shared/numeric";

/**
 * محاسبة الإنتاج — قوائم المواد وأوامر التشغيل.
 *
 * قواعد سلامة مفروضة على الخادم:
 *   • كل مرجع (منتج، حساب، مركز تكلفة، مستودع) يُتحقق من أنه لمؤسسة المستدعي.
 *   • إكمال أمر الإنتاج ذرّي: تحديث مشروط على الحالة يمنع الإكمال المزدوج.
 *   • خامات الوصفة تُستهلك من المخزون فعلياً، وتُشترى النواقص على fuselage.
 *   • القوائم تُقرأ بصفحات — لا تحميل كامل للجداول.
 */

const bomItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

export const productionAccountingRouter = router({
  getBoms: tenantProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };
      const tenantId = requireTenantId(ctx);
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions = [eq(billsOfMaterials.tenantId, tenantId)];
      if (input?.search) {
        const pattern = `%${input.search}%`;
        conditions.push(
          sql`(${billsOfMaterials.name} ILIKE ${pattern} OR ${billsOfMaterials.code} ILIKE ${pattern})`
        );
      }
      const where = and(...conditions);

      const rows = await db
        .select()
        .from(billsOfMaterials)
        .where(where)
        .orderBy(billsOfMaterials.name)
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(billsOfMaterials)
        .where(where);

      return { rows, total: count };
    }),

  createBom: tenantProcedure
    .input(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        productId: z.number().int().positive(),
        outputQty: z.number().positive().default(1),
        items: z.array(bomItemSchema).min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      const tenantId = requireTenantId(ctx);

      // المنتج النهائي يجب أن يكون من مؤسسة المستدعي
      const productRows = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(eq(products.id, input.productId), eq(products.tenantId, tenantId))
        )
        .limit(1);
      if (productRows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المنتج النهائي غير موجود في هذه المؤسسة",
        });
      }

      // كل خامة في الوصفة يجب أن تكون من مؤسسة المستدعي
      const itemIds = [...new Set(input.items.map(i => i.productId))];
      const validItems = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            sql`${products.id} IN ${itemIds}`,
            eq(products.tenantId, tenantId)
          )
        );
      if (validItems.length !== itemIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "بعض الخامات المدرجة لا تخص هذه المؤسسة",
        });
      }

      const [inserted] = await db
        .insert(billsOfMaterials)
        .values({
          tenantId: tenantId,
          code: input.code,
          name: input.name,
          productId: input.productId,
          outputQty: input.outputQty.toFixed(4),
          items: input.items,
          notes: input.notes || null,
        })
        .returning();
      return inserted;
    }),

  getProductionOrders: tenantProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };
      const tenantId = requireTenantId(ctx);
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const conditions = [eq(productionOrders.tenantId, tenantId)];
      if (input?.status) {
        conditions.push(eq(productionOrders.status, input.status));
      }
      const where = and(...conditions);

      const rows = await db
        .select()
        .from(productionOrders)
        .where(where)
        .orderBy(desc(productionOrders.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(productionOrders)
        .where(where);

      return { rows, total: count };
    }),

  createProductionOrder: tenantProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1),
        bomId: z.number().int().positive(),
        productId: z.number().int().positive(),
        plannedQty: z.number().positive(),
        warehouseId: z.number().int().positive().optional(),
        costCenterId: z.number().int().positive().optional(),
        estimatedCost: z.number().nonnegative(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      const tenantId = requireTenantId(ctx);

      // الوصفة يجب أن تخص المؤسسة، والمنتج يجب أن يطابق منتج الوصفة
      const bomRows = await db
        .select({
          id: billsOfMaterials.id,
          productId: billsOfMaterials.productId,
        })
        .from(billsOfMaterials)
        .where(
          and(
            eq(billsOfMaterials.id, input.bomId),
            eq(billsOfMaterials.tenantId, tenantId)
          )
        )
        .limit(1);
      if (bomRows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "قائمة المواد غير موجودة في هذه المؤسسة",
        });
      }
      if (bomRows[0].productId !== input.productId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "المنتج المحدد لا يطابق المنتج النهائي لقائمة المواد",
        });
      }

      if (input.warehouseId) {
        const wh = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(
            and(
              eq(warehouses.id, input.warehouseId),
              eq(warehouses.tenantId, tenantId)
            )
          )
          .limit(1);
        if (wh.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستودع غير موجود في هذه المؤسسة",
          });
        }
      }

      if (input.costCenterId) {
        const cc = await db
          .select({ id: costCenters.id })
          .from(costCenters)
          .where(
            and(
              eq(costCenters.id, input.costCenterId),
              eq(costCenters.tenantId, tenantId)
            )
          )
          .limit(1);
        if (cc.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "مركز التكلفة غير موجود في هذه المؤسسة",
          });
        }
      }

      const [inserted] = await db
        .insert(productionOrders)
        .values({
          tenantId: tenantId,
          orderNumber: input.orderNumber,
          bomId: input.bomId,
          productId: input.productId,
          plannedQty: input.plannedQty.toFixed(4),
          warehouseId: input.warehouseId || null,
          costCenterId: input.costCenterId || null,
          estimatedCost: input.estimatedCost.toFixed(2),
          status: "planned",
        })
        .returning();
      return inserted;
    }),

  /**
   * إكمال أمر الإنتاج — عملية واحدة ذرّية:
   *   1. قفل أمر الإنتاج ومنع الإكمال المزدوج.
   *   2. التحقق من الحسابات ضمن المؤسسة.
   *   3. استهلاك خامات الوصفة من المخزون (أو الإبلاغ عن النقص).
   *   4. إثبات قيد مزدوج (إنتاج تام / إقفال WIP).
   *   5. تحديث مشروط على الحالة.
   *
   * كل الخطوات داخل معاملة واحدة: أي فشل (نقص مخزون، فترة مغلقة، تعارض
   * concurrent) يتراجع عنه بالكامل — لا قيد بلا خصم ولا خصم بلا قيد.
   */
  completeProductionOrder: tenantProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        producedQty: z.number().positive(),
        scrapedQty: z.number().nonnegative().default(0),
        actualCost: z.number().positive(),
        finishedGoodsAccountId: z.number().int().positive(),
        wipAccountId: z.number().int().positive(),
        narration: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      const tenantId = requireTenantId(ctx);

      return await db.transaction(async (tx: any) => {
        const orderRows = await tx
          .select()
          .from(productionOrders)
          .where(
            and(
              eq(productionOrders.id, input.orderId),
              eq(productionOrders.tenantId, tenantId)
            )
          )
          .limit(1)
          .forUpdate(); // قفل الصف: يمنع إكمالَين متزامنين للأمر نفسه

        if (orderRows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "أمر الإنتاج غير موجود",
          });
        }

        const order = orderRows[0];
        if (order.status === "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "أمر الإنتاج مكتمل مسبقاً",
          });
        }

        // الحسابات المستخدمة يجب أن تخص المؤسسة
        const accountIds = [input.finishedGoodsAccountId, input.wipAccountId];
        const validAccounts = await tx
          .select({ id: accounts.id, type: accounts.type })
          .from(accounts)
          .where(
            and(
              sql`${accounts.id} IN ${accountIds}`,
              eq(accounts.tenantId, tenantId)
            )
          );
        if (validAccounts.length !== accountIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "أحد الحسابات المحددة لا يخص هذه المؤسسة",
          });
        }

        // استخراج مواد الوصفة بنسبة الكمية المنتَجة إلى كمية الوصفة القياسية
        const bomRows = await db
          .select({
            items: billsOfMaterials.items,
            outputQty: billsOfMaterials.outputQty,
          })
          .from(billsOfMaterials)
          .where(
            and(
              eq(billsOfMaterials.id, order.bomId),
              eq(billsOfMaterials.tenantId, tenantId)
            )
          )
          .limit(1);
        if (bomRows.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "قائمة المواد غير موجودة",
          });
        }

        const bomItems = (bomRows[0].items ?? []) as Array<{
          productId: number;
          quantity: number;
          unitCost: number;
        }>;
        const outputQty = safeToNumber(bomRows[0].outputQty, 1) || 1;
        const factor = input.producedQty / outputQty;

        // استهلاك الخامات من المخزون
        const shortages: string[] = [];
        if (bomItems.length > 0) {
          const materialIds = [...new Set(bomItems.map(i => i.productId))];
          const stockRows = await tx
            .select({
              id: inventoryItems.id,
              productId: inventoryItems.productId,
              branchId: inventoryItems.branchId,
              currentStock: inventoryItems.currentStock,
            })
            .from(inventoryItems)
            .where(
              and(
                sql`${inventoryItems.productId} IN ${materialIds}`,
                eq(inventoryItems.tenantId, tenantId)
              )
            );

          const stockByProduct = new Map<number, number>();
          for (const row of stockRows) {
            stockByProduct.set(
              row.productId,
              (stockByProduct.get(row.productId) ?? 0) + row.currentStock
            );
          }

          for (const item of bomItems) {
            const required = Math.ceil(item.quantity * factor);
            const available = stockByProduct.get(item.productId) ?? 0;
            if (available < required) {
              shortages.push(
                `الصنف ${item.productId}: مطلوب ${required} والمتوفر ${available}`
              );
            }
          }
        }

        if (shortages.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `لا يمكن إكمال الإنتاج — نقص في الخامات: ${shortages.join("، ")}`,
          });
        }

        // استهلاك الخامات من المخزون — يُخصم من المستودعات بالترتيب حتى الكمية المطلوبة
        for (const item of bomItems) {
          const required = Math.ceil(item.quantity * factor);
          let remaining = required;
          const stockRows = await tx
            .select({
              id: inventoryItems.id,
              currentStock: inventoryItems.currentStock,
            })
            .from(inventoryItems)
            .where(
              and(
                eq(inventoryItems.tenantId, tenantId),
                eq(inventoryItems.productId, item.productId)
              )
            )
            .orderBy(inventoryItems.currentStock);

          for (const row of stockRows) {
            if (remaining <= 0) break;
            if (row.currentStock <= 0) continue;
            const take = Math.min(row.currentStock, remaining);
            await tx
              .update(inventoryItems)
              .set({
                currentStock: sql`${inventoryItems.currentStock} - ${take}`,
              })
              .where(eq(inventoryItems.id, row.id));
            remaining -= take;
          }
        }

        // Post balanced journal entry: Debit Finished Goods, Credit WIP
        // داخل نفس المعاملة — لا COMMIT داخلي (transactions المتداخلة في
        // neon-serverless تنهي المعاملة الخارجية مبكراً).
        const journalRes = await postBalancedJournalInTx(tx, {
          tenantId: tenantId,
          date: new Date(),
          narration:
            input.narration ||
            `إثبات إنتاج تام لأمر الإنتاج #${order.orderNumber}`,
          sourceModule: "production_accounting",
          sourceRefType: "production_order",
          sourceRefId: order.id,
          legs: [
            {
              accountId: input.finishedGoodsAccountId,
              type: "debit",
              amount: input.actualCost,
              narration: "إنتاج تام الصنع",
            },
            {
              accountId: input.wipAccountId,
              type: "credit",
              amount: input.actualCost,
              narration: "إقفال قيد الإنتاج تحت التشغيل WIP",
            },
          ],
        });

        // تحديث مشروط على الحالة — الطلب المتكرر لا يُثبّت قيداً ثانياً،
        // وأي تعارض يُرجِع المعاملة بالكامل (لا خصم مخزون بلا قيد).
        const updatedRows = await tx
          .update(productionOrders)
          .set({
            producedQty: input.producedQty.toFixed(4),
            scrapedQty: input.scrapedQty.toFixed(4),
            actualCost: input.actualCost.toFixed(2),
            status: "completed",
            journalEntryId: journalRes.journalId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(productionOrders.id, input.orderId),
              eq(productionOrders.tenantId, tenantId),
              sql`${productionOrders.status} <> 'completed'`
            )
          )
          .returning();

        if (updatedRows.length === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "تم إكمال أمر الإنتاج في طلب متزامن — لم يُثبَّت القيد مرتين",
          });
        }

        return { updated: updatedRows[0], journalId: journalRes.journalId };
      });
    }),
});
