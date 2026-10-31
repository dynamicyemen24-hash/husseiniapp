/**
 * Elias Pro — simulated node agent adapter.
 * ============================================================
 * A deterministic, dependency-free implementation of `EliasProAgentPort` that
 * emulates a real EliasPro node (Pode REST surface).
 *
 * WHY IT EXISTS
 *   The platform must be fully operable without any physical Windows node:
 *   demos, sandboxes, air-gapped installs, CI and the test-suite all need a
 *   node that answers health, snapshot, engine and work-order calls.
 *
 * DETERMINISM
 *   Every generated value is derived from a seeded PRNG (mulberry32) whose seed
 *   mixes the node id with a coarse time bucket. That gives us two properties:
 *     • the same node + same bucket always yields the same snapshot
 *       (tests are reproducible, no flakiness);
 *     • consecutive buckets differ smoothly, so the trend/anomaly engine sees a
 *       realistic time series instead of pure noise.
 */
import type {
  EliasCpuInfo,
  EliasDeviceSnapshot,
  EliasEngineDescriptor,
  EliasEngineRunResult,
  EliasHealthReport,
  EliasNetworkInfo,
  EliasNodeHealth,
  EliasPlatform,
  EliasStorageInfo,
  EliasWorkOrder,
  EliasWorkOrderPriority,
  EliasWorkOrderStatus,
} from "../../../shared/eliasPro";
import {
  evaluateEliasHealth,
  eliasLevelForScore,
} from "../../../shared/eliasPro";
import {
  EliasAgentError,
  type EliasEngineArgs,
  type EliasProAgentPort,
  type EliasWorkOrderDraft,
  type EliasWorkOrderQuery,
} from "../ports";

// ─── Seeded PRNG ───────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Random float in [min, max]. */
function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

const PLATFORMS: EliasPlatform[] = [
  "windows",
  "linux",
  "android",
  "ios",
  "web",
];
const CPU_MODELS = [
  "Intel Core i7-12700H",
  "AMD Ryzen 7 5800H",
  "Intel Core i5-1135G7",
  "AMD Ryzen 5 3600",
  "Intel Core i9-13900H",
];
const OS_BUILDINGS = [
  "Windows 11 Pro 23H2",
  "Windows 10 Pro 22H2",
  "Ubuntu 24.04 LTS",
  "Android 15",
];

/** Time bucket (5 min) — the resolution at which the simulated node "moves". */
const BUCKET_MS = 5 * 60 * 1000;

export interface SimulatedAgentOptions {
  nodeId: number;
  code: string;
  name: string;
  baseUrl?: string;
  /** Injected clock so tests can travel in time deterministically. */
  now?: () => number;
  /** Latency floor/ceiling for the emulated round-trip. */
  latencyMs?: number;
}

export class SimulatedAgentAdapter implements EliasProAgentPort {
  readonly nodeId: number;
  readonly code: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly isSimulated = true;

  private readonly now: () => number;
  private readonly latencyMs: number;
  private workOrders: EliasWorkOrder[] = [];
  private seq = 0;

  constructor(opts: SimulatedAgentOptions) {
    this.nodeId = opts.nodeId;
    this.code = opts.code;
    this.label = opts.name;
    this.baseUrl = opts.baseUrl ?? `sim://${opts.code.toLowerCase()}`;
    this.now = opts.now ?? (() => Date.now());
    this.latencyMs = opts.latencyMs ?? 40;
  }

  // ─── Internals ───────────────────────────────────────────────────
  private bucket(): number {
    return Math.floor(this.now() / BUCKET_MS);
  }

  private rng(offset: number): () => number {
    return mulberry32(hashString(`${this.code}:${this.bucket()}:${offset}`));
  }

