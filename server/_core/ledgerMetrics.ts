/**
 * server/_core/ledgerMetrics.ts — مؤشرات مالية حقيقية من دفتر الأستاذ
 * ==========================================================================
 * كان `managerialAccounting.financialKpis` يُرجع نسباً ثابتة (1.85، 1.45،
 * 0.42…) لا علاقة لها بالدفاتر. هذا الملف يبني الأرقام من مصادرها:
 *
 *   accounts + transactions + openingBalances  →  أرصدة الحسابات
 *   أرصدة الحسابات                             →  قائمة الدخل + الميزانية
 *   listRocket الأرقام                        →  نسب السيولة/الربحية/الملاءة
 *
 * كل النسب تُحسب عبر `shared/financialAnalytics` — نفس المحرك الذي يعرضه
 * العميل — فلا يحدث انحراف بين بطاقة المؤشر والتقرير خلفها.
 *
 * @module server/_core/ledgerMetrics
 */
import { and, eq, ne, sql } from "drizzle-orm";
import { accounts, openingBalances, transactions } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  buildAccountBalances,
  computeBalanceSheet,
  computeIncomeStatement,
  type ReportAccount,
  type ReportTx,
} from "../../shared/accountingReports";
import {
  calculateAllRatios,
  calculateLiquidityRatios,
  calculateProfitabilityRatios,
  calculateSolvencyRatios,
} from "../../shared/financialAnalytics/ratioCalculations";
import type { RatioData } from "../../shared/financialAnalytics/types";
import { safeToNumber, roundTo } from "../../shared/numeric";

export interface LedgerMetrics {
  /** إيرادات الفترة */
  totalRevenue: number;
  /** مصروفات الفترة */
  totalExpense: number;
  /** صافي الربح — قد يكون سالباً (خسارة حقيقية، لا تُقصّ إلى صفر) */
  netProfit: number;
  /** هامش صافي الربح % */
  netProfitMargin: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  quickAssets: number;
  cash: number;
  currentLiabilities: number;
  inventory: number;
  /** النسب — null عندما لا يكفي السجل لحسابها */
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;
  debtToEquityRatio: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  netProfitMarginRatio: number | null;
  grossMargin: number | null;
  /** هل توجد بيانات كافية لعرض مؤشرات حقيقية */
  hasLedgerData: boolean;
  /** عدد الحركات التي بُنيت عليها الأرقام */
  transactionCount: number;
}

/**
 * كلمات دالة على أسماء الحسابات العربية.
 * ملاحظة: صيغ الدليل الشائعة "أصول متداولة" (بدون أل التعريف)، لذلك
 * ندرج الصيغتين معاً ("متداول" و"متداولة") حتى لا يُصنَّف الأصل المتداول
 * خطأً على أنه غير متداول.
 */
const CURRENT_ASSET_HINTS = ["متداول", "متداولة", "قصير الأجل", "جاري"];
const NON_CURRENT_ASSET_HINTS = [
  "ثابتة",
  "ثابت",
  "رأسمالي",
  "غير متداولة",
  "طويل الأجل",
];
const CURRENT_LIABILITY_HINTS = ["متداول", "متداولة", "قصير الأجل", "جاري"];
const NON_CURRENT_LIABILITY_HINTS = [
  "ثابتة",
  "غير متداولة",
  "طويل الأجل",
  "قروض طويلة",
];
const INVENTORY_HINTS = ["مخزون", "بضاعة", "مواد أولية", "إنتاج قيد", "أصناف"];
const CASH_HINTS = ["نقد", "صندوق", "بنك", "بر البنك", "كاش", "محفظة"];
const COGS_HINTS = [
  "تكلفة المبيعات",
  "تكلفة البضاعة",
  "مشتريات",
  "تكلفة مباشر",
];

function includesAny(text: string, hints: string[]): boolean {
  return hints.some(h => text.includes(h));
}

