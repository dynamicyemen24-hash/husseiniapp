/**
 * client/src/lib/procurementReports.ts — Client-side procurement analytics
 * ========================================================================
 * Pure functions for computing procurement KPIs from local invoice snapshots.
 * Server-side authoritative implementations live in
 * `server/procurementReportsRouter.ts`. This module is used by:
 *   • Dashboard widgets (cached data, fast render)
 *   • Offline mode (IndexedDB)
 *   • Unit tests (no DB required)
 *
 * @module lib/procurementReports
 */

import { safeToNumber, roundTo } from "./numeric";

/* ─────────────────────────────────────────────────────────────────────────────
 *  TYPES
 * ───────────────────────────────────────────────────────────────────────────── */

export interface PurchaseInvoiceLike {
  id: number;
  supplierId?: number | null;
  invoiceDate: Date | string;
  total: string | number;
  paidAmount?: string | number | null;
  status?: string;
}

export interface SupplierPerformanceRow {
  supplierId: number;
  supplierName: string;
  totalSpend: number;
  totalInvoices: number;
  paidInvoices: number;
  totalPaid: number;
  outstanding: number;
  avgInvoiceValue: number;
  paidRatio: number;
  onTimePaymentRate: number;
}

export interface SpendByMonthRow {
  month: string; // "YYYY-MM"
  totalSpend: number;
  paidAmount: number;
  outstanding: number;
  invoiceCount: number;
}

export interface ProcurementSummary {
  totalSpend: number;
  totalInvoices: number;
  avgInvoiceValue: number;
  uniqueSuppliers: number;
  paidAmount: number;
  outstandingAmount: number;
  paidRatio: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

/** Active purchase invoice statuses (realised spend). */
const ACTIVE_STATUSES = new Set(["confirmed", "partial", "paid"]);

/** Floating-point tolerance. */
const EPSILON = 0.01;

/* ─────────────────────────────────────────────────────────────────────────────
 *  HELPERS
 * ───────────────────────────────────────────────────────────────────────────── */

function isActiveStatus(status: string | undefined | null): boolean {
  return !!status && ACTIVE_STATUSES.has(status);
}

/**
 * Get the year-month key from a date.
 */
function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!Number.isFinite(d.getTime())) return "0000-00";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  SUPPLIER PERFORMANCE
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Compute per-supplier performance metrics.
 *
 * @param invoices      Array of purchase invoices.
 * @param supplierMap   Map of supplierId → supplier name.
 * @param allSuppliers  Optional list of all suppliers (for zero-spend entries).
 */
