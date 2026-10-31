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
  Lock,
  Unlock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProductPicker } from "@/components/ProductPicker";
import { useDebounce } from "@/hooks/useDebounce";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n * 100) / 100);

const statusLabels: Record<string, string> = {
  active: "نشط",
  fulfilled: "مُنفذ",
  released: "مُحرر",
  expired: "منتهي",
};

const statusColors: Record<string, string> = {
  active: "chip bg-info/15 text-info",
  fulfilled: "chip bg-success/15 text-success",
  released: "chip bg-muted text-muted-foreground",
  expired: "chip bg-rose-500/15 text-rose-600",
};

const sourceLabels: Record<string, string> = {
  sales_order: "طلب مبيعات",
  purchase_order: "طلب مشتريات",
  production_order: "أمر إنتاج",
  transfer_order: "أمر تحويل",
  manual: "يدوي",
};

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

interface CustomerItem {
  id: number;
  code: string;
  name: string;
}

interface ReservationItem {
  id: number;
  productId: number;
  warehouseId: number | null;
  batchId: number | null;
  quantity: number;
  status: string;
  source: string;
  sourceId: number | null;
  sourceType: string | null;
  customerId: number | null;
  expiresAt: Date | null;
  notes: string | null;
  createdAt: Date;
  productCode: string;
  productName: string;
  warehouseCode: string | null;
  warehouseName: string | null;
  batchNumber: string | null;
}

