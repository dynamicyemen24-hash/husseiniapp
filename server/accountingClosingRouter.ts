/**
 * server/accountingClosingRouter.ts — Financial & Inventory Closing System
 *
 * Complete implementation for:
 * - Opening Balances (الأرصدة الافتتاحية)
 * - Fiscal Period Management (إدارة الفترات المالية)
 * - Period Closing Mechanism (آلية إقفال الفترات)
 * - Accounting Reports (التقارير المحاسبية)
 * - Inventory Reports (التقارير المخزنية)
 */
import { z } from "zod";
import { eq, and, gte, lte, desc, lt, gt } from "drizzle-orm";
import {
  router,
  tenantProcedure,
  adminProcedure,
  requirePermissions,
} from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  accounts,
  openingBalances,
  transactions,
  fiscalPeriods,
  products,
  inventoryMovements,
  inventoryBatches,
  activityLogs,
  customers,
  suppliers,
  salesInvoices,
  purchaseInvoices,
} from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";
import { recordAuditEvent } from "./_core/audit";

type Db = any;

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function normalSide(type: string): "debit" | "credit" {
  return ["asset", "expense"].includes(type) ? "debit" : "credit";
}

// ─────────────────────────────────────────────────────────────────
// SECTION 1: OPENING BALANCES
// ─────────────────────────────────────────────────────────────────

