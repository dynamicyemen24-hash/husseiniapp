import { describe, expect, it } from "vitest";
import {
  normalizeSearchText,
  suggest,
  isConfidentMatch,
  splitUnitHint,
  highlightRanges,
} from "./smartSearch";
import type { CatalogItem, SuggestionOptions } from "./smartSearch";

const DAY_MS = 24 * 60 * 60 * 1000;

// Arabic kept as \uXXXX escapes only (authoring pipeline is byte-safe).
// "sukkar" = \u0633\u0643\u0631, "kgh" (unit) = \u0643\u063A
function item(overrides: Partial<CatalogItem> & { id: number }): CatalogItem {
  return {
    name: "\u0633\u0643\u0631",
    unit: "\u0643\u063A",
    tenantId: 7,
    frequency: 0,
    ...overrides,
  };
}

describe("normalizeSearchText", () => {
  it("strips Arabic harakat (short vowels and shadda)", () => {
    // "su-k-ka-r" with damma + fatha + shadda becomes plain "sukkar"
    expect(normalizeSearchText("\u0633\u064F\u0643\u064E\u0651\u0631")).toBe(
      "\u0633\u0643\u0631"
    );
  });

  it("strips tatweel but keeps the surrounding letters", () => {
    // meem + tatweel + alif + hamza => "maa" folded to (m, a, a)
    expect(normalizeSearchText("\u0645\u0640\u0627\u0621")).toBe(
      "\u0645\u0627\u0627"
    );
  });

  it("folds every hamza form (A, aa, i, ') to plain alif", () => {
    expect(normalizeSearchText("\u0623\u062D\u0645\u062F")).toBe(
      "\u0627\u062D\u0645\u062F"
    );
    expect(normalizeSearchText("\u0625\u064A\u0645\u0627\u0646")).toBe(
      "\u0627\u064A\u0645\u0627\u0646"
    );
    expect(normalizeSearchText("\u0622\u064A\u0629")).toBe(
      "\u0627\u064A\u0647"
    );
    expect(normalizeSearchText("\u0621")).toBe("\u0627");
  });

  it("folds waw-with-hamza to waw and yaa-with-hamza to yaa", () => {
    expect(normalizeSearchText("\u0645\u0624\u0645\u0646")).toBe(
      "\u0645\u0648\u0645\u0646"
    );
    expect(normalizeSearchText("\u0628\u0626\u0631")).toBe(
      "\u0628\u064A\u0631"
    );
  });

  it("folds alif-maqsura (y) to yaa and taa-marbuta (h) to haa", () => {
    expect(normalizeSearchText("\u0645\u0633\u062A\u0634\u0641\u0649")).toBe(
      "\u0645\u0633\u062A\u0634\u0641\u064A"
    );
    expect(normalizeSearchText("\u0649")).toBe("\u064A");
    expect(normalizeSearchText("\u0629")).toBe("\u0647");
  });

  it("removes superscript alef and quranic annotation marks", () => {
    expect(normalizeSearchText("\u0633\u0670\u0631")).toBe("\u0633\u0631");
    expect(normalizeSearchText("\u0633\u06D6\u0631")).toBe("\u0633\u0631");
  });

  it("trims and lowercases the result", () => {
    expect(normalizeSearchText("  \u0627\u0644\u0633\u0643\u0631  ")).toBe(
      "\u0627\u0644\u0633\u0643\u0631"
    );
    expect(normalizeSearchText("  SUGAR ")).toBe("sugar");
  });
});

