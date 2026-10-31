import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  procedureExists,
  expectValidInput,
  expectInvalidInput,
  parseInput,
} from "./testUtils/trpcContract";

describe("vouchersRouter contract tests", () => {
  it("create: validates input schema", async () => {
    await expectValidInput(appRouter, ["vouchers", "create"], {
      voucherType: "payment",
      voucherDate: "2026-03-15",
      amount: "1000",
      lines: [
        {
          accountId: 1,
          accountCode: "1000",
          debitAmount: "1000",
          creditAmount: "0",
        },
        {
          accountId: 2,
          accountCode: "2000",
          debitAmount: "0",
          creditAmount: "1000",
        },
      ],
    });
  });

  it("get: validates input and output schemas", async () => {
    await expectValidInput(appRouter, ["vouchers", "get"], { id: 1 });
    expect(procedureExists(appRouter, ["vouchers", "get"])).toBe(true);
  });

  it("list: validates pagination and filter schemas", async () => {
    await expectValidInput(appRouter, ["vouchers", "list"], {
      type: "payment",
      status: "draft",
      page: 1,
      pageSize: 20,
    });
  });

  it("update: validates partial input schema", async () => {
    await expectValidInput(appRouter, ["vouchers", "update"], {
      id: 1,
      amount: "2000",
    });
  });

  it("submit: validates input schema", async () => {
    await expectValidInput(appRouter, ["vouchers", "submit"], { id: 1 });
  });

  it("approve: validates approval level enum", async () => {
    await expectValidInput(appRouter, ["vouchers", "approve"], {
      id: 1,
      level: "final",
      comments: "Approved",
    });
    await expectInvalidInput(appRouter, ["vouchers", "approve"], {
      id: 1,
      level: "invalid",
    });
  });

  it("reject: validates reason required", async () => {
    await expectValidInput(appRouter, ["vouchers", "reject"], {
      id: 1,
      reason: "Wrong account",
    });
    await expectInvalidInput(appRouter, ["vouchers", "reject"], {
      id: 1,
      reason: "",
    });
  });

  it("post: validates budget validation flag", async () => {
    const parsed = await parseInput(appRouter, ["vouchers", "post"], {
      id: 1,
      validateBudget: true,
    });
    expect(parsed).toBeDefined();

    const defaulted = await parseInput(appRouter, ["vouchers", "post"], {
      id: 1,
    });
    expect(defaulted).toMatchObject({ validateBudget: true });
  });

  it("cancel: validates reason required", async () => {
    await expectValidInput(appRouter, ["vouchers", "cancel"], {
      id: 1,
      reason: "Cancelled",
    });
  });

  it("reverse: validates reversal date and optional reason", async () => {
    await expectValidInput(appRouter, ["vouchers", "reverse"], {
      id: 1,
      reversalDate: "2026-03-15",
      reason: "Error correction",
    });
  });

  it("validateBudget: validates input and output schemas", async () => {
    await expectValidInput(appRouter, ["vouchers", "validateBudget"], {
      budgetLineId: 1,
      amount: "500",
      excludeVoucherId: 2,
    });
    expect(procedureExists(appRouter, ["vouchers", "validateBudget"])).toBe(
      true
    );
  });

  it("getStats: validates optional filter input", async () => {
    await expectValidInput(appRouter, ["vouchers", "getStats"], {
      fromDate: "2026-01-01",
      toDate: "2026-12-31",
      type: "payment",
    });
  });
});
