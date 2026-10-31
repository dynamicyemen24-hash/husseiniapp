/**
 * Regional tax & business compliance — Yemen, Saudi Arabia (ZATCA), Gulf, world.
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for counterparty (customer/supplier) compliance,
 * consumed by BOTH the client (live form hints) and the server (enforcement).
 *
 * Coverage:
 *  - VAT rates per country (SA 15%, AE/BH/OM 5%, YE 0% …)
 *  - Tax-ID formats: SA VAT (15 digits, starts with 3 — ZATCA), UAE TRN
 *    (15 digits), YE tax card (9 digits), generic national IDs / CR numbers.
 * - B2B vs B2C buyer classification (drives ZATCA standard vs simplified
 *    invoice requirements).
 */
import { z } from "zod";

export type TaxIdType =
  | "vat"
  | "tax_card"
  | "national_id"
  | "commercial_reg"
  | "passport"
  | "none";

export type BuyerType = "b2b" | "b2c";

export interface CountryCompliance {
  /** ISO-3166 alpha-2 */
  code: string;
  /** Arabic display name */
  nameAr: string;
  /** Standard VAT/GST rate applied when the buyer is taxable (0–1). */
  vatRate: number;
  /** Whether businesses must hold a VAT number above a threshold. */
  vatMandatory: boolean;
  /** Tax-ID kinds this country issues, in UI order. */
  taxIdTypes: TaxIdType[];
  /** Validate a tax identifier. Empty + optional → valid. */
  validateTaxId: (kind: TaxIdType, value: string) => boolean;
  /** Short Arabic hint shown under the tax-ID field. */
  hint: (kind: TaxIdType) => string;
}

const digitsOnly = (v: string) => v.replace(/[\s-]/g, "");

function genericId(kind: TaxIdType, value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (kind === "none") return true;
  // National IDs / passports / CRs: 4–20 alphanumerics, no symbols.
  return /^[A-Za-z0-9]{4,20}$/.test(v.replace(/[\s-]/g, ""));
}

function genericHint(kind: TaxIdType): string {
  switch (kind) {
    case "vat":
      return "الرقم الضريبي كما يصدره النظام الضريبي لبلدك";
    case "tax_card":
      return "رقم البطاقة الضريبية";
    case "national_id":
      return "رقم الهوية الوطنية (4–20 خانة)";
    case "commercial_reg":
      return "رقم السجل التجاري";
    case "passport":
      return "رقم الجواز";
    default:
      return "اختر نوع الهوية الضريبية أولاً";
  }
}

export const TAX_ID_LABELS: Record<TaxIdType, string> = {
  vat: "رقم ضريبي (VAT)",
  tax_card: "بطاقة ضريبية",
  national_id: "هوية وطنية",
  commercial_reg: "سجل تجاري",
  passport: "جواز سفر",
  none: "بدون",
};

