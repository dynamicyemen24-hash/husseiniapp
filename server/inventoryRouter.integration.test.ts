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

describe("inventoryRouter integration", () => {
  let tenantId: number;
  let userId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let warehouseId: number;
  let unitId: number;
  let categoryId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "Inventory Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "inventory@test.com");
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

    const category = await testDb
      .insert(schema.categories)
      .values({
        tenantId,
        name: "Test Category",
        code: "CAT001",
      })
      .returning();
    categoryId = category[0].id;

    caller = appRouter.createCaller(createTestContext(tenantId, userId));
  });

  beforeEach(async () => {
    await testDb
      .delete(schema.warehouseStock)
      .where(eq(schema.warehouseStock.tenantId, tenantId));
    await testDb
      .delete(schema.stockAdjustments)
      .where(eq(schema.stockAdjustments.tenantId, tenantId));
    await testDb
      .delete(schema.products)
      .where(eq(schema.products.tenantId, tenantId));
  });

  it("create product → adjust stock → transfer between warehouses", async () => {
    const product = await caller.inventory.create({
      code: "PROD001",
      name: "Test Product",
      type: "goods",
      salePrice: "100",
      purchasePrice: "60",
      currentStock: 0,
      minStock: 10,
      unitId,
      category: "Test Category",
      isActive: true,
    });

    expect(product.id).toBeDefined();
    expect(product.code).toBe("PROD001");

    const addResult = await caller.inventory.adjustStock({
      productId: product.id,
      warehouseId,
      quantity: 100,
      type: "add",
      notes: "Initial stock",
    });

    expect(addResult.success).toBe(true);
    expect(addResult.previousQty).toBe(0);
    expect(addResult.newQty).toBe(100);

    const stock = await testDb
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.tenantId, tenantId),
          eq(schema.warehouseStock.productId, product.id),
          eq(schema.warehouseStock.warehouseId, warehouseId)
        )
      );
    expect(stock[0].quantity).toBe(100);

    const adj = await testDb
      .select()
      .from(schema.stockAdjustments)
      .where(
        and(
          eq(schema.stockAdjustments.tenantId, tenantId),
          eq(schema.stockAdjustments.productId, product.id)
        )
      );
    expect(adj.length).toBe(1);
    expect(adj[0].reason).toBe("إدخال");
    expect(adj[0].previousQty).toBe(0);
    expect(adj[0].newQty).toBe(100);

    const warehouse2 = await testDb
      .insert(schema.warehouses)
      .values({
        tenantId,
        name: "Secondary Warehouse",
        code: "WH002",
        isActive: true,
      })
      .returning();

    const removeResult = await caller.inventory.adjustStock({
      productId: product.id,
      warehouseId,
      quantity: 30,
      type: "remove",
      notes: "Transfer out",
    });

    expect(removeResult.newQty).toBe(70);

    const addResult2 = await caller.inventory.adjustStock({
      productId: product.id,
      warehouseId: warehouse2[0].id,
      quantity: 30,
      type: "add",
      notes: "Transfer in",
    });

    expect(addResult2.newQty).toBe(30);

    const stockWh1 = await testDb
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.tenantId, tenantId),
          eq(schema.warehouseStock.productId, product.id),
          eq(schema.warehouseStock.warehouseId, warehouseId)
        )
      );
    expect(stockWh1[0].quantity).toBe(70);

    const stockWh2 = await testDb
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.tenantId, tenantId),
          eq(schema.warehouseStock.productId, product.id),
          eq(schema.warehouseStock.warehouseId, warehouse2[0].id)
        )
      );
    expect(stockWh2[0].quantity).toBe(30);
  });

  it("physical count adjustment", async () => {
    const product = await caller.inventory.create({
      code: "PROD002",
      name: "Physical Count Test",
      type: "goods",
      salePrice: "200",
      purchasePrice: "120",
      currentStock: 50,
      minStock: 5,
      unitId,
      isActive: true,
    });

    await caller.inventory.adjustStock({
      productId: product.id,
      warehouseId,
      quantity: 50,
      type: "set",
      notes: "Initial set",
    });

    const countResult = await caller.inventory.physicalCount({
      productId: product.id,
      warehouseId,
      countedQty: 45,
      notes: "Year-end count - 5 missing",
    });

    expect(countResult.success).toBe(true);
    expect(countResult.previousQty).toBe(50);
    expect(countResult.newQty).toBe(45);

    const stock = await testDb
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.tenantId, tenantId),
          eq(schema.warehouseStock.productId, product.id),
          eq(schema.warehouseStock.warehouseId, warehouseId)
        )
      );
    expect(stock[0].quantity).toBe(45);

    const adj = await testDb
      .select()
      .from(schema.stockAdjustments)
      .where(
        and(
          eq(schema.stockAdjustments.tenantId, tenantId),
          eq(schema.stockAdjustments.productId, product.id)
        )
      )
      .orderBy(schema.stockAdjustments.createdAt);
    expect(adj.length).toBe(2);
    expect(adj[1].reason).toBe("جرد فعلي");
  });

  it("prevent negative stock on remove", async () => {
    const product = await caller.inventory.create({
      code: "PROD003",
      name: "Negative Stock Test",
      type: "goods",
      salePrice: "50",
      purchasePrice: "30",
      currentStock: 0,
      minStock: 0,
      unitId,
      isActive: true,
    });

    await caller.inventory.adjustStock({
      productId: product.id,
      warehouseId,
      quantity: 10,
      type: "add",
    });

    await expect(
      caller.inventory.adjustStock({
        productId: product.id,
        warehouseId,
        quantity: 15,
        type: "remove",
      })
    ).rejects.toThrow("المخزون المتاح غير كافٍ");
  });

  it("edit product - forbid direct stock edit", async () => {
    const product = await caller.inventory.create({
      code: "PROD004",
      name: "Edit Test",
      type: "goods",
      salePrice: "100",
      purchasePrice: "60",
      currentStock: 0,
      unitId,
      isActive: true,
    });

    await expect(
      caller.inventory.edit({
        id: product.id,
        currentStock: 100,
      })
    ).rejects.toThrow("تعديل الرصيد المباشر ممنوع");

    const edited = await caller.inventory.edit({
      id: product.id,
      name: "Edited Name",
      salePrice: "150",
    });

    expect(edited.name).toBe("Edited Name");
    expect(edited.salePrice).toBe("150");
  });

  it("list products with pagination", async () => {
    for (let i = 1; i <= 5; i++) {
      await caller.inventory.create({
        code: `PAG${i.toString().padStart(3, "0")}`,
        name: `Product ${i}`,
        type: "goods",
        salePrice: String(100 + i * 10),
        purchasePrice: String(60 + i * 5),
        unitId,
        isActive: true,
      });
    }

    const page1 = await caller.inventory.list({ limit: 2, offset: 0 });
    expect(page1.length).toBe(2);

    const page2 = await caller.inventory.list({ limit: 2, offset: 2 });
    expect(page2.length).toBe(2);

    const all = await caller.inventory.list({ limit: 500 });
    expect(all.length).toBe(5);
  });

  it("delete product", async () => {
    const product = await caller.inventory.create({
      code: "DEL001",
      name: "To Delete",
      type: "goods",
      salePrice: "100",
      purchasePrice: "60",
      unitId,
      isActive: true,
    });

    await caller.inventory.delete({ id: product.id });

    const deleted = await caller.inventory.view({ id: product.id });
    expect(deleted).toBeNull();
  });

  it("stock valuation", async () => {
    const product = await caller.inventory.create({
      code: "VAL001",
      name: "Valuation Test",
      type: "goods",
      salePrice: "200",
      purchasePrice: "120",
      currentStock: 0,
      unitId,
      isActive: true,
    });

    await caller.inventory.adjustStock({
      productId: product.id,
      warehouseId,
      quantity: 50,
      type: "add",
    });

    const stock = await testDb
      .select()
      .from(schema.warehouseStock)
      .where(
        and(
          eq(schema.warehouseStock.tenantId, tenantId),
          eq(schema.warehouseStock.productId, product.id),
          eq(schema.warehouseStock.warehouseId, warehouseId)
        )
      );

    const valuation = stock[0].quantity * 120;
    expect(valuation).toBe(6000);
  });
});
