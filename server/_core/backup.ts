/**
 * server/_core/backup.ts — encrypted, verifiable tenant backups.
 *
 * Security model:
 *  - AES-256-GCM authenticated encryption; key derived from BACKUP_ENCRYPTION_KEY
 *    via scrypt with a per-backup random salt (never store the raw key).
 *  - Blob layout: MAGIC("ALSBK1\n") | salt(16) | iv(12) | authTag(16) | ciphertext.
 *  - SHA-256 checksum of the full blob is recorded in a sidecar manifest so any
 *    corruption or tampering is detected before a restore is attempted.
 *  - Production fails CLOSED: without BACKUP_ENCRYPTION_KEY no backup runs.
 *    In development a deterministic dev key is used with a loud warning.
 *
 * Storage model:
 *  - Primary durable target: S3 via storagePut when Forge credentials exist.
 *  - Fallback/self-hosted: local directory (ENV.backupDir, default .backups).
 *  - Users / login attempts / api keys / biometric templates are NEVER exported,
 *    so a stolen backup cannot leak credentials.
 *
 * Resilience model (no-failure policy):
 *  - Every external step is wrapped in withRetry + timeout from resilience.ts.
 *  - runNightlyBackupIfDue() never throws — cron ticks must not fail.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { promises as fs } from "fs";
import path from "path";
import { eq, getTableColumns } from "drizzle-orm";
import * as schema from "../../drizzle/schema";
import {
  intermediaryParties,
  documentPartyLinks,
  documentExpenses,
  promotions,
  approvalQueues,
  lineItemHistory,
  flexibleLineItems,
} from "../../drizzle/schema";
import type { PgTable } from "drizzle-orm/pg-core";
import { ENV } from "./env";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { withRetry, withTimeout } from "./resilience";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAGIC = Buffer.from("ALSBK1\n", "utf8");
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_COST = 16384; // N=2^14 — strong yet fast enough for serverless
const PAYLOAD_VERSION = 1;
/** Hard cap per table so one runaway table can't exhaust memory. */
const MAX_ROWS_PER_TABLE = 100_000;
const RESTORE_CHUNK = 200;

/**
 * Tables included in every backup. Credentials-bearing tables are deliberately
 * excluded (see header comment). `tenantScoped` rows are filtered by tenantId
 * when the backup scope is a single tenant.
 */
