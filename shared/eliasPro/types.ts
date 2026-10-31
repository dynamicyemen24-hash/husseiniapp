/**
 * Elias Pro — subsystem contracts.
 * ============================================================
 * Canonical, transport-agnostic DTOs shared by the platform client,
 * the platform server, and the EliasPro node agent.
 *
 * DESIGN RULE (anti-corruption layer):
 *   No file in this subsystem may leak EliasPro's raw PowerShell/JSON shapes.
 *   The node adapter (`server/eliasPro/adapters`) is the ONLY place allowed to
 *   know about `Reports/*.json`, `Data/*.json` or `GET /api/v1/device/*`.
 *   Everything above the adapter speaks the types below.
 *
 * Naming: `Elias*` prefix avoids collisions with platform-wide concepts
 * (customers, tickets, devices already exist in the ERP schema).
 */

// ─── Health levels ────────────────────────────────────────────────
export const ELIAS_HEALTH_LEVELS = [
  "excellent",
  "good",
  "fair",
  "poor",
  "critical",
] as const;
export type EliasHealthLevel = (typeof ELIAS_HEALTH_LEVELS)[number];

export const ELIAS_HEALTH_LEVEL_LABELS: Record<EliasHealthLevel, string> = {
  excellent: "ممتاز",
  good: "جيد",
  fair: "مقبول",
  poor: "ضعيف",
  critical: "حرج",
};

/** Areas scored by the health engine (weights sum to 1). */
export const ELIAS_AREA_KEYS = [
  "network",
  "storage",
  "battery",
  "cpu",
  "ram",
] as const;
export type EliasAreaKey = (typeof ELIAS_AREA_KEYS)[number];

export const ELIAS_AREA_LABELS: Record<EliasAreaKey, string> = {
  network: "الشبكة",
  storage: "التخزين",
  battery: "البطارية",
  cpu: "المعالج",
  ram: "الذاكرة",
};

// ─── Engines ──────────────────────────────────────────────────────
export const ELIAS_ENGINE_CATEGORIES = [
  "network",
  "system",
  "hardware",
  "shop",
  "enterprise",
  "ai",
] as const;
export type EliasEngineCategory = (typeof ELIAS_ENGINE_CATEGORIES)[number];

export const ELIAS_ENGINE_CATEGORY_LABELS: Record<EliasEngineCategory, string> =
  {
    network: "الشبكات",
    system: "النظام",
    hardware: "العتاد",
    shop: "الورشة",
    enterprise: "المؤسسة",
    ai: "الذكاء الاصطناعي",
  };

/**
 * Execution risk of an engine:
 *  - "read"   → read-only diagnostics (safe to auto-run)
 *  - "low"    → reversible maintenance (cleanup, heal)
 *  - "medium" → state-changing on the node (firmware, deploy, clean)
 *  - "high"   → destructive / privileged (recovery, disk ops)
 */
export const ELIAS_ENGINE_RISKS = ["read", "low", "medium", "high"] as const;
export type EliasEngineRisk = (typeof ELIAS_ENGINE_RISKS)[number];

export const ELIAS_ENGINE_RISK_LABELS: Record<EliasEngineRisk, string> = {
  read: "قراءة فقط",
  low: "منخفض الخطورة",
  medium: "متوسط الخطورة",
  high: "عالي الخطورة",
};

export interface EliasEngineDescriptor {
  /** Stable kebab-case id used in URLs and DB rows. */
  id: string;
  /** Engine code as in the EliasPro Scripts/Engines folder (e.g. "HDR"). */
  code: string;
  labelAr: string;
  labelEn: string;
  category: EliasEngineCategory;
  risk: EliasEngineRisk;
  /** Requires a Windows node agent (PowerShell runtime). */
  requiresAgent: boolean;
  /** Can run entirely inside the browser (no node needed). */
  portable: boolean;
  /**
   * REST route exposed by the EliasPro node agent, when the engine has a
   * dedicated endpoint. `null` means "invoked through the generic engine
   * runner" (`POST /api/v1/engine/:id/run`).
   */
  agentRoute: string | null;
  descriptionAr: string;
}

