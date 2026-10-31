/**
 * server/invoiceEnhancements.test.ts
 * ==================================
 * Unit tests for the invoice enhancements router helpers.
 * Tests the pure functions that don't require a DB connection.
 */

import { describe, expect, it } from "vitest";

/* ─────────────────────────────────────────────────────────────────────────────
 *  Pure helper functions — re-declared here for isolated testing.
 *  (The router file imports them; we test the logic in isolation.)
 * ───────────────────────────────────────────────────────────────────────────── */

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function csv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr: number[] = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let k = 0; k <= b.length; k++) prev[k] = curr[k];
  }
  return prev[b.length];
}

function normalizeArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function bucketOf(daysPastDue: number): string {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "d30";
  if (daysPastDue <= 60) return "d60";
  if (daysPastDue <= 90) return "d90";
  return "over90";
}

function daysPastDue(asOf: Date, dueDate: Date): number {
  if (!Number.isFinite(asOf.getTime()) || !Number.isFinite(dueDate.getTime()))
    return 0;
  return Math.max(
    0,
    Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000)
  );
}

function computeDSO(
  totalReceivables: number,
  creditSales: number,
  daysInPeriod: number
): number {
  if (daysInPeriod <= 0) return 0;
  const salesPerDay = creditSales / daysInPeriod;
  if (salesPerDay < 0.01) return 0;
  return Math.round((totalReceivables / salesPerDay) * 10) / 10;
}

