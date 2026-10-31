import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  Scale,
  TrendingUp,
  Wallet,
  Landmark,
  Users,
  Factory,
  Download,
  Printer,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";

const fmt = (n: number | undefined | null) =>
  Number(n ?? 0).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_LABEL: Record<string, string> = {
  current: "حالية",
  d30: "1-30 يوم",
  d60: "31-60 يوم",
  d90: "61-90 يوم",
  over90: "+90 يوم",
};

export default function FinancialStatements() {
  const [asOf, setAsOf] = useState("");
  const [prevAsOf, setPrevAsOf] = useState("");
  const [active, setActive] = useState("trial");

  const trialInput: any = {};
  if (asOf) trialInput.asOf = asOf;
  if (prevAsOf) trialInput.previousAsOf = prevAsOf;
  const hasPrev = !!prevAsOf;

  const incInput: any = {};
  if (asOf) incInput.asOf = asOf;
  if (prevAsOf) incInput.previousAsOf = prevAsOf;

  const baseInput: any = asOf ? { asOf } : undefined;

  const trial = trpc.financialReports.trialBalance.useQuery(
    Object.keys(trialInput).length ? trialInput : undefined,
    { staleTime: 30_000 }
  );
  const income = trpc.financialReports.incomeStatement.useQuery(
    Object.keys(incInput).length ? incInput : undefined,
    { staleTime: 30_000 }
  );
  const sheet = trpc.financialReports.balanceSheet.useQuery(baseInput, {
    staleTime: 30_000,
  });
  const cash = trpc.financialReports.cashFlow.useQuery(baseInput, {
    staleTime: 30_000,
  });
  const ar = trpc.financialReports.arAging.useQuery(undefined, {
    staleTime: 30_000,
  });
  const ap = trpc.financialReports.apAging.useQuery(undefined, {
    staleTime: 30_000,
  });

  const exportActive = () => {
    let cols: string[] | undefined;
    let rows: (string | number)[][] | undefined;
    const name = active;
    if (active === "trial" && trial.data?.rows) {
      cols = [
        "الكود",
        "الحساب",
        "النوع",
        "مدين",
        "دائن",
        "الرصيد",
        ...(hasPrev ? ["رصيد سابق", "التغير"] : []),
      ];
      rows = trial.data.rows.map((r: any) => [
        r.code,
        r.name,
        r.type,
        r.debit || 0,
        r.credit || 0,
        r.balance,
        ...(hasPrev ? [r.previousBalance ?? "", r.change ?? ""] : []),
      ]);
    } else if (active === "income" && income.data) {
      cols = ["البند", "الكود", "المبلغ"];
      rows = [
        ...income.data.revenues.map((r: any) => [r.name, r.code, r.amount]),
        ...income.data.expenses.map((r: any) => [r.name, r.code, r.amount]),
      ];
    } else if (active === "cash" && cash.data?.lines) {
      cols = ["الكود", "الحساب", "صافي التدفق"];
      rows = cash.data.lines.map((r: any) => [r.code, r.name, r.net]);
    } else if (active === "ar" && ar.data?.rows) {
      cols = ["الفاتورة", "العميل", "المتبقي", "الفئة"];
      rows = ar.data.rows.map((r: any) => [
        r.invoiceNumber,
        r.customer,
        r.outstanding,
        r.bucket,
      ]);
    } else if (active === "ap" && ap.data?.rows) {
      cols = ["الفاتورة", "المورد", "المتبقي", "الفئة"];
      rows = ap.data.rows.map((r: any) => [
        r.invoiceNumber,
        r.supplier,
        r.outstanding,
        r.bucket,
      ]);
    } else {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    if (!cols || !rows) return;
    const n = downloadCsv(
      `${name}_${new Date().toISOString().slice(0, 10)}.csv`,
      cols,
      rows as any
    );
    toast.success(`تم تصدير ${n} صف`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── Ribbon — هوية مالية موحدة مع Reports ── */}
        <div className="ribbon-premium">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip bg-brand/15 text-brand border border-brand/20">
                  IFRS · مصدر خادم موثوق
                </span>
                <a
                  href="/reports"
                  className="chip bg-info/10 text-info hover:bg-info/15"
                >
                  ← العودة للتقارير الموحدة
                </a>
              </div>
              <h1 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand" />
                القوائم المالية — تقارير الخادم العميقة
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                نفس الأرصدة التي يعتمدها ميزان المراجعة، محسوبة من دفتر الأستاذ
                مباشرة — مع مقارنة فترات وتصدير مؤسسي.
              </p>
              {(trial.data?.periodLabel || trial.data?.previousPeriodLabel) && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {trial.data?.periodLabel && (
                    <span className="chip bg-success/10 text-success">
                      {trial.data.periodLabel}
                    </span>
                  )}
                  {trial.data?.previousPeriodLabel && (
                    <span className="chip bg-muted text-muted-foreground">
                      مقارنة: {trial.data.previousPeriodLabel}
                    </span>
                  )}
                </div>
              )}
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
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">
                  قارن بسابق (اختياري)
                </Label>
                <Input
                  type="date"
                  value={prevAsOf}
                  onChange={e => setPrevAsOf(e.target.value)}
                  className="h-9 w-40 text-xs"
                />
              </div>
              {(asOf || prevAsOf) && (
                <Button
                  variant="ghost"
                  className="h-9 text-xs"
                  onClick={() => {
                    setAsOf("");
                    setPrevAsOf("");
                  }}
                >
                  مسح
                </Button>
              )}
              <div className="h-9 w-px bg-line hidden sm:block" />
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs press-effect"
                onClick={exportActive}
              >
                <Download className="w-3.5 h-3.5 ml-1" /> CSV
              </Button>
              <Button
                size="sm"
                className="h-9 text-xs bg-brand text-brand-foreground press-effect shine-on-hover"
                onClick={() => {
                  const title =
                    active === "trial"
                      ? "ميزان المراجعة"
                      : active === "income"
                        ? "قائمة الدخل"
                        : active === "sheet"
                          ? "الميزانية العمومية"
                          : active === "cash"
                            ? "التدفقات النقدية"
                            : active === "ar"
                              ? "الذمم المدينة"
                              : "الذمم الدائنة";
                  const cols =
                    active === "trial"
                      ? ["الكود", "الحساب", "مدين", "دائن"]
                      : ["البيان", "المبلغ"];
                  const rows: (string | number)[][] =
                    active === "trial"
                      ? (trial.data?.rows ?? []).map((r: any) => [
                          r.code,
                          r.name,
                          r.debit ? fmt(r.debit) : "-",
                          r.credit ? fmt(r.credit) : "-",
                        ])
                      : active === "cash"
                        ? (cash.data?.lines ?? []).map((r: any) => [
                            r.name,
                            fmt(r.net),
                          ])
                        : [];
                  if (!rows.length) {
                    toast.error("لا توجد بيانات للطباعة");
                    return;
                  }
                  openPrintableInvoiceWindow({
                    invoiceNumber: `FS-${active.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
                    invoiceDate: new Date().toISOString(),
                    customerName: "القوائم المالية — الحسينية",
                    institutionName: "مجموعة الحسينية",
                    currency: "ريال يمني (YER)",
                    items: [],
                    subtotal: 0,
                    total: 0,
                    report: { title, columns: cols, rows },
                  });
                }}
              >
                <Printer className="w-3.5 h-3.5 ml-1" /> طباعة
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            icon={<Scale className="w-4 h-4" />}
            label="إجمالي المدين"
            value={fmt(trial.data?.totals.debit)}
            tone="brand"
            loading={trial.isLoading}
            hint={trial.data?.periodLabel || "حتى الآن"}
          />
          <Kpi
            icon={<TrendingUp className="w-4 h-4" />}
            label="صافي الدخل"
            value={fmt(income.data?.totals.net)}
            tone={Number(income.data?.totals.net) >= 0 ? "good" : "bad"}
            loading={income.isLoading}
            hint={income.data?.periodLabel || "حتى الآن"}
          />
          <Kpi
            icon={<Wallet className="w-4 h-4" />}
            label="إجمالي الأصول"
            value={fmt(sheet.data?.totals.assets)}
            tone="brand"
            loading={sheet.isLoading}
            hint="الميزانية"
          />
          <Kpi
            icon={<Landmark className="w-4 h-4" />}
            label="صافي التدفق"
            value={fmt(cash.data?.net)}
            tone="good"
            loading={cash.isLoading}
            hint="حسابات نقدية"
          />
        </div>

        <Tabs value={active} onValueChange={setActive} className="space-y-4">
          <TabsList className="tabs-primary w-full">
            <TabsTrigger value="trial" className="tab-trigger">
              <Scale className="w-3.5 h-3.5" /> ميزان المراجعة
            </TabsTrigger>
            <TabsTrigger value="income" className="tab-trigger">
              <TrendingUp className="w-3.5 h-3.5" /> قائمة الدخل
            </TabsTrigger>
            <TabsTrigger value="sheet" className="tab-trigger">
              <Landmark className="w-3.5 h-3.5" /> الميزانية
            </TabsTrigger>
            <TabsTrigger value="cash" className="tab-trigger">
              <Wallet className="w-3.5 h-3.5" /> التدفقات
            </TabsTrigger>
            <TabsTrigger value="ar" className="tab-trigger">
              <Users className="w-3.5 h-3.5" /> مدينة
            </TabsTrigger>
            <TabsTrigger value="ap" className="tab-trigger">
              <Factory className="w-3.5 h-3.5" /> دائنة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trial">
            <ReportCard
              title="ميزان المراجعة"
              desc="كل الحسابات ذات الرصيد — المدين = الدائن"
              footer={`التوازن: مدين ${fmt(trial.data?.totals.debit)} = دائن ${fmt(trial.data?.totals.credit)}${hasPrev ? ` — سابق: مدين ${fmt((trial.data?.totals as any)?.previousDebit)} / دائن ${fmt((trial.data?.totals as any)?.previousCredit)}` : ""}`}
            >
              {trial.isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton-premium h-9" />
                  ))}
                </div>
              ) : (trial.data?.rows?.length ?? 0) === 0 ? (
                <div className="empty-state">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-bold">لا توجد أرصدة</p>
                </div>
              ) : (
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header
                      cols={[
                        "الكود",
                        "الحساب",
                        "النوع",
                        "مدين",
                        "دائن",
                        ...(hasPrev ? ["سابق", "التغير"] : []),
                      ]}
                    />
                    <TableBody>
                      {trial.data?.rows?.map((r: any) => (
                        <TableRow
                          key={r.accountId}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {r.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.name}
                          </TableCell>
                          <TableCell>
                            <span className="chip text-[10px]">{r.type}</span>
                          </TableCell>
                          <TableCell className="font-mono">
                            {r.debit ? fmt(r.debit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {r.credit ? fmt(r.credit) : "—"}
                          </TableCell>
                          {hasPrev && (
                            <>
                              <TableCell className="font-mono text-muted-foreground">
                                {r.previousBalance != null
                                  ? fmt(r.previousBalance)
                                  : "—"}
                              </TableCell>
                              <TableCell className="font-mono">
                                {r.change != null ? fmt(r.change) : "—"}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ReportCard>
          </TabsContent>

          <TabsContent value="income">
            <div className="grid md:grid-cols-2 gap-4">
              <ReportCard title="الإيرادات" desc="حسابات الإيرادات">
                {income.isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="skeleton-premium h-8" />
                    ))}
                  </div>
                ) : (
                  <div className="datagrid">
                    <Table>
                      <Header cols={["الكود", "البند", "المبلغ"]} />
                      <TableBody>
                        {income.data?.revenues?.map((r: any) => (
                          <TableRow
                            key={r.code}
                            className="border-line hover:bg-muted/30"
                          >
                            <TableCell className="font-mono text-[11px]">
                              {r.code}
                            </TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="font-mono text-success">
                              {fmt(r.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </ReportCard>
              <ReportCard title="المصروفات" desc="حسابات المصروفات">
                {income.isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="skeleton-premium h-8" />
                    ))}
                  </div>
                ) : (
                  <div className="datagrid">
                    <Table>
                      <Header cols={["الكود", "البند", "المبلغ"]} />
                      <TableBody>
                        {income.data?.expenses?.map((r: any) => (
                          <TableRow
                            key={r.code}
                            className="border-line hover:bg-muted/30"
                          >
                            <TableCell className="font-mono text-[11px]">
                              {r.code}
                            </TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="font-mono text-danger">
                              {fmt(r.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </ReportCard>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryStat
                label="الإيرادات"
                value={fmt(income.data?.totals.revenue)}
              />
              <SummaryStat
                label="المصروفات"
                value={fmt(income.data?.totals.expense)}
              />
              <SummaryStat
                label="صافي الدخل"
                value={fmt(income.data?.totals.net)}
                highlight
              />
            </div>
            {income.data?.previousTotals && (
              <div className="status-strip status-info mt-3 text-xs">
                مقارنة سابقة — إيرادات:{" "}
                {fmt(income.data.previousTotals.revenue)} · مصروفات:{" "}
                {fmt(income.data.previousTotals.expense)} · صافي:{" "}
                {fmt(income.data.previousTotals.net)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sheet">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  title: "الأصول",
                  icon: <Wallet className="w-4 h-4" />,
                  rows: sheet.data?.assets,
                },
                {
                  title: "الخصوم",
                  icon: <Landmark className="w-4 h-4" />,
                  rows: sheet.data?.liabilities,
                },
                {
                  title: "رأس المال",
                  icon: <Users className="w-4 h-4" />,
                  rows: sheet.data?.equity,
                },
              ].map(s => (
                <ReportCard key={s.title} title={s.title} icon={s.icon}>
                  {sheet.isLoading ? (
                    <div className="p-3 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton-premium h-8" />
                      ))}
                    </div>
                  ) : (
                    <div className="datagrid">
                      <Table>
                        <Header cols={["الكود", "البند", "المبلغ"]} />
                        <TableBody>
                          {(s.rows as any[] | undefined)?.map((r: any) => (
                            <TableRow
                              key={r.code}
                              className="border-line hover:bg-muted/30"
                            >
                              <TableCell className="font-mono text-[11px]">
                                {r.code}
                              </TableCell>
                              <TableCell>{r.name}</TableCell>
                              <TableCell className="font-mono">
                                {fmt(r.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </ReportCard>
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
                label="رأس المال"
                value={fmt(sheet.data?.totals.equity)}
              />
            </div>
            <div className="status-strip status-info mt-3 text-xs">
              المعادلة: الأصول = الخصوم + حقوق الملكية — الفرق الحالي:{" "}
              {fmt(sheet.data?.totals.net)} — يجب أن يكون صفراً.
            </div>
          </TabsContent>

          <TabsContent value="cash">
            <ReportCard
              title="التدفقات النقدية"
              desc="صافي التغير في الحسابات النقدية (1xx)"
            >
              {cash.isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-premium h-8" />
                  ))}
                </div>
              ) : (cash.data?.lines?.length ?? 0) === 0 ? (
                <div className="empty-state">
                  <Wallet className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm">لا توجد حركات نقدية</p>
                </div>
              ) : (
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header cols={["الكود", "الحساب", "صافي التدفق"]} />
                    <TableBody>
                      {cash.data?.lines?.map((r: any) => (
                        <TableRow
                          key={r.accountId}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {r.code}
                          </TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell
                            className={`font-mono font-bold ${r.net >= 0 ? "text-success" : "text-danger"}`}
                          >
                            {fmt(r.net)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ReportCard>
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
          </TabsContent>

          {["ar", "ap"].map(k => {
            const data = k === "ar" ? ar.data : ap.data;
            const isAr = k === "ar";
            return (
              <TabsContent key={k} value={k}>
                <ReportCard
                  title={
                    isAr
                      ? "ذمم العملاء المدينة (Aging)"
                      : "ذمم الموردين الدائنة (Aging)"
                  }
                  icon={
                    isAr ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <Factory className="w-4 h-4" />
                    )
                  }
                  footer={`إجمالي: ${fmt(Object.values(data?.totals ?? {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0))}`}
                >
                  {(isAr ? ar.isLoading : ap.isLoading) ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton-premium h-8" />
                      ))}
                    </div>
                  ) : (data?.rows?.length ?? 0) === 0 ? (
                    <div className="empty-state">
                      <BarChart3 className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm">لا توجد ذمم في هذه الفترة</p>
                    </div>
                  ) : (
                    <div className="datagrid overflow-x-auto">
                      <Table>
                        <Header
                          cols={[
                            "الفاتورة",
                            "الطرف",
                            "الاستحقاق",
                            "الفئة",
                            "المتبقي",
                          ]}
                        />
                        <TableBody>
                          {data?.rows?.map((r: any, i: number) => (
                            <TableRow
                              key={i}
                              className="border-line hover:bg-muted/30"
                            >
                              <TableCell className="font-mono text-[11px]">
                                {r.invoiceNumber}
                              </TableCell>
                              <TableCell>{r.customer ?? r.supplier}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {new Date(r.dueDate).toLocaleDateString("ar")}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`chip text-[10px] ${r.bucket === "current" ? "bg-success/10 text-success" : r.bucket === "over90" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"}`}
                                >
                                  {STATUS_LABEL[r.bucket] ?? r.bucket}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono">
                                {fmt(r.outstanding)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </ReportCard>
                {data && (
                  <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                    {Object.entries(data.totals ?? {}).map(([k, v]) => (
                      <div key={k} className="panel-premium p-3 text-center">
                        <p className="text-muted-foreground">
                          {STATUS_LABEL[k] ?? k}
                        </p>
                        <p className="font-mono font-bold mt-1">
                          {fmt(v as number)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
}

function Header({ cols }: { cols: string[] }) {
  return (
    <TableHeader>
      <TableRow className="bg-panel/60">
        {cols.map(c => (
          <TableHead key={c} className="text-xs font-bold">
            {c}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function ReportCard({ title, desc, icon, footer, children }: any) {
  return (
    <Card className="panel-premium">
      <CardHeader className="ribbon-premium">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
        {desc && <CardDescription className="text-xs">{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
      {footer && (
        <div className="datagrid-footer text-xs text-muted-foreground font-medium">
          {footer}
        </div>
      )}
    </Card>
  );
}

function Kpi({ icon, label, value, tone, loading, hint }: any) {
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
        <span className={color}>{icon}</span>
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

function SummaryStat({ label, value, highlight }: any) {
  return (
    <Card
      className={`panel-premium p-3 text-center ${highlight ? "border-brand/30 bg-brand/5" : ""}`}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-black font-mono mt-1">{value} ر.ي</p>
    </Card>
  );
}
