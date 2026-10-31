/**
 * Elias Pro — HTTP node agent adapter.
 * ============================================================
 * Talks to a real EliasPro node (Pode REST surface) and normalizes whatever
 * it returns into the platform contract defined in `shared/eliasPro`.
 *
 * DESIGN RULE (anti-corruption layer)
 *   Raw node JSON never escapes this file. Every field is defensively coerced
 *   into the platform shape, so a node that upgrades its payload format cannot
 *   break the UI or corrupt the persisted diagnostics.
 *
 * NETWORK HYGIENE
 *   • Every call has a hard timeout (default 8s) — a hung node must never
 *     pin a serverless invocation open.
 *   • The shared bearer token is sent as `Authorization: Bearer <token>` and
 *     never logged.
 *   • Failures are mapped to `EliasAgentError` with a machine-readable status
 *     so the service layer can decide what to do (retry / mark offline / …).
 */
import type {
  EliasCpuInfo,
  EliasDeviceSnapshot,
  EliasEngineDescriptor,
  EliasEngineRunResult,
  EliasHealthReport,
  EliasMemoryInfo,
  EliasNetworkInfo,
  EliasNodeHealth,
  EliasPlatform,
  EliasProcessInfo,
  EliasStorageInfo,
  EliasThermalInfo,
  EliasWorkOrder,
  EliasWorkOrderStatus,
} from "../../../shared/eliasPro";
import {
  EliasAgentError,
  type EliasEngineArgs,
  type EliasProAgentPort,
  type EliasWorkOrderDraft,
  type EliasWorkOrderQuery,
} from "../ports";

const DEFAULT_TIMEOUT_MS = 8_000;
const USER_AGENT = "Uamex-ERP-EliasPro/1.0";

