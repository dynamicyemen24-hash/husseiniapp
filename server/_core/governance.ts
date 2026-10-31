import { randomUUID, createHash } from "crypto";

/**
 * Build a unified global document code that is unique per (tenant, globalCode)
 * and encodes country / tenant / branch / user context so codes never collide
 * or overlap across user, branch, institution, or subscriber.
 */
export function genGlobalCode(opts: {
  country?: string | null;
  tenantId: number;
  branchId?: number | null;
  userId?: number | null;
}): string {
  const COUNTRY_ISO: Record<string, string> = {
    السعودية: "SA",
    الإمارات: "AE",
    مصر: "EG",
    الكويت: "KW",
    الأردن: "JO",
    اليمن: "YE",
    قطر: "QA",
    البحرين: "BH",
    عمان: "OM",
  };
  const raw = (opts.country || "YE").toString().trim();
  const mapped =
    COUNTRY_ISO[raw] ||
    raw
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 4) ||
    "XX";
  const cc = mapped.slice(0, 4);
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `GC-${cc}-T${opts.tenantId}-B${opts.branchId ?? 0}-U${opts.userId ?? 0}-${ts}${rnd}`;
}

/** True when the operating country is Saudi Arabia (ZATCA e-invoicing applies). */
export function isSaudiCountry(country?: string | null): boolean {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return (
    c === "sa" ||
    c === "saudi" ||
    c === "saudi arabia" ||
    c === "السعودية" ||
    c.startsWith("sa")
  );
}

/**
 * ZATCA Phase-1 QR (TLV base64): seller name, VAT number, timestamp, total
 * (with VAT), VAT total. Returns a base64 string suitable for the printed QR.
 */
export function buildZatcaQr(
  sellerName: string,
  vatNumber: string,
  isoTime: string,
  totalWithVat: number,
  vatTotal: number
): string {
  const enc = (tag: number, val: string) => {
    const v = Buffer.from(val, "utf8");
    return Buffer.from([tag, v.length & 0xff, ...v]);
  };
  const parts = [
    enc(1, sellerName || ""),
    enc(2, vatNumber || ""),
    enc(3, isoTime),
    enc(4, totalWithVat.toFixed(2)),
    enc(5, vatTotal.toFixed(2)),
  ];
  return Buffer.concat(parts).toString("base64");
}

/** Deterministic canonical hash for an invoice (placeholder for ZATCA stamp). */
export function invoiceHash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