/**
 * تصنيف الحساب: متداول أم غير متداول.
 * يعتمد على (1) رمز الحساب وفق المخطط المتعارف عليه، (2) التصنيف العربي، ثم
 * (3) الاسم.Anything لا يمكن تصنيفه يُعدّ غير متداول (الأكثر تحفّظاً).
 */
export function classifyAccount(account: {
  type: string;
  code?: string | null;
  category?: string | null;
  name?: string | null;
}): "current" | "nonCurrent" {
  const category = account.category ?? "";
  const name = account.name ?? "";
  const code = (account.code ?? "").trim();
  const numeric = /^\d+/.test(code) ? Number(code.slice(0, 4)) : null;

  if (account.type === "asset") {
    if (
      includesAny(category, CURRENT_ASSET_HINTS) ||
      includesAny(name, CURRENT_ASSET_HINTS)
    ) {
      return "current";
    }
    if (
      includesAny(category, NON_CURRENT_ASSET_HINTS) ||
      includesAny(name, NON_CURRENT_ASSET_HINTS)
    ) {
      return "nonCurrent";
    }
    // 10xx–12xx أصول متداولة، وما بعدها أصول ثابتة
    if (numeric !== null) {
      if (numeric >= 1000 && numeric < 1300) return "current";
      return "nonCurrent";
    }
    return "nonCurrent";
  }

  if (account.type === "liability") {
    if (
      includesAny(category, CURRENT_LIABILITY_HINTS) ||
      includesAny(name, CURRENT_LIABILITY_HINTS)
    ) {
      return "current";
    }
    if (
      includesAny(category, NON_CURRENT_LIABILITY_HINTS) ||
      includesAny(name, NON_CURRENT_LIABILITY_HINTS)
    ) {
      return "nonCurrent";
    }
    // 20xx–24xx خصوم متداولة، وما بعدها خصوم طويلة الأجل
    if (numeric !== null) {
      if (numeric >= 2000 && numeric < 2500) return "current";
      return "nonCurrent";
    }
    return "nonCurrent";
  }

  return "nonCurrent";
}

function isInventoryAccount(account: {
  code?: string | null;
  category?: string | null;
  name?: string | null;
}): boolean {
  const text = `${account.category ?? ""} ${account.name ?? ""}`;
  if (includesAny(text, INVENTORY_HINTS)) return true;
  const code = (account.code ?? "").trim();
  return code.startsWith("106");
}

function isCashAccount(account: {
  code?: string | null;
  category?: string | null;
  name?: string | null;
}): boolean {
  const text = `${account.category ?? ""} ${account.name ?? ""}`;
  if (includesAny(text, CASH_HINTS)) return true;
  const code = (account.code ?? "").trim();
  return code.startsWith("101") || code.startsWith("102");
}

function isCogsAccount(account: {
  code?: string | null;
  category?: string | null;
  name?: string | null;
}): boolean {
  return includesAny(
    `${account.category ?? ""} ${account.name ?? ""}`,
    COGS_HINTS
  );
}

/** نسبة آمنة: null عندما لا يكفي المقام (لا أرقام مفبركة). */
function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  return roundTo(numerator / denominator, 4);
}

/**
 * يحسب مؤشرات المؤسسة من الدفاتر.
 *
 * @param db   drizzle db
 * @param tenantId معرّف المؤسسة
 * @param periodStart بداية الفترة (اختياري) — يقيّد الحركات والنتائج
 */
