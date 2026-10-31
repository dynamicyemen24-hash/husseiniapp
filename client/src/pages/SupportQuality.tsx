import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import {
  LifeBuoy,
  Ticket,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

const TICKET_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "مفتوح", tone: "sky" },
  in_progress: { label: "قيد المعالجة", tone: "amber" },
  resolved: { label: "محلول", tone: "emerald" },
  closed: { label: "مغلق", tone: "neutral" },
};
const TICKET_PRIORITY: Record<string, { label: string; tone: string }> = {
  low: { label: "منخفض", tone: "neutral" },
  medium: { label: "متوسط", tone: "sky" },
  high: { label: "مرتفع", tone: "amber" },
  urgent: { label: "عاجل", tone: "rose" },
};
const INSPECTION_RESULT: Record<string, { label: string; tone: string }> = {
  pass: { label: "مطابق", tone: "emerald" },
  fail: { label: "غير مطابق", tone: "rose" },
  conditional: { label: "بشروط", tone: "amber" },
};

function Badge({
  tone,
  children,
}: {
  tone: string;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/12 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/12 text-rose-300 border-rose-500/30",
    sky: "bg-sky-500/12 text-sky-300 border-sky-500/30",
    neutral: "bg-muted text-muted-foreground border-line",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
        tones[tone] ?? tones.neutral
      )}
    >
      {children}
    </span>
  );
}

const emptyTicket = {
  subject: "",
  description: "",
  customerName: "",
  customerPhone: "",
  priority: "medium",
  status: "open",
};
const emptyInsp = {
  code: "",
  title: "",
  type: "",
  result: "pass",
  score: "",
  note: "",
};