// ─── Scored metrics & findings ───────────────────────────────────
export interface EliasMetric {
  key: string;
  labelAr: string;
  value: number | null;
  unit: string | null;
  /** true = the metric is within a healthy range. */
  good: boolean;
}

export interface EliasAreaScore {
  area: EliasAreaKey;
  labelAr: string;
  /** 0..100 */
  score: number;
  weight: number;
  status: "ok" | "warn" | "critical";
  metrics: EliasMetric[];
}

export interface EliasFinding {
  id: string;
  severity: "high" | "medium" | "low";
  area: EliasAreaKey;
  titleAr: string;
  detailAr: string;
  actionAr: string;
}

export interface EliasHealthReport {
  /** 0..100 weighted health score. */
  score: number;
  level: EliasHealthLevel;
  labelAr: string;
  areas: EliasAreaScore[];
  findings: EliasFinding[];
  computedAt: string;
}

// ─── Trends & forecasting ────────────────────────────────────────
export interface EliasAnomaly {
  at: string;
  value: number;
  z: number;
}

export interface EliasTrend {
  area: EliasAreaKey;
  /** Least-squares slope of the series (per sample). */
  slope: number;
  /** Coefficient of determination — fit quality. */
  r2: number;
  direction: "improving" | "stable" | "degrading";
  /** Projected values for the next N samples. */
  forecast: number[];
  anomalies: EliasAnomaly[];
  samples: number;
}

// ─── Device snapshot ──────────────────────────────────────────────
export type EliasPlatform = "windows" | "android" | "ios" | "linux" | "web";

export interface EliasCpuInfo {
  name: string | null;
  cores: number | null;
  threads: number | null;
  loadPct: number | null;
  tempC: number | null;
}

export interface EliasMemoryInfo {
  totalGb: number | null;
  freeGb: number | null;
  usedPct: number | null;
}

export interface EliasStorageInfo {
  totalGb: number | null;
  freeGb: number | null;
  usedPct: number | null;
  wearPct: number | null;
  readErrors: number | null;
  writeErrors: number | null;
  healthy: boolean | null;
  model: string | null;
}

export interface EliasBatteryInfo {
  present: boolean;
  levelPct: number | null;
  healthPct: number | null;
  cycles: number | null;
  tempC: number | null;
  charging: boolean | null;
  acStatus: string | null;
}

export interface EliasNetworkInfo {
  status: string | null;
  dnsMs: number | null;
  ipv4: string | null;
  ssid: string | null;
  wanLoss: boolean | null;
  gwLoss: boolean | null;
  bounces: number | null;
  type: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
}

export interface EliasThermalInfo {
  summary: string | null;
  maxTempC: number | null;
}

export interface EliasProcessInfo {
  name: string;
  pid: number;
  cpuPct: number;
  memMb: number;
}

export interface EliasDeviceSnapshot {
  capturedAt: string;
  /** Stable identity of the inspected device (hostname/serial/fingerprint). */
  deviceKey: string;
  deviceLabel: string;
  platform: EliasPlatform;
  hostname: string | null;
  os: string | null;
  osVersion: string | null;
  manufacturer: string | null;
  model: string | null;
  cpu: EliasCpuInfo | null;
  memory: EliasMemoryInfo | null;
  storage: EliasStorageInfo | null;
  battery: EliasBatteryInfo | null;
  network: EliasNetworkInfo | null;
  thermal: EliasThermalInfo | null;
  processes: EliasProcessInfo[];
}

// ─── Nodes (registered agent machines) ────────────────────────────
export const ELIAS_NODE_STATUSES = [
  "active",
  "offline",
  "error",
  "disabled",
] as const;
export type EliasNodeStatus = (typeof ELIAS_NODE_STATUSES)[number];

