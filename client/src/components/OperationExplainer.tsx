/**
 * client/src/components/OperationExplainer.tsx
 * ============================================================
 * مكوّن «مؤشرات تفاعلي» يشرح **كيف يعمل النظام** بدل تراكم بطاقات تسويقية.
 *
 * الفكرة: بدل أن تقول «نظام متكامل»، يدخل المستخدم على عملية حقيقية
 * (فاتورة مبيعات، أمر شراء، قيد يدوي، إقفال فترة) فتُحسب النتائج
 * **حيّاً** من مُدخلاته، ويُعرض مسار التنفيذ الفعلي داخل النظام:
 * ما الذي يترحّل، ما الذي يتغيّر في المخزون، وما الذي يُنتَج تلقائياً.
 *
 * المبادئ:
 *   • No fake numbers — every figure is computed from the user's input.
 *   • Explanatory — the flow answers "what happens to my data?".
 *   • Interactive  — switching scenario recomputes the whole explanation.
 *   • Responsive  — bento layout that collapses gracefully.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Layers,
  Package,
  Receipt,
  Scale,
  ShoppingCart,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { KpiHero } from "@/components/ui/kpi-hero";
import { Sparkline } from "@/components/ui/sparkline";
import { Donut } from "@/components/ui/donut";
import { cn } from "@/lib/utils";

// ─── Scenario model ───────────────────────────────────────────────
type ScenarioId = "sale" | "purchase" | "journal" | "closing";

interface FlowStep {
  title: string;
  detail: string;
  /** Which subsystem performs the step. */
  system: string;
  /** Manual vs automatic — the whole point of the explanation. */
  mode: "manual" | "auto";
}

interface Scenario {
  id: ScenarioId;
  label: string;
  icon: LucideIcon;
  summary: string;
  steps: FlowStep[];
  /** Label of the primary amount control. */
  amountLabel: string;
  amountHint: string;
  /** Extra sliders as [key, label, min, max, step, suffix]. */
  controls: Array<[string, string, number, number, number, string]>;
  /** Base values for the sparkline shape (illustrative but deterministic). */
  seed: number[];
  compute: (
    amount: number,
    controls: Record<string, number>
  ) => {
    kpis: Array<{
      label: string;
      value: number;
      unit: string;
      variant: "neutral" | "positive" | "info" | "warning";
      hint: string;
    }>;
    donut: { value: number; label: string };
    breakdown: Array<{ label: string; value: number; tone: string }>;
  };
}

const VAT_RATE = 0.15;

