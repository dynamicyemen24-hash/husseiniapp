/**
 * Healthcare & Patient Management Dashboard
 * HIPAA-compliant patient registry, appointments, medical records
 * Standards: HIPAA, HL7 FHIR, ICD-10, SNOMED CT
 */

import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Search,
  Calendar,
  Stethoscope,
  Activity,
  FileText,
  Clock,
  CheckCircle,
  Plus,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab =
  | "dashboard"
  | "patients"
  | "appointments"
  | "records"
  | "vitals"
  | "settings";

type Gender = "male" | "female" | "other";
type BloodType =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";
type ApptType =
  | "new_patient"
  | "follow_up"
  | "consultation"
  | "routine"
  | "telemedicine";

// ─── KpiBox Component ──────────────────────────────────────────────────────
function KpiBox({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sub?: string;
}) {
  // Theme-aware accents (dark/contrast safe) — hue family preserved.
  const colorClass =
    color === "blue"
      ? "from-info/15 to-info/5 border-info/25"
      : color === "green"
        ? "from-success/15 to-success/5 border-success/25"
        : color === "orange"
          ? "from-warning/15 to-warning/5 border-warning/25"
          : color === "purple"
            ? "from-brand/15 to-brand/5 border-brand/25"
            : color === "red"
              ? "from-destructive/15 to-destructive/5 border-destructive/25"
              : color === "teal"
                ? "from-success/15 to-success/5 border-success/25"
                : "from-muted to-muted border-border";

  return (
    <Card className={cn("rounded-2xl border bg-gradient-to-br", colorClass)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className="text-xl font-black">{value}</p>
            {sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <Icon className="w-5 h-5 text-muted-foreground/60" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    scheduled: { label: "مجدول", cls: "bg-info/15 text-info" },
    confirmed: { label: "مؤكد", cls: "bg-success/15 text-success" },
    checked_in: { label: "تم الوصول", cls: "bg-info/15 text-info" },
    in_progress: { label: "قيد العلاج", cls: "bg-warning/15 text-warning" },
    completed: { label: "مكتمل", cls: "bg-success/15 text-success" },
    cancelled: { label: "ملغى", cls: "bg-destructive/15 text-destructive" },
    no_show: { label: "لم يحضر", cls: "bg-muted text-muted-foreground" },
    rescheduled: { label: "معاد", cls: "bg-brand/15 text-brand" },
  };
  const config = configs[status] ?? {
    label: status,
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={cn("text-[10px]", config.cls)}>{config.label}</Badge>
  );
}

// ─── New Patient Dialog ────────────────────────────────────────────────────
function NewPatientDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "male" as Gender,
    dateOfBirth: "",
    phone: "",
    nationalId: "",
    email: "",
    nationality: "",
    bloodType: "unknown" as BloodType,
  });

  const createMut = trpc.healthcare.createPatient.useMutation({
    onSuccess: () => {
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        gender: "male",
        dateOfBirth: "",
        phone: "",
        nationalId: "",
        email: "",
        nationality: "",
        bloodType: "unknown",
      });
      onSuccess();
    },
  });

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.dateOfBirth)
      return;
    createMut.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1">
          <UserPlus className="w-3 h-3" /> مريض جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">تسجيل مريض جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>الاسم الأول *</Label>
              <Input
                value={form.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label>اسم العائلة *</Label>
              <Input
                value={form.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, lastName: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>الجنس *</Label>
              <Select
                value={form.gender}
                onValueChange={(v: string) =>
                  setForm({ ...form, gender: v as Gender })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                  <SelectItem value="other">آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الميلاد *</Label>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, dateOfBirth: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label>رقم الهاتف *</Label>
            <Input
              value={form.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, phone: e.target.value })
              }
              className="h-8 text-xs"
              dir="ltr"
            />
          </div>
          <div>
            <Label>رقم الهوية</Label>
            <Input
              value={form.nationalId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, nationalId: e.target.value })
              }
              className="h-8 text-xs"
              dir="ltr"
            />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, email: e.target.value })
              }
              className="h-8 text-xs"
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>الجنسية</Label>
              <Input
                value={form.nationality}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, nationality: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label>فصيلة الدم</Label>
              <Select
                value={form.bloodType}
                onValueChange={(v: string) =>
                  setForm({ ...form, bloodType: v as BloodType })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="unknown">غير معروف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            إلغاء
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              !form.firstName ||
              !form.lastName ||
              !form.phone ||
              !form.dateOfBirth ||
              createMut.isPending
            }
            className="h-8 text-xs"
          >
            {createMut.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── New Appointment Dialog ────────────────────────────────────────────────
function NewAppointmentDialog({
  patients,
  providers,
  facilities,
  onSuccess,
}: {
  patients: { id: number; fullName: string }[];
  providers: { id: number; title?: string; specialization?: string }[];
  facilities: { id: number; name: string }[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: 0,
    providerId: 0,
    facilityId: 0,
    type: "routine" as ApptType,
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "09:00",
    chiefComplaint: "",
  });

  const createMut = trpc.healthcare.createAppointment.useMutation({
    onSuccess: () => {
      setOpen(false);
      onSuccess();
    },
  });

  const handleSubmit = () => {
    if (!form.patientId || !form.providerId || !form.facilityId) return;
    createMut.mutate({
      patientId: form.patientId,
      providerId: form.providerId,
      facilityId: form.facilityId,
      type: form.type,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      chiefComplaint: form.chiefComplaint,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1">
          <Calendar className="w-3 h-3" /> موعد جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">حجز موعد جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div>
            <Label>المريض *</Label>
            <Select
              value={form.patientId.toString()}
              onValueChange={(v: string) =>
                setForm({ ...form, patientId: Number(v) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="اختر المريض" />
              </SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>الطبيب *</Label>
              <Select
                value={form.providerId.toString()}
                onValueChange={(v: string) =>
                  setForm({ ...form, providerId: Number(v) })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختر الطبيب" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.title} {p.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المنشأة *</Label>
              <Select
                value={form.facilityId.toString()}
                onValueChange={(v: string) =>
                  setForm({ ...form, facilityId: Number(v) })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="اختر المنشأة" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>التاريخ *</Label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, scheduledDate: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label>الوقت *</Label>
              <Input
                type="time"
                value={form.scheduledTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, scheduledTime: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label>نوع الموعد</Label>
            <Select
              value={form.type}
              onValueChange={(v: string) =>
                setForm({ ...form, type: v as ApptType })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_patient">مريض جديد</SelectItem>
                <SelectItem value="follow_up">متابعة</SelectItem>
                <SelectItem value="consultation">استشارة</SelectItem>
                <SelectItem value="routine">روتيني</SelectItem>
                <SelectItem value="telemedicine">طب عن بعد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الشكوى الرئيسية</Label>
            <Input
              value={form.chiefComplaint}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, chiefComplaint: e.target.value })
              }
              className="h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-8 text-xs"
          >
            إلغاء
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              !form.patientId ||
              !form.providerId ||
              !form.facilityId ||
              createMut.isPending
            }
            className="h-8 text-xs"
          >
            {createMut.isPending ? "جارٍ الحجز..." : "حجز"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function HealthcarePage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");
  const [apptDate, setApptDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [apptStatus, setApptStatus] = useState<string>("all");

  // Queries
  const stats = trpc.healthcare.getDashboardStats.useQuery({});
  const patients = trpc.healthcare.listPatients.useQuery({
    search,
    page: 1,
    limit: 50,
  });
  const todayAppts = trpc.healthcare.getTodayAppointments.useQuery({});
  const allAppts = trpc.healthcare.listAppointments.useQuery({
    date: apptDate,
    page: 1,
    limit: 100,
  });
  const providers = trpc.healthcare.listProviders.useQuery(undefined);
  const facilities = trpc.healthcare.listFacilities.useQuery(undefined);

  const updateStatusMut = trpc.healthcare.updateAppointmentStatus.useMutation({
    onSuccess: () => {
      allAppts.refetch();
      todayAppts.refetch();
    },
  });

  const filteredPatients = useMemo(() => {
    return (
      (
        patients.data as
          | { patients?: { id: number; fullName: string }[] }
          | undefined
      )?.patients ?? []
    );
  }, [patients.data]);

  const filteredAppts = useMemo(() => {
    const t =
      (
        todayAppts.data as
          | { appointments?: { id: number; status: string }[] }
          | undefined
      )?.appointments ?? [];
    const a =
      (
        allAppts.data as
          | { appointments?: { id: number; status: string }[] }
          | undefined
      )?.appointments ?? [];
    const merged = tab === "dashboard" ? t : a;
    if (apptStatus === "all") return merged;
    return merged.filter((x: { status: string }) => x.status === apptStatus);
  }, [todayAppts.data, allAppts.data, apptStatus, tab]);

  const statsData = stats.data as
    | {
        today?: {
          total: number;
          checkedIn: number;
          inProgress: number;
          completed: number;
        };
        patients?: { total: number };
        monthly?: {
          total: number;
          completed: number;
          cancelled: number;
          noShow: number;
        };
        activeProviders?: number;
      }
    | undefined;
  const todayCounts = statsData?.today;
  const patientStats = statsData?.patients;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-black">الرعاية الصحية</h1>
            <p className="text-xs text-muted-foreground">
              إدارة المرضى والمواعيد والسجلات الطبية
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NewPatientDialog onSuccess={() => patients.refetch()} />
            <NewAppointmentDialog
              patients={filteredPatients}
              providers={
                (providers.data as
                  | { id: number; title?: string; specialization?: string }[]
                  | undefined) ?? []
              }
              facilities={
                (facilities.data as
                  | { id: number; name: string }[]
                  | undefined) ?? []
              }
              onSuccess={() => {
                todayAppts.refetch();
                allAppts.refetch();
              }}
            />
          </div>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiBox
            label="إجمالي المرضى"
            value={patientStats?.total ?? 0}
            icon={UserPlus}
            color="blue"
            sub="نشط"
          />
          <KpiBox
            label="مواعيد اليوم"
            value={todayCounts?.total ?? 0}
            icon={Calendar}
            color="purple"
          />
          <KpiBox
            label="تم الوصول"
            value={todayCounts?.checkedIn ?? 0}
            icon={CheckCircle}
            color="green"
          />
          <KpiBox
            label="قيد العلاج"
            value={todayCounts?.inProgress ?? 0}
            icon={Stethoscope}
            color="orange"
          />
          <KpiBox
            label="مكتمل"
            value={todayCounts?.completed ?? 0}
            icon={Activity}
            color="teal"
          />
          <KpiBox
            label="أطباء نشطين"
            value={statsData?.activeProviders ?? 0}
            icon={Shield}
            color="gray"
          />
        </section>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v: string) => setTab(v as Tab)}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-10 bg-card border">
            <TabsTrigger value="dashboard" className="text-xs gap-1">
              <Activity className="w-3 h-3" /> لوحة المعلومات
            </TabsTrigger>
            <TabsTrigger value="patients" className="text-xs gap-1">
              <UserPlus className="w-3 h-3" /> المرضى
            </TabsTrigger>
            <TabsTrigger value="appointments" className="text-xs gap-1">
              <Calendar className="w-3 h-3" /> المواعيد
            </TabsTrigger>
            <TabsTrigger value="records" className="text-xs gap-1">
              <FileText className="w-3 h-3" /> السجلات
            </TabsTrigger>
            <TabsTrigger value="vitals" className="text-xs gap-1">
              <Activity className="w-3 h-3" /> المؤشرات الحيوية
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1">
              <Shield className="w-3 h-3" /> الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Today's Schedule */}
              <Card className="rounded-2xl">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" /> مواعيد اليوم
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto datagrid">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-panel/40">
                          <th className="p-3 text-right">الوقت</th>
                          <th className="p-3 text-right">المريض</th>
                          <th className="p-3 text-right">الطبيب</th>
                          <th className="p-3 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayAppts.isLoading ? (
                          <tr>
                            <td colSpan={4} className="p-10 text-center">
                              جارٍ التحميل...
                            </td>
                          </tr>
                        ) : filteredAppts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-10 text-center">
                              لا توجد مواعيد
                            </td>
                          </tr>
                        ) : (
                          filteredAppts
                            .slice(0, 10)
                            .map((a: any, i: number) => (
                              <tr
                                key={a.id ?? i}
                                className="border-b border-border/50 hover:bg-panel/30"
                              >
                                <td className="p-3">{a.scheduledTime}</td>
                                <td className="p-3 font-medium">
                                  {a.patientName || `مريض #${a.patientId}`}
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {a.providerTitle} {a.providerSpecialization}
                                </td>
                                <td className="p-3 text-center">
                                  <StatusBadge status={a.status} />
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Stats */}
              <Card className="rounded-2xl">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" /> إحصائيات الشهر
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {[
                    {
                      label: "إجمالي المواعيد",
                      value: statsData?.monthly?.total ?? 0,
                      color: "blue",
                    },
                    {
                      label: "مكتمل",
                      value: statsData?.monthly?.completed ?? 0,
                      color: "green",
                    },
                    {
                      label: "ملغى",
                      value: statsData?.monthly?.cancelled ?? 0,
                      color: "red",
                    },
                    {
                      label: "لم يحضر",
                      value: statsData?.monthly?.noShow ?? 0,
                      color: "orange",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs">{item.label}</span>
                      <Badge variant="outline" className="font-black">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-3">
            <Card className="rounded-2xl">
              <CardContent className="p-3 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو الرقم أو الهاتف..."
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearch(e.target.value)
                    }
                    className="pr-9 h-9 text-xs"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredPatients.length} مريض
                </span>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">رقم المريض</th>
                        <th className="p-3 text-right">الاسم</th>
                        <th className="p-3 text-right">الهاتف</th>
                        <th className="p-3 text-right">الجنس</th>
                        <th className="p-3 text-right">تاريخ الميلاد</th>
                        <th className="p-3 text-right">فصيلة الدم</th>
                        <th className="p-3 text-center">التأمين</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.isLoading ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center">
                            جارٍ التحميل...
                          </td>
                        </tr>
                      ) : filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center">
                            لا يوجد مرضى
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((p: any, i: number) => (
                          <tr
                            key={p.id ?? i}
                            className="border-b border-border/50 hover:bg-panel/30"
                          >
                            <td className="p-3 font-mono text-[10px]">
                              {p.patientNumber}
                            </td>
                            <td className="p-3 font-medium">{p.fullName}</td>
                            <td className="p-3">{p.phone}</td>
                            <td className="p-3">
                              {p.gender === "male"
                                ? "ذكر"
                                : p.gender === "female"
                                  ? "أنثى"
                                  : "—"}
                            </td>
                            <td className="p-3">{p.dateOfBirth}</td>
                            <td className="p-3">{p.bloodType || "—"}</td>
                            <td className="p-3 text-center">
                              {p.insuranceProvider ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {p.insuranceProvider}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {p.isActive ? (
                                <Badge className="bg-success/15 text-success text-[10px]">
                                  نشط
                                </Badge>
                              ) : (
                                <Badge className="bg-destructive/15 text-destructive text-[10px]">
                                  غير نشط
                                </Badge>
                              )}
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

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-3">
            <Card className="rounded-2xl">
              <CardContent className="p-3 flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={apptDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setApptDate(e.target.value)
                  }
                  className="h-9 w-40 text-xs"
                />
                <Select value={apptStatus} onValueChange={setApptStatus}>
                  <SelectTrigger className="h-9 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="scheduled">مجدول</SelectItem>
                    <SelectItem value="checked_in">تم الوصول</SelectItem>
                    <SelectItem value="in_progress">قيد العلاج</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغى</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="overflow-x-auto datagrid">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-panel/40">
                        <th className="p-3 text-right">الوقت</th>
                        <th className="p-3 text-right">المريض</th>
                        <th className="p-3 text-right">الطبيب</th>
                        <th className="p-3 text-right">النوع</th>
                        <th className="p-3 text-right">الشكوى</th>
                        <th className="p-3 text-center">الحالة</th>
                        <th className="p-3 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAppts.isLoading ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center">
                            جارٍ التحميل...
                          </td>
                        </tr>
                      ) : filteredAppts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center">
                            لا توجد مواعيد
                          </td>
                        </tr>
                      ) : (
                        filteredAppts.map((a: any, i: number) => (
                          <tr
                            key={a.id ?? i}
                            className="border-b border-border/50 hover:bg-panel/30"
                          >
                            <td className="p-3">{a.scheduledTime}</td>
                            <td className="p-3 font-medium">
                              {a.patientName || `مريض #${a.patientId}`}
                            </td>
                            <td className="p-3">
                              {a.providerTitle} {a.providerSpecialization}
                            </td>
                            <td className="p-3">
                              {a.type === "new_patient"
                                ? "مريض جديد"
                                : a.type === "follow_up"
                                  ? "متابعة"
                                  : a.type === "consultation"
                                    ? "استشارة"
                                    : a.type === "routine"
                                      ? "روتيني"
                                      : a.type === "telemedicine"
                                        ? "طب عن بعد"
                                        : a.type}
                            </td>
                            <td className="p-3 max-w-[200px] truncate">
                              {a.chiefComplaint || "—"}
                            </td>
                            <td className="p-3 text-center">
                              <StatusBadge status={a.status} />
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {a.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px]"
                                    onClick={() => {
                                      updateStatusMut.mutate({
                                        id: a.id,
                                        status: "checked_in",
                                      });
                                    }}
                                  >
                                    وصول
                                  </Button>
                                )}
                                {a.status === "checked_in" && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] bg-success"
                                    onClick={() => {
                                      updateStatusMut.mutate({
                                        id: a.id,
                                        status: "completed",
                                      });
                                    }}
                                  >
                                    إنهاء
                                  </Button>
                                )}
                                {a.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-[10px]"
                                    onClick={() => {
                                      updateStatusMut.mutate({
                                        id: a.id,
                                        status: "cancelled",
                                        reason: "ملغى من المستخدم",
                                      });
                                    }}
                                  >
                                    إلغاء
                                  </Button>
                                )}
                              </div>
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

          {/* Records Tab */}
          <TabsContent value="records" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> السجلات الطبية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground text-center py-8">
                  حدد مريضاً لعرض سجلاته الطبية
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vitals Tab */}
          <TabsContent value="vitals" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" /> المؤشرات الحيوية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground text-center py-8">
                  حدد مريضاً لعرض مؤشراته الحيوية
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-3">
            <Card className="rounded-2xl">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> إعدادات النظام
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b">
                  <span>المنشآت الطبية</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                  >
                    <Plus className="w-3 h-3" /> إضافة
                  </Button>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span>الأطباء والموظفون</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                  >
                    <Plus className="w-3 h-3" /> إضافة
                  </Button>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span>رموز ICD</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                  >
                    <Plus className="w-3 h-3" /> استيراد
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Standards Footer */}
        <Card className="rounded-2xl border-2 border-dashed border-border/60 bg-muted/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
              {[
                { icon: Shield, label: "HIPAA" },
                { icon: FileText, label: "HL7 FHIR" },
                { icon: Activity, label: "ICD-10" },
                { icon: Stethoscope, label: "SNOMED CT" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <s.icon className="w-3 h-3" />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
