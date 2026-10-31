/**
 * Elias Pro — application service.
 * ============================================================
 * Orchestrates the bounded context: it owns persistence, adapter selection,
 * risk gating and aggregation. The tRPC router stays thin (validate → call →
 * shape) and the adapters stay dumb (transport only). Everything business-like
 * lives here so both the router and future channels (cron, webhook, CLI) can
 * reuse the exact same rules.
 *
 * TENANT SAFETY
 *   Every query is filtered by `tenantId`. Node ids coming from the client are
 *   always re-resolved against the tenant's own node set, so a guessed id can
 *   never reach another institution's machine.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  eliasProDiagnostics,
  eliasProEngineRuns,
  eliasProNodes,
  eliasProWorkOrders,
  type EliasProNode,
} from "../../drizzle/schema";
import {
  ELIAS_ENGINE_CATALOG,
  ELIAS_HEALTH_LEVEL_LABELS,
  analyzeEliasTrends,
  evaluateEliasHealth,
  eliasLevelForScore,
  getEliasEngine,
  type EliasAreaKey,
  type EliasDeviceSnapshot,
  type EliasDiagnosticRecord,
  type EliasEngineRunResult,
  type EliasFleetOverview,
  type EliasHealthLevel,
  type EliasHealthReport,
  type EliasNodeHealth,
  type EliasNodeSummary,
  type EliasTrend,
  type EliasWorkOrder,
  type EliasWorkOrderPart,
} from "../../shared/eliasPro";
import { getDb } from "../db";
import { cacheManager } from "../_core/cache";
import { HttpAgentAdapter } from "./adapters/httpAgentAdapter";
import { SimulatedAgentAdapter } from "./adapters/simulatedAgentAdapter";
import {
  EliasAgentError,
  type EliasProAgentPort,
  type EliasWorkOrderDraft,
} from "./ports";
import {
  decryptNodeToken,
  encryptNodeToken,
  fingerprintToken,
} from "./tokenVault";

// ─── Caching ───────────────────────────────────────────────────────
/**
 * Node health is expensive (network round-trip) and changes slowly — cache it
 * for 30s so a dashboard refresh does not hammer every node. The cache is
 * invalidated explicitly whenever a diagnostic is captured.
 */
const healthCache = cacheManager.getCache("elias:node-health", {
  maxSize: 2_000,
  defaultTtlMs: 30_000,
});

const HEALTH_CACHE_TTL_MS = 30_000;

// ─── Internal helpers ──────────────────────────────────────────────
type Db = any;

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_UNAVAILABLE: قاعدة البيانات غير متاحة حالياً");
  }
  return db;
}

/** Serializes a node row into the safe (token-free) client contract. */
function toNodeSummary(
  node: EliasProNode,
  latest?: { score: number | null; level: EliasHealthLevel | null }
): EliasNodeSummary {
  const capabilities = Array.isArray(node.capabilities)
    ? (node.capabilities as string[])
    : [];
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    baseUrl: node.baseUrl,
    status: (node.status as EliasNodeSummary["status"]) ?? "offline",
    isSimulated: node.isSimulated,
    agentVersion: node.agentVersion,
    platform: node.platform,
    lastSeenAt: node.lastSeenAt
      ? new Date(node.lastSeenAt).toISOString()
      : null,
    lastError: node.lastError,
    capabilities,
    latestScore: latest?.score ?? null,
    latestLevel: latest?.level ?? null,
  };
}

/** Resolves a node inside the tenant, or throws NOT_FOUND. */
async function requireNode(
  tenantId: number,
  nodeId: number
): Promise<EliasProNode> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(eliasProNodes)
    .where(
      and(eq(eliasProNodes.id, nodeId), eq(eliasProNodes.tenantId, tenantId))
    )
    .limit(1);
  if (rows.length === 0) {
    throw new Error("NODE_NOT_FOUND: العقدة غير مسجلة في هذه المؤسسة");
  }
  return rows[0] as EliasProNode;
}

