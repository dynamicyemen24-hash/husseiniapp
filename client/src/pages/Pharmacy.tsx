/**
 * client/src/pages/Pharmacy.tsx
 * وحدة الصيدلية المتقدمة — Advanced Pharmacy Operations Center
 * FDA, WHO, JCAHO, ASHP, USP <795>/<797>, HIPAA, DSCSA, 21 CFR Part 1314
 * Prescriptions · Drug Interactions · Allergies · Controlled Substances · Recalls · Insurance
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fmtYER, fmtInt } from "@/lib/format";
import {
  Pill,
  FileText,
  Shield,
  AlertTriangle,
  Activity,
  BarChart3,
  RefreshCw,
  Plus,
  Search,
  Download,
  Sparkles,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  X,
  ChevronRight,
  Stethoscope,
  AlertOctagon,
  Heart,
  Receipt,
  History,
  BookOpen,
  Beaker,
  Calendar,
  Trash2,
  FileWarning,
  Wallet,
  Users,
  Database,
  Zap,
  Bell,
} from "lucide-react";

// ─── Status Configuration ──────────────────────────────────────────────────────
const RX_STATUS = {
  pending: { label: "بانتظار التحقق", color: "amber" },
  verified: { label: "تم التحقق", color: "sky" },
  dispensed: { label: "تم الصرف", color: "emerald" },
  cancelled: { label: "ملغاة", color: "rose" },
  expired: { label: "منتهية", color: "zinc" },
} as const;
type RxStatus = keyof typeof RX_STATUS;

const SCHEDULE_META = {
  OTC: { label: "OTC", color: "emerald", desc: "بدون وصفة" },
  PRESCRIPTION: { label: "بوصفة", color: "amber", desc: "بوصفة طبية" },
  CONTROLLED: { label: "خاضعة للرقابة", color: "rose", desc: "مواد مخدرة" },
  PSYCHOTROPIC: { label: "مؤثرات عقلية", color: "violet", desc: "مواد نفسية" },
  THERAPEUTIC: { label: "علاجية", color: "sky", desc: "أدوية علاجية" },
} as const;

const SEVERITY_META = {
  MAJOR: {
    label: "خطيرة",
    color: "rose",
    text: "text-destructive",
    bg: "bg-destructive/15 border-destructive/25",
  },
  MODERATE: {
    label: "متوسطة",
    color: "amber",
    text: "text-warning",
    bg: "bg-warning/15 border-warning/25",
  },
  MINOR: {
    label: "بسيطة",
    color: "sky",
    text: "text-info",
    bg: "bg-info/15 border-info/25",
  },
} as const;

const ALLERGY_SEV = {
  MILD: { label: "خفيفة", color: "sky" },
  MODERATE: { label: "متوسطة", color: "amber" },
  SEVERE: { label: "شديدة", color: "rose" },
  ANAPHYLAXIS: { label: "صدمة", color: "rose" },
} as const;

const RECALL_CLASS = {
  I: { label: "Class I", color: "rose", desc: "خطر شديد — سحب فوري" },
  II: { label: "Class II", color: "amber", desc: "خطر متوسط" },
  III: { label: "Class III", color: "sky", desc: "خطر منخفض" },
} as const;

const RECALL_STATUS = {
  OPEN: { label: "مفتوحة", color: "rose" },
  IN_PROGRESS: { label: "قيد التنفيذ", color: "amber" },
  RESOLVED: { label: "منجزة", color: "emerald" },
} as const;

const CLAIM_STATUS = {
  DRAFT: { label: "مسودة", color: "zinc" },
  SUBMITTED: { label: "مقدمة", color: "sky" },
  APPROVED: { label: "معتمدة", color: "emerald" },
  REJECTED: { label: "مرفوضة", color: "rose" },
  PAID: { label: "مدفوعة", color: "violet" },
} as const;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiBox({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  sub?: string;
}) {
  const colorClass =
    color === "emerald"
      ? "from-success/10 to-success/5 border-success/25 text-success"
      : color === "sky"
        ? "from-info/10 to-info/5 border-info/25 text-info"
        : color === "violet"
          ? "from-brand/10 to-brand/5 border-brand/20 text-brand"
          : color === "amber"
            ? "from-warning/10 to-warning/5 border-warning/25 text-warning"
            : color === "rose"
              ? "from-destructive/10 to-destructive/5 border-destructive/25 text-destructive"
              : "from-warning/10 to-warning/5 border-warning/20 text-warning";
  return (
    <Card className={cn("rounded-2xl border bg-gradient-to-br", colorClass)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <Icon className="w-4 h-4 opacity-70" />
          {sub && (
            <span className="text-[9px] font-bold opacity-70">{sub}</span>
          )}
        </div>
        <div className="text-xl font-black mt-1 tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PharmacyPage() {
  const [tab, setTab] = useState("dashboard");
  const utils = trpc.useUtils();
  const stats = trpc.pharmacy.getAdvancedStats.useQuery();
  const list = trpc.pharmacy.list.useQuery({ limit: 50 });
  const expiring = trpc.pharmacy.getExpiringBatches.useQuery({ daysAhead: 30 });
  const lowStock = trpc.pharmacy.getLowStockControlled.useQuery({
    threshold: 10,
  });
  const recalls = trpc.pharmacy.listDrugRecalls.useQuery();
  const claims = trpc.pharmacy.listInsuranceClaims.useQuery();
  const interactions = trpc.pharmacy.listDrugInteractions.useQuery();

  const cancelMut = trpc.pharmacy.cancel.useMutation({
    onSuccess: () => {
      utils.pharmacy.list.invalidate();
      utils.pharmacy.getAdvancedStats.invalidate();
    },
  });
  const dispenseMut = trpc.pharmacy.dispense.useMutation({
    onSuccess: () => {
      utils.pharmacy.list.invalidate();
      utils.pharmacy.getAdvancedStats.invalidate();
    },
  });
  const verifyMut = trpc.pharmacy.verify.useMutation({
    onSuccess: () => {
      utils.pharmacy.list.invalidate();
      utils.pharmacy.getAdvancedStats.invalidate();
    },
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let rows = (list.data ?? []) as any[];
    if (statusFilter !== "all")
      rows = rows.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        r =>
          (r.customerName || "").toLowerCase().includes(s) ||
          (r.prescriptionNumber || "").toLowerCase().includes(s) ||
          (r.doctorName || "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [list.data, statusFilter, search]);

  const s = stats.data;
  const kpis = [
    {
      label: "بانتظار التحقق",
      value: s?.pendingPrescriptions ?? "—",
      icon: Clock,
      color: "amber",
    },
    {
      label: "تم التحقق اليوم",
      value: s?.verifiedToday ?? "—",
      icon: CheckCircle2,
      color: "sky",
    },
    {
      label: "تم الصرف اليوم",
      value: s?.dispensedToday ?? "—",
      icon: Pill,
      color: "emerald",
    },
    {
      label: "صلاحية ≤30 يوم",
      value: s?.expiringBatches30 ?? "—",
      icon: Calendar,
      color: "rose",
    },
    {
      label: "مخزون منخفض",
      value: s?.lowStockItems ?? "—",
      icon: AlertOctagon,
      color: "amber",
    },
    {
      label: "نفد من المخزون",
      value: s?.outOfStockItems ?? "—",
      icon: X,
      color: "rose",
    },
    {
      label: "عمليات مراقبة اليوم",
      value: s?.controlledOpsToday ?? "—",
      icon: Shield,
      color: "violet",
    },
    {
      label: "سحوبات مفتوحة",
      value: s?.openRecalls ?? "—",
      icon: FileWarning,
      color: "rose",
    },
    {
      label: "مطالبات معلقة",
      value: s?.pendingClaims ?? "—",
      icon: Receipt,
      color: "sky",
    },
    {
      label: "حساسية مسجلة",
      value: s?.patientsWithAllergies ?? "—",
      icon: Heart,
      color: "violet",
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-success/20 to-info/20 border border-success/30">
                <Pill className="w-5 h-5 text-success" />
              </div>
              <div>
                <h1 className="text-xl font-black">وحدة الصيدلية المتقدمة</h1>
                <p className="text-xs text-muted-foreground">
                  وصفات · تفاعلات · حساسية · مراقبة · سحوبات · تأمين — FDA / WHO
                  / USP 797
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1"
              onClick={() => utils.pharmacy.getAdvancedStats.invalidate()}
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </Button>
            <NewPrescriptionDialog />
          </div>
        </header>

        {/* KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map(k => (
            <KpiBox key={k.label} {...k} />
          ))}
        </section>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-10 bg-card border">
            <TabsTrigger value="dashboard" className="text-xs gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> لوحة
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="text-xs gap-1">
              <FileText className="w-3.5 h-3.5" /> الوصفات
            </TabsTrigger>
            <TabsTrigger value="interactions" className="text-xs gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> التفاعلات
            </TabsTrigger>
            <TabsTrigger value="controlled" className="text-xs gap-1">
              <Shield className="w-3.5 h-3.5" /> الرقابة
            </TabsTrigger>
            <TabsTrigger value="recalls" className="text-xs gap-1">
              <FileWarning className="w-3.5 h-3.5" /> السحوبات
            </TabsTrigger>
            <TabsTrigger value="insurance" className="text-xs gap-1">
              <Receipt className="w-3.5 h-3.5" /> التأمين
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> أقرب الدفعات لانتهاء
                    الصلاحية (30 يوم)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {expiring.isLoading ? (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      جاري التحميل...
                    </div>
                  ) : (expiring.data ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      لا توجد دفعات قريبة الانتهاء
                    </div>
                  ) : (
                    (expiring.data ?? []).slice(0, 8).map((b: any) => {
                      const days = Math.ceil(
                        (new Date(b.expiryDate).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      );
                      const critical = days <= 7;
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between rounded-lg border border-border/60 p-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <div className="font-bold">
                                دفعة #{b.batchNumber}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                المنتج #{b.productId} · {b.quantity} وحدة
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              critical
                                ? "bg-destructive/20 text-destructive border-destructive/30"
                                : "bg-warning/20 text-warning border-warning/30"
                            )}
                          >
                            {days} يوم
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4" /> تنبيهات سريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2 text-xs">
                  {(s?.expiringBatches30 ?? 0) > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-warning/15 p-2 flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-warning mt-0.5" />
                      <div>
                        <div className="font-bold text-warning">
                          {s?.expiringBatches30} دفعة تنتهي خلال 30 يوم
                        </div>
                        <div className="text-[10px] text-warning">
                          يُنصح بتشغيل ترويج FEFO
                        </div>
                      </div>
                    </div>
                  )}
                  {(s?.lowStockItems ?? 0) > 0 && (
                    <div className="rounded-lg border border-rose-300 bg-destructive/15 p-2 flex items-start gap-2">
                      <AlertOctagon className="w-3.5 h-3.5 text-destructive mt-0.5" />
                      <div>
                        <div className="font-bold text-destructive">
                          {s?.lowStockItems} منتج تحت الحد الأدنى
                        </div>
                        <div className="text-[10px] text-destructive">
                          راجع أوامر الشراء
                        </div>
                      </div>
                    </div>
                  )}
                  {(s?.openRecalls ?? 0) > 0 && (
                    <div className="rounded-lg border border-rose-300 bg-destructive/15 p-2 flex items-start gap-2">
                      <FileWarning className="w-3.5 h-3.5 text-destructive mt-0.5" />
                      <div>
                        <div className="font-bold text-destructive">
                          {s?.openRecalls} سحب دوائي مفتوح
                        </div>
                        <div className="text-[10px] text-destructive">
                          اتبع بروتوكول FDA 21 CFR 7.40
                        </div>
                      </div>
                    </div>
                  )}
                  {(s?.pendingClaims ?? 0) > 0 && (
                    <div className="rounded-lg border border-sky-300 bg-info/15 p-2 flex items-start gap-2">
                      <Receipt className="w-3.5 h-3.5 text-info mt-0.5" />
                      <div>
                        <div className="font-bold text-info">
                          {s?.pendingClaims} مطالبة تأمين معلقة
                        </div>
                      </div>
                    </div>
                  )}
                  {(!s ||
                    (s.expiringBatches30 === 0 &&
                      s.lowStockItems === 0 &&
                      s.openRecalls === 0 &&
                      s.pendingClaims === 0)) && (
                    <div className="text-center text-muted-foreground py-6">
                      لا توجد تنبيهات حالياً ✓
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Low stock panel */}
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" /> الأدوية الخاضعة للرقابة —
                  مخزون منخفض
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">المنتج</th>
                        <th className="p-3 text-center">SKU</th>
                        <th className="p-3 text-center">المخزون</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.isLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : (lowStock.data ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جميع المخزونات كافية
                          </td>
                        </tr>
                      ) : (
                        (lowStock.data ?? []).map((p: any) => (
                          <tr
                            key={p.id}
                            className="border-b border-border/50 hover:bg-panel/30"
                          >
                            <td className="p-3 font-bold">{p.name}</td>
                            <td className="p-3 text-center text-muted-foreground">
                              {p.sku || "—"}
                            </td>
                            <td className="p-3 text-center font-black tabular-nums">
                              {p.currentStock}
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                                منخفض
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-3">
            <Card className="rounded-2xl">
              <CardContent className="p-3 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="بحث برقم الوصفة، اسم المريض، أو الطبيب..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-9 pr-8 text-xs"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {(Object.keys(RX_STATUS) as RxStatus[]).map(k => (
                      <SelectItem key={k} value={k}>
                        {RX_STATUS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1"
                  onClick={() => {
                    const csv = [
                      [
                        "رقم الوصفة",
                        "المريض",
                        "الطبيب",
                        "تاريخ الإصدار",
                        "تاريخ الانتهاء",
                        "الحالة",
                      ].join(","),
                      ...filtered.map((r: any) =>
                        [
                          r.prescriptionNumber,
                          r.customerName,
                          r.doctorName,
                          r.issueDate,
                          r.expiryDate,
                          RX_STATUS[r.status as RxStatus]?.label || r.status,
                        ].join(",")
                      ),
                    ].join("\n");
                    const blob = new Blob([csv], {
                      type: "text/csv;charset=utf-8",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `prescriptions-${Date.now()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-3.5 h-3.5" /> تصدير
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">رقم الوصفة</th>
                        <th className="p-3 text-right">المريض</th>
                        <th className="p-3 text-right">الطبيب</th>
                        <th className="p-3 text-center">الإصدار</th>
                        <th className="p-3 text-center">الانتهاء</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.isLoading ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-6 text-center text-muted-foreground"
                          >
                            لا توجد وصفات
                          </td>
                        </tr>
                      ) : (
                        filtered.map((r: any) => {
                          const meta =
                            RX_STATUS[r.status as RxStatus] ||
                            RX_STATUS.pending;
                          return (
                            <tr
                              key={r.id}
                              className="border-b border-border/50 hover:bg-panel/30"
                            >
                              <td className="p-3 font-mono text-[11px]">
                                {r.prescriptionNumber || `#${r.id}`}
                              </td>
                              <td className="p-3 font-bold">
                                {r.customerName}
                              </td>
                              <td className="p-3">{r.doctorName}</td>
                              <td className="p-3 text-center text-muted-foreground">
                                {r.issueDate}
                              </td>
                              <td className="p-3 text-center text-muted-foreground">
                                {r.expiryDate}
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    meta.color === "emerald"
                                      ? "bg-success/20 text-success border-success/30"
                                      : meta.color === "amber"
                                        ? "bg-warning/20 text-warning border-warning/30"
                                        : meta.color === "rose"
                                          ? "bg-destructive/20 text-destructive border-destructive/30"
                                          : meta.color === "sky"
                                            ? "bg-info/20 text-info border-info/30"
                                            : "bg-zinc-500/20 text-zinc-700 border-zinc-500/30"
                                  )}
                                >
                                  {meta.label}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {r.status === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] gap-1"
                                      disabled={verifyMut.isPending}
                                      onClick={() =>
                                        verifyMut.mutate({ id: r.id })
                                      }
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> تحقق
                                    </Button>
                                  )}
                                  {r.status === "verified" && (
                                    <Button
                                      size="sm"
                                      className="h-7 text-[10px] gap-1 bg-success hover:opacity-90"
                                      disabled={dispenseMut.isPending}
                                      onClick={() =>
                                        dispenseMut.mutate({ id: r.id })
                                      }
                                    >
                                      <Pill className="w-3 h-3" /> صرف
                                    </Button>
                                  )}
                                  {(r.status === "pending" ||
                                    r.status === "verified") && (
                                    <CancelDialog
                                      id={r.id}
                                      onCancel={reason =>
                                        cancelMut.mutate({ id: r.id, reason })
                                      }
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <InteractionChecker />
              <AllergyManager />
            </div>
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" /> قاعدة بيانات التفاعلات
                  الدوائية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid max-h-96">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">الدواء A</th>
                        <th className="p-3 text-right">الدواء B</th>
                        <th className="p-3 text-center">الخطورة</th>
                        <th className="p-3 text-right">الوصف</th>
                        <th className="p-3 text-center">المصدر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interactions.isLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : (interactions.data ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-6 text-center text-muted-foreground"
                          >
                            لا توجد تفاعلات مسجلة بعد
                          </td>
                        </tr>
                      ) : (
                        (interactions.data ?? []).map((i: any) => {
                          const sev =
                            SEVERITY_META[
                              i.severity as keyof typeof SEVERITY_META
                            ] || SEVERITY_META.MINOR;
                          return (
                            <tr
                              key={i.id}
                              className="border-b border-border/50 hover:bg-panel/30"
                            >
                              <td className="p-3 font-bold">{i.drugA}</td>
                              <td className="p-3 font-bold">{i.drugB}</td>
                              <td className="p-3 text-center">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    sev.color === "rose"
                                      ? "bg-destructive/20 text-destructive border-destructive/30"
                                      : sev.color === "amber"
                                        ? "bg-warning/20 text-warning border-warning/30"
                                        : "bg-info/20 text-info border-info/30"
                                  )}
                                >
                                  {sev.label}
                                </Badge>
                              </td>
                              <td className="p-3 text-[11px]">
                                {i.description}
                              </td>
                              <td className="p-3 text-center text-[10px] text-muted-foreground">
                                {i.source || "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controlled Substances Tab */}
          <TabsContent value="controlled" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> المواد الخاضعة للرقابة — DEA /
                  DSCSA Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 space-y-1">
                  <div className="font-bold text-violet-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> معايير الامتثال
                  </div>
                  <ul className="text-[11px] text-brand space-y-0.5 pr-4 list-disc">
                    <li>
                      DSCSA — Drug Supply Chain Security Act (تتبع سلسلة
                      التوريد)
                    </li>
                    <li>21 CFR Part 1304 — سجلات المواد الخاضعة للرقابة</li>
                    <li>USP 797 — خلط معقم</li>
                    <li>HIPAA — خصوصية بيانات المرضى</li>
                    <li>DEA Form 222 — أوامر شراء المخدرات</li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                  <KpiBox
                    label="عمليات اليوم"
                    value={s?.controlledOpsToday ?? "—"}
                    icon={Activity}
                    color="violet"
                  />
                  <KpiBox
                    label="مخزون منخفض"
                    value={s?.lowStockItems ?? "—"}
                    icon={AlertOctagon}
                    color="amber"
                  />
                  <KpiBox
                    label="نفد المخزون"
                    value={s?.outOfStockItems ?? "—"}
                    icon={X}
                    color="rose"
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm">
                  جرد المواد الخاضعة للرقابة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">المنتج</th>
                        <th className="p-3 text-center">التصنيف</th>
                        <th className="p-3 text-center">المخزون</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.isLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : (lowStock.data ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جميع المخزونات في الحدود الآمنة
                          </td>
                        </tr>
                      ) : (
                        (lowStock.data ?? []).map((p: any) => (
                          <tr
                            key={p.id}
                            className="border-b border-border/50 hover:bg-panel/30"
                          >
                            <td className="p-3 font-bold">{p.name}</td>
                            <td className="p-3 text-center">
                              <Badge className="bg-brand/20 text-brand border-brand/30 text-[10px]">
                                CONTROLLED
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-black tabular-nums">
                              {p.currentStock}
                            </td>
                            <td className="p-3 text-center">
                              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                                حرج
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recalls Tab */}
          <TabsContent value="recalls" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <FileWarning className="w-4 h-4" /> إدارة سحوبات الأدوية (FDA 21
                CFR 7.40–7.59)
              </h2>
              <NewRecallDialog />
            </div>
            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">المنتج</th>
                        <th className="p-3 text-center">الفئة</th>
                        <th className="p-3 text-right">السبب</th>
                        <th className="p-3 text-center">التاريخ</th>
                        <th className="p-3 text-center">الإجراء</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalls.isLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : (recalls.data ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-6 text-center text-muted-foreground"
                          >
                            لا توجد سحوبات مسجلة
                          </td>
                        </tr>
                      ) : (
                        (recalls.data ?? []).map((r: any) => {
                          const cls =
                            RECALL_CLASS[
                              r.recallClass as keyof typeof RECALL_CLASS
                            ] || RECALL_CLASS.III;
                          const stt =
                            RECALL_STATUS[
                              r.status as keyof typeof RECALL_STATUS
                            ] || RECALL_STATUS.OPEN;
                          return (
                            <tr
                              key={r.id}
                              className="border-b border-border/50 hover:bg-panel/30"
                            >
                              <td className="p-3 font-bold">{r.productName}</td>
                              <td className="p-3 text-center">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    cls.color === "rose"
                                      ? "bg-destructive/20 text-destructive border-destructive/30"
                                      : cls.color === "amber"
                                        ? "bg-warning/20 text-warning border-warning/30"
                                        : "bg-info/20 text-info border-info/30"
                                  )}
                                >
                                  {cls.label}
                                </Badge>
                              </td>
                              <td className="p-3 text-[11px] max-w-xs truncate">
                                {r.reason}
                              </td>
                              <td className="p-3 text-center text-muted-foreground">
                                {r.recallDate}
                              </td>
                              <td className="p-3 text-center text-[10px]">
                                {r.action}
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    stt.color === "rose"
                                      ? "bg-destructive/20 text-destructive border-destructive/30"
                                      : stt.color === "amber"
                                        ? "bg-warning/20 text-warning border-warning/30"
                                        : stt.color === "emerald"
                                          ? "bg-success/20 text-success border-success/30"
                                          : "bg-zinc-500/20 text-zinc-700 border-zinc-500/30"
                                  )}
                                >
                                  {stt.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4" /> مطالبات التأمين الدوائي
              </h2>
              <NewClaimDialog />
            </div>
            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">رقم المطالبة</th>
                        <th className="p-3 text-right">المريض</th>
                        <th className="p-3 text-right">شركة التأمين</th>
                        <th className="p-3 text-center">المبلغ</th>
                        <th className="p-3 text-center">المساهمة</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.isLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-6 text-center text-muted-foreground"
                          >
                            جاري التحميل...
                          </td>
                        </tr>
                      ) : (claims.data ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-6 text-center text-muted-foreground"
                          >
                            لا توجد مطالبات
                          </td>
                        </tr>
                      ) : (
                        (claims.data ?? []).map((c: any) => {
                          const stt =
                            CLAIM_STATUS[
                              c.status as keyof typeof CLAIM_STATUS
                            ] || CLAIM_STATUS.DRAFT;
                          return (
                            <tr
                              key={c.id}
                              className="border-b border-border/50 hover:bg-panel/30"
                            >
                              <td className="p-3 font-mono text-[11px]">
                                {c.claimNumber}
                              </td>
                              <td className="p-3 font-bold">
                                {c.customerName}
                              </td>
                              <td className="p-3">{c.insuranceProvider}</td>
                              <td className="p-3 text-center font-black tabular-nums">
                                {fmtYER(Number(c.totalAmount))}
                              </td>
                              <td className="p-3 text-center tabular-nums">
                                {fmtYER(Number(c.copayAmount || 0))}
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    stt.color === "emerald"
                                      ? "bg-success/20 text-success border-success/30"
                                      : stt.color === "rose"
                                        ? "bg-destructive/20 text-destructive border-destructive/30"
                                        : stt.color === "sky"
                                          ? "bg-info/20 text-info border-info/30"
                                          : stt.color === "violet"
                                            ? "bg-brand/20 text-brand border-brand/30"
                                            : "bg-zinc-500/20 text-zinc-700 border-zinc-500/30"
                                  )}
                                >
                                  {stt.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Standards footer */}
        <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-bold mb-2">
              <Sparkles className="w-4 h-4" /> المعايير والامتثال المعتمد
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] text-muted-foreground">
              {[
                { title: "FDA", desc: "إدارة الغذاء والدواء الأمريكية" },
                { title: "WHO", desc: "منظمة الصحة العالمية" },
                { title: "USP 797", desc: "الخلط المعقم للأدوية" },
                { title: "JCAHO", desc: "اعتماد المنشآت الصحية" },
                { title: "ASHP", desc: "معايير صيدلة المستشفيات" },
                { title: "DSCSA", desc: "تتبع سلسلة التوريد" },
              ].map(s => (
                <div
                  key={s.title}
                  className="rounded-lg border border-border p-2 bg-card"
                >
                  <div className="font-bold text-foreground">{s.title}</div>
                  <div>{s.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function NewPrescriptionDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    doctorName: "",
    doctorLicense: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "",
  });
  const createMut = trpc.pharmacy.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setForm({
        ...form,
        customerId: "",
        customerName: "",
        doctorName: "",
        doctorLicense: "",
        notes: "",
      });
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-9 text-xs gap-1 bg-success hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" /> وصفة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> إنشاء وصفة طبية جديدة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div>
            <Label className="text-[11px] mb-1 block">رقم المريض *</Label>
            <Input
              className="h-8 text-xs"
              value={form.customerId}
              onChange={e => setForm({ ...form, customerId: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block">اسم المريض *</Label>
            <Input
              className="h-8 text-xs"
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block">اسم الطبيب *</Label>
            <Input
              className="h-8 text-xs"
              value={form.doctorName}
              onChange={e => setForm({ ...form, doctorName: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[11px] mb-1 block">رقم ترخيص الطبيب *</Label>
            <Input
              className="h-8 text-xs"
              value={form.doctorLicense}
              onChange={e =>
                setForm({ ...form, doctorLicense: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] mb-1 block">تاريخ الإصدار</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.issueDate}
                onChange={e => setForm({ ...form, issueDate: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block">تاريخ الانتهاء</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.expiryDate}
                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] mb-1 block">ملاحظات</Label>
            <Input
              className="h-8 text-xs"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            إلغاء
          </Button>
          <Button
            size="sm"
            disabled={
              createMut.isPending || !form.customerName || !form.doctorName
            }
            onClick={() => createMut.mutate({ ...form, items: [] } as any)}
            className="h-8 text-xs bg-success hover:opacity-90"
          >
            {createMut.isPending ? "جاري الحفظ..." : "حفظ الوصفة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  id,
  onCancel,
}: {
  id: number;
  onCancel: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
        >
          <X className="w-3 h-3" /> إلغاء
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">إلغاء الوصفة #{id}</DialogTitle>
        </DialogHeader>
        <div>
          <Label className="text-[11px] mb-1 block">
            سبب الإلغاء (إلزامي — يُسجل في سجل التدقيق)
          </Label>
          <Input
            className="h-8 text-xs"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="مثال: تكرار وصفة"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            تراجع
          </Button>
          <Button
            size="sm"
            disabled={reason.length < 3}
            onClick={() => {
              onCancel(reason);
              setOpen(false);
            }}
            className="h-8 text-xs bg-destructive hover:bg-rose-700"
          >
            تأكيد الإلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InteractionChecker() {
  const [drugA, setDrugA] = useState("");
  const [drugB, setDrugB] = useState("");
  const check = trpc.pharmacy.checkAdvancedInteractions.useQuery(
    { productIds: [] },
    { enabled: false }
  );
  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" /> فحص تفاعل دوائي فوري
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2 text-xs">
        <div>
          <Label className="text-[11px] mb-1 block">الدواء الأول</Label>
          <Input
            className="h-8 text-xs"
            value={drugA}
            onChange={e => setDrugA(e.target.value)}
            placeholder="مثال: warfarin"
          />
        </div>
        <div>
          <Label className="text-[11px] mb-1 block">الدواء الثاني</Label>
          <Input
            className="h-8 text-xs"
            value={drugB}
            onChange={e => setDrugB(e.target.value)}
            placeholder="مثال: aspirin"
          />
        </div>
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => check.refetch()}
        >
          فحص التفاعل
        </Button>
        {check.data && (
          <div className="rounded-lg border p-2 mt-2">
            {check.data.hasInteractions ? (
              <div className="space-y-1">
                <div className="text-destructive font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> تم رصد{" "}
                  {check.data.interactions.length} تفاعل
                </div>
                {check.data.interactions.map((i: any, idx: number) => {
                  const sev =
                    SEVERITY_META[i.severity as keyof typeof SEVERITY_META];
                  return (
                    <div
                      key={idx}
                      className={cn("rounded border p-2 text-[11px]", sev?.bg)}
                    >
                      <div className={cn("font-bold", sev?.text)}>
                        {sev?.label} — {i.drugA} + {i.drugB}
                      </div>
                      <div className="mt-0.5">{i.description}</div>
                      {i.recommendation && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          ↳ {i.recommendation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-success flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> لا يوجد تفاعل معروف
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AllergyManager() {
  const allergies = trpc.pharmacy.listPatientAllergies.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    allergen: "",
    allergenType: "DRUG" as "DRUG" | "FOOD" | "LATEX" | "OTHER",
    severity: "MODERATE" as "MILD" | "MODERATE" | "SEVERE" | "ANAPHYLAXIS",
    reaction: "",
  });
  const utils = trpc.useUtils();
  const addMut = trpc.pharmacy.addPatientAllergy.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.pharmacy.listPatientAllergies.invalidate();
    },
  });
  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="w-4 h-4" /> سجل حساسية المرضى
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] gap-1"
            >
              <Plus className="w-3 h-3" /> إضافة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">تسجيل حساسية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-xs">
              <Input
                className="h-8 text-xs"
                placeholder="رقم المريض"
                value={form.customerId}
                onChange={e => setForm({ ...form, customerId: e.target.value })}
              />
              <Input
                className="h-8 text-xs"
                placeholder="اسم المريض"
                value={form.customerName}
                onChange={e =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
              <Input
                className="h-8 text-xs"
                placeholder="مادة الحساسية"
                value={form.allergen}
                onChange={e => setForm({ ...form, allergen: e.target.value })}
              />
              <Select
                value={form.allergenType}
                onValueChange={(v: any) =>
                  setForm({ ...form, allergenType: v })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRUG">دواء</SelectItem>
                  <SelectItem value="FOOD">طعام</SelectItem>
                  <SelectItem value="LATEX">لاتكس</SelectItem>
                  <SelectItem value="OTHER">أخرى</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={form.severity}
                onValueChange={(v: any) => setForm({ ...form, severity: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">خفيفة</SelectItem>
                  <SelectItem value="MODERATE">متوسطة</SelectItem>
                  <SelectItem value="SEVERE">شديدة</SelectItem>
                  <SelectItem value="ANAPHYLAXIS">صدمة تأقية</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="h-8 text-xs"
                placeholder="التفاعل المرصود"
                value={form.reaction}
                onChange={e => setForm({ ...form, reaction: e.target.value })}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                disabled={
                  !form.customerName || !form.allergen || addMut.isPending
                }
                onClick={() => addMut.mutate(form)}
                className="h-8 text-xs"
              >
                {addMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-y-auto max-h-80">
          {allergies.isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              جاري التحميل...
            </div>
          ) : (allergies.data ?? []).length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              لا توجد حساسيات مسجلة
            </div>
          ) : (
            (allergies.data ?? []).slice(0, 10).map((a: any) => {
              const sev =
                ALLERGY_SEV[a.severity as keyof typeof ALLERGY_SEV] ||
                ALLERGY_SEV.MODERATE;
              return (
                <div
                  key={a.id}
                  className="border-b border-border/50 p-2 text-xs flex items-center justify-between hover:bg-panel/30"
                >
                  <div>
                    <div className="font-bold">{a.customerName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {a.allergen} · {a.allergenType}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      sev.color === "rose"
                        ? "bg-destructive/20 text-destructive border-destructive/30"
                        : sev.color === "amber"
                          ? "bg-warning/20 text-warning border-warning/30"
                          : "bg-info/20 text-info border-info/30"
                    )}
                  >
                    {sev.label}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewRecallDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    batchNumber: "",
    recallClass: "II" as "I" | "II" | "III",
    reason: "",
    manufacturer: "",
    recallDate: new Date().toISOString().split("T")[0],
    initiatedBy: "",
    affectedQuantity: 0,
    action: "QUARANTINE" as "RETURN" | "DESTROY" | "QUARANTINE" | "NOTIFY",
  });
  const utils = trpc.useUtils();
  const createMut = trpc.pharmacy.createDrugRecall.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.pharmacy.listDrugRecalls.invalidate();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 text-xs gap-1 bg-destructive hover:bg-rose-700"
        >
          <Plus className="w-3.5 h-3.5" /> تسجيل سحب
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">تسجيل سحب دوائي</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <Input
            className="h-8 text-xs"
            placeholder="اسم المنتج *"
            value={form.productName}
            onChange={e => setForm({ ...form, productName: e.target.value })}
          />
          <Input
            className="h-8 text-xs"
            placeholder="رقم الدفعة"
            value={form.batchNumber}
            onChange={e => setForm({ ...form, batchNumber: e.target.value })}
          />
          <Select
            value={form.recallClass}
            onValueChange={(v: any) => setForm({ ...form, recallClass: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I">Class I — خطر شديد</SelectItem>
              <SelectItem value="II">Class II — خطر متوسط</SelectItem>
              <SelectItem value="III">Class III — خطر منخفض</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs"
            placeholder="سبب السحب *"
            value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })}
          />
          <Input
            className="h-8 text-xs"
            placeholder="الشركة المصنعة"
            value={form.manufacturer}
            onChange={e => setForm({ ...form, manufacturer: e.target.value })}
          />
          <Input
            type="number"
            className="h-8 text-xs"
            placeholder="الكمية المتأثرة"
            value={form.affectedQuantity}
            onChange={e =>
              setForm({ ...form, affectedQuantity: Number(e.target.value) })
            }
          />
          <Select
            value={form.action}
            onValueChange={(v: any) => setForm({ ...form, action: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RETURN">إرجاع</SelectItem>
              <SelectItem value="DESTROY">إتلاف</SelectItem>
              <SelectItem value="QUARANTINE">حجر</SelectItem>
              <SelectItem value="NOTIFY">إشعار</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            إلغاء
          </Button>
          <Button
            size="sm"
            disabled={!form.productName || !form.reason || createMut.isPending}
            onClick={() => createMut.mutate(form)}
            className="h-8 text-xs bg-destructive hover:bg-rose-700"
          >
            {createMut.isPending ? "جاري..." : "تسجيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewClaimDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    insuranceProvider: "",
    policyNumber: "",
    totalAmount: 0,
    notes: "",
  });
  const utils = trpc.useUtils();
  const createMut = trpc.pharmacy.createInsuranceClaim.useMutation({
    onSuccess: () => {
      setOpen(false);
      utils.pharmacy.listInsuranceClaims.invalidate();
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> مطالبة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">إنشاء مطالبة تأمين</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <Input
            className="h-8 text-xs"
            placeholder="رقم المريض *"
            value={form.customerId}
            onChange={e => setForm({ ...form, customerId: e.target.value })}
          />
          <Input
            className="h-8 text-xs"
            placeholder="اسم المريض *"
            value={form.customerName}
            onChange={e => setForm({ ...form, customerName: e.target.value })}
          />
          <Input
            className="h-8 text-xs"
            placeholder="شركة التأمين *"
            value={form.insuranceProvider}
            onChange={e =>
              setForm({ ...form, insuranceProvider: e.target.value })
            }
          />
          <Input
            className="h-8 text-xs"
            placeholder="رقم البوليصة *"
            value={form.policyNumber}
            onChange={e => setForm({ ...form, policyNumber: e.target.value })}
          />
          <Input
            type="number"
            className="h-8 text-xs"
            placeholder="المبلغ الإجمالي *"
            value={form.totalAmount}
            onChange={e =>
              setForm({ ...form, totalAmount: Number(e.target.value) })
            }
          />
          <Input
            className="h-8 text-xs"
            placeholder="ملاحظات"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            إلغاء
          </Button>
          <Button
            size="sm"
            disabled={
              !form.customerName ||
              !form.insuranceProvider ||
              !form.policyNumber ||
              form.totalAmount <= 0 ||
              createMut.isPending
            }
            onClick={() => createMut.mutate(form)}
            className="h-8 text-xs"
          >
            {createMut.isPending ? "جاري..." : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
