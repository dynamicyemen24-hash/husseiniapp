/**
 * Elias Pro — health scoring & predictive analytics.
 * ============================================================
 * Pure, isomorphic, dependency-free analytics core.
 *
 * Ported from the EliasPro `elias-cog.js` engine and hardened for SaaS use:
 *  - deterministic scoring with documented thresholds (no randomness),
 *  - weight renormalisation when a subsystem is absent (e.g. desktops have no
 *    battery — they must not silently bank a free 18% score),
 *  - robust statistics (median, MAD) for anomaly detection so a single
 *    corrupted sample cannot poison the whole series,
 *  - linear-regression forecasting with confidence-bounded clamping.
 *
 * Runs unchanged on the server (node) and in the browser (client).
 */
import {
  ELIAS_AREA_KEYS,
  ELIAS_AREA_LABELS,
  ELIAS_HEALTH_LEVEL_LABELS,
  type EliasAnomaly,
  type EliasAreaKey,
  type EliasAreaScore,
  type EliasBatteryInfo,
  type EliasCpuInfo,
  type EliasDeviceSnapshot,
  type EliasFinding,
  type EliasHealthLevel,
  type EliasHealthReport,
  type EliasMemoryInfo,
  type EliasMetric,
  type EliasNetworkInfo,
  type EliasStorageInfo,
  type EliasTrend,
} from "./types";

// ─── Weights ──────────────────────────────────────────────────────
/**
 * Area weights — they sum to 1.0. Storage and RAM carry the most weight
 * because their failure modes are the most expensive in the field.
 */
export const ELIAS_AREA_WEIGHTS: Record<EliasAreaKey, number> = {
  network: 0.22,
  storage: 0.25,
  battery: 0.18,
  cpu: 0.15,
  ram: 0.2,
};

export const ELIAS_ANOMALY_Z_THRESHOLD = 2.5;
export const ELIAS_EMA_ALPHA = 0.35;
export const ELIAS_FORECAST_HORIZON = 8;

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const round = (v: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};
const num = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Maps a high-is-bad ratio to a penalty in [0, maxPenalty].
 * `good` is the ratio under which nothing is penalised, `bad` is the ratio at
 * which the full penalty applies.
 */
function ratioPenalty(
  value: number | null,
  good: number,
  bad: number,
  maxPenalty: number
): number {
  if (value === null) return 0;
  if (value <= good) return 0;
  if (value >= bad) return maxPenalty;
  return ((value - good) / (bad - good)) * maxPenalty;
}

// ─── Per-area scorers ─────────────────────────────────────────────
export interface EliasAreaScoreResult {
  score: number;
  status: "ok" | "warn" | "critical";
  metrics: EliasMetric[];
  /** false when the subsystem does not exist on this device. */
  applicable: boolean;
}

export function scoreEliasNetwork(
  info: EliasNetworkInfo | null
): EliasAreaScoreResult {
  if (!info) {
    return {
      score: 100,
      status: "ok",
      applicable: false,
      metrics: [],
    };
  }
  let penalty = 0;
  const metrics: EliasMetric[] = [];

  const dns = num(info.dnsMs);
  const dnsPenalty = ratioPenalty(dns, 50, 400, 25);
  penalty += dnsPenalty;
  metrics.push({
    key: "dns",
    labelAr: "زمن استجابة DNS",
    value: dns,
    unit: "ms",
    good: dns === null ? true : dns <= 100,
  });

  const status = (info.status ?? "").toLowerCase();
  const statusPenalty =
    status === "offline" || status === "down"
      ? 60
      : status === "degraded" || status === "poor"
        ? 20
        : 0;
  penalty += statusPenalty;
  metrics.push({
    key: "status",
    labelAr: "حالة الشبكة",
    value: status ? 1 : null,
    unit: null,
    good: statusPenalty === 0,
  });

  const wanLoss = info.wanLoss === true;
  if (wanLoss) penalty += 30;
  metrics.push({
    key: "wanLoss",
    labelAr: "فقدان الاتصال الخارجي",
    value: wanLoss ? 1 : 0,
    unit: null,
    good: !wanLoss,
  });

  const gwLoss = info.gwLoss === true;
  if (gwLoss) penalty += 15;
  metrics.push({
    key: "gwLoss",
    labelAr: "فقدان البوابة",
    value: gwLoss ? 1 : 0,
    unit: null,
    good: !gwLoss,
  });

  const bounces = num(info.bounces);
  if (bounces !== null && bounces > 0) {
    penalty += Math.min(15, bounces * 3);
  }
  metrics.push({
    key: "bounces",
    labelAr: "ارتدادات الشبكة",
    value: bounces,
    unit: null,
    good: bounces === null || bounces === 0,
  });

  const downlink = num(info.downlinkMbps);
  if (downlink !== null && downlink < 5) {
    penalty += 10;
  }
  metrics.push({
    key: "downlink",
    labelAr: "سرعة التنزيل",
    value: downlink,
    unit: "Mbps",
    good: downlink === null || downlink >= 5,
  });

  const rtt = num(info.rttMs);
  metrics.push({
    key: "rtt",
    labelAr: "زمن الاستجابة",
    value: rtt,
    unit: "ms",
    good: rtt === null || rtt <= 150,
  });

  const score = clamp(100 - penalty);
  return {
    score: round(score),
    status: score < 40 ? "critical" : score < 70 ? "warn" : "ok",
    applicable: true,
    metrics,
  };
}