export const BACKUP_TABLES: ReadonlyArray<{
  name: string;
  table: PgTable;
  tenantScoped: boolean;
}> = [
  {
    name: "drizzle_migrations",
    table: schema.drizzleMigrations,
    tenantScoped: false,
  },
  { name: "tenants", table: schema.tenants, tenantScoped: false },
  { name: "branches", table: schema.branches, tenantScoped: true },
  { name: "accounts", table: schema.accounts, tenantScoped: true },
  { name: "transactions", table: schema.transactions, tenantScoped: true },
  { name: "journalEntries", table: schema.journalEntries, tenantScoped: true },
  {
    name: "openingBalances",
    table: schema.openingBalances,
    tenantScoped: true,
  },
  { name: "budgets", table: schema.budgets, tenantScoped: true },
  { name: "fiscalPeriods", table: schema.fiscalPeriods, tenantScoped: true },
  { name: "settings", table: schema.settings, tenantScoped: true },
  { name: "currencies", table: schema.currencies, tenantScoped: true },
  { name: "exchangeRates", table: schema.exchangeRates, tenantScoped: true },
  { name: "categories", table: schema.categories, tenantScoped: true },
  { name: "units", table: schema.units, tenantScoped: true },
  { name: "products", table: schema.products, tenantScoped: true },
  { name: "warehouses", table: schema.warehouses, tenantScoped: true },
  { name: "warehouseStock", table: schema.warehouseStock, tenantScoped: true },
  {
    name: "inventoryMovements",
    table: schema.inventoryMovements,
    tenantScoped: true,
  },
  {
    name: "inventoryBatches",
    table: schema.inventoryBatches,
    tenantScoped: true,
  },
  {
    name: "stockAdjustments",
    table: schema.stockAdjustments,
    tenantScoped: true,
  },
  {
    name: "intermediaryParties",
    table: schema.intermediaryParties,
    tenantScoped: true,
  },
  {
    name: "documentPartyLinks",
    table: schema.documentPartyLinks,
    tenantScoped: true,
  },
  {
    name: "documentExpenses",
    table: schema.documentExpenses,
    tenantScoped: true,
  },
  { name: "promotions", table: schema.promotions, tenantScoped: true },
  { name: "approvalQueues", table: schema.approvalQueues, tenantScoped: true },
  {
    name: "lineItemHistory",
    table: schema.lineItemHistory,
    tenantScoped: true,
  },
  {
    name: "flexibleLineItems",
    table: schema.flexibleLineItems,
    tenantScoped: true,
  },
  { name: "customers", table: schema.customers, tenantScoped: true },
  { name: "suppliers", table: schema.suppliers, tenantScoped: true },
  { name: "salesInvoices", table: schema.salesInvoices, tenantScoped: true },
  {
    name: "salesInvoiceItems",
    table: schema.salesInvoiceItems,
    tenantScoped: true,
  },
  {
    name: "purchaseInvoices",
    table: schema.purchaseInvoices,
    tenantScoped: true,
  },
  {
    name: "purchaseInvoiceItems",
    table: schema.purchaseInvoiceItems,
    tenantScoped: true,
  },
  { name: "payments", table: schema.payments, tenantScoped: true },
  { name: "posSessions", table: schema.posSessions, tenantScoped: true },
  { name: "posOrders", table: schema.posOrders, tenantScoped: true },
  { name: "employees", table: schema.employees, tenantScoped: true },
  { name: "payrollRuns", table: schema.payrollRuns, tenantScoped: true },
  { name: "payrollItems", table: schema.payrollItems, tenantScoped: true },
  { name: "procurements", table: schema.procurements, tenantScoped: true },
  {
    name: "procurementApprovals",
    table: schema.procurementApprovals,
    tenantScoped: true,
  },
];

// ─── Pure crypto primitives (unit-tested) ───────────────────────────────────

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN, { N: SCRYPT_COST });
}

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Encrypt + frame a plaintext buffer into a self-describing ALSBK1 blob. */
export function encryptPayload(plain: Buffer, secret: string): Buffer {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(secret, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, ct]);
}

/** Decrypt an ALSBK1 blob. Throws on wrong key or tampered auth tag. */
export function decryptPayload(blob: Buffer, secret: string): Buffer {
  if (blob.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error("backup blob too short / corrupted header");
  }
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("unknown backup format (bad magic)");
  }
  let offset = MAGIC.length;
  const salt = blob.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const iv = blob.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;
  const tag = blob.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ct = blob.subarray(offset);
  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

// ─── Export ─────────────────────────────────────────────────────────────────

async function exportTables(tenantId: number | null): Promise<{
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) throw new Error("database unavailable for backup export");

  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const entry of BACKUP_TABLES) {
    let query: any = db.select().from(entry.table);
    if (entry.tenantScoped && tenantId != null) {
      query = query.where(eq((entry.table as any).tenantId, tenantId));
    }
    const rows = (await withTimeout(
      query.limit(MAX_ROWS_PER_TABLE),
      60_000,
      `export:${entry.name}`
    )) as unknown[];
    tables[entry.name] = rows;
    counts[entry.name] = rows.length;
  }
  return { tables, counts };
}

// ─── Public API: run / verify / restore / list / nightly ────────────────────

