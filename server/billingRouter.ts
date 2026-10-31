/**
 * billingRouter — SaaS billing end-to-end:
 *  1) باقات + تسعير مرن لكل دولة (countryPricing).
 *  2) بوابات دفع ديناميكية تديرها المنصة (credentials JSON حسب المزوّد).
 *  3) checkout → فاتورة → تأكيد دفع (webhook موقّع أو تأكيد يدوي للمالك)
 *     → تفعيل/تمديد الاشتراك + سجل دفعة — دون إيقاف عمل العميل أبداً.
 */
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  tenantProcedure,
  publicProcedure,
  ownerProcedure,
  router,
} from "./_core/trpc";
import { isOwner, requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import {
  billingInvoices,
  paymentGateways,
  paymentHistory,
  settings,
  subscriptionCodes,
  subscriptionPlans,
  subscriptionPolicies,
  tenantSubscriptions,
} from "../drizzle/schema";
import {
  enforceFeature,
  getActivePolicy,
  resolveAccess,
  FEATURE_CATALOG,
} from "./_core/billingAccess";
import { sendTransactionalEmail } from "./services/authService";

const DAY_MS = 86_400_000;

/** حقول ديناميكية لكل نوع مزوّد — يعاد للعميل ليبنى نموذج الإدخال. */
const PROVIDER_FIELD_SCHEMAS: Record<
  string,
  { key: string; labelAr: string; secret?: boolean }[]
> = {
  tap: [
    { key: "secretKey", labelAr: "المفتاح السري (Secret Key)", secret: true },
    { key: "publishableKey", labelAr: "المفتاح العام (Publishable)" },
  ],
  moyasar: [
    { key: "secretKey", labelAr: "المفتاح السري", secret: true },
    { key: "publishableKey", labelAr: "المفتاح العام" },
  ],
  stripe: [
    { key: "secretKey", labelAr: "Secret Key", secret: true },
    { key: "webhookSecret", labelAr: "Webhook Signing Secret", secret: true },
  ],
  bank_transfer: [
    { key: "bankName", labelAr: "اسم البنك" },
    { key: "iban", labelAr: "الآيبان (IBAN)" },
    { key: "accountName", labelAr: "اسم الحساب" },
  ],
  cash: [{ key: "contact", labelAr: "جهة الاستلام" }],
  whatsapp: [{ key: "phone", labelAr: "رقم واتساب" }],
  manual: [],
};

const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? "";

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

function priceForCountry(
  plan: typeof subscriptionPlans.$inferSelect,
  countryCode: string,
  cycle: "monthly" | "yearly"
): { amount: string; currency: string; taxPercent: number } {
  const list = parseJson<
    {
      countryCode: string;
      currency: string;
      priceMonthly: string;
      priceYearly: string;
      taxPercent?: number;
    }[]
  >(plan.countryPricing as string | null);
  const hit = list?.find(
    p => p.countryCode?.toUpperCase() === countryCode.toUpperCase()
  );
  if (hit) {
    return {
      amount: cycle === "yearly" ? hit.priceYearly : hit.priceMonthly,
      currency: hit.currency || plan.currency,
      taxPercent: hit.taxPercent ?? 0,
    };
  }
  return {
    amount: cycle === "yearly" ? plan.priceYearly : plan.priceMonthly,
    currency: plan.currency,
    taxPercent: 0,
  };
}

/** يفعّل/يمدّد اشتراك المستأجر بعد تأكيد الدفع — دون قطع أي عملية جارية. */
async function activateSubscription(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  opts: {
    tenantId: number;
    planId: number;
    cycle: "monthly" | "yearly";
    provider: string;
  }
) {
  const now = new Date();
  const subRows = await db
    .select()
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.tenantId, opts.tenantId))
    .orderBy(desc(tenantSubscriptions.id))
    .limit(1);
  const existing = subRows[0];
  const existingEnd = existing?.currentPeriodEnd ?? null;

  // التمديد من نهاية الدورة الحالية إن كانت سارية (لا يخسر العميل يوماً مدفوعاً).
  const base = existingEnd && existingEnd > now ? existingEnd : now;
  const periodEnd = addMonths(base, opts.cycle === "yearly" ? 12 : 1);

  if (existing) {
    await db
      .update(tenantSubscriptions)
      .set({
        planId: opts.planId,
        status: "active",
        billingCycle: opts.cycle,
        currentPeriodStart: existingEnd
          ? (existing.currentPeriodStart ?? now)
          : now,
        currentPeriodEnd: periodEnd,
        paymentProvider: opts.provider,
        updatedAt: now,
      })
      .where(eq(tenantSubscriptions.id, existing.id));
  } else {
    await db.insert(tenantSubscriptions).values({
      tenantId: opts.tenantId,
      planId: opts.planId,
      status: "active",
      billingCycle: opts.cycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paymentProvider: opts.provider,
    });
  }

  await db
    .update(settings)
    .set({
      subscriptionStatus: "active",
      trialEndsAt: null,
      updatedAt: now,
    })
    .where(eq(settings.tenantId, opts.tenantId));

  return periodEnd;
}

