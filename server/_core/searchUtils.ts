/**
 * server/_core/searchUtils.ts
 * ---------------------------
 * Shared, standards-based primitives for the platform's search & query layer.
 *
 * Capabilities:
 *  - `normalizeSearchText` — Unicode NFKC folding + Arabic orthography
 *    unification (hamza forms, taa marbuta carriers, diacritics, tatweel,
 *    Arabic-Indic digits) so "أحمد", "احمد" and "اَحْمَد" all match.
 *  - `buildSearchVariants` — raw + normalized query variants for
 *    index-friendly OR matching against un-normalized stored data.
 *  - `escapeLike` — LIKE/ILIKE wildcard escaping (anti pattern-injection).
 *  - `rankMatch` — deterministic relevance score (prefix > word-start >
 *    substring) for stable, high-quality ordering of autocomplete results.
 *  - `SearchMemo` — tiny in-process TTL cache that absorbs command-palette
 *    keystroke storms without a Redis dependency.
 */

// ── Arabic normalization ────────────────────────────────────────────────────

/** Diacritics (tashkeel), superscript alef, and tatweel. */
const ARABIC_STRIP = /[\u064B-\u0652\u0670\u0640]/g;

export function normalizeSearchText(input: string): string {
  let s = String(input ?? "").normalize("NFKC");
  s = s.replace(ARABIC_STRIP, ""); // تشكيل + تطويل
  s = s.replace(/[أإآٱ]/g, "ا"); // توحيد الهمزات
  s = s.replace(/ى/g, "ي"); // ألف مقصورة
  s = s.replace(/ؤ/g, "و");
  s = s.replace(/ئ/g, "ي");
  s = s.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)); // ٠-٩
  s = s.replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06f0)); // ۰-۹
  s = s.toLowerCase();
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Unique search variants for a user query: the trimmed raw input plus its
 * normalized form. Matching with BOTH keeps hits on un-normalized stored
 * rows while still letting "احمد" find "أحمد".
 */
export function buildSearchVariants(query: string): string[] {
  const raw = String(query ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return [];
  const normalized = normalizeSearchText(raw);
  return normalized && normalized !== raw ? [raw, normalized] : [raw];
}

// ── LIKE safety ─────────────────────────────────────────────────────────────

/** Escape LIKE/ILIKE wildcards so user input never alters pattern semantics. */
export function escapeLike(input: string): string {
  return String(input ?? "").replace(/[\\%_]/g, ch => `\\${ch}`);
}

/** Build a bounded substring pattern, escaping user wildcards. */
export function likePattern(
  query: string,
  opts?: { prefix?: boolean }
): string {
  const q = escapeLike(query);
  return opts?.prefix ? `${q}%` : `%${q}%`;
}

// ── Relevance ranking ───────────────────────────────────────────────────────

export const RELEVANCE = {
  /** Exact full match (after normalization). */
  EXACT: 4,
  /** Starts with the query. */
  PREFIX: 3,
  /** A word inside the text starts with the query. */
  WORD_PREFIX: 2,
  /** Query appears anywhere. */
  SUBSTRING: 1,
  /** No match. */
  NONE: 0,
} as const;

/**
 * Score one candidate string against a query (both should already be
 * normalized when used on Arabic text). Higher = better.
 */
export function rankMatch(text: string, query: string): number {
  const t = normalizeSearchText(text);
  const q = normalizeSearchText(query);
  if (!q) return RELEVANCE.NONE;
  if (t === q) return RELEVANCE.EXACT;
  if (t.startsWith(q)) return RELEVANCE.PREFIX;
  if (t.includes(` ${q}`)) return RELEVANCE.WORD_PREFIX;
  if (t.includes(q)) return RELEVANCE.SUBSTRING;
  return RELEVANCE.NONE;
}

/**
 * Best relevance across a row's searchable fields — optional numeric fields
 * (codes) get a +1 boost because code hits are usually intentional.
 */
export function rankRow(
  query: string,
  fields: Array<string | null | undefined>,
  codeFields?: Array<string | null | undefined>
): number {
  let best: number = RELEVANCE.NONE;
  for (const f of fields) {
    const s = rankMatch(f ?? "", query);
    if (s > best) best = s;
  }
  for (const c of codeFields ?? []) {
    const s = rankMatch(c ?? "", query);
    if (s > best) best = s + 1; // كود مطابق دليل نية بحث أقوى
  }
  return best;
}

// ── Tiny TTL memo (keystroke-storm absorber) ────────────────────────────────

interface MemoEntry<T> {
  value: T;
  expiresAt: number;
}

export class SearchMemo<T> {
  private store = new Map<string, MemoEntry<T>>();
  constructor(
    private ttlMs = 30_000,
    private maxEntries = 256
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU position
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
