import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  procedureExists,
  expectValidInput,
  expectInvalidInput,
} from "./testUtils/trpcContract";

describe("quotationRouter contract tests", () => {
  it("types.list: procedure exists", async () => {
    expect(procedureExists(appRouter, ["quotations", "types", "list"])).toBe(
      true
    );
  });

  it("types.create: validates input schema", async () => {
    await expectValidInput(appRouter, ["quotations", "types", "create"], {
      code: "CUSTOM",
      name: "Custom Type",
      direction: "sale",
      itemKinds: ["product"],
      numberingPrefix: "QT-C",
    });
  });

  it("list: validates pagination and filter input", async () => {
    await expectValidInput(appRouter, ["quotations", "list"], {
      direction: "sale",
      status: "draft",
      search: "test",
      limit: 50,
      offset: 0,
    });
  });

  it("get: validates id input", async () => {
    await expectValidInput(appRouter, ["quotations", "get"], { id: 1 });
  });

  it("create: validates complex line and party schemas", async () => {
    const validInput = {
      direction: "sale" as const,
      customerId: 1,
      lines: [
        {
          kind: "product" as const,
          refId: 1,
          name: "Product",
          quantity: 10,
          unit: "pcs",
          unitPrice: 100,
          costPrice: 60,
          discountPct: 5,
          taxPct: 0,
        },
      ],
      parties: [
        {
          role: "customer" as const,
          entityType: "customer",
          entityId: 1,
          name: "Customer",
        },
      ],
      validityDays: 30,
    };

    await expectValidInput(appRouter, ["quotations", "create"], validInput);
    await expectInvalidInput(appRouter, ["quotations", "create"], {
      ...validInput,
      lines: [],
    });
    await expectInvalidInput(appRouter, ["quotations", "create"], {
      ...validInput,
      lines: [{ ...validInput.lines[0], quantity: -1 }],
    });
  });

  it("update: validates partial input with changeSummary", async () => {
    await expectValidInput(appRouter, ["quotations", "update"], {
      id: 1,
      notes: "Updated notes",
      changeSummary: "Updated terms",
    });
  });

  it("transition: validates state machine transitions", async () => {
    await expectValidInput(appRouter, ["quotations", "transition"], {
      id: 1,
      to: "in_review",
      comment: "Ready for review",
    });
  });

  it("decideApproval: validates approval decision", async () => {
    await expectValidInput(appRouter, ["quotations", "decideApproval"], {
      approvalId: 1,
      approve: true,
      comment: "Approved",
    });
    await expectValidInput(appRouter, ["quotations", "decideApproval"], {
      approvalId: 1,
      approve: false,
      comment: "Rejected",
    });
  });

  it("negotiate: validates negotiation round input", async () => {
    await expectValidInput(appRouter, ["quotations", "negotiate"], {
      id: 1,
      side: "us",
      message: "Counter-offer",
      proposedTotal: 9500,
    });
    await expectInvalidInput(appRouter, ["quotations", "negotiate"], {
      id: 1,
      side: "invalid",
      message: "Test",
    });
  });

  it("analyze: validates id input", async () => {
    await expectValidInput(appRouter, ["quotations", "analyze"], { id: 1 });
  });
});

describe("posRouter contract tests", () => {
  it("createSale: validates sale input with idempotency key", async () => {
    const validInput = {
      customerId: 1,
      items: [{ productId: 1, quantity: 2, discount: 0 }],
      paymentMethod: "cash",
      idempotencyKey: "test-key-123",
    };
    await expectValidInput(appRouter, ["pos", "createSale"], validInput);
    await expectInvalidInput(appRouter, ["pos", "createSale"], {
      ...validInput,
      items: [],
    });
    await expectInvalidInput(appRouter, ["pos", "createSale"], {
      ...validInput,
      items: [{ productId: 1, quantity: 0 }],
    });
  });

  it("editSale: validates partial edit input", async () => {
    await expectValidInput(appRouter, ["pos", "editSale"], {
      invoiceId: 1,
      items: [],
      paymentMethod: "card",
      notes: "Updated",
    });
  });

  it("voidSale: validates invoice id", async () => {
    await expectValidInput(appRouter, ["pos", "voidSale"], { invoiceId: 1 });
  });

  it("printReceipt: validates invoice number", async () => {
    await expectValidInput(appRouter, ["pos", "printReceipt"], {
      invoiceNumber: "POS-ABC123",
    });
  });

  it("holdRecall: validates invoice id", async () => {
    await expectValidInput(appRouter, ["pos", "holdRecall"], { invoiceId: 1 });
  });

  it("discounts: validates discount amount", async () => {
    await expectValidInput(appRouter, ["pos", "discounts"], {
      invoiceId: 1,
      discountAmount: "100.00",
    });
    await expectInvalidInput(appRouter, ["pos", "discounts"], {
      invoiceId: 1,
      discountAmount: "-50",
    });
  });

  it("returns: validates return items and reason", async () => {
    await expectValidInput(appRouter, ["pos", "returns"], {
      invoiceId: 1,
      reason: "Defective",
      items: [{ productId: 1, quantity: 1 }],
    });
    await expectValidInput(appRouter, ["pos", "returns"], {
      invoiceId: 1,
      reason: "Test",
      items: [],
    });
    await expectInvalidInput(appRouter, ["pos", "returns"], {
      invoiceId: 1,
      reason: "X",
      items: [{ productId: 1, quantity: 1 }],
    });
  });
});
