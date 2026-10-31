import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import {
  testDb,
  createTestTenant,
  createTestUser,
  createTestContext,
} from "./vitest.integration.setup";
import * as schema from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * تدفق المطابقة الثلاثية الكامل: أمر شراء ← سند استلام ← فاتورة مشتريات.
 * يتحقق من أن المخزون يُرحّل مرة واحدة فقط (عند الاستلام)، وأن الفوترة
 * ضد سند استلام لا تضاعف المخزون، وأن الاستلام الزائد مرفوض.
 */
describe("purchaseOrders / goodsReceipts integration", () => {
  let tenantId: number;
  let userId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let supplierId: number;
  let otherSupplierId: number;
  let productId: number;
  let warehouseId: number;
  let poId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "PO GRN Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "pogrn@test.com");
    userId = user[0].id;

    const supplier = await testDb
      .insert(schema.suppliers)
      .values({
        tenantId,
        code: "SUP-PO1",
        name: "مورد أمر الشراء",
        balance: "0",
      })
      .returning();
    supplierId = supplier[0].id;

    const other = await testDb
      .insert(schema.suppliers)
      .values({
        tenantId,
        code: "SUP-PO2",
        name: "مورد آخر",
        balance: "0",
      })
      .returning();
    otherSupplierId = other[0].id;

    const unit = await testDb
      .insert(schema.units)
      .values({ tenantId, name: "Piece", code: "PCS", symbol: "قطعة" })
      .returning();
    const unitId = unit[0].id;

    const product = await testDb
      .insert(schema.products)
      .values({
        tenantId,
        code: "PROD-PO1",
        name: "منتج أمر الشراء",
        type: "goods" as const,
        salePrice: "1500",
        purchasePrice: "1000",
        currentStock: 10,
        minStock: 5,
        unitId,
        supplierId,
        isActive: true,
      })
      .returning();
    productId = product[0].id;

    const wh = await testDb
      .insert(schema.warehouses)
      .values({
        tenantId,
        name: "مخزن رئيسي",
        code: "WH1",
        isActive: true,
      })
      .returning();
    warehouseId = wh[0].id;

    caller = appRouter.createCaller(createTestContext(tenantId, userId));
  });

  it("ينشئ أمر شراء مسودة بترقيم PO-YYYYMMDD-###", async () => {
    const res: any = await caller.purchaseOrders.create({
      supplierId,
      items: [{ productId, quantity: 100, unitPrice: "1000" }],
    });
    expect(res.success).toBe(true);
    expect(res.id).toBeTypeOf("number");
    expect(res.poNumber).toMatch(/^PO-\d{8}-\d{3}$/);
    poId = res.id;

    const view: any = await caller.purchaseOrders.view({ id: poId });
    expect(view.po.status).toBe("draft");
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0].quantity).toBe(100);
    expect(view.lines[0].receivedQty).toBe(0);
  });

  it("يصدر الأمر وينتقل للحالة issued", async () => {
    await caller.purchaseOrders.issue({ id: poId });
    const view: any = await caller.purchaseOrders.view({ id: poId });
    expect(view.po.status).toBe("issued");
  });

  it("يرفض استلاماً زائداً (تفاوت 0%)", async () => {
    const view: any = await caller.purchaseOrders.view({ id: poId });
    const lineId = view.lines[0].id;
    await expect(
      caller.purchaseOrders.receive({
        poId,
        items: [{ poItemId: lineId, productId, quantityReceived: 101 }],
      })
    ).rejects.toThrow();
  });

  it("يستلم جزئياً ويرحّل المخزون مرة واحدة فقط", async () => {
    const before = await testDb
      .select({ stock: schema.products.currentStock })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(before[0].stock).toBe(10);

    const view: any = await caller.purchaseOrders.view({ id: poId });
    const lineId = view.lines[0].id;
    const rec: any = await caller.purchaseOrders.receive({
      poId,
      items: [{ poItemId: lineId, productId, quantityReceived: 40 }],
    });
    expect(rec.success).toBe(true);
    expect(rec.grnId).toBeTypeOf("number");
    expect(rec.grnNumber).toMatch(/^GRN-\d{8}-\d{3}$/);
    expect(rec.poStatus).toBe("partially_received");

    const after = await testDb
      .select({ stock: schema.products.currentStock })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(after[0].stock).toBe(50);

    const ws = await testDb
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.productId, productId),
          eq(schema.warehouseStock.warehouseId, warehouseId)
        )
      );
    expect(ws[0].quantity).toBe(40);

    const grnView: any = await caller.goodsReceipts.view({ id: rec.grnId });
    expect(grnView.grn.status).toBe("posted");
    expect(grnView.lines).toHaveLength(1);
    expect(grnView.lines[0].quantityReceived).toBe(40);

    const poView: any = await caller.purchaseOrders.view({ id: poId });
    expect(poView.po.status).toBe("partially_received");
    expect(poView.lines[0].receivedQty).toBe(40);
  });

  it("يستكمل الاستلام وينتقل للحالة received", async () => {
    const view: any = await caller.purchaseOrders.view({ id: poId });
    const lineId = view.lines[0].id;
    const rec: any = await caller.purchaseOrders.receive({
      poId,
      items: [{ poItemId: lineId, productId, quantityReceived: 60 }],
    });
    expect(rec.success).toBe(true);
    expect(rec.poStatus).toBe("received");

    const row = await testDb
      .select({ stock: schema.products.currentStock })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(row[0].stock).toBe(110);

    const poView: any = await caller.purchaseOrders.view({ id: poId });
    expect(poView.po.status).toBe("received");
  });

  it("فاتورة مرتبطة بسند الاستلام لا تضاعف المخزون وتربط المستندات", async () => {
    const grns = await testDb
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.poId, poId));
    const firstGrnId = grns[0].id;

    const inv: any = await caller.purchases.create({
      supplierId,
      grnId: firstGrnId,
      poId,
      items: [
        {
          productId,
          productName: "منتج أمر الشراء",
          quantity: 40,
          unitPrice: "1000",
        },
      ],
    });
    expect(inv.success).toBe(true);
    expect(inv.invoiceId).toBeTypeOf("number");

    const row = await testDb
      .select({ stock: schema.products.currentStock })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(row[0].stock).toBe(110);

    const invoice = await testDb
      .select({
        poId: schema.purchaseInvoices.poId,
        grnId: schema.purchaseInvoices.grnId,
      })
      .from(schema.purchaseInvoices)
      .where(eq(schema.purchaseInvoices.id, inv.invoiceId));
    expect(invoice[0].poId).toBe(poId);
    expect(invoice[0].grnId).toBe(firstGrnId);
  });

  it("يرفض فوترة لصالح مورد مخالف لأمر الشراء", async () => {
    const grns = await testDb
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.poId, poId));
    const firstGrnId = grns[0].id;

    await expect(
      caller.purchases.create({
        supplierId: otherSupplierId,
        grnId: firstGrnId,
        poId,
        items: [
          {
            productId,
            productName: "منتج أمر الشراء",
            quantity: 40,
            unitPrice: "1000",
          },
        ],
      })
    ).rejects.toThrow();
  });

  it("يرفض إلغاء سند استلام مرتبط بفاتورة", async () => {
    const grns = await testDb
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.poId, poId));
    const firstGrnId = grns[0].id;
    await expect(
      caller.goodsReceipts.cancel({ id: firstGrnId, reason: "اختبار" })
    ).rejects.toThrow();
  });

  it("إلغاء سند استلام غير مرتبط يعكس المخزون والكميات", async () => {
    const view: any = await caller.purchaseOrders.view({ id: poId });
    const lineId = view.lines[0].id;
    const rec: any = await caller.purchaseOrders.receive({
      poId,
      items: [{ poItemId: lineId, productId, quantityReceived: 5 }],
    });
    expect(rec.success).toBe(true);

    const before = await testDb
      .select({ stock: schema.products.currentStock })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(before[0].stock).toBe(115);

    const cancelled: any = await caller.goodsReceipts.cancel({
      id: rec.grnId,
      reason: "إرجاع",
    });
    expect(cancelled.status).toBe("cancelled");

    const after = await testDb
      .select({ stock: schema.products.currentStock })
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(after[0].stock).toBe(110);
  });
});
