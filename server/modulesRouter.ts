import { z } from "zod";
import {
  eq,
  and,
  desc,
  sql,
  SQL,
  gte,
  lte,
  or,
  ilike,
  asc,
  inArray,
  count,
  isNull,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { PERMISSIONS } from "../shared/permissions";
import { getDb } from "./db";
import { reportsRouter } from "./reportsRouter";
import { posIntelligenceRouter } from "./posIntelligenceRouter";
import type { PosSession } from "../drizzle/schema";
import type { SessionReport } from "./posSessionReport";
import { recordAuditEvent } from "./_core/audit";

// Local DB handle type (same inference pattern as webStore.ts)
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// Build the X/Z session report: aggregates invoices + payments + cash events
// + refunds for a single pos_session row. Mirrored type in posSessionReport.ts.
async function buildPosSessionReport(
  db: Db,
  session: PosSession
): Promise<SessionReport> {
  const zero = (): SessionReport => ({
    invoiceCount: 0,
    totalSales: 0,
    totalRefunds: 0,
    totalDiscounts: 0,
    totalTax: 0,
    totalPaid: 0,
    cashIn: 0,
    cashOut: 0,
    expectedCash: parseFloat(session.openingFloat || "0"),
    paymentBreakdown: {
      cash: 0,
      card: 0,
      transfer: 0,
      credit: 0,
      online: 0,
      cash_yer: 0,
      cash_sar: 0,
      hawala: 0,
      shabab: 0,
      mobile_money: 0,
      bank_transfer: 0,
    },
    openings: parseFloat(session.openingFloat || "0"),
    byUser: {},
  });

  if (!session.tenantId) return zero();

  const orderRows = await db
    .select({
      invoiceId: posOrders.salesInvoiceId,
      createdAt: posOrders.createdAt,
      createdById: posOrders.createdById,
    })
    .from(posOrders)
    .where(
      and(
        eq(posOrders.tenantId, session.tenantId),
        eq(posOrders.sessionId, session.id)
      )
    );

  const invoiceIds = orderRows
    .map(r => r.invoiceId)
    .filter((id): id is number => id != null);

  const payRows =
    invoiceIds.length > 0
      ? await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.source, "sales"),
              inArray(payments.invoiceId, invoiceIds)
            )
          )
      : [];

  const returnRows = await db
    .select()
    .from(posReturns)
    .where(
      and(
        eq(posReturns.tenantId, session.tenantId),
        eq(posReturns.sessionId, session.id)
      )
    );

  const eventRows = await db
    .select()
    .from(posCashEvents)
    .where(
      and(
        eq(posCashEvents.tenantId, session.tenantId),
        eq(posCashEvents.sessionId, session.id)
      )
    );

  const report = zero();
  report.paymentBreakdown = {
    cash: 0,
    card: 0,
    transfer: 0,
    credit: 0,
    online: 0,
    cash_yer: 0,
    cash_sar: 0,
    hawala: 0,
    shabab: 0,
    mobile_money: 0,
    bank_transfer: 0,
  };
  const cashMethods = new Set(["cash", "cash_yer", "cash_sar"]);
  const byUser: Record<string, number> = {};

  for (const o of orderRows) {
    report.invoiceCount += 1;
    if (o.createdById) {
      byUser[o.createdById] = (byUser[o.createdById] || 0) + 1;
    }
  }
  report.byUser = byUser;

  for (const p of payRows) {
    const amt = parseFloat(p.amount || "0");
    report.totalPaid += amt;
    report.totalSales += amt;
    const m = p.paymentMethod as string;
    if (cashMethods.has(m)) report.expectedCash += amt;
    if (m in report.paymentBreakdown) {
      report.paymentBreakdown[m as keyof typeof report.paymentBreakdown] += amt;
    } else {
      report.paymentBreakdown.cash += amt;
    }
  }

  // Discounts & tax from the underlying invoices (avoid double-count on splits).
  if (invoiceIds.length > 0) {
    const invRows = await db
      .select({
        discount: salesInvoices.discount,
        taxAmount: salesInvoices.taxAmount,
      })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.tenantId, session.tenantId),
          inArray(salesInvoices.id, invoiceIds),
          sql`${salesInvoices.status} <> 'cancelled'`
        )
      );
    for (const inv of invRows) {
      report.totalDiscounts += parseFloat(inv.discount || "0");
      report.totalTax += parseFloat(inv.taxAmount || "0");
    }
  }

  const refundCashMethods = new Set(["cash", "cash_yer", "cash_sar"]);
  for (const r of returnRows) {
    const amt = parseFloat(r.refundAmount || "0");
    report.totalRefunds += amt;
    if (refundCashMethods.has(r.refundMethod as string)) {
      report.expectedCash -= amt;
    }
    const m = r.refundMethod as string;
    if (m in report.paymentBreakdown) {
      report.paymentBreakdown[m as keyof typeof report.paymentBreakdown] -= amt;
    } else {
      report.paymentBreakdown.cash -= amt;
    }
  }

  report.cashIn = 0;
  report.cashOut = 0;
  for (const e of eventRows) {
    const amt = parseFloat(e.amount || "0");
    if (e.type === "in") {
      report.cashIn += amt;
      report.expectedCash += amt;
    } else {
      report.cashOut += amt;
      report.expectedCash -= amt;
    }
  }

  return report;
}
import {
  currencies,
  offers,
  salesReps,
  branches,
  userBranchPermissions,
  units,
  categories,
  productUnits,
  customFieldDefs,
  customFieldValues,
  documents,
  posSessions,
  users,
  roles,
  permissions,
  messages,
  activityLogs,
  notifications,
  salesInvoices,
  salesInvoiceItems,
  purchaseInvoices,
  products,
  accounts,
  transactions,
  inventoryMovements,
  warehouses,
  openingBalances,
  budgets,
  settings,
  customers,
  suppliers,
  purchaseInvoiceItems,
  posOrders,
  posCashEvents,
  posHeldCarts,
  posReturns,
  orders,
  orderItems,
  payments,
  scheduledJournalEntries,
  recurringExpenses,
} from "../drizzle/schema";

