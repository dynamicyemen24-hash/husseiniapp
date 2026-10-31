/**
 * server/_core/observability.ts — Unified lightweight observability (no heavy deps).
 *
 * Design (SRE 2026, best practice for serverless):
 * - NO OpenTelemetry SDK: on Vercel the bundle stays lean. Instead we follow
 *   the W3C Trace Context *protocol* only:
 *   - honour an incoming `traceparent` header when present,
 *   - otherwise derive a deterministic 32-hex `traceId` from `x-request-id`
 *     (sha256(requestId)[0..32)). One request → one traceId, joined with the
 *     single x-request-id in every log line and Sentry tag.
 *   - echo `x-trace-id` on responses so external synthetics can correlate.
 * - Structured JSON logs go through the SINGLE `logger`/`redact()` entrypoint
 *   (never raw PII/secrets) with requestId+traceId+tenantId+route+durationMs.
 * - In-memory SLI store (ring buffers, capped) feeds GET /api/slo. Serverless
 *   instances each hold their own window — the endpoint reports its window
 *   (`sampleWindow`) honestly instead of pretending to be global.
 */

import { createHash } from "crypto";

// ─── SLO targets (single source of truth — mirrored in docs/SLO.md) ─────────

export const SLO_TARGETS = {
  /** Monthly availability on /api/health (200-rate). */
  availabilityPct: 99.9,
  /** p95 for read paths (tRPC queries + HTTP GET). */
  p95ReadMs: 800,
  /** p95 for financial writes (invoices, payments, vouchers, ledger…). */
  p95FinancialWriteMs: 2000,
  /** 5xx / total requests, 5-minute window. */
  errorPct: 1,
  /** Nightly encrypted backups that succeed. */
  backupSuccessPct: 99,
  /** Outbound webhook / notification deliveries that succeed. */
  webhookDeliveryPct: 99.5,
} as const;

export type RouteKind = "read" | "financial_write" | "write";

/** tRPC mutation paths that move money or post to the ledger. */
const FINANCIAL_WRITE_RE =
  /(invoice|payment|voucher|journal|ledger|transaction|billing|payroll|purchase|sale|pos|order|zatca|subscription|checkout|claim|fiscal|closing|balance|quotation)/i;

export function classifyTrpcRoute(path: string, type: string): RouteKind {
  if (type === "query") return "read";
  if (FINANCIAL_WRITE_RE.test(path ?? "")) return "financial_write";
  return "write";
}

export function classifyHttpRoute(method: string): RouteKind {
  return method === "GET" || method === "HEAD" || method === "OPTIONS"
    ? "read"
    : "write";
}

// ─── Trace propagation (W3C protocol, zero SDK) ─────────────────────────────

const TRACEPARENT_RE = /^[\da-f]{2}-([\da-f]{32})-([\da-f]{16})-[\da-f]{2}$/i;

export function parseTraceparent(
  header: unknown
): { traceId: string; spanId: string } | null {
  if (typeof header !== "string") return null;
  const m = header.trim().match(TRACEPARENT_RE);
  if (!m) return null;
  if (/^0{32}$/.test(m[1]) || /^0{16}$/.test(m[2])) return null;
  return { traceId: m[1].toLowerCase(), spanId: m[2].toLowerCase() };
}

/**
 * One request → one traceId. Honours W3C `traceparent` when the caller (or an
 * upstream proxy) sent one; otherwise derives a stable id from x-request-id so
 * logs, Sentry and synthetics always join on the same key.
 */
export function deriveTraceId(
  requestId: string,
  traceparent?: unknown
): string {
  const parsed = parseTraceparent(traceparent);
  if (parsed) return parsed.traceId;
  return createHash("sha256")
    .update(String(requestId ?? "unknown"))
    .digest("hex")
    .slice(0, 32);
}

// ─── In-memory SLI store ────────────────────────────────────────────────────

export interface LatencySample {
  durationMs: number;
  ok: boolean;
  ts: number;
  route: string;
  kind: RouteKind;
}

/** Cap per process so one hot lambda can't grow memory unbounded. */
const MAX_SAMPLES = 2000;

const samples: LatencySample[] = [];
let totalRequests = 0;
let errorRequests = 0; // 5xx / tRPC-error responses
let webhookAttempts = 0;
let webhookSucceeded = 0;