function computeDPO(
  totalPayables: number,
  purchases: number,
  daysInPeriod: number
): number {
  if (daysInPeriod <= 0) return 0;
  const purchPerDay = purchases / daysInPeriod;
  if (purchPerDay < 0.01) return 0;
  return Math.round((totalPayables / purchPerDay) * 10) / 10;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  toNum
 * ───────────────────────────────────────────────────────────────────────────── */

describe("toNum", () => {
  it("returns 0 for null", () => expect(toNum(null)).toBe(0));
  it("returns 0 for undefined", () => expect(toNum(undefined)).toBe(0));
  it("returns the number when already a number", () =>
    expect(toNum(42.5)).toBe(42.5));
  it("parses string '123'", () => expect(toNum("123")).toBe(123));
  it("parses string '-99.5'", () => expect(toNum("-99.5")).toBe(-99.5));
  it("returns 0 for NaN string", () => expect(toNum("abc")).toBe(0));
  it("returns 0 for Infinity", () => expect(toNum(Infinity)).toBe(0));
  it("returns 0 for empty string", () => expect(toNum("")).toBe(0));
  it("handles numeric string with whitespace", () =>
    expect(toNum("  42 ")).toBe(42));
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  roundTo
 * ───────────────────────────────────────────────────────────────────────────── */

describe("roundTo", () => {
  it("rounds to 2 decimal places by default", () =>
    expect(roundTo(3.14159)).toBe(3.14));
  it("rounds to 1 decimal place", () => expect(roundTo(3.14159, 1)).toBe(3.1));
  it("rounds to 0 decimal places", () => expect(roundTo(3.7, 0)).toBe(4));
  it("rounds negative numbers correctly", () =>
    expect(roundTo(-2.555, 2)).toBe(-2.56));
  it("returns 0 for non-finite values", () => expect(roundTo(NaN)).toBe(0));
  it("returns 0 for Infinity", () => expect(roundTo(Infinity)).toBe(0));
  it("handles 0", () => expect(roundTo(0)).toBe(0));
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  csv
 * ───────────────────────────────────────────────────────────────────────────── */

describe("csv", () => {
  it("returns empty string for null", () => expect(csv(null)).toBe(""));
  it("returns empty string for undefined", () =>
    expect(csv(undefined)).toBe(""));
  it("returns plain string unchanged", () =>
    expect(csv("hello")).toBe("hello"));
  it("escapes strings containing comma", () =>
    expect(csv("a,b")).toBe('"a,b"'));
  it("escapes strings containing double-quote", () =>
    expect(csv('say "hi"')).toBe('"say ""hi"""'));
  it("escapes strings containing newline", () =>
    expect(csv("line1\nline2")).toBe('"line1\nline2"'));
  it("handles numbers", () => expect(csv(42)).toBe("42"));
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  levenshtein
 * ───────────────────────────────────────────────────────────────────────────── */

describe("levenshtein", () => {
  it("returns 0 for identical strings", () =>
    expect(levenshtein("hello", "hello")).toBe(0));
  it("returns length of b for empty a", () =>
    expect(levenshtein("", "abc")).toBe(3));
  it("returns length of a for empty b", () =>
    expect(levenshtein("abc", "")).toBe(3));
  it("counts one substitution", () =>
    expect(levenshtein("cat", "bat")).toBe(1));
  it("counts one insertion", () => expect(levenshtein("cat", "cats")).toBe(1));
  it("counts one deletion", () => expect(levenshtein("cats", "cat")).toBe(1));
  it("handles Arabic text", () => expect(levenshtein("محمود", "محمد")).toBe(1));
  it("handles mixed Arabic", () =>
    expect(levenshtein("احسينيه", "حسينيه")).toBe(1));
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  normalizeArabic
 * ───────────────────────────────────────────────────────────────────────────── */

describe("normalizeArabic", () => {
  it("normalizes alef variants", () => {
    expect(normalizeArabic("إسماعيل")).toBe(normalizeArabic("اسماعيل"));
    expect(normalizeArabic("أحمّد")).toBe(normalizeArabic("احمد"));
  });
  it("normalizes ya variants", () => {
    // 'ي' and 'ى' are normalized to 'ي' (both ya)
    expect(normalizeArabic("احمدي")).toBe(normalizeArabic("احمدى"));
  });
  it("normalizes taa marbuta", () => {
    expect(normalizeArabic("جميلة")).toBe("جميله");
  });
  it("removes diacritics", () => {
    expect(normalizeArabic("مُحَمَّد")).toBe("محمد");
  });
  it("removes tatweel", () => {
    expect(normalizeArabic("عـ\u0640ـربـ\u0640ـي")).toBe("عربي");
  });
  it("converts to lowercase", () => {
    expect(normalizeArabic("عربي")).toBe("عربي");
    // taa marbuta becomes ha, so the result is "العربيه"
    expect(normalizeArabic("العربية")).toBe("العربيه");
  });
  it("collapses multiple spaces", () => {
    // Tatweel removed + multiple spaces collapsed to one
    expect(normalizeArabic("الـ   عربي")).toBe("ال عربي");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  bucketOf
 * ───────────────────────────────────────────────────────────────────────────── */

describe("bucketOf", () => {
  it("current for ≤0 days", () => {
    expect(bucketOf(0)).toBe("current");
    expect(bucketOf(-5)).toBe("current");
  });
  it("d30 for 1–30 days", () => {
    expect(bucketOf(1)).toBe("d30");
    expect(bucketOf(15)).toBe("d30");
    expect(bucketOf(30)).toBe("d30");
  });
  it("d60 for 31–60 days", () => {
    expect(bucketOf(31)).toBe("d60");
    expect(bucketOf(45)).toBe("d60");
    expect(bucketOf(60)).toBe("d60");
  });
  it("d90 for 61–90 days", () => {
    expect(bucketOf(61)).toBe("d90");
    expect(bucketOf(75)).toBe("d90");
    expect(bucketOf(90)).toBe("d90");
  });
  it("over90 for >90 days", () => {
    expect(bucketOf(91)).toBe("over90");
    expect(bucketOf(365)).toBe("over90");
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  daysPastDue
 * ───────────────────────────────────────────────────────────────────────────── */

describe("daysPastDue", () => {
  const asOf = new Date("2024-03-15");

  it("returns 0 when due date is in the future", () => {
    expect(daysPastDue(asOf, new Date("2024-03-20"))).toBe(0);
  });
  it("returns positive days when due date is past", () => {
    expect(daysPastDue(asOf, new Date("2024-02-01"))).toBe(43);
  });
  it("returns 0 when due date equals asOf date", () => {
    expect(daysPastDue(asOf, new Date("2024-03-15"))).toBe(0);
  });
  it("handles invalid dates gracefully", () => {
    expect(daysPastDue(asOf, new Date("invalid"))).toBe(0);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  DSO / DPO
 * ───────────────────────────────────────────────────────────────────────────── */

describe("computeDSO", () => {
  it("calculates DSO correctly", () => {
    // DSO = (9000 / (90000/90)) = 9
    expect(computeDSO(9000, 90000, 90)).toBe(9);
  });
  it("returns 0 when credit sales are 0", () => {
    expect(computeDSO(1000, 0, 90)).toBe(0);
  });
  it("returns 0 when daysInPeriod is 0", () => {
    expect(computeDSO(1000, 500, 0)).toBe(0);
  });
  it("handles small values near zero", () => {
    expect(computeDSO(1, 0.009, 90)).toBe(0);
  });
});

describe("computeDPO", () => {
  it("calculates DPO correctly", () => {
    // DPO = (18000 / (90000/90)) = 18
    expect(computeDPO(18000, 90000, 90)).toBe(18);
  });
  it("returns 0 when purchases are 0", () => {
    expect(computeDPO(1000, 0, 90)).toBe(0);
  });
  it("returns 0 when daysInPeriod is 0", () => {
    expect(computeDPO(1000, 500, 0)).toBe(0);
  });
});
