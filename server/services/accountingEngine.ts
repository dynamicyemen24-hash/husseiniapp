/**
 * server/services/accountingEngine.ts — Central Accounting Engine (Domain Service)
 *
 * The single, authoritative double-entry posting engine for the platform.
 * Every balanced journal must flow through here so the "Dr == Cr" invariant and
 * fiscal-period locking are enforced in ONE place (ISO 25010 maintainability),
 * instead of being scattered across routers and only partially applied.
 *
 * Responsibilities:
 *   1. Validate a journal is balanced (≥2 legs, ΣDr == ΣCr within tolerance).
 *   2. Gate posting against locked/closed fiscal periods (default: permit when no
 *      fiscal period row exists — forward compatible, never blocks old data).
 *   3. Create a balanced journal entry + its transaction legs atomically, with
 *      immutability enforced once posted.
 *   4. Produce a REAL reversing journal (mirrored, negative) instead of merely
 *      flipping an `isReversed` flag — preserving the audit trail.
 *
 * The engine is deliberately NON-destructive: existing routings (postInvoiceGlEntries,
 * postPaymentGlEntries, createManualJournalEntry) remain untouched. This service is
 * additive infra new features (fixed assets, allocations, revaluation, corrections,
 * accruals, closing) can lean on.
 */
import { eq, and, desc, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { validateOrThrow, validateBalance, validateReversal, validateBalance as validateBalanceNew } from "./doubleEntryValidator";
import {
  journalEntries,
  transactions,
  branches,
  fiscalPeriods,
  accounts,
} from "../../drizzle/schema";

type Db = any;

export type JournalLeg = {
  accountId: number;
  type: "debit" | "credit";
  amount: string | number;
  narration?: string | null;
  costCenterId?: number | null;
  currencyId?: number | null;
  exchangeRate?: string | number | null;
  baseAmount?: string | number | null;
};

export type PostJournalOptions = {
  tenantId: number;
  date: Date;
  legs: JournalLeg[];
  narration: string;
  referenceNo?: string;
  branchId?: number | null;
  /** Analytical dimension — applied to legs that don't override it. */
  costCenterId?: number | null;
  sourceModule?: string;
  sourceRefType?: string;
  sourceRefId?: number | null;
  createdById?: number | null;
  status?: "saved" | "approved" | "posted";
  /** When false, a draft/saved journal may be unbalanced on purpose (e.g. temp). */
  requireBalanced?: boolean;
};

const MAX_REVERSE_NARRATION = 500;

/** Fiscal period statuses that prevent posting into the covered date range. */
export const LOCKED_PERIOD_STATUSES = ["closing", "closed"] as const;

export type FiscalPeriodLike = {
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
};

/**
 * Pure check: does a fiscal period row cover a given date?
 * (Range-based — the previous implementation matched `startDate` exactly,
 * which rendered period locking ineffective.)
 */
export function fiscalPeriodCoversDate(
  period: FiscalPeriodLike,
  date: Date
): boolean {
  const t = date.getTime();
  const start = new Date(period.startDate).getTime();
  const end = new Date(period.endDate).getTime();
  if (Number.isNaN(t) || Number.isNaN(start) || Number.isNaN(end)) return false;
  // Normalize to day boundaries so a period covering 2026-01-01..2026-12-31
  // also accepts timestamps inside 2026-12-31 (any time of day).
  const dayStart = new Date(period.startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(period.endDate);
  dayEnd.setHours(23, 59, 59, 999);
  return t >= dayStart.getTime() && t <= dayEnd.getTime();
}

/** Pure check: is a fiscal period status locked against posting? */
export function isLockedPeriodStatus(status: string): boolean {
  return (LOCKED_PERIOD_STATUSES as readonly string[]).includes(status);
}

/**
 * Returns the LOCKED fiscal period covering a date (if any), or null when the
 * date is open/uncovered. Pure-DB helper shared by the engine and routers.
 */
export async function findLockedPeriodForDate(
  db: Db,
  tenantId: number,
  date: Date
): Promise<FiscalPeriodLike | null> {
  if (!db || !tenantId) return null;
  const rows = (await db
    .select({
      name: fiscalPeriods.name,
      status: fiscalPeriods.status,
      startDate: fiscalPeriods.startDate,
      endDate: fiscalPeriods.endDate,
    })
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.tenantId, tenantId))) as FiscalPeriodLike[];
  for (const p of rows) {
    if (isLockedPeriodStatus(p.status) && fiscalPeriodCoversDate(p, date)) {
      return p;
    }
  }
  return null;
}

/** True when the date falls inside a locked (closing/closed) fiscal period.
 * Fail-closed: a DB error propagates (never returns false) so callers that
 * gate postings via assertPeriodOpen-style checks cannot treat an
 * unverifiable period as open. */
export async function isPeriodLockedForDate(
  db: Db,
  tenantId: number,
  date: Date
): Promise<boolean> {
  return (await findLockedPeriodForDate(db, tenantId, date)) != null;
}

/**
 * Throws if the date falls inside a CLOSED or CLOSING fiscal period for the tenant.
 * If no fiscal_period row covers the date, the posting is allowed (back-compat).
 */
