import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CalendarClock, Plus, Lock, Unlock, ShieldCheck } from "lucide-react";

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  open: { text: "مفتوحة", tone: "bg-emerald-100 text-emerald-700" },
  closing: { text: "قيد الإغلاق", tone: "bg-amber-100 text-amber-700" },
  closed: { text: "مغلقة", tone: "bg-red-100 text-red-700" },
  reopened: { text: "أُعيد فتحها", tone: "bg-blue-100 text-blue-700" },
};

const fmtDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("ar", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function FiscalPeriods() {
  const utils = trpc.useUtils();
  const list = trpc.fiscalPeriods.list.useQuery(undefined, {
    staleTime: 30_000,
  });

  const create = trpc.fiscalPeriods.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الفترة المالية");
      utils.fiscalPeriods.list.invalidate();
      setForm({ name: "", startDate: "", endDate: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closePeriod = trpc.fiscalPeriods.close.useMutation({
    onSuccess: (r: any) => {
      toast.success(`تم إقفال الفترة "${r.name}" — لن تُقبل الترحيلات إليها`);
      utils.fiscalPeriods.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reopenPeriod = trpc.fiscalPeriods.reopen.useMutation({
    onSuccess: (r: any) => {
      toast.success(`أعيد فتح الفترة "${r.name}" استثنائياً`);
      utils.fiscalPeriods.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [reopenReason, setReopenReason] = useState("");

  const submit = () => {
    if (!form.name.trim() || !form.startDate || !form.endDate)
      return toast.error("أدخل الاسم وتاريخي البداية والنهاية");
    create.mutate({
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">
              الفترات المالية — دورة الإقفال
            </h1>
            <p className="text-xs text-muted-foreground">
              تحكّم كامل بقفل الفترات: بمجرد الإقفال، يُمنع الترحيل إليها إلا
              بإعادة فتح استثنائية موثّقة
            </p>
          </div>
          <Badge className="bg-brand text-ink-deep font-bold">
            {list.data?.length ?? 0} فترة
          </Badge>
        </div>

        <Card className="surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-brand" /> إنشاء فترة مالية
            </CardTitle>
            <CardDescription className="text-xs">
              مثال: اسم «2026» من 01-01-2026 إلى 31-12-2026
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="الاسم">
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="2026"
                className="h-9 text-xs"
              />
            </Field>
            <Field label="من تاريخ">
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="h-9 text-xs"
              />
            </Field>
            <Field label="إلى تاريخ">
              <Input
                type="date"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="h-9 text-xs"
              />
            </Field>
            <div className="flex items-end">
              <Button
                onClick={submit}
                disabled={create.isPending}
                className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold h-9"
              >
                إنشاء
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="w-4 h-4 text-brand" /> الفترات المسجّلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البداية</TableHead>
                  <TableHead>النهاية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>أُقفلت بواسطة</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data?.map((p: any) => {
                  const st = STATUS_LABEL[p.status] ?? {
                    text: p.status,
                    tone: "",
                  };
                  const canClose =
                    p.status === "open" || p.status === "reopened";
                  const canReopen = p.status === "closed";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {fmtDate(p.startDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {fmtDate(p.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${st.tone} text-[10px]`}>
                          {st.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.closedById ? `#${p.closedById}` : "—"}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          {canClose && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-red-600"
                              onClick={() =>
                                closePeriod.mutate({ periodId: p.id })
                              }
                              disabled={closePeriod.isPending}
                            >
                              <Lock className="w-3.5 h-3.5 ml-1" /> إقفال
                            </Button>
                          )}
                          {canReopen && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs text-blue-600"
                                >
                                  <Unlock className="w-3.5 h-3.5 ml-1" /> إعادة
                                  فتح
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="text-sm">
                                    إعادة فتح الفترة «{p.name}»
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                  <Field label="سبب الإعادة (إلزامي — يُسجَّل في سجل التدقيق)">
                                    <textarea
                                      value={reopenReason}
                                      onChange={e =>
                                        setReopenReason(e.target.value)
                                      }
                                      rows={3}
                                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                                      placeholder="مثال: تصويب قيد تم ترحيله بعد الإقفال"
                                    />
                                  </Field>
                                  <Button
                                    className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold h-9"
                                    disabled={
                                      !reopenReason.trim() ||
                                      reopenPeriod.isPending
                                    }
                                    onClick={() => {
                                      reopenPeriod.mutate({
                                        periodId: p.id,
                                        reason: reopenReason.trim(),
                                      });
                                      setReopenReason("");
                                    }}
                                  >
                                    تأكيد إعادة الفتح
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          {!canClose && !canReopen && (
                            <span className="text-xs text-muted-foreground">
                              <ShieldCheck className="w-3.5 h-3.5 inline ml-1" />
                              {p.status === "closing"
                                ? "قيد المعالجة"
                                : "مقفلة نهائياً"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs">
                      جاري التحميل…
                    </TableCell>
                  </TableRow>
                )}
                {!list.isLoading && (list.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      لا توجد فترات بعد — أنشئ السنة المالية أولاً لتفعيل دورة
                      الإقفال والقفل
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-ink text-white">
          <CardContent className="p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-brand-300 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold">كيف تعمل دورة القفل؟</p>
              <p className="text-white/60">
                أي ترحيل في التاريخ يقع ضمن فترة مغلقة يُرفض (عبر محرك المحاسبة
                المركزي). الإقفال النهائي للدورة المالية يُغلِق الفترة تلقائياً،
                وإعادة الفتح استثنائية وتتطلب سبباً يُسجَّل كاملاً في سجل
                التدقيق بلا قيود على الاستمرارية.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
