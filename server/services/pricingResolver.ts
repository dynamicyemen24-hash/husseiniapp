/**
 * server/services/pricingResolver.ts
 * ----------------------------------
 * Pure, deterministic price resolution from the flexible price list
 * (`product_price_lists`) — no DB, no I/O, fully unit-testable.
 *
 * A product can carry many price rows scoped by:
 *   unitId + branchId + warehouseId + countryCode + priceType + effective window
 *
 * Resolution picks the MOST SPECIFIC still-valid row:
 *   unit match (8) > branch match (4) > warehouse match (2) > country match (1)
 * A NULL scope field on the row means "applies to everything" (0 points).
 * Ties break on the most recent `effectiveFrom`, then highest row id.
 */

export type PriceType = "sale" | "purchase" | "wholesale";

export interface PriceListRow {
  id: number;
  productId: number;
  branchId?: number | null;
  warehouseId?: number | null;
  countryCode?: string | null;
  unitId?: number | null;
  priceType: string;
  price: string | number;
  discountPct?: string | number | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  isActive?: boolean;
}

export interface PriceScope {
  branchId?: number | null;
  warehouseId?: number | null;
  countryCode?: string | null;
  unitId?: number | null;
}

export type PriceMatchKind =
  | "unit+branch+warehouse+country"
  | "unit+branch+warehouse"
  | "unit+branch"
  | "unit"
  | "branch+warehouse+country"
  | "branch+warehouse"
  | "branch"
  | "warehouse"
  | "country"
  | "default"
  | "none";

export interface ResolvedPrice {
  price: number;
  discountPct: number;
  /** How the row matched — for audit/UX transparency. */
  matchedBy: PriceMatchKind;
  rowId?: number;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Points contributed by one numeric scope dimension. */
function dimScore(
  rowVal: number | null | undefined,
  scopeVal: number | null | undefined,
  weight: number
): number {
  if (rowVal == null) return 0; // row applies to everything
  if (scopeVal != null && rowVal === scopeVal) return weight;
  return -weight; // row is scoped elsewhere → penalize
}

function countryScore(
  rowVal: string | null | undefined,
  scopeVal: string | null | undefined,
  weight: number
): number {
  if (!rowVal) return 0;
  if (scopeVal && rowVal.toUpperCase() === scopeVal.toUpperCase())
    return weight;
  return -weight;
}

function describeMatch(
  unit: boolean,
  branch: boolean,
  warehouse: boolean,
  country: boolean
): PriceMatchKind {
  if (unit && branch && warehouse && country)
    return "unit+branch+warehouse+country";
  if (unit && branch && warehouse) return "unit+branch+warehouse";
  if (unit && branch) return "unit+branch";
  if (unit) return "unit";
  if (branch && warehouse && country) return "branch+warehouse+country";
  if (branch && warehouse) return "branch+warehouse";
  if (branch) return "branch";
  if (warehouse) return "warehouse";
  if (country) return "country";
  return "default";
}

interface Scored {
  row: PriceListRow;
  score: number;
  from: number;
  unitHit: boolean;
  branchHit: boolean;
  warehouseHit: boolean;
  countryHit: boolean;
}

/**
 * Pick the best price row for a product under the given scope.
 * Returns null when no active, in-window row exists.
 */
export function pickPrice(
  rows: readonly PriceListRow[],
  scope: PriceScope,
  opts: { priceType?: PriceType; at?: Date } = {}
): ResolvedPrice | null {
  const priceType = opts.priceType ?? "sale";
  const at = opts.at ?? new Date();

  const eligible = rows.filter(r => {
    if (r.priceType !== priceType) return false;
    if (r.isActive === false) return false;
    const from = toDate(r.effectiveFrom);
    const to = toDate(r.effectiveTo);
    if (from && at < from) return false;
    if (to && at > to) return false;
    return true;
  });
  if (eligible.length === 0) return null;

  let best: Scored | null = null;
  for (const row of eligible) {
    const score =
      dimScore(row.unitId, scope.unitId, 8) +
      dimScore(row.branchId, scope.branchId, 4) +
      dimScore(row.warehouseId, scope.warehouseId, 2) +
      countryScore(row.countryCode, scope.countryCode, 1);
    const from = toDate(row.effectiveFrom)?.getTime() ?? 0;
    const candidate: Scored = {
      row,
      score,
      from,
      unitHit:
        row.unitId != null &&
        scope.unitId != null &&
        row.unitId === scope.unitId,
      branchHit:
        row.branchId != null &&
        scope.branchId != null &&
        row.branchId === scope.branchId,
      warehouseHit:
        row.warehouseId != null &&
        scope.warehouseId != null &&
        row.warehouseId === scope.warehouseId,
      countryHit:
        !!row.countryCode &&
        !!scope.countryCode &&
        row.countryCode.toUpperCase() === scope.countryCode.toUpperCase(),
    };
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score &&
        (candidate.from > best.from ||
          (candidate.from === best.from && candidate.row.id > best.row.id)))
    ) {
      best = candidate;
    }
  }
  if (!best) return null;

  const anyScoped =
    best.row.unitId != null ||
    best.row.branchId != null ||
    best.row.warehouseId != null ||
    !!best.row.countryCode;

  return {
    price: toNum(best.row.price),
    discountPct: toNum(best.row.discountPct),
    matchedBy: !anyScoped
      ? "default"
      : best.score <= 0
        ? "none"
        : describeMatch(
            best.unitHit,
            best.branchHit,
            best.warehouseHit,
            best.countryHit
          ),
    rowId: best.row.id,
  };
}

