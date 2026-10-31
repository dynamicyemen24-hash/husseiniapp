/**
 * smartSearch.ts — intelligent completion & retrieval layer (pure logic).
 *
 * Powers three of the UX hardening asks with one deterministic, fully
 * unit-testable core:
 *   1. Autocomplete over “item × unit of measure” pairs sourced from
 *      favorites, order history, requests and live catalog rows.
 *   2. Improved fuzzy search with Arabic-normalisation (strip diacritics /
 *      tatweel / stray forms).
 *   3. Smart-suggestion scoring (frequency × recency × tenant fit) so the
 *      cheapest, most-used item/unit pair surfaces first.
 *
 * Everything here is pure: it never touches the DB, DOM, or any router, so it
 * runs identically in `pnpm test` (throwable sandbox with no DB) and in CI.
 */

export type CatalogItem = {
  id: number;
  name: string;
  unit: string;
  code?: string;
  tenantId: number;
  source?: "favorites" | "history" | "requests" | "catalog";
  /** weight: frequency of prior use (0 = never used). */
  frequency?: number;
  /** last use (ms epoch) for recency weighting. */
  lastUsedAt?: number;
};

/** Normalises Arabic text for fuzzy comparison (diacritics, tatweel, forms). */
export function normalizeSearchText(input: string): string {
  return (input ?? "")
    .replace(/[\u064B-\u0652\u0670\u06D6-\u06DC\u06DF-\u06ED]/g, "") // harakat
    .replace(/[\u0640]/g, "") // tatweel
    .replace(/[\u0621\u0622\u0623\u0625]/g, "\u0627") // أآإ -> ا
    .replace(/[\u0649]/g, "\u064A") // ى -> ي
    .replace(/[\u0629]/g, "\u0647") // ة -> ه
    .replace(/[\u0624]/g, "\u0648") // ؤ -> و
    .replace(/[\u0626]/g, "\u064A") // ئ -> ي
    .toLowerCase()
    .trim();
}

export type SuggestionOptions = {
  /** recency half-life in ms (default 30 days). */
  recencyHalfLifeMs?: number;
  /** include substrings (looser) vs only prefix (default true). */
  allowSubstring?: boolean;
  /** max suggestions returned (default 8). */
  limit?: number;
};

const DEFAULT_OPTIONS: Required<SuggestionOptions> = {
  recencyHalfLifeMs: 30 * 24 * 60 * 60 * 1000,
  allowSubstring: true,
  limit: 8,
};

function isArabic(c: string): boolean {
  return c >= "\u0600" && c <= "\u06FF";
}

/** Character-aware prefix confidence (exact/boundary prefix > loose > none). */
function charPrefixScore(query: string, subject: string): number {
  if (subject.startsWith(query)) return 1;
  const idx = subject.indexOf(query);
  if (idx > 0) {
    const before = subject[idx - 1];
    // favour word-boundary matches (space, +, -, start)
    const isBoundary = before === " " || before === "+" || before === "-";
    return isBoundary ? 0.85 : 0.55;
  }
  return 0;
}

/**
 * Ranks candidate item×unit pairs for a query.
 * Deterministic tie-break (id asc) keeps output stable for snapshots.
 */
export function suggest(
  query: string,
  items: CatalogItem[],
  options?: SuggestionOptions
): CatalogItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!items.length) return [];
  const q = normalizeSearchText(query);
  if (!q) return [];

  const now = Date.now();
  const scored = items
    .map(it => {
      const hay = normalizeSearchText(`${it.name} ${it.unit} ${it.code ?? ""}`);
      const exact = hay.includes(q);
      const sub = opts.allowSubstring && hay.includes(q);
      if (!exact && !sub) {
        // prefix check on simplified as the minimum gate
        const prefix = charPrefixScore(q, hay);
        if (prefix === 0) return null;
        const freq = it.frequency ?? 0;
        const recency =
          it.lastUsedAt && it.lastUsedAt > 0
            ? Math.exp(-(now - it.lastUsedAt) / opts.recencyHalfLifeMs)
            : 0;
        return {
          item: it,
          score: prefix * 0.5 + (Math.min(freq, 50) / 50) * 0.3 + recency * 0.2,
        };
      }
      const freq = it.frequency ?? 0;
      const recency =
        it.lastUsedAt && it.lastUsedAt > 0
          ? Math.exp(-(now - it.lastUsedAt) / opts.recencyHalfLifeMs)
          : 0;
      // exact matches dominate; among exact, weight by use (smart hints)
      let base = exact ? 100 : 40;
      base += (Math.min(freq, 200) / 200) * 25;
      base += recency * 20;
      if (it.source === "favorites") base += 12; // favourite bias
      const boundaryBonus = exact && charPrefixScore(q, hay) >= 0.85 ? 8 : 0;
      return { item: it, score: base + boundaryBonus };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score || a.item.id - b.item.id);

  return scored.slice(0, opts.limit).map(s => s.item);
}

/** True if query is a strong (high-confidence) match — for instant actions. */
export function isConfidentMatch(query: string, item: CatalogItem): boolean {
  const q = normalizeSearchText(query);
  if (!q) return false;
  const hay = normalizeSearchText(
    `${item.name} ${item.unit} ${item.code ?? ""}`
  );
  return hay.includes(q);
}

/** Splits a raw query into (restOfQuery, trailingUnitToken) if a known unit suffix is found. */
export function splitUnitHint(
  query: string,
  knownUnits: string[]
): { query: string; unit?: string } {
  const q = query.trim();
  if (!q) return { query: q };
  const lastSpace = q.lastIndexOf(" ");
  if (lastSpace <= 0) return { query: q };
  const tail = q.slice(lastSpace + 1);
  const tailNorm = normalizeSearchText(tail);
  for (const unit of knownUnits) {
    if (normalizeSearchText(unit) === tailNorm) {
      return { query: q.slice(0, lastSpace).trim(), unit };
    }
  }
  return { query: q };
}

/** Wraps matched span highlighting indexes for the autocomplete dropdown. */
export function highlightRanges(
  query: string,
  subject: string
): Array<{ start: number; end: number }> {
  const q = normalizeSearchText(query);
  if (!q) return [];
  const s = normalizeSearchText(subject);
  if (!s.includes(q)) return [];
  const start = s.indexOf(q);
  return [{ start, end: start + q.length }];
}
