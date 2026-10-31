import { getDb } from "./db";
import { createNotification } from "./notifications";
import { eq, and, sql, ne, isNull, gte, desc, lte, asc } from "drizzle-orm";
import {
  products,
  salesInvoices,
  purchaseInvoices,
  purchaseInvoiceItems,
  notifications,
  scheduledJournalEntries,
  recurringExpenses,
  recurringExpenseRuns,
  journalEntries,
  transactions,
  branches,
  accounts,
  suppliers,
  categories,
  budgets,
} from "../drizzle/schema";

/**
 * SHARED automation engine.
 *
 * These functions hold the real logic behind the previously-manual
 * `erp.processAlerts` and `scheduled.processDue` procedures. They take a
 * tenant id (and an optional acting user id) and resolve their own DB
 * connection via `getDb()`, so they can run both inside a tRPC procedure
 * AND from an external cron trigger (api/cron.mjs) with no request context.
 *
 * The two existing procedures now delegate to these functions, so behaviour
 * is unchanged for in-app manual runs.
 */

export interface ProactiveAlertResult {
  created: { reorder: number; overdueSales: number; overduePurchase: number };
  total: number;
}

export async function runProactiveAlerts(
  tenantId: number
): Promise<ProactiveAlertResult> {
  const db = await getDb();
  if (!db) {
    return {
      created: { reorder: 0, overdueSales: 0, overduePurchase: 0 },
      total: 0,
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // De-dupe: skip any (type, link) already notified & still unread in last 24h.
  const existing = await db
    .select({
      type: notifications.type,
      link: notifications.metadata,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        isNull(notifications.readAt),
        gte(notifications.createdAt, since)
      )
    );

  const alreadyNotified = new Set<string>();
  for (const n of existing) {
    const link = (n.link && (n.link as any)?.link) || null;
    if (link) alreadyNotified.add(`${n.type}::${link}`);
  }

  const key = (type: string, link: string) => `${type}::${link}`;
  const created = { reorder: 0, overdueSales: 0, overduePurchase: 0 };

  // (1) Reorder point.
  const lowStock = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
        sql`${products.currentStock} <= ${products.reorderPoint}`,
        sql`${products.reorderPoint} > 0`
      )
    );
  for (const p of lowStock) {
    const link = "/inventory";
    if (alreadyNotified.has(key("reorder", link))) continue;
    await createNotification(db, {
      tenantId,
      userId: null,
      title: "منتج تحت نقطة إعادة الطلب",
      body: `المنتج «${p.name}» وصل مخزونه (${Number(p.currentStock) || 0}) إلى نقطة إعادة الطلب (${Number(p.reorderPoint) || 0})`,
      link,
      type: "reorder",
    });
    created.reorder++;
  }

  // (2a) Overdue receivables (sales).
  const overdueSales = await db
    .select()
    .from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.tenantId, tenantId),
        ne(salesInvoices.status, "cancelled"),
        ne(salesInvoices.status, "paid"),
        sql`${salesInvoices.dueDate} < now()`,
        sql`${salesInvoices.paidAmount} < ${salesInvoices.total}`
      )
    );
  for (const inv of overdueSales) {
    const link = "/commercial";
    if (alreadyNotified.has(key("overdue", link))) continue;
    const outstanding = (
      Number(inv.total || 0) - Number(inv.paidAmount || 0)
    ).toFixed(2);
    await createNotification(db, {
      tenantId,
      userId: null,
      title: "مستحق متأخر",
      body: `فاتورة المبيعات ${inv.invoiceNumber} مستحقة ولم تسدد بالكامل — المتبقي ${outstanding}`,
      link,
      type: "overdue",
    });
    created.overdueSales++;
  }

  // (2b) Overdue payables (purchases).
  const overduePurchases = await db
    .select()
    .from(purchaseInvoices)
    .where(
      and(
        eq(purchaseInvoices.tenantId, tenantId),
        ne(purchaseInvoices.status, "cancelled"),
        ne(purchaseInvoices.status, "paid"),
        sql`${purchaseInvoices.dueDate} < now()`,
        sql`${purchaseInvoices.paidAmount} < ${purchaseInvoices.total}`
      )
    );
  for (const inv of overduePurchases) {
    const link = "/commercial";
    if (alreadyNotified.has(key("overdue", link))) continue;
    const outstanding = (
      Number(inv.total || 0) - Number(inv.paidAmount || 0)
    ).toFixed(2);
    await createNotification(db, {
      tenantId,
      userId: null,
      title: "مستحق متأخر",
      body: `فاتورة المشتريات ${inv.invoiceNumber} مستحقة ولم تسدد بالكامل — المتبقي ${outstanding}`,
      link,
      type: "overdue",
    });
    created.overduePurchase++;
  }

  return {
    created,
    total: created.reorder + created.overdueSales + created.overduePurchase,
  };
}