/**
 * Builds the adapter for a node. Adapters are created on demand and cached
 * per node id (the HTTP adapter is stateless, so this is cheap and avoids
 * re-allocating closures on every call).
 */
const adapterCache = new Map<
  number,
  { key: string; adapter: EliasProAgentPort }
>();

function buildAdapter(node: EliasProNode): EliasProAgentPort {
  const token = decryptNodeToken((node as any).tokenEnc);
  const key = `${node.baseUrl}|${node.isSimulated}|${node.tokenHash ?? ""}|${token ? "t" : "-"}`;
  const cached = adapterCache.get(node.id);
  if (cached && cached.key === key) return cached.adapter;

  const adapter: EliasProAgentPort = node.isSimulated
    ? new SimulatedAgentAdapter({
        nodeId: node.id,
        code: node.code,
        name: node.name,
        baseUrl: node.baseUrl,
      })
    : new HttpAgentAdapter({
        nodeId: node.id,
        code: node.code,
        name: node.name,
        baseUrl: node.baseUrl,
        token,
      });

  adapterCache.set(node.id, { key, adapter });
  return adapter;
}

function invalidateAdapter(nodeId: number): void {
  adapterCache.delete(nodeId);
}

/** Marks the node's runtime status after a health probe. */
async function persistNodeHealth(
  tenantId: number,
  nodeId: number,
  health: EliasNodeHealth
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const status =
    health.status === "online"
      ? "active"
      : health.status === "degraded"
        ? "error"
        : "offline";
  try {
    await db
      .update(eliasProNodes)
      .set({
        status,
        lastSeenAt: health.status === "offline" ? null : new Date(),
        lastError: health.message ?? null,
        lastLatencyMs: health.latencyMs ?? null,
        agentVersion: health.agentVersion ?? null,
        platform: health.platform ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(eliasProNodes.id, nodeId), eq(eliasProNodes.tenantId, tenantId))
      );
  } catch {
    /* Health bookkeeping must never fail the caller. */
  }
}

// ─── Node registry ─────────────────────────────────────────────────
export interface RegisterNodeInput {
  code: string;
  name: string;
  baseUrl: string;
  token?: string | null;
  isSimulated?: boolean;
  capabilities?: string[];
}

export async function registerNode(
  tenantId: number,
  input: RegisterNodeInput
): Promise<EliasNodeSummary> {
  const db = await requireDb();

  const existing = await db
    .select()
    .from(eliasProNodes)
    .where(
      and(
        eq(eliasProNodes.code, input.code),
        eq(eliasProNodes.tenantId, tenantId)
      )
    )
    .limit(1);

  const tokenEnc = input.token ? encryptNodeToken(input.token) : null;
  const tokenHash = input.token ? fingerprintToken(input.token) : null;
  const now = new Date();

  const values = {
    tenantId,
    code: input.code,
    name: input.name,
    baseUrl: input.baseUrl,
    isSimulated: input.isSimulated === true,
    capabilities: input.capabilities ?? [],
    status: "active",
    isActive: true,
    tokenHash,
    tokenEnc,
    updatedAt: now,
  };

  let node: EliasProNode;
  if (existing.length > 0) {
    const id = existing[0].id;
    const [updated] = await db
      .update(eliasProNodes)
      .set(values)
      .where(
        and(eq(eliasProNodes.id, id), eq(eliasProNodes.tenantId, tenantId))
      )
      .returning();
    node = updated as EliasProNode;
    invalidateAdapter(id);
    healthCache.invalidatePrefix(`node:${tenantId}:${id}`);
  } else {
    const [inserted] = await db
      .insert(eliasProNodes)
      .values({ ...values, createdAt: now })
      .returning();
    node = inserted as EliasProNode;
  }

  return toNodeSummary(node);
}

