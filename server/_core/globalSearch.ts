/**
 * server/_core/globalSearch.ts
 * -----------------------------
 * Unified enterprise search + smart-suggestion engine.
 *
 * - `searchEntities` — one query → matching master-data rows across products,
 *   accounts, customers, suppliers, transactions (autocomplete).
 * - Results are ALWAYS tenant-scoped: every branch of the query includes the
 *   caller's `tenantId` (and `branchId` when supplied). Zero cross-tenant leak.
 * - Uses ILIKE (backed by pg_trgm GIN indexes from 0010 + 0013) for fast
 *   fuzzy matching; safe parameterized bindings (no string interpolation).
 */
import { and, eq, ilike, or, like, sql } from "drizzle-orm";
import {
  products,
  accounts,
  customers,
  suppliers,
  transactions,
} from "../../drizzle/schema";
import {
  buildSearchVariants,
  likePattern,
  rankRow,
  RELEVANCE,
  SearchMemo,
} from "./searchUtils";

type Db = any;

export type SearchMatch = {
  kind: "product" | "account" | "customer" | "supplier" | "transaction";
  id: number;
  code?: string;
  name: string;
  label: string;
  /** 0–5 relevance score used by clients to order merged results. */
  score?: number;
};

const SEARCH_LIMIT = 8;

/** Short-lived in-process cache: absorbs command-palette keystroke storms. */
const searchMemo = new SearchMemo<SearchMatch[]>(30_000, 256);

/** OR together every ILIKE column × variant combination (parameterized). */
function matchAny(columns: Array<any>, variants: string[]) {
  const clauses: any[] = [];
  for (const col of columns) {
    for (const v of variants) {
      clauses.push(ilike(col, likePattern(v)));
    }
  }
  return or(...clauses);
}

/**
 * Fast fuzzy search across master data. `branchId` optionally tightens
 * transaction matches (master data remains tenant-global per model).
 *
 * Performance: the five entity branches run in PARALLEL via
 * `Promise.allSettled`, so p99 latency equals the slowest branch instead of
 * their sequential sum. Results are merged relevance-ranked with a stable
 * tie-break, and cached briefly in-process to absorb keystroke storms.
 */