export async function runScheduledJournalEntries(
  tenantId: number,
  userId: number | null = null
): Promise<{ processed: number }> {
  const db = await getDb();
  if (!db) return { processed: 0 };

  const now = new Date();
  const due = await db
    .select()
    .from(scheduledJournalEntries)
    .where(
      and(
        eq(scheduledJournalEntries.tenantId, tenantId),
        eq(scheduledJournalEntries.isActive, true)
      )
    );

  const ready = due.filter(
    s => s.nextRunAt != null && new Date(s.nextRunAt).getTime() <= now.getTime()
  );

  let processed = 0;
  for (const s of ready) {
    const legsArr: any[] = Array.isArray(s.legs) ? s.legs : [];
    const lines: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const leg of legsArr) {
      const d = parseFloat(leg.debit || "0");
      const c = parseFloat(leg.credit || "0");
      if (d > 0) {
        lines.push({
          accountId: leg.accountId,
          type: "debit",
          amount: d.toFixed(2),
          narration: leg.description || s.name,
        });
        totalDebit += d;
      }
      if (c > 0) {
        lines.push({
          accountId: leg.accountId,
          type: "credit",
          amount: c.toFixed(2),
          narration: leg.description || s.name,
        });
        totalCredit += c;
      }
    }

    if (lines.length === 0) continue;
    if (Math.abs(totalDebit - totalCredit) > 0.01) continue;

    const bRows = await db
      .select()
      .from(branches)
      .where(eq(branches.tenantId, tenantId))
      .orderBy(desc(branches.isMain))
      .limit(1);
    const effectiveBranchId = s.branchId ?? bRows[0]?.id ?? null;

    // Atomic: journal header + legs commit together (no orphan entries).
    const [je] = await db.transaction(async (tx: any) => {
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          branchId: effectiveBranchId,
          sourceModule: "scheduled",
          sourceRefType: "scheduled",
          sourceRefId: s.id,
          referenceNo: `SCH-${s.id}-${Date.now().toString().slice(-6)}`,
          status: "posted",
          totalAmount: totalDebit.toFixed(2),
          createdById: userId,
          postedAt: now,
        })
        .returning();

      for (const l of lines) {
        await tx.insert(transactions).values({
          tenantId,
          accountId: l.accountId,
          branchId: effectiveBranchId,
          amount: l.amount,
          type: l.type,
          transactionDate: now,
          narration: l.narration,
          lifecycleStatus: "posted",
          referenceType: "scheduled",
          referenceId: s.id,
          sourceModule: "scheduled",
          userId,
          journalEntryId: entry.id,
        });
      }
      return [entry];
    });

    // Advance schedule.
    let nextRunAt: Date | null;
    const base = s.nextRunAt ? new Date(s.nextRunAt) : now;
    if (s.frequency === "once") {
      await db
        .update(scheduledJournalEntries)
        .set({ isActive: false })
        .where(eq(scheduledJournalEntries.id, s.id));
      continue;
    } else if (s.frequency === "daily") {
      nextRunAt = new Date(base.getTime() + 24 * 3600 * 1000);
    } else if (s.frequency === "weekly") {
      nextRunAt = new Date(base.getTime() + 7 * 24 * 3600 * 1000);
    } else {
      nextRunAt = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        base.getDate(),
        base.getHours(),
        base.getMinutes(),
        base.getSeconds()
      );
    }
    await db
      .update(scheduledJournalEntries)
      .set({ nextRunAt })
      .where(eq(scheduledJournalEntries.id, s.id));

    processed++;
  }

  return { processed };
}

