/**
 * client/src/lib/debtReports.ts — Client-side debt report helpers
 * =================================================================
 * Pure functions used by the dashboard and offline previews to compute
 * debt/aging analytics from local snapshots of invoices + payments.
 *
 * Server-side authoritative implementations live in
 * `server/debtReportsRouter.ts`. This module exists for:
 *   • Component-level rendering with cached data
 *   • Unit tests (no DB required)
 *   • Offline mode (IndexedDB snapshots)
 *
 * @module lib/debtReports
 */

import { safeToNumber, approximatelyEqual, roundTo } from "./numeric";

/* ─────────────────────────────────────────────────────────────────────────────
 *  TYPES
 * ───────────────────────────────────────────────────────────────────────────── */

export type DebtBucket = "current" | "d30" | "d60" | "d90" | "over90";

export interface InvoiceLike {
  id: number;
  invoiceNumber?: string | null;
  customerId?: number | null;
  supplierId?: number | null;
  invoiceDate: Date | string;
  dueDate?: Date | string | null;
  total: string | number;
  paidAmount?: string | number | null;
}

export interface AgingRow {
  invoiceId: number;
  invoiceNumber: string;
  partyId: number;
  partyName: string;
  invoiceDate: Date;
  dueDate: Date;
  total: number;
  paidAmount: number;
  outstanding: number;
  bucket: DebtBucket;
  daysPastDue: number;
}

export interface AgingResult {
  rows: AgingRow[];
  byParty: Array<{
    partyId: number;
    name: string;
    outstanding: number;
    invoices: number;
  }>;
  byBucket: Record<DebtBucket, number>;
  summary: {
    totalOutstanding: number;
    totalInvoices: number;
    avgDaysPastDue: number;
  };
}

