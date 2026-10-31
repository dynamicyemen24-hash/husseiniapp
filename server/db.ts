import { eq, sql } from "drizzle-orm";
import { Pool, PoolConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

let _db: NeonDatabase | null = null;
let _pool: Pool | null = null;
let _readPool: Pool | null = null;
let _warmed = false;
let _poolCreatedAt = 0;
let _readPoolCreatedAt = 0;

const POOL_MAX_CONNECTIONS = parseInt(process.env.DB_POOL_MAX || "10");
const POOL_IDLE_TIMEOUT_MS = parseInt(process.env.DB_POOL_IDLE || "30000");
const POOL_MAX_LIFETIME_MS = parseInt(process.env.DB_POOL_LIFETIME || "1800000");
const READ_POOL_MAX_CONNECTIONS = parseInt(process.env.DB_READ_POOL_MAX || "5");
const QUERY_TIMEOUT_MS = parseInt(process.env.DB_QUERY_TIMEOUT || "30000");
const ENABLE_QUERY_LOGGING = process.env.DB_QUERY_LOG === "true";

interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  slowQueries: number;
  errors: number;
  avgQueryTimeMs: number;
}

const poolMetrics: PoolMetrics = {
  totalConnections: 0,
  idleConnections: 0,
  waitingRequests: 0,
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  avgQueryTimeMs: 0,
};

const queryTimes: number[] = [];
const MAX_QUERY_TIME_SAMPLES = 1000;

function recordQueryTime(durationMs: number) {
  queryTimes.push(durationMs);
  if (queryTimes.length > MAX_QUERY_TIME_SAMPLES) {
    queryTimes.shift();
  }
  poolMetrics.totalQueries++;
  poolMetrics.avgQueryTimeMs = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
  if (durationMs > 1000) poolMetrics.slowQueries++;
}

function createPool(config: PoolConfig): Pool {
  const pool = new Pool(config);

  pool.on("connect", () => {
    poolMetrics.totalConnections++;
    if (!ENV.isProduction) logger.debug("[DB] New connection established");
  });

  pool.on("remove", () => {
    poolMetrics.totalConnections = Math.max(0, poolMetrics.totalConnections - 1);
    if (!ENV.isProduction) logger.debug("[DB] Connection removed");
  });

  pool.on("error", (err: Error) => {
    poolMetrics.errors++;
    logger.error("[DB] Pool error", { error: err.message });
  });

  return pool;
}

export function getPool(): Pool {
  const now = Date.now();

  if (_pool && now - _poolCreatedAt > POOL_MAX_LIFETIME_MS) {
    try {
      _pool.end().catch(() => {});
    } catch { /* pool cleanup best-effort */ }
    _pool = null;
    _db = null;
  }

  if (!_pool && process.env.DATABASE_URL) {
    _pool = createPool({
      connectionString: process.env.DATABASE_URL,
      max: POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      allowExitOnIdle: false,
    });
    _poolCreatedAt = now;
  }
  return _pool as Pool;
}

export function getReadPool(): Pool | null {
  const readUrl = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
  const now = Date.now();

  if (_readPool && now - _readPoolCreatedAt > POOL_MAX_LIFETIME_MS) {
    try {
      _readPool.end().catch(() => {});
    } catch { /* pool cleanup best-effort */ }
    _readPool = null;
  }

  if (!_readPool && readUrl) {
    _readPool = createPool({
      connectionString: readUrl,
      max: READ_POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      allowExitOnIdle: false,
    });
    _readPoolCreatedAt = now;
  }
  return _readPool;
}

export function getSql() {
  return getPool();
}

export async function getDb(useReadReplica = false): Promise<NeonDatabase | null> {
  if (useReadReplica) {
    const readPool = getReadPool();
    if (readPool) {
      return drizzle(readPool);
    }
  }
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(getPool());
} catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn("[Database] Failed to connect:", { error: err.message, stack: err.stack });
    _db = null;
  }
  }
  return _db;
}

export async function dbOrThrow(useReadReplica = false): Promise<NeonDatabase> {
  const db = await getDb(useReadReplica);
  if (!db) {
    throw new Error("DATABASE_UNAVAILABLE: قاعدة البيانات غير متاحة حالياً، حاول مرة أخرى لاحقاً");
  }
  return db;
}

