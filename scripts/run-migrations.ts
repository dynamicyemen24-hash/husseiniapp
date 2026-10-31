/**
 * scripts/run-migrations.ts
 * -------------------------
 * Robust SQL-file migration runner for the Neon PostgreSQL database.
 *
 * Fixes over the previous implementation:
 *  1. Loads `.env` so `DATABASE_URL` is available when run standalone
 *     (`pnpm db:migrate` / Vercel `postbuild`).
 *  2. Uses `sql.query(sql)` instead of `sql.unsafe(...)`. On
 *     `@neondatabase/serverless` `sql.unsafe()` returns a *composable
 *     fragment* that is silently discarded when awaited on its own — every
 *     migration "ran" but never reached the database.
 *  3. Splits SQL files robustly on CRLF **and** LF line endings.
 *  4. Tracks applied migrations in a `schema_migrations` ledger table so each
 *     file is executed exactly once, and detects checksum drift.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import {
  checksumOf,
  classifyStatementError,
  isDestructiveMigrationStatement,
  splitMigrationStatements,
} from "../server/_core/migrate";

const LEDGER_TABLE = "schema_migrations";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn(
      "[migrations] DATABASE_URL not set — skipping migrations (OK in dev/preview builds without a DB)."
    );
    process.exit(0);
  }

  const sql = neon(databaseUrl);
  console.log("[migrations] Running migration runner…");

  // Neon HTTP occasionally hiccups on cold connects (UND_ERR_CONNECT_TIMEOUT /
  // transient fetch failures). Retry transient network errors with backoff so
  // a deploy doesn't fail because of one dropped packet.
  const TRANSIENT = new Set([
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
  ]);
  async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const code =
          (error as any)?.code ??
          (error as any)?.sourceError?.cause?.code ??
          "";
        const message = String((error as any)?.message ?? error);
        const transient =
          TRANSIENT.has(code) || message.includes("fetch failed");
        if (!transient || attempt === 4) throw error;
        const delayMs = attempt * 2000;
        console.warn(
          `[migrations] ⚠ ${label} — transient network error (${code || message}); retry ${attempt}/3 in ${delayMs}ms…`
        );
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  }
  const query = (stmt: string, params?: unknown[]) =>
    withRetry(`query(${stmt.slice(0, 40)}…)`, () =>
      params ? sql.query(stmt, params as any[]) : sql.query(stmt)
    );

  // ── ensure ledger table ──────────────────────────────────────────────
  await query(
    `CREATE TABLE IF NOT EXISTS "${LEDGER_TABLE}" (
       "name" varchar(200) PRIMARY KEY,
       "checksum" varchar(16) NOT NULL,
       "appliedAt" timestamp DEFAULT now() NOT NULL
     )`
  );

  const seen = new Map<string, string>();
  for (const row of (await query(
    `SELECT "name", "checksum" FROM "${LEDGER_TABLE}"`
  )) as Array<{ name: string; checksum: string }>) {
    seen.set(row.name, row.checksum);
  }

  const migrationsDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql") && !f.endsWith(".sql.bak"))
    .sort();

  if (files.length === 0) {
    console.log("[migrations] No migration files found.");
    process.exit(0);
  }

  let appliedCount = 0;
  let alreadyApplied = 0;
  const failures: string[] = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const text = fs.readFileSync(filePath, "utf8");
    const checksum = checksumOf(text);

    const previous = seen.get(file);
    if (previous !== undefined && previous === checksum) {
      alreadyApplied++;
      console.log(`[migrations] ⊘ ${file} — already applied, skipping.`);
      continue;
    }
    if (previous !== undefined) {
      console.warn(
        `[migrations] ⚠ checksum drift for applied migration ${file} (stored=${previous} current=${checksum}) — treating as already applied (whitespace/line-ending drift tolerated).`
      );
      alreadyApplied++;
      continue;
    }

    const statements = splitMigrationStatements(text);
    const destructiveStatement = statements.find(
      isDestructiveMigrationStatement
    );
    if (destructiveStatement) {
      throw new Error(
        `[migrations] Refusing destructive statement in ${file}: ` +
          destructiveStatement.slice(0, 120)
      );
    }
    console.log(
      `[migrations] → ${file} (${statements.length} statements, checksum ${checksum})`
    );

    let ok = true;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await query(stmt);
      } catch (error) {
        const decision = classifyStatementError(error, stmt);
        if (decision.kind === "exists") {
          console.log(`  ⊘ statement ${i + 1}: ${decision.reason}`);
        } else {
          ok = false;
          failures.push(`[${file}:${i + 1}] ${decision.reason}`);
          console.error(`  ✗ statement ${i + 1}: ${decision.reason}`);
        }
      }
    }

    if (ok) {
      await query(
        `INSERT INTO "${LEDGER_TABLE}" ("name", "checksum") VALUES ($1, $2)
         ON CONFLICT ("name") DO UPDATE SET "checksum" = EXCLUDED."checksum", "appliedAt" = now()`,
        [file, checksum]
      );
      appliedCount++;
    }
  }

  console.log(
    `\n[migrations] Done. applied=${appliedCount} alreadyApplied=${alreadyApplied} failures=${failures.length}`
  );
  if (failures.length > 0) {
    console.error("[migrations] Failures:");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(error => {
  console.error("[migrations] Fatal:", error);
  process.exit(1);
});
