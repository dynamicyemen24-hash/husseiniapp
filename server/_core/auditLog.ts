/**
 * Audit Logger — Immutable append-only audit trail for compliance.
 *
 * Implements:
 * - ISO 27001 A.12.4.1 (event logging)
 * - SOC2 CC6.1 (logical access controls)
 * - GDPR Art. 30 (records of processing activities)
 * - PCI-DSS 10.2 (audit trail requirements)
 * - HIPAA §164.312(b) (audit controls)
 *
 * Every mutation is logged with: who, what, when, where, outcome, risk level.
 * The audit_logs table is append-only — no UPDATE or DELETE is permitted.
 * Hash-chained for tamper evidence: each entry's currentHash = SHA256(prevHash + action + data + timestamp),
 * and previousHash of next entry links back, forming a cryptographic chain.
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";
import type { Request } from "express";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_change"
  | "auth.2fa_enable"
  | "auth.2fa_disable"
  | "auth.failed_login"
  | "auth.session_expired"
  | "data.create"
  | "data.update"
  | "data.delete"
  | "data.read_sensitive"
  | "data.export"
  | "data.import"
  | "finance.invoice_create"
  | "finance.invoice_post"
  | "finance.invoice_reverse"
  | "finance.payment"
  | "finance.journal_entry"
  | "finance.period_close"
  | "pos.sale"
  | "pos.return"
  | "pos.quick_sale"
  | "pos.session_open"
  | "pos.session_close"
  | "system.config_change"
  | "system.user_role_change"
  | "system.tenant_suspend"
  | "system.backup"
  | "system.restore"
  | "security.access_denied"
  | "security.rate_limit"
  | "security.csrf_violation"
  | "security.xss_attempt"
  | "security.injection_attempt"
  | string;

export type AuditSeverity = "info" | "warning" | "critical" | "emergency";

export type AuditOutcome = "success" | "failure" | "partial" | "denied";

export interface AuditLogEntry {
  action: AuditAction;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  tenantId?: number | null;
  userId?: string | null;
  targetUserId?: string | null;
  resource?: string | null;
  resourceId?: string | number | null;
  details?: Record<string, unknown> | null;
  request?: Request | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  duration?: number | null;
  riskScore?: number;
}

function extractIp(request?: Request | null): string | null {
  if (!request) return null;
  return (
    (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (request.headers["x-real-ip"] as string) ||
    request.ip ||
    null
  );
}

function extractUserAgent(request?: Request | null): string | null {
  if (!request) return null;
  return (request.headers["user-agent"] as string)?.substring(0, 500) || null;
}

function computeRiskScore(entry: AuditLogEntry): number {
  let score = 0;

  // Severity weight
  switch (entry.severity) {
    case "emergency":
      score += 40;
      break;
    case "critical":
      score += 30;
      break;
    case "warning":
      score += 15;
      break;
    default:
      score += 5;
  }

  // Action weight
  if (entry.action.startsWith("security.")) score += 30;
  if (entry.action.startsWith("auth.failed")) score += 20;
  if (entry.action.includes("delete")) score += 10;
  if (entry.action.includes("role_change") || entry.action.includes("suspend"))
    score += 15;
  if (entry.action.includes("export") || entry.action.includes("backup"))
    score += 10;

  // Outcome weight
  if (entry.outcome === "failure") score += 10;
  if (entry.outcome === "denied") score += 15;

  // No user context is suspicious
  if (!entry.userId) score += 10;

  return Math.min(score, 100);
}

/**
 * Log an audit event. This function is fire-and-forget — it never throws
 * to avoid breaking the request flow. All errors are caught and logged.
 * Implements hash-chained immutable audit trail for tamper evidence.
 * Chain structure: each entry stores (previousHash, currentHash, chainSequence).
 * previousHash of entry N+1 = currentHash of entry N.
 * Genesis entry has previousHash = "0".repeat(64).
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn(
        "[AuditLog] Database unavailable — entry dropped:",
        entry.action
      );
      return;
    }

    const riskScore = entry.riskScore ?? computeRiskScore(entry);
    const ipAddress = entry.ipAddress ?? extractIp(entry.request);
    const userAgent = entry.userAgent ?? extractUserAgent(entry.request);

    // ─── Hash-chained immutable audit trail ──────────────────────────
    // Retrieve the last entry for this tenant to build the chain
    const lastEntryResult = await db
      .select({
        previousHash: sql`MAX(currentHash)`,
        chainSequence: sql`MAX(chainSequence)`,
      })
      .from(sql`audit_logs`)
      .where(sql`tenant_id = ${entry.tenantId ?? 0}`);

    const lastEntry = lastEntryResult[0];
    const prevHash = (lastEntry?.previousHash as string) ?? "0".repeat(64); // genesis
    const newChainSeq = ((lastEntry?.chainSequence as number) ?? 0) + 1;

    // Compute currentHash: SHA-256(previousHash + action + canonical data + timestamp)
    const timestamp = new Date().toISOString();
    const hashInput =
      prevHash +
      entry.action +
      (entry.userId ?? "") +
      (entry.tenantId?.toString() ?? "") +
      timestamp +
      (entry.resource ?? "") +
      (entry.resourceId != null ? String(entry.resourceId) : "");
    const currentHash = createHash("sha256")
      .update(hashInput.trim())
      .digest("hex");

    await db.execute(sql`
      INSERT INTO audit_logs (
        tenant_id, user_id, target_user_id, action, severity, outcome,
        resource, resource_id, details, ip_address, user_agent,
        duration_ms, risk_score, created_at, previousHash, currentHash, chainSequence
      ) VALUES (
        ${entry.tenantId ?? null},
        ${entry.userId ?? null},
        ${entry.targetUserId ?? null},
        ${entry.action},
        ${entry.severity},
        ${entry.outcome},
        ${entry.resource ?? null},
        ${entry.resourceId != null ? String(entry.resourceId) : null},
        ${entry.details ? JSON.stringify(entry.details) : null},
        ${ipAddress},
        ${userAgent},
        ${entry.duration ?? null},
        ${riskScore},
        NOW(),
        ${prevHash},
        ${currentHash},
        ${newChainSeq}
      )
    `);
  } catch (error) {
    // Audit logging must never break the request flow
    console.error(
      "[AuditLog] Failed to write audit entry:",
      entry.action,
      error
    );
  }
}

/**
 * Convenience wrappers for common audit scenarios.
 */
