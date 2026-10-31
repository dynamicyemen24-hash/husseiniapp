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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Package,
  Calendar,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ProductPicker } from "@/components/ProductPicker";

const formatNum = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US").format(Math.round(Number(n || 0) * 100) / 100);

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

interface BatchItem {
  id: number;
  productId: number;
  warehouseId: number;
  batchNumber: string;
  lotNumber: string | null;
  serialNumber: string | null;
  manufacturingDate: Date | null;
  expiryDate: Date | null;
  quantity: number;
  reservedQty: number;
  unitCost: number;
  purchaseInvoiceId: number | null;
  productCode: string;
  productName: string;
  warehouseCode: string;
  warehouseName: string;
}

export function BatchTrackingPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 100 });
  const products = productsData?.items ?? [];
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickedProduct, setPickedProduct] = useState<ProductItem | null>(null);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [daysAhead, setDaysAhead] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");

  // Create batch dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({
    productId: "",
    warehouseId: "",
    batchNumber: "",
    lotNumber: "",
    serialNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    quantity: 1,
    unitCost: "0",
    purchaseInvoiceId: "",
    notes: "",
  });

  const {
    data: batches,
    isLoading,
    refetch,
  } = trpc.products.batchList.useQuery(
    {
      warehouseId: selectedWarehouseId || undefined,
      productId: selectedProductId || undefined,
      expiringSoon: showExpiringOnly,
      daysAhead: showExpiringOnly ? daysAhead : undefined,
    },
    { enabled: !!selectedWarehouseId }
  );

  const createBatch = trpc.products.batchCreate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الدفعة بنجاح");
      setShowCreateDialog(false);
      setBatchForm({
        productId: "",
        warehouseId: "",
        batchNumber: "",
        lotNumber: "",
        serialNumber: "",
        manufacturingDate: "",
        expiryDate: "",
        quantity: 1,
        unitCost: "0",
        purchaseInvoiceId: "",
        notes: "",
      });
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإنشاء"),
  });

  const totalBatches = useMemo(() => batches?.length || 0, [batches]);
  const totalQty = useMemo(
    () => batches?.reduce((s, b) => s + (b.quantity || 0), 0) || 0,
    [batches]
  );
  const totalAvailable = useMemo(
    () =>
      batches?.reduce(
        (s, b) => s + ((b.quantity || 0) - (b.reservedQty || 0)),
        0
      ) || 0,
    [batches]
  );
  const expiringSoonCount = useMemo(() => {
    if (!batches) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return batches.filter(
      b =>
        b.expiryDate &&
        new Date(b.expiryDate) <= cutoff &&
        new Date(b.expiryDate) >= new Date()
    ).length;
  }, [batches, daysAhead]);
  const expiredCount = useMemo(() => {
    if (!batches) return 0;
    return batches.filter(
      b => b.expiryDate && new Date(b.expiryDate) < new Date()
    ).length;
  }, [batches]);

  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    let result = batches;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        b =>
          b.batchNumber?.toLowerCase().includes(q) ||
          b.lotNumber?.toLowerCase().includes(q) ||
          b.serialNumber?.toLowerCase().includes(q) ||
          b.productCode?.toLowerCase().includes(q) ||
          b.productName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [batches, searchQuery]);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !batchForm.productId ||
      !batchForm.warehouseId ||
      !batchForm.batchNumber ||
      !batchForm.quantity
    ) {
      toast.error("املأ الحقول المطلوبة");
      return;
    }
    createBatch.mutate({
      productId: Number(batchForm.productId),
      warehouseId: Number(batchForm.warehouseId),
      batchNumber: batchForm.batchNumber,
      lotNumber: batchForm.lotNumber || undefined,
      serialNumber: batchForm.serialNumber || undefined,
      manufacturingDate: batchForm.manufacturingDate || undefined,
      expiryDate: batchForm.expiryDate || undefined,
      quantity: Number(batchForm.quantity),
      unitCost: batchForm.unitCost || undefined,
      purchaseInvoiceId: batchForm.purchaseInvoiceId
        ? Number(batchForm.purchaseInvoiceId)
        : undefined,
      notes: batchForm.notes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            تتبع الدفعات والأرقام التسلسلية
          </h2>
          <p className="text-xs text-muted-foreground">
            إدارة انتهاء الصلاحية، أرقام التشغيل، والأرقام التسلسلية
          </p>
        </div>
        <Button
          size="sm"
          className="press-effect shine-on-hover text-xs h-8"
          onClick={() => setShowCreateDialog(true)}
          disabled={!selectedWarehouseId}
        >
          <Plus className="w-3 h-3 ml-1" /> دفعة جديدة
        </Button>
      </div>

      {!selectedWarehouseId ? (
        <Card className="panel-premium border-0">
          <CardContent className="p-8 text-center">
            <div className="empty-state rounded-2xl border border-border bg-surface p-8">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                اختر مخزناً لعرض دفعاته
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
                إجمالي الدفعات
              </p>
              <p className="font-bold text-lg text-foreground">
                {totalBatches}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">إجمالي الكمية</p>
              <p className="font-bold text-lg text-foreground">
                {formatNum(totalQty)}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">متاح</p>
              <p className="font-bold text-lg text-success">
                {formatNum(totalAvailable)}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">تنتهي قريباً</p>
              <p
                className={`font-bold text-lg ${expiringSoonCount > 0 ? "text-warning" : "text-success"}`}
              >
                {expiringSoonCount}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">منتهية</p>
              <p
                className={`font-bold text-lg ${expiredCount > 0 ? "text-rose-600" : "text-success"}`}
              >
                {expiredCount}
              </p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 min-w-[200px] justify-between text-xs"
                onClick={() => setProductPickerOpen(true)}
              >
                {pickedProduct?.id === selectedProductId
                  ? `${pickedProduct.code} - ${pickedProduct.name}`
                  : products.find(p => p.id === selectedProductId)
                    ? `${products.find(p => p.id === selectedProductId)?.code} - ${products.find(p => p.id === selectedProductId)?.name}`
                    : "فلترة بالصنف"}
                <Search className="h-3.5 w-3.5" />
              </Button>
              {selectedProductId != null && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 text-xs"
                  onClick={() => {
                    setSelectedProductId(null);
                    setPickedProduct(null);
                  }}
                >
                  إلغاء التصفية
                </Button>
              )}
              <Select
                value={daysAhead.toString()}
                onValueChange={v => setDaysAhead(Number(v))}
              >
                <SelectTrigger className="h-9 text-xs w-[120px]">
                  <SelectValue placeholder="أيام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 أيام</SelectItem>
                  <SelectItem value="15">15 يوم</SelectItem>
                  <SelectItem value="30">30 يوم</SelectItem>
                  <SelectItem value="60">60 يوم</SelectItem>
                  <SelectItem value="90">90 يوم</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExpiringOnly}
                  onChange={e => setShowExpiringOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span>تنتهي خلال الفترة</span>
              </label>
            </div>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ابحث برقم الدفعة، التشغيل، أو التسلسلي..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 text-xs pr-10"
              />
            </div>
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
                        <th className="text-right p-2.5">رقم الدفعة</th>
                        <th className="text-right p-2.5">رقم التشغيل</th>
                        <th className="text-right p-2.5">الرقم التسلسلي</th>
                        <th className="text-right p-2.5">الصنف</th>
                        <th className="text-center p-2.5">الكمية</th>
                        <th className="text-center p-2.5">متاح</th>
                        <th className="text-center p-2.5">التكلفة</th>
                        <th className="text-center p-2.5">تاريخ الإنتاج</th>
                        <th className="text-center p-2.5">تاريخ الانتهاء</th>
                        <th className="text-center p-2.5">الحالة</th>
                        <th className="text-left p-2.5">فواتير الشراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBatches.map(batch => {
                        const available =
                          (batch.quantity || 0) - (batch.reservedQty || 0);
                        const isExpired =
                          batch.expiryDate &&
                          new Date(batch.expiryDate) < new Date();
                        const isExpiringSoon =
                          batch.expiryDate &&
                          new Date(batch.expiryDate) >= new Date() &&
                          new Date(batch.expiryDate) <=
                            new Date(
                              Date.now() + daysAhead * 24 * 60 * 60 * 1000
                            );
                        return (
                          <tr
                            key={batch.id}
                            className={`border-line hover:bg-muted/30 transition-colors ${isExpired ? "bg-rose-500/5" : isExpiringSoon ? "bg-warning/5" : "bg-surface"}`}
                          >
                            <td className="p-2.5 font-mono text-[10px] font-bold text-foreground">
                              {batch.batchNumber}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-foreground">
                              {batch.lotNumber || "-"}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-foreground">
                              {batch.serialNumber || "-"}
                            </td>
                            <td className="p-2.5">
                              <div className="font-medium text-[11px] text-foreground">
                                {batch.productName}
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                {batch.productCode}
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-mono text-foreground">
                              {formatNum(batch.quantity || 0)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-success font-bold">
                              {formatNum(available)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-brand font-bold">
                              {formatNum(batch.unitCost)}
                            </td>
                            <td className="p-2.5 text-center text-[10px] text-foreground">
                              {batch.manufacturingDate
                                ? format(
                                    new Date(batch.manufacturingDate),
                                    "yyyy/MM/dd"
                                  )
                                : "-"}
                            </td>
                            <td className="p-2.5 text-center text-[10px]">
                              {batch.expiryDate ? (
                                <span
                                  className={
                                    isExpired
                                      ? "text-rose-600 font-bold"
                                      : isExpiringSoon
                                        ? "text-warning font-bold"
                                        : "text-success"
                                  }
                                >
                                  {format(
                                    new Date(batch.expiryDate),
                                    "yyyy/MM/dd"
                                  )}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {isExpired ? (
                                <Badge className="chip bg-rose-500/15 text-rose-600">
                                  منتهية
                                </Badge>
                              ) : isExpiringSoon ? (
                                <Badge className="chip bg-warning/15 text-warning">
                                  قريبة الانتهاء
                                </Badge>
                              ) : available <= 0 ? (
                                <Badge className="chip bg-muted text-muted-foreground">
                                  منفذ
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700">
                                  صالحة
                                </Badge>
                              )}
                            </td>
                            <td className="p-2 text-left text-[10px] text-gray-500">
                              {batch.purchaseInvoiceId || "-"}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredBatches.length === 0 && (
                        <tr>
                          <td colSpan={11} className="text-center py-10">
                            <div className="empty-state flex flex-col items-center gap-2">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                              <p className="text-sm font-medium text-foreground">
                                لا توجد دفعات
                              </p>
                              <p className="text-xs text-muted-foreground">
                                لم يتم العثور على دفعات لهذا المخزن
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

      {/* Create Batch Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء دفعة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBatch} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">الصنف *</Label>
                <Select
                  value={batchForm.productId}
                  onValueChange={v =>
                    setBatchForm({ ...batchForm, productId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر صنفاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      ?.filter(p => p.type === "goods")
                      .map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.code} - {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">المخزن *</Label>
                <Select
                  value={batchForm.warehouseId}
                  onValueChange={v =>
                    setBatchForm({ ...batchForm, warehouseId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
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
              </div>
            </div>
            <div>
              <Label className="text-[11px]">رقم الدفعة *</Label>
              <Input
                className="h-9 text-xs"
                value={batchForm.batchNumber}
                onChange={e =>
                  setBatchForm({ ...batchForm, batchNumber: e.target.value })
                }
                placeholder="مثال: BATCH-2026-001"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">رقم التشغيل</Label>
                <Input
                  className="h-9 text-xs"
                  value={batchForm.lotNumber}
                  onChange={e =>
                    setBatchForm({ ...batchForm, lotNumber: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div>
                <Label className="text-[11px]">الرقم التسلسلي</Label>
                <Input
                  className="h-9 text-xs"
                  value={batchForm.serialNumber}
                  onChange={e =>
                    setBatchForm({ ...batchForm, serialNumber: e.target.value })
                  }
                  placeholder="للأرقام التسلسلية"
                />
              </div>
              <div>
                <Label className="text-[11px]">الكمية *</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-9 text-xs"
                  value={batchForm.quantity}
                  onChange={e =>
                    setBatchForm({
                      ...batchForm,
                      quantity: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">تاريخ الإنتاج</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={batchForm.manufacturingDate}
                  onChange={e =>
                    setBatchForm({
                      ...batchForm,
                      manufacturingDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-[11px]">تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={batchForm.expiryDate}
                  onChange={e =>
                    setBatchForm({ ...batchForm, expiryDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">تكلفة الوحدة</Label>
                <Input
                  type="number"
                  step="0.0001"
                  className="h-9 text-xs"
                  value={batchForm.unitCost}
                  onChange={e =>
                    setBatchForm({ ...batchForm, unitCost: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-[11px]">فاتورة الشراء</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={batchForm.purchaseInvoiceId}
                  onChange={e =>
                    setBatchForm({
                      ...batchForm,
                      purchaseInvoiceId: e.target.value,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">ملاحظات</Label>
              <Input
                className="h-9 text-xs"
                value={batchForm.notes}
                onChange={e =>
                  setBatchForm({ ...batchForm, notes: e.target.value })
                }
                placeholder="ملاحظات إضافية"
              />
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep"
                disabled={createBatch.isPending}
              >
                {createBatch.isPending ? "جاري الإنشاء..." : "إنشاء الدفعة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
