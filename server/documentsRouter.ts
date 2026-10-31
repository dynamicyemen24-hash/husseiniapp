/**
 * documentsRouter — WORLD-CLASS FLEXIBLE DOCUMENT ENGINE.
 *
 * Provides:
 *  - Flexible line-item CRUD (add/edit/delete/revert) before final approval
 *  - Related entity management (drivers, agents, brokers, intermediaries)
 *  - Additional document expenses
 *  - Promotions/bonuses application
 *  - Pre-approval queue (proposed changes before commitment)
 *  - Document-party linkage (who handled which document)
 *
 * Every write is source-linked, tenant-scoped, and auditable.
 */
import { z } from "zod";
import { eq, and, desc, gte } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import {
  flexibleLineItems,
  intermediaryParties,
  documentPartyLinks,
  documentExpenses,
  promotions,
  approvalQueues,
  lineItemHistory,
  salesInvoices,
  purchaseInvoices,
  orders,
  users,
} from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";
import { recordAuditEvent } from "./_core/audit";
import { settings } from "../drizzle/schema";
import {
  decryptExternalAIConfig,
  validateExternalAIEndpoint,
} from "./_core/externalAIConfig";

// ─── Schemas ────────────────────────────────────────────────────

const PartyRoleSchema = z.enum([
  "driver",
  "agent",
  "broker",
  "intermediary",
  "representative",
  "distributor",
  "wholesaler",
  "retailer",
  "consultant",
  "customs_agent",
  "logistics_provider",
  "warehouse_operator",
  "deliverer",
  "collector",
]);

const LineItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  productName: z.string().max(255).optional(),
  productCode: z.string().max(50).optional(),
  batchId: z.number().int().positive().optional(),
  serialNumbers: z.array(z.string()).optional(),
  quantity: z.number().min(0).max(999_999_999),
  unitPrice: z.number().min(0).max(1_000_000_000_000),
  discountType: z
    .enum(["percentage", "fixed_amount", "bundle", "volume"])
    .default("percentage"),
  discountValue: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  lineOrder: z.number().int().min(0),
  notes: z.string().trim().max(500).optional(),
});

const ExpenseSchema = z.object({
  category: z.enum([
    "shipping",
    "loading",
    "unloading",
    "customs_fee",
    "insurance",
    "fuel",
    "toll",
    "warehousing",
    "packaging",
    "handling",
    "other",
  ]),
  description: z.string().max(500).optional(),
  amount: z.number().min(0).max(1_000_000_000_000),
  currency: z.string().max(10).default("YER"),
  exchangeRate: z.number().positive().default(1),
  partyId: z.number().int().positive().optional(),
  isIncludedInTotal: z.boolean().default(true),
  notes: z.string().trim().max(500).optional(),
});

const PartySchema = z.object({
  partyRole: PartyRoleSchema,
  name: z.string().max(255),
  nameAr: z.string().max(255).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  commissionType: z.enum(["percent", "fixed", "tiered"]).default("percent"),
  commissionValue: z.number().min(0).default(0),
  creditLimit: z.number().min(0).default(0),
  notes: z.string().trim().max(500).optional(),
});