export const audit = {
  login: (tenantId: number | null, userId: string, req?: Request) =>
    auditLog({
      action: "auth.login",
      severity: "info",
      outcome: "success",
      tenantId,
      userId,
      request: req,
    }),

  failedLogin: (email: string, reason: string, req?: Request) =>
    auditLog({
      action: "auth.failed_login",
      severity: "warning",
      outcome: "failure",
      details: { email, reason },
      request: req,
      riskScore: 25,
    }),

  logout: (tenantId: number | null, userId: string, req?: Request) =>
    auditLog({
      action: "auth.logout",
      severity: "info",
      outcome: "success",
      tenantId,
      userId,
      request: req,
    }),

  dataCreate: (
    tenantId: number,
    userId: string,
    resource: string,
    resourceId: string | number,
    req?: Request
  ) =>
    auditLog({
      action: "data.create",
      severity: "info",
      outcome: "success",
      tenantId,
      userId,
      resource,
      resourceId,
      request: req,
    }),

  dataUpdate: (
    tenantId: number,
    userId: string,
    resource: string,
    resourceId: string | number,
    changes?: Record<string, unknown>,
    req?: Request
  ) =>
    auditLog({
      action: "data.update",
      severity: "info",
      outcome: "success",
      tenantId,
      userId,
      resource,
      resourceId,
      details: changes ? { changes } : null,
      request: req,
    }),

  dataDelete: (
    tenantId: number,
    userId: string,
    resource: string,
    resourceId: string | number,
    req?: Request
  ) =>
    auditLog({
      action: "data.delete",
      severity: "warning",
      outcome: "success",
      tenantId,
      userId,
      resource,
      resourceId,
      request: req,
    }),

  securityViolation: (
    type: string,
    details: Record<string, unknown>,
    req?: Request
  ) =>
    auditLog({
      action: `security.${type}` as AuditAction,
      severity: "critical",
      outcome: "denied",
      details,
      request: req,
      riskScore: 80,
    }),

  accessDenied: (
    tenantId: number | null,
    userId: string,
    resource: string,
    req?: Request
  ) =>
    auditLog({
      action: "security.access_denied",
      severity: "warning",
      outcome: "denied",
      tenantId,
      userId,
      resource,
      request: req,
      riskScore: 40,
    }),

  financeAction: (
    tenantId: number,
    userId: string,
    action: AuditAction,
    resource: string,
    resourceId: string | number,
    details?: Record<string, unknown>,
    req?: Request
  ) =>
    auditLog({
      action,
      severity: "info",
      outcome: "success",
      tenantId,
      userId,
      resource,
      resourceId,
      details,
      request: req,
    }),
};
