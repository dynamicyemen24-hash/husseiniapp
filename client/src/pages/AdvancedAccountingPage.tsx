import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  Calculator,
  Factory,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  DynamicsLayout,
  DynamicsStatusBadge,
} from "@/components/ui/dynamicsLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdvancedAccountingPage() {
  // State for CVP Calculator
  const [fixedCosts, setFixedCosts] = useState(50000);
  const [variableCost, setVariableCost] = useState(30);
  const [sellingPrice, setSellingPrice] = useState(80);
  const [targetProfit, setTargetProfit] = useState(10000);

  const cvpQuery = trpc.managerialAccounting.cvpAnalysis.useQuery({
    fixedCosts,
    variableCostPerUnit: variableCost,
    sellingPricePerUnit: sellingPrice,
    targetProfit,
  });

  // State for Partner form
  const [partnerName, setPartnerName] = useState("");
  const [capital, setCapital] = useState(100000);
  const [ownership, setOwnership] = useState(50);
  const [profitShare, setProfitShare] = useState(50);

  const partnersQuery = trpc.partnerAccounting.getPartners.useQuery();
  const equityQuery = trpc.partnerAccounting.equityStatement.useQuery();
  const createPartnerMutation =
    trpc.partnerAccounting.createPartner.useMutation({
      onSuccess: () => {
        toast.success("تم إضافة الشريك بنجاح بمعايير Dynamics");
        setPartnerName("");
        partnersQuery.refetch();
        equityQuery.refetch();
      },
      onError: err => {
        toast.error(err.message || "تعذر إضافة الشريك");
      },
    });

  // State for BOM / Production
  const [bomCode, setBomCode] = useState("BOM-001");
  const [bomName, setBomName] = useState("وصفة التصنيع القياسية");
  const [finishedProductId, setFinishedProductId] = useState<number | null>(
    null
  );
  const [materialProductId, setMaterialProductId] = useState<number | null>(
    null
  );
  const [materialQty, setMaterialQty] = useState(1);
  const [materialUnitCost, setMaterialUnitCost] = useState(0);
  const [outputQty, setOutputQty] = useState(1);

  const productsQuery = trpc.products.list.useQuery({ limit: 100 });
  const bomsQuery = trpc.productionAccounting.getBoms.useQuery({ limit: 50 });
  const productionOrdersQuery =
    trpc.productionAccounting.getProductionOrders.useQuery({
      limit: 50,
    });

  const createBomMutation = trpc.productionAccounting.createBom.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد قائمة المواد BOM بنجاح");
      bomsQuery.refetch();
    },
    onError: err => {
      toast.error(err.message || "تعذر إنشاء قائمة المواد");
    },
  });

  // انحراف التكاليف — أرقام حقيقية من حاسبة الخادم
  const [standardQty, setStandardQty] = useState(100);
  const [actualQty, setActualQty] = useState(110);
  const [standardPrice, setStandardPrice] = useState(10);
  const [actualPrice, setActualPrice] = useState(9);
  const varianceQuery = trpc.advancedCostAccounting.costVariance.useQuery({
    standardQty,
    actualQty,
    standardPrice,
    actualPrice,
  });

  return (
    <DynamicsLayout
      title="المحاسبة المتقدمة والتكاليف والإنتاج"
      subtitle="إدارة شركاء المؤسسة، المحاسبة الإدارية وتحليل التعادل، تكاليف الأنشطة (ABC)، وتكاليف أوامر التصنيع"
      onRefresh={() => {
        partnersQuery.refetch();
        equityQuery.refetch();
        bomsQuery.refetch();
        productionOrdersQuery.refetch();
        toast.success("تم تحديث كافة البيانات بنجاح");
      }}
      actions={[
        {
          label: "جديد",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {},
        },
        {
          label: "تحديث البيانات",
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => partnersQuery.refetch(),
          variant: "secondary",
        },
      ]}
      kpiStrip={
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-background p-4 rounded-lg border shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              إجمالي رأس المال
            </p>
            <p className="text-2xl font-bold text-primary mt-1">
              {equityQuery.data?.totalCapital?.toLocaleString() ?? 0} ر.س
            </p>
          </div>
          <div className="bg-background p-4 rounded-lg border shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              عدد الشركاء النشطين
            </p>
            <p className="text-2xl font-bold mt-1">
              {equityQuery.data?.partnersCount ?? 0} شريك
            </p>
          </div>
          <div className="bg-background p-4 rounded-lg border shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              قوائم المواد النشطة (BOM)
            </p>
            <p className="text-2xl font-bold mt-1">
              {bomsQuery.data?.total ?? 0} وصفة
            </p>
          </div>
          <div className="bg-background p-4 rounded-lg border shadow-sm">
            <p className="text-xs text-muted-foreground font-medium">
              أوامر الإنتاج
            </p>
            <p className="text-2xl font-bold mt-1">
              {productionOrdersQuery.data?.total ?? 0} أمر
            </p>
          </div>
        </div>
      }
    >
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full bg-muted p-1 rounded-lg">
          <TabsTrigger
            value="partners"
            className="flex items-center gap-2 font-semibold"
          >
            <Users className="h-4 w-4" /> محاسبة الشركاء
          </TabsTrigger>
          <TabsTrigger
            value="managerial"
            className="flex items-center gap-2 font-semibold"
          >
            <TrendingUp className="h-4 w-4" /> المحاسبة الإدارية CVP
          </TabsTrigger>
          <TabsTrigger
            value="cost"
            className="flex items-center gap-2 font-semibold"
          >
            <Calculator className="h-4 w-4" /> التكاليف المتقدمة ABC
          </TabsTrigger>
          <TabsTrigger
            value="production"
            className="flex items-center gap-2 font-semibold"
          >
            <Factory className="h-4 w-4" /> محاسبة التصنيع والتشغيل
          </TabsTrigger>
        </TabsList>

        {/* 1. Partners Accounting */}
        <TabsContent value="partners" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">إضافة شريك جديد</CardTitle>
                <CardDescription>
                  تسجيل بيانات الشريك وحصص رأس المال
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold">اسم الشريك</label>
                  <Input
                    placeholder="الاسم الكامل"
                    value={partnerName}
                    onChange={e => setPartnerName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      رأس المال (ر.س)
                    </label>
                    <Input
                      type="number"
                      value={capital}
                      onChange={e => setCapital(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">الملكية %</label>
                    <Input
                      type="number"
                      value={ownership}
                      onChange={e => setOwnership(Number(e.target.value))}
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() =>
                    createPartnerMutation.mutate({
                      name: partnerName,
                      capitalAmount: capital,
                      ownershipPercent: ownership,
                      profitSharePercent: profitShare,
                    })
                  }
                  disabled={!partnerName}
                >
                  <Plus className="h-4 w-4 ml-1.5" /> حفظ وشحن الشريك
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">سجل شركاء المؤسسة</CardTitle>
                <CardDescription>
                  جدول تفصيلي لحصص رأس المال ونسب الأرباح
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">اسم الشريك</TableHead>
                      <TableHead className="font-bold">
                        رأس المال (ر.س)
                      </TableHead>
                      <TableHead className="font-bold">نسبة الملكية</TableHead>
                      <TableHead className="font-bold">نسبة الأرباح</TableHead>
                      <TableHead className="font-bold">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnersQuery.data?.map((p: any) => (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold">
                          {p.name}
                        </TableCell>
                        <TableCell className="font-mono">
                          {Number(p.capitalAmount).toLocaleString()}
                        </TableCell>
                        <TableCell>{p.ownershipPercent}%</TableCell>
                        <TableCell>{p.profitSharePercent}%</TableCell>
                        <TableCell>
                          <DynamicsStatusBadge status="posted" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!partnersQuery.data ||
                      partnersQuery.data.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          لا توجد بيانات شركاء مسجلة حالياً
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Managerial Accounting & CVP */}
        <TabsContent value="managerial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  حاسبة تحليل التعادل (CVP Analysis)
                </CardTitle>
                <CardDescription>
                  أدوات المحاسبة الإدارية لتسعير المنتجات ودراسة الجدوى
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    التكاليف الثابتة الإجمالية (ر.س)
                  </label>
                  <Input
                    type="number"
                    value={fixedCosts}
                    onChange={e => setFixedCosts(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    التكلفة المتغيرة للوحدة الواحدة (ر.س)
                  </label>
                  <Input
                    type="number"
                    value={variableCost}
                    onChange={e => setVariableCost(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    سعر بيع الوحدة المقترح (ر.س)
                  </label>
                  <Input
                    type="number"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    صافي الربح المستهدف (ر.س)
                  </label>
                  <Input
                    type="number"
                    value={targetProfit}
                    onChange={e => setTargetProfit(Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-card">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  نتائج التحليل الإداري الاستراتيجي
                </CardTitle>
                <CardDescription>
                  مؤشرات فورية لدعم اتخاذ القرار
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {cvpQuery.data && (
                  <div className="space-y-5">
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        هامش المساهمة للوحدة:
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {cvpQuery.data.contributionMarginPerUnit} ر.س (
                        {cvpQuery.data.contributionMarginRatio}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        حجم التعادل (وحدات مبيعات):
                      </span>
                      <span className="text-lg font-bold font-mono">
                        {cvpQuery.data.breakEvenUnits.toLocaleString()} وحدة
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        قيمة الإيراد عند نقطة التعادل:
                      </span>
                      <span className="text-lg font-bold font-mono">
                        {cvpQuery.data.breakEvenRevenue.toLocaleString()} ر.س
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        المبيعات اللازمة لتحقيق الربح المستهدف:
                      </span>
                      <span className="text-lg font-bold text-emerald-600 font-mono">
                        {cvpQuery.data.targetUnits.toLocaleString()} وحدة (
                        {cvpQuery.data.targetRevenue.toLocaleString()} ر.س)
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Advanced Cost Accounting */}
        <TabsContent value="cost" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  حاسبة انحراف المواد المعياري
                </CardTitle>
                <CardDescription>
                  أدخل الكمية والتكلفة المعيارية والفعلية — الحسابات من الخادم
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      الكمية المعيارية
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={standardQty}
                      onChange={e => setStandardQty(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      الكمية الفعلية
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={actualQty}
                      onChange={e => setActualQty(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      السعر المعياري
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={standardPrice}
                      onChange={e => setStandardPrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      السعر الفعلي
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={actualPrice}
                      onChange={e => setActualPrice(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-card">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">نتيجة الانحراف</CardTitle>
                <CardDescription>
                  تفصيل انحراف السعر وانحراف الكفاءة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {varianceQuery.data ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        انحراف سعر المواد:
                      </span>
                      <span className="text-lg font-bold font-mono">
                        {varianceQuery.data.materialPriceVariance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        انحراف الكفاءة (الاستهلاك):
                      </span>
                      <span className="text-lg font-bold font-mono">
                        {varianceQuery.data.materialUsageVariance.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        إجمالي انحراف التكلفة:
                      </span>
                      <span className="text-lg font-bold font-mono text-primary">
                        {varianceQuery.data.totalCostVariance.toLocaleString()}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        varianceQuery.data.favorable
                          ? "bg-emerald-500/10 text-emerald-700 font-semibold"
                          : "bg-amber-500/10 text-amber-700 font-semibold"
                      }
                    >
                      {varianceQuery.data.favorable
                        ? "انحراف في مصلحة المؤسسة"
                        : "انحراف في غير مصلحة المؤسسة"}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    أدخل الكميات والتكاليف لعرض النتيجة.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. Production Accounting */}
        <TabsContent value="production" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  إضافة قائمة مواد (BOM)
                </CardTitle>
                <CardDescription>
                  تعريف وصفة ومكونات أمر التصنيع
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold">رمز القائمة</label>
                  <Input
                    placeholder="BOM-001"
                    value={bomCode}
                    onChange={e => setBomCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    اسم الوصفة أو المنتج
                  </label>
                  <Input
                    placeholder="اسم المنتج التام"
                    value={bomName}
                    onChange={e => setBomName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    المنتج النهائي
                  </label>
                  <Select
                    value={finishedProductId?.toString() ?? ""}
                    onValueChange={v => setFinishedProductId(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر المنتج النهائي" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsQuery.data?.items.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">كمية المخرجات</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.0001"
                    value={outputQty}
                    onChange={e => setOutputQty(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">
                    الخامة الأساسية
                  </label>
                  <Select
                    value={materialProductId?.toString() ?? ""}
                    onValueChange={v => {
                      const id = Number(v);
                      setMaterialProductId(id);
                      const product = productsQuery.data?.items.find(
                        p => p.id === id
                      );
                      if (product) {
                        setMaterialUnitCost(Number(product.purchasePrice ?? 0));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر الخامة" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsQuery.data?.items.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">الكمية</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.0001"
                      value={materialQty}
                      onChange={e => setMaterialQty(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">
                      تكلفة الوحدة
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={materialUnitCost}
                      onChange={e =>
                        setMaterialUnitCost(Number(e.target.value))
                      }
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    if (!finishedProductId) {
                      toast.error("اختر المنتج النهائي أولاً");
                      return;
                    }
                    if (!materialProductId) {
                      toast.error("اختر الخامة الأساسية أولاً");
                      return;
                    }
                    createBomMutation.mutate({
                      code: bomCode,
                      name: bomName,
                      productId: finishedProductId,
                      outputQty,
                      items: [
                        {
                          productId: materialProductId,
                          quantity: materialQty,
                          unitCost: materialUnitCost,
                        },
                      ],
                    });
                  }}
                  disabled={!finishedProductId || !materialProductId}
                >
                  <Plus className="w-4 h-4 ml-1.5" /> اعتماد قائمة المواد
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-base">
                  قوائم المواد والوصفات الإنتاجية المعتمدة
                </CardTitle>
                <CardDescription>سجل وصفات التصنيع ومكوناتها</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">رمز الوصفة</TableHead>
                      <TableHead className="font-bold">
                        اسم المنتج / الوصفة
                      </TableHead>
                      <TableHead className="font-bold">كمية المخرجات</TableHead>
                      <TableHead className="font-bold">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomsQuery.data?.rows.map((b: any) => (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono font-semibold">
                          {b.code}
                        </TableCell>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{b.outputQty}</TableCell>
                        <TableCell>
                          <DynamicsStatusBadge status="posted" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!bomsQuery.data || bomsQuery.data.rows.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-8"
                        >
                          لا توجد قوائم مواد مسجلة حالياً
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DynamicsLayout>
  );
}
