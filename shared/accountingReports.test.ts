import { describe, expect, it } from "vitest";
import {
  buildAccountBalances,
  computeBalanceSheet,
  computeIncomeStatement,
  computeTrialBalance,
  type ReportAccount,
} from "./accountingReports";

// Double-entry scenario:
//   1. Sale on credit:      Dr AR 1000      / Cr Revenue 1000
//   2. Cash expense paid:   Dr Expense 400  / Cr Cash 400
//   3. Owner contribution:  Dr Cash 5000    / Cr Capital 5000
//   4. Bank loan received:  Dr Cash 2000    / Cr Loan 2000
const accounts: ReportAccount[] = [
  { id: 1, name: "الصندوق", type: "asset", balance: 0 },
  { id: 2, name: "العملاء", type: "asset", balance: 0 },
  { id: 3, name: "إيراد المبيعات", type: "revenue", balance: 0 },
  { id: 4, name: "مصاريف تشغيلية", type: "expense", balance: 0 },
  { id: 5, name: "قرض بنكي", type: "liability", balance: 0 },
  { id: 6, name: "رأس المال", type: "equity", balance: 0 },
];

const tx = (accountId: number, type: "debit" | "credit", amount: string) => ({
  accountId,
  type,
  amount,
});

const txs = [
  tx(2, "debit", "1000.00"), // Dr AR
  tx(3, "credit", "1000.00"), // Cr Revenue
  tx(4, "debit", "400.00"), // Dr Expense
  tx(1, "credit", "400.00"), // Cr Cash
  tx(1, "debit", "5000.00"), // Dr Cash
  tx(6, "credit", "5000.00"), // Cr Capital
  tx(1, "debit", "2000.00"), // Dr Cash
  tx(5, "credit", "2000.00"), // Cr Loan
];

const balances = buildAccountBalances(accounts, txs);

describe("accounting report accuracy", () => {
  it("computes raw balances with the correct natural-side signs", () => {
    const byId = Object.fromEntries(balances.map(a => [a.id, a.balance]));
    // Cash: 5000 + 2000 - 400 = +6600 (debit-normal asset)
    expect(byId[1]).toBeCloseTo(6600, 2);
    // AR: +1000
    expect(byId[2]).toBeCloseTo(1000, 2);
    // Revenue: credit-normal => -1000
    expect(byId[3]).toBeCloseTo(-1000, 2);
    // Expense: +400
    expect(byId[4]).toBeCloseTo(400, 2);
    // Loan: credit-normal => -2000
    expect(byId[5]).toBeCloseTo(-2000, 2);
    // Capital: credit-normal => -5000
    expect(byId[6]).toBeCloseTo(-5000, 2);
  });

  it("balances the trial balance", () => {
    const tb = computeTrialBalance(balances);
    // Debits: assets 7600 + expense 400 = 8000; Credits: revenue 1000 + liab 2000 + equity 5000 = 8000
    expect(tb.totalDebits).toBeCloseTo(8000, 2);
    expect(tb.totalCredits).toBeCloseTo(8000, 2);
    expect(tb.isBalanced).toBe(true);
  });

  it("reports a correct, positive income statement", () => {
    const stmt = computeIncomeStatement(balances);
    expect(stmt.totalRevenue).toBeCloseTo(1000, 2);
    expect(stmt.totalExpenses).toBeCloseTo(400, 2);
    expect(stmt.netIncome).toBeCloseTo(600, 2);
    // Individual revenue row must be positive (credit magnitude), not negative
    expect(stmt.revenues[0].balance).toBeCloseTo(1000, 2);
  });

  it("balances the balance sheet (Assets = Liabilities + Equity + NetIncome)", () => {
    const stmt = computeIncomeStatement(balances);
    const sheet = computeBalanceSheet(balances, stmt.netIncome);
    expect(sheet.totalAssets).toBeCloseTo(7600, 2);
    expect(sheet.totalLiabilities).toBeCloseTo(2000, 2);
    expect(sheet.totalEquity).toBeCloseTo(5600, 2); // 5000 capital + 600 net income
    expect(
      sheet.totalAssets - (sheet.totalLiabilities + sheet.totalEquity)
    ).toBeCloseTo(0, 2);
    // Equity rows are shown positive (credit magnitude)
    expect(sheet.equity[0].balance).toBeCloseTo(5000, 2);
    expect(sheet.equity.find(e => e.id === -1)?.balance).toBeCloseTo(600, 2);
  });

  it("nets contra entries against revenue/expense totals", () => {
    const withRefund = [
      ...txs,
      tx(3, "debit", "100.00"),
      tx(1, "credit", "100.00"),
    ];
    const b = buildAccountBalances(accounts, withRefund);
    const stmt = computeIncomeStatement(b);
    expect(stmt.totalRevenue).toBeCloseTo(900, 2); // 1000 - 100 refund
    expect(stmt.netIncome).toBeCloseTo(500, 2);
  });

  it("ignores reversed transactions", () => {
    const withReversed = [
      ...txs,
      { ...tx(3, "credit", "5000.00"), isReversed: true },
    ];
    const b = buildAccountBalances(accounts, withReversed);
    const stmt = computeIncomeStatement(b);
    expect(stmt.totalRevenue).toBeCloseTo(1000, 2);
  });
});
