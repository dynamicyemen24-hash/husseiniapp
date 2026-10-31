import { describe, expect, it, vi } from "vitest";
import { Bulkhead, CircuitBreaker, withRetry, withTimeout } from "./resilience";

const transient = () => {
  const err = new Error("fetch failed");
  return err;
};

describe("CircuitBreaker — fallback while OPEN", () => {
  it("serves the fallback while OPEN instead of throwing", async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      timeoutMs: 60_000,
    });
    await expect(
      breaker.execute(async () => {
        throw transient();
      })
    ).rejects.toThrow("fetch failed");
    expect(breaker.getState()).toBe("open");

    const fallback = vi.fn(async () => "degraded-ok");
    await expect(
      breaker.execute(async () => "should-not-run", fallback)
    ).resolves.toBe("degraded-ok");
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("still throws while OPEN when no fallback is registered", async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      timeoutMs: 60_000,
    });
    await expect(
      breaker.execute(async () => {
        throw transient();
      })
    ).rejects.toThrow("fetch failed");
    await expect(breaker.execute(async () => "x")).rejects.toThrow(
      "Circuit breaker is OPEN"
    );
  });

  it("half-open recovery closes the circuit after enough successes", async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      timeoutMs: 10,
    });
    await expect(
      breaker.execute(async () => {
        throw transient();
      })
    ).rejects.toThrow();
    expect(breaker.getState()).toBe("open");
    await new Promise(r => setTimeout(r, 25));
    await expect(breaker.execute(async () => "a")).resolves.toBe("a");
    expect(breaker.getState()).toBe("half-open");
    await expect(breaker.execute(async () => "b")).resolves.toBe("b");
    expect(breaker.getState()).toBe("closed");
  });

  it("reset() restores a closed circuit", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    await expect(
      breaker.execute(async () => {
        throw transient();
      })
    ).rejects.toThrow();
    expect(breaker.getState()).toBe("open");
    breaker.reset();
    expect(breaker.getState()).toBe("closed");
    await expect(breaker.execute(async () => "ok")).resolves.toBe("ok");
  });
});

describe("withRetry — policies", () => {
  it("retries transient failures and returns the eventual success", async () => {
    let calls = 0;
    const seenAttempts: number[] = [];
    const result = await withRetry(
      async attempt => {
        calls++;
        seenAttempts.push(attempt);
        if (calls < 3) throw transient();
        return "recovered";
      },
      { retries: 3, baseDelayMs: 1, maxDelayMs: 2 }
    );
    expect(result).toBe("recovered");
    expect(calls).toBe(3);
    expect(seenAttempts).toEqual([1, 2, 3]);
  });

  it("fails fast on non-retryable errors without extra attempts", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("VALIDATION_FAILED: bad input");
        },
        { retries: 5, baseDelayMs: 1, maxDelayMs: 2 }
      )
    ).rejects.toThrow("VALIDATION_FAILED");
    expect(calls).toBe(1);
  });

  it("shouldRetry=false stops after the first attempt", async () => {
    let calls = 0;
    const onRetry = vi.fn();
    await expect(
      withRetry(
        async () => {
          calls++;
          throw transient();
        },
        {
          retries: 5,
          baseDelayMs: 1,
          maxDelayMs: 2,
          shouldRetry: () => false,
          onRetry,
        }
      )
    ).rejects.toThrow("fetch failed");
    expect(calls).toBe(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("maxElapsedMs budget fails without sleeping past the deadline", async () => {
    let calls = 0;
    const t0 = Date.now();
    await expect(
      withRetry(
        async () => {
          calls++;
          throw transient();
        },
        {
          retries: 10,
          baseDelayMs: 5_000,
          maxDelayMs: 10_000,
          maxElapsedMs: 50,
        }
      )
    ).rejects.toThrow("fetch failed");
    expect(calls).toBe(1);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it("aborted signal throws AbortError without calling fn", async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn(async () => "never");
    await expect(
      withRetry(fn, { retries: 3, signal: controller.signal })
    ).rejects.toThrowError(expect.objectContaining({ name: "AbortError" }));
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls onRetry with attempt and delay", async () => {
    const seen: Array<[unknown, number, number]> = [];
    let calls = 0;
    await withRetry(
      async () => {
        calls++;
        if (calls === 1) throw transient();
        return "ok";
      },
      {
        retries: 2,
        baseDelayMs: 1,
        maxDelayMs: 2,
        onRetry: (e, attempt, delayMs) => seen.push([e, attempt, delayMs]),
      }
    );
    expect(seen).toHaveLength(1);
    expect(seen[0][1]).toBe(1);
    expect(seen[0][2]).toBeGreaterThanOrEqual(0);
  });
});

describe("withTimeout", () => {
  it("rejects with TimeoutError when the operation hangs", async () => {
    await expect(
      withTimeout(new Promise(() => {}), 20, "hang-probe")
    ).rejects.toThrowError(expect.objectContaining({ name: "TimeoutError" }));
  });

  it("passes through fast results untouched", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });
});

describe("Bulkhead", () => {
  it("rejects when the queue is full", async () => {
    const bulkhead = new Bulkhead(1, 1);
    const gate = new Promise<void>(() => {});
    const first = bulkhead.execute(() => gate);
    const second = bulkhead.execute(() => gate);
    await expect(bulkhead.execute(() => gate)).rejects.toThrow(
      "Bulkhead queue full"
    );
    expect(bulkhead.getStats()).toEqual({ running: 1, queued: 1 });
    void first;
    void second;
  });
});
