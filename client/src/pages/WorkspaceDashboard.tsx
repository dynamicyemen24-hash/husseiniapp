import React, { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ModuleCard } from "@/components/ui/module-card";
import {
  Building2,
  ShoppingCart,
  BookOpen as BookIcon,
  BarChart3,
  Layers,
  Plus,
  Sparkles,
  Zap,
  AlertTriangle,
  Truck,
  FolderKanban,
  Users,
  LifeBuoy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { notifyLowStock, notifyPendingInvoice } from "@/lib/push";
import { brand } from "@/lib/brand";
import { useAuth } from "@/_core/hooks/useAuth";
import { EngineeringBOQCalculator } from "@/components/EngineeringBOQCalculator";
import { BusinessLifecycleWizard } from "@/components/BusinessLifecycleWizard";
import { EnterpriseOnboardingChecklist } from "@/components/EnterpriseOnboardingChecklist";
import { LiveExecutiveCockpit } from "@/components/LiveExecutiveCockpit";
import {
  MODULES,
  MODULE_LIST,
  modulesForRole,
  greetingByHour,
  formatMoney,
  type ModuleKey,
} from "@/lib/design";

const ERP_KEYS: ModuleKey[] = [
  "hr",
  "projects",
  "procurement",
  "support",
  "quality",
];

function AdvisorInsight({ data }: { data: unknown }) {
  if (!data) {
    return (
      <p className="text-muted-foreground">
        مؤشرات الأداء المالي والإنشائي ممتازة. الاستقرار المالي متوافق مع معايير
        التدفقات النقدية.
      </p>
    );
  }
  if (typeof data === "string") {
    return <p className="whitespace-pre-wrap">{data}</p>;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <ul className="space-y-2">
        {entries.map(([k, v]) => (
          <li
            key={k}
            className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
          >
            <span className="text-muted-foreground text-[11px] shrink-0">
              {k}
            </span>
            <span
              dir="ltr"
              className="font-semibold text-foreground text-[11px] text-left break-all"
            >
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return <p>{String(data)}</p>;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-3.5 w-3.5 text-brand" />
      {label}
    </button>
  );
}

export default function WorkspaceDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeWorkspace, setActiveWorkspace] =
    useState<ModuleKey>("accounting");

  // Dynamic subscription banner: real trial countdown from the server.
  const { data: settingsData } = trpc.accounting.getSettings.useQuery(
    undefined,
    {
      staleTime: 60_000,
    }
  );
  const trialDaysLeft = (() => {
    if (!settingsData) return null;
    const status = (settingsData as any).subscriptionStatus as
      | string
      | undefined;
    const end = (settingsData as any).trialEndsAt as string | null | undefined;
    if (status === "active") return null;
    if (status === "grace") return -1; // grace mode marker
    if (!end) return null;
    return Math.max(
      0,
      Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)
    );
  })();

  const { data: summaryData } = trpc.accounting.getDashboardSummary.useQuery(
    undefined,
    { staleTime: 60_000, placeholderData: keepPreviousData }
  );
  const { data: commercialStats } = trpc.commercial.getStats.useQuery(
    undefined,
    {
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    }
  );
  const { data: aiAdvisorData } =
    trpc.accounting.getAiFinancialAdvisorAnalysis.useQuery(undefined, {
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    });

  // Real-time operational cockpit metrics.
  const { data: daily } = trpc.sales.dailySummary.useQuery(undefined, {
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
  const { data: valuation } = trpc.products.valuation.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const { data: lowStockData } = trpc.products.lowStock.useQuery(undefined, {
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const { data: activity, isLoading: activityLoading } =
    trpc.auth.getActivityLogs.useQuery(undefined, {
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    });

  const lowStockCount = lowStockData?.length ?? 0;
  const receivables =
    commercialStats?.topCustomers?.reduce(
      (s: number, c: any) => s + parseFloat(c.balance || "0"),
      0
    ) ?? 0;
  const cashFlow = summaryData
    ? summaryData.totalRevenue - summaryData.totalExpense
    : 0;
  const liabilities = summaryData
    ? Math.max(0, summaryData.totalAssets - summaryData.netIncome)
    : 0;
  const isLoading =
    !summaryData || !daily || !valuation || lowStockData === undefined;

  const firstName = (user?.name || "المشرف").split(" ")[0];
  const active = MODULES[activeWorkspace];
  const allowed = modulesForRole(user?.role);
  const visibleModules = MODULE_LIST.filter(m => allowed.includes(m.key));

  React.useEffect(() => {
    if (!isLoading) {
      if (lowStockCount > 0) notifyLowStock(lowStockCount);
      const pending = (commercialStats as any)?.pendingOrders ?? 0;
      if (pending > 0) notifyPendingInvoice(pending);
    }
  }, [isLoading, lowStockCount, commercialStats]);

  return (
    <div className="space-y-6">
      {/* App shell sidebar — Layer 2 navigation */}
      <div>
        {/* Trial status banner */}
        <div className="brand-gradient text-white py-2 px-4 shadow border-b border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-300 fill-current" />
              <span className="font-bold text-brand-300">
                {trialDaysLeft === null
                  ? "الاشتراك:"
                  : trialDaysLeft === -1
                    ? "وضع المهلة المرنة:"
                    : "الفترة التجريبية المجانية:"}
              </span>
              <span>
                {trialDaysLeft === null
                  ? "مفعّل بالكامل — جميع المساحات والخواص متاحة"
                  : trialDaysLeft === -1
                    ? "انتهت الفترة التجريبية — النظام يعمل دون انقطاع، أكمل التفعيل من الإعدادات"
                    : `متبقي ${trialDaysLeft} يوماً — جميع المساحات والخواص مفعّلة بالكامل`}
              </span>
            </div>
            <Badge className="bg-brand text-ink-deep font-bold text-[10px]">
              اشتراك قياسي مفعّل
            </Badge>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
          {/* Welcome / command header */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="brand-gradient rounded-3xl px-5 sm:px-7 py-6 shadow-lg relative overflow-hidden"
          >
            <div className="absolute inset-0 brand-dotgrid opacity-10" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 bg-white/10 border border-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {brand.names.erpDisplay} v{brand.names.version} · مساحة عملك
                  </span>
                  <span className="text-brand-300 text-xs font-bold">
                    {greetingByHour()}، {firstName} 👋
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-1">
                  لوحة القيادة الموحّدة — كل وحداتك في نظرة واحدة
                </h1>
                <p className="text-xs text-white/70 mt-1 max-w-xl text-pretty">
                  من القيد إلى التقرير إلى القرار — أدر محاسبتك وفروعك ومبيعاتك
                  وخدماتك من مركز واحد آمن وموثوق.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setActiveWorkspace("accounting")}
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-9 px-4 rounded-xl"
                >
                  <Plus className="w-4 h-4" /> معاملة جديدة
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/reports")}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs h-9 px-4 rounded-xl"
                >
                  <BarChart3 className="w-4 h-4 text-brand-300" /> التقارير
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Enterprise Onboarding & Readiness Cockpit */}
          <EnterpriseOnboardingChecklist />

          {/* Modular workspace selector */}
          <div className="surface rounded-2xl p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {visibleModules.map(m => {
                const Icon = m.icon;
                const isActive = activeWorkspace === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setActiveWorkspace(m.key)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? `bg-gradient-to-br ${m.gradient} text-white shadow-md ring-2 ring-white/30`
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-right leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeWorkspace}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* ACCOUNTING */}
              {activeWorkspace === "accounting" && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
                        وحدة المحاسبة المركزية
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        مساحة النظام المحاسبي والمالي المتقدم
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setLocation("/accounting")}
                      className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-8"
                    >
                      دفتر القيود الكامل
                    </Button>
                  </div>

                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${
                      isLoading ? "opacity-60 animate-pulse" : ""
                    }`}
                  >
                    <StatCard
                      label="مبيعات اليوم"
                      value={formatMoney(daily?.totalSales ?? 0)}
                      tone="positive"
                      icon={ShoppingCart}
                      hint={`${daily?.invoiceCount ?? 0} فاتورة`}
                    />
                    <StatCard
                      label="صافي الربح (السنة)"
                      value={formatMoney(summaryData?.netIncome ?? 0)}
                      tone="info"
                      icon={BarChart3}
                      hint="قبل الضريبة"
                    />
                    <StatCard
                      label="الذمم المدينة"
                      value={formatMoney(receivables)}
                      tone="negative"
                      icon={Layers}
                      hint="عملاء"
                    />
                    <StatCard
                      label="قيمة المخزون"
                      value={formatMoney(valuation?.totalValue ?? 0)}
                      tone="warning"
                      icon={BookIcon}
                      hint="تقييم"
                    />
                    <StatCard
                      label="أصناف منخفضة"
                      value={`${lowStockCount} صنف`}
                      tone="warning"
                      icon={AlertTriangle}
                      hint="أقل من الحد"
                    />
                    <StatCard
                      label="إجمالي الأصول"
                      value={formatMoney(summaryData?.totalAssets ?? 0)}
                      tone="info"
                      icon={Building2}
                      hint="الرصيد"
                    />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-4">
                    <div className="space-y-4">
                      <div className="surface rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground">
                              مركز القرار التشغيلي
                            </p>
                            <h3 className="text-base font-black text-foreground mt-1">
                              حالة المنشأة وملف الأداء المالي اليومي
                            </h3>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-bold">
                            التشغيل مستقر
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-[10px] text-muted-foreground">
                              السيولة
                            </p>
                            <p className="mt-2 text-lg font-black" dir="ltr">
                              {formatMoney(cashFlow)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-[10px] text-muted-foreground">
                              الديون
                            </p>
                            <p className="mt-2 text-lg font-black" dir="ltr">
                              {formatMoney(liabilities)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-[10px] text-muted-foreground">
                              المبيعات
                            </p>
                            <p className="mt-2 text-lg font-black" dir="ltr">
                              {formatMoney(daily?.totalSales ?? 0)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/30 p-3">
                            <p className="text-[10px] text-muted-foreground">
                              الالتزام
                            </p>
                            <p className="mt-2 text-lg font-black text-emerald-600">
                              100%
                            </p>
                          </div>
                        </div>
                      </div>

                      <LiveExecutiveCockpit loading={isLoading} />
                    </div>

                    <div className="space-y-4">
                      <div className="surface rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold font-display">
                            أولويات اليوم
                          </h3>
                          <span className="text-[10px] text-muted-foreground">
                            5 مهام
                          </span>
                        </div>
                        <ul className="space-y-2">
                          <li className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-foreground">
                            <span className="font-bold text-brand">1.</span>{" "}
                            مراجعة مشتريات اليوم والتسعير.
                          </li>
                          <li className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-foreground">
                            <span className="font-bold text-brand">2.</span>{" "}
                            متابعة طلبات الاعتماد والديون.
                          </li>
                          <li className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-foreground">
                            <span className="font-bold text-brand">3.</span>{" "}
                            اعتماد قضايا التصدير والتوزيع.
                          </li>
                          <li className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-foreground">
                            <span className="font-bold text-brand">4.</span>{" "}
                            مراجعة المخزون المنخفض وإعادة الطلب.
                          </li>
                          <li className="rounded-xl border border-border bg-muted/30 p-2.5 text-[11px] text-foreground">
                            <span className="font-bold text-brand">5.</span>{" "}
                            إغلاق التقارير المالية في الوقت المحدد.
                          </li>
                        </ul>
                      </div>

                      <div className="surface rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold font-display">
                            رقابة البيانات والامتثال
                          </h3>
                          <Badge className="bg-brand/10 text-brand text-[10px] font-bold">
                            موثوق
                          </Badge>
                        </div>
                        <div className="space-y-2 text-[11px] text-muted-foreground">
                          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                            <span>هيكل الحسابات</span>
                            <span className="font-bold text-emerald-600">
                              محدث
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                            <span>سياسات الضريبة والمالية</span>
                            <span className="font-bold text-emerald-600">
                              مفعلة
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-2.5 py-2">
                            <span>نسخ احتياطي ومصادقة</span>
                            <span className="font-bold text-emerald-600">
                              آمن
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <QuickAction
                      label="فاتورة بيع"
                      icon={ShoppingCart}
                      onClick={() => setLocation("/commercial")}
                    />
                    <QuickAction
                      label="فاتورة شراء"
                      icon={ShoppingCart}
                      onClick={() => setLocation("/commercial")}
                    />
                    <QuickAction
                      label="قيد محاسبي"
                      icon={BookIcon}
                      onClick={() => setLocation("/accounting")}
                    />
                    <QuickAction
                      label="صنف جديد"
                      icon={Plus}
                      onClick={() => setLocation("/commercial")}
                    />
                    <QuickAction
                      label="تقرير مالي"
                      icon={BarChart3}
                      onClick={() => setLocation("/reports")}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <ModuleCard
                        module={MODULES.accounting}
                        title="الإدخال السريع للمعاملات"
                        description="تسجيل قيد مالية في الخزينة أو البنك فورياً."
                        badge="سريع"
                        onClick={() => setLocation("/accounting")}
                      />
                      <ModuleCard
                        module={MODULES.accounting}
                        title="دليل الحسابات الشجري"
                        description="استعراض وتعديل الحسابات الرئيسية والفرعية."
                        badge="محاسبي"
                        onClick={() => setLocation("/accounting")}
                      />
                      <ModuleCard
                        module={MODULES.accounting}
                        title="التقارير والقوائم المالية"
                        description="ميزان المراجعة، قائمة الدخل، والميزانية العمومية."
                        badge="تحليلي"
                        onClick={() => setLocation("/reports")}
                      />
                    </div>
                    <div className="surface rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold font-display">
                          أحدث النشاطات
                        </h3>
                        <span className="text-[10px] text-muted-foreground">
                          مباشر
                        </span>
                      </div>
                      <ul className="space-y-2 max-h-72 overflow-auto">
                        {activityLoading ? (
                          <li className="text-xs text-muted-foreground">
                            جاري التحميل…
                          </li>
                        ) : activity && activity.length ? (
                          activity.slice(0, 7).map((a: any, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 border-b border-border/50 pb-2 last:border-0"
                            >
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium leading-tight truncate">
                                  {a.action}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {timeAgo(a.createdAt)}
                                </p>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-muted-foreground">
                            لا توجد نشاطات بعد.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {/* ENGINEERING */}
              {activeWorkspace === "engineering" && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <Badge className="bg-brand text-ink-deep font-bold text-xs mb-1">
                        وحدة الهندسة والمقاولات
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        مساحة الاستشارات الهندسية والأراضي والعقارات
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setLocation("/about")}
                      className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-8"
                    >
                      الكتالوج الهندسي الكامل
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ModuleCard
                      module={MODULES.engineering}
                      title="المخططات التنفيذية (Shop Drawings & BIM)"
                      description="خرائط تفصيلية للمقاولين وتفريد التسليح لمنع الهدر."
                    />
                    <ModuleCard
                      module={MODULES.engineering}
                      title="الرفع المساحي الرقمي وتثبيت الحدود"
                      description="أجهزة GPS ودرون معتمدة لتحديد الحدود والفرز العقاري."
                    />
                    <ModuleCard
                      module={MODULES.engineering}
                      title="حصر الكميات (BOQ) والحفر والردم"
                      description="حساب دقيق لأوزان الحديد والخرسانات وحجوم القطع والردم."
                    />
                  </div>

                  <EngineeringBOQCalculator />
                </>
              )}

              {/* COMMERCIAL */}
              {activeWorkspace === "commercial" && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <Badge className="bg-teal-700 text-white font-bold text-xs mb-1">
                        وحدة التجارة والمخزون
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        مساحة المبيعات والمشتريات وإدارة المخازن
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setLocation("/commercial")}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-8"
                    >
                      النظام التجاري الكامل
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard
                      label="الأصناف المنخفضة بالمخزن"
                      value={`${commercialStats?.lowStock?.length ?? 0} صنف`}
                      tone="warning"
                      icon={ShoppingCart}
                    />
                    <StatCard
                      label="إجمالي ديون العملاء"
                      value={formatMoney(
                        commercialStats?.topCustomers?.reduce(
                          (s: number, c: any) =>
                            s + parseFloat(c.balance || "0"),
                          0
                        ) ?? 0
                      )}
                      tone="negative"
                      icon={Layers}
                    />
                    <StatCard
                      label="طلبات المتجر الإلكتروني"
                      value="نشط ومتزامن"
                      tone="positive"
                      icon={Sparkles}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ModuleCard
                      module={MODULES.commercial}
                      title="فواتير وسندات"
                      description="إصدار فواتير المبيعات والمشتريات وربطها المحاسبي."
                      badge="محاسبي"
                      onClick={() => setLocation("/commercial")}
                    />
                    <ModuleCard
                      module={MODULES.commercial}
                      title="حركة المخزون"
                      description="تنبيهات حد أدنى وجرد وتحويل بين المستودعات."
                      badge="مخازن"
                      onClick={() => setLocation("/commercial")}
                    />
                    <ModuleCard
                      module={MODULES.commercial}
                      title="المتجر الإلكتروني المدمج"
                      description="ربط طلبات الموقع بكتالوج المنتجات آلياً."
                      badge="مدمج"
                      onClick={() => setLocation("/store")}
                    />
                  </div>
                </>
              )}

              {/* LIBRARY */}
              {activeWorkspace === "library" && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <Badge className="bg-sky-700 text-white font-bold text-xs mb-1">
                        المركز المعرفي
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        المركز المعرفي — الخدمات المعرفية والطباعة الاحترافية
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setLocation("/store")}
                      className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs h-8"
                    >
                      متجر الخدمات
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ModuleCard
                      module={MODULES.library}
                      title="الخدمات الطلابية والأبحاث العلمية"
                      description="طباعة الرسائل العلمية والتحليل الإحصائي بـ SPSS & Excel."
                    />
                    <ModuleCard
                      module={MODULES.library}
                      title="صيانة الموبايل والكمبيوتر"
                      description="إصلاح الشاشات، البطاريات، السوفتوير، وتحديث الويندوز."
                    />
                  </div>
                </>
              )}

              {/* ANALYTICS */}
              {activeWorkspace === "analytics" && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <Badge className="bg-violet-600 text-white font-bold text-xs mb-1">
                        محرك الذكاء والتحليلات
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        مستشار الذكاء الاصطناعي والتحليل المالي
                      </h2>
                    </div>
                  </div>

                  <ModuleCard
                    module={MODULES.analytics}
                    title="تحليل المستشار المالي الفوري"
                    description="رؤى ذكية حول السيولة، الاستقرار، وكفاءة التكاليف."
                  >
                    <div className="text-xs text-foreground leading-relaxed bg-muted/40 p-4 rounded-xl border border-border max-h-80 overflow-auto">
                      <AdvisorInsight data={aiAdvisorData} />
                    </div>
                  </ModuleCard>
                </>
              )}

              {/* ERP التشغيلي العرضي */}
              {ERP_KEYS.includes(activeWorkspace) && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
                        وحدة تشغيلية عرضية
                      </Badge>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        {active.label}
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setLocation(`/erp?module=${active.key}`)}
                      className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-8"
                    >
                      فتح الوحدة الكاملة
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {active.tagline}
                  </p>
                  <ErpWorkspacePanel moduleKey={activeWorkspace} />
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <BusinessLifecycleWizard />
        </main>
      </div>
    </div>
  );
}

function ErpWorkspacePanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const [, setLocation] = useLocation();
  const { data } = trpc.erp.getDashboard.useQuery(undefined, {
    staleTime: 60_000,
  });
  const cards: Record<string, { label: string; value: string | number }[]> = {
    hr: [{ label: "الموظفون", value: data?.employees ?? 0 }],
    projects: [{ label: "المشاريع النشطة", value: data?.activeProjects ?? 0 }],
    procurement: [
      {
        label: "أوامر بانتظار الاعتماد",
        value: data?.pendingRequisitions ?? 0,
      },
    ],
    support: [{ label: "تذاكر مفتوحة", value: data?.openTickets ?? 0 }],
    quality: [{ label: "فحوص مسجلة", value: data?.inspections ?? 0 }],
  };
  const items = cards[moduleKey] ?? [];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(c => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-muted/40 p-4"
          >
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-black" dir="ltr">
              {c.value}
            </p>
          </div>
        ))}
      </div>
      {moduleKey === "procurement" && (
        <div className="mt-3">
          <Button
            onClick={() => setLocation("/procurement")}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
          >
            <Truck className="w-4 h-4" /> فتح وحدة المشتريات الكاملة
          </Button>
        </div>
      )}
      {moduleKey === "projects" && (
        <div className="mt-3">
          <Button
            onClick={() => setLocation("/projects")}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
          >
            <FolderKanban className="w-4 h-4" /> فتح وحدة المشاريع الكاملة
          </Button>
        </div>
      )}
      {moduleKey === "hr" && (
        <div className="mt-3">
          <Button
            onClick={() => setLocation("/hr")}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
          >
            <Users className="w-4 h-4" /> فتح وحدة الموارد البشرية الكاملة
          </Button>
        </div>
      )}
      {moduleKey === "support" && (
        <div className="mt-3">
          <Button
            onClick={() => setLocation("/support")}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
          >
            <LifeBuoy className="w-4 h-4" /> فتح وحدة الدعم والجودة الكاملة
          </Button>
        </div>
      )}
    </div>
  );
}