export interface DebtSummary {
  ar: {
    total: number;
    invoices: number;
    overdueInvoices: number;
    overdueAmount: number;
  };
  ap: {
    total: number;
    invoices: number;
    overdueInvoices: number;
    overdueAmount: number;
  };
  netDebt: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

/** Tolerance for "fully paid" check. */
const EPSILON = 0.01;

/**
 * Assign a bucket label based on days past due.
 * Buckets: current (≤0), d30 (1–30), d60 (31–60), d90 (61–90), over90 (>90)
 */
export function bucketOf(daysPastDue: number): DebtBucket {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "d30";
  if (daysPastDue <= 60) return "d60";
  if (daysPastDue <= 90) return "d90";
  return "over90";
}

/**
 * Days past due (asOf - dueDate), floored at 0.
 * Defensive against invalid dates.
 */
export function daysPastDue(asOf: Date, dueDate: Date): number {
  if (!Number.isFinite(asOf.getTime()) || !Number.isFinite(dueDate.getTime()))
    return 0;
  return Math.max(
    0,
    Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000)
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  AR AGING (Accounts Receivable)
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Compute AR aging from a list of sales invoices.
 * Only invoices with `outstanding > EPSILON` are included.
 *
 * @param invoices  Array of sales invoice objects.
 * @param partyMap  Map of customerId → customer name.
 * @param asOf      Cutoff date (defaults to today).
 */
export function computeAging(
  invoices: InvoiceLike[] | null | undefined,
  partyMap: Map<number, string>,
  asOf: Date = new Date(),
  partyKey: "customerId" | "supplierId" = "customerId"
): AgingResult {
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const byBucket: Record<DebtBucket, number> = {
    current: 0,
    d30: 0,
    d60: 0,
    d90: 0,
    over90: 0,
  };
  const byPartyMap = new Map<
    number,
    { name: string; outstanding: number; invoices: number }
  >();
  let totalOutstanding = 0;
  let totalDaysPastDue = 0;
  let overdueCount = 0;

  const rows: AgingRow[] = [];

  // Sort invoices by outstanding descending so highest-value rows appear first.
  const sortedInvoices = [...safeInvoices].sort((a, b) => {
    const aOut = Math.max(
      0,
      safeToNumber(a.total) - safeToNumber(a.paidAmount)
    );
    const bOut = Math.max(
      0,
      safeToNumber(b.total) - safeToNumber(b.paidAmount)
    );
    return bOut - aOut;
  });

  for (const inv of sortedInvoices) {
    const total = safeToNumber(inv.total);
    const paid = safeToNumber(inv.paidAmount);
    const outstanding = Math.max(0, total - paid);
    if (outstanding < EPSILON) continue; // skip fully paid

    const dueDate = inv.dueDate
      ? new Date(inv.dueDate)
      : new Date(inv.invoiceDate);
    const invoiceDate = new Date(inv.invoiceDate);
    const dpd = daysPastDue(asOf, dueDate);
    const bucket = bucketOf(dpd);

    byBucket[bucket] += outstanding;
    totalOutstanding += outstanding;

    if (dpd > 0) {
      totalDaysPastDue += dpd;
      overdueCount++;
    }

    const partyId = (inv as any)[partyKey] ?? 0;
    const partyName = partyMap.get(partyId) ?? "غير مُعرّف";
    const existing = byPartyMap.get(partyId);
    if (existing) {
      existing.outstanding += outstanding;
      existing.invoices++;
    } else {
      byPartyMap.set(partyId, { name: partyName, outstanding, invoices: 1 });
    }

    rows.push({
      invoiceId: inv.id,
      invoiceNumber:
        inv.invoiceNumber ??
        `${partyKey === "customerId" ? "INV" : "PI"}-${inv.id}`,
      partyId,
      partyName,
      invoiceDate,
      dueDate,
      total,
      paidAmount: paid,
      outstanding,
      bucket,
      daysPastDue: dpd,
    });
  }

  const byParty = [...byPartyMap.entries()]
    .map(([partyId, v]) => ({ partyId, ...v }))
    .sort((a, b) => b.outstanding - a.outstanding);

  const summary = {
    totalOutstanding,
    totalInvoices: rows.length,
    avgDaysPastDue:
      overdueCount > 0 ? Math.round(totalDaysPastDue / overdueCount) : 0,
  };

  return { rows, byParty, byBucket, summary };
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  DEBT SUMMARY
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Compute a high-level debt summary from invoice arrays.
 * Returns total AR, total AP, overdue counts and amounts, and net debt.
 */
export function computeDebtSummary(
  arInvoices: InvoiceLike[] | null | undefined,
  apInvoices: InvoiceLike[] | null | undefined,
  asOf: Date = new Date()
): DebtSummary {
  const safe = (list: InvoiceLike[] | null | undefined) =>
    Array.isArray(list) ? list : [];

  let arTotal = 0,
    arOverdueAmount = 0,
    arOverdueInvoices = 0;
  for (const inv of safe(arInvoices)) {
    const outstanding = Math.max(
      0,
      safeToNumber(inv.total) - safeToNumber(inv.paidAmount)
    );
    arTotal += outstanding;
    const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
    const dpd = daysPastDue(asOf, due);
    if (dpd > 0 && outstanding > EPSILON) {
      arOverdueAmount += outstanding;
      arOverdueInvoices++;
    }
  }

  let apTotal = 0,
    apOverdueAmount = 0,
    apOverdueInvoices = 0;
  for (const inv of safe(apInvoices)) {
    const outstanding = Math.max(
      0,
      safeToNumber(inv.total) - safeToNumber(inv.paidAmount)
    );
    apTotal += outstanding;
    const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
    const dpd = daysPastDue(asOf, due);
    if (dpd > 0 && outstanding > EPSILON) {
      apOverdueAmount += outstanding;
      apOverdueInvoices++;
    }
  }

  return {
    ar: {
      total: arTotal,
      invoices: safe(arInvoices).length,
      overdueInvoices: arOverdueInvoices,
      overdueAmount: arOverdueAmount,
    },
    ap: {
      total: apTotal,
      invoices: safe(apInvoices).length,
      overdueInvoices: apOverdueInvoices,
      overdueAmount: apOverdueAmount,
    },
    netDebt: roundTo(arTotal - apTotal),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  DSO / DPO METRICS
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Days Sales Outstanding = (AR / Credit Sales per Day)
 * Measures collection efficiency. Lower is better.
 */
export function computeDSO(
  totalReceivables: number,
  creditSales: number,
  daysInPeriod: number
): number {
  if (daysInPeriod <= 0) return 0;
  const salesPerDay = creditSales / daysInPeriod;
  if (salesPerDay < EPSILON) return 0;
  return Math.round((totalReceivables / salesPerDay) * 10) / 10;
}

/**
 * Days Payable Outstanding = (AP / Purchases per Day)
 * Measures payment cycle. Higher means longer you hold cash.
 */
export function computeDPO(
  totalPayables: number,
  purchases: number,
  daysInPeriod: number
): number {
  if (daysInPeriod <= 0) return 0;
  const purchPerDay = purchases / daysInPeriod;
  if (purchPerDay < EPSILON) return 0;
  return Math.round((totalPayables / purchPerDay) * 10) / 10;
}

/**
 * Cash Conversion Cycle = DSO - DPO
 * Negative is good (you collect faster than you pay).
 */
export function cashConversionCycle(dso: number, dpo: number): number {
  return Math.round((dso - dpo) * 10) / 10;
}