export default function SupportQuality() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<
    "overview" | "tickets" | "inspections" | "analytics"
  >("overview");
  const [statusFilter, setStatusFilter] = useState("all");

  const [tkOpen, setTkOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [ticket, setTicket] = useState(emptyTicket);

  const [inspOpen, setInspOpen] = useState(false);
  const [insp, setInsp] = useState(emptyInsp);

  const ticketsQ = trpc.erp.listTickets.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter },
    { placeholderData: p => p }
  );
  const inspectionsQ = trpc.erp.listInspections.useQuery(undefined, {
    placeholderData: p => p,
  });
  const supportStatsQ = trpc.erp.supportStats.useQuery(undefined, {
    enabled: tab === "analytics",
  });

  const createTk = trpc.erp.createTicket.useMutation({
    onSuccess: () => utils.erp.listTickets.invalidate(),
  });
  const updateTk = trpc.erp.updateTicket.useMutation({
    onSuccess: () => utils.erp.listTickets.invalidate(),
  });
  const deleteTk = trpc.erp.deleteTicket.useMutation({
    onSuccess: () => utils.erp.listTickets.invalidate(),
  });
  const createInsp = trpc.erp.createInspection.useMutation({
    onSuccess: () => utils.erp.listInspections.invalidate(),
  });
  const deleteInsp = trpc.erp.deleteInspection.useMutation({
    onSuccess: () => utils.erp.listInspections.invalidate(),
  });

  const tk = ticketsQ.data ?? [];
  const inspList = inspectionsQ.data ?? [];

  const openTk = tk.filter((t: any) => t.status === "open").length;
  const inProgTk = tk.filter((t: any) => t.status === "in_progress").length;
  const resolvedTk = tk.filter(
    (t: any) => t.status === "resolved" || t.status === "closed"
  ).length;
  const passInsp = inspList.filter((i: any) => i.result === "pass").length;
  const failInsp = inspList.filter((i: any) => i.result === "fail").length;
  const condInsp = inspList.filter(
    (i: any) => i.result === "conditional"
  ).length;

  function openTkForm(row?: any) {
    setEditing(row ?? null);
    setTicket(row ? { ...emptyTicket, ...row } : emptyTicket);
    setTkOpen(true);
  }
  function saveTk() {
    const run = editing
      ? updateTk.mutateAsync({
          id: editing.id,
          status: ticket.status,
          priority: ticket.priority,
        })
      : createTk.mutateAsync({
          subject: ticket.subject,
          description: ticket.description || undefined,
          customerName: ticket.customerName || undefined,
          customerPhone: ticket.customerPhone || undefined,
          priority: ticket.priority,
        });
    run.then(() => setTkOpen(false));
  }
  function saveInsp() {
    createInsp
      .mutateAsync({
        code: insp.code,
        title: insp.title,
        type: insp.type || undefined,
        result: insp.result,
        score: insp.score || undefined,
        note: insp.note || undefined,
      })
      .then(() => setInspOpen(false));
  }

  const tabBtn = (k: any, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setTab(k)}
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
        tab === k
          ? "bg-brand text-ink-deep shadow"
          : "bg-panel/60 text-muted hover:bg-panel hover:text-ink"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex">
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand">
                <LifeBuoy className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-ink">الدعم والجودة</h1>
                <p className="text-sm text-muted">
                  إدارة تذاكر الدعم وعمليات التفتيش والجودة
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabBtn(
              "overview",
              "نظرة عامة",
              <ClipboardList className="h-4 w-4" />
            )}
            {tabBtn("tickets", "تذاكر الدعم", <Ticket className="h-4 w-4" />)}
            {tabBtn(
              "inspections",
              "التفتيش والجودة",
              <ShieldCheck className="h-4 w-4" />
            )}
            {tabBtn(
              "analytics",
              "تحليلات الخدمة",
              <TrendingUp className="h-4 w-4" />
            )}
          </div>
        </div>

        <div className="mt-6">
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label="تذاكر مفتوحة"
                  value={openTk}
                  tone="info"
                  icon={AlertCircle}
                />
                <StatCard
                  label="قيد المعالجة"
                  value={inProgTk}
                  tone="warning"
                  icon={Loader2}
                />
                <StatCard
                  label="محلولة/مغلقة"
                  value={resolvedTk}
                  tone="positive"
                  icon={CheckCircle2}
                />
                <StatCard
                  label="عمليات تفتيش"
                  value={inspList.length}
                  tone="neutral"
                  icon={ShieldCheck}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-line bg-surface/80 p-5">
                  <h3 className="mb-3 text-sm font-bold text-ink">
                    أحدث التذاكر
                  </h3>
                  {tk.length === 0 ? (
                    <p className="text-sm text-muted">لا توجد تذاكر.</p>
                  ) : (
                    <div className="space-y-2">
                      {tk.slice(0, 6).map((t: any) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-xl bg-panel/50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-ink">
                              {t.subject}
                            </div>
                            <div className="text-xs text-muted">
                              {t.ticketNumber} · {t.customerName || "—"}
                            </div>
                          </div>
                          <Badge
                            tone={TICKET_STATUS[t.status]?.tone ?? "neutral"}
                          >
                            {TICKET_STATUS[t.status]?.label ?? t.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-line bg-surface/80 p-5">
                  <h3 className="mb-3 text-sm font-bold text-ink">
                    نتائج التفتيش
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-panel/50 p-3">
                      <div className="text-2xl font-black text-emerald-400">
                        {passInsp}
                      </div>
                      <div className="text-xs text-muted">مطابق</div>
                    </div>
                    <div className="rounded-xl bg-panel/50 p-3">
                      <div className="text-2xl font-black text-rose-400">
                        {failInsp}
                      </div>
                      <div className="text-xs text-muted">غير مطابق</div>
                    </div>
                    <div className="rounded-xl bg-panel/50 p-3">
                      <div className="text-2xl font-black text-amber-400">
                        {condInsp}
                      </div>
                      <div className="text-xs text-muted">بشروط</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    نسبة المطابقة:{" "}
                    {inspList.length
                      ? Math.round((passInsp / inspList.length) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "tickets" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="open">مفتوح</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">محلول</SelectItem>
                    <SelectItem value="closed">مغلق</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => openTkForm()}
                  className="bg-brand text-ink-deep font-bold"
                >
                  <Plus className="h-4 w-4" /> تذكرة جديدة
                </Button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
                <table className="w-full text-sm">
                  <thead className="bg-panel/60 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 text-right">الرقم</th>
                      <th className="px-3 py-2 text-right">الموضوع</th>
                      <th className="px-3 py-2 text-right">الأولوية</th>
                      <th className="px-3 py-2 text-right">الحالة</th>
                      <th className="px-3 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketsQ.isPending ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-10 text-center text-muted"
                        >
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </td>
                      </tr>
                    ) : tk.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-10 text-center text-muted"
                        >
                          لا توجد تذاكر.
                        </td>
                      </tr>
                    ) : (
                      tk.map((t: any) => (
                        <tr
                          key={t.id}
                          className="border-t border-line/60 hover:bg-panel/30"
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {t.ticketNumber}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-ink">
                              {t.subject}
                            </div>
                            <div className="text-xs text-muted">
                              {t.customerName || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              tone={
                                TICKET_PRIORITY[t.priority]?.tone ?? "neutral"
                              }
                            >
                              {TICKET_PRIORITY[t.priority]?.label ?? t.priority}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              tone={TICKET_STATUS[t.status]?.tone ?? "neutral"}
                            >
                              {TICKET_STATUS[t.status]?.label ?? t.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openTkForm(t)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-400"
                                onClick={() => {
                                  if (confirm(`حذف التذكرة «${t.subject}»؟`))
                                    deleteTk.mutate(t.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "inspections" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setInspOpen(true)}
                  className="bg-brand text-ink-deep font-bold"
                >
                  <Plus className="h-4 w-4" /> فحص جديد
                </Button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
                <table className="w-full text-sm">
                  <thead className="bg-panel/60 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 text-right">الكود</th>
                      <th className="px-3 py-2 text-right">العنوان</th>
                      <th className="px-3 py-2 text-right">النوع</th>
                      <th className="px-3 py-2 text-right">النتيجة</th>
                      <th className="px-3 py-2 text-right">الدرجة</th>
                      <th className="px-3 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionsQ.isPending ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-10 text-center text-muted"
                        >
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </td>
                      </tr>
                    ) : inspList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-10 text-center text-muted"
                        >
                          لا توجد عمليات تفتيش.
                        </td>
                      </tr>
                    ) : (
                      inspList.map((i: any) => (
                        <tr
                          key={i.id}
                          className="border-t border-line/60 hover:bg-panel/30"
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {i.code}
                          </td>
                          <td className="px-3 py-2 font-bold text-ink">
                            {i.title}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {i.type || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              tone={
                                INSPECTION_RESULT[i.result]?.tone ?? "neutral"
                              }
                            >
                              {INSPECTION_RESULT[i.result]?.label ?? i.result}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {i.score || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-400"
                                onClick={() => {
                                  if (confirm(`حذف الفحص «${i.title}»؟`))
                                    deleteInsp.mutate(i.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "analytics" && (
            <div className="space-y-6">
              {/* ── مؤشرات الأداء الرئيسية ── */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label="متوسط زمن الحل (MTTR)"
                  value={
                    supportStatsQ.data?.mttrHours != null
                      ? `${supportStatsQ.data.mttrHours} ساعة`
                      : "—"
                  }
                  tone="info"
                  icon={ClipboardList}
                  hint="للتذاكر المحلولة/المغلقة"
                />
                <StatCard
                  label="معدل الحل الكلي"
                  value={`${supportStatsQ.data?.resolutionRate ?? 0}%`}
                  tone="positive"
                  icon={CheckCircle2}
                />
                <StatCard
                  label="تذاكر مفتوحة"
                  value={
                    (
                      supportStatsQ.data?.byStatus as
                        | Record<string, number>
                        | undefined
                    )?.open ?? 0
                  }
                  tone="warning"
                  icon={Ticket}
                />
                <StatCard
                  label="عاجلة نشطة"
                  value={
                    (
                      supportStatsQ.data?.byPriority as
                        | Record<string, number>
                        | undefined
                    )?.urgent ?? 0
                  }
                  tone="negative"
                  icon={AlertCircle}
                />
              </div>

              {/* أعمار التذاكر المفتوحة */}
              <div className="rounded-2xl border border-line bg-surface/80 p-5">
                <h3 className="mb-4 font-bold text-ink">
                  أعمار التذاكر المفتوحة
                </h3>
                {(() => {
                  const a = supportStatsQ.data?.openAging;
                  if (!a) return null;
                  const total = a.fresh + a.week + a.month + a.older || 1;
                  const rows = [
                    {
                      label: "خلال يومين (جديدة)",
                      v: a.fresh,
                      color: "bg-emerald-500",
                    },
                    { label: "3–7 أيام", v: a.week, color: "bg-sky-500" },
                    { label: "8–30 يوماً", v: a.month, color: "bg-amber-500" },
                    { label: "أكثر من شهر", v: a.older, color: "bg-rose-500" },
                  ];
                  return (
                    <div className="space-y-3">
                      {rows.map(r => (
                        <div key={r.label} className="flex items-center gap-3">
                          <div className="w-40 shrink-0 text-xs text-muted">
                            {r.label}
                          </div>
                          <div className="h-4 flex-1 overflow-hidden rounded-full bg-panel/60">
                            <div
                              className={`h-full rounded-full ${r.color}`}
                              style={{
                                width: `${Math.round((r.v / total) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="w-10 text-left text-sm font-bold">
                            {r.v}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* أداء المسؤولين */}
                <div className="rounded-2xl border border-line bg-surface/80 p-5">
                  <h3 className="mb-4 font-bold text-ink">أداء فريق الدعم</h3>
                  <div className="overflow-x-auto rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <thead className="bg-panel/60 text-xs text-muted">
                        <tr>
                          <th className="px-3 py-2 text-right">المسؤول</th>
                          <th className="px-3 py-2 text-center">إجمالي</th>
                          <th className="px-3 py-2 text-center">محلولة</th>
                          <th className="px-3 py-2 text-center">النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(supportStatsQ.data?.byAgent ?? []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-muted"
                            >
                              لا تذاكر مسندة بعد.
                            </td>
                          </tr>
                        ) : (
                          (supportStatsQ.data?.byAgent ?? []).map(a => (
                            <tr
                              key={a.agentId}
                              className="border-t border-line/60"
                            >
                              <td className="px-3 py-2 font-bold">{a.name}</td>
                              <td className="px-3 py-2 text-center">
                                {a.total}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {a.resolved}
                              </td>
                              <td className="px-3 py-2 text-center font-bold">
                                {a.resolutionRate}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-[11px] text-muted">
                    يُنصح مستقبلاً بإضافة حقلي firstResponseAt/resolvedAt للمخطط
                    لدقة SLA أعلى.
                  </p>
                </div>

                {/* التوزيع حسب الحالة والأولوية */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-line bg-surface/80 p-5">
                    <h3 className="mb-3 font-bold text-ink">حسب الحالة</h3>
                    <div className="space-y-2">
                      {Object.entries(supportStatsQ.data?.byStatus ?? {}).map(
                        ([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between rounded-lg border border-line px-3 py-1.5 text-sm"
                          >
                            <span>{TICKET_STATUS[k]?.label ?? k}</span>
                            <span className="font-bold">{v as number}</span>
                          </div>
                        )
                      )}
                      {Object.keys(supportStatsQ.data?.byStatus ?? {})
                        .length === 0 && (
                        <p className="py-2 text-center text-sm text-muted">
                          لا بيانات.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface/80 p-5">
                    <h3 className="mb-3 font-bold text-ink">حسب الأولوية</h3>
                    <div className="space-y-2">
                      {Object.entries(supportStatsQ.data?.byPriority ?? {}).map(
                        ([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between rounded-lg border border-line px-3 py-1.5 text-sm"
                          >
                            <span>{TICKET_PRIORITY[k]?.label ?? k}</span>
                            <span className="font-bold">{v as number}</span>
                          </div>
                        )
                      )}
                      {Object.keys(supportStatsQ.data?.byPriority ?? {})
                        .length === 0 && (
                        <p className="py-2 text-center text-sm text-muted">
                          لا بيانات.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Dialog open={tkOpen} onOpenChange={setTkOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "تعديل تذكرة" : "تذكرة دعم جديدة"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>الموضوع</Label>
                <Input
                  value={ticket.subject}
                  onChange={e =>
                    setTicket({ ...ticket, subject: e.target.value })
                  }
                  placeholder="مثال: عطل في الطابعة"
                />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={ticket.description}
                  onChange={e =>
                    setTicket({ ...ticket, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم العميل</Label>
                  <Input
                    value={ticket.customerName}
                    onChange={e =>
                      setTicket({ ...ticket, customerName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>هاتف العميل</Label>
                  <Input
                    value={ticket.customerPhone}
                    onChange={e =>
                      setTicket({ ...ticket, customerPhone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>الأولوية</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={v => setTicket({ ...ticket, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">مرتفع</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing && (
                <div>
                  <Label>الحالة</Label>
                  <Select
                    value={ticket.status}
                    onValueChange={v => setTicket({ ...ticket, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">مفتوح</SelectItem>
                      <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                      <SelectItem value="resolved">محلول</SelectItem>
                      <SelectItem value="closed">مغلق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTkOpen(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-brand text-ink-deep font-bold"
                disabled={
                  createTk.isPending || updateTk.isPending || !ticket.subject
                }
                onClick={saveTk}
              >
                {(createTk.isPending || updateTk.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={inspOpen} onOpenChange={setInspOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>فحص جودة جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الكود</Label>
                  <Input
                    value={insp.code}
                    onChange={e => setInsp({ ...insp, code: e.target.value })}
                    placeholder="QC-001"
                  />
                </div>
                <div>
                  <Label>النوع</Label>
                  <Input
                    value={insp.type}
                    onChange={e => setInsp({ ...insp, type: e.target.value })}
                    placeholder="دوري"
                  />
                </div>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input
                  value={insp.title}
                  onChange={e => setInsp({ ...insp, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>النتيجة</Label>
                  <Select
                    value={insp.result}
                    onValueChange={v => setInsp({ ...insp, result: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">مطابق</SelectItem>
                      <SelectItem value="fail">غير مطابق</SelectItem>
                      <SelectItem value="conditional">بشروط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الدرجة</Label>
                  <Input
                    value={insp.score}
                    onChange={e => setInsp({ ...insp, score: e.target.value })}
                    placeholder="95"
                  />
                </div>
              </div>
              <div>
                <Label>ملاحظة</Label>
                <Input
                  value={insp.note}
                  onChange={e => setInsp({ ...insp, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setInspOpen(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-brand text-ink-deep font-bold"
                disabled={createInsp.isPending || !insp.code || !insp.title}
                onClick={saveInsp}
              >
                {createInsp.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                تسجيل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
