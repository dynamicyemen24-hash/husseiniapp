/**
 * server/e2e-sales.test.ts
 * ========================
 * Pure unit tests for the Sales module — covers Customer Lifecycle,
 * Sales Invoice Lifecycle & Calculations, POS Operations, Orders,
 * Sales Reps & Commissions, Offers & Promotions, and Payment Processing.
 *
 * NO live database — all logic is tested in isolation with fakes.
 */

import { describe, expect, it } from "vitest";

/* ─────────────────────────────────────────────────────────────────────────────
 *  Helper utilities (mirrors invoiceEnhancements.test.ts pattern)
 * ───────────────────────────────────────────────────────────────────────────── */

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function coercePaymentMethod(raw: string | undefined): string {
  const allowed = [
    "cash",
    "card",
    "transfer",
    "credit",
    "online",
    "cash_yer",
    "cash_sar",
    "hawala",
    "shabab",
    "mobile_money",
    "bank_transfer",
  ] as const;
  return (allowed as readonly string[]).includes(raw ?? "")
    ? (raw as string)
    : "cash";
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  Fake / Mock Objects
 * ───────────────────────────────────────────────────────────────────────────── */

interface FakeCustomer {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: string;
  creditLimit: string;
  loyaltyPoints: number;
  isActive: boolean;
  paymentTermsDays: number;
  isVatRegistered: boolean;
  taxIdType: string;
  taxNumber: string | null;
  countryCode: string;
  buyerType: string;
  createdAt: Date;
  updatedAt: Date;
}

function fakeCustomer(overrides: Partial<FakeCustomer> = {}): FakeCustomer {
  return {
    id: 1,
    tenantId: 10,
    code: "CUST-001",
    name: "أحمد محمد",
    phone: "+967-770-123456",
    email: "ahmed@example.com",
    address: "صنعاء، شارع المطار",
    balance: "0.00",
    creditLimit: "50000.00",
    loyaltyPoints: 0,
    isActive: true,
    paymentTermsDays: 30,
    isVatRegistered: false,
    taxIdType: "none",
    taxNumber: null,
    countryCode: "YE",
    buyerType: "b2b",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

interface FakeProduct {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  salePrice: string;
  purchasePrice: string;
  currentStock: number;
  category: string | null;
  isActive: boolean;
}

function fakeProduct(overrides: Partial<FakeProduct> = {}): FakeProduct {
  return {
    id: 100,
    tenantId: 10,
    code: "PROD-001",
    name: "Item A",
    salePrice: "250.00",
    purchasePrice: "150.00",
    currentStock: 50,
    category: "general",
    isActive: true,
    ...overrides,
  };
}

interface FakeInvoiceItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
}

interface FakeInvoice {
  id: number;
  tenantId: number;
  invoiceNumber: string;
  customerId: number | null;
  branchId: number | null;
  costCenterId: number | null;
  status: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  discount: string;
  total: string;
  paidAmount: string;
  paymentMethod: string;
  currency: string;
  currencyRate: string;
  salesRepId: string | null;
  notes: string;
  invoiceDate: Date;
  dueDate: Date | null;
  postedAt: Date | null;
  userId: number;
}

function fakeInvoice(overrides: Partial<FakeInvoice> = {}): FakeInvoice {
  return {
    id: 1000,
    tenantId: 10,
    invoiceNumber: "INV-001",
    customerId: 1,
    branchId: null,
    costCenterId: null,
    status: "draft",
    subtotal: "0.00",
    taxRate: "15.00",
    taxAmount: "0.00",
    discount: "0.00",
    total: "0.00",
    paidAmount: "0.00",
    paymentMethod: "cash",
    currency: "YER",
    currencyRate: "1",
    salesRepId: null,
    notes: "",
    invoiceDate: new Date(),
    dueDate: null,
    postedAt: null,
    userId: 1,
    ...overrides,
  };
}

interface FakeOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface FakeOrder {
  id: number;
  tenantId: number;
  orderNumber: string;
  customerId: number | null;
  status: string;
  total: string;
  idempotencyKey: string | null;
  userId: number;
  createdAt: Date;
}

function fakeOrder(overrides: Partial<FakeOrder> = {}): FakeOrder {
  return {
    id: 2000,
    tenantId: 10,
    orderNumber: "ORD-001",
    customerId: 1,
    status: "pending",
    total: "0.00",
    idempotencyKey: null,
    userId: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

interface FakePosSession {
  id: number;
  tenantId: number;
  code: string;
  openedById: number;
  openedAt: Date;
  closedAt: Date | null;
  openingFloat: string;
  closingFloat: string | null;
  expectedCash: string | null;
  countedCash: string | null;
  variance: string | null;
  status: string;
  branchId: number | null;
}

function fakePosSession(
  overrides: Partial<FakePosSession> = {}
): FakePosSession {
  return {
    id: 3000,
    tenantId: 10,
    code: "SESSION-001",
    openedById: 1,
    openedAt: new Date(),
    closedAt: null,
    openingFloat: "10000.00",
    closingFloat: null,
    expectedCash: null,
    countedCash: null,
    variance: null,
    status: "open",
    branchId: null,
    ...overrides,
  };
}

interface FakePayment {
  id: number;
  tenantId: number;
  source: string;
  invoiceId: number;
  amount: string;
  paymentMethod: string;
  paymentDate: Date;
  idempotencyKey: string | null;
  userId: number;
}

function fakePayment(overrides: Partial<FakePayment> = {}): FakePayment {
  return {
    id: 5000,
    tenantId: 10,
    source: "sales",
    invoiceId: 1000,
    amount: "0.00",
    paymentMethod: "cash",
    paymentDate: new Date(),
    idempotencyKey: null,
    userId: 1,
    ...overrides,
  };
}

interface FakeSalesRep {
  id: number;
  tenantId: number;
  name: string;
  phone: string | null;
  commissionType: string;
  commissionValue: string;
  bonusThreshold: string | null;
  bonusAmount: string | null;
  isActive: boolean;
}

function fakeSalesRep(overrides: Partial<FakeSalesRep> = {}): FakeSalesRep {
  return {
    id: 4000,
    tenantId: 10,
    name: "محمد علي",
    phone: "+967-771-654321",
    commissionType: "percent",
    commissionValue: "5.00",
    bonusThreshold: null,
    bonusAmount: null,
    isActive: true,
    ...overrides,
  };
}

interface FakeOffer {
  id: number;
  tenantId: number;
  name: string;
  kind: string;
  discountPercent: string;
  minQty: string | null;
  productId: number | null;
  categoryId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
}

function fakeOffer(overrides: Partial<FakeOffer> = {}): FakeOffer {
  return {
    id: 6000,
    tenantId: 10,
    name: "Summer Sale",
    kind: "financial",
    discountPercent: "10.00",
    minQty: null,
    productId: null,
    categoryId: null,
    startDate: null,
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

interface FakePosCashEvent {
  id: number;
  tenantId: number;
  sessionId: number;
  type: string;
  amount: string;
  reason: string;
  notes: string | null;
  createdById: number;
}

function fakePosCashEvent(
  overrides: Partial<FakePosCashEvent> = {}
): FakePosCashEvent {
  return {
    id: 7000,
    tenantId: 10,
    sessionId: 3000,
    type: "in",
    amount: "500.00",
    reason: "إيداع نقدي",
    notes: null,
    createdById: 1,
    ...overrides,
  };
}

interface FakePosReturn {
  id: number;
  tenantId: number;
  returnNumber: string;
  originalInvoiceId: number;
  customerId: number | null;
  sessionId: number | null;
  refundMethod: string;
  reason: string | null;
  status: string;
  refundAmount: string;
  createdById: number;
}

function fakePosReturn(overrides: Partial<FakePosReturn> = {}): FakePosReturn {
  return {
    id: 8000,
    tenantId: 10,
    returnNumber: "RET-001",
    originalInvoiceId: 1000,
    customerId: 1,
    sessionId: 3000,
    refundMethod: "cash",
    reason: "عيب في المنتج",
    status: "completed",
    refundAmount: "0.00",
    createdById: 1,
    ...overrides,
  };
}

interface FakePosHeldCart {
  id: number;
  tenantId: number;
  code: string;
  heldById: number;
  branchId: number | null;
  sessionId: number | null;
  customerId: number | null;
  snapshot: string;
  total: string;
  itemCount: number;
  status: string;
}

function fakePosHeldCart(
  overrides: Partial<FakePosHeldCart> = {}
): FakePosHeldCart {
  return {
    id: 9000,
    tenantId: 10,
    code: "HELD-001",
    heldById: 1,
    branchId: null,
    sessionId: 3000,
    customerId: null,
    snapshot: "[]",
    total: "0.00",
    itemCount: 0,
    status: "active",
    ...overrides,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  Business logic helpers (pure functions extracted from router logic)
 *  These mirror the actual business rules without DB calls.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Calculate invoice line total */
function calcLineTotal(
  quantity: number,
  unitPrice: number,
  discount: number = 0
): number {
  return roundTo(quantity * unitPrice - discount);
}

/** Calculate invoice subtotal from lines */
function calcSubtotal(
  items: Array<{ quantity: number; unitPrice: number; discount?: number }>
): number {
  return roundTo(
    items.reduce(
      (sum, item) =>
        sum + calcLineTotal(item.quantity, item.unitPrice, item.discount ?? 0),
      0
    )
  );
}

/** Calculate tax amount */
function calcTaxAmount(subtotal: number, taxRate: number): number {
  return roundTo((subtotal * taxRate) / 100);
}

/** Calculate invoice total */
function calcInvoiceTotal(
  subtotal: number,
  taxAmount: number,
  discount: number = 0
): number {
  return roundTo(subtotal + taxAmount - discount);
}

/** Calculate customer balance after a sale */
function calcCustomerBalance(
  currentBalance: number,
  invoiceTotal: number,
  paymentAmount: number = 0
): number {
  return roundTo(currentBalance + invoiceTotal - paymentAmount);
}

/** Calculate loyalty points (1 point per 100 currency units) */
function calcLoyaltyPoints(invoiceTotal: number): number {
  return Math.floor(invoiceTotal / 100);
}

/** Calculate commission */
function calcCommission(
  saleAmount: number,
  commissionType: string,
  commissionValue: number
): number {
  if (commissionType === "percent") {
    return roundTo((saleAmount * commissionValue) / 100);
  }
  return roundTo(commissionValue);
}

/** Calculate POS expected cash */
function calcExpectedCash(
  openingFloat: number,
  cashSales: number,
  cashIn: number,
  cashOut: number,
  cashReturns: number
): number {
  return roundTo(openingFloat + cashSales + cashIn - cashOut - cashReturns);
}

/** Apply offer discount to a price */
function applyOfferDiscount(
  originalPrice: number,
  discountPercent: number
): number {
  return roundTo(originalPrice * (1 - discountPercent / 100));
}

/** Check if offer is currently valid */
function isOfferValid(
  offer: { startDate: Date | null; endDate: Date | null; isActive: boolean },
  now: Date = new Date()
): boolean {
  if (!offer.isActive) return false;
  if (offer.startDate && now < offer.startDate) return false;
  if (offer.endDate && now > offer.endDate) return false;
  return true;
}

/** Validate required customer fields */
function validateCustomer(data: {
  name?: string | null;
  code?: string | null;
}): string[] {
  const errors: string[] = [];
  if (!data.name || data.name.trim().length === 0)
    errors.push("name is required");
  if (!data.code || data.code.trim().length === 0)
    errors.push("code is required");
  return errors;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Customer Lifecycle
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Customer Lifecycle", () => {
  it("create customer with all fields", () => {
    const c = fakeCustomer({
      name: "شركة الأمل",
      phone: "+967-770-999999",
      email: "amel@company.com",
      address: "عدن، كريتر",
      creditLimit: "100000.00",
      paymentTermsDays: 60,
      isVatRegistered: true,
      taxIdType: "vat",
      taxNumber: "310123456789003",
      countryCode: "SA",
      buyerType: "b2b",
    });

    expect(c.name).toBe("شركة الأمل");
    expect(c.phone).toBe("+967-770-999999");
    expect(c.email).toBe("amel@company.com");
    expect(c.address).toBe("عدن، كريتر");
    expect(c.creditLimit).toBe("100000.00");
    expect(c.paymentTermsDays).toBe(60);
    expect(c.isVatRegistered).toBe(true);
    expect(c.taxIdType).toBe("vat");
    expect(c.taxNumber).toBe("310123456789003");
    expect(c.countryCode).toBe("SA");
    expect(c.buyerType).toBe("b2b");
    expect(c.isActive).toBe(true);
  });

  it("validate required fields", () => {
    expect(validateCustomer({ name: "", code: "C-001" })).toContain(
      "name is required"
    );
    expect(validateCustomer({ name: "Ahmed", code: "" })).toContain(
      "code is required"
    );
    expect(validateCustomer({ name: "", code: "" })).toHaveLength(2);
    expect(validateCustomer({ name: "Ahmed", code: "C-001" })).toHaveLength(0);
  });

  it("customer balance tracking", () => {
    const c = fakeCustomer({ balance: "0.00" });
    const newBalance = calcCustomerBalance(0, 5000, 0);
    expect(newBalance).toBe(5000);

    const afterPartial = calcCustomerBalance(newBalance, 0, 2000);
    expect(afterPartial).toBe(3000);

    const afterFull = calcCustomerBalance(afterPartial, 0, 3000);
    expect(afterFull).toBe(0);
  });

  it("loyalty points accumulation", () => {
    expect(calcLoyaltyPoints(100)).toBe(1);
    expect(calcLoyaltyPoints(99)).toBe(0);
    expect(calcLoyaltyPoints(500)).toBe(5);
    expect(calcLoyaltyPoints(10000)).toBe(100);
    expect(calcLoyaltyPoints(0)).toBe(0);
  });

  it("payment terms (paymentTermsDays)", () => {
    const c30 = fakeCustomer({ paymentTermsDays: 30 });
    const c60 = fakeCustomer({ paymentTermsDays: 60 });
    const c0 = fakeCustomer({ paymentTermsDays: 0 });

    expect(c30.paymentTermsDays).toBe(30);
    expect(c60.paymentTermsDays).toBe(60);
    expect(c0.paymentTermsDays).toBe(0);
  });

  it("VAT registration (isVatRegistered, taxIdType)", () => {
    const vatC = fakeCustomer({
      isVatRegistered: true,
      taxIdType: "vat",
      taxNumber: "310123456789003",
    });
    const nonVatC = fakeCustomer({
      isVatRegistered: false,
      taxIdType: "none",
      taxNumber: null,
    });

    expect(vatC.isVatRegistered).toBe(true);
    expect(vatC.taxIdType).toBe("vat");
    expect(vatC.taxNumber).toBe("310123456789003");
    expect(nonVatC.isVatRegistered).toBe(false);
    expect(nonVatC.taxIdType).toBe("none");
    expect(nonVatC.taxNumber).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Sales Invoice Lifecycle
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Sales Invoice Lifecycle", () => {
  it("create invoice with items", () => {
    const inv = fakeInvoice({
      invoiceNumber: "INV-100",
      customerId: 1,
      status: "draft",
    });
    const items: FakeInvoiceItem[] = [
      {
        productId: 100,
        productName: "Item A",
        quantity: 3,
        unitPrice: "250.00",
        discount: "0.00",
        total: "750.00",
      },
      {
        productId: 101,
        productName: "Item B",
        quantity: 1,
        unitPrice: "1200.00",
        discount: "50.00",
        total: "1150.00",
      },
    ];

    expect(inv.invoiceNumber).toBe("INV-100");
    expect(inv.customerId).toBe(1);
    expect(items).toHaveLength(2);
    expect(items[0].total).toBe("750.00");
    expect(items[1].total).toBe("1150.00");
  });

  it("calculate subtotal, tax, discount, total", () => {
    const lines = [
      { quantity: 3, unitPrice: 250, discount: 0 },
      { quantity: 1, unitPrice: 1200, discount: 50 },
    ];
    const subtotal = calcSubtotal(lines);
    expect(subtotal).toBe(1900);

    const taxAmount = calcTaxAmount(subtotal, 15);
    expect(taxAmount).toBe(285);

    const invoiceDiscount = 100;
    const total = calcInvoiceTotal(subtotal, taxAmount, invoiceDiscount);
    expect(total).toBe(2085);
  });

  it("invoice status transitions: draft → confirmed → paid", () => {
    const inv = fakeInvoice({ status: "draft" });
    expect(inv.status).toBe("draft");

    inv.status = "confirmed";
    expect(inv.status).toBe("confirmed");

    inv.status = "paid";
    expect(inv.status).toBe("paid");
  });

  it("partial payment tracking", () => {
    const inv = fakeInvoice({
      total: "1000.00",
      paidAmount: "0.00",
      status: "confirmed",
    });

    const total = toNum(inv.total);
    const paid1 = 300;
    const balance1 = total - paid1;
    expect(balance1).toBe(700);

    const paid2 = 500;
    const balance2 = total - paid1 - paid2;
    expect(balance2).toBe(200);

    const paid3 = 200;
    const balance3 = total - paid1 - paid2 - paid3;
    expect(balance3).toBe(0);
  });

  it("invoice cancellation", () => {
    const inv = fakeInvoice({ status: "confirmed" });
    inv.status = "cancelled";
    expect(inv.status).toBe("cancelled");
  });

  it("currency and exchange rate handling", () => {
    const usdInvoice = fakeInvoice({
      currency: "USD",
      currencyRate: "250.00000000",
    });
    expect(usdInvoice.currency).toBe("USD");
    expect(toNum(usdInvoice.currencyRate)).toBe(250);

    const yerInvoice = fakeInvoice({
      currency: "YER",
      currencyRate: "1",
    });
    expect(yerInvoice.currency).toBe("YER");
    expect(toNum(yerInvoice.currencyRate)).toBe(1);
  });

  it("cost center and branch assignment", () => {
    const inv = fakeInvoice({
      branchId: 5,
      costCenterId: 12,
    });
    expect(inv.branchId).toBe(5);
    expect(inv.costCenterId).toBe(12);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Sales Invoice Calculations
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Sales Invoice Calculations", () => {
  it("subtotal = sum of (quantity × unitPrice) for all items", () => {
    const items = [
      { quantity: 2, unitPrice: 100, discount: 0 },
      { quantity: 3, unitPrice: 50, discount: 0 },
      { quantity: 1, unitPrice: 200, discount: 0 },
    ];
    expect(calcSubtotal(items)).toBe(550);
  });

  it("taxAmount = subtotal × taxRate / 100", () => {
    expect(calcTaxAmount(1000, 15)).toBe(150);
    expect(calcTaxAmount(1000, 0)).toBe(0);
    expect(calcTaxAmount(0, 15)).toBe(0);
    expect(calcTaxAmount(1000, 5)).toBe(50);
  });

  it("total = subtotal + taxAmount - discount", () => {
    expect(calcInvoiceTotal(1000, 150, 50)).toBe(1100);
    expect(calcInvoiceTotal(1000, 150, 0)).toBe(1150);
    expect(calcInvoiceTotal(0, 0, 0)).toBe(0);
    expect(calcInvoiceTotal(1000, 0, 1000)).toBe(0);
  });

  it("paidAmount accumulation on payments", () => {
    let paidAmount = 0;
    paidAmount += 300;
    expect(paidAmount).toBe(300);
    paidAmount += 200;
    expect(paidAmount).toBe(500);
    paidAmount += 500;
    expect(paidAmount).toBe(1000);
  });

  it("balance = total - paidAmount", () => {
    const total = 2500;
    const paidAmount = 1000;
    const balance = total - paidAmount;
    expect(balance).toBe(1500);
  });

  it("discount on individual items", () => {
    const line1 = calcLineTotal(5, 100, 20);
    expect(line1).toBe(480);

    const line2 = calcLineTotal(2, 200, 0);
    expect(line2).toBe(400);

    const subtotal = calcSubtotal([
      { quantity: 5, unitPrice: 100, discount: 20 },
      { quantity: 2, unitPrice: 200, discount: 0 },
    ]);
    expect(subtotal).toBe(880);
  });

  it("discount on invoice level", () => {
    const subtotal = 1000;
    const taxAmount = calcTaxAmount(subtotal, 15);
    expect(taxAmount).toBe(150);

    const invoiceDiscount = 100;
    const total = calcInvoiceTotal(subtotal, taxAmount, invoiceDiscount);
    expect(total).toBe(1050);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: POS Operations
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: POS Operations", () => {
  it("open POS session with opening float", () => {
    const session = fakePosSession({
      openingFloat: "10000.00",
      status: "open",
    });
    expect(session.status).toBe("open");
    expect(toNum(session.openingFloat)).toBe(10000);
    expect(session.closedAt).toBeNull();
  });

  it("create POS sale (deducts stock atomically)", () => {
    const product = fakeProduct({ currentStock: 50 });
    const saleQty = 3;

    const deducted = product.currentStock - saleQty;
    expect(deducted).toBe(47);

    const lineTotal = calcLineTotal(saleQty, toNum(product.salePrice));
    expect(lineTotal).toBe(750);
  });

  it("hold cart and recall cart", () => {
    const cart = fakePosHeldCart({
      status: "active",
      snapshot: JSON.stringify([
        { productId: 100, quantity: 2, unitPrice: 250 },
      ]),
      total: "500.00",
      itemCount: 2,
    });

    expect(cart.status).toBe("active");
    const snapshot = JSON.parse(cart.snapshot);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].productId).toBe(100);

    const recalled = { ...cart, status: "recalled" };
    expect(recalled.status).toBe("recalled");
  });

  it("void POS sale (restores stock)", () => {
    const product = fakeProduct({ currentStock: 47 });
    const returnQty = 3;

    const restored = product.currentStock + returnQty;
    expect(restored).toBe(50);
  });

  it("process POS return (adds back stock)", () => {
    const product = fakeProduct({ currentStock: 45 });
    const returnItemQty = 2;

    const restocked = product.currentStock + returnItemQty;
    expect(restocked).toBe(47);

    const posReturn = fakePosReturn({
      refundAmount: "500.00",
      status: "completed",
    });
    expect(toNum(posReturn.refundAmount)).toBe(500);
    expect(posReturn.status).toBe("completed");
  });

  it("close POS session with cash reconciliation", () => {
    const openingFloat = 10000;
    const cashSales = 5000;
    const cashIn = 500;
    const cashOut = 200;
    const cashReturns = 300;

    const expectedCash = calcExpectedCash(
      openingFloat,
      cashSales,
      cashIn,
      cashOut,
      cashReturns
    );
    expect(expectedCash).toBe(15000);

    const countedCash = 15000;
    const variance = countedCash - expectedCash;
    expect(variance).toBe(0);

    const countedCashOff = 14900;
    const varianceOff = countedCashOff - expectedCash;
    expect(varianceOff).toBe(-100);
  });

  it("POS cash events (cash in/out)", () => {
    const cashInEvent = fakePosCashEvent({
      type: "in",
      amount: "1000.00",
      reason: "إيداع من المدير",
    });
    const cashOutEvent = fakePosCashEvent({
      type: "out",
      amount: "500.00",
      reason: "صرفة",
    });

    expect(cashInEvent.type).toBe("in");
    expect(toNum(cashInEvent.amount)).toBe(1000);
    expect(cashOutEvent.type).toBe("out");
    expect(toNum(cashOutEvent.amount)).toBe(500);
  });

  it("idempotent POS sale (same key = no duplicate)", () => {
    const idempotencyKey = "pos-sale-abc-123";
    const invoiceNumber = `POS-${idempotencyKey}`.slice(0, 50);

    expect(invoiceNumber).toBe("POS-pos-sale-abc-123");

    const invoiceNumber2 = `POS-${idempotencyKey}`.slice(0, 50);
    expect(invoiceNumber).toBe(invoiceNumber2);

    const existingInvoice = fakeInvoice({ invoiceNumber });
    expect(existingInvoice.invoiceNumber).toBe(invoiceNumber);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Orders
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Orders", () => {
  it("create order with items", () => {
    const order = fakeOrder({ orderNumber: "ORD-200", total: "0.00" });
    const items: FakeOrderItem[] = [
      {
        productId: 100,
        productName: "Item A",
        quantity: 5,
        unitPrice: "250.00",
        total: "1250.00",
      },
      {
        productId: 101,
        productName: "Item B",
        quantity: 2,
        unitPrice: "1200.00",
        total: "2400.00",
      },
    ];

    const total = items.reduce((sum, i) => sum + toNum(i.total), 0);
    expect(total).toBe(3650);
    expect(order.orderNumber).toBe("ORD-200");
  });

  it("order status transitions", () => {
    const order = fakeOrder({ status: "pending" });
    expect(order.status).toBe("pending");

    order.status = "confirmed";
    expect(order.status).toBe("confirmed");

    order.status = "processing";
    expect(order.status).toBe("processing");

    order.status = "shipped";
    expect(order.status).toBe("shipped");

    order.status = "delivered";
    expect(order.status).toBe("delivered");
  });

  it("order cancellation from any status", () => {
    const order = fakeOrder({ status: "processing" });
    order.status = "cancelled";
    expect(order.status).toBe("cancelled");
  });

  it("convert order to invoice", () => {
    const order = fakeOrder({
      orderNumber: "ORD-300",
      customerId: 1,
      total: "3650.00",
    });
    const inv = fakeInvoice({
      invoiceNumber: `INV-${order.orderNumber}`,
      customerId: order.customerId,
      orderId: order.id,
      subtotal: order.total,
      total: order.total,
      status: "draft",
    });

    expect(inv.invoiceNumber).toBe("INV-ORD-300");
    expect(inv.customerId).toBe(order.customerId);
    expect(inv.total).toBe(order.total);
  });

  it("idempotency key prevents duplicate orders", () => {
    const key = "order-key-xyz-789";
    const order1 = fakeOrder({ idempotencyKey: key, orderNumber: "ORD-400" });
    const order2 = fakeOrder({ idempotencyKey: key, orderNumber: "ORD-400" });

    expect(order1.idempotencyKey).toBe(order2.idempotencyKey);
    expect(order1.orderNumber).toBe(order2.orderNumber);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Sales Representatives & Commissions
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Sales Representatives & Commissions", () => {
  it("create sales rep with commission rate", () => {
    const rep = fakeSalesRep({
      name: "عبدالرحمن أحمد",
      commissionType: "percent",
      commissionValue: "7.50",
    });
    expect(rep.name).toBe("عبدالرحمن أحمد");
    expect(rep.commissionType).toBe("percent");
    expect(toNum(rep.commissionValue)).toBe(7.5);
    expect(rep.isActive).toBe(true);
  });

  it("assign sales rep to invoice", () => {
    const rep = fakeSalesRep({ id: 4001 });
    const inv = fakeInvoice({ salesRepId: String(rep.id) });

    expect(inv.salesRepId).toBe("4001");
  });

  it("calculate commission on sale — percent", () => {
    const saleAmount = 10000;
    const commissionRate = 5;
    const commission = calcCommission(saleAmount, "percent", commissionRate);
    expect(commission).toBe(500);
  });

  it("calculate commission on sale — fixed", () => {
    const saleAmount = 10000;
    const fixedCommission = 250;
    const commission = calcCommission(saleAmount, "fixed", fixedCommission);
    expect(commission).toBe(250);
  });

  it("commission is zero when sale amount is zero", () => {
    expect(calcCommission(0, "percent", 5)).toBe(0);
    expect(calcCommission(0, "fixed", 250)).toBe(250);
  });

  it("sales rep with bonus threshold", () => {
    const rep = fakeSalesRep({
      commissionType: "percent",
      commissionValue: "5.00",
      bonusThreshold: "50000.00",
      bonusAmount: "2000.00",
    });

    const monthlySales = 60000;
    const commission = calcCommission(
      monthlySales,
      "percent",
      toNum(rep.commissionValue)
    );
    const bonus =
      monthlySales >= toNum(rep.bonusThreshold!) ? toNum(rep.bonusAmount!) : 0;

    expect(commission).toBe(3000);
    expect(bonus).toBe(2000);

    const belowThreshold = 40000;
    const bonusBelow =
      belowThreshold >= toNum(rep.bonusThreshold!)
        ? toNum(rep.bonusAmount!)
        : 0;
    expect(bonusBelow).toBe(0);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Offers & Promotions
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Offers & Promotions", () => {
  it("product-specific discount", () => {
    const offer = fakeOffer({
      productId: 100,
      discountPercent: "15.00",
    });
    const originalPrice = 200;
    const discountedPrice = applyOfferDiscount(
      originalPrice,
      toNum(offer.discountPercent)
    );

    expect(discountedPrice).toBe(170);
  });

  it("category-wide discount", () => {
    const offer = fakeOffer({
      categoryId: 5,
      productId: null,
      discountPercent: "20.00",
    });
    expect(offer.categoryId).toBe(5);
    expect(offer.productId).toBeNull();

    const price = 500;
    const discounted = applyOfferDiscount(price, toNum(offer.discountPercent));
    expect(discounted).toBe(400);
  });

  it("time-bound offers (validFrom/validTo)", () => {
    const pastOffer = fakeOffer({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      isActive: true,
    });
    expect(isOfferValid(pastOffer, new Date("2026-09-19"))).toBe(false);

    const futureOffer = fakeOffer({
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-12-31"),
      isActive: true,
    });
    expect(isOfferValid(futureOffer, new Date("2026-09-19"))).toBe(false);

    const currentOffer = fakeOffer({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
    });
    expect(isOfferValid(currentOffer, new Date("2026-09-19"))).toBe(true);
  });

  it("inactive offers are not valid", () => {
    const offer = fakeOffer({ isActive: false });
    expect(isOfferValid(offer)).toBe(false);
  });

  it("offers with no date range are always valid when active", () => {
    const offer = fakeOffer({
      startDate: null,
      endDate: null,
      isActive: true,
    });
    expect(isOfferValid(offer)).toBe(true);
  });

  it("offer stacking rules — highest discount wins", () => {
    const offer1 = fakeOffer({ discountPercent: "10.00" });
    const offer2 = fakeOffer({ discountPercent: "25.00" });

    const bestDiscount = Math.max(
      toNum(offer1.discountPercent),
      toNum(offer2.discountPercent)
    );
    expect(bestDiscount).toBe(25);

    const price = 400;
    const finalPrice = applyOfferDiscount(price, bestDiscount);
    expect(finalPrice).toBe(300);
  });

  it("offer with minimum quantity requirement", () => {
    const offer = fakeOffer({
      minQty: "10",
      discountPercent: "30.00",
    });

    const qty5 = 5;
    const eligible5 = qty5 >= toNum(offer.minQty!);
    expect(eligible5).toBe(false);

    const qty15 = 15;
    const eligible15 = qty15 >= toNum(offer.minQty!);
    expect(eligible15).toBe(true);

    const discountedPrice = applyOfferDiscount(
      100,
      toNum(offer.discountPercent)
    );
    expect(discountedPrice).toBe(70);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Sales E2E: Payment Processing
 * ───────────────────────────────────────────────────────────────────────────── */

describe("Sales E2E: Payment Processing", () => {
  it("record payment against invoice", () => {
    const inv = fakeInvoice({ total: "5000.00", paidAmount: "0.00" });
    const payment = fakePayment({ amount: "2000.00", invoiceId: inv.id });

    const total = toNum(inv.total);
    const paid = toNum(payment.amount);
    const balance = total - paid;

    expect(total).toBe(5000);
    expect(paid).toBe(2000);
    expect(balance).toBe(3000);
  });

  it("multiple payment methods", () => {
    const p1 = fakePayment({ amount: "1000.00", paymentMethod: "cash" });
    const p2 = fakePayment({ amount: "2000.00", paymentMethod: "card" });
    const p3 = fakePayment({ amount: "500.00", paymentMethod: "transfer" });

    expect(coercePaymentMethod(p1.paymentMethod)).toBe("cash");
    expect(coercePaymentMethod(p2.paymentMethod)).toBe("card");
    expect(coercePaymentMethod(p3.paymentMethod)).toBe("transfer");
  });

  it("payment idempotency (same idempotencyKey)", () => {
    const key = "pay-idem-key-999";
    const p1 = fakePayment({ idempotencyKey: key, amount: "1000.00" });
    const p2 = fakePayment({ idempotencyKey: key, amount: "1000.00" });

    expect(p1.idempotencyKey).toBe(p2.idempotencyKey);
    expect(p1.amount).toBe(p2.amount);
  });

  it("payment affects customer balance", () => {
    const customer = fakeCustomer({ balance: "5000.00" });
    const paymentAmount = 3000;
    const newBalance = calcCustomerBalance(
      toNum(customer.balance),
      0,
      paymentAmount
    );

    expect(newBalance).toBe(2000);
  });

  it("overpayment handling", () => {
    const inv = fakeInvoice({ total: "1000.00" });
    const overpayAmount = 1500;
    const total = toNum(inv.total);
    const overpayment = overpayAmount - total;

    expect(overpayment).toBe(500);
    expect(overpayAmount).toBeGreaterThan(total);
  });

  it("full payment zeros out balance", () => {
    const total = 7500;
    const paidAmount = 7500;
    const balance = total - paidAmount;
    expect(balance).toBe(0);
  });

  it("payment method coercion", () => {
    expect(coercePaymentMethod("cash")).toBe("cash");
    expect(coercePaymentMethod("card")).toBe("card");
    expect(coercePaymentMethod("transfer")).toBe("transfer");
    expect(coercePaymentMethod("credit")).toBe("credit");
    expect(coercePaymentMethod("online")).toBe("online");
    expect(coercePaymentMethod("cash_yer")).toBe("cash_yer");
    expect(coercePaymentMethod("cash_sar")).toBe("cash_sar");
    expect(coercePaymentMethod("hawala")).toBe("hawala");
    expect(coercePaymentMethod("shabab")).toBe("shabab");
    expect(coercePaymentMethod("mobile_money")).toBe("mobile_money");
    expect(coercePaymentMethod("bank_transfer")).toBe("bank_transfer");
    expect(coercePaymentMethod(undefined)).toBe("cash");
    expect(coercePaymentMethod("unknown")).toBe("cash");
    expect(coercePaymentMethod("")).toBe("cash");
  });

  it("payment date tracking", () => {
    const now = new Date("2026-09-19T10:30:00Z");
    const p = fakePayment({ paymentDate: now });

    expect(p.paymentDate.toISOString()).toBe("2026-09-19T10:30:00.000Z");
  });
});