export const ELIAS_NODE_STATUS_LABELS: Record<EliasNodeStatus, string> = {
  active: "متصل",
  offline: "غير متصل",
  error: "خطأ",
  disabled: "معطّل",
};

export interface EliasNodeSummary {
  id: number;
  code: string;
  name: string;
  baseUrl: string;
  status: EliasNodeStatus;
  /** True when the node is backed by the built-in simulator (no real host). */
  isSimulated: boolean;
  agentVersion: string | null;
  platform: string | null;
  lastSeenAt: string | null;
  lastError: string | null;
  capabilities: string[];
  latestScore: number | null;
  latestLevel: EliasHealthLevel | null;
}

export interface EliasNodeHealth {
  status: "online" | "degraded" | "offline";
  agentVersion: string | null;
  platform: string | null;
  score: number | null;
  level: EliasHealthLevel | null;
  checkedAt: string;
  latencyMs: number | null;
  message: string | null;
}

// ─── Work orders (repair-shop domain) ────────────────────────────
export const ELIAS_WORK_ORDER_STATUSES = [
  "received",
  "diagnosed",
  "repairing",
  "awaiting_parts",
  "ready",
  "delivered",
  "cancelled",
] as const;
export type EliasWorkOrderStatus = (typeof ELIAS_WORK_ORDER_STATUSES)[number];

export const ELIAS_WORK_ORDER_STATUS_LABELS: Record<
  EliasWorkOrderStatus,
  string
> = {
  received: "مستلم",
  diagnosed: "تم التشخيص",
  repairing: "قيد الإصلاح",
  awaiting_parts: "بانتظار القطع",
  ready: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const ELIAS_WORK_ORDER_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type EliasWorkOrderPriority =
  (typeof ELIAS_WORK_ORDER_PRIORITIES)[number];

export interface EliasWorkOrderPart {
  sku: string;
  name: string;
  qty: number;
  unitCost: number | null;
}

export interface EliasWorkOrder {
  id: number;
  /** EliasPro native reference, e.g. "TKT-2026-0007". */
  externalRef: string;
  title: string;
  customerName: string | null;
  customerPhone: string | null;
  deviceType: string | null;
  deviceSerial: string | null;
  status: EliasWorkOrderStatus;
  priority: EliasWorkOrderPriority;
  reportedIssue: string | null;
  estimatedCost: number | null;
  parts: EliasWorkOrderPart[];
  nodeId: number | null;
  nodeLabel: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Linked platform support ticket (tickets.id) when bridged. */
  supportTicketId: number | null;
}

// ─── Engine execution ────────────────────────────────────────────
export type EliasEngineRunStatus = "success" | "failed" | "timeout" | "skipped";

export interface EliasEngineRunResult {
  engineId: string;
  status: EliasEngineRunStatus;
  durationMs: number;
  output: unknown;
  error: string | null;
  startedAt: string;
}

// ─── Diagnostics (persisted) ──────────────────────────────────────
export type EliasDiagnosticSource = "agent" | "browser";

export interface EliasDiagnosticRecord {
  id: number;
  nodeId: number | null;
  nodeLabel: string | null;
  deviceKey: string;
  deviceLabel: string;
  platform: EliasPlatform;
  source: EliasDiagnosticSource;
  score: number;
  level: EliasHealthLevel;
  report: EliasHealthReport;
  snapshot: EliasDeviceSnapshot;
  capturedAt: string;
  createdAt: string;
}

// ─── Fleet overview ───────────────────────────────────────────────
export interface EliasFleetOverview {
  nodesTotal: number;
  nodesOnline: number;
  nodesOffline: number;
  diagnosticsCount: number;
  averageScore: number | null;
  worstLevel: EliasHealthLevel | null;
  openWorkOrders: number;
  criticalWorkOrders: number;
  topFindings: EliasFinding[];
  recentDiagnostics: EliasDiagnosticRecord[];
  generatedAt: string;
}