export async function computeLedgerMetrics(
  db: Awaited<ReturnType<typeof getDb>>,
  tenantId: number,
  periodStart?: Date
): Promise<LedgerMetrics> {
  const empty: LedgerMetrics = {
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    netProfitMargin: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    currentAssets: 0,
    quickAssets: 0,
    cash: 0,
    currentLiabilities: 0,
    inventory: 0,
    currentRatio: null,
    quickRatio: null,
    cashRatio: null,
    debtToEquityRatio: null,
    returnOnEquity: null,
    returnOnAssets: null,
    netProfitMarginRatio: null,
    grossMargin: null,
    hasLedgerData: false,
    transactionCount: 0,
  };
  if (!db) return empty;

  const accountRows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      code: accounts.code,
      category: accounts.category,
    })
    .from(accounts)
    .where(eq(accounts.tenantId, tenantId));

  const accountIds = accountRows.map(a => a.id);
  if (accountIds.length === 0) return empty;

  const txFilter = periodStart
    ? and(
        eq(transactions.tenantId, tenantId),
        ne(transactions.isReversed, true),
        sql`${transactions.transactionDate} >= ${periodStart}`
      )
    : and(
        eq(transactions.tenantId, tenantId),
        ne(transactions.isReversed, true)
      );

  // التجميع داخل قاعدة البيانات: صف لكل (حساب، نوع) بدل تحميل كل الحركات.
  // على دفتر يحوي ملايين الحركات هذا فرق كبير في زمن الاستجابة واستهلاك الذاكرة.
  const [txRows, obRows] = await Promise.all([
    db
      .select({
        accountId: transactions.accountId,
        type: transactions.type,
        amount: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        legs: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(txFilter)
      .groupBy(transactions.accountId, transactions.type),
    db
      .select({
        accountId: openingBalances.accountId,
        type: openingBalances.type,
        amount: sql<string>`coalesce(sum(${openingBalances.amount}), 0)`,
      })
      .from(openingBalances)
      .where(eq(openingBalances.tenantId, tenantId))
      .groupBy(openingBalances.accountId, openingBalances.type),
  ]);

  const obMap: Record<
    number,
    { amount: string | number; type: "debit" | "credit" }
  > = {};
  for (const row of obRows) {
    obMap[row.accountId] = { amount: row.amount, type: row.type };
  }
  const reportAccounts: ReportAccount[] = accountRows.map(a => ({
    id: a.id,
    name: a.name,
    type: a.type,
    code: a.code,
    category: a.category,
  }));

  const reportTx: ReportTx[] = txRows.map(t => ({
    accountId: t.accountId,
    amount: t.amount,
    type: t.type,
  }));

  const balances = buildAccountBalances(reportAccounts, reportTx, obMap);
  const income = computeIncomeStatement(balances);
  const sheet = computeBalanceSheet(balances, income.netIncome);

  // ── فرز الأصول/الخصوم إلى متداول وغير متداول ──────────────────
  let currentAssets = 0;
  let cash = 0;
  let inventory = 0;
  let currentLiabilities = 0;

  const metaById = new Map(accountRows.map(a => [a.id, a]));

  for (const row of balances) {
    const meta = metaById.get(Number(row.id));
    if (!meta) continue;
    const balance = safeToNumber(row.balance ?? 0);

    if (meta.type === "asset") {
      const magnitude = Math.abs(balance);
      if (classifyAccount(meta) === "current") {
        currentAssets += magnitude;
        if (isCashAccount(meta)) cash += magnitude;
        else if (isInventoryAccount(meta)) inventory += magnitude;
      }
    } else if (meta.type === "liability") {
      const magnitude = Math.abs(balance);
      if (classifyAccount(meta) === "current") currentLiabilities += magnitude;
    }
  }

  // الأصول السريعة = الأصول المتداولة − المخزون
  const quickAssets = currentAssets - inventory;

  const revenue = safeToNumber(income.totalRevenue);
  const expenses = safeToNumber(income.totalExpenses);
  const netProfit = safeToNumber(income.netIncome);

  // تكلفة المبيعات لاشتقاق الربح الإجمالي
  const cogs = balances
    .filter(a => {
      const meta = metaById.get(Number(a.id));
      return meta ? meta.type === "expense" && isCogsAccount(meta) : false;
    })
    .reduce((sum, a) => sum + Math.abs(safeToNumber(a.balance ?? 0)), 0);

  const grossProfit = revenue - cogs;

  const ratioData: RatioData = {
    currentAssets,
    quickAssets,
    cash,
    currentLiabilities,
    totalAssets: safeToNumber(sheet.totalAssets),
    totalEquity: safeToNumber(sheet.totalEquity),
    totalLiabilities: safeToNumber(sheet.totalLiabilities),
    revenue,
    grossProfit,
    operatingIncome: netProfit,
    netIncome: netProfit,
    cogs,
    totalExpenses: expenses,
    inventory,
    totalSales: revenue,
  };

  const period = {
    id: "current" as const,
    label: periodStart ? "الفترة المحددة" : "الفترة الحالية",
    startDate: periodStart ?? new Date(0),
    endDate: new Date(),
  };

  const liquidity = calculateLiquidityRatios({
    data: ratioData,
    period,
    showPercentages: false,
  });
  const profitability = calculateProfitabilityRatios({
    data: ratioData,
    period,
    showPercentages: false,
  });
  const solvency = calculateSolvencyRatios({
    data: ratioData,
    period,
    showPercentages: false,
  });

  // النسب عبر المحرك المشترك — `null` تعني أن السجل لا يكفي للحساب.
  const hasLedgerData = txRows.length > 0 || obRows.length > 0;

  return {
    totalRevenue: roundTo(revenue, 2),
    totalExpense: roundTo(expenses, 2),
    netProfit: roundTo(netProfit, 2),
    netProfitMargin: revenue > 0 ? roundTo((netProfit / revenue) * 100, 2) : 0,
    totalAssets: roundTo(safeToNumber(sheet.totalAssets), 2),
    totalLiabilities: roundTo(safeToNumber(sheet.totalLiabilities), 2),
    totalEquity: roundTo(safeToNumber(sheet.totalEquity), 2),
    currentAssets: roundTo(currentAssets, 2),
    quickAssets: roundTo(quickAssets, 2),
    cash: roundTo(cash, 2),
    currentLiabilities: roundTo(currentLiabilities, 2),
    inventory: roundTo(inventory, 2),
    currentRatio: hasLedgerData ? liquidity.currentRatio.value : null,
    quickRatio: hasLedgerData ? liquidity.quickRatio.value : null,
    cashRatio: hasLedgerData ? liquidity.cashRatio.value : null,
    debtToEquityRatio: hasLedgerData ? solvency.debtToEquity.value : null,
    returnOnEquity: hasLedgerData ? profitability.roe.value : null,
    returnOnAssets: hasLedgerData ? profitability.roa.value : null,
    netProfitMarginRatio: hasLedgerData
      ? profitability.netProfitMargin.value
      : null,
    grossMargin: hasLedgerData ? profitability.grossMargin.value : null,
    hasLedgerData,
    transactionCount: txRows.reduce((sum, r) => sum + (r.legs ?? 0), 0),
  };
}

/** كل النسب المحسوبة — للاستخدام في التقارير المقارنة. */
export function ledgerRatioSet(metrics: LedgerMetrics) {
  const data: RatioData = {
    currentAssets: metrics.currentAssets,
    quickAssets: metrics.quickAssets,
    cash: metrics.cash,
    currentLiabilities: metrics.currentLiabilities,
    totalAssets: metrics.totalAssets,
    totalEquity: metrics.totalEquity,
    totalLiabilities: metrics.totalLiabilities,
    revenue: metrics.totalRevenue,
    grossProfit: metrics.totalRevenue - metrics.totalExpense,
    operatingIncome: metrics.netProfit,
    netIncome: metrics.netProfit,
    cogs: metrics.totalExpense,
    totalExpenses: metrics.totalExpense,
    inventory: metrics.inventory,
    totalSales: metrics.totalRevenue,
  };
  const period = {
    id: "current" as const,
    label: "الفترة الحالية",
    startDate: new Date(0),
    endDate: new Date(),
  };
  return calculateAllRatios({ data, period, showPercentages: false });
}

export { ratio as safeRatio };
