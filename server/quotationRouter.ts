/**
 * Universal Quotation Engine Router — محرك عروض الأسعار الشامل
 * ─────────────────────────────────────────────────────────────
 * Industry-Agnostic / Configuration-Driven E2E SaaS router:
 *  • CRUD + lifecycle state machine + versions + multi-level approvals (SoD)
 *  • Negotiation rounds + alternatives + terms + parties/commissions
 *  • Attachments + cross-module links (CRM/Inventory/Procurement/Sales/…)
 *  • Convert sale → sales order, purchase → procurements
 *  • Quotation Intelligence: analyze + persist + proactive alerts
 *  • Evidence-Based, Explainable, Audit-Trailed, Permission-Governed
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { eq, and, desc, asc, sql, or, ilike, gte, lte } from "drizzle-orm";
import { router, tenantProcedure } from "./_core/trpc";
import { requirePermissions } from "./_core/trpc";
import { PERMISSIONS } from "../shared/permissions";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import { genGlobalCode } from "./_core/governance";
import { createNotification } from "./notifications";
import {
  quotations,
  quotationItems,
  quotationVersions,
  quotationAlternatives,
  quotationTerms,
  quotationParties,
  quotationApprovals,
  quotationNegotiations,
  quotationAttachments,
  quotationLinks,
  quotationAnalyses,
  quotationAlerts,
  quotationTypes,
  orders,
  orderItems,
  procurements,
  activityLogs,
  customers,
  suppliers,
} from "../drizzle/schema";
import {
  computeDocument,
  validateDocument,
  type QuotationDocInput,
} from "./services/quotationEngine";
import {
  scoreQuotation,
  rankOptions,
  benchmarkHistory,
  detectAnomalies,
  forecastWin,
  recommendActions,
  whatIfScenarios,
  type HistoryPoint,
} from "./services/quotationIntelligence";

// ─── Helpers ─────────────────────────────────────────────────────────────

async function dbOrThrow(): Promise<any> {
  const d = await getDb();
  if (!d)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return d;
}

const SOD_EXEMPT_ROLES = ["owner"];

async function nextQuotationNumber(
  db: any,
  tenantId: number,
  prefix: string
): Promise<string> {
  const [row] = await db
    .select({ c: sql`count(*)::int` })
    .from(quotations)
    .where(eq(quotations.tenantId, tenantId));
  const seq = String(Number(row?.c ?? 0) + 1).padStart(5, "0");
  return `${prefix || "QT"}-${new Date().getFullYear()}-${seq}`;
}

async function logActivity(
  db: any,
  tenantId: number,
  user: { id: number; name?: string | null },
  action: string,
  entityId: number,
  details: string
) {
  try {
    await db.insert(activityLogs).values({
      tenantId,
      userId: user.id,
      userName: user.name || `user-${user.id}`,
      action,
      entityType: "quotation",
      entityId,
      details,
    });
  } catch {
    // audit logging is best-effort
  }
}

/** Idempotent per-tenant quotation-type seeds (configuration-driven catalog). */
async function ensureDefaultTypes(db: any, tenantId: number) {
  const existing = await db
    .select({ id: quotationTypes.id })
    .from(quotationTypes)
    .where(eq(quotationTypes.tenantId, tenantId))
    .limit(1);
  if (existing.length > 0) return;
  const seeds = [
    {
      code: "SALE-PRODUCT",
      name: "عرض بيع — منتجات",
      direction: "sale",
      itemKinds: ["product", "distribution"],
      prefix: "QT-S",
    },
    {
      code: "SALE-SERVICE",
      name: "عرض بيع — خدمات",
      direction: "sale",
      itemKinds: ["service"],
      prefix: "QT-V",
    },
    {
      code: "SALE-PROJECT",
      name: "عرض بيع — مشاريع",
      direction: "sale",
      itemKinds: ["project", "service", "product"],
      prefix: "QT-P",
    },
    {
      code: "SALE-SUBSCRIPTION",
      name: "عرض بيع — اشتراكات",
      direction: "sale",
      itemKinds: ["subscription", "service"],
      prefix: "QT-B",
    },
    {
      code: "SALE-PRODUCTION",
      name: "عرض بيع — إنتاج",
      direction: "sale",
      itemKinds: ["production", "product"],
      prefix: "QT-M",
    },
    {
      code: "PURCHASE-GENERAL",
      name: "عرض شراء — عام",
      direction: "purchase",
      itemKinds: ["product", "service", "production", "distribution", "other"],
      prefix: "QT-U",
    },
  ] as const;
  for (const s of seeds) {
    try {
      await db.insert(quotationTypes).values({
        tenantId,
        code: s.code,
        name: s.name,
        direction: s.direction,
        itemKinds: [...s.itemKinds],
        defaultValidityDays: 30,
        defaultTerms: [
          {
            category: "payment",
            title: "الدفع",
            body: "حسب الاتفاق — دفعة مقدمة 30% والباقي عند التسليم",
          },
          {
            category: "delivery",
            title: "التسليم",
            body: "حسب الجدول المتفق عليه في العرض",
          },
        ],
        pricingConfig: {
          discountPolicy: "line_and_header",
          taxPolicy: "line_first",
          currencyPolicy: "rate_per_doc",
          marginPolicy: { warnBelow: 5, blockBelow: null },
        },
        approvalPolicy: {
          levels: [{ level: 1, threshold: 0, role: "manager" }],
        },
        numberingPrefix: s.prefix,
        isActive: true,
        isSystem: true,
      });
    } catch {
      // concurrent seed race — ignore
    }
  }
}

function hashItems(
  items: Array<{ name: string; quantity: unknown; unitPrice: unknown }>
): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        items.map(i => [i.name, String(i.quantity), String(i.unitPrice)])
      )
    )
    .digest("hex")
    .slice(0, 16);
}

// Lifecycle state machine
const TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "cancelled"],
  in_review: ["approved", "rejected", "draft", "cancelled"],
  approved: ["sent", "cancelled"],
  sent: ["negotiating", "accepted", "rejected", "expired", "cancelled"],
  negotiating: ["accepted", "rejected", "sent", "cancelled"],
  accepted: ["converted", "closed", "cancelled"],
  rejected: ["negotiating", "cancelled"],
  expired: ["sent", "negotiating", "cancelled"],
  converted: ["closed"],
  closed: [],
  cancelled: [],
};

