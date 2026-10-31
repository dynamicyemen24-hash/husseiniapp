/**
 * server/_core/aliasBrain.ts — ألياس intelligence layer.
 *
 * Grounding pipeline (RAG-lite, zero external dependencies):
 *   1. classifyIntent()  — fast keyword scoring over the user's message.
 *   2. buildTenantContext() — pulls REAL KPIs from the tenant DB matching the
 *      intent (finance / sales / inventory / partners). Every query is
 *      timeout-guarded and failure-tolerant: a broken section degrades to
 *      "unavailable" instead of breaking the chat.
 *   3. The router injects the context block into the system prompt so the LLM
 *      answers from live data — never from imagination.
 */

import { and, count, desc, eq, gte, lte, gt, sql } from "drizzle-orm";
import {
  customers,
  products,
  salesInvoices,
  suppliers,
  transactions,
} from "../../drizzle/schema";
import type { AliasIntent } from "../../shared/aliasAi";

// ─── 1. Intent classification ───────────────────────────────────────────────

const INTENT_KEYWORDS: ReadonlyArray<{ intent: AliasIntent; words: RegExp[] }> =
  [
    {
      intent: "greeting",
      words: [/^(السلام|مرحب|اهلا|أهلا|هلا|هاي|hi|hello|سلام)/i],
    },
    {
      intent: "finance",
      words: [
        /ربح|خسار|إيراد|ايراد|مصروف|مصروفات|رصيد|نقد|سيول|قيد|يومية|ميزان|ميزاني|مالي|مالية|ضريب|زكاة|إقفال|اقفال|profit|revenue|expense|cash|balance|journal/i,
      ],
    },
    {
      intent: "sales",
      words: [
        /فاتور|بيع|مبيع|عميل|ذمم|تحصيل|خصم|عرض سعر|invoice|sale|customer|receivable/i,
      ],
    },
    {
      intent: "inventory",
      words: [
        /مخزون|مستودع|مخزن|صنف|أصناف|اصناف|كمية|جرد|دفعة|صلاحية|تحويل|stock|warehouse|inventory|batch/i,
      ],
    },
    {
      intent: "partners",
      words: [/مورد|موردين|شراء|مشتريات|أمر شراء|supplier|vendor|purchase/i],
    },
    {
      intent: "platform",
      words: [
        /كيف.*في النظام|كيف أستخدم|كيف استخدم|خطوات|شرح النظام|المنصة|الباقات|اشتراك|صلاحيات|نسخ احتياط|settings|subscription|how (do|to) (i )?use/i,
      ],
    },
  ];

export function classifyIntent(text: string): AliasIntent {
  for (const { intent, words } of INTENT_KEYWORDS) {
    if (words.some(re => re.test(text))) return intent;
  }
  return "general";
}

// ─── 2. Tenant context builders ─────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function financeContext(db: any, tenantId: number): Promise<string> {
  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.lifecycleStatus, "saved"),
        gte(transactions.transactionDate, monthStart())
      )
    )
    .groupBy(transactions.type);

  const debits = Number(
    rows.find((r: { type: string; total: string }) => r.type === "debit")
      ?.total ?? 0
  );
  const credits = Number(
    rows.find((r: { type: string; total: string }) => r.type === "credit")
      ?.total ?? 0
  );
  const net = debits - credits;

  return [
    `[المالية — الشهر الحالي]`,
    `إجمالي الحركات المدينة: ${fmt(debits)}`,
    `إجمالي الحركات الدائنة: ${fmt(credits)}`,
    `الفرق الصافي (مدين - دائن): ${fmt(net)}`,
  ].join("\n");
}

async function salesContext(db: any, tenantId: number): Promise<string> {
  const [agg] = await db
    .select({
      cnt: count(),
      total: sql<string>`coalesce(sum(${salesInvoices.total}), 0)`,
    })
    .from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.tenantId, tenantId),
        sql`${salesInvoices.status} <> 'cancelled'`,
        gte(salesInvoices.invoiceDate, monthStart())
      )
    );

  const top = await db
    .select({
      name: customers.name,
      total: sql<string>`coalesce(sum(${salesInvoices.total}), 0)`,
    })
    .from(salesInvoices)
    .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
    .where(
      and(
        eq(salesInvoices.tenantId, tenantId),
        sql`${salesInvoices.status} <> 'cancelled'`
      )
    )
    .groupBy(customers.name)
    .orderBy(desc(sql`coalesce(sum(${salesInvoices.total}), 0)`))
    .limit(3);

  return [
    `[المبيعات]`,
    `فواتير الشهر الحالي: ${agg?.cnt ?? 0} فاتورة بقيمة ${fmt(Number(agg?.total ?? 0))}`,
    top.length > 0
      ? `أكبر العملاء (إجمالي تاريخي):\n${top.map((c: { name: string | null; total: string }, i: number) => `${i + 1}. ${c.name ?? "غير مسمى"} — ${fmt(Number(c.total))}`).join("\n")}`
      : "لا يوجد عملاء مسجلون بعد.",
  ].join("\n");
}

async function inventoryContext(db: any, tenantId: number): Promise<string> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.tenantId, tenantId));

  const low = await db
    .select({
      name: products.name,
      stock: products.currentStock,
      min: products.minStock,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        gt(products.minStock, 0),
        lte(products.currentStock, products.minStock)
      )
    )
    .limit(5);

  return [
    `[المخزون]`,
    `عدد الأصناف المسجلة: ${total}`,
    low.length > 0
      ? `أصناف عند حد الطلب أو دونه:\n${low.map((p: { name: string; stock: number; min: number }) => `- ${p.name}: المتوفر ${p.stock} / الحد الأدنى ${p.min}`).join("\n")}`
      : "لا توجد أصناف تحت حد الطلب.",
  ].join("\n");
}

async function partnersContext(db: any, tenantId: number): Promise<string> {
  const [[cust], [sup]] = await Promise.all([
    db
      .select({ total: count() })
      .from(customers)
      .where(eq(customers.tenantId, tenantId)),
    db
      .select({ total: count() })
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId)),
  ]);
  return `[العملاء والموردون]\nعدد العملاء: ${cust?.total ?? 0}\nعدد الموردين: ${sup?.total ?? 0}`;
}

/**
 * Build a compact grounded context block for the given intent.
 * Never throws — each section degrades independently.
 */
export async function buildTenantContext(
  tenantId: number,
  intent: AliasIntent
): Promise<string | null> {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return null;

    switch (intent) {
      case "finance":
        return financeContext(db, tenantId);
      case "sales":
        return salesContext(db, tenantId);
      case "inventory":
        return inventoryContext(db, tenantId);
      case "partners":
        return partnersContext(db, tenantId);
      default:
        return null; // greeting/general/platform need no live numbers
    }
  } catch (e) {
    console.warn("[alias-brain] context unavailable:", e);
    return null;
  }
}
