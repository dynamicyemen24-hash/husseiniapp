import { describe, it, expect } from "vitest";
import {
  matchGrnAgainstPo,
  matchInvoiceAgainstPo,
  assertSupplierMatches,
  DEFAULT_PRICE_TOLERANCE_PCT,
} from "./threeWayMatch";
import type { OrderLineLike } from "./threeWayMatch";

const line = (over: Partial<OrderLineLike> = {}): OrderLineLike => ({
  poItemId: 1,
  productId: 101,
  productName: "سكر",
  quantity: 100,
  receivedQty: 0,
  unitPrice: "1000",
  discount: "0",
  ...over,
});

describe("matchGrnAgainstPo — استلام مقابل أمر شراء", () => {
  it("يقبل استلاماً كاملاً ضمن الكمية المطلوبة", () => {
    const res = matchGrnAgainstPo(
      [line({ quantity: 100 })],
      [
        {
          productId: 101,
          productName: "سكر",
          quantityReceived: 100,
          unitPrice: "1000",
        },
      ]
    );
    expect(res.ok).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it("يرفض الاستلام الزائد (تفاوت 0%)", () => {
    const res = matchGrnAgainstPo(
      [line({ quantity: 100 })],
      [
        {
          productId: 101,
          productName: "سكر",
          quantityReceived: 101,
          unitPrice: "1000",
        },
      ]
    );
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === "OVER_RECEIPT")).toBe(true);
  });

  it("يرفض سلعة غير موجودة في الأمر", () => {
    const res = matchGrnAgainstPo(
      [line()],
      [
        {
          productId: 999,
          productName: "غريب",
          quantityReceived: 5,
          unitPrice: "1",
        },
      ]
    );
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === "NOT_ON_ORDER")).toBe(true);
  });

  it("يحسب الكمية المتبقية بعد الاستلام الجزئي (لا تضاعف)", () => {
    const order = [line({ quantity: 100, receivedQty: 40 })];
    const res = matchGrnAgainstPo(order, [
      {
        productId: 101,
        productName: "سكر",
        quantityReceived: 60,
        unitPrice: "1000",
      },
    ]);
    expect(res.ok).toBe(true);
    expect(res.matchedQty).toBe(60);
  });

  it("يرفض الاستلام إذا كانت الكمية صفر أو سالبة", () => {
    const res = matchGrnAgainstPo(
      [line({ quantity: 100 })],
      [
        {
          productId: 101,
          productName: "سكر",
          quantityReceived: 0,
          unitPrice: "1000",
        },
      ]
    );
    expect(res.ok).toBe(false);
  });
});

describe("matchInvoiceAgainstPo — المطابقة الثلاثية الكاملة", () => {
  it("يقبل فاتورة مطابقة للكمية المستلمة والسعر", () => {
    const order = [
      line({ quantity: 100, receivedQty: 100, unitPrice: "1000" }),
    ];
    const res = matchInvoiceAgainstPo(
      order,
      [
        {
          productId: 101,
          productName: "سكر",
          quantity: 100,
          unitPrice: "1000",
        },
      ],
      [{ productId: 101, productName: "سكر", quantityReceived: 100 }]
    );
    expect(res.ok).toBe(true);
  });

  it("يرفض فوترة أكبر من المستلم", () => {
    const order = [line({ quantity: 100, receivedQty: 50, unitPrice: "1000" })];
    const res = matchInvoiceAgainstPo(
      order,
      [{ productId: 101, productName: "سكر", quantity: 80, unitPrice: "1000" }],
      [{ productId: 101, productName: "سكر", quantityReceived: 50 }]
    );
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === "OVER_INVOICED")).toBe(true);
  });

  it("يرفض الفاتورة خارج نطاق أمر الشراء", () => {
    const order = [line()];
    const res = matchInvoiceAgainstPo(
      order,
      [{ productId: 555, productName: "أخرى", quantity: 1, unitPrice: "10" }],
      []
    );
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === "NOT_ON_ORDER")).toBe(true);
  });

  it(`يرفض انحرافاً سعرياً يتجاوز ${DEFAULT_PRICE_TOLERANCE_PCT}%`, () => {
    const order = [line({ unitPrice: "1000" })];
    const res = matchInvoiceAgainstPo(
      order,
      [{ productId: 101, productName: "سكر", quantity: 10, unitPrice: "1101" }],
      [{ productId: 101, productName: "سكر", quantityReceived: 10 }]
    );
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === "PRICE_VARIANCE")).toBe(true);
  });

  it("يتسامح مع انحراف سعري ضمن الحد الافتراضي", () => {
    const order = [line({ unitPrice: "1000" })];
    const res = matchInvoiceAgainstPo(
      order,
      [{ productId: 101, productName: "سكر", quantity: 10, unitPrice: "1030" }],
      [{ productId: 101, productName: "سكر", quantityReceived: 10 }]
    );
    expect(res.ok).toBe(true);
  });

  it("يدعم تفاوت سعر مخصص صفري (حرفي)", () => {
    const order = [line({ unitPrice: "1000" })];
    const res = matchInvoiceAgainstPo(
      order,
      [
        {
          productId: 101,
          productName: "سكر",
          quantity: 10,
          unitPrice: "1000.01",
        },
      ],
      [{ productId: 101, productName: "سكر", quantityReceived: 10 }],
      { priceTolerancePct: 0 }
    );
    expect(res.ok).toBe(false);
  });
});

describe("assertSupplierMatches — تطابق المورد", () => {
  it("يمرر عندما لا يوجد مورد محدد", () => {
    expect(assertSupplierMatches(undefined, undefined).ok).toBe(true);
  });
  it("يمرر عندما يتطابق الموردان", () => {
    expect(assertSupplierMatches(5, 5).ok).toBe(true);
  });
  it("يفشل عند اختلاف المورد", () => {
    const res = assertSupplierMatches(5, 9);
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === "SUPPLIER_MISMATCH")).toBe(true);
  });
});