export const modulesRouter = router({
  // ─── Notifications ──────────────────────────────────────────────
  // Live engine: `automation.ts` and `erpRouter.ts` write real rows into the
  // `notifications` table via `createNotification`. Previously this router was a
  // no-op stub (always returning 0 / []), so the UI bell surfaced nothing. It
  // now reads the table and maps the persisted shape to the DTO the client
  // (AppSidebar.tsx) expects: { id, title, body, isRead, link, type, createdAt }.
  // `userId IS NULL` rows are broadcast notifications addressed to every member
  // of the tenant and are therefore visible/counted for any authenticated user.
  notifications: router({
    unreadCount: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return 0;
      const db = await getDb();
      if (!db) return 0;
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, ctx.tenantId),
            eq(notifications.status, "unread"),
            or(
              isNull(notifications.userId),
              eq(notifications.userId, ctx.user.id)
            )
          )
        );
      return res?.count ?? 0;
    }),
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        if (!ctx.tenantId || !ctx.user) return [];
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.tenantId, ctx.tenantId),
              or(
                isNull(notifications.userId),
                eq(notifications.userId, ctx.user.id)
              )
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);

        return rows.map(n => {
          const meta = n.metadata as { link?: string } | null;
          return {
            id: n.id,
            title: n.subject ?? "",
            body: n.body ?? "",
            isRead: n.status !== "unread",
            link: meta?.link ?? null,
            type: n.type,
            createdAt: n.createdAt,
          };
        });
      }),
    markRead: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.tenantId || !ctx.user) return { success: false };
        const db = await getDb();
        if (!db) return { success: false };
        await db
          .update(notifications)
          .set({ status: "read", readAt: new Date() })
          .where(
            and(
              eq(notifications.id, input.id),
              eq(notifications.tenantId, ctx.tenantId),
              or(
                isNull(notifications.userId),
                eq(notifications.userId, ctx.user.id)
              )
            )
          );
        return { success: true };
      }),
    markAllRead: tenantProcedure.mutation(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return { success: false };
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(notifications)
        .set({ status: "read", readAt: new Date() })
        .where(
          and(
            eq(notifications.tenantId, ctx.tenantId),
            eq(notifications.status, "unread"),
            or(
              isNull(notifications.userId),
              eq(notifications.userId, ctx.user.id)
            )
          )
        );
      return { success: true };
    }),
  }),

  // ─── Accounts ────────────────────────────────────────────────────
  accounts: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, ctx.tenantId));
    }),
  }),

  // ─── Journal ─────────────────────────────────────────────────────
  journal: router({
    list: tenantProcedure
      .input(
        z
          .object({
            sourceModule: z.string().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const rows = await db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, ctx.tenantId))
          .orderBy(desc(transactions.createdAt))
          .limit(50);
        return { items: rows, total: rows.length };
      }),
    entries: tenantProcedure
      .input(
        z
          .object({
            journalEntryId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, ctx.tenantId))
          .limit(50);
      }),
  }),

  // ─── Messages ───────────────────────────────────────────────────
  messages: router({
    unreadCount: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return 0;
      const db = await getDb();
      if (!db) return 0;
      const [res] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.tenantId, ctx.tenantId),
            eq(messages.toUserId, String(ctx.user.id)),
            eq(messages.isRead, false)
          )
        );
      return res?.count ?? 0;
    }),
    listInbox: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId || !ctx.user) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.tenantId, ctx.tenantId),
            eq(messages.toUserId, String(ctx.user.id))
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(100);
    }),
    listWith: tenantProcedure
      .input(z.object({ userId: z.union([z.number(), z.string()]) }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId || !ctx.user) return [];
        const db = await getDb();
        if (!db) return [];
        const otherId = String(input.userId);
        const myId = String(ctx.user.id);
        return db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.tenantId, ctx.tenantId),
              sql`(${messages.fromUserId} = ${myId} AND ${messages.toUserId} = ${otherId}) OR (${messages.fromUserId} = ${otherId} AND ${messages.toUserId} = ${myId})`
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(100);
      }),
    markRead: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) return { success: false };
        await db
          .update(messages)
          .set({ isRead: true })
          .where(
            and(eq(messages.id, input.id), eq(messages.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    send: tenantProcedure
      .input(
        z.object({
          toUserId: z.union([z.number(), z.string()]),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "غير متاح" });
        }
        const [row] = await db
          .insert(messages)
          .values({
            tenantId: ctx.tenantId,
            fromUserId: String(ctx.user.id),
            fromName: ctx.user.name || "مستخدم",
            toUserId: String(input.toUserId),
            body: input.message,
            isRead: false,
          })
          .returning();
        return { success: true, id: row.id };
      }),
  }),

  // ─── RBAC ────────────────────────────────────────────────────────
  rbac: router({
    listUsers: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      // PAGINATION: hard cap 500 — directory screens page client-side.
      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          username: users.username,
        })
        .from(users)
        .where(eq(users.tenantId, ctx.tenantId))
        .limit(500);
    }),
    listRoles: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      // PAGINATION: hard cap 200 (RBAC master data, tiny per tenant).
      return db
        .select()
        .from(roles)
        .where(eq(roles.tenantId, ctx.tenantId))
        .limit(200);
    }),
    listPermissions: tenantProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      // PAGINATION: global seed table — hard cap 500.
      return db.select().from(permissions).limit(500);
    }),
    createRole: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().min(1),
          permissions: z.any().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(roles)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code: input.code,
            permissions: input.permissions ?? [],
          })
          .returning();
        return row;
      }),
    assignRole: tenantProcedure
      .input(
        z.object({
          userId: z.number(),
          roleId: z.number().optional(),
          role: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");

        // Get user before update for audit
        const [userBefore] = await db
          .select({ role: users.role })
          .from(users)
          .where(
            and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId))
          )
          .limit(1);

        const roleValue = input.role || "user";
        await db
          .update(users)
          .set({ role: roleValue as any })
          .where(
            and(eq(users.id, input.userId), eq(users.tenantId, ctx.tenantId))
          );

        // Audit log
        await recordAuditEvent(ctx, {
          action: "ROLE_ASSIGNED",
          resourceType: "user",
          resourceId: String(input.userId),
          before: { role: userBefore?.role ?? "unknown" },
          after: { role: roleValue },
          metadata: { route: "modules.assignRole" },
        });

        return { success: true };
      }),
  }),

  // ─── Custom Fields ───────────────────────────────────────────────
  customFields: router({
    listDefs: tenantProcedure
      .input(z.object({ entityType: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const conditions = [eq(customFieldDefs.tenantId, ctx.tenantId)];
        if (input?.entityType) {
          conditions.push(eq(customFieldDefs.entityType, input.entityType));
        }
        return db
          .select()
          .from(customFieldDefs)
          .where(and(...conditions));
      }),
    getValues: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return {};
        const db = await getDb();
        if (!db) return {};
        const rows = await db
          .select()
          .from(customFieldValues)
          .where(
            and(
              eq(customFieldValues.tenantId, ctx.tenantId),
              eq(customFieldValues.entityType, input.entityType),
              eq(customFieldValues.entityId, input.entityId)
            )
          );
        const map: Record<string, string | null> = {};
        for (const r of rows) {
          map[r.fieldKey] = r.value;
        }
        return map;
      }),
    createDef: tenantProcedure
      .input(
        z.object({
          entityType: z.string().min(1),
          key: z.string().min(1),
          label: z.string().min(1),
          type: z.string().default("text"),
          required: z.boolean().default(false),
          options: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(customFieldDefs)
          .values({
            tenantId: ctx.tenantId,
            entityType: input.entityType,
            key: input.key,
            label: input.label,
            type: input.type,
            required: input.required,
            options: input.options ?? null,
          })
          .returning();
        return row;
      }),
    deleteDef: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(customFieldDefs)
          .where(
            and(
              eq(customFieldDefs.id, input.id),
              eq(customFieldDefs.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
    saveValues: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
          values: z.record(z.string(), z.any()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        for (const [key, val] of Object.entries(input.values)) {
          const strVal = val === null || val === undefined ? null : String(val);
          const existing = await db
            .select()
            .from(customFieldValues)
            .where(
              and(
                eq(customFieldValues.tenantId, ctx.tenantId),
                eq(customFieldValues.entityType, input.entityType),
                eq(customFieldValues.entityId, input.entityId),
                eq(customFieldValues.fieldKey, key)
              )
            );
          if (existing.length > 0) {
            await db
              .update(customFieldValues)
              .set({ value: strVal, updatedAt: new Date() })
              .where(
                and(
                  eq(customFieldValues.tenantId, ctx.tenantId),
                  eq(customFieldValues.entityType, input.entityType),
                  eq(customFieldValues.entityId, input.entityId),
                  eq(customFieldValues.fieldKey, key)
                )
              );
          } else {
            await db.insert(customFieldValues).values({
              tenantId: ctx.tenantId,
              entityType: input.entityType,
              entityId: input.entityId,
              fieldKey: key,
              value: strVal,
            });
          }
        }
        return { success: true };
      }),
  }),

  // ─── Documents ───────────────────────────────────────────────────
  documents: router({
    listByEntity: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.tenantId, ctx.tenantId),
              eq(documents.entityType, input.entityType),
              eq(documents.entityId, input.entityId)
            )
          );
      }),
    recent: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return { byType: [], items: [] };
      const db = await getDb();
      if (!db) return { byType: [], items: [] };
      const items = await db
        .select()
        .from(documents)
        .where(eq(documents.tenantId, ctx.tenantId))
        .orderBy(desc(documents.createdAt))
        .limit(20);

      const typeMap = new Map<string, number>();
      for (const item of items) {
        const t = item.entityType || "غير محدد";
        typeMap.set(t, (typeMap.get(t) || 0) + 1);
      }
      const byType = Array.from(typeMap.entries()).map(
        ([entityType, count]) => ({
          entityType,
          count,
        })
      );

      return { byType, items };
    }),
    link: tenantProcedure
      .input(
        z.object({
          entityType: z.string(),
          entityId: z.number(),
          documentId: z.number().optional(),
          name: z.string().optional(),
          url: z.string().optional(),
          title: z.string().optional(),
          // Persisted into the existing `documents.type` / `documents.notes`
          // columns (UI collects both).
          docType: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const title = input.title || input.name || "مستند";
        const [row] = await db
          .insert(documents)
          .values({
            tenantId: ctx.tenantId,
            title,
            entityType: input.entityType,
            entityId: input.entityId,
            fileUrl: input.url ?? null,
            type: input.docType ?? null,
            notes: input.notes ?? null,
          })
          .returning();
        return row;
      }),
    unlink: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(documents)
          .where(
            and(
              eq(documents.id, input.id),
              eq(documents.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── Currencies ──────────────────────────────────────────────────
  currencies: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(currencies)
        .where(eq(currencies.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          {
            id: 1,
            code: "YER",
            name: "ريال يمني",
            symbol: "ر.ي",
            rate: "1",
            isDefault: true,
            isActive: true,
          },
          {
            id: 2,
            code: "SAR",
            name: "ريال سعودي",
            symbol: "ر.س",
            rate: "140",
            isDefault: false,
            isActive: true,
          },
          {
            id: 3,
            code: "USD",
            name: "دولار أمريكي",
            symbol: "$",
            rate: "530",
            isDefault: false,
            isActive: true,
          },
        ];
      }
      return rows;
    }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1).max(10),
          name: z.string().min(1),
          symbol: z.string().min(1),
          rate: z.string().default("1"),
          isDefault: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(currencies)
          .values({
            tenantId: ctx.tenantId,
            code: input.code.toUpperCase(),
            name: input.name,
            symbol: input.symbol,
            rate: input.rate,
            isDefault: input.isDefault,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          symbol: z.string().optional(),
          rate: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, ...data } = input;
        await db
          .update(currencies)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(eq(currencies.id, id), eq(currencies.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    setDefault: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .update(currencies)
          .set({ isDefault: false })
          .where(eq(currencies.tenantId, ctx.tenantId));
        await db
          .update(currencies)
          .set({ isDefault: true })
          .where(
            and(
              eq(currencies.id, input.id),
              eq(currencies.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── Sales Reps ──────────────────────────────────────────────────
  salesReps: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));
    }),
    commissionReport: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const reps = await db
        .select()
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));
      if (reps.length === 0) return [];
      const repIds = reps.map(r => String(r.id));
      const rows = await db
        .select({
          salesRepId: salesInvoices.salesRepId,
          total: salesInvoices.total,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            inArray(salesInvoices.salesRepId, repIds),
            sql`${salesInvoices.status} <> 'cancelled'`
          )
        );
      const agg = new Map<string, { total: number; count: number }>();
      for (const r of rows) {
        const key = r.salesRepId ?? "";
        if (!key) continue;
        const cur = agg.get(key) || { total: 0, count: 0 };
        cur.total += parseFloat(r.total || "0");
        cur.count += 1;
        agg.set(key, cur);
      }
      return reps.map(r => {
        const a = agg.get(String(r.id)) || { total: 0, count: 0 };
        const value = parseFloat(r.commissionValue || "0");
        const commissionEarned =
          r.commissionType === "percent"
            ? (a.total * value) / 100
            : value * a.count;
        const threshold = r.bonusThreshold
          ? parseFloat(r.bonusThreshold)
          : null;
        const bonusEarned =
          threshold != null && a.total >= threshold
            ? parseFloat(r.bonusAmount || "0")
            : 0;
        return {
          id: r.id,
          name: r.name,
          phone: r.phone,
          totalSales: a.total,
          invoicesCount: a.count,
          commissionRate: value,
          commissionType: r.commissionType,
          commissionEarned,
          bonusEarned,
        };
      });
    }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          phone: z.string().optional(),
          commissionType: z.string().default("percent"),
          commissionValue: z.string().default("0"),
          bonusThreshold: z.string().optional(),
          bonusAmount: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(salesReps)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            phone: input.phone ?? null,
            commissionType: input.commissionType,
            commissionValue: input.commissionValue,
            bonusThreshold: input.bonusThreshold ?? null,
            bonusAmount: input.bonusAmount ?? null,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          commissionType: z.string().optional(),
          commissionValue: z.string().optional(),
          bonusThreshold: z.string().optional(),
          bonusAmount: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, ...data } = input;
        await db
          .update(salesReps)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(eq(salesReps.id, id), eq(salesReps.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(salesReps)
          .where(
            and(
              eq(salesReps.id, input.id),
              eq(salesReps.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── Master Data ─────────────────────────────────────────────────
  masterData: router({
    listUnits: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(units)
        .where(eq(units.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          { id: 1, name: "قطعة", code: "PCS", symbol: "قطعة" },
          { id: 2, name: "كرتون", code: "BOX", symbol: "كرتون" },
          { id: 3, name: "كيلوغرام", code: "KG", symbol: "كجم" },
          { id: 4, name: "ساعة عمل", code: "HR", symbol: "ساعة" },
        ];
      }
      return rows;
    }),
    listCategories: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(categories)
        .where(eq(categories.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          {
            id: 1,
            name: "قرطاسية ومستلزمات مكتبية",
            description: "أدوات ومواد مكتبية",
          },
          {
            id: 2,
            name: "خدمات هندسية ومعمارية",
            description: "استشارات وتصاميم",
          },
          { id: 3, name: "حلول تقنية وبرمجية", description: "تطوير وأنظمة" },
          {
            id: 4,
            name: "أجهزة ومعدات إلكترونية",
            description: "حواسيب وملحقاتها",
          },
        ];
      }
      return rows;
    }),
    createUnit: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().optional(),
          symbol: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const code = input.code || `U-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(units)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code,
            symbol: input.symbol ?? input.name,
          })
          .returning();
        return row;
      }),
    createCategory: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const code = `CAT-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(categories)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code,
            nameAr: input.name,
          })
          .returning();
        return row;
      }),
  }),

  // ─── Branches ────────────────────────────────────────────────────
  branches: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(branches)
        .where(eq(branches.tenantId, ctx.tenantId));
      if (rows.length === 0) {
        return [
          {
            id: 1,
            name: "الفرع الرئيسي - صنعاء",
            code: "MAIN",
            address: "صنعاء - شارع الزبيري",
            phone: "+967 777 000 000",
            isMain: true,
            isActive: true,
          },
        ];
      }
      return rows;
    }),
    listUserPermissions: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(userBranchPermissions)
        .where(eq(userBranchPermissions.tenantId, ctx.tenantId));
    }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          isMain: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const code =
          input.code || `BR-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(branches)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            code,
            city: input.address ?? "صنعاء",
            isMain: input.isMain,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          code: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, address, phone, ...data } = input;
        const setObj: any = { ...data, updatedAt: new Date() };
        if (address) setObj.city = address;
        await db
          .update(branches)
          .set(setObj)
          .where(and(eq(branches.id, id), eq(branches.tenantId, ctx.tenantId)));
        return { success: true };
      }),
    assignUserPermission: tenantProcedure
      .input(
        z.object({
          userId: z.number(),
          branchId: z.number(),
          canAccess: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db.insert(userBranchPermissions).values({
          tenantId: ctx.tenantId,
          userId: input.userId,
          branchId: input.branchId,
          canView: input.canAccess,
          canInsert: input.canAccess,
        });
        return { success: true };
      }),
  }),

  // ─── Offers ──────────────────────────────────────────────────────
  offers: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select().from(offers).where(eq(offers.tenantId, ctx.tenantId));
    }),
    applicable: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          qty: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const rows = await db
          .select()
          .from(offers)
          .where(
            and(
              eq(offers.tenantId, ctx.tenantId),
              eq(offers.productId, input.productId),
              eq(offers.isActive, true)
            )
          )
          .limit(1);
        return rows[0] || null;
      }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          kind: z.string().default("financial"),
          discountPercent: z.string().default("0"),
          minQty: z.string().optional(),
          productId: z.number().optional(),
          categoryId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(offers)
          .values({
            tenantId: ctx.tenantId,
            name: input.name,
            kind: input.kind,
            discountPercent: input.discountPercent,
            minQty: input.minQty ?? null,
            productId: input.productId ?? null,
            categoryId: input.categoryId ?? null,
            startDate: input.startDate ? new Date(input.startDate) : null,
            endDate: input.endDate ? new Date(input.endDate) : null,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          kind: z.string().optional(),
          discountPercent: z.string().optional(),
          minQty: z.string().optional(),
          productId: z.number().optional(),
          categoryId: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const { id, ...data } = input;
        await db
          .update(offers)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(offers.id, id), eq(offers.tenantId, ctx.tenantId)));
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(offers)
          .where(
            and(eq(offers.id, input.id), eq(offers.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
  }),

  // ─── Product Units ───────────────────────────────────────────────
  productUnits: router({
    list: tenantProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(productUnits)
          .where(
            and(
              eq(productUnits.tenantId, ctx.tenantId),
              eq(productUnits.productId, input.productId)
            )
          );
      }),
    add: tenantProcedure
      .input(
        z.object({
          productId: z.number(),
          unitId: z.number(),
          conversionFactor: z.string().default("1"),
          isBase: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .insert(productUnits)
          .values({
            tenantId: ctx.tenantId,
            productId: input.productId,
            unitId: input.unitId,
            conversionFactor: input.conversionFactor,
            isBase: input.isBase,
          })
          .returning();
        return row;
      }),
    remove: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .delete(productUnits)
          .where(
            and(
              eq(productUnits.id, input.id),
              eq(productUnits.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── POS Sessions ────────────────────────────────────────────────
  pos: router({
    listSessions: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .query(async ({ ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(posSessions)
          .where(eq(posSessions.tenantId, ctx.tenantId))
          .orderBy(desc(posSessions.openedAt))
          .limit(20);
      }),
    openSession: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(
        z.object({
          openingFloat: z.string().default("0"),
          branchId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "تعذر فتح الوردية",
          });
        }
        const code = `POS-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(posSessions)
          .values({
            tenantId: ctx.tenantId,
            code,
            openedById: ctx.user.id,
            openingFloat: input.openingFloat,
            branchId: input.branchId ?? null,
            status: "open",
          })
          .returning();
        return row;
      }),
    getSession: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select()
          .from(posSessions)
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!row) return null;
        return { ...row, report: await buildPosSessionReport(db, row) };
      }),
    // ─── Cash in / out within the open shift ─────────────────────────
    cashIn: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(
        z.object({
          sessionId: z.number(),
          amount: z.string().refine(v => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0;
          }, "المبلغ يجب أن يكون موجباً"),
          reason: z.string().min(2),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user)
          throw new Error("تعذر إجراء الإيداع النقدي");
        const [row] = await db
          .insert(posCashEvents)
          .values({
            tenantId: ctx.tenantId,
            sessionId: input.sessionId,
            type: "in",
            amount: input.amount,
            reason: input.reason,
            notes: input.notes ?? null,
            createdById: ctx.user.id,
          })
          .returning();
        return row;
      }),
    cashOut: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(
        z.object({
          sessionId: z.number(),
          amount: z.string().refine(v => {
            const n = parseFloat(v);
            return !isNaN(n) && n > 0;
          }, "المبلغ يجب أن يكون موجباً"),
          reason: z.string().min(2),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user)
          throw new Error("تعذر إجراء السحب النقدي");
        const [row] = await db
          .insert(posCashEvents)
          .values({
            tenantId: ctx.tenantId,
            sessionId: input.sessionId,
            type: "out",
            amount: input.amount,
            reason: input.reason,
            notes: input.notes ?? null,
            createdById: ctx.user.id,
          })
          .returning();
        return row;
      }),
    cashEvents: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(posCashEvents)
          .where(
            and(
              eq(posCashEvents.tenantId, ctx.tenantId),
              eq(posCashEvents.sessionId, input.sessionId)
            )
          )
          .orderBy(asc(posCashEvents.createdAt));
      }),
    // ─── X/Z Reports ─────────────────────────────────────────────────
    sessionReport: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select()
          .from(posSessions)
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!row) return null;
        return { session: row, report: await buildPosSessionReport(db, row) };
      }),
    closeSession: tenantProcedure
      .use(
        requirePermissions({
          any: [PERMISSIONS.POS_VIEW, PERMISSIONS.POS_EDIT_SALE],
        })
      )
      .input(
        z.object({
          id: z.number(),
          countedCash: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        const [row] = await db
          .select()
          .from(posSessions)
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!row) throw new Error("الوردية غير موجودة");
        if (row.status !== "open")
          throw new Error("الوردية مغلقة بالفعل أو غير صالحة للإقفال");

        const report = await buildPosSessionReport(db, row);
        const expectedCash = report.expectedCash;
        const countedCash = input.countedCash
          ? parseFloat(input.countedCash)
          : null;
        const variance =
          countedCash !== null ? countedCash - expectedCash : null;

        await db
          .update(posSessions)
          .set({
            status: "closed",
            closedAt: new Date(),
            closingFloat: expectedCash.toString(),
            expectedCash: expectedCash.toString(),
            countedCash: countedCash?.toString() ?? null,
            variance: variance?.toString() ?? null,
            notes: `إقفال الوردية ${row.code}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId)
            )
          );
        await db.insert(activityLogs).values({
          userId: ctx.user.id,
          action: `إقفال وردية نقطة البيع ${row.code}`,
          details: `النقدية المتوقعة: ${report.expectedCash} — الفرق: ${variance ?? "غير مدخل"}`,
        });
        return { success: true, report };
      }),
    zReport: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_VIEW))
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [row] = await db
          .select()
          .from(posSessions)
          .where(
            and(
              eq(posSessions.id, input.id),
              eq(posSessions.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!row) return null;
        const report = await buildPosSessionReport(db, row);
        return {
          session: row,
          report: {
            ...report,
            countedCash: row.countedCash,
            variance: row.variance,
          },
        };
      }),
    // ─── Holds (تعليق واستعادة الفواتير) — real persisted carts ────
    createHold: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_HOLD_RECALL))
      .input(
        z.object({
          snapshot: z.string().min(1),
          total: z.string().default("0"),
          itemCount: z.number().int().min(0).default(0),
          customerId: z.number().optional(),
          sessionId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user)
          throw new Error("تعذر تعليق العملية");
        const code = `HD-${Date.now().toString(36).toUpperCase()}`;
        const [row] = await db
          .insert(posHeldCarts)
          .values({
            tenantId: ctx.tenantId,
            code,
            heldById: ctx.user.id,
            branchId: null,
            sessionId: input.sessionId ?? null,
            customerId: input.customerId ?? null,
            snapshot: input.snapshot,
            total: input.total,
            itemCount: input.itemCount,
            status: "active",
            notes: input.notes ?? null,
          })
          .returning();
        return row;
      }),
    listHolds: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_HOLD_RECALL))
      .input(
        z.object({ includeCompleted: z.boolean().default(false) }).optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(posHeldCarts)
          .where(
            and(
              eq(posHeldCarts.tenantId, ctx.tenantId),
              input?.includeCompleted
                ? undefined
                : eq(posHeldCarts.status, "active")
            )
          )
          .orderBy(desc(posHeldCarts.createdAt))
          .limit(50);
      }),
    getHold: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_HOLD_RECALL))
      .input(
        z.object({ id: z.number().optional(), code: z.string().optional() })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const conds: any[] = [eq(posHeldCarts.tenantId, ctx.tenantId)];
        if (input.id) conds.push(eq(posHeldCarts.id, input.id));
        if (input.code) conds.push(eq(posHeldCarts.code, input.code));
        const [row] = await db
          .select()
          .from(posHeldCarts)
          .where(and(...conds))
          .limit(1);
        return row || null;
      }),
    resumeHold: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_HOLD_RECALL))
      .input(
        z.object({
          id: z.number().optional(),
          code: z.string().optional(),
          snapshot: z.string().optional(),
          total: z.string().optional(),
          itemCount: z.number().int().min(0).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId || !ctx.user)
          throw new Error("تعذر استعادة العملية المعلقة");
        const conds: any[] = [
          eq(posHeldCarts.tenantId, ctx.tenantId),
          eq(posHeldCarts.status, "active"),
        ];
        if (input.id) conds.push(eq(posHeldCarts.id, input.id));
        if (input.code) conds.push(eq(posHeldCarts.code, input.code));
        const [row] = await db
          .select()
          .from(posHeldCarts)
          .where(and(...conds))
          .limit(1);
        if (!row) throw new Error("العملية المعلقة غير موجودة أو مكتملة");
        const patch: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (input.snapshot !== undefined) patch.snapshot = input.snapshot;
        if (input.total !== undefined) patch.total = input.total;
        if (input.itemCount !== undefined) patch.itemCount = input.itemCount;
        await db
          .update(posHeldCarts)
          .set(patch)
          .where(
            and(
              eq(posHeldCarts.id, row.id),
              eq(posHeldCarts.tenantId, ctx.tenantId)
            )
          );
        return { success: true, hold: row };
      }),
    deleteHold: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_HOLD_RECALL))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId)
          throw new Error("تعذر الاتصال بقاعدة البيانات");
        await db
          .update(posHeldCarts)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(posHeldCarts.id, input.id),
              eq(posHeldCarts.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
    printInvoice: tenantProcedure
      .use(requirePermissions(PERMISSIONS.POS_PRINT_RECEIPT))
      .input(z.object({ invoiceNumber: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [invoice] = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.tenantId, ctx.tenantId),
              eq(salesInvoices.invoiceNumber, input.invoiceNumber)
            )
          )
          .limit(1);
        if (!invoice) return null;
        const items = await db
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, invoice.id));
        return { invoice, items };
      }),
  }),

  operations: router({
    summary: tenantProcedure.query(async ({ ctx }) => {
      const defaultResult = {
        unread: 0,
        lowStock: 0,
        pendingOrders: 0,
        pendingRequisitions: 0,
        dueScheduled: 0,
        overdue: 0,
        activeOffers: 0,
        topRep: null as {
          name: string;
          commission: number;
          salesTotal: number;
        } | null,
      };
      if (!ctx.tenantId) return defaultResult;
      const db = await getDb();
      if (!db) return defaultResult;

      const [lowStockRows] = await db
        .select({ n: count() })
        .from(products)
        .where(
          and(
            eq(products.tenantId, ctx.tenantId),
            sql`${products.currentStock} <= ${products.minStock}`
          )
        );
      const [unreadRows] = await db
        .select({ n: count() })
        .from(messages)
        .where(
          and(eq(messages.tenantId, ctx.tenantId), eq(messages.isRead, false))
        );
      const [pendingOrders] = await db
        .select({ n: count() })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            inArray(salesInvoices.status, ["draft", "confirmed"])
          )
        );
      const [pendingReqs] = await db
        .select({ n: count() })
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, ctx.tenantId),
            inArray(purchaseInvoices.status, ["draft", "confirmed"])
          )
        );
      const [activeOffers] = await db
        .select({ n: count() })
        .from(offers)
        .where(
          and(eq(offers.tenantId, ctx.tenantId), eq(offers.isActive, true))
        );

      const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const overdueInvoices = await db
        .select({ id: salesInvoices.id })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            lte(salesInvoices.dueDate, new Date()),
            sql`${salesInvoices.status} NOT IN ('paid', 'cancelled')`
          )
        );
      const dueScheduledInvoices = await db
        .select({ id: salesInvoices.id })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            gte(salesInvoices.dueDate, new Date()),
            lte(salesInvoices.dueDate, in7),
            sql`${salesInvoices.status} NOT IN ('paid', 'cancelled')`
          )
        );

      const reps = await db
        .select()
        .from(salesReps)
        .where(eq(salesReps.tenantId, ctx.tenantId));
      let topRep = null;
      if (reps.length > 0) {
        const repIds = reps.map(r => String(r.id));
        const rrows = await db
          .select({
            salesRepId: salesInvoices.salesRepId,
            total: salesInvoices.total,
          })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.tenantId, ctx.tenantId),
              inArray(salesInvoices.salesRepId, repIds),
              sql`${salesInvoices.status} <> 'cancelled'`
            )
          );
        const agg = new Map<string, number>();
        for (const rr of rrows) {
          const k = rr.salesRepId ?? "";
          if (!k) continue;
          agg.set(k, (agg.get(k) || 0) + parseFloat(rr.total || "0"));
        }
        let best: {
          name: string;
          commission: number;
          salesTotal: number;
        } | null = null;
        for (const r of reps) {
          const total = agg.get(String(r.id)) || 0;
          const val = parseFloat(r.commissionValue || "0");
          const commission =
            r.commissionType === "percent" ? (total * val) / 100 : val;
          if (!best || commission > best.commission) {
            best = { name: r.name, commission, salesTotal: total };
          }
        }
        topRep = best;
      }

      return {
        unread: Number(unreadRows?.n ?? 0),
        lowStock: Number(lowStockRows?.n ?? 0),
        pendingOrders: Number(pendingOrders?.n ?? 0),
        pendingRequisitions: Number(pendingReqs?.n ?? 0),
        dueScheduled: dueScheduledInvoices.length,
        overdue: overdueInvoices.length,
        activeOffers: Number(activeOffers?.n ?? 0),
        topRep,
      };
    }),
  }),

  // ─── Analytics ───────────────────────────────────────────────────
  analytics: router({
    summary: tenantProcedure.query(async ({ ctx }) => {
      const emptyResult = {
        totalSales: 0,
        totalPurchases: 0,
        netProfit: 0,
        salesGrowth: 0,
        invoicesCount: 0,
        customersCount: 0,
        months: [] as Array<{
          month: string;
          revenue: number;
          expense: number;
        }>,
        totals: { revenue: 0, expense: 0, profit: 0 },
        note: null as string | null,
        topProducts: [] as Array<{ id: number; name: string; total: number }>,
        salesByBranch: [] as Array<{ branch: string; total: number }>,
      };
      if (!ctx.tenantId) return emptyResult;
      const db = await getDb();
      if (!db) return emptyResult;

      const monthKey = (x: unknown): string => {
        if (!x) return "";
        const d = x instanceof Date ? x : new Date(x as string);
        if (isNaN(d.getTime())) return "";
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };

      const sales = await db
        .select({
          total: salesInvoices.total,
          invoiceDate: salesInvoices.invoiceDate,
          status: salesInvoices.status,
          branchId: salesInvoices.branchId,
          customerId: salesInvoices.customerId,
        })
        .from(salesInvoices)
        .where(eq(salesInvoices.tenantId, ctx.tenantId));
      const activeSales = sales.filter(s => s.status !== "cancelled");
      const totalSales = activeSales.reduce(
        (s, i) => s + parseFloat(i.total || "0"),
        0
      );

      const purchases = await db
        .select({
          total: purchaseInvoices.total,
          invoiceDate: purchaseInvoices.invoiceDate,
          status: purchaseInvoices.status,
        })
        .from(purchaseInvoices)
        .where(eq(purchaseInvoices.tenantId, ctx.tenantId));
      const activePurchases = purchases.filter(p => p.status !== "cancelled");
      const totalPurchases = activePurchases.reduce(
        (s, i) => s + parseFloat(i.total || "0"),
        0
      );

      const now = new Date();
      const monthsKeys: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsKeys.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
      }
      const months = monthsKeys.map(k => ({
        month: k,
        revenue: 0,
        expense: 0,
      }));
      const monthsIndex = new Map(monthsKeys.map((k, i) => [k, i]));
      for (const s of activeSales) {
        const i = monthsIndex.get(monthKey(s.invoiceDate));
        if (i != null) months[i].revenue += parseFloat(s.total || "0");
      }
      for (const p of activePurchases) {
        const i = monthsIndex.get(monthKey(p.invoiceDate));
        if (i != null) months[i].expense += parseFloat(p.total || "0");
      }

      const curMonth = months.length ? months[months.length - 1].revenue : 0;
      const prevMonth =
        months.length > 1 ? months[months.length - 2].revenue : 0;
      const salesGrowth =
        prevMonth > 0 ? ((curMonth - prevMonth) / prevMonth) * 100 : 0;

      const customerRows = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.tenantId, ctx.tenantId));
      const customersCount = customerRows.length;

      const items = await db
        .select({
          productId: salesInvoiceItems.productId,
          productName: salesInvoiceItems.productName,
          total: salesInvoiceItems.total,
        })
        .from(salesInvoiceItems)
        .innerJoin(
          salesInvoices,
          eq(salesInvoiceItems.invoiceId, salesInvoices.id)
        )
        .where(
          and(
            eq(salesInvoices.tenantId, ctx.tenantId),
            sql`${salesInvoices.status} <> 'cancelled'`
          )
        );
      const topMap = new Map<number, { name: string; total: number }>();
      for (const it of items) {
        const cur = topMap.get(it.productId) || {
          name: it.productName,
          total: 0,
        };
        cur.total += parseFloat(it.total || "0");
        topMap.set(it.productId, cur);
      }
      const topProducts = [...topMap.entries()]
        .map(([id, v]) => ({
          id,
          name: v.name,
          total: Math.round(v.total * 100) / 100,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const branchRows = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.tenantId, ctx.tenantId));
      const branchName = new Map(branchRows.map(b => [b.id, b.name]));
      const branchAgg = new Map<number, number>();
      for (const s of activeSales) {
        if (s.branchId == null) continue;
        branchAgg.set(
          s.branchId,
          (branchAgg.get(s.branchId) || 0) + parseFloat(s.total || "0")
        );
      }
      const salesByBranch = [...branchAgg.entries()].map(([id, total]) => ({
        branch: branchName.get(id) || `#${id}`,
        total: Math.round(total * 100) / 100,
      }));

      return {
        totalSales,
        totalPurchases,
        netProfit: totalSales - totalPurchases,
        salesGrowth: Math.round(salesGrowth * 100) / 100,
        invoicesCount: activeSales.length,
        customersCount,
        months,
        totals: {
          revenue: totalSales,
          expense: totalPurchases,
          profit: totalSales - totalPurchases,
        },
        note: null,
        topProducts,
        salesByBranch,
      };
    }),
  }),

  // ─── Audit ───────────────────────────────────────────────────────
  audit: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return [];
        const db = await getDb();
        if (!db) return [];
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        return db
          .select()
          .from(activityLogs)
          .where(eq(activityLogs.tenantId, ctx.tenantId!))
          .orderBy(desc(activityLogs.createdAt))
          .limit(limit)
          .offset(offset);
      }),
  }),

  // ─── Products ──────────────────────────────────────────────────────
  products: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
            category: z.string().optional(),
            type: z.enum(["goods", "service"]).optional(),
            isActive: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(products.tenantId, ctx.tenantId)];
        if (input?.search)
          where.push(ilike(products.name, `%${input.search}%`));
        if (input?.category) where.push(eq(products.category, input.category));
        if (input?.type) where.push(eq(products.type, input.type));
        if (input?.isActive !== undefined)
          where.push(eq(products.isActive, input.isActive));
        where.push(isNull(products.deletedAt));
        const items = await db
          .select()
          .from(products)
          .where(and(...where))
          .orderBy(desc(products.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(products, and(...where));
        return { items, total };
      }),
    get: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [item] = await db
          .select()
          .from(products)
          .where(
            and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId))
          )
          .limit(1);
        return item || null;
      }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          nameAr: z.string().optional(),
          type: z.enum(["goods", "service"]).default("goods"),
          category: z.string().optional(),
          unit: z.string().default("قطعة"),
          purchasePrice: z.string().default("0"),
          salePrice: z.string().default("0"),
          wholesalePrice: z.string().default("0"),
          minStock: z.number().default(0),
          currentStock: z.number().default(0),
          barcode: z.string().optional(),
          supplierId: z.number().optional(),
          unitId: z.number().optional(),
          categoryId: z.number().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const [row] = await db
          .insert(products)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          nameAr: z.string().optional(),
          type: z.enum(["goods", "service"]).optional(),
          category: z.string().optional(),
          unit: z.string().optional(),
          purchasePrice: z.string().optional(),
          salePrice: z.string().optional(),
          wholesalePrice: z.string().optional(),
          minStock: z.number().optional(),
          currentStock: z.number().optional(),
          barcode: z.string().optional(),
          supplierId: z.number().nullish(),
          unitId: z.number().nullish(),
          categoryId: z.number().nullish(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const { id, ...data } = input;
        await db
          .update(products)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(products.id, id), eq(products.tenantId, ctx.tenantId)));
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        await db
          .update(products)
          .set({ deletedAt: new Date() })
          .where(
            and(eq(products.id, input.id), eq(products.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
  }),

  // ─── Customers ─────────────────────────────────────────────────────
  customers: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(customers.tenantId, ctx.tenantId)];
        if (input?.search)
          where.push(
            or(
              ilike(customers.name, `%${input.search}%`),
              ilike(customers.code, `%${input.search}%`),
              ilike(customers.phone, `%${input.search}%`),
              ilike(customers.email, `%${input.search}%`)
            ) as any
          );
        const items = await db
          .select()
          .from(customers)
          .where(and(...where))
          .orderBy(desc(customers.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(customers, and(...where));
        return { items, total };
      }),
    get: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [item] = await db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.id, input.id),
              eq(customers.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        return item || null;
      }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          taxNumber: z.string().optional(),
          creditLimit: z.string().default("0"),
          paymentTerms: z.number().default(30),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const [row] = await db
          .insert(customers)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          taxNumber: z.string().optional(),
          creditLimit: z.string().optional(),
          paymentTerms: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const { id, ...data } = input;
        await db
          .update(customers)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(eq(customers.id, id), eq(customers.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        await db
          .delete(customers)
          .where(
            and(
              eq(customers.id, input.id),
              eq(customers.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── Suppliers ─────────────────────────────────────────────────────
  suppliers: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(suppliers.tenantId, ctx.tenantId)];
        if (input?.search)
          where.push(
            or(
              ilike(suppliers.name, `%${input.search}%`),
              ilike(suppliers.code, `%${input.search}%`),
              ilike(suppliers.phone, `%${input.search}%`),
              ilike(suppliers.email, `%${input.search}%`)
            ) as any
          );
        const items = await db
          .select()
          .from(suppliers)
          .where(and(...where))
          .orderBy(desc(suppliers.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(suppliers, and(...where));
        return { items, total };
      }),
    get: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [item] = await db
          .select()
          .from(suppliers)
          .where(
            and(
              eq(suppliers.id, input.id),
              eq(suppliers.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        return item || null;
      }),
    create: tenantProcedure
      .input(
        z.object({
          code: z.string().min(1),
          name: z.string().min(1),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          taxNumber: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const [row] = await db
          .insert(suppliers)
          .values({ ...input, tenantId: ctx.tenantId })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().optional(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          address: z.string().optional(),
          city: z.string().optional(),
          country: z.string().optional(),
          taxNumber: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const { id, ...data } = input;
        await db
          .update(suppliers)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(eq(suppliers.id, id), eq(suppliers.tenantId, ctx.tenantId))
          );
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        await db
          .delete(suppliers)
          .where(
            and(
              eq(suppliers.id, input.id),
              eq(suppliers.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── Sales Invoices ───────────────────────────────────────────────
  sales: router({
    listInvoices: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            status: z.string().optional(),
            customerId: z.number().optional(),
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(salesInvoices.tenantId, ctx.tenantId)];
        if (input?.status)
          where.push(eq(salesInvoices.status, input.status as any));
        if (input?.customerId)
          where.push(eq(salesInvoices.customerId, input.customerId));
        if (input?.fromDate)
          where.push(gte(salesInvoices.invoiceDate, new Date(input.fromDate)));
        if (input?.toDate)
          where.push(lte(salesInvoices.invoiceDate, new Date(input.toDate)));
        const items = await db
          .select()
          .from(salesInvoices)
          .where(and(...where))
          .orderBy(desc(salesInvoices.invoiceDate))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(salesInvoices, and(...where));
        return { items, total };
      }),
    getInvoice: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [invoice] = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.id),
              eq(salesInvoices.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!invoice) return null;
        const items = await db
          .select()
          .from(salesInvoiceItems)
          .where(eq(salesInvoiceItems.invoiceId, invoice.id));
        return { invoice, items };
      }),
  }),

  // ─── Purchase Invoices ────────────────────────────────────────────
  purchases: router({
    listInvoices: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            status: z.string().optional(),
            supplierId: z.number().optional(),
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(purchaseInvoices.tenantId, ctx.tenantId)];
        if (input?.status)
          where.push(eq(purchaseInvoices.status, input.status as any));
        if (input?.supplierId)
          where.push(eq(purchaseInvoices.supplierId, input.supplierId));
        if (input?.fromDate)
          where.push(
            gte(purchaseInvoices.invoiceDate, new Date(input.fromDate))
          );
        if (input?.toDate)
          where.push(lte(purchaseInvoices.invoiceDate, new Date(input.toDate)));
        const items = await db
          .select()
          .from(purchaseInvoices)
          .where(and(...where))
          .orderBy(desc(purchaseInvoices.invoiceDate))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(purchaseInvoices, and(...where));
        return { items, total };
      }),
    getInvoice: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [invoice] = await db
          .select()
          .from(purchaseInvoices)
          .where(
            and(
              eq(purchaseInvoices.id, input.id),
              eq(purchaseInvoices.tenantId, ctx.tenantId)
            )
          )
          .limit(1);
        if (!invoice) return null;
        const items = await db
          .select()
          .from(purchaseInvoiceItems)
          .where(eq(purchaseInvoiceItems.invoiceId, invoice.id));
        return { invoice, items };
      }),
  }),

  // ─── Orders ───────────────────────────────────────────────────────
  orders: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            status: z.string().optional(),
            customerId: z.number().optional(),
            fromDate: z.string().optional(),
            toDate: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(orders.tenantId, ctx.tenantId)];
        if (input?.status) where.push(eq(orders.status, input.status as any));
        if (input?.customerId)
          where.push(eq(orders.customerId, input.customerId));
        if (input?.fromDate)
          where.push(gte(orders.createdAt, new Date(input.fromDate)));
        if (input?.toDate)
          where.push(lte(orders.createdAt, new Date(input.toDate)));
        const items = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            customerId: orders.customerId,
            customerName: customers.name,
            status: orders.status,
            total: orders.total,
            orderDate: orders.createdAt,
            deliveryDate: orders.deliveryDate,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customerId, customers.id))
          .where(and(...where))
          .orderBy(desc(orders.createdAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(orders, and(...where));
        return { items, total };
      }),
    get: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return null;
        const db = await getDb();
        if (!db) return null;
        const [order] = await db
          .select()
          .from(orders)
          .where(
            and(eq(orders.id, input.id), eq(orders.tenantId, ctx.tenantId))
          )
          .limit(1);
        if (!order) return null;
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { order, items };
      }),
    create: tenantProcedure
      .input(
        z.object({
          customerId: z.number(),
          items: z.array(
            z.object({
              productId: z.number(),
              productName: z.string(),
              quantity: z.number(),
              unitPrice: z.string(),
            })
          ),
          deliveryDate: z.string().optional(),
          idempotencyKey: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        if (input.idempotencyKey) {
          const existing = await db
            .select()
            .from(orders)
            .where(eq(orders.idempotencyKey, input.idempotencyKey))
            .limit(1);
          if (existing.length > 0) {
            return { success: true, order: existing[0], idempotent: true };
          }
        }
        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const { deliveryDate, ...inputWithoutStatus } = input;
        const [order] = await db
          .insert(orders)
          .values({
            ...inputWithoutStatus,
            tenantId: ctx.tenantId,
            orderNumber,
            userId: ctx.user.id,
            status: "pending" as const,
            deliveryDate: deliveryDate
              ? new Date(deliveryDate as string)
              : null,
          })
          .returning();
        for (const item of input.items) {
          await db.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            productName: item.productName ?? "",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
          });
        }
        return { success: true, order };
      }),
  }),

  // ─── Store (E-commerce) ───────────────────────────────────────────
  store: router({
    catalog: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(20),
            offset: z.number().min(0).default(0),
            category: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [
          eq(products.tenantId, ctx.tenantId),
          eq(products.isActive, true),
          eq(products.type, "goods"),
        ];
        if (input?.category) where.push(eq(products.category, input.category));
        if (input?.search)
          where.push(ilike(products.name, `%${input.search}%`));
        const items = await db
          .select({
            id: products.id,
            code: products.code,
            name: products.name,
            nameAr: products.nameAr,
            salePrice: products.salePrice,
            wholesalePrice: products.wholesalePrice,
            currentStock: products.currentStock,
            unit: products.unit,
            category: products.category,
            imageUrl: products.attachmentUrl,
          })
          .from(products)
          .where(and(...where))
          .limit(input?.limit ?? 20)
          .offset(input?.offset ?? 0);
        const total = await db.$count(products, and(...where));
        return { items, total };
      }),
  }),

  // ─── Scheduled Journal Entries ────────────────────────────────────
  scheduled: router({
    list: tenantProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            isActive: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.tenantId) return { items: [], total: 0 };
        const db = await getDb();
        if (!db) return { items: [], total: 0 };
        const where = [eq(scheduledJournalEntries.tenantId, ctx.tenantId)];
        if (input?.isActive !== undefined)
          where.push(eq(scheduledJournalEntries.isActive, input.isActive));
        const items = await db
          .select()
          .from(scheduledJournalEntries)
          .where(and(...where))
          .orderBy(desc(scheduledJournalEntries.nextRunAt))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0);
        const total = await db.$count(scheduledJournalEntries, and(...where));
        return { items, total };
      }),
    create: tenantProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          branchId: z.number().optional(),
          accountId: z.number(),
          amount: z.string(),
          type: z.enum(["debit", "credit"]),
          narration: z.string(),
          frequency: z.enum([
            "daily",
            "weekly",
            "monthly",
            "quarterly",
            "yearly",
          ]),
          nextRunAt: z.string(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const [row] = await db
          .insert(scheduledJournalEntries)
          .values({
            ...input,
            tenantId: ctx.tenantId,
            nextRunAt: new Date(input.nextRunAt),
            isActive: input.isActive ?? true,
          })
          .returning();
        return row;
      }),
    update: tenantProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          branchId: z.number().optional(),
          accountId: z.number().optional(),
          amount: z.string().optional(),
          type: z.enum(["debit", "credit"]).optional(),
          narration: z.string().optional(),
          frequency: z
            .enum(["daily", "weekly", "monthly", "quarterly", "yearly"])
            .optional(),
          nextRunAt: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        const { id, ...data } = input;
        const setData: any = { ...data, updatedAt: new Date() };
        if (data.nextRunAt) setData.nextRunAt = new Date(data.nextRunAt);
        await db
          .update(scheduledJournalEntries)
          .set(setData)
          .where(
            and(
              eq(scheduledJournalEntries.id, id),
              eq(scheduledJournalEntries.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.tenantId) throw new Error("Database not available");
        await db
          .delete(scheduledJournalEntries)
          .where(
            and(
              eq(scheduledJournalEntries.id, input.id),
              eq(scheduledJournalEntries.tenantId, ctx.tenantId)
            )
          );
        return { success: true };
      }),
  }),

  // ─── Reports ─────────────────────────────────────────────────────
  posIntelligence: posIntelligenceRouter,
  reports: reportsRouter,
});
