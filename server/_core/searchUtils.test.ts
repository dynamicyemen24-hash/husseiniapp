/**
 * server/_core/searchUtils.test.ts
 * --------------------------------
 * Unit tests for the shared search primitives: Arabic normalization, LIKE
 * wildcard escaping, relevance ranking, and the TTL memo cache.
 */
import { describe, expect, it } from "vitest";
import {
  buildSearchVariants,
  escapeLike,
  likePattern,
  normalizeSearchText,
  rankMatch,
  rankRow,
  RELEVANCE,
  SearchMemo,
} from "./searchUtils";

describe("normalizeSearchText", () => {
  it("unifies hamza forms (أ إ آ → ا)", () => {
    expect(normalizeSearchText("أحمد")).toBe(normalizeSearchText("احمد"));
    expect(normalizeSearchText("إبراهيم")).toBe(normalizeSearchText("ابراهيم"));
    expect(normalizeSearchText("آمنة")).toBe("امنة");
  });

  it("strips diacritics and tatweel", () => {
    expect(normalizeSearchText("مُحَمَّد")).toBe("محمد");
    expect(normalizeSearchText("عـلـي")).toBe("علي");
  });

  it("unifies alef maqsura with yaa", () => {
    expect(normalizeSearchText("مصطفى")).toBe(normalizeSearchText("مصطفي"));
  });

  it("folds Arabic-Indic digits to ASCII", () => {
    expect(normalizeSearchText("فاتورة ١٢٣")).toBe("فاتورة 123");
    expect(normalizeSearchText("۵۶")).toBe("56");
  });

  it("lowercases latin and collapses whitespace", () => {
    expect(normalizeSearchText("  INVOICE   A1 ")).toBe("invoice a1");
  });

  it("handles empty/nullish input safely", () => {
    expect(normalizeSearchText("")).toBe("");
    expect(normalizeSearchText(undefined as any)).toBe("");
  });
});

describe("buildSearchVariants", () => {
  it("returns raw + normalized variants when they differ", () => {
    expect(buildSearchVariants("أحمد")).toEqual(["أحمد", "احمد"]);
  });

  it("returns a single variant when already normalized", () => {
    expect(buildSearchVariants("ahmed")).toEqual(["ahmed"]);
  });

  it("returns [] for blank queries", () => {
    expect(buildSearchVariants("   ")).toEqual([]);
  });

  it("collapses internal whitespace", () => {
    expect(buildSearchVariants("فاتورة    بيع")[0]).toBe("فاتورة بيع");
  });
});

describe("escapeLike / likePattern", () => {
  it("escapes LIKE wildcards (anti pattern-injection)", () => {
    expect(escapeLike("50%_off\\x")).toBe("50\\%\\_off\\\\x");
  });

  it("wraps in substring bounds by default", () => {
    expect(likePattern("abc")).toBe("%abc%");
  });

  it("supports prefix mode", () => {
    expect(likePattern("abc", { prefix: true })).toBe("abc%");
  });
});

describe("rankMatch", () => {
  it("scores exact > prefix > word-prefix > substring > none", () => {
    const q = "احمد";
    expect(rankMatch("احمد", q)).toBe(RELEVANCE.EXACT);
    expect(rankMatch("احمد علي", q)).toBe(RELEVANCE.PREFIX);
    expect(rankMatch("محمد احمد", q)).toBe(RELEVANCE.WORD_PREFIX);
    expect(rankMatch("الشيخلااحمدون", q)).toBe(RELEVANCE.SUBSTRING);
    expect(rankMatch("سالم", q)).toBe(RELEVANCE.NONE);
  });

  it("matches normalized Arabic through different orthographies", () => {
    expect(rankMatch("أَحْمَد", "احمد")).toBeGreaterThan(RELEVANCE.NONE);
  });

  it("returns NONE for empty query", () => {
    expect(rankMatch("anything", "")).toBe(RELEVANCE.NONE);
  });
});

describe("rankRow", () => {
  it("boosts code matches above name matches", () => {
    const viaCode = rankRow("101", ["اسم عشوائي"], ["ACC-101"]);
    const viaName = rankRow("101", ["نتيجة س101 وسط"], []);
    expect(viaCode).toBeGreaterThan(viaName);
  });

  it("ignores null/undefined fields", () => {
    expect(rankRow("x", [null, undefined], [null])).toBe(RELEVANCE.NONE);
  });
});

describe("SearchMemo", () => {
  it("stores and retrieves values within TTL", () => {
    const memo = new SearchMemo<string>(60_000);
    memo.set("k", "v");
    expect(memo.get("k")).toBe("v");
  });

  it("evicts expired entries", () => {
    const memo = new SearchMemo<string>(-1); // already expired
    memo.set("k", "v");
    expect(memo.get("k")).toBeUndefined();
  });

  it("respects max entries (FIFO eviction)", () => {
    const memo = new SearchMemo<string>(60_000, 2);
    memo.set("a", "1");
    memo.set("b", "2");
    memo.set("c", "3");
    expect(memo.get("a")).toBeUndefined();
    expect(memo.get("c")).toBe("3");
  });

  it("clear() empties everything", () => {
    const memo = new SearchMemo<string>(60_000);
    memo.set("k", "v");
    memo.clear();
    expect(memo.get("k")).toBeUndefined();
  });
});
