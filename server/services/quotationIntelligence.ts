/**
 * Quotation Intelligence Engine — محرك ذكاء العروض
 * ─────────────────────────────────────────────────
 * Pure functions (no DB, no I/O) — Evidence-Based + Explainable AI.
 * Every output carries `reasons[]` / `evidence` so any score, rank, forecast
 * or recommendation is interpretable and auditable.
 *
 * Capabilities:
 *  • Scoring (price / technical / commercial / risk → total) with weights
 *  • Ranking alternatives + counterparty offers
 *  • Benchmarking vs history (avg/median/min/max/stddev, fair value, range)
 *  • Anomaly detection (z-score, duplicates, manipulation, margin risk)
 *  • Fair-value + expected-range inference
 *  • Win-probability forecasting + negotiation opportunities
 *  • What-If scenarios + prioritized recommendations
 */

import { computeDocument, type QuotationDocInput } from "./quotationEngine";

// ─── Types ────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  price: number;
  technical: number;
  commercial: number;
  risk: number;
  total: number;
  weights: {
    price: number;
    technical: number;
    commercial: number;
    risk: number;
  };
  reasons: string[];
}

export interface RankedOption {
  id: string;
  label: string;
  score: number;
  rank: number;
  reasons: string[];
}

export interface HistoryPoint {
  id: string | number;
  total: number;
  marginPct?: number;
  won?: boolean; // historical outcome for calibration
  closeDays?: number;
  itemsHash?: string; // for duplicate detection
  paymentDays?: number;
  deliveryDays?: number;
}

export interface Benchmarks {
  historyCount: number;
  avgTotal: number;
  medianTotal: number;
  minTotal: number;
  maxTotal: number;
  stddev: number;
  fairValue: number;
  expectedLow: number;
  expectedHigh: number;
  marginAvg: number | null;
  winRate: number | null;
}

export interface Anomaly {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  evidence: Record<string, unknown>;
}

export interface Forecast {
  winProbability: number; // 0..100
  expectedValue: number; // grandTotal × p
  expectedCloseDays: number | null;
  drivers: string[];
}

export interface Recommendation {
  action: string;
  impact: "high" | "medium" | "low";
  priority: number; // 1 = highest
  rationale: string;
  evidence: Record<string, unknown>;
}

