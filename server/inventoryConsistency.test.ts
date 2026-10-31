/**
 * server/inventoryConsistency.test.ts — inventory consistency guardrails.
 *
 * Covers (without any live DB):
 *  1. Stock race: two concurrent orders on the LAST unit → exactly one wins,
 *     the loser fails with insufficient stock, balance never goes negative.
 *  2. Stress: 50 concurrent orders on 10 units → 10 win, stock ends at 0.
 *  3. Idempotency: resending the same key (sequential AND concurrent) creates
 *     NO second stock movement and decrements stock only once.
 *  4. Source linkage: recordStockMovement rejects orphan movements.
 *  5. Architecture pins: production paths really use the central guard
 *     (atomic conditional UPDATE + idempotent insert), not ad-hoc writes.
 *
 * How the fake stays honest: FakeDb executes every
 * `UPDATE … WHERE … RETURNING` as ONE synchronous compare-and-set — exactly
 * the atomicity Postgres gives a single statement — and it REFUSES `select()`,
 * so if the service ever regresses to read-modify-write this test explodes.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  addProductStock,
  deductProductStock,
  isUniqueViolationDatabaseError,
  recordStockMovement,
} from "./services/inventoryService";
import { inventoryMovements, products } from "../drizzle/schema";

// ---------------------------------------------------------------------------
// Minimal drizzle-chain fake (only the surface inventoryService uses).
// ---------------------------------------------------------------------------

type TableRef = unknown;

/** "+" (restock) vs "-" (deduct) inside the SET sql template. */
function findSetOperator(node: unknown): "+" | "-" | null {
  let found: "+" | "-" | null = null;
  const visit = (n: unknown): void => {
    if (found || n == null || typeof n !== "object") return;
    const anyN = n as Record<string, unknown>;
    const ctor = (n as { constructor?: { name?: string } }).constructor?.name;
    if (ctor === "StringChunk") {
      // drizzle StringChunk stores value as string[].
      const raw = anyN.value as unknown;
      const text = Array.isArray(raw) ? raw.join("") : String(raw ?? "");
      if (text.includes("+")) found = "+";
      else if (text.includes("-")) found = "-";
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (Array.isArray(anyN.queryChunks)) {
      (anyN.queryChunks as unknown[]).forEach(visit);
      return;
    }
    if (ctor === "Object") {
      Object.values(n).forEach(visit);
    }
  };
  visit(node);
  return found;
}

function pairsFromSql(node: unknown): Array<{ col: string; val: unknown }> {
  const out: Array<{ col: string; val: unknown }> = [];
  let lastCol: string | null = null;
  const visit = (n: unknown): void => {
    if (typeof n === "number") {
      if (lastCol) out.push({ col: lastCol, val: n });
      lastCol = null;
      return;
    }
    if (n == null || typeof n !== "object") return;
    const anyN = n as Record<string, unknown>;
    if (typeof anyN.name === "string" && anyN.table) {
      lastCol = anyN.name;
      return;
    }
    const ctor = (n as { constructor?: { name?: string } }).constructor?.name;
    if (ctor === "Param") {
      if (lastCol) out.push({ col: lastCol, val: anyN.value });
      lastCol = null;
      return;
    }
    if (ctor === "StringChunk" || ctor === "Name") return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (Array.isArray(anyN.queryChunks)) {
      (anyN.queryChunks as unknown[]).forEach(visit);
      return;
    }
    if (ctor === "Object") {
      Object.values(n).forEach(visit);
    }
  };
  visit(node);
  return out;
}

class Once<T> {
  private done = false;
  private result: T | undefined;
  constructor(private readonly fn: () => T) {}
  run(): T {
    if (!this.done) {
      this.done = true;
      this.result = this.fn();
    }
    return this.result as T;
  }
}

export interface MovementRow {
  id: number;
  tenantId: number;
  productId: number;
  type: string;
  quantity: number;
  referenceId: number | null;
  referenceType: string | null;
}

/** In-memory store with single-statement atomicity for stock UPDATEs. */
export class FakeDb {
  readonly stock = new Map<number, number>();
  readonly movements: MovementRow[] = [];
  private movementSeq = 1;

  constructor(initialStock: Record<number, number> = {}) {
    for (const [k, v] of Object.entries(initialStock))
      this.stock.set(Number(k), v);
  }

  select(): never {
    throw new Error(
      "FakeDb: SELECT is not supported — stock paths must use a single conditional UPDATE (no read-modify-write)"
    );
  }

  update(table: TableRef) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const db = this;
    return {
      set(patch: unknown) {
        return {
          where(cond: unknown) {
            const exec = () => db.execUpdate(table, patch, cond);
            const once = new Once(exec);
            return {
              returning: () => Promise.resolve(once.run()),
              then: (
                res?: (v: unknown) => unknown,
                rej?: (e: unknown) => unknown
              ) => {
                try {
                  return Promise.resolve(once.run()).then(res, rej);
                } catch (e) {
                  return Promise.reject(e).catch(rej as never);
                }
              },
            };
          },
        };
      },
    };
  }

  insert(table: TableRef) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const db = this;
    return {
      values(rows: unknown) {
        const exec = () => db.execInsert(table, rows);
        const once = new Once(exec);
        return {
          returning: () => Promise.resolve(once.run()),
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve(once.run()),
          }),
          onConflictDoUpdate: () => ({
            returning: () => Promise.resolve(once.run()),
          }),
          then: (
            res?: (v: unknown) => unknown,
            rej?: (e: unknown) => unknown
          ) => {
            try {
              return Promise.resolve(once.run()).then(res, rej);
            } catch (e) {
              return Promise.reject(e).catch(rej as never);
            }
          },
        };
      },
    };
  }

  private execUpdate(
    table: TableRef,
    patch: unknown,
    cond: unknown
  ): Array<{ id: number }> {
    if (table !== products)
      throw new Error("FakeDb: UPDATE on unexpected table in this test");
    const setPairs = pairsFromSql(patch);
    const wherePairs = pairsFromSql(cond);
    const qty = setPairs.map(p => p.val).find(v => typeof v === "number") as
      | number
      | undefined;
    const pid = wherePairs.find(p => p.col === "id")?.val as number | undefined;
    if (typeof pid !== "number" || typeof qty !== "number" || qty < 1)
      throw new Error(
        "FakeDb: could not parse conditional UPDATE shape (id + qty required)"
      );
    const op = findSetOperator(patch);
    if (op === "+") {
      // Restock leg (returns / void / adjustment-in): unconditional add.
      const current = this.stock.get(pid) ?? 0;
      this.stock.set(pid, current + qty);
      return [{ id: pid }];
    }
    // ATOMIC compare-and-set — mirrors `UPDATE … WHERE stock >= qty`.
    const current = this.stock.get(pid) ?? 0;
    if (current >= qty) {
      this.stock.set(pid, current - qty);
      return [{ id: pid }];
    }
    return [];
  }

  private execInsert(table: TableRef, rows: unknown): unknown[] {
    if (table !== inventoryMovements)
      throw new Error("FakeDb: INSERT on unexpected table in this test");
    const list = (Array.isArray(rows) ? rows : [rows]) as Array<
      Record<string, unknown>
    >;
    for (const row of list) {
      if (row.referenceId == null || !row.referenceType)
        throw new Error(
          "FakeDb: orphan movement rejected — referenceId + referenceType required"
        );
      this.movements.push({
        id: this.movementSeq++,
        tenantId: row.tenantId as number,
        productId: row.productId as number,
        type: row.type as string,
        quantity: row.quantity as number,
        referenceId: row.referenceId as number,
        referenceType: row.referenceType as string,
      });
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Order flow under test — mirrors server/webStore.ts placePublicOrder steps:
// idempotent claim (unique index) → atomic guarded decrement → linked movement.
// ---------------------------------------------------------------------------

type FlowResult =
  | { status: "ok"; orderId: number }
  | { status: "idempotent"; orderId: number };

class OrderStore {
  private nextOrderId = 1;
  /** key → gate resolving to the first attempt's outcome (models PG blocking). */
  private gates = new Map<string, Promise<"ok" | "failed">>();

  async place(
    db: FakeDb,
    args: { productId: number; qty: number; key?: string }
  ): Promise<FlowResult> {
    const { productId, qty, key } = args;
    if (key === undefined) {
      const deducted = await deductProductStock(db as never, {
        productId,
        quantity: qty,
      });
      if (!deducted.success) throw new Error("insufficient_stock");
      const orderId = this.nextOrderId++;
      await recordStockMovement(db as never, {
        tenantId: 1,
        productId,
        type: "out",
        quantity: qty,
        referenceId: orderId,
        referenceType: "order",
        notes: "test order",
      });
      return { status: "ok", orderId };
    }
    for (;;) {
      const existing = this.gates.get(key);
      if (existing) {
        // A retry waits for the in-flight winner like PG's unique-index wait.
        const outcome = await existing;
        if (outcome === "ok") {
          return { status: "idempotent", orderId: this.lastWinner.get(key)! };
        }
        continue; // winner rolled back → retry as a fresh claim
      }
      let resolve!: (v: "ok" | "failed") => void;
      const gate = new Promise<"ok" | "failed">(r => {
        resolve = r;
      });
      this.gates.set(key, gate);
      const orderId = this.nextOrderId++;
      this.lastWinner.set(key, orderId);
      try {
        const deducted = await deductProductStock(db as never, {
          productId,
          quantity: qty,
        });
        if (!deducted.success) {
          this.gates.delete(key);
          resolve("failed");
          throw new Error("insufficient_stock");
        }
        await recordStockMovement(db as never, {
          tenantId: 1,
          productId,
          type: "out",
          quantity: qty,
          referenceId: orderId,
          referenceType: "order",
          notes: "test order",
        });
        resolve("ok");
        return { status: "ok", orderId };
      } catch (e) {
        if (this.gates.get(key) === gate) {
          this.gates.delete(key);
          resolve("failed");
        }
        throw e;
      }
    }
  }

  private lastWinner = new Map<string, number>();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("inventory consistency: last-unit race", () => {
  it("two concurrent orders on the last unit → one wins, one fails, no negative stock", async () => {
    const db = new FakeDb({ 7: 1 });
    const store = new OrderStore();

    const results = await Promise.allSettled([
      store.place(db, { productId: 7, qty: 1 }),
      store.place(db, { productId: 7, qty: 1 }),
    ]);

    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(
      /insufficient_stock/
    );
    expect(db.stock.get(7)).toBe(0);
    expect(db.movements).toHaveLength(1);
    expect(db.movements[0]).toMatchObject({
      productId: 7,
      quantity: 1,
      referenceType: "order",
    });
    expect(db.movements[0]?.referenceId).toBeGreaterThan(0);
  });

  it("50 concurrent orders on 10 units → exactly 10 win, stock ends at 0", async () => {
    const db = new FakeDb({ 9: 10 });
    const store = new OrderStore();

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) =>
        store.place(db, { productId: 9, qty: 1, key: `stress-${i}` })
      )
    );
    const ok = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    expect(ok).toBe(10);
    expect(failed).toBe(40);
    expect(db.stock.get(9)).toBe(0);
    expect(db.movements).toHaveLength(10);
    for (const s of db.stock.values()) expect(s).toBeGreaterThanOrEqual(0);
  });
});