export function computeSupplierPerformance(
  invoices: PurchaseInvoiceLike[] | null | undefined,
  supplierMap: Map<number, string>,
  allSuppliers?: Array<{ id: number; name: string }>
): SupplierPerformanceRow[] {
  const safe = Array.isArray(invoices) ? invoices : [];
  const agg = new Map<number, SupplierPerformanceRow>();

  for (const inv of safe) {
    if (!isActiveStatus(inv.status)) continue;
    const supplierId = inv.supplierId ?? 0;
    const total = safeToNumber(inv.total);
    const paid = safeToNumber(inv.paidAmount);
    const existing = agg.get(supplierId);

    if (existing) {
      existing.totalSpend += total;
      existing.totalInvoices++;
      existing.totalPaid += paid;
      existing.outstanding += Math.max(0, total - paid);
      if (paid >= total - EPSILON && total > EPSILON) existing.paidInvoices++;
    } else {
      agg.set(supplierId, {
        supplierId,
        supplierName: supplierMap.get(supplierId) ?? "مورد غير مُعرّف",
        totalSpend: total,
        totalInvoices: 1,
        paidInvoices: paid >= total - EPSILON && total > EPSILON ? 1 : 0,
        totalPaid: paid,
        outstanding: Math.max(0, total - paid),
        avgInvoiceValue: 0,
        paidRatio: 0,
        onTimePaymentRate: 0,
      });
    }
  }

  // Add zero-spend suppliers for completeness
  if (allSuppliers) {
    for (const s of allSuppliers) {
      if (!agg.has(s.id)) {
        agg.set(s.id, {
          supplierId: s.id,
          supplierName: s.name,
          totalSpend: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          totalPaid: 0,
          outstanding: 0,
          avgInvoiceValue: 0,
          paidRatio: 0,
          onTimePaymentRate: 0,
        });
      }
    }
  }

  return [...agg.values()]
    .map(r => ({
      ...r,
      totalSpend: roundTo(r.totalSpend),
      totalPaid: roundTo(r.totalPaid),
      outstanding: roundTo(r.outstanding),
      avgInvoiceValue:
        r.totalInvoices > 0 ? roundTo(r.totalSpend / r.totalInvoices) : 0,
      paidRatio:
        r.totalSpend > EPSILON
          ? roundTo((r.totalPaid / r.totalSpend) * 100, 1)
          : 0,
      onTimePaymentRate:
        r.totalInvoices > 0
          ? roundTo((r.paidInvoices / r.totalInvoices) * 100, 1)
          : 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  SPEND BY MONTH
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Aggregate total spend by calendar month.
 */
export function computeSpendByMonth(
  invoices: PurchaseInvoiceLike[] | null | undefined
): SpendByMonthRow[] {
  const safe = Array.isArray(invoices) ? invoices : [];
  const byMonth = new Map<string, SpendByMonthRow>();

  for (const inv of safe) {
    if (!isActiveStatus(inv.status)) continue;
    if (!inv.invoiceDate) continue;
    const key = monthKey(inv.invoiceDate);
    const total = safeToNumber(inv.total);
    const paid = safeToNumber(inv.paidAmount);
    const existing = byMonth.get(key);
    if (existing) {
      existing.totalSpend += total;
      existing.paidAmount += paid;
      existing.outstanding += Math.max(0, total - paid);
      existing.invoiceCount++;
    } else {
      byMonth.set(key, {
        month: key,
        totalSpend: total,
        paidAmount: paid,
        outstanding: Math.max(0, total - paid),
        invoiceCount: 1,
      });
    }
  }

  return [...byMonth.values()]
    .map(r => ({
      ...r,
      totalSpend: roundTo(r.totalSpend),
      paidAmount: roundTo(r.paidAmount),
      outstanding: roundTo(r.outstanding),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  SPEND BY SUPPLIER
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Aggregate spend by supplier and return top N (default 10).
 */
export function computeSpendBySupplier(
  invoices: PurchaseInvoiceLike[] | null | undefined,
  supplierMap: Map<number, string>,
  limit: number = 10
): Array<{
  supplierId: number;
  supplierName: string;
  totalSpend: number;
  share: number;
}> {
  const safe = Array.isArray(invoices) ? invoices : [];
  const totals = new Map<number, number>();
  let grandTotal = 0;

  for (const inv of safe) {
    if (!isActiveStatus(inv.status)) continue;
    const id = inv.supplierId ?? 0;
    const v = safeToNumber(inv.total);
    totals.set(id, (totals.get(id) ?? 0) + v);
    grandTotal += v;
  }

  return [...totals.entries()]
    .map(([id, v]) => ({
      supplierId: id,
      supplierName: supplierMap.get(id) ?? "مورد غير مُعرّف",
      totalSpend: roundTo(v),
      share: grandTotal > EPSILON ? roundTo((v / grandTotal) * 100, 1) : 0,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  PROCUREMENT SUMMARY
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * High-level procurement KPIs: total spend, invoice count, supplier count,
 * paid ratio, outstanding.
 */
export function computeProcurementSummary(
  invoices: PurchaseInvoiceLike[] | null | undefined
): ProcurementSummary {
  const safe = Array.isArray(invoices) ? invoices : [];
  let totalSpend = 0,
    totalPaid = 0;
  const supplierIds = new Set<number>();

  for (const inv of safe) {
    if (!isActiveStatus(inv.status)) continue;
    const total = safeToNumber(inv.total);
    const paid = safeToNumber(inv.paidAmount);
    totalSpend += total;
    totalPaid += paid;
    if (inv.supplierId != null) supplierIds.add(inv.supplierId);
  }

  const totalInvoices = safe.filter(i => isActiveStatus(i.status)).length;
  return {
    totalSpend: roundTo(totalSpend),
    totalInvoices,
    avgInvoiceValue:
      totalInvoices > 0 ? roundTo(totalSpend / totalInvoices) : 0,
    uniqueSuppliers: supplierIds.size,
    paidAmount: roundTo(totalPaid),
    outstandingAmount: roundTo(totalSpend - totalPaid),
    paidRatio:
      totalSpend > EPSILON ? roundTo((totalPaid / totalSpend) * 100, 1) : 0,
  };
}
