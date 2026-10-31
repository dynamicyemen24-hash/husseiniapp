import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Download,
  Printer,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const money = (n: number) =>
  n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
const monthLabel = (date: Date) =>
  date.toLocaleDateString("ar-EG", { month: "short", year: "numeric" });

export default function SupplierAnalytics() {
  const [, setLocation] = useLocation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const performanceQ = trpc.purchasesReports.supplierPerformance.useQuery(
    { from: from || undefined, to: to || undefined },
    { staleTime: 30_000 }
  );
  const supplierOptions = performanceQ.data?.suppliers ?? [];
  const analysis = useMemo(() => {
    const report = performanceQ.data;
    const matchesSupplier = (id: number | null) =>
      supplierFilter === "all" || String(id ?? "none") === supplierFilter;
    const suppliersRows = (report?.suppliers ?? [])
      .filter(row => matchesSupplier(row.supplierId))
      .sort((a, b) => b.spend - a.spend);
    const months = (report?.months ?? [])
      .filter(row => matchesSupplier(row.supplierId))
      .reduce((byMonth, row) => {
        const month = byMonth.get(row.month) ?? {
          label: monthLabel(new Date(`${row.month}-01T00:00:00`)),
          spend: 0,
          invoices: 0,
        };
        month.spend += row.spend;
        month.invoices += row.invoices;
        byMonth.set(row.month, month);
        return byMonth;
      }, new Map<string, { label: string; spend: number; invoices: number }>())
      .values();
    const monthRows = Array.from(months).slice(-12);
    const totalSpend = suppliersRows.reduce((sum, row) => sum + row.spend, 0);
    const totalPaid = suppliersRows.reduce((sum, row) => sum + row.paid, 0);
    const invoiceCount = suppliersRows.reduce(
      (sum, row) => sum + row.invoices,
      0
    );
    return {
      suppliersRows,
      months: monthRows,
      totalSpend,
      totalPaid,
      outstanding: Math.max(0, totalSpend - totalPaid),
      invoiceCount,
      averageInvoice: invoiceCount ? totalSpend / invoiceCount : 0,
    };
  }, [performanceQ.data, supplierFilter]);
  const maxMonth = Math.max(...analysis.months.map(m => m.spend), 1);
  const exportCsv = () => {
    const rows = [
      ["المورد", "عدد الفواتير", "إجمالي المشتريات", "المدفوع", "المستحق"],
      ...analysis.suppliersRows.map(r => [
        r.name,
        r.invoices,
        r.spend,
        r.paid,
        r.outstanding,
      ]),
    ];
    const csv = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل تقرير أداء الموردين");
  };
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-5 py-6">
          <Button
            variant="ghost"
            className="px-0 text-slate-300 hover:bg-transparent hover:text-white"
            onClick={() => setLocation("/procurement-workspace")}
          >
            <ArrowLeft className="ml-2 h-4 w-4" /> العودة إلى Workspace
            المشتريات
          </Button>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-amber-300">Supplier Intelligence</p>
              <h1 className="mt-1 text-3xl font-black">
                تحليل أداء الموردين والمشتريات
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                مقارنة الإنفاق، الالتزامات، متوسط قيمة الفاتورة والاتجاه الشهري
                من واقع فواتير المشتريات.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                onClick={() => window.print()}
              >
                <Printer className="ml-2 h-4 w-4" /> طباعة
              </Button>
              <Button
                className="bg-amber-400 text-slate-950 hover:bg-amber-300"
                onClick={exportCsv}
              >
                <Download className="ml-2 h-4 w-4" /> تنزيل CSV
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div>
              <label className="mb-1 block text-xs font-bold">من تاريخ</label>
              <Input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">إلى تاريخ</label>
              <Input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="h-9 w-40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">المورد</label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-9 w-52">
                  <SelectValue placeholder="كل الموردين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموردين</SelectItem>
                  {supplierOptions.map(s => (
                    <SelectItem
                      key={s.supplierId ?? "none"}
                      value={String(s.supplierId ?? "none")}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="h-9"
              onClick={() => {
                setFrom("");
                setTo("");
                setSupplierFilter("all");
                performanceQ.refetch();
              }}
            >
              <RefreshCw className="ml-2 h-3.5 w-3.5" /> إعادة ضبط
            </Button>
          </CardContent>
        </Card>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            {
              label: "إجمالي المشتريات",
              value: `${money(analysis.totalSpend)} YER`,
              icon: Wallet,
              tone: "text-violet-700",
            },
            {
              label: "إجمالي المدفوع",
              value: `${money(analysis.totalPaid)} YER`,
              icon: TrendingUp,
              tone: "text-emerald-700",
            },
            {
              label: "الالتزامات المفتوحة",
              value: `${money(analysis.outstanding)} YER`,
              icon: TrendingDown,
              tone: "text-rose-700",
            },
            {
              label: "متوسط الفاتورة",
              value: `${money(analysis.averageInvoice)} YER`,
              icon: Wallet,
              tone: "text-sky-700",
            },
            {
              label: "الموردون النشطون",
              value: analysis.suppliersRows.length,
              icon: Users,
              tone: "text-amber-700",
            },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <Icon className={`h-4 w-4 ${tone}`} />
                </div>
                <p className={`mt-2 text-xl font-black ${tone}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">المشتريات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-end gap-2 border-b border-slate-200 pb-1">
                {analysis.months.map(m => (
                  <div
                    key={m.label}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-t-md bg-amber-500 transition-all"
                      style={{
                        height: `${Math.max((m.spend / maxMonth) * 88, 4)}%`,
                      }}
                      title={`${m.label}: ${money(m.spend)}`}
                    />
                    <span className="text-[10px] text-slate-500">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                مقارنة السعر/الإنفاق حسب المورد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.suppliersRows.slice(0, 8).map(r => (
                <div key={r.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-bold">{r.name}</span>
                    <span>{money(r.spend)} YER</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.max((r.spend / Math.max(analysis.totalSpend, 1)) * 100, 2)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {analysis.suppliersRows.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  لا توجد بيانات في الفترة المحددة.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">بطاقة أداء الموردين</CardTitle>
              <Badge variant="outline">
                {analysis.invoiceCount} فاتورة محللة
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3">المورد</th>
                  <th className="p-3">الفواتير</th>
                  <th className="p-3">إجمالي الشراء</th>
                  <th className="p-3">المدفوع</th>
                  <th className="p-3">المستحق</th>
                  <th className="p-3">نسبة السداد</th>
                  <th className="p-3">آخر شراء</th>
                </tr>
              </thead>
              <tbody>
                {analysis.suppliersRows.map(r => (
                  <tr key={r.name} className="border-b">
                    <td className="p-3 font-bold">{r.name}</td>
                    <td className="p-3">{r.invoices}</td>
                    <td className="p-3">{money(r.spend)} YER</td>
                    <td className="p-3 text-emerald-700">
                      {money(r.paid)} YER
                    </td>
                    <td className="p-3 text-rose-700">
                      {money(r.outstanding)} YER
                    </td>
                    <td className="p-3">
                      {r.spend
                        ? `${((r.paid / r.spend) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                    <td className="p-3">
                      {r.lastDate?.toLocaleDateString("ar-EG") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
