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

describe("procurementRouter integration", () => {
  let tenantId: number;
  let userId: number;
  let approverId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let departmentId: number;
  let accountIds: number[];
  let branchId: number;
  let supplierId: number;
  let productId: number;
  let unitId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "Procurement Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "procurement@test.com");
    userId = user[0].id;

    const approver = await createTestUser(
      testDb,
      tenantId,
      "approver@test.com"
    );
    approverId = approver[0].id;

    const branch = await testDb
      .insert(schema.branches)
      .values({
        tenantId,
        name: "Main Branch",
        code: "MAIN",
        isMain: true,
      })
      .returning();
    branchId = branch[0].id;

    const accountsData = [
      { code: "5000", name: "Inventory / Purchases", type: "expense" as const },
      { code: "2010", name: "Accounts Payable", type: "liability" as const },
    ];

    const insertedAccounts = await testDb
      .insert(schema.accounts)
      .values(accountsData.map(a => ({ ...a, tenantId })))
      .returning();
    accountIds = insertedAccounts.map(a => a.id);

    const dept = await testDb
      .insert(schema.departments)
      .values({
        tenantId,
        code: "PUR001",
        name: "Procurement Department",
        isActive: true,
      })
      .returning();
    departmentId = dept[0].id;

    const supplier = await testDb
      .insert(schema.suppliers)
      .values({
        tenantId,
        code: "SUP001",
        name: "Test Supplier",
        balance: "0",
      })
      .returning();
    supplierId = supplier[0].id;

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
        name: "Procurement Product",
        type: "goods",
        salePrice: "200",
        purchasePrice: "120",
        currentStock: 10,
        minStock: 5,
        unitId,
        supplierId,
        isActive: true,
      })
      .returning();
    productId = product[0].id;

    caller = appRouter.createCaller(createTestContext(tenantId, userId));
  });

  beforeEach(async () => {
    await testDb
      .delete(schema.procurementApprovals)
      .where(eq(schema.procurementApprovals.tenantId, tenantId));
    await testDb
      .delete(schema.procurements)
      .where(eq(schema.procurements.tenantId, tenantId));
  });

  it("procurement: create draft → approve → receive → posts GL", async () => {
    const createResult = await caller.erp.createProcurement({
      itemName: "Office Supplies",
      description: "Paper, pens, etc.",
      departmentId,
      quantity: "50",
      unit: "قطعة",
      estimatedCost: "5000",
      currency: "YER",
      supplierId,
    });

    expect(createResult.id).toBeDefined();
    expect(createResult.requisitionNumber).toMatch(/^REQ-\d+-\d+$/);
    expect(createResult.status).toBe("draft");

    const updateResult = await caller.erp.updateProcurement({
      id: createResult.id,
      status: "pending",
    });
    expect(updateResult.success).toBe(true);

    const approverCaller = appRouter.createCaller(
      createTestContext(tenantId, approverId)
    );
    await approverCaller.erp.approveProcurement({
      id: createResult.id,
      decision: "approved",
    });

    const approved = await testDb
      .select()
      .from(schema.procurements)
      .where(eq(schema.procurements.id, createResult.id));
    expect(approved[0].status).toBe("approved");

    await caller.erp.receiveProcurement({
      id: createResult.id,
      actualCost: "5200",
    });

    const received = await testDb
      .select()
      .from(schema.procurements)
      .where(eq(schema.procurements.id, createResult.id));
    expect(received[0].status).toBe("received");
    expect(received[0].receivedCost).toBe("5200");

    const journalEntries = await testDb
      .select()
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.sourceModule, "procurement"));
    expect(journalEntries.length).toBe(1);
    expect(journalEntries[0].status).toBe("posted");

    const transactions = await testDb
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.journalEntryId, journalEntries[0].id));
    expect(transactions.length).toBe(2);

    const productStock = await testDb
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(productStock[0].currentStock).toBe(60);
  });

  it("procurement: multi-step approval chain", async () => {
    const createResult = await caller.erp.createProcurement({
      itemName: "IT Equipment",
      description: "Laptops and monitors",
      departmentId,
      quantity: "10",
      unit: "قطعة",
      estimatedCost: "50000",
      currency: "YER",
      supplierId,
      approvers: [approverId, userId],
    });

    expect(createResult.status).toBe("pending");
    expect(createResult.approvers).toEqual([approverId, userId]);
    expect(createResult.approvalStep).toBe(0);

    const approverCaller = appRouter.createCaller(
      createTestContext(tenantId, approverId)
    );
    await approverCaller.erp.approveProcurement({
      id: createResult.id,
      decision: "approved",
    });

    const afterFirst = await testDb
      .select()
      .from(schema.procurements)
      .where(eq(schema.procurements.id, createResult.id));
    expect(afterFirst[0].status).toBe("pending");
    expect(afterFirst[0].approvalStep).toBe(1);

    await caller.erp.approveProcurement({
      id: createResult.id,
      decision: "approved",
    });

    const afterSecond = await testDb
      .select()
      .from(schema.procurements)
      .where(eq(schema.procurements.id, createResult.id));
    expect(afterSecond[0].status).toBe("approved");
    expect(afterSecond[0].approvalStep).toBe(2);

    const approvals = await caller.erp.listProcurementApprovals({
      procurementId: createResult.id,
    });
    expect(approvals.length).toBe(2);
    expect(approvals.every(a => a.decision === "approved")).toBe(true);
  });

  it("procurement: reject at any step rejects entire chain", async () => {
    const createResult = await caller.erp.createProcurement({
      itemName: "Furniture",
      description: "Desks and chairs",
      departmentId,
      quantity: "5",
      unit: "قطعة",
      estimatedCost: "25000",
      currency: "YER",
      supplierId,
      approvers: [approverId, userId],
    });

    const approverCaller = appRouter.createCaller(
      createTestContext(tenantId, approverId)
    );
    await approverCaller.erp.approveProcurement({
      id: createResult.id,
      decision: "rejected",
      note: "Budget exceeded",
    });

    const rejected = await testDb
      .select()
      .from(schema.procurements)
      .where(eq(schema.procurements.id, createResult.id));
    expect(rejected[0].status).toBe("rejected");
  });

  it("procurement: cannot receive unapproved requisition", async () => {
    const createResult = await caller.erp.createProcurement({
      itemName: "Raw Materials",
      departmentId,
      quantity: "100",
      unit: "كجم",
      estimatedCost: "10000",
      currency: "YER",
      supplierId,
    });

    await expect(
      caller.erp.receiveProcurement({
        id: createResult.id,
      })
    ).rejects.toThrow("لا يمكن استلام الطلب قبل اعتماده بالكامل");
  });

  it("procurement: list with status filter and KPIs", async () => {
    await caller.erp.createProcurement({
      itemName: "Item 1",
      departmentId,
      quantity: "10",
      estimatedCost: "1000",
      supplierId,
    });

    await caller.erp.createProcurement({
      itemName: "Item 2",
      departmentId,
      quantity: "20",
      estimatedCost: "2000",
      supplierId,
    });

    const all = await caller.erp.listProcurements({});
    expect(all.length).toBe(2);

    const draft = await caller.erp.listProcurements({ status: "draft" });
    expect(draft.length).toBe(2);

    const kpis = await caller.erp.getProcurementKpis();
    expect(kpis.total).toBe(2);
    expect(kpis.draft).toBe(2);
    expect(kpis.estimatedValue).toBe(3000);
  });

  it("procurement: reorder suggestions", async () => {
    await testDb
      .update(schema.products)
      .set({ currentStock: 3, reorderPoint: 10, reorderQty: 50 })
      .where(eq(schema.products.id, productId));

    const suggestions = await caller.erp.listReorderSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    const ourProduct = suggestions.find(s => s.product.id === productId);
    expect(ourProduct).toBeDefined();
    expect(ourProduct!.currentStock).toBe(3);
    expect(ourProduct!.reorderPoint).toBe(10);
    expect(ourProduct!.suggestedQty).toBe(50);
  });

  it("procurement: generate from reorder creates draft requisitions", async () => {
    await testDb
      .update(schema.products)
      .set({ currentStock: 2, reorderPoint: 5, reorderQty: 20 })
      .where(eq(schema.products.id, productId));

    const result = await caller.erp.generateProcurementsFromReorder();
    expect(result.created).toBeGreaterThanOrEqual(1);

    const generated = await testDb
      .select()
      .from(schema.procurements)
      .where(
        and(
          eq(schema.procurements.tenantId, tenantId),
          eq(schema.procurements.itemName, "Procurement Product")
        )
      );
    expect(generated.length).toBeGreaterThanOrEqual(1);
    expect(generated[0].status).toBe("draft");
    expect(generated[0].description).toContain("أُنشئ تلقائياً");
  });

  it("procurement: audit log on receive", async () => {
    const createResult = await caller.erp.createProcurement({
      itemName: "Audit Test Item",
      departmentId,
      quantity: "5",
      estimatedCost: "5000",
      supplierId,
    });

    const approverCaller = appRouter.createCaller(
      createTestContext(tenantId, approverId)
    );
    await approverCaller.erp.approveProcurement({
      id: createResult.id,
      decision: "approved",
    });

    await caller.erp.receiveProcurement({
      id: createResult.id,
      note: "Received in good condition",
    });

    const logs = await testDb
      .select()
      .from(schema.activityLogs)
      .where(
        and(
          eq(schema.activityLogs.tenantId, tenantId),
          eq(schema.activityLogs.entityType, "procurement"),
          eq(schema.activityLogs.entityId, createResult.id)
        )
      );
    expect(logs.length).toBeGreaterThan(0);
    const receiveLog = logs.find(l => l.action.includes("استلام توريد"));
    expect(receiveLog).toBeDefined();
    expect(receiveLog!.details).toContain("Received in good condition");
  });
});