export function recordRequest(
  s: Omit<LatencySample, "ts"> & { ts?: number }
): void {
  totalRequests += 1;
  if (!s.ok) errorRequests += 1;
  samples.push({ ...s, ts: s.ts ?? Date.now() });
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

/** Back-compat aliases — HTTP middleware and tRPC middleware record here. */
export function recordHttpRequest(
  s: Omit<LatencySample, "ts"> & { ts?: number }
): void {
  recordRequest(s);
}

export function recordTrpcRequest(
  s: Omit<LatencySample, "ts"> & { ts?: number }
): void {
  recordRequest(s);
}

/** Outbound delivery SLI (order webhooks, subscription-code emails, …). */
export function recordWebhookDelivery(ok: boolean): void {
  webhookAttempts += 1;
  if (ok) webhookSucceeded += 1;
}

export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.min(Math.max(rank, 0), sortedAsc.length - 1)];
}

export interface LatencyStats {
  count: number;
  p50: number | null;
  p95: number | null;
  avgMs: number | null;
  maxMs: number | null;
  errorPct: number | null;
}

function statsFor(rows: LatencySample[]): LatencyStats {
  if (rows.length === 0) {
    return {
      count: 0,
      p50: null,
      p95: null,
      avgMs: null,
      maxMs: null,
      errorPct: null,
    };
  }
  const sorted = rows.map(r => r.durationMs).sort((a, b) => a - b);
  const errors = rows.filter(r => !r.ok).length;
  return {
    count: rows.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    avgMs:
      Math.round(
        (rows.reduce((a, r) => a + r.durationMs, 0) / rows.length) * 10
      ) / 10,
    maxMs: sorted[sorted.length - 1],
    errorPct:
      Math.round(((errors / rows.length) * 100 + Number.EPSILON) * 100) / 100,
  };
}

export interface SloSnapshot {
  targets: typeof SLO_TARGETS;
  observed: {
    read: LatencyStats;
    financialWrite: LatencyStats;
    all: LatencyStats;
    errorPctOverall: number | null;
    totalRequests: number;
    webhook: {
      attempts: number;
      succeeded: number;
      deliveryPct: number | null;
    };
  };
  /** Per-SLI verdict against the targets. `no_data` until the window fills. */
  verdict: {
    p95Read: "ok" | "breach" | "no_data";
    p95FinancialWrite: "ok" | "breach" | "no_data";
    errorRate: "ok" | "breach" | "no_data";
    webhookDelivery: "ok" | "breach" | "no_data";
  };
  sampleWindow: number;
  evaluatedAt: string;
}

export function getSloSnapshot(): SloSnapshot {
  const read = statsFor(samples.filter(s => s.kind === "read"));
  const financialWrite = statsFor(
    samples.filter(s => s.kind === "financial_write")
  );
  const all = statsFor(samples);
  const errorPctOverall =
    totalRequests > 0
      ? Math.round(
          ((errorRequests / totalRequests) * 100 + Number.EPSILON) * 100
        ) / 100
      : null;
  const deliveryPct =
    webhookAttempts > 0
      ? Math.round(
          ((webhookSucceeded / webhookAttempts) * 100 + Number.EPSILON) * 100
        ) / 100
      : null;

  const verdict: SloSnapshot["verdict"] = {
    p95Read:
      read.p95 == null
        ? "no_data"
        : read.p95 <= SLO_TARGETS.p95ReadMs
          ? "ok"
          : "breach",
    p95FinancialWrite:
      financialWrite.p95 == null
        ? "no_data"
        : financialWrite.p95 <= SLO_TARGETS.p95FinancialWriteMs
          ? "ok"
          : "breach",
    errorRate:
      errorPctOverall == null
        ? "no_data"
        : errorPctOverall < SLO_TARGETS.errorPct
          ? "ok"
          : "breach",
    webhookDelivery:
      deliveryPct == null
        ? "no_data"
        : deliveryPct >= SLO_TARGETS.webhookDeliveryPct
          ? "ok"
          : "breach",
  };

  return {
    targets: SLO_TARGETS,
    observed: {
      read,
      financialWrite,
      all,
      errorPctOverall,
      totalRequests,
      webhook: {
        attempts: webhookAttempts,
        succeeded: webhookSucceeded,
        deliveryPct,
      },
    },
    verdict,
    sampleWindow: samples.length,
    evaluatedAt: new Date().toISOString(),
  };
}

/** Test-only: clear the in-memory window between cases. */
export function resetObservability(): void {
  samples.length = 0;
  totalRequests = 0;
  errorRequests = 0;
  webhookAttempts = 0;
  webhookSucceeded = 0;
}
