import { describe, expect, it } from "vitest";
import {
  postBalancedJournal,
  postBalancedJournalInTx,
} from "./services/accountingEngine";
import { journalEntries, transactions } from "../drizzle/schema";

/**
 * server/accountingAtomicity.test.ts — ذرّية المعاملات في محرّك القيد
 * ==========================================================================
 * المشكلة:Transactions المتداخلة في `neon-serverless` لا تُنتج SAVEPOINT —
 * الـ BEGIN الداخلي يُهمَل والـ COMMIT الداخلي يُنهي المعاملة الخارجية. أي
 * عملية تحتاج "خصم مخزون + ترحيل قيد" كانت تُثبّت أحدهما قبل الآخر.
 *
 * الحل: `postBalancedJournalInTx` يقبل معاملة مفتوحة مسبقاً ولا يفتح
 * معاملة جديدة، فتبقى العملية كلها في معاملة واحدة.
 *
 * هذه الاختبارات تثبّت السلوك:
 *  1. `postBalancedJournalInTx` لا تفتح معاملة (0 استدعاء لـ transaction).
 *  2. داخل معاملة خارجية: فشل ما بعد الترحيل يُرجِع القيد وأطرافه.
 *  3. `postBalancedJournal` تفتح معاملة واحدة بالضبط (سلوك غير متغيّر).
 *  4. القيد داخل معاملة خارجية لا يُثبَّت قبل نجاح المعاملة الخارجية.
 */

type Store = { journals: any[]; legs: any[] };

function chainable(rows: any[]) {
  const q: any = [...rows];
  q.orderBy = () => q;
  q.limit = () => q;
  q.forUpdate = () => q;
  return q;
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

/** قاعدة وهمية تحاكي سلوك COMMIT/ROLLBACK وتعدّ استدعاءات المعاملات. */
function makeDb(selectQueues: any[][] = []) {
  const root: Store = { journals: [], legs: [] };
  const queue = [...selectQueues];
  let txCalls = 0;

  const runner = (stage: Store): any => ({
    select: () => ({
      from: () => ({
        where: () => chainable(queue.length > 0 ? queue.shift()! : []),
      }),
    }),
    insert: (table: any) => ({
      values: (v: any) => {
        if (table === transactions) stage.legs.push(v);
        else stage.journals.push(v);
        return {
          returning: async () => [{ id: 9000 + stage.journals.length, ...v }],
        };
      },
    }),
    transaction: async (cb: (tx: any) => Promise<any>) => {
      txCalls++;
      const staging: Store = { journals: [], legs: [] };
      const result = await cb(runner(staging));
      // الالتزام عند النجاح فقط — أي استثناء يُهمل staging (rollback).
      stage.journals.push(...staging.journals);
      stage.legs.push(...staging.legs);
      return result;
    },
  });

  return { db: runner(root), store: root, txCalls: () => txCalls };
}

describe("Accounting atomicity (in-transaction journal posting)", () => {
  it("postBalancedJournalInTx does not open a nested transaction", async () => {
    const { db, store, txCalls } = makeDb([ACCOUNTS, BRANCH, []]);

    const res = await postBalancedJournalInTx(db, {
      tenantId: TID,
      date: OPEN_DATE,
      legs: legs(),
      narration: "قيد داخل معاملة قائمة",
    });

    expect(txCalls()).toBe(0);
    expect(res.count).toBe(2);
    expect(store.journals).toHaveLength(1);
    expect(store.legs).toHaveLength(2);
  });

  it("rolls back the journal when a later step inside the outer transaction fails", async () => {
    const { db, store, txCalls } = makeDb([ACCOUNTS, BRANCH, []]);

    await expect(
      db.transaction(async (tx: any) => {
        await postBalancedJournalInTx(tx, {
          tenantId: TID,
          date: OPEN_DATE,
          legs: legs(),
          narration: "قيد ضمن معاملة فاشلة",
        });
        // خطوة لاحقة فشلت (مثلاً نقص مخزون أو تعارض concurrent)
        throw new Error("simulated failure after journal posting");
      })
    ).rejects.toThrow(/simulated failure/);

    // لا يبقى قيد يتيم ولا طرف يتيم.
    expect(txCalls()).toBe(1);
    expect(store.journals).toHaveLength(0);
    expect(store.legs).toHaveLength(0);
  });

  it("postBalancedJournal still opens exactly one transaction", async () => {
    const { db, store, txCalls } = makeDb([ACCOUNTS, BRANCH, []]);

    const res = await postBalancedJournal(db, {
      tenantId: TID,
      date: OPEN_DATE,
      legs: legs(),
      narration: "قيد مستقل",
    });

    expect(txCalls()).toBe(1);
    expect(res.count).toBe(2);
    expect(store.journals).toHaveLength(1);
    expect(store.legs).toHaveLength(2);
  });

  it("keeps the journal invisible until the outer transaction commits", async () => {
    const { db, store, txCalls } = makeDb([ACCOUNTS, BRANCH, []]);

    await db.transaction(async (tx: any) => {
      await postBalancedJournalInTx(tx, {
        tenantId: TID,
        date: OPEN_DATE,
        legs: legs(),
        narration: "قيد بانتظار الالتزام",
      });
      // داخل المعاملة: لم يُثبَّت شيء بعد.
      expect(store.journals).toHaveLength(0);
    });

    expect(txCalls()).toBe(1);
    expect(store.journals).toHaveLength(1);
    expect(store.legs).toHaveLength(2);
  });
});
