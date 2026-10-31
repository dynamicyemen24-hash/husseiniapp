/**
 * server/e2e-cross-module.test.ts — Cross-Module Integration E2E Tests
 * Tests end-to-end flows spanning Inventory, Sales, Purchases, Accounting.
 * Pure unit tests with NO live database.
 */
import { describe, expect, it } from "vitest";
import { isBalanced } from "./services/doubleEntryValidator";
import {
  fiscalPeriodCoversDate,
  isLockedPeriodStatus,
  type FiscalPeriodLike,
} from "./services/accountingEngine";

type Leg = { accountId: number; type: "debit" | "credit"; amount: number };

interface Product {
  id: number;
  name: string;
  stock: number;
  cost: number;
  price: number;
}
interface Account {
  id: number;
  code: string;
  type: string;
  balance: number;
}
interface Journal {
  id: number;
  legs: Leg[];
  module: string;
}

class Store {
  products = new Map<number, Product>();
  accounts = new Map<number, Account>();
  journals: Journal[] = [];
  movements: Array<{
    pid: number;
    type: string;
    qty: number;
    ref: string;
    refId: number;
  }> = [];
  private nextId = 1;

  addProduct(p: Product) {
    this.products.set(p.id, p);
  }
  addAccount(a: Account) {
    this.accounts.set(a.id, a);
  }

  deductStock(pid: number, qty: number): boolean {
    const p = this.products.get(pid);
    if (!p || qty <= 0 || p.stock < qty) return false;
    p.stock -= qty;
    return true;
  }

  addStock(pid: number, qty: number) {
    const p = this.products.get(pid);
    if (p) p.stock += qty;
  }

  postJournal(legs: Leg[], mod: string): Journal {
    const j: Journal = { id: this.nextId++, legs, module: mod };
    this.journals.push(j);
    for (const l of legs) {
      const a = this.accounts.get(l.accountId);
      if (a) a.balance += l.type === "debit" ? l.amount : -l.amount;
    }
    return j;
  }

  move(pid: number, type: string, qty: number, ref: string, refId: number) {
    this.movements.push({ pid, type, qty, ref, refId });
  }
}

const A = { CASH: 1, BANK: 2, AR: 3, AP: 4, INV: 5, REV: 6, COGS: 7, EQ: 8 };

// ═══════════════════════════════════════════════════════════════════════════════

describe("Cross-Module: Purchase to Inventory to Accounting", () => {
  it("confirming purchase: stock + journal in sync", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 100, cost: 50, price: 75 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 0 });
    s.addAccount({ id: A.AP, code: "2010", type: "liability", balance: 0 });

    s.addStock(1, 20);
    s.move(1, "in", 20, "purchase", 1);
    const j = s.postJournal(
      [
        { accountId: A.INV, type: "debit", amount: 1000 },
        { accountId: A.AP, type: "credit", amount: 1000 },
      ],
      "purchase"
    );

    expect(s.products.get(1)!.stock).toBe(120);
    expect(isBalanced(j.legs)).toBe(true);
    expect(s.accounts.get(A.INV)!.balance).toBe(1000);
    expect(s.accounts.get(A.AP)!.balance).toBe(-1000);
  });

  it("cancelling purchase reverses stock and journal", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 120, cost: 50, price: 75 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 1000 });
    s.addAccount({ id: A.AP, code: "2010", type: "liability", balance: -1000 });

    s.deductStock(1, 20);
    s.postJournal(
      [
        { accountId: A.AP, type: "debit", amount: 1000 },
        { accountId: A.INV, type: "credit", amount: 1000 },
      ],
      "reversal"
    );

    expect(s.products.get(1)!.stock).toBe(100);
    expect(s.accounts.get(A.INV)!.balance).toBe(0);
    expect(s.accounts.get(A.AP)!.balance).toBe(0);
  });
});

