import { describe, it } from "vitest";
import { appRouter } from "./routers";
import { expectValidInput, expectInvalidInput } from "./testUtils/trpcContract";

describe("purchaseOrdersRouter contract tests", () => {
  it("list: validates status enum and pagination", async () => {
    await expectValidInput(appRouter, ["purchaseOrders", "list"], {
      status: "issued",
    });
    await expectValidInput(appRouter, ["purchaseOrders", "list"], {
      status: "draft",
    });
    await expectValidInput(appRouter, ["purchaseOrders", "list"], {
      limit: 5,
      offset: 10,
      supplierId: 3,
    });
    await expectInvalidInput(appRouter, ["purchaseOrders", "list"], {
      status: "unknown",
    });
  });

  it("view: validates id", async () => {
    await expectValidInput(appRouter, ["purchaseOrders", "view"], { id: 1 });
    await expectInvalidInput(appRouter, ["purchaseOrders", "view"], {});
  });

  it("create: validates required fields and items", async () => {
    await expectValidInput(appRouter, ["purchaseOrders", "create"], {
      supplierId: 1,
      items: [{ productId: 101, quantity: 100, unitPrice: "1000.00" }],
    });
    await expectInvalidInput(appRouter, ["purchaseOrders", "create"], {
      supplierId: 1,
      items: [],
    });
    await expectInvalidInput(appRouter, ["purchaseOrders", "create"], {
      supplierId: 1,
      items: [{ productId: 101, quantity: 5, unitPrice: "-10" }],
    });
    await expectInvalidInput(appRouter, ["purchaseOrders", "create"], {
      supplierId: 1,
      items: [{ productId: 101, quantity: 0, unitPrice: "10" }],
    });
  });

  it("issue/close/view: validate id input", async () => {
    await expectValidInput(appRouter, ["purchaseOrders", "issue"], { id: 1 });
    await expectValidInput(appRouter, ["purchaseOrders", "close"], { id: 1 });
    await expectInvalidInput(appRouter, ["purchaseOrders", "issue"], {});
  });

  it("cancel: accepts optional reason", async () => {
    await expectValidInput(appRouter, ["purchaseOrders", "cancel"], { id: 1 });
    await expectValidInput(appRouter, ["purchaseOrders", "cancel"], {
      id: 1,
      reason: "تأخير التوريد",
    });
  });

  it("receive: validates items and poId", async () => {
    await expectValidInput(appRouter, ["purchaseOrders", "receive"], {
      poId: 1,
      items: [{ poItemId: 1, productId: 101, quantityReceived: 50 }],
    });
    await expectInvalidInput(appRouter, ["purchaseOrders", "receive"], {
      poId: 1,
      items: [],
    });
    await expectInvalidInput(appRouter, ["purchaseOrders", "receive"], {
      poId: 1,
      items: [{ poItemId: 1, productId: 101, quantityReceived: 0 }],
    });
  });
});

describe("goodsReceiptsRouter contract tests", () => {
  it("list: validates poId filter", async () => {
    await expectValidInput(appRouter, ["goodsReceipts", "list"], { poId: 1 });
    await expectValidInput(appRouter, ["goodsReceipts", "list"], { limit: 10 });
  });

  it("view: validates id", async () => {
    await expectValidInput(appRouter, ["goodsReceipts", "view"], { id: 1 });
    await expectInvalidInput(appRouter, ["goodsReceipts", "view"], {});
  });

  it("cancel: validates id with optional reason", async () => {
    await expectValidInput(appRouter, ["goodsReceipts", "cancel"], { id: 1 });
    await expectValidInput(appRouter, ["goodsReceipts", "cancel"], {
      id: 1,
      reason: "إرجاع",
    });
  });
});
