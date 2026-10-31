/**
 * server/communicationRouter.ts
 * ------------------------------
 * مشاركة الطلبات (أوامر الشراء / سندات الاستلام / فواتير المشتريات) والتقارير
 * عبر واتساب أو الإيميل:
 *   - صلاحية `COMMUNICATION_SEND` أساسية لكل إرسال، مع شرط صلاحية قراءة
 *     الوثيقة (PROCUREMENT_VIEW للطلبات، REPORTS_VIEW للتقرير).
 *   - الإعدادات (تشغيل القناة / وجهة افتراضية / اشتراط الحالة المعتمدة)
 *     تُتحكم من «الإعدادات العامة» عبر `settings.communicationConfig`.
 *   - كل عملية مشاركة تُسجل في سجل النشاطات (activityLogs).
 */

import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { getDb } from "./db";
import { PERMISSIONS } from "../shared/permissions";
import {
  settings,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  purchaseInvoices,
  suppliers,
  activityLogs,
} from "../drizzle/schema";
import { sendTransactionalEmail } from "./services/authService";
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  mergeCommunicationSettings,
  buildShareMessage,
  normalizeWhatsAppNumber,
  DOCUMENT_TYPE_LABEL,
  type CommunicationSettings,
  type ShareDocumentSummary,
} from "../shared/communication";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const NOT_SAME_TENANT = "المستند غير موجود في نطاق مؤسستك";

const PO_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  issued: "صادر (معتمد)",
  partially_received: "مستلم جزئياً",
  received: "مستلم بالكامل",
  cancelled: "ملغى",
  closed: "مغلق",
};
const GRN_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  posted: "مرحّل",
  cancelled: "ملغى",
};
const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  confirmed: "معتمدة",
  paid: "مدفوعة",
  partial: "مدفوعة جزئياً",
  cancelled: "ملغاة",
};

/** الحالات المسموحة للمشاركة عند تفعيل «اشتراط الحالة المعتمدة». */
const APPROVED_PO = new Set([
  "issued",
  "partially_received",
  "received",
  "closed",
]);
const APPROVED_INVOICE = new Set(["confirmed", "paid", "partial"]);

const fmtDate = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleDateString("ar-EG") : "—";

async function loadCommunicationSettings(
  db: Db,
  tenantId: number
): Promise<CommunicationSettings> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .limit(1);
  let raw: unknown;
  try {
    raw = row?.communicationConfig ? JSON.parse(row.communicationConfig) : null;
  } catch {
    raw = null;
  }
  return mergeCommunicationSettings(raw as Partial<CommunicationSettings>);
}

async function upsertCommunicationSettings(
  db: Db,
  tenantId: number,
  config: CommunicationSettings
) {
  const raw = JSON.stringify(config);
  const [existing] = await db
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .limit(1);
  if (existing) {
    await db
      .update(settings)
      .set({ communicationConfig: raw })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      tenantId,
      communicationConfig: raw,
    });
  }
}

async function logShare(
  db: Db,
  tenantId: number,
  userId: number,
  userName: string | null,
  action: string,
  details: string
) {
  await db.insert(activityLogs).values({
    tenantId,
    userId,
    userName,
    action,
    details,
    entityType: "communication",
  });
}

type DocPayload = {
  summary: ShareDocumentSummary;
  subject: string;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  statusKey?: string;
};