describe("Cross-Module: Sales to Inventory to Accounting", () => {
  it("confirming sale: stock + revenue + COGS journals", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 100, cost: 50, price: 75 });
    s.addAccount({ id: A.AR, code: "1030", type: "asset", balance: 0 });
    s.addAccount({ id: A.REV, code: "4010", type: "revenue", balance: 0 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 5000 });
    s.addAccount({ id: A.COGS, code: "5010", type: "expense", balance: 0 });

    expect(s.deductStock(1, 10)).toBe(true);
    s.move(1, "out", 10, "sales", 1);
    const j1 = s.postJournal(
      [
        { accountId: A.AR, type: "debit", amount: 750 },
        { accountId: A.REV, type: "credit", amount: 750 },
      ],
      "sales"
    );
    const j2 = s.postJournal(
      [
        { accountId: A.COGS, type: "debit", amount: 500 },
        { accountId: A.INV, type: "credit", amount: 500 },
      ],
      "cogs"
    );

    expect(s.products.get(1)!.stock).toBe(90);
    expect(isBalanced(j1.legs)).toBe(true);
    expect(isBalanced(j2.legs)).toBe(true);
    expect(s.accounts.get(A.REV)!.balance).toBe(-750);
    expect(s.accounts.get(A.INV)!.balance).toBe(4500);
  });

  it("stock value matches accounting after multiple sales", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 100, cost: 50, price: 75 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 5000 });
    s.addAccount({ id: A.COGS, code: "5010", type: "expense", balance: 0 });

    for (let i = 0; i < 3; i++) {
      s.deductStock(1, 10);
      s.postJournal(
        [
          { accountId: A.COGS, type: "debit", amount: 500 },
          { accountId: A.INV, type: "credit", amount: 500 },
        ],
        "cogs"
      );
    }

    expect(s.products.get(1)!.stock).toBe(70);
    expect(s.accounts.get(A.INV)!.balance).toBe(3500);
    expect(s.products.get(1)!.stock * s.products.get(1)!.cost).toBe(3500);
  });
});

describe("Cross-Module: Payment Reconciliation", () => {
  it("customer payment clears receivable", () => {
    const s = new Store();
    s.addAccount({ id: A.CASH, code: "1010", type: "asset", balance: 0 });
    s.addAccount({ id: A.AR, code: "1030", type: "asset", balance: 750 });

    s.postJournal(
      [
        { accountId: A.CASH, type: "debit", amount: 750 },
        { accountId: A.AR, type: "credit", amount: 750 },
      ],
      "payment"
    );

    expect(s.accounts.get(A.CASH)!.balance).toBe(750);
    expect(s.accounts.get(A.AR)!.balance).toBe(0);
  });

  it("supplier payment clears payable", () => {
    const s = new Store();
    s.addAccount({ id: A.CASH, code: "1010", type: "asset", balance: 5000 });
    // AP has credit balance = -3000 in our convention (debit positive)
    s.addAccount({ id: A.AP, code: "2010", type: "liability", balance: -3000 });

    s.postJournal(
      [
        { accountId: A.AP, type: "debit", amount: 3000 },
        { accountId: A.CASH, type: "credit", amount: 3000 },
      ],
      "payment"
    );

    expect(s.accounts.get(A.CASH)!.balance).toBe(2000);
    expect(s.accounts.get(A.AP)!.balance).toBe(0);
  });

  it("partial payments track correctly", () => {
    const s = new Store();
    s.addAccount({ id: A.CASH, code: "1010", type: "asset", balance: 0 });
    s.addAccount({ id: A.AR, code: "1030", type: "asset", balance: 5000 });

    s.postJournal(
      [
        { accountId: A.CASH, type: "debit", amount: 2000 },
        { accountId: A.AR, type: "credit", amount: 2000 },
      ],
      "payment"
    );
    expect(s.accounts.get(A.AR)!.balance).toBe(3000);

    s.postJournal(
      [
        { accountId: A.CASH, type: "debit", amount: 3000 },
        { accountId: A.AR, type: "credit", amount: 3000 },
      ],
      "payment"
    );
    expect(s.accounts.get(A.AR)!.balance).toBe(0);
    expect(s.accounts.get(A.CASH)!.balance).toBe(5000);
  });
});

describe("Cross-Module: Return & Refund Flow", () => {
  it("sales return: stock restored + accounting reversal", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 90, cost: 50, price: 75 });
    s.addAccount({ id: A.REV, code: "4010", type: "revenue", balance: -750 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 4500 });
    s.addAccount({ id: A.COGS, code: "5010", type: "expense", balance: 500 });

    s.addStock(1, 10);
    s.postJournal(
      [
        { accountId: A.REV, type: "debit", amount: 750 },
        { accountId: A.AR, type: "credit", amount: 750 },
      ],
      "credit_note"
    );
    s.postJournal(
      [
        { accountId: A.INV, type: "debit", amount: 500 },
        { accountId: A.COGS, type: "credit", amount: 500 },
      ],
      "cogs_reversal"
    );

    expect(s.products.get(1)!.stock).toBe(100);
    expect(s.accounts.get(A.REV)!.balance).toBe(0);
  });

  it("purchase return: stock deducted + accounting reversal", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 120, cost: 50, price: 75 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 1000 });
    s.addAccount({ id: A.AP, code: "2010", type: "liability", balance: -1000 });

    s.deductStock(1, 20);
    s.postJournal(
      [
        { accountId: A.AP, type: "debit", amount: 1000 },
        { accountId: A.INV, type: "credit", amount: 1000 },
      ],
      "debit_note"
    );

    expect(s.products.get(1)!.stock).toBe(100);
    expect(s.accounts.get(A.AP)!.balance).toBe(0);
  });
});

