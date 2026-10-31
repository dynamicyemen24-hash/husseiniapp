/**
 * server/backupRouter.ts — admin-only encrypted backup endpoints.
 *
 * Surface:
 *  - run     : trigger an on-demand backup (all tenants or one).
 *  - list    : backup index (manifests only — never the blobs themselves).
 *  - verify  : integrity check (checksum + key fingerprint + decrypt probe).
 *  - restore : dry-run by default; real restore requires confirm:true.
 *
 * Every endpoint is adminProcedure — backups expose the whole tenant estate
 * and must never be callable by regular users.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "./_core/trpc";
import { requireTenantId } from "./_core/tenant";
import {
  runBackup,
  listBackups,
  verifyBackup,
  restoreBackup,
  getBackupHealth,
  recordBackupSuccess,
  recordBackupFailure,
} from "./_core/backup";
import { recordAuditEvent } from "./_core/audit";

export const backupRouter = router({
  run: adminProcedure
    .input(
      z.object({
        tenantId: z.number().int().positive().nullable().default(null),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tid = requireTenantId(ctx);
      // Tenant admins are scoped to their own tenant; only the platform
      // owner (isSuperAdmin) may back up another tenant or the whole estate.
      if (
        !ctx.isSuperAdmin &&
        input.tenantId !== null &&
        input.tenantId !== tid
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "CROSS_TENANT_DENIED: النسخ الاحتياطي متاح لنطاق مؤسستك فقط",
        });
      }
      const scope = ctx.isSuperAdmin ? input.tenantId : tid;
      try {
        const manifest = await runBackup(scope);
        await recordBackupSuccess();
        return {
          id: manifest.id,
          scope: manifest.scope,
          totalRows: manifest.totalRows,
          sha256: manifest.sha256,
          storage: manifest.storage,
          createdAt: manifest.createdAt,
        };
      } catch (e) {
        await recordBackupFailure(e);
        throw e;
      }
    }),

  /** Program health: consecutive failures + paging flag (alert on ≥2). */
  status: adminProcedure.query(async () => {
    const health = await getBackupHealth();
    const recent = (await listBackups()).slice(0, 5).map(m => ({
      id: m.id,
      createdAt: m.createdAt,
      scope: m.scope,
      totalRows: m.totalRows,
      encryptedSize: m.encryptedSize,
      sha256: m.sha256,
      hasRemote: Boolean(m.storage.remoteKey),
    }));
    return { ...health, recent };
  }),

  list: adminProcedure.query(async () => {
    const manifests = await listBackups();
    // Strip storage paths (may contain absolute filesystem paths).
    return manifests.map(m => ({
      id: m.id,
      createdAt: m.createdAt,
      scope: m.scope,
      totalRows: m.totalRows,
      encryptedSize: m.encryptedSize,
      sha256: m.sha256,
      hasRemote: Boolean(m.storage.remoteKey),
      tableCounts: m.tableCounts,
    }));
  }),

  verify: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => verifyBackup(input.id)),

  restore: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        dryRun: z.boolean().default(true),
        /** Must be explicitly true when dryRun is false. */
        confirm: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.dryRun && input.confirm !== true) {
        throw new Error(
          "Real restore requires confirm:true — refusing destructive operation without explicit confirmation"
        );
      }
      const result = await restoreBackup(input.id, { dryRun: input.dryRun });

      // Audit log
      await recordAuditEvent(ctx, {
        action: "BACKUP_RESTORED",
        resourceType: "backup",
        resourceId: input.id,
        after: {
          backupId: input.id,
          dryRun: input.dryRun,
          confirm: input.confirm,
        },
        metadata: { route: "backup.restore" },
      });

      return result;
    }),
});
