import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SHELL = process.platform === "win32" ? "cmd.exe" : "/bin/bash";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "drizzle", "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  const result = await pool.query(
    `SELECT hash FROM "drizzle_migrations" ORDER BY id ASC`
  );
  return result.rows.map(r => r.hash);
}

async function getPendingMigrations(): Promise<string[]> {
  const applied = await getAppliedMigrations();
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  const allFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();
  return allFiles.filter(f => !applied.includes(f));
}

export async function up(): Promise<void> {
  console.log("[migrate] Running pending migrations...");
  const pending = await getPendingMigrations();
  if (pending.length === 0) {
    console.log("[migrate] No pending migrations.");
    return;
  }
  console.log(
    `[migrate] Found ${pending.length} pending migration(s):`,
    pending
  );

  await backupBeforeMigrate();

  for (const migrationFile of pending) {
    console.log(`[migrate] Applying ${migrationFile}...`);
    const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = fs.readFileSync(migrationPath, "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(`INSERT INTO "drizzle_migrations" (hash) VALUES ($1)`, [
        migrationFile,
      ]);
      await pool.query("COMMIT");
      console.log(`[migrate] ✓ ${migrationFile} applied`);
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error(`[migrate] ✗ Failed to apply ${migrationFile}:`, error);
      throw error;
    }
  }
  console.log("[migrate] All migrations applied successfully.");
}

export async function down(targetVersion?: string): Promise<void> {
  console.log("[migrate] Rolling back migrations...");
  const applied = await getAppliedMigrations();
  if (applied.length === 0) {
    console.log("[migrate] No migrations to roll back.");
    return;
  }

  let migrationsToRollback: string[];
  if (targetVersion) {
    const targetIndex = applied.indexOf(targetVersion);
    if (targetIndex === -1) {
      throw new Error(
        `Target version ${targetVersion} not found in applied migrations`
      );
    }
    migrationsToRollback = applied.slice(targetIndex + 1).reverse();
  } else {
    migrationsToRollback = [applied[applied.length - 1]];
  }

  console.log(
    `[migrate] Rolling back ${migrationsToRollback.length} migration(s):`,
    migrationsToRollback
  );

  for (const migrationFile of migrationsToRollback) {
    console.log(`[migrate] Rolling back ${migrationFile}...`);
    const downFile = migrationFile.replace(".sql", ".down.sql");
    const downPath = path.join(MIGRATIONS_DIR, downFile);

    if (!fs.existsSync(downPath)) {
      throw new Error(
        `Down migration not found: ${downFile}. Manual rollback required.`
      );
    }

    const sql = fs.readFileSync(downPath, "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(`DELETE FROM "drizzle_migrations" WHERE hash = $1`, [
        migrationFile,
      ]);
      await pool.query("COMMIT");
      console.log(`[migrate] ✓ ${migrationFile} rolled back`);
    } catch (error) {
      await pool.query("ROLLBACK");
      console.error(`[migrate] ✗ Failed to roll back ${migrationFile}:`, error);
      throw error;
    }
  }
  console.log("[migrate] Rollback completed.");
}

export async function status(): Promise<{
  current: number;
  pending: number;
  applied: string[];
}> {
  const applied = await getAppliedMigrations();
  const pending = await getPendingMigrations();
  return {
    current: applied.length,
    pending: pending.length,
    applied,
  };
}

export async function backupBeforeMigrate(): Promise<string> {
  console.log("[migrate] Creating pre-migration backup...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(PROJECT_ROOT, ".backups");
  const backupFile = path.join(backupDir, `pre-migration-${timestamp}.sql`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const pgDumpCmd = `pg_dump "${databaseUrl}" --schema-only --no-owner --no-privileges > "${backupFile}"`;
  try {
    execSync(pgDumpCmd, { stdio: "inherit", shell: SHELL });
    console.log(`[migrate] Schema backup saved to ${backupFile}`);
  } catch (error) {
    console.warn(
      "[migrate] pg_dump failed (may not be installed), skipping schema backup:",
      error
    );
  }

  const dataBackupFile = path.join(
    backupDir,
    `pre-migration-data-${timestamp}.sql`
  );
  const pgDumpDataCmd = `pg_dump "${databaseUrl}" --data-only --no-owner --no-privileges > "${dataBackupFile}"`;
  try {
    execSync(pgDumpDataCmd, { stdio: "inherit", shell: SHELL });
    console.log(`[migrate] Data backup saved to ${dataBackupFile}`);
  } catch (error) {
    console.warn(
      "[migrate] pg_dump data failed (may not be installed), skipping data backup:",
      error
    );
  }

  return backupFile;
}

export async function generateMigration(name: string): Promise<void> {
  console.log(`[migrate] Generating migration: ${name}`);
  execSync(
    `pnpm drizzle-kit generate --name=${name} --config=drizzle.config.ts`,
    {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
      shell: SHELL,
    }
  );
  console.log("[migrate] Migration generated.");
}

export async function checkDrift(): Promise<boolean> {
  console.log("[migrate] Checking for schema drift...");
  try {
    execSync("pnpm drizzle-kit check --config=drizzle.config.ts", {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
      shell: SHELL,
    });
    console.log("[migrate] No drift detected.");
    return false;
  } catch {
    console.log("[migrate] Drift detected.");
    return true;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "up":
        await up();
        break;
      case "down":
        await down(args[1]);
        break;
      case "status": {
        const s = await status();
        console.log(`Current: ${s.current}, Pending: ${s.pending}`);
        console.log("Applied:", s.applied);
        break;
      }
      case "backup":
        await backupBeforeMigrate();
        break;
      case "generate":
        if (!args[1]) throw new Error("Migration name required");
        await generateMigration(args[1]);
        break;
      case "check":
        await checkDrift();
        break;
      default:
        console.log(
          "Usage: pnpm tsx scripts/migrate.ts <up|down|status|backup|generate|check> [args]"
        );
        process.exit(1);
    }
  } catch (error) {
    console.error("[migrate] Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