async function resolveShareableDocument(
  db: Db,
  tenantId: number,
  docType: "purchase_order" | "goods_receipt" | "purchase_invoice",
  docId: number
): Promise<DocPayload> {
  if (docType === "purchase_order") {
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(eq(purchaseOrders.id, docId), eq(purchaseOrders.tenantId, tenantId))
      )
      .limit(1);
    if (!po)
      throw new TRPCError({ code: "NOT_FOUND", message: NOT_SAME_TENANT });
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, po.supplierId))
      .limit(1);
    const lines = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, po.id));
    const extraLines = lines.map(
      l =>
        `${l.productName} × ${l.quantity}${l.receivedQty > 0 ? ` (مستلم ${l.receivedQty})` : ""}`
    );
    return {
      summary: {
        documentLabel: DOCUMENT_TYPE_LABEL.purchase_order,
        documentNumber: po.poNumber,
        supplierName: supplier?.name,
        dateText: fmtDate(po.createdAt),
        total: po.total ?? 0,
        status: PO_STATUS_LABEL[po.status ?? ""] ?? po.status,
        notes: po.notes ?? undefined,
        extraLines,
      },
      subject: `أمر شراء ${po.poNumber} — ${supplier?.name ?? ""}`.trim(),
      supplierPhone: supplier?.phone,
      supplierEmail: supplier?.email,
      statusKey: po.status ?? "",
    };
  }

  if (docType === "goods_receipt") {
    const [grn] = await db
      .select()
      .from(goodsReceipts)
      .where(
        and(eq(goodsReceipts.id, docId), eq(goodsReceipts.tenantId, tenantId))
      )
      .limit(1);
    if (!grn)
      throw new TRPCError({ code: "NOT_FOUND", message: NOT_SAME_TENANT });
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, grn.supplierId ?? 0))
      .limit(1);
    const lines = await db
      .select()
      .from(goodsReceiptItems)
      .where(eq(goodsReceiptItems.grnId, grn.id));
    const total = lines.reduce(
      (s, l) =>
        s + (parseFloat(String(l.unitPrice ?? "0")) || 0) * l.quantityReceived,
      0
    );
    return {
      summary: {
        documentLabel: DOCUMENT_TYPE_LABEL.goods_receipt,
        documentNumber: grn.grnNumber,
        supplierName: supplier?.name,
        dateText: fmtDate(grn.receivedAt),
        total,
        status: GRN_STATUS_LABEL[grn.status ?? ""] ?? grn.status,
        notes: grn.notes ?? undefined,
        extraLines: lines.map(l => `${l.productName} × ${l.quantityReceived}`),
      },
      subject: `سند استلام ${grn.grnNumber} — ${supplier?.name ?? ""}`.trim(),
      supplierPhone: supplier?.phone,
      supplierEmail: supplier?.email,
      statusKey: grn.status ?? "",
    };
  }

  const [invoice] = await db
    .select()
    .from(purchaseInvoices)
    .where(
      and(
        eq(purchaseInvoices.id, docId),
        eq(purchaseInvoices.tenantId, tenantId)
      )
    )
    .limit(1);
  if (!invoice)
    throw new TRPCError({ code: "NOT_FOUND", message: NOT_SAME_TENANT });
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, invoice.supplierId ?? 0))
    .limit(1);
  return {
    summary: {
      documentLabel: DOCUMENT_TYPE_LABEL.purchase_invoice,
      documentNumber: invoice.invoiceNumber,
      supplierName: supplier?.name,
      dateText: fmtDate(invoice.invoiceDate ?? invoice.createdAt),
      total: invoice.total ?? 0,
      paidAmount: invoice.paidAmount ?? 0,
      status: INVOICE_STATUS_LABEL[invoice.status ?? ""] ?? invoice.status,
      notes: invoice.notes ?? undefined,
    },
    subject:
      `فاتورة مشتريات ${invoice.invoiceNumber} — ${supplier?.name ?? ""}`.trim(),
    supplierPhone: supplier?.phone,
    supplierEmail: supplier?.email,
    statusKey: invoice.status ?? "",
  };
}