export async function runBackup(
  tenantId: number | null
): Promise<BackupManifest> {
  const secret = resolveBackupSecret();
  if (!secret)
    throw new Error("BACKUP_ENCRYPTION_KEY is required in production");

  const startedAt = new Date().toISOString();
  const { tables, counts } = await withRetry(() => exportTables(tenantId), {
    label: "backup-export",
    retries: 2,
  });

  const payload = JSON.stringify({
    version: PAYLOAD_VERSION,
    createdAt: startedAt,
    scope: tenantId == null ? "all" : `tenant:${tenantId}`,
    tables,
  });
  const plain = Buffer.from(payload, "utf8");
  const compressed = gzipSync(plain);
  const blob = encryptPayload(compressed, secret);

  const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;

  const manifest: BackupManifest = {
    id,
    createdAt: startedAt,
    scope: tenantId == null ? "all" : `tenant:${tenantId}`,
    encrypted: true,
    algorithm: "aes-256-gcm/scrypt",
    payloadVersion: PAYLOAD_VERSION,
    originalSize: plain.length,
    compressedSize: compressed.length,
    encryptedSize: blob.length,
    sha256: sha256Hex(blob),
    keyFingerprint: fingerprint(secret),
    tableCounts: counts,
    totalRows: Object.values(counts).reduce<number>((a, b) => a + b, 0),
    storage: {},
  };

  // 1) Local copy (dev / self-hosted durable volume).
  try {
    await ensureDir(backupDir());
    const localFile = path.join(backupDir(), `${id}.alsbk`);
    await fs.writeFile(localFile, blob);
    manifest.storage.localFile = localFile;
  } catch (e) {
    console.warn("[backup] local write failed (continuing):", e);
  }

  // 2) Remote object storage when Forge/S3 is configured (primary in prod).
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    try {
      const put = await withTimeout(
        withRetry(() => storagePut(`backups/${id}.alsbk`, blob), {
          label: "backup-upload",
          retries: 3,
        }),
        120_000,
        "backup-upload"
      );
      manifest.storage.remoteKey = put.key;
      manifest.storage.remoteUrl = put.url;
    } catch (e) {
      console.warn("[backup] remote upload failed (local copy retained):", e);
    }
  }

  await saveManifest(manifest);
  console.log(
    `[backup] created ${id} scope=${manifest.scope} rows=${manifest.totalRows} sha256=${manifest.sha256.slice(0, 12)}…`
  );
  return manifest;
}

export async function listBackups(): Promise<BackupManifest[]> {
  return readIndex();
}

// ─── Verify & Restore ───────────────────────────────────────────────────────

export interface VerifyResult {
  ok: boolean;
  id: string;
  reason?: string;
  totalRows?: number;
}

/** Decrypt + decompress + structurally validate WITHOUT writing anything. */
export async function verifyBackup(id: string): Promise<VerifyResult> {
  const secret = resolveBackupSecret();
  if (!secret) return { ok: false, id, reason: "encryption key unavailable" };

  const manifest = (await readIndex()).find(m => m.id === id);
  if (!manifest) return { ok: false, id, reason: "manifest not found" };

  let blob: Buffer;
  try {
    blob = await loadBlob(manifest);
  } catch (e) {
    return {
      ok: false,
      id,
      reason: `blob unreadable: ${e instanceof Error ? e.message : e}`,
    };
  }

  if (sha256Hex(blob) !== manifest.sha256) {
    return {
      ok: false,
      id,
      reason: "checksum mismatch — file corrupted or tampered",
    };
  }
  if (fingerprint(secret) !== manifest.keyFingerprint) {
    return {
      ok: false,
      id,
      reason: "key fingerprint mismatch — different BACKUP_ENCRYPTION_KEY",
    };
  }

  try {
    const parsed = parsePayload(decryptPayload(blob, secret));
    const totalRows = Object.values(parsed.counts).reduce<number>(
      (a, b) => a + b,
      0
    );
    return { ok: true, id, totalRows };
  } catch (e) {
    return {
      ok: false,
      id,
      reason: `decrypt/decompress failed: ${e instanceof Error ? e.message : e}`,
    };
  }
}

async function loadBlob(manifest: BackupManifest): Promise<Buffer> {
  if (manifest.storage.localFile) {
    try {
      return await fs.readFile(manifest.storage.localFile);
    } catch {
      /* fall through to remote */
    }
  }
  if (manifest.storage.remoteUrl) {
    const resp = await fetch(manifest.storage.remoteUrl);
    if (!resp.ok) throw new Error(`remote fetch ${resp.status}`);
    return Buffer.from(await resp.arrayBuffer());
  }
  throw new Error("no local file or remote url in manifest");
}

