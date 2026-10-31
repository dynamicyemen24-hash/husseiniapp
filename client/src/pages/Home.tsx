/**
 * Accounting Home — Al-Husainia for Business Services | Uamex_erp
 * Elite Executive Dashboard — Ultra-advanced, elegant, and powerful enterprise UX.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { keepPreviousData } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "../../../shared/permissions";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  BookOpen,
  Calculator,
  Factory,
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
  TrendingUp,
  Sparkles,
  BarChart3,
  Boxes,
  Receipt,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { formatMoney, greetingByHour } from "@/lib/design";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { can: canPermission, ready: permissionsReady } = usePermissions();
  const canViewReports = canPermission(PERMISSIONS.REPORTS_VIEW);

  const { data: summaryData, refetch } =
    trpc.accounting.getDashboardSummary.useQuery(undefined, {
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    });

  const kpisQuery = trpc.managerialAccounting.financialKpis.useQuery(
    undefined,
    {
      staleTime: 60_000,
      placeholderData: keepPreviousData,
    }
  );

  const periodsQuery = trpc.fiscalPeriods.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const trialBalanceQuery = trpc.accountingReports.trialBalance.useQuery(
    undefined,
    {
      staleTime: 60_000,
      placeholderData: keepPreviousData,
      // ميزان المراجعة يتطلب صلاحية التقارير — لا نطلق استعلاماً سيُرفض
      enabled: canViewReports,
    }
  );

  const activePeriod =
    periodsQuery.data?.find(
      p => p.status === "open" || p.status === "closing"
    ) ?? periodsQuery.data?.[0];
  const trialBalance = trialBalanceQuery.data;

  const cashFlow =
    summaryData && summaryData.totalRevenue - summaryData.totalExpense;
  const firstName = (user?.name || "المشرف").split(" ")[0];

  return (
    <motion.div
      className="min-h-screen bg-background font-display p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      dir="rtl"
    >
      {/* Elite Executive Header */}
      <div className="border bg-card px-8 py-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> النظام المالي
              المؤسسي الموحد
            </Badge>
            <span className="text-xs text-muted-foreground font-semibold">
              {brand.names.erpDisplay} v{brand.names.version}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            {greetingByHour()}، {firstName} 🌟
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            لوحة القيادة التنفيذية الذكية — رؤية مالية وتشغيلية لحظية مدعومة
            بمحرك القيود المزدوجة وقواعد الحوكمة.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap relative z-10">
          <Button
            onClick={() => setLocation("/manual-journal")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-10 px-5 rounded-xl font-bold gap-2 shadow-md transition-transform hover:scale-105"
          >
            <Plus className="w-4 h-4" /> قيد محاسبي ذكي
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/advanced-accounting")}
            className="border-input hover:bg-muted text-xs h-10 px-5 rounded-xl font-bold gap-2 shadow-sm"
          >
            <Factory className="w-4 h-4 text-primary" /> المحاسبة المتقدمة
            والإنتاج
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            title="تحديث البيانات الفورية"
            className="h-10 w-10 p-0 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Financial Health & AI Insights Banner ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border shadow-sm lg:col-span-2 bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> التشخيص المالي
              الذكي (AI Financial Health)
            </CardTitle>
            <CardDescription>
              تقييم فوري للسيولة والربحية وكفاءة رأس المال العامل
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <RatioTile
              label="نسبة السيولة الجارية"
              value={kpisQuery.data?.currentRatio ?? null}
              tone="emerald"
              hint={
                kpisQuery.data?.currentRatio != null
                  ? kpisQuery.data.currentRatio >= 1.5
                    ? "سيولة مريحة"
                    : "يحتاج متابعة"
                  : "لا توجد أرصدة متداولة كافية"
              }
            />
            <RatioTile
              label="هامش صافي الربح"
              value={kpisQuery.data?.netProfitMargin ?? null}
              tone="primary"
              suffix="%"
              hint={
                kpisQuery.data?.hasLedgerData
                  ? "من قائمة الدخل الفعلية"
                  : "لا توجد قيود مُرحّلة بعد"
              }
            />
            <RatioTile
              label="العائد على حقوق الملكية"
              value={kpisQuery.data?.returnOnEquity ?? null}
              tone="violet"
              suffix="%"
              hint={
                kpisQuery.data?.returnOnEquity != null
                  ? "صافي الربح ÷ حقوق الملكية"
                  : "تحتاج أرصدة حقوق ملكية"
              }
            />
            <RatioTile
              label="معدل المديونية"
              value={kpisQuery.data?.debtToEquityRatio ?? null}
              tone="blue"
              hint={
                kpisQuery.data?.debtToEquityRatio != null
                  ? "الخصوم ÷ حقوق الملكية"
                  : "تحتاج أرصدة خصوم"
              }
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> الحالة
              التشغيلية للفترة
            </CardTitle>
            <CardDescription>الدفاتر والفترات المالية النشطة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-xs border-b pb-2">
              <span className="text-muted-foreground">
                الفترة المالية النشطة:
              </span>
              <span className="font-bold text-foreground">
                {activePeriod?.name ?? "لا توجد فترة نشطة"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-b pb-2">
              <span className="text-muted-foreground">
                حالة القفل المحاسبي:
              </span>
              {activePeriod ? (
                <Badge
                  variant="outline"
                  className={
                    activePeriod.status === "closed"
                      ? "bg-slate-500/10 text-slate-600 font-semibold"
                      : "bg-emerald-500/10 text-emerald-600 font-semibold"
                  }
                >
                  {activePeriod.status === "closed"
                    ? "مقفلة"
                    : "مفتوحة وقابلة للترحيل"}
                </Badge>
              ) : (
                <span className="text-muted-foreground font-semibold">—</span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">
                مطابقة القيود المزدوجة:
              </span>
              {trialBalance ? (
                <span
                  className={
                    trialBalance.isBalanced
                      ? "font-mono font-bold text-emerald-600"
                      : "font-mono font-bold text-amber-600"
                  }
                >
                  {trialBalance.isBalanced ? "متوازنة" : "غير متوازنة"}
                </span>
              ) : !permissionsReady ? (
                <span className="text-muted-foreground">…</span>
              ) : canViewReports ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className="text-muted-foreground text-[11px]">
                  يتطلب صلاحية عرض التقارير
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Live KPIs Strip ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="إجمالي الإيرادات"
          value={formatMoney(summaryData?.totalRevenue)}
          hint="من الفواتير والقيود المُرحلة"
          tone="positive"
          icon={ArrowDownCircle}
        />
        <StatCard
          label="إجمالي المصروفات"
          value={formatMoney(summaryData?.totalExpense)}
          hint="مصروفات الفترة التشغيلية"
          tone="negative"
          icon={ArrowUpCircle}
        />
        <StatCard
          label="صافي الدخل"
          value={formatMoney(cashFlow)}
          hint="الإيرادات − المصروفات"
          tone="info"
          icon={Wallet}
        />
        <StatCard
          label="إجمالي الأصول"
          value={formatMoney(summaryData?.totalAssets)}
          hint="المركز المالي الموحد"
          tone="neutral"
          icon={Scale}
        />
      </section>

      {/* ── Advanced Enterprise Modules (Tiles) ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="border shadow-sm hover:border-primary/60 transition-all cursor-pointer group"
          onClick={() => setLocation("/advanced-accounting")}
        >
          <CardHeader className="bg-muted/20 pb-3">
            <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
              <Users className="w-5 h-5 text-blue-600" /> محاسبة الشركاء ورأس
              المال
            </CardTitle>
            <CardDescription>
              إدارة حصص الشركاء، الجاري، والتوزيعات الدورية
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground">
            إدارة دقيقة لرأس المال، المسحوبات الشخصية، وحسابات أرباح الشركاء
            بنسب الحصص المعيارية.
          </CardContent>
        </Card>

        <Card
          className="border shadow-sm hover:border-primary/60 transition-all cursor-pointer group"
          onClick={() => setLocation("/advanced-accounting")}
        >
          <CardHeader className="bg-muted/20 pb-3">
            <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
              <Calculator className="w-5 h-5 text-emerald-600" /> المحاسبة
              الإدارية والتكاليف
            </CardTitle>
            <CardDescription>
              تحليل التعادل CVP وتكاليف الأنشطة ABC
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground">
            أدوات اتخاذ القرار، تحليل انحرافات التكاليف المعيارية للمواد
            والأجور، وربط مراكز التكلفة بالربحية.
          </CardContent>
        </Card>

        <Card
          className="border shadow-sm hover:border-primary/60 transition-all cursor-pointer group"
          onClick={() => setLocation("/advanced-accounting")}
        >
          <CardHeader className="bg-muted/20 pb-3">
            <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
              <Factory className="w-5 h-5 text-purple-600" /> محاسبة الإنتاج
              والتصنيع
            </CardTitle>
            <CardDescription>
              قوائم المواد BOM وأوامر التشغيل وتكلفة WIP
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground">
            متابعة أوامر الإنتاج والتصنيع، تثمين الإنتاج قيد التشغيل WIP، وإصدار
            قيود المخزون والتام آلياً.
          </CardContent>
        </Card>
      </section>

      {/* ── Operational Shortcuts ── */}
      <div className="border bg-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold">
          الاختصارات السريعة لبيئة العمل المؤسسية
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation("/journal")}
            className="h-12 justify-start gap-2.5 text-xs font-semibold hover:border-primary"
          >
            <BookOpen className="w-4 h-4 text-primary" /> دفتر القيود اليومية
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/cost-centers")}
            className="h-12 justify-start gap-2.5 text-xs font-semibold hover:border-primary"
          >
            <Calculator className="w-4 h-4 text-primary" /> مراكز التكلفة والربح
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/reports")}
            className="h-12 justify-start gap-2.5 text-xs font-semibold hover:border-primary"
          >
            <BarChart3 className="w-4 h-4 text-primary" /> التقارير وميزان
            المراجعة
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/pos")}
            className="h-12 justify-start gap-2.5 text-xs font-semibold hover:border-primary"
          >
            <Receipt className="w-4 h-4 text-primary" /> نقاط البيع المباشر
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

const RATIO_TONE_CLASSES = {
  emerald: "text-emerald-600",
  primary: "text-primary",
  violet: "text-violet-600",
  blue: "text-blue-600",
} as const;

type RatioTone = keyof typeof RATIO_TONE_CLASSES;

/**
 * بطاقة نسبة — تعرض القيمة الحقيقية من الدفاتر، أو "—" حين لا يكفي
 * السجل لحسابها. لا قيم افتراضية مخترعة.
 */
function RatioTile({
  label,
  value,
  hint,
  tone,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  hint: string;
  tone: RatioTone;
  suffix?: string;
}) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="bg-background/80 p-3.5 rounded-xl border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-xl font-bold font-mono mt-1 ${
          hasValue ? RATIO_TONE_CLASSES[tone] : "text-muted-foreground"
        }`}
      >
        {hasValue ? value : "—"}
        {hasValue && suffix ? suffix : ""}
      </p>
      <span
        className={`text-[10px] font-medium ${hasValue ? RATIO_TONE_CLASSES[tone] : "text-muted-foreground"}`}
      >
        {hint}
      </span>
    </div>
  );
}
