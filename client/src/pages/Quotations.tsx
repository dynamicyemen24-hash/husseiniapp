import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  GitBranch,
  MessageSquare,
  Lightbulb,
  Paperclip,
  Link2,
  RefreshCw,
  ArrowLeftRight,
  Trophy,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";
import { DataGrid } from "@/components/ui/data-grid";

// ─── Helpers ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  approved: "معتمد",
  sent: "مرسل",
  negotiating: "تفاوض",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired: "منتهي",
  converted: "محول",
  closed: "مغلق",
  cancelled: "ملغي",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  in_review: "outline",
  approved: "default",
  sent: "default",
  negotiating: "outline",
  accepted: "default",
  rejected: "destructive",
  expired: "secondary",
  converted: "default",
  closed: "secondary",
  cancelled: "destructive",
};

const TRANSITIONS: Record<string, string[]> = {
  draft: ["in_review", "cancelled"],
  in_review: ["approved", "rejected", "draft", "cancelled"],
  approved: ["sent", "cancelled"],
  sent: ["negotiating", "accepted", "rejected", "expired", "cancelled"],
  negotiating: ["accepted", "rejected", "sent", "cancelled"],
  accepted: ["converted", "closed", "cancelled"],
  rejected: ["negotiating", "cancelled"],
  expired: ["sent", "negotiating", "cancelled"],
  converted: ["closed"],
  closed: [],
  cancelled: [],
};

const KIND_LABELS: Record<string, string> = {
  product: "منتج",
  service: "خدمة",
  project: "مشروع",
  subscription: "اشتراك",
  production: "إنتاج",
  distribution: "توزيع",
  other: "أخرى",
};

interface ComposerLine {
  kind: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPct: number;
  taxPct: number;
}

