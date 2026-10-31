import { describe, it } from "vitest";
import { appRouter } from "./routers";
import { expectValidInput, expectInvalidInput } from "./testUtils/trpcContract";

describe("inventoryRouter contract tests", () => {
  it("list: validates pagination input", async () => {
    await expectValidInput(appRouter, ["inventory", "list"], {
      limit: 100,
      offset: 0,
    });
    await expectInvalidInput(appRouter, ["inventory", "list"], {
      limit: 600,
    });
    await expectInvalidInput(appRouter, ["inventory", "list"], {
      offset: -1,
    });
  });

  it("view: validates id input", async () => {
    await expectValidInput(appRouter, ["inventory", "view"], { id: 1 });
  });

  it("create: validates required fields", async () => {
    const validInput = {
      code: "PROD001",
      name: "Test Product",
      type: "goods" as const,
      salePrice: "100",
      purchasePrice: "60",
      currentStock: 0,
      minStock: 10,
      unitId: 1,
      isActive: true,
    };

    await expectValidInput(appRouter, ["inventory", "create"], validInput);
    await expectInvalidInput(appRouter, ["inventory", "create"], {
      ...validInput,
      code: "",
    });
    await expectInvalidInput(appRouter, ["inventory", "create"], {
      ...validInput,
      type: "invalid",
    });
  });

  it("edit: validates partial update and forbids currentStock", async () => {
    const validInput = {
      id: 1,
      name: "Updated Name",
      salePrice: "150",
    };

    await expectValidInput(appRouter, ["inventory", "edit"], validInput);
    await expectInvalidInput(appRouter, ["inventory", "edit"], {
      ...validInput,
      currentStock: 100,
    });
  });

  it("delete: validates id input", async () => {
    await expectValidInput(appRouter, ["inventory", "delete"], { id: 1 });
  });

  it("adjustStock: validates adjustment types", async () => {
    const addInput = {
      productId: 1,
      warehouseId: 1,
      quantity: 10,
      type: "add" as const,
    };
    await expectValidInput(appRouter, ["inventory", "adjustStock"], addInput);
    await expectValidInput(appRouter, ["inventory", "adjustStock"], {
      ...addInput,
      type: "remove",
    });
    await expectValidInput(appRouter, ["inventory", "adjustStock"], {
      ...addInput,
      type: "set",
    });
    await expectInvalidInput(appRouter, ["inventory", "adjustStock"], {
      ...addInput,
      type: "invalid",
    });
    await expectInvalidInput(appRouter, ["inventory", "adjustStock"], {
      ...addInput,
      quantity: 0,
    });
  });

  it("physicalCount: validates counted quantity", async () => {
    const validInput = {
      productId: 1,
      warehouseId: 1,
      countedQty: 50,
    };
    await expectValidInput(
      appRouter,
      ["inventory", "physicalCount"],
      validInput
    );
    await expectInvalidInput(appRouter, ["inventory", "physicalCount"], {
      ...validInput,
      countedQty: -1,
    });
  });
});
