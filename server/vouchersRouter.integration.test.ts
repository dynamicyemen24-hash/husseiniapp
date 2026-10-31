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
import { getDb } from "./db";

describe("vouchersRouter integration", () => {
  let tenantId: number;
  let userId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let accountIds: number[];
  let branchId: number;
  let currencyId: number;

  beforeAll(async () => {
    const tenant = await createTestTenant(testDb, "Voucher Test Tenant");
    tenantId = tenant[0].id;

    const user = await createTestUser(testDb, tenantId, "voucher@test.com");
    userId = user[0].id;

    const currency = await testDb
      .insert(schema.currencies)
      .values({
        code: "YER",
        name: "Yemeni Rial",
        symbol: "ر.ي",
        isDefault: true,
        exchangeRate: "1",
      })
      .returning();
    currencyId = currency[0].id;

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
      { code: "1000", name: "Cash", type: "asset" as const },
      { code: "1100", name: "Bank", type: "asset" as const },
      { code: "2000", name: "Accounts Payable", type: "liability" as const },
      { code: "4000", name: "Revenue", type: "revenue" as const },
      { code: "5000", name: "Expenses", type: "expense" as const },
    ];

    const insertedAccounts = await testDb
      .insert(schema.accounts)
      .values(accountsData.map(a => ({ ...a, tenantId })))
      .returning();
    accountIds = insertedAccounts.map(a => a.id);

    caller = appRouter.createCaller(createTestContext(tenantId, userId));

    await testDb
      .update(schema.tenants)
      .set({ ownerUserId: userId })
      .where(eq(schema.tenants.id, tenantId));
  });

  beforeEach(async () => {
    await testDb
      .delete(schema.voucherLines)
      .where(eq(schema.voucherLines.tenantId, tenantId));
    await testDb
      .delete(schema.vouchers)
      .where(eq(schema.vouchers.tenantId, tenantId));
    await testDb
      .delete(schema.voucherApprovals)
      .where(eq(schema.voucherApprovals.tenantId, tenantId));
  });

  it("create → submit → approve → post → cancel flow for payment voucher", async () => {
    const createResult = await caller.vouchers.create({
      voucherType: "payment",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "5000",
      currencyId,
      exchangeRate: "1",
      description: "Test payment voucher",
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          accountName: "Cash",
          debitAmount: "5000",
          creditAmount: "0",
        },
        {
          accountId: accountIds[2],
          accountCode: "2000",
          accountName: "Accounts Payable",
          debitAmount: "0",
          creditAmount: "5000",
        },
      ],
    });

    expect(createResult.voucherId).toBeDefined();
    expect(createResult.voucherNumber).toMatch(/^PAY\/\d{4}\/\d{6}$/);

    const voucher = await caller.vouchers.get({ id: createResult.voucherId });
    expect(voucher.status).toBe("draft");

    await caller.vouchers.submit({ id: createResult.voucherId });

    const submitted = await caller.vouchers.get({ id: createResult.voucherId });
    expect(submitted.status).toBe("pending");

    await caller.vouchers.approve({
      id: createResult.voucherId,
      level: "final",
    });

    const approved = await caller.vouchers.get({ id: createResult.voucherId });
    expect(approved.status).toBe("approved");

    await caller.vouchers.post({
      id: createResult.voucherId,
      validateBudget: false,
    });

    const posted = await caller.vouchers.get({ id: createResult.voucherId });
    expect(posted.status).toBe("posted");
    expect(posted.journalEntryId).toBeDefined();

    const journalEntries = await testDb
      .select()
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.id, posted.journalEntryId));
    expect(journalEntries.length).toBe(1);
    expect(journalEntries[0].status).toBe("posted");

    const transactions = await testDb
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.journalEntryId, posted.journalEntryId));
    expect(transactions.length).toBe(2);

    const reversed = await caller.vouchers.reverse({
      id: createResult.voucherId,
      reversalDate: new Date().toISOString().split("T")[0],
      reason: "Test reversal",
    });

    expect(reversed.reversalId).toBeDefined();
    expect(reversed.reversalNumber).toMatch(/^ADJ\/\d{4}\/\d{6}$/);

    const original = await caller.vouchers.get({ id: createResult.voucherId });
    expect(original.status).toBe("posted");
  });

  it("create receipt voucher with customer", async () => {
    const customer = await testDb
      .insert(schema.customers)
      .values({
        tenantId,
        code: "CUST001",
        name: "Test Customer",
        balance: "0",
      })
      .returning();

    const createResult = await caller.vouchers.create({
      voucherType: "receipt",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "3000",
      currencyId,
      counterpartyType: "customer",
      counterpartyId: customer[0].id,
      description: "Customer receipt",
      lines: [
        {
          accountId: accountIds[1],
          accountCode: "1100",
          accountName: "Bank",
          debitAmount: "3000",
          creditAmount: "0",
        },
        {
          accountId: accountIds[3],
          accountCode: "4000",
          accountName: "Revenue",
          debitAmount: "0",
          creditAmount: "3000",
        },
      ],
    });

    expect(createResult.voucherNumber).toMatch(/^REC\/\d{4}\/\d{6}$/);

    await caller.vouchers.submit({ id: createResult.voucherId });
    await caller.vouchers.approve({
      id: createResult.voucherId,
      level: "final",
    });
    await caller.vouchers.post({
      id: createResult.voucherId,
      validateBudget: false,
    });

    const posted = await caller.vouchers.get({ id: createResult.voucherId });
    expect(posted.status).toBe("posted");

    const updatedCustomer = await testDb
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, customer[0].id));
    expect(parseFloat(updatedCustomer[0].balance)).toBe(3000);
  });

  it("reject voucher", async () => {
    const createResult = await caller.vouchers.create({
      voucherType: "journal",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "1000",
      currencyId,
      description: "To be rejected",
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          accountName: "Cash",
          debitAmount: "1000",
          creditAmount: "0",
        },
        {
          accountId: accountIds[4],
          accountCode: "5000",
          accountName: "Expenses",
          debitAmount: "0",
          creditAmount: "1000",
        },
      ],
    });

    await caller.vouchers.submit({ id: createResult.voucherId });
    await caller.vouchers.reject({
      id: createResult.voucherId,
      reason: "Wrong account",
    });

    const rejected = await caller.vouchers.get({ id: createResult.voucherId });
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Wrong account");
  });

  it("list vouchers with filters", async () => {
    await caller.vouchers.create({
      voucherType: "payment",
      voucherDate: "2026-01-15",
      amount: "1000",
      currencyId,
      description: "Jan payment",
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          debitAmount: "1000",
          creditAmount: "0",
        },
      ],
    });
    await caller.vouchers.create({
      voucherType: "receipt",
      voucherDate: "2026-02-15",
      amount: "2000",
      currencyId,
      description: "Feb receipt",
      lines: [
        {
          accountId: accountIds[1],
          accountCode: "1100",
          debitAmount: "2000",
          creditAmount: "0",
        },
      ],
    });

    const all = await caller.vouchers.list({ page: 1, pageSize: 10 });
    expect(all.items.length).toBe(2);

    const payments = await caller.vouchers.list({ type: "payment" });
    expect(payments.items.length).toBe(1);
    expect(payments.items[0].voucherType).toBe("payment");

    const fromDate = await caller.vouchers.list({ fromDate: "2026-02-01" });
    expect(fromDate.items.length).toBe(1);
    expect(fromDate.items[0].voucherType).toBe("receipt");
  });

  it("validate voucher lines balance", async () => {
    await expect(
      caller.vouchers.create({
        voucherType: "payment",
        voucherDate: new Date().toISOString().split("T")[0],
        amount: "1000",
        currencyId,
        lines: [
          {
            accountId: accountIds[0],
            accountCode: "1000",
            debitAmount: "1000",
            creditAmount: "0",
          },
          {
            accountId: accountIds[2],
            accountCode: "2000",
            debitAmount: "0",
            creditAmount: "500",
          },
        ],
      })
    ).rejects.toThrow("غير متوازنة");
  });

  it("cancel draft voucher", async () => {
    const createResult = await caller.vouchers.create({
      voucherType: "adjustment",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "500",
      currencyId,
      description: "To be cancelled",
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          debitAmount: "500",
          creditAmount: "0",
        },
        {
          accountId: accountIds[4],
          accountCode: "5000",
          debitAmount: "0",
          creditAmount: "500",
        },
      ],
    });

    await caller.vouchers.cancel({
      id: createResult.voucherId,
      reason: "Test cancel",
    });

    const cancelled = await caller.vouchers.get({ id: createResult.voucherId });
    expect(cancelled.status).toBe("cancelled");
  });

  it("cannot cancel posted voucher", async () => {
    const createResult = await caller.vouchers.create({
      voucherType: "payment",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "1000",
      currencyId,
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          debitAmount: "1000",
          creditAmount: "0",
        },
        {
          accountId: accountIds[2],
          accountCode: "2000",
          debitAmount: "0",
          creditAmount: "1000",
        },
      ],
    });

    await caller.vouchers.submit({ id: createResult.voucherId });
    await caller.vouchers.approve({
      id: createResult.voucherId,
      level: "final",
    });
    await caller.vouchers.post({
      id: createResult.voucherId,
      validateBudget: false,
    });

    await expect(
      caller.vouchers.cancel({
        id: createResult.voucherId,
        reason: "Try cancel posted",
      })
    ).rejects.toThrow("لا يمكن إلغاء قيد مرحل");
  });

  it("audit log entries created for all actions", async () => {
    const createResult = await caller.vouchers.create({
      voucherType: "payment",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "1000",
      currencyId,
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          debitAmount: "1000",
          creditAmount: "0",
        },
        {
          accountId: accountIds[2],
          accountCode: "2000",
          debitAmount: "0",
          creditAmount: "1000",
        },
      ],
    });

    const logsAfterCreate = await testDb
      .select()
      .from(schema.activityLogs)
      .where(
        and(
          eq(schema.activityLogs.tenantId, tenantId),
          eq(schema.activityLogs.entityId, createResult.voucherId)
        )
      );
    expect(logsAfterCreate.length).toBeGreaterThan(0);
    expect(logsAfterCreate[0].action).toContain("إنشاء قيد");

    await caller.vouchers.submit({ id: createResult.voucherId });
    await caller.vouchers.approve({
      id: createResult.voucherId,
      level: "final",
    });
    await caller.vouchers.post({
      id: createResult.voucherId,
      validateBudget: false,
    });

    const logsAfterPost = await testDb
      .select()
      .from(schema.activityLogs)
      .where(
        and(
          eq(schema.activityLogs.tenantId, tenantId),
          eq(schema.activityLogs.entityId, createResult.voucherId)
        )
      );
    expect(logsAfterPost.length).toBeGreaterThanOrEqual(3);
  });

  it("budget validation on post", async () => {
    const budget = await testDb
      .insert(schema.budgets)
      .values({
        tenantId,
        periodName: "2026",
        targetRevenue: "100000",
        targetExpense: "50000",
      })
      .returning();

    const budgetLine = await testDb
      .insert(schema.budgetLines)
      .values({
        budgetId: budget[0].id,
        accountId: accountIds[4],
        amount: "1000",
        spentAmount: "900",
      })
      .returning();

    const createResult = await caller.vouchers.create({
      voucherType: "payment",
      voucherDate: new Date().toISOString().split("T")[0],
      amount: "200",
      currencyId,
      budgetLineId: budgetLine[0].id,
      lines: [
        {
          accountId: accountIds[0],
          accountCode: "1000",
          debitAmount: "200",
          creditAmount: "0",
        },
        {
          accountId: accountIds[4],
          accountCode: "5000",
          debitAmount: "0",
          creditAmount: "200",
        },
      ],
    });

    await caller.vouchers.submit({ id: createResult.voucherId });
    await caller.vouchers.approve({
      id: createResult.voucherId,
      level: "final",
    });

    await expect(
      caller.vouchers.post({ id: createResult.voucherId, validateBudget: true })
    ).rejects.toThrow("تجاوز الميزانية");
  });

  it("validateBudget query", async () => {
    const budget = await testDb
      .insert(schema.budgets)
      .values({
        tenantId,
        periodName: "2026-Q2",
        targetRevenue: "50000",
        targetExpense: "30000",
      })
      .returning();

    const budgetLine = await testDb
      .insert(schema.budgetLines)
      .values({
        budgetId: budget[0].id,
        accountId: accountIds[4],
        amount: "5000",
        spentAmount: "4000",
      })
      .returning();

    const validation = await caller.vouchers.validateBudget({
      budgetLineId: budgetLine[0].id,
      amount: "500",
    });

    expect(validation.valid).toBe(true);
    expect(validation.remainingBudget).toBe(500);
    expect(validation.isNearBudget).toBe(true);

    const overBudget = await caller.vouchers.validateBudget({
      budgetLineId: budgetLine[0].id,
      amount: "2000",
    });

    expect(overBudget.valid).toBe(false);
    expect(overBudget.isOverBudget).toBe(true);
  });
});