/**
 * Get monthly factor for frequency to calculate monthly equivalent
 */
function getMonthlyFactor(frequency: string): number {
  switch (frequency) {
    case "daily":
      return 30;
    case "weekly":
      return 4.33;
    case "biweekly":
      return 2.17;
    case "monthly":
      return 1;
    case "quarterly":
      return 1 / 3;
    case "semiannual":
      return 1 / 6;
    case "annual":
      return 1 / 12;
    default:
      return 1;
  }
}

/**
 * Calculate next run date based on frequency and parameters
 */
function calculateNextRunDate(
  base: Date,
  frequency: string,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null,
  weekOfMonth?: number | null
): Date {
  const next = new Date(base);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      if (dayOfMonth) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(
          Math.min(
            dayOfMonth,
            new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
          )
        );
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "semiannual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      // For custom, we'd need a cron parser - simplified to monthly
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next;
}

/**
 * Schedule the next run for a recurring expense
 */
export async function scheduleNextRun(
  db: any,
  recurringExpenseId: number,
  tenantId: number
): Promise<void> {
  const [rec] = await db
    .select()
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.id, recurringExpenseId),
        eq(recurringExpenses.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!rec) return;

  if (rec.maxOccurrences && rec.occurrencesCount >= rec.maxOccurrences) {
    await db
      .update(recurringExpenses)
      .set({ status: "completed", nextRunAt: null })
      .where(eq(recurringExpenses.id, recurringExpenseId));
    return;
  }

  if (rec.endDate && new Date(rec.endDate) < new Date()) {
    await db
      .update(recurringExpenses)
      .set({ status: "completed", nextRunAt: null })
      .where(eq(recurringExpenses.id, recurringExpenseId));
    return;
  }

  const base = rec.nextRunAt
    ? new Date(rec.nextRunAt)
    : new Date(rec.startDate);
  const nextRunAt = calculateNextRunDate(
    base,
    rec.frequency,
    rec.dayOfMonth,
    rec.dayOfWeek,
    rec.weekOfMonth
  );

  // Check if next run exceeds end date
  if (rec.endDate && nextRunAt > new Date(rec.endDate)) {
    await db
      .update(recurringExpenses)
      .set({ status: "completed", nextRunAt: null })
      .where(eq(recurringExpenses.id, recurringExpenseId));
    return;
  }

  await db
    .update(recurringExpenses)
    .set({ nextRunAt })
    .where(eq(recurringExpenses.id, recurringExpenseId));
}

/**
 * Process a single recurring expense run
 */