export const COUNTRIES: CountryCompliance[] = [
  {
    code: "YE",
    nameAr: "اليمن",
    vatRate: 0,
    vatMandatory: false,
    taxIdTypes: [
      "tax_card",
      "national_id",
      "commercial_reg",
      "passport",
      "none",
    ],
    validateTaxId: (kind, value) => {
      const v = value.trim();
      if (!v) return true;
      if (kind === "tax_card") return /^\d{9}$/.test(digitsOnly(v));
      return genericId(kind, v);
    },
    hint: kind =>
      kind === "tax_card"
        ? "البطاقة الضريبية اليمنية: 9 أرقام"
        : genericHint(kind),
  },
  {
    code: "SA",
    nameAr: "السعودية",
    vatRate: 0.15,
    vatMandatory: true,
    taxIdTypes: ["vat", "national_id", "commercial_reg", "passport", "none"],
    validateTaxId: (kind, value) => {
      const v = value.trim();
      if (!v) return true;
      // ZATCA VAT: exactly 15 digits, first digit 3.
      if (kind === "vat") return /^3\d{14}$/.test(digitsOnly(v));
      return genericId(kind, v);
    },
    hint: kind =>
      kind === "vat"
        ? "الرقم الضريبي السعودي (ZATCA): 15 رقماً تبدأ بـ 3"
        : genericHint(kind),
  },
  {
    code: "AE",
    nameAr: "الإمارات",
    vatRate: 0.05,
    vatMandatory: true,
    taxIdTypes: ["vat", "national_id", "commercial_reg", "passport", "none"],
    validateTaxId: (kind, value) => {
      const v = value.trim();
      if (!v) return true;
      if (kind === "vat") return /^\d{15}$/.test(digitsOnly(v));
      return genericId(kind, v);
    },
    hint: kind =>
      kind === "vat"
        ? "الرقم الضريبي الإماراتي (TRN): 15 رقماً"
        : genericHint(kind),
  },
  {
    code: "QA",
    nameAr: "قطر",
    vatRate: 0,
    vatMandatory: false,
    taxIdTypes: ["commercial_reg", "national_id", "passport", "none"],
    validateTaxId: (kind, value) => genericId(kind, value.trim()),
    hint: genericHint,
  },
  {
    code: "KW",
    nameAr: "الكويت",
    vatRate: 0,
    vatMandatory: false,
    taxIdTypes: ["commercial_reg", "national_id", "passport", "none"],
    validateTaxId: (kind, value) => genericId(kind, value.trim()),
    hint: genericHint,
  },
  {
    code: "BH",
    nameAr: "البحرين",
    vatRate: 0.05,
    vatMandatory: true,
    taxIdTypes: ["vat", "commercial_reg", "national_id", "passport", "none"],
    validateTaxId: (kind, value) => {
      const v = value.trim();
      if (!v) return true;
      if (kind === "vat") return /^\d{15}$/.test(digitsOnly(v));
      return genericId(kind, v);
    },
    hint: kind =>
      kind === "vat" ? "الرقم الضريبي البحريني: 15 رقماً" : genericHint(kind),
  },
  {
    code: "OM",
    nameAr: "عُمان",
    vatRate: 0.05,
    vatMandatory: true,
    taxIdTypes: ["vat", "commercial_reg", "national_id", "passport", "none"],
    validateTaxId: (kind, value) => {
      const v = value.trim();
      if (!v) return true;
      // Oman VAT: 15 chars, starts with OM.
      if (kind === "vat")
        return /^OM[0-9A-Z]{13}$/i.test(v.replace(/[\s-]/g, ""));
      return genericId(kind, v);
    },
    hint: kind =>
      kind === "vat"
        ? "الرقم الضريبي العُماني: يبدأ بـ OM ويليه 13 خانة"
        : genericHint(kind),
  },
  {
    code: "EG",
    nameAr: "مصر",
    vatRate: 0.14,
    vatMandatory: true,
    taxIdTypes: ["vat", "national_id", "commercial_reg", "passport", "none"],
    validateTaxId: (kind, value) => {
      const v = value.trim();
      if (!v) return true;
      if (kind === "vat") return /^\d{9}$/.test(digitsOnly(v));
      return genericId(kind, v);
    },
    hint: kind =>
      kind === "vat"
        ? "رقم التسجيل الضريبي المصري: 9 أرقام"
        : genericHint(kind),
  },
  {
    code: "JO",
    nameAr: "الأردن",
    vatRate: 0.16,
    vatMandatory: true,
    taxIdTypes: ["vat", "national_id", "commercial_reg", "passport", "none"],
    validateTaxId: (kind, value) => genericId(kind, value.trim()),
    hint: genericHint,
  },
];

export function countryByCode(code?: string | null): CountryCompliance {
  const hit = COUNTRIES.find(c => c.code === (code || "").toUpperCase());
  return (
    hit ?? {
      code: (code || "XX").toUpperCase().slice(0, 2),
      nameAr: code || "أخرى",
      vatRate: 0,
      vatMandatory: false,
      taxIdTypes: ["vat", "national_id", "commercial_reg", "passport", "none"],
      validateTaxId: (kind, value) => genericId(kind, value.trim()),
      hint: genericHint,
    }
  );
}

export interface ComplianceCheck {
  ok: boolean;
  issues: string[];
  /** Effective VAT rate for invoicing this counterparty. */
  vatRate: number;
  /** ZATCA invoice class required for Saudi sales. */
  zatcaClass: "standard" | "simplified" | "not_applicable";
}

// ─── Server input contracts (zod) ─────────────────────────────────────
// Shared so `routers.ts` and `modulesRouter.ts` enforce identical rules.

