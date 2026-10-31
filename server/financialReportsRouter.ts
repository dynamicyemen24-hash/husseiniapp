/**
 * server/financialReportsRouter.ts — Server-side Financial Reporting Engine
 *
 * Closes a critical gap: previously GL reports were computed only in the client
 * (no authoritative/taxable server-side truth). This router computes the core
 * statutory financial statements directly from the database:
 *
 *   - Trial Balance (ميزان المراجعة)
 *   - Income Statement (قائمة الدخل)
 *   - Balance Sheet (الميزانية العمومية)
 *   - Account Statement (كشف حساب مفصل لأي حساب)
 *   - AR / AP Aging (تأجيل الذمم المدينة والدائنة)
 *   - Cash Flow summary (التدفقات النقدية)
 *
 * Non-destructive: purely additive read procedures. Balances reuse the ledger
 * invariant (opening balances + posted transactions, non-reversed).
 */
import { z } from "zod";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { router, tenantProcedure, requirePermissions } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import { getDb } from "./db";
import {
  accounts,
  transactions,
  journalEntries,
  fiscalPeriods,
  budgets,
  budgetLines,
  costCenters,
  openingBalances,
  salesInvoices,
  customers,
  suppliers,
  payments,
  posOrders,
  posReturnItems,
  purchaseInvoices,
} from "../drizzle/schema";
import { PERMISSIONS } from "../shared/permissions";

type Db = any;

// Posted-only: approved/saved/sent single-leg drafts are unbalanced by
// construction and must never leak into statutory reports. This aligns with
// accountingClosingRouter (trialBalance/generalLedger), which already counts
// posted legs exclusively.
const ACTIVE_LIFECYCLE = ["posted"] as const;

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Legend: how a ledger debit/credit rolls into an account's balance depends on
 * the normal balance side of the account type (ISO 25010 / double-entry rules).
 */
function normalSide(type: string): "debit" | "credit" {
  return ["asset", "expense"].includes(type) ? "debit" : "credit";
}

/** Combine opening balance + all non-reversed posted transactions per account.
 *
 * PAGINATION NOTE (mandatory-limit audit): this helper intentionally performs
 * a tenant-bounded FULL scan (accounts + openingBalances + posted
 * transactions). Trial balance / income / balance sheet MUST aggregate over
 * the whole ledger — paginating here would silently corrupt totals. Tenancy
 * bounds the blast radius (eq tenantId on every leg). If a tenant outgrows
 * this (10k+ GL legs), the fix is server-side aggregation (SUM … GROUP BY
 * accountId with a date index), not LIMIT. accountStatement below IS bounded.
 */
async function accountBalances(
  db: Db,
  tenantId: number,
  asOf?: Date
): Promise<{ account: any; balance: number }[]> {
  const acctRows = (await db
    .select()
    .from(accounts)
    .where(
      eq(accounts.tenantId, tenantId)
    )) as unknown as (typeof accounts.$inferSelect)[];
  const obRows = await db
    .select()
    .from(openingBalances)
    .where(eq(openingBalances.tenantId, tenantId));

  const txQuery = asOf
    ? and(
        eq(transactions.tenantId, tenantId),
        lte(transactions.transactionDate, asOf),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE)
      )
    : and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE)
      );
  const txRows = await db.select().from(transactions).where(txQuery);

  const net = new Map<number, number>();
  const ledger = new Map<number, { dr: number; cr: number }>();

  for (const ob of obRows) {
    const v = toNum(ob.amount);
    net.set(
      ob.accountId,
      (net.get(ob.accountId) ?? 0) + (ob.type === "debit" ? v : -v)
    );
  }
  for (const tx of txRows) {
    const v = toNum(tx.amount);
    net.set(
      tx.accountId,
      (net.get(tx.accountId) ?? 0) + (tx.type === "debit" ? v : -v)
    );
    const l = ledger.get(tx.accountId) ?? { dr: 0, cr: 0 };
    if (tx.type === "debit") l.dr += v;
    else l.cr += v;
    ledger.set(tx.accountId, l);
  }

  return acctRows.map(a => ({
    account: a,
    // Normalize to the normal side: +ve = normal direction.
    balance: (net.get(a.id) ?? 0) * (normalSide(a.type) === "debit" ? 1 : -1),
  }));
}