const ApprovalSchema = z.object({
  documentType: z.string().max(50),
  documentId: z.number().int().positive(),
  title: z.string().max(255),
  action: z.string().max(50),
  proposedData: z.any().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  reason: z.string().trim().max(500).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────

async function assertTenantParty(
  db: any,
  tenantId: number,
  partyId: number
): Promise<void> {
  const rows = await db
    .select({ id: intermediaryParties.id })
    .from(intermediaryParties)
    .where(
      and(
        eq(intermediaryParties.id, partyId),
        eq(intermediaryParties.tenantId, tenantId)
      )
    )
    .limit(1);
  if (rows.length === 0)
    throw new Error("الطرف الوسيط غير موجود في هذه المؤسسة");
}

async function computeLineTotals(
  line: z.infer<typeof LineItemSchema>
): Promise<{
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  total: number;
}> {
  const qty = line.quantity;
  const unitPrice = line.unitPrice;
  const gross = qty * unitPrice;
  let discountAmount = 0;
  if (line.discountType === "percentage") {
    discountAmount = gross * (line.discountValue / 100);
  } else if (line.discountType === "fixed_amount") {
    discountAmount = Math.min(line.discountValue, gross);
  }
  const subtotal = Math.max(0, gross - discountAmount);
  const taxAmount = subtotal * (line.taxRate / 100);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    total,
  };
}

// ─── Router ─────────────────────────────────────────────────────

export const documentsRouter = router({
  extractInvoiceImage: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z.object({
        imageDataUrl: z.string().max(72_000),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("قاعدة البيانات غير متاحة");
      const [row] = await db
        .select({ externalAIConfig: settings.externalAIConfig })
        .from(settings)
        .where(eq(settings.tenantId, ctx.tenantId))
        .limit(1);
      const config = decryptExternalAIConfig(row?.externalAIConfig);
      if (!config?.enabled || !config.apiKey)
        throw new Error(
          "لم يتم إعداد مزود استخراج المستندات في الإعدادات العامة"
        );
      if (!input.imageDataUrl.startsWith(`data:${input.mimeType};base64,`))
        throw new Error("صيغة الصورة غير صالحة");
      const endpoint = await validateExternalAIEndpoint(config.baseUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'استخرج بيانات بنود الفاتورة الظاهرة في الصورة. لا تخمن القيم غير المقروءة، واستخدم null لها. أعد JSON فقط بالشكل {"supplierName":string|null,"invoiceNumber":string|null,"currency":string|null,"items":[{"code":string|null,"name":string,"quantity":number|null,"unitPrice":number|null}]}',
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "حلل صورة الفاتورة وأعد البنود كما تظهر؛ حافظ على أسماء الأصناف والأكواد ولا تضف بنوداً من عندك.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: input.imageDataUrl, detail: "high" },
                  },
                ],
              },
            ],
          }),
        });
        if (!response.ok)
          throw new Error(`فشل مزود الاستخراج (${response.status})`);
        const result: any = await response.json();
        const content = result?.choices?.[0]?.message?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : null;
        const items = Array.isArray(parsed?.items)
          ? parsed.items
              .slice(0, 200)
              .map((item: any) => ({
                code:
                  typeof item.code === "string" ? item.code.slice(0, 100) : "",
                name:
                  typeof item.name === "string" ? item.name.slice(0, 255) : "",
                quantity: Number.isFinite(Number(item.quantity))
                  ? Math.max(0, Number(item.quantity))
                  : null,
                unitPrice: Number.isFinite(Number(item.unitPrice))
                  ? Math.max(0, Number(item.unitPrice))
                  : null,
              }))
              .filter((item: any) => item.name)
          : [];
        return {
          supplierName:
            typeof parsed?.supplierName === "string"
              ? parsed.supplierName.slice(0, 255)
              : null,
          invoiceNumber:
            typeof parsed?.invoiceNumber === "string"
              ? parsed.invoiceNumber.slice(0, 100)
              : null,
          currency:
            typeof parsed?.currency === "string"
              ? parsed.currency.slice(0, 50)
              : null,
          items,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError")
          throw new Error("انتهت مهلة الاتصال بمزود الاستخراج", {
            cause: error,
          });
        if (error instanceof Error && error.message.startsWith("فشل مزود"))
          throw error;
        throw new Error("تعذر استخراج الفاتورة؛ تحقق من إعداد المزود والصورة", {
          cause: error,
        });
      } finally {
        clearTimeout(timeout);
      }
    }),

  // ── Flexible Line Items ──────────────────────────────────────

  lineItems: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        documentType: z.string(),
        documentId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      return db
        .select()
        .from(flexibleLineItems)
        .where(
          and(
            eq(flexibleLineItems.tenantId, ctx.tenantId),
            eq(flexibleLineItems.documentType, input.documentType),
            eq(flexibleLineItems.documentId, input.documentId)
          )
        )
        .orderBy(flexibleLineItems.lineOrder);
    }),

  addLineItem: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        documentType: z.string(),
        documentId: z.number().int().positive(),
        line: LineItemSchema,
        idempotencyKey: z.string().min(8).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;
      const totals = await computeLineTotals(input.line);

      const row = await (db as any)
        .insert(flexibleLineItems)
        .values({
          tenantId: tid,
          documentType: input.documentType,
          documentId: input.documentId,
          productId: input.line.productId ?? null,
          batchId: input.line.batchId ?? null,
          serialNumbers: input.line.serialNumbers
            ? JSON.stringify(input.line.serialNumbers)
            : null,
          quantity: input.line.quantity,
          productName: input.line.productName ?? null,
          productCode: input.line.productCode ?? null,
          unitPrice: String(input.line.unitPrice),
          discountType: input.line.discountType,
          discountValue: String(input.line.discountValue),
          discountAmount: String(totals.discountAmount),
          taxRate: String(input.line.taxRate),
          taxAmount: String(totals.taxAmount),
          subtotal: String(totals.subtotal),
          total: String(totals.total),
          lineOrder: input.line.lineOrder,
          notes: input.line.notes ?? null,
          createdBy: ctx.user.id,
          status: "pending",
        })
        .returning();

      await (db as any).insert(lineItemHistory).values({
        tenantId: tid,
        documentType: input.documentType,
        documentId: input.documentId,
        lineItemId: row[0]?.id,
        action: "add",
        newData: { line: input.line, totals },
        performedBy: ctx.user.id,
      });
      return { success: true, lineId: row[0]?.id, totals };
    }),

  updateLineItem: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        lineId: z.number().int().positive(),
        documentType: z.string(),
        documentId: z.number().int().positive(),
        line: LineItemSchema.partial(),
        reason: z.string().trim().max(500).optional(),
        idempotencyKey: z.string().min(8).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(flexibleLineItems)
        .where(
          and(
            eq(flexibleLineItems.id, input.lineId),
            eq(flexibleLineItems.tenantId, tid)
          )
        )
        .limit(1);
      if (!existing) throw new Error("سطر غير موجود");

      const previousData = { ...existing };
      const updatedData = { ...input.line };

      const totals = await computeLineTotals({
        quantity: Number(updatedData.quantity ?? existing.quantity),
        unitPrice: Number(updatedData.unitPrice ?? existing.unitPrice),
        discountType: (updatedData.discountType ?? existing.discountType) as
          | "percentage"
          | "fixed_amount"
          | "bundle"
          | "volume",
        discountValue: Number(
          updatedData.discountValue ?? existing.discountValue
        ),
        taxRate: Number(updatedData.taxRate ?? existing.taxRate),
        lineOrder: updatedData.lineOrder ?? existing.lineOrder,
      });

      await (db as any)
        .update(flexibleLineItems)
        .set({
          ...(updatedData.quantity !== undefined && {
            quantity: updatedData.quantity,
          }),
          ...(updatedData.unitPrice !== undefined && {
            unitPrice: String(updatedData.unitPrice),
          }),
          ...(updatedData.discountType !== undefined && {
            discountType: updatedData.discountType,
          }),
          ...(updatedData.discountValue !== undefined && {
            discountValue: String(updatedData.discountValue),
          }),
          ...(updatedData.taxRate !== undefined && {
            taxRate: String(updatedData.taxRate),
          }),
          discountAmount: String(totals.discountAmount),
          taxAmount: String(totals.taxAmount),
          subtotal: String(totals.subtotal),
          total: String(totals.total),
          productName: updatedData.productName ?? existing.productName,
          productCode: updatedData.productCode ?? existing.productCode,
          notes: updatedData.notes ?? existing.notes,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(flexibleLineItems.id, input.lineId),
            eq(flexibleLineItems.tenantId, tid)
          )
        );

      // History record for revert support
      await (db as any).insert(lineItemHistory).values({
        tenantId: tid,
        documentType: input.documentType,
        documentId: input.documentId,
        lineItemId: input.lineId,
        action: "edit",
        previousData,
        newData: { ...updatedData, totals },
        reason: input.reason,
        performedBy: ctx.user.id,
      });

      return { success: true, lineId: input.lineId, totals };
    }),

  deleteLineItem: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        lineId: z.number().int().positive(),
        documentType: z.string(),
        documentId: z.number().int().positive(),
        reason: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;

      const [existing] = await db
        .select()
        .from(flexibleLineItems)
        .where(
          and(
            eq(flexibleLineItems.id, input.lineId),
            eq(flexibleLineItems.tenantId, tid)
          )
        )
        .limit(1);
      if (!existing) throw new Error("سطر غير موجود");

      await (db as any).insert(lineItemHistory).values({
        tenantId: tid,
        documentType: input.documentType,
        documentId: input.documentId,
        lineItemId: input.lineId,
        action: "delete",
        previousData: { ...existing },
        performedBy: ctx.user.id,
        reason: input.reason,
      });

      await (db as any)
        .delete(flexibleLineItems)
        .where(
          and(
            eq(flexibleLineItems.id, input.lineId),
            eq(flexibleLineItems.tenantId, tid)
          )
        );

      return { success: true };
    }),

  revertLineItem: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        historyId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const tid = ctx.tenantId;

      const [hist] = await db
        .select()
        .from(lineItemHistory)
        .where(
          and(
            eq(lineItemHistory.id, input.historyId),
            eq(lineItemHistory.tenantId, tid)
          )
        )
        .limit(1);
      if (!hist || !hist.previousData) throw new Error("لا توجد سجل للتراجع");

      // Restore previous state
      await (db as any)
        .update(flexibleLineItems)
        .set({
          ...(hist.previousData ?? {}),
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(flexibleLineItems.id, hist.lineItemId!),
            eq(flexibleLineItems.tenantId, tid)
          )
        );

      // Record the revert
      await (db as any).insert(lineItemHistory).values({
        tenantId: tid,
        documentType: hist.documentType,
        documentId: hist.documentId,
        lineItemId: hist.lineItemId,
        action: "revert",
        previousData: hist.newData,
        newData: hist.previousData,
        isRevert: true,
        performedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // ── Related Entities (Intermediary Parties) ──────────────────

  parties: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z
        .object({
          partyRole: PartyRoleSchema.optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      const conditions = [eq(intermediaryParties.tenantId, ctx.tenantId)];
      if (input?.partyRole)
        conditions.push(eq(intermediaryParties.partyRole, input.partyRole));
      return db
        .select()
        .from(intermediaryParties)
        .where(and(...conditions))
        .orderBy(desc(intermediaryParties.createdAt))
        .limit(input?.limit ?? 200);
    }),

  addParty: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(PartySchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await (db as any)
        .insert(intermediaryParties)
        .values({
          tenantId: ctx.tenantId,
          partyRole: input.partyRole,
          partyType: "person",
          name: input.name,
          nameAr: input.nameAr ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          commissionType: input.commissionType,
          commissionValue: String(input.commissionValue),
          creditLimit: String(input.creditLimit),
          notes: input.notes ?? null,
          createdBy: ctx.user.id,
        })
        .returning({ id: intermediaryParties.id });
      await recordAuditEvent(ctx, {
        action: "PARTY_ADDED",
        resourceType: "intermediary_party",
        resourceId: String(row.id),
        metadata: { role: input.partyRole },
      });
      return { success: true, partyId: row.id };
    }),

  updateParty: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().max(255).optional(),
        phone: z.string().max(50).optional(),
        commissionValue: z.number().min(0).optional(),
        creditLimit: z.number().min(0).optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await assertTenantParty(db, ctx.tenantId, input.id);
      const setObj: Record<string, any> = {};
      if (input.name !== undefined) setObj.name = input.name;
      if (input.phone !== undefined) setObj.phone = input.phone;
      if (input.commissionValue !== undefined)
        setObj.commissionValue = String(input.commissionValue);
      if (input.creditLimit !== undefined)
        setObj.creditLimit = String(input.creditLimit);
      if (input.status !== undefined) setObj.status = input.status;
      if (input.notes !== undefined) setObj.notes = input.notes;
      setObj.updatedBy = ctx.user.id;
      await (db as any)
        .update(intermediaryParties)
        .set(setObj)
        .where(
          and(
            eq(intermediaryParties.id, input.id),
            eq(intermediaryParties.tenantId, ctx.tenantId)
          )
        );
      return { success: true };
    }),

  // ── Document-Party Links ─────────────────────────────────────

  linkParty: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        partyId: z.number().int().positive(),
        sourceType: z.enum([
          "sales_invoice",
          "purchase_invoice",
          "order",
          "transfer",
          "delivery",
          "quotation",
          "voucher",
          "return",
        ]),
        sourceId: z.number().int().positive(),
        role: z.string().max(50),
        notes: z.string().trim().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await assertTenantParty(db, ctx.tenantId, input.partyId);
      await (db as any).insert(documentPartyLinks).values({
        tenantId: ctx.tenantId,
        partyId: input.partyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        role: input.role,
        notes: input.notes ?? null,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  // ── Document Expenses ────────────────────────────────────────

  addExpense: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        documentType: z.string(),
        documentId: z.number().int().positive(),
        expense: ExpenseSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const baseAmount =
        Math.round(input.expense.amount * input.expense.exchangeRate * 100) /
        100;
      const [row] = await (db as any)
        .insert(documentExpenses)
        .values({
          tenantId: ctx.tenantId,
          documentType: input.documentType,
          documentId: input.documentId,
          category: input.expense.category,
          description: input.expense.description ?? null,
          amount: String(input.expense.amount),
          currency: input.expense.currency,
          exchangeRate: String(input.expense.exchangeRate),
          baseAmount: String(baseAmount),
          partyId: input.expense.partyId ?? null,
          isIncludedInTotal: input.expense.isIncludedInTotal,
          notes: input.expense.notes ?? null,
          createdBy: ctx.user.id,
          status: "pending",
        })
        .returning({ id: documentExpenses.id });
      await recordAuditEvent(ctx, {
        action: "DOCUMENT_EXPENSE_ADDED",
        resourceType: "document_expense",
        resourceId: String(row.id),
        metadata: {
          documentType: input.documentType,
          documentId: input.documentId,
          category: input.expense.category,
        },
      });
      return { success: true, expenseId: row.id };
    }),

  // ── Approval Queue (Pre-Approval Control) ────────────────────

  approvalQueue: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z
        .object({
          documentType: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      const conditions = [eq(approvalQueues.tenantId, ctx.tenantId)];
      if (input?.documentType)
        conditions.push(eq(approvalQueues.documentType, input.documentType));
      if (input?.status)
        conditions.push(eq(approvalQueues.status, input.status as any));
      return db
        .select()
        .from(approvalQueues)
        .where(and(...conditions))
        .orderBy(desc(approvalQueues.createdAt))
        .limit(input?.limit ?? 100);
    }),

  submitForApproval: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(ApprovalSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      const [row] = await (db as any)
        .insert(approvalQueues)
        .values({
          tenantId: ctx.tenantId,
          documentType: input.documentType,
          documentId: input.documentId,
          title: input.title,
          action: input.action,
          proposedData: input.proposedData,
          priority: input.priority,
          requestedById: ctx.user.id,
          assignedToId: null,
          notes: input.reason ?? null,
        })
        .returning({ id: approvalQueues.id });
      await recordAuditEvent(ctx, {
        action: "APPROVAL_SUBMITTED",
        resourceType: "approval_queue",
        resourceId: String(row.id),
        metadata: {
          documentType: input.documentType,
          documentId: input.documentId,
        },
      });
      return { success: true, approvalId: row.id };
    }),

  approveApprovalQueue: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        approvalId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await (db as any)
        .update(approvalQueues)
        .set({
          status: "approved",
          approvedById: ctx.user.id,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(approvalQueues.id, input.approvalId),
            eq(approvalQueues.tenantId, ctx.tenantId)
          )
        );
      return { success: true };
    }),

  rejectApprovalQueue: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_EDIT))
    .input(
      z.object({
        approvalId: z.number().int().positive(),
        reason: z.string().trim().max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) throw new Error("DB unavailable");
      await (db as any)
        .update(approvalQueues)
        .set({
          status: "rejected",
          rejectedById: ctx.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
        })
        .where(
          and(
            eq(approvalQueues.id, input.approvalId),
            eq(approvalQueues.tenantId, ctx.tenantId)
          )
        );
      return { success: true };
    }),

  // ── Promotions ───────────────────────────────────────────────

  promotions: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return [];
      const conditions = [eq(promotions.tenantId, ctx.tenantId)];
      if (input?.activeOnly) conditions.push(eq(promotions.status, "active"));
      return db
        .select()
        .from(promotions)
        .where(and(...conditions))
        .limit(200);
    }),

  // ── Document Summary (computed totals with expenses + discounts) ──

  documentSummary: tenantProcedure
    .use(requirePermissions(PERMISSIONS.INVENTORY_VIEW))
    .input(
      z.object({
        documentType: z.string(),
        documentId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return null;
      const lines = await db
        .select()
        .from(flexibleLineItems)
        .where(
          and(
            eq(flexibleLineItems.tenantId, ctx.tenantId),
            eq(flexibleLineItems.documentType, input.documentType),
            eq(flexibleLineItems.documentId, input.documentId)
          )
        );
      const expenses = await db
        .select()
        .from(documentExpenses)
        .where(
          and(
            eq(documentExpenses.documentType, input.documentType),
            eq(documentExpenses.documentId, input.documentId),
            eq(documentExpenses.isIncludedInTotal, true)
          )
        );
      const grossTotal = lines.reduce((s, l) => s + Number(l.total || 0), 0);
      const discountTotal = lines.reduce(
        (s, l) => s + Number(l.discountAmount || 0),
        0
      );
      const taxTotal = lines.reduce((s, l) => s + Number(l.taxAmount || 0), 0);
      const expenseTotal = expenses.reduce(
        (s, e) => s + Number(e.amount || 0),
        0
      );
      const finalTotal =
        Math.round(
          (grossTotal - discountTotal + taxTotal + expenseTotal) * 100
        ) / 100;
      return {
        lineCount: lines.length,
        grossTotal,
        discountTotal,
        taxTotal,
        expenseTotal,
        finalTotal,
        lineItems: lines,
        expenses,
      };
    }),
});