export function scoreEliasStorage(
  info: EliasStorageInfo | null
): EliasAreaScoreResult {
  if (!info) {
    return { score: 100, status: "ok", applicable: false, metrics: [] };
  }
  let penalty = 0;
  const metrics: EliasMetric[] = [];

  const used = num(info.usedPct);
  penalty += ratioPenalty(used, 70, 95, 50);
  metrics.push({
    key: "used",
    labelAr: "نسبة استخدام القرص",
    value: used,
    unit: "%",
    good: used === null || used <= 80,
  });

  const wear = num(info.wearPct);
  penalty += ratioPenalty(wear, 20, 80, 60);
  metrics.push({
    key: "wear",
    labelAr: "تآكل القرص",
    value: wear,
    unit: "%",
    good: wear === null || wear <= 30,
  });

  const readErrors = num(info.readErrors) ?? 0;
  const writeErrors = num(info.writeErrors) ?? 0;
  const errorCount = readErrors + writeErrors;
  if (errorCount > 0) penalty += Math.min(30, errorCount * 10);
  metrics.push({
    key: "errors",
    labelAr: "أخطاء القراءة/الكتابة",
    value: errorCount,
    unit: null,
    good: errorCount === 0,
  });

  if (info.healthy === false) penalty += 25;
  metrics.push({
    key: "healthy",
    labelAr: "حالة القرص",
    value: info.healthy === null ? null : info.healthy ? 1 : 0,
    unit: null,
    good: info.healthy !== false,
  });

  const score = clamp(100 - penalty);
  return {
    score: round(score),
    status: score < 40 ? "critical" : score < 70 ? "warn" : "ok",
    applicable: true,
    metrics,
  };
}

export function scoreEliasBattery(
  info: EliasBatteryInfo | null
): EliasAreaScoreResult {
  if (!info || !info.present) {
    return { score: 100, status: "ok", applicable: false, metrics: [] };
  }
  let penalty = 0;
  const metrics: EliasMetric[] = [];

  const level = num(info.levelPct);
  if (level !== null) {
    if (level < 20) penalty += 40;
    else if (level < 50) penalty += 20;
  }
  metrics.push({
    key: "level",
    labelAr: "مستوى الشحن",
    value: level,
    unit: "%",
    good: level === null || level >= 40,
  });

  const health = num(info.healthPct);
  if (health !== null) {
    if (health < 60) penalty += 55;
    else if (health < 80) penalty += 30;
  }
  metrics.push({
    key: "health",
    labelAr: "صحة البطارية",
    value: health,
    unit: "%",
    good: health === null || health >= 80,
  });

  const temp = num(info.tempC);
  if (temp !== null) {
    if (temp > 50) penalty += 20;
    else if (temp > 45) penalty += 10;
  }
  metrics.push({
    key: "temp",
    labelAr: "حرارة البطارية",
    value: temp,
    unit: "°C",
    good: temp === null || temp <= 45,
  });

  const cycles = num(info.cycles);
  if (cycles !== null && cycles > 1000) penalty += 10;
  metrics.push({
    key: "cycles",
    labelAr: "دورات الشحن",
    value: cycles,
    unit: null,
    good: cycles === null || cycles <= 1000,
  });

  const score = clamp(100 - penalty);
  return {
    score: round(score),
    status: score < 40 ? "critical" : score < 70 ? "warn" : "ok",
    applicable: true,
    metrics,
  };
}