export async function processRecurringExpenseRun(
  db: any,
  run: any,
  userId: number | null
): Promise<void> {
  const [rec] = await db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, run.recurringExpenseId))
    .limit(1);

  if (!rec) {
    await db
      .update(recurringExpenseRuns)
      .set({
        status: "failed",
        errorMessage: "Recurring expense not found",
        executedDate: new Date(),
      })
      .where(eq(recurringExpenseRuns.id, run.id));
    return;
  }

  try {
    // Calculate amounts
    const amount = parseFloat(rec.amount);
    const taxRate = parseFloat(rec.taxRate || "0");
    const taxAmount = Math.round(((amount * taxRate) / 100) * 100) / 100;
    const totalAmount = amount + taxAmount;
    const exchangeRate = parseFloat(rec.exchangeRate || "1");
    const baseAmount = Math.round((totalAmount / exchangeRate) * 100) / 100;

    // Update run with calculated amounts
    await db
      .update(recurringExpenseRuns)
      .set({
        amount: amount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        baseAmount: baseAmount.toFixed(2),
        exchangeRate: exchangeRate.toFixed(8),
        status: "processing",
      })
      .where(eq(recurringExpenseRuns.id, run.id));

    // Get default branch
    const bRows = await db
      .select()
      .from(branches)
      .where(eq(branches.tenantId, rec.tenantId))
      .orderBy(desc(branches.isMain))
      .limit(1);
    const effectiveBranchId = rec.branchId ?? bRows[0]?.id ?? null;

    let journalEntryId: number | null = null;
    let purchaseInvoiceId: number | null = null;
    let paymentTransactionId: number | null = null;

    if (rec.basis === "accrual") {
      // Create journal entry: Expense (Debit) / Payable (Credit)
      const expenseAcc = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, rec.accountId),
            eq(accounts.tenantId, rec.tenantId)
          )
        )
        .limit(1);

      const payableAcc = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.code, "2010"), eq(accounts.tenantId, rec.tenantId))
        )
        .limit(1);

      if (!expenseAcc[0] || !payableAcc[0]) {
        throw new Error("الحسابات المطلوبة غير موجودة (مصروف / ذمم دائنة)");
      }

      const lines = [
        {
          tenantId: rec.tenantId,
          accountId: expenseAcc[0].id,
          branchId: effectiveBranchId,
          amount: amount.toFixed(2),
          type: "debit" as const,
          transactionDate: run.scheduledDate,
          narration: `${rec.name} — ${rec.description || ""}`,
          lifecycleStatus: "posted" as const,
          referenceType: "recurring_expense",
          referenceId: rec.id,
          sourceModule: "recurring_expenses",
          userId,
        },
        {
          tenantId: rec.tenantId,
          accountId: payableAcc[0].id,
          branchId: effectiveBranchId,
          amount: totalAmount.toFixed(2),
          type: "credit" as const,
          transactionDate: run.scheduledDate,
          narration: `التزام مستحق — ${rec.name}`,
          lifecycleStatus: "posted" as const,
          referenceType: "recurring_expense",
          referenceId: rec.id,
          sourceModule: "recurring_expenses",
          userId,
        },
      ];

      // Add tax line if applicable
      if (taxAmount > 0 && rec.taxAccountId) {
        const taxAcc = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.id, rec.taxAccountId),
              eq(accounts.tenantId, rec.tenantId)
            )
          )
          .limit(1);
        if (taxAcc[0]) {
          lines.push({
            tenantId: rec.tenantId,
            accountId: taxAcc[0].id,
            branchId: effectiveBranchId,
            amount: taxAmount.toFixed(2),
            type: "debit" as const,
            transactionDate: run.scheduledDate,
            narration: `ضريبة — ${rec.name}`,
            lifecycleStatus: "posted" as const,
            referenceType: "recurring_expense",
            referenceId: rec.id,
            sourceModule: "recurring_expenses",
            userId,
          });
        }
      }

      const totalDebit = lines
        .filter(l => l.type === "debit")
        .reduce((s, l) => s + parseFloat(l.amount), 0);
      const totalCredit = lines
        .filter(l => l.type === "credit")
        .reduce((s, l) => s + parseFloat(l.amount), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("القيد غير متوازن");
      }

      // Atomic: journal header + legs commit together (no orphan entries).
      const [je] = await db.transaction(async (tx: any) => {
        const [entry] = await tx
          .insert(journalEntries)
          .values({
            tenantId: rec.tenantId,
            branchId: effectiveBranchId,
            sourceModule: "recurring_expenses",
            sourceRefType: "recurring_expense",
            sourceRefId: rec.id,
            referenceNo: `REC-${rec.id}-${run.runNumber}`,
            status: "posted",
            totalAmount: totalDebit.toFixed(2),
            createdById: userId,
            postedAt: new Date(),
          })
          .returning();

        journalEntryId = entry.id;

        for (const l of lines) {
          await tx
            .insert(transactions)
            .values({ ...l, journalEntryId: entry.id });
        }
        return [entry];
      });

      // If autoPay is enabled, create payment transaction
      if (rec.autoPay && rec.paymentAccountId) {
        const paymentLines = [
          {
            tenantId: rec.tenantId,
            accountId: payableAcc[0].id,
            branchId: effectiveBranchId,
            amount: totalAmount.toFixed(2),
            type: "debit" as const,
            transactionDate: run.scheduledDate,
            narration: `سداد — ${rec.name}`,
            lifecycleStatus: "posted" as const,
            referenceType: "recurring_expense_payment",
            referenceId: rec.id,
            sourceModule: "recurring_expenses",
            userId,
          },
          {
            tenantId: rec.tenantId,
            accountId: rec.paymentAccountId,
            branchId: effectiveBranchId,
            amount: totalAmount.toFixed(2),
            type: "credit" as const,
            transactionDate: run.scheduledDate,
            narration: `دفع — ${rec.name}`,
            lifecycleStatus: "posted" as const,
            referenceType: "recurring_expense_payment",
            referenceId: rec.id,
            sourceModule: "recurring_expenses",
            userId,
          },
        ];

        // Atomic: journal header + legs commit together (no orphan entries).
        const [payJe] = await db.transaction(async (tx: any) => {
          const [payEntry] = await tx
            .insert(journalEntries)
            .values({
              tenantId: rec.tenantId,
              branchId: effectiveBranchId,
              sourceModule: "recurring_expenses",
              sourceRefType: "recurring_expense_payment",
              sourceRefId: rec.id,
              referenceNo: `REC-PAY-${rec.id}-${run.runNumber}`,
              status: "posted",
              totalAmount: totalAmount.toFixed(2),
              createdById: userId,
              postedAt: new Date(),
            })
            .returning();

          for (const l of paymentLines) {
            await tx
              .insert(transactions)
              .values({ ...l, journalEntryId: payEntry.id });
          }
          return [payEntry];
        });

        paymentTransactionId = payJe.id;
      }
    } else {
      // Cash basis: Create purchase invoice directly
      const vendor = rec.vendorId
        ? await db
            .select()
            .from(suppliers)
            .where(
              and(
                eq(suppliers.id, rec.vendorId),
                eq(suppliers.tenantId, rec.tenantId)
              )
            )
            .limit(1)
        : null;

      const seqResult = await db
        .select({ c: sql`count(*)` })
        .from(purchaseInvoices)
        .where(eq(purchaseInvoices.tenantId, rec.tenantId));
      const seq = Number(seqResult[0]?.c ?? 0) + 1;

      const [pi] = await db
        .insert(purchaseInvoices)
        .values({
          tenantId: rec.tenantId,
          invoiceNumber: `PI-REC-${rec.tenantId}-${seq}`,
          supplierId: rec.vendorId ?? null,
          branchId: effectiveBranchId,
          status: "confirmed",
          subtotal: amount.toFixed(2),
          taxRate: taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          discount: "0",
          total: totalAmount.toFixed(2),
          paidAmount: rec.autoPay ? totalAmount.toFixed(2) : "0",
          paymentMethod: rec.paymentMethod || "cash",
          notes: `مصروف دوري: ${rec.name}`,
          invoiceDate: run.scheduledDate,
          dueDate: run.scheduledDate,
          userId,
          currency: rec.currency,
          currencyRate: exchangeRate.toFixed(8),
        })
        .returning();

      purchaseInvoiceId = pi.id;

      // Add invoice item
      await db.insert(purchaseInvoiceItems).values({
        invoiceId: pi.id,
        productId: 0, // Service/no product
        productName: rec.name,
        quantity: 1,
        unitPrice: amount.toFixed(2),
        discount: "0",
        total: totalAmount.toFixed(2),
      });

      // Post to GL if autoPay
      if (rec.autoPay) {
        const expenseAcc = await db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.id, rec.accountId),
              eq(accounts.tenantId, rec.tenantId)
            )
          )
          .limit(1);

        const payableAcc = await db
          .select()
          .from(accounts)
          .where(
            and(eq(accounts.code, "2010"), eq(accounts.tenantId, rec.tenantId))
          )
          .limit(1);

        if (expenseAcc[0] && payableAcc[0]) {
          const lines = [
            {
              tenantId: rec.tenantId,
              accountId: expenseAcc[0].id,
              branchId: effectiveBranchId,
              amount: amount.toFixed(2),
              type: "debit" as const,
              transactionDate: run.scheduledDate,
              narration: `${rec.name} (نقدي)`,
              lifecycleStatus: "posted" as const,
              referenceType: "purchase_invoice",
              referenceId: pi.id,
              sourceModule: "purchases",
              userId,
            },
            {
              tenantId: rec.tenantId,
              accountId: payableAcc[0].id,
              branchId: effectiveBranchId,
              amount: totalAmount.toFixed(2),
              type: "credit" as const,
              transactionDate: run.scheduledDate,
              narration: `التزام مورد — ${rec.name}`,
              lifecycleStatus: "posted" as const,
              referenceType: "purchase_invoice",
              referenceId: pi.id,
              sourceModule: "purchases",
              userId,
            },
          ];

          if (taxAmount > 0 && rec.taxAccountId) {
            const taxAcc = await db
              .select()
              .from(accounts)
              .where(
                and(
                  eq(accounts.id, rec.taxAccountId),
                  eq(accounts.tenantId, rec.tenantId)
                )
              )
              .limit(1);
            if (taxAcc[0]) {
              lines.push({
                tenantId: rec.tenantId,
                accountId: taxAcc[0].id,
                branchId: effectiveBranchId,
                amount: taxAmount.toFixed(2),
                type: "debit" as const,
                transactionDate: run.scheduledDate,
                narration: `ضريبة — ${rec.name}`,
                lifecycleStatus: "posted" as const,
                referenceType: "purchase_invoice",
                referenceId: pi.id,
                sourceModule: "purchases",
                userId,
              });
            }
          }

          const totalDebit = lines
            .filter(l => l.type === "debit")
            .reduce((s, l) => s + parseFloat(l.amount), 0);
          const totalCredit = lines
            .filter(l => l.type === "credit")
            .reduce((s, l) => s + parseFloat(l.amount), 0);

          if (Math.abs(totalDebit - totalCredit) <= 0.01) {
            // Atomic: journal header + legs commit together (no orphan entries).
            const [je] = await db.transaction(async (tx: any) => {
              const [entry] = await tx
                .insert(journalEntries)
                .values({
                  tenantId: rec.tenantId,
                  branchId: effectiveBranchId,
                  sourceModule: "purchases",
                  sourceRefType: "purchase_invoice",
                  sourceRefId: pi.id,
                  referenceNo: `PI-${pi.id}`,
                  status: "posted",
                  totalAmount: totalDebit.toFixed(2),
                  createdById: userId,
                  postedAt: new Date(),
                })
                .returning();

              for (const l of lines) {
                await tx
                  .insert(transactions)
                  .values({ ...l, journalEntryId: entry.id });
              }
              return [entry];
            });
          }
        }

        // Payment entry
        if (rec.paymentAccountId) {
          const paymentLines = [
            {
              tenantId: rec.tenantId,
              accountId: payableAcc[0]?.id,
              branchId: effectiveBranchId,
              amount: totalAmount.toFixed(2),
              type: "debit" as const,
              transactionDate: run.scheduledDate,
              narration: `سداد — ${rec.name}`,
              lifecycleStatus: "posted" as const,
              referenceType: "recurring_expense_payment",
              referenceId: rec.id,
              sourceModule: "recurring_expenses",
              userId,
            },
            {
              tenantId: rec.tenantId,
              accountId: rec.paymentAccountId,
              branchId: effectiveBranchId,
              amount: totalAmount.toFixed(2),
              type: "credit" as const,
              transactionDate: run.scheduledDate,
              narration: `دفع — ${rec.name}`,
              lifecycleStatus: "posted" as const,
              referenceType: "recurring_expense_payment",
              referenceId: rec.id,
              sourceModule: "recurring_expenses",
              userId,
            },
          ];

          // Atomic: journal header + legs commit together (no orphan entries).
          const [payJe] = await db.transaction(async (tx: any) => {
            const [payEntry] = await tx
              .insert(journalEntries)
              .values({
                tenantId: rec.tenantId,
                branchId: effectiveBranchId,
                sourceModule: "recurring_expenses",
                sourceRefType: "recurring_expense_payment",
                sourceRefId: rec.id,
                referenceNo: `REC-PAY-${rec.id}-${run.runNumber}`,
                status: "posted",
                totalAmount: totalAmount.toFixed(2),
                createdById: userId,
                postedAt: new Date(),
              })
              .returning();

            for (const l of paymentLines) {
              await tx
                .insert(transactions)
                .values({ ...l, journalEntryId: payEntry.id });
            }
            return [payEntry];
          });

          paymentTransactionId = payJe.id;
        }
      }
    }

    // Update recurring expense
    await db
      .update(recurringExpenses)
      .set({
        occurrencesCount: rec.occurrencesCount + 1,
        lastRunAt: new Date(),
        lastRunStatus: "success",
        lastRunError: null,
      })
      .where(eq(recurringExpenses.id, rec.id));

    // Update run
    await db
      .update(recurringExpenseRuns)
      .set({
        status: "completed",
        executedDate: new Date(),
        journalEntryId,
        purchaseInvoiceId,
        paymentTransactionId,
        processedById: userId,
      })
      .where(eq(recurringExpenseRuns.id, run.id));

    // Schedule next run
    await scheduleNextRun(db, rec.id, rec.tenantId);

    // Check budget alerts
    if (rec.budgetId) {
      const [budget] = await db
        .select()
        .from(budgets)
        .where(eq(budgets.id, rec.budgetId))
        .limit(1);

      if (budget) {
        const targetExpense = parseFloat(budget.targetExpense);
        // Get current period expenses
        const periodStart = new Date();
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const periodExpenses = await db
          .select({ c: sql`sum(${transactions.amount})` })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(transactions.tenantId, rec.tenantId),
              eq(accounts.type, "expense"),
              gte(transactions.transactionDate, periodStart),
              lte(transactions.transactionDate, periodEnd),
              eq(transactions.isReversed, false)
            )
          );

        const currentExpense = parseFloat(periodExpenses[0]?.c || "0");
        const percentUsed =
          targetExpense > 0 ? (currentExpense / targetExpense) * 100 : 0;

        if (percentUsed >= 90) {
          await createNotification(db, {
            tenantId: rec.tenantId,
            userId: null,
            title: "تنبيه ميزانية",
            body: `تم تجاوز ${percentUsed.toFixed(0)}% من ميزانية المصروفات للفترة الحالية (${budget.periodName})`,
            link: "/reports",
            type: "budget_alert",
          });
        }
      }
    }
  } catch (error: any) {
    await db
      .update(recurringExpenseRuns)
      .set({
        status: "failed",
        errorMessage: error.message,
        executedDate: new Date(),
      })
      .where(eq(recurringExpenseRuns.id, run.id));

    await db
      .update(recurringExpenses)
      .set({
        lastRunAt: new Date(),
        lastRunStatus: "failed",
        lastRunError: error.message,
      })
      .where(eq(recurringExpenses.id, rec.id));

    // Notify admin of failure
    await createNotification(db, {
      tenantId: rec.tenantId,
      userId: null,
      title: "فشل تنفيذ مصروف دوري",
      body: `فشل تنفيذ "${rec.name}": ${error.message}`,
      link: "/recurring-expenses",
      type: "recurring_expense_failed",
    });
  }
}

