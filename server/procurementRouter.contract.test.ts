import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  procedureExists,
  expectValidInput,
  expectInvalidInput,
} from "./testUtils/trpcContract";

describe("erpRouter (Procurement) contract tests", () => {
  it("listProcurements: validates status filter", async () => {
    await expectValidInput(appRouter, ["erp", "listProcurements"], {
      status: "pending",
    });
  });

  it("getProcurementKpis: procedure exists", async () => {
    expect(procedureExists(appRouter, ["erp", "getProcurementKpis"])).toBe(
      true
    );
  });

  it("createProcurement: validates required fields and approvers array", async () => {
    await expectValidInput(appRouter, ["erp", "createProcurement"], {
      itemName: "Office Supplies",
      departmentId: 1,
      quantity: "50",
      estimatedCost: "5000",
      supplierId: 1,
      approvers: [2, 3],
    });

    await expectInvalidInput(appRouter, ["erp", "createProcurement"], {
      itemName: "Test",
      departmentId: 1,
      quantity: "10",
      approvers: Array(11).fill(1),
    });
  });

  it("approveProcurement: validates decision enum and level", async () => {
    await expectValidInput(appRouter, ["erp", "approveProcurement"], {
      id: 1,
      decision: "approved",
      note: "Looks good",
    });

    await expectValidInput(appRouter, ["erp", "approveProcurement"], {
      id: 1,
      decision: "rejected",
      note: "Over budget",
    });

    await expectInvalidInput(appRouter, ["erp", "approveProcurement"], {
      id: 1,
      decision: "invalid",
    });
  });

  it("receiveProcurement: validates actual cost", async () => {
    await expectValidInput(appRouter, ["erp", "receiveProcurement"], {
      id: 1,
      actualCost: "5200.00",
      note: "Received OK",
    });

    await expectValidInput(appRouter, ["erp", "receiveProcurement"], { id: 1 });
  });

  it("listProcurementApprovals: validates procurement id", async () => {
    await expectValidInput(appRouter, ["erp", "listProcurementApprovals"], {
      procurementId: 1,
    });
  });

  it("listReorderSuggestions: procedure exists", async () => {
    expect(procedureExists(appRouter, ["erp", "listReorderSuggestions"])).toBe(
      true
    );
  });

  it("generateProcurementsFromReorder: procedure exists", async () => {
    expect(
      procedureExists(appRouter, ["erp", "generateProcurementsFromReorder"])
    ).toBe(true);
  });

  it("processAlerts: procedure exists", async () => {
    expect(procedureExists(appRouter, ["erp", "processAlerts"])).toBe(true);
  });

  it("getDashboard: procedure exists", async () => {
    expect(procedureExists(appRouter, ["erp", "getDashboard"])).toBe(true);
  });

  it("listTickets: validates status filter", async () => {
    await expectValidInput(appRouter, ["erp", "listTickets"], {
      status: "open",
    });
  });

  it("createTicket: validates required fields", async () => {
    await expectValidInput(appRouter, ["erp", "createTicket"], {
      subject: "Issue",
      priority: "high",
    });
  });

  it("updateTicket: validates partial input", async () => {
    await expectValidInput(appRouter, ["erp", "updateTicket"], {
      id: 1,
      status: "closed",
    });
  });

  it("deleteTicket: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "deleteTicket"], { id: 1 });
  });

  it("listInspections: procedure exists", async () => {
    expect(procedureExists(appRouter, ["erp", "listInspections"])).toBe(true);
  });

  it("createInspection: validates required fields", async () => {
    await expectValidInput(appRouter, ["erp", "createInspection"], {
      code: "INSP001",
      title: "Quality Check",
      result: "pass",
    });
  });

  it("deleteInspection: validates id", async () => {
    await expectValidInput(appRouter, ["erp", "deleteInspection"], { id: 1 });
  });
});