// ─── Coercion helpers ──────────────────────────────────────────────
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function numOr(value: unknown, fallback: number): number {
  return num(value) ?? fallback;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = typeof value === "string" ? value : String(value);
  return s.length ? s : null;
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Normalizes a raw payload into the platform device snapshot contract. */
export function normalizeSnapshot(
  raw: unknown,
  fallbackKey: string,
  fallbackLabel: string
): EliasDeviceSnapshot {
  const r = record(raw);
  const cpuRaw = record(r.cpu);
  const memRaw = record(r.memory ?? r.ram);
  const storageRaw = record(r.storage);
  const batteryRaw = record(r.battery);
  const networkRaw = record(r.network);
  const thermalRaw = record(r.thermal);

  const cpu: EliasCpuInfo = {
    name: str(cpuRaw.name),
    cores: num(cpuRaw.cores),
    threads: num(cpuRaw.threads),
    loadPct: num(cpuRaw.loadPct ?? cpuRaw.load),
    tempC: num(cpuRaw.tempC ?? cpuRaw.temperature),
  };

  const totalGb = num(memRaw.totalGb ?? memRaw.total);
  const freeGb = num(memRaw.freeGb ?? memRaw.free);
  const memory: EliasMemoryInfo = {
    totalGb,
    freeGb,
    usedPct:
      num(memRaw.usedPct) ??
      (totalGb && freeGb !== null
        ? ((totalGb - freeGb) / totalGb) * 100
        : null),
  };

  const storageTotalGb = num(storageRaw.totalGb ?? storageRaw.total);
  const storageFreeGb = num(storageRaw.freeGb ?? storageRaw.free);
  const storage: EliasStorageInfo = {
    totalGb: storageTotalGb,
    freeGb: storageFreeGb,
    usedPct:
      num(storageRaw.usedPct) ??
      (storageTotalGb && storageFreeGb !== null
        ? ((storageTotalGb - storageFreeGb) / storageTotalGb) * 100
        : null),
    wearPct: num(storageRaw.wearPct),
    readErrors: num(storageRaw.readErrors),
    writeErrors: num(storageRaw.writeErrors),
    healthy:
      storageRaw.healthy === undefined || storageRaw.healthy === null
        ? null
        : bool(storageRaw.healthy),
    model: str(storageRaw.model),
  };

  const batteryPresent = bool(batteryRaw.present, totalGb !== null);
  const battery = {
    present: batteryPresent,
    levelPct: num(batteryRaw.levelPct ?? batteryRaw.level),
    healthPct: num(batteryRaw.healthPct),
    cycles: num(batteryRaw.cycles),
    tempC: num(batteryRaw.tempC),
    charging:
      batteryRaw.charging === undefined || batteryRaw.charging === null
        ? null
        : bool(batteryRaw.charging),
    acStatus: str(batteryRaw.acStatus),
  };

  const network: EliasNetworkInfo = {
    status: str(networkRaw.status),
    dnsMs: num(networkRaw.dnsMs),
    ipv4: str(networkRaw.ipv4),
    ssid: str(networkRaw.ssid),
    wanLoss:
      networkRaw.wanLoss === undefined || networkRaw.wanLoss === null
        ? null
        : bool(networkRaw.wanLoss),
    gwLoss:
      networkRaw.gwLoss === undefined || networkRaw.gwLoss === null
        ? null
        : bool(networkRaw.gwLoss),
    bounces: num(networkRaw.bounces),
    type: str(networkRaw.type),
    downlinkMbps: num(networkRaw.downlinkMbps),
    rttMs: num(networkRaw.rttMs),
  };

  const thermal: EliasThermalInfo = {
    summary: str(thermalRaw.summary),
    maxTempC: num(thermalRaw.maxTempC),
  };

  const processes: EliasProcessInfo[] = Array.isArray(r.processes)
    ? r.processes
        .map(p => {
          const pr = record(p);
          return {
            name: str(pr.name) ?? "unknown",
            pid: numOr(pr.pid, 0),
            cpuPct: numOr(pr.cpuPct, 0),
            memMb: numOr(pr.memMb, 0),
          };
        })
        .slice(0, 50)
    : [];

  const platformRaw = str(r.platform)?.toLowerCase();
  const platform: EliasPlatform = (
    ["windows", "android", "ios", "linux", "web"] as const
  ).includes(platformRaw as EliasPlatform)
    ? (platformRaw as EliasPlatform)
    : "web";

  return {
    capturedAt: str(r.capturedAt) ?? new Date().toISOString(),
    deviceKey: str(r.deviceKey) ?? fallbackKey,
    deviceLabel: str(r.deviceLabel) ?? fallbackLabel,
    platform,
    hostname: str(r.hostname),
    os: str(r.os),
    osVersion: str(r.osVersion),
    manufacturer: str(r.manufacturer),
    model: str(r.model),
    cpu,
    memory,
    storage,
    battery,
    network,
    thermal,
    processes,
  };
}

/** Normalizes a raw work-order payload into the platform contract. */
export function normalizeWorkOrder(
  raw: unknown,
  nodeId: number,
  nodeLabel: string | null
): EliasWorkOrder {
  const r = record(raw);
  const parts = Array.isArray(r.parts)
    ? r.parts.slice(0, 100).map(p => {
        const pr = record(p);
        return {
          sku: str(pr.sku) ?? "",
          name: str(pr.name) ?? "",
          qty: numOr(pr.qty, 0),
          unitCost: num(pr.unitCost),
        };
      })
    : [];

  return {
    id: numOr(r.id, 0),
    externalRef: str(r.externalRef ?? r.ref ?? r.reference) ?? "",
    title: str(r.title) ?? "",
    customerName: str(r.customerName),
    customerPhone: str(r.customerPhone),
    deviceType: str(r.deviceType),
    deviceSerial: str(r.deviceSerial),
    status: (str(r.status) ?? "received") as EliasWorkOrderStatus,
    priority: (str(r.priority) ?? "medium") as EliasWorkOrder["priority"],
    reportedIssue: str(r.reportedIssue),
    estimatedCost: num(r.estimatedCost),
    parts,
    nodeId,
    nodeLabel,
    receivedAt: str(r.receivedAt),
    createdAt: str(r.createdAt) ?? new Date().toISOString(),
    updatedAt: str(r.updatedAt) ?? new Date().toISOString(),
    supportTicketId: null,
  };
}

export interface HttpAgentOptions {
  nodeId: number;
  code: string;
  name: string;
  baseUrl: string;
  /** Plaintext bearer token — held in memory only, never persisted. */
  token?: string | null;
  timeoutMs?: number;
  /** Injected fetch for tests. */
  fetchImpl?: typeof fetch;
}

export class HttpAgentAdapter implements EliasProAgentPort {
  readonly nodeId: number;
  readonly code: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly isSimulated = false;

  private readonly token: string | null;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpAgentOptions) {
    this.nodeId = opts.nodeId;
    this.code = opts.code;
    this.label = opts.name;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token ?? null;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  // ─── Transport ───────────────────────────────────────────────────
  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });

      if (res.status === 401 || res.status === 403) {
        throw new EliasAgentError(
          "unauthorized",
          "العقدة رفضت بيانات الاعتماد — تحقق من الرمز السري"
        );
      }
      if (res.status === 404) {
        throw new EliasAgentError("invalid", `العقدة لا تدعم المسار ${path}`);
      }
      if (!res.ok) {
        throw new EliasAgentError(
          "unreachable",
          `استجابة غير متوقعة من العقدة (${res.status})`
        );
      }

      const text = await res.text();
      if (!text) return {} as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new EliasAgentError(
          "invalid",
          "استجابة العقدة ليست بصيغة JSON صالحة"
        );
      }
    } catch (err) {
      if (err instanceof EliasAgentError) throw err;
      if ((err as { name?: string })?.name === "AbortError") {
        throw new EliasAgentError(
          "timeout",
          `انتهت مهلة الاتصال بالعقدة بعد ${this.timeoutMs}ms`
        );
      }
      throw new EliasAgentError(
        "unreachable",
        err instanceof Error ? err.message : String(err),
        err
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Port implementation ─────────────────────────────────────────
  async health(): Promise<EliasNodeHealth> {
    const started = Date.now();
    try {
      const raw = await this.request<unknown>("/api/v1/health");
      const r = record(raw);
      const score = num(r.score);
      const levelRaw = str(r.level);
      return {
        status:
          (str(r.status) as EliasNodeHealth["status"] | null) ??
          (score === null ? "online" : score >= 50 ? "online" : "degraded"),
        agentVersion: str(r.agentVersion ?? r.version),
        platform: str(r.platform),
        score,
        level: (levelRaw ?? null) as EliasNodeHealth["level"],
        checkedAt: str(r.checkedAt) ?? new Date().toISOString(),
        latencyMs: num(r.latencyMs) ?? Date.now() - started,
        message: str(r.message),
      };
    } catch (err) {
      return {
        status: "offline",
        agentVersion: null,
        platform: null,
        score: null,
        level: null,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async snapshot(): Promise<EliasDeviceSnapshot> {
    const raw = await this.request<unknown>("/api/v1/device/snapshot");
    return normalizeSnapshot(
      raw,
      `node-${this.code.toLowerCase()}`,
      this.label
    );
  }

  async runEngine(
    engine: EliasEngineDescriptor,
    args?: EliasEngineArgs
  ): Promise<EliasEngineRunResult> {
    const startedAt = new Date().toISOString();
    const started = Date.now();
    try {
      const payload = { engine: engine.code, args: args ?? {} };
      const raw = engine.agentRoute
        ? await this.request<unknown>(engine.agentRoute, {
            method: "POST",
            body: payload,
          })
        : await this.request<unknown>(
            `/api/v1/engine/${encodeURIComponent(engine.id)}/run`,
            { method: "POST", body: payload }
          );

      const r = record(raw);
      const statusRaw = str(r.status);
      const status: EliasEngineRunResult["status"] =
        statusRaw === "failed" ||
        statusRaw === "timeout" ||
        statusRaw === "skipped"
          ? statusRaw
          : "success";

      return {
        engineId: engine.id,
        status,
        durationMs: num(r.durationMs) ?? Date.now() - started,
        output: raw,
        error: str(r.error),
        startedAt,
      };
    } catch (err) {
      const status: EliasEngineRunResult["status"] =
        err instanceof EliasAgentError && err.status === "timeout"
          ? "timeout"
          : "failed";
      return {
        engineId: engine.id,
        status,
        durationMs: Date.now() - started,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        startedAt,
      };
    }
  }

  async listWorkOrders(query: EliasWorkOrderQuery): Promise<EliasWorkOrder[]> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    params.set("limit", String(query.limit));
    const suffix = params.toString();
    const raw = await this.request<unknown>(
      `/api/v1/shop/tickets${suffix ? `?${suffix}` : ""}`
    );
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(record(raw).items)
        ? (record(raw).items as unknown[])
        : [];
    return list
      .map(item => normalizeWorkOrder(item, this.nodeId, this.label))
      .slice(0, query.limit);
  }

  async createWorkOrder(draft: EliasWorkOrderDraft): Promise<EliasWorkOrder> {
    const raw = await this.request<unknown>("/api/v1/shop/tickets", {
      method: "POST",
      body: {
        title: draft.title,
        customerName: draft.customerName ?? null,
        customerPhone: draft.customerPhone ?? null,
        deviceType: draft.deviceType ?? null,
        deviceSerial: draft.deviceSerial ?? null,
        reportedIssue: draft.reportedIssue ?? null,
        priority: draft.priority ?? "medium",
        estimatedCost: draft.estimatedCost ?? null,
      },
    });
    return normalizeWorkOrder(raw, this.nodeId, this.label);
  }

  async updateWorkOrderStatus(
    externalRef: string,
    status: EliasWorkOrderStatus
  ): Promise<EliasWorkOrder> {
    const raw = await this.request<unknown>(
      `/api/v1/shop/tickets/${encodeURIComponent(externalRef)}`,
      { method: "PATCH", body: { status } }
    );
    return normalizeWorkOrder(raw, this.nodeId, this.label);
  }
}

export type { EliasHealthReport };