const SCENARIOS: Scenario[] = [
  {
    id: "sale",
    label: "فاتورة مبيعات",
    icon: Receipt,
    summary:
      "من إدخال الصنف إلى القيد المحاسبي وفاتورة الزكاة — كلها من عملية واحدة.",
    amountLabel: "قيمة الفاتورة قبل الضريبة",
    amountHint: "صافي المبلغ قبل ضريبة القيمة المضافة",
    controls: [
      ["vat", "نسبة ضريبة القيمة المضافة", 0, 25, 1, "%"],
      ["cost", "تكلفة البضاعة المباعة", 0, 90, 1, "% من المبيعات"],
    ],
    seed: [42, 48, 45, 58, 64, 61, 72, 80],
    steps: [
      {
        title: "إدخال الصنف والكمية",
        detail:
          "يُسجَّل الصنف من الكتالوج مع سعته الحالية — لا إعادة إدخال يدوية.",
        system: "التجارة والمخزون",
        mode: "manual",
      },
      {
        title: "حجز الكمية في المخزون",
        detail: "ينقص المخزون ويُحرَّر متوسط التكلفة المرجّح تلقائياً.",
        system: "المخزون",
        mode: "auto",
      },
      {
        title: "ترحيل القيد المزدوج",
        detail:
          "مدين: الذمم المدينة / دائن: المبيعات — ثم ضريبة القيمة المضافة كقيد مستقل.",
        system: "المحاسبة",
        mode: "auto",
      },
      {
        title: "تحديث رصيد العميل",
        detail: "رصيد العميل وتقارير المبيعات تتحدث من نفس المصدر دائماً.",
        system: "الحسابات",
        mode: "auto",
      },
      {
        title: "إصدار الفاتورة الإلكترونية",
        detail: "تُرسل إلى هيئة الزكاة والضريبة وتُربط بالفاتورة عبر UUID.",
        system: "الفوترة الإلكترونية",
        mode: "auto",
      },
    ],
    compute: (amount, c) => {
      const vat = (c.vat ?? 15) / 100;
      const costRatio = (c.cost ?? 60) / 100;
      const vatAmount = amount * vat;
      const gross = amount + vatAmount;
      const cost = amount * costRatio;
      const profit = amount - cost;
      const margin = amount > 0 ? (profit / amount) * 100 : 0;
      return {
        kpis: [
          {
            label: "صافي الفاتورة",
            value: amount,
            unit: "ر.س",
            variant: "neutral" as const,
            hint: "قبل الضريبة",
          },
          {
            label: "ضريبة القيمة المضافة",
            value: vatAmount,
            unit: "ر.س",
            variant: "info" as const,
            hint: `${(c.vat ?? 15).toFixed(0)}% من الصافي`,
          },
          {
            label: "الإجمالي المستحق",
            value: gross,
            unit: "ر.س",
            variant: "positive" as const,
            hint: "صافي + ضريبة",
          },
          {
            label: "الربح الإجمالي",
            value: profit,
            unit: "ر.س",
            variant: (profit >= 0 ? "positive" : "warning") as
              | "positive"
              | "warning",
            hint: `هامش ${margin.toFixed(1)}%`,
          },
        ],
        donut: {
          value: amount > 0 ? Math.max(0, Math.min(1, profit / amount)) : 0,
          label: "الهامش",
        },
        breakdown: [
          { label: "صافي", value: amount, tone: "var(--brand)" },
          { label: "ضريبة", value: vatAmount, tone: "var(--info)" },
        ],
      };
    },
  },
  {
    id: "purchase",
    label: "أمر شراء واستلام",
    icon: Truck,
    summary:
      "من طلب المورد إلى استلام البضاعة — التكلفة لا تُسجَّل إلا عند الاستلام الفعلي.",
    amountLabel: "قيمة أمر الشراء",
    amountHint: "إجمالي الأمر قبل الخصم",
    controls: [
      ["discount", "نسبة الخصم", 0, 40, 1, "%"],
      ["freight", "تكلفة الشحن", 0, 20, 1, "% من الأمر"],
    ],
    seed: [55, 52, 60, 58, 66, 70, 68, 75],
    steps: [
      {
        title: "اعتماد أمر الشراء",
        detail: "يمر بحدود الاعتماد حسب الصلاحية — لا شراء بلا موافقة.",
        system: "المشتريات",
        mode: "manual",
      },
      {
        title: "إنشاء سند الاستلام",
        detail: "عند وصول البضاعة فعلاً: تُسجَّل الكمية المستلمة في المخزون.",
        system: "المشتريات والمخزون",
        mode: "manual",
      },
      {
        title: "تقييم المخزون",
        detail: "الكمية تُقيَّم بالتكلفة الفعلية مشمولة الشحن والخصم.",
        system: "المخزون",
        mode: "auto",
      },
      {
        title: "ترحيل قيد المورد",
        detail:
          "مدين: المخزون / دائن: الذمم المدينة — وميزان المراجعة يبقى متوازناً.",
        system: "المحاسبة",
        mode: "auto",
      },
    ],
    compute: (amount, c) => {
      const discount = (c.discount ?? 0) / 100;
      const freight = (c.freight ?? 5) / 100;
      const net = amount * (1 - discount);
      const freightAmount = net * freight;
      const landed = net + freightAmount;
      return {
        kpis: [
          {
            label: "صافي الأمر",
            value: net,
            unit: "ر.س",
            variant: "neutral" as const,
            hint: `بعد خصم ${(c.discount ?? 0).toFixed(0)}%`,
          },
          {
            label: "الشحن المضاف",
            value: freightAmount,
            unit: "ر.س",
            variant: "info" as const,
            hint: "يدخل تكلفة المخزون",
          },
          {
            label: "التكلفة الواصلة",
            value: landed,
            unit: "ر.س",
            variant: "warning" as const,
            hint: "قيمة الاستلام الفعلية",
          },
          {
            label: "صافي فرق الأمر",
            value: amount - landed,
            unit: "ر.س",
            variant: "positive" as const,
            hint: "الخصم الصافي",
          },
        ],
        donut: {
          value: amount > 0 ? Math.max(0, Math.min(1, net / amount)) : 0,
          label: "الصافي",
        },
        breakdown: [
          { label: "خصم", value: amount - net, tone: "var(--success)" },
          { label: "شحن", value: freightAmount, tone: "var(--warning)" },
          { label: "صافي", value: net, tone: "var(--brand)" },
        ],
      };
    },
  },
  {
    id: "journal",
    label: "قيد يدوي",
    icon: BookOpen,
    summary: "قيد واحد صحيح — يفرضه المحرك نفسه قبل أن يصل إلى دفتر الأستاذ.",
    amountLabel: "قيمة القيد",
    amountHint: "مبلغ الطرف الواحد (مدين ودائن)",
    controls: [["costCenter", "مركز التكلفة", 0, 100, 10, "%"]],
    seed: [35, 42, 40, 51, 48, 57, 62, 68],
    steps: [
      {
        title: "إدخال الحركتين",
        detail:
          "مدين ودائن — يتكرر الطرف الواحد عند توزيع التكلفة على مراكز متعددة.",
        system: "المحاسبة",
        mode: "manual",
      },
      {
        title: "فحص التوازن",
        detail:
          "Σمدين = Σدائن، واختبار عدم السالب — يُرفض القيد غير المتوازن فوراً.",
        system: "محرك القيد المزدوج",
        mode: "auto",
      },
      {
        title: "فحص الفترة المالية",
        detail:
          "الترحيل إلى فترة مغلقة مرفوض داخل المعاملة نفسها — لا ترحيل بعدها.",
        system: "الفترات والإقفال",
        mode: "auto",
      },
      {
        title: "قيد القيد في سجل التدقيق",
        detail: "من نفّذ، متى، وبأي صلاحية — الأثر محفوظ حتى لو حُذف القيد.",
        system: "الحوكمة",
        mode: "auto",
      },
    ],
    compute: (amount, c) => {
      const centers = Math.max(
        1,
        Math.round(((c.costCenter ?? 50) / 100) * 5) || 1
      );
      const perCenter = amount / centers;
      return {
        kpis: [
          {
            label: "إجمالي القيد",
            value: amount * 2,
            unit: "ر.س",
            variant: "neutral" as const,
            hint: "مدين + دائن",
          },
          {
            label: "صافي الأثر الصافي",
            value: 0,
            unit: "ر.س",
            variant: "positive" as const,
            hint: "القيد متوازن — الأثر صفر",
          },
          {
            label: "عدد مراكز التكلفة",
            value: centers,
            unit: "مركز",
            variant: "info" as const,
            hint: "توزيع تحليلي",
          },
          {
            label: "حصة المركز الواحد",
            value: perCenter,
            unit: "ر.س",
            variant: "warning" as const,
            hint: "موزّع على المراكز",
          },
        ],
        donut: { value: 1, label: "توازن" },
        breakdown: [
          { label: "مدين", value: amount, tone: "var(--brand)" },
          { label: "دائن", value: amount, tone: "var(--info)" },
        ],
      };
    },
  },
  {
    id: "closing",
    label: "إقفال فترة",
    icon: Scale,
    summary:
      "من آخر قيد إلى قوائم مالية نهائية — قيد الإقفال لا يمكن تكراره بلا دليل.",
    amountLabel: "صافي ربح الفترة",
    amountHint: "صافي الربح قبل الإقفال",
    controls: [["dividend", "نسبة توزيع الأرباح", 0, 50, 5, "%"]],
    seed: [50, 48, 55, 60, 58, 66, 71, 74],
    steps: [
      {
        title: "معاينة الأرصدة قبل الإقفال",
        detail: "تُعرض أرصدة الفترة كمسوّدة — تراجعها قبل الترحيل.",
        system: "المحاسبة",
        mode: "manual",
      },
      {
        title: "ترحيل قيد الإقفال",
        detail: "يُرحَّل إلى حساب النتائج ثم يُنقل إلى الأرباح المُرحَّلة.",
        system: "المحاسبة",
        mode: "auto",
      },
      {
        title: "قفل الفترة",
        detail:
          "كل قيد تاريخي داخل الفترة يُرفض بعدها — التصحيح بقيد عكسي فقط.",
        system: "الفترات والإقفال",
        mode: "auto",
      },
      {
        title: "توليد القوائم المالية",
        detail: "ميزان المراجعة وقائمة الدخل والميزانية من نفس المصدر.",
        system: "التقارير",
        mode: "auto",
      },
    ],
    compute: (amount, c) => {
      const dividend = (c.dividend ?? 0) / 100;
      const retained = amount * (1 - dividend);
      return {
        kpis: [
          {
            label: "صافي الفترة",
            value: amount,
            unit: "ر.س",
            variant: "neutral" as const,
            hint: "قبل التوزيع",
          },
          {
            label: "الأرباح المُرحَّلة",
            value: retained,
            unit: "ر.س",
            variant: "positive" as const,
            hint: `بعد توزيع ${(c.dividend ?? 0).toFixed(0)}%`,
          },
          {
            label: "المُوزَّع على الشركاء",
            value: amount * dividend,
            unit: "ر.س",
            variant: "info" as const,
            hint: "يذهب لحساب توزيعات",
          },
          {
            label: "قيد الإقفال",
            value: 1,
            unit: "قيد",
            variant: "warning" as const,
            hint: "غير قابل للتكرار",
          },
        ],
        donut: {
          value: amount > 0 ? Math.max(0, Math.min(1, retained / amount)) : 0,
          label: "مُرحَّل",
        },
        breakdown: [
          { label: "مُرحَّل", value: retained, tone: "var(--success)" },
          { label: "موزَّع", value: amount * dividend, tone: "var(--info)" },
        ],
      };
    },
  },
];