export async function searchEntities(args: {
  db: Db;
  tenantId: number;
  query: string;
  branchId?: number;
  limit?: number;
}): Promise<SearchMatch[]> {
  const { db, tenantId, query, branchId } = args;
  const limit = Math.min(Math.max(args.limit ?? SEARCH_LIMIT, 1), 50);
  const variants = buildSearchVariants(String(query ?? ""));
  if (!variants.length) return [];
  if (!db || typeof db.select !== "function") return [];

  const memoKey = `${tenantId}:${branchId ?? 0}:${limit}:${variants.join("|")}`;
  const cached = searchMemo.get(memoKey);
  if (cached) return cached;

  // ── All entity branches run in parallel — p99 = slowest, not the sum. ──
  const [prodRes, accRes, custRes, supRes, txRes] = await Promise.allSettled([
    db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        nameAr: products.nameAr,
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          matchAny(
            [products.name, products.nameAr, products.code, products.barcode],
            variants
          )
        )
      )
      .limit(limit),
    db
      .select({ id: accounts.id, code: accounts.code, name: accounts.name })
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, tenantId),
          matchAny([accounts.name, accounts.code], variants)
        )
      )
      .limit(limit),

    db
      .select({ id: customers.id, code: customers.code, name: customers.name })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          matchAny([customers.name, customers.code, customers.phone], variants)
        )
      )
      .limit(limit),

    db
      .select({ id: suppliers.id, code: suppliers.code, name: suppliers.name })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          matchAny([suppliers.name, suppliers.code, suppliers.phone], variants)
        )
      )
      .limit(limit),

    db
      .select({
        id: transactions.id,
        narration: transactions.narration,
        notes: transactions.notes,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          ...(branchId ? [eq(transactions.branchId, branchId)] : []),
          matchAny([transactions.narration, transactions.notes], variants)
        )
      )
      .limit(limit),
  ]);

  /** Failed/unavailable branches resolve to [] (partial envs — skip). */
  const rowsOf = (r: PromiseSettledResult<any[]>): any[] =>
    r.status === "fulfilled" ? (r.value ?? []) : [];

  const results: SearchMatch[] = [];
  for (const r of rowsOf(prodRes)) {
    results.push({
      kind: "product" as const,
      id: r.id,
      code: r.code ?? undefined,
      name: r.nameAr || r.name,
      label: `${r.nameAr || r.name} (${r.code})`,
      score: rankRow(variants[0], [r.name, r.nameAr], [r.code]),
    });
  }

  for (const r of rowsOf(accRes)) {
    results.push({
      kind: "account" as const,
      id: r.id,
      code: r.code ?? undefined,
      name: r.name,
      label: `حساب ${r.name} (${r.code})`,
      score: rankRow(variants[0], [r.name], [r.code]),
    });
  }
  for (const r of rowsOf(custRes)) {
    results.push({
      kind: "customer" as const,
      id: r.id,
      code: r.code ?? undefined,
      name: r.name,
      label: `عميل ${r.name}`,
      score: rankRow(variants[0], [r.name], [r.code]),
    });
  }
  for (const r of rowsOf(supRes)) {
    results.push({
      kind: "supplier" as const,
      id: r.id,
      code: r.code ?? undefined,
      name: r.name,
      label: `مورد ${r.name}`,
      score: rankRow(variants[0], [r.name], [r.code]),
    });
  }
  for (const r of rowsOf(txRes)) {
    const narr = r.narration ?? r.notes ?? "قيد";
    results.push({
      kind: "transaction" as const,
      id: r.id,
      name: r.narration ?? "قيد",
      label: `قيد ${narr} (${
        r.transactionDate?.toISOString?.().slice(0, 10) ?? ""
      })`,
      score: rankRow(variants[0], [r.narration, r.notes]),
    });
  }

  // Merge: relevance desc, then kind/id — stable deterministic ordering.
  results.sort(
    (a, b) =>
      (b.score ?? RELEVANCE.NONE) - (a.score ?? RELEVANCE.NONE) ||
      a.kind.localeCompare(b.kind) ||
      a.id - b.id
  );

  const final = results.slice(0, limit * 4);
  searchMemo.set(memoKey, final);
  return final;
}

/** Suggested quick actions / smart chips for a query (lightweight, no DB hit). */
export function suggestQuickActions(
  query: string
): Array<{ label: string; hint: string }> {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  const chips: Array<{ label: string; hint: string }> = [];
  if (/عميل|عملا|cust|شركة/i.test(q))
    chips.push({ label: "إنشاء عميل", hint: "/commercial?new=customer" });
  if (/فاتورة|invoice|بيع/i.test(q))
    chips.push({ label: "فاتورة بيع جديدة", hint: "/commercial?new=sales" });
  if (/شراء|مشتريات|مورد|sup/i.test(q))
    chips.push({ label: "فاتورة شراء", hint: "/procurement?new=purchase" });
  if (/مخزون|منتج|stock|product/i.test(q))
    chips.push({ label: "التحقق من المخزون", hint: "/inventory?view=stock" });
  if (/تقرير|report|ربح/i.test(q))
    chips.push({ label: "تقارير الربحية", hint: "/reports?tab=profitability" });
  if (/قيد|journal|يومية/i.test(q))
    chips.push({ label: "قيد يومية جديد", hint: "/journal?new=entry" });
  if (/عميلة|نقطة|pos/i.test(q))
    chips.push({ label: "نقطة البيع", hint: "/pos" });
  if (/مشروع|project/i.test(q))
    chips.push({ label: "مشاريع", hint: "/projects" });
  return chips;
}

/** Analytics-friendly query stats (used by dashboards and audit screens). */
export function searchQueryStats(query: string): {
  length: number;
  words: number;
  hasArabic: boolean;
} {
  const q = String(query ?? "");
  return {
    length: q.length,
    words: q.trim().split(/\s+/).filter(Boolean).length,
    hasArabic: /[\u0600-\u06FF]/.test(q),
  };
}

export { like, sql };
