/**
 * Unit tests for regional tax compliance (pure shared logic).
 */
import { describe, expect, it } from "vitest";
import {
  checkCounterpartyCompliance,
  countryByCode,
} from "../shared/taxCompliance";

describe("countryByCode", () => {
  it("resolves known countries with VAT rates", () => {
    expect(countryByCode("SA").vatRate).toBe(0.15);
    expect(countryByCode("AE").vatRate).toBe(0.05);
    expect(countryByCode("YE").vatRate).toBe(0);
    expect(countryByCode("ye").nameAr).toBe("اليمن");
  });

  it("falls back gracefully for unknown codes", () => {
    expect(countryByCode("XX").vatRate).toBe(0);
    expect(countryByCode(undefined).code).toBe("XX");
  });
});

describe("SA VAT (ZATCA)", () => {
  const sa = countryByCode("SA");
  it("accepts 15 digits starting with 3", () => {
    expect(sa.validateTaxId("vat", "300000000000003")).toBe(true);
  });
  it("rejects wrong length / prefix", () => {
    expect(sa.validateTaxId("vat", "30000000000003")).toBe(false);
    expect(sa.validateTaxId("vat", "200000000000003")).toBe(false);
    expect(sa.validateTaxId("vat", "30000000000000A")).toBe(false);
  });
  it("tolerates spaces and dashes", () => {
    expect(sa.validateTaxId("vat", "30000 00000 00003")).toBe(true);
    expect(sa.validateTaxId("vat", "30000-00000-00003")).toBe(true);
  });
});

describe("YE tax card + AE TRN + OM VAT", () => {
  it("YE: 9 digits", () => {
    const ye = countryByCode("YE");
    expect(ye.validateTaxId("tax_card", "123456789")).toBe(true);
    expect(ye.validateTaxId("tax_card", "12345")).toBe(false);
  });
  it("AE: 15 digits", () => {
    const ae = countryByCode("AE");
    expect(ae.validateTaxId("vat", "100000000000003")).toBe(true);
    expect(ae.validateTaxId("vat", "123")).toBe(false);
  });
  it("OM: OM + 13 chars", () => {
    const om = countryByCode("OM");
    expect(om.validateTaxId("vat", "OM1234567890123")).toBe(true);
    expect(om.validateTaxId("vat", "123456789012345")).toBe(false);
  });
});

describe("checkCounterpartyCompliance", () => {
  it("flags missing number and bad formats with Arabic reasons", () => {
    const r = checkCounterpartyCompliance({
      countryCode: "SA",
      direction: "sale",
      taxIdType: "vat",
      taxNumber: "123",
    });
    expect(r.ok).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.zatcaClass).toBe("simplified");
  });

  it("classifies Saudi B2B with valid VAT as standard", () => {
    const r = checkCounterpartyCompliance({
      countryCode: "SA",
      direction: "sale",
      buyerType: "b2b",
      taxIdType: "vat",
      taxNumber: "300000000000003",
      isVatRegistered: true,
    });
    expect(r.ok).toBe(true);
    expect(r.zatcaClass).toBe("standard");
    expect(r.vatRate).toBe(0.15);
  });

  it("zero-rates unregistered buyers", () => {
    const r = checkCounterpartyCompliance({
      countryCode: "SA",
      direction: "sale",
      taxIdType: "none",
    });
    expect(r.vatRate).toBe(0);
    expect(r.zatcaClass).toBe("simplified");
  });

  it("marks Yemeni buyers not_applicable for ZATCA", () => {
    const r = checkCounterpartyCompliance({
      countryCode: "YE",
      direction: "sale",
      taxIdType: "tax_card",
      taxNumber: "123456789",
    });
    expect(r.ok).toBe(true);
    expect(r.zatcaClass).toBe("not_applicable");
  });
});
