import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc, RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { CommunicationShare } from "@/components/CommunicationShare";
import { toast } from "sonner";
import {
  PackageCheck,
  FileText,
  XCircle,
  ArrowLeft,
  ChevronDown,
  Truck,
  Link2,
} from "lucide-react";

type GRN = RouterOutputs["goodsReceipts"]["list"]["items"][number];
type GRNView = NonNullable<RouterOutputs["goodsReceipts"]["view"]>;

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  posted: "مرحّل",
  cancelled: "ملغى",
};
const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  posted: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
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

export default function GoodsReceipts() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const grnsQ = trpc.goodsReceipts.list.useQuery(
    { limit: 100 },
    { staleTime: 30_000 }
  );
  const suppliersQ = trpc.suppliers.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000 }
  );
  const ordersQ = trpc.purchaseOrders.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000 }
  );

  const grns = (grnsQ.data?.items ?? []) as GRN[];
  const suppliers = suppliersQ.data?.items ?? [];
  const orders = ordersQ.data?.items ?? [];

  const [expanded, setExpanded] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<GRN | null>(null);

  const supplierName = (id?: number | null) =>
    suppliers.find(s => s.id === id)?.name ?? "بدون مورد";
  const poNumber = (poId?: number | null) =>
    (orders.find(o => o.id === poId) as (typeof orders)[number])?.poNumber ??
    "—";

  const posted = grns.filter(g => g.status === "posted").length;
  const cancelled = grns.filter(g => g.status === "cancelled").length;
  const linkedOrders = new Set(grns.map(g => g.poId)).size;

  const cancelM = trpc.goodsReceipts.cancel.useMutation({
    onSuccess: () => {
      utils.goodsReceipts.list.invalidate();
      utils.goodsReceipts.view.invalidate();
      utils.purchaseOrders.list.invalidate();
      utils.purchaseOrders.view.invalidate();
      toast.success("تم إلغاء سند الاستلام وعكس المخزون");
      setCancelTarget(null);
    },
    onError: (e: any) => toast.error(e?.message || "تعذّر إلغاء السند"),
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
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-display">
                  سندات الاستلام
                </h1>
                <p className="text-xs text-white/70 mt-0.5">
                  إثبات استلام الكميات ضد أوامر الشراء مع ترحيل المخزون والقيد
                  المحاسبي — وممنوع الربط بفاتورة قبل الموافقة.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setLocation("/purchase-orders")}
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <FileText className="ml-2 h-4 w-4" /> أوامر الشراء
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="إجمالي السندات"
            value={grns.length}
            tone="info"
            icon={PackageCheck}
            hint="جميع سندات الاستلام"
          />
          <StatCard
            label="سندات مرحّلة"
            value={posted}
            tone="positive"
            icon={Truck}
            hint="رحّلت المخزون فعلياً"
          />
          <StatCard
            label="سندات ملغاة"
            value={cancelled}
            tone="negative"
            icon={XCircle}
            hint="عُكس المخزون عند الإلغاء"
          />
          <StatCard
            label="أوامر مرتبطة"
            value={linkedOrders}
            tone="info"
            icon={Link2}
            hint="أوامر شراء لديها استلام"
          />
        </div>

        <div className="rounded-xl border border-border overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-[11px]">الرقم</TableHead>
                <TableHead className="text-[11px]">أمر الشراء</TableHead>
                <TableHead className="text-[11px]">المورد</TableHead>
                <TableHead className="text-[11px]">تاريخ الاستلام</TableHead>
                <TableHead className="text-[11px]">الحالة</TableHead>
                <TableHead className="text-[11px] text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grns.map(g => (
                <React.Fragment key={g.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                  >
                    <TableCell>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          expanded === g.id ? "rotate-180" : ""
                        }`}
                      />
                    </TableCell>
                    <TableCell className="text-[11px] font-mono">
                      {g.grnNumber}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono">
                      {poNumber(g.poId)}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {supplierName(g.supplierId)}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {fmtDate(g.receivedAt)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_TONE[g.status ?? ""] ?? ""}`}
                      >
                        {STATUS_LABEL[g.status ?? ""] ?? g.status}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex gap-1 justify-end">
                        <CommunicationShare
                          docType="goods_receipt"
                          docId={g.id}
                          label="سند استلام"
                        />
                        {g.status === "posted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] text-rose-600"
                            disabled={cancelM.isPending}
                            onClick={() => setCancelTarget(g)}
                          >
                            <XCircle className="w-3 h-3" /> إلغاء
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === g.id && <GRNExpanded id={g.id} />}
                </React.Fragment>
              ))}
              {grns.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-xs text-muted-foreground py-8"
                  >
                    لا توجد سندات استلام بعد.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={o => !o && setCancelTarget(null)}
      >
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              إلغاء سند الاستلام
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              سيُعكس ترحيل المخزون وتُعاد الكميات لأمر الشراء. لا يمكن الإلغاء
              إذا ارتبط السند بفاتورة شراء.
            </DialogDescription>
          </DialogHeader>
          <CancelForm
            target={cancelTarget}
            pending={cancelM.isPending}
            onSubmit={reason => {
              if (cancelTarget) cancelM.mutate({ id: cancelTarget.id, reason });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CancelForm({
  target,
  pending,
  onSubmit,
}: {
  target: GRN | null;
  pending: boolean;
  onSubmit: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px]">سبب الإلغاء</Label>
        <Input
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="h-9 text-xs"
          placeholder="اختياري"
        />
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          className="text-xs h-9"
          onClick={() => onSubmit(undefined)}
        >
          إلغاء
        </Button>
        <Button
          disabled={pending}
          className="bg-rose-600 text-white hover:bg-rose-700 text-xs h-9 font-bold"
          onClick={() => onSubmit(reason || undefined)}
        >
          {pending ? "جاري الإلغاء…" : `تأكيد إلغاء ${target?.grnNumber ?? ""}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

function GRNExpanded({ id }: { id: number }) {
  const viewQ = trpc.goodsReceipts.view.useQuery({ id }, { enabled: id > 0 });
  const data = (viewQ.data ?? null) as GRNView | null;
  const total = (data?.lines ?? []).reduce(
    (s, l) => s + parseFloat(String(l.unitPrice ?? "0")) * l.quantityReceived,
    0
  );

  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-muted/40">
        {viewQ.isLoading ? (
          <p className="text-xs text-muted-foreground py-3">جاري التحميل…</p>
        ) : data ? (
          <div className="space-y-3 py-2">
            <div>
              <p className="text-[11px] font-bold mb-2">البنود المستلمة</p>
              <div className="space-y-1">
                {data.lines.map(l => (
                  <div
                    key={l.id}
                    className="flex justify-between text-[11px] text-muted-foreground"
                  >
                    <span>
                      {l.productName} × {l.quantityReceived}
                    </span>
                    <span className="dir-ltr">
                      {fmt(
                        parseFloat(String(l.unitPrice ?? "0")) *
                          l.quantityReceived
                      )}
                    </span>
                  </div>
                ))}
                {data.lines.length === 0 && (
                  <p className="text-[11px]">لا توجد بنود.</p>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="font-bold">القيمة الإجمالية</span>
              <span className="dir-ltr font-black">{fmt(total)} ر.ي</span>
            </div>
            {data.grn.notes && (
              <p className="text-[11px] text-muted-foreground">
                ملاحظات: {data.grn.notes}
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