describe("suggest", () => {
  it("returns an empty list for an empty item set or a blank query", () => {
    const items = [item({ id: 1 })];
    expect(suggest("", items)).toEqual([]);
    expect(suggest("   ", items)).toEqual([]);
    expect(suggest("\u0633\u0643\u0631", [])).toEqual([]);
  });

  it("ranks matches by frequency (most-used first)", () => {
    const items = [
      item({ id: 1, frequency: 0 }),
      item({ id: 2, frequency: 10 }),
      item({ id: 3, frequency: 100 }),
    ];
    expect(suggest("\u0633\u0643\u0631", items).map(i => i.id)).toEqual([
      3, 2, 1,
    ]);
  });

  it("applies a favourites bias over unused catalog rows", () => {
    const items = [
      item({ id: 1, frequency: 0 }),
      item({ id: 4, frequency: 0, source: "favorites" }),
    ];
    expect(suggest("\u0633\u0643\u0631", items).map(i => i.id)).toEqual([4, 1]);
  });

  it("ranks a recent item above a stale high-frequency item", () => {
    const now = Date.now();
    const items = [
      item({ id: 1, frequency: 0, lastUsedAt: now - 1 * DAY_MS }),
      item({ id: 2, frequency: 100, lastUsedAt: now - 100 * DAY_MS }),
    ];
    expect(suggest("\u0633\u0643\u0631", items).map(i => i.id)).toEqual([1, 2]);
  });

  it("honours recencyHalfLifeMs so a long half-life lets frequency dominate", () => {
    const now = Date.now();
    const items = [
      item({ id: 1, frequency: 0, lastUsedAt: now - 1 * DAY_MS }),
      item({ id: 2, frequency: 100, lastUsedAt: now - 100 * DAY_MS }),
    ];
    const opts: SuggestionOptions = { recencyHalfLifeMs: 300 * DAY_MS };
    expect(suggest("\u0633\u0643\u0631", items, opts).map(i => i.id)).toEqual([
      2, 1,
    ]);
  });

  it("breaks equal score ties deterministically by ascending id", () => {
    const items = [
      item({ id: 5, frequency: 7 }),
      item({ id: 6, frequency: 7 }),
      item({ id: 7, frequency: 7 }),
    ];
    expect(suggest("\u0633\u0643\u0631", items).map(i => i.id)).toEqual([
      5, 6, 7,
    ]);
  });

  it("caps results at the default limit of 8 and honours a custom limit", () => {
    const items = Array.from({ length: 10 }, (_, k) =>
      item({ id: k + 1, frequency: k + 1, name: "\u0632\u064A\u062A" })
    );
    const result = suggest("\u0632\u064A\u062A", items);
    expect(result).toHaveLength(8);
    expect(result.map(i => i.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(
      suggest("\u0632\u064A\u062A", items, { limit: 2 }).map(i => i.id)
    ).toEqual([10, 9]);
  });

  it("matches by substring anywhere in the item text", () => {
    const items = [item({ id: 42, tenantId: 7 })];
    expect(suggest("\u0643\u0631", items).map(i => i.id)).toEqual([42]);
    // substring matching is enabled by default, so disabling is a no-op today
    expect(
      suggest("\u0643\u0631", items, { allowSubstring: false }).map(i => i.id)
    ).toEqual([42]);
  });

  it("never returns suggestions outside the provided (tenant-scoped) item set", () => {
    const only = item({ id: 42, tenantId: 7 });
    const result = suggest("\u0633\u0643\u0631", [only]);
    expect(result).toEqual([only]);
    expect(result[0]).toBe(only);
    expect(result.every(it => it.tenantId === 7)).toBe(true);
  });

  it("returns an empty list when nothing matches", () => {
    expect(suggest("\u0639\u0633\u0644", [item({ id: 1 })])).toEqual([]);
  });
});

describe("isConfidentMatch", () => {
  it("is true for an exact match regardless of diacritics", () => {
    expect(isConfidentMatch("\u0633\u0643\u0631", item({ id: 1 }))).toBe(true);
    expect(
      isConfidentMatch("\u0633\u064F\u0643\u064E\u0651\u0631", item({ id: 1 }))
    ).toBe(true);
  });

  it("is true for a substring match (real behaviour)", () => {
    expect(isConfidentMatch("\u0643\u0631", item({ id: 1 }))).toBe(true);
  });

  it("is false for an empty or blank query", () => {
    expect(isConfidentMatch("", item({ id: 1 }))).toBe(false);
    expect(isConfidentMatch("   ", item({ id: 1 }))).toBe(false);
  });

  it("is false for a different word", () => {
    expect(isConfidentMatch("\u0639\u0633\u0644", item({ id: 1 }))).toBe(false);
  });
});

describe("splitUnitHint", () => {
  it("detaches a trailing known unit from the query", () => {
    expect(
      splitUnitHint("5 \u0633\u0643\u0631 \u0643\u063A", ["\u0643\u063A"])
    ).toEqual({
      query: "5 \u0633\u0643\u0631",
      unit: "\u0643\u063A",
    });
  });

  it("matches unit spellings after normalisation (kaas for kaas)", () => {
    expect(
      splitUnitHint("3 \u0634\u0627\u064A \u0643\u0627\u0633", [
        "\u0643\u0623\u0633",
      ])
    ).toEqual({
      query: "3 \u0634\u0627\u064A",
      unit: "\u0643\u0623\u0633",
    });
  });

  it("returns the query unchanged when no known unit trails it", () => {
    expect(splitUnitHint("\u0633\u0643\u0631", ["\u0643\u063A"])).toEqual({
      query: "\u0633\u0643\u0631",
    });
    expect(
      splitUnitHint("5 \u0633\u0643\u0631 \u0639\u0644\u0628\u0629", [
        "\u0643\u063A",
      ])
    ).toEqual({
      query: "5 \u0633\u0643\u0631 \u0639\u0644\u0628\u0629",
    });
  });

  it("does not split a single-token query even when it is a known unit", () => {
    expect(splitUnitHint("\u0643\u063A", ["\u0643\u063A"])).toEqual({
      query: "\u0643\u063A",
    });
  });

  it("returns an empty query for blank input", () => {
    expect(splitUnitHint("", ["\u0643\u063A"])).toEqual({ query: "" });
    expect(splitUnitHint("   ", ["\u0643\u063A"])).toEqual({ query: "" });
  });
});

describe("highlightRanges", () => {
  it("returns the matched span on the normalised subject", () => {
    expect(
      highlightRanges(
        "\u0633\u0643\u0631",
        "\u0633\u064F\u0643\u064E\u0651\u0631"
      )
    ).toEqual([{ start: 0, end: 3 }]);
  });

  it("finds the span later in the normalised subject", () => {
    expect(
      highlightRanges(
        "\u0633\u0643\u0631",
        "\u0645\u0644\u062D \u0633\u0643\u0631"
      )
    ).toEqual([{ start: 4, end: 7 }]);
  });

  it("returns only the first span when the subject matches several times", () => {
    expect(
      highlightRanges(
        "\u0633\u0643\u0631",
        "\u0633\u0643\u0631 \u0633\u0643\u0631"
      )
    ).toEqual([{ start: 0, end: 3 }]);
  });

  it("returns an empty array when there is no match", () => {
    expect(highlightRanges("\u0639\u0633\u0644", "\u0633\u0643\u0631")).toEqual(
      []
    );
  });

  it("returns an empty array for a blank query", () => {
    expect(highlightRanges("", "\u0633\u0643\u0631")).toEqual([]);
  });
});