export interface WhatIfScenario {
  scenario: string;
  discountPctDelta: number;
  resultTotal: number;
  resultMarginPct: number;
  winProbability: number;
  note: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── Scoring ──────────────────────────────────────────────────────────────

export interface ScoreInput {
  grandTotal: number;
  marginPct: number;
  benchmarkAvg: number | null; // null = no history
  hasDeliveryTerms: boolean;
  hasPaymentTerms: boolean;
  hasWarrantyOrPenalty: boolean;
  alternativesCount: number;
  negotiationRounds: number;
  validityDaysLeft: number | null;
  weights?: Partial<ScoreBreakdown["weights"]>;
}

/** Explainable 0..100 score across 4 dimensions. Higher = better offer quality. */
export function scoreQuotation(input: ScoreInput): ScoreBreakdown {
  const w = {
    price: input.weights?.price ?? 0.4,
    technical: input.weights?.technical ?? 0.2,
    commercial: input.weights?.commercial ?? 0.25,
    risk: input.weights?.risk ?? 0.15,
  };
  const reasons: string[] = [];

  // Price: competitiveness vs benchmark + margin health
  let price = 70;
  if (input.benchmarkAvg && input.benchmarkAvg > 0) {
    const dev =
      ((input.grandTotal - input.benchmarkAvg) / input.benchmarkAvg) * 100;
    if (dev <= -10) {
      price = 95;
      reasons.push(
        `السعر أقل من المتوسط التاريخي بـ ${r2(-dev)}% — تنافسية عالية`
      );
    } else if (dev <= 0) {
      price = 85;
      reasons.push(`السعر عند أو تحت المتوسط التاريخي (${r2(dev)}%)`);
    } else if (dev <= 10) {
      price = 70;
      reasons.push(`السعر أعلى من المتوسط بـ ${r2(dev)}% — ضمن النطاق`);
    } else if (dev <= 25) {
      price = 50;
      reasons.push(`السعر أعلى من المتوسط بـ ${r2(dev)}% — يحتاج تبريراً`);
    } else {
      price = 30;
      reasons.push(`السعر أعلى من المتوسط بـ ${r2(dev)}% — خطر خسارة الصفقة`);
    }
  } else {
    reasons.push("لا يوجد تاريخ سعري للمقارنة — التقييم على الهامش فقط");
  }
  if (input.marginPct < 0) {
    price -= 25;
    reasons.push(`هامش سالب (${input.marginPct}%) — خصم مدمر للقيمة`);
  } else if (input.marginPct < 5) {
    price -= 10;
    reasons.push(`هامش ضعيف (${input.marginPct}%)`);
  } else if (input.marginPct >= 20) {
    price += 5;
    reasons.push(`هامش صحي (${input.marginPct}%)`);
  }
  price = clamp(Math.round(price), 0, 100);

  // Technical: completeness of terms
  let technical = 50;
  if (input.hasDeliveryTerms) {
    technical += 15;
    reasons.push("شروط التسليم موثقة");
  } else reasons.push("شروط التسليم غائبة — غموض تنفيذي");
  if (input.hasPaymentTerms) {
    technical += 15;
    reasons.push("شروط الدفع موثقة");
  } else reasons.push("شروط الدفع غائبة — خطر سيولة");
  if (input.hasWarrantyOrPenalty) {
    technical += 10;
    reasons.push("ضمان/جزاءات موثقة");
  }
  if (input.alternativesCount > 0) {
    technical += 10;
    reasons.push(`${input.alternativesCount} بدائل مطروحة للمقارنة`);
  }
  technical = clamp(technical, 0, 100);

  // Commercial: negotiation dynamics
  let commercial = 65;
  if (input.negotiationRounds === 0)
    reasons.push("لا جولات تفاوض بعد — مجال للتحسين");
  else if (input.negotiationRounds <= 3) {
    commercial += 10;
    reasons.push(`${input.negotiationRounds} جولات تفاوض — تفاعل صحي`);
  } else {
    commercial -= 10;
    reasons.push(
      `${input.negotiationRounds} جولات — تفاوض متعثر قد يقتل الصفقة`
    );
  }
  commercial = clamp(commercial, 0, 100);

  // Risk: validity + margin safety
  let risk = 70;
  if (input.validityDaysLeft != null) {
    if (input.validityDaysLeft < 0) {
      risk -= 40;
      reasons.push("انتهت صلاحية العرض — خطر الالتزام بسعر قديم");
    } else if (input.validityDaysLeft < 7) {
      risk -= 15;
      reasons.push(`الصلاحية تنتهي خلال ${input.validityDaysLeft} أيام`);
    } else reasons.push(`الصلاحية سارية (${input.validityDaysLeft} يوم)`);
  }
  if (input.marginPct < 0) risk -= 20;
  risk = clamp(risk, 0, 100);

  const total = r2(
    price * w.price +
      technical * w.technical +
      commercial * w.commercial +
      risk * w.risk
  );
  return { price, technical, commercial, risk, total, weights: w, reasons };
}

/** Rank a set of options (alternatives or competing offers) by score desc. */
export function rankOptions(
  options: Array<{
    id: string;
    label: string;
    score: number;
    reasons?: string[];
  }>
): RankedOption[] {
  return [...options]
    .sort((a, b) => b.score - a.score)
    .map((o, i) => ({
      id: o.id,
      label: o.label,
      score: o.score,
      rank: i + 1,
      reasons: o.reasons ?? [],
    }));
}

// ─── Benchmarking ─────────────────────────────────────────────────────────

export function benchmarkHistory(history: HistoryPoint[]): Benchmarks | null {
  if (history.length === 0) return null;
  const totals = history.map(h => h.total);
  const avg = mean(totals);
  const med = median(totals);
  const sd = stddev(totals);
  const margins = history
    .map(h => h.marginPct)
    .filter((m): m is number => typeof m === "number");
  const decided = history.filter(h => typeof h.won === "boolean");
  return {
    historyCount: history.length,
    avgTotal: r2(avg),
    medianTotal: r2(med),
    minTotal: Math.min(...totals),
    maxTotal: Math.max(...totals),
    stddev: r2(sd),
    fairValue: r2(med), // robust estimator — median resists manipulation
    expectedLow: r2(Math.max(0, med - sd)),
    expectedHigh: r2(med + sd),
    marginAvg: margins.length ? r2(mean(margins)) : null,
    winRate: decided.length
      ? r2((decided.filter(h => h.won).length / decided.length) * 100)
      : null,
  };
}

// ─── Anomaly & manipulation detection ─────────────────────────────────────

export function detectAnomalies(
  current: {
    grandTotal: number;
    marginPct: number;
    itemsHash?: string;
    discountPctTotal?: number; // total discount / gross
  },
  history: HistoryPoint[]
): Anomaly[] {
  const out: Anomaly[] = [];
  if (history.length >= 3) {
    const totals = history.map(h => h.total);
    const m = mean(totals);
    const sd = stddev(totals);
    if (sd > 0) {
      const z = (current.grandTotal - m) / sd;
      if (Math.abs(z) >= 3)
        out.push({
          type: "price_outlier",
          severity: "critical",
          message: `سعر شاذ إحصائياً (z=${r2(z)}) — انحراف حاد عن التاريخ`,
          evidence: { z: r2(z), mean: r2(m), stddev: r2(sd) },
        });
      else if (Math.abs(z) >= 2)
        out.push({
          type: "price_deviation",
          severity: "warning",
          message: `انحراف سعري ملحوظ (z=${r2(z)})`,
          evidence: { z: r2(z), mean: r2(m), stddev: r2(sd) },
        });
    }
  }
  // Duplicates
  if (current.itemsHash) {
    const dups = history.filter(h => h.itemsHash === current.itemsHash);
    if (dups.length > 0)
      out.push({
        type: "duplicate",
        severity: "warning",
        message: `عرض مكرر — ${dups.length} عروض سابقة بنفس البنود`,
        evidence: { duplicateIds: dups.map(d => d.id) },
      });
  }
  // Manipulation: deep discount destroying margin
  if ((current.discountPctTotal ?? 0) > 30)
    out.push({
      type: "margin_manipulation",
      severity: "critical",
      message: `خصم إجمالي ${(current.discountPctTotal ?? 0).toFixed(1)}% — اشتباه تلاعب أو خطأ تسعير`,
      evidence: { discountPctTotal: current.discountPctTotal },
    });
  else if ((current.discountPctTotal ?? 0) > 20)
    out.push({
      type: "high_discount",
      severity: "warning",
      message: `خصم إجمالي مرتفع (${(current.discountPctTotal ?? 0).toFixed(1)}%)`,
      evidence: { discountPctTotal: current.discountPctTotal },
    });
  if (current.marginPct < 0)
    out.push({
      type: "negative_margin",
      severity: "critical",
      message: `هامش سالب (${current.marginPct}%) — بيع بخسارة`,
      evidence: { marginPct: current.marginPct },
    });
  // Suspicious: identical totals repeated (possible copy-paste fraud)
  const sameTotals = history.filter(h => h.total === current.grandTotal).length;
  if (sameTotals >= 2)
    out.push({
      type: "repeated_total",
      severity: "warning",
      message: `نفس الإجمالي تكرر ${sameTotals} مرات تاريخياً — تحقق من الاستقلالية`,
      evidence: { count: sameTotals },
    });
  return out;
}

// ─── Forecasting ──────────────────────────────────────────────────────────

/** Heuristic win-probability: calibrated on price deviation, margin, dynamics. */
export function forecastWin(input: {
  grandTotal: number;
  marginPct: number;
  benchmarkAvg: number | null;
  scoreTotal: number;
  negotiationRounds: number;
  validityDaysLeft: number | null;
  historyWinRate: number | null;
}): Forecast {
  const drivers: string[] = [];
  let p = input.historyWinRate ?? 50;
  drivers.push(`معدل الفوز التاريخي ${p}% كأساس`);
  if (input.benchmarkAvg && input.benchmarkAvg > 0) {
    const dev =
      ((input.grandTotal - input.benchmarkAvg) / input.benchmarkAvg) * 100;
    if (dev <= -5) {
      p += 15;
      drivers.push(`سعر تنافسي (${r2(dev)}% تحت المتوسط) يرفع الفوز`);
    } else if (dev > 15) {
      p -= 20;
      drivers.push(`سعر مرتفع (+${r2(dev)}%) يخفض الفوز`);
    }
  }
  p += (input.scoreTotal - 60) * 0.3;
  drivers.push(`جودة العرض (score=${input.scoreTotal}) تعدّل الاحتمال`);
  if (input.negotiationRounds > 4) {
    p -= 10;
    drivers.push("تفاوض مطوّل — إرهاق الصفقة");
  }
  if (input.validityDaysLeft != null && input.validityDaysLeft < 0) {
    p -= 25;
    drivers.push("انتهت الصلاحية");
  }
  if (input.marginPct < 0) {
    p -= 5;
    drivers.push("هامش سالب — حتى الفوز خسارة");
  }
  p = clamp(Math.round(p), 1, 97);
  const expectedValue = r2(input.grandTotal * (p / 100));
  const expectedCloseDays =
    input.negotiationRounds === 0
      ? 14
      : clamp(14 - input.negotiationRounds * 2, 2, 14);
  return { winProbability: p, expectedValue, expectedCloseDays, drivers };
}

// ─── Recommendations ──────────────────────────────────────────────────────

export function recommendActions(input: {
  doc: QuotationDocInput;
  score: ScoreBreakdown;
  benchmarks: Benchmarks | null;
  anomalies: Anomaly[];
  forecast: Forecast;
}): Recommendation[] {
  const recs: Recommendation[] = [];
  const computed = computeDocument(input.doc);
  let pri = 1;
  const takePriority = (): number => pri++;
  for (const a of input.anomalies.filter(a => a.severity === "critical"))
    recs.push({
      action: `معالجة فورية: ${a.message}`,
      impact: "high",
      priority: takePriority(),
      rationale: "شذوذ حرج يهدد سلامة القرار السعري",
      evidence: a.evidence,
    });
  if (input.benchmarks && computed.grandTotal > input.benchmarks.expectedHigh)
    recs.push({
      action: `خفض الإجمالي نحو القيمة العادلة ${input.benchmarks.fairValue}`,
      impact: "high",
      priority: takePriority(),
      rationale: `الإجمالي الحالي فوق النطاق المتوقع [${input.benchmarks.expectedLow} – ${input.benchmarks.expectedHigh}]`,
      evidence: {
        current: computed.grandTotal,
        fairValue: input.benchmarks.fairValue,
      },
    });
  if (computed.marginPct < 10)
    recs.push({
      action: "إعادة هيكلة الخصومات لحماية هامش ≥ 10%",
      impact: "high",
      priority: takePriority(),
      rationale: `الهامش الحالي ${computed.marginPct}% يعرض الربحية للخطر`,
      evidence: { marginPct: computed.marginPct },
    });
  if (input.score.commercial < 70)
    recs.push({
      action: "فتح جولة تفاوض موثقة لاختبار مرونة الطرف الآخر",
      impact: "medium",
      priority: takePriority(),
      rationale: "لا يوجد تفاعل تفاوضي كافٍ لاكتشاف السعر المقبول",
      evidence: { commercialScore: input.score.commercial },
    });
  if (input.score.technical < 70)
    recs.push({
      action: "استكمال الشروط (دفع/تسليم/ضمان) قبل الإرسال",
      impact: "medium",
      priority: takePriority(),
      rationale: "النقص التوثيقي يخفض الثقة ويرفع النزاعات",
      evidence: { technicalScore: input.score.technical },
    });
  if (input.forecast.winProbability >= 70)
    recs.push({
      action: "تسريع الإغلاق — احتمال الفوز مرتفع",
      impact: "high",
      priority: takePriority(),
      rationale: `القيمة المتوقعة ${input.forecast.expectedValue} باحتمال ${input.forecast.winProbability}%`,
      evidence: { winProbability: input.forecast.winProbability },
    });
  else if (input.forecast.winProbability < 40)
    recs.push({
      action: "تقديم بديل مخفّض المواصفات بسعر منافس",
      impact: "medium",
      priority: takePriority(),
      rationale: "احتمال الفوز منخفض — البدائل تنقذ الصفقة",
      evidence: { winProbability: input.forecast.winProbability },
    });
  return recs.sort((a, b) => a.priority - b.priority);
}

// ─── What-If scenarios ────────────────────────────────────────────────────

export function whatIfScenarios(
  doc: QuotationDocInput,
  discountSteps = [0, 3, 5, 10]
): WhatIfScenario[] {
  return discountSteps.map(step => {
    const bumped: QuotationDocInput = {
      ...doc,
      headerDiscountPct: (doc.headerDiscountPct ?? 0) + step,
    };
    const c = computeDocument(bumped);
    const f = forecastWin({
      grandTotal: c.grandTotal,
      marginPct: c.marginPct,
      benchmarkAvg: null,
      scoreTotal: 65,
      negotiationRounds: 1,
      validityDaysLeft: 20,
      historyWinRate: 50,
    });
    return {
      scenario: step === 0 ? "الوضع الحالي" : `خصم إضافي ${step}%`,
      discountPctDelta: step,
      resultTotal: c.grandTotal,
      resultMarginPct: c.marginPct,
      winProbability: f.winProbability,
      note:
        c.marginPct < 0
          ? "تحذير: هامش سالب"
          : c.marginPct < 5
            ? "هامش حرج"
            : "هامش آمن",
    };
  });
}
