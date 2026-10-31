/**
 * Universal Quotation Pricing Engine — محرك التسعير الشامل
 * ─────────────────────────────────────────────────────────
 * Pure functions (no DB, no I/O) — Industry-Agnostic / Configuration-Driven.
 * Supports: products, services, projects, subscriptions, production,
 * distribution and any activity kind via `kind` + free-form `config`.
 *
 * Pricing pipeline per line:
 *   gross = qty × unitPrice → item discount → net → tax → lineTotal
 * Document: subtotal → header discount → taxes → commissions → grandTotal
 * Costs & margins tracked in parallel for intelligence (fair value, benchmarks).
 */

export interface QuotationLineInput {
  kind: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discountPct?: number; // 0..100
  discountAmount?: number; // fixed, applied after pct
  taxPct?: number; // >= 0
  config?: Record<string, unknown>;
}

export interface QuotationPartyInput {
  role: string;
  commissionPct?: number; // 0..100 of net
  commissionAmount?: number; // fixed
}

export interface QuotationDocInput {
  lines: QuotationLineInput[];
  headerDiscountPct?: number; // 0..100 on subtotal
  headerDiscountAmount?: number; // fixed on subtotal
  headerTaxPct?: number; // fallback when lines carry no tax
  parties?: QuotationPartyInput[];
  currencyRate?: number; // to base currency, must be > 0
}

export interface ComputedLine {
  gross: number;
  discount: number;
  net: number;
  tax: number;
  lineTotal: number;
  lineCost: number;
  lineMargin: number;
  lineMarginPct: number;
}

export interface ComputedDocument {
  lines: ComputedLine[];
  subtotal: number;
  discountTotal: number;
  taxableBase: number;
  taxTotal: number;
  commissionTotal: number;
  grandTotal: number;
  baseTotal: number; // grandTotal × currencyRate
  costTotal: number;
  marginTotal: number;
  marginPct: number;
}

export interface PricingIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  lineIndex?: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function computeLine(input: QuotationLineInput): ComputedLine {
  const qty = Math.max(0, input.quantity || 0);
  const price = Math.max(0, input.unitPrice || 0);
  const cost = Math.max(0, input.costPrice || 0);
  const gross = round2(qty * price);
  const pct = clamp(input.discountPct ?? 0, 0, 100);
  const pctDisc = round2((gross * pct) / 100);
  const fixedDisc = round2(
    Math.min(
      Math.max(0, input.discountAmount || 0),
      Math.max(0, gross - pctDisc)
    )
  );
  const discount = round2(pctDisc + fixedDisc);
  const net = round2(Math.max(0, gross - discount));
  const taxPct = Math.max(0, input.taxPct ?? 0);
  const tax = round2((net * taxPct) / 100);
  const lineTotal = round2(net + tax);
  const lineCost = round2(qty * cost);
  const lineMargin = round2(net - lineCost);
  const lineMarginPct = net > 0 ? round2((lineMargin / net) * 100) : 0;
  return {
    gross,
    discount,
    net,
    tax,
    lineTotal,
    lineCost,
    lineMargin,
    lineMarginPct,
  };
}

export function computeDocument(input: QuotationDocInput): ComputedDocument {
  const rate =
    input.currencyRate && input.currencyRate > 0 ? input.currencyRate : 1;
  const lines = input.lines.map(computeLine);
  const subtotal = round2(lines.reduce((s, l) => s + l.net, 0));
  const lineTax = round2(lines.reduce((s, l) => s + l.tax, 0));

  const hPct = clamp(input.headerDiscountPct ?? 0, 0, 100);
  const hPctDisc = round2((subtotal * hPct) / 100);
  const hFixed = round2(
    Math.min(
      Math.max(0, input.headerDiscountAmount || 0),
      Math.max(0, subtotal - hPctDisc)
    )
  );
  const lineDiscounts = round2(lines.reduce((s, l) => s + l.discount, 0));
  const discountTotal = round2(lineDiscounts + hPctDisc + hFixed);
  const taxableBase = round2(Math.max(0, subtotal - hPctDisc - hFixed));
  // Header tax fallback only when no line carries tax (configuration-driven policy)
  const headerTax =
    lineTax === 0
      ? round2((taxableBase * Math.max(0, input.headerTaxPct ?? 0)) / 100)
      : 0;
  const taxTotal = round2(lineTax + headerTax);

  const netAfterHeader = taxableBase;
  let commissionTotal = 0;
  for (const p of input.parties ?? []) {
    const pct = clamp(p.commissionPct ?? 0, 0, 100);
    commissionTotal +=
      round2((netAfterHeader * pct) / 100) +
      round2(Math.max(0, p.commissionAmount || 0));
  }
  commissionTotal = round2(commissionTotal);

  const grandTotal = round2(netAfterHeader + taxTotal);
  const baseTotal = round2(grandTotal * rate);
  const costTotal = round2(lines.reduce((s, l) => s + l.lineCost, 0));
  const marginTotal = round2(netAfterHeader - costTotal);
  const marginPct =
    netAfterHeader > 0 ? round2((marginTotal / netAfterHeader) * 100) : 0;

  return {
    lines,
    subtotal,
    discountTotal,
    taxableBase,
    taxTotal,
    commissionTotal,
    grandTotal,
    baseTotal,
    costTotal,
    marginTotal,
    marginPct,
  };
}