export const TAX_ID_TYPE_VALUES = [
  "vat",
  "tax_card",
  "national_id",
  "commercial_reg",
  "passport",
  "none",
] as const;

export const BUYER_TYPE_VALUES = ["b2b", "b2c"] as const;

/** Writable compliance columns shared by customers + suppliers. */
export const complianceCreateFields = {
  country: z.string().max(100).optional(),
  countryCode: z.string().max(2).optional(),
  taxIdType: z.enum(TAX_ID_TYPE_VALUES).optional(),
  isVatRegistered: z.boolean().optional(),
  commercialReg: z.string().max(100).nullable().optional(),
  idNumber: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  buyerType: z.enum(BUYER_TYPE_VALUES).optional(),
  paymentTermsDays: z.number().int().min(0).max(3650).optional(),
};

export const complianceUpdateFields = { ...complianceCreateFields };

export interface TaxIdentityInput {
  countryCode?: string | null;
  taxIdType?: TaxIdType | null;
  taxNumber?: string | null;
  isVatRegistered?: boolean | null;
}

/**
 * Validate a tax identity for storage. Returns an Arabic error message,
 * or null when valid. Used by create/update mutations (server-enforced;
 * the client mirrors it live via `countryByCode().validateTaxId`).
 */
export function validateTaxIdentityForStorage(
  input: TaxIdentityInput
): string | null {
  const kind: TaxIdType = input.taxIdType ?? "none";
  const number = (input.taxNumber ?? "").trim();
  if (kind === "none" || !number) return null;
  const country = countryByCode(input.countryCode);
  if (!country.validateTaxId(kind, number)) {
    return `صيغة ${TAX_ID_LABELS[kind]} غير صالحة (${country.nameAr}): ${country.hint(kind)}`;
  }
  return null;
}

/** Fill server-side defaults (display country name from ISO code). */
export function normalizeCounterpartyInput<
  T extends {
    country?: string | null;
    countryCode?: string | null;
    taxIdType?: TaxIdType | null;
    buyerType?: BuyerType | null;
  },
>(input: T): T {
  const out = { ...input };
  if (out.countryCode && !out.country) {
    out.country = countryByCode(out.countryCode).nameAr;
  }
  if (!out.taxIdType) out.taxIdType = "none";
  if (!out.buyerType) out.buyerType = "b2b";
  return out;
}

/**
 * Decide invoicing compliance for one counterparty in one country.
 * Pure + explainable: every issue is a human sentence, usable in UI + API errors.
 */
export function checkCounterpartyCompliance(input: {
  countryCode?: string | null;
  direction: "sale" | "purchase";
  buyerType?: BuyerType | null;
  taxIdType?: TaxIdType | null;
  taxNumber?: string | null;
  isVatRegistered?: boolean | null;
}): ComplianceCheck {
  const issues: string[] = [];
  const country = countryByCode(input.countryCode);
  const kind: TaxIdType = input.taxIdType ?? "none";
  const number = (input.taxNumber ?? "").trim();
  const registered = !!input.isVatRegistered;

  if (kind !== "none" && !number) {
    issues.push(`حدد ${TAX_ID_LABELS[kind]} — النوع مختار بلا رقم`);
  }
  if (number && !country.validateTaxId(kind, number)) {
    issues.push(
      `صيغة ${TAX_ID_LABELS[kind]} غير صالحة (${country.nameAr}): ${country.hint(kind)}`
    );
  }
  if (registered && kind === "none") {
    issues.push("مسجل ضريبياً لكن بلا نوع هوية ضريبية — حدد النوع والرقم");
  }
  if (country.vatMandatory && input.direction === "sale" && kind === "none") {
    issues.push(
      `${country.nameAr}: المشتري بلا هوية ضريبية — ستُعامل الفاتورة B2C (مبسطة)`
    );
  }

  const isSaudiSale = country.code === "SA" && input.direction === "sale";
  const formatOk =
    kind === "none" || !number || country.validateTaxId(kind, number);
  const b2b =
    (input.buyerType ?? "b2b") === "b2b" && kind !== "none" && formatOk;
  return {
    ok: issues.length === 0,
    issues,
    vatRate: registered ? country.vatRate : 0,
    zatcaClass: !isSaudiSale
      ? "not_applicable"
      : b2b
        ? "standard"
        : "simplified",
  };
}