  private async simulateLatency(): Promise<void> {
    const jitter = this.rng(99)() * 20;
    const ms = Math.max(1, Math.round(this.latencyMs + jitter));
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildSnapshot(): EliasDeviceSnapshot {
    const rng = this.rng(1);
    const platform = PLATFORMS[hashString(this.code) % PLATFORMS.length];
    const isMobile = platform === "android" || platform === "ios";

    const cpu: EliasCpuInfo = {
      name: CPU_MODELS[hashString(this.code + "cpu") % CPU_MODELS.length],
      cores: Math.round(between(rng, 4, 16)),
      threads: Math.round(between(rng, 8, 32)),
      loadPct: round(between(rng, 8, 78), 1),
      tempC: round(between(rng, 38, 82), 1),
    };

    const totalGb = round(between(rng, 8, 64), 1);
    const freeGb = round(totalGb * between(rng, 0.12, 0.62), 1);

    const storageTotalGb = round(between(rng, 128, 2048), 1);
    const storageFreeGb = round(storageTotalGb * between(rng, 0.05, 0.55), 1);

    const network: EliasNetworkInfo = {
      status: "online",
      dnsMs: Math.round(between(rng, 8, 180)),
      ipv4: `10.${Math.floor(rng() * 255)}.${Math.floor(rng() * 255)}.${Math.floor(rng() * 255)}`,
      ssid: `NODE-${this.code.slice(-4).toUpperCase()}`,
      wanLoss: false,
      gwLoss: false,
      bounces: Math.round(between(rng, 0, 6)),
      type: rng() > 0.4 ? "fiber" : "ethernet",
      downlinkMbps: round(between(rng, 5, 940), 1),
      rttMs: Math.round(between(rng, 4, 120)),
    };

    const snapshot: EliasDeviceSnapshot = {
      capturedAt: new Date(this.now()).toISOString(),
      deviceKey: `sim-${this.code.toLowerCase()}-001`,
      deviceLabel: `${this.label} (محاكاة)`,
      platform,
      hostname: `SIM-${this.code.toUpperCase()}`,
      os: isMobile
        ? "Android"
        : OS_BUILDINGS[hashString(this.code) % OS_BUILDINGS.length],
      osVersion: isMobile ? "15" : "23H2",
      manufacturer: isMobile ? "Simulated OEM" : "Generic PC",
      model: isMobile ? "Handheld" : "Workstation",
      cpu,
      memory: {
        totalGb,
        freeGb,
        usedPct: round(((totalGb - freeGb) / totalGb) * 100, 1),
      },
      storage: {
        totalGb: storageTotalGb,
        freeGb: storageFreeGb,
        usedPct: round(
          ((storageTotalGb - storageFreeGb) / storageTotalGb) * 100,
          1
        ),
        wearPct: round(between(rng, 0, 34), 1),
        readErrors: Math.round(between(rng, 0, 4)),
        writeErrors: Math.round(between(rng, 0, 3)),
        healthy: rng() > 0.12,
        model: "SIM-SSD-1TB",
      },
      battery: isMobile
        ? {
            present: true,
            levelPct: Math.round(between(rng, 12, 100)),
            healthPct: Math.round(between(rng, 55, 100)),
            cycles: Math.round(between(rng, 40, 950)),
            tempC: round(between(rng, 25, 48), 1),
            charging: rng() > 0.5,
            acStatus: "none",
          }
        : {
            present: false,
            levelPct: null,
            healthPct: null,
            cycles: null,
            tempC: null,
            charging: null,
            acStatus: null,
          },
      network,
      thermal: {
        summary: "nominal",
        maxTempC: cpu.tempC,
      },
      processes: Array.from({ length: 5 }, (_, i) => ({
        name: `sim-service-${i + 1}`,
        pid: 1000 + Math.round(between(rng, 1, 65000)),
        cpuPct: round(between(rng, 0.5, 22), 1),
        memMb: round(between(rng, 40, 1800), 0),
      })),
    };

    return snapshot;
  }

  // ─── Port implementation ─────────────────────────────────────────
  async health(): Promise<EliasNodeHealth> {
    const started = Date.now();
    try {
      await this.simulateLatency();
      const report = evaluateEliasHealth(this.buildSnapshot());
      return {
        status: report.score >= 50 ? "online" : "degraded",
        agentVersion: "sim-1.0.0",
        platform: this.buildSnapshot().platform,
        score: report.score,
        level: report.level,
        checkedAt: new Date(this.now()).toISOString(),
        latencyMs: Date.now() - started,
        message: null,
      };
    } catch (err) {
      return {
        status: "offline",
        agentVersion: null,
        platform: null,
        score: null,
        level: null,
        checkedAt: new Date(this.now()).toISOString(),
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async snapshot(): Promise<EliasDeviceSnapshot> {
    await this.simulateLatency();
    return this.buildSnapshot();
  }

  async runEngine(
    engine: EliasEngineDescriptor,
    args?: EliasEngineArgs
  ): Promise<EliasEngineRunResult> {
    const startedAt = new Date(this.now()).toISOString();
    const started = Date.now();
    await this.simulateLatency();

    if (engine.risk === "high" && args?.acknowledge !== true) {
      return {
        engineId: engine.id,
        status: "skipped",
        durationMs: Date.now() - started,
        output: null,
        error: "يتطلب المحرك عالي الخطورة إقراراً صريحاً قبل التنفيذ",
        startedAt,
      };
    }

    const snapshot = this.buildSnapshot();
    const report = evaluateEliasHealth(snapshot);

    return {
      engineId: engine.id,
      status: "success",
      durationMs: Date.now() - started,
      output: {
        engine: engine.code,
        simulated: true,
        score: report.score,
        level: report.level,
        findings: report.findings.length,
        areas: report.areas.map(a => ({
          area: a.area,
          score: a.score,
          status: a.status,
        })),
        args: args ?? {},
      },
      error: null,
      startedAt,
    };
  }

  async listWorkOrders(query: EliasWorkOrderQuery): Promise<EliasWorkOrder[]> {
    await this.simulateLatency();
    let rows = [...this.workOrders];
    if (query.status) {
      rows = rows.filter(w => w.status === query.status);
    }
    if (query.search) {
      const needle = query.search.toLowerCase();
      rows = rows.filter(
        w =>
          w.title.toLowerCase().includes(needle) ||
          (w.externalRef ?? "").toLowerCase().includes(needle) ||
          (w.customerName ?? "").toLowerCase().includes(needle)
      );
    }
    return rows.slice(0, query.limit);
  }

  async createWorkOrder(draft: EliasWorkOrderDraft): Promise<EliasWorkOrder> {
    await this.simulateLatency();
    this.seq += 1;
    const nowIso = new Date(this.now()).toISOString();
    const order: EliasWorkOrder = {
      id: this.seq,
      externalRef: `TKT-SIM-${String(this.seq).padStart(4, "0")}`,
      title: draft.title,
      customerName: draft.customerName ?? null,
      customerPhone: draft.customerPhone ?? null,
      deviceType: draft.deviceType ?? null,
      deviceSerial: draft.deviceSerial ?? null,
      status: "received",
      priority: (draft.priority ?? "medium") as EliasWorkOrderPriority,
      reportedIssue: draft.reportedIssue ?? null,
      estimatedCost: draft.estimatedCost ?? null,
      parts: [],
      nodeId: this.nodeId,
      nodeLabel: this.label,
      receivedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      supportTicketId: null,
    };
    this.workOrders.push(order);
    return order;
  }

  async updateWorkOrderStatus(
    externalRef: string,
    status: EliasWorkOrderStatus
  ): Promise<EliasWorkOrder> {
    await this.simulateLatency();
    const order = this.workOrders.find(w => w.externalRef === externalRef);
    if (!order) {
      throw new EliasAgentError(
        "invalid",
        `أمر الصيانة ${externalRef} غير موجود`
      );
    }
    order.status = status;
    order.updatedAt = new Date(this.now()).toISOString();
    return order;
  }
}

/** Convenience helper: build a health report straight from a snapshot. */
export function simulatedHealthReport(
  snapshot: EliasDeviceSnapshot
): EliasHealthReport {
  return evaluateEliasHealth(snapshot);
}

/** Exposed for tests: the level a raw score maps to. */
export { eliasLevelForScore };