/**
 * Main function to process all due recurring expenses for a tenant
 */
export interface RecurringExpenseResult {
  processed: number;
  failed: number;
  skipped: number;
}

export async function runRecurringExpenses(
  tenantId: number,
  userId: number | null = null
): Promise<RecurringExpenseResult> {
  const db = await getDb();
  if (!db) return { processed: 0, failed: 0, skipped: 0 };

  const now = new Date();

  // Find recurring expenses that are due
  const due = await db
    .select()
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.tenantId, tenantId),
        eq(recurringExpenses.status, "active"),
        eq(recurringExpenses.approvalStatus, "approved"),
        lte(recurringExpenses.nextRunAt, now)
      )
    );

  // Check if runs already exist for this period
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const rec of due) {
    // Check if run already exists for this scheduled date
    const existingRun = await db
      .select()
      .from(recurringExpenseRuns)
      .where(
        and(
          eq(recurringExpenseRuns.recurringExpenseId, rec.id),
          eq(recurringExpenseRuns.scheduledDate, rec.nextRunAt!)
        )
      )
      .limit(1);

    if (existingRun[0]) {
      skipped++;
      continue;
    }

    // Create run record
    const [run] = await db
      .insert(recurringExpenseRuns)
      .values({
        tenantId,
        recurringExpenseId: rec.id,
        runNumber: rec.occurrencesCount + 1,
        scheduledDate: rec.nextRunAt!,
        status: "pending",
        amount: "0",
        totalAmount: "0",
      })
      .returning();

    // Process the run
    await processRecurringExpenseRun(db, run, userId);

    // Check final status
    const [finalRun] = await db
      .select()
      .from(recurringExpenseRuns)
      .where(eq(recurringExpenseRuns.id, run.id))
      .limit(1);

    if (finalRun?.status === "completed") {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed, skipped };
}