/** تقرير المشتريات المجمّع: الأوامر، سندات الاستلام، والفواتير. */
async function buildProcurementReport(
  db: Db,
  tenantId: number
): Promise<DocPayload> {
  const [settingsRow] = await db
    .select({ institutionName: settings.institutionName })
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .limit(1);

  const [poStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      openValue: sql<string>`coalesce(sum(case when status in ('issued','partially_received') then total else 0 end),0)`,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.tenantId, tenantId));

  const [grnStats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(goodsReceipts)
    .where(
      and(
        eq(goodsReceipts.tenantId, tenantId),
        eq(goodsReceipts.status, "posted")
      )
    );

  const [invStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      sum: sql<string>`coalesce(sum(case when status <> 'cancelled' then total else 0 end),0)`,
      paid: sql<string>`coalesce(sum(case when status <> 'cancelled' then paidAmount else 0 end),0)`,
    })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.tenantId, tenantId));

  const reportDate = new Date().toLocaleDateString("ar-EG");
  return {
    summary: {
      documentLabel: DOCUMENT_TYPE_LABEL.procurement_report,
      documentNumber: `إلى ${reportDate}`,
      supplierName: settingsRow?.institutionName ?? "",
      dateText: reportDate,
      total: invStats?.sum ?? "0",
      paidAmount: invStats?.paid ?? "0",
      extraLines: [
        `إجمالي أوامر الشراء: ${poStats?.total ?? 0}`,
        `القيمة المفتوحة (صادرة/مستلمة جزئياً): ${String(poStats?.openValue ?? "0")}`,
        `سندات الاستلام المرحّلة: ${grnStats?.total ?? 0}`,
        `فواتير المشتريات: ${invStats?.total ?? 0}`,
      ],
    },
    subject: `تقرير المشتريات — ${settingsRow?.institutionName ?? ""}`.trim(),
  };
}

async function dispatchShare(opts: {
  db: Db;
  tenantId: number;
  userId: number;
  userName: string | null;
  channel: "whatsapp" | "email";
  to?: string;
  config: CommunicationSettings;
  subject: string;
  message: string;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  docLabel: string;
}) {
  const {
    db,
    tenantId,
    userId,
    userName,
    channel,
    to,
    config,
    subject,
    message,
    supplierPhone,
    supplierEmail,
    docLabel,
  } = opts;

  if (channel === "whatsapp") {
    if (!config.whatsappEnabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "المشاركة عبر واتساب معطلة — فعّلها من الإعدادات العامة أولاً",
      });
    }
    const target =
      to?.trim() ||
      supplierPhone?.trim() ||
      config.whatsappFallbackNumber.trim();
    const digits = normalizeWhatsAppNumber(target, config.whatsappCountryCode);
    if (!digits) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "حدد رقم واتساب للمستلم (من بيانات المورد أو الرقم الافتراضي في الإعدادات العامة)",
      });
    }
    const link = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    await logShare(
      db,
      tenantId,
      userId,
      userName,
      `مشاركة ${docLabel} عبر واتساب`,
      `الرابط: wa.me/${digits}`
    );
    return {
      ok: true,
      channel: "whatsapp" as const,
      delivered: true,
      mode: "link" as const,
      link,
      target: `wa.me/${digits}`,
      message,
      subject,
    };
  }

  if (!config.emailEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "المشاركة عبر الإيميل معطلة — فعّلها من الإعدادات العامة أولاً",
    });
  }
  const target =
    to?.trim() || supplierEmail?.trim() || config.emailFallbackTo.trim();
  if (!target || !/^\S+@\S+\.\S+$/.test(target)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "حدد بريداً إلكترونياً صحيحاً للمستلم (من بيانات المورد أو البريد الافتراضي في الإعدادات العامة)",
    });
  }
  const delivery = await sendTransactionalEmail({
    to: target,
    subject,
    text: message,
  });
  await logShare(
    db,
    tenantId,
    userId,
    userName,
    `مشاركة ${docLabel} عبر الإيميل`,
    `${subject} — إلى ${target} — ${delivery.mode}`
  );
  return {
    ok: true,
    channel: "email" as const,
    delivered: delivery.delivered,
    mode: delivery.mode,
    link: null,
    target,
    message,
    subject,
  };
}

