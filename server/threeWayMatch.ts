/**
 * server/threeWayMatch.ts
 * ------------------------
 * محرك المطابقة الثلاثية (Three-Way Matching) — نقي وخالٍ من أي اعتماد على قاعدة
 * البيانات ليكون قابلاً للاختبار والمراجعة بشكل مستقل.
 *
 * سلسلة التحقق: أمر شراء (PO) ⟵ سند استلام (GRN) ⟵ فاتورة شراء
 *   • GRN:     الكمية المستلمة لا تتجاوز المتبقي في أمر الشراء (مع تفاوت).
 *   • الفاتورة: لا تصدر إلا على كميات مستلمة فعلياً، بسعر ضمن تفاوت سعري
 *              مقارنةً بسعر الأمر، ولصالح نفس المورد.
 *
 * الافتراضيات عالمية: تفاوت سعري 5% وتفاوت استلام 0% (لا استلام زائد).
 */

export const DEFAULT_PRICE_TOLERANCE_PCT = 5;
export const DEFAULT_OVERRECEIVE_TOLERANCE_PCT = 0;

export type MatchLevel = "error" | "warn";
export type MatchIssueCode =
  | "OK"
  | "NOT_ON_ORDER"
  | "OVER_RECEIPT"
  | "OVER_INVOICED"
  | "PRICE_VARIANCE"
  | "MISSING_DOCUMENT"
  | "SUPPLIER_MISMATCH";

export interface MatchIssue {
  code: MatchIssueCode;
  level: MatchLevel;
  productId: number | null;
  productName: string;
  message: string;
  expected?: number;
  actual?: number;
}

export interface MatchResult {
  ok: boolean;
  issues: MatchIssue[];
  matchedQty: number;
  expectedQty: number;
}

export interface MatchOptions {
  priceTolerancePct?: number;
  overReceiveTolerancePct?: number;
}

/** سطر في أمر الشراء — بما فيه الكمية المتراكمة المستلمة. */
export interface OrderLineLike {
  poItemId: number | null;
  productId: number;
  productName: string;
  quantity: number;
  receivedQty: number;
  unitPrice: string | number;
  discount?: string | number;
}

/** سطر استلام (GRN). */
export interface ReceiptLineLike {
  productId: number;
  productName: string;
  quantityReceived: number;
  unitPrice?: string | number | null;
}

/** سطر فاتورة مشتريات. */
export interface InvoiceLineLike {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string | number;
  discount?: string | number;
}

const toNum = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(String(v).replace(/,/g, "")) || 0;
};

function matchOptions(opts?: MatchOptions): Required<MatchOptions> {
  return {
    priceTolerancePct: opts?.priceTolerancePct ?? DEFAULT_PRICE_TOLERANCE_PCT,
    overReceiveTolerancePct:
      opts?.overReceiveTolerancePct ?? DEFAULT_OVERRECEIVE_TOLERANCE_PCT,
  };
}

/** فرّق نسبي بين القيمتين كنسبة مئوية من الأساس. */
function percentDifference(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : Infinity;
  return (Math.abs(actual - expected) / Math.abs(expected)) * 100;
}

const withKey = <T extends { productId: number }>(lines: T[]) =>
  new Map(lines.map(line => [line.productId, line]));

/**
 * مطابقة الاستلام (GRN) مقابل أمر الشراء.
 * يرجع `ok === true` إذا لم تتجاوز كل كمية مستلمة المتبقي المتاح في الأمر
 * (مع تفاوت الاستلام الزائد إن حُدد). أي سطر غير موجود في الأمر يعد خطأ.
 */
export function matchGrnAgainstPo(
  orderLines: OrderLineLike[],
  receipts: ReceiptLineLike[],
  opts?: MatchOptions
): MatchResult {
  const { overReceiveTolerancePct } = matchOptions(opts);
  const orderByProduct = withKey(orderLines);
  const issues: MatchIssue[] = [];
  let matchedQty = 0;
  let expectedQty = 0;

  for (const receipt of receipts) {
    const orderLine = orderByProduct.get(receipt.productId);
    if (!orderLine) {
      issues.push({
        code: "NOT_ON_ORDER",
        level: "error",
        productId: receipt.productId,
        productName: receipt.productName,
        message: `المنتج "${receipt.productName}" غير موجود في أمر الشراء — لا يمكن استلامه.`,
      });
      continue;
    }
    const available = orderLine.quantity - orderLine.receivedQty;
    if (available < 0) continue;
    expectedQty += available;
    if (receipt.quantityReceived <= 0) {
      issues.push({
        code: "OVER_RECEIPT",
        level: "error",
        productId: receipt.productId,
        productName: receipt.productName,
        message: "كمية الاستلام يجب أن تكون أكبر من صفر.",
        expected: available,
        actual: receipt.quantityReceived,
      });
      continue;
    }
    matchedQty += Math.min(receipt.quantityReceived, available);
    const maxAllowed = orderLine.quantity * (1 + overReceiveTolerancePct / 100);
    const proposed = orderLine.receivedQty + receipt.quantityReceived;
    if (proposed > maxAllowed) {
      issues.push({
        code: "OVER_RECEIPT",
        level: "error",
        productId: receipt.productId,
        productName: receipt.productName,
        message: `استلام زائد: الكمية المستلمة (${orderLine.receivedQty} + ${receipt.quantityReceived}) تتجاوز الكمية المطلوبة ${orderLine.quantity} (الحد الأعلى ${maxAllowed}).`,
        expected: maxAllowed,
        actual: proposed,
      });
    }
  }

  return { ok: issues.length === 0, issues, matchedQty, expectedQty };
}