export const openingBalancesRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tid = requireTenantId(ctx);

    const rows = await db
      .select({
        id: openingBalances.id,
        accountId: openingBalances.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        accountType: accounts.type,
        amount: openingBalances.amount,
        type: openingBalances.type,
        notes: openingBalances.notes,
        periodName: openingBalances.periodName,
        createdAt: openingBalances.createdAt,
      })
      .from(openingBalances)
      .innerJoin(accounts, eq(openingBalances.accountId, accounts.id))
      .where(eq(openingBalances.tenantId, tid))
      .orderBy(accounts.code);

    return rows;
  }),

  getByAccount: tenantProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tid = requireTenantId(ctx);

      const rows = await db
        .select()
        .from(openingBalances)
        .where(
          and(
            eq(openingBalances.tenantId, tid),
            eq(openingBalances.accountId, input.accountId)
          )
        )
        .orderBy(desc(openingBalances.createdAt))
        .limit(1);

      return rows[0] ?? null;
    }),

  upsert: adminProcedure
    .input(
      z.object({
        accountId: z.number(),
        amount: z.number(),
        type: z.enum(["debit", "credit"]),
        notes: z.string().optional(),
        periodName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tid = requireTenantId(ctx);

      const acct = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, input.accountId), eq(accounts.tenantId, tid))
        )
        .limit(1);

      if (!acct[0]) throw new Error("Account not found");

      const periodName = input.periodName || `${new Date().getFullYear()}`;

      const existing = await db
        .select()
        .from(openingBalances)
        .where(
          and(
            eq(openingBalances.tenantId, tid),
            eq(openingBalances.accountId, input.accountId),
            eq(openingBalances.periodName, periodName)
          )
        )
        .limit(1);

      let row;
      if (existing[0]) {
        [row] = await db
          .update(openingBalances)
          .set({
            amount: String(input.amount),
            type: input.type,
            notes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(openingBalances.id, existing[0].id))
          .returning();
      } else {
        [row] = await db
          .insert(openingBalances)
          .values({
            tenantId: tid,
            accountId: input.accountId,
            amount: String(input.amount),
            type: input.type,
            notes: input.notes || `Opening balance for ${acct[0].name}`,
            periodName,
          })
          .returning();
      }

      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `Opening balance: ${acct[0].name}`,
        details: `${input.type}: ${input.amount}`,
      });

      return row;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tid = requireTenantId(ctx);

      await db
        .delete(openingBalances)
        .where(
          and(
            eq(openingBalances.id, input.id),
            eq(openingBalances.tenantId, tid)
          )
        );

      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "Opening balance deleted",
        details: `ID: ${input.id}`,
      });

      return { success: true };
    }),

  bulkImport: adminProcedure
    .input(
      z.array(
        z.object({
          accountCode: z.string(),
          amount: z.number(),
          type: z.enum(["debit", "credit"]),
          notes: z.string().optional(),
          periodName: z.string().optional(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tid = requireTenantId(ctx);
      const results = { success: 0, failed: 0, errors: [] as string[] };
      const periodName = input[0]?.periodName || `${new Date().getFullYear()}`;

      for (const item of input) {
        try {
          const acct = await db
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.tenantId, tid),
                eq(accounts.code, item.accountCode)
              )
            )
            .limit(1);

          if (!acct[0]) {
            results.failed++;
            results.errors.push(`Account ${item.accountCode} not found`);
            continue;
          }

          const existing = await db
            .select()
            .from(openingBalances)
            .where(
              and(
                eq(openingBalances.tenantId, tid),
                eq(openingBalances.accountId, acct[0].id),
                eq(openingBalances.periodName, item.periodName || periodName)
              )
            )
            .limit(1);

          if (existing[0]) {
            await db
              .update(openingBalances)
              .set({
                amount: String(item.amount),
                type: item.type,
                updatedAt: new Date(),
              })
              .where(eq(openingBalances.id, existing[0].id));
          } else {
            await db.insert(openingBalances).values({
              tenantId: tid,
              accountId: acct[0].id,
              amount: String(item.amount),
              type: item.type,
              notes: item.notes,
              periodName: item.periodName || periodName,
            });
          }
          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Error in ${item.accountCode}: ${err}`);
        }
      }

      return results;
    }),
});

// ─────────────────────────────────────────────────────────────────
// SECTION 2: FISCAL PERIOD MANAGEMENT
// ─────────────────────────────────────────────────────────────────

export const fiscalPeriodClosingRouter = router({
  status: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { open: [], closed: [], total: 0 };
    const tid = requireTenantId(ctx);

    const allPeriods = await db
      .select()
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.tenantId, tid))
      .orderBy(desc(fiscalPeriods.startDate));

    return {
      open: allPeriods.filter((p: any) => p.status === "open"),
      closed: allPeriods.filter((p: any) => p.status === "closed"),
      total: allPeriods.length,
    };
  }),

  currentPeriod: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const tid = requireTenantId(ctx);

    const periods = await db
      .select()
      .from(fiscalPeriods)
      .where(
        and(eq(fiscalPeriods.tenantId, tid), eq(fiscalPeriods.status, "open"))
      )
      .orderBy(desc(fiscalPeriods.startDate))
      .limit(1);

    return periods[0] ?? null;
  }),

  validateDate: tenantProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { valid: false, period: null };
      const tid = requireTenantId(ctx);

      const date = new Date(input.date);

      const periods = await db
        .select()
        .from(fiscalPeriods)
        .where(
          and(
            eq(fiscalPeriods.tenantId, tid),
            eq(fiscalPeriods.status, "open"),
            lte(fiscalPeriods.startDate, date),
            gte(fiscalPeriods.endDate, date)
          )
        )
        .limit(1);

      if (periods[0]) return { valid: true, period: periods[0] };
      return { valid: false, period: null };
    }),

  closePeriod: adminProcedure
    .input(z.object({ periodId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tid = requireTenantId(ctx);

      const periods = await db
        .select()
        .from(fiscalPeriods)
        .where(
          and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.tenantId, tid)
          )
        )
        .limit(1);

      if (!periods[0]) throw new Error("Fiscal period not found");
      if (periods[0].status === "closed")
        throw new Error("Period already closed");

      await db
        .update(fiscalPeriods)
        .set({
          status: "closed",
          closedAt: new Date(),
          closedById: ctx.user.id,
          notes: input.notes,
        })
        .where(
          and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.tenantId, tid)
          )
        );

      await db.insert(activityLogs).values({
        tenantId: tid,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: `Period closed: ${periods[0].name}`,
        details: input.notes || "",
      });

      // Audit log
      await recordAuditEvent(ctx, {
        action: "FISCAL_PERIOD_CLOSED",
        resourceType: "fiscal_period",
        resourceId: String(input.periodId),
        before: {
          status: periods[0].status,
        },
        after: {
          status: "closed",
          closedAt: new Date().toISOString(),
          closedById: ctx.user.id,
          notes: input.notes,
        },
        metadata: { route: "accountingClosing.closePeriod" },
      });

      return { success: true, period: periods[0].name };
    }),

  reopenPeriod: adminProcedure
    .input(z.object({ periodId: z.number(), reason: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tid = requireTenantId(ctx);

      const periods = await db
        .select()
        .from(fiscalPeriods)
        .where(
          and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.tenantId, tid)
          )
        )
        .limit(1);

      if (!periods[0]) throw new Error("Fiscal period not found");

      await db
        .update(fiscalPeriods)
        .set({
          status: "reopened",
          reopenedAt: new Date(),
          reopenedById: ctx.user.id,
          reopenReason: input.reason,
        })
        .where(
          and(
            eq(fiscalPeriods.id, input.periodId),
            eq(fiscalPeriods.tenantId, tid)
          )
        );

      // Audit log
      await recordAuditEvent(ctx, {
        action: "FISCAL_PERIOD_REOPENED",
        resourceType: "fiscal_period",
        resourceId: String(input.periodId),
        before: {
          status: periods[0].status,
        },
        after: {
          status: "reopened",
          reopenedAt: new Date().toISOString(),
          reopenedById: ctx.user.id,
          reopenReason: input.reason,
        },
        metadata: { route: "accountingClosing.reopenPeriod" },
      });

      return { success: true, period: periods[0].name };
    }),
});

// ─────────────────────────────────────────────────────────────────
// SECTION 3: ACCOUNTING REPORTS
// ─────────────────────────────────────────────────────────────────

export const accountingReportsRouter = router({
  trialBalance: tenantProcedure
    .use(requirePermissions(PERMISSIONS.REPORTS_VIEW))
    .input(
      z
        .object({
          asOf: z.string().optional(),
          periodName: z.string().optional(),
          includeOpening: z.boolean().default(true),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: { debit: 0, credit: 0 } };
      const tid = requireTenantId(ctx);

      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const periodName = input?.periodName;

      const acctRows = await db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, tid))
        .orderBy(accounts.code);

      const ledger = new Map<
        number,
        { dr: number; cr: number; openingDr: number; openingCr: number }
      >();

      if (input?.includeOpening !== false) {
        const obConditions = periodName
          ? and(
              eq(openingBalances.tenantId, tid),
              eq(openingBalances.periodName, periodName)
            )
          : eq(openingBalances.tenantId, tid);
        const openingRows = await db
          .select()
          .from(openingBalances)
          .where(obConditions);

        for (const ob of openingRows) {
          const entry = ledger.get(ob.accountId) ?? {
            dr: 0,
            cr: 0,
            openingDr: 0,
            openingCr: 0,
          };
          if (ob.type === "debit") entry.openingDr = toNum(ob.amount);
          else entry.openingCr = toNum(ob.amount);
          ledger.set(ob.accountId, entry);
        }
      }

      const txConditions = asOf
        ? and(
            eq(transactions.tenantId, tid),
            eq(transactions.lifecycleStatus, "posted"),
            lte(transactions.transactionDate, asOf)
          )
        : and(
            eq(transactions.tenantId, tid),
            eq(transactions.lifecycleStatus, "posted")
          );
      const txRows = await db
        .select({
          accountId: transactions.accountId,
          type: transactions.type,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(txConditions);

      for (const tx of txRows) {
        const entry = ledger.get(tx.accountId) ?? {
          dr: 0,
          cr: 0,
          openingDr: 0,
          openingCr: 0,
        };
        const v = toNum(tx.amount);
        if (tx.type === "debit") entry.dr += v;
        else entry.cr += v;
        ledger.set(tx.accountId, entry);
      }

      const net = new Map<number, number>();
      ledger.forEach((entry, accountId) => {
        net.set(
          accountId,
          entry.dr + entry.openingDr - (entry.cr + entry.openingCr)
        );
      });

      let totalDebit = 0;
      let totalCredit = 0;
      const rows = acctRows
        .filter(a => Math.abs(net.get(a.id) ?? 0) > 0.0001)
        .map(a => {
          const balance =
            (net.get(a.id) ?? 0) * (normalSide(a.type) === "debit" ? 1 : -1);
          const side = balance >= 0 ? "debit" : "credit";
          const amount = Math.abs(balance);
          if (side === "debit") totalDebit += amount;
          else totalCredit += amount;
          return {
            accountId: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            debit: side === "debit" ? amount : 0,
            credit: side === "credit" ? amount : 0,
            balance,
          };
        });

      return {
        rows,
        totals: { debit: totalDebit, credit: totalCredit },
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      };
    }),

  generalLedger: tenantProcedure
    .input(
      z.object({
        accountId: z.number(),
        fromDate: z.string(),
        toDate: z.string(),
        includeOpening: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          account: null,
          openingBalance: { amount: 0, type: "debit" },
          transactions: [],
          closingBalance: { amount: 0, type: "debit" },
        };

      const tid = requireTenantId(ctx);

      const acctRows = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, input.accountId), eq(accounts.tenantId, tid))
        )
        .limit(1);
      if (!acctRows[0]) throw new Error("Account not found");

      const account = acctRows[0];
      const fromDate = new Date(input.fromDate);
      const toDate = new Date(input.toDate);

      let openingBalance: { amount: number; type: "debit" | "credit" } = {
        amount: 0,
        type: "debit",
      };
      if (input.includeOpening) {
        const obRows = await db
          .select()
          .from(openingBalances)
          .where(
            and(
              eq(openingBalances.tenantId, tid),
              eq(openingBalances.accountId, input.accountId)
            )
          )
          .limit(1);
        if (obRows[0]) {
          openingBalance = {
            amount: toNum(obRows[0].amount),
            type: obRows[0].type,
          };
        }
      }

      let runningBalance =
        openingBalance.type === "debit"
          ? openingBalance.amount
          : -openingBalance.amount;

      const beforeTx = await db
        .select({ type: transactions.type, amount: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tid),
            eq(transactions.accountId, input.accountId),
            eq(transactions.lifecycleStatus, "posted"),
            lt(transactions.transactionDate, fromDate)
          )
        );
      for (const tx of beforeTx) {
        runningBalance +=
          tx.type === "debit" ? toNum(tx.amount) : -toNum(tx.amount);
      }

      const periodTx = await db
        .select({
          id: transactions.id,
          transactionDate: transactions.transactionDate,
          narration: transactions.narration,
          type: transactions.type,
          amount: transactions.amount,
          costCenterId: transactions.costCenterId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tid),
            eq(transactions.accountId, input.accountId),
            eq(transactions.lifecycleStatus, "posted"),
            gte(transactions.transactionDate, fromDate),
            lte(transactions.transactionDate, toDate)
          )
        )
        .orderBy(transactions.transactionDate);

      const transactionsWithBalance = periodTx.map((tx: any) => {
        runningBalance +=
          tx.type === "debit" ? toNum(tx.amount) : -toNum(tx.amount);
        return { ...tx, runningBalance };
      });

      return {
        account,
        openingBalance,
        transactions: transactionsWithBalance,
        closingBalance: {
          amount: Math.abs(runningBalance),
          type: runningBalance >= 0 ? "debit" : "credit",
        },
      };
    }),

  agingReport: tenantProcedure
    .input(
      z.object({
        type: z.enum(["customers", "suppliers"]),
        asOf: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: {} };
      const tid = requireTenantId(ctx);

      const result: any[] = [];

      if (input.type === "customers") {
        const custRows = await db
          .select()
          .from(customers)
          .where(eq(customers.tenantId, tid));
        for (const cust of custRows) {
          const invoices = await db
            .select({
              date: salesInvoices.invoiceDate,
              total: salesInvoices.total,
              paid: salesInvoices.paidAmount,
            })
            .from(salesInvoices)
            .where(
              and(
                eq(salesInvoices.tenantId, tid),
                eq(salesInvoices.customerId, cust.id)
              )
            );
          const outstanding = invoices.reduce(
            (sum, inv) => sum + toNum(inv.total) - toNum(inv.paid),
            0
          );
          if (outstanding > 0.01)
            result.push({
              id: cust.id,
              name: cust.name,
              outstanding,
              aging: { current: outstanding },
            });
        }
      } else {
        const suppRows = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.tenantId, tid));
        for (const supp of suppRows) {
          const invoices = await db
            .select({
              date: purchaseInvoices.invoiceDate,
              total: purchaseInvoices.total,
              paid: purchaseInvoices.paidAmount,
            })
            .from(purchaseInvoices)
            .where(
              and(
                eq(purchaseInvoices.tenantId, tid),
                eq(purchaseInvoices.supplierId, supp.id)
              )
            );
          const outstanding = invoices.reduce(
            (sum, inv) => sum + toNum(inv.total) - toNum(inv.paid),
            0
          );
          if (outstanding > 0.01)
            result.push({
              id: supp.id,
              name: supp.name,
              outstanding,
              aging: { current: outstanding },
            });
        }
      }

      return { rows: result, totals: {} };
    }),
});

// ─────────────────────────────────────────────────────────────────
// SECTION 4: INVENTORY REPORTS
// ─────────────────────────────────────────────────────────────────

export const inventoryReportsRouter = router({
  inventoryBalance: tenantProcedure
    .use(requirePermissions(PERMISSIONS.REPORTS_VIEW))
    .input(z.object({ warehouseId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: { quantity: 0, value: 0 } };
      const tid = requireTenantId(ctx);

      const prodRows = await db
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          unit: products.unit,
          currentStock: products.currentStock,
        })
        .from(products)
        .where(eq(products.tenantId, tid));

      const rows = prodRows.map((p: any) => ({
        ...p,
        quantity: toNum(p.currentStock),
        value: 0,
      }));
      const totals = rows.reduce(
        (acc: any, r: any) => ({
          quantity: acc.quantity + r.quantity,
          value: acc.value + r.value,
        }),
        { quantity: 0, value: 0 }
      );

      return { rows, totals };
    }),

  inventoryAging: tenantProcedure
    .input(z.object({ warehouseId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [] };
      const tid = requireTenantId(ctx);

      const batchRows = await db
        .select({
          id: inventoryBatches.id,
          productId: inventoryBatches.productId,
          quantity: inventoryBatches.quantity,
          unitCost: inventoryBatches.unitCost,
          expiryDate: inventoryBatches.expiryDate,
          createdAt: inventoryBatches.createdAt,
          productName: products.name,
          productCode: products.code,
        })
        .from(inventoryBatches)
        .innerJoin(products, eq(inventoryBatches.productId, products.id))
        .where(
          and(
            eq(inventoryBatches.tenantId, tid),
            gt(inventoryBatches.quantity, 0)
          )
        );

      const now = new Date();
      const rows = batchRows.map((b: any) => {
        const age = Math.floor(
          (now.getTime() - new Date(b.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        let agingBucket = "0-30";
        if (age > 365) agingBucket = "365+";
        else if (age > 180) agingBucket = "180-365";
        else if (age > 90) agingBucket = "90-180";
        else if (age > 30) agingBucket = "30-90";

        return {
          ...b,
          age,
          agingBucket,
          value: toNum(b.quantity) * toNum(b.unitCost),
          isExpired: b.expiryDate ? new Date(b.expiryDate) < now : false,
        };
      });

      return { rows };
    }),

  inventoryMovement: tenantProcedure
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
        productId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], summary: {} };
      const tid = requireTenantId(ctx);

      const fromDate = new Date(input.fromDate);
      const toDate = new Date(input.toDate);

      const queryConditions = input.productId
        ? and(
            eq(inventoryMovements.tenantId, tid),
            gte(inventoryMovements.createdAt, fromDate),
            lte(inventoryMovements.createdAt, toDate),
            eq(products.id, input.productId)
          )
        : and(
            eq(inventoryMovements.tenantId, tid),
            gte(inventoryMovements.createdAt, fromDate),
            lte(inventoryMovements.createdAt, toDate)
          );

      const rows = await db
        .select({
          id: inventoryMovements.id,
          type: inventoryMovements.type,
          quantity: inventoryMovements.quantity,
          referenceType: inventoryMovements.referenceType,
          notes: inventoryMovements.notes,
          productId: products.id,
          productName: products.name,
        })
        .from(inventoryMovements)
        .innerJoin(products, eq(inventoryMovements.productId, products.id))
        .where(queryConditions)
        .orderBy(desc(inventoryMovements.createdAt));

      const summary = rows.reduce(
        (acc: any, tx: any) => {
          if (tx.type === "in") acc.totalIn += toNum(tx.quantity);
          else acc.totalOut += toNum(tx.quantity);
          return acc;
        },
        { totalIn: 0, totalOut: 0 }
      );

      return { rows, summary };
    }),

  lowStockAlert: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { rows: [] };
    const tid = requireTenantId(ctx);

    const prodRows = await db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        minStock: products.minStock,
        currentStock: products.currentStock,
      })
      .from(products)
      .where(eq(products.tenantId, tid));

    const rows = prodRows
      .filter(
        (p: any) =>
          toNum(p.currentStock) <= toNum(p.minStock) && toNum(p.minStock) > 0
      )
      .map((p: any) => ({
        ...p,
        shortage: toNum(p.minStock) - toNum(p.currentStock),
        percentage: (toNum(p.currentStock) / toNum(p.minStock)) * 100,
      }));

    return { rows };
  }),
});
