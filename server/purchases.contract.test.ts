import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  procedureExists,
  expectValidInput,
  expectInvalidInput,
  parseInput,
} from "./testUtils/trpcContract";

const baseItems = [
  {
    productId: 1,
    productName: "صنف تجريبي",
    quantity: 5,
    unitPrice: "1000",
    discount: "0",
  },
];

describe("purchasesRouter contract tests (3-way binding)", () => {
  it("create: accepts poId and grnId for 3-way linking", async () => {
    await expectValidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      poId: 10,
      grnId: 20,
      items: baseItems,
      paymentMethod: "credit",
    });
  });

  it("create: poId/grnId are optional for unbilled receipts", async () => {
    const parsed = await parseInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: baseItems,
    });
    expect(parsed.poId).toBeUndefined();
    expect(parsed.grnId).toBeUndefined();
  });

  it("create: rejects zero or negative quantities", async () => {
    await expectInvalidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: [{ ...baseItems[0], quantity: 0 }],
    });
    await expectInvalidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: [{ ...baseItems[0], quantity: -3 }],
    });
  });

  it("create: rejects negative unit price", async () => {
    await expectInvalidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: [{ ...baseItems[0], unitPrice: "-50" }],
    });
  });

  it("create: rejects empty items array", async () => {
    await expectInvalidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: [],
    });
  });

  it("create: rejects missing productName", async () => {
    await expectInvalidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: [{ ...baseItems[0], productName: "" }],
    });
  });

  it("create: validates paymentMethod enum", async () => {
    await expectValidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: baseItems,
      paymentMethod: "transfer",
    });
    await expectInvalidInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: baseItems,
      paymentMethod: "bitcoin",
    });
  });

  it("create: defaults paidAmount/taxRate/discount safely", async () => {
    const parsed = await parseInput(appRouter, ["purchases", "create"], {
      supplierId: 1,
      items: baseItems,
    });
    expect(parsed).toMatchObject({
      discount: "0",
      taxRate: "0",
      paidAmount: "0",
      paymentMethod: "cash",
    });
  });

  it("list: validates status filter and 3-way paging primitives", async () => {
    await expectValidInput(appRouter, ["purchases", "list"], {
      status: "partial",
      supplierId: 7,
      limit: 25,
      offset: 0,
    });
    await expectInvalidInput(appRouter, ["purchases", "list"], {
      status: "received",
    });
  });

  it("updateStatus: validates invoice lifecycle enum", async () => {
    await expectValidInput(appRouter, ["purchases", "updateStatus"], {
      id: 1,
      status: "confirmed",
    });
    await expectInvalidInput(appRouter, ["purchases", "updateStatus"], {
      id: 1,
      status: "partially_received",
    });
  });

  it("getItems: validates invoiceId", async () => {
    await expectValidInput(appRouter, ["purchases", "getItems"], {
      invoiceId: 4,
    });
    await expectInvalidInput(appRouter, ["purchases", "getItems"], {
      invoiceId: "abc",
    });
  });

  it("create procedure is registered", () => {
    expect(procedureExists(appRouter, ["purchases", "create"])).toBe(true);
    expect(procedureExists(appRouter, ["purchases", "list"])).toBe(true);
    expect(procedureExists(appRouter, ["purchases", "getItems"])).toBe(true);
    expect(procedureExists(appRouter, ["purchases", "updateStatus"])).toBe(
      true
    );
  });
});
