import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Archive,
  AlertTriangle,
  Clock,
  Warehouse as WhIcon,
  Calculator,
  RefreshCw,
  Download,
  Home,
  LineChart,
  PieChart,
  Activity,
  ClipboardCheck,
} from "lucide-react";
import { format } from "date-fns";
import { WarehouseStockPanel } from "./WarehouseStockPanel";
import { BatchTrackingPanel } from "./BatchTrackingPanel";
import { StockReservationsPanel } from "./StockReservationsPanel";
import { CycleCountingPanel } from "./CycleCountingPanel";
import { InventoryValuationPanel } from "./InventoryValuationPanel";
import { AdvancedInventoryReportsPanel } from "./AdvancedInventoryReportsPanel";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatInt = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n));

interface WarehouseItem {
  id: number;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

interface ProductItem {
  id: number;
  code: string;
  name: string;
  type: "goods" | "service";
}

interface InventoryMovementItem {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  createdAt: Date;
}

interface SummaryByCategory {
  category: string;
  qty: number;
  value: number;
}

export function InventoryDashboard() {
  const summary = trpc.products.inventorySummary.useQuery();
  const valuation = trpc.products.valuation.useQuery();
  const lowStock = trpc.products.lowStock.useQuery();
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const movementDashboard = trpc.products.movementDashboard.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const { data: productsData } = trpc.products.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();
  const products = productsData?.items ?? [];

  // KPIs for dashboard
  const totalProducts = summary.data?.totalProducts ?? 0;
  const totalGoods = summary.data?.totalGoods ?? 0;
  const totalServices = summary.data?.totalServices ?? 0;
  const totalStockValue = summary.data?.totalStockValue ?? 0;
  const totalRetailValue = summary.data?.totalRetailValue ?? 0;
  const lowStockCount = summary.data?.lowStockCount ?? 0;

  // Movement stats
  const movementsThisMonth = movementDashboard.data?.currentMonth ?? 0;
  const movementsLastMonth = movementDashboard.data?.previousMonth ?? 0;
  const movementChange =
    movementsLastMonth > 0
      ? Number(
          (
            ((movementsThisMonth - movementsLastMonth) / movementsLastMonth) *
            100
          ).toFixed(1)
        )
      : 0;

  const topMoving = movementDashboard.data?.topMoving ?? [];
  const activityByDay = new Map(
    (movementDashboard.data?.dailyActivity ?? []).map(row => [
      row.day,
      row.count,
    ])
  );

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-sand to-muted font-sans"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="ribbon-premium bg-ink text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-display flex items-center gap-2">
              <Package className="w-7 h-7 text-brand" />
              لوحة معلومات المخزون - Business Intelligence
            </h1>
            <p className="text-xs text-muted-foreground/70 mt-1">
              عرض موحد لمخازن متعددة، تقييم، جرد، حجوزات، وتقارير متقدمة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-border/50 text-white hover:bg-white/10 press-effect"
              onClick={() => {
                void Promise.all([
                  summary.refetch(),
                  valuation.refetch(),
                  lowStock.refetch(),
                  movementDashboard.refetch(),
                ]);
              }}
            >
              <RefreshCw className="w-3 h-3 ml-1" /> تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-border/50 text-white hover:bg-white/10 press-effect"
              onClick={async () => {
                try {
                  const total = productsData?.total ?? products.length;
                  const allProducts = [...products];
                  for (
                    let offset = allProducts.length;
                    offset < total;
                    offset += 100
                  ) {
                    const next = await utils.products.list.fetch({
                      limit: 100,
                      offset,
                    });
                    allProducts.push(...next.items);
                  }
                  const count = downloadCsv(
                    `جرد_الأصناف_${new Date().toISOString().slice(0, 10)}.csv`,
                    ["الرمز", "الاسم", "النوع"],
                    allProducts.map(p => [p.code, p.name, p.type])
                  );
                  toast.success(`تم تصدير ${count} صنف بتنسيق CSV`);
                } catch {
                  toast.error("تعذر تصدير قائمة الأصناف كاملة");
                }
              }}
            >
              <Download className="w-3 h-3 ml-1" /> تصدير CSV
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            icon={<Package className="w-5 h-5" />}
            iconBg="bg-info/20 text-info"
            label="إجمالي الأصناف"
            value={formatInt(totalProducts)}
            subValue={`${totalGoods} سلع • ${totalServices} خدمات`}
            subColor="text-muted-foreground"
          />
          <KpiCard
            icon={<DollarSign className="w-5 h-5" />}
            iconBg="bg-brand text-white"
            label="قيمة المخزون (تكلفة)"
            value={`${formatNum(totalStockValue)} ر.ي`}
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            iconBg="bg-success/20 text-success"
            label="قيمة المخزون (بيع)"
            value={`${formatNum(totalRetailValue)} ر.ي`}
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            iconBg={
              lowStockCount > 0
                ? "bg-rose-500/20 text-rose-600"
                : "bg-success/20 text-success"
            }
            label="أصناف منخفضة"
            value={formatInt(lowStockCount)}
            danger={lowStockCount > 0}
          />
          <KpiCard
            icon={<Activity className="w-5 h-5" />}
            iconBg="bg-purple-500/20 text-purple-600"
            label="الحركات هذا الشهر"
            value={formatInt(movementsThisMonth)}
            subValue={`${movementChange > 0 ? "+" : ""}${movementChange}% من الشهر الماضي`}
            subColor={movementChange >= 0 ? "text-success" : "text-rose-600"}
          />
          <KpiCard
            icon={<WhIcon className="w-5 h-5" />}
            iconBg="bg-warning/20 text-warning"
            label="المخازن النشطة"
            value={formatInt(warehouses?.filter(w => w.isActive).length || 0)}
            subValue={`من ${warehouses?.length || 0} مخزن`}
            subColor="text-muted-foreground"
          />
        </div>

        {/* Quick Actions */}
        <Card className="panel-premium border-0">
          <CardHeader className="ribbon-premium py-3 px-4">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand" /> إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickActionBtn
                icon={<WhIcon className="w-4 h-4" />}
                label="أرصدة المخازن"
                desc="عرض تفصيلي لكل مخزن"
              />
              <QuickActionBtn
                icon={<Calculator className="w-4 h-4" />}
                label="التقييم (FIFO/LIFO)"
                desc="طرق محاسبية متعددة"
              />
              <QuickActionBtn
                icon={<ClipboardCheck className="w-4 h-4" />}
                label="الجرد الدوري"
                desc="إدارة عمليات الجرد"
              />
              <QuickActionBtn
                icon={<Target className="w-4 h-4" />}
                label="تحليل ABC"
                desc="تصنيف الأصناف بالأهمية"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Moving Products */}
        <Card className="panel-premium border-0">
          <CardHeader className="ribbon-premium py-3 px-4">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" /> أكثر الأصناف حركة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            <div className="datagrid rounded-xl border border-line">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-panel/60 text-muted-foreground font-bold">
                    <th className="text-right p-2.5">#</th>
                    <th className="text-right p-2.5">الكود</th>
                    <th className="text-right p-2.5">الصنف</th>
                    <th className="text-center p-2.5">دخول</th>
                    <th className="text-center p-2.5">خروج</th>
                    <th className="text-center p-2.5">تحويلات</th>
                    <th className="text-center p-2.5">إجمالي الحركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {topMoving.map((m, i) => (
                    <tr
                      key={m.id}
                      className="bg-surface hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-2.5 text-center text-[10px] text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-muted-foreground">
                        {m.code}
                      </td>
                      <td className="p-2.5 text-foreground font-medium">
                        {m.name}
                      </td>
                      <td className="p-2.5 text-center font-mono text-success font-bold">
                        {formatInt(m.in)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-rose-600 font-bold">
                        {formatInt(m.out)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-info font-bold">
                        {formatInt(m.transfers)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-foreground">
                        {formatInt(m.total)}
                      </td>
                    </tr>
                  ))}
                  {topMoving.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10">
                        <div className="empty-state rounded-xl border border-border bg-surface p-6">
                          <div className="empty-state-icon mx-auto mb-3">
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-foreground mb-1">
                            لا توجد حركات مسجلة
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            سجّل حركات المخزون لعرض أكثر الأصناف حركة
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="panel-premium border-0">
            <CardHeader className="ribbon-premium py-3 px-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <PieChart className="w-4 h-4 text-brand" /> توزيع القيمة حسب
                التصنيف
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <div className="datagrid rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-panel/60 text-muted-foreground font-bold">
                      <th className="text-right p-2.5">التصنيف</th>
                      <th className="text-center p-2.5">الكمية</th>
                      <th className="text-left p-2.5">القيمة (تكلفة)</th>
                      <th className="text-left p-2.5">النسبة %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(summary.data?.byCategory || []).map(c => (
                      <tr
                        key={c.category}
                        className="bg-surface hover:bg-muted/30"
                      >
                        <td className="p-2.5 text-foreground font-medium">
                          {c.category}
                        </td>
                        <td className="p-2.5 text-center font-mono text-muted-foreground">
                          {formatInt(c.qty)}
                        </td>
                        <td className="p-2.5 text-left font-mono text-emerald-700 font-bold">
                          {formatNum(c.value)} ر.ي
                        </td>
                        <td className="p-2.5 text-left font-bold text-foreground">
                          {totalStockValue > 0
                            ? ((c.value / totalStockValue) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-panel/60">
                      <td className="p-2.5 text-right text-foreground">
                        الإجمالي
                      </td>
                      <td className="p-2.5 text-center font-mono text-foreground">
                        {formatInt(
                          summary.data?.byCategory?.reduce(
                            (s, c) => s + c.qty,
                            0
                          ) || 0
                        )}
                      </td>
                      <td className="p-2.5 text-left font-mono text-emerald-700 font-bold">
                        {formatNum(totalStockValue)} ر.ي
                      </td>
                      <td className="p-2.5 text-left text-foreground">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-premium border-0">
            <CardHeader className="ribbon-premium py-3 px-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <LineChart className="w-4 h-4 text-info" /> حركة المخزون (30
                يوم)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-48 flex items-end justify-around gap-1">
                {Array.from({ length: 30 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (29 - i));
                  const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const dayMovements = activityByDay.get(dayKey) ?? 0;
                  const maxMovements = Math.max(
                    ...Array.from({ length: 30 }, (_, j) => {
                      const day = new Date();
                      day.setDate(day.getDate() - (29 - j));
                      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                      return activityByDay.get(key) ?? 0;
                    }),
                    1
                  );
                  const height = Math.max(
                    (dayMovements / maxMovements) * 100,
                    4
                  );
                  return (
                    <div key={i} className="flex flex-col items-center w-full">
                      <div
                        className="bg-info rounded-t transition-all hover:opacity-80"
                        style={{ width: "100%", height: `${height}%` }}
                        title={`${format(date, "yyyy/MM/dd")}: ${dayMovements} حركة`}
                      />
                      <span className="text-[7px] text-muted-foreground mt-1">
                        {format(date, "dd")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Modules Tabs */}
        <Tabs defaultValue="warehouse-stock" className="mt-4">
          <TabsList className="tabs-primary w-full">
            <TabsTrigger value="warehouse-stock" className="tab-trigger">
              <WhIcon className="w-3 h-3" /> أرصدة المخازن
            </TabsTrigger>
            <TabsTrigger value="batches" className="tab-trigger">
              <Package className="w-3 h-3" /> الدفعات/التسلسل
            </TabsTrigger>
            <TabsTrigger value="reservations" className="tab-trigger">
              <Target className="w-3 h-3" /> الحجوزات
            </TabsTrigger>
            <TabsTrigger value="cycle-count" className="tab-trigger">
              <ClipboardCheck className="w-3 h-3" /> الجرد الدوري
            </TabsTrigger>
            <TabsTrigger value="valuation" className="tab-trigger">
              <Calculator className="w-3 h-3" /> التقييم
            </TabsTrigger>
            <TabsTrigger value="reports" className="tab-trigger">
              <BarChart3 className="w-3 h-3" /> تقارير متقدمة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warehouse-stock" className="mt-4">
            <WarehouseStockPanel />
          </TabsContent>

          <TabsContent value="batches" className="mt-4">
            <BatchTrackingPanel />
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            <StockReservationsPanel />
          </TabsContent>

          <TabsContent value="cycle-count" className="mt-4">
            <CycleCountingPanel />
          </TabsContent>

          <TabsContent value="valuation" className="mt-4">
            <InventoryValuationPanel />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <AdvancedInventoryReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  subValue,
  subColor = "text-gray-500",
  danger,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  subValue?: string;
  subColor?: string;
  danger?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm bg-white p-3">
      <div className="flex items-center gap-3">
        <div
          className={`${iconBg} w-10 h-10 rounded-lg flex items-center justify-center`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 truncate">{label}</p>
          <p
            className={`font-bold text-lg truncate ${danger ? "text-red-600" : "text-ink"}`}
          >
            {value}
          </p>
          {subValue && (
            <p className={`text-[10px] truncate ${subColor}`}>{subValue}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function QuickActionBtn({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-20 flex-col items-start justify-center gap-1 text-right border-gray-200 hover:bg-gray-50"
    >
      <div className="bg-ink text-brand w-8 h-8 rounded-lg flex items-center justify-center mb-1">
        {icon}
      </div>
      <span className="font-bold text-xs text-ink">{label}</span>
      <span className="text-[9px] text-gray-400">{desc}</span>
    </Button>
  );
}