export async function assertPeriodOpen(
  db: Db,
  tenantId: number,
  date: Date,
  context?: string
): Promise<void> {
  if (!db || !tenantId) return;
  try {
    const locked = await findLockedPeriodForDate(db, tenantId, date);
    if (locked) {
      throw new Error(
        `الفترة المالية "${locked.name}" ${context ? `(${context})` : ""} مغلقة — لا يمكن الترحيل إليها`
      );
    }
  } catch (e) {
    if (e instanceof Error && /مغلقة/.test(e.message)) throw e;
    // Fail-closed: a DB error during period verification must NOT permit
    // posting into a possibly locked period. Block the posting instead.
    throw new Error(
      `تعذر التحقق من حالة الفترة المالية ${context ? `(${context})` : ""} — تم إيقاف الترحيل للسلامة، حاول مرة أخرى`,
      { cause: e }
    );
  }
}

/** Applies balance validation to a leg set, throwing a descriptive error. */
function assertLegs(
  legs: JournalLeg[],
  requireBalanced: boolean,
  context?: string
): void {
  if (legs.length < 2) {
    throw new Error("القيد يحتاج حركتين على الأقل (مدين ودائن)");
  }
  for (const l of legs) {
    if (!l.accountId) throw new Error("كل حركة قيد تتطلب حساباً");
    const n = parseFloat(String(l.amount));
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("المبلغ يجب أن يكون رقماً موجباً صحيحاً");
    }
  }
  if (requireBalanced) {
    validateOrThrow(
      legs.map(l => ({ type: l.type, amount: l.amount })),
      context
    );
  }
}

async function resolveBranch(
  db: Db,
  tenantId: number,
  branchId?: number | null
): Promise<number | null> {
  if (branchId) return branchId;
  const rows = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.tenantId, tenantId))
    .orderBy(desc(branches.isMain))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Creates a balanced journal entry plus its legs atomically.
 * If `status === "posted"`, posts directly and marks the entry immutable.
 * Otherwise creates an unbalanced-permitted draft (requireBalanced=false).
 *
 * CRITICAL: Period check is now INSIDE the transaction to prevent race conditions
 * where period is closed between check and insert.
 */
export async function postBalancedJournal(
  db: Db,
  opts: PostJournalOptions
): Promise<{ journalId: number; total: number; count: number }> {
  if (!db) throw new Error("Database not available");
  return db.transaction((tx: Db) => postBalancedJournalInTx(tx, opts));
}

/**
 * نفس منطق `postBalancedJournal` لكنه يتوقّع معاملة مفتوحة مسبقاً (tx).
 *
 * السبب:Transactions المتداخلة في neon-serverless لا تُنتج SAVEPOINT —
 * الـ BEGIN الداخلي يُهمَل والـ COMMIT الداخلي يُنهي المعاملة الخارجية. لذلك
 * أي عملية تحتاج ذرّية مع ترحيل قيد تستدعي هذه الدالة داخل معاملتها الخاصة
 * بدل استدعاء `postBalancedJournal` من داخل معاملة.
 */
