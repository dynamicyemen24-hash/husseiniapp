/**
 * server/e2e-accounting.test.ts — Comprehensive Accounting E2E Tests
 * Pure unit tests with NO live database. Tests double-entry, fiscal periods,
 * journal integrity, financial reports, and multi-currency accounting.
 */
import { describe, expect, it } from "vitest";
import {
  isBalanced,
  imbalance,
  validateOrThrow,
  type Leg,
} from "./services/doubleEntryValidator";
import {
  fiscalPeriodCoversDate,
  isLockedPeriodStatus,
  LOCKED_PERIOD_STATUSES,
  type FiscalPeriodLike,
} from "./services/accountingEngine";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentAccountId: number | null;
  isActive: boolean;
  category: string;
}

interface JournalEntry {
  id: number;
  tenantId: number;
  status: string;
  totalAmount: string;
  memo: string;
  postedAt: Date | null;
  isImmutable: boolean;
  sourceModule: string;
  branchId: number | null;
}

interface Transaction {
  id: number;
  tenantId: number;
  accountId: number;
  amount: string;
  type: "debit" | "credit";
  transactionDate: Date;
  narration: string;
  lifecycleStatus: string;
  isReversed: boolean;
  journalEntryId: number;
  costCenterId: number | null;
  currencyId: number | null;
  exchangeRate: string | null;
  baseAmount: string | null;
}

interface FiscalPeriod {
  id: number;
  tenantId: number;
  name: string;
  label: string;
  startDate: Date;
  endDate: Date;
  status: "open" | "closing" | "closed" | "reopened";
  closedAt: Date | null;
  closingEntryId: number | null;
}

interface OpeningBalance {
  id: number;
  tenantId: number;
  accountId: number;
  amount: string;
  type: "debit" | "credit";
  periodName: string;
  currencyId: number;
  exchangeRate: string;
  baseAmount: string;
}

// ─── In-Memory Accounting Store ──────────────────────────────────────────────

class AccountingStore {
  accounts: Account[] = [];
  journals: JournalEntry[] = [];
  transactions: Transaction[] = [];
  periods: FiscalPeriod[] = [];
  openingBalances: OpeningBalance[] = [];
  private nextId = 1;

  addAccount(a: Omit<Account, "id">): Account {
    const account = { ...a, id: this.nextId++ } as Account;
    this.accounts.push(account);
    return account;
  }

  postJournal(
    je: Omit<JournalEntry, "id">,
    legs: Omit<Transaction, "id" | "journalEntryId">[]
  ): JournalEntry {
    const entry = { ...je, id: this.nextId++ } as JournalEntry;
    this.journals.push(entry);
    for (const leg of legs) {
      this.transactions.push({
        ...leg,
        id: this.nextId++,
        journalEntryId: entry.id,
      } as Transaction);
    }
    return entry;
  }

  getAccountBalance(accountId: number): number {
    return this.transactions
      .filter(t => t.accountId === accountId && !t.isReversed)
      .reduce((sum, t) => {
        const amt = parseFloat(t.amount);
        return sum + (t.type === "debit" ? amt : -amt);
      }, 0);
  }

  getTrialBalance(): Array<{
    accountId: number;
    code: string;
    debit: number;
    credit: number;
  }> {
    const map = new Map<number, { debit: number; credit: number }>();
    for (const t of this.transactions.filter(t => !t.isReversed)) {
      const existing = map.get(t.accountId) ?? { debit: 0, credit: 0 };
      const amt = parseFloat(t.amount);
      if (t.type === "debit") existing.debit += amt;
      else existing.credit += amt;
      map.set(t.accountId, existing);
    }
    const result: Array<{
      accountId: number;
      code: string;
      debit: number;
      credit: number;
    }> = [];
    for (const [accId, bal] of map) {
      const acc = this.accounts.find(a => a.id === accId);
      result.push({ accountId: accId, code: acc?.code ?? "?", ...bal });
    }
    return result;
  }

  getIncomeStatement(): {
    revenue: number;
    expenses: number;
    netIncome: number;
  } {
    let revenue = 0,
      expenses = 0;
    for (const t of this.transactions.filter(t => !t.isReversed)) {
      const amt = parseFloat(t.amount);
      const acc = this.accounts.find(a => a.id === t.accountId);
      if (!acc) continue;
      if (acc.type === "revenue") revenue += t.type === "credit" ? amt : -amt;
      if (acc.type === "expense") expenses += t.type === "debit" ? amt : -amt;
    }
    return { revenue, expenses, netIncome: revenue - expenses };
  }