const OPEN_STATUSES = ["draft", "in_review", "approved", "sent", "negotiating"];

// ─── Zod schemas ─────────────────────────────────────────────────────────

const lineSchema = z.object({
  kind: z
    .enum([
      "product",
      "service",
      "project",
      "subscription",
      "production",
      "distribution",
      "other",
    ])
    .default("product"),
  refId: z.number().int().nullable().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  quantity: z.number().positive().max(1000000000),
  unit: z.string().max(50).default("قطعة"),
  unitPrice: z.number().min(0).max(1000000000000),
  costPrice: z.number().min(0).max(1000000000000).default(0),
  discountPct: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).max(1000000000000).default(0),
  taxPct: z.number().min(0).max(100).default(0),
  config: z.record(z.string(), z.unknown()).default({}),
});

const partySchema = z.object({
  role: z.enum([
    "customer",
    "supplier",
    "broker",
    "sales_rep",
    "approver",
    "contact",
  ]),
  entityType: z.string().max(50).nullable().optional(),
  entityId: z.number().int().nullable().optional(),
  name: z.string().min(1).max(255),
  commissionPct: z.number().min(0).max(100).default(0),
  commissionAmount: z.number().min(0).max(1000000000000).default(0),
  notes: z.string().max(1000).nullable().optional(),
});

const termSchema = z.object({
  category: z.string().max(30).default("general"),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(4000),
});

const createSchema = z.object({
  typeId: z.number().int().nullable().optional(),
  direction: z.enum(["sale", "purchase"]).default("sale"),
  customerId: z.number().int().nullable().optional(),
  supplierId: z.number().int().nullable().optional(),
  counterpartyName: z.string().max(255).nullable().optional(),
  branchId: z.number().int().nullable().optional(),
  costCenterId: z.number().int().nullable().optional(),
  warehouseId: z.number().int().nullable().optional(),
  projectId: z.number().int().nullable().optional(),
  currency: z.string().max(10).default("YER"),
  currencyRate: z.number().positive().default(1),
  headerDiscountPct: z.number().min(0).max(100).default(0),
  headerDiscountAmount: z.number().min(0).default(0),
  headerTaxPct: z.number().min(0).max(100).default(0),
  paymentTerms: z.record(z.string(), z.unknown()).default({}),
  deliveryTerms: z.record(z.string(), z.unknown()).default({}),
  validityDays: z.number().int().min(1).max(730).default(30),
  notes: z.string().max(4000).nullable().optional(),
  lines: z.array(lineSchema).min(1).max(500),
  parties: z.array(partySchema).max(20).default([]),
  terms: z.array(termSchema).max(50).default([]),
});

// ─── Router ──────────────────────────────────────────────────────────────