/**
 * Aggregate posted, non-reversed ledger activity into revenue and expense
 * actuals (double-entry sign-aware) for a tenant within an optional window.
 * - Revenue accounts: credit movements increase revenue.
 * - Expense accounts: debit movements increase expense.
 */
async function actualRevenueExpense(
  db: Db,
  tenantId: number,
  from?: Date,
  to?: Date
): Promise<{ revenue: number; expense: number; count: number }> {
  const acctRows = (await db
    .select({ id: accounts.id, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.tenantId, tenantId))) as unknown as {
    id: number;
    type: string;
  }[];
  const acctType = new Map(acctRows.map(a => [a.id, a.type]));

  const conditions: any[] = [
    eq(transactions.tenantId, tenantId),
    eq(transactions.isReversed, false),
    inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE),
  ];
  if (from) conditions.push(gte(transactions.transactionDate, from));
  if (to) conditions.push(lte(transactions.transactionDate, to));

  const txRows = await db
    .select()
    .from(transactions)
    .where(and(...conditions));

  let revenue = 0;
  let expense = 0;
  let count = 0;
  for (const tx of txRows) {
    const type = acctType.get(tx.accountId);
    if (!type) continue;
    const v = toNum(tx.amount);
    if (type === "revenue") {
      revenue += tx.type === "credit" ? v : -v;
      count++;
    } else if (type === "expense") {
      expense += tx.type === "debit" ? v : -v;
      count++;
    }
  }
  return { revenue, expense, count };
}

