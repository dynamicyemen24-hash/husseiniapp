/**
 * Security Router - Comprehensive Security Monitoring
 *
 * Implements NIST CSF 2.0 aligned security operations:
 * - Security Event Detection & Logging
 * - Threat Intelligence Integration
 * - Anomaly Detection
 * - Risk Scoring
 * - MITRE ATT&CK Alignment
 * - Compliance Controls
 */

import {
  router,
  tenantProcedure,
  adminProcedure,
  publicProcedure,
  requirePermissions,
} from "./_core/trpc";
import { PERMISSIONS } from "../shared/permissions";
import { eq, and, desc, gte, lte, sql, or, count, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  securityEvents,
  securityIncidents,
  vulnerabilities,
  complianceControls,
  threatIntelSources,
  users,
  loginAttempts,
  activityLogs,
} from "../drizzle/schema";
import { getDb } from "./db";

// Risk scoring weights (adjustable based on environment)
const RISK_WEIGHTS = {
  failedLogin: 15,
  mfaFailure: 25,
  suspiciousActivity: 40,
  privilegeEscalation: 50,
  dataBreachAttempt: 75,
  sqlInjection: 80,
  xssAttempt: 60,
  rateLimitExceeded: 10,
  newIpAddress: 20,
  unusualTime: 15,
  multipleAccounts: 30,
};

// MITRE ATT&CK Technique mappings
const MITRE_TECHNIQUES: Record<
  string,
  { id: string; tactic: string; name: string }
> = {
  sql_injection_attempt: {
    id: "T1190",
    tactic: "TA0011",
    name: "Exploit Public-Facing Application",
  },
  xss_attempt: { id: "T1189", tactic: "TA0011", name: "Drive-by Compromise" },
  csrf_attempt: { id: "T1078", tactic: "TA0004", name: "Valid Accounts" },
  command_injection_attempt: {
    id: "T1059",
    tactic: "TA0002",
    name: "Command and Scripting Interpreter",
  },
  privilege_escalation_attempt: {
    id: "T1068",
    tactic: "TA0004",
    name: "Exploitation for Privilege Escalation",
  },
  data_breach_attempt: {
    id: "T1048",
    tactic: "TA0010",
    name: "Exfiltration Over Alternative Protocol",
  },
  brute_force: { id: "T1110", tactic: "TA0006", name: "Brute Force" },
  session_hijacking: {
    id: "T1184",
    tactic: "TA0001",
    name: "Software Deployment Tools",
  },
};

// Calculate risk score based on event type and context
function calculateRiskScore(
  eventType: string,
  context: Record<string, any>
): number {
  let score = RISK_WEIGHTS[eventType as keyof typeof RISK_WEIGHTS] || 10;

  // Context-based adjustments
  if (context.newLocation) score += 15;
  if (context.unusualTime) score += 10;
  if (context.multipleFailures) score += 20;
  if (context.fromBlacklistedIp) score += 30;
  if (context.adminAction) score += 10;

  return Math.min(score, 100);
}

// MITRE ATT&CK enrichment
function enrichWithMitrecATTACK(
  eventType: string
): { techniqueId: string; tacticId: string; pattern: string } | null {
  const technique = MITRE_TECHNIQUES[eventType];
  if (!technique) return null;

  return {
    techniqueId: technique.id,
    tacticId: technique.tactic,
    pattern: technique.name,
  };
}

