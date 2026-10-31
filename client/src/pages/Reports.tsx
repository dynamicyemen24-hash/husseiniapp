import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  FileText,
  Scale,
  Wallet,
  Landmark,
  ShieldCheck,
  Sparkles,
  Activity,
  Eye,
  Calendar,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";

type ReportType =
  | "daily"
  | "trialBalance"
  | "incomeStatement"
  | "balanceSheet"
  | "cashFlow"
  | "profitability"
  | "documents";

const fmt = (n: number | undefined | null) =>
  Number(n ?? 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Reports() {
  const utils = trpc.useUtils();
  const [activeReport, setActiveReport] = useState<ReportType>("daily");
  const [asOf, setAsOf] = useState("");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Daily — نقطة البيع
  const { data: dailyData } = trpc.sales.dailySummary.useQuery(
    { date: reportDate },
    { staleTime: 30_000 }
  );
  const { data: summaryData } = trpc.accounting.getDashboardSummary.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: settingsData } = trpc.accounting.getSettings.useQuery();
  const { data: docsReport } = trpc.modules.documents.recent.useQuery();
  const { data: profitability } = trpc.modules.reports.profitability.useQuery();

  // Server-authoritative financial statements — مصدر حقيقة واحد
  const finInput = asOf ? { asOf } : undefined;
  const trial = trpc.financialReports.trialBalance.useQuery(finInput as any, {
    staleTime: 30_000,
  });
  const income = trpc.financialReports.incomeStatement.useQuery(
    finInput as any,
    { staleTime: 30_000 }
  );
  const sheet = trpc.financialReports.balanceSheet.useQuery(finInput as any, {
    staleTime: 30_000,
  });
  const cash = trpc.financialReports.cashFlow.useQuery(finInput as any, {
    staleTime: 30_000,
  });

  const processAlerts = trpc.erp.processAlerts.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        `تم إنشاء ${r.total} تنبيه استباقي (إعادة طلب: ${r.created.reorder}، مستحقات: ${r.created.overdueSales + r.created.overduePurchase})`
      );
      utils.modules.notifications.list.invalidate();
      utils.modules.notifications.unreadCount.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isFinLoading = trial.isLoading || income.isLoading || sheet.isLoading;

  const exportCurrent = () => {
    let cols: string[] | undefined;
    let rows: (string | number)[][] | undefined;
    // eslint-disable-next-line no-useless-assignment
    let file = "report";
    if (activeReport === "trialBalance" && trial.data?.rows) {
      cols = ["الكود", "الحساب", "النوع", "مدين", "دائن", "الرصيد"];
      rows = trial.data.rows.map((r: any) => [
        r.code,
        r.name,
        r.type,
        r.debit || 0,
        r.credit || 0,
        r.balance,
      ]);
      file = "trialBalance";
    } else if (activeReport === "incomeStatement" && income.data) {
      cols = ["البند", "الكود", "المبلغ"];
      rows = [
        ...income.data.revenues.map((r: any) => [r.name, r.code, r.amount]),
        ["إجمالي الإيرادات", "", income.data.totals.revenue],
        ...income.data.expenses.map((r: any) => [r.name, r.code, r.amount]),
        ["إجمالي المصروفات", "", income.data.totals.expense],
        ["صافي الدخل", "", income.data.totals.net],
      ];
      file = "incomeStatement";
    } else if (activeReport === "cashFlow" && cash.data?.lines) {
      cols = ["الكود", "الحساب", "صافي التدفق"];
      rows = cash.data.lines.map((r: any) => [r.code, r.name, r.net]);
      file = "cashFlow";
    } else {
      toast.error("لا توجد بيانات للتصدير في هذا التبويب");
      return;
    }
    if (!cols || !rows) return;
    const n = downloadCsv(
      `${file}_${new Date().toISOString().slice(0, 10)}.csv`,
      cols,
      rows as any
    );
    toast.success(`تم تصدير ${n} صف`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── Institutional Ribbon — توحيد هوية التقارير والذكاء ── */}
        <div className="ribbon-premium">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip bg-brand/15 text-brand border border-brand/20">
                  IFRS · COSO · مصدر حقيقة واحد
                </span>
                <span className="chip bg-success/15 text-success">
                  خادم موثوق
                </span>
              </div>
              <h1 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand" />
                التقارير وذكاء الأعمال — من القيد إلى القرار
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                كل رقم هنا يُحتسب من دفتر الأستاذ مباشرة (openingBalances +
                posted transactions) — بلا تقدير محلي. حتى تاريخ محدد، مع مقارنة
                فترات وختم QR.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">حتى تاريخ</Label>
                <Input
                  type="date"
                  value={asOf}
                  onChange={e => setAsOf(e.target.value)}
                  className="h-9 w-40 text-xs"
                />
              </div>
              {asOf && (
                <Button
                  variant="ghost"
                  className="h-9 text-xs"
                  onClick={() => setAsOf("")}
                >
                  مسح الفترة
                </Button>
              )}
              <div className="h-9 w-px bg-line mx-1 hidden sm:block" />
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs press-effect"
                onClick={exportCurrent}
              >
                <Download className="w-3.5 h-3.5 ml-1" />
                تصدير CSV
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs bg-brand hover:bg-brand-deep text-brand-foreground press-effect shine-on-hover"
                onClick={() => {
                  // يبني نفس منطق الطباعة لكن بمصدر خادم
                  const title =
                    activeReport === "trialBalance"
                      ? "ميزان المراجعة — مصدر خادم"
                      : activeReport === "incomeStatement"
                        ? "قائمة الدخل — مصدر خادم"
                        : activeReport === "balanceSheet"
                          ? "الميزانية العمومية — مصدر خادم"
                          : "تقرير مالي موحد";
                  const cols =
                    activeReport === "trialBalance"
                      ? ["الرمز", "الحساب", "النوع", "مدين", "دائن"]
                      : ["البيان", "المبلغ"];
                  const rows: (string | number)[][] =
                    activeReport === "trialBalance"
                      ? (trial.data?.rows ?? []).map((a: any) => [
                          a.code,
                          a.name,
                          a.type,
                          a.debit ? fmt(a.debit) : "-",
                          a.credit ? fmt(a.credit) : "-",
                        ])
                      : activeReport === "incomeStatement"
                        ? [
                            ...(income.data?.revenues ?? []).map((a: any) => [
                              a.name,
                              fmt(a.amount),
                            ]),
                            [
                              "إجمالي الإيرادات",
                              fmt(income.data?.totals.revenue),
                            ],
                            ...(income.data?.expenses ?? []).map((a: any) => [
                              a.name,
                              fmt(a.amount),
                            ]),
                            [
                              "إجمالي المصروفات",
                              fmt(income.data?.totals.expense),
                            ],
                            ["صافي الدخل", fmt(income.data?.totals.net)],
                          ]
                        : (sheet.data?.assets ?? []).map((a: any) => [
                            a.name,
                            fmt(a.amount),
                          ]);
                  openPrintableInvoiceWindow({
                    invoiceNumber: `REP-${activeReport.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
                    invoiceDate: new Date().toISOString(),
                    customerName: "مجموعة الحسينية (الكيان الموحد)",
                    institutionName:
                      "مجموعة الحسينية — حلول الأعمال والهندسة والمعرفة",
                    currency: "ريال يمني (YER)",
                    items: [],
                    subtotal: summaryData?.totalRevenue || 0,
                    total: summaryData?.netIncome || 0,
                    notes: `حتى تاريخ: ${asOf || "حتى الآن"} | الإيرادات: ${summaryData?.totalRevenue?.toLocaleString()} | المصروفات: ${summaryData?.totalExpense?.toLocaleString()} | صافي: ${summaryData?.netIncome?.toLocaleString()}`,
                    report: { title, columns: cols, rows },
                  });
                }}
              >
                <Printer className="w-3.5 h-3.5 ml-1" />
                طباعة بـ QR
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white press-effect"
                onClick={() => {
                  const repTitle =
                    activeReport === "trialBalance"
                      ? "ميزان المراجعة"
                      : activeReport === "incomeStatement"
                        ? "قائمة الدخل"
                        : activeReport === "balanceSheet"
                          ? "الميزانية العمومية"
                          : "التقرير المالي";
                  const text = encodeURIComponent(
                    `التقرير المالي — الحسينية\n- التقرير: ${repTitle}\n- حتى: ${asOf || "حتى الآن"}\n- الإيرادات: ${summaryData?.totalRevenue?.toLocaleString()} YER\n- المصروفات: ${summaryData?.totalExpense?.toLocaleString()} YER\n- صافي: ${summaryData?.netIncome?.toLocaleString()} YER\n- الرابط: ${window.location.origin}/reports`
                  );
                  window.open(`https://wa.me/?text=${text}`, "_blank");
                }}
              >
                <Download className="w-3.5 h-3.5 ml-1" />
                واتساب
              </Button>
            </div>
          </div>
          {asOf && trial.data?.periodLabel && (
            <div className="status-strip status-info mt-4 text-xs">
              الفترة النشطة:{" "}
              <span className="font-bold">{trial.data.periodLabel}</span> — جميع
              الأرصدة محسوبة حتى هذا التاريخ من دفتر الأستاذ مباشرة.
            </div>
          )}
        </div>

        {/* ── KPIs — 4 بطاقات ذكية بمصدر خادم ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="إجمالي المدين"
            value={fmt(trial.data?.totals.debit)}
            icon={Scale}
            tone="brand"
            hint={trial.data ? "من الخادم" : "تحميل…"}
            loading={trial.isLoading}
          />
          <KpiCard
            label="صافي الدخل"
            value={fmt(income.data?.totals.net)}
            icon={TrendingUp}
            tone={Number(income.data?.totals.net) >= 0 ? "good" : "bad"}
            hint="قائمة الدخل"
            loading={income.isLoading}
          />
          <KpiCard
            label="إجمالي الأصول"
            value={fmt(sheet.data?.totals.assets)}
            icon={Landmark}
            tone="info"
            hint="الميزانية"
            loading={sheet.isLoading}
          />
          <KpiCard
            label="صافي التدفق النقدي"
            value={fmt(cash.data?.net)}
            icon={Wallet}
            tone="good"
            hint="حسابات نقدية فقط"
            loading={cash.isLoading}
          />
        </div>

        {/* تنبيهات استباقية + رابط الذكاء */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            كل تقرير يُختم بـ QR ويُحفظ في سجل التدقيق — قابل للمراجعة الخارجية.
            <a
              href="/financial-statements"
              className="text-brand hover:underline font-bold"
            >
              فتح القوائم المالية (الخادم) →
            </a>
            <span className="w-px h-3 bg-line" />
            <a
              href="/analytics"
              className="text-brand hover:underline font-bold"
            >
              التحليلات الذكية →
            </a>
            <a
              href="/operations"
              className="text-brand hover:underline font-bold"
            >
              لوحة العمليات →
            </a>
          </div>
          <Button
            size="sm"
            onClick={() => processAlerts.mutate()}
            disabled={processAlerts.isPending}
            className="h-8 text-xs bg-brand hover:bg-brand-deep text-brand-foreground press-effect"
          >
            <FileText className="w-3.5 h-3.5 ml-1" />
            {processAlerts.isPending
              ? "جاري التوليد…"
              : "توليد التنبيهات الاستباقية"}
          </Button>
        </div>

        <Tabs
          value={activeReport}
          onValueChange={v => setActiveReport(v as ReportType)}
          className="space-y-4"
        >
          <TabsList className="tabs-primary w-full">
            <TabsTrigger value="daily" className="tab-trigger">
              <Calendar className="w-3.5 h-3.5" />
              اليومي
            </TabsTrigger>
            <TabsTrigger value="trialBalance" className="tab-trigger">
              <Scale className="w-3.5 h-3.5" />
              ميزان المراجعة
            </TabsTrigger>
            <TabsTrigger value="incomeStatement" className="tab-trigger">
              <TrendingUp className="w-3.5 h-3.5" />
              قائمة الدخل
            </TabsTrigger>
            <TabsTrigger value="balanceSheet" className="tab-trigger">
              <Landmark className="w-3.5 h-3.5" />
              الميزانية
            </TabsTrigger>
            <TabsTrigger value="cashFlow" className="tab-trigger">
              <Wallet className="w-3.5 h-3.5" />
              التدفقات
            </TabsTrigger>
            <TabsTrigger value="profitability" className="tab-trigger">
              <Sparkles className="w-3.5 h-3.5" />
              الربحية
            </TabsTrigger>
            <TabsTrigger value="documents" className="tab-trigger">
              <FileText className="w-3.5 h-3.5" />
              المستندات
            </TabsTrigger>
          </TabsList>

          {/* ── Trial Balance — مصدر خادم بالكامل ── */}
          <TabsContent value="trialBalance">
            <Card className="panel-premium">
              <CardHeader className="ribbon-premium">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Scale className="w-4 h-4 text-brand" />
                    ميزان المراجعة — حتى تاريخ
                    {trial.data?.periodLabel
                      ? ` (${trial.data.periodLabel})`
                      : ""}
                  </CardTitle>
                  {trial.data && (
                    <Badge variant="outline" className="chip">
                      {trial.data.rows.length} حساب برصيد
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  كل حساب برصيد ≠ 0 — المدين = الدائن. من الخادم مباشرة.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {trial.isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="skeleton-premium h-9 rounded" />
                    ))}
                  </div>
                ) : (trial.data?.rows?.length ?? 0) === 0 ? (
                  <div className="empty-state">
                    <Scale className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-bold">
                      لا توجد أرصدة حتى هذا التاريخ
                    </p>
                    <p className="text-xs text-muted-foreground">
                      جرّب تغيير تاريخ "حتى" أو تسجيل قيود معتمدة.
                    </p>
                  </div>
                ) : (
                  <div className="datagrid overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-panel/60">
                        <tr className="border-b border-line">
                          <th className="text-right p-3 font-bold">الكود</th>
                          <th className="text-right p-3 font-bold">الحساب</th>
                          <th className="text-right p-3 font-bold">النوع</th>
                          <th className="text-left p-3 font-bold">مدين</th>
                          <th className="text-left p-3 font-bold">دائن</th>
                          <th className="text-left p-3 font-bold">
                            الرصيد المحايد
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trial.data?.rows.map((r: any) => (
                          <tr
                            key={r.accountId}
                            className="border-b border-line hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-3 font-mono text-[11px]">
                              {r.code}
                            </td>
                            <td className="p-3 font-bold">{r.name}</td>
                            <td className="p-3">
                              <span className="chip text-[10px]">{r.type}</span>
                            </td>
                            <td className="p-3 text-left font-mono">
                              {r.debit ? fmt(r.debit) : "—"}
                            </td>
                            <td className="p-3 text-left font-mono">
                              {r.credit ? fmt(r.credit) : "—"}
                            </td>
                            <td className="p-3 text-left font-mono">
                              {fmt(r.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {trial.data && (
                  <div className="datagrid-footer flex flex-wrap items-center gap-2 justify-between">
                    <span className="text-xs font-bold">
                      الإجمالي — مدين {fmt(trial.data.totals.debit)} = دائن{" "}
                      {fmt(trial.data.totals.credit)}
                    </span>
                    <Badge
                      className={
                        Math.abs(
                          trial.data.totals.debit - trial.data.totals.credit
                        ) < 0.01
                          ? "bg-success/15 text-success"
                          : "bg-danger/15 text-danger"
                      }
                    >
                      {Math.abs(
                        trial.data.totals.debit - trial.data.totals.credit
                      ) < 0.01
                        ? "متوازن ✓"
                        : `غير متوازن — فرق ${fmt(Math.abs(trial.data.totals.debit - trial.data.totals.credit))}`}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Income Statement ── */}
          <TabsContent value="incomeStatement">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="panel-premium">
                <CardHeader className="ribbon-premium">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-success">
                    <ArrowUp className="w-4 h-4" />
                    الإيرادات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {income.isLoading ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton-premium h-8" />
                      ))}
                    </div>
                  ) : (
                    <div className="datagrid">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-panel/60">
                            <th className="text-right p-2">البند</th>
                            <th className="text-left p-2">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {income.data?.revenues.map((r: any) => (
                            <tr
                              key={r.code}
                              className="border-b border-line hover:bg-muted/30"
                            >
                              <td className="p-2.5">
                                <span className="font-mono text-[10px] text-muted-foreground ml-2">
                                  {r.code}
                                </span>
                                {r.name}
                              </td>
                              <td className="p-2.5 text-left font-mono text-success">
                                {fmt(r.amount)} ر.ي
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-success/5 font-bold">
                            <td className="p-2.5">إجمالي الإيرادات</td>
                            <td className="p-2.5 text-left text-success">
                              {fmt(income.data?.totals.revenue)} ر.ي
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="panel-premium">
                <CardHeader className="ribbon-premium">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-danger">
                    <ArrowDown className="w-4 h-4" />
                    المصروفات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {income.isLoading ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton-premium h-8" />
                      ))}
                    </div>
                  ) : (
                    <div className="datagrid">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-panel/60">
                            <th className="text-right p-2">البند</th>
                            <th className="text-left p-2">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {income.data?.expenses.map((r: any) => (
                            <tr
                              key={r.code}
                              className="border-b border-line hover:bg-muted/30"
                            >
                              <td className="p-2.5">
                                <span className="font-mono text-[10px] text-muted-foreground ml-2">
                                  {r.code}
                                </span>
                                {r.name}
                              </td>
                              <td className="p-2.5 text-left font-mono text-danger">
                                {fmt(r.amount)} ر.ي
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-danger/5 font-bold">
                            <td className="p-2.5">إجمالي المصروفات</td>
                            <td className="p-2.5 text-left text-danger">
                              {fmt(income.data?.totals.expense)} ر.ي
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div
              className={`mt-4 flex items-center justify-between p-4 rounded-xl font-black text-sm ${Number(income.data?.totals.net) >= 0 ? "bg-ink text-brand" : "bg-danger text-white"}`}
            >
              <span>صافي الدخل</span>
              <span className="font-mono text-base">
                {fmt(income.data?.totals.net)} ر.ي
              </span>
            </div>
          </TabsContent>

          {/* ── Balance Sheet ── */}
          <TabsContent value="balanceSheet">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "الأصول",
                  icon: Wallet,
                  rows: sheet.data?.assets,
                  color: "text-info",
                },
                {
                  title: "الخصوم",
                  icon: Landmark,
                  rows: sheet.data?.liabilities,
                  color: "text-warning",
                },
                {
                  title: "حقوق الملكية",
                  icon: UsersIcon,
                  rows: sheet.data?.equity,
                  color: "text-brand",
                },
              ].map(s => (
                <Card key={s.title} className="panel-premium">
                  <CardHeader className="ribbon-premium">
                    <CardTitle
                      className={`text-sm font-bold flex items-center gap-2 ${s.color}`}
                    >
                      <s.icon className="w-4 h-4" />
                      {s.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sheet.isLoading ? (
                      <div className="p-3 space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="skeleton-premium h-8" />
                        ))}
                      </div>
                    ) : (
                      <div className="datagrid">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-panel/60">
                              <th className="text-right p-2">البند</th>
                              <th className="text-left p-2">المبلغ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(s.rows as any[] | undefined)?.map((r: any) => (
                              <tr
                                key={r.code}
                                className="border-b border-line hover:bg-muted/30"
                              >
                                <td className="p-2.5">{r.name}</td>
                                <td className="p-2.5 text-left font-mono">
                                  {fmt(r.amount)} ر.ي
                                </td>
                              </tr>
                            ))}
                            {(!s.rows || s.rows.length === 0) && (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="p-6 text-center text-muted-foreground text-xs"
                                >
                                  لا توجد أرصدة
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryStat
                label="الأصول"
                value={fmt(sheet.data?.totals.assets)}
              />
              <SummaryStat
                label="الخصوم"
                value={fmt(sheet.data?.totals.liabilities)}
              />
              <SummaryStat
                label="حقوق الملكية"
                value={fmt(sheet.data?.totals.equity)}
              />
            </div>
          </TabsContent>

          {/* ── Cash Flow ── */}
          <TabsContent value="cashFlow">
            <Card className="panel-premium">
              <CardHeader className="ribbon-premium">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand" />
                  التدفقات النقدية — حسابات نقدية فقط (1xx)
                </CardTitle>
                <CardDescription className="text-xs">
                  صافي التغير في الحسابات النقدية خلال الفترة حتى{" "}
                  {asOf || "حتى الآن"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {cash.isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="skeleton-premium h-8" />
                    ))}
                  </div>
                ) : (cash.data?.lines?.length ?? 0) === 0 ? (
                  <div className="empty-state">
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-bold">
                      لا توجد حركات نقدية في الفترة
                    </p>
                  </div>
                ) : (
                  <div className="datagrid overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-panel/60">
                        <tr className="border-b border-line">
                          <th className="text-right p-3">الكود</th>
                          <th className="text-right p-3">الحساب النقدي</th>
                          <th className="text-left p-3">صافي التدفق</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cash.data?.lines.map((r: any) => (
                          <tr
                            key={r.accountId}
                            className="border-b border-line hover:bg-muted/30"
                          >
                            <td className="p-3 font-mono">{r.code}</td>
                            <td className="p-3 font-medium">{r.name}</td>
                            <td
                              className={`p-3 text-left font-mono font-bold ${r.net >= 0 ? "text-success" : "text-danger"}`}
                            >
                              {fmt(r.net)} ر.ي
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {cash.data && (
                  <div className="datagrid-footer font-bold flex justify-between">
                    <span>صافي التدفق الكلي</span>
                    <span
                      className={`font-mono ${Number(cash.data.net) >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {fmt(cash.data.net)} ر.ي
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Daily ── */}
          <TabsContent value="daily">
            <div className="space-y-4">
              <div className="panel-premium p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand" />
                    التقرير اليومي للمبيعات
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    ملخص المبيعات وأساليب الدفع وأفضل الأصناف — يوم محدد
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="h-9 text-xs w-auto"
                  />
                  <Button
                    size="sm"
                    className="h-9 text-xs bg-brand text-brand-foreground press-effect"
                    onClick={() => {
                      const d = dailyData;
                      if (!d) return;
                      openPrintableInvoiceWindow({
                        invoiceNumber: `DAILY-${d.date}`,
                        invoiceDate: new Date().toISOString(),
                        customerName: "تقرير يومي — نقطة البيع",
                        institutionName:
                          settingsData?.institutionName || "المؤسسة",
                        currency: "ريال يمني (YER)",
                        items: [
                          {
                            description: `عدد الفواتير: ${d.invoiceCount}`,
                            quantity: 1,
                            unitPrice: d.totalSales,
                            totalPrice: d.totalSales,
                          },
                          {
                            description: "المبلغ المحصل",
                            quantity: 1,
                            unitPrice: d.totalPaid,
                            totalPrice: d.totalPaid,
                          },
                          {
                            description: "الآجل (غير المحصل)",
                            quantity: 1,
                            unitPrice: d.credit,
                            totalPrice: d.credit,
                          },
                        ],
                        subtotal: d.totalSales,
                        total: d.totalSales,
                        notes: `إجمالي: ${d.totalSales?.toLocaleString()} | المحصل: ${d.totalPaid?.toLocaleString()} | الآجل: ${d.credit?.toLocaleString()} | اليوم السابق: ${d.previousDayTotal?.toLocaleString()}`,
                      });
                    }}
                  >
                    <Printer className="w-3.5 h-3.5 ml-1" />
                    طباعة يومية
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatMini
                  label="عدد الفواتير"
                  value={String(dailyData?.invoiceCount ?? 0)}
                  tone="text-ink"
                />
                <StatMini
                  label="إجمالي المبيعات"
                  value={`${fmt(dailyData?.totalSales)} ر.ي`}
                  tone="text-success"
                />
                <StatMini
                  label="المبلغ المحصل"
                  value={`${fmt(dailyData?.totalPaid)} ر.ي`}
                  tone="text-brand"
                />
                <StatMini
                  label="الآجل"
                  value={`${fmt(dailyData?.credit)} ر.ي`}
                  tone="text-danger"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="panel-premium">
                  <CardHeader className="ribbon-premium">
                    <CardTitle className="text-sm font-bold">
                      توزيع أساليب الدفع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {(
                      [
                        ["cash", "نقدي", "text-success"],
                        ["card", "بطاقة", "text-info"],
                        ["transfer", "تحويل", "text-warning"],
                        ["credit", "آجل", "text-danger"],
                        ["online", "أونلاين", "text-brand"],
                      ] as const
                    ).map(([key, label, color]) => {
                      const val = (dailyData as any)?.byMethod?.[key] || 0;
                      const pct =
                        dailyData && dailyData.totalSales > 0
                          ? (val / dailyData.totalSales) * 100
                          : 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs">
                            <span>{label}</span>
                            <span className={`font-bold ${color}`}>
                              {fmt(val)} ر.ي
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded mt-1 overflow-hidden">
                            <div
                              className="h-full bg-brand transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card className="panel-premium">
                  <CardHeader className="ribbon-premium">
                    <CardTitle className="text-sm font-bold">
                      أفضل الأصناف مبيعاً
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!dailyData || dailyData.topProducts.length === 0 ? (
                      <div className="empty-state">
                        <Activity className="w-8 h-8 text-muted-foreground" />
                        <p className="text-xs">لا توجد مبيعات في هذا اليوم</p>
                      </div>
                    ) : (
                      <div className="datagrid overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-panel/60">
                            <tr className="border-b border-line">
                              <th className="text-right p-2">الصنف</th>
                              <th className="text-center p-2">الكمية</th>
                              <th className="text-left p-2">الإيراد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyData.topProducts.map((p: any, i: number) => (
                              <tr
                                key={p.productId}
                                className="border-b border-line hover:bg-muted/30"
                              >
                                <td className="p-2">
                                  <span className="text-[10px] text-muted-foreground ml-1">
                                    {i + 1}.
                                  </span>
                                  {p.productName}
                                </td>
                                <td className="p-2 text-center font-mono">
                                  {p.qty}
                                </td>
                                <td className="p-2 text-left font-mono text-brand">
                                  {fmt(p.revenue)} ر.ي
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Profitability ── */}
          <TabsContent value="profitability">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="panel-premium">
                <CardHeader className="ribbon-premium">
                  <CardTitle className="text-sm font-bold">
                    الربحية حسب مندوب المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {!profitability || profitability.byRep.length === 0 ? (
                    <div className="empty-state">
                      <Eye className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs">لا توجد مناديب أو مبيعات.</p>
                    </div>
                  ) : (
                    <div className="datagrid">
                      <table className="w-full text-xs">
                        <thead className="bg-panel/60">
                          <tr className="border-b border-line">
                            <th className="text-right p-2">المندوب</th>
                            <th className="text-left p-2">المبيعات</th>
                            <th className="text-left p-2">العمولة</th>
                            <th className="text-left p-2">البونص</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profitability.byRep.map((r: any) => (
                            <tr
                              key={r.rep.id}
                              className="border-b border-line hover:bg-muted/30"
                            >
                              <td className="p-2 font-bold">{r.rep.name}</td>
                              <td className="p-2 text-left font-mono">
                                {fmtNum(r.salesTotal)} ر.ي
                              </td>
                              <td className="p-2 text-left font-mono text-success">
                                {fmtNum(r.commission)} ر.ي
                              </td>
                              <td className="p-2 text-left font-mono text-brand">
                                {fmtNum(r.bonus)} ر.ي
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="panel-premium">
                <CardHeader className="ribbon-premium">
                  <CardTitle className="text-sm font-bold">
                    الخصومات والعروض
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-line p-3 text-xs">
                    <span className="text-muted-foreground">
                      إجمالي الخصم الممنوح
                    </span>
                    <span className="font-bold text-danger">
                      {fmtNum(profitability?.discountTotal || 0)} ر.ي
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-line p-3 text-xs">
                    <span className="text-muted-foreground">
                      فواتير بها خصم
                    </span>
                    <span className="font-bold text-brand">
                      {profitability?.discountedInvoices ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-line p-3 text-xs">
                    <span className="text-muted-foreground">العروض النشطة</span>
                    <span className="font-bold">
                      {profitability?.offers ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Documents ── */}
          <TabsContent value="documents">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="panel-premium">
                <CardHeader className="ribbon-premium">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand" />
                    المستندات حسب النوع
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {(docsReport?.byType ?? []).length === 0 ? (
                    <div className="empty-state py-6">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs">لا توجد مستندات مرتبطة</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(docsReport?.byType ?? []).map((b: any) => (
                        <div
                          key={b.entityType || "غير محدد"}
                          className="flex items-center justify-between rounded-xl border border-line p-3"
                        >
                          <span className="text-xs font-bold">
                            {b.entityType || "غير محدد"}
                          </span>
                          <span className="chip bg-brand/10 text-brand">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="panel-premium">
                <CardHeader className="ribbon-premium">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand" />
                    أحدث المستندات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {(docsReport?.items ?? []).length === 0 ? (
                    <div className="empty-state py-6">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <p className="text-xs">لا توجد مستندات</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                      {(docsReport?.items ?? []).map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-xl border border-line p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">
                              {d.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {d.entityType || "غير محدد"} #{d.entityId}
                            </p>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone, hint, loading }: any) {
  const color =
    tone === "good"
      ? "text-success"
      : tone === "bad"
        ? "text-danger"
        : tone === "info"
          ? "text-info"
          : "text-brand";
  return (
    <Card className="stat-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={color}>
          <Icon className="w-4 h-4" />
        </span>
        {label}
      </div>
      {loading ? (
        <div className="skeleton-premium h-6 mt-2 rounded" />
      ) : (
        <p className={`text-lg font-black mt-2 font-mono ${color}`}>
          {value} ر.ي
        </p>
      )}
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
    </Card>
  );
}

function SummaryStat({ label, value }: any) {
  return (
    <Card className="panel-premium p-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-black font-mono mt-1">{value} ر.ي</p>
    </Card>
  );
}

function StatMini({ label, value, tone }: any) {
  return (
    <Card className="panel-premium p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-black mt-1 font-mono ${tone}`}>{value}</p>
    </Card>
  );
}

function UsersIcon(props: any) {
  return <Eye {...props} />;
}
