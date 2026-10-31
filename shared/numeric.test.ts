import { describe, expect, it } from "vitest";
import {
  NUMERIC_EPSILON,
  NUMERIC_FALLBACK,
  approximatelyEqual,
  isNonNegativeNumber,
  isPositiveNumber,
  roundTo,
  safeToNumber,
} from "./numeric";

/**
 * shared/numeric.test.ts — العقد الرقمي المشترك بين العميل والخادم
 * هذه الدوال تحمي الحسابات المالية من القيم غير الصالحة (NaN، null، "")،
 * فأي انحراف هنا يظهر مباشرة في دفاتر العميل.
 */
describe("shared/numeric — coercion helpers", () => {
  it("safeToNumber coerces valid numeric strings and numbers", () => {
    expect(safeToNumber("1234.56")).toBe(1234.56);
    expect(safeToNumber(42)).toBe(42);
    expect(safeToNumber("  10  ")).toBe(10);
    expect(safeToNumber(-5)).toBe(-5);
  });

  it("safeToNumber falls back for null/undefined/empty/non-finite/boolean", () => {
    expect(safeToNumber(null)).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber(undefined)).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber("")).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber("abc")).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber(NaN)).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber(Infinity)).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber(true)).toBe(NUMERIC_FALLBACK);
    expect(safeToNumber(false)).toBe(NUMERIC_FALLBACK);
  });

  it("safeToNumber honours a custom fallback", () => {
    expect(safeToNumber("nope", -1)).toBe(-1);
    expect(safeToNumber(null, 7)).toBe(7);
  });

  it("isPositiveNumber accepts only strictly positive finite values", () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber("2.5")).toBe(true);
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber("")).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
  });

  it("isNonNegativeNumber accepts zero but rejects negatives", () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber("0")).toBe(true);
    expect(isNonNegativeNumber(3)).toBe(true);
    expect(isNonNegativeNumber(-0.01)).toBe(false);
    expect(isNonNegativeNumber(NaN)).toBe(false);
  });

  it("approximatelyEqual applies the shared epsilon tolerance", () => {
    expect(approximatelyEqual(100, 100.005)).toBe(true);
    expect(approximatelyEqual(100, 100.5)).toBe(false);
    expect(approximatelyEqual(1, 1, 0)).toBe(false);
    expect(NUMERIC_EPSILON).toBe(0.01);
  });

  it("roundTo rounds to the requested precision and neutralises non-finite", () => {
    // Note: JS float representation means 1.005 * 100 === 100.49999…
    // so it rounds to 1 — the documented behaviour of this helper.
    expect(roundTo(1.005, 2)).toBe(1);
    expect(roundTo(1.016, 2)).toBe(1.02);
    expect(roundTo(1234.5678)).toBe(1234.57);
    expect(roundTo(1234.5678, 4)).toBe(1234.5678);
    expect(roundTo(NaN)).toBe(0);
    expect(roundTo(Infinity)).toBe(0);
  });
});