interface ParsedPayload {
  version: number;
  createdAt: string;
  scope: string;
  tables: Record<string, Record<string, unknown>[]>;
  counts: Record<string, number>;
}

function parsePayload(plain: Buffer): ParsedPayload {
  const parsed = JSON.parse(
    gunzipSync(plain).toString("utf8")
  ) as ParsedPayload;
  if (!parsed || typeof parsed !== "object" || !parsed.tables) {
    throw new Error("payload structure invalid");
  }
  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(parsed.tables)) {
    if (!Array.isArray(rows)) throw new Error(`table ${name} is not an array`);
    counts[name] = rows.length;
  }
  return { ...parsed, counts };
}

export interface RestoreOptions {
  dryRun?: boolean;
}

export interface RestoreResult {
  id: string;
  dryRun: boolean;
  verified: VerifyResult;
  restoredRows?: Record<string, number>;
  note?: string;
}

/**
 * Restore a verified backup. dryRun (default) only validates.
 * A real restore inserts rows idempotently (conflicts skipped) in chunks with
 * retry — it never deletes existing data; a destructive wipe must be an
 * explicit DBA operation outside the app.
 */
export async function restoreBackup(
  id: string,
  options: RestoreOptions = {}
): Promise<RestoreResult> {
  const dryRun = options.dryRun !== false;
  const verified = await verifyBackup(id);
  if (!verified.ok) return { id, dryRun, verified };

  if (dryRun) {
    return { id, dryRun, verified, note: "dry-run only — no data written" };
  }

  const secret = resolveBackupSecret();
  if (!secret) {
    return {
      id,
      dryRun,
      verified: {
        ...verified,
        ok: false,
        reason: "encryption key unavailable",
      },
    };
  }

  const manifest = (await readIndex()).find(m => m.id === id);
  if (!manifest) {
    return {
      id,
      dryRun,
      verified: { ...verified, ok: false, reason: "manifest lost" },
    };
  }

  const db = await getDb();
  if (!db) {
    return {
      id,
      dryRun,
      verified: { ...verified, ok: false, reason: "database unavailable" },
    };
  }

  const blob = await loadBlob(manifest);
  const parsed = parsePayload(decryptPayload(blob, secret));

  const restoredRows: Record<string, number> = {};
  for (const entry of BACKUP_TABLES) {
    const rows = parsed.tables[entry.name];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const cols = getTableColumns(entry.table as any) as Record<
      string,
      { dataType?: string }
    >;
    let count = 0;
    for (let i = 0; i < rows.length; i += RESTORE_CHUNK) {
      const chunk = rows
        .slice(i, i + RESTORE_CHUNK)
        .map(row => reviveDates(row as Record<string, unknown>, cols));
      await withRetry(
        () =>
          db
            .insert(entry.table as any)
            .values(chunk)
            .onConflictDoNothing(),
        { label: `restore:${entry.name}`, retries: 2 }
      );
      count += chunk.length;
    }
    restoredRows[entry.name] = count;
  }
  return { id, dryRun, verified, restoredRows };
}

