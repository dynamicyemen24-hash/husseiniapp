/**
 * server/_core/resilience.ts — failure-isolation primitives.
 *
 * Goal: external or transient failures must degrade gracefully instead of
 * crashing request handlers or the cron tick ("no-failure" policy):
 *  - withRetry: exponential backoff + full jitter for transient errors,
 *    with optional shouldRetry predicate, maxElapsedMs deadline and
 *    AbortSignal cancellation.
 *  - withTimeout: hard deadline so a hung dependency can't hang a handler.
 *  - CircuitBreaker: stops hammering a failing dependency and lets it heal;
 *    serves the registered fallback while OPEN instead of throwing.
 *  - Bulkhead: concurrency limiter to prevent resource exhaustion.
 *  - HealthMonitor: periodic health checks with degradation detection.
 *  - GracefulDegradation: fallback strategies for degraded mode.
 */

// ─── Circuit Breaker ──────────────────────────────────────────────
type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  monitorIntervalMs: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeoutMs: config.timeoutMs ?? 30_000,
      monitorIntervalMs: config.monitorIntervalMs ?? 60_000,
    };

    this.state = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
  }

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state.state === "open") {
      if (Date.now() < this.state.nextAttemptTime) {
        // Degrade gracefully when a fallback is registered instead of
        // throwing — callers like the DB health probe depend on this.
        if (fallback) return fallback();
        throw new Error("Circuit breaker is OPEN");
      }
      this.state.state = "half-open";
      this.state.successCount = 0;
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Operation timed out")),
            this.config.timeoutMs
          )
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback) {
        return fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failureCount = 0;
    this.state.lastFailureTime = 0;

    if (this.state.state === "half-open") {
      this.state.successCount++;
      if (this.state.successCount >= this.config.successThreshold) {
        this.state.state = "closed";
        this.state.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === "half-open") {
      this.state.state = "open";
      this.state.nextAttemptTime = Date.now() + this.config.timeoutMs;
    } else if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = "open";
      this.state.nextAttemptTime = Date.now() + this.config.timeoutMs;
    }
  }

  getState(): CircuitState {
    return this.state.state;
  }

  getStats(): CircuitBreakerState & { config: CircuitBreakerConfig } {
    return { ...this.state, config: this.config };
  }

  reset(): void {
    this.state = {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
  }
}

// ─── Retry with Exponential Backoff ───────────────────────────────
export interface RetryOptions {
  /** Total attempts including the first one (default: 3). */
  retries?: number;
  /** Base delay in ms before the first retry (default: 300). */
  baseDelayMs?: number;
  /** Upper bound for a single backoff delay (default: 5_000). */
  maxDelayMs?: number;
  /** Optional label used in logs. */
  label?: string;
  /** Called before each retry attempt. */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  /**
   * Custom retry predicate. Receives the error and the 1-based attempt that
   * just failed; return false to fail fast without further retries.
   * Combined (AND) with the built-in transient-error detection.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /**
   * Hard deadline for the whole retry loop in ms (delays included).
   * When the next backoff would exceed the budget, the last error is
   * thrown immediately instead of sleeping past the deadline.
   */
  maxElapsedMs?: number;
  /** AbortSignal to cancel the retry loop (throws AbortError). */
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error("Retry loop aborted");
      err.name = "AbortError";
      reject(err);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const err = new Error("Retry loop aborted");
      err.name = "AbortError";
      reject(err);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message || "";
    return (
      error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /timeout|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|socket|5\d\d/i.test(
        msg
      )
    );
  }
  return false;
}