export const securityRouter = router({
  // ─── Log Security Event ───────────────────────────────────────────
  logEvent: tenantProcedure
    .input(
      z.object({
        eventType: z.enum([
          "login_success",
          "login_failed",
          "login_mfa_failed",
          "logout",
          "password_changed",
          "password_reset_request",
          "password_reset_complete",
          "user_created",
          "user_modified",
          "user_deleted",
          "permission_granted",
          "permission_revoked",
          "role_changed",
          "api_key_created",
          "api_key_revoked",
          "sensitive_data_accessed",
          "sensitive_data_exported",
          "suspicious_activity",
          "anomaly_detected",
          "rate_limit_exceeded",
          "ip_blocked",
          "concurrent_session",
          "password_weak",
          "mfa_disabled",
          "data_breach_attempt",
          "sql_injection_attempt",
          "xss_attempt",
          "csrf_attempt",
          "file_upload_malicious",
          "command_injection_attempt",
          "privilege_escalation_attempt",
        ]),
        title: z.string().min(1),
        description: z.string().optional(),
        rawData: z.record(z.string(), z.any()).optional(),
        actorId: z.number().optional(),
        actorName: z.string().optional(),
        actorIp: z.string().optional(),
        actorUserAgent: z.string().optional(),
        targetType: z.string().optional(),
        targetId: z.number().optional(),
        targetName: z.string().optional(),
        severity: z
          .enum(["critical", "high", "medium", "low", "info"])
          .optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant ID required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate risk score
      const riskScore = calculateRiskScore(input.eventType, {
        newLocation: false,
        unusualTime: false,
        multipleFailures: false,
        fromBlacklistedIp: false,
      });

      // MITRE ATT&CK enrichment
      const mitre = enrichWithMitrecATTACK(input.eventType);

      // Determine severity if not provided
      let severity = input.severity;
      if (!severity) {
        if (riskScore >= 70) severity = "critical";
        else if (riskScore >= 50) severity = "high";
        else if (riskScore >= 30) severity = "medium";
        else if (riskScore >= 10) severity = "low";
        else severity = "info";
      }

      const [event] = await db
        .insert(securityEvents)
        .values({
          tenantId: ctx.tenantId,
          eventType: input.eventType,
          title: input.title,
          description: input.description,
          rawData: input.rawData,
          severity: severity as any,
          status: "detected",
          actorType: input.actorId ? "user" : "system",
          actorId: input.actorId != null ? String(input.actorId) : undefined,
          actorName: input.actorName || ctx.user.name,
          actorIp: input.actorIp || ctx.req?.ip,
          actorUserAgent:
            input.actorUserAgent || ctx.req?.headers["user-agent"],
          targetType: input.targetType,
          targetId: input.targetId != null ? String(input.targetId) : undefined,
          targetName: input.targetName,
          riskScore: riskScore.toString(),
          mitreTechniqueId: mitre?.techniqueId,
          mitreTacticId: mitre?.tacticId,
          attackPattern: mitre?.pattern,
          sessionId: input.sessionId,
          eventTimestamp: new Date(),
        })
        .returning();

      // Auto-escalate critical events
      if (severity === "critical" || severity === "high") {
        await db
          .update(securityEvents)
          .set({ status: "escalated" })
          .where(eq(securityEvents.id, event.id));
      }

      return { eventId: event.id, riskScore };
    }),

  // ─── Get Security Dashboard ────────────────────────────────────────
  getDashboard: tenantProcedure
    .use(requirePermissions(PERMISSIONS.SECURITY_VIEW))
    .input(
      z
        .object({
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await getDb();
      if (!db) return null;

      const conditions = [eq(securityEvents.tenantId, ctx.tenantId)];
      if (input?.fromDate)
        conditions.push(
          gte(securityEvents.eventTimestamp, new Date(input.fromDate))
        );
      if (input?.toDate)
        conditions.push(
          lte(securityEvents.eventTimestamp, new Date(input.toDate))
        );

      // Event counts by severity
      const severityCounts = await db
        .select({
          severity: securityEvents.severity,
          count: count(),
        })
        .from(securityEvents)
        .where(and(...conditions))
        .groupBy(securityEvents.severity);

      // Event counts by type
      const typeCounts = await db
        .select({
          eventType: securityEvents.eventType,
          count: count(),
        })
        .from(securityEvents)
        .where(and(...conditions))
        .groupBy(securityEvents.eventType)
        .orderBy(desc(count()))
        .limit(10);

      // Recent critical/high events
      const criticalEvents = await db
        .select()
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.tenantId, ctx.tenantId),
            or(
              eq(securityEvents.severity, "critical"),
              eq(securityEvents.severity, "high")
            ),
            input?.fromDate
              ? gte(securityEvents.eventTimestamp, new Date(input.fromDate))
              : sql`1=1`
          )
        )
        .orderBy(desc(securityEvents.eventTimestamp))
        .limit(20);

      // Active incidents count
      const [activeIncidents] = await db
        .select({ count: count() })
        .from(securityIncidents)
        .where(
          and(
            eq(securityIncidents.tenantId, ctx.tenantId),
            or(
              eq(securityIncidents.status, "identified"),
              eq(securityIncidents.status, "investigating"),
              eq(securityIncidents.status, "contained")
            )
          )
        );

      // Vulnerabilities summary
      const vulnStats = await db
        .select({
          severity: vulnerabilities.severity,
          count: count(),
        })
        .from(vulnerabilities)
        .where(eq(vulnerabilities.tenantId, ctx.tenantId))
        .groupBy(vulnerabilities.severity);

      // Compliance score
      const [complianceStats] = await db
        .select({
          status: complianceControls.status,
          count: count(),
        })
        .from(complianceControls)
        .where(eq(complianceControls.tenantId, ctx.tenantId))
        .groupBy(complianceControls.status);

      // Calculate risk score (0-100, lower is better)
      const totalEvents = severityCounts.reduce((sum, s) => sum + s.count, 0);
      const criticalCount =
        severityCounts.find(s => s.severity === "critical")?.count || 0;
      const highCount =
        severityCounts.find(s => s.severity === "high")?.count || 0;
      const riskScore = Math.min(100, criticalCount * 10 + highCount * 5);

      return {
        totalEvents,
        riskScore,
        severityCounts: Object.fromEntries(
          severityCounts.map(s => [s.severity, s.count])
        ),
        topEventTypes: typeCounts,
        criticalEvents,
        activeIncidents: activeIncidents?.count || 0,
        vulnerabilities: Object.fromEntries(
          vulnStats.map(v => [v.severity, v.count])
        ),
        complianceStatus: complianceStats,
      };
    }),

  // ─── List Security Events ──────────────────────────────────────────
  listEvents: tenantProcedure
    .use(requirePermissions(PERMISSIONS.SECURITY_VIEW))
    .input(
      z
        .object({
          severity: z
            .enum(["critical", "high", "medium", "low", "info"])
            .optional(),
          status: z
            .enum([
              "detected",
              "analyzed",
              "investigating",
              "contained",
              "resolved",
              "false_positive",
              "escalated",
            ])
            .optional(),
          eventType: z.string().optional(),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          actorId: z.number().optional(),
          search: z.string().optional(),
          page: z.number().default(1),
          pageSize: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [eq(securityEvents.tenantId, ctx.tenantId)];
      if (input) {
        if (input.severity)
          conditions.push(eq(securityEvents.severity, input.severity as any));
        if (input.status)
          conditions.push(eq(securityEvents.status, input.status as any));
        if (input.eventType)
          conditions.push(eq(securityEvents.eventType, input.eventType as any));
        if (input.fromDate)
          conditions.push(
            gte(securityEvents.eventTimestamp, new Date(input.fromDate))
          );
        if (input.toDate)
          conditions.push(
            lte(securityEvents.eventTimestamp, new Date(input.toDate))
          );
        if (input.actorId)
          conditions.push(eq(securityEvents.actorId, String(input.actorId)));
        if (input.search) {
          const searchCond = or(
            sql`${securityEvents.title} ILIKE ${"%" + input.search + "%"}`,
            sql`${securityEvents.description} ILIKE ${"%" + input.search + "%"}`,
            sql`${securityEvents.actorIp} ILIKE ${"%" + input.search + "%"}`
          );
          if (searchCond) conditions.push(searchCond);
        }
      }

      const offset = ((input?.page || 1) - 1) * (input?.pageSize || 50);

      const items = await db
        .select()
        .from(securityEvents)
        .where(and(...conditions))
        .orderBy(desc(securityEvents.eventTimestamp))
        .limit(input?.pageSize || 50)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(securityEvents)
        .where(and(...conditions));

      return {
        items,
        total: totalResult?.count || 0,
        page: input?.page || 1,
        pageSize: input?.pageSize || 50,
      };
    }),

  // ─── Update Event Status ──────────────────────────────────────────
  updateEventStatus: tenantProcedure
    .use(requirePermissions(PERMISSIONS.SECURITY_EVENTS_MANAGE))
    .input(
      z.object({
        eventId: z.number(),
        status: z.enum([
          "detected",
          "analyzed",
          "investigating",
          "contained",
          "resolved",
          "false_positive",
          "escalated",
        ]),
        notes: z.string().optional(),
        createIncident: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant ID required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.status === "false_positive" && input.notes) {
        updateData.falsePositiveReason = input.notes;
      }

      if (input.status === "resolved") {
        updateData.resolvedBy = ctx.user!.id;
        updateData.resolvedAt = new Date();
        if (input.notes) updateData.resolutionNotes = input.notes;
      }

      await db
        .update(securityEvents)
        .set(updateData)
        .where(
          and(
            eq(securityEvents.id, input.eventId),
            eq(securityEvents.tenantId, ctx.tenantId)
          )
        );

      // Optionally create incident
      if (input.createIncident) {
        const event = await db
          .select()
          .from(securityEvents)
          .where(eq(securityEvents.id, input.eventId))
          .limit(1);

        if (event[0]) {
          // Generate incident number
          const year = new Date().getFullYear();
          const [lastIncident] = await db
            .select({ count: count() })
            .from(securityIncidents)
            .where(
              and(
                eq(securityIncidents.tenantId, ctx.tenantId),
                sql`${securityIncidents.incidentNumber} LIKE ${"INC-" + year + "-%"}`
              )
            );

          const incidentNumber = `INC-${year}-${String((lastIncident?.count || 0) + 1).padStart(4, "0")}`;

          const [incident] = await db
            .insert(securityIncidents)
            .values({
              tenantId: ctx.tenantId,
              incidentNumber,
              title: `Security Incident: ${event[0].title}`,
              description: event[0].description,
              severity:
                event[0].severity === "critical"
                  ? "critical"
                  : event[0].severity === "high"
                    ? "high"
                    : event[0].severity === "medium"
                      ? "medium"
                      : "low",
              status: "identified",
              detectedAt: event[0].eventTimestamp,
              createdBy: ctx.user!.id,
            })
            .returning();

          await db
            .update(securityEvents)
            .set({ incidentId: incident.id })
            .where(eq(securityEvents.id, input.eventId));
        }
      }

      return { success: true };
    }),

  // ─── Create Incident ───────────────────────────────────────────────
  createIncident: tenantProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        category: z.string().optional(),
        affectedUsers: z.number().optional(),
        affectedSystems: z.number().optional(),
        dataBreach: z.boolean().optional(),
        eventIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant ID required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate incident number
      const year = new Date().getFullYear();
      const [lastIncident] = await db
        .select({ count: count() })
        .from(securityIncidents)
        .where(
          and(
            eq(securityIncidents.tenantId, ctx.tenantId),
            sql`${securityIncidents.incidentNumber} LIKE ${"INC-" + year + "-%"}`
          )
        );

      const incidentNumber = `INC-${year}-${String((lastIncident?.count || 0) + 1).padStart(4, "0")}`;

      const [incident] = await db
        .insert(securityIncidents)
        .values({
          tenantId: ctx.tenantId,
          incidentNumber,
          title: input.title,
          description: input.description,
          severity: input.severity as any,
          category: input.category,
          status: "identified",
          affectedUsers: input.affectedUsers,
          affectedSystems: input.affectedSystems,
          dataBreach: input.dataBreach,
          detectedAt: new Date(),
          createdBy: ctx.user.id,
        })
        .returning();

      // Link events to incident
      if (input.eventIds?.length) {
        await db
          .update(securityEvents)
          .set({ incidentId: incident.id })
          .where(
            and(
              eq(securityEvents.tenantId, ctx.tenantId),
              inArray(securityEvents.id, input.eventIds)
            )
          );
      }

      return { incidentId: incident.id, incidentNumber };
    }),

  // ─── List Incidents ───────────────────────────────────────────────
  listIncidents: tenantProcedure
    .use(requirePermissions(PERMISSIONS.SECURITY_VIEW))
    .input(
      z
        .object({
          status: z
            .enum([
              "identified",
              "investigating",
              "contained",
              "eradicated",
              "recovered",
              "closed",
              "escalated",
            ])
            .optional(),
          severity: z.enum(["critical", "high", "medium", "low"]).optional(),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          page: z.number().default(1),
          pageSize: z.number().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [eq(securityIncidents.tenantId, ctx.tenantId)];
      if (input?.status)
        conditions.push(eq(securityIncidents.status, input.status as any));
      if (input?.severity)
        conditions.push(eq(securityIncidents.severity, input.severity as any));
      if (input?.fromDate)
        conditions.push(
          gte(securityIncidents.detectedAt, new Date(input.fromDate))
        );
      if (input?.toDate)
        conditions.push(
          lte(securityIncidents.detectedAt, new Date(input.toDate))
        );

      const offset = ((input?.page || 1) - 1) * (input?.pageSize || 20);

      const items = await db
        .select()
        .from(securityIncidents)
        .where(and(...conditions))
        .orderBy(desc(securityIncidents.detectedAt))
        .limit(input?.pageSize || 20)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(securityIncidents)
        .where(and(...conditions));

      return {
        items,
        total: totalResult?.count || 0,
        page: input?.page || 1,
        pageSize: input?.pageSize || 20,
      };
    }),

  // ─── Update Incident ───────────────────────────────────────────────
  updateIncident: tenantProcedure
    .input(
      z.object({
        incidentId: z.number(),
        status: z
          .enum([
            "identified",
            "investigating",
            "contained",
            "eradicated",
            "recovered",
            "closed",
            "escalated",
          ])
          .optional(),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        rootCause: z.string().optional(),
        attackVector: z.string().optional(),
        responseActions: z.string().optional(),
        lessonsLearned: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenantId) throw new Error("Tenant ID required");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      };

      if (input.status) {
        updateData.status = input.status;
        if (input.status === "contained") updateData.containedAt = new Date();
        if (input.status === "eradicated") updateData.eradicatedAt = new Date();
        if (input.status === "recovered") updateData.recoveredAt = new Date();
        if (input.status === "closed") updateData.closedAt = new Date();
      }

      if (input.severity) updateData.severity = input.severity;
      if (input.rootCause) updateData.rootCause = input.rootCause;
      if (input.attackVector) updateData.attackVector = input.attackVector;
      if (input.responseActions)
        updateData.immediateActions = input.responseActions;
      if (input.lessonsLearned)
        updateData.lessonsLearned = input.lessonsLearned;

      await db
        .update(securityIncidents)
        .set(updateData)
        .where(
          and(
            eq(securityIncidents.id, input.incidentId),
            eq(securityIncidents.tenantId, ctx.tenantId)
          )
        );

      return { success: true };
    }),

  // ─── Vulnerability Management ───────────────────────────────────────
  listVulnerabilities: tenantProcedure
    .use(requirePermissions(PERMISSIONS.SECURITY_VIEW))
    .input(
      z
        .object({
          severity: z
            .enum(["critical", "high", "medium", "low", "informational"])
            .optional(),
          status: z
            .enum([
              "identified",
              "triaged",
              "vulnerability_remediation",
              "resolved",
              "accepted",
              "false_positive",
              "deferred",
            ])
            .optional(),
          page: z.number().default(1),
          pageSize: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { items: [], total: 0 };
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [eq(vulnerabilities.tenantId, ctx.tenantId)];
      if (input?.severity)
        conditions.push(eq(vulnerabilities.severity, input.severity as any));
      if (input?.status)
        conditions.push(eq(vulnerabilities.status, input.status as any));

      const offset = ((input?.page || 1) - 1) * (input?.pageSize || 50);

      const items = await db
        .select()
        .from(vulnerabilities)
        .where(and(...conditions))
        .orderBy(
          // Sort by severity (critical first)
          sql`CASE ${vulnerabilities.severity} 
              WHEN 'critical' THEN 1 
              WHEN 'high' THEN 2 
              WHEN 'medium' THEN 3 
              WHEN 'low' THEN 4 
              ELSE 5 END`,
          desc(vulnerabilities.discoveredAt)
        )
        .limit(input?.pageSize || 50)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vulnerabilities)
        .where(and(...conditions));

      return {
        items,
        total: totalResult?.count || 0,
        page: input?.page || 1,
        pageSize: input?.pageSize || 50,
      };
    }),

  // ─── Compliance Controls ───────────────────────────────────────────
  listComplianceControls: tenantProcedure
    .input(
      z
        .object({
          framework: z
            .enum([
              "iso27001",
              "soc2",
              "gdpr",
              "pci_dss",
              "hipaa",
              "nist_csf",
              "cis",
            ])
            .optional(),
          status: z
            .enum([
              "not_applicable",
              "not_implemented",
              "partially_implemented",
              "implemented",
              "continuously_implemented",
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return [];
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(complianceControls.tenantId, ctx.tenantId)];
      if (input?.framework)
        conditions.push(
          eq(complianceControls.framework, input.framework as any)
        );
      if (input?.status)
        conditions.push(eq(complianceControls.status, input.status as any));

      return await db
        .select()
        .from(complianceControls)
        .where(and(...conditions))
        .orderBy(complianceControls.framework, complianceControls.controlId);
    }),

  // ─── Compliance Score ─────────────────────────────────────────────
  getComplianceScore: tenantProcedure
    .input(
      z.object({
        framework: z.enum([
          "iso27001",
          "soc2",
          "gdpr",
          "pci_dss",
          "hipaa",
          "nist_csf",
          "cis",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return null;
      const db = await getDb();
      if (!db) return null;

      const controls = await db
        .select()
        .from(complianceControls)
        .where(
          and(
            eq(complianceControls.tenantId, ctx.tenantId),
            eq(complianceControls.framework, input.framework)
          )
        );

      if (controls.length === 0) {
        return {
          framework: input.framework,
          score: 0,
          total: 0,
          implemented: 0,
        };
      }

      const implemented = controls.filter(
        c =>
          c.status === "implemented" || c.status === "continuously_implemented"
      ).length;

      const score = Math.round((implemented / controls.length) * 100);

      return {
        framework: input.framework,
        score,
        total: controls.length,
        implemented,
        byStatus: controls.reduce(
          (acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    }),

  // ─── Threat Intelligence ───────────────────────────────────────────
  checkIoC: tenantProcedure
    .input(
      z.object({
        type: z.enum(["ip", "domain", "hash", "url"]),
        value: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenantId) return { malicious: false };

      // Check against internal blacklist first
      const db = await getDb();
      if (!db) return { malicious: false };

      const recentMalicious = await db
        .select()
        .from(securityEvents)
        .where(
          and(
            eq(securityEvents.tenantId, ctx.tenantId),
            eq(securityEvents.iocType, input.type.toUpperCase()),
            eq(securityEvents.iocValue, input.value),
            or(
              eq(securityEvents.severity, "critical"),
              eq(securityEvents.severity, "high")
            )
          )
        )
        .limit(1);

      if (recentMalicious.length > 0) {
        return {
          malicious: true,
          reason: "Found in recent security events",
          lastSeen: recentMalicious[0].eventTimestamp,
        };
      }

      return { malicious: false };
    }),
});