export const communicationRouter = router({
  /** قراءة إعدادات التواصل الحالية (ويُدمج مع الافتراضي عند غيابها). */
  getConfig: tenantProcedure
    .use(requirePermissions(PERMISSIONS.COMMUNICATION_VIEW))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId) return DEFAULT_COMMUNICATION_SETTINGS;
      return loadCommunicationSettings(db, ctx.tenantId);
    }),

  /** تحديث إعدادات التواصل من «الإعدادات العامة». */
  updateConfig: tenantProcedure
    .use(requirePermissions(PERMISSIONS.SETTINGS_EDIT))
    .input(
      z
        .object({
          whatsappEnabled: z.boolean().optional(),
          whatsappCountryCode: z.string().max(5).optional(),
          whatsappFallbackNumber: z.string().max(50).optional(),
          emailEnabled: z.boolean().optional(),
          emailFallbackTo: z.string().max(320).optional(),
          requireApprovedState: z.boolean().optional(),
        })
        .strict()
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متوفرة",
        });
      const current = await loadCommunicationSettings(db, ctx.tenantId);
      const next: CommunicationSettings = { ...current, ...input };
      await upsertCommunicationSettings(db, ctx.tenantId, next);
      await logShare(
        db,
        ctx.tenantId,
        ctx.user.id,
        ctx.user.name,
        "تحديث إعدادات التواصل والمشاركة",
        `واتساب: ${next.whatsappEnabled ? "مفعّل" : "معطّل"} — إيميل: ${next.emailEnabled ? "مفعّل" : "معطّل"}${next.requireApprovedState ? " — وبشرط الحالة المعتمدة" : ""}`
      );
      return { success: true, config: next };
    }),

  /** مشاركة طلب (أمر شراء / سند استلام / فاتورة مشتريات). */
  sendPurchaseDocument: tenantProcedure
    .use(
      requirePermissions({
        all: [PERMISSIONS.COMMUNICATION_SEND, PERMISSIONS.PROCUREMENT_VIEW],
      })
    )
    .input(
      z.object({
        docType: z.enum([
          "purchase_order",
          "goods_receipt",
          "purchase_invoice",
        ]),
        docId: z.number().int().positive(),
        channel: z.enum(["whatsapp", "email"]),
        to: z.string().max(320).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متوفرة",
        });
      const config = await loadCommunicationSettings(db, ctx.tenantId);
      const payload = await resolveShareableDocument(
        db,
        ctx.tenantId,
        input.docType,
        input.docId
      );

      if (config.requireApprovedState) {
        const blocked =
          input.docType === "purchase_order"
            ? !APPROVED_PO.has(payload.statusKey ?? "")
            : input.docType === "goods_receipt"
              ? payload.statusKey !== "posted"
              : !APPROVED_INVOICE.has(payload.statusKey ?? "");
        if (blocked) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "المشاركة تتطلب حالة «معتمدة» حسب الإعدادات — فعّل العملية أولاً على المستند",
          });
        }
      }

      const message = buildShareMessage(payload.summary);
      return dispatchShare({
        db,
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        channel: input.channel,
        to: input.to,
        config,
        subject: payload.subject,
        message,
        supplierPhone: payload.supplierPhone,
        supplierEmail: payload.supplierEmail,
        docLabel: DOCUMENT_TYPE_LABEL[input.docType],
      });
    }),

  /** مشاركة تقرير المشتريات المجمّع. */
  sendReport: tenantProcedure
    .use(
      requirePermissions({
        all: [PERMISSIONS.COMMUNICATION_SEND, PERMISSIONS.REPORTS_VIEW],
      })
    )
    .input(
      z.object({
        channel: z.enum(["whatsapp", "email"]),
        to: z.string().max(320).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db || !ctx.tenantId)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متوفرة",
        });
      const config = await loadCommunicationSettings(db, ctx.tenantId);
      const payload = await buildProcurementReport(db, ctx.tenantId);
      const message = buildShareMessage(payload.summary);
      return dispatchShare({
        db,
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        channel: input.channel,
        to: input.to,
        config,
        subject: payload.subject,
        message,
        supplierPhone: null,
        supplierEmail: null,
        docLabel: DOCUMENT_TYPE_LABEL.procurement_report,
      });
    }),
});