/**
 * Generate upcoming runs for active recurring expenses (for preview/planning)
 */
export async function generateUpcomingRuns(
  tenantId: number,
  months: number = 12
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const active = await db
    .select()
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.tenantId, tenantId),
        eq(recurringExpenses.status, "active"),
        eq(recurringExpenses.approvalStatus, "approved")
      )
    );

  const until = new Date();
  until.setMonth(until.getMonth() + months);

  const upcoming: any[] = [];

  for (const rec of active) {
    let runDate = rec.nextRunAt
      ? new Date(rec.nextRunAt)
      : new Date(rec.startDate);
    let runNumber = rec.occurrencesCount + 1;

    while (
      runDate <= until &&
      (!rec.maxOccurrences || runNumber <= rec.maxOccurrences) &&
      (!rec.endDate || runDate <= new Date(rec.endDate))
    ) {
      upcoming.push({
        recurringExpenseId: rec.id,
        recurringExpenseName: rec.name,
        runNumber,
        scheduledDate: new Date(runDate),
        amount: parseFloat(rec.amount),
        taxAmount:
          Math.round(
            ((parseFloat(rec.amount) * parseFloat(rec.taxRate || "0")) / 100) *
              100
          ) / 100,
        totalAmount:
          parseFloat(rec.amount) +
          Math.round(
            ((parseFloat(rec.amount) * parseFloat(rec.taxRate || "0")) / 100) *
              100
          ) /
            100,
        frequency: rec.frequency,
      });

      runDate = calculateNextRunDate(
        runDate,
        rec.frequency,
        rec.dayOfMonth,
        rec.dayOfWeek,
        rec.weekOfMonth
      );
      runNumber++;
    }
  }

  return upcoming.sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
  );
}
