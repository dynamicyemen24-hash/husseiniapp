#!/usr/bin/env tsx
/**
 * Backup Restore Dry-Run Script (tested program — see docs/OPERATIONS_RUNBOOK.md)
 *
 * Usage:
 *   pnpm tsx scripts/backup-restore-test.ts            # verify latest + dry-run restore
 *   pnpm tsx scripts/backup-restore-test.ts --id <id>  # target a specific backup
 *
 * Prerequisites:
 *   - BACKUP_ENCRYPTION_KEY set in environment (≥16 chars; fail-closed)
 *   - DATABASE_URL pointing to a TEST database (NOT production)
 *   - BACKUP_DIR or S3/Forge credentials for blob access
 *
 * Safety:
 *   - This script NEVER writes data (verify + dryRun only).
 *   - Refuses to run against a production-looking DATABASE_URL unless
 *     ALLOW_PROD_RESTORE_TEST=true is explicitly set (and still dry-run only).
 *   - Prints no secrets — only ids, counts, sha prefixes and timings.
 *
 * Exit codes: 0 = verified, 1 = failure (wire to cron/CI alerting).
 */

import "dotenv/config";
import { getDb } from "../server/db";
import {
  listBackups,
  verifyBackup,
  restoreBackup,
  resolveBackupSecret,
  getBackupHealth,
} from "../server/_core/backup";

function looksProd(url: string): boolean {
  return (
    /prod|neon\.tech\/(prod|main)|vercel/i.test(url) &&
    !/test|staging|localhost/i.test(url)
  );
}

async function main() {
  console.log("[Backup Restore Test] Starting dry-run...\n");

  // 1. Fail-closed key check (mirrors production behaviour).
  const secret = resolveBackupSecret();
  if (!secret) {
    console.error(
      "BACKUP_ENCRYPTION_KEY missing/short — refusing to run (fail-closed)"
    );
    process.exit(1);
  }
  console.log("BACKUP_ENCRYPTION_KEY present (fingerprint hidden)");

  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  if (looksProd(dbUrl) && process.env.ALLOW_PROD_RESTORE_TEST !== "true") {
    console.error(
      "DATABASE_URL looks like production — refusing. Point at a TEST database " +
        "or set ALLOW_PROD_RESTORE_TEST=true (still dry-run only)."
    );
    process.exit(1);
  }
  console.log("DATABASE_URL configured (value hidden)");

  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }
  console.log("Database connected");

  // 2. List + pick target.
  const backups = await listBackups();
  console.log(`\nFound ${backups.length} backup(s)`);
  if (backups.length === 0) {
    console.log(
      "No backups found — trigger one first (tRPC backup.run or nightly cron)."
    );
    const health = await getBackupHealth();
    console.log(
      `Health: failures=${health.consecutiveFailures} alert=${health.needsAlert}`
    );
    return;
  }
  const idArg = process.argv.indexOf("--id");
  const wanted = idArg >= 0 ? process.argv[idArg + 1] : undefined;
  const latest = wanted ? backups.find(b => b.id === wanted) : backups[0];
  if (!latest) {
    console.error(`Backup id not found: ${wanted}`);
    process.exit(1);
  }
  console.log(
    `Target: id=${latest.id} scope=${latest.scope} rows=${latest.totalRows}`
  );

  // 3. Verify (checksum + key fingerprint + decrypt probe, no writes).
  const t0 = Date.now();
  const verified = await verifyBackup(latest.id);
  console.log(
    `Verify: ok=${verified.ok} (${Date.now() - t0}ms)` +
      (verified.ok
        ? ` rows=${verified.totalRows}`
        : ` reason=${verified.reason}`)
  );
  if (!verified.ok) process.exit(1);

  // 4. Dry-run restore (validates payload structure, writes nothing).
  const t1 = Date.now();
  const restored = await restoreBackup(latest.id, { dryRun: true });
  console.log(
    `Dry-run restore: verified=${restored.verified.ok} (${Date.now() - t1}ms)` +
      (restored.note ? ` note=${restored.note}` : "")
  );
  if (!restored.verified.ok) process.exit(1);

  const health = await getBackupHealth();
  console.log(
    `\nBACKUP RESTORE TEST PASSED (failures=${health.consecutiveFailures} alert=${health.needsAlert})`
  );
  console.log(
    "Next: weekly dry-run in CI/cron + quarterly full restore on staging (see runbook)."
  );
}

main().catch(e => {
  console.error("Test failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