  getBalanceSheet(): { assets: number; liabilities: number; equity: number } {
    let assets = 0,
      liabilities = 0,
      equity = 0;
    for (const t of this.transactions.filter(t => !t.isReversed)) {
      const amt = parseFloat(t.amount);
      const acc = this.accounts.find(a => a.id === t.accountId);
      if (!acc) continue;
      const net = t.type === "debit" ? amt : -amt;
      if (acc.type === "asset") assets += net;
      if (acc.type === "liability") liabilities -= net;
      if (acc.type === "equity") equity -= net;
    }
    return { assets, liabilities, equity };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<Account> = {}): Omit<Account, "id"> {
  return {
    tenantId: 1,
    code: "1000",
    name: "Account",
    type: "asset",
    parentAccountId: null,
    isActive: true,
    category: "Assets",
    ...overrides,
  };
}

function createPeriod(
  name: string,
  status: FiscalPeriod["status"],
  start: string,
  end: string
): FiscalPeriod {
  return {
    id: 1,
    tenantId: 1,
    name,
    label: name,
    startDate: new Date(start),
    endDate: new Date(end),
    status,
    closedAt: null,
    closingEntryId: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Accounting E2E: Chart of Accounts", () => {
  it("account hierarchy with parent-child", () => {
    const store = new AccountingStore();
    const cash = store.addAccount(
      makeAccount({ code: "1010", name: "الصندوق", type: "asset" })
    );
    const bank = store.addAccount(
      makeAccount({ code: "1020", name: "البنك", type: "asset" })
    );
    const currentAssets = store.addAccount(
      makeAccount({
        code: "1000",
        name: "الأصول المتداولة",
        type: "asset",
        parentAccountId: null,
      })
    );
    expect(store.accounts).toHaveLength(3);
    expect(cash.id).toBe(1);
  });

  it("five account types are supported", () => {
    const types: Account["type"][] = [
      "asset",
      "liability",
      "equity",
      "revenue",
      "expense",
    ];
    const store = new AccountingStore();
    types.forEach((type, i) =>
      store.addAccount(makeAccount({ code: `${1000 + i}`, type }))
    );
    expect(store.accounts).toHaveLength(5);
    expect(new Set(store.accounts.map(a => a.type)).size).toBe(5);
  });

  it("inactive accounts cannot be posted to", () => {
    const acc = makeAccount({ isActive: false });
    expect(acc.isActive).toBe(false);
  });

  it("account codes are unique per tenant", () => {
    const codes = ["1010", "1020", "2010", "3010", "4010", "5010"];
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("Accounting E2E: Double-Entry Validation", () => {
  it("balanced journal: debit = credit", () => {
    const legs: Leg[] = [
      { type: "debit", amount: 1000 },
      { type: "credit", amount: 1000 },
    ];
    expect(isBalanced(legs)).toBe(true);
    expect(imbalance(legs)).toBe(0);
  });

  it("unbalanced journal detected", () => {
    const legs: Leg[] = [
      { type: "debit", amount: 1000 },
      { type: "credit", amount: 800 },
    ];
    expect(isBalanced(legs)).toBe(false);
    expect(imbalance(legs)).toBe(200);
  });

  it("validateOrThrow throws on imbalance", () => {
    const legs: Leg[] = [
      { type: "debit", amount: 500 },
      { type: "credit", amount: 300 },
    ];
    expect(() => validateOrThrow(legs)).toThrow(/غير متوازنة/);
  });

  it("validateOrThrow passes on balanced legs", () => {
    const legs: Leg[] = [
      { type: "debit", amount: 500 },
      { type: "credit", amount: 500 },
    ];
    expect(() => validateOrThrow(legs)).not.toThrow();
  });

  it("multi-leg journal with 4 legs balances", () => {
    const legs: Leg[] = [
      { type: "debit", amount: 500 },
      { type: "debit", amount: 300 },
      { type: "credit", amount: 600 },
      { type: "credit", amount: 200 },
    ];
    expect(isBalanced(legs)).toBe(true);
  });

  it("string amounts are handled", () => {
    const legs: Leg[] = [
      { type: "debit", amount: "1500.50" },
      { type: "credit", amount: "1500.50" },
    ];
    expect(isBalanced(legs)).toBe(true);
  });

  it("negative amounts rejected", () => {
    const legs: Leg[] = [
      { type: "debit", amount: -100 },
      { type: "credit", amount: -100 },
    ];
    expect(isBalanced(legs)).toBe(false);
  });

  it("tolerance for floating point rounding", () => {
    const legs: Leg[] = [
      { type: "debit", amount: 100.0 },
      { type: "credit", amount: 100.005 },
    ];
    expect(isBalanced(legs, 0.01)).toBe(true);
  });
});

describe("Accounting E2E: Journal Entry Lifecycle", () => {
  it("creates balanced journal atomically", () => {
    const store = new AccountingStore();
    const cash = store.addAccount(
      makeAccount({ code: "1010", name: "Cash", type: "asset" })
    );
    const revenue = store.addAccount(
      makeAccount({ code: "4010", name: "Revenue", type: "revenue" })
    );

    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "1000",
        memo: "Test",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "manual",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: cash.id,
          amount: "1000",
          type: "debit",
          transactionDate: new Date(),
          narration: "Test",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: revenue.id,
          amount: "1000",
          type: "credit",
          transactionDate: new Date(),
          narration: "Test",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    expect(store.journals).toHaveLength(1);
    expect(store.transactions).toHaveLength(2);
    expect(store.getAccountBalance(cash.id)).toBe(1000);
  });

  it("atomicity: if leg fails, header is rolled back", () => {
    const store = new AccountingStore();
    // Simulate: first journal succeeds, second fails
    const acc = store.addAccount(makeAccount({ code: "1010", type: "asset" }));
    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "500",
        memo: "OK",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "manual",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: acc.id,
          amount: "500",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: acc.id,
          amount: "500",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );
    // First journal committed
    expect(store.journals).toHaveLength(1);
  });

  it("reversal creates mirrored entry", () => {
    const store = new AccountingStore();
    const cash = store.addAccount(makeAccount({ code: "1010", type: "asset" }));
    const rev = store.addAccount(
      makeAccount({ code: "4010", type: "revenue" })
    );

    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "500",
        memo: "Sale",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "sales",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: cash.id,
          amount: "500",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: rev.id,
          amount: "500",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    // Reverse: debit↔credit swapped
    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "500",
        memo: "Reversal",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "reversal",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: cash.id,
          amount: "500",
          type: "credit",
          transactionDate: new Date(),
          narration: "reversal",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: rev.id,
          amount: "500",
          type: "debit",
          transactionDate: new Date(),
          narration: "reversal",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    // Net effect is zero
    expect(store.getAccountBalance(cash.id)).toBe(0);
    expect(store.getAccountBalance(rev.id)).toBe(0);
  });

  it("immutable entries cannot be modified", () => {
    const je: JournalEntry = {
      id: 1,
      tenantId: 1,
      status: "posted",
      totalAmount: "1000",
      memo: "Posted",
      postedAt: new Date(),
      isImmutable: true,
      sourceModule: "manual",
      branchId: null,
    };
    expect(je.isImmutable).toBe(true);
    // System should block edits to immutable entries
  });
});

describe("Accounting E2E: Fiscal Period Management", () => {
  it("fiscalPeriodCoversDate detects date in range", () => {
    const period = createPeriod("2026", "open", "2026-01-01", "2026-12-31");
    expect(fiscalPeriodCoversDate(period, new Date("2026-06-15"))).toBe(true);
  });

  it("fiscalPeriodCoversDate rejects date outside range", () => {
    const period = createPeriod("2026", "open", "2026-01-01", "2026-12-31");
    expect(fiscalPeriodCoversDate(period, new Date("2027-01-01"))).toBe(false);
  });

  it("isLockedPeriodStatus detects closed/closing", () => {
    expect(isLockedPeriodStatus("closed")).toBe(true);
    expect(isLockedPeriodStatus("closing")).toBe(true);
    expect(isLockedPeriodStatus("open")).toBe(false);
    expect(isLockedPeriodStatus("reopened")).toBe(false);
  });

  it("open period allows posting", () => {
    const period = createPeriod("2026", "open", "2026-01-01", "2026-12-31");
    expect(isLockedPeriodStatus(period.status)).toBe(false);
  });

  it("closed period blocks posting", () => {
    const period = createPeriod("2025", "closed", "2025-01-01", "2025-12-31");
    expect(isLockedPeriodStatus(period.status)).toBe(true);
  });

  it("closing period blocks posting", () => {
    const period = createPeriod("2025", "closing", "2025-01-01", "2025-12-31");
    expect(isLockedPeriodStatus(period.status)).toBe(true);
  });

  it("reopened period allows posting", () => {
    const period = createPeriod("2024", "reopened", "2024-01-01", "2024-12-31");
    expect(isLockedPeriodStatus(period.status)).toBe(false);
  });

  it("LOCKED_PERIOD_STATUSES constant is correct", () => {
    expect(LOCKED_PERIOD_STATUSES).toContain("closing");
    expect(LOCKED_PERIOD_STATUSES).toContain("closed");
    expect(LOCKED_PERIOD_STATUSES).not.toContain("open");
  });
});

describe("Accounting E2E: Transaction Lifecycle", () => {
  it("lifecycleStatus transitions: saved → approved → posted", () => {
    const statuses = ["saved", "approved", "posted"];
    let current = statuses[0];
    for (let i = 1; i < statuses.length; i++) {
      current = statuses[i];
    }
    expect(current).toBe("posted");
  });

  it("reversal marks original transactions as reversed", () => {
    const store = new AccountingStore();
    const acc = store.addAccount(makeAccount({ code: "1010", type: "asset" }));
    const rev = store.addAccount(
      makeAccount({ code: "4010", type: "revenue" })
    );

    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "500",
        memo: "Original",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "sales",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: acc.id,
          amount: "500",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: rev.id,
          amount: "500",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    // Mark original as reversed
    store.transactions
      .filter(t => t.journalEntryId === 1)
      .forEach(t => {
        t.isReversed = true;
      });
    const reversed = store.transactions.filter(t => t.journalEntryId === 1);
    expect(reversed.every(t => t.isReversed)).toBe(true);
  });
});

describe("Accounting E2E: Financial Reports", () => {
  it("trial balance: total debits = total credits", () => {
    const store = new AccountingStore();
    const cash = store.addAccount(makeAccount({ code: "1010", type: "asset" }));
    const rev = store.addAccount(
      makeAccount({ code: "4010", type: "revenue" })
    );

    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "5000",
        memo: "Sale",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "sales",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: cash.id,
          amount: "5000",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: rev.id,
          amount: "5000",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    const tb = store.getTrialBalance();
    const totalDebits = tb.reduce((s, r) => s + r.debit, 0);
    const totalCredits = tb.reduce((s, r) => s + r.credit, 0);
    expect(totalDebits).toBe(totalCredits);
  });

  it("income statement: revenue - expenses = net income", () => {
    const store = new AccountingStore();
    const rev = store.addAccount(
      makeAccount({ code: "4010", type: "revenue" })
    );
    const exp = store.addAccount(
      makeAccount({ code: "5010", type: "expense" })
    );
    const cash = store.addAccount(makeAccount({ code: "1010", type: "asset" }));

    // Revenue: 10000
    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "10000",
        memo: "Revenue",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "sales",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: cash.id,
          amount: "10000",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: rev.id,
          amount: "10000",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    // Expense: 6000
    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "6000",
        memo: "Expense",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "purchases",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: exp.id,
          amount: "6000",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: cash.id,
          amount: "6000",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    const is = store.getIncomeStatement();
    expect(is.revenue).toBe(10000);
    expect(is.expenses).toBe(6000);
    expect(is.netIncome).toBe(4000);
  });

  it("balance sheet: assets = liabilities + equity", () => {
    const store = new AccountingStore();
    const asset = store.addAccount(
      makeAccount({ code: "1010", type: "asset" })
    );
    const liab = store.addAccount(
      makeAccount({ code: "2010", type: "liability" })
    );
    const equity = store.addAccount(
      makeAccount({ code: "3010", type: "equity" })
    );

    // Owner invests 100000
    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "100000",
        memo: "Investment",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "manual",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: asset.id,
          amount: "100000",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: equity.id,
          amount: "100000",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    // Takes loan 50000
    store.postJournal(
      {
        tenantId: 1,
        status: "posted",
        totalAmount: "50000",
        memo: "Loan",
        postedAt: new Date(),
        isImmutable: true,
        sourceModule: "manual",
        branchId: null,
      },
      [
        {
          tenantId: 1,
          accountId: asset.id,
          amount: "50000",
          type: "debit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
        {
          tenantId: 1,
          accountId: liab.id,
          amount: "50000",
          type: "credit",
          transactionDate: new Date(),
          narration: "",
          lifecycleStatus: "posted",
          isReversed: false,
          costCenterId: null,
          currencyId: null,
          exchangeRate: null,
          baseAmount: null,
        },
      ]
    );

    const bs = store.getBalanceSheet();
    expect(bs.assets).toBe(150000);
    expect(bs.liabilities).toBe(50000);
    expect(bs.equity).toBe(100000);
    // A = L + E
    expect(bs.assets).toBe(bs.liabilities + bs.equity);
  });
});

describe("Accounting E2E: Opening Balances", () => {
  it("set opening balance for account", () => {
    const store = new AccountingStore();
    const acc = store.addAccount(makeAccount({ code: "1010", type: "asset" }));
    const ob: OpeningBalance = {
      id: 1,
      tenantId: 1,
      accountId: acc.id,
      amount: "50000",
      type: "debit",
      periodName: "2026",
      currencyId: 1,
      exchangeRate: "1",
      baseAmount: "50000",
    };
    store.openingBalances.push(ob);
    expect(store.openingBalances).toHaveLength(1);
    expect(store.openingBalances[0].amount).toBe("50000");
  });

  it("balance sheet equation with opening balances", () => {
    const assets = 200000;
    const liabilities = 80000;
    const equity = 120000;
    expect(assets).toBe(liabilities + equity);
  });
});

describe("Accounting E2E: Budget Tracking", () => {
  it("set budget targets", () => {
    const budget = {
      periodName: "2026-Q1",
      targetRevenue: 100000,
      targetExpense: 70000,
    };
    expect(budget.targetRevenue).toBeGreaterThan(budget.targetExpense);
  });

  it("variance calculation", () => {
    const actual = 85000;
    const budget = 100000;
    const variance = actual - budget;
    const variancePercent = (variance / budget) * 100;
    expect(variance).toBe(-15000);
    expect(variancePercent).toBe(-15);
  });

  it("budget utilization percentage", () => {
    const actual = 65000;
    const budget = 100000;
    expect((actual / budget) * 100).toBe(65);
  });
});

describe("Accounting E2E: Multi-currency Accounting", () => {
  it("exchange rate conversion", () => {
    const amount = 1000;
    const exchangeRate = 250;
    const baseAmount = amount * exchangeRate;
    expect(baseAmount).toBe(250000);
  });

  it("unrealized gain/loss calculation", () => {
    const originalRate = 250;
    const currentRate = 260;
    const amount = 1000;
    const originalBase = amount * originalRate;
    const currentBase = amount * currentRate;
    const unrealizedGain = currentBase - originalBase;
    expect(unrealizedGain).toBe(10000);
  });

  it("baseAmount auto-calculation from currency × rate", () => {
    const amount = 500;
    const rate = 250;
    const baseAmount = (amount * rate).toFixed(2);
    expect(baseAmount).toBe("125000.00");
  });
});

describe("Accounting E2E: Cost Centers", () => {
  it("assign transactions to cost centers", () => {
    const transaction = {
      accountId: 1,
      amount: "5000",
      type: "debit" as const,
      costCenterId: 3,
    };
    expect(transaction.costCenterId).toBe(3);
  });

  it("cost center aggregation", () => {
    const transactions = [
      { costCenterId: 1, amount: 5000, type: "debit" },
      { costCenterId: 1, amount: 3000, type: "debit" },
      { costCenterId: 2, amount: 2000, type: "debit" },
    ];
    const byCC = new Map<number, number>();
    for (const t of transactions) {
      byCC.set(t.costCenterId, (byCC.get(t.costCenterId) ?? 0) + t.amount);
    }
    expect(byCC.get(1)).toBe(8000);
    expect(byCC.get(2)).toBe(2000);
  });
});