/** Convert ISO date strings back to Date objects for timestamp columns. */
function reviveDates(
  row: Record<string, unknown>,
  cols: Record<string, { dataType?: string }>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const col = cols[key];
    if (
      col?.dataType === "date" &&
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
    ) {
      out[key] = new Date(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ─── Nightly automation (cron-safe: never throws) ───────────────────────────

export interface NightlyBackupResult {
  attempted: boolean;
  skippedReason?: string;
  ok?: boolean;
  id?: string;
  error?: string;
  /** Consecutive failures AFTER this tick (0 on success/skip). */
  consecutiveFailures?: number;
  /** True when ops must be paged (≥2 consecutive failures). */
  alert?: boolean;
}

export interface BackupHealth {
  consecutiveFailures: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  /** Page ops when true (≥2 consecutive failures). */
  needsAlert: boolean;
}

const BACKUP_ALERT_THRESHOLD = 2;

function backupHealthFile(): string {
  return path.join(backupDir(), "backup-health.json");
}

export async function getBackupHealth(): Promise<BackupHealth> {
  try {
    const raw = await fs.readFile(backupHealthFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<BackupHealth>;
    const consecutiveFailures =
      typeof parsed.consecutiveFailures === "number"
        ? parsed.consecutiveFailures
        : 0;
    return {
      consecutiveFailures,
      lastFailureAt: parsed.lastFailureAt ?? null,
      lastSuccessAt: parsed.lastSuccessAt ?? null,
      lastError: parsed.lastError ?? null,
      needsAlert: consecutiveFailures >= BACKUP_ALERT_THRESHOLD,
    };
  } catch {
    return {
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastError: null,
      needsAlert: false,
    };
  }
}

async function writeBackupHealth(
  h: Omit<BackupHealth, "needsAlert">
): Promise<void> {
  try {
    await ensureDir(backupDir());
    const full: BackupHealth = {
      ...h,
      needsAlert: h.consecutiveFailures >= BACKUP_ALERT_THRESHOLD,
    };
    await fs.writeFile(
      backupHealthFile(),
      JSON.stringify(full, null, 2),
      "utf8"
    );
  } catch {
    /* health tracking must never break the backup itself */
  }
}

export async function recordBackupSuccess(): Promise<BackupHealth> {
  const prev = await getBackupHealth();
  const next = {
    consecutiveFailures: 0,
    lastFailureAt: prev.lastFailureAt,
    lastSuccessAt: new Date().toISOString(),
    lastError: null as string | null,
  };
  await writeBackupHealth(next);
  return { ...next, needsAlert: false };
}

export async function recordBackupFailure(err: unknown): Promise<BackupHealth> {
  const prev = await getBackupHealth();
  const message =
    err instanceof Error ? err.message : String(err ?? "unknown error");
  const next = {
    consecutiveFailures: prev.consecutiveFailures + 1,
    lastFailureAt: new Date().toISOString(),
    lastSuccessAt: prev.lastSuccessAt,
    lastError: message.slice(0, 500),
  };
  await writeBackupHealth(next);
  const health: BackupHealth = {
    ...next,
    needsAlert: next.consecutiveFailures >= BACKUP_ALERT_THRESHOLD,
  };
  console.error(
    `[backup] failure #${next.consecutiveFailures}: ${message}` +
      (health.needsAlert
        ? " — ALERT: 2+ consecutive backup failures, paging ops (see docs/OPERATIONS_RUNBOOK.md)"
        : "")
  );
  if (health.needsAlert) {
    try {
      // Paging signal: 2+ consecutive failures. Same captureContext shape as
      // server/serverless/cron.ts so both alerts join in Sentry on one issue.
      const Sentry = await import("@sentry/node");
      Sentry.captureMessage(
        `backup failures x${next.consecutiveFailures}: ${message}`,
        {
          level: "error",
          tags: {
            alert: "backup",
            consecutive_failures: String(next.consecutiveFailures),
          },
        }
      );
    } catch {
      /* Sentry optional */
    }
  }
  return health;
}

/**
 * Runs at most once per calendar day (UTC). Called from the hourly cron tick;
 * any failure is caught and reported, never propagated.
 */
export async function runNightlyBackupIfDue(): Promise<NightlyBackupResult> {
  try {
    if (!resolveBackupSecret()) {
      // Fail-closed: no key → no backup. In production this is a paging
      // condition, not a silent skip — surface it so the 2-failure alert
      // and the runbook catch it.
      if (ENV.isProduction) {
        const health = await recordBackupFailure(
          new Error("BACKUP_ENCRYPTION_KEY missing in production (fail-closed)")
        );
        return {
          attempted: false,
          skippedReason: "encryption key not configured (fail-closed)",
          consecutiveFailures: health.consecutiveFailures,
          alert: health.needsAlert,
        };
      }
      return {
        attempted: false,
        skippedReason: "encryption key not configured",
        consecutiveFailures: 0,
        alert: false,
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    const markerPath = path.join(backupDir(), "lastNightlyRun.txt");
    let lastRun = "";
    try {
      lastRun = (await fs.readFile(markerPath, "utf8")).trim();
    } catch {
      /* first run */
    }
    if (lastRun === today) {
      const health = await getBackupHealth();
      return {
        attempted: false,
        skippedReason: "already ran today",
        consecutiveFailures: health.consecutiveFailures,
        alert: health.needsAlert,
      };
    }

    const manifest = await runBackup(null);
    await ensureDir(backupDir());
    await fs.writeFile(markerPath, today, "utf8");
    await recordBackupSuccess();

    // Retention: keep the 30 most recent entries; prune local blobs beyond it.
    const index = await readIndex();
    if (index.length > 30) {
      const removed = index.splice(30);
      await writeIndex(index);
      for (const m of removed) {
        if (m.storage.localFile) {
          await fs.rm(m.storage.localFile, { force: true }).catch(() => {});
          await fs
            .rm(`${m.storage.localFile}.manifest.json`, { force: true })
            .catch(() => {});
        }
      }
    }
    return {
      attempted: true,
      ok: true,
      id: manifest.id,
      consecutiveFailures: 0,
      alert: false,
    };
  } catch (e) {
    // NEVER let the backup break the cron tick.
    console.error("[backup] nightly backup failed:", e);
    const health = await recordBackupFailure(e);
    return {
      attempted: true,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      consecutiveFailures: health.consecutiveFailures,
      alert: health.needsAlert,
    };
  }
}

/** Resolve the encryption secret. Production without a key → null (fail closed). */
const DEV_FALLBACK_KEY = "alhusainia-dev-backup-key-do-not-use-in-production";

export function resolveBackupSecret(): string | null {
  const configured = ENV.backupEncryptionKey?.trim();
  if (configured && configured.length >= 16) return configured;
  if (!ENV.isProduction) {
    console.warn(
      "[backup] BACKUP_ENCRYPTION_KEY not set — using INSECURE dev fallback key."
    );
    return DEV_FALLBACK_KEY;
  }
  console.error(
    "[backup] BACKUP_ENCRYPTION_KEY missing in production — backups are disabled (fail closed)."
  );
  return null;
}

function backupDir(): string {
  return ENV.backupDir || path.join(process.cwd(), ".backups");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

// ─── Manifests ──────────────────────────────────────────────────────────────

export interface BackupManifest {
  id: string;
  createdAt: string;
  /** "tenant:<id>" or "all" */
  scope: string;
  encrypted: true;
  algorithm: "aes-256-gcm/scrypt";
  payloadVersion: number;
  originalSize: number;
  compressedSize: number;
  encryptedSize: number;
  sha256: string;
  keyFingerprint: string;
  tableCounts: Record<string, number>;
  totalRows: number;
  storage: {
    localFile?: string;
    remoteKey?: string;
    remoteUrl?: string;
  };
}

function fingerprint(secret: string): string {
  return sha256Hex(Buffer.from(secret, "utf8")).slice(0, 8);
}

async function readIndex(): Promise<BackupManifest[]> {
  try {
    const raw = await fs.readFile(path.join(backupDir(), "index.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(list: BackupManifest[]): Promise<void> {
  await ensureDir(backupDir());
  await fs.writeFile(
    path.join(backupDir(), "index.json"),
    JSON.stringify(list, null, 2),
    "utf8"
  );
}

async function saveManifest(manifest: BackupManifest): Promise<void> {
  const list = await readIndex();
  list.unshift(manifest);
  await writeIndex(list.slice(0, 500));
  // Sidecar next to the local blob (if any).
  if (manifest.storage.localFile) {
    await fs.writeFile(
      `${manifest.storage.localFile}.manifest.json`,
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
  }
}