export async function warmDatabase(): Promise<void> {
  if (_warmed) return;
  try {
    const db = await getDb();
    if (db) {
      await db.execute(sql`select 1`);
      _warmed = true;
    }
    const readPool = getReadPool();
    if (readPool) {
      await readPool.query("select 1");
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn("[Database] Warm-up failed (will retry in 5s):", { error: err.message, stack: err.stack });
    setTimeout(() => warmDatabase().catch(() => {}), 5000);
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`QUERY_TIMEOUT: ${operation} exceeded ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function executeWithMetrics<T>(
  operation: string,
  fn: () => Promise<T>,
  useReadReplica = false
): Promise<T> {
  const start = Date.now();
  try {
    const result = await withTimeout(fn(), QUERY_TIMEOUT_MS, operation);
    recordQueryTime(Date.now() - start);
    if (ENABLE_QUERY_LOGGING) {
      logger.debug("[DB] Query executed", { operation, durationMs: Date.now() - start, useReadReplica });
    }
    return result;
  } catch (error) {
    poolMetrics.errors++;
    logger.error("[DB] Query failed", { operation, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export function getPoolMetrics(): PoolMetrics {
  return { ...poolMetrics };
}

export function resetPoolMetrics(): void {
  poolMetrics.totalQueries = 0;
  poolMetrics.slowQueries = 0;
  poolMetrics.errors = 0;
  poolMetrics.avgQueryTimeMs = 0;
  queryTimes.length = 0;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.lastActivity !== undefined) {
      values.lastActivity = user.lastActivity;
      updateSet.lastActivity = user.lastActivity;
    }
    if (user.sessionCount !== undefined) {
      values.sessionCount = user.sessionCount;
      updateSet.sessionCount = user.sessionCount;
    }
    if (user.currentSessionId !== undefined) {
      values.currentSessionId = user.currentSessionId;
      updateSet.currentSessionId = user.currentSessionId;
    }
    if (user.passwordChangedAt !== undefined) {
      values.passwordChangedAt = user.passwordChangedAt;
      updateSet.passwordChangedAt = user.passwordChangedAt;
    }
    if (user.failedLoginAttempts !== undefined) {
      values.failedLoginAttempts = user.failedLoginAttempts;
      updateSet.failedLoginAttempts = user.failedLoginAttempts;
    }
    if (user.lockedUntil !== undefined) {
      values.lockedUntil = user.lockedUntil;
      updateSet.lockedUntil = user.lockedUntil;
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await executeWithMetrics("upsertUser", () =>
      db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("[Database] Failed to upsert user:", { error: err.message, stack: err.stack });
    throw err;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(true);
  if (!db) {
    logger.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  return executeWithMetrics("getUserByOpenId", async () => {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }, true);
}

export async function analyzeQueryPerformance(): Promise<{
  slowQueries: Array<{ query: string; avgMs: number; count: number }>;
  recommendations: string[];
}> {
  try {
    const db = await getDb(true);
    if (!db) return { slowQueries: [], recommendations: ["Database unavailable"] };

    const result = await db.execute(sql`
      SELECT query, mean_exec_time as avg_ms, calls
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `);

    const slowQueries = (result as unknown as Array<{ query: string; avg_ms: number; calls: number }>).map(r => ({
      query: r.query.substring(0, 200),
      avgMs: Number(r.avg_ms),
      count: Number(r.calls),
    }));

    const recommendations: string[] = [];
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} slow queries detected (>100ms avg)`);
      recommendations.push("Consider adding indexes for frequently filtered columns");
      recommendations.push("Review query plans with EXPLAIN ANALYZE");
    }

    return { slowQueries, recommendations };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn("[Database] Query performance analysis failed:", { error: err.message, stack: err.stack });
    return { slowQueries: [], recommendations: ["pg_stat_statements extension not available"] };
  }
}

export async function checkIndexUsage(): Promise<{
  unusedIndexes: Array<{ index: string; table: string; size: string }>;
  missingIndexes: Array<{ table: string; columns: string[]; reason: string }>;
}> {
  try {
    const db = await getDb(true);
    if (!db) return { unusedIndexes: [], missingIndexes: [] };

    const unused = await db.execute(sql`
      SELECT indexrelname as index, relname as table, pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      JOIN pg_index ON pg_index.indexrelid = pg_stat_user_indexes.indexrelid
      WHERE idx_scan = 0 AND schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20
    `);

    return {
      unusedIndexes: (unused as unknown as Array<{ index: string; table: string; size: string }>).map(r => ({
        index: r.index,
        table: r.table,
        size: r.size,
      })),
      missingIndexes: [],
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn("[Database] Index usage check failed:", { error: err.message, stack: err.stack });
    return { unusedIndexes: [], missingIndexes: [] };
  }
}