/** Validate a quotation document — returns errors (blocking) and warnings (advisory). */
export function validateDocument(input: QuotationDocInput): PricingIssue[] {
  const issues: PricingIssue[] = [];
  if (!input.lines || input.lines.length === 0) {
    issues.push({
      code: "EMPTY_LINES",
      severity: "error",
      message: "العرض بدون بنود — أضف بنداً واحداً على الأقل",
    });
    return issues;
  }
  input.lines.forEach((l, i) => {
    if (!(l.quantity > 0))
      issues.push({
        code: "BAD_QTY",
        severity: "error",
        message: `البند ${i + 1}: الكمية يجب أن تكون أكبر من صفر`,
        lineIndex: i,
      });
    if ((l.unitPrice ?? 0) < 0)
      issues.push({
        code: "NEG_PRICE",
        severity: "error",
        message: `البند ${i + 1}: السعر سالب`,
        lineIndex: i,
      });
    if ((l.discountPct ?? 0) > 50)
      issues.push({
        code: "HIGH_DISCOUNT",
        severity: "warning",
        message: `البند ${i + 1}: خصم مرتفع (${l.discountPct}%) — تحقق من الهامش`,
        lineIndex: i,
      });
    if ((l.costPrice ?? 0) > 0 && (l.costPrice ?? 0) > (l.unitPrice ?? 0))
      issues.push({
        code: "NEG_MARGIN",
        severity: "warning",
        message: `البند ${i + 1}: التكلفة أعلى من السعر — هامش سالب`,
        lineIndex: i,
      });
  });
  const doc = computeDocument(input);
  if (doc.marginPct < 0)
    issues.push({
      code: "DOC_NEG_MARGIN",
      severity: "warning",
      message: `إجمالي الهامش سالب (${doc.marginPct}%)`,
    });
  else if (doc.marginPct < 5)
    issues.push({
      code: "LOW_MARGIN",
      severity: "warning",
      message: `هامش منخفض (${doc.marginPct}%) — راجع التسعير`,
    });
  if ((input.currencyRate ?? 1) <= 0)
    issues.push({
      code: "BAD_FX",
      severity: "error",
      message: "سعر الصرف يجب أن يكون أكبر من صفر",
    });
  return issues;
}

/** Apply a what-if delta to a document and recompute (simulation primitive). */
export function simulateWhatIf(
  input: QuotationDocInput,
  delta: {
    discountPctDelta?: number;
    taxPctDelta?: number;
    fxDelta?: number;
    costDeltaPct?: number;
  }
): ComputedDocument {
  const bumped: QuotationDocInput = {
    ...input,
    headerDiscountPct:
      (input.headerDiscountPct ?? 0) + (delta.discountPctDelta ?? 0),
    headerTaxPct: Math.max(
      0,
      (input.headerTaxPct ?? 0) + (delta.taxPctDelta ?? 0)
    ),
    currencyRate: Math.max(
      0.000001,
      (input.currencyRate ?? 1) + (delta.fxDelta ?? 0)
    ),
    lines: input.lines.map(l => ({
      ...l,
      costPrice: Math.max(
        0,
        (l.costPrice ?? 0) * (1 + (delta.costDeltaPct ?? 0) / 100)
      ),
    })),
  };
  return computeDocument(bumped);
}