export const billingRouter = router({
  /** قرار الوصول الحالي + الباقات + الفواتير — يغذي صفحة الفوترة واللافتات. */
  accessOverview: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const tid = requireTenantId(ctx);
    const policy = await getActivePolicy();
    if (!db) {
      return {
        access: resolveAccess({ status: "trial", periodEnd: null }, new Date()),
        policy,
        featureCatalog: FEATURE_CATALOG,
        subscription: null,
        plan: null,
        invoices: [],
      };
    }
    const [statusRows, subRows, invoiceRows] = await Promise.all([
      db
        .select({
          subscriptionStatus: settings.subscriptionStatus,
          trialEndsAt: settings.trialEndsAt,
        })
        .from(settings)
        .where(eq(settings.tenantId, tid))
        .limit(1),
      db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tid))
        .orderBy(desc(tenantSubscriptions.id))
        .limit(1),
      db
        .select()
        .from(billingInvoices)
        .where(eq(billingInvoices.tenantId, tid))
        .orderBy(desc(billingInvoices.id))
        .limit(12),
    ]);

    const sub = subRows[0] ?? null;
    const plan = sub
      ? ((
          await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, sub.planId))
            .limit(1)
        )[0] ?? null)
      : null;

    const access = resolveAccess(
      {
        status: statusRows[0]?.subscriptionStatus,
        periodEnd: sub?.currentPeriodEnd ?? statusRows[0]?.trialEndsAt,
        policy,
      },
      new Date()
    );
    return {
      access,
      policy,
      featureCatalog: FEATURE_CATALOG,
      subscription: sub,
      plan,
      invoices: invoiceRows,
    };
  }),

  /** بوابة استعلام الميزة — تستخدمها الواجهات لتعطيل الأزرار بلمعان. */
  canUseFeature: tenantProcedure
    .input(z.object({ feature: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const tid = requireTenantId(ctx);
      const decision = await enforceFeature(tid, input.feature);
      const allowed =
        decision.level === "full" ||
        !decision.restrictedFeatures.includes(input.feature);
      return { allowed, decision };
    }),

  listPlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    // PAGINATION: global catalog, tiny cardinality — hard cap 100 documents
    // the mandatory-limit rule for every list endpoint.
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder)
      .limit(100);
  }),

  /** وسائل الدفع المتاحة للعميل (بدون أي بيانات سرية). */
  listGateways: tenantProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    // PAGINATION: hard cap 100 (see listPlans).
    const rows = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.isActive, true))
      .orderBy(paymentGateways.sortOrder)
      .limit(100);
    return rows.map(({ credentials, ...pub }) => {
      void credentials;
      return { ...pub };
    });
  }),

  /** إنشاء فاتورة اشتراك + إرجاع تعليمات/رابط الدفع حسب البوابة. */
  createCheckout: tenantProcedure
    .input(
      z.object({
        planCode: z.string().min(1),
        cycle: z.enum(["monthly", "yearly"]),
        gatewayCode: z.string().min(1),
        countryCode: z.string().length(2).default("YE"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const tid = requireTenantId(ctx);
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });

      const plan = (
        await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.code, input.planCode))
          .limit(1)
      )[0];
      if (!plan || !plan.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الباقة غير متاحة" });
      }
      const gateway = (
        await db
          .select()
          .from(paymentGateways)
          .where(eq(paymentGateways.code, input.gatewayCode))
          .limit(1)
      )[0];
      if (!gateway || !gateway.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "وسيلة الدفع غير متاحة",
        });
      }

      const { amount, currency, taxPercent } = priceForCountry(
        plan,
        input.countryCode,
        input.cycle
      );
      const subtotal = Number(amount);
      const tax = +(subtotal * (taxPercent / 100)).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);

      const invoiceNumber = `SUB-${new Date().getFullYear()}-${tid}-${Date.now()
        .toString(36)
        .toUpperCase()}`;
      const [invoice] = await db
        .insert(billingInvoices)
        .values({
          tenantId: tid,
          invoiceNumber,
          status: "pending",
          subtotal: subtotal.toFixed(2),
          taxAmount: tax.toFixed(2),
          total: total.toFixed(2),
          currency,
          dueDate: new Date(Date.now() + 3 * 86_400_000),
          paymentMethod: gateway.providerType,
          notes: `${plan.name} — ${input.cycle === "yearly" ? "سنوي" : "شهري"}`,
        })
        .returning();

      let checkoutUrl: string | null = null;
      if (gateway.checkoutUrlTemplate) {
        checkoutUrl = gateway.checkoutUrlTemplate
          .replaceAll("{amount}", String(total))
          .replaceAll("{currency}", currency)
          .replaceAll("{invoice}", invoiceNumber)
          .replaceAll("{tenant}", String(tid));
      }

      return {
        invoice: {
          id: invoice.id,
          invoiceNumber,
          total,
          currency,
          status: invoice.status,
        },
        plan: { name: plan.name, code: plan.code },
        gateway: {
          code: gateway.code,
          providerType: gateway.providerType,
          name: gateway.name,
          instructions: gateway.instructions,
        },
        checkoutUrl,
        needsManualConfirmation: [
          "bank_transfer",
          "cash",
          "whatsapp",
          "manual",
        ].includes(gateway.providerType),
      };
    }),

  /**
   * تأكيد دفع — webhook موقّع من البوابة (server-to-server) أو تأكيد يدوي
   * من المالك للوسائل اليدوية (تحويل بنكي/كاش).
   * idempotent: الفاتورة المدفوعة لا تُعالج مرتين.
   */
  confirmPayment: publicProcedure
    .input(
      z.object({
        invoiceNumber: z.string().min(1),
        transactionId: z.string().min(1).optional(),
        idempotencyKey: z.string().max(255).optional(),
        /** سر موقّع — إلزامي عندما لا يكون المتصل هو المالك. */
        webhookSecret: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });

      const owner = !!ctx.user && isOwner(ctx);
      if (!owner) {
        if (
          !PAYMENT_WEBHOOK_SECRET ||
          input.webhookSecret !== PAYMENT_WEBHOOK_SECRET
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "توقيع غير صالح",
          });
        }
      }

      if (input.idempotencyKey) {
        const existing = await db
          .select()
          .from(paymentHistory)
          .where(eq(paymentHistory.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (existing.length > 0) {
          return {
            success: true,
            alreadyProcessed: true,
            idempotent: true,
          };
        }
      }

      const invoice = (
        await db
          .select()
          .from(billingInvoices)
          .where(eq(billingInvoices.invoiceNumber, input.invoiceNumber))
          .limit(1)
      )[0];
      if (!invoice)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الفاتورة غير موجودة",
        });
      if (invoice.status === "paid") {
        return { success: true, alreadyProcessed: true, idempotent: true };
      }

      const now = new Date();
      await db
        .update(billingInvoices)
        .set({
          status: "paid",
          paidAt: now,
          externalPaymentId: input.transactionId ?? invoice.externalPaymentId,
          updatedAt: now,
        })
        .where(eq(billingInvoices.id, invoice.id));

      await db.insert(paymentHistory).values({
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: invoice.currency,
        status: "paid",
        paymentMethod: invoice.paymentMethod,
        transactionId: input.transactionId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      });

      // استخراج الدورة من ملاحظات الفاتورة (شهري/سنوي) وتفعيل الاشتراك.
      const cycle = invoice.notes?.includes("سنوي") ? "yearly" : "monthly";
      const subRow = (
        await db
          .select()
          .from(tenantSubscriptions)
          .where(eq(tenantSubscriptions.tenantId, invoice.tenantId))
          .orderBy(desc(tenantSubscriptions.id))
          .limit(1)
      )[0];
      const fallbackPlan = (
        await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.isActive, true))
          .orderBy(subscriptionPlans.sortOrder)
          .limit(1)
      )[0];

      await activateSubscription(db, {
        tenantId: invoice.tenantId,
        planId: subRow?.planId ?? fallbackPlan?.id ?? 1,
        cycle,
        provider: invoice.paymentMethod ?? "manual",
      });

      return { success: true, alreadyProcessed: false, periodActivated: true };
    }),

  // ── إدارة المنصة (المالك فقط) ────────────────────────────────────

  upsertGateway: ownerProcedure
    .input(
      z.object({
        id: z.number().int().optional(),
        code: z.string().min(2).max(60),
        providerType: z.enum([
          "tap",
          "moyasar",
          "stripe",
          "bank_transfer",
          "cash",
          "whatsapp",
          "manual",
        ]),
        name: z.string().min(2).max(120),
        country: z.string().default("عالمي"),
        countryCode: z.string().length(2).default("GL"),
        currency: z.string().length(3).default("USD"),
        mode: z.enum(["test", "live"]).default("test"),
        credentials: z.record(z.string(), z.string()).nullable().default(null),
        feePercent: z.string().default("0"),
        feeFixed: z.string().default("0"),
        instructions: z.string().nullable().default(null),
        checkoutUrlTemplate: z.string().nullable().default(null),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOwner(ctx)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "إدارة بوابات الدفع للمالك فقط",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      const values = {
        code: input.code,
        providerType: input.providerType,
        name: input.name,
        country: input.country,
        countryCode: input.countryCode.toUpperCase(),
        currency: input.currency.toUpperCase(),
        mode: input.mode,
        credentials: input.credentials
          ? JSON.stringify(input.credentials)
          : null,
        feePercent: input.feePercent,
        feeFixed: input.feeFixed,
        instructions: input.instructions,
        checkoutUrlTemplate: input.checkoutUrlTemplate,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      };
      if (input.id) {
        await db
          .update(paymentGateways)
          .set(values)
          .where(eq(paymentGateways.id, input.id));
        return { success: true, id: input.id };
      }
      const [row] = await db
        .insert(paymentGateways)
        .values(values)
        .returning({ id: paymentGateways.id });
      return { success: true, id: row.id };
    }),

  adminListGateways: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(paymentGateways).orderBy(paymentGateways.sortOrder);
  }),

  adminUpdatePolicy: ownerProcedure
    .input(
      z.object({
        trialDays: z.number().int().min(0).max(365),
        graceDays: z.number().int().min(0).max(365),
        graceFullAccess: z.boolean(),
        maxOverdueDays: z.number().int().min(0).max(730),
        restrictedFeatures: z.array(z.string()),
        dunningReminderDays: z.array(z.number().int()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      const existing = (
        await db
          .select()
          .from(subscriptionPolicies)
          .where(eq(subscriptionPolicies.code, "default"))
          .limit(1)
      )[0];
      const values = {
        name: "السياسة الافتراضية — لا يتوقف العمل أبداً",
        trialDays: input.trialDays,
        graceDays: input.graceDays,
        graceFullAccess: input.graceFullAccess,
        maxOverdueDays: Math.max(input.maxOverdueDays, input.graceDays),
        restrictedFeatures: input.restrictedFeatures,
        dunningReminderDays: input.dunningReminderDays,
        updatedAt: new Date(),
      };
      if (existing) {
        await db
          .update(subscriptionPolicies)
          .set(values)
          .where(eq(subscriptionPolicies.id, existing.id));
      } else {
        await db
          .insert(subscriptionPolicies)
          .values({ code: "default", ...values });
      }
      return { success: true };
    }),

  // ── Admin: تفعيل الأكوام draft → active ─────────────────────────────
  activateCode: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      const [updated] = await db
        .update(subscriptionCodes)
        .set({ status: "active", activatedAt: new Date() })
        .where(
          and(
            eq(subscriptionCodes.id, input.id),
            eq(subscriptionCodes.status, "draft")
          )
        )
        .returning();
      if (!updated)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الكوب غير موجود أو غير قابل للتفعيل",
        });
      return { success: true, code: updated.code };
    }),

  // ── Admin: إنشاء كوب واحد أو دفعة bulk ─────────────────────────────
  createSubscriptionCode: ownerProcedure
    .input(
      z.object({
        planId: z.number().int().positive(),
        price: z.string().min(1),
        country: z.string().default("عالمي"),
        countryCode: z.string().length(2).default("GL"),
        currency: z.string().default("USD"),
        faceValue: z.string().optional(),
        periodMonths: z.number().int().positive().default(1),
        deliveryMode: z.enum(["email", "whatsapp", "manual"]).default("manual"),
        deliveryTarget: z.string().email().optional(),
        quantity: z.number().int().positive().max(200).default(1),
        createdBy: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });

      const plan = (
        await db
          .select({
            name: subscriptionPlans.name,
            code: subscriptionPlans.code,
          })
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, input.planId))
          .limit(1)
      )[0];
      if (!plan)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الباقة غير موجودة",
        });

      const created: Array<{ code: string; id: number }> = [];
      for (let i = 0; i < input.quantity; i++) {
        const code = `${plan.code?.toUpperCase().slice(0, 4)}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;
        const [row] = await db
          .insert(subscriptionCodes)
          .values({
            code,
            planId: input.planId,
            name: plan.name,
            country: input.country,
            countryCode: input.countryCode,
            currency: input.currency,
            price: input.price,
            faceValue: input.faceValue ?? null,
            periodMonths: input.periodMonths,
            scope: "single",
            deliveryMode: input.deliveryMode,
            deliveryTarget: input.deliveryTarget ?? null,
            status: "draft",
            createdBy: input.createdBy ?? null,
            sortOrder: 0,
          })
          .returning({
            code: subscriptionCodes.code,
            id: subscriptionCodes.id,
          });
        created.push(row);
      }
      return { created };
    }),

  // ── Admin: قائمة الأكوام (filtered by status/country) ───────────────
  adminListCodes: ownerProcedure
    .input(
      z.object({
        status: z.enum(["draft", "active", "used", "revoked"]).optional(),
        code: z.string().optional(),
        countryCode: z.string().length(2).optional(),
        limit: z.number().int().positive().max(200).default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.status)
        conditions.push(eq(subscriptionCodes.status, input.status));
      if (input.code) conditions.push(eq(subscriptionCodes.code, input.code));
      if (input.countryCode)
        conditions.push(eq(subscriptionCodes.countryCode, input.countryCode));
      return db
        .select({
          id: subscriptionCodes.id,
          code: subscriptionCodes.code,
          name: subscriptionCodes.name,
          countryCode: subscriptionCodes.countryCode,
          currency: subscriptionCodes.currency,
          price: subscriptionCodes.price,
          faceValue: subscriptionCodes.faceValue,
          periodMonths: subscriptionCodes.periodMonths,
          deliveryMode: subscriptionCodes.deliveryMode,
          deliveryTarget: subscriptionCodes.deliveryTarget,
          status: subscriptionCodes.status,
          activatedAt: subscriptionCodes.activatedAt,
        })
        .from(subscriptionCodes)
        .where(and(...conditions))
        .orderBy(subscriptionCodes.activatedAt)
        .limit(input.limit);
    }),

  // ── Public: العميل يفتتح /claim ويدخل الكوب ─────────────────────────
  /**
   * `sendSubscriptionCode` (owner) — إرسال رمز التفعيل للعميل عبر قنوات
   * موثوقة ومتاحة في أي دولة بدون مزوّد خارجي إلزامي:
   *  - email   : SMTP المُعدّ في المنصة (nodemailer) — fallback للكونسول.
   *  - whatsapp: رابط wa.me جاهز يفتح المحادثة مع الرسالة مكتوبة مسبقاً
   *              (موثوق عالمياً — يرسلها المالك بضغطة زر).
   *  - sms     : نص جاهز للنسخ + رابط sms: يفتح تطبيق الرسائل.
   * يفعّل الكود (draft → active) عند الإرسال ويحدّث وسيلة/جهة الإرسال.
   */
  sendSubscriptionCode: ownerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        mode: z.enum(["email", "whatsapp", "sms"]),
        target: z.string().min(3).max(255),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });

      const [voucher] = await db
        .select()
        .from(subscriptionCodes)
        .where(eq(subscriptionCodes.id, input.id))
        .limit(1);
      if (!voucher)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الكوب غير موجود",
        });
      if (voucher.status === "used")
        throw new TRPCError({
          code: "CONFLICT",
          message: "الكوب مستخدم بالفعل ولا يمكن إعادة إرساله",
        });

      const claimUrl = `${ENV.appUrl || "https://alhusainiaye.vercel.app"}/claim`;
      const message = [
        `رمز تفعيل اشتراكك في منصة الحسينية: ${voucher.code}`,
        `الباقة: ${voucher.name} — المدة: ${voucher.periodMonths} شهر — القيمة: ${voucher.price} ${voucher.currency}`,
        input.note ? `ملاحظة: ${input.note}` : "",
        `للتفعيل: افتح ${claimUrl} وأدخل الرمز — سيُفعَّل اشتراكك فوراً ويستمر عملك دون توقف.`,
      ]
        .filter(Boolean)
        .join("\n");

      let delivered: boolean;
      let channel: string;
      let waLink: string | null = null;
      let smsLink: string | null = null;

      if (input.mode === "email") {
        const result = await sendTransactionalEmail({
          to: input.target,
          subject: `رمز تفعيل اشتراكك — منصة الحسينية (${voucher.code})`,
          text: message,
          html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#0f172a;">
            <h3>رمز تفعيل اشتراكك</h3>
            <p style="font-size:22px;font-weight:bold;letter-spacing:2px;background:#f1f5f9;padding:12px 20px;border-radius:8px;">${voucher.code}</p>
            <p>الباقة: <strong>${voucher.name}</strong> — المدة: ${voucher.periodMonths} شهر — القيمة: ${voucher.price} ${voucher.currency}</p>
            ${input.note ? `<p>ملاحظة: ${input.note}</p>` : ""}
            <p><a href="${claimUrl}" style="background:#1e3a5f;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;">تفعيل الاشتراك الآن</a></p>
            <p style="font-size:13px;color:#475569;">لن يتوقف عملك بعد انتهاء أي فترة — النظام يمنحك مهلة مرنة وتبقى عملياتك اليومية متاحة.</p>
          </div>`,
        });
        delivered = result.delivered;
        channel = result.mode === "smtp" ? "email" : "email_console";
      } else if (input.mode === "whatsapp") {
        const digits = input.target.replace(/[^\d]/g, "");
        waLink = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
        delivered = true; // الرابط جاهز للإرسال بضغطة زر من المالك
        channel = "whatsapp_link";
      } else {
        const digits = input.target.replace(/[^\d+]/g, "");
        smsLink = `sms:${digits}?&body=${encodeURIComponent(message)}`;
        delivered = true;
        channel = "sms_link";
      }

      await db
        .update(subscriptionCodes)
        .set({
          status: voucher.status === "draft" ? "active" : voucher.status,
          activatedAt: voucher.activatedAt ?? new Date(),
          deliveryMode: input.mode,
          deliveryTarget: input.target,
        })
        .where(eq(subscriptionCodes.id, voucher.id));

      return {
        ok: true as const,
        channel,
        delivered,
        waLink,
        smsLink,
        messageText: message,
        warning:
          channel === "email_console"
            ? "SMTP غير مُعدّ — سُجل الرمز في سجلات الخادم فقط. أرسله يدوياً أو اضبط SMTP."
            : null,
      };
    }),

  // ── Public: العميل يفتتح /claim ويدخل الكوب ─────────────────────────
  /**
   * `claimSubscription` — يستهلك كوب تفعيل ويُطبق على المستأجر الحالي.
   *
   * التدفق:
   *  1. بحث الكوب (case-insensitive) بحالة active.
   *  2. tenantId من الجلسة أو يُمرّر.
   *  3. حساب الاشتراك الجديد (currentPeriodEnd = now + periodMonths).
   *  4. تحديث settings.subscriptionStatus + tenantSubscriptions.
   *  5. كتابة فاتورة + سجل دفع voucher.
   *  6. تفعيل الاشتراك فوراً — النظام يواصل بالعمل.
   */
  claimSubscription: publicProcedure
    .input(
      z.object({
        code: z.string().min(1).max(40),
        tenantId: z.number().int().positive().optional(),
        idempotencyKey: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Session binding: an authenticated caller can only claim for their own
      // tenant — a client-supplied tenantId pointing elsewhere is rejected.
      // Anonymous self-service claim (logged-out activation) still works
      // because the voucher code itself is the capability.
      const sessionTenantId = ctx.user?.tenantId ?? null;
      if (
        sessionTenantId &&
        input.tenantId &&
        input.tenantId !== sessionTenantId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "لا يمكن تفعيل الاشتراك لمؤسسة أخرى — سجّل الدخول بالمؤسسة الصحيحة",
        });
      }
      const effectiveTenantId = sessionTenantId ?? input.tenantId;
      // منع تلوث tenantId=0 — يجب تحديد مؤسسة حقيقية
      if (!effectiveTenantId || effectiveTenantId <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "معرّف المؤسسة مطلوب — سجّل الدخول أولاً ثم أعد إدخال الرمز",
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });

      if (input.idempotencyKey) {
        const existing = await db
          .select()
          .from(paymentHistory)
          .where(eq(paymentHistory.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (existing.length > 0) {
          return { success: true, alreadyProcessed: true, idempotent: true };
        }
      }

      // 1) Locate the voucher (case-insensitive) — only "active" ones.
      const [voucher] = await db
        .select()
        .from(subscriptionCodes)
        .where(
          and(
            eq(subscriptionCodes.code, input.code.toUpperCase()),
            eq(subscriptionCodes.status, "active")
          )
        )
        .limit(1);

      if (!voucher)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "كوب التفعيل غير صالح أو غير مفعّل — تواصل مع الدعم.",
        });

      const start = new Date();
      const end = new Date(
        start.getTime() + voucher.periodMonths * 30 * 86_400_000
      );

      // 2) Apply the entitlement — tenantId موثق إلزامي
      const existingSub = await db
        .select({ id: tenantSubscriptions.id })
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, effectiveTenantId))
        .limit(1);

      const planId = voucher.planId;
      if (existingSub[0]) {
        await db
          .update(tenantSubscriptions)
          .set({
            planId,
            status: "active",
            billingCycle: "monthly",
            currentPeriodStart: start,
            currentPeriodEnd: end,
            paymentProvider: "voucher",
          })
          .where(eq(tenantSubscriptions.tenantId, effectiveTenantId));
      } else {
        await db.insert(tenantSubscriptions).values({
          tenantId: effectiveTenantId,
          planId,
          status: "active",
          billingCycle: "monthly",
          currentPeriodStart: start,
          currentPeriodEnd: end,
          paymentProvider: "voucher",
        });
      }

      // 3) Mark settings as active
      await db
        .update(settings)
        .set({
          subscriptionStatus: "active",
          trialEndsAt: end,
          updatedAt: start,
        })
        .where(eq(settings.tenantId, effectiveTenantId));

      // 4) Record an invoice + payment (no external provider)
      const invoiceNumber = `INV-${start.getFullYear()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;
      const amount = voucher.price;

      const [invoice] = await db
        .insert(billingInvoices)
        .values({
          tenantId: effectiveTenantId,
          subscriptionId: existingSub[0]?.id ?? null,
          invoiceNumber,
          status: "paid",
          subtotal: amount,
          total: amount,
          currency: voucher.currency,
          dueDate: end,
          paidAt: start,
          paymentMethod: "voucher",
          externalPaymentId: voucher.code,
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .returning();

      await db.insert(paymentHistory).values({
        tenantId: effectiveTenantId,
        invoiceId: invoice.id,
        amount,
        currency: voucher.currency,
        status: "paid",
        paymentMethod: "voucher",
        transactionId: `${voucher.code}/${start.getTime()}`,
        notes: `دفع عبر رمز تفعيل ${voucher.code}`,
        idempotencyKey: input.idempotencyKey ?? null,
      });

      // 5) Mark the voucher used
      await db
        .update(subscriptionCodes)
        .set({
          status: "used",
          activatedAt: start,
          redemption: {
            method: "voucher",
            tenantId: effectiveTenantId,
          },
        })
        .where(eq(subscriptionCodes.id, voucher.id));

      return {
        ok: true,
        invoiceNumber,
        subscriptionStatus: "active" as const,
        currentPeriodEnd: end,
        message: `تم تفعيل الاشتراك بنجاح حتى ${end.toLocaleDateString("ar-EG")}. النظام يعمل الآن بالكامل.`,
      };
    }),
});