export function StockReservationsPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: productsData } = trpc.products.list.useQuery({ limit: 100 });
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch, 250);
  const { data: customersData } = trpc.customers.list.useQuery({
    limit: 100,
    search: debouncedCustomerSearch || undefined,
  });

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const [productPickerTarget, setProductPickerTarget] = useState<
    "filter" | "form" | null
  >(null);
  const [pickedProduct, setPickedProduct] = useState<ProductItem | null>(null);
  const displayedProduct = (id: number | null) =>
    pickedProduct?.id === id
      ? pickedProduct
      : (products.find(product => product.id === id) ?? null);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(
    null
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create reservation dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    productId: "",
    warehouseId: "",
    batchId: "",
    quantity: 1,
    source: "manual",
    sourceId: "",
    sourceType: "",
    customerId: "",
    expiresAt: "",
    notes: "",
  });

  const {
    data: reservations,
    isLoading,
    refetch,
  } = trpc.products.reservationList.useQuery(
    {
      warehouseId: selectedWarehouseId || undefined,
      productId: selectedProductId || undefined,
      status: selectedStatus || undefined,
    },
    { enabled: !!selectedWarehouseId }
  );

  const createReservation = trpc.products.reservationCreate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحجز بنجاح");
      setShowCreateDialog(false);
      setReservationForm({
        productId: "",
        warehouseId: "",
        batchId: "",
        quantity: 1,
        source: "manual",
        sourceId: "",
        sourceType: "",
        customerId: "",
        expiresAt: "",
        notes: "",
      });
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإنشاء"),
  });

  const releaseReservation = trpc.products.reservationRelease.useMutation({
    onSuccess: () => {
      toast.success("تم تحرير الحجز");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل التحرير"),
  });

  const fulfillReservation = trpc.products.reservationFulfill.useMutation({
    onSuccess: () => {
      toast.success("تم تنفيذ الحجز");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message || "فشل التنفيذ"),
  });

  const totalReservations = useMemo(
    () => reservations?.length || 0,
    [reservations]
  );
  const activeCount = useMemo(
    () => reservations?.filter(r => r.status === "active").length || 0,
    [reservations]
  );
  const totalQty = useMemo(
    () => reservations?.reduce((s, r) => s + (r.quantity || 0), 0) || 0,
    [reservations]
  );
  const fulfilledCount = useMemo(
    () => reservations?.filter(r => r.status === "fulfilled").length || 0,
    [reservations]
  );

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    let result = reservations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        r =>
          r.productCode?.toLowerCase().includes(q) ||
          r.productName?.toLowerCase().includes(q) ||
          r.batchNumber?.toLowerCase().includes(q) ||
          String(r.sourceId || "").includes(q)
      );
    }
    return result;
  }, [reservations, searchQuery]);

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reservationForm.productId ||
      !reservationForm.warehouseId ||
      !reservationForm.quantity
    ) {
      toast.error("املأ الحقول المطلوبة");
      return;
    }
    createReservation.mutate({
      productId: Number(reservationForm.productId),
      warehouseId: Number(reservationForm.warehouseId) || undefined,
      batchId: reservationForm.batchId
        ? Number(reservationForm.batchId)
        : undefined,
      quantity: Number(reservationForm.quantity),
      source: reservationForm.source as any,
      sourceId: reservationForm.sourceId
        ? Number(reservationForm.sourceId)
        : undefined,
      sourceType: reservationForm.sourceType || undefined,
      customerId: reservationForm.customerId
        ? Number(reservationForm.customerId)
        : undefined,
      expiresAt: reservationForm.expiresAt || undefined,
      notes: reservationForm.notes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">حجوزات المخزون</h2>
          <p className="text-xs text-muted-foreground">
            إدارة الحجوزات والتخصيصات لأوامر المبيعات والإنتاج
          </p>
        </div>
        <Button
          size="sm"
          className="press-effect shine-on-hover text-xs h-8"
          onClick={() => setShowCreateDialog(true)}
          disabled={!selectedWarehouseId}
        >
          <Plus className="w-3 h-3 ml-1" /> حجز جديد
        </Button>
      </div>

      {!selectedWarehouseId ? (
        <Card className="panel-premium border-0">
          <CardContent className="p-8 text-center">
            <div className="empty-state rounded-2xl border border-border bg-surface p-8">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                اختر مخزناً لعرض حجوزاته
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                قم باختيار مخزن من القائمة أعلاه
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">
                إجمالي الحجوزات
              </p>
              <p className="font-bold text-lg text-foreground">
                {totalReservations}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">نشطة</p>
              <p className="font-bold text-lg text-info">{activeCount}</p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">إجمالي الكمية</p>
              <p className="font-bold text-lg text-foreground">
                {formatNum(totalQty)}
              </p>
            </Card>
            <Card className="panel-premium border-0 p-3">
              <p className="text-[10px] text-muted-foreground">منفذة</p>
              <p className="font-bold text-lg text-success">{fulfilledCount}</p>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-w-[180px] justify-between text-xs"
                  onClick={() => setProductPickerTarget("filter")}
                >
                  {displayedProduct(selectedProductId)
                    ? `${displayedProduct(selectedProductId)?.code} - ${displayedProduct(selectedProductId)?.name}`
                    : "كل الأصناف"}
                  <Search className="h-3.5 w-3.5" />
                </Button>
                {selectedProductId != null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs"
                    onClick={() => setSelectedProductId(null)}
                  >
                    مسح
                  </Button>
                )}
              </div>
              <Select
                value={selectedStatus}
                onValueChange={v => setSelectedStatus(v)}
              >
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="fulfilled">منفذ</SelectItem>
                  <SelectItem value="released">محرر</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ابحث بالمنتج، رقم المصدر، أو الدفعة..."
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
                        <th className="text-right p-2.5">المصدر</th>
                        <th className="text-right p-2.5">رقم المصدر</th>
                        <th className="text-right p-2.5">الصنف</th>
                        <th className="text-right p-2.5">الدفعة</th>
                        <th className="text-center p-2.5">الكمية</th>
                        <th className="text-center p-2.5">الحالة</th>
                        <th className="text-center p-2.5">العميل</th>
                        <th className="text-center p-2.5">تاريخ الانتهاء</th>
                        <th className="text-left p-2.5">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.map(res => {
                        const isExpired =
                          res.expiresAt && new Date(res.expiresAt) < new Date();
                        const isActive = res.status === "active";
                        return (
                          <tr
                            key={res.id}
                            className={`border-line hover:bg-muted/30 transition-colors ${isExpired && isActive ? "bg-rose-500/5" : "bg-surface"}`}
                          >
                            <td className="p-2.5">
                              <Badge variant="outline" className="chip">
                                {sourceLabels[res.source] || res.source}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-foreground">
                              {res.sourceId || "-"}
                            </td>
                            <td className="p-2.5">
                              <div className="font-medium text-[11px] text-foreground">
                                {res.productName}
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                {res.productCode}
                              </div>
                            </td>
                            <td className="p-2.5 text-[10px] text-foreground">
                              {res.batchNumber || "-"}
                            </td>
                            <td className="p-2.5 text-center font-mono text-foreground">
                              {formatNum(res.quantity || 0)}
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge
                                className={
                                  statusColors[res.status] ||
                                  "chip bg-muted text-muted-foreground"
                                }
                                variant="outline"
                              >
                                {statusLabels[res.status] || res.status}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-center text-[10px] text-foreground">
                              {res.customerId ? `عميل #${res.customerId}` : "-"}
                            </td>
                            <td className="p-2.5 text-center text-[10px]">
                              {res.expiresAt ? (
                                <span
                                  className={
                                    isExpired
                                      ? "text-rose-600 font-bold"
                                      : "text-foreground"
                                  }
                                >
                                  {new Date(res.expiresAt).toLocaleDateString(
                                    "ar-EG"
                                  )}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="p-2.5 text-left flex items-center gap-1">
                              {isActive && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6 text-[10px] text-green-600 hover:bg-green-50"
                                    onClick={() =>
                                      fulfillReservation.mutate({ id: res.id })
                                    }
                                    disabled={fulfillReservation.isPending}
                                    title="تنفيذ الحجز"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6 text-[10px] text-amber-600 hover:bg-amber-50"
                                    onClick={() =>
                                      releaseReservation.mutate({
                                        id: res.id,
                                        reason: "تحرير يدوي",
                                      })
                                    }
                                    disabled={releaseReservation.isPending}
                                    title="تحرير الحجز"
                                  >
                                    <Unlock className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredReservations.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-10">
                            <div className="empty-state flex flex-col items-center gap-2">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                              <p className="text-sm font-medium text-foreground">
                                لا توجد حجوزات
                              </p>
                              <p className="text-xs text-muted-foreground">
                                لم يتم العثور على حجوزات لهذا المخزن
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

      {/* Create Reservation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء حجز مخزون جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateReservation} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">الصنف *</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full justify-between text-xs"
                  onClick={() => setProductPickerTarget("form")}
                >
                  {displayedProduct(Number(reservationForm.productId))
                    ? `${displayedProduct(Number(reservationForm.productId))?.code} - ${displayedProduct(Number(reservationForm.productId))?.name}`
                    : "اختر صنفاً"}
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div>
                <Label className="text-[11px]">المخزن</Label>
                <Select
                  value={reservationForm.warehouseId}
                  onValueChange={v =>
                    setReservationForm({ ...reservationForm, warehouseId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر مخزناً (اختياري)" />
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
              <Label className="text-[11px]">مصدر الحجز *</Label>
              <Select
                value={reservationForm.source}
                onValueChange={v =>
                  setReservationForm({ ...reservationForm, source: v })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر المصدر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales_order">طلب مبيعات</SelectItem>
                  <SelectItem value="purchase_order">طلب مشتريات</SelectItem>
                  <SelectItem value="production_order">أمر إنتاج</SelectItem>
                  <SelectItem value="transfer_order">أمر تحويل</SelectItem>
                  <SelectItem value="manual">يدوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">رقم المصدر</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={reservationForm.sourceId}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      sourceId: e.target.value,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div>
                <Label className="text-[11px]">الكمية *</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-9 text-xs"
                  value={reservationForm.quantity}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      quantity: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-[11px]">الدفعة</Label>
                <Input
                  type="number"
                  className="h-9 text-xs"
                  value={reservationForm.batchId}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      batchId: e.target.value,
                    })
                  }
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">العميل</Label>
                <Input
                  value={customerSearch}
                  onChange={event => setCustomerSearch(event.target.value)}
                  placeholder="ابحث عن عميل بالاسم أو الرمز أو الهاتف"
                  className="mb-1 h-8 text-xs"
                />
                <Select
                  value={reservationForm.customerId}
                  onValueChange={v =>
                    setReservationForm({ ...reservationForm, customerId: v })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="اختر عميلاً (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={reservationForm.expiresAt}
                  onChange={e =>
                    setReservationForm({
                      ...reservationForm,
                      expiresAt: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">ملاحظات</Label>
              <Input
                className="h-9 text-xs"
                value={reservationForm.notes}
                onChange={e =>
                  setReservationForm({
                    ...reservationForm,
                    notes: e.target.value,
                  })
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
                disabled={createReservation.isPending}
              >
                {createReservation.isPending
                  ? "جاري الإنشاء..."
                  : "إنشاء الحجز"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ProductPicker
        open={productPickerTarget !== null}
        onOpenChange={open => {
          if (!open) setProductPickerTarget(null);
        }}
        typeFilter="goods"
        onSelect={product => {
          setPickedProduct(product);
          if (productPickerTarget === "filter") {
            setSelectedProductId(product.id);
          } else {
            setReservationForm(form => ({
              ...form,
              productId: String(product.id),
            }));
          }
          setProductPickerTarget(null);
        }}
      />
    </div>
  );
}