describe("inventory consistency: idempotency", () => {
  it("resending the same key creates no second movement and decrements once", async () => {
    const db = new FakeDb({ 7: 5 });
    const store = new OrderStore();

    const first = await store.place(db, {
      productId: 7,
      qty: 2,
      key: "order-key-1",
    });
    expect(first.status).toBe("ok");
    const retry = await store.place(db, {
      productId: 7,
      qty: 2,
      key: "order-key-1",
    });
    expect(retry.status).toBe("idempotent");
    expect(retry.orderId).toBe(first.orderId);

    expect(db.stock.get(7)).toBe(3);
    expect(db.movements).toHaveLength(1);
  });

  it("two concurrent sends with the same key → single movement, single decrement", async () => {
    const db = new FakeDb({ 7: 5 });
    const store = new OrderStore();

    const [a, b] = await Promise.all([
      store.place(db, { productId: 7, qty: 1, key: "order-key-race" }),
      store.place(db, { productId: 7, qty: 1, key: "order-key-race" }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual(["idempotent", "ok"]);
    expect(a.orderId).toBe(b.orderId);
    expect(db.stock.get(7)).toBe(4);
    expect(db.movements).toHaveLength(1);
  });
});

describe("inventory consistency: source linkage + helpers", () => {
  it("recordStockMovement rejects orphan movements without a source document", async () => {
    const db = new FakeDb({ 7: 5 });
    await expect(
      recordStockMovement(db as never, {
        tenantId: 1,
        productId: 7,
        type: "out",
        quantity: 1,
        referenceId: null,
        referenceType: null,
      })
    ).rejects.toThrow(/movement_requires_source_document/);
    expect(db.movements).toHaveLength(0);
  });

  it("addProductStock restores quantity (return/void path)", async () => {
    const db = new FakeDb({ 7: 0 });
    await addProductStock(db as never, { productId: 7, quantity: 3 });
    expect(db.stock.get(7)).toBe(3);
  });

  it("isUniqueViolationDatabaseError detects 23505 across driver shapes", () => {
    expect(isUniqueViolationDatabaseError({ code: "23505" })).toBe(true);
    expect(isUniqueViolationDatabaseError({ cause: { code: "23505" } })).toBe(
      true
    );
    expect(
      isUniqueViolationDatabaseError(
        new Error(
          'duplicate key value violates unique constraint "orders_idempotency_key_unique"'
        )
      )
    ).toBe(true);
    expect(isUniqueViolationDatabaseError(new Error("connection reset"))).toBe(
      false
    );
    expect(isUniqueViolationDatabaseError(null)).toBe(false);
  });
});

describe("inventory consistency: production paths use the central guard", () => {
  const read = (rel: string) =>
    readFileSync(new URL(rel, import.meta.url), "utf8");

  it("webStore: atomic decrement + idempotent insert + linked movement", () => {
    const src = read("./webStore.ts");
    expect(src).toContain("deductProductStock");
    expect(src).toContain("recordStockMovement");
    expect(src).toContain("onConflictDoNothing");
    expect(src).toContain("isUniqueViolationDatabaseError");
    // No raw balance UPDATE outside the service:
    expect(src).not.toMatch(/\.update\(products\)/);
    expect(src).not.toMatch(/\.insert\(inventoryMovements\)/);
  });

  it("posRouter: POS sale deducts atomically and links the invoice", () => {
    const src = read("./posRouter.ts");
    expect(src).toContain("deductProductStock");
    expect(src).toContain("recordStockMovement");
    expect(src).toContain("pos_invoice");
    expect(src).toContain("onConflictDoNothing");
    expect(src).not.toMatch(/currentStock: sql`/);
  });

  it("inventoryRouter: no direct balance edits; adjustments go through the service", () => {
    const src = read("./inventoryRouter.ts");
    expect(src).toContain("deductWarehouseStock");
    expect(src).toContain("recordStockMovement");
    expect(src).toContain("stock_adjustment");
    expect(src).toContain("تعديل الرصيد المباشر ممنوع");
  });
});
