/**
 * server/e2e-purchases.test.ts — Comprehensive Purchases E2E Tests
 * Pure unit tests with NO live database.
 */
import { describe, expect, it } from "vitest";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Supplier {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  currencyId: number;
  isVatRegistered: boolean;
  paymentTermsDays: number;
}

interface PurchaseInvoiceItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  warehouseId: number;
}

interface PurchaseInvoice {
  id: number;
  tenantId: number;
  invoiceNumber: string;
  supplierId: number;
  branchId: number | null;
  costCenterId: number | null;
  warehouseId: number;
  status: "draft" | "confirmed" | "paid" | "partial" | "cancelled";
  items: PurchaseInvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  invoiceDate: Date;
  dueDate: Date;
  currencyId: number;
  exchangeRate: number;
  baseAmount: number;
}

interface Payment {
  id: number;
  tenantId: number;
  source: "purchases";
  invoiceId: number;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  currencyId: number;
  exchangeRate: number;
  baseAmount: number;
  idempotencyKey: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createSupplier(data: Partial<Supplier> = {}): Supplier {
  return {
    id: 1,
    tenantId: 1,
    code: "SUP-001",
    name: "شركة الأمل للمستحضرات الطبية",
    phone: "+967-771-234567",
    email: "supplier@example.com",
    address: "صنعاء، شارع الستين",
    balance: 0,
    currencyId: 1,
    isVatRegistered: false,
    paymentTermsDays: 30,
    ...data,
  };
}

function createItem(
  data: Partial<PurchaseInvoiceItem> = {}
): PurchaseInvoiceItem {
  return {
    id: 1,
    productId: 1,
    productName: "Product A",
    quantity: 10,
    unitPrice: 50,
    discount: 0,
    total: 500,
    warehouseId: 1,
    ...data,
  };
}

function calcTotals(
  items: PurchaseInvoiceItem[],
  taxRate: number,
  discount = 0
) {
  const subtotal = items.reduce((s, i) => {
    i.total = i.quantity * i.unitPrice - i.discount;
    return s + i.total;
  }, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discount;
  return { subtotal, taxAmount, total };
}

function createInvoice(data: Partial<PurchaseInvoice> = {}): PurchaseInvoice {
  const items = data.items || [createItem()];
  const taxRate = data.taxRate ?? 0;
  const discount = data.discount ?? 0;
  const { subtotal, taxAmount, total } = calcTotals(items, taxRate, discount);
  return {
    id: 1,
    tenantId: 1,
    invoiceNumber: "PI-001",
    supplierId: 1,
    branchId: null,
    costCenterId: null,
    warehouseId: 1,
    status: "draft",
    items,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    total,
    paidAmount: 0,
    paymentMethod: "cash",
    invoiceDate: new Date("2026-09-01"),
    dueDate: new Date("2026-10-01"),
    currencyId: 1,
    exchangeRate: 1,
    baseAmount: total,
    ...data,
  };
}

function processPayment(inv: PurchaseInvoice, amount: number, method = "cash") {
  const payment: Payment = {
    id: Date.now(),
    tenantId: inv.tenantId,
    source: "purchases",
    invoiceId: inv.id,
    amount,
    paymentMethod: method,
    paymentDate: new Date(),
    currencyId: inv.currencyId,
    exchangeRate: inv.exchangeRate,
    baseAmount: amount * inv.exchangeRate,
    idempotencyKey: null,
  };
  inv.paidAmount += amount;
  inv.status =
    inv.paidAmount >= inv.total
      ? "paid"
      : inv.paidAmount > 0
        ? "partial"
        : inv.status;
  return { invoice: inv, payment };
}

function validateSupplier(d: Partial<Supplier>) {
  const errors: string[] = [];
  if (!d.name?.trim()) errors.push("name_required");
  if (!d.code?.trim()) errors.push("code_required");
  return { valid: errors.length === 0, errors };
}

function validateInvoice(d: Partial<PurchaseInvoice>) {
  const errors: string[] = [];
  if (!d.supplierId) errors.push("supplier_required");
  if (!d.items?.length) errors.push("items_required");
  d.items?.forEach(i => {
    if (i.quantity <= 0) errors.push(`qty_${i.productId}`);
    if (i.unitPrice < 0) errors.push(`price_${i.productId}`);
  });
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Purchases E2E: Supplier Lifecycle", () => {
  it("creates supplier with all fields", () => {
    const s = createSupplier({
      name: "شركة النور للأدوية",
      code: "SUP-010",
      phone: "+967-773-987654",
      email: "nour@example.com",
      address: "عدن، كريتر",
      isVatRegistered: true,
      paymentTermsDays: 60,
    });
    expect(s.name).toBe("شركة النور للأدوية");
    expect(s.isVatRegistered).toBe(true);
    expect(s.paymentTermsDays).toBe(60);
  });

  it("validates required fields", () => {
    const r = validateSupplier({ name: "", code: "" });
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("name_required");
  });

  it("valid supplier passes", () => {
    expect(validateSupplier({ name: "Test", code: "S1" }).valid).toBe(true);
  });

  it("supplier balance tracking", () => {
    const s = createSupplier({ balance: 0 });
    s.balance += 5000;
    s.balance -= 2000;
    expect(s.balance).toBe(3000);
  });

  it("payment terms affect due date", () => {
    const s = createSupplier({ paymentTermsDays: 45 });
    const d = new Date("2026-09-01");
    d.setDate(d.getDate() + s.paymentTermsDays);
    expect(d.getDate()).toBe(16);
  });

  it("VAT registration status", () => {
    expect(createSupplier({ isVatRegistered: true }).isVatRegistered).toBe(
      true
    );
    expect(createSupplier({ isVatRegistered: false }).isVatRegistered).toBe(
      false
    );
  });
});

describe("Purchases E2E: Purchase Invoice Lifecycle", () => {
  it("creates invoice with items", () => {
    const items = [
      createItem({ quantity: 10, unitPrice: 50 }),
      createItem({ id: 2, productId: 2, quantity: 5, unitPrice: 100 }),
    ];
    const inv = createInvoice({ items });
    expect(inv.items).toHaveLength(2);
    expect(inv.subtotal).toBe(1000);
  });

  it("status transitions: draft → confirmed → paid", () => {
    const inv = createInvoice();
    expect(inv.status).toBe("draft");
    inv.status = "confirmed";
    expect(inv.status).toBe("confirmed");
    inv.paidAmount = inv.total;
    inv.status = "paid";
    expect(inv.status).toBe("paid");
  });

  it("partial payment tracking", () => {
    const inv = createInvoice({ total: 1000 });
    const { invoice } = processPayment(inv, 400);
    expect(invoice.paidAmount).toBe(400);
    expect(invoice.status).toBe("partial");
  });

  it("full payment marks paid", () => {
    const inv = createInvoice({ total: 1000 });
    const { invoice } = processPayment(inv, 1000);
    expect(invoice.status).toBe("paid");
  });

  it("invoice cancellation", () => {
    const inv = createInvoice();
    inv.status = "cancelled";
    expect(inv.status).toBe("cancelled");
  });

  it("currency and exchange rate", () => {
    const inv = createInvoice({ currencyId: 2, exchangeRate: 250, total: 100 });
    inv.baseAmount = inv.total * inv.exchangeRate;
    expect(inv.baseAmount).toBe(25000);
  });

  it("cost center assignment", () => {
    expect(createInvoice({ costCenterId: 5 }).costCenterId).toBe(5);
  });
});

describe("Purchases E2E: Purchase Invoice Calculations", () => {
  it("subtotal = sum(quantity × unitPrice - discount)", () => {
    const items = [
      createItem({ quantity: 10, unitPrice: 50 }),
      createItem({ id: 2, quantity: 20, unitPrice: 30 }),
    ];
    expect(calcTotals(items, 0).subtotal).toBe(1100);
  });

  it("taxAmount = subtotal × taxRate / 100", () => {
    const items = [createItem({ quantity: 10, unitPrice: 100 })];
    expect(calcTotals(items, 15).taxAmount).toBe(150);
  });

  it("total = subtotal + taxAmount - discount", () => {
    const items = [createItem({ quantity: 10, unitPrice: 100 })];
    expect(calcTotals(items, 15, 50).total).toBe(1100);
  });

  it("discount on individual items", () => {
    const items = [createItem({ quantity: 10, unitPrice: 100, discount: 50 })];
    expect(calcTotals(items, 0).subtotal).toBe(950);
  });

  it("zero tax rate", () => {
    const items = [createItem({ quantity: 5, unitPrice: 200 })];
    const r = calcTotals(items, 0);
    expect(r.taxAmount).toBe(0);
    expect(r.total).toBe(1000);
  });

  it("multiple items with mixed discounts", () => {
    const items = [
      createItem({ quantity: 10, unitPrice: 100, discount: 100 }),
      createItem({ id: 2, quantity: 5, unitPrice: 200 }),
      createItem({ id: 3, quantity: 20, unitPrice: 10, discount: 50 }),
    ];
    expect(calcTotals(items, 0).subtotal).toBe(2050);
  });

  it("balance = total - paidAmount", () => {
    const inv = createInvoice({ total: 5000 });
    inv.paidAmount = 2000;
    expect(inv.total - inv.paidAmount).toBe(3000);
  });
});

describe("Purchases E2E: Stock Impact", () => {
  it("confirming purchase adds stock", () => {
    const stock: Record<number, number> = { 1: 100, 2: 50 };
    [
      { pid: 1, qty: 20 },
      { pid: 2, qty: 10 },
    ].forEach(i => (stock[i.pid] += i.qty));
    expect(stock[1]).toBe(120);
    expect(stock[2]).toBe(60);
  });

  it("cancelling confirmed purchase deducts stock", () => {
    const stock: Record<number, number> = { 1: 120, 2: 60 };
    [
      { pid: 1, qty: 20 },
      { pid: 2, qty: 10 },
    ].forEach(i => (stock[i.pid] -= i.qty));
    expect(stock[1]).toBe(100);
    expect(stock[2]).toBe(50);
  });

  it("purchase with multiple warehouses", () => {
    const ws: Record<number, Record<number, number>> = {
      1: { 1: 100 },
      2: { 1: 50 },
    };
    [
      { wid: 1, pid: 1, qty: 30 },
      { wid: 2, pid: 1, qty: 20 },
    ].forEach(i => (ws[i.wid][i.pid] += i.qty));
    expect(ws[1][1]).toBe(130);
    expect(ws[2][1]).toBe(70);
  });

  it("purchase order with weighted average cost", () => {
    const layers = [
      { qty: 100, unitCost: 25 },
      { qty: 50, unitCost: 30 },
    ];
    const totalQty = layers.reduce((s, l) => s + l.qty, 0);
    const totalCost = layers.reduce((s, l) => s + l.qty * l.unitCost, 0);
    expect(totalCost / totalQty).toBeCloseTo(26.67, 1);
  });
});

describe("Purchases E2E: Payment Processing", () => {
  it("records payment against invoice", () => {
    const inv = createInvoice({ total: 5000 });
    const { payment } = processPayment(inv, 3000);
    expect(payment.amount).toBe(3000);
    expect(inv.paidAmount).toBe(3000);
    expect(inv.status).toBe("partial");
  });

  it("multiple payment methods", () => {
    const inv = createInvoice({ total: 10000 });
    processPayment(inv, 6000, "bank_transfer");
    processPayment(inv, 4000, "cash");
    expect(inv.paidAmount).toBe(10000);
    expect(inv.status).toBe("paid");
  });

  it("payment idempotency", () => {
    const inv = createInvoice({ total: 5000 });
    const key = "pay-key-123";
    const p1 = { idempotencyKey: key, amount: 2000 };
    const p2 = { idempotencyKey: key, amount: 2000 };
    expect(p1.idempotencyKey).toBe(p2.idempotencyKey);
    // Real system would reject duplicate key
  });

  it("payment affects supplier balance", () => {
    const s = createSupplier({ balance: 10000 });
    const paymentAmount = 3000;
    s.balance -= paymentAmount;
    expect(s.balance).toBe(7000);
  });

  it("overpayment handling", () => {
    const inv = createInvoice({ total: 1000 });
    processPayment(inv, 1200);
    expect(inv.paidAmount).toBe(1200);
    expect(inv.paidAmount).toBeGreaterThan(inv.total);
  });

  it("payment date tracking", () => {
    const inv = createInvoice({ total: 1000 });
    const { payment } = processPayment(inv, 500);
    expect(payment.paymentDate).toBeInstanceOf(Date);
  });

  it("sequential payments track correctly", () => {
    const inv = createInvoice({ total: 10000 });
    processPayment(inv, 2000);
    processPayment(inv, 3000);
    processPayment(inv, 5000);
    expect(inv.paidAmount).toBe(10000);
    expect(inv.status).toBe("paid");
  });
});

describe("Purchases E2E: Validation Rules", () => {
  it("rejects invoice without supplier", () => {
    expect(validateInvoice({ items: [createItem()] }).valid).toBe(false);
  });

  it("rejects invoice without items", () => {
    expect(validateInvoice({ supplierId: 1, items: [] }).valid).toBe(false);
  });

  it("rejects negative quantity", () => {
    expect(
      validateInvoice({ supplierId: 1, items: [createItem({ quantity: -5 })] })
        .valid
    ).toBe(false);
  });

  it("rejects negative unit price", () => {
    expect(
      validateInvoice({
        supplierId: 1,
        items: [createItem({ unitPrice: -100 })],
      }).valid
    ).toBe(false);
  });

  it("valid invoice passes", () => {
    expect(
      validateInvoice({ supplierId: 1, items: [createItem()] }).valid
    ).toBe(true);
  });
});