export function scoreEliasCpu(info: EliasCpuInfo | null): EliasAreaScoreResult {
  if (!info) {
    return { score: 100, status: "ok", applicable: false, metrics: [] };
  }
  let penalty = 0;
  const metrics: EliasMetric[] = [];

  const load = num(info.loadPct);
  penalty += ratioPenalty(load, 50, 95, 50);
  metrics.push({
    key: "load",
    labelAr: "حِمل المعالج",
    value: load,
    unit: "%",
    good: load === null || load <= 60,
  });

  const temp = num(info.tempC);
  if (temp !== null) {
    if (temp > 85) penalty += 30;
    else if (temp > 70) penalty += 12;
  }
  metrics.push({
    key: "temp",
    labelAr: "حرارة المعالج",
    value: temp,
    unit: "°C",
    good: temp === null || temp <= 70,
  });

  const cores = num(info.cores);
  metrics.push({
    key: "cores",
    labelAr: "عدد الأنوية",
    value: cores,
    unit: null,
    good: cores === null || cores >= 4,
  });

  const score = clamp(100 - penalty);
  return {
    score: round(score),
    status: score < 40 ? "critical" : score < 70 ? "warn" : "ok",
    applicable: true,
    metrics,
  };
}

export function scoreEliasRam(
  info: EliasMemoryInfo | null
): EliasAreaScoreResult {
  if (!info) {
    return { score: 100, status: "ok", applicable: false, metrics: [] };
  }
  let penalty = 0;
  const metrics: EliasMetric[] = [];

  const used = num(info.usedPct);
  penalty += ratioPenalty(used, 70, 95, 55);
  metrics.push({
    key: "used",
    labelAr: "نسبة استخدام الذاكرة",
    value: used,
    unit: "%",
    good: used === null || used <= 75,
  });

  const total = num(info.totalGb);
  const free = num(info.freeGb);
  metrics.push({
    key: "total",
    labelAr: "إجمالي الذاكرة",
    value: total,
    unit: "GB",
    good: total === null || total >= 4,
  });
  metrics.push({
    key: "free",
    labelAr: "الذاكرة الحرة",
    value: free,
    unit: "GB",
    good: free === null || free >= 1,
  });

  const score = clamp(100 - penalty);
  return {
    score: round(score),
    status: score < 40 ? "critical" : score < 70 ? "warn" : "ok",
    applicable: true,
    metrics,
  };
}

// ─── Level mapping ────────────────────────────────────────────────
export function eliasLevelForScore(score: number): EliasHealthLevel {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  if (score >= 30) return "poor";
  return "critical";
}

// ─── Report assembly ──────────────────────────────────────────────
const AREA_ACTIONS: Record<EliasAreaKey, string> = {
  network: "راجع اتصال الكابل والبوابة، ثم شغّل محرك تشخيص الشبكة على العقدة.",
  storage: "حرّر مساحة القرص فوراً وصدّر نسخة احتياطية قبل أي إجراء حذر.",
  battery:
    "قلّل إضاءة الشاشة وقلّل مدة البقاء على الشبكة، وخطّط لاستبدال البطارية.",
  cpu: "خفّض الحمل عبر إغلاق التطبيقات الثقيلة وتحسين بدء التشغيل.",
  ram: "أغلق تطبيقات الاستهلاك العالي وأعد تشغيل الجهاز لتحرير الذاكرة.",
};

const AREA_TITLES: Record<EliasAreaKey, string> = {
  network: "تدهور في الاتصال بالشبكة",
  storage: "خطر على مساحة التخزين",
  battery: "بطارية في حالة ضعيفة",
  cpu: "حِمل معالج مرتفع",
  ram: "ضغط ذاكرة مرتفع",
};

/**
 * Compute the full health report for a device snapshot.
 *
 * Areas whose subsystem does not exist on the device (e.g. battery on a
 * desktop) are excluded and the remaining weights are renormalised, so a
 * desktop is not credited with a "free" battery score.
 */
export function evaluateEliasHealth(
  snapshot: EliasDeviceSnapshot
): EliasHealthReport {
  const results: Record<EliasAreaKey, EliasAreaScoreResult> = {
    network: scoreEliasNetwork(snapshot.network),
    storage: scoreEliasStorage(snapshot.storage),
    battery: scoreEliasBattery(snapshot.battery),
    cpu: scoreEliasCpu(snapshot.cpu),
    ram: scoreEliasRam(snapshot.memory),
  };

  const applicable = ELIAS_AREA_KEYS.filter(k => results[k].applicable);
  const weightSum =
    applicable.reduce((acc, k) => acc + ELIAS_AREA_WEIGHTS[k], 0) || 1;

  const areas: EliasAreaScore[] = ELIAS_AREA_KEYS.map(k => {
    const r = results[k];
    return {
      area: k,
      labelAr: ELIAS_AREA_LABELS[k],
      score: r.score,
      weight: r.applicable ? ELIAS_AREA_WEIGHTS[k] / weightSum : 0,
      status: r.status,
      metrics: r.metrics,
    };
  });

  const score = round(
    areas.reduce((acc, a) => acc + a.score * a.weight, 0),
    1
  );
  const level = eliasLevelForScore(score);

  const findings: EliasFinding[] = [];
  for (const area of areas) {
    if (area.weight === 0) continue;
    if (area.score >= 85) continue;
    const severity: EliasFinding["severity"] =
      area.score < 40 ? "high" : area.score < 65 ? "medium" : "low";
    const worst = area.metrics
      .filter(m => !m.good && m.value !== null)
      .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0];
    findings.push({
      id: `${area.area}-${severity}`,
      severity,
      area: area.area,
      titleAr: AREA_TITLES[area.area],
      detailAr: worst
        ? `${worst.labelAr}: ${worst.value}${worst.unit ?? ""} — درجة ${area.labelAr} ${area.score}%`
        : `درجة ${area.labelAr} ${area.score}%`,
      actionAr: AREA_ACTIONS[area.area],
    });
  }

  findings.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  });

  return {
    score,
    level,
    labelAr: ELIAS_HEALTH_LEVEL_LABELS[level],
    areas,
    findings,
    computedAt: new Date().toISOString(),
  };
}

