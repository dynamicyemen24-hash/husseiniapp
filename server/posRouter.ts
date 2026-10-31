import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { withTenantTx } from "./_core/rls";
import { assertRefsInTenant, assertTenantRow } from "./_core/tenantGuard";
import { getDb } from "./db";
import {
  addProductStock,
  deductProductStock,
  isUniqueViolationDatabaseError,
  recordStockMovement,
} from "./services/inventoryService";
import {
  salesInvoices,
  salesInvoiceItems,
  products,
  customers,
  branches,
  posSessions,
  posCashEvents,
} from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";

const posPaymentMethods = [
  "cash",
  "card",
  "transfer",
  "credit",
  "online",
  "cash_yer",
  "cash_sar",
  "hawala",
  "shabab",
  "mobile_money",
  "bank_transfer",
] as const;
type PosPaymentMethod = (typeof posPaymentMethods)[number];
function coercePaymentMethod(raw: string | undefined): PosPaymentMethod {
  return (posPaymentMethods as readonly string[]).includes(raw ?? "")
    ? (raw as PosPaymentMethod)
    : "cash";
}

export const posRouter = router({
  view: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_VIEW))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      return db
        .select()
        .from(salesInvoices)
        .where(eq(salesInvoices.tenantId, ctx.tenantId))
        .orderBy(desc(salesInvoices.invoiceDate));
    }),

  createSale: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_CREATE_SALE))
    .input(
      z.object({
        customerId: z.number().optional(),
        items: z
          .array(
            z.object({
              productId: z.number(),
              quantity: z.number().int().min(1),
              discount: z.number().default(0),
            })
          )
          .min(1),
        paymentMethod: z.string().default("cash"),
        branchId: z.number().optional(),
        notes: z.string().optional(),
        // Idempotency for double-submit / webhook retries — no schema change:
        // the key is folded into the per-tenant unique invoiceNumber
        // (uq_salesInvoices_tenant_number), so a retry collapses to the
        // original invoice with NO second stock movement.
        idempotencyKey: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to complete sale",
        });
      const tid = requireTenantId(ctx);
      // Composite FK ownership: customer/branch/products must belong to same tenant.
      await assertRefsInTenant(db, tid, [
        { table: customers, id: input.customerId, label: "العميل" },
        { table: branches, id: input.branchId, label: "الفرع" },
        ...input.items.map(i => ({
          table: products,
          id: i.productId,
          label: "الصنف",
        })),
      ]);

      const productRows = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tid),
            inArray(
              products.id,
              input.items.map(i => i.productId)
            )
          )
        );
      if (productRows.length !== input.items.length)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "أحد الأصناف غير موجود",
        });
      const productMap = new Map(productRows.map(p => [p.id, p]));
      const lines = input.items.map(item => {
        const p = productMap.get(item.productId);
        if (!p)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "أحد الأصناف غير موجود",
          });
        const unit = parseFloat(p.salePrice || "0");
        const lineTotal = unit * item.quantity - (item.discount || 0);
        return {
          productId: p.id,
          productName: p.name,
          quantity: item.quantity,
          unitPrice: unit.toFixed(2),
          discount: (item.discount || 0).toFixed(2),
          total: lineTotal.toFixed(2),
        };
      });
      const totalStr = lines
        .reduce((s, l) => s + parseFloat(l.total), 0)
        .toFixed(2);

      const invoiceNumber = input.idempotencyKey
        ? `POS-${input.idempotencyKey}`.slice(0, 50)
        : `POS-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();

      const readExisting = async () =>
        (
          await db
            .select()
            .from(salesInvoices)
            .where(
              and(
                eq(salesInvoices.tenantId, tid),
                eq(salesInvoices.invoiceNumber, invoiceNumber)
              )
            )
            .limit(1)
        )[0] ?? null;

      try {
        // REFERENCE RLS INTEGRATION: the whole sale runs under SET LOCAL
        // app.tenant_id (server/_core/rls.ts `withTenantTx`), so the
        // `tenant_isolation` RLS policies + `validate_same_tenant()` triggers
        // from 0023_nuclear_fortress backstop the app-layer checks above.
        return await withTenantTx(db as any, tid, async (tx: any) => {
          // Idempotent invoice insert — a retried key yields zero rows
          // instead of a duplicate invoice + duplicate deduction.
          const insertQuery = tx.insert(salesInvoices).values({
            tenantId: tid,
            invoiceNumber,
            customerId: input.customerId ?? null,
            branchId: input.branchId ?? null,
            status: "confirmed",
            subtotal: totalStr,
            total: totalStr,
            paymentMethod: coercePaymentMethod(input.paymentMethod),
            notes: input.notes ?? "",
            userId: ctx.user.id,
            salesRepId: String(ctx.user.id),
            currency: "YER",
            invoiceDate: now,
            postedAt: now,
          });
          const inserted = input.idempotencyKey
            ? await insertQuery
                .onConflictDoNothing({
                  target: [salesInvoices.tenantId, salesInvoices.invoiceNumber],
                })
                .returning()
            : await insertQuery.returning();
          if (inserted.length === 0) {
            const winner = await tx
              .select()
              .from(salesInvoices)
              .where(
                and(
                  eq(salesInvoices.tenantId, tid),
                  eq(salesInvoices.invoiceNumber, invoiceNumber)
                )
              )
              .limit(1);
            const win = winner[0];
            if (!win) throw new Error("تعذر تأكيد البيع — أعد المحاولة");
            return {
              success: true as const,
              invoiceNumber: win.invoiceNumber,
              invoiceId: win.id,
              total: win.total,
              idempotent: true,
            };
          }
          const invoice = inserted[0];
          if (!invoice) throw new Error("تعذر تأكيد البيع — أعد المحاولة");

          await tx
            .insert(salesInvoiceItems)
            .values(lines.map(l => ({ ...l, invoiceId: invoice.id })));

          for (const l of lines) {
            // Atomic guarded decrement via the CENTRAL STOCK GUARD —
            // `UPDATE … WHERE currentStock >= qty`; concurrent sellers of the
            // last unit cannot both succeed and stock never goes negative.
            const deducted = await deductProductStock(tx, {
              productId: l.productId,
              quantity: l.quantity,
            });
            if (!deducted.success)
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `المخزون غير كافٍ للصنف «${l.productName}» — لا يمكن إتمام البيع`,
              });
            // Every deduction is linked to its source invoice (no orphans).
            await recordStockMovement(tx, {
              tenantId: tid,
              productId: l.productId,
              type: "out",
              quantity: l.quantity,
              referenceId: invoice.id,
              referenceType: "pos_invoice",
              notes: `بيع POS ${invoiceNumber}`,
            });
          }

          return {
            success: true as const,
            invoiceNumber,
            invoiceId: invoice.id,
            total: totalStr,
          };
        });
      } catch (e) {
        // Lost an idempotency race outside the tx — return the winner.
        if (input.idempotencyKey && isUniqueViolationDatabaseError(e)) {
          const winner = await readExisting();
          if (winner)
            return {
              success: true,
              invoiceNumber: winner.invoiceNumber,
              invoiceId: winner.id,
              total: winner.total,
              idempotent: true,
            };
        }
        throw e;
      }
    }),

  editSale: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_EDIT_SALE))
    .input(
      z.object({
        invoiceId: z.number(),
        items: z.array(
          z
            .object({
              productId: z.number(),
              quantity: z.number().min(1),
              discount: z.number().default(0),
            })
            .optional()
        ),
        paymentMethod: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to edit sale",
        });
      const tid = requireTenantId(ctx);

      const invoice = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        )
        .limit(1);

      // Negative-traversal contract: cross-tenant id => 403, never silent 404.
      assertTenantRow(invoice[0], tid, "فاتورة المبيعات");

      if (input.items) {
        const definedItems = input.items.filter(
          (i): i is NonNullable<typeof i> => !!i
        );
        await assertRefsInTenant(
          db,
          tid,
          definedItems.map(i => ({
            table: products,
            id: i.productId,
            label: "الصنف",
          }))
        );
        await db
          .delete(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, input.invoiceId));

        for (const item of definedItems) {
          const [productRow] = await db
            .select({ salePrice: products.salePrice, name: products.name })
            .from(products)
            .where(
              and(eq(products.id, item.productId), eq(products.tenantId, tid))
            )
            .limit(1);
          if (!productRow)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "الصنف غير موجود",
            });
          const unit = parseFloat(productRow.salePrice || "0");
          await db.insert(salesInvoiceItems).values({
            invoiceId: input.invoiceId,
            productId: item.productId,
            productName: productRow.name,
            quantity: item.quantity,
            unitPrice: unit.toFixed(2),
            discount: (item.discount || 0).toFixed(2),
            total: (unit * item.quantity - (item.discount || 0)).toFixed(2),
          });
        }
      }

      await db
        .update(salesInvoices)
        .set({
          ...(input.paymentMethod !== undefined
            ? { paymentMethod: coercePaymentMethod(input.paymentMethod) }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        );

      return { success: true };
    }),

  voidSale: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_VOID_SALE))
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to void sale",
        });
      const tid = requireTenantId(ctx);

      const [inv] = await db
        .select({
          id: salesInvoices.id,
          tenantId: salesInvoices.tenantId,
          status: salesInvoices.status,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        )
        .limit(1);
      assertTenantRow(inv, tid, "فاتورة المبيعات");
      // Idempotent void: a retry must not restore stock twice.
      if (inv.status === "cancelled")
        return { success: true, alreadyVoided: true };
      await (db as any).transaction(async (tx: any) => {
        // Return the deducted quantities through the CENTRAL STOCK GUARD —
        // each leg linked to this void (referenceType pos_void).
        const items = await tx
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, input.invoiceId));
        for (const it of items) {
          await addProductStock(tx, {
            productId: it.productId,
            quantity: it.quantity,
          });
          await recordStockMovement(tx, {
            tenantId: tid,
            productId: it.productId,
            type: "in",
            quantity: it.quantity,
            referenceId: input.invoiceId,
            referenceType: "pos_void",
            notes: `إلغاء فاتورة POS ${input.invoiceId}`,
          });
        }
        // "voided" is not a valid sales_invoice_status — cancelled is the
        // terminal void state (the table has no voidedAt column).
        await tx
          .update(salesInvoices)
          .set({ status: "cancelled" })
          .where(
            and(
              eq(salesInvoices.id, input.invoiceId),
              eq(salesInvoices.tenantId, tid)
            )
          );
      });

      return { success: true };
    }),

  printReceipt: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_PRINT_RECEIPT))
    .input(z.object({ invoiceNumber: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const tid = requireTenantId(ctx);

      const [invoice] = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.invoiceNumber, input.invoiceNumber),
            eq(salesInvoices.tenantId, tid)
          )
        );

      if (!invoice) return null;

      const items = await db
        .select()
        .from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, invoice.id));

      return {
        invoice,
        items,
        receiptHtml: `<div style="font-family:Arial;padding:20px;direction:rtl;text-align:right;"><h2>POS Receipt</h2><p>Invoice: ${invoice.invoiceNumber}</p><p>Date: ${new Date(invoice.invoiceDate).toLocaleDateString("ar-YE")}</p><p>Total: ${invoice.total}</p><p>Payment: ${invoice.paymentMethod}</p>${items.map((i: any) => `<p>${i.productName} x ${i.quantity} = ${i.total}</p>`).join("")}</div>`,
      };
    }),

  holdRecall: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_HOLD_RECALL))
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to hold/recall",
        });
      const tid = requireTenantId(ctx);

      const invoice = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        )
        .limit(1);

      assertTenantRow(invoice[0], tid, "فاتورة المبيعات");

      // "held" is not a valid sales_invoice_status — draft doubles as the
      // parked/hold state, confirmed as the recalled/active state.
      const next = invoice[0].status === "draft" ? "confirmed" : "draft";
      await db
        .update(salesInvoices)
        .set({ status: next })
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        );

      return { success: true, status: next };
    }),

  discounts: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_DISCOUNTS))
    .input(
      z.object({
        invoiceId: z.number(),
        discountAmount: z.string().refine(v => {
          const n = parseFloat(v);
          return !isNaN(n) && n >= 0;
        }, "折扣 amount must be a positive number"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to apply discount",
        });
      const tid = requireTenantId(ctx);

      const total = parseFloat(input.discountAmount);
      const [inv] = await db
        .select({ id: salesInvoices.id, tenantId: salesInvoices.tenantId })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        )
        .limit(1);
      assertTenantRow(inv, tid, "فاتورة المبيعات");
      await db
        .update(salesInvoices)
        .set({ discount: total.toFixed(2) })
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        );

      return { success: true, discount: total };
    }),

  returns: tenantProcedure
    .use(requirePermissions(PERMISSIONS.POS_RETURNS))
    .input(
      z.object({
        invoiceId: z.number(),
        reason: z.string().min(2),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number().min(1),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId || !ctx.user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to process return",
        });
      const tid = requireTenantId(ctx);

      const [inv] = await db
        .select({ id: salesInvoices.id, tenantId: salesInvoices.tenantId })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.tenantId, tid)
          )
        )
        .limit(1);
      assertTenantRow(inv, tid, "فاتورة المبيعات");
      await assertRefsInTenant(
        db,
        tid,
        input.items.map(i => ({
          table: products,
          id: i.productId,
          label: "الصنف",
        }))
      );
      // Restore stock for returned items — via the CENTRAL STOCK GUARD inside
      // one transaction, each leg linked to this return (no orphans).
      // NOTE: sales_invoices has no returned status/reason columns, so the
      // reason is appended to notes instead of an invalid enum value.
      await (db as any).transaction(async (tx: any) => {
        const current = await tx
          .select({ notes: salesInvoices.notes })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.invoiceId),
              eq(salesInvoices.tenantId, tid)
            )
          )
          .limit(1);
        const prev = current[0]?.notes ?? "";
        await tx
          .update(salesInvoices)
          .set({
            notes: `${prev}${prev ? "\n" : ""}[مرتجع] ${input.reason}`.slice(
              0,
              2000
            ),
          })
          .where(
            and(
              eq(salesInvoices.id, input.invoiceId),
              eq(salesInvoices.tenantId, tid)
            )
          );

        for (const item of input.items) {
          await addProductStock(tx, {
            productId: item.productId,
            quantity: item.quantity,
          });
          await recordStockMovement(tx, {
            tenantId: tid,
            productId: item.productId,
            type: "in",
            quantity: item.quantity,
            referenceId: input.invoiceId,
            referenceType: "pos_return",
            notes: `[مرتجع] ${input.reason}`,
          });
        }
      });

      return { success: true };
    }),
});
