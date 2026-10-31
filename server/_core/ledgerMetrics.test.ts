import { describe, expect, it } from "vitest";
import {
  classifyAccount,
  computeLedgerMetrics,
  ledgerRatioSet,
  safeRatio,
} from "./ledgerMetrics";

/**
 * server/_core/ledgerMetrics.test.ts — محرك المؤشرات المالية الحقيقية
 * ==========================================================================
 * هذا المحرك يحلّ محل نسب ثابتة (1.85 / 1.45 / 0.42) كانت تُعرض للعميل
 * دون أي علاقة بالدفاتر. الاختبارات تثبّت:
 *  1. تصنيف الأصول/الخصوم إلى متداول وغير متداول.
 *  2. أن المؤشرات تُحسب من الأرصدة الفعلية (مدين/دائن + أرصدة افتتاحية).
 *  3. أن النسب غير القابلة للحساب تُعاد `null` — لا أرقام مفبركة.
 */

type Row = Record<string, any>;

function stubDb(accounts: Row[], txGroups: Row[], openingBalances: Row[] = []) {
  const selectQueue: Row[][] = [accounts, txGroups, openingBalances];
  let queueIndex = 0;

  const chainable = (rows: Row[]) => {
    const q: any = [...rows];
    q.orderBy = () => q;
    q.limit = () => q;
    q.forUpdate = () => q;
    q.groupBy = () => q;
    return q;
  };

  return {
    select: () => ({
      from: () => ({
        where: () => chainable(selectQueue[queueIndex++] ?? []),
      }),
    }),
  } as any;
}

const ACCOUNTS: Row[] = [
  {
    id: 1,
    name: "الصندوق",
    type: "asset",
    code: "1010",
    category: "أصول متداولة",
  },
  {
    id: 2,
    name: "مخزون البضاعة",
    type: "asset",
    code: "1060",
    category: "أصول متداولة",
  },
  {
    id: 3,
    name: "أثاث ومعدات",
    type: "asset",
    code: "1500",
    category: "أصول ثابتة",
  },
  {
    id: 4,
    name: "ذمم دائنة",
    type: "liability",
    code: "2010",
    category: "خصوم متداولة",
  },
  {
    id: 5,
    name: "قروض طويلة",
    type: "liability",
    code: "2500",
    category: "خصوم طويلة الأجل",
  },
  {
    id: 6,
    name: "إيرادات المبيعات",
    type: "revenue",
    code: "4000",
    category: "إيرادات",
  },
  {
    id: 7,
    name: "تكلفة المبيعات",
    type: "expense",
    code: "5000",
    category: "تكلفة المبيعات",
  },
  {
    id: 8,
    name: "مصاريف إدارية",
    type: "expense",
    code: "6000",
    category: "مصاريف",
  },
  {
    id: 9,
    name: "حقوق الملكية",
    type: "equity",
    code: "3000",
    category: "حقوق ملكية",
  },
];

// دفتر متوازن: مجموع المدين = مجموع الدائن = 2300
const TX_GROUPS: Row[] = [
  { accountId: 6, type: "credit", amount: "1000", legs: 1 },
  { accountId: 7, type: "debit", amount: "600", legs: 1 },
  { accountId: 8, type: "debit", amount: "200", legs: 1 },
  { accountId: 1, type: "debit", amount: "300", legs: 1 },
  { accountId: 2, type: "debit", amount: "700", legs: 1 },
  { accountId: 3, type: "debit", amount: "500", legs: 1 },
  { accountId: 4, type: "credit", amount: "400", legs: 1 },
  { accountId: 5, type: "credit", amount: "500", legs: 1 },
  { accountId: 9, type: "credit", amount: "400", legs: 1 },
];