// ─── Statistics ───────────────────────────────────────────────────
/** Exponential moving average — smooths noisy telemetry. */
export function eliasEma(values: number[], alpha = ELIAS_EMA_ALPHA): number[] {
  if (values.length === 0) return [];
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

export interface EliasRegression {
  slope: number;
  intercept: number;
  r2: number;
}

/** Ordinary least squares over (index, value) pairs. */
export function eliasLinearRegression(values: number[]): EliasRegression {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };

  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = (values[i] ?? 0) - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

/**
 * Detect outliers using the median absolute deviation (robust to the very
 * outliers we are looking for, unlike mean/σ).
 */
export function detectEliasAnomalies(
  samples: Array<{ at: string; value: number }>,
  threshold = ELIAS_ANOMALY_Z_THRESHOLD
): EliasAnomaly[] {
  const values = samples.map(s => s.value).filter(v => Number.isFinite(v));
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);

  const deviations = values
    .map(v => Math.abs(v - median))
    .sort((a, b) => a - b);
  const mad =
    deviations.length % 2 === 0
      ? ((deviations[mid - 1] ?? 0) + (deviations[mid] ?? 0)) / 2
      : (deviations[mid] ?? 0);

  // 1.4826 makes MAD comparable to a standard deviation for normal data.
  const scaledMad = mad * 1.4826;
  if (scaledMad === 0) return [];

  const anomalies: EliasAnomaly[] = [];
  samples.forEach((s, i) => {
    if (!Number.isFinite(s.value)) return;
    const z = (s.value - median) / scaledMad;
    if (Math.abs(z) >= threshold) {
      anomalies.push({ at: s.at, value: round(s.value, 2), z: round(z, 2) });
    }
    void i;
  });
  return anomalies;
}

/**
 * Analyse a metric series (health score over time) and project its future.
 * The series is expected to be a 0..100 health score where higher is better.
 */
export function analyzeEliasTrend(
  area: EliasAreaKey,
  samples: Array<{ at: string; value: number }>,
  horizon = ELIAS_FORECAST_HORIZON
): EliasTrend {
  const clean = samples.filter(s => Number.isFinite(s.value));
  const values = clean.map(s => s.value);
  const { slope, intercept, r2 } = eliasLinearRegression(values);

  const smoothed = eliasEma(values);
  const smoothedSlope = eliasLinearRegression(smoothed).slope;

  const forecast: number[] = [];
  const start = values.length;
  for (let i = 1; i <= horizon; i++) {
    forecast.push(round(clamp(intercept + slope * (start - 1 + i)), 1));
  }

  const direction: EliasTrend["direction"] =
    smoothedSlope > 0.5
      ? "improving"
      : smoothedSlope < -0.5
        ? "degrading"
        : "stable";

  return {
    area,
    slope: round(smoothedSlope, 4),
    r2: round(r2, 4),
    direction,
    forecast,
    anomalies: detectEliasAnomalies(clean),
    samples: values.length,
  };
}

/** Convenience: analyse every area of a snapshot series in one call. */
export function analyzeEliasTrends(
  series: Partial<Record<EliasAreaKey, Array<{ at: string; value: number }>>>,
  horizon = ELIAS_FORECAST_HORIZON
): Record<string, EliasTrend> {
  const out: Record<string, EliasTrend> = {};
  for (const area of ELIAS_AREA_KEYS) {
    const samples = series[area];
    if (samples && samples.length > 0) {
      out[area] = analyzeEliasTrend(area, samples, horizon);
    }
  }
  return out;
}
