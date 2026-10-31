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
  Calculator,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ProductPicker } from "@/components/ProductPicker";

const formatNum = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const formatCost = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(Number(n || 0));

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

export function InventoryValuationPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 100 });
  const products = productsData?.items ?? [];
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickedProduct, setPickedProduct] = useState<ProductItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const displayedProduct =
    pickedProduct?.id === selectedProductId
      ? pickedProduct
      : (products.find(product => product.id === selectedProductId) ?? null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [activeTab, setActiveTab] = useState<
    "layers" | "fifo" | "lifo" | "wavg"
  >("layers");
  const [fifoQty, setFifoQty] = useState(1);
  const [lifoQty, setLifoQty] = useState(1);

  const { data: valuationLayers, refetch: refetchLayers } =
    trpc.products.valuationLayers.useQuery(
      {
        productId: selectedProductId || 0,
        warehouseId: selectedWarehouseId || undefined,
        asOfDate,
      },
      { enabled: !!selectedProductId }
    );

  const { data: fifoResult } = trpc.products.fifoValuation.useQuery(
    {
      productId: selectedProductId || 0,
      warehouseId: selectedWarehouseId || undefined,
      quantity: fifoQty,
    },
    { enabled: !!selectedProductId && activeTab === "fifo" }
  );

  const { data: lifoResult } = trpc.products.lifoValuation.useQuery(
    {
      productId: selectedProductId || 0,
      warehouseId: selectedWarehouseId || undefined,
      quantity: lifoQty,
    },
    { enabled: !!selectedProductId && activeTab === "lifo" }
  );

  const totalLayers = useMemo(
    () => valuationLayers?.layers?.length || 0,
    [valuationLayers]
  );
  const totalQty = useMemo(
    () => valuationLayers?.totalQty || 0,
    [valuationLayers]
  );
  const totalValue = useMemo(
    () => valuationLayers?.totalValue || 0,
    [valuationLayers]
  );
  const wavgCost = useMemo(
    () => valuationLayers?.weightedAvgCost || 0,
    [valuationLayers]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">
            تقييم المخزون (FIFO / LIFO / المتوسط المرجح)
          </h2>
          <p className="text-xs text-gray-500">
            حساب تكلفة البضاعة المباعة وقيمة المخزون النهائي بطرق محاسبية متعددة
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => refetchLayers()}
        >
          <RefreshCw className="w-3 h-3 ml-1" /> تحديث
        </Button>
      </div>

      {!selectedProductId ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-8 text-center text-gray-400">
            <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>اختر صنفاً لحساب تقييم مخزونه</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-9 w-[300px] justify-between text-xs"
                onClick={() => setProductPickerOpen(true)}
              >
                {displayedProduct
                  ? `${displayedProduct.code} - ${displayedProduct.name}`
                  : "اختر صنفاً"}
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Select
                value={selectedWarehouseId?.toString() || ""}
                onValueChange={v =>
                  setSelectedWarehouseId(v ? Number(v) : null)
                }
              >
                <SelectTrigger className="h-9 text-xs w-[200px]">
                  <SelectValue placeholder="مخزن (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع المخازن</SelectItem>
                  {warehouses?.map(w => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.code} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="text-[11px]">كما في تاريخ:</Label>
                <Input
                  type="date"
                  className="h-9 text-xs w-[160px]"
                  value={asOfDate}
                  onChange={e => setAsOfDate(e.target.value)}
                />
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={v => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="tabs-primary w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="layers" className="tab-trigger">
                  <Package className="w-3 h-3" /> طبقات التقييم
                </TabsTrigger>
                <TabsTrigger value="wavg" className="tab-trigger">
                  <TrendingUp className="w-3 h-3" /> المتوسط المرجح
                </TabsTrigger>
                <TabsTrigger value="fifo" className="tab-trigger">
                  <ArrowUp className="w-3 h-3" /> FIFO (الأقدم أولاً)
                </TabsTrigger>
                <TabsTrigger value="lifo" className="tab-trigger">
                  <ArrowDown className="w-3 h-3" /> LIFO (الأحدث أولاً)
                </TabsTrigger>
              </TabsList>

              {/* Valuation Layers Tab */}
              <TabsContent value="layers" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card className="panel-premium border-0 p-3">
                    <p className="text-[10px] text-muted-foreground">
                      إجمالي الطبقات
                    </p>
                    <p className="font-bold text-lg text-foreground">
                      {totalLayers}
                    </p>
                  </Card>
                  <Card className="panel-premium border-0 p-3">
                    <p className="text-[10px] text-muted-foreground">
                      إجمالي الكمية
                    </p>
                    <p className="font-bold text-lg text-foreground">
                      {formatNum(totalQty)}
                    </p>
                  </Card>
                  <Card className="panel-premium border-0 p-3">
                    <p className="text-[10px] text-muted-foreground">
                      إجمالي القيمة
                    </p>
                    <p className="font-bold text-lg text-brand">
                      {formatNum(totalValue)} ر.ي
                    </p>
                  </Card>
                  <Card className="panel-premium border-0 p-3">
                    <p className="text-[10px] text-muted-foreground">
                      المتوسط المرجح
                    </p>
                    <p className="font-bold text-lg text-success">
                      {formatCost(wavgCost)} ر.ي
                    </p>
                  </Card>
                </div>

                <Card className="panel-premium border-0">
                  <CardContent className="p-4 overflow-x-auto">
                    <div className="datagrid rounded-xl border border-line overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-panel/60 text-muted-foreground font-bold text-[10px]">
                            <th className="text-right p-2.5">#</th>
                            <th className="text-right p-2.5">التاريخ</th>
                            <th className="text-right p-2.5">المخزن</th>
                            <th className="text-center p-2.5">الكمية</th>
                            <th className="text-center p-2.5">المتبقي</th>
                            <th className="text-left p-2.5">تكلفة الوحدة</th>
                            <th className="text-left p-2.5">إجمالي التكلفة</th>
                            <th className="text-left p-2.5">المصدر</th>
                            <th className="text-left p-2.5">المرجع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valuationLayers?.layers?.map((layer, i) => (
                            <tr
                              key={layer.id}
                              className={`border-line hover:bg-muted/30 transition-colors ${layer.remainingQty === 0 ? "bg-muted/40 opacity-60" : "bg-surface"}`}
                            >
                              <td className="p-2.5 text-right text-[10px] text-foreground">
                                {i + 1}
                              </td>
                              <td className="p-2.5 text-right text-[10px] text-foreground">
                                {new Date(layer.layerDate).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </td>
                              <td className="p-2.5 text-right text-[10px] text-foreground">
                                {(layer as any).warehouseCode ||
                                  (layer as any).warehouseId ||
                                  "-"}
                              </td>
                              <td className="p-2.5 text-center font-mono text-foreground">
                                {formatNum(layer.quantity)}
                              </td>
                              <td className="p-2.5 text-center font-mono text-foreground">
                                {layer.remainingQty > 0 ? (
                                  formatNum(layer.remainingQty)
                                ) : (
                                  <span className="chip bg-success/15 text-success text-[10px]">
                                    مستهلك بالكامل
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-left font-mono text-brand font-bold">
                                {formatCost(layer.unitCost)}
                              </td>
                              <td className="p-2.5 text-left font-mono text-foreground">
                                {formatNum(layer.totalCost)}
                              </td>
                              <td className="p-2.5 text-left text-[10px] text-foreground">
                                {layer.sourceType}
                              </td>
                              <td className="p-2.5 text-left text-[10px] text-foreground">
                                {layer.referenceType || "-"}:{" "}
                                {layer.referenceId || "-"}
                              </td>
                            </tr>
                          ))}
                          {(!valuationLayers?.layers ||
                            valuationLayers.layers.length === 0) && (
                            <tr>
                              <td
                                colSpan={9}
                                className="text-center text-gray-400 py-8"
                              >
                                لا توجد طبقات تقييم لهذا الصنف
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 bg-panel/60 font-bold">
                            <td
                              colSpan={3}
                              className="p-2.5 text-right text-foreground"
                            >
                              الإجماليات
                            </td>
                            <td className="p-2.5 text-center font-mono text-foreground">
                              {formatNum(totalQty)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-foreground">
                              {formatNum(
                                valuationLayers?.layers?.reduce(
                                  (s, l) => s + (l.remainingQty || 0),
                                  0
                                ) || 0
                              )}
                            </td>
                            <td className="p-2.5 text-left font-mono text-brand">
                              {formatCost(wavgCost)}
                            </td>
                            <td className="p-2.5 text-left font-mono text-success font-bold">
                              {formatNum(totalValue)}
                            </td>
                            <td colSpan={2} className="p-2.5"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Weighted Average Tab */}
              <TabsContent value="wavg" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card className="border-0 shadow-sm bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 text-green-600 w-8 h-8 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">
                          المتوسط المرجح للوحدة
                        </p>
                        <p className="font-bold text-lg text-green-600">
                          {formatCost(wavgCost)} ر.ي
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">
                          إجمالي الكمية المتاحة
                        </p>
                        <p className="font-bold text-lg text-blue-600">
                          {formatNum(totalQty)}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-brand text-white w-8 h-8 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">
                          قيمة المخزون الإجمالية
                        </p>
                        <p className="font-bold text-lg text-ink">
                          {formatNum(totalValue)} ر.ي
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="border-0 shadow-sm bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-purple-100 text-purple-600 w-8 h-8 rounded-lg flex items-center justify-center">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">
                          تكلفة المبيعات (COGS)
                        </p>
                        <p className="font-bold text-lg text-purple-600">
                          {formatNum(totalLayers * wavgCost)} ر.ي
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-bold text-ink">
                      شرح طريقة المتوسط المرجح
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 text-xs text-gray-600 space-y-2">
                    <p>
                      <strong>الصيغة:</strong> إجمالي تكلفة الوحدات المتاحة ÷
                      إجمالي الوحدات المتاحة
                    </p>
                    <p>
                      تُستخدم هذه الطريقة عندما تكون الوحدات متجانسة ولا يمكن
                      تمييزها، وتنتج قيمة وسطية بين FIFO و LIFO.
                    </p>
                    <p className="text-amber-600">
                      <strong>ملاحظة:</strong> هذه الطريقة مقبولة في المعايير
                      المحاسبية الدولية (IAS 2) وفي معظم الدول، لكن غير مقبولة
                      في المعايير الأمريكية (GAAP) لأغراض الضريبة.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FIFO Tab */}
              <TabsContent value="fifo" className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                  <Label className="text-[11px]">
                    الكمية المراد تقييمها (للمبيعات):
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={totalQty}
                    className="h-9 text-xs w-[120px]"
                    value={fifoQty}
                    onChange={e =>
                      setFifoQty(Math.min(Number(e.target.value), totalQty))
                    }
                  />
                  <Badge className="bg-blue-100 text-blue-700">
                    FIFO: يُفترض بيع أقدم الوحدات أولاً
                  </Badge>
                </div>

                {fifoResult && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          الكمية المقيّمة
                        </p>
                        <p className="font-bold text-lg text-blue-600">
                          {formatNum(fifoQty)}
                        </p>
                      </Card>
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          إجمالي تكلفة المبيعات
                        </p>
                        <p className="font-bold text-lg text-red-600">
                          {formatNum(fifoResult.totalCost)} ر.ي
                        </p>
                      </Card>
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          التكلفة المتوسطة لل_unit
                        </p>
                        <p className="font-bold text-lg text-brand">
                          {formatCost(
                            fifoQty > 0 ? fifoResult.totalCost / fifoQty : 0
                          )}{" "}
                          ر.ي
                        </p>
                      </Card>
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          الوحدات المتبقية
                        </p>
                        <p className="font-bold text-lg text-green-600">
                          {formatNum(fifoResult.remainingQty)}
                        </p>
                      </Card>
                    </div>

                    <Card className="border-0 shadow-sm bg-white">
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm font-bold text-ink">
                          طبقات FIFO المستخدمة في التقييم
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50 text-[10px]">
                              <th className="text-right p-2">#</th>
                              <th className="text-right p-2">تاريخ الطبقة</th>
                              <th className="text-center p-2">المخزن</th>
                              <th className="text-center p-2">المأخوذ</th>
                              <th className="text-left p-2">تكلفة الوحدة</th>
                              <th className="text-left p-2">تكلفة الطبقة</th>
                              <th className="text-left p-2">
                                المتبقي في الطبقة
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {fifoResult.layers?.map((layer, i) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="p-2 text-right text-[10px]">
                                  {i + 1}
                                </td>
                                <td className="p-2 text-right text-[10px]">
                                  {new Date(layer.layerDate).toLocaleDateString(
                                    "ar-EG"
                                  )}
                                </td>
                                <td className="p-2 text-center text-[10px]">
                                  {(layer as any).warehouseCode ||
                                    (layer as any).warehouseId ||
                                    "-"}
                                </td>
                                <td className="p-2 text-center font-mono text-blue-600">
                                  {formatNum(layer.takenQty)}
                                </td>
                                <td className="p-2 text-left font-mono">
                                  {formatCost(layer.unitCost)}
                                </td>
                                <td className="p-2 text-left font-mono text-red-600">
                                  {formatNum(layer.layerCost)}
                                </td>
                                <td className="p-2 text-left font-mono">
                                  {formatNum(
                                    (layer.remainingQty || 0) - layer.takenQty
                                  )}
                                </td>
                              </tr>
                            ))}
                            {(!fifoResult.layers ||
                              fifoResult.layers.length === 0) && (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center text-gray-400 py-8"
                                >
                                  مخزون غير كافٍ لتغطية الكمية المطلوبة
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* LIFO Tab */}
              <TabsContent value="lifo" className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                  <Label className="text-[11px]">
                    الكمية المراد تقييمها (للمبيعات):
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={totalQty}
                    className="h-9 text-xs w-[120px]"
                    value={lifoQty}
                    onChange={e =>
                      setLifoQty(Math.min(Number(e.target.value), totalQty))
                    }
                  />
                  <Badge className="bg-amber-100 text-amber-700">
                    LIFO: يُفرض بيع أحدث الوحدات أولاً (غير مقبول في IFRS)
                  </Badge>
                </div>

                {lifoResult && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          الكمية المقيّمة
                        </p>
                        <p className="font-bold text-lg text-amber-600">
                          {formatNum(lifoQty)}
                        </p>
                      </Card>
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          إجمالي تكلفة المبيعات
                        </p>
                        <p className="font-bold text-lg text-red-600">
                          {formatNum(lifoResult.totalCost)} ر.ي
                        </p>
                      </Card>
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          التكلفة المتوسطة للunit
                        </p>
                        <p className="font-bold text-lg text-brand">
                          {formatCost(
                            lifoQty > 0 ? lifoResult.totalCost / lifoQty : 0
                          )}{" "}
                          ر.ي
                        </p>
                      </Card>
                      <Card className="border-0 shadow-sm bg-white p-3">
                        <p className="text-[10px] text-gray-500">
                          الوحدات المتبقية
                        </p>
                        <p className="font-bold text-lg text-green-600">
                          {formatNum(lifoResult.remainingQty)}
                        </p>
                      </Card>
                    </div>

                    <Card className="border-0 shadow-sm bg-white">
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm font-bold text-ink">
                          طبقات LIFO المستخدمة في التقييم
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50 text-[10px]">
                              <th className="text-right p-2">#</th>
                              <th className="text-right p-2">تاريخ الطبقة</th>
                              <th className="text-center p-2">المخزن</th>
                              <th className="text-center p-2">المأخوذ</th>
                              <th className="text-left p-2">تكلفة الوحدة</th>
                              <th className="text-left p-2">تكلفة الطبقة</th>
                              <th className="text-left p-2">
                                المتبقي في الطبقة
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {lifoResult.layers?.map((layer, i) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="p-2 text-right text-[10px]">
                                  {i + 1}
                                </td>
                                <td className="p-2 text-right text-[10px]">
                                  {new Date(layer.layerDate).toLocaleDateString(
                                    "ar-EG"
                                  )}
                                </td>
                                <td className="p-2 text-center text-[10px]">
                                  {(layer as any).warehouseCode ||
                                    (layer as any).warehouseId ||
                                    "-"}
                                </td>
                                <td className="p-2 text-center font-mono text-amber-600">
                                  {formatNum(layer.takenQty)}
                                </td>
                                <td className="p-2 text-left font-mono">
                                  {formatCost(layer.unitCost)}
                                </td>
                                <td className="p-2 text-left font-mono text-red-600">
                                  {formatNum(layer.layerCost)}
                                </td>
                                <td className="p-2 text-left font-mono">
                                  {formatNum(
                                    (layer.remainingQty || 0) - layer.takenQty
                                  )}
                                </td>
                              </tr>
                            ))}
                            {(!lifoResult.layers ||
                              lifoResult.layers.length === 0) && (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="text-center text-gray-400 py-8"
                                >
                                  مخزون غير كافٍ لتغطية الكمية المطلوبة
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
      <ProductPicker
        open={productPickerOpen}
        onOpenChange={setProductPickerOpen}
        typeFilter="goods"
        onSelect={product => {
          setPickedProduct(product);
          setSelectedProductId(product.id);
        }}
      />
    </div>
  );
}
