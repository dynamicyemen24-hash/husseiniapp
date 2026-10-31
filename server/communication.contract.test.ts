import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  procedureExists,
  expectValidInput,
  expectInvalidInput,
  parseInput,
} from "./testUtils/trpcContract";
import {
  buildShareMessage,
  formatShareNumber,
  normalizeWhatsAppNumber,
  mergeCommunicationSettings,
  DEFAULT_COMMUNICATION_SETTINGS,
} from "../shared/communication";
import { PERMISSIONS, ROLE_DEFINITIONS } from "../shared/permissions";

describe("communicationRouter contract tests (whatsapp/email sharing)", () => {
  it("procedures are registered", () => {
    expect(procedureExists(appRouter, ["communication", "getConfig"])).toBe(
      true
    );
    expect(procedureExists(appRouter, ["communication", "updateConfig"])).toBe(
      true
    );
    expect(
      procedureExists(appRouter, ["communication", "sendPurchaseDocument"])
    ).toBe(true);
    expect(procedureExists(appRouter, ["communication", "sendReport"])).toBe(
      true
    );
  });

  it("getConfig query has no input validation to bypass", () => {
    expect(procedureExists(appRouter, ["communication", "getConfig"])).toBe(
      true
    );
  });

  it("updateConfig accepts partial updates with safe defaults", async () => {
    const parsed = await parseInput(
      appRouter,
      ["communication", "updateConfig"],
      {
        whatsappEnabled: false,
      }
    );
    expect(parsed).toMatchObject({ whatsappEnabled: false });
  });

  it("updateConfig rejects unknown keys and bad types", async () => {
    await expectInvalidInput(appRouter, ["communication", "updateConfig"], {
      whatsappEnabled: "yes",
    });
    await expectInvalidInput(appRouter, ["communication", "updateConfig"], {
      unknownField: true,
    });
  });

  it("sendPurchaseDocument accepts every channel + docType combo", async () => {
    for (const channel of ["whatsapp", "email"] as const) {
      for (const docType of [
        "purchase_order",
        "goods_receipt",
        "purchase_invoice",
      ] as const) {
        await expectValidInput(
          appRouter,
          ["communication", "sendPurchaseDocument"],
          {
            channel,
            docType,
            docId: 1,
          }
        );
      }
    }
  });

  it("sendPurchaseDocument rejects bad channel / docId / docType", async () => {
    await expectInvalidInput(
      appRouter,
      ["communication", "sendPurchaseDocument"],
      {
        channel: "telegram",
        docType: "purchase_order",
        docId: 1,
      }
    );
    await expectInvalidInput(
      appRouter,
      ["communication", "sendPurchaseDocument"],
      {
        channel: "whatsapp",
        docType: "procurement_report",
        docId: 1,
      }
    );
    await expectInvalidInput(
      appRouter,
      ["communication", "sendPurchaseDocument"],
      {
        channel: "whatsapp",
        docType: "purchase_order",
        docId: 0,
      }
    );
    await expectInvalidInput(
      appRouter,
      ["communication", "sendPurchaseDocument"],
      {
        channel: "whatsapp",
        docType: "purchase_order",
      }
    );
  });

  it("sendReport accepts optional to and validates channel", async () => {
    await expectValidInput(appRouter, ["communication", "sendReport"], {
      channel: "email",
      to: "supplier@example.com",
    });
    await expectInvalidInput(appRouter, ["communication", "sendReport"], {
      channel: "fax",
    });
  });

  it("exposes COMMUNICATION_* permissions and maps them to roles", () => {
    expect(PERMISSIONS.COMMUNICATION_SEND).toBe("communication.send");
    expect(PERMISSIONS.COMMUNICATION_VIEW).toBe("communication.view");
    expect(ROLE_DEFINITIONS.owner.permissions).toContain(
      PERMISSIONS.COMMUNICATION_SEND
    );
    expect(ROLE_DEFINITIONS.admin.permissions).toContain(
      PERMISSIONS.COMMUNICATION_SEND
    );
    expect(ROLE_DEFINITIONS.accountant.permissions).toContain(
      PERMISSIONS.COMMUNICATION_SEND
    );
  });
});

describe("buildShareMessage (pure builder)", () => {
  it("renders invoice summary with totals and status", () => {
    const text = buildShareMessage({
      documentLabel: "فاتورة مشتريات",
      documentNumber: "PU-2026-0007",
      supplierName: "مورد التجارب",
      dateText: "1/1/2026",
      total: "12500.50",
      paidAmount: "5000",
      status: "مدفوعة جزئياً",
    });
    expect(text).toContain("فاتورة مشتريات PU-2026-0007");
    expect(text).toContain("مورد التجارب");
    expect(text).toContain("١٢٬٥٠٠٫٥٠");
    expect(text).toContain("٥٬٠٠٠٫٠٠");
    expect(text).toContain("مدفوعة جزئياً");
  });

  it("includes notes and extra lines when provided", () => {
    const text = buildShareMessage({
      documentLabel: "أمر شراء",
      documentNumber: "PO-1",
      total: "100",
      notes: "عاجل",
      extraLines: ["صنف × 5"],
    });
    expect(text).toContain("ملاحظات: عاجل");
    expect(text).toContain("صنف × 5");
  });

  it("formats totals via formatShareNumber (Arabic locale)", () => {
    expect(formatShareNumber("12500.5")).toBe("١٢٬٥٠٠٫٥٠");
    expect(formatShareNumber(undefined)).toBe("٠٫٠٠");
  });
});

describe("normalizeWhatsAppNumber", () => {
  it("strips formatting and prepends country code", () => {
    expect(normalizeWhatsAppNumber("+967 771 234 567", "967")).toBe(
      "967771234567"
    );
    expect(normalizeWhatsAppNumber("0771234567", "967")).toBe("967771234567");
    expect(normalizeWhatsAppNumber("967771234567", "967")).toBe("967771234567");
  });

  it("returns null for empty input", () => {
    expect(normalizeWhatsAppNumber(null, "967")).toBeNull();
    expect(normalizeWhatsAppNumber("", "967")).toBeNull();
    expect(normalizeWhatsAppNumber("   ", "967")).toBeNull();
  });
});

describe("mergeCommunicationSettings", () => {
  it("falls back to defaults for missing fields", () => {
    const merged = mergeCommunicationSettings({ whatsappEnabled: false });
    expect(merged.whatsappEnabled).toBe(false);
    expect(merged.emailEnabled).toBe(
      DEFAULT_COMMUNICATION_SETTINGS.emailEnabled
    );
    expect(merged.whatsappCountryCode).toBe(
      DEFAULT_COMMUNICATION_SETTINGS.whatsappCountryCode
    );
  });

  it("defends against corrupted JSON shapes", () => {
    const merged = mergeCommunicationSettings({
      whatsappEnabled: "yes" as unknown as boolean,
      whatsappCountryCode: "",
      emailFallbackTo: 5 as unknown as string,
    });
    expect(merged.whatsappEnabled).toBe(
      DEFAULT_COMMUNICATION_SETTINGS.whatsappEnabled
    );
    expect(merged.whatsappCountryCode).toBe(
      DEFAULT_COMMUNICATION_SETTINGS.whatsappCountryCode
    );
    expect(merged.emailFallbackTo).toBe("");
  });
});