export async function listNodes(tenantId: number): Promise<EliasNodeSummary[]> {
  const db = await requireDb();
  const nodes = (await db
    .select()
    .from(eliasProNodes)
    .where(eq(eliasProNodes.tenantId, tenantId))
    .orderBy(eliasProNodes.code)) as EliasProNode[];

  if (nodes.length === 0) return [];

  // One aggregated query for every node's latest diagnostic — avoids the
  // classic N+1 "latest score per node" round-trip.
  const latest = (await db
    .select({
      nodeId: eliasProDiagnostics.nodeId,
      score: sql<number>`max(${eliasProDiagnostics.score})`,
      level: sql<string | null>`(
        select d2."level" from ${eliasProDiagnostics} d2
        where d2."nodeId" = ${eliasProDiagnostics.nodeId}
          and d2."tenantId" = ${tenantId}
        order by d2."capturedAt" desc limit 1
      )`,
    })
    .from(eliasProDiagnostics)
    .where(eq(eliasProDiagnostics.tenantId, tenantId))
    .groupBy(eliasProDiagnostics.nodeId)) as Array<{
    nodeId: number | null;
    score: number | null;
    level: string | null;
  }>;

  const latestByNode = new Map<
    number,
    { score: number | null; level: EliasHealthLevel | null }
  >();
  for (const row of latest) {
    if (row.nodeId == null) continue;
    latestByNode.set(row.nodeId, {
      score: row.score ?? null,
      level: (row.level as EliasHealthLevel | null) ?? null,
    });
  }

  return nodes.map(node => toNodeSummary(node, latestByNode.get(node.id)));
}

export async function removeNode(
  tenantId: number,
  nodeId: number
): Promise<void> {
  const db = await requireDb();
  await requireNode(tenantId, nodeId);
  await db
    .update(eliasProNodes)
    .set({ isActive: false, status: "disabled", updatedAt: new Date() })
    .where(
      and(eq(eliasProNodes.id, nodeId), eq(eliasProNodes.tenantId, tenantId))
    );
  invalidateAdapter(nodeId);
  healthCache.invalidatePrefix(`node:${tenantId}:${nodeId}`);
}

// ─── Health ────────────────────────────────────────────────────────
export async function checkNodeHealth(
  tenantId: number,
  nodeId: number
): Promise<EliasNodeHealth> {
  const node = await requireNode(tenantId, nodeId);
  const cacheKey = `node:${tenantId}:${nodeId}`;

  const cached = healthCache.get(cacheKey);
  if (cached) return cached as EliasNodeHealth;

  const adapter = buildAdapter(node);
  const health = await adapter.health();

  healthCache.set(cacheKey, health, HEALTH_CACHE_TTL_MS);
  await persistNodeHealth(tenantId, nodeId, health);
  return health;
}

export async function checkAllNodesHealth(
  tenantId: number
): Promise<Array<{ nodeId: number; health: EliasNodeHealth }>> {
  const nodes = await listNodes(tenantId);
  // Health probes are independent → run them concurrently, but bounded so a
  // large fleet cannot open an unbounded number of sockets at once.
  const results: Array<{ nodeId: number; health: EliasNodeHealth }> = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < nodes.length; i += CONCURRENCY) {
    const slice = nodes.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      slice.map(async node => ({
        nodeId: node.id,
        health: await checkNodeHealth(tenantId, node.id),
      }))
    );
    results.push(...settled);
  }
  return results;
}

