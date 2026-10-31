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
  Warehouse as WhIcon,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n * 100) / 100);

interface WarehouseItem {
  id: number;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

interface StockItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastMovementAt: Date | null;
  productCode: string;
  productName: string;
  productType: "goods" | "service";
  minStock: number;
  warehouseCode: string;
  warehouseName: string;
}

export function WarehouseStockPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const {
    data: stockItems,
    isLoading,
    refetch,
  } = trpc.products.warehouseStockList.useQuery(
    { warehouseId: selectedWarehouseId || undefined, lowStockOnly },
    { enabled: !!selectedWarehouseId }
  );

  const totalItems = useMemo(() => stockItems?.length || 0, [stockItems]);
  const totalQty = useMemo(
    () => stockItems?.reduce((s, i) => s + (i.quantity || 0), 0) || 0,
    [stockItems]
  );
  const totalAvailable = useMemo(
    () => stockItems?.reduce((s, i) => s + (i.availableQty || 0), 0) || 0,
    [stockItems]
  );
  const totalReserved = useMemo(
    () => stockItems?.reduce((s, i) => s + (i.reservedQty || 0), 0) || 0,
    [stockItems]
  );
  const lowStockCount = useMemo(
    () =>
      stockItems?.filter(i => (i.availableQty || 0) <= (i.minStock || 0))
        .length || 0,
    [stockItems]
  );

  const filteredStock = useMemo(() => {
    if (!stockItems) return [];
    let result = stockItems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        i =>
          i.productCode?.toLowerCase().includes(q) ||
          i.productName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [stockItems, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">مخزون المخازن</h2>
          <p className="text-xs text-muted-foreground">
            عرض وإدارة الأرصدة لكل مخزن على حدة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedWarehouseId?.toString() || ""}
            onValueChange={v => setSelectedWarehouseId(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-[250px] h-9 text-xs">
              <SelectValue placeholder="اختر مخزناً" />
            </SelectTrigger>
            <SelectContent>
              {warehouses?.map(w => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.code} - {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            disabled={!selectedWarehouseId}
            onClick={() => {
              const n = downloadCsv(
                `رصيد_المخزن_${selectedWarehouseId ?? "الكل"}_${new Date()
                  .toISOString()
                  .slice(0, 10)}.csv`,
                [
                  "رمز الصنف",
                  "اسم الصنف",
                  "النوع",
                  "الرصيد",
                  "المحجوز",
                  "المتاح",
                  "حد الإنذار",
                ],
                filteredStock.map(s => [
                  s.productCode,
                  s.productName,
                  s.productType,
                  s.quantity,
                  s.reservedQty,
                  s.availableQty,
                  s.minStock,
                ])
              );
              toast.success(`تم تصدير ${n} صف بتنسيق CSV`);
            }}
          >
            <Download className="w-3 h-3 ml-1" /> تصدير
          </Button>
        </div>
      </div>

      {!selectedWarehouseId ? (
        <Card className="panel-premium border-0">
          <CardContent className="p-8 text-center">
            <div className="empty-state rounded-2xl border border-border bg-surface p-8">
              <WhIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                اختر مخزناً لعرض أرصدته
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                قم باختيار مخزن من القائمة أعلاه
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">
                إجمالي الأصناف
              </p>
              <p className="font-bold text-lg text-foreground">{totalItems}</p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">إجمالي الكمية</p>
              <p className="font-bold text-lg text-foreground">
                {formatNum(totalQty)}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">متاح للبيع</p>
              <p className="font-bold text-lg text-success">
                {formatNum(totalAvailable)}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">محجوز</p>
              <p className="font-bold text-lg text-warning">
                {formatNum(totalReserved)}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">منخفضة</p>
              <p
                className={`font-bold text-lg ${lowStockCount > 0 ? "text-rose-600" : "text-success"}`}
              >
                {lowStockCount}
              </p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالكود أو الاسم..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 text-xs pr-10"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={e => setLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <span>منخفضة المخزون فقط</span>
            </label>
          </div>

          <Card className="panel-premium border-0">
            <CardContent className="p-4 overflow-x-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-10 bg-muted/50 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="datagrid rounded-xl border border-line overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-panel/60 text-muted-foreground font-bold text-[10px]">
                        <th className="text-right p-2">الكود</th>
                        <th className="text-right p-2">الصنف</th>
                        <th className="text-center p-2">النوع</th>
                        <th className="text-center p-2">الكمية</th>
                        <th className="text-center p-2">متاح</th>
                        <th className="text-center p-2">محجوز</th>
                        <th className="text-center p-2">الحد الأدنى</th>
                        <th className="text-left p-2">الحالة</th>
                        <th className="text-left p-2">آخر حركة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map(item => {
                        const available = item.availableQty || 0;
                        const minStock = item.minStock || 0;
                        const isLow = available <= minStock && minStock > 0;
                        return (
                          <tr
                            key={item.id}
                            className={`border-line hover:bg-muted/30 transition-colors ${isLow ? "bg-rose-500/5" : "bg-surface"}`}
                          >
                            <td className="p-2.5 font-mono text-[10px] text-foreground">
                              {item.productCode}
                            </td>
                            <td className="p-2.5 font-medium text-foreground">
                              {item.productName}
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge
                                className={
                                  item.productType === "goods"
                                    ? "chip bg-info/15 text-info"
                                    : "chip bg-purple-500/15 text-purple-600"
                                }
                                variant="outline"
                              >
                                {item.productType === "goods" ? "سلعة" : "خدمة"}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-center font-mono text-foreground">
                              {formatNum(item.quantity || 0)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-success font-bold">
                              {formatNum(available)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-warning font-bold">
                              {formatNum(item.reservedQty || 0)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-foreground">
                              {formatNum(minStock)}
                            </td>
                            <td className="p-2.5 text-left">
                              {isLow ? (
                                <Badge className="chip bg-rose-500/15 text-rose-600">
                                  ناقص
                                </Badge>
                              ) : available === 0 ? (
                                <Badge className="chip bg-muted text-muted-foreground">
                                  منفذ
                                </Badge>
                              ) : (
                                <Badge className="chip bg-success/15 text-success">
                                  ممتاز
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-left text-[10px] text-muted-foreground">
                              {item.lastMovementAt
                                ? new Date(
                                    item.lastMovementAt
                                  ).toLocaleDateString("ar-EG")
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredStock.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-10">
                            <div className="empty-state flex flex-col items-center gap-2">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                              <p className="text-sm font-medium text-foreground">
                                لا توجد بيانات
                              </p>
                              <p className="text-xs text-muted-foreground">
                                لم يتم العثور على أصناف لهذا المخزن
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