describe("ledgerMetrics — account classification", () => {
  it("classifies current vs non-current assets", () => {
    expect(classifyAccount({ type: "asset", code: "1010" })).toBe("current");
    expect(classifyAccount({ type: "asset", code: "1060" })).toBe("current");
    expect(classifyAccount({ type: "asset", code: "1500" })).toBe("nonCurrent");
    expect(
      classifyAccount({ type: "asset", name: "أصول متداولة", code: "9000" })
    ).toBe("current");
    expect(
      classifyAccount({ type: "asset", name: "أصول ثابتة", code: "9000" })
    ).toBe("nonCurrent");
  });

  it("classifies current vs non-current liabilities", () => {
    expect(classifyAccount({ type: "liability", code: "2010" })).toBe(
      "current"
    );
    expect(classifyAccount({ type: "liability", code: "2500" })).toBe(
      "nonCurrent"
    );
    expect(
      classifyAccount({ type: "liability", name: "خصوم متداولة", code: "9000" })
    ).toBe("current");
  });

  it("treats anything unclassifiable as non-current (conservative)", () => {
    expect(classifyAccount({ type: "asset" })).toBe("nonCurrent");
    expect(classifyAccount({ type: "equity" })).toBe("nonCurrent");
    expect(classifyAccount({ type: "revenue" })).toBe("nonCurrent");
  });
});

describe("ledgerMetrics — computed KPIs from the ledger", () => {
  it("computes revenue, expenses, profit and balance-sheet totals", async () => {
    const db = stubDb(ACCOUNTS, TX_GROUPS);
    const m = await computeLedgerMetrics(db, 1);

    expect(m.hasLedgerData).toBe(true);
    expect(m.totalRevenue).toBe(1000);
    expect(m.totalExpense).toBe(800);
    expect(m.netProfit).toBe(200);
    expect(m.transactionCount).toBe(9);
  });

  it("splits current assets/liabilities and derives cash & inventory", async () => {
    const db = stubDb(ACCOUNTS, TX_GROUPS);
    const m = await computeLedgerMetrics(db, 1);

    // متداول: صندوق 300 + مخزون 700 = 1000 (الأثاث 500 غير متداول)
    expect(m.currentAssets).toBe(1000);
    expect(m.cash).toBe(300);
    expect(m.inventory).toBe(700);
    expect(m.quickAssets).toBe(300);
    // خصوم متداولة: ذمم 400 (القرض 500 طويل الأجل)
    expect(m.currentLiabilities).toBe(400);
    expect(m.totalAssets).toBe(1500);
    expect(m.totalLiabilities).toBe(900);
  });

  it("derives real ratios instead of hard-coded constants", async () => {
    const db = stubDb(ACCOUNTS, TX_GROUPS);
    const m = await computeLedgerMetrics(db, 1);

    expect(m.currentRatio).toBe(2.5); // 1000 / 400
    expect(m.quickRatio).toBe(0.75); // 300 / 400
    expect(m.cashRatio).toBe(0.75); // 300 / 400
    expect(m.debtToEquityRatio).toBe(1.5); // 900 / (400 + 200 ربح الفترة)
    expect(m.netProfitMarginRatio).toBe(20); // 200 / 1000
    expect(m.returnOnEquity).toBe(33.33); // 200 / 600 (منسبة مئوية، دقّة رقمين)
  });

  it("returns an empty, ratio-free result when the tenant has no accounts", async () => {
    const db = stubDb([], []);
    const m = await computeLedgerMetrics(db, 1);

    expect(m.hasLedgerData).toBe(false);
    expect(m.totalRevenue).toBe(0);
    expect(m.currentRatio).toBeNull();
    expect(m.netProfitMarginRatio).toBeNull();
  });

  it("keeps a real loss negative instead of clamping it to zero", async () => {
    const lossRows: Row[] = [
      { accountId: 6, type: "credit", amount: "100", legs: 1 },
      { accountId: 8, type: "debit", amount: "250", legs: 1 },
    ];
    const db = stubDb(ACCOUNTS, lossRows);
    const m = await computeLedgerMetrics(db, 1);

    expect(m.totalRevenue).toBe(100);
    expect(m.totalExpense).toBe(250);
    expect(m.netProfit).toBe(-150);
  });
});

describe("ledgerMetrics — ratio helpers", () => {
  it("safeRatio returns null for a zero or invalid denominator", () => {
    expect(safeRatio(10, 4)).toBe(2.5);
    expect(safeRatio(10, 0)).toBeNull();
    expect(safeRatio(NaN, 4)).toBeNull();
    expect(safeRatio(10, Infinity)).toBeNull();
  });

  it("ledgerRatioSet exposes every ratio keyed uniquely", async () => {
    const db = stubDb(ACCOUNTS, TX_GROUPS);
    const m = await computeLedgerMetrics(db, 1);
    const set = ledgerRatioSet(m);
    const keys = set.map(r => r.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("currentRatio");
    expect(keys).toContain("debtToEquity");
  });
});
