/**
 * server/sre-continuity.test.ts — SRE continuity guards (no real data sent).
 * - redact(): single PII/secret entrypoint hides password/token/health keys.
 * - resolveBackupSecret(): fail-closed in production without a key.
 * - backup failure counter: alert fires on ≥2 consecutive failures.
 * - HTTP: /api/live + /api/health shape + unified x-request-id echo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import type { AddressInfo } from "net";
import type { Express } from "express";
import { redact } from "./_core/logger";
import { ENV } from "./_core/env";
import {
  resolveBackupSecret,
  recordBackupSuccess,
  recordBackupFailure,
  getBackupHealth,
} from "./_core/backup";
import { createApp } from "./_core/app";

describe("redact (single entrypoint)", () => {
  it("masks secrets, tokens, emails, phones and health/PII keys", () => {
    const out = redact({
      username: "ahmed",
      password: "hunter2-secret",
      token: "abc123",
      DATABASE_URL: "postgresql://u:p@host/db",
      BACKUP_ENCRYPTION_KEY: "k".repeat(32),
      email: "user@example.com",
      phone: "+967771234567",
      health: { diagnosis: "diabetes" },
      التشخيص: "سكري",
      note: "contact user@example.com or Bearer abcdefghijklmnop",
      nested: { authorization: "Bearer xyz", ok: true },
      amounts: { total: 1500, latencyMs: 42 },
    }) as Record<string, unknown>;

    expect(out.password).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect(out.DATABASE_URL).toBe("[REDACTED]");
    expect(out.BACKUP_ENCRYPTION_KEY).toBe("[REDACTED]");
    expect(out.email).toBe("[REDACTED]");
    expect(out.phone).toBe("[REDACTED]");
    expect(out.health).toBe("[REDACTED]");
    expect(out.التشخيص).toBe("[REDACTED]");
    expect(out.nested).toEqual({ authorization: "[REDACTED]", ok: true });
    // Free-text values are masked, safe values pass through.
    expect(out.note as string).toContain("***@***");
    expect(out.note as string).toContain("Bearer [REDACTED]");
    expect(out.amounts).toEqual({ total: 1500, latencyMs: 42 });
    expect(out.username).toBe("ahmed");
  });
});

describe("backup fail-closed + 2-failure alert", () => {
  const origKey = ENV.backupEncryptionKey;
  const origProd = ENV.isProduction;
  const origDir = ENV.backupDir;
  let tmp = "";

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "alsbk-test-"));
    ENV.backupDir = tmp;
  });

  afterAll(async () => {
    ENV.backupEncryptionKey = origKey;
    ENV.isProduction = origProd;
    ENV.backupDir = origDir;
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  });

  it("fails closed in production without a key", () => {
    ENV.backupEncryptionKey = "";
    ENV.isProduction = true;
    expect(resolveBackupSecret()).toBeNull();
    ENV.backupEncryptionKey = "a-very-strong-production-key-1234";
    expect(resolveBackupSecret()).toBe("a-very-strong-production-key-1234");
    ENV.isProduction = origProd;
    ENV.backupEncryptionKey = origKey;
  });

  it("pages ops on the 2nd consecutive failure and resets on success", async () => {
    const h1 = await recordBackupFailure(new Error("s3 timeout boom"));
    expect(h1.consecutiveFailures).toBe(1);
    expect(h1.needsAlert).toBe(false);
    const h2 = await recordBackupFailure(new Error("s3 timeout again"));
    expect(h2.consecutiveFailures).toBe(2);
    expect(h2.needsAlert).toBe(true);
    const read = await getBackupHealth();
    expect(read.needsAlert).toBe(true);
    expect(read.lastError).toContain("s3 timeout again");
    const ok = await recordBackupSuccess();
    expect(ok.consecutiveFailures).toBe(0);
    expect(ok.needsAlert).toBe(false);
  });
});

describe("monitoring endpoints (honest health + unified request id)", () => {
  let app: Express;
  let server: ReturnType<Express["listen"]>;
  let base = "";

  beforeAll(async () => {
    app = createApp();
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it("GET /api/live returns version+uptime and echoes x-request-id", async () => {
    const res = await fetch(`${base}/api/live`, {
      headers: { "x-request-id": "sre-test-live-1" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("sre-test-live-1");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptimeSec).toBe("number");
    expect(body.requestId).toBe("sre-test-live-1");
  });

  it("GET /api/health reports real DB state + latency + version (cached 5s)", async () => {
    const r1 = await fetch(`${base}/api/health`, {
      headers: { "x-request-id": "sre-test-health-1" },
    });
    expect([200, 503]).toContain(r1.status);
    expect(r1.headers.get("x-request-id")).toBe("sre-test-health-1");
    expect(r1.headers.get("cache-control")).toContain("no-store");
    const b1 = (await r1.json()) as Record<string, any>;
    expect(typeof b1.ok).toBe("boolean");
    expect(typeof b1.dbAvailable).toBe("boolean");
    expect(b1.ok).toBe(b1.dbAvailable);
    expect(r1.status).toBe(b1.dbAvailable ? 200 : 503);
    expect(typeof b1.dbLatencyMs).toBe("number");
    expect(typeof (b1.slo as Record<string, unknown>).latencyMs).toBe("number");
    expect(typeof (b1.slo as Record<string, unknown>).uptimeSec).toBe("number");
    expect(typeof b1.version).toBe("string");
    expect(b1.requestId).toBe("sre-test-health-1");

    // Second immediate call is served from the 5s cache.
    const r2 = await fetch(`${base}/api/health`);
    const b2 = (await r2.json()) as Record<string, any>;
    expect(b2.cached).toBe(true);
    expect(typeof b2.dbLatencyMs).toBe("number");
  }, 30000);
});