/** Retry an async operation with exponential backoff + full jitter. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 3);
  const baseDelayMs = Math.max(1, options.baseDelayMs ?? 300);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 5_000);
  const maxElapsedMs =
    options.maxElapsedMs !== undefined
      ? Math.max(0, options.maxElapsedMs)
      : undefined;
  const startedAt = Date.now();

  const retryAllowed = (error: unknown, attempt: number): boolean => {
    if (!isRetryable(error)) return false;
    if (options.shouldRetry && !options.shouldRetry(error, attempt))
      return false;
    return true;
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    if (options.signal?.aborted) {
      const err = new Error("Retry loop aborted");
      err.name = "AbortError";
      throw err;
    }
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt > retries || !retryAllowed(error, attempt)) throw error;
      const jittered =
        baseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random());
      const delayMs = Math.min(maxDelayMs, Math.round(jittered));
      if (
        maxElapsedMs !== undefined &&
        Date.now() - startedAt + delayMs > maxElapsedMs
      ) {
        throw error;
      }
      options.onRetry?.(error, attempt, delayMs);
      if (options.label) {
        console.warn(
          `[resilience] retry #${attempt}/${retries} for ${options.label} in ${delayMs}ms:`,
          error instanceof Error ? error.message : error
        );
      }
      await sleep(delayMs, options.signal);
    }
  }
  throw lastError;
}

/** Reject if the promise does not settle within `ms` milliseconds. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ─── Bulkhead Pattern ─────────────────────────────────────────────
export class Bulkhead {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(
    private maxConcurrent: number,
    private maxQueue: number = 100
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueue) {
        throw new Error("Bulkhead queue full");
      }

      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getStats(): { running: number; queued: number } {
    return {
      running: this.running,
      queued: this.queue.length,
    };
  }
}

// ─── Graceful Degradation ─────────────────────────────────────────
export class GracefulDegradation {
  private degraded = false;
  private reasons: string[] = [];
  private fallbackHandlers = new Map<string, () => Promise<any>>();

  setDegraded(reason: string): void {
    this.degraded = true;
    this.reasons.push(reason);
  }

  clearDegraded(reason: string): void {
    this.reasons = this.reasons.filter(r => r !== reason);
    if (this.reasons.length === 0) {
      this.degraded = false;
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  getReasons(): string[] {
    return [...this.reasons];
  }

  registerFallback(feature: string, handler: () => Promise<any>): void {
    this.fallbackHandlers.set(feature, handler);
  }

  async executeWithFallback<T>(
    feature: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (this.degraded) {
      const fallback = this.fallbackHandlers.get(feature);
      if (fallback) {
        return fallback();
      }
    }

    return fn();
  }
}

// ─── Health Monitor ───────────────────────────────────────────────
interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  lastCheck: number;
  healthy: boolean;
  consecutiveFailures: number;
}

export class HealthMonitor {
  private checks = new Map<string, HealthCheck>();
  private interval: NodeJS.Timeout | null = null;

  register(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, {
      name,
      check,
      lastCheck: 0,
      healthy: true,
      consecutiveFailures: 0,
    });
  }

  async check(name: string): Promise<boolean> {
    const healthCheck = this.checks.get(name);
    if (!healthCheck) return false;

    try {
      const healthy = await healthCheck.check();
      healthCheck.healthy = healthy;
      healthCheck.consecutiveFailures = healthy
        ? 0
        : healthCheck.consecutiveFailures + 1;
      healthCheck.lastCheck = Date.now();
      return healthy;
    } catch {
      healthCheck.healthy = false;
      healthCheck.consecutiveFailures++;
      healthCheck.lastCheck = Date.now();
      return false;
    }
  }

  async checkAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name] of this.checks) {
      results[name] = await this.check(name);
    }

    return results;
  }

  start(intervalMs: number = 30_000): void {
    this.stop();
    this.interval = setInterval(() => {
      void this.checkAll();
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getHealth(): Record<string, HealthCheck> {
    const result: Record<string, HealthCheck> = {};
    for (const [name, check] of this.checks) {
      result[name] = { ...check };
    }
    return result;
  }

  isHealthy(): boolean {
    for (const check of this.checks.values()) {
      if (!check.healthy && check.consecutiveFailures >= 3) {
        return false;
      }
    }
    return true;
  }
}

// ─── Pre-configured Circuit Breakers ──────────────────────────────
export const databaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 2,
  timeoutMs: 10_000,
});

export const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 30_000,
});

// ─── Pre-configured Bulkheads ─────────────────────────────────────
export const databaseBulkhead = new Bulkhead(10, 50);
export const apiBulkhead = new Bulkhead(20, 100);

// ─── Pre-configured Health Monitor ────────────────────────────────
export const healthMonitor = new HealthMonitor();