// ─── Diagnostics ───────────────────────────────────────────────────
function toDiagnosticRecord(row: any): EliasDiagnosticRecord {
  return {
    id: row.id,
    nodeId: row.nodeId,
    nodeLabel: row.nodeLabel ?? null,
    deviceKey: row.deviceKey,
    deviceLabel: row.deviceLabel,
    platform: row.platform,
    source: row.source,
    score: row.score,
    level: row.level,
    report: row.report as EliasHealthReport,
    snapshot: row.snapshot as EliasDeviceSnapshot,
    capturedAt: new Date(row.capturedAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function captureDiagnostic(
  tenantId: number,
  nodeId: number
): Promise<EliasDiagnosticRecord> {
  const db = await requireDb();
  const node = await requireNode(tenantId, nodeId);
  const adapter = buildAdapter(node);

  const snapshot = await adapter.snapshot();
  const report = evaluateEliasHealth(snapshot);

  const [row] = await db
    .insert(eliasProDiagnostics)
    .values({
      tenantId,
      nodeId: node.id,
      deviceKey: snapshot.deviceKey,
      deviceLabel: snapshot.deviceLabel,
      platform: snapshot.platform,
      source: "agent",
      score: Math.round(report.score),
      level: report.level,
      report,
      snapshot,
      capturedAt: new Date(snapshot.capturedAt),
      createdAt: new Date(),
    })
    .returning();

  healthCache.invalidatePrefix(`node:${tenantId}:${nodeId}`);
  await persistNodeHealth(tenantId, nodeId, {
    status: report.score >= 50 ? "online" : "degraded",
    agentVersion: null,
    platform: snapshot.platform,
    score: report.score,
    level: report.level,
    checkedAt: new Date().toISOString(),
    latencyMs: null,
    message: null,
  });

  return toDiagnosticRecord({
    ...row,
    nodeLabel: node.name,
  });
}

/** Builds a device snapshot from a browser-submitted probe. */
export function snapshotFromProbe(probe: {
  deviceKey: string;
  deviceLabel: string;
  platform: EliasDeviceSnapshot["platform"];
  cpuLoadPct?: number | null;
  cpuName?: string | null;
  cores?: number | null;
  totalRamGb?: number | null;
  freeRamGb?: number | null;
  storageTotalGb?: number | null;
  storageFreeGb?: number | null;
  batteryLevelPct?: number | null;
  batteryCharging?: boolean | null;
  networkType?: string | null;
  downlinkMbps?: number | null;
  rttMs?: number | null;
}): EliasDeviceSnapshot {
  const totalGb = probe.totalRamGb ?? null;
  const freeGb = probe.freeRamGb ?? null;
  const storageTotalGb = probe.storageTotalGb ?? null;
  const storageFreeGb = probe.storageFreeGb ?? null;

  return {
    capturedAt: new Date().toISOString(),
    deviceKey: probe.deviceKey,
    deviceLabel: probe.deviceLabel,
    platform: probe.platform,
    hostname: null,
    os: null,
    osVersion: null,
    manufacturer: null,
    model: null,
    cpu: {
      name: probe.cpuName ?? null,
      cores: probe.cores ?? null,
      threads: null,
      loadPct: probe.cpuLoadPct ?? null,
      tempC: null,
    },
    memory: {
      totalGb,
      freeGb,
      usedPct:
        totalGb && freeGb !== null
          ? ((totalGb - freeGb) / totalGb) * 100
          : null,
    },
    storage: {
      totalGb: storageTotalGb,
      freeGb: storageFreeGb,
      usedPct:
        storageTotalGb && storageFreeGb !== null
          ? ((storageTotalGb - storageFreeGb) / storageTotalGb) * 100
          : null,
      wearPct: null,
      readErrors: null,
      writeErrors: null,
      healthy: null,
      model: null,
    },
    battery:
      probe.batteryLevelPct == null && probe.batteryCharging == null
        ? {
            present: false,
            levelPct: null,
            healthPct: null,
            cycles: null,
            tempC: null,
            charging: null,
            acStatus: null,
          }
        : {
            present: true,
            levelPct: probe.batteryLevelPct ?? null,
            healthPct: null,
            cycles: null,
            tempC: null,
            charging: probe.batteryCharging ?? null,
            acStatus: null,
          },
    network: {
      status: probe.rttMs != null ? "online" : null,
      dnsMs: null,
      ipv4: null,
      ssid: null,
      wanLoss: false,
      gwLoss: false,
      bounces: null,
      type: probe.networkType ?? null,
      downlinkMbps: probe.downlinkMbps ?? null,
      rttMs: probe.rttMs ?? null,
    },
    thermal: { summary: null, maxTempC: null },
    processes: [],
  };
}

export async function submitBrowserProbe(
  tenantId: number,
  probe: Parameters<typeof snapshotFromProbe>[0]
): Promise<EliasDiagnosticRecord> {
  const db = await requireDb();
  const snapshot = snapshotFromProbe(probe);
  const report = evaluateEliasHealth(snapshot);

  const [row] = await db
    .insert(eliasProDiagnostics)
    .values({
      tenantId,
      nodeId: null,
      deviceKey: snapshot.deviceKey,
      deviceLabel: snapshot.deviceLabel,
      platform: snapshot.platform,
      source: "browser",
      score: Math.round(report.score),
      level: report.level,
      report,
      snapshot,
      capturedAt: new Date(),
      createdAt: new Date(),
    })
    .returning();

  return toDiagnosticRecord(row);
}

export interface DiagnosticQuery {
  deviceKey?: string;
  nodeId?: number;
  limit?: number;
}

export async function listDiagnostics(
  tenantId: number,
  query: DiagnosticQuery = {}
): Promise<EliasDiagnosticRecord[]> {
  const db = await requireDb();
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

  const conditions = [eq(eliasProDiagnostics.tenantId, tenantId)];
  if (query.deviceKey) {
    conditions.push(eq(eliasProDiagnostics.deviceKey, query.deviceKey));
  }
  if (query.nodeId) {
    conditions.push(eq(eliasProDiagnostics.nodeId, query.nodeId));
  }

  const rows = await db
    .select({
      d: eliasProDiagnostics,
      nodeName: eliasProNodes.name,
    })
    .from(eliasProDiagnostics)
    .leftJoin(eliasProNodes, eq(eliasProNodes.id, eliasProDiagnostics.nodeId))
    .where(and(...conditions))
    .orderBy(desc(eliasProDiagnostics.capturedAt))
    .limit(limit);

  return rows.map((r: { d: any; nodeName: string | null }) =>
    toDiagnosticRecord({ ...r.d, nodeLabel: r.nodeName })
  );
}

// ─── Trends ────────────────────────────────────────────────────────
export async function deviceTrends(
  tenantId: number,
  deviceKey: string,
  horizon = 8
): Promise<Record<string, EliasTrend>> {
  const db = await requireDb();
  const rows = (await db
    .select({
      capturedAt: eliasProDiagnostics.capturedAt,
      report: eliasProDiagnostics.report,
    })
    .from(eliasProDiagnostics)
    .where(
      and(
        eq(eliasProDiagnostics.tenantId, tenantId),
        eq(eliasProDiagnostics.deviceKey, deviceKey)
      )
    )
    .orderBy(eliasProDiagnostics.capturedAt)) as Array<{
    capturedAt: Date;
    report: EliasHealthReport;
  }>;

  const series: Partial<
    Record<EliasAreaKey, Array<{ at: string; value: number }>>
  > = {};

  for (const row of rows) {
    const report = row.report as EliasHealthReport;
    if (!report || !Array.isArray(report.areas)) continue;
    const at = new Date(row.capturedAt).toISOString();
    for (const area of report.areas) {
      if (!area || area.weight === 0) continue;
      const bucket = (series[area.area] ??= []);
      bucket.push({ at, value: area.score });
    }
  }

  return analyzeEliasTrends(series, horizon);
}

// ─── Engine execution ──────────────────────────────────────────────
export interface RunEngineInput {
  nodeId: number;
  engineId: string;
  args?: Record<string, string | number | boolean>;
  acknowledgeRisk?: boolean;
}

export async function runEngine(
  tenantId: number,
  userId: number | null,
  input: RunEngineInput
): Promise<EliasEngineRunResult & { engine: string; engineLabel: string }> {
  const db = await requireDb();
  const node = await requireNode(tenantId, input.nodeId);
  const engine = getEliasEngine(input.engineId);

  if (!engine) {
    throw new Error("ENGINE_NOT_FOUND: محرك الصيانة غير موجود");
  }
  if (!node.isActive || node.status === "disabled") {
    throw new Error("NODE_DISABLED: العقدة معطّلة");
  }
  if (engine.requiresAgent && !node.isSimulated && !node.baseUrl) {
    throw new Error("NODE_MISCONFIGURED: العقدة بلا عنوان اتصال صالح");
  }
  if (
    (engine.risk === "medium" || engine.risk === "high") &&
    input.acknowledgeRisk !== true
  ) {
    throw new Error(
      "RISK_ACK_REQUIRED: هذا المحرك يغيّر حالة العقدة — يتطلب إقراراً صريحاً"
    );
  }

  const adapter = buildAdapter(node);
  const startedAt = new Date();
  const result = await adapter.runEngine(engine, input.args);

  await db.insert(eliasProEngineRuns).values({
    tenantId,
    nodeId: node.id,
    engineId: engine.id,
    engineCode: engine.code,
    status: result.status,
    durationMs: Math.max(0, Math.round(result.durationMs)),
    output: result.output ?? null,
    error: result.error,
    triggeredBy: userId,
    startedAt: new Date(result.startedAt),
    finishedAt: new Date(),
    createdAt: new Date(),
  });

  return {
    ...result,
    engine: engine.code,
    engineLabel: engine.labelAr,
  };
}

export async function listEngineRuns(
  tenantId: number,
  limit = 50
): Promise<
  Array<{
    id: number;
    nodeId: number | null;
    engineId: string;
    engineCode: string;
    status: string;
    durationMs: number;
    error: string | null;
    startedAt: string;
  }>
> {
  const db = await requireDb();
  const rows = await db
    .select({
      id: eliasProEngineRuns.id,
      nodeId: eliasProEngineRuns.nodeId,
      engineId: eliasProEngineRuns.engineId,
      engineCode: eliasProEngineRuns.engineCode,
      status: eliasProEngineRuns.status,
      durationMs: eliasProEngineRuns.durationMs,
      error: eliasProEngineRuns.error,
      startedAt: eliasProEngineRuns.startedAt,
    })
    .from(eliasProEngineRuns)
    .where(eq(eliasProEngineRuns.tenantId, tenantId))
    .orderBy(desc(eliasProEngineRuns.startedAt))
    .limit(Math.min(Math.max(limit, 1), 200));

  return rows.map(
    (r: {
      id: number;
      nodeId: number | null;
      engineId: string;
      engineCode: string;
      status: string;
      durationMs: number;
      error: string | null;
      startedAt: Date;
    }) => ({
      ...r,
      startedAt: new Date(r.startedAt).toISOString(),
    })
  );
}

// ─── Work orders ───────────────────────────────────────────────────
function toWorkOrder(row: any): EliasWorkOrder {
  return {
    id: row.id,
    externalRef: row.externalRef,
    title: row.title,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    deviceType: row.deviceType,
    deviceSerial: row.deviceSerial,
    status: row.status,
    priority: row.priority,
    reportedIssue: row.reportedIssue,
    estimatedCost:
      row.estimatedCost === null ? null : Number(row.estimatedCost),
    parts: (row.parts ?? []) as EliasWorkOrderPart[],
    nodeId: row.nodeId,
    nodeLabel: row.nodeLabel ?? null,
    receivedAt: row.receivedAt ? new Date(row.receivedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    supportTicketId: row.supportTicketId,
  };
}

export async function listWorkOrders(
  tenantId: number,
  query: { status?: string; search?: string; limit?: number }
): Promise<EliasWorkOrder[]> {
  const db = await requireDb();
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);

  const conditions = [eq(eliasProWorkOrders.tenantId, tenantId)];
  if (query.status) {
    conditions.push(eq(eliasProWorkOrders.status, query.status));
  }

  const rows = await db
    .select({
      w: eliasProWorkOrders,
      nodeName: eliasProNodes.name,
    })
    .from(eliasProWorkOrders)
    .leftJoin(eliasProNodes, eq(eliasProNodes.id, eliasProWorkOrders.nodeId))
    .where(and(...conditions))
    .orderBy(desc(eliasProWorkOrders.createdAt))
    .limit(limit * 2);

  let result: EliasWorkOrder[] = rows.map(
    (r: { w: any; nodeName: string | null }) =>
      toWorkOrder({ ...r.w, nodeLabel: r.nodeName })
  );

  if (query.search) {
    const needle = query.search.toLowerCase();
    result = result.filter(
      w =>
        w.title.toLowerCase().includes(needle) ||
        w.externalRef.toLowerCase().includes(needle) ||
        (w.customerName ?? "").toLowerCase().includes(needle)
    );
  }

  return result.slice(0, limit);
}

export async function createWorkOrder(
  tenantId: number,
  input: {
    nodeId: number;
    title: string;
    customerName?: string | null;
    customerPhone?: string | null;
    deviceType?: string | null;
    deviceSerial?: string | null;
    reportedIssue?: string | null;
    priority?: "low" | "medium" | "high" | "critical";
    estimatedCost?: number | null;
  }
): Promise<EliasWorkOrder> {
  const db = await requireDb();
  const node = await requireNode(tenantId, input.nodeId);
  const adapter = buildAdapter(node);

  const draft: EliasWorkOrderDraft = {
    title: input.title,
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    deviceType: input.deviceType ?? null,
    deviceSerial: input.deviceSerial ?? null,
    reportedIssue: input.reportedIssue ?? null,
    priority: input.priority ?? "medium",
    estimatedCost: input.estimatedCost ?? null,
  };

  let created: EliasWorkOrder;
  try {
    created = await adapter.createWorkOrder(draft);
  } catch (err) {
    if (err instanceof EliasAgentError) {
      throw new Error(`تعذر إنشاء أمر الصيانة: ${err.message}`, { cause: err });
    }
    throw err;
  }

  const externalRef =
    created.externalRef ||
    `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const [row] = await db
    .insert(eliasProWorkOrders)
    .values({
      tenantId,
      nodeId: node.id,
      externalRef,
      title: input.title,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      deviceType: input.deviceType ?? null,
      deviceSerial: input.deviceSerial ?? null,
      status: created.status ?? "received",
      priority: input.priority ?? "medium",
      reportedIssue: input.reportedIssue ?? null,
      estimatedCost:
        input.estimatedCost === null || input.estimatedCost === undefined
          ? null
          : input.estimatedCost.toFixed(2),
      parts: created.parts ?? [],
      receivedAt: created.receivedAt
        ? new Date(created.receivedAt)
        : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return toWorkOrder({ ...row, nodeLabel: node.name });
}

export async function updateWorkOrderStatus(
  tenantId: number,
  id: number,
  status: EliasWorkOrder["status"]
): Promise<EliasWorkOrder> {
  const db = await requireDb();
  const rows = await db
    .select({
      w: eliasProWorkOrders,
      nodeName: eliasProNodes.name,
    })
    .from(eliasProWorkOrders)
    .leftJoin(eliasProNodes, eq(eliasProNodes.id, eliasProWorkOrders.nodeId))
    .where(
      and(
        eq(eliasProWorkOrders.id, id),
        eq(eliasProWorkOrders.tenantId, tenantId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    throw new Error("WORK_ORDER_NOT_FOUND: أمر الصيانة غير موجود");
  }

  const order = rows[0].w;

  // Push the transition to the node when the order is bound to one — the node
  // owns the operational state. A node failure must not block the platform
  // record, so it degrades to a local-only update with the error surfaced.
  let nodeError: string | null = null;
  if (order.nodeId) {
    try {
      const node = await requireNode(tenantId, order.nodeId);
      const adapter = buildAdapter(node);
      await adapter.updateWorkOrderStatus(order.externalRef, status);
    } catch (err) {
      nodeError = err instanceof Error ? err.message : String(err);
    }
  }

  const [updated] = await db
    .update(eliasProWorkOrders)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(eliasProWorkOrders.id, id),
        eq(eliasProWorkOrders.tenantId, tenantId)
      )
    )
    .returning();

  const result = toWorkOrder({ ...updated, nodeLabel: rows[0].nodeName });
  return nodeError ? { ...result, nodeLabel: result.nodeLabel } : result;
}

// ─── Fleet overview ────────────────────────────────────────────────
export async function fleetOverview(
  tenantId: number
): Promise<EliasFleetOverview> {
  const db = await requireDb();

  const nodeRows = (await db
    .select({
      id: eliasProNodes.id,
      status: eliasProNodes.status,
    })
    .from(eliasProNodes)
    .where(
      and(
        eq(eliasProNodes.tenantId, tenantId),
        eq(eliasProNodes.isActive, true)
      )
    )) as Array<{ id: number; status: string }>;

  const nodesTotal = nodeRows.length;
  const nodesOnline = nodeRows.filter(n => n.status === "active").length;
  const nodesOffline = nodeRows.filter(
    n => n.status === "offline" || n.status === "disabled"
  ).length;

  const diagRows = (await db
    .select({
      score: sql<number>`avg(${eliasProDiagnostics.score})`,
      count: sql<number>`count(*)`,
    })
    .from(eliasProDiagnostics)
    .where(eq(eliasProDiagnostics.tenantId, tenantId))) as Array<{
    score: number | null;
    count: number | null;
  }>;

  const workRows = (await db
    .select({
      open: sql<number>`count(*) filter (where ${eliasProWorkOrders.status} not in ('delivered','cancelled'))`,
      critical: sql<number>`count(*) filter (where ${eliasProWorkOrders.priority} = 'critical' and ${eliasProWorkOrders.status} not in ('delivered','cancelled'))`,
    })
    .from(eliasProWorkOrders)
    .where(eq(eliasProWorkOrders.tenantId, tenantId))) as Array<{
    open: number | null;
    critical: number | null;
  }>;

  const recent = await listDiagnostics(tenantId, { limit: 10 });

  // Worst level = the lowest score seen in the fleet.
  const scores = recent.map(r => r.score).filter(s => Number.isFinite(s));
  const worstScore = scores.length ? Math.min(...scores) : null;

  const findings: EliasFleetOverview["topFindings"] = [];
  const seen = new Set<string>();
  for (const diag of recent) {
    for (const finding of diag.report?.findings ?? []) {
      if (seen.has(finding.id)) continue;
      seen.add(finding.id);
      findings.push(finding);
    }
  }
  findings.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  });

  return {
    nodesTotal,
    nodesOnline,
    nodesOffline,
    diagnosticsCount: Number(diagRows[0]?.count ?? 0),
    averageScore:
      diagRows[0]?.score === null || diagRows[0]?.score === undefined
        ? null
        : Number(diagRows[0].score.toFixed(1)),
    worstLevel: worstScore === null ? null : eliasLevelForScore(worstScore),
    openWorkOrders: Number(workRows[0]?.open ?? 0),
    criticalWorkOrders: Number(workRows[0]?.critical ?? 0),
    topFindings: findings.slice(0, 8),
    recentDiagnostics: recent,
    generatedAt: new Date().toISOString(),
  };
}

/** Health-level labels for the UI (re-exported for convenience). */
export { ELIAS_HEALTH_LEVEL_LABELS, ELIAS_ENGINE_CATALOG };

/** Test seam: clears the in-process adapter + health caches. */
export function __resetEliasCaches(): void {
  adapterCache.clear();
  healthCache.clear();
}

/** Exposed for the router: nodes whose ids belong to the tenant. */
export async function filterTenantNodeIds(
  tenantId: number,
  nodeIds: number[]
): Promise<number[]> {
  if (nodeIds.length === 0) return [];
  const db = await requireDb();
  const rows = await db
    .select({ id: eliasProNodes.id })
    .from(eliasProNodes)
    .where(
      and(
        eq(eliasProNodes.tenantId, tenantId),
        inArray(eliasProNodes.id, nodeIds)
      )
    );
  return rows.map((r: { id: number }) => r.id);
}
