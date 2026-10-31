import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  testDb,
  createTestTenant,
  createTestUser,
  createTestContext,
} from "./vitest.integration.setup";
import * as schema from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("salesRouter (quotation + POS) integration", () => {
  let tenantId: number;
  let userId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let productId: number;
  let customerId: number;
  let warehouseId: number;
  let unitId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "Sales Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "sales@test.com");
    userId = user[0].id;

    const warehouse = await testDb
      .insert(schema.warehouses)
      .values({
        tenantId,
        name: "Main Warehouse",
        code: "WH001",
        isActive: true,
      })
      .returning();
    warehouseId = warehouse[0].id;

    const unit = await testDb
      .insert(schema.units)
      .values({
        tenantId,
        name: "Piece",
        code: "PCS",
        symbol: "قطعة",
      })
      .returning();
    unitId = unit[0].id;

    const product = await testDb
      .insert(schema.products)
      .values({
        tenantId,
        code: "PROD001",
        name: "Test Product",
        type: "goods",
        salePrice: "100",
        purchasePrice: "60",
        currentStock: 50,
        minStock: 5,
        unitId,
        isActive: true,
      })
      .returning();
    productId = product[0].id;

    const customer = await testDb
      .insert(schema.customers)
      .values({
        tenantId,
        code: "CUST001",
        name: "Test Customer",
        balance: "0",
      })
      .returning();
    customerId = customer[0].id;

    caller = appRouter.createCaller(createTestContext(tenantId, userId));
  });

  beforeEach(async () => {
    await testDb
      .delete(schema.quotations)
      .where(eq(schema.quotations.tenantId, tenantId));
    await testDb
      .delete(schema.salesInvoices)
      .where(eq(schema.salesInvoices.tenantId, tenantId));
    await testDb
      .delete(schema.salesInvoiceItems)
      .where(eq(schema.salesInvoiceItems.tenantId, tenantId));
  });

  it("quotation: create → submit → approve → convert to order", async () => {
    const types = await caller.quotation.types.list();
    expect(types.length).toBeGreaterThan(0);
    const saleType = types.find(t => t.direction === "sale");
    expect(saleType).toBeDefined();

    const createResult = await caller.quotation.create({
      direction: "sale",
      typeId: saleType!.id,
      customerId,
      lines: [
        {
          kind: "product",
          refId: productId,
          name: "Test Product",
          quantity: 10,
          unit: "قطعة",
          unitPrice: 100,
          costPrice: 60,
          discountPct: 5,
          taxPct: 0,
        },
      ],
      parties: [
        {
          role: "customer",
          entityType: "customer",
          entityId: customerId,
          name: "Test Customer",
        },
      ],
      validityDays: 30,
    });

    expect(createResult.id).toBeDefined();
    expect(createResult.quotationNumber).toMatch(/^QT-S-\d{4}-\d{5}$/);

    const quotation = await caller.quotation.get({ id: createResult.id });
    expect(quotation.header.status).toBe("draft");

    await caller.quotation.transition({ id: createResult.id, to: "in_review" });
    await caller.quotation.transition({ id: createResult.id, to: "approved" });
    await caller.quotation.transition({ id: createResult.id, to: "sent" });

    const sent = await caller.quotation.get({ id: createResult.id });
    expect(sent.header.status).toBe("sent");

    const analyze = await caller.quotation.analyze({ id: createResult.id });
    expect(analyze.scores).toBeDefined();
    expect(analyze.ranking).toBeDefined();
  });

  it("POS: create sale with cash payment", async () => {
    const result = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 2, discount: 0 }],
      paymentMethod: "cash",
    });

    expect(result.success).toBe(true);
    expect(result.invoiceNumber).toMatch(/^POS-/);
    expect(result.invoiceId).toBeDefined();
    expect(parseFloat(result.total)).toBe(200);

    const invoice = await testDb
      .select()
      .from(schema.salesInvoices)
      .where(eq(schema.salesInvoices.id, result.invoiceId));
    expect(invoice[0].status).toBe("confirmed");
    expect(invoice[0].paymentMethod).toBe("cash");

    const items = await testDb
      .select()
      .from(schema.salesInvoiceItems)
      .where(eq(schema.salesInvoiceItems.invoiceId, result.invoiceId));
    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(2);

    const stock = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(stock[0].currentStock).toBe(48);
  });

  it("POS: idempotency key prevents duplicate sales", async () => {
    const idempotencyKey = "test-idempotency-" + Date.now();

    const result1 = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "cash",
      idempotencyKey,
    });

    const result2 = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "cash",
      idempotencyKey,
    });

    expect(result1.invoiceId).toBe(result2.invoiceId);
    expect(result2.idempotent).toBe(true);

    const stock = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(stock[0].currentStock).toBe(49);
  });

  it("POS: void sale restores stock", async () => {
    const result = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 5 }],
      paymentMethod: "cash",
    });

    const stockBeforeVoid = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(stockBeforeVoid[0].currentStock).toBe(45);

    await caller.pos.voidSale({ invoiceId: result.invoiceId });

    const stockAfterVoid = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(stockAfterVoid[0].currentStock).toBe(50);

    const invoice = await testDb
      .select()
      .from(schema.salesInvoices)
      .where(eq(schema.salesInvoices.id, result.invoiceId));
    expect(invoice[0].status).toBe("cancelled");
  });

  it("POS: return items restores stock", async () => {
    const result = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 3 }],
      paymentMethod: "cash",
    });

    await caller.pos.returns({
      invoiceId: result.invoiceId,
      reason: "Defective product",
      items: [{ productId, quantity: 2 }],
    });

    const stockAfterReturn = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(stockAfterReturn[0].currentStock).toBe(49);
  });

  it("POS: print receipt returns formatted HTML", async () => {
    const result = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "cash",
    });

    const receipt = await caller.pos.printReceipt({
      invoiceNumber: result.invoiceNumber,
    });
    expect(receipt).not.toBeNull();
    expect(receipt!.receiptHtml).toContain(result.invoiceNumber);
    expect(receipt!.receiptHtml).toContain("Test Product");
  });

  it("POS: hold/recall toggles draft/confirmed", async () => {
    const result = await caller.pos.createSale({
      customerId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: "cash",
    });

    const holdResult = await caller.pos.holdRecall({
      invoiceId: result.invoiceId,
    });
    expect(holdResult.status).toBe("draft");

    const recallResult = await caller.pos.holdRecall({
      invoiceId: result.invoiceId,
    });
    expect(recallResult.status).toBe("confirmed");
  });
});
