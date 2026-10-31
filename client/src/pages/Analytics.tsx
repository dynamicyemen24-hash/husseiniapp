import { useMemo, useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  Building2,
  Activity,
  Eye,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return `${AR_MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}
const PIE_COLORS = [
  "var(--brand)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "#7c3aed",
  "#be123c",
  "#0f766e",
  "#d99a5b",
];
function fmt(n: number) {
  return new Intl.NumberFormat("ar-YE", { maximumFractionDigits: 0 }).format(n);
}

function ChartCard({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="panel-premium p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="flex-1 min-h-[260px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const TIME_FILTERS = [
  { label: "آخر 3 أشهر", value: "3m" },
  { label: "السنة الحالية", value: "ytd" },
  { label: "السنة المالية (يناير-ديسمبر)", value: "fy" },
  { label: "آخر 12 شهراً", value: "12m" },
  { label: "كل الأوقات", value: "all" },
] as const;

export default function Analytics() {
  const { data, isPending } = trpc.modules.analytics.summary.useQuery();
  const chartData = useMemo(
    () =>
      (data?.months ?? []).map((m: any) => ({
        ...m,
        label: fmtMonth(m.month),
      })),
    [data]
  );
  const [timeFilter, setTimeFilter] = useState<(typeof TIME_FILTERS)[number]>(
    TIME_FILTERS[3]
  );

  const filteredData = useMemo(() => {
    if (timeFilter.value === "all") return chartData;
    if (timeFilter.value === "3m") return chartData.slice(-3);
    if (timeFilter.value === "12m") return chartData.slice(-12);
    if (timeFilter.value === "ytd") {
      const y = new Date().getFullYear();
      return chartData.filter((m: any) => m.month.startsWith(String(y)));
    }
    if (timeFilter.value === "fy") {
      // fiscal = calendar year (strict) — واضح للمستخدم، بلا غموض Oct-Mar السابق الخاطئ
      const y = new Date().getFullYear();
      return chartData.filter((m: any) => m.month.startsWith(String(y)));
    }
    return chartData;
  }, [chartData, timeFilter.value]);

  const summary = useMemo(() => {
    if (!data) return null;
    const months = data?.months ?? [];
    if (!months.length) return null;
    const prev = months.length >= 2 ? months[months.length - 2] : null;
    const last = months[months.length - 1];
    const rev = last.revenue ?? 0;
    const exp = last.expense ?? 0;
    const prevRev = prev?.revenue ?? 0;
    const delta = prevRev ? ((rev - prevRev) / prevRev) * 100 : null;
    return {
      revenue: rev,
      expense: exp,
      profit: rev - exp,
      totalRevenue: data?.totals?.revenue ?? 0,
      totalExpense: data?.totals?.expense ?? 0,
      totalProfit: data?.totals?.profit ?? 0,
      delta,
    };
  }, [data]);

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <main className="flex-1 px-4 py-6 md:px-8 max-w-[1600px] mx-auto w-full space-y-6">
        <div className="ribbon-premium">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip bg-brand/15 text-brand border border-brand/20">
                  BI · مصدر خادم موثوق
                </span>
                <a
                  href="/reports"
                  className="chip bg-info/10 text-info hover:bg-info/15"
                >
                  ← التقارير الموحدة
                </a>
                <a
                  href="/financial-statements"
                  className="chip bg-success/10 text-success hover:bg-success/15"
                >
                  القوائم المالية →
                </a>
              </div>
              <h1 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand" />
                التحليلات الذكية — ذكاء تشغيلي لحظي
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                اتجاهات شهرية، هوامش، توزيع فروع وقنوات — كلها من نفس دفتر
                الأستاذ الذي تُبنى عليه القوائم. لا تقدير منفصل، لا ازدواجية.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="chip bg-muted text-muted-foreground">
                {filteredData.length} شهراً معروضة
              </span>
              {summary?.delta != null && (
                <span
                  className={`chip ${summary.delta >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
                >
                  {summary.delta >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(summary.delta).toFixed(1)}% عن الشهر السابق
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-muted/40 border border-line w-fit">
          {TIME_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f as any)}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${timeFilter.value === f.value ? "bg-brand text-brand-foreground shadow press-effect" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          الفترة النشطة:{" "}
          <span className="font-bold text-foreground">{timeFilter.label}</span>{" "}
          · {filteredData.length} شهراً
        </p>

        {isPending ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-premium h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {summary && (
                <>
                  <StatCard
                    label="إجمالي الإيرادات"
                    value={fmt(summary.totalRevenue)}
                    tone="positive"
                    icon={TrendingUp}
                    hint={`الشهر الأخير: ${fmt(summary.revenue)}`}
                  />
                  <StatCard
                    label="إجمالي المصروفات"
                    value={fmt(summary.totalExpense)}
                    tone="negative"
                    icon={TrendingDown}
                    hint={`الشهر الأخير: ${fmt(summary.expense)}`}
                  />
                  <StatCard
                    label="صافي الربح التراكمي"
                    value={fmt(summary.totalProfit)}
                    tone="info"
                    icon={Wallet}
                    hint={`الشهر الأخير: ${fmt(summary.profit)}`}
                  />
                  <StatCard
                    label="هامش الربح"
                    value={
                      summary.totalRevenue
                        ? `${((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}%`
                        : "0%"
                    }
                    tone="warning"
                    icon={Eye}
                    hint="صافي / إيرادات"
                  />
                </>
              )}
            </section>

            {data?.note && (
              <div className="status-strip status-info text-xs">
                {data.note}
              </div>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard
                title="الإيرادات مقابل المصروفات"
                icon={TrendingUp}
                hint={`${timeFilter.label} — شهري`}
              >
                <LineChart
                  data={filteredData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="الإيرادات"
                    stroke="var(--success)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="المصروفات"
                    stroke="var(--danger, #e11d48)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ChartCard>

              <ChartCard
                title="صافي الربح الشهري"
                icon={Wallet}
                hint="ربح كل شهر"
              >
                <BarChart
                  data={filteredData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="profit"
                    name="صافي الربح"
                    fill="var(--brand)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="أعلى المنتجات مبيعاً"
                icon={Package}
                hint="حسب قيمة المبيعات"
              >
                <BarChart
                  data={[...(data?.topProducts ?? [])].reverse()}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--line)"
                    horizontal={false}
                  />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Bar
                    dataKey="total"
                    name="المبيعات"
                    fill="var(--brand)"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ChartCard>

              <ChartCard
                title="المبيعات حسب الفرع"
                icon={Building2}
                hint="توزيع الإيرادات"
              >
                <PieChart>
                  <Pie
                    data={data?.salesByBranch ?? []}
                    dataKey="total"
                    nameKey="branch"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: any) => e.branch}
                  >
                    {(data?.salesByBranch ?? []).map(
                      (_: unknown, i: number) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ChartCard>

              <ChartCard
                title="مسار الإيرادات مع الاتجاه"
                icon={TrendingUp}
                hint="أعمدة + خط اتجاه"
              >
                <ComposedChart
                  data={filteredData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="revenue"
                    name="الإيرادات"
                    fill="var(--brand)"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="اتجاه"
                    stroke="var(--ink, #0e2a2b)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ChartCard>

              <ChartCard
                title="التدفق النقدي التراكمي"
                icon={Activity}
                hint="صافي الربح المتراكم"
              >
                <AreaChart
                  data={
                    filteredData.length
                      ? filteredData.map((d: any, i: number, arr: any[]) => ({
                          ...d,
                          cashflow: arr
                            .slice(0, i + 1)
                            .reduce(
                              (s: number, x: any) =>
                                s + (x.revenue - x.expense),
                              0
                            ),
                        }))
                      : filteredData
                  }
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cf2" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--success)"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--success)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={48} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    contentStyle={{ direction: "rtl", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cashflow"
                    name="التدفق"
                    stroke="var(--success)"
                    strokeWidth={2.5}
                    fill="url(#cf2)"
                  />
                </AreaChart>
              </ChartCard>
            </section>

            {(data?.topProducts?.length ?? 0) === 0 &&
              (data?.salesByBranch?.length ?? 0) === 0 && (
                <div className="empty-state">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-bold">
                    لا توجد بيانات كافية للتحليل
                  </p>
                  <p className="text-xs text-muted-foreground">
                    سجّل قيوداً ومبيعات معتمدة لتظهر الاتجاهات.
                  </p>
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}