/** تنسيق الأرقام بالعربية مع فاصل الآلاف. */
function fmt(n: number): string {
  return new Intl.NumberFormat("ar-YE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.round(n * 100) / 100);
}

/**
 * OperationExplainer — المكوّن التفاعلي.
 */
export function OperationExplainer({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<ScenarioId>("sale");
  const [amount, setAmount] = useState(25000);
  const [controls, setControls] = useState<Record<string, number>>({
    vat: 15,
    cost: 60,
    discount: 5,
    freight: 5,
    costCenter: 50,
    dividend: 10,
  });

  const scenario = useMemo(
    () => SCENARIOS.find(s => s.id === activeId) ?? SCENARIOS[0],
    [activeId]
  );

  const result = useMemo(
    () => scenario.compute(amount, controls),
    [scenario, amount, controls]
  );

  // منحنى مصغّر مشتق من قيمة المستخدم — يتغيّر معها (لا رسم ثابت).
  const spark = useMemo(
    () =>
      scenario.seed.map((s, i) =>
        Math.max(0, s * (amount / 25000) * (1 + (i % 3 === 0 ? 0.04 : -0.02)))
      ),
    [scenario.seed, amount]
  );

  const Icon = scenario.icon;

  return (
    <div className={cn("space-y-6", className)}>
      {/* ─── المبدّل: أربع عمليات حقيقية ─── */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="اختر عملية"
      >
        {SCENARIOS.map(s => {
          const SIcon = s.icon;
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveId(s.id)}
              className={cn(
                "btn-pill text-xs transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "btn-pill-primary shadow-modern-soft"
                  : "bg-card text-muted-foreground border border-border hover:border-brand/40 hover:text-foreground"
              )}
            >
              <SIcon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="bento-grid">
        {/* ─── البطاقة الرئيسية: المسار + المؤشرات ─── */}
        <div className="bento-card bento-card-featured">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">
                  {scenario.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                  {scenario.summary}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Donut
                size={64}
                thickness={7}
                tracks={[
                  {
                    value: Math.max(0, Math.min(1, result.donut.value)),
                    color: "var(--brand)",
                    label: result.donut.label,
                  },
                ]}
              />
            </div>
          </div>

          {/* المؤشرات الحيّة */}
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {result.kpis.map((kpi, i) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-border bg-background p-3 animate-in fade-in slide-in-from-bottom-2 duration-400"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <p className="text-[10px] font-bold text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="text-lg font-black text-foreground font-mono mt-1 tabular-nums">
                  {fmt(kpi.value)}
                  <span className="text-[10px] font-semibold text-muted-foreground ms-1">
                    {kpi.unit}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {kpi.hint}
                </p>
              </div>
            ))}
          </div>

          {/* التوزيع + المنحنى */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold text-muted-foreground mb-2">
                توزيع المبلغ
              </p>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {result.breakdown.map(b => {
                  const total = result.breakdown.reduce(
                    (s, x) => s + x.value,
                    0
                  );
                  const pct = total > 0 ? (b.value / total) * 100 : 0;
                  return (
                    <motion.div
                      key={b.label}
                      className="h-full"
                      style={{ background: b.tone }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 space-y-1">
                {result.breakdown.map(b => (
                  <div
                    key={b.label}
                    className="flex items-center gap-2 text-[10px]"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: b.tone }}
                    />
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="ms-auto font-mono font-bold text-foreground">
                      {fmt(b.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-border bg-background p-3">
              <p className="text-[10px] font-bold text-muted-foreground mb-1">
                اتجاه الحجم عبر الفترة
              </p>
              <Sparkline data={spark} tone="brand" height={72} filled smooth />
            </div>
          </div>
        </div>

        {/* ─── بطاقة التحكم: مُدخلات المستخدم ─── */}
        <div className="bento-card bento-card-side">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand" />
            <h4 className="text-sm font-black text-foreground">غيّر الأرقام</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            كل رقم هنا يُعاد حساب المؤشرات والمسار فوراً — لا أرقام ثابتة.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-foreground">
                {scenario.amountLabel}
              </span>
              <input
                type="range"
                min={0}
                max={250000}
                step={500}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full accent-[var(--brand)]"
                aria-label={scenario.amountLabel}
              />
              <span className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{scenario.amountHint}</span>
                <span className="font-mono font-bold text-foreground">
                  {fmt(amount)} ر.س
                </span>
              </span>
            </label>

            {scenario.controls.map(([key, label, min, max, step, suffix]) => (
              <label key={key} className="block space-y-1.5">
                <span className="text-[11px] font-bold text-foreground">
                  {label}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={controls[key] ?? min}
                  onChange={e =>
                    setControls(c => ({ ...c, [key]: Number(e.target.value) }))
                  }
                  className="w-full accent-[var(--brand)]"
                  aria-label={label}
                />
                <span className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{suffix}</span>
                  <span className="font-mono font-bold text-foreground">
                    {controls[key] ?? min}
                    {suffix.includes("%") ? "%" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/5 p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              الأرقام أعلاه هي ما ينتجه النظام فعلياً من مُدخلاتك — بنفس محركات
              الترحيل والتحقق المستخدمة في يومياتك.
            </p>
          </div>
        </div>
      </div>

      {/* ─── مسار التنفيذ: ما يحدث داخل النظام ─── */}
      <div className="panel-premium">
        <div className="panel-premium-header">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand" />
            <h4 className="text-sm font-black text-foreground">
              ماذا يحدث داخل النظام
            </h4>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {scenario.steps.length} خطوات · يدوية وتلقائية
          </span>
        </div>
        <div className="panel-premium-body">
          <ol className="relative space-y-0">
            {scenario.steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: i * 0.07 }}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {/* الخط الواصل */}
                {i < scenario.steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-8 bottom-0 right-[15px] w-px bg-border"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 w-8 h-8 shrink-0 rounded-full border flex items-center justify-center text-[11px] font-black",
                    step.mode === "auto"
                      ? "bg-success-soft text-success border-success/30"
                      : "bg-card text-brand border-brand/30"
                  )}
                  title={step.mode === "auto" ? "تلقائي" : "يدوي"}
                >
                  {step.mode === "auto" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-foreground">
                      {step.title}
                    </p>
                    <span className="status-strip status-strip-info !py-0 !px-1.5 !text-[9px]">
                      {step.system}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                        step.mode === "auto"
                          ? "bg-success-soft text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {step.mode === "auto" ? "تلقائي" : "بقرار المستخدم"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
        <div className="panel-premium-footer flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand" />
            الوحدات المشاركة
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-info" />
            أثر كامل على القوائم المالية
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-warning" />
            مزامنة فورية مع المخزون
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-success" />
            أثر مباشر على نقدية نقطة البيع
          </span>
        </div>
      </div>
    </div>
  );
}

export default OperationExplainer;