/**
 * مطابقة الفاتورة مقابل أمر الشراء وسند الاستلام (التحقق الثلاثي الكامل).
 * - يجب أن توجد الفاتورة على أصناف أمر الشراء نفسها.
 * - الكمية المفوترة لا تتجاوز الكمية المستلمة فعلياً (عند وجود GRN).
 * - سعر الوحدة ضمن التفاوت السعري (افتراضياً ±5%) مقابل أمر الشراء.
 */
export function matchInvoiceAgainstPo(
  orderLines: OrderLineLike[],
  invoiceLines: InvoiceLineLike[],
  receipts: ReceiptLineLike[],
  opts?: MatchOptions
): MatchResult {
  const { priceTolerancePct } = matchOptions(opts);
  const orderByProduct = withKey(orderLines);
  const receiptsByProduct = withKey(receipts);
  const issues: MatchIssue[] = [];
  let matchedQty = 0;
  let expectedQty = 0;

  for (const invoiceLine of invoiceLines) {
    const orderLine = orderByProduct.get(invoiceLine.productId);
    if (!orderLine) {
      issues.push({
        code: "NOT_ON_ORDER",
        level: "error",
        productId: invoiceLine.productId,
        productName: invoiceLine.productName,
        message: `المنتج "${invoiceLine.productName}" غير موجود في أمر الشراء — الفاتورة خارج نطاق الأمر.`,
      });
      continue;
    }

    expectedQty += orderLine.quantity;
    const receivedQty =
      receiptsByProduct.get(invoiceLine.productId)?.quantityReceived ?? 0;
    const invoiceable = Math.max(0, receivedQty);

    if (invoiceable < invoiceLine.quantity) {
      issues.push({
        code: "OVER_INVOICED",
        level: "error",
        productId: invoiceLine.productId,
        productName: invoiceLine.productName,
        message: `فوترة زائدة: كمية الفاتورة ${invoiceLine.quantity} تتجاوز الكمية المستلمة ${receivedQty}.`,
        expected: invoiceable,
        actual: invoiceLine.quantity,
      });
      continue;
    }
    if (invoiceLine.quantity <= 0) {
      issues.push({
        code: "OVER_INVOICED",
        level: "error",
        productId: invoiceLine.productId,
        productName: invoiceLine.productName,
        message: "كمية الفاتورة يجب أن تكون أكبر من صفر.",
      });
      continue;
    }
    matchedQty += Math.min(invoiceLine.quantity, invoiceable);

    const poPrice = toNum(orderLine.unitPrice);
    const invoicePrice = toNum(invoiceLine.unitPrice);
    if (percentDifference(invoicePrice, poPrice) > priceTolerancePct) {
      issues.push({
        code: "PRICE_VARIANCE",
        level: "error",
        productId: invoiceLine.productId,
        productName: invoiceLine.productName,
        message: `انحراف سعري: سعر الفاتورة ${invoicePrice} يخالف سعر الأمر ${poPrice} بأكثر من ${priceTolerancePct}%.`,
        expected: poPrice,
        actual: invoicePrice,
      });
    }
  }

  return { ok: issues.length === 0, issues, matchedQty, expectedQty };
}

/** تحقق سريع من تطابق المورد بين المستندات (الشرط الرابع الصامت للمطابقة). */
export function assertSupplierMatches(
  a: number | null | undefined,
  b: number | null | undefined
): MatchResult {
  const issues: MatchIssue[] = [];
  if (
    a === undefined ||
    b === undefined ||
    a === null ||
    b === null ||
    a === b
  ) {
    return { ok: true, issues, matchedQty: 0, expectedQty: 0 };
  }
  issues.push({
    code: "SUPPLIER_MISMATCH",
    level: "error",
    productId: null,
    productName: "",
    message: "الفواتير تُنشأ لصالح مورد يخالف مورد أمر الشراء.",
    expected: a,
    actual: b,
  });
  return {
    ok: false,
    issues,
    matchedQty: 0,
    expectedQty: 0,
  };
}