const EMPTY_LINE: ComposerLine = {
  kind: "product",
  name: "",
  quantity: 1,
  unitPrice: 0,
  costPrice: 0,
  discountPct: 0,
  taxPct: 0,
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function Quotations() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [direction, setDirection] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const dash = trpc.quotations.dashboard.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const listQ = trpc.quotations.list.useQuery(
    {
      direction:
        direction === "all" ? undefined : (direction as "sale" | "purchase"),
      status: status === "all" ? undefined : status,
      search: debouncedSearch || undefined,
      limit: 100,
      offset: 0,
    },
    { staleTime: 15_000, refetchOnWindowFocus: false }
  );

  const alertsQ = trpc.quotations.alerts.list.useQuery(
    { unreadOnly: true, limit: 10 },
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const rows = useMemo(() => listQ.data?.rows ?? [], [listQ.data]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FileText className="h-6 w-6" />
            محرك عروض الأسعار الشامل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تسعير وذكاء ومقارنة واستنتاج وقرار — لا مجرد مستند
          </p>
        </div>
        <Button
          onClick={() => setShowComposer(true)}
          className="press-effect btn-gold"
        >
          <Plus className="h-4 w-4 ml-1" />
          عرض جديد
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="panel-premium hover-lift">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              قيمة العروض المفتوحة
            </p>
            <p className="text-xl font-black">
              {fmtNum(num(dash.data?.openValue))}
            </p>
          </CardContent>
        </Card>
        <Card className="panel-premium hover-lift">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">معدل الفوز</p>
            <p className="text-xl font-black">
              {dash.data?.winRate != null ? `${dash.data.winRate}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="panel-premium hover-lift">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">تنتهي خلال 7 أيام</p>
            <p className="text-xl font-black text-warning">
              {num(dash.data?.expiringSoon)}
            </p>
          </CardContent>
        </Card>
        <Card className="panel-premium hover-lift">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Bell className="h-3 w-3" /> تنبيهات غير مقروءة
            </p>
            <p className="text-xl font-black">{num(dash.data?.unreadAlerts)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Proactive alerts */}
      {(alertsQ.data?.length ?? 0) > 0 && (
        <Card className="panel-premium border-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              تنبيهات استباقية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertsQ.data!.map((a: any) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <span>
                  <Badge
                    variant={
                      a.severity === "critical" ? "destructive" : "outline"
                    }
                    className="ml-2"
                  >
                    {a.alertType}
                  </Badge>
                  {a.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="panel-premium">
        <CardContent className="pt-4 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم العرض أو الطرف…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <div>
            <Label>الاتجاه</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="sale">بيع</SelectItem>
                <SelectItem value="purchase">شراء</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الحالة</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => listQ.refetch()}
            className="press-effect"
          >
            <RefreshCw className="h-4 w-4 ml-1" /> تحديث
          </Button>
        </CardContent>
      </Card>

      {/* List — DataGrid v2 reference implementation */}
      <Card className="panel-premium">
        <CardContent className="pt-4">
          <DataGrid<Record<string, unknown>>
            data={rows}
            idKey="id"
            loading={listQ.isPending}
            error={listQ.error ? listQ.error.message : null}
            onRetry={() => listQ.refetch()}
            onRowClick={(q: Record<string, unknown>) =>
              setSelectedId(num(q.id))
            }
            pageSize={100}
            ariaLabel="جدول عروض الأسعار"
            emptyTitle="لا توجد عروض مطابقة"
            emptyHint="أنشئ أول عرض من زر «عرض جديد»"
            initialSort={{ key: "grandTotal", dir: "desc" }}
            footer={
              <span className="font-ledger">
                الإجمالي:{" "}
                {fmtNum(
                  rows.reduce(
                    (s: number, q: Record<string, unknown>) =>
                      s + num(q.grandTotal),
                    0
                  )
                )}
              </span>
            }
            columns={[
              {
                key: "quotationNumber",
                header: "الرقم",
                sortable: true,
                render: v => <b>{String(v)}</b>,
              },
              {
                key: "direction",
                header: "الاتجاه",
                render: v => (v === "sale" ? "بيع" : "شراء"),
              },
              { key: "counterpartyName", header: "الطرف", sortable: true },
              {
                key: "grandTotal",
                header: "الإجمالي",
                sortable: true,
                numeric: true,
                render: (v, q) => (
                  <b className="font-ledger">
                    {fmtNum(num(v))} {String(q.currency)}
                  </b>
                ),
              },
              {
                key: "marginPct",
                header: "الهامش%",
                sortable: true,
                numeric: true,
                render: v => (
                  <span className={num(v) < 5 ? "text-warning font-bold" : ""}>
                    {num(v)}%
                  </span>
                ),
              },
              {
                key: "status",
                header: "الحالة",
                render: v => (
                  <Badge variant={STATUS_VARIANT[String(v)] ?? "secondary"}>
                    {STATUS_LABELS[String(v)] ?? String(v)}
                  </Badge>
                ),
              },
              {
                key: "version",
                header: "إصدار",
                sortable: true,
                numeric: true,
                render: v => `v${num(v)}`,
              },
            ]}
          />
        </CardContent>
      </Card>

      {showComposer && (
        <ComposerDialog
          onClose={() => setShowComposer(false)}
          onCreated={id => {
            setShowComposer(false);
            listQ.refetch();
            dash.refetch();
            setSelectedId(id);
          }}
        />
      )}

      {selectedId != null && (
        <DetailDialog
          id={selectedId}
          onClose={() => {
            setSelectedId(null);
            listQ.refetch();
            dash.refetch();
            alertsQ.refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────

function ComposerDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [direction, setDirection] = useState<"sale" | "purchase">("sale");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [currency, setCurrency] = useState("YER");
  const [headerDiscountPct, setHeaderDiscountPct] = useState(0);
  const [headerTaxPct, setHeaderTaxPct] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ComposerLine[]>([{ ...EMPTY_LINE }]);

  const typesQ = trpc.quotations.types.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [typeId, setTypeId] = useState<number | null>(null);

  const createMut = trpc.quotations.create.useMutation({
    onSuccess: data => {
      toast.success(`تم إنشاء العرض ${data.quotationNumber}`);
      onCreated(data.id);
    },
    onError: err => toast.error(err.message),
  });

  const setLine = (i: number, patch: Partial<ComposerLine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = () => {
    if (lines.some(l => !l.name.trim())) {
      toast.error("كل بند يحتاج اسماً");
      return;
    }
    createMut.mutate({
      direction,
      typeId,
      counterpartyName: counterpartyName || undefined,
      currency,
      headerDiscountPct,
      headerTaxPct,
      headerDiscountAmount: 0,
      notes: notes || undefined,
      lines: lines.map(l => ({
        kind: l.kind as
          | "product"
          | "service"
          | "project"
          | "subscription"
          | "production"
          | "distribution"
          | "other",
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        costPrice: l.costPrice,
        discountPct: l.discountPct,
        discountAmount: 0,
        taxPct: l.taxPct,
        unit: "قطعة",
        config: {},
      })),
      parties: [],
      terms: [],
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>عرض سعر جديد — Industry-Agnostic</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>الاتجاه</Label>
            <Select
              value={direction}
              onValueChange={v => setDirection(v as "sale" | "purchase")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">بيع</SelectItem>
                <SelectItem value="purchase">شراء</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>نوع العرض</Label>
            <Select
              value={typeId != null ? String(typeId) : ""}
              onValueChange={v => setTypeId(v ? Number(v) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="تلقائي" />
              </SelectTrigger>
              <SelectContent>
                {(typesQ.data ?? [])
                  .filter(
                    (t: Record<string, unknown>) =>
                      String(t.direction) === direction
                  )
                  .map((t: Record<string, unknown>) => (
                    <SelectItem key={String(t.id)} value={String(t.id)}>
                      {String(t.name)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الطرف الآخر</Label>
            <Input
              value={counterpartyName}
              onChange={e => setCounterpartyName(e.target.value)}
              placeholder="عميل / مورد"
            />
          </div>
          <div>
            <Label>العملة</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["YER", "SAR", "USD", "AED", "EGP", "EUR"].map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>خصم عام %</Label>
            <Input
              type="number"
              value={headerDiscountPct}
              onChange={e => setHeaderDiscountPct(num(e.target.value))}
            />
          </div>
          <div>
            <Label>ضريبة عامة %</Label>
            <Input
              type="number"
              value={headerTaxPct}
              onChange={e => setHeaderTaxPct(num(e.target.value))}
            />
          </div>
          <div className="col-span-2">
            <Label>ملاحظات</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Label className="font-bold">
              البنود (منتج / خدمة / مشروع / اشتراك / إنتاج / توزيع)
            </Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLines(p => [...p, { ...EMPTY_LINE }])}
            >
              <Plus className="h-3 w-3 ml-1" /> بند
            </Button>
          </div>
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end border border-border rounded-lg p-2"
            >
              <div>
                <Label>النوع</Label>
                <Select
                  value={l.kind}
                  onValueChange={v => setLine(i, { kind: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>الاسم</Label>
                <Input
                  value={l.name}
                  onChange={e => setLine(i, { name: e.target.value })}
                />
              </div>
              <div>
                <Label>الكمية</Label>
                <Input
                  type="number"
                  value={l.quantity}
                  onChange={e => setLine(i, { quantity: num(e.target.value) })}
                />
              </div>
              <div>
                <Label>السعر</Label>
                <Input
                  type="number"
                  value={l.unitPrice}
                  onChange={e => setLine(i, { unitPrice: num(e.target.value) })}
                />
              </div>
              <div>
                <Label>التكلفة</Label>
                <Input
                  type="number"
                  value={l.costPrice}
                  onChange={e => setLine(i, { costPrice: num(e.target.value) })}
                />
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <Label>خصم%</Label>
                  <Input
                    type="number"
                    value={l.discountPct}
                    onChange={e =>
                      setLine(i, { discountPct: num(e.target.value) })
                    }
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setLines(p => p.filter((_, j) => j !== i))}
                  disabled={lines.length === 1}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={createMut.isPending}>
            {createMut.isPending && (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            )}
            إنشاء العرض
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────

function DetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const detailQ = trpc.quotations.get.useQuery({ id }, { staleTime: 10_000 });
  const [tab, setTab] = useState("overview");
  const [negMsg, setNegMsg] = useState("");
  const [negSide, setNegSide] = useState<"us" | "counterparty">("us");
  const [altLabel, setAltLabel] = useState("");
  const [altTotal, setAltTotal] = useState(0);

  const utils = useMemo(
    () => ({ refresh: () => detailQ.refetch() }),
    [detailQ]
  );

  const transitionMut = trpc.quotations.transition.useMutation({
    onSuccess: d => {
      toast.success(`انتقل إلى ${STATUS_LABELS[d.to] ?? d.to}`);
      utils.refresh();
    },
    onError: e => toast.error(e.message),
  });
  const approveMut = trpc.quotations.decideApproval.useMutation({
    onSuccess: () => {
      toast.success("تم البت في الاعتماد");
      utils.refresh();
    },
    onError: e => toast.error(e.message),
  });
  const negMut = trpc.quotations.negotiate.useMutation({
    onSuccess: () => {
      toast.success("أُضيفت جولة التفاوض");
      setNegMsg("");
      utils.refresh();
    },
    onError: e => toast.error(e.message),
  });
  const analyzeMut = trpc.quotations.analyze.useMutation({
    onSuccess: () => {
      toast.success("اكتمل التحليل الذكي");
      setTab("intelligence");
      utils.refresh();
    },
    onError: e => toast.error(e.message),
  });
  const convertMut = trpc.quotations.convert.useMutation({
    onSuccess: d => {
      toast.success(`تم التحويل: ${d.refType}`);
      utils.refresh();
    },
    onError: e => toast.error(e.message),
  });
  const altMut = trpc.quotations.addAlternative.useMutation({
    onSuccess: () => {
      toast.success("أُضيف البديل");
      setAltLabel("");
      utils.refresh();
    },
    onError: e => toast.error(e.message),
  });

  const d = detailQ.data as unknown as Record<string, unknown> | undefined;
  const header = d?.header as Record<string, unknown> | undefined;
  const items = (d?.items ?? []) as Record<string, unknown>[];
  const approvals = (d?.approvals ?? []) as Record<string, unknown>[];
  const negotiations = (d?.negotiations ?? []) as Record<string, unknown>[];
  const alternatives = (d?.alternatives ?? []) as Record<string, unknown>[];
  const analyses = (d?.analyses ?? []) as Record<string, unknown>[];
  const links = (d?.links ?? []) as Record<string, unknown>[];
  const latest = analyses[0] as Record<string, unknown> | undefined;

  const allowed = header ? (TRANSITIONS[String(header.status)] ?? []) : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {header ? (
              String(header.quotationNumber)
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {header && (
              <Badge
                variant={STATUS_VARIANT[String(header.status)] ?? "secondary"}
              >
                {STATUS_LABELS[String(header.status)]}
              </Badge>
            )}
            {header && (
              <span className="text-sm text-muted-foreground">
                v{num(header.version)} · {fmtNum(num(header.grandTotal))}{" "}
                {String(header.currency)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!header ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Lifecycle actions */}
            <div className="flex flex-wrap gap-2">
              {allowed.map(to => (
                <Button
                  key={to}
                  size="sm"
                  variant={
                    to === "cancelled" || to === "rejected"
                      ? "destructive"
                      : to === "accepted" || to === "approved"
                        ? "default"
                        : "outline"
                  }
                  disabled={transitionMut.isPending}
                  onClick={() => transitionMut.mutate({ id, to })}
                  className="press-effect"
                >
                  {STATUS_LABELS[to] ?? to}
                </Button>
              ))}
              {String(header.status) === "accepted" &&
              !header.convertedRefId ? (
                <Button
                  size="sm"
                  onClick={() => convertMut.mutate({ id })}
                  disabled={convertMut.isPending}
                  className="press-effect"
                >
                  <ArrowLeftRight className="h-3 w-3 ml-1" />
                  تحويل{" "}
                  {String(header.direction) === "sale"
                    ? "لأمر بيع"
                    : "لطلب توريد"}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => analyzeMut.mutate({ id })}
                disabled={analyzeMut.isPending}
                className="press-effect"
              >
                {analyzeMut.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin ml-1" />
                ) : (
                  <Lightbulb className="h-3 w-3 ml-1" />
                )}
                تحليل ذكي
              </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="tabs-primary flex-wrap">
                <TabsTrigger value="overview">البنود والإجماليات</TabsTrigger>
                <TabsTrigger value="lifecycle">
                  الاعتمادات (
                  {approvals.filter(a => String(a.status) === "pending").length}
                  )
                </TabsTrigger>
                <TabsTrigger value="negotiation">
                  التفاوض ({negotiations.length})
                </TabsTrigger>
                <TabsTrigger value="alternatives">
                  البدائل ({alternatives.length})
                </TabsTrigger>
                <TabsTrigger value="intelligence">الذكاء والتوصيات</TabsTrigger>
                <TabsTrigger value="links">
                  الروابط ({links.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <table className="datagrid w-full text-sm">
                  <thead>
                    <tr className="text-right text-muted-foreground">
                      <th className="p-2">البند</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">كمية</th>
                      <th className="p-2">سعر</th>
                      <th className="p-2">خصم</th>
                      <th className="p-2">ضريبة</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2">الهامش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(it => (
                      <tr
                        key={String(it.id)}
                        className="border-t border-border"
                      >
                        <td className="p-2 font-bold">{String(it.name)}</td>
                        <td className="p-2">
                          {KIND_LABELS[String(it.kind)] ?? String(it.kind)}
                        </td>
                        <td className="p-2">{String(it.quantity)}</td>
                        <td className="p-2">{fmtNum(num(it.unitPrice))}</td>
                        <td className="p-2">
                          {fmtNum(num(it.discountAmount))}
                        </td>
                        <td className="p-2">{fmtNum(num(it.taxAmount))}</td>
                        <td className="p-2 font-bold">
                          {fmtNum(num(it.lineTotal))}
                        </td>
                        <td className="p-2">{fmtNum(num(it.lineMargin))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <Card>
                    <CardContent className="pt-3">
                      المجموع: <b>{fmtNum(num(header.subtotal))}</b>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3">
                      الخصم: <b>{fmtNum(num(header.discountTotal))}</b>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3">
                      الضريبة: <b>{fmtNum(num(header.taxTotal))}</b>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3">
                      الإجمالي:{" "}
                      <b className="font-ledger">
                        {fmtNum(num(header.grandTotal))}{" "}
                        {String(header.currency)}
                      </b>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <Card>
                    <CardContent className="pt-3">
                      التكلفة: <b>{fmtNum(num(header.costTotal))}</b>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3">
                      الهامش:{" "}
                      <b>
                        {fmtNum(num(header.marginTotal))} (
                        {num(header.marginPct)}%)
                      </b>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3">
                      العمولات: <b>{fmtNum(num(header.commissionTotal))}</b>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="lifecycle" className="space-y-2">
                {approvals.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    لا توجد طلبات اعتماد — أرسل العرض للمراجعة أولاً.
                  </p>
                )}
                {approvals.map(a => (
                  <Card key={String(a.id)}>
                    <CardContent className="pt-3 flex items-center justify-between gap-2 text-sm">
                      <span>
                        المستوى {num(a.level)} · الإصدار v{num(a.versionNo)} ·{" "}
                        <b>{String(a.status)}</b>
                        {a.comment ? ` — ${String(a.comment)}` : ""}
                      </span>
                      {String(a.status) === "pending" && (
                        <span className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              approveMut.mutate({
                                approvalId: num(a.id),
                                approve: true,
                              })
                            }
                          >
                            <CheckCircle className="h-3 w-3 ml-1" /> اعتماد
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              approveMut.mutate({
                                approvalId: num(a.id),
                                approve: false,
                              })
                            }
                          >
                            <XCircle className="h-3 w-3 ml-1" /> رفض
                          </Button>
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="negotiation" className="space-y-2">
                {negotiations.map(n => (
                  <Card key={String(n.id)}>
                    <CardContent className="pt-3 text-sm">
                      <p className="font-bold">
                        الجولة {num(n.round)} ·{" "}
                        {String(n.side) === "us" ? "نحن" : "الطرف الآخر"}
                      </p>
                      <p>{String(n.message)}</p>
                      {n.proposedTotal != null && (
                        <p className="text-muted-foreground">
                          المقترح: {fmtNum(num(n.proposedTotal))}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[220px]">
                    <Label>رسالة الجولة</Label>
                    <Textarea
                      value={negMsg}
                      onChange={e => setNegMsg(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>الطرف</Label>
                    <Select
                      value={negSide}
                      onValueChange={v =>
                        setNegSide(v as "us" | "counterparty")
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">نحن</SelectItem>
                        <SelectItem value="counterparty">
                          الطرف الآخر
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      negMut.mutate({ id, side: negSide, message: negMsg })
                    }
                    disabled={!negMsg.trim() || negMut.isPending}
                  >
                    <MessageSquare className="h-3 w-3 ml-1" /> إضافة جولة
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="alternatives" className="space-y-2">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Label>اسم البديل</Label>
                    <Input
                      value={altLabel}
                      onChange={e => setAltLabel(e.target.value)}
                      placeholder="بديل اقتصادي…"
                    />
                  </div>
                  <div>
                    <Label>إجمالي البديل</Label>
                    <Input
                      type="number"
                      value={altTotal}
                      onChange={e => setAltTotal(num(e.target.value))}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      altMut.mutate({
                        quotationId: id,
                        label: altLabel,
                        items: [
                          { name: altLabel, quantity: 1, unitPrice: altTotal },
                        ],
                      })
                    }
                    disabled={!altLabel.trim() || altMut.isPending}
                  >
                    <GitBranch className="h-3 w-3 ml-1" /> إضافة بديل
                  </Button>
                </div>
                {alternatives.map(a => (
                  <Card
                    key={String(a.id)}
                    className={a.isRecommended ? "border-success" : ""}
                  >
                    <CardContent className="pt-3 flex items-center justify-between text-sm">
                      <span className="font-bold">
                        {String(a.label)} — {fmtNum(num(a.grandTotal))}
                      </span>
                      {a.isRecommended ? (
                        <Badge>
                          <Trophy className="h-3 w-3 ml-1" /> موصى به
                        </Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="intelligence" className="space-y-3">
                {!latest ? (
                  <div className="empty-state py-8 text-center text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                    لا يوجد تحليل بعد — اضغط «تحليل ذكي» لاستخراج الأسعار
                    والهوامش والمخاطر والتوصيات المفسّرة.
                  </div>
                ) : (
                  <IntelligenceView
                    analysis={latest}
                    currency={String(header.currency)}
                  />
                )}
              </TabsContent>

              <TabsContent value="links" className="space-y-2">
                {links.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    لا روابط بعد — التحويل ينشئ روابط تلقائية لأوامر البيع
                    وطلبات التوريد.
                  </p>
                )}
                {links.map(l => (
                  <Card key={String(l.id)}>
                    <CardContent className="pt-3 text-sm flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <b>{String(l.linkType)}</b> → {String(l.entityType)}#
                      {num(l.entityId)}
                      {l.notes ? (
                        <span className="text-muted-foreground">
                          — {String(l.notes)}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> المرفقات تُدار عبر
                  EntityDocuments في الوحدات المرتبطة.
                </p>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Intelligence view (Explainable) ───────────────────────────────────────

function IntelligenceView({
  analysis,
  currency,
}: {
  analysis: Record<string, unknown>;
  currency: string;
}) {
  const scores = analysis.scores as Record<string, unknown>;
  const ranking = (analysis.ranking ?? []) as Array<Record<string, unknown>>;
  const benchmarks = analysis.benchmarks as Record<string, unknown>;
  const anomalies = (analysis.anomalies ?? []) as Array<
    Record<string, unknown>
  >;
  const forecast = analysis.forecast as Record<string, unknown> | undefined;
  const recommendations = (analysis.recommendations ?? []) as Array<
    Record<string, unknown>
  >;
  const scenarios = (analysis.whatIf ?? []) as Array<Record<string, unknown>>;
  const reasons = (scores?.reasons ?? []) as string[];
  const drivers = (forecast?.drivers ?? []) as string[];

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-success rounded"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="panel-premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              التقييم المفسّر (الإجمالي {num(scores?.total)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScoreBar label="السعر" value={num(scores?.price)} />
            <ScoreBar label="الفني" value={num(scores?.technical)} />
            <ScoreBar label="التجاري" value={num(scores?.commercial)} />
            <ScoreBar label="المخاطر" value={num(scores?.risk)} />
            <ul className="text-xs text-muted-foreground space-y-1 pt-1">
              {reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="panel-premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              المعيار التاريخي والقيمة العادلة
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              العينات: <b>{num(benchmarks?.historyCount)}</b>
            </p>
            <p>
              المتوسط:{" "}
              <b>
                {fmtNum(num(benchmarks?.avgTotal))} {currency}
              </b>
            </p>
            <p>
              القيمة العادلة (وسيط):{" "}
              <b className="text-success">
                {fmtNum(num(benchmarks?.fairValue))} {currency}
              </b>
            </p>
            <p>
              النطاق المتوقع:{" "}
              <b>
                {fmtNum(num(benchmarks?.expectedLow))} –{" "}
                {fmtNum(num(benchmarks?.expectedHigh))}
              </b>
            </p>
            <p>
              معدل الفوز التاريخي:{" "}
              <b>
                {benchmarks?.winRate != null
                  ? `${num(benchmarks.winRate)}%`
                  : "—"}
              </b>
            </p>
          </CardContent>
        </Card>
      </div>

      {anomalies.length > 0 && (
        <Card className="panel-premium border-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> الشذوذ المكتشف
              ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {anomalies.map((a, i) => (
              <p key={i}>
                <Badge
                  variant={
                    String(a.severity) === "critical"
                      ? "destructive"
                      : "outline"
                  }
                  className="ml-2"
                >
                  {String(a.type)}
                </Badge>
                {String(a.message)}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="panel-premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">الترتيب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {ranking.map(r => (
              <p key={String(r.id)}>
                #{num(r.rank)} — <b>{String(r.label)}</b> ({num(r.score)})
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="panel-premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">التنبؤ بالفوز</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="flex items-center gap-2">
              {num(forecast?.winProbability) >= 50 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-warning" />
              )}
              الاحتمال: <b>{num(forecast?.winProbability)}%</b> · القيمة
              المتوقعة: <b>{fmtNum(num(forecast?.expectedValue))}</b>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {drivers.map((x, i) => (
                <li key={i}>• {x}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="panel-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            سيناريوهات What-If (محاكاة الخصم)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="datagrid w-full text-sm">
            <thead>
              <tr className="text-right text-muted-foreground">
                <th className="p-1">السيناريو</th>
                <th className="p-1">الإجمالي</th>
                <th className="p-1">الهامش%</th>
                <th className="p-1">الفوز%</th>
                <th className="p-1">ملاحظة</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-1">{String(s.scenario)}</td>
                  <td className="p-1 font-bold">
                    {fmtNum(num(s.resultTotal))}
                  </td>
                  <td className="p-1">{num(s.resultMarginPct)}%</td>
                  <td className="p-1">{num(s.winProbability)}%</td>
                  <td className="p-1 text-muted-foreground">
                    {String(s.note)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="panel-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            توصيات قابلة للتنفيذ ({recommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recommendations.map((r, i) => (
            <div key={i} className="border border-border rounded-lg p-2">
              <p className="font-bold">
                [أولوية {num(r.priority)} · أثر {String(r.impact)}]{" "}
                {String(r.action)}
              </p>
              <p className="text-muted-foreground text-xs">
                الأساس: {String(r.rationale)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