export const quotationRouter = router({
  // ── Types (configuration catalog) ──────────────────────────────────────
  types: router({
    // PAGINATION (mandatory-limit audit): type catalog per tenant is tiny
    // (6 system seeds + custom), but every list must still be bounded.
    list: tenantProcedure
      .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
      .query(async ({ ctx }) => {
        const db = await dbOrThrow();
        const tid = requireTenantId(ctx);
        await ensureDefaultTypes(db, tid);
        return db
          .select()
          .from(quotationTypes)
          .where(eq(quotationTypes.tenantId, tid))
          .orderBy(asc(quotationTypes.code))
          .limit(500);
      }),
    create: tenantProcedure
      .use(requirePermissions(PERMISSIONS.QUOTATION_CREATE))
      .input(
        z.object({
          code: z.string().min(1).max(50),
          name: z.string().min(1).max(255),
          direction: z.enum(["sale", "purchase"]).default("sale"),
          itemKinds: z.array(z.string()).min(1),
          defaultValidityDays: z.number().int().min(1).max(730).default(30),
          numberingPrefix: z.string().max(20).default("QT"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const tid = requireTenantId(ctx);
        const [row] = await db
          .insert(quotationTypes)
          .values({
            tenantId: tid,
            code: input.code,
            name: input.name,
            direction: input.direction,
            itemKinds: input.itemKinds,
            defaultValidityDays: input.defaultValidityDays,
            numberingPrefix: input.numberingPrefix,
            isActive: true,
          })
          .returning();
        return row;
      }),
  }),

  // ── List ───────────────────────────────────────────────────────────────
  list: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
    .input(
      z
        .object({
          direction: z.enum(["sale", "purchase"]).optional(),
          status: z.string().max(30).optional(),
          search: z.string().max(120).optional(),
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const args = (input ?? {}) as {
        direction?: "sale" | "purchase";
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
      };
      const conds = [eq(quotations.tenantId, tid)];
      if (args.direction) conds.push(eq(quotations.direction, args.direction));
      if (args.status) conds.push(eq(quotations.status, args.status as never));
      if (args.search) {
        conds.push(
          or(
            ilike(quotations.quotationNumber, `%${args.search}%`),
            ilike(quotations.counterpartyName, `%${args.search}%`)
          )!
        );
      }
      const rows = await db
        .select()
        .from(quotations)
        .where(and(...conds))
        .orderBy(desc(quotations.updatedAt))
        .limit(args.limit ?? 50)
        .offset(args.offset ?? 0);
      const [{ c }] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(quotations)
        .where(and(...conds));
      return { rows, total: c ?? 0 };
    }),

  // ── Get full detail ────────────────────────────────────────────────────
  get: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [header] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)))
        .limit(1);
      if (!header)
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      const [
        items,
        alternatives,
        terms,
        parties,
        approvals,
        negotiations,
        attachments,
        links,
        analyses,
        alerts,
      ] = await Promise.all([
        db
          .select()
          .from(quotationItems)
          .where(eq(quotationItems.quotationId, input.id))
          .orderBy(asc(quotationItems.sortOrder)),
        db
          .select()
          .from(quotationAlternatives)
          .where(eq(quotationAlternatives.quotationId, input.id)),
        db
          .select()
          .from(quotationTerms)
          .where(eq(quotationTerms.quotationId, input.id))
          .orderBy(asc(quotationTerms.sortOrder)),
        db
          .select()
          .from(quotationParties)
          .where(eq(quotationParties.quotationId, input.id)),
        db
          .select()
          .from(quotationApprovals)
          .where(eq(quotationApprovals.quotationId, input.id))
          .orderBy(asc(quotationApprovals.level)),
        db
          .select()
          .from(quotationNegotiations)
          .where(eq(quotationNegotiations.quotationId, input.id))
          .orderBy(asc(quotationNegotiations.round)),
        db
          .select()
          .from(quotationAttachments)
          .where(eq(quotationAttachments.quotationId, input.id)),
        db
          .select()
          .from(quotationLinks)
          .where(eq(quotationLinks.quotationId, input.id)),
        db
          .select()
          .from(quotationAnalyses)
          .where(eq(quotationAnalyses.quotationId, input.id))
          .orderBy(desc(quotationAnalyses.createdAt))
          .limit(3),
        db
          .select()
          .from(quotationAlerts)
          .where(eq(quotationAlerts.quotationId, input.id))
          .orderBy(desc(quotationAlerts.createdAt))
          .limit(20),
      ]);
      return {
        header,
        items,
        alternatives,
        terms,
        parties,
        approvals,
        negotiations,
        attachments,
        links,
        analyses,
        alerts,
      };
    }),

  // ── Create ─────────────────────────────────────────────────────────────
  create: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_CREATE))
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      await ensureDefaultTypes(db, tid);

      const docInput: QuotationDocInput = {
        lines: input.lines.map(l => ({
          ...l,
          description: l.description ?? undefined,
        })),
        headerDiscountPct: input.headerDiscountPct,
        headerDiscountAmount: input.headerDiscountAmount,
        headerTaxPct: input.headerTaxPct,
        parties: input.parties,
        currencyRate: input.currencyRate,
      };
      const blockers = validateDocument(docInput).filter(
        i => i.severity === "error"
      );
      if (blockers.length > 0)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: blockers.map(b => b.message).join("؛ "),
        });
      const computed = computeDocument(docInput);

      let prefix = "QT";
      let validityDays = input.validityDays;
      if (input.typeId) {
        const [t] = await db
          .select()
          .from(quotationTypes)
          .where(
            and(
              eq(quotationTypes.id, input.typeId),
              eq(quotationTypes.tenantId, tid)
            )
          )
          .limit(1);
        if (t) {
          prefix = t.numberingPrefix || "QT";
          validityDays = t.defaultValidityDays ?? validityDays;
        }
      }
      const number = await nextQuotationNumber(db, tid, prefix);
      const [header] = await db
        .insert(quotations)
        .values({
          tenantId: tid,
          globalCode: genGlobalCode({
            tenantId: tid,
            branchId: input.branchId,
            userId: ctx.user.id,
          }),
          quotationNumber: number,
          typeId: input.typeId ?? null,
          direction: input.direction,
          status: "draft",
          version: 1,
          customerId: input.customerId ?? null,
          supplierId: input.supplierId ?? null,
          counterpartyName: input.counterpartyName ?? null,
          branchId: input.branchId ?? null,
          costCenterId: input.costCenterId ?? null,
          warehouseId: input.warehouseId ?? null,
          projectId: input.projectId ?? null,
          currency: input.currency,
          currencyRate: String(input.currencyRate),
          subtotal: String(computed.subtotal),
          discountTotal: String(computed.discountTotal),
          taxTotal: String(computed.taxTotal),
          commissionTotal: String(computed.commissionTotal),
          grandTotal: String(computed.grandTotal),
          costTotal: String(computed.costTotal),
          marginTotal: String(computed.marginTotal),
          marginPct: String(computed.marginPct),
          paymentTerms: input.paymentTerms,
          deliveryTerms: input.deliveryTerms,
          validityDate: new Date(Date.now() + validityDays * 86_400_000),
          notes: input.notes ?? null,
          createdById: ctx.user.id,
        })
        .returning();

      for (let i = 0; i < input.lines.length; i++) {
        const l = input.lines[i];
        const c = computed.lines[i];
        await db.insert(quotationItems).values({
          tenantId: tid,
          quotationId: header.id,
          kind: l.kind as never,
          refId: l.refId ?? null,
          name: l.name,
          description: l.description ?? null,
          quantity: String(l.quantity),
          unit: l.unit,
          unitPrice: String(l.unitPrice),
          costPrice: String(l.costPrice ?? 0),
          discountPct: String(l.discountPct ?? 0),
          discountAmount: String(c.discount),
          taxPct: String(l.taxPct ?? 0),
          taxAmount: String(c.tax),
          lineTotal: String(c.lineTotal),
          lineCost: String(c.lineCost),
          lineMargin: String(c.lineMargin),
          config: l.config ?? {},
          sortOrder: i,
        });
      }
      for (const p of input.parties) {
        const pct = Math.min(100, Math.max(0, p.commissionPct ?? 0));
        const amt =
          (computed.taxableBase * pct) / 100 + (p.commissionAmount ?? 0);
        await db.insert(quotationParties).values({
          tenantId: tid,
          quotationId: header.id,
          role: p.role as never,
          entityType: p.entityType ?? null,
          entityId: p.entityId ?? null,
          name: p.name,
          commissionPct: String(pct),
          commissionAmount: String(Math.round(amt * 100) / 100),
          notes: p.notes ?? null,
        });
      }
      input.terms.forEach((t, i) => {
        db.insert(quotationTerms)
          .values({
            tenantId: tid,
            quotationId: header.id,
            category: t.category,
            title: t.title,
            body: t.body,
            sortOrder: i,
          })
          .catch(() => undefined);
      });
      await db.insert(quotationVersions).values({
        tenantId: tid,
        quotationId: header.id,
        versionNo: 1,
        snapshot: {
          header,
          lines: input.lines,
          parties: input.parties,
          terms: input.terms,
          computed,
        },
        changeSummary: "إنشاء العرض (الإصدار الأول)",
        createdById: ctx.user.id,
      });

      await logActivity(
        db,
        tid,
        ctx.user,
        "إنشاء عرض سعر",
        header.id,
        `عرض ${number} بإجمالي ${computed.grandTotal} ${input.currency}`
      );
      return { id: header.id, quotationNumber: number, computed };
    }),

  // ── Update (draft/in_review only → version bump + snapshot) ─────────────
  update: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(
      createSchema.partial().extend({
        id: z.number().int(),
        changeSummary: z.string().max(500).default("تعديل العرض"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [header] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)))
        .limit(1);
      if (!header)
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      if (!["draft", "in_review"].includes(header.status))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "لا يمكن التعديل إلا في حالتي المسودة والمراجعة — أنشئ إصداراً تفاوضياً بدلاً من ذلك",
        });

      const currentItems = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, input.id));
      const lines = (input.lines ??
        currentItems.map((r: any) => ({
          kind: r.kind as never,
          refId: r.refId,
          name: r.name,
          description: r.description,
          quantity: Number(r.quantity),
          unit: r.unit,
          unitPrice: Number(r.unitPrice),
          costPrice: Number(r.costPrice),
          discountPct: Number(r.discountPct),
          discountAmount: 0,
          taxPct: Number(r.taxPct),
          config: (r.config ?? {}) as Record<string, unknown>,
        }))) as QuotationDocInput["lines"];
      const docInput: QuotationDocInput = {
        lines,
        headerDiscountPct: input.headerDiscountPct ?? 0,
        headerDiscountAmount: input.headerDiscountAmount ?? 0,
        headerTaxPct: input.headerTaxPct ?? 0,
        parties: input.parties ?? [],
        currencyRate: input.currencyRate ?? Number(header.currencyRate),
      };
      const blockers = validateDocument(docInput).filter(
        i => i.severity === "error"
      );
      if (blockers.length > 0)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: blockers.map(b => b.message).join("؛ "),
        });
      const computed = computeDocument(docInput);
      const newVersion = (header.version ?? 1) + 1;

      await db
        .update(quotations)
        .set({
          subtotal: String(computed.subtotal),
          discountTotal: String(computed.discountTotal),
          taxTotal: String(computed.taxTotal),
          commissionTotal: String(computed.commissionTotal),
          grandTotal: String(computed.grandTotal),
          costTotal: String(computed.costTotal),
          marginTotal: String(computed.marginTotal),
          marginPct: String(computed.marginPct),
          currency: input.currency ?? header.currency,
          currencyRate: String(input.currencyRate ?? header.currencyRate),
          notes: input.notes ?? header.notes,
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)));

      if (input.lines) {
        await db
          .delete(quotationItems)
          .where(eq(quotationItems.quotationId, input.id));
        for (let i = 0; i < input.lines.length; i++) {
          const l = input.lines[i];
          const c = computed.lines[i];
          await db.insert(quotationItems).values({
            tenantId: tid,
            quotationId: input.id,
            kind: l.kind as never,
            refId: l.refId ?? null,
            name: l.name,
            description: l.description ?? null,
            quantity: String(l.quantity),
            unit: l.unit,
            unitPrice: String(l.unitPrice),
            costPrice: String(l.costPrice ?? 0),
            discountPct: String(l.discountPct ?? 0),
            discountAmount: String(c.discount),
            taxPct: String(l.taxPct ?? 0),
            taxAmount: String(c.tax),
            lineTotal: String(c.lineTotal),
            lineCost: String(c.lineCost),
            lineMargin: String(c.lineMargin),
            config: l.config ?? {},
            sortOrder: i,
          });
        }
      }
      await db.insert(quotationVersions).values({
        tenantId: tid,
        quotationId: input.id,
        versionNo: newVersion,
        snapshot: { lines, computed },
        changeSummary: input.changeSummary,
        createdById: ctx.user.id,
      });
      await logActivity(
        db,
        tid,
        ctx.user,
        "تعديل عرض سعر",
        input.id,
        `${input.changeSummary} → إصدار ${newVersion}`
      );
      return { id: input.id, version: newVersion, computed };
    }),

  // ── Lifecycle transition (state machine + SoD) ──────────────────────────
  transition: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(
      z.object({
        id: z.number().int(),
        to: z.string().max(30),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [header] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)))
        .limit(1);
      if (!header)
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      const allowed = TRANSITIONS[header.status] ?? [];
      if (!allowed.includes(input.to))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `انتقال غير مسموح من ${header.status} إلى ${input.to}`,
        });

      // SoD: direct approval by the creator is blocked unless admin/owner
      if (
        input.to === "approved" &&
        header.createdById === ctx.user.id &&
        !SOD_EXEMPT_ROLES.includes(ctx.user.role ?? "")
      ) {
        const pending = await db
          .select()
          .from(quotationApprovals)
          .where(
            and(
              eq(quotationApprovals.quotationId, input.id),
              eq(quotationApprovals.status, "pending")
            )
          );
        if (pending.length > 0)
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "الفصل بين المهام: منشئ العرض لا يعتمده — بانتظار معتمد مستقل",
          });
      }

      const patch: Record<string, unknown> = {
        status: input.to,
        updatedAt: new Date(),
      };
      if (input.to === "sent") patch.sentAt = new Date();
      if (["accepted", "rejected", "expired"].includes(input.to))
        patch.decidedAt = new Date();
      await db
        .update(quotations)
        .set(patch)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)));

      // Submitting for review spawns approval levels from the type policy
      if (input.to === "in_review") {
        let levels: Array<{ level: number }> = [{ level: 1 }];
        if (header.typeId) {
          const [t] = await db
            .select()
            .from(quotationTypes)
            .where(
              and(
                eq(quotationTypes.id, header.typeId),
                eq(quotationTypes.tenantId, tid)
              )
            )
            .limit(1);
          const pol = (t?.approvalPolicy ?? {}) as {
            levels?: Array<{ level: number }>;
          };
          if (Array.isArray(pol.levels) && pol.levels.length > 0)
            levels = pol.levels;
        }
        for (const lv of levels) {
          await db
            .insert(quotationApprovals)
            .values({
              tenantId: tid,
              quotationId: input.id,
              versionNo: header.version ?? 1,
              level: lv.level ?? 1,
              status: "pending",
            })
            .catch(() => undefined);
        }
      }
      await db
        .insert(quotationVersions)
        .values({
          tenantId: tid,
          quotationId: input.id,
          versionNo: header.version ?? 1,
          snapshot: {
            status: input.to,
            at: new Date().toISOString(),
            comment: input.comment ?? null,
          },
          changeSummary: `انتقال الحالة: ${header.status} → ${input.to}`,
          createdById: ctx.user.id,
        })
        .catch(() => undefined);
      await logActivity(
        db,
        tid,
        ctx.user,
        "تغيير حالة عرض",
        input.id,
        `${header.status} → ${input.to}${input.comment ? ` — ${input.comment}` : ""}`
      );
      await createNotification(db, {
        tenantId: tid,
        title: `عرض ${header.quotationNumber}: ${input.to}`,
        body: `انتقل العرض إلى حالة ${input.to}`,
        link: "/quotations",
        type: "quotation_status",
      });
      return { id: input.id, from: header.status, to: input.to };
    }),

  // ── Approval decision ──────────────────────────────────────────────────
  decideApproval: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_APPROVE))
    .input(
      z.object({
        approvalId: z.number().int(),
        approve: z.boolean(),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [appr] = await db
        .select()
        .from(quotationApprovals)
        .where(
          and(
            eq(quotationApprovals.id, input.approvalId),
            eq(quotationApprovals.tenantId, tid)
          )
        )
        .limit(1);
      if (!appr)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "طلب الاعتماد غير موجود",
        });
      if (appr.status !== "pending")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم البت في هذا الاعتماد مسبقاً",
        });
      const [header] = await db
        .select()
        .from(quotations)
        .where(
          and(eq(quotations.id, appr.quotationId), eq(quotations.tenantId, tid))
        )
        .limit(1);
      if (
        header?.createdById === ctx.user.id &&
        !SOD_EXEMPT_ROLES.includes(ctx.user.role ?? "")
      )
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "الفصل بين المهام: منشئ العرض لا يعتمد عمله",
        });

      await db
        .update(quotationApprovals)
        .set({
          status: input.approve ? "approved" : "rejected",
          approverId: ctx.user.id,
          approverName: ctx.user.name ?? null,
          comment: input.comment ?? null,
          decidedAt: new Date(),
        })
        .where(eq(quotationApprovals.id, input.approvalId));

      if (!input.approve) {
        await db
          .update(quotations)
          .set({
            status: "rejected",
            decidedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(quotations.id, appr.quotationId),
              eq(quotations.tenantId, tid)
            )
          );
      } else {
        const remaining = await db
          .select()
          .from(quotationApprovals)
          .where(
            and(
              eq(quotationApprovals.quotationId, appr.quotationId),
              eq(quotationApprovals.status, "pending")
            )
          );
        if (remaining.length === 0) {
          await db
            .update(quotations)
            .set({
              status: "approved",
              approvedById: ctx.user.id,
              approvedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(quotations.id, appr.quotationId),
                eq(quotations.tenantId, tid)
              )
            );
        }
      }
      await logActivity(
        db,
        tid,
        ctx.user,
        input.approve ? "اعتماد عرض" : "رفض اعتماد عرض",
        appr.quotationId,
        input.comment ?? ""
      );
      return { ok: true };
    }),

  // ── Negotiation round ──────────────────────────────────────────────────
  negotiate: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(
      z.object({
        id: z.number().int(),
        side: z.enum(["us", "counterparty"]),
        message: z.string().min(1).max(4000),
        proposedTotal: z
          .number()
          .min(0)
          .max(1000000000000)
          .nullable()
          .optional(),
        proposedChanges: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [header] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)))
        .limit(1);
      if (!header)
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      if (
        !["sent", "negotiating", "rejected", "expired"].includes(header.status)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التفاوض متاح بعد الإرسال فقط",
        });
      const existing = await db
        .select({ round: quotationNegotiations.round })
        .from(quotationNegotiations)
        .where(eq(quotationNegotiations.quotationId, input.id))
        .orderBy(desc(quotationNegotiations.round))
        .limit(1);
      const round = (existing[0]?.round ?? 0) + 1;
      const [row] = await db
        .insert(quotationNegotiations)
        .values({
          tenantId: tid,
          quotationId: input.id,
          round,
          side: input.side as never,
          message: input.message,
          proposedTotal:
            input.proposedTotal != null ? String(input.proposedTotal) : null,
          proposedChanges: input.proposedChanges ?? {},
          createdById: ctx.user.id,
        })
        .returning();
      if (header.status !== "negotiating")
        await db
          .update(quotations)
          .set({ status: "negotiating", updatedAt: new Date() })
          .where(
            and(eq(quotations.id, input.id), eq(quotations.tenantId, tid))
          );
      // Proactive alert: stalled negotiation (5+ rounds)
      if (round >= 5) {
        await db
          .insert(quotationAlerts)
          .values({
            tenantId: tid,
            quotationId: input.id,
            alertType: "negotiation_stall",
            severity: "warning",
            message: `التفاوض وصل للجولة ${round} دون حسم — خطر إرهاق الصفقة`,
            evidence: { rounds: round },
          })
          .catch(() => undefined);
      }
      await logActivity(
        db,
        tid,
        ctx.user,
        "جولة تفاوض",
        input.id,
        `الجولة ${round} (${input.side})`
      );
      return row;
    }),

  // ── Alternatives / Terms / Parties / Attachments / Links ───────────────
  addAlternative: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(
      z.object({
        quotationId: z.number().int(),
        label: z.string().min(1).max(255),
        items: z.array(z.record(z.string(), z.unknown())).min(1).max(200),
        notes: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const lines: QuotationDocInput["lines"] = input.items.map(
        (r: Record<string, unknown>) => ({
          kind: "other",
          quantity: Number(r.quantity ?? 1) || 1,
          unitPrice: Number(r.unitPrice ?? 0) || 0,
          costPrice: Number(r.costPrice ?? 0) || 0,
          discountPct: Number(r.discountPct ?? 0) || 0,
          taxPct: Number(r.taxPct ?? 0) || 0,
        })
      );
      const c = computeDocument({ lines });
      const [row] = await db
        .insert(quotationAlternatives)
        .values({
          tenantId: tid,
          quotationId: input.quotationId,
          label: input.label,
          items: input.items,
          subtotal: String(c.subtotal),
          discountTotal: String(c.discountTotal),
          taxTotal: String(c.taxTotal),
          grandTotal: String(c.grandTotal),
          notes: input.notes ?? null,
        })
        .returning();
      // Auto-rank all alternatives of this quotation by total (cheapest first) + score
      const all = await db
        .select()
        .from(quotationAlternatives)
        .where(eq(quotationAlternatives.quotationId, input.quotationId));
      const ranked = rankOptions(
        all.map((a: any) => ({
          id: String(a.id),
          label: a.label,
          score: Math.max(
            0,
            100 -
              (Number(a.grandTotal) / Math.max(1, Number(row.grandTotal))) * 10
          ),
        }))
      );
      const best = ranked[0];
      for (const a of all)
        await db
          .update(quotationAlternatives)
          .set({ isRecommended: String(a.id) === best.id })
          .where(eq(quotationAlternatives.id, a.id));
      await logActivity(
        db,
        tid,
        ctx.user,
        "إضافة بديل عرض",
        input.quotationId,
        input.label
      );
      return row;
    }),

  addTerm: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(termSchema.extend({ quotationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [row] = await db
        .insert(quotationTerms)
        .values({
          tenantId: tid,
          quotationId: input.quotationId,
          category: input.category,
          title: input.title,
          body: input.body,
        })
        .returning();
      return row;
    }),

  addParty: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(partySchema.extend({ quotationId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [row] = await db
        .insert(quotationParties)
        .values({
          tenantId: tid,
          quotationId: input.quotationId,
          role: input.role as never,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          name: input.name,
          commissionPct: String(input.commissionPct ?? 0),
          commissionAmount: String(input.commissionAmount ?? 0),
          notes: input.notes ?? null,
        })
        .returning();
      return row;
    }),

  addAttachment: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(
      z.object({
        quotationId: z.number().int(),
        fileName: z.string().min(1).max(255),
        fileUrl: z.string().min(1).max(2000),
        fileType: z.string().max(100).nullable().optional(),
        fileSize: z.number().int().min(0).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [row] = await db
        .insert(quotationAttachments)
        .values({
          tenantId: tid,
          quotationId: input.quotationId,
          fileName: input.fileName,
          fileUrl: input.fileUrl,
          fileType: input.fileType ?? null,
          fileSize: input.fileSize ?? null,
          uploadedById: ctx.user.id,
        })
        .returning();
      return row;
    }),

  addLink: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_EDIT))
    .input(
      z.object({
        quotationId: z.number().int(),
        linkType: z.enum([
          "crm_customer",
          "crm_supplier",
          "inventory_product",
          "procurement",
          "sales_order",
          "sales_invoice",
          "purchase_order",
          "purchase_invoice",
          "project",
          "service",
          "production_order",
          "accounting_entry",
        ]),
        entityType: z.string().min(1).max(50),
        entityId: z.number().int(),
        notes: z.string().max(1000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [row] = await db
        .insert(quotationLinks)
        .values({
          tenantId: tid,
          quotationId: input.quotationId,
          linkType: input.linkType as never,
          entityType: input.entityType,
          entityId: input.entityId,
          notes: input.notes ?? null,
          createdById: ctx.user.id,
        })
        .returning();
      return row;
    }),

  // ── Intelligence: analyze ──────────────────────────────────────────────
  analyze: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_ANALYZE))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [header] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)))
        .limit(1);
      if (!header)
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      const [items, alternatives, terms, negotiations] = await Promise.all([
        db
          .select()
          .from(quotationItems)
          .where(eq(quotationItems.quotationId, input.id)),
        db
          .select()
          .from(quotationAlternatives)
          .where(eq(quotationAlternatives.quotationId, input.id)),
        db
          .select()
          .from(quotationTerms)
          .where(eq(quotationTerms.quotationId, input.id)),
        db
          .select()
          .from(quotationNegotiations)
          .where(eq(quotationNegotiations.quotationId, input.id)),
      ]);

      // History: same tenant + direction, decided outcomes, exclude self
      const histRows = await db
        .select()
        .from(quotations)
        .where(
          and(
            eq(quotations.tenantId, tid),
            eq(quotations.direction, header.direction),
            sql`${quotations.status} IN ('accepted','converted','rejected','closed')`
          )
        )
        .orderBy(desc(quotations.updatedAt))
        .limit(50);
      const history: HistoryPoint[] = histRows
        .filter((h: any) => h.id !== header.id)
        .map((h: any) => ({
          id: h.id,
          total: Number(h.grandTotal),
          marginPct: Number(h.marginPct),
          won: ["accepted", "converted"].includes(h.status)
            ? true
            : h.status === "rejected"
              ? false
              : undefined,
        }));

      const benchmarks = benchmarkHistory(history);
      const grandTotal = Number(header.grandTotal);
      const marginPct = Number(header.marginPct);
      const itemsHash = hashItems(
        items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
      );
      const gross = items.reduce(
        (s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice),
        0
      );
      const discountPctTotal =
        gross > 0 ? ((gross - Number(header.subtotal)) / gross) * 100 : 0;

      const anomalies = detectAnomalies(
        { grandTotal, marginPct, itemsHash, discountPctTotal },
        history
      );
      const validityDaysLeft = header.validityDate
        ? Math.ceil(
            (new Date(header.validityDate).getTime() - Date.now()) / 86_400_000
          )
        : null;

      const score = scoreQuotation({
        grandTotal,
        marginPct,
        benchmarkAvg: benchmarks?.avgTotal ?? null,
        hasDeliveryTerms:
          terms.some((t: any) => t.category === "delivery") ||
          Object.keys((header.deliveryTerms ?? {}) as object).length > 0,
        hasPaymentTerms:
          terms.some((t: any) => t.category === "payment") ||
          Object.keys((header.paymentTerms ?? {}) as object).length > 0,
        hasWarrantyOrPenalty: terms.some((t: any) =>
          ["warranty", "penalty"].includes(t.category)
        ),
        alternativesCount: alternatives.length,
        negotiationRounds: negotiations.length,
        validityDaysLeft,
      });

      const ranking = rankOptions([
        {
          id: `q-${header.id}`,
          label: `العرض الحالي (إصدار ${header.version})`,
          score: score.total,
          reasons: score.reasons.slice(0, 3),
        },
        ...alternatives.map((a: any) => ({
          id: `alt-${a.id}`,
          label: a.label,
          score: Math.round(
            Math.max(
              0,
              Math.min(
                100,
                score.total +
                  ((grandTotal - Number(a.grandTotal)) /
                    Math.max(1, grandTotal)) *
                    50
              )
            )
          ),
          reasons: [`إجمالي البديل ${a.grandTotal}`],
        })),
      ]);

      const forecast = forecastWin({
        grandTotal,
        marginPct,
        benchmarkAvg: benchmarks?.avgTotal ?? null,
        scoreTotal: score.total,
        negotiationRounds: negotiations.length,
        validityDaysLeft,
        historyWinRate: benchmarks?.winRate ?? null,
      });

      const docInput: QuotationDocInput = {
        lines: items.map((i: any) => ({
          kind: i.kind as string,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          costPrice: Number(i.costPrice),
          discountPct: Number(i.discountPct),
          taxPct: Number(i.taxPct),
        })),
        currencyRate: Number(header.currencyRate),
      };
      const recommendations = recommendActions({
        doc: docInput,
        score,
        benchmarks,
        anomalies,
        forecast,
      });
      const scenarios = whatIfScenarios(docInput);

      const inputHash = createHash("sha256")
        .update(
          JSON.stringify({
            v: header.version,
            items: itemsHash,
            total: grandTotal,
          })
        )
        .digest("hex");

      const [analysis] = await db
        .insert(quotationAnalyses)
        .values({
          tenantId: tid,
          quotationId: input.id,
          versionNo: header.version ?? 1,
          inputHash,
          scores: score as unknown as Record<string, unknown>,
          ranking: ranking as unknown as Record<string, unknown>,
          benchmarks: (benchmarks ?? {}) as unknown as Record<string, unknown>,
          anomalies: anomalies as unknown as Record<string, unknown>,
          forecast: forecast as unknown as Record<string, unknown>,
          recommendations: recommendations as unknown as Record<
            string,
            unknown
          >,
          whatIf: scenarios as unknown as Record<string, unknown>,
          generatedBy: "engine",
        })
        .returning();

      // Proactive alerts from critical anomalies + expiry + margin risk
      const alertRows: Array<{
        alertType: string;
        severity: string;
        message: string;
        evidence: Record<string, unknown>;
      }> = [];
      for (const a of anomalies.filter(a => a.severity === "critical"))
        alertRows.push({
          alertType: "anomaly",
          severity: "critical",
          message: a.message,
          evidence: a.evidence,
        });
      if (
        validityDaysLeft != null &&
        validityDaysLeft >= 0 &&
        validityDaysLeft < 7
      )
        alertRows.push({
          alertType: "expiry",
          severity: "warning",
          message: `صلاحية العرض ${header.quotationNumber} تنتهي خلال ${validityDaysLeft} أيام`,
          evidence: { validityDaysLeft },
        });
      if (marginPct < 5)
        alertRows.push({
          alertType: "margin_risk",
          severity: marginPct < 0 ? "critical" : "warning",
          message: `هامش العرض ${marginPct}% يحتاج مراجعة`,
          evidence: { marginPct },
        });
      for (const al of alertRows) {
        await db
          .insert(quotationAlerts)
          .values({
            tenantId: tid,
            quotationId: input.id,
            alertType: al.alertType,
            severity: al.severity,
            message: al.message,
            evidence: al.evidence,
          })
          .catch(() => undefined);
      }

      await logActivity(
        db,
        tid,
        ctx.user,
        "تحليل ذكي لعرض",
        input.id,
        `score=${score.total} fairValue=${benchmarks?.fairValue ?? "—"} winProb=${forecast.winProbability}% anomalies=${anomalies.length}`
      );
      return {
        analysis,
        score,
        ranking,
        benchmarks,
        anomalies,
        forecast,
        recommendations,
        scenarios,
      };
    }),

  // ── Convert (sale → order, purchase → procurements) ────────────────────
  convert: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_CONVERT))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const [header] = await db
        .select()
        .from(quotations)
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)))
        .limit(1);
      if (!header)
        throw new TRPCError({ code: "NOT_FOUND", message: "العرض غير موجود" });
      if (header.status !== "accepted")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "التحويل متاح للعروض المقبولة فقط",
        });
      if (header.convertedRefId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم تحويل هذا العرض مسبقاً",
        });
      const items = await db
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationId, input.id));

      if (header.direction === "sale") {
        const [{ c }] = await db
          .select({ c: sql`count(*)::int` })
          .from(orders)
          .where(eq(orders.tenantId, tid));
        const orderNumber = `SO-${new Date().getFullYear()}-${String(Number(c ?? 0) + 1).padStart(5, "0")}`;
        const [order] = await db
          .insert(orders)
          .values({
            tenantId: tid,
            globalCode: genGlobalCode({
              tenantId: tid,
              branchId: header.branchId,
              userId: ctx.user.id,
            }),
            orderNumber,
            customerId: header.customerId ?? null,
            status: "pending",
            total: String(header.grandTotal),
            deliveryAddress:
              typeof (header.deliveryTerms as Record<string, unknown> | null)
                ?.address === "string"
                ? ((header.deliveryTerms as Record<string, unknown>)
                    .address as string)
                : null,
            userId: ctx.user.id,
          })
          .returning();
        for (const i of items) {
          const qty = Math.max(1, Math.round(Number(i.quantity)));
          if (!i.refId) {
            throw new Error(`المنتج غير محدد للبند «${i.name}»`);
          }
          await db.insert(orderItems).values({
            orderId: order.id,
            productId: i.refId,
            productName: i.name,
            quantity: qty,
            unitPrice: String(
              Math.round((Number(i.lineTotal) / qty) * 100) / 100
            ),
            total: String(i.lineTotal),
          });
        }
        await db.insert(quotationLinks).values({
          tenantId: tid,
          quotationId: input.id,
          linkType: "sales_order",
          entityType: "order",
          entityId: order.id,
          notes: `تحويل العرض ${header.quotationNumber} إلى أمر بيع ${orderNumber}`,
          createdById: ctx.user.id,
        });
        await db
          .update(quotations)
          .set({
            status: "converted",
            convertedRefType: "sales_order",
            convertedRefId: order.id,
            updatedAt: new Date(),
          })
          .where(
            and(eq(quotations.id, input.id), eq(quotations.tenantId, tid))
          );
        await logActivity(
          db,
          tid,
          ctx.user,
          "تحويل عرض لأمر بيع",
          input.id,
          orderNumber
        );
        return { refType: "sales_order", refId: order.id, orderNumber };
      }

      // purchase → one procurement per line
      const [{ c }] = await db
        .select({ c: sql`count(*)::int` })
        .from(procurements)
        .where(eq(procurements.tenantId, tid));
      let seq = Number(c ?? 0);
      let firstId = 0;
      for (const i of items) {
        seq += 1;
        const reqNo = `REQ-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
        const [pr] = await db
          .insert(procurements)
          .values({
            tenantId: tid,
            requisitionNumber: reqNo,
            requestedById: ctx.user.id,
            itemName: i.name,
            description: i.description ?? null,
            quantity: String(i.quantity),
            unit: i.unit,
            estimatedCost: String(i.lineTotal),
            currency: header.currency,
            supplierId: header.supplierId ?? null,
            status: "approved",
          })
          .returning();
        if (!firstId) firstId = pr.id;
        await db.insert(quotationLinks).values({
          tenantId: tid,
          quotationId: input.id,
          linkType: "procurement",
          entityType: "procurement",
          entityId: pr.id,
          notes: `تحويل بند العرض ${header.quotationNumber} إلى طلب توريد ${reqNo}`,
          createdById: ctx.user.id,
        });
      }
      await db
        .update(quotations)
        .set({
          status: "converted",
          convertedRefType: "procurement",
          convertedRefId: firstId,
          updatedAt: new Date(),
        })
        .where(and(eq(quotations.id, input.id), eq(quotations.tenantId, tid)));
      await logActivity(
        db,
        tid,
        ctx.user,
        "تحويل عرض شراء لتوريد",
        input.id,
        `${items.length} بنود`
      );
      return { refType: "procurement", refId: firstId, count: items.length };
    }),

  // ── Dashboard ──────────────────────────────────────────────────────────
  dashboard: tenantProcedure
    .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
    .query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const tid = requireTenantId(ctx);
      const byStatus = await db
        .select({
          status: quotations.status,
          count: sql<number>`count(*)::int`,
          value: sql<string>`coalesce(sum(${quotations.grandTotal}),0)`,
        })
        .from(quotations)
        .where(eq(quotations.tenantId, tid))
        .groupBy(quotations.status);
      const openValue = byStatus
        .filter((r: any) => OPEN_STATUSES.includes(r.status))
        .reduce((s: number, r: any) => s + Number(r.value), 0);
      const decided = await db
        .select({ status: quotations.status, c: sql<number>`count(*)::int` })
        .from(quotations)
        .where(
          and(
            eq(quotations.tenantId, tid),
            sql`${quotations.status} IN ('accepted','converted','rejected')`
          )
        )
        .groupBy(quotations.status);
      const won = decided
        .filter((d: any) => ["accepted", "converted"].includes(d.status))
        .reduce((s: number, d: any) => s + d.c, 0);
      const lost = decided
        .filter((d: any) => d.status === "rejected")
        .reduce((s: number, d: any) => s + d.c, 0);
      const expiring = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(quotations)
        .where(
          and(
            eq(quotations.tenantId, tid),
            sql`${quotations.status} IN ('sent','negotiating')`,
            lte(quotations.validityDate, new Date(Date.now() + 7 * 86_400_000)),
            gte(quotations.validityDate, new Date())
          )
        );
      const unreadAlerts = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(quotationAlerts)
        .where(
          and(
            eq(quotationAlerts.tenantId, tid),
            eq(quotationAlerts.isRead, false)
          )
        );
      return {
        byStatus,
        openValue: Math.round(openValue * 100) / 100,
        winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
        expiringSoon: expiring[0]?.c ?? 0,
        unreadAlerts: unreadAlerts[0]?.c ?? 0,
      };
    }),

  // ── Alerts ─────────────────────────────────────────────────────────────
  alerts: router({
    list: tenantProcedure
      .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
      .input(
        z
          .object({
            unreadOnly: z.boolean().default(false),
            limit: z.number().int().min(1).max(100).default(30),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const tid = requireTenantId(ctx);
        const args = (input ?? {}) as { unreadOnly?: boolean; limit?: number };
        const conds = [eq(quotationAlerts.tenantId, tid)];
        if (args.unreadOnly ?? false)
          conds.push(eq(quotationAlerts.isRead, false));
        return db
          .select()
          .from(quotationAlerts)
          .where(and(...conds))
          .orderBy(desc(quotationAlerts.createdAt))
          .limit(args.limit ?? 30);
      }),
    markRead: tenantProcedure
      .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const tid = requireTenantId(ctx);
        await db
          .update(quotationAlerts)
          .set({ isRead: true })
          .where(
            and(
              eq(quotationAlerts.id, input.id),
              eq(quotationAlerts.tenantId, tid)
            )
          );
        return { ok: true };
      }),
  }),

  // ── Reference lookups for the composer (CRM linkage) ───────────────────
  refs: router({
    customers: tenantProcedure
      .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
      .input(z.object({ search: z.string().max(120).default("") }).optional())
      .query(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const tid = requireTenantId(ctx);
        const search = input?.search ?? "";
        const conds = [eq(customers.tenantId, tid)];
        if (search) conds.push(ilike(customers.name, `%${search}%`));
        return db
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(and(...conds))
          .orderBy(asc(customers.name))
          .limit(30);
      }),
    suppliers: tenantProcedure
      .use(requirePermissions(PERMISSIONS.QUOTATION_VIEW))
      .input(z.object({ search: z.string().max(120).default("") }).optional())
      .query(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const tid = requireTenantId(ctx);
        const search = input?.search ?? "";
        const conds = [eq(suppliers.tenantId, tid)];
        if (search) conds.push(ilike(suppliers.name, `%${search}%`));
        return db
          .select({ id: suppliers.id, name: suppliers.name })
          .from(suppliers)
          .where(and(...conds))
          .orderBy(asc(suppliers.name))
          .limit(30);
      }),
  }),
});

export type QuotationRouter = typeof quotationRouter;
