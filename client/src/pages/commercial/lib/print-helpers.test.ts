/**
 * Unit tests for invoice print helpers (pure functions only —
 * window/print side effects are never exercised here).
 */
import { describe, expect, it } from "vitest";
import { escHtml, fmtAmt, parseZatca } from "./print-helpers";

describe("escHtml", () => {
  it("escapes markup for safe invoice HTML", () => {
    expect(escHtml('<b>"x"&')).toBe("&lt;b&gt;&quot;x&quot;&amp;");
    expect(escHtml(null)).toBe("");
  });
});

describe("fmtAmt", () => {
  it("formats ledger amounts with 2 decimals", () => {
    expect(fmtAmt(1234.5)).toBe("1,234.50");
    expect(fmtAmt(undefined)).toBe("0.00");
  });
});

describe("parseZatca", () => {
  it("returns null for missing/invalid stamps", () => {
    expect(parseZatca(null)).toBeNull();
    expect(parseZatca("")).toBeNull();
    expect(parseZatca("not-json")).toBeNull();
    expect(parseZatca(42)).toBeNull();
  });

  it("parses canonical and alias field names", () => {
    const full = parseZatca(
      JSON.stringify({
        uuid: "u-1",
        qrBase64: "abc",
        hash: "h-1",
        stampedAt: "2026-01-01",
      })
    );
    expect(full).toEqual({
      uuid: "u-1",
      qrBase64: "abc",
      hash: "h-1",
      stampedAt: "2026-01-01",
    });
    const alias = parseZatca(
      JSON.stringify({ invoiceUuid: "u-2", qr: "q", invoiceHash: "h" })
    );
    expect(alias?.uuid).toBe("u-2");
    expect(alias?.qrBase64).toBe("q");
    expect(alias?.hash).toBe("h");
    expect(alias?.stampedAt).toBeUndefined();
  });
});