export const financialReportsRouter = router({
  /** ميزان المراجعة — trial balance (with optional prior-period comparison) */
  trialBalance: tenantProcedure
    .use(requirePermissions(PERMISSIONS.REPORTS_VIEW))
    .input(
      z
        .object({
          asOf: z.string().optional(),
          /** If provided, also computes the prior-period closing balance for each account. */
          previousAsOf: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], totals: { debit: 0, credit: 0 } };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const prevAsOf = input?.previousAsOf
        ? new Date(input.previousAsOf)
        : undefined;

      const balances = await accountBalances(db, tid, asOf);
      const prevBalances = prevAsOf
        ? await accountBalances(db, tid, prevAsOf)
        : null;

      const prevMap = new Map<number, number>();
      if (prevBalances) {
        for (const r of prevBalances) {
          prevMap.set(r.account.id, r.balance);
        }
      }

      let totalDebit = 0;
      let totalCredit = 0;
      const rows = balances
        .filter(r => Math.abs(r.balance) > 0.0001)
        .sort((a, b) => a.account.code.localeCompare(b.account.code, "ar"))
        .map(r => {
          const side = r.balance >= 0 ? "debit" : "credit";
          const amount = Math.abs(r.balance);
          if (side === "debit") totalDebit += amount;
          else totalCredit += amount;
          const prevBalance = prevMap.get(r.account.id) ?? null;
          return {
            accountId: r.account.id,
            code: r.account.code,
            name: r.account.name,
            type: r.account.type,
            debit: side === "debit" ? amount : 0,
            credit: side === "credit" ? amount : 0,
            balance: r.balance,
            /** Prior period closing balance — null when previousAsOf is not supplied. */
            previousBalance: prevBalance,
            /** Absolute change from prior period. */
            change:
              prevBalance != null ? Math.abs(r.balance - prevBalance) : null,
          };
        });

      const prevTotalDebit = prevBalances
        ? prevBalances
            .filter(r => r.balance >= 0)
            .reduce((s, r) => s + Math.abs(r.balance), 0)
        : null;
      const prevTotalCredit = prevBalances
        ? prevBalances
            .filter(r => r.balance < 0)
            .reduce((s, r) => s + Math.abs(r.balance), 0)
        : null;

      return {
        rows,
        totals: {
          debit: totalDebit,
          credit: totalCredit,
          previousDebit: prevTotalDebit,
          previousCredit: prevTotalCredit,
        },
        periodLabel: asOf
          ? `حتى ${new Date(asOf).toLocaleDateString("ar-EG")}`
          : "منذ البداية",
        previousPeriodLabel: prevAsOf
          ? `حتى ${new Date(prevAsOf).toLocaleDateString("ar-EG")}`
          : null,
      };
    }),

  /** قائمة الدخل — income statement (with optional prior-period comparison) */
  incomeStatement: tenantProcedure
    .use(requirePermissions(PERMISSIONS.REPORTS_VIEW))
    .input(
      z
        .object({
          asOf: z.string().optional(),
          previousAsOf: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          revenues: [],
          expenses: [],
          totals: { revenue: 0, expense: 0, net: 0 },
          previousTotals: null,
        };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const prevAsOf = input?.previousAsOf
        ? new Date(input.previousAsOf)
        : undefined;
      const balances = await accountBalances(db, tid, asOf);
      const prevBalances = prevAsOf
        ? await accountBalances(db, tid, prevAsOf)
        : null;
      const prevMap = new Map<number, number>();
      if (prevBalances) {
        for (const r of prevBalances) {
          prevMap.set(r.account.id, r.balance);
        }
      }
      const lookupPrev = (accountId: number) => prevMap.get(accountId) ?? null;

      const revenues = balances
        .filter(
          r => r.account.type === "revenue" && Math.abs(r.balance) > 0.0001
        )
        .map(r => ({
          accountId: r.account.id,
          code: r.account.code,
          name: r.account.name,
          amount: r.balance,
        }))
        .sort((a, b) => a.code.localeCompare(b.code, "ar"));
      const expenses = balances
        .filter(
          r => r.account.type === "expense" && Math.abs(r.balance) > 0.0001
        )
        .map(r => ({
          code: r.account.code,
          name: r.account.name,
          amount: Math.abs(r.balance),
          previousBalance: lookupPrev(r.account.id),
        }))
        .sort((a, b) => a.code.localeCompare(b.code, "ar"));

      const revenueTotal = revenues.reduce((s, r) => s + r.amount, 0);
      const expenseTotal = expenses.reduce((s, r) => s + r.amount, 0);
      const netIncome = revenueTotal - expenseTotal;

      const prevRevenueTotal = prevBalances
        ? prevBalances
            .filter(r => r.account.type === "revenue")
            .reduce((s, r) => s + Math.abs(r.balance), 0)
        : null;
      const prevExpenseTotal = prevBalances
        ? prevBalances
            .filter(r => r.account.type === "expense")
            .reduce((s, r) => s + Math.abs(r.balance), 0)
        : null;

      return {
        revenues: revenues.map(r => ({
          ...r,
          previousBalance: lookupPrev(r.accountId),
        })),
        expenses,
        totals: {
          revenue: revenueTotal,
          expense: expenseTotal,
          net: netIncome,
        },
        /** Prior-period totals for period-over-period comparison. */
        previousTotals:
          prevRevenueTotal != null && prevExpenseTotal != null
            ? {
                revenue: prevRevenueTotal,
                expense: prevExpenseTotal,
                net: prevRevenueTotal - prevExpenseTotal,
              }
            : null,
        periodLabel: asOf
          ? `حتى ${new Date(asOf).toLocaleDateString("ar-EG")}`
          : "منذ البداية",
        previousPeriodLabel: prevAsOf
          ? `حتى ${new Date(prevAsOf).toLocaleDateString("ar-EG")}`
          : null,
      };
    }),

  /** الميزانية العمومية — balance sheet */
  balanceSheet: tenantProcedure
    .use(requirePermissions(PERMISSIONS.REPORTS_VIEW))
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { assets: [], liabilities: [], equity: [], totals: {} };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : undefined;
      const balances = await accountBalances(db, tid, asOf);

      const pick = (type: string, sign: 1 | -1) =>
        balances
          .filter(r => r.account.type === type && Math.abs(r.balance) > 0.0001)
          .map(r => ({
            code: r.account.code,
            name: r.account.name,
            amount: r.balance * sign,
          }))
          .sort((a, b) => a.code.localeCompare(b.code, "ar"));

      const assets = pick("asset", 1);
      const liabilities = pick("liability", -1);
      const equity = pick("equity", -1);

      const assetTotal = assets.reduce((s, r) => s + r.amount, 0);
      const liabTotal = liabilities.reduce((s, r) => s + r.amount, 0);
      const eqTotal = equity.reduce((s, r) => s + r.amount, 0);
      return {
        assets,
        liabilities,
        equity,
        totals: {
          assets: assetTotal,
          liabilities: liabTotal,
          equity: eqTotal,
          net: assetTotal - liabTotal - eqTotal,
        },
      };
    }),

  /** كشف حساب — detailed statement for one account */
  accountStatement: tenantProcedure
    .input(
      z.object({
        accountId: z.number(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { account: null, lines: [], opening: 0, closing: 0 };
      const tid = requireTenantId(ctx);
      const [acc] = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, input.accountId), eq(accounts.tenantId, tid))
        )
        .limit(1);
      if (!acc) return { account: null, lines: [], opening: 0, closing: 0 };

      const obRows = await db
        .select()
        .from(openingBalances)
        .where(
          and(
            eq(openingBalances.tenantId, tid),
            eq(openingBalances.accountId, input.accountId)
          )
        );

      const conditions = [
        eq(transactions.tenantId, tid),
        eq(transactions.accountId, input.accountId),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE),
      ];
      if (input.from)
        conditions.push(
          gte(transactions.transactionDate, new Date(input.from))
        );
      if (input.to)
        conditions.push(lte(transactions.transactionDate, new Date(input.to)));
      const txRows = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(transactions.transactionDate, transactions.id)
        // PAGINATION: per-account statement, date-filtered — hard cap 2000
        // lines protects the UI from a runaway account history.
        .limit(2000);

      const side = normalSide(acc.type);
      const opening = obRows.reduce(
        (s, ob) =>
          s + (ob.type === "debit" ? toNum(ob.amount) : -toNum(ob.amount)),
        0
      );
      const openingNorm = opening * (side === "debit" ? 1 : -1);

      let running = opening;
      const lines = txRows.map(tx => {
        const v = toNum(tx.amount);
        const flow = tx.type === "debit" ? v : -v;
        running += flow;
        return {
          id: tx.id,
          date: tx.transactionDate,
          narration: tx.narration,
          debit: tx.type === "debit" ? v : 0,
          credit: tx.type === "credit" ? v : 0,
          balance: running * (side === "debit" ? 1 : -1),
        };
      });
      return {
        account: { id: acc.id, code: acc.code, name: acc.name, type: acc.type },
        lines,
        opening: openingNorm,
        closing: running * (side === "debit" ? 1 : -1),
      };
    }),

  /** تأجيل الديون المدينة (AR aging) */
  arAging: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          buckets: [],
          totals: { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 },
        };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : new Date();
      const invRows = await db
        .select()
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, tid),
            inArray(salesInvoices.status, ["confirmed", "partial"])
          )
        );
      const custRows = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.tenantId, tid));
      const custMap = new Map(custRows.map(c => [c.id, c.name]));

      const bucketOf = (due: Date): string => {
        const days = Math.max(
          0,
          Math.floor((asOf.getTime() - due.getTime()) / 86400000)
        );
        if (days <= 0) return "current";
        if (days <= 30) return "d30";
        if (days <= 60) return "d60";
        if (days <= 90) return "d90";
        return "over90";
      };

      const totals = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
      const rows = invRows.map(inv => {
        const outstanding = Math.max(
          0,
          toNum(inv.total) - toNum(inv.paidAmount)
        );
        const due = inv.dueDate ?? inv.invoiceDate;
        const bucket = bucketOf(due);
        totals[bucket as keyof typeof totals] += outstanding;
        return {
          invoiceNumber: inv.invoiceNumber,
          customer: custMap.get(inv.customerId ?? 0) ?? "غير معروف",
          invoiceDate: inv.invoiceDate,
          dueDate: due,
          outstanding,
          bucket,
        };
      });
      return { rows, totals };
    }),

  /** تأجيل الديون الدائنة (AP aging) */
  apAging: tenantProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          rows: [],
          totals: { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 },
        };
      const tid = requireTenantId(ctx);
      const asOf = input?.asOf ? new Date(input.asOf) : new Date();
      const invRows = await db
        .select()
        .from(purchaseInvoices)
        .where(
          and(
            eq(purchaseInvoices.tenantId, tid),
            inArray(purchaseInvoices.status, ["confirmed", "partial"])
          )
        );
      const supRows = await db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.tenantId, tid));
      const supMap = new Map(supRows.map(s => [s.id, s.name]));

      const bucketOf = (due: Date): string => {
        const days = Math.max(
          0,
          Math.floor((asOf.getTime() - due.getTime()) / 86400000)
        );
        if (days <= 0) return "current";
        if (days <= 30) return "d30";
        if (days <= 60) return "d60";
        if (days <= 90) return "d90";
        return "over90";
      };

      const totals = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
      const rows = invRows.map(inv => {
        const outstanding = Math.max(
          0,
          toNum(inv.total) - toNum(inv.paidAmount)
        );
        const due = inv.dueDate ?? inv.invoiceDate;
        const bucket = bucketOf(due);
        totals[bucket as keyof typeof totals] += outstanding;
        return {
          invoiceNumber: inv.invoiceNumber,
          supplier: supMap.get(inv.supplierId ?? 0) ?? "غير معروف",
          invoiceDate: inv.invoiceDate,
          dueDate: due,
          outstanding,
          bucket,
        };
      });
      return { rows, totals };
    }),

  /** التدفقات النقدية — cash flow: net change by cash-asset account */
  cashFlow: tenantProcedure
    .input(
      z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { lines: [], net: 0 };
      const tid = requireTenantId(ctx);
      const conditions = [
        eq(transactions.tenantId, tid),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE),
      ];
      if (input?.from)
        conditions.push(
          gte(transactions.transactionDate, new Date(input.from))
        );
      if (input?.to)
        conditions.push(lte(transactions.transactionDate, new Date(input.to)));
      const txRows = await db
        .select()
        .from(transactions)
        .where(and(...conditions));

      const flows = new Map<number, number>();
      for (const tx of txRows) {
        const v = toNum(tx.amount);
        flows.set(
          tx.accountId,
          (flows.get(tx.accountId) ?? 0) + (tx.type === "debit" ? v : -v)
        );
      }
      const acctRows = await db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, tid));
      const acctMap = new Map(acctRows.map(a => [a.id, a]));

      const isCash = (type: string, code: string) =>
        type === "asset" && /^(1[01]|2[01])/.test(code);
      const lines = [...flows.entries()]
        .filter(([id]) => {
          const a = acctMap.get(id);
          return a && isCash(a.type, a.code);
        })
        .map(([id, v]) => ({
          accountId: id,
          code: acctMap.get(id)!.code,
          name: acctMap.get(id)!.name,
          net: v,
        }))
        .sort((a, b) => a.code.localeCompare(b.code, "ar"));

      return { lines, net: lines.reduce((s, l) => s + l.net, 0) };
    }),

  /** كشف حساب عميل — customer statement (invoices + payments, running balance) */
  customerStatement: tenantProcedure
    .input(
      z.object({
        customerId: z.number(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return { customer: null, lines: [], totals: { debit: 0, credit: 0 } };
      const tid = requireTenantId(ctx);

      const custRows = await db
        .select()
        .from(customers)
        .where(
          and(eq(customers.id, input.customerId), eq(customers.tenantId, tid))
        )
        .limit(1);
      if (custRows.length === 0) throw new Error("العميل غير موجود");

      const invConditions = [
        eq(salesInvoices.tenantId, tid),
        eq(salesInvoices.customerId, input.customerId),
      ];
      if (input.from)
        invConditions.push(
          gte(salesInvoices.invoiceDate, new Date(input.from))
        );
      if (input.to)
        invConditions.push(lte(salesInvoices.invoiceDate, new Date(input.to)));
      const invRows = await db
        .select()
        .from(salesInvoices)
        .where(and(...invConditions));
      const invIds = invRows.map(i => i.id);

      const payRows =
        invIds.length > 0
          ? await db
              .select()
              .from(payments)
              .where(
                and(
                  eq(payments.tenantId, tid),
                  eq(payments.source, "sales"),
                  inArray(payments.invoiceId, invIds)
                )
              )
          : [];
      const payByInvoice = new Map<number, number>();
      for (const p of payRows) {
        payByInvoice.set(
          p.invoiceId,
          (payByInvoice.get(p.invoiceId) ?? 0) + toNum(p.amount)
        );
      }

      type Line = {
        date: Date;
        doc: string;
        description: string;
        debit: number;
        credit: number;
        balance: number;
      };
      const lines: Line[] = [];
      let running = 0;
      for (const inv of invRows) {
        const total = toNum(inv.total);
        running += total; // customer owes us => debit
        lines.push({
          date: inv.invoiceDate,
          doc: inv.invoiceNumber,
          description: "فاتورة مبيعات",
          debit: total,
          credit: 0,
          balance: running,
        });
        const paid = payByInvoice.get(inv.id) ?? 0;
        if (paid > 0) {
          running -= paid; // payment settles the receivable => credit
          lines.push({
            date: inv.invoiceDate,
            doc: `${inv.invoiceNumber}-P`,
            description: "دفعات مستلمة على الفاتورة",
            debit: 0,
            credit: paid,
            balance: running,
          });
        }
      }
      lines.sort((a, b) => a.date.getTime() - b.date.getTime());
      const debit = lines.reduce((s, l) => s + l.debit, 0);
      const credit = lines.reduce((s, l) => s + l.credit, 0);
      return {
        customer: { id: custRows[0].id, name: custRows[0].name },
        lines,
        totals: { debit, credit, balance: running },
      };
    }),

  /** كشف حساب مورد — supplier statement (invoices + payments, running balance) */
  supplierStatement: tenantProcedure
    .input(
      z.object({
        supplierId: z.number(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return { supplier: null, lines: [], totals: { debit: 0, credit: 0 } };
      const tid = requireTenantId(ctx);

      const supRows = await db
        .select()
        .from(suppliers)
        .where(
          and(eq(suppliers.id, input.supplierId), eq(suppliers.tenantId, tid))
        )
        .limit(1);
      if (supRows.length === 0) throw new Error("المورد غير موجود");

      const invConditions = [
        eq(purchaseInvoices.tenantId, tid),
        eq(purchaseInvoices.supplierId, input.supplierId),
      ];
      if (input.from)
        invConditions.push(
          gte(purchaseInvoices.invoiceDate, new Date(input.from))
        );
      if (input.to)
        invConditions.push(
          lte(purchaseInvoices.invoiceDate, new Date(input.to))
        );
      const invRows = await db
        .select()
        .from(purchaseInvoices)
        .where(and(...invConditions));
      const invIds = invRows.map(i => i.id);

      const payRows =
        invIds.length > 0
          ? await db
              .select()
              .from(payments)
              .where(
                and(
                  eq(payments.tenantId, tid),
                  eq(payments.source, "purchases"),
                  inArray(payments.invoiceId, invIds)
                )
              )
          : [];
      const payByInvoice = new Map<number, number>();
      for (const p of payRows) {
        payByInvoice.set(
          p.invoiceId,
          (payByInvoice.get(p.invoiceId) ?? 0) + toNum(p.amount)
        );
      }

      type Line = {
        date: Date;
        doc: string;
        description: string;
        debit: number;
        credit: number;
        balance: number;
      };
      const lines: Line[] = [];
      let running = 0;
      for (const inv of invRows) {
        const total = toNum(inv.total);
        running += total; // we owe the supplier => credit
        lines.push({
          date: inv.invoiceDate,
          doc: inv.invoiceNumber,
          description: "فاتورة مشتريات",
          debit: 0,
          credit: total,
          balance: running,
        });
        const paid = payByInvoice.get(inv.id) ?? 0;
        if (paid > 0) {
          running -= paid; // payments reduce the payable => debit
          lines.push({
            date: inv.invoiceDate,
            doc: `${inv.invoiceNumber}-P`,
            description: "دفعات مسددة على الفاتورة",
            debit: paid,
            credit: 0,
            balance: running,
          });
        }
      }
      lines.sort((a, b) => a.date.getTime() - b.date.getTime());
      const debit = lines.reduce((s, l) => s + l.debit, 0);
      const credit = lines.reduce((s, l) => s + l.credit, 0);
      return {
        supplier: { id: supRows[0].id, name: supRows[0].name },
        lines,
        totals: { debit, credit, balance: running },
      };
    }),

  /**
   * ملخص مراكز التكلفة — cost-center analytical summary.
   * Revives the previously-dead costCenterId dimension: aggregates revenue
   * and expense activity per analytical dimension for management reporting.
   */
  costCenterSummary: tenantProcedure
    .input(
      z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { rows: [], unassigned: 0 };
      const tid = requireTenantId(ctx);
      const conditions = [
        eq(transactions.tenantId, tid),
        eq(transactions.isReversed, false),
        inArray(transactions.lifecycleStatus, ACTIVE_LIFECYCLE),
      ];
      if (input?.from)
        conditions.push(
          gte(transactions.transactionDate, new Date(input.from))
        );
      if (input?.to)
        conditions.push(lte(transactions.transactionDate, new Date(input.to)));
      const txRows = await db
        .select({
          costCenterId: transactions.costCenterId,
          type: transactions.type,
          amount: transactions.amount,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .where(and(...conditions));

      const acctRows = await db
        .select({ id: accounts.id, type: accounts.type })
        .from(accounts)
        .where(eq(accounts.tenantId, tid));
      const acctType = new Map(acctRows.map(a => [a.id, a.type]));

      const agg = new Map<
        number,
        { revenue: number; expense: number; count: number }
      >();
      let unassigned = 0;
      for (const tx of txRows) {
        const v = toNum(tx.amount);
        const type = acctType.get(tx.accountId);
        const isRevenue = type === "revenue";
        if (!isRevenue && type !== "expense") continue; // BS accounts excluded
        const key = tx.costCenterId ?? 0;
        const entry = agg.get(key) ?? { revenue: 0, expense: 0, count: 0 };
        if (isRevenue) {
          entry.revenue += tx.type === "credit" ? v : -v;
        } else {
          entry.expense += tx.type === "debit" ? v : -v;
        }
        entry.count++;
        agg.set(key, entry);
        if (key === 0) unassigned += 1;
      }

      const ccRows = await db
        .select({
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
        })
        .from(costCenters)
        .where(eq(costCenters.tenantId, tid));
      const ccMap = new Map(ccRows.map(c => [c.id, c]));

      const rows = [...agg.entries()]
        .map(([id, v]) => ({
          costCenterId: id === 0 ? null : id,
          code: id === 0 ? "—" : (ccMap.get(id)?.code ?? "؟"),
          name:
            id === 0
              ? "بدون مركز تكلفة"
              : (ccMap.get(id)?.name ?? "مركز محذوف"),
          revenue: v.revenue,
          expense: v.expense,
          net: v.revenue - v.expense,
          count: v.count,
        }))
        .sort((a, b) => b.net - a.net);

      return { rows, unassigned };
    }),

  /**
   * ملخص ضريبة القيمة المضافة — VAT reconciliation (output vs input tax).
   * Professional-grade statutory view: sums the invoice-declared output tax
   * on sales and input tax on purchases, grouped by rate for the selected
   * period, and nets them into the payable/refundable position.
   */
  vatSummary: tenantProcedure
    .input(
      z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return {
          output: [],
          input: [],
          totals: { outputTax: 0, inputTax: 0, netPayable: 0 },
        };
      const tid = requireTenantId(ctx);

      const dateCond = (col: any) => [
        ...(input?.from ? [gte(col, new Date(input.from))] : []),
        ...(input?.to ? [lte(col, new Date(input.to))] : []),
      ];
      const activeStatuses = ["confirmed", "paid", "partial"] as (
        | "confirmed"
        | "paid"
        | "partial"
      )[];

      const [salesRows, purchaseRows] = await Promise.all([
        db
          .select({
            invoiceNumber: salesInvoices.invoiceNumber,
            invoiceDate: salesInvoices.invoiceDate,
            taxRate: salesInvoices.taxRate,
            subtotal: salesInvoices.subtotal,
            taxAmount: salesInvoices.taxAmount,
          })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.tenantId, tid),
              inArray(salesInvoices.status, activeStatuses),
              ...dateCond(salesInvoices.invoiceDate)
            )
          ),
        db
          .select({
            invoiceNumber: purchaseInvoices.invoiceNumber,
            invoiceDate: purchaseInvoices.invoiceDate,
            taxRate: purchaseInvoices.taxRate,
            subtotal: purchaseInvoices.subtotal,
            taxAmount: purchaseInvoices.taxAmount,
          })
          .from(purchaseInvoices)
          .where(
            and(
              eq(purchaseInvoices.tenantId, tid),
              inArray(purchaseInvoices.status, activeStatuses),
              ...dateCond(purchaseInvoices.invoiceDate)
            )
          ),
      ]);

      const rateKey = (r: string | number | null) =>
        `rate_${toNum(r).toFixed(2)}`;

      const aggregate = (
        rows: typeof salesRows
      ): { rate: number; base: number; tax: number; count: number }[] => {
        const groups = new Map<string, any>();
        for (const r of rows) {
          const k = rateKey(r.taxRate);
          const g = groups.get(k) ?? {
            rate: toNum(r.taxRate),
            base: 0,
            tax: 0,
            count: 0,
          };
          g.base += toNum(r.subtotal);
          g.tax += toNum(r.taxAmount);
          g.count += 1;
          groups.set(k, g);
        }
        return [...groups.values()].sort((a, b) => a.rate - b.rate);
      };

      const output = aggregate(salesRows);
      const inputRows = aggregate(purchaseRows);
      const outputTax = output.reduce((s, g) => s + g.tax, 0);
      const inputTax = inputRows.reduce((s, g) => s + g.tax, 0);

      return {
        output,
        input: inputRows,
        totals: { outputTax, inputTax, netPayable: outputTax - inputTax },
      };
    }),

  /**
   * مقارنة الموازنة بالفعلي — Budget vs Actual variance report.
   * Uses the configured budgets (targetRevenue/targetExpense) and reckons the
   * actuals from posted ledger transactions on revenue/expense accounts within
   * the requested range, reporting absolute + percentage variance per budget.
   */
  budgetVariance: tenantProcedure
    .input(
      z
        .object({
          periodName: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        return { rows: [], summary: { revenue: 0, expense: 0, count: 0 } };
      const tid = requireTenantId(ctx);

      const budgetWhere = [eq(budgets.tenantId, tid)];
      if (input?.periodName)
        budgetWhere.push(eq(budgets.periodName, input.periodName));
      const budgetRows = await db
        .select()
        .from(budgets)
        .where(and(...budgetWhere))
        .orderBy(budgets.id);

      const actual = await actualRevenueExpense(
        db,
        tid,
        input?.from ? new Date(input.from) : undefined,
        input?.to ? new Date(input.to) : undefined
      );

      const rows = budgetRows.map(b => {
        const targetRevenue = toNum(b.targetRevenue);
        const targetExpense = toNum(b.targetExpense);
        const revenueVariance = actual.revenue - targetRevenue;
        const expenseVariance = actual.expense - targetExpense;
        return {
          id: b.id,
          periodName: b.periodName,
          targetRevenue,
          targetExpense,
          actualRevenue: actual.revenue,
          actualExpense: actual.expense,
          revenueVariance,
          expenseVariance,
          revenueVariancePct: targetRevenue
            ? (revenueVariance / targetRevenue) * 100
            : 0,
          expenseVariancePct: targetExpense
            ? (expenseVariance / targetExpense) * 100
            : 0,
          status:
            revenueVariance >= 0 && expenseVariance <= 0
              ? "under_budget"
              : revenueVariance < 0 && expenseVariance <= 0
                ? "revenue_shortfall"
                : "over_budget",
        };
      });

      return { rows, summary: actual };
    }),
});
