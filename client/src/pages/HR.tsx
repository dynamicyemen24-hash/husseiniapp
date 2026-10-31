import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CustomFields } from "@/components/CustomFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Users,
  UserPlus,
  CalendarCheck,
  TrendingUp,
  Pencil,
  Trash2,
  Loader2,
  UserCheck,
  UserMinus,
  Clock,
  BarChart3,
  Wallet,
} from "lucide-react";

const EMP_STATUS = {
  active: { label: "نشط", tone: "emerald" },
  on_leave: { label: "في إجازة", tone: "amber" },
  terminated: { label: "منتهي الخدمة", tone: "rose" },
} as const;

const ATT_STATUS = {
  present: { label: "حاضر", tone: "emerald" },
  absent: { label: "غائب", tone: "rose" },
  late: { label: "متأخر", tone: "amber" },
  leave: { label: "إجازة", tone: "sky" },
} as const;

const CURRENCIES = ["YER", "SAR", "USD", "EUR", "AED"];

const fmt = (n: number, cur = "YER") =>
  new Intl.NumberFormat("ar", { maximumFractionDigits: 0 }).format(n) +
  " " +
  cur;

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
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
        tones[tone] ?? tones.emerald
      )}
    >
      {children}
    </span>
  );
}

const emptyForm = {
  code: "",
  fullName: "",
  jobTitle: "",
  nationalId: "",
  phone: "",
  email: "",
  hireDate: "",
  salary: "",
  currency: "YER",
  status: "active" as const,
};

