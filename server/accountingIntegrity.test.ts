import { describe, expect, it } from "vitest";
import {
  assertPeriodOpen,
  postBalancedJournal,
} from "./services/accountingEngine";
import { journalEntries, transactions } from "../drizzle/schema";

/**
 * server/accountingIntegrity.test.ts — Accounting Integrity (pure unit, no DB)
 *
 * Proves the three surgical guarantees without a live database:
 *  1. Atomic rollback: if the SECOND leg insert fails, the journal header
 *     must not survive (no orphan entry) — entry + legs commit together.
 *  2. Closed-period rejection: posting into a closed fiscal period is refused.
 *  3. Fail-closed verification: when the period state cannot be verified
 *     (DB error), posting is BLOCKED — never treated as open.
 */

type Store = { journals: any[]; legs: any[] };

/** Drizzle select-chain stub: select()->from()->where()->rows (+orderBy/limit/forUpdate). */
function chainable(rows: any[]) {
  const q: any = [...rows];
  q.orderBy = () => q;
  q.limit = () => q;
  q.forUpdate = () => q;
  return q;
}

function makeDb(opts: {
  /** Row-sets returned per select() call, in order: [periods, accounts, branch]. */
  selectQueues?: any[][];
  failSelect?: boolean;
  /** 1-based index of the transactions insert that throws (simulated failure). */
  failLegAt?: number;
  store?: Store;
}) {
  const root: Store = opts.store ?? { journals: [], legs: [] };
  const queue = [...(opts.selectQueues ?? [])];
  let legCount = 0;

  const select = () => ({
    from: () => ({
      where: (..._args: any[]) => {
        if (opts.failSelect) throw new Error("simulated DB outage");
        return chainable(queue.length > 0 ? queue.shift()! : []);
      },
    }),
  });

  const runner = (stage: Store): any => ({
    select,
    insert: (table: any) => ({
      values: (v: any) => {
        if (table === transactions) {
          legCount++;
          if (opts.failLegAt != null && legCount === opts.failLegAt)
            throw new Error("simulated failure on leg insert");
          stage.legs.push(v);
        } else if (table === journalEntries) {
          stage.journals.push(v);
        } else {
          stage.legs.push(v);
        }
        return {
          returning: async () => [
            { id: 7000 + stage.journals.length * 10 + stage.legs.length, ...v },
          ],
        };
      },
    }),
    transaction: async (cb: (tx: any) => Promise<any>) => {
      const staging: Store = { journals: [], legs: [] };
      const result = await cb(runner(staging));
      // Commit only on success — a throw discards the staging (rollback).
      stage.journals.push(...staging.journals);
      stage.legs.push(...staging.legs);
      return result;
    },
  });

  return runner(root);
}

const TID = 1;
const OPEN_DATE = new Date("2026-06-15T12:00:00Z");
const ACCOUNTS = [
  { id: 1, code: "1000", isActive: true },
  { id: 2, code: "2000", isActive: true },
];
const BRANCH = [{ id: 5 }];
const legs = () => [
  { accountId: 1, type: "debit" as const, amount: "100.00" },
  { accountId: 2, type: "credit" as const, amount: "100.00" },
];

describe("Accounting Integrity (atomic journal + fail-closed period lock)", () => {
  it("rolls back the journal header when the second leg fails (no orphan entry)", async () => {
    const store: Store = { journals: [], legs: [] };
    const db = makeDb({
      selectQueues: [ACCOUNTS, BRANCH, []], // accounts, branch, periods (inside tx)
      failLegAt: 2,
      store,
    });

    await expect(
      postBalancedJournal(db, {
        tenantId: TID,
        date: OPEN_DATE,
        legs: legs(),
        narration: "اختبار ذرية القيد",
      })
    ).rejects.toThrow();

    // Atomicity: neither the header nor the first leg may survive.
    expect(store.journals).toHaveLength(0);
    expect(store.legs).toHaveLength(0);
  });

  it("commits header + both legs together on the happy path (control)", async () => {
    const store: Store = { journals: [], legs: [] };
    const db = makeDb({ selectQueues: [ACCOUNTS, BRANCH, []], store });

    const res = await postBalancedJournal(db, {
      tenantId: TID,
      date: OPEN_DATE,
      legs: legs(),
      narration: "قيد سليم",
    });

    expect(res.count).toBe(2);
    expect(store.journals).toHaveLength(1);
    expect(store.legs).toHaveLength(2);
  });

  it("rejects posting into a closed fiscal period", async () => {
    const db = makeDb({
      selectQueues: [
        [
          {
            name: "2026",
            status: "closed",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
          },
        ],
      ],
    });

    await expect(
      assertPeriodOpen(db, TID, OPEN_DATE, "قيد يدوي")
    ).rejects.toThrow(/مغلقة/);
  });

  it("fail-closed: blocks posting when the period state is unverifiable", async () => {
    const db = makeDb({ failSelect: true });

    // Must REJECT (blocked for safety) — resolving here would mean the
    // unverifiable period was treated as open (fail-open).
    await expect(
      assertPeriodOpen(db, TID, OPEN_DATE, "قيد يدوي")
    ).rejects.toThrow(/تعذر التحقق/);
  });
});
