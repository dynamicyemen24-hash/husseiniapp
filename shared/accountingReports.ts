/**
 * Pure accounting-report helpers used by the Reports page AND the server KPIs.
 *
 * Transactions are stored as double-entry legs with a positive `amount` and a
 * `type` of "debit" | "credit". Accounts carry a `type` whose natural side is:
 *   asset / expense                       -> debit  (raw balance = debit - credit, >= 0)
 *   liability / equity / revenue          -> credit (raw balance = debit - credit, <= 0)
 *
 * These helpers normalise every figure to its natural-side magnitude and
 * implement the standard identities:
 *   Net income     = NetRevenue - NetExpenses
 *   Trial balance  : sum(debit balances) = sum(credit balances)
 *   Balance sheet  : Assets = Liabilities + Equity + NetIncome
 *
 * Lives in `shared/` so the server and the client derive identical numbers
 * from the same ledger — one source of truth, no drift between a KPI card
 * and the report behind it.
 */

export type ReportAccount = {
  id: number | string;
  name: string;
  type: string;
  /** Raw balance = sum(debit) - sum(credit). Negative => credit-normal net. */
  balance?: number;
  code?: string;
  [key: string]: any;
};

export type ReportTx = {
  accountId: number;
  amount: string | number;
  type: "debit" | "credit";
  isReversed?: boolean;
};

export type OpeningBalance = {
  amount: string | number;
  type: "debit" | "credit";
};

type LedgerLeg = { debit: number; credit: number };

/**
 * Build per-account net balances from transactions + optional opening balances.
 *
 * Transactions are aggregated into a single pass (Map keyed by account id)
 * instead of re-scanning the whole ledger per account — O(accounts + tx)
 * rather than O(accounts × tx), which matters on tenants with a long history.
 */
export function buildAccountBalances(
  accounts: ReportAccount[],
  transactions: ReportTx[],
  openingBalances: Record<number | string, OpeningBalance> = {}
): ReportAccount[] {
  const legs = new Map<number | string, LedgerLeg>();

  const leg = (accountId: number | string): LedgerLeg => {
    let entry = legs.get(accountId);
    if (!entry) {
      entry = { debit: 0, credit: 0 };
      legs.set(accountId, entry);
    }
    return entry;
  };

  for (const tx of transactions) {
    if (tx.isReversed) continue;
    const amt = parseFloat(String(tx.amount ?? "0"));
    if (!Number.isFinite(amt)) continue;
    const entry = leg(tx.accountId);
    if (tx.type === "debit") entry.debit += amt;
    else entry.credit += amt;
  }

  return accounts
    .map(acc => {
      let debit = 0;
      let credit = 0;
      const ob = openingBalances[acc.id];
      if (ob) {
        const oa = parseFloat(String(ob.amount ?? "0"));
        if (!Number.isNaN(oa) && oa > 0) {
          if (ob.type === "debit") debit += oa;
          else credit += oa;
        }
      }
      const aggregated = legs.get(acc.id);
      if (aggregated) {
        debit += aggregated.debit;
        credit += aggregated.credit;
      }
      const balance = debit - credit;
      return { ...acc, debit, credit, balance };
    })
    .filter(a => a.debit !== 0 || a.credit !== 0);
}

/**
 * Trial balance. Raw sign-based: debit-normal balances are positive,
 * credit-normal are negative, and both columns must match when double-entry
 * is balanced.
 */
export function computeTrialBalance(accounts: ReportAccount[]) {
  const totalDebits = accounts
    .filter(a => (a.balance ?? 0) > 0)
    .reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalCredits = accounts
    .filter(a => (a.balance ?? 0) < 0)
    .reduce((s, a) => s + Math.abs(a.balance ?? 0), 0);
  return {
    accounts,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}

/**
 * Income statement. Revenues are credit-normal (raw balance negative), so the
 * statement shows their credit magnitude (-balance). Expenses are debit-normal
 * (raw balance positive). Contra entries (refunds / discounts received) net
 * against the respective total because the raw signed balance is summed, not
 * the magnitude.
 */
export function computeIncomeStatement(accounts: ReportAccount[]) {
  const revenues = accounts
    .filter(a => a.type === "revenue")
    .map(a => ({ ...a, balance: -(a.balance ?? 0) }));
  const expenses = accounts
    .filter(a => a.type === "expense")
    .map(a => ({ ...a, balance: a.balance ?? 0 }));
  const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  return {
    revenues,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}

/**
 * Balance sheet. Assets debit-normal (raw balance), liabilities & equity are
 * credit-normal so they are inverted to positive credit magnitudes. The current
 * period's net income is added to equity so the identity
 * Assets = Liabilities + Equity + NetIncome holds for balanced books.
 */
export function computeBalanceSheet(
  accounts: ReportAccount[],
  netIncome: number
) {
  const assets = accounts
    .filter(a => a.type === "asset")
    .map(a => ({ ...a, balance: a.balance ?? 0 }));
  const liabilities = accounts
    .filter(a => a.type === "liability")
    .map(a => ({ ...a, balance: -(a.balance ?? 0) }));
  const equity = accounts
    .filter(a => a.type === "equity")
    .map(a => ({ ...a, balance: -(a.balance ?? 0) }));
  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + netIncome;
  return {
    assets,
    liabilities,
    equity: [
      ...equity,
      {
        id: -1,
        name: "أرباح الفترة",
        type: "equity",
        balance: netIncome,
        debit: 0,
        credit: 0,
      },
    ],
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
}
