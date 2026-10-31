import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc, RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
import { CommunicationShare } from "@/components/CommunicationShare";
import { toast } from "sonner";
import {
  Truck,
  FileText,
  PackageCheck,
  Plus,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Archive,
  Wallet,
  Package,
} from "lucide-react";

type PO = RouterOutputs["purchaseOrders"]["list"]["items"][number];
type POView = NonNullable<RouterOutputs["purchaseOrders"]["view"]>;

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  issued: "صادر (معتمد)",
  partially_received: "مستلم جزئياً",
  received: "مستلم بالكامل",
  cancelled: "ملغى",
  closed: "مغلق",
};
const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-sky-100 text-sky-700",
  partially_received: "bg-amber-100 text-amber-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  closed: "bg-muted text-muted-foreground",
};

const fmt = (v?: string | number | null) => {
  const n = parseFloat(v == null || v === "" ? "0" : String(v));
  return (isNaN(n) ? 0 : n).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
const fmtDate = (v?: string | Date | null) =>
  v ? new Date(v).toLocaleDateString("ar-EG") : "—";

interface DraftLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  discount: string;
}

export default function PurchaseOrders() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const ordersQ = trpc.purchaseOrders.list.useQuery(
    { limit: 100 },
    { staleTime: 30_000 }
  );
  const suppliersQ = trpc.suppliers.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000 }
  );
  const orders = (ordersQ.data?.items ?? []) as PO[];
  const suppliers = suppliersQ.data?.items ?? [];

  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [receivePoId, setReceivePoId] = useState<number | null>(null);

  const supplierName = (id?: number | null) =>
    suppliers.find(s => s.id === id)?.name ?? "بدون مورد";

  const filtered = orders.filter(
    p => statusFilter === "all" || p.status === statusFilter
  );

  const openOrders = orders.filter(
    p => p.status === "issued" || p.status === "partially_received"
  );
  const openValue = openOrders.reduce(
    (s, p) => s + parseFloat(String(p.total || "0")),
    0
  );
  const completed = orders.filter(
    p => p.status === "received" || p.status === "closed"
  ).length;

  const issueM = trpc.purchaseOrders.issue.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success("تم اعتماد وإصدار أمر الشراء");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر إصدار الأمر"),
  });
  const cancelM = trpc.purchaseOrders.cancel.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success("تم إلغاء أمر الشراء");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر الإلغاء"),
  });
  const closeM = trpc.purchaseOrders.close.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success("تم إغلاق أمر الشراء");
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر الإغلاق"),
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-display">
      <div className="brand-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => setLocation("/procurement-workspace")}
            className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            العودة إلى Workspace المشتريات
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand text-ink-deep flex items-center justify-center font-bold shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-display">
                  أوامر الشراء
                </h1>
                <p className="text-xs text-white/70 mt-0.5">
                  إنشاء أوامر الشراء واعتمادها واستلامها وإغلاقها — بسلسلة حوكمة
                  كاملة ومطابقة ثلاثية عند الفوترة.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setLocation("/goods-receipts")}
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <PackageCheck className="ml-2 h-4 w-4" /> سندات الاستلام
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="إجمالي الأوامر"
            value={orders.length}
            tone="info"
            icon={FileText}
            hint="جميع الأوامر المسجلة"
          />
          <StatCard
            label="أوامر مفتوحة"
            value={openOrders.length}
            tone="warning"
            icon={Truck}
            hint="صادرة أو مستلمة جزئياً"
          />
          <StatCard
            label="مستلمة ومغلقة"
            value={completed}
            tone="positive"
            icon={PackageCheck}
            hint="اكتمل استلامها"
          />
          <StatCard
            label="القيمة المفتوحة"
            value={`${fmt(openValue)} ر.ي`}
            tone="info"
            icon={Wallet}
            hint="التزامات لم تُستلَم بعد"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="issued">صادر</SelectItem>
                <SelectItem value="partially_received">مستلم جزئياً</SelectItem>
                <SelectItem value="received">مستلم بالكامل</SelectItem>
                <SelectItem value="closed">مغلق</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
          >
            <Plus className="w-4 h-4" /> أمر شراء جديد
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-[11px]">الرقم</TableHead>
                <TableHead className="text-[11px]">المورد</TableHead>
                <TableHead className="text-[11px]">الإنشاء</TableHead>
                <TableHead className="text-[11px]">التسليم المتوقع</TableHead>
                <TableHead className="text-[11px]">الإجمالي</TableHead>
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
                      {p.poNumber}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {supplierName(p.supplierId)}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {fmtDate(p.createdAt)}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {fmtDate(p.expectedDeliveryDate)}
                    </TableCell>
                    <TableCell className="text-[11px] dir-ltr">
                      {fmt(p.total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_TONE[p.status ?? ""] ?? ""}`}
                      >
                        {STATUS_LABEL[p.status ?? ""] ?? p.status}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex gap-1 justify-end">
                        <CommunicationShare
                          docType="purchase_order"
                          docId={p.id}
                          label="أمر شراء"
                          summary={{
                            documentLabel: "أمر شراء",
                            documentNumber: p.poNumber,
                            supplierName: supplierName(p.supplierId),
                            dateText: fmtDate(p.createdAt),
                            total: p.total ?? "0",
                            status: STATUS_LABEL[p.status ?? ""] ?? p.status,
                            notes: p.notes ?? undefined,
                          }}
                        />
                        {p.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            disabled={issueM.isPending}
                            onClick={() => issueM.mutate({ id: p.id })}
                          >
                            <CheckCircle2 className="w-3 h-3" /> اعتماد وإصدار
                          </Button>
                        )}
                        {(p.status === "issued" ||
                          p.status === "partially_received") && (
                          <Button
                            size="sm"
                            className="h-7 text-[10px] bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
                            onClick={() => setReceivePoId(p.id)}
                          >
                            <PackageCheck className="w-3 h-3" /> استلام
                          </Button>
                        )}
                        {p.status === "received" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px]"
                            disabled={closeM.isPending}
                            onClick={() => closeM.mutate({ id: p.id })}
                          >
                            <Archive className="w-3 h-3" /> إغلاق
                          </Button>
                        )}
                        {(p.status === "draft" || p.status === "issued") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] text-rose-600"
                            disabled={cancelM.isPending}
                            onClick={() => cancelM.mutate({ id: p.id })}
                          >
                            <XCircle className="w-3 h-3" /> إلغاء
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === p.id && (
                    <POExpanded id={p.id} supplierName={supplierName} />
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-xs text-muted-foreground py-8"
                  >
                    لا توجد أوامر شراء مطابقة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {createOpen && (
        <CreateOrderDialog
          open
          onOpenChange={setCreateOpen}
          suppliers={suppliers as any[]}
          utils={utils as any}
        />
      )}
      {receivePoId !== null && (
        <ReceiveDialog
          poId={receivePoId}
          onClose={() => setReceivePoId(null)}
          utils={utils as any}
        />
      )}
    </div>
  );
}

/* ───────── تفاصيل الأمر الموسعة: البنود وسندات الاستلام ───────── */
function POExpanded({
  id,
  supplierName,
}: {
  id: number;
  supplierName: (id?: number | null) => string;
}) {
  const viewQ = trpc.purchaseOrders.view.useQuery({ id }, { enabled: id > 0 });
  const data = (viewQ.data ?? null) as POView | null;

  return (
    <TableRow>
      <TableCell colSpan={8} className="bg-muted/40">
        {viewQ.isLoading ? (
          <p className="text-xs text-muted-foreground py-3">جاري التحميل…</p>
        ) : data ? (
          <div className="space-y-3 py-2">
            <div>
              <p className="text-[11px] font-bold mb-2">بنود الأمر</p>
              <div className="space-y-1">
                {data.lines.map(l => (
                  <div
                    key={l.poItemId}
                    className="flex justify-between text-[11px] text-muted-foreground"
                  >
                    <span>
                      {l.productName} × {l.quantity}
                      <span className="mx-1 text-muted-foreground/70">
                        — مستلم {l.receivedQty}
                      </span>
                    </span>
                    <span className="dir-ltr">
                      {fmt(
                        parseFloat(String(l.unitPrice || "0")) * l.quantity -
                          parseFloat(String(l.discount || "0"))
                      )}
                    </span>
                  </div>
                ))}
                {data.lines.length === 0 && (
                  <p className="text-[11px]">لا توجد بنود.</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold mb-2">سندات الاستلام</p>
              <div className="space-y-1">
                {data.grns.map(g => (
                  <div
                    key={g.id}
                    className="flex justify-between text-[11px] text-muted-foreground"
                  >
                    <span className="font-mono">{g.grnNumber}</span>
                    <span>
                      {g.status === "cancelled" ? (
                        <span className="text-rose-600">ملغى</span>
                      ) : (
                        <>
                          {fmtDate(g.receivedAt)} — {supplierName(g.supplierId)}
                        </>
                      )}
                    </span>
                  </div>
                ))}
                {data.grns.length === 0 && (
                  <p className="text-[11px]">لا توجد سندات استلام بعد.</p>
                )}
              </div>
            </div>
            {data.po.notes && (
              <p className="text-[11px] text-muted-foreground">
                ملاحظات: {data.po.notes}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground py-3">
            تعذّر تحميل التفاصيل.
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}

/* ───────── إنشاء أمر شراء جديد ───────── */
function CreateOrderDialog({
  open,
  onOpenChange,
  suppliers,
  utils,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  suppliers: any[];
  utils: any;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const createM = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      utils.purchaseOrders.view.invalidate();
      toast.success("تم إنشاء أمر الشراء");
      setSupplierId("");
      setExpectedDeliveryDate("");
      setDiscount("0");
      setTaxRate("0");
      setNotes("");
      setItems([]);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر إنشاء أمر الشراء"),
  });

  const subtotal = items.reduce(
    (s, i) => s + parseFloat(i.unitPrice || "0") * i.quantity,
    0
  );
  const disc = parseFloat(discount) || 0;
  const tax = ((subtotal - disc) * (parseFloat(taxRate) || 0)) / 100;
  const total = subtotal - disc + tax;

  const openResetter = (v: boolean) => {
    if (!v) {
      setSupplierId("");
      setExpectedDeliveryDate("");
      setDiscount("0");
      setTaxRate("0");
      setNotes("");
      setItems([]);
    }
    onOpenChange(v);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={openResetter}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              أمر شراء جديد
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              يُنشأ كمسودة قابلة للاعتماد والإصدار؛ ولا يُرحَّل المخزون إلا عند
              إنشاء سند الاستلام.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 px-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">المورد</Label>
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
              </div>
              <div>
                <Label className="text-[10px]">التسليم المتوقع</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={e => setExpectedDeliveryDate(e.target.value)}
                  className="h-9 text-xs"
                />
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
                        const v = Math.max(1, parseInt(e.target.value || "1"));
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
                            i === idx ? { ...x, unitPrice: e.target.value } : x
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
                <Label className="text-[10px]">الإجمالي المتوقع</Label>
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
              onClick={() => openResetter(false)}
            >
              إلغاء
            </Button>
            <Button
              disabled={!supplierId || items.length === 0 || createM.isPending}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
              onClick={() =>
                createM.mutate({
                  supplierId: Number(supplierId),
                  expectedDeliveryDate: expectedDeliveryDate || undefined,
                  discount,
                  taxRate,
                  notes: notes || undefined,
                  items: items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    discount: i.discount || "0",
                  })),
                })
              }
            >
              {createM.isPending ? "جاري الحفظ…" : "إنشاء الأمر"}
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
        title="اختر صنفاً لأمر الشراء"
        priceField="purchasePrice"
        placeholder="ابحث عن صنف لإضافته للأمر..."
      />
    </>
  );
}

/* ───────── استلام (سند استلام) ضد أمر صادر ───────── */
function ReceiveDialog({
  poId,
  onClose,
  utils,
}: {
  poId: number;
  onClose: () => void;
  utils: any;
}) {
  const viewQ = trpc.purchaseOrders.view.useQuery(
    { id: poId },
    { enabled: poId > 0 }
  );
  const data = (viewQ.data ?? null) as POView | null;

  const [receipts, setReceipts] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");

  const receiveM = trpc.purchaseOrders.receive.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      utils.purchaseOrders.view.invalidate();
      utils.goodsReceipts.list.invalidate();
      toast.success("تم إنشاء سند الاستلام وترحيل المخزون");
      setReceipts({});
      setNotes("");
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر الاستلام"),
  });

  const lines = data?.lines ?? [];
  const payload = lines
    .filter(l => (l.receivedQty ?? 0) < l.quantity)
    .map(l => ({
      poItemId: l.poItemId,
      productId: l.productId,
      quantityReceived:
        receipts[l.poItemId] ?? l.quantity - (l.receivedQty ?? 0),
    }))
    .filter(p => p.quantityReceived >= 1);
  const value = payload.reduce((s, p) => {
    const line = lines.find(l => l.poItemId === p.poItemId);
    return s + parseFloat(String(line?.unitPrice ?? "0")) * p.quantityReceived;
  }, 0);

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-white max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm text-ink">
            استلام — {data?.po.poNumber ?? ""}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            يُرحَّل المخزون فوراً ويُمنع الاستلام الزائد (تفاوت 0%). تفاصيل
            الكميات تُعرض بحد أقصى المتبقي في الأمر.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {viewQ.isLoading ? (
            <p className="text-xs text-muted-foreground py-3">جاري التحميل…</p>
          ) : (
            <div className="rounded-xl border border-border divide-y">
              {lines.map(l => {
                const remaining = l.quantity - (l.receivedQty ?? 0);
                if (remaining <= 0)
                  return (
                    <div key={l.poItemId} className="p-3">
                      <p className="text-[11px] font-medium truncate">
                        {l.productName}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        مستلم بالكامل
                      </p>
                    </div>
                  );
                const current = receipts[l.poItemId] ?? remaining;
                return (
                  <div key={l.poItemId} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate">
                          {l.productName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          المطلوب {l.quantity} — المستلم {l.receivedQty ?? 0} —
                          المتبقي {remaining}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={remaining}
                        value={current}
                        onChange={e => {
                          const v = Math.max(
                            1,
                            parseInt(e.target.value || "1")
                          );
                          setReceipts(prev => ({
                            ...prev,
                            [l.poItemId]: Math.min(remaining, v),
                          }));
                        }}
                        className="h-8 w-20 text-xs dir-ltr"
                      />
                    </div>
                  </div>
                );
              })}
              {lines.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground py-4">
                  لا توجد بنود للاستلام.
                </p>
              )}
            </div>
          )}
          <div>
            <Label className="text-[10px]">قيمة الاستلام</Label>
            <div className="h-9 px-3 flex items-center text-sm font-black dir-ltr border rounded-md bg-muted">
              {fmt(value)} ر.ي
            </div>
          </div>
          <div>
            <Label className="text-[10px]">ملاحظات السند</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs min-h-[50px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="text-xs h-9" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={payload.length === 0 || receiveM.isPending}
            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-9 font-bold"
            onClick={() =>
              receiveM.mutate({
                poId,
                notes: notes || undefined,
                items: payload,
              })
            }
          >
            {receiveM.isPending ? "جاري الاستلام…" : "تأكيد الاستلام"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
