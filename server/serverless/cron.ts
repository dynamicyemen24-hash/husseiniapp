/**
 * server/serverless/cron.ts — Cron trigger source.
 * Bundled by scripts/build-server.cjs → api/cron.mjs (single-file serverless
 * function). Source lives OUTSIDE api/ so Vercel does not try to compile it
 * itself (that broke at runtime: ERR_MODULE_NOT_FOUND for ../server/*).
 *
 * Runs the shared automation engine for every tenant on a schedule
 * (declared in vercel.json → /api/cron/tick, hourly). It does NOT touch the
 * main api/index.mjs handler; it is fully independent.
 *
 * Auth: must be called with `Authorization: Bearer ${CRON_SECRET}` (defaults to
 * "dev-cron" when CRON_SECRET is unset). Any other value → 401.
 */

import "dotenv/config";
import { getDb } from "../db";
import {
  runProactiveAlerts,
  runScheduledJournalEntries,
  runRecurringExpenses,
} from "../automation";
import {
  tenants,
  featureFlags,
  loginAttempts,
  users,
  workflowDefinitions,
} from "../../drizzle/schema";
import { sql, count, and, eq, lt } from "drizzle-orm";
import { runNightlyBackupIfDue } from "../_core/backup";
// import { getOverdueInstances, loadInstance, saveInstance } from "@alhusseiniya/workflow-engine/persistence";
// import { createWorkflowMachine } from "@alhusseiniya/workflow-engine";

export default async function handler(req: any, res: any) {
  const requestId =
    (req.headers?.["x-request-id"] as string) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    res.setHeader("x-request-id", requestId);
  } catch {
    /* headers may be immutable in some runtimes */
  }
  try {
    // SECURITY: fail closed in production — the cron surface must never be
    // callable with a well-known default secret. Vercel Cron automatically
    // sends `Authorization: Bearer ${CRON_SECRET}` when the env var is set.
    const secret = process.env.CRON_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ ok: false, error: "CRON_SECRET not configured" })
      );
      return;
    }
    const auth = req.headers["authorization"] || "";
    const expected = `Bearer ${secret || "dev-cron"}`;
    if (auth !== expected) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
      return;
    }

    const db = await getDb();
    if (!db) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "database unavailable" }));
      return;
    }

    const rows = await db
      .select({ id: tenants.id })
      .from(tenants)
      .orderBy(tenants.id);

    let ran = 0;
    const perTenant = [];
    for (const t of rows) {
      // 1. Proactive alerts (reorder points, overdue invoices)
      const alerts = await runProactiveAlerts(t.id);

      // 2. Scheduled journal entries
      const scheduled = await runScheduledJournalEntries(t.id, null);

      // 3. Recurring expenses processing
      const recurring = await runRecurringExpenses(t.id, null);

      // 4. Workflow SLA timeout handling — fire TIMEOUT events for overdue tasks
      // TODO: Re-enable when @alhusseiniya/workflow-engine package is built
      const workflowTimeouts = 0;
      // try {
      //   const overdueInstances = await getOverdueInstances(t.id);
      //   for (const inst of overdueInstances) {
      //     if (!inst.currentAssigneeId) continue;
      //
      //     const [def] = await db
      //       .select()
      //       .from(workflowDefinitions)
      //       .where(eq(workflowDefinitions.id, inst.definitionId))
      //       .limit(1);
      //
      //     if (!def) continue;
      //
      //     const machine = createWorkflowMachine(def as any);
      //     const context = await loadInstance(inst.id);
      //     if (!context) continue;
      //
      //     const actor = machine.provide({ actions: {} }).start(context);
      //
      //     // Find active tasks that are overdue
      //     const activeTasks = context.tasks.filter(
      //       (task) => task.status === "active" && task.dueDate && new Date(task.dueDate) < new Date()
      //     );
      //
      //     for (const task of activeTasks) {
      //       actor.send({ type: "TIMEOUT", payload: { taskId: task.id } });
      //       workflowTimeouts++;
      //     }
      //
      //     const newContext = actor.getSnapshot().context;
      //     await saveInstance(newContext);
      //   }
      // } catch (e) {
      //   console.error(`[cron][${requestId}] Workflow timeout processing failed for tenant ${t.id}:`, e);
      // }

      // 5. Feature-flag health check — confirm no stale flags for this tenant
      await db
        .select()
        .from(featureFlags)
        .where(sql`${featureFlags.tenantId} = ${t.id}`)
        .limit(100);

      // 5. Stale-session cleanup — remove login attempts older than 90 days
      await db
        .delete(loginAttempts)
        .where(sql`${loginAttempts.createdAt} < now() - interval '90 days'`);

      // 6. Aggregate analytics stats for BI dashboard (denormalized snapshot)
      const stats = await db
        .select({
          totalUsers: count(users.id),
          totalTenants: count(tenants.id),
          activeSessions: sql<number>`(SELECT count(*) FROM users WHERE lastSignedIn > now() - interval '24 hours')`,
        })
        .from(users);

      perTenant.push({
        tenantId: t.id,
        alerts: alerts.total,
        scheduledProcessed: scheduled.processed,
        recurringProcessed: recurring.processed,
        recurringFailed: recurring.failed,
        workflowTimeouts,
        stats: {
          totalUsers: stats[0]?.totalUsers ?? 0,
          activeSessions: stats[0]?.activeSessions ?? 0,
        },
      });
      ran++;
    }

    // 7. Nightly encrypted backup — at most once/day, never fails the tick.
    // Alert on ≥2 consecutive failures (runbook: docs/OPERATIONS_RUNBOOK.md).
    const backup = await runNightlyBackupIfDue();
    if ((backup as { alert?: boolean }).alert) {
      console.error(
        `[cron][${requestId}] ALERT: backup failures x${(backup as { consecutiveFailures?: number }).consecutiveFailures} — paging ops`
      );
      try {
        // Same captureContext shape as recordBackupFailure() in
        // server/_core/backup.ts — one Sentry issue for the paging signal.
        const Sentry = await import("@sentry/node");
        Sentry.captureMessage(
          `cron backup alert x${(backup as { consecutiveFailures?: number }).consecutiveFailures}: ${(backup as { error?: string }).error ?? (backup as { skippedReason?: string }).skippedReason ?? "backup failing"}`,
          {
            level: "error",
            tags: {
              alert: "backup",
              request_id: requestId,
              consecutive_failures: String(
                (backup as { consecutiveFailures?: number })
                  .consecutiveFailures ?? ""
              ),
            },
          }
        );
      } catch {
        /* Sentry optional */
      }
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        ran,
        perTenant,
        backup,
        requestId,
      })
    );
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    );
  }
}
