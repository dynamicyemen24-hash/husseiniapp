import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { ProductPicker } from "@/components/ProductPicker";
import {
  ProcurementDocumentTools,
  downloadPurchaseReport,
} from "@/components/ProcurementDocumentTools";
import { CommunicationShare } from "@/components/CommunicationShare";
import { toast } from "sonner";
import {
  Truck,
  Building2,
  FileText,
  Plus,
  Search,
  Package,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  ArrowLeft,
  Download,
  Star,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  confirmed: "معتمدة",
  paid: "مدفوعة",
  partial: "مدفوعة جزئياً",
  cancelled: "ملغاة",
};
const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  confirmed: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const fmt = (v?: string | number) => {
  const n = parseFloat(v == null ? "0" : String(v));
  return (isNaN(n) ? 0 : n).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("ar-EG") : "—";

export default function Procurement() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const purchasesQ = trpc.purchases.list.useQuery({ limit: 100 });
  const suppliersQ = trpc.suppliers.list.useQuery({ limit: 100 });
  const purchases = (purchasesQ.data?.items ?? []) as any[];
  const suppliers = (suppliersQ.data?.items ?? []) as any[];

  const live = purchases.filter(p => p.status !== "cancelled");
  const totalPurchases = live.reduce(
    (s, p) => s + parseFloat(p.total || "0"),
    0
  );
  const outstanding = live
    .filter(p => p.status !== "paid")
    .reduce(
      (s, p) =>
        s + (parseFloat(p.total || "0") - parseFloat(p.paidAmount || "0")),
      0
    );
  const draftCount = purchases.filter(p => p.status === "draft").length;
  const topSuppliers = [...suppliers]
    .sort((a, b) => parseFloat(b.balance || "0") - parseFloat(a.balance || "0"))
    .slice(0, 5);
  const supplierName = (id?: number | null) =>
    suppliers.find(s => s.id === id)?.name ?? "بدون مورد";

  return (
    <div className="min-h-screen bg-background text-foreground font-display">
      <div className="brand-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => setLocation("/app")}
            className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة للوحة التحكم
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand text-ink-deep flex items-center justify-center font-bold shadow-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display">
                مساحة المشتريات
              </h1>
              <p className="text-xs text-white/70 mt-0.5">
                إدارة الموردين، فواتير الشراء، والالتزامات المستحقة — مع ربط
                محاسبي وجرد تلقائي.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="overview">
          <TabsList className="bg-muted p-1 rounded-xl flex gap-1 w-full sm:w-auto">
            <TabsTrigger value="overview" className="text-xs">
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs">
              الموردون
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs">
              فواتير الشراء
            </TabsTrigger>
          </TabsList>

          {/* ───────── Overview ───────── */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="إجمالي المشتريات"
                value={`${fmt(totalPurchases)} ر.ي`}
                tone="info"
                icon={TrendingUp}
                hint="قيمة الفواتير الفعّالة"
              />
              <StatCard
                label="التزامات مستحقة"
                value={`${fmt(outstanding)} ر.ي`}
                tone="warning"
                icon={Wallet}
                hint="صافي ما لم يُسدَد بعد"
              />
              <StatCard
                label="فواتير مسودة"
                value={draftCount}
                tone="neutral"
                icon={FileText}
                hint="بانتظار الاعتماد أو الدفع"
              />
              <StatCard
                label="الموردون النشطون"
                value={suppliers.length}
                tone="positive"
                icon={Building2}
                hint="سجلّوا في النظام"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="surface rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">
                    أحدث فواتير الشراء
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">الرقم</TableHead>
                        <TableHead className="text-[11px]">المورد</TableHead>
                        <TableHead className="text-[11px]">الإجمالي</TableHead>
                        <TableHead className="text-[11px]">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.slice(0, 6).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-[11px] font-mono">
                            {p.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-[11px]">
                            {supplierName(p.supplierId)}
                          </TableCell>
                          <TableCell className="text-[11px] dir-ltr">
                            {fmt(p.total)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                STATUS_TONE[p.status] ?? ""
                              }`}
                            >
                              {STATUS_LABEL[p.status] ?? p.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {purchases.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-xs text-muted-foreground py-6"
                          >
                            لا توجد فواتير شراء بعد.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="surface rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">
                    أعلى الموردين التزاماً (أرصدة مستحقة)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px]">المورد</TableHead>
                        <TableHead className="text-[11px]">الكود</TableHead>
                        <TableHead className="text-[11px]">
                          الرصيد المستحق
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSuppliers.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="text-[11px] font-medium">
                            {s.name}
                          </TableCell>
                          <TableCell className="text-[11px] font-mono text-muted-foreground">
                            {s.code}
                          </TableCell>
                          <TableCell
                            className={`text-[11px] dir-ltr font-bold ${
                              parseFloat(s.balance || "0") > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {fmt(s.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {topSuppliers.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-xs text-muted-foreground py-6"
                          >
                            لا يوجد موردون بعد.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───────── Suppliers ───────── */}
          <TabsContent value="suppliers" className="space-y-4 mt-4">
            <SuppliersPanel suppliers={suppliers} utils={utils} />
          </TabsContent>

          {/* ───────── Purchase Invoices ───────── */}
          <TabsContent value="invoices" className="space-y-4 mt-4">
            <InvoicesPanel
              purchases={purchases}
              suppliers={suppliers}
              utils={utils}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ───────────────────────── Suppliers ───────────────────────── */
function SuppliersPanel({
  suppliers,
  utils,
}: {
  suppliers: any[];
  utils: any;
}) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    taxNumber: "",
    notes: "",
  });

  const listQ = trpc.suppliers.list.useQuery({
    limit: 100,
    search: search || undefined,
  });
  const items = (listQ.data?.items ?? suppliers) as any[];

  const createM = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("تم إضافة المورد");
      setDialogOpen(false);
      setForm({
        code: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        taxNumber: "",
        notes: "",
      });
    },
    onError: (e: any) => toast.error(e.message || "تعذّر الإضافة"),
  });
  const updateM = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("تم تحديث المورد");
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.message || "تعذّر التحديث"),
  });

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      code: s.code,
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      city: s.city || "",
      taxNumber: s.taxNumber || "",
      notes: s.notes || "",
    });
  };

  return (
    <Card className="surface rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو الهاتف..."
              className="h-9 text-xs pr-8"
            />
          </div>
          <Button
            onClick={() => {
              setEditId(null);
              setForm({
                code: "",
                name: "",
                phone: "",
                email: "",
                address: "",
                city: "",
                taxNumber: "",
                notes: "",
              });
              setDialogOpen(true);
            }}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
          >
            <Plus className="w-4 h-4" /> مورد جديد
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">الكود</TableHead>
                <TableHead className="text-[11px]">الاسم</TableHead>
                <TableHead className="text-[11px]">الهاتف</TableHead>
                <TableHead className="text-[11px]">الرصيد المستحق</TableHead>
                <TableHead className="text-[11px] text-left">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-[11px] font-mono text-muted-foreground">
                    {s.code}
                  </TableCell>
                  <TableCell className="text-[11px] font-medium">
                    {s.name}
                  </TableCell>
                  <TableCell className="text-[11px] dir-ltr">
                    {s.phone || "—"}
                  </TableCell>
                  <TableCell
                    className={`text-[11px] dir-ltr font-bold ${
                      parseFloat(s.balance || "0") > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {fmt(s.balance)}
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => openEdit(s)}
                    >
                      تعديل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-xs text-muted-foreground py-6"
                  >
                    لا يوجد موردون مطابقون.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={dialogOpen || editId !== null}
        onOpenChange={o => {
          if (!o) {
            setDialogOpen(false);
            setEditId(null);
          }
        }}
      >
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              {editId !== null ? "تعديل مورد" : "مورد جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تُحدَّث الأرصدة تلقائياً عند إنشاء فواتير الشراء.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">كود المورد</Label>
                <Input
                  value={form.code}
                  disabled={editId !== null}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="SUP-01"
                />
              </div>
              <div>
                <Label className="text-[10px]">الاسم</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="اسم المورد"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                  placeholder="770000000"
                />
              </div>
              <div>
                <Label className="text-[10px]">البريد</Label>
                <Input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="h-9 text-xs dir-ltr"
                  placeholder="name@supplier.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">المدينة</Label>
                <Input
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="صنعاء"
                />
              </div>
              <div>
                <Label className="text-[10px]">الرقم الضريبي</Label>
                <Input
                  value={form.taxNumber}
                  onChange={e =>
                    setForm({ ...form, taxNumber: e.target.value })
                  }
                  className="h-9 text-xs dir-ltr"
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">العنوان</Label>
              <Input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="h-9 text-xs"
                placeholder="العنوان التفصيلي"
              />
            </div>
            <div>
              <Label className="text-[10px]">ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="text-xs min-h-[60px]"
                placeholder="أي تفاصيل إضافية"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-xs h-9"
              onClick={() => {
                setDialogOpen(false);
                setEditId(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              disabled={!form.name || createM.isPending || updateM.isPending}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
              onClick={() => {
                if (editId !== null) {
                  updateM.mutate({
                    id: editId,
                    name: form.name,
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                  });
                } else {
                  createM.mutate({
                    code: form.code || `SUP-${Date.now().toString().slice(-5)}`,
                    name: form.name,
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                    address: form.address || undefined,
                    city: form.city || undefined,
                    taxNumber: form.taxNumber || undefined,
                    notes: form.notes || undefined,
                  });
                }
              }}
            >
              {editId !== null ? "حفظ التعديلات" : "إضافة المورد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────────────────── Purchase Invoices ───────────────────── */
interface LineItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  discount: string;
}

function InvoicesPanel({
  purchases,
  suppliers,
  utils,
}: {
  purchases: any[];
  suppliers: any[];
  utils: any;
}) {
  const supplierName = (id?: number | null) =>
    suppliers.find(s => s.id === id)?.name ?? "بدون مورد";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [supplierId, setSupplierId] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paidAmount, setPaidAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sourceRequisitionId, setSourceRequisitionId] = useState("");
  const [sourceGrnId, setSourceGrnId] = useState("");
  const [sourcePoId, setSourcePoId] = useState<number | null>(null);
  const [favoriteSupplierId, setFavoriteSupplierId] = useState(
    () => localStorage.getItem("procurement.favoriteSupplierId") || ""
  );
  const requisitionsQ = trpc.erp.listProcurements.useQuery(undefined, {
    staleTime: 60_000,
  });
  const grnsQ = trpc.goodsReceipts.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000 }
  );
  const grnViewQ = trpc.goodsReceipts.view.useQuery(
    { id: Number(sourceGrnId) },
    { enabled: !!sourceGrnId }
  );
  const productsQ = trpc.products.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000 }
  );

  const filtered = purchases.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (supplierFilter !== "all" && String(p.supplierId) !== supplierFilter)
      return false;
    return true;
  });

  const subtotal = items.reduce(
    (s, i) => s + parseFloat(i.unitPrice || "0") * (i.quantity || 0),
    0
  );
  const disc = parseFloat(discount) || 0;
  const tax = ((subtotal - disc) * (parseFloat(taxRate) || 0)) / 100;
  const total = subtotal - disc + tax;

  const createM = trpc.purchases.create.useMutation({
    onSuccess: () => {
      utils.purchases.list.invalidate();
      utils.suppliers.list.invalidate();
      utils.products.list.invalidate();
      toast.success("تم إنشاء فاتورة الشراء");
      resetForm();
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "تعذّر الإنشاء"),
  });
  const statusM = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => {
      utils.purchases.list.invalidate();
      utils.suppliers.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "تعذّر التحديث"),
  });

  const resetForm = () => {
    setSupplierId("");
    setItems([]);
    setDiscount("0");
    setTaxRate("0");
    setPaymentMethod("cash");
    setPaidAmount("0");
    setNotes("");
    setSourceRequisitionId("");
    setSourceGrnId("");
    setSourcePoId(null);
  };

  const importFromGrn = () => {
    if (!sourceGrnId) return;
    const grn = (grnsQ.data?.items ?? []).find(
      (g: any) => String(g.id) === sourceGrnId
    );
    if (!grn) {
      toast.error("سند الاستلام غير موجود");
      return;
    }
    const lines = grnViewQ.data?.lines ?? [];
    if (lines.length === 0) {
      toast.error("لا توجد بنود في هذا السند");
      return;
    }
    setSupplierId(grn.supplierId ? String(grn.supplierId) : "");
    setItems(
      lines.map((l: any) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: Math.max(1, l.quantityReceived),
        unitPrice: String(l.unitPrice ?? "0"),
        discount: "0",
      }))
    );
    setSourcePoId(grn.poId ?? null);
    setNotes(`مرتبط بسند استلام ${grn.grnNumber}`);
    toast.success("تم تحميل بنود السند كمسودة فاتورة");
  };

  const saveFavoriteSupplier = () => {
    if (!supplierId) {
      toast.error("اختر المورد أولاً");
      return;
    }
    localStorage.setItem("procurement.favoriteSupplierId", supplierId);
    setFavoriteSupplierId(supplierId);
    toast.success("تم حفظ المورد كمفضل");
  };

  const importFromRequisition = () => {
    const requisition = (requisitionsQ.data ?? []).find(
      (row: any) => String(row.id) === sourceRequisitionId
    );
    if (!requisition) return;
    const product = (productsQ.data?.items ?? []).find(
      (row: any) =>
        row.name === requisition.itemName || row.code === requisition.itemName
    );
    if (!product) {
      toast.error(
        "لم تتم مطابقة بند الطلب مع صنف مسجل؛ أضف الصنف أولاً ثم أعد الاستيراد"
      );
      return;
    }
    setSupplierId(requisition.supplierId ? String(requisition.supplierId) : "");
    setItems([
      {
        productId: product.id,
        productName: product.name,
        quantity: Math.max(1, Number(requisition.quantity || 1)),
        unitPrice: String(requisition.estimatedCost || "0"),
        discount: "0",
      },
    ]);
    setNotes(
      `مصدر الفاتورة: طلب توريد ${requisition.requisitionNumber || requisition.id}`
    );
    toast.success("تم تحميل الطلب كمسودة فاتورة");
  };

  const itemsQ = trpc.purchases.getItems.useQuery(
    { invoiceId: expanded! },
    { enabled: expanded !== null }
  );

  return (
    <div className="min-h-screen flex">
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="confirmed">معتمدة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="partial">مدفوعة جزئياً</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-9 text-xs w-40">
                <SelectValue placeholder="المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموردين</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadPurchaseReport(filtered, id => supplierName(id))
              }
              className="text-xs h-9"
            >
              <Download className="w-3.5 h-3.5 ml-1" /> تنزيل التقرير
            </Button>
            <CommunicationShare
              docType="procurement_report"
              variant="text"
              label="مشاركة التقرير"
            />
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
            >
              <Plus className="w-4 h-4" /> فاتورة شراء جديدة
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-[11px]">الرقم</TableHead>
                <TableHead className="text-[11px]">المورد</TableHead>
                <TableHead className="text-[11px]">التاريخ</TableHead>
                <TableHead className="text-[11px]">الإجمالي</TableHead>
                <TableHead className="text-[11px]">المدفوع</TableHead>
                <TableHead className="text-[11px]">الحالة</TableHead>
                <TableHead className="text-[11px] text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <React.Fragment key={p.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  >
                    <TableCell>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expanded === p.id ? "rotate-180" : ""
                        }`}
                      />
                    </TableCell>
                    <TableCell className="text-[11px] font-mono">
                      {p.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {suppliers.find(s => s.id === p.supplierId)?.name ??
                        "بدون مورد"}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {fmtDate(p.createdAt)}
                    </TableCell>
                    <TableCell className="text-[11px] dir-ltr">
                      {fmt(p.total)}
                    </TableCell>
                    <TableCell className="text-[11px] dir-ltr">
                      {fmt(p.paidAmount)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_TONE[p.status] ?? ""}`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex gap-1">
                        {p.status !== "confirmed" &&
                          p.status !== "paid" &&
                          p.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() =>
                                statusM.mutate({
                                  id: p.id,
                                  status: "confirmed",
                                })
                              }
                            >
                              <CheckCircle2 className="w-3 h-3" /> اعتماد
                            </Button>
                          )}
                        {p.status !== "paid" && p.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            onClick={() =>
                              statusM.mutate({ id: p.id, status: "paid" })
                            }
                          >
                            <Wallet className="w-3 h-3" /> سداد
                          </Button>
                        )}
                        <ProcurementDocumentTools
                          invoice={p}
                          supplierName={supplierName(p.supplierId)}
                        />
                        <CommunicationShare
                          docType="purchase_invoice"
                          docId={p.id}
                          label="فاتورة"
                          summary={{
                            documentLabel: "فاتورة مشتريات",
                            documentNumber: p.invoiceNumber,
                            supplierName: supplierName(p.supplierId),
                            dateText: fmtDate(p.invoiceDate ?? p.createdAt),
                            total: p.total,
                            paidAmount: p.paidAmount,
                            status: STATUS_LABEL[p.status] ?? p.status,
                            notes: p.notes,
                          }}
                        />
                        {p.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] text-rose-600"
                            onClick={() =>
                              statusM.mutate({ id: p.id, status: "cancelled" })
                            }
                          >
                            <XCircle className="w-3 h-3" /> إلغاء
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === p.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="bg-muted/40">
                        {itemsQ.isLoading ? (
                          <p className="text-xs text-muted-foreground py-3">
                            جاري التحميل…
                          </p>
                        ) : (
                          <div className="py-2">
                            <p className="text-[11px] font-bold mb-2">
                              بنود الفاتورة
                            </p>
                            <div className="space-y-1">
                              {(itemsQ.data ?? []).map(
                                (it: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between text-[11px] text-muted-foreground"
                                  >
                                    <span>
                                      {it.productName} × {it.quantity}
                                    </span>
                                    <span className="dir-ltr">
                                      {fmt(it.total)}
                                    </span>
                                  </div>
                                )
                              )}
                              {(!itemsQ.data || itemsQ.data.length === 0) && (
                                <p className="text-[11px]">لا توجد بنود.</p>
                              )}
                            </div>
                            {p.notes && (
                              <p className="text-[11px] text-muted-foreground mt-2">
                                ملاحظات: {p.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-xs text-muted-foreground py-8"
                  >
                    لا توجد فواتير مطابقة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* New purchase invoice dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-white max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm text-ink">
                فاتورة شراء جديدة
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                تُحدَّث المخزون والمورد والقيود المحاسبية تلقائياً عند الحفظ.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 px-1">
              <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[240px] flex-1">
                    <Label className="text-[10px]">استيراد من طلب توريد</Label>
                    <Select
                      value={sourceRequisitionId}
                      onValueChange={setSourceRequisitionId}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر طلباً لتحميله كمسودة" />
                      </SelectTrigger>
                      <SelectContent>
                        {(requisitionsQ.data ?? []).map((row: any) => (
                          <SelectItem key={row.id} value={String(row.id)}>
                            {row.requisitionNumber} — {row.itemName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      تتم المطابقة مع الأصناف المسجلة ولا يتم إنشاء فاتورة
                      تلقائية قبل مراجعتك.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs"
                    disabled={!sourceRequisitionId}
                    onClick={importFromRequisition}
                  >
                    تحميل كمسودة
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-emerald-400/40 bg-emerald-500/5 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[240px] flex-1">
                    <Label className="text-[10px]">
                      الربط بسند استلام (مطابقة ثلاثية)
                    </Label>
                    <Select
                      value={sourceGrnId}
                      onValueChange={v => {
                        setSourceGrnId(v);
                        setSourcePoId(null);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر سند استلام مرحّلاً" />
                      </SelectTrigger>
                      <SelectContent>
                        {(grnsQ.data?.items ?? [])
                          .filter((g: any) => g.status === "posted")
                          .map((g: any) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                              {g.grnNumber} — {supplierName(g.supplierId)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      يحمّل بنود السند ويثبّت المورد، ويربط الفاتورة بأمر الشراء
                      وسند الاستلام لمنع ازدواج الترحيل.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs"
                    disabled={!sourceGrnId}
                    onClick={importFromGrn}
                  >
                    تحميل البنود
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px]">المورد (اختياري)</Label>
                  <div className="flex items-center gap-1">
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر مورداً" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      title="حفظ كمورد مفضل"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${favoriteSupplierId === supplierId ? "text-amber-600" : "text-muted-foreground"}`}
                      onClick={saveFavoriteSupplier}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">طريقة الدفع</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                      <SelectItem value="transfer">تحويل</SelectItem>
                      <SelectItem value="credit">آجل</SelectItem>
                      <SelectItem value="online">إلكتروني</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-border">
                <div className="flex items-center justify-between p-2 border-b">
                  <span className="text-[11px] font-bold">البنود</span>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Package className="w-3 h-3" /> إضافة صنف
                  </Button>
                </div>
                <div className="divide-y">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">
                          {it.productName}
                        </p>
                        <p className="text-[10px] text-muted-foreground dir-ltr">
                          {fmt(it.unitPrice)} × {it.quantity}
                        </p>
                      </div>
                      <Input
                        type="number"
                        value={it.quantity}
                        onChange={e => {
                          const v = Math.max(
                            1,
                            parseInt(e.target.value || "1")
                          );
                          setItems(prev =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, quantity: v } : x
                            )
                          );
                        }}
                        className="h-8 w-16 text-xs dir-ltr"
                      />
                      <Input
                        value={it.unitPrice}
                        onChange={e =>
                          setItems(prev =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, unitPrice: e.target.value }
                                : x
                            )
                          )
                        }
                        className="h-8 w-24 text-xs dir-ltr"
                      />
                      <button
                        onClick={() =>
                          setItems(prev => prev.filter((_, i) => i !== idx))
                        }
                        className="text-rose-500 text-[10px] px-1"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-center text-[11px] text-muted-foreground py-4">
                      لم تُضف أي أصناف بعد.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px]">الخصم الكلي</Label>
                  <Input
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    className="h-9 text-xs dir-ltr"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">نسبة الضريبة %</Label>
                  <Input
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                    className="h-9 text-xs dir-ltr"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">المبلغ المدفوع</Label>
                  <Input
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    className="h-9 text-xs dir-ltr"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">الإجمالي</Label>
                  <div className="h-9 px-3 flex items-center text-sm font-black dir-ltr border rounded-md bg-muted">
                    {fmt(total)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[10px]">ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="text-xs min-h-[50px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="text-xs h-9"
                onClick={() => setDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                disabled={items.length === 0 || createM.isPending}
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
                onClick={() =>
                  createM.mutate({
                    supplierId: supplierId ? Number(supplierId) : undefined,
                    poId: sourcePoId ?? undefined,
                    grnId: sourceGrnId ? Number(sourceGrnId) : undefined,
                    items: items.map(i => ({
                      productId: i.productId,
                      productName: i.productName,
                      quantity: i.quantity,
                      unitPrice: i.unitPrice,
                      discount: i.discount || "0",
                    })),
                    discount,
                    taxRate,
                    paymentMethod: paymentMethod as any,
                    paidAmount,
                    notes: notes || undefined,
                  })
                }
              >
                {createM.isPending ? "جاري الحفظ…" : "حفظ الفاتورة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProductPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={p =>
            setItems(prev => [
              ...prev,
              {
                productId: p.id,
                productName: p.name,
                quantity: 1,
                unitPrice: String(p.purchasePrice ?? p.salePrice ?? "0"),
                discount: "0",
              },
            ])
          }
          title="اختر صنفاً للشراء"
          priceField="purchasePrice"
          placeholder="ابحث عن صنف لإضافته للفاتورة..."
        />
      </main>
    </div>
  );
}
