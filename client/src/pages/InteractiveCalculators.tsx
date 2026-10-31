import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { brand, whatsappLink, engineeringConsultLink } from "@/lib/brand";
import {
  BarChart3,
  HardHat,
  Sparkles,
  TrendingDown,
  MessageSquare,
  AlertCircle,
  Building,
  Coins,
  BookOpen,
  GraduationCap,
  Clock,
  Wrench,
} from "lucide-react";

export default function InteractiveCalculators() {
  const [activeTab, setActiveTab] = useState<
    "roi" | "structural" | "costPerMeter" | "academic"
  >("roi");

  // ── Calculator 1: ERP ROI & Waste Estimator States ──
  const [branches, setBranches] = useState<number>(2);
  const [invoicesPerDay, setInvoicesPerDay] = useState<number>(120);
  const [staffCount, setStaffCount] = useState<number>(4);
  const [avgSalaryUsd, setAvgSalaryUsd] = useState<number>(400);

  const wastedHoursPerMonth = branches * staffCount * 22 * 1.5;
  const monthlyWastedCost = (wastedHoursPerMonth / 176) * avgSalaryUsd;
  const annualSavedCost = Math.round(monthlyWastedCost * 12 * 0.75);

  // ── Calculator 2: Structural & BOQ Quick Estimator States ──
  const [plotArea, setPlotArea] = useState<number>(300);
  const [floors, setFloors] = useState<number>(3);
  const [slabType, setSlabType] = useState<"solid" | "hollow" | "flat">(
    "hollow"
  );

  const totalBuiltUpArea = plotArea * floors * 0.85;
  const concreteFactor =
    slabType === "flat" ? 0.45 : slabType === "hollow" ? 0.38 : 0.32;
  const steelFactor =
    slabType === "flat" ? 120 : slabType === "hollow" ? 100 : 85;

  const estimatedConcreteM3 = Math.round(totalBuiltUpArea * concreteFactor);
  const estimatedSteelTons =
    Math.round(((estimatedConcreteM3 * steelFactor) / 1000) * 10) / 10;
  const estimatedWasteTons = Math.round(estimatedSteelTons * 0.05 * 10) / 10;

  // ── Calculator 3: Cost Per Meter Estimator States ──
  const [buaArea, setBuaArea] = useState<number>(500);
  const [finishLevel, setFinishLevel] = useState<
    "skeleton" | "semi" | "deluxe"
  >("semi");
  const [currency, setCurrency] = useState<"SAR" | "USD">("SAR");

  // Rates in SAR approx
  const ratePerMeterSar =
    finishLevel === "skeleton" ? 450 : finishLevel === "semi" ? 850 : 1350;
  const ratePerMeter =
    currency === "USD" ? Math.round(ratePerMeterSar / 3.75) : ratePerMeterSar;
  const totalCost = buaArea * ratePerMeter;

  // ── Calculator 4: Academic Research & Student Services Estimator States ──
  const [academicServiceType, setAcademicServiceType] = useState<
    "thesis" | "spss" | "presentation" | "pc_maintenance"
  >("thesis");
  const [academicUnits, setAcademicUnits] = useState<number>(30); // pages or slides or samples
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  const academicBaseRate =
    academicServiceType === "thesis"
      ? 12
      : academicServiceType === "spss"
        ? 15
        : academicServiceType === "presentation"
          ? 8
          : 120; // fixed maintenance

  const academicRawCost =
    academicServiceType === "pc_maintenance"
      ? academicBaseRate
      : academicUnits * academicBaseRate;
  const academicTotalCost = Math.round(
    isUrgent ? academicRawCost * 1.35 : academicRawCost
  );
  const academicEstDays = isUrgent
    ? "24 - 48 ساعة"
    : academicServiceType === "pc_maintenance"
      ? "يوم واحد"
      : "3 - 5 أيام عمل";

  const sendRoiQuoteToWhatsApp = () => {
    const msg =
      "السلام عليكم مؤسسة الحسينية،\nأجريت حساب العائد الاستثماري لنظام Uamex_erp:\n- الفروع: " +
      branches +
      "\n- الفواتير اليومية: " +
      invoicesPerDay +
      "\n- الموظفون: " +
      staffCount +
      "\n- الوفر السنوي التقديري: " +
      annualSavedCost.toLocaleString() +
      " دولار\nأود مناقشة خطة التطبيق.";
    window.open(whatsappLink(msg), "_blank");
  };

  const sendBoqQuoteToWhatsApp = () => {
    const msg =
      "السلام عليكم الاستشارات الهندسية - مؤسسة الحسينية،\nأجريت التقدير الأولي لكميات المبنى:\n- مساحة الأرض: " +
      plotArea +
      " م²\n- الأدوار: " +
      floors +
      "\n- مساحة البناء: " +
      totalBuiltUpArea +
      " م²\n- الخرسانة: " +
      estimatedConcreteM3 +
      " م³\n- حديد التسليح: " +
      estimatedSteelTons +
      " طن\nأود طلب دراسة وجدول كميات (BOQ) معتمد.";
    window.open(engineeringConsultLink(msg), "_blank");
  };

  const sendCostPerMeterQuote = () => {
    const finishLabel =
      finishLevel === "skeleton"
        ? "عظم فقط"
        : finishLevel === "semi"
          ? "نصف تشطيب"
          : "تشطيب ديلوكس";
    const msg =
      "السلام عليكم قسم الاستشارات الهندسية - مؤسسة الحسينية،\nأجريت تقدير تكلفة البناء التقريبية:\n- إجمالي مساحة البناء: " +
      buaArea +
      " م²\n- مستوى التشطيب: " +
      finishLabel +
      "\n- التكلفة التقديرية: " +
      totalCost.toLocaleString() +
      " " +
      (currency === "SAR" ? "ريال سعودي" : "دولار") +
      "\nأود طلب دراسة هندسية وجدول كميات مفصل.";
    window.open(engineeringConsultLink(msg), "_blank");
  };

  const sendAcademicQuote = () => {
    const serviceLabel =
      academicServiceType === "thesis"
        ? "مساعدة وإعداد أبحاث/رسائل علمية"
        : academicServiceType === "spss"
          ? "تحليل إحصائي SPSS / AMOS"
          : academicServiceType === "presentation"
            ? "تصميم وتنسيق عروض تقديمية وحصولات"
            : "صيانة وتجهيز حاسوب ولابتوب";
    const msg =
      "السلام عليكم قسم الخدمات الأكاديمية - مكتبة الحسينية الحديثة،\nأود طلب الخدمة التالية:\n- الخدمة: " +
      serviceLabel +
      "\n- الكمية/الصفحات: " +
      (academicServiceType === "pc_maintenance" ? "جهاز واحد" : academicUnits) +
      "\n- الأولوية: " +
      (isUrgent ? "عاجل (خلال 24-48 ساعة)" : "عادي") +
      "\n- التكلفة التقديرية: " +
      academicTotalCost.toLocaleString() +
      " ر.س\nأود البدء في التجهيز.";
    window.open(whatsappLink(msg), "_blank");
  };

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground font-display"
      dir="rtl"
    >
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative text-white py-24 px-4 overflow-hidden bg-ink">
        <div className="absolute inset-0 tech-grid opacity-25 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(184,121,69,0.14) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand/15 border border-brand/30 text-brand-300 px-5 py-2 rounded-full text-xs font-black">
            <Sparkles className="w-4 h-4" />
            حاسبات وأدوات تقديرية ذكية
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-balance">
            معادلات حسابية وهندسية
            <span className="block gradient-text-white">
              {" "}
              مبنية على الواقع الميداني
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-white/65 leading-relaxed font-light">
            قدّر حجم الوفر المالي لنظام Uamex_erp، أو احسب التقدير الأولي لكميات
            وتكاليف البناء لمشروعك بضغطة زر.
          </p>
        </div>
      </section>

      {/* ── Tabs Navigation ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-muted/60 p-2 rounded-2xl border border-border">
          <button
            onClick={() => setActiveTab("roi")}
            className={
              "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all " +
              (activeTab === "roi"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <BarChart3 className="w-4 h-4 text-brand" />
            وفر وعائد Uamex_erp ERP
          </button>
          <button
            onClick={() => setActiveTab("structural")}
            className={
              "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all " +
              (activeTab === "structural"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <HardHat className="w-4 h-4 text-amber-500" />
            كميات الخرسانة والحديد
          </button>
          <button
            onClick={() => setActiveTab("costPerMeter")}
            className={
              "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all " +
              (activeTab === "costPerMeter"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <Coins className="w-4 h-4 text-emerald-500" />
            تكلفة البناء والتشطيب
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={
              "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-extrabold transition-all " +
              (activeTab === "academic"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <BookOpen className="w-4 h-4 text-sky-500" />
            أبحاث وخدمات الطلاب
          </button>
        </div>
      </section>

      {/* ── Active Calculator Container ─────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {activeTab === "roi" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Card className="lg:col-span-7 rounded-3xl border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-foreground mb-1">
                  مدخلات نشاطك التجاري
                </h3>
                <p className="text-xs text-muted-foreground">
                  حرّك المؤشرات لتطابق واقع شركتك أو نقاط بيعك:
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>عدد الفروع أو المستودعات:</span>
                  <span className="text-brand font-mono text-sm">
                    {branches} فرع
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={branches}
                  onChange={e => setBranches(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>متوسط الفواتير اليومية:</span>
                  <span className="text-brand font-mono text-sm">
                    {invoicesPerDay} فاتورة/يوم
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={invoicesPerDay}
                  onChange={e => setInvoicesPerDay(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>موظفو المحاسبة والمخازن:</span>
                  <span className="text-brand font-mono text-sm">
                    {staffCount} موظفين
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={staffCount}
                  onChange={e => setStaffCount(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
              </div>
            </Card>

            <div className="lg:col-span-5 space-y-5">
              <Card className="rounded-3xl bg-ink text-white p-6 sm:p-8 space-y-6 border-0 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 tech-grid opacity-15 pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs text-brand-300 font-bold">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    النتائج التقديرية للوفر السنوي
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-black text-brand-300 font-mono">
                      {"~$" + annualSavedCost.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/60">
                      وفر مباشر سنوي من تقليص ساعات الجرد والأخطاء
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs">
                    <div className="flex justify-between items-center text-white/80">
                      <span>ساعات العمل المستردة شهرياً:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {Math.round(wastedHoursPerMonth * 0.75)} ساعة
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-white/80">
                      <span>نسبة دقة المخزون المتوقعة:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        99.4%
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={sendRoiQuoteToWhatsApp}
                    className="w-full h-12 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs gap-2 rounded-xl mt-4"
                  >
                    <MessageSquare className="w-4 h-4" />
                    احصل على العرض التجريبي بهذه الأرقام
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : activeTab === "structural" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Card className="lg:col-span-7 rounded-3xl border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-foreground mb-1">
                  بيانات المبنى والمشروع
                </h3>
                <p className="text-xs text-muted-foreground">
                  أدخل مسطح البناء وعدد الأدوار لحساب التقدير الإنشائي:
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>مساحة مسطح الدور (م²):</span>
                  <span className="text-amber-500 font-mono text-sm">
                    {plotArea} م²
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="10"
                  value={plotArea}
                  onChange={e => setPlotArea(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>عدد الأدوار:</span>
                  <span className="text-amber-500 font-mono text-sm">
                    {floors} أدوار
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={floors}
                  onChange={e => setFloors(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">نوع السقف:</Label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "hollow", label: "هوردي (Hollow)" },
                    { id: "flat", label: "فلات سلاب (Flat)" },
                    { id: "solid", label: "عادي (Solid)" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSlabType(id as any)}
                      className={
                        "py-2 px-2 rounded-xl text-xs font-bold border transition-all " +
                        (slabType === id
                          ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400"
                          : "border-border text-muted-foreground hover:bg-muted/40")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <div className="lg:col-span-5 space-y-5">
              <Card className="rounded-3xl bg-ink text-white p-6 sm:p-8 space-y-6 border-0 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 tech-grid opacity-15 pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                    <HardHat className="w-4 h-4" />
                    التقدير الإنشائي الأولي
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                        {estimatedConcreteM3}
                      </div>
                      <div className="text-[11px] text-white/60 mt-1">
                        م³ خرسانة مسلحة
                      </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="text-2xl sm:text-3xl font-black text-brand-300 font-mono">
                        {estimatedSteelTons}
                      </div>
                      <div className="text-[11px] text-white/60 mt-1">
                        طن حديد تسليح
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                    <div className="flex justify-between text-white/80">
                      <span>إجمالي مساحة البناء:</span>
                      <span className="font-mono font-bold text-white">
                        {totalBuiltUpArea} م²
                      </span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>الهدر الموصى به:</span>
                      <span className="font-mono font-bold text-rose-300">
                        +5% ({estimatedWasteTons} طن)
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={sendBoqQuoteToWhatsApp}
                    className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-ink font-black text-xs gap-2 rounded-xl mt-4"
                  >
                    <MessageSquare className="w-4 h-4" />
                    طلب جدول كميات (BOQ) معتمد
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : activeTab === "costPerMeter" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Card className="lg:col-span-7 rounded-3xl border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-foreground mb-1">
                  تقدير تكلفة المتر المربع للبناء والتشطيب
                </h3>
                <p className="text-xs text-muted-foreground">
                  حدّد إجمالي مسطحات البناء ومستوى التشطيب المطلوب:
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>إجمالي مساحة البناء (م²):</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {buaArea} م²
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="50"
                  value={buaArea}
                  onChange={e => setBuaArea(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  مستوى التشطيب والتنفيذ:
                </Label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "skeleton", label: "عظم فقط" },
                    { id: "semi", label: "نصف تشطيب" },
                    { id: "deluxe", label: "تشطيب ديلوكس" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFinishLevel(id as any)}
                      className={
                        "py-2.5 px-2 rounded-xl text-xs font-bold border transition-all " +
                        (finishLevel === id
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : "border-border text-muted-foreground hover:bg-muted/40")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  العملة المفضلة للعرض:
                </Label>
                <div className="flex gap-2">
                  {[
                    { id: "SAR", label: "ريال سعودي (SAR)" },
                    { id: "USD", label: "دولار أمريكي ($)" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCurrency(id as any)}
                      className={
                        "py-2 px-4 rounded-xl text-xs font-bold border transition-all " +
                        (currency === id
                          ? "bg-brand/15 border-brand text-brand"
                          : "border-border text-muted-foreground hover:bg-muted/40")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <div className="lg:col-span-5 space-y-5">
              <Card className="rounded-3xl bg-ink text-white p-6 sm:p-8 space-y-6 border-0 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 tech-grid opacity-15 pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                    <Coins className="w-4 h-4" />
                    التكلفة الإجمالية التقديرية
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
                      {totalCost.toLocaleString()}{" "}
                      {currency === "SAR" ? "ر.س" : "$"}
                    </div>
                    <div className="text-xs text-white/60">
                      متوسط كلفة المتر: {ratePerMeter.toLocaleString()}{" "}
                      {currency === "SAR" ? "ر.س/م²" : "$/م²"}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-white/80">
                    <p className="leading-relaxed">
                      هذا التقدير استرشادي، للحصول على تكلفة دقيقة بالريال
                      والهللة مع تفصيل أسعار البلك والحديد والخرسانة، اطلب جدول
                      كميات معتمد لمشروعك.
                    </p>
                  </div>

                  <Button
                    onClick={sendCostPerMeterQuote}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-ink font-black text-xs gap-2 rounded-xl mt-4"
                  >
                    <MessageSquare className="w-4 h-4" />
                    طلب تسعيرة وجدول كميات تفصيلي
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Card className="lg:col-span-7 rounded-3xl border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-500 text-xs font-bold mb-2">
                  <GraduationCap className="w-4 h-4" />
                  مكتبة الحسينية الحديثة - الدعم الأكاديمي والطلابي
                </div>
                <h3 className="text-xl font-black text-foreground mb-1">
                  تقدير تكلفة وزمن الخدمات العلمية والطلابية
                </h3>
                <p className="text-xs text-muted-foreground">
                  حدد نوع الخدمة والحجم المطلوب لحساب التكلفة والزمن المتوقع
                  للتسليم:
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold">
                  نوع الخدمة المطلوب التجهيز لها:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: "thesis",
                      label: "مساعدة أبحاث ورسائل علمية",
                      icon: GraduationCap,
                    },
                    {
                      id: "spss",
                      label: "تحليل إحصائي (SPSS / AMOS)",
                      icon: BarChart3,
                    },
                    {
                      id: "presentation",
                      label: "تصميم وتنسيق عروض وأبحاث",
                      icon: BookOpen,
                    },
                    {
                      id: "pc_maintenance",
                      label: "صيانة وتجهيز كمبيوتر/لابتوب",
                      icon: Wrench,
                    },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAcademicServiceType(id as any)}
                      className={
                        "flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold border transition-all text-right " +
                        (academicServiceType === id
                          ? "bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400"
                          : "border-border text-muted-foreground hover:bg-muted/40")
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {academicServiceType !== "pc_maintenance" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <Label className="font-bold">
                      {academicServiceType === "spss"
                        ? "عدد الاستبيانات أو العينات الإحصائية:"
                        : academicServiceType === "presentation"
                          ? "عدد الشرائح أو الصفحات:"
                          : "عدد صفحات البحث / الدراسة:"}
                    </Label>
                    <span className="font-mono font-bold text-sky-500 text-sm">
                      {academicUnits}{" "}
                      {academicServiceType === "presentation"
                        ? "صفحة/شريحة"
                        : "وحدة/صفحة"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    step="5"
                    value={academicUnits}
                    onChange={e => setAcademicUnits(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-bold">
                  أولوية التسليم المطلوب:
                </Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsUrgent(false)}
                    className={
                      "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all " +
                      (!isUrgent
                        ? "bg-brand/15 border-brand text-brand"
                        : "border-border text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    عادي (3 - 5 أيام عمل)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUrgent(true)}
                    className={
                      "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all " +
                      (isUrgent
                        ? "bg-rose-500/15 border-rose-500 text-rose-500"
                        : "border-border text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    ⚡ عاجل جداً (24 - 48 ساعة)
                  </button>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-5 space-y-5">
              <Card className="rounded-3xl bg-ink text-white p-6 sm:p-8 space-y-6 border-0 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 tech-grid opacity-15 pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-bold">
                    <GraduationCap className="w-4 h-4" />
                    التكلفة والزمن المتوقع للطلب
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-black text-sky-400 font-mono">
                      {academicTotalCost.toLocaleString()} ر.س
                    </div>
                    <div className="text-xs text-white/60 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400 inline" />{" "}
                      الزمن المتوقع: {academicEstDays}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-white/80">
                    <p className="leading-relaxed">
                      يشمل العمل: التدقيق اللغوي، التنسيق وفق الدليل المعتمد
                      (APA/Harvard)، مراجعة خلو الانتحال، والتوثيق العلمي
                      المعتمد من مكتبة الحسينية الحديثة.
                    </p>
                  </div>

                  <Button
                    onClick={sendAcademicQuote}
                    className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-ink font-black text-xs gap-2 rounded-xl mt-4"
                  >
                    <MessageSquare className="w-4 h-4" />
                    طلب الخدمة مباشرة عبر واتساب المكتبة
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
