/**
 * server/_core/observability.test.ts — monitoring-only guards (no real data).
 * - traceId derivation: stable from x-request-id, honours W3C traceparent.
 * - route classification: queries→read, money/ledger mutations→financial_write.
 * - SLI store: p50/p95 windows, verdicts (ok/breach/no_data), webhook SLI.
 * - GET /api/slo: aggregate-only snapshot + backup status + db latency.
 * - Backup paging: Sentry captureMessage fires on the 2nd consecutive failure.
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import type { AddressInfo } from "net";
import type { Express } from "express";
import {
  SLO_TARGETS,
  classifyTrpcRoute,
  deriveTraceId,
  getSloSnapshot,
  parseTraceparent,
  percentile,
  recordTrpcRequest,
  recordWebhookDelivery,
  resetObservability,
} from "./observability";
import { ENV } from "./env";
import {
  getBackupHealth,
  recordBackupFailure,
  recordBackupSuccess,
} from "./backup";
import { createApp } from "./app";

// NOTE: @sentry/node ships a frozen ESM namespace — vi.spyOn() on it throws
// "Cannot redefine property". Mock the module instead (implementation logic
// is still fully asserted via return values + health file).
vi.mock("@sentry/node", async importOriginal => {
  const mod = await importOriginal<typeof import("@sentry/node")>();
  return { ...mod, captureMessage: vi.fn(() => "evt-test") };
});

beforeEach(() => {
  resetObservability();
});

describe("trace propagation (light OTel, no SDK)", () => {
  it("derives a stable 32-hex traceId from x-request-id", () => {
    const a = deriveTraceId("req-123");
    const b = deriveTraceId("req-123");
    expect(a).toBe(b);
    expect(a).toMatch(/^[\da-f]{32}$/);
    expect(deriveTraceId("req-456")).not.toBe(a);
  });

  it("honours an incoming W3C traceparent", () => {
    const tp = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    expect(parseTraceparent(tp)).toEqual({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
    });
    expect(deriveTraceId("anything", tp)).toBe(
      "4bf92f3577b34da6a3ce929d0e0e4736"
    );
  });

  it("rejects malformed traceparents (falls back to derived id)", () => {
    expect(parseTraceparent("bogus")).toBeNull();
    expect(
      parseTraceparent(
        "00-00000000000000000000000000000000-00f067aa0ba902b7-01"
      )
    ).toBeNull();
    const fallback = deriveTraceId("req-1", "bogus");
    expect(fallback).toMatch(/^[\da-f]{32}$/);
  });
});

describe("route classification + SLI store", () => {
  it("classifies queries as read and money mutations as financial_write", () => {
    expect(classifyTrpcRoute("auth.me", "query")).toBe("read");
    expect(classifyTrpcRoute("salesInvoices.create", "mutation")).toBe(
      "financial_write"
    );
    expect(classifyTrpcRoute("vouchers.reverse", "mutation")).toBe(
      "financial_write"
    );
    expect(classifyTrpcRoute("billing.checkout", "mutation")).toBe(
      "financial_write"
    );
    expect(classifyTrpcRoute("auth.updateProfile", "mutation")).toBe("write");
  });

  it("computes p50/p95 over the window and judges verdicts", () => {
    expect(getSloSnapshot().verdict.p95Read).toBe("no_data");
    for (let i = 1; i <= 100; i++) {
      recordTrpcRequest({ route: "r", kind: "read", durationMs: i, ok: true });
    }
    const snap = getSloSnapshot();
    expect(snap.observed.read.count).toBe(100);
    expect(snap.observed.read.p50).toBe(50);
    expect(snap.observed.read.p95).toBe(95);
    expect(snap.verdict.p95Read).toBe("ok");
    expect(snap.targets.p95ReadMs).toBe(SLO_TARGETS.p95ReadMs);
  });

  it("flags a p95 breach on financial writes and tracks error%", () => {
    for (let i = 0; i < 20; i++) {
      recordTrpcRequest({
        route: "salesInvoices.create",
        kind: "financial_write",
        durationMs: 5000,
        ok: i < 19,
      });
    }
    const snap = getSloSnapshot();
    expect(snap.observed.financialWrite.p95).toBe(5000);
    expect(snap.verdict.p95FinancialWrite).toBe("breach");
    expect(snap.observed.errorPctOverall).toBe(5);
    expect(snap.verdict.errorRate).toBe("breach");
  });

  it("tracks the webhook delivery SLI", () => {
    expect(getSloSnapshot().verdict.webhookDelivery).toBe("no_data");
    recordWebhookDelivery(true);
    recordWebhookDelivery(true);
    recordWebhookDelivery(false);
    const snap = getSloSnapshot();
    expect(snap.observed.webhook.attempts).toBe(3);
    expect(snap.observed.webhook.deliveryPct).toBeCloseTo(66.67, 1);
    expect(snap.verdict.webhookDelivery).toBe("breach");
  });

  it("percentile() handles edge cases", () => {
    expect(percentile([], 95)).toBeNull();
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
  });
});

describe("backup paging (Sentry on 2nd consecutive failure)", () => {
  const origDir = ENV.backupDir;
  let tmp = "";

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "obsslo-test-"));
    ENV.backupDir = tmp;
    vi.clearAllMocks();
  });

  afterAll(async () => {
    ENV.backupDir = origDir;
    vi.restoreAllMocks();
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  });

  it("captures a Sentry error on the 2nd failure and resets on success", async () => {
    const SentryMock = await import("@sentry/node");
    const spy = vi.mocked(SentryMock.captureMessage);
    spy.mockClear();
    spy.mockReturnValue("evt-test");
    const h1 = await recordBackupFailure(new Error("obs probe 1"));
    expect(h1.consecutiveFailures).toBe(1);
    expect(h1.needsAlert).toBe(false);
    expect(spy).not.toHaveBeenCalled();

    const h2 = await recordBackupFailure(new Error("obs probe 2"));
    expect(h2.consecutiveFailures).toBe(2);
    expect(h2.needsAlert).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("backup failures x2");

    const read = await getBackupHealth();
    expect(read.needsAlert).toBe(true);

    const ok = await recordBackupSuccess();
    expect(ok.needsAlert).toBe(false);
  });
});

describe("GET /api/slo (light ops dashboard)", () => {
  let app: Express;
  let server: ReturnType<Express["listen"]>;
  let base = "";

  beforeEach(async () => {
    resetObservability();
    app = createApp();
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    resetObservability();
  });

  it("returns aggregates + backup + db latency with correlation headers", async () => {
    recordTrpcRequest({
      route: "probe",
      kind: "read",
      durationMs: 10,
      ok: true,
    });
    const res = await fetch(`${base}/api/slo`, {
      headers: { "x-request-id": "slo-test-1" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("slo-test-1");
    expect(res.headers.get("x-trace-id")).toMatch(/^[\da-f]{32}$/);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const body = (await res.json()) as Record<string, any>;
    expect(body.ok).toBe(true);
    expect(body.requestId).toBe("slo-test-1");
    expect(body.traceId).toMatch(/^[\da-f]{32}$/);
    expect(typeof body.db.available).toBe("boolean");
    expect(typeof body.db.latencyMs).toBe("number");
    expect(typeof body.backup.consecutiveFailures).toBe("number");
    expect(typeof body.backup.needsAlert).toBe("boolean");
    expect(body.targets.p95ReadMs).toBe(800);
    expect(body.targets.p95FinancialWriteMs).toBe(2000);
    expect(body.targets.availabilityPct).toBe(99.9);
    expect(body.targets.errorPct).toBe(1);
    expect(body.targets.backupSuccessPct).toBe(99);
    expect(body.targets.webhookDeliveryPct).toBe(99.5);
    expect(body.latency.read.count).toBeGreaterThanOrEqual(1);
    expect(typeof body.latency.read.p50).toBe("number");
    expect(["ok", "breach", "no_data"]).toContain(body.verdict.p95Read);
    // No PII/secrets leak in an unauthenticated aggregate endpoint.
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/password|BEGIN PRIVATE|DATABASE_URL/i);
  }, 30000);
});
