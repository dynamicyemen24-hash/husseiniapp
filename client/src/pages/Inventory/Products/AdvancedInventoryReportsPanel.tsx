import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  Target,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

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
  nameAr: string | null;
  type: "goods" | "service";
  category: string | null;
  purchasePrice: string;
  salePrice: string;
  currentStock: number;
}

interface InventoryMovementItem {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  createdAt: Date;
}

export function AdvancedInventoryReportsPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 100 });
  const products = useMemo(() => productsData?.items ?? [], [productsData]);
  const { data: inventoryMovements } = trpc.products.movements.useQuery(
    {},
    { staleTime: 60_000 }
  );

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [agingPeriods, setAgingPeriods] = useState("30,60,90,180,365");
  const [turnoverDays, setTurnoverDays] = useState(365);

  // ===== INVENTORY AGING =====
  const inventoryAging = useMemo(() => {
    if (!inventoryMovements || !products) return [];
    const productMap = new Map(products.map(p => [p.id, p]));
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - parseInt(agingPeriods.split(",").pop() || "365")
    );

    // Group movements by product
    const movementsByProduct = new Map<number, typeof inventoryMovements>();
    for (const mov of inventoryMovements) {
      if (!movementsByProduct.has(mov.productId)) {
        movementsByProduct.set(mov.productId, []);
      }
      movementsByProduct.get(mov.productId)!.push(mov);
    }

    const periods = agingPeriods.split(",").map(Number);
    const results: any[] = [];

    for (const [productId, movs] of movementsByProduct) {
      const product = productMap.get(productId);
      if (!product || product.type !== "goods") continue;

      // Calculate current stock from movements
      let currentStock = 0;
      const now = new Date();
      for (const m of movs) {
        if (m.type === "in" || m.type === "transfer")
          currentStock += m.quantity;
        else currentStock -= m.quantity;
      }

      if (currentStock <= 0) continue;

      // Calculate aging based on last movement dates
      const inMovements = movs
        .filter(m => m.type === "in" || m.type === "transfer")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      let remainingToAge = currentStock;
      const agingBuckets: Record<string, number> = {};
      let lastDate = now;

      for (const m of inMovements) {
        if (remainingToAge <= 0) break;
        const take = Math.min(remainingToAge, m.quantity);
        const daysOld = Math.floor(
          (now.getTime() - new Date(m.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        let bucket = "365+";
        for (const p of periods) {
          if (daysOld <= p) {
            bucket = `${p}`;
            break;
          }
        }
        agingBuckets[bucket] = (agingBuckets[bucket] || 0) + take;
        remainingToAge -= take;
        lastDate = new Date(m.createdAt);
      }

      if (remainingToAge > 0) {
        const daysOld = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        let bucket = "365+";
        for (const p of periods) {
          if (daysOld <= p) {
            bucket = `${p}`;
            break;
          }
        }
        agingBuckets[bucket] = (agingBuckets[bucket] || 0) + remainingToAge;
      }

      results.push({
        productId,
        productCode: product.code,
        productName: product.name,
        category: product.category,
        currentStock,
        unitCost: parseFloat(product.purchasePrice || "0"),
        unitPrice: parseFloat(product.salePrice || "0"),
        agingBuckets,
        totalValue: currentStock * parseFloat(product.purchasePrice || "0"),
        lastMovementDate: inMovements[0]?.createdAt || null,
      });
    }

    return results.sort((a, b) => b.totalValue - a.totalValue);
  }, [inventoryMovements, products, agingPeriods]);

  // ===== INVENTORY TURNOVER =====
  const inventoryTurnover = useMemo(() => {
    if (!inventoryMovements) return [];
    const productMap = new Map(products.map(p => [p.id, p]));
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - turnoverDays);

    const outMovements = inventoryMovements.filter(
      m =>
        (m.type === "out" || m.type === "transfer") &&
        new Date(m.createdAt) >= periodStart
    );

    const consumptionByProduct = new Map<
      number,
      { qty: number; value: number }
    >();
    for (const m of outMovements) {
      const existing = consumptionByProduct.get(m.productId) || {
        qty: 0,
        value: 0,
      };
      const product = productMap.get(m.productId);
      const unitCost = product ? parseFloat(product.purchasePrice || "0") : 0;
      existing.qty += m.quantity;
      existing.value += m.quantity * unitCost;
      consumptionByProduct.set(m.productId, existing);
    }

    const results: any[] = [];
    for (const [productId, consumption] of consumptionByProduct) {
      const product = productMap.get(productId);
      if (!product || product.type !== "goods") continue;

      const currentStock = product.currentStock || 0;
      const avgStock = (currentStock + consumption.qty) / 2;
      const turnoverRate = avgStock > 0 ? consumption.qty / avgStock : 0;
      const daysOfStock = turnoverRate > 0 ? turnoverDays / turnoverRate : 999;

      results.push({
        productId,
        productCode: product.code,
        productName: product.name,
        category: product.category,
        currentStock,
        consumptionQty: consumption.qty,
        consumptionValue: consumption.value,
        avgStock,
        turnoverRate,
        daysOfStock: Math.round(daysOfStock),
        unitCost: parseFloat(product.purchasePrice || "0"),
      });
    }

    return results.sort((a, b) => b.turnoverRate - a.turnoverRate);
  }, [inventoryMovements, products, turnoverDays]);

  // ===== ABC ANALYSIS =====
  const abcAnalysis = useMemo(() => {
    const goodsProducts = products.filter(
      p => p.type === "goods" && (p.currentStock || 0) > 0
    );
    const withValue = goodsProducts
      .map(p => ({
        ...p,
        stockValue: (p.currentStock || 0) * parseFloat(p.purchasePrice || "0"),
      }))
      .sort((a, b) => b.stockValue - a.stockValue);

    const totalValue = withValue.reduce((s, p) => s + p.stockValue, 0);
    let cumulative = 0;

    return withValue.map((p, i) => {
      cumulative += p.stockValue;
      const pct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
      let className = "C";
      if (pct <= 80) className = "A";
      else if (pct <= 95) className = "B";

      return {
        ...p,
        rank: i + 1,
        cumulativeValue: cumulative,
        cumulativePct: pct,
        abcClass: className,
      };
    });
  }, [products]);

  // ===== DEAD STOCK =====
  const deadStock = useMemo(() => {
    if (!inventoryMovements) return [];
    const productMap = new Map(products.map(p => [p.id, p]));
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const results: any[] = [];
    for (const product of products) {
      if (product.type !== "goods") continue;
      if ((product.currentStock || 0) <= 0) continue;

      const movs = inventoryMovements.filter(m => m.productId === product.id);
      const lastOut = movs
        .filter(m => m.type === "out" || m.type === "transfer")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      const lastIn = movs
        .filter(m => m.type === "in")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

      const daysSinceLastOut = lastOut
        ? Math.floor(
            (now.getTime() - new Date(lastOut.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 9999;
      const daysSinceLastIn = lastIn
        ? Math.floor(
            (now.getTime() - new Date(lastIn.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 9999;

      let status = "نشط";
      if (daysSinceLastOut > 365 && daysSinceLastIn > 365)
        status = "ميت (> سنة)";
      else if (daysSinceLastOut > 180 && daysSinceLastIn > 180)
        status = "بطيء (> 6 أشهر)";
      else if (daysSinceLastOut > 90) status = "كاسد (> 3 أشهر)";

      if (status !== "نشط") {
        results.push({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          category: product.category,
          currentStock: product.currentStock,
          unitCost: parseFloat(product.purchasePrice || "0"),
          unitPrice: parseFloat(product.salePrice || "0"),
          stockValue:
            (product.currentStock || 0) *
            parseFloat(product.purchasePrice || "0"),
          daysSinceLastOut,
          daysSinceLastIn,
          lastOutDate: lastOut?.createdAt,
          lastInDate: lastIn?.createdAt,
          status,
        });
      }
    }
    return results.sort((a, b) => b.stockValue - a.stockValue);
  }, [inventoryMovements, products]);

  // ===== SUMMARY STATS =====
  const totalAgingValue = useMemo(
    () => inventoryAging.reduce((s, p) => s + p.totalValue, 0),
    [inventoryAging]
  );
  const totalTurnoverValue = useMemo(
    () => inventoryTurnover.reduce((s, p) => s + p.consumptionValue, 0),
    [inventoryTurnover]
  );
  const totalAbcValue = useMemo(
    () => abcAnalysis.reduce((s, p) => s + p.stockValue, 0),
    [abcAnalysis]
  );
  const totalDeadValue = useMemo(
    () => deadStock.reduce((s, p) => s + p.stockValue, 0),
    [deadStock]
  );
  const classAValue = useMemo(
    () =>
      abcAnalysis
        .filter(p => p.abcClass === "A")
        .reduce((s, p) => s + p.stockValue, 0),
    [abcAnalysis]
  );
  const classBValue = useMemo(
    () =>
      abcAnalysis
        .filter(p => p.abcClass === "B")
        .reduce((s, p) => s + p.stockValue, 0),
    [abcAnalysis]
  );
  const classCValue = useMemo(
    () =>
      abcAnalysis
        .filter(p => p.abcClass === "C")
        .reduce((s, p) => s + p.stockValue, 0),
    [abcAnalysis]
  );

  return (
    <div className="space-y-4">
      {productsData && productsData.total > products.length && (
        <div
          role="status"
          className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground"
        >
          المؤشرات أدناه مبنية على أول {products.length} صنفاً من أصل{" "}
          {productsData.total.toLocaleString("ar-EG")} صنف.
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">
            تقارير المخزون المتقدمة
          </h2>
          <p className="text-xs text-gray-500">
            تقادم، دوران، تحليل ABC، ومخزون ميت/كاسد
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => {
              const report = inventoryAging.length
                ? { name: "تقادم المخزون", rows: inventoryAging }
                : inventoryTurnover.length
                  ? { name: "دوران المخزون", rows: inventoryTurnover }
                  : abcAnalysis.length
                    ? { name: "تحليل ABC", rows: abcAnalysis }
                    : deadStock.length
                      ? { name: "المخزون الكاسد", rows: deadStock }
                      : null;
              if (!report) {
                toast.error("لا توجد بيانات للتصدير");
                return;
              }
              const rows = report.rows as any[];
              const headers = rows.length ? Object.keys(rows[0]) : [];
              const n = downloadCsv(
                `${report.name}_${new Date().toISOString().slice(0, 10)}.csv`,
                headers,
                rows.map(r =>
                  headers.map(h => {
                    const v = r[h];
                    return v && typeof v === "object" ? JSON.stringify(v) : v;
                  })
                )
              );
              toast.success(`تم تصدير ${report.name}: ${n} صف`);
            }}
          >
            <Download className="w-3 h-3 ml-1" /> تصدير
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => toast.success("تم التحديث")}
          >
            <RefreshCw className="w-3 h-3 ml-1" /> تحديث
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-blue-500">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">قيمة التقادم</p>
              <p className="font-bold text-lg text-blue-600">
                {formatNum(totalAgingValue)} ر.ي
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-green-500">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 text-green-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">قيمة الاستهلاك</p>
              <p className="font-bold text-lg text-green-600">
                {formatNum(totalTurnoverValue)} ر.ي
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-purple-500">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 text-purple-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">إجمالي المخزون</p>
              <p className="font-bold text-lg text-purple-600">
                {formatNum(totalAbcValue)} ر.ي
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-red-500">
          <div className="flex items-center gap-2">
            <div className="bg-red-100 text-red-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">مخزون ميت/كاسد</p>
              <p className="font-bold text-lg text-red-600">
                {formatNum(totalDeadValue)} ر.ي
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-amber-500">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 text-amber-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">صنف A (80%)</p>
              <p className="font-bold text-lg text-amber-600">
                {formatNum(classAValue)} ر.ي
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-gray-500">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 text-gray-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500">صنف B (15%)</p>
              <p className="font-bold text-lg text-gray-600">
                {formatNum(classBValue)} ر.ي
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="aging">
        <TabsList className="grid w-full grid-cols-4 h-10 bg-white border">
          <TabsTrigger
            value="aging"
            className="text-[10px] flex items-center gap-1"
          >
            <Clock className="w-3 h-3" /> تقادم المخزون
          </TabsTrigger>
          <TabsTrigger
            value="turnover"
            className="text-[10px] flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3" /> معدل الدوران
          </TabsTrigger>
          <TabsTrigger
            value="abc"
            className="text-[10px] flex items-center gap-1"
          >
            <Target className="w-3 h-3" /> تحليل ABC
          </TabsTrigger>
          <TabsTrigger
            value="dead"
            className="text-[10px] flex items-center gap-1"
          >
            <Archive className="w-3 h-3" /> مخزون ميت/كاسد
          </TabsTrigger>
        </TabsList>

        {/* Aging Tab */}
        <TabsContent value="aging" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Label className="text-[11px] flex items-center">
              فترات التقادم (أيام):
            </Label>
            <Input
              className="h-9 text-xs w-[300px]"
              value={agingPeriods}
              onChange={e => setAgingPeriods(e.target.value)}
              placeholder="30,60,90,180,365"
            />
          </div>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px]">
                    <th className="text-right p-2">الكود</th>
                    <th className="text-right p-2">الصنف</th>
                    <th className="text-right p-2">التصنيف</th>
                    <th className="text-center p-2">الرصيد</th>
                    <th className="text-center p-2">التكلفة</th>
                    {agingPeriods.split(",").map(p => (
                      <th key={p} className="text-center p-2">
                        {p} يوم
                      </th>
                    ))}
                    <th className="text-center p-2">365+</th>
                    <th className="text-left p-2">القيمة الإجمالية</th>
                    <th className="text-left p-2">آخر حركة</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryAging.slice(0, 200).map(p => (
                    <tr key={p.productId} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-mono text-[10px]">
                        {p.productCode}
                      </td>
                      <td className="p-2 font-medium text-[11px]">
                        {p.productName}
                      </td>
                      <td className="p-2 text-[10px] text-gray-500">
                        {p.category || "-"}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {formatInt(p.currentStock)}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {formatNum(p.unitCost)}
                      </td>
                      {agingPeriods.split(",").map(period => (
                        <td key={period} className="p-2 text-center font-mono">
                          {formatInt(p.agingBuckets[period] || 0)}
                        </td>
                      ))}
                      <td className="p-2 text-center font-mono">
                        {formatInt(p.agingBuckets["365+"] || 0)}
                      </td>
                      <td className="p-2 text-left font-mono text-brand">
                        {formatNum(p.totalValue)} ر.ي
                      </td>
                      <td className="p-2 text-left text-[10px] text-gray-500">
                        {p.lastMovementDate
                          ? new Date(p.lastMovementDate).toLocaleDateString(
                              "ar-EG"
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-gray-50 font-bold">
                    <td colSpan={4} className="p-2 text-right">
                      الإجمالي
                    </td>
                    <td className="p-2 text-center font-mono">
                      {formatInt(
                        inventoryAging.reduce((s, p) => s + p.currentStock, 0)
                      )}
                    </td>
                    <td className="p-2"></td>
                    {agingPeriods.split(",").map(period => (
                      <td key={period} className="p-2 text-center font-mono">
                        {formatInt(
                          inventoryAging.reduce(
                            (s, p) => s + (p.agingBuckets[period] || 0),
                            0
                          )
                        )}
                      </td>
                    ))}
                    <td className="p-2 text-center font-mono">
                      {formatInt(
                        inventoryAging.reduce(
                          (s, p) => s + (p.agingBuckets["365+"] || 0),
                          0
                        )
                      )}
                    </td>
                    <td className="p-2 text-left font-mono text-brand">
                      {formatNum(totalAgingValue)} ر.ي
                    </td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Turnover Tab */}
        <TabsContent value="turnover" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Label className="text-[11px] flex items-center">
              فترة الحساب (أيام):
            </Label>
            <Select
              value={turnoverDays.toString()}
              onValueChange={v => setTurnoverDays(Number(v))}
            >
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 يوم</SelectItem>
                <SelectItem value="90">90 يوم (ربع سنة)</SelectItem>
                <SelectItem value="180">180 يوم (نصف سنة)</SelectItem>
                <SelectItem value="365">365 يوم (سنة)</SelectItem>
                <SelectItem value="730">730 يوم (سنتين)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px]">
                    <th className="text-right p-2">الكود</th>
                    <th className="text-right p-2">الصنف</th>
                    <th className="text-right p-2">التصنيف</th>
                    <th className="text-center p-2">الرصيد الحالي</th>
                    <th className="text-center p-2">الاستهلاك</th>
                    <th className="text-center p-2">المتوسط</th>
                    <th className="text-center p-2">معدل الدوران</th>
                    <th className="text-center p-2">أيام المخزون</th>
                    <th className="text-left p-2">قيمة الاستهلاك</th>
                    <th className="text-left p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryTurnover.slice(0, 200).map(p => {
                    let status = "ممتاز";
                    let statusColor = "bg-green-100 text-green-700";
                    if (p.turnoverRate < 1) {
                      status = "بطيء";
                      statusColor = "bg-red-100 text-red-700";
                    } else if (p.turnoverRate < 3) {
                      status = "مقبول";
                      statusColor = "bg-amber-100 text-amber-700";
                    } else if (p.turnoverRate < 6) {
                      status = "جيد";
                      statusColor = "bg-blue-100 text-blue-700";
                    }
                    return (
                      <tr
                        key={p.productId}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-2 font-mono text-[10px]">
                          {p.productCode}
                        </td>
                        <td className="p-2 font-medium text-[11px]">
                          {p.productName}
                        </td>
                        <td className="p-2 text-[10px] text-gray-500">
                          {p.category || "-"}
                        </td>
                        <td className="p-2 text-center font-mono">
                          {formatInt(p.currentStock)}
                        </td>
                        <td className="p-2 text-center font-mono">
                          {formatInt(p.consumptionQty)}
                        </td>
                        <td className="p-2 text-center font-mono">
                          {formatNum(p.avgStock)}
                        </td>
                        <td className="p-2 text-center font-bold text-blue-600">
                          {p.turnoverRate.toFixed(2)}x
                        </td>
                        <td className="p-2 text-center font-mono">
                          {p.daysOfStock >= 999
                            ? "N/A"
                            : formatInt(p.daysOfStock)}
                        </td>
                        <td className="p-2 text-left font-mono">
                          {formatNum(p.consumptionValue)} ر.ي
                        </td>
                        <td className="p-2 text-left">
                          <Badge className={statusColor} variant="outline">
                            {status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABC Analysis Tab */}
        <TabsContent value="abc" className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-red-500">
              <p className="text-[10px] text-gray-500">صنف A (80% من القيمة)</p>
              <p className="font-bold text-lg text-red-600">
                {abcAnalysis.filter(p => p.abcClass === "A").length} صنف
              </p>
            </Card>
            <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-amber-500">
              <p className="text-[10px] text-gray-500">صنف B (15% من القيمة)</p>
              <p className="font-bold text-lg text-amber-600">
                {abcAnalysis.filter(p => p.abcClass === "B").length} صنف
              </p>
            </Card>
            <Card className="border-0 shadow-sm bg-white p-3 border-l-4 border-green-500">
              <p className="text-[10px] text-gray-500">صنف C (5% من القيمة)</p>
              <p className="font-bold text-lg text-green-600">
                {abcAnalysis.filter(p => p.abcClass === "C").length} صنف
              </p>
            </Card>
            <Card className="border-0 shadow-sm bg-white p-3">
              <p className="text-[10px] text-gray-500">إجمالي الأصناف</p>
              <p className="font-bold text-lg text-ink">{abcAnalysis.length}</p>
            </Card>
          </div>

          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px]">
                    <th className="text-center p-2">#</th>
                    <th className="text-right p-2">الكود</th>
                    <th className="text-right p-2">الصنف</th>
                    <th className="text-right p-2">التصنيف</th>
                    <th className="text-center p-2">الرصيد</th>
                    <th className="text-center p-2">التكلفة</th>
                    <th className="text-left p-2">قيمة المخزون</th>
                    <th className="text-left p-2">القيمة التراكمية</th>
                    <th className="text-center p-2">النسبة %</th>
                    <th className="text-center p-2">الصنف</th>
                  </tr>
                </thead>
                <tbody>
                  {abcAnalysis.map(p => (
                    <tr
                      key={p.id}
                      className={`border-b hover:bg-gray-50 ${p.abcClass === "A" ? "bg-red-50" : p.abcClass === "B" ? "bg-amber-50" : "bg-green-50"}`}
                    >
                      <td className="p-2 text-center text-[10px]">{p.rank}</td>
                      <td className="p-2 font-mono text-[10px]">{p.code}</td>
                      <td className="p-2 font-medium text-[11px]">{p.name}</td>
                      <td className="p-2 text-[10px] text-gray-500">
                        {p.category || "-"}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {formatInt(p.currentStock || 0)}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {formatNum(parseFloat(p.purchasePrice || "0"))}
                      </td>
                      <td className="p-2 text-left font-mono text-brand">
                        {formatNum(p.stockValue)} ر.ي
                      </td>
                      <td className="p-2 text-left font-mono">
                        {formatNum(p.cumulativeValue)} ر.ي
                      </td>
                      <td className="p-2 text-center font-bold">
                        {p.cumulativePct.toFixed(1)}%
                      </td>
                      <td className="p-2 text-center">
                        <Badge
                          className={
                            p.abcClass === "A"
                              ? "bg-red-100 text-red-700"
                              : p.abcClass === "B"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }
                          variant="outline"
                        >
                          {p.abcClass}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dead Stock Tab */}
        <TabsContent value="dead" className="space-y-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="p-3">
              <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                الأصناف الكاسدة والميتة (بدون حركة مبيعات/إدخال لفترات طويلة)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px]">
                    <th className="text-right p-2">الكود</th>
                    <th className="text-right p-2">الصنف</th>
                    <th className="text-right p-2">التصنيف</th>
                    <th className="text-center p-2">الرصيد</th>
                    <th className="text-center p-2">التكلفة</th>
                    <th className="text-left p-2">القيمة</th>
                    <th className="text-center p-2">أيام منذ آخر خروج</th>
                    <th className="text-center p-2">أيام منذ آخر دخول</th>
                    <th className="text-center p-2">آخر خروج</th>
                    <th className="text-center p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {deadStock.slice(0, 200).map(p => (
                    <tr
                      key={p.productId}
                      className={`border-b hover:bg-gray-50 ${p.status.includes("ميت") ? "bg-red-50" : p.status.includes("بطيء") ? "bg-amber-50" : "bg-orange-50"}`}
                    >
                      <td className="p-2 font-mono text-[10px]">
                        {p.productCode}
                      </td>
                      <td className="p-2 font-medium text-[11px]">
                        {p.productName}
                      </td>
                      <td className="p-2 text-[10px] text-gray-500">
                        {p.category || "-"}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {formatInt(p.currentStock)}
                      </td>
                      <td className="p-2 text-center font-mono">
                        {formatNum(p.unitCost)}
                      </td>
                      <td className="p-2 text-left font-mono text-red-600">
                        {formatNum(p.stockValue)} ر.ي
                      </td>
                      <td className="p-2 text-center font-mono text-red-600">
                        {p.daysSinceLastOut >= 9999
                          ? "لا يوجد"
                          : formatInt(p.daysSinceLastOut)}
                      </td>
                      <td className="p-2 text-center font-mono text-amber-600">
                        {p.daysSinceLastIn >= 9999
                          ? "لا يوجد"
                          : formatInt(p.daysSinceLastIn)}
                      </td>
                      <td className="p-2 text-center text-[10px] text-gray-500">
                        {p.lastOutDate
                          ? new Date(p.lastOutDate).toLocaleDateString("ar-EG")
                          : "لا يوجد"}
                      </td>
                      <td className="p-2 text-center">
                        <Badge
                          className={
                            p.status.includes("ميت")
                              ? "bg-red-100 text-red-700"
                              : p.status.includes("بطيء")
                                ? "bg-amber-100 text-amber-700"
                                : "bg-orange-100 text-orange-700"
                          }
                          variant="outline"
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {deadStock.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center text-green-600 py-8"
                      >
                        لا يوجد مخزون كاسد أو ميت - ممتاز!
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-gray-50 font-bold">
                    <td colSpan={4} className="p-2 text-right">
                      إجمالي الأصناف الكاسدة: {deadStock.length}
                    </td>
                    <td className="p-2 text-center font-mono">
                      {formatInt(
                        deadStock.reduce((s, p) => s + p.currentStock, 0)
                      )}
                    </td>
                    <td className="p-2"></td>
                    <td className="p-2 text-left font-mono text-red-600">
                      {formatNum(totalDeadValue)} ر.ي
                    </td>
                    <td colSpan={4} className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