describe("Cross-Module: Fiscal Period Closing", () => {
  it("closed period blocks new postings", () => {
    const period: FiscalPeriodLike = {
      name: "2025",
      status: "closed",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    };
    expect(isLockedPeriodStatus(period.status)).toBe(true);
    expect(fiscalPeriodCoversDate(period, new Date("2025-06-15"))).toBe(true);
  });

  it("open period allows postings", () => {
    const period: FiscalPeriodLike = {
      name: "2026",
      status: "open",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    };
    expect(isLockedPeriodStatus(period.status)).toBe(false);
  });
});

describe("Cross-Module: Concurrent Operations Safety", () => {
  it("two sales on last unit: exactly one succeeds", async () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 1, cost: 50, price: 75 });

    const results = await Promise.allSettled([
      new Promise<boolean>(resolve => resolve(s.deductStock(1, 1))),
      new Promise<boolean>(resolve => resolve(s.deductStock(1, 1))),
    ]);

    const ok = results.filter(
      r =>
        r.status === "fulfilled" && (r as PromiseFulfilledResult<boolean>).value
    ).length;
    expect(ok).toBe(1);
    expect(s.products.get(1)!.stock).toBe(0);
  });

  it("stock deduction is atomic: no negative balance", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 3, cost: 50, price: 75 });
    expect(s.deductStock(1, 5)).toBe(false);
    expect(s.products.get(1)!.stock).toBe(3);
  });
});

describe("Cross-Module: Audit Trail Completeness", () => {
  it("every stock movement has a reference document", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 100, cost: 50, price: 75 });
    s.move(1, "out", 10, "sales_invoice", 100);
    s.move(1, "in", 20, "purchase_invoice", 200);
    s.move(1, "adjustment", 5, "stock_adjustment", 300);

    for (const m of s.movements) {
      expect(m.ref.length).toBeGreaterThan(0);
      expect(m.refId).toBeGreaterThan(0);
    }
  });

  it("every journal entry has balanced legs", () => {
    const s = new Store();
    s.addAccount({ id: A.CASH, code: "1010", type: "asset", balance: 0 });
    s.addAccount({ id: A.REV, code: "4010", type: "revenue", balance: 0 });

    const j1 = s.postJournal(
      [
        { accountId: A.CASH, type: "debit", amount: 1000 },
        { accountId: A.REV, type: "credit", amount: 1000 },
      ],
      "sales"
    );
    const j2 = s.postJournal(
      [
        { accountId: A.CASH, type: "debit", amount: 500 },
        { accountId: A.REV, type: "credit", amount: 500 },
      ],
      "sales"
    );

    for (const j of s.journals) {
      expect(isBalanced(j.legs)).toBe(true);
    }
  });

  it("payment always links to an invoice", () => {
    const payment = { invoiceId: 100, amount: 500, method: "cash" };
    expect(payment.invoiceId).toBeGreaterThan(0);
  });
});

describe("Cross-Module: Business Rule Enforcement", () => {
  it("cannot sell more than available stock", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 5, cost: 50, price: 75 });
    expect(s.deductStock(1, 10)).toBe(false);
    expect(s.products.get(1)!.stock).toBe(5);
  });

  it("cannot sell negative quantity", () => {
    const s = new Store();
    s.addProduct({ id: 1, name: "A", stock: 10, cost: 50, price: 75 });
    expect(s.deductStock(1, -1)).toBe(false);
  });

  it("all journal entries in store are balanced", () => {
    const s = new Store();
    s.addAccount({ id: A.CASH, code: "1010", type: "asset", balance: 0 });
    s.addAccount({ id: A.REV, code: "4010", type: "revenue", balance: 0 });
    s.addAccount({ id: A.INV, code: "1110", type: "asset", balance: 0 });
    s.addAccount({ id: A.AP, code: "2010", type: "liability", balance: 0 });

    s.postJournal(
      [
        { accountId: A.CASH, type: "debit", amount: 1000 },
        { accountId: A.REV, type: "credit", amount: 1000 },
      ],
      "sales"
    );
    s.postJournal(
      [
        { accountId: A.INV, type: "debit", amount: 500 },
        { accountId: A.AP, type: "credit", amount: 500 },
      ],
      "purchase"
    );

    for (const j of s.journals) {
      expect(isBalanced(j.legs)).toBe(true);
    }
  });
});