export async function postBalancedJournalInTx(
  tx: Db,
  opts: PostJournalOptions
): Promise<{ journalId: number; total: number; count: number }> {
  if (!tx) throw new Error("Database not available");
  const requireBalanced = opts.requireBalanced !== false;
  const finalStatus = opts.status || "posted";
  const postImmediately = finalStatus === "posted";

  assertLegs(opts.legs, requireBalanced, opts.narration);

  // Deep engineering: account existence + active + baseAmount auto-calc (multi-currency)
  const accountIds = [...new Set(opts.legs.map(l => l.accountId))];
  if (accountIds.length > 0) {
    const accRows = (await tx
      .select({
        id: accounts.id,
        code: accounts.code,
        isActive: accounts.isActive,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, opts.tenantId),
          inArray(accounts.id, accountIds)
        )
      )) as Array<{ id: number; code: string; isActive: boolean | null }>;
    const accMap = new Map(accRows.map(r => [r.id, r]));
    for (const l of opts.legs) {
      const acc = accMap.get(l.accountId);
      if (!acc)
        throw new Error(`الحساب ${l.accountId} غير موجود في دليل المؤسسة`);
      if (acc.isActive === false)
        throw new Error(`الحساب ${acc.code} موقوف — لا يمكن الترحيل إليه`);
      if (
        l.baseAmount == null &&
        l.currencyId != null &&
        l.exchangeRate != null
      ) {
        const rate = parseFloat(String(l.exchangeRate));
        const amt = parseFloat(String(l.amount));
        if (Number.isFinite(rate) && Number.isFinite(amt))
          (l as any).baseAmount = (amt * rate).toFixed(2);
      }
    }
  }

  const effectiveBranchId = await resolveBranch(
    tx,
    opts.tenantId,
    opts.branchId
  );
  const total = opts.legs.reduce((s, l) => s + parseFloat(String(l.amount)), 0);

  // CRITICAL: Period check INSIDE transaction with row-level lock
  // This prevents race condition where period is closed between check and insert
  if (postImmediately) {
    const lockedPeriod = await tx
      .select({
        name: fiscalPeriods.name,
        status: fiscalPeriods.status,
        startDate: fiscalPeriods.startDate,
        endDate: fiscalPeriods.endDate,
      })
      .from(fiscalPeriods)
      .where(eq(fiscalPeriods.tenantId, opts.tenantId))
      .forUpdate(); // Row-level lock on fiscal periods

    for (const p of lockedPeriod) {
      if (
        isLockedPeriodStatus(p.status) &&
        fiscalPeriodCoversDate(p, opts.date)
      ) {
        throw new Error(
          `الفترة المالية "${p.name}" ${opts.narration ? `(${opts.narration})` : ""} مغلقة — لا يمكن الترحيل إليها`
        );
      }
    }
  }

  const [entry] = await tx
    .insert(journalEntries)
    .values({
      tenantId: opts.tenantId,
      branchId: effectiveBranchId,
      sourceModule: opts.sourceModule || opts.sourceRefType || "manual",
      sourceRefType: opts.sourceRefType || null,
      sourceRefId: opts.sourceRefId ?? null,
      referenceNo: opts.referenceNo || null,
      status: finalStatus,
      totalAmount: total.toFixed(2),
      memo: opts.narration,
      createdById: opts.createdById ?? null,
      postedAt: postImmediately ? new Date() : null,
      isImmutable: postImmediately,
    })
    .returning();

  for (const l of opts.legs) {
    await tx.insert(transactions).values({
      tenantId: opts.tenantId,
      accountId: l.accountId,
      branchId: effectiveBranchId,
      amount: l.amount,
      type: l.type,
      transactionDate: opts.date,
      narration: l.narration || opts.narration,
      lifecycleStatus: finalStatus,
      isReversed: false,
      referenceType: opts.sourceRefType || null,
      referenceId: opts.sourceRefId ?? null,
      sourceModule: opts.sourceModule || opts.sourceRefType || "manual",
      userId: opts.createdById ?? null,
      journalEntryId: entry.id,
      costCenterId: l.costCenterId ?? opts.costCenterId ?? null,
      currencyId: l.currencyId ?? null,
      exchangeRate: l.exchangeRate != null ? l.exchangeRate : undefined,
      baseAmount: l.baseAmount != null ? l.baseAmount : undefined,
    });
  }

  return { journalId: entry.id, total, count: opts.legs.length };
}

export type ReverseJournalOptions = {
  tenantId: number;
  journalId: number;
  reversalDate?: Date;
  reason: string;
  createdById?: number | null;
  branchId?: number | null;
};

/**
 * Creates a REAL reversing journal: reads the original legs and posts a mirrored
 * entry (debit <-> credit swapped, same amounts) so the net effect is zeroed.
 * The original entry is left immutable; the reversal becomes the new, auditable
 * source of truth. Returns the new journal id.
 */
export async function reverseJournal(
  db: Db,
  opts: ReverseJournalOptions
): Promise<{ journalId: number; reversedLegs: number }> {
  if (!db) throw new Error("Database not available");

  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.id, opts.journalId),
        eq(journalEntries.tenantId, opts.tenantId)
      )
    )
    .limit(1);
  if (entries.length === 0) throw new Error("القيد غير موجود");

  const je = entries[0];
  if (je.isImmutable && je.status === "posted") {
    // Allowed: reversal is the designed path for immutable posted entries.
  }

  const legs = (await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, opts.tenantId),
        eq(transactions.journalEntryId, opts.journalId)
      )
    )
    .orderBy(
      transactions.id
    )) as unknown as (typeof transactions.$inferSelect)[];

  if (legs.length < 2) {
    throw new Error("لا يمكن عكس قيد بدون أطراف قابلة للعكس");
  }

  const reverseLegs: JournalLeg[] = legs.map(l => ({
    accountId: l.accountId,
    type: l.type === "debit" ? "credit" : "debit",
    amount: l.amount,
    narration: l.narration || opts.reason,
    costCenterId: l.costCenterId ?? null,
    currencyId: l.currencyId ?? null,
    exchangeRate: l.exchangeRate != null ? l.exchangeRate : undefined,
    baseAmount: l.baseAmount != null ? l.baseAmount : undefined,
  }));

  const reason = opts.reason.slice(0, MAX_REVERSE_NARRATION);
  const result = await db.transaction(async (tx: Db) => {
    const created = await postBalancedJournalInTx(tx, {
      tenantId: opts.tenantId,
      date: opts.reversalDate || new Date(),
      legs: reverseLegs,
      narration: `عكس القيد #${opts.journalId} — ${reason}`,
      branchId: opts.branchId ?? je.branchId ?? null,
      sourceModule: "reversal",
      sourceRefType: "reversal",
      sourceRefId: opts.journalId,
      createdById: opts.createdById ?? null,
    });

    await tx
      .update(transactions)
      .set({ isReversed: true, reversalReason: reason })
      .where(
        and(
          eq(transactions.journalEntryId, je.id),
          eq(transactions.tenantId, opts.tenantId)
        )
      );

    return created;
  });

  return { journalId: result.journalId, reversedLegs: legs.length };
}