export default function HR() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<
    "overview" | "employees" | "attendance" | "reports"
  >("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const [attOpen, setAttOpen] = useState(false);
  const [attFilter, setAttFilter] = useState("all");
  const [attForm, setAttForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    status: "present",
    checkIn: "",
    checkOut: "",
    note: "",
  });

  const employeesQ = trpc.erp.listEmployees.useQuery(
    {
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { placeholderData: p => p }
  );

  const attendanceQ = trpc.erp.listAttendance.useQuery(
    { employeeId: attFilter === "all" ? undefined : Number(attFilter) },
    { placeholderData: p => p }
  );

  // ── تقارير الموارد البشرية (تُحمّل عند فتح التبويب فقط) ──
  const payrollReportQ = trpc.erp.hrPayrollReport.useQuery(undefined, {
    enabled: tab === "reports",
  });
  const attSummaryQ = trpc.erp.hrAttendanceSummary.useQuery(undefined, {
    enabled: tab === "reports",
  });
  const deptCostQ = trpc.erp.hrDeptCost.useQuery(undefined, {
    enabled: tab === "reports",
  });

  const createEmp = trpc.erp.createEmployee.useMutation({
    onSuccess: () => utils.erp.listEmployees.invalidate(),
  });
  const updateEmp = trpc.erp.updateEmployee.useMutation({
    onSuccess: () => utils.erp.listEmployees.invalidate(),
  });
  const deleteEmp = trpc.erp.deleteEmployee.useMutation({
    onSuccess: () => utils.erp.listEmployees.invalidate(),
  });

  const createAtt = trpc.erp.createAttendance.useMutation({
    onSuccess: () => utils.erp.listAttendance.invalidate(),
  });

  const list = employeesQ.data ?? [];
  const total = list.length;
  const active = list.filter((e: any) => e.status === "active").length;
  const onLeave = list.filter((e: any) => e.status === "on_leave").length;
  const terminated = list.filter((e: any) => e.status === "terminated").length;
  const monthly = list.reduce(
    (s: number, e: any) => s + (Number(e.salary) || 0),
    0
  );
  const recent = [...list]
    .filter((e: any) => e.hireDate)
    .sort((a: any, b: any) => +new Date(b.hireDate) - +new Date(a.hireDate))
    .slice(0, 5);

  function openForm(row?: any) {
    setEditing(row ?? null);
    setForm(row ? { ...emptyForm, ...row } : emptyForm);
    setFormOpen(true);
  }

  function saveForm() {
    const payload = {
      code: form.code,
      fullName: form.fullName,
      jobTitle: form.jobTitle,
      nationalId: form.nationalId || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      hireDate: form.hireDate || undefined,
      salary: form.salary || "0",
      currency: form.currency,
      status: form.status,
    };
    const run = editing
      ? updateEmp.mutateAsync({ id: editing.id, ...payload })
      : createEmp.mutateAsync(payload);
    run.then(() => setFormOpen(false));
  }

  function saveAtt() {
    createAtt
      .mutateAsync({
        employeeId: Number(attForm.employeeId),
        date: attForm.date,
        status: attForm.status,
        checkIn: attForm.checkIn
          ? new Date(attForm.checkIn).toISOString()
          : undefined,
        checkOut: attForm.checkOut
          ? new Date(attForm.checkOut).toISOString()
          : undefined,
        note: attForm.note || undefined,
      })
      .then(() => setAttOpen(false));
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
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-ink">
                  الموارد البشرية
                </h1>
                <p className="text-sm text-muted">
                  إدارة الموظفين والحضور والغياب في مؤسستك
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabBtn(
              "overview",
              "نظرة عامة",
              <TrendingUp className="h-4 w-4" />
            )}
            {tabBtn("employees", "الموظفون", <Users className="h-4 w-4" />)}
            {tabBtn(
              "attendance",
              "الحضور والغياب",
              <CalendarCheck className="h-4 w-4" />
            )}
            {tabBtn("reports", "التقارير", <BarChart3 className="h-4 w-4" />)}
          </div>
        </div>

        <div className="mt-6">
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  label="إجمالي الموظفين"
                  value={total}
                  tone="info"
                  icon={Users}
                />
                <StatCard
                  label="نشطون"
                  value={active}
                  tone="positive"
                  icon={UserCheck}
                />
                <StatCard
                  label="في إجازة"
                  value={onLeave}
                  tone="warning"
                  icon={Clock}
                />
                <StatCard
                  label="منتهي الخدمة"
                  value={terminated}
                  tone="negative"
                  icon={UserMinus}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-line bg-surface/80 p-5">
                  <h3 className="mb-3 text-sm font-bold text-ink">
                    أحدث الموظفين
                  </h3>
                  {recent.length === 0 ? (
                    <p className="text-sm text-muted">لا يوجد موظفون بعد.</p>
                  ) : (
                    <div className="space-y-2">
                      {recent.map((e: any) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between rounded-xl bg-panel/50 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-bold text-ink">
                              {e.fullName}
                            </div>
                            <div className="text-xs text-muted">
                              {e.jobTitle} · {e.code}
                            </div>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(e.hireDate).toLocaleDateString("ar")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-line bg-surface/80 p-5">
                  <h3 className="mb-3 text-sm font-bold text-ink">
                    إجمالي الرواتب المسجّلة
                  </h3>
                  <div className="text-3xl font-black text-brand">
                    {fmt(monthly)}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    مجموع الرواتب الشهرية لكل الموظفين (حسب العملة)
                  </p>
                  <div className="mt-4 space-y-2">
                    {(["active", "on_leave", "terminated"] as const).map(s => (
                      <div
                        key={s}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted">
                          {EMP_STATUS[s].label}
                        </span>
                        <Badge tone={EMP_STATUS[s].tone}>
                          {list.filter((e: any) => e.status === s).length}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "employees" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-wrap gap-2">
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالاسم..."
                    className="max-w-[220px]"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="on_leave">في إجازة</SelectItem>
                      <SelectItem value="terminated">منتهي الخدمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => openForm()}
                  className="bg-brand text-ink-deep font-bold"
                >
                  <UserPlus className="h-4 w-4" /> موظف جديد
                </Button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
                <table className="w-full text-sm">
                  <thead className="bg-panel/60 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 text-right">الكود</th>
                      <th className="px-3 py-2 text-right">الاسم</th>
                      <th className="px-3 py-2 text-right">المسمى</th>
                      <th className="px-3 py-2 text-right">الحالة</th>
                      <th className="px-3 py-2 text-right">الراتب</th>
                      <th className="px-3 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesQ.isPending ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-10 text-center text-muted"
                        >
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </td>
                      </tr>
                    ) : list.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-10 text-center text-muted"
                        >
                          لا يوجد موظفون مطابقون.
                        </td>
                      </tr>
                    ) : (
                      list.map((e: any) => (
                        <tr
                          key={e.id}
                          className="border-t border-line/60 hover:bg-panel/30"
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {e.code}
                          </td>
                          <td className="px-3 py-2 font-bold text-ink">
                            {e.fullName}
                          </td>
                          <td className="px-3 py-2 text-muted">{e.jobTitle}</td>
                          <td className="px-3 py-2">
                            <Badge
                              tone={
                                EMP_STATUS[e.status as keyof typeof EMP_STATUS]
                                  ?.tone ?? "emerald"
                              }
                            >
                              {EMP_STATUS[e.status as keyof typeof EMP_STATUS]
                                ?.label ?? e.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {fmt(Number(e.salary) || 0, e.currency)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openForm(e)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-400"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `هل أنت متأكد من حذف «${e.fullName}»؟`
                                    )
                                  )
                                    deleteEmp.mutate(e.id);
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

          {tab === "attendance" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-wrap gap-2">
                  <Select value={attFilter} onValueChange={setAttFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="الموظف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الموظفين</SelectItem>
                      {list.map((e: any) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.fullName} · {e.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => setAttOpen(true)}
                  className="bg-brand text-ink-deep font-bold"
                  disabled={list.length === 0}
                >
                  <CalendarCheck className="h-4 w-4" /> تسجيل حضور
                </Button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-surface/80">
                <table className="w-full text-sm">
                  <thead className="bg-panel/60 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                      <th className="px-3 py-2 text-right">الموظف</th>
                      <th className="px-3 py-2 text-right">الحالة</th>
                      <th className="px-3 py-2 text-right">الدخول</th>
                      <th className="px-3 py-2 text-right">الخروج</th>
                      <th className="px-3 py-2 text-right">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceQ.isPending ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-10 text-center text-muted"
                        >
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </td>
                      </tr>
                    ) : (attendanceQ.data ?? []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-10 text-center text-muted"
                        >
                          لا توجد سجلات حضور.
                        </td>
                      </tr>
                    ) : (
                      (attendanceQ.data ?? []).map((a: any) => {
                        const emp = list.find(
                          (e: any) => e.id === a.employeeId
                        );
                        return (
                          <tr
                            key={a.id}
                            className="border-t border-line/60 hover:bg-panel/30"
                          >
                            <td className="px-3 py-2">
                              {new Date(a.date).toLocaleDateString("ar")}
                            </td>
                            <td className="px-3 py-2 font-bold text-ink">
                              {emp?.fullName ?? a.employeeId}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                tone={
                                  ATT_STATUS[
                                    a.status as keyof typeof ATT_STATUS
                                  ]?.tone ?? "emerald"
                                }
                              >
                                {ATT_STATUS[a.status as keyof typeof ATT_STATUS]
                                  ?.label ?? a.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {a.checkIn
                                ? new Date(a.checkIn).toLocaleTimeString("ar")
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {a.checkOut
                                ? new Date(a.checkOut).toLocaleTimeString("ar")
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {a.note || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-6">
              {/* ── ملخص الحضور ── */}
              <div className="rounded-2xl border border-line bg-surface/80 p-5">
                <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
                  <CalendarCheck className="h-5 w-5 text-brand" />
                  ملخص الحضور — آخر 30 يوماً
                </h2>
                <p className="mb-4 text-xs text-muted">
                  نسبة الالتزام = (حاضر + متأخر) ÷ إجمالي الأيام المسجلة
                </p>
                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard
                    label="نسبة الالتزام العامة"
                    value={`${attSummaryQ.data?.totals.attendanceRate ?? 0}%`}
                    tone="positive"
                    icon={UserCheck}
                  />
                  <StatCard
                    label="أيام حضور"
                    value={attSummaryQ.data?.totals.present ?? 0}
                    tone="info"
                    icon={CalendarCheck}
                  />
                  <StatCard
                    label="تأخيرات"
                    value={attSummaryQ.data?.totals.late ?? 0}
                    tone="warning"
                    icon={Clock}
                  />
                  <StatCard
                    label="أيام غياب"
                    value={attSummaryQ.data?.totals.absent ?? 0}
                    tone="negative"
                    icon={UserMinus}
                  />
                </div>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-sm">
                    <thead className="bg-panel/60 text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 text-right">الموظف</th>
                        <th className="px-3 py-2 text-center">حاضر</th>
                        <th className="px-3 py-2 text-center">متأخر</th>
                        <th className="px-3 py-2 text-center">غياب</th>
                        <th className="px-3 py-2 text-center">إجازة</th>
                        <th className="px-3 py-2 text-center">الالتزام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(attSummaryQ.data?.perEmployee ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-8 text-center text-muted"
                          >
                            لا سجلات حضور خلال الفترة.
                          </td>
                        </tr>
                      ) : (
                        (attSummaryQ.data?.perEmployee ?? []).map(e => (
                          <tr
                            key={e.employeeId}
                            className="border-t border-line/60"
                          >
                            <td className="px-3 py-2 font-bold">
                              {e.name} · {e.code}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {e.present}
                            </td>
                            <td className="px-3 py-2 text-center">{e.late}</td>
                            <td className="px-3 py-2 text-center">
                              {e.absent}
                            </td>
                            <td className="px-3 py-2 text-center">{e.leave}</td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${e.attendanceRate >= 90 ? "bg-emerald-500/15 text-emerald-300" : e.attendanceRate >= 70 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"}`}
                              >
                                {e.attendanceRate}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── تقرير الرواتب ── */}
              <div className="rounded-2xl border border-line bg-surface/80 p-5">
                <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
                  <Wallet className="h-5 w-5 text-brand" />
                  تقرير الرواتب
                  {payrollReportQ.data?.latestPeriod && (
                    <span className="text-xs font-normal text-muted">
                      (تفصيل دورة: {payrollReportQ.data.latestPeriod})
                    </span>
                  )}
                </h2>
                {(payrollReportQ.data?.runs ?? []).length > 0 && (
                  <div className="mt-3 mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {(payrollReportQ.data?.runs ?? []).slice(0, 4).map(r => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-line bg-background/60 p-3"
                      >
                        <div className="text-[11px] text-muted">
                          {r.periodName}
                        </div>
                        <div className="text-sm font-black text-ink">
                          {Number(r.totalNet).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted">
                          {Number(r.employeesCount)} موظف
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-sm">
                    <thead className="bg-panel/60 text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 text-right">الموظف</th>
                        <th className="px-3 py-2 text-right">القسم</th>
                        <th className="px-3 py-2 text-left">الأساسي</th>
                        <th className="px-3 py-2 text-left">الاستقطاعات</th>
                        <th className="px-3 py-2 text-left">الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(payrollReportQ.data?.items ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-8 text-center text-muted"
                          >
                            لا دورات رواتب بعد.
                          </td>
                        </tr>
                      ) : (
                        (payrollReportQ.data?.items ?? []).map(it => (
                          <tr
                            key={it.employeeId}
                            className="border-t border-line/60"
                          >
                            <td className="px-3 py-2 font-bold">
                              {it.employeeName} · {it.employeeCode}
                            </td>
                            <td className="px-3 py-2 text-muted">
                              {it.department ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-left font-mono">
                              {Number(it.basicSalary).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-left font-mono text-rose-400">
                              {Number(it.deductions).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-left font-mono font-bold">
                              {Number(it.net).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── تكلفة التوظيف حسب القسم ── */}
              <div className="rounded-2xl border border-line bg-surface/80 p-5">
                <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
                  <BarChart3 className="h-5 w-5 text-brand" />
                  كلفة التوظيف حسب القسم
                </h2>
                <div className="space-y-2">
                  {(deptCostQ.data?.byDepartment ?? []).length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">
                      لا بيانات.
                    </p>
                  ) : (
                    (deptCostQ.data?.byDepartment ?? []).map(d => (
                      <div
                        key={d.departmentId}
                        className="flex items-center gap-3"
                      >
                        <div className="w-40 shrink-0 truncate text-sm font-bold">
                          {d.name}
                        </div>
                        <div className="h-6 flex-1 overflow-hidden rounded-lg bg-panel/60">
                          <div
                            className="h-full rounded-lg bg-brand/40"
                            style={{ width: `${Math.min(d.sharePct, 100)}%` }}
                          />
                        </div>
                        <div className="w-48 shrink-0 text-left text-xs text-muted">
                          {d.headcount} موظف · {d.payroll.toLocaleString()} (
                          {d.sharePct}%)
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل موظف" : "موظف جديد"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <Label>الكود</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder="EMP-001"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>الاسم الكامل</Label>
                <Input
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>المسمى الوظيفي</Label>
                <Input
                  value={form.jobTitle}
                  onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>رقم وطني</Label>
                <Input
                  value={form.nationalId}
                  onChange={e =>
                    setForm({ ...form, nationalId: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>البريد</Label>
                <Input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>تاريخ التوظيف</Label>
                <Input
                  type="date"
                  value={form.hireDate}
                  onChange={e => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm({ ...form, status: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="on_leave">في إجازة</SelectItem>
                    <SelectItem value="terminated">منتهي الخدمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>الراتب</Label>
                <Input
                  value={form.salary}
                  onChange={e => setForm({ ...form, salary: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>العملة</Label>
                <Select
                  value={form.currency}
                  onValueChange={v => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editing && (
              <CustomFields entityType="employee" entityId={editing.id} />
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-brand text-ink-deep font-bold"
                disabled={
                  createEmp.isPending ||
                  updateEmp.isPending ||
                  !form.code ||
                  !form.fullName ||
                  !form.jobTitle
                }
                onClick={saveForm}
              >
                {(createEmp.isPending || updateEmp.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={attOpen} onOpenChange={setAttOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تسجيل حضور / غياب</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>الموظف</Label>
                <Select
                  value={attForm.employeeId}
                  onValueChange={v => setAttForm({ ...attForm, employeeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {list.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.fullName} · {e.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={attForm.date}
                  onChange={e =>
                    setAttForm({ ...attForm, date: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>الحالة</Label>
                <Select
                  value={attForm.status}
                  onValueChange={v => setAttForm({ ...attForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">حاضر</SelectItem>
                    <SelectItem value="absent">غائب</SelectItem>
                    <SelectItem value="late">متأخر</SelectItem>
                    <SelectItem value="leave">إجازة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>وقت الدخول</Label>
                <Input
                  type="datetime-local"
                  value={attForm.checkIn}
                  onChange={e =>
                    setAttForm({ ...attForm, checkIn: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <Label>وقت الخروج</Label>
                <Input
                  type="datetime-local"
                  value={attForm.checkOut}
                  onChange={e =>
                    setAttForm({ ...attForm, checkOut: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>ملاحظة</Label>
                <Input
                  value={attForm.note}
                  onChange={e =>
                    setAttForm({ ...attForm, note: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAttOpen(false)}>
                إلغاء
              </Button>
              <Button
                className="bg-brand text-ink-deep font-bold"
                disabled={createAtt.isPending || !attForm.employeeId}
                onClick={saveAtt}
              >
                {createAtt.isPending && (
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