/**
 * Apply a resolved price + its auto discount to a line amount.
 * Kept pure so the preview endpoint and tests share one code path.
 */
export function applyResolvedPrice(
  basePrice: number,
  resolved: ResolvedPrice | null
): { unitPrice: number; autoDiscountPct: number } {
  if (!resolved) return { unitPrice: basePrice, autoDiscountPct: 0 };
  return { unitPrice: resolved.price, autoDiscountPct: resolved.discountPct };
}

/* ─── Invoice totals (shared by preview + create — one source of truth) ── */

export interface InvoiceLineInput {
  quantity: number;
  unitPrice: number;
  /** Fixed discount on the line (clamped to the line gross). */
  discountAmount?: number;
  /** Per-line tax percentage; 0/absent → the header tax rate applies. */
  taxPct?: number;
}

export interface InvoiceTotalsInput {
  lines: readonly InvoiceLineInput[];
  headerDiscountAmount?: number;
  headerTaxPct?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxedLineNet: number;
  headerTaxableBase: number;
  headerTax: number;
  lineTaxTotal: number;
  taxTotal: number;
  grandTotal: number;
  lines: Array<{ net: number; tax: number; total: number }>;
}

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute invoice totals with per-line discounts/taxes and a header
 * discount + fallback tax rate. With no per-line taxPct this reduces to
 * the legacy formula: tax = (subtotal − discount) × headerTaxPct.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const headerDiscount = Math.max(0, input.headerDiscountAmount ?? 0);
  const headerTaxPct = Math.max(0, input.headerTaxPct ?? 0);

  let subtotal = 0;
  let lineDiscountSum = 0;
  let lineTaxSum = 0;
  let taxedLineNet = 0;
  let netSum = 0;
  const lines: InvoiceTotals["lines"] = [];

  for (const l of input.lines) {
    const qty = Math.max(0, l.quantity || 0);
    const price = Math.max(0, l.unitPrice || 0);
    const gross = r2(qty * price);
    const disc = r2(Math.min(Math.max(0, l.discountAmount ?? 0), gross));
    const net = r2(gross - disc);
    const taxPct = Math.max(0, l.taxPct ?? 0);
    const tax = r2((net * taxPct) / 100);

    subtotal += gross;
    lineDiscountSum += disc;
    lineTaxSum += tax;
    netSum += net;
    if (taxPct > 0) taxedLineNet += net;
    lines.push({ net, tax, total: r2(net + tax) });
  }

  subtotal = r2(subtotal);
  lineDiscountSum = r2(lineDiscountSum);
  lineTaxSum = r2(lineTaxSum);
  netSum = r2(netSum);
  taxedLineNet = r2(taxedLineNet);

  const discountTotal = r2(headerDiscount + lineDiscountSum);
  const headerTaxableBase = r2(
    Math.max(0, netSum - headerDiscount - taxedLineNet)
  );
  const headerTax = r2((headerTaxableBase * headerTaxPct) / 100);
  const taxTotal = r2(lineTaxSum + headerTax);
  // A discount can never produce negative revenue — floor at zero.
  const grandTotal = r2(Math.max(0, netSum - headerDiscount + taxTotal));

  return {
    subtotal,
    discountTotal,
    taxedLineNet,
    headerTaxableBase,
    headerTax,
    lineTaxTotal: r2(lineTaxSum),
    taxTotal,
    grandTotal,
    lines,
  };
}
