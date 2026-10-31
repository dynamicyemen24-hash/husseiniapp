import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { CustomFields } from "@/components/CustomFields";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function fmtCur(n: number): string {
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.ي`;
}

const SOURCE_LABELS: Record<string, { label: string; tone: string }> = {
  sales: { label: "مبيعات", tone: "bg-emerald-100 text-emerald-700" },
  purchases: { label: "مشتريات", tone: "bg-amber-100 text-amber-700" },
  payroll: { label: "رواتب", tone: "bg-violet-100 text-violet-700" },
};

function sourceBadge(m: string) {
  const s = SOURCE_LABELS[m] ?? {
    label: m ?? "عام",
    tone: "bg-muted text-muted-foreground",
  };
  return <Badge className={`${s.tone} font-medium`}>{s.label}</Badge>;
}

function JournalPage() {
  const [source, setSource] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<number | null>(null);

  const { data, isPending } = trpc.modules.journal.list.useQuery(
    { sourceModule: source, limit: 60, offset: 0 },
    { placeholderData: p => p }
  );
  const { data: accounts } = trpc.modules.accounts.list.useQuery(undefined, {
    placeholderData: (p: any) => p,
  });
  const { data: legs, isPending: legsPending } =
    trpc.modules.journal.entries.useQuery(
      { journalEntryId: selected ?? 0 },
      { enabled: selected !== null, placeholderData: p => p }
    );

  const accMap = useMemo(() => {
    const m = new Map<number, any>();
    (accounts ?? []).forEach((a: any) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const items = data?.items ?? [];
  const totals = useMemo(() => {
    const debits = (legs ?? [])
      .filter((l: any) => l.type === "debit")
      .reduce((s: number, l: any) => s + (parseFloat(l.amount) || 0), 0);
    const credits = (legs ?? [])
      .filter((l: any) => l.type === "credit")
      .reduce((s: number, l: any) => s + (parseFloat(l.amount) || 0), 0);
    return { debits, credits };
  }, [legs]);

  return (
    <div className="min-h-screen flex">
      <main className="flex-1 bg-muted">
        <Tabs defaultValue="journal" className="min-h-screen flex flex-col">
          <div className="border-b bg-card px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    القيود المحاسبية المجمعة
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    دفتر اليومية التكاملي — كل حركة مالية مرتبطة بوثيقتها المصدر
                    (مبيعات / مشتريات / رواتب)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="h-9">
                  <TabsTrigger value="journal" className="text-xs">
                    القيود
                  </TabsTrigger>
                  <TabsTrigger value="scheduled" className="text-xs">
                    القيود المجدولة
                  </TabsTrigger>
                </TabsList>
                <Link to="/manual-journal">
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> قيد جديد
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant={source === undefined ? "default" : "outline"}
                onClick={() => setSource(undefined)}
              >
                الكل
              </Button>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={source === k ? "default" : "outline"}
                  onClick={() => setSource(k)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
          </div>

          <TabsContent value="journal" className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
              {/* list */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  القيود
                </h2>
                {isPending ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      لا توجد قيود بعد. تُنشأ تلقائياً عند ترحيل الفواتير أو
                      الرواتب.
                    </CardContent>
                  </Card>
                ) : (
                  items.map((je: any) => (
                    <button
                      key={je.id}
                      onClick={() => setSelected(je.id)}
                      className={`w-full text-right rounded-xl border p-4 transition hover:shadow-md ${
                        selected === je.id
                          ? "border-indigo-400 bg-indigo-50"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {sourceBadge(je.sourceModule)}
                        <span className="text-xs text-muted-foreground">
                          {je.postedAt
                            ? new Date(je.postedAt).toLocaleString("ar")
                            : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-sm text-muted-foreground">
                          {je.referenceNo}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {fmtCur(parseFloat(je.totalAmount || "0"))}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* detail */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  تفاصيل القيد
                </h2>
                {selected === null ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      اختر قيداً من القائمة لعرض حركاته.
                    </CardContent>
                  </Card>
                ) : legsPending ? (
                  <Skeleton className="h-48 w-full rounded-xl" />
                ) : (
                  <div className="space-y-3">
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 text-sm font-medium">
                          مدين: {fmtCur(totals.debits)}
                        </div>
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-700 text-sm font-medium">
                          دائن: {fmtCur(totals.credits)}
                        </div>
                        {(legs ?? []).map((l: any) => {
                          const acc = accMap.get(l.accountId);
                          return (
                            <div
                              key={l.id}
                              className="flex items-center justify-between border-b last:border-0 py-2"
                            >
                              <div className="flex items-center gap-2">
                                {l.type === "debit" ? (
                                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ArrowDownLeft className="h-4 w-4 text-rose-600" />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-foreground">
                                    {acc?.name || `حساب #${l.accountId}`}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {l.narration}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-sm font-semibold ${
                                  l.type === "debit"
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {fmtCur(parseFloat(l.amount || "0"))}
                              </span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                    <CustomFields
                      entityType="journal"
                      entityId={selected}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="flex-1">
            <ScheduledJournal />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ScheduledJournal() {
  const utils = trpc.useUtils();
  const { data: list, isPending } = trpc.accounting.scheduled.list.useQuery();
  const { data: accounts } = trpc.modules.accounts.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: branches } = trpc.modules.branches.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<
    "once" | "daily" | "weekly" | "monthly"
  >("monthly");
  const [nextRunAt, setNextRunAt] = useState("");
  const [legs, setLegs] = useState<
    {
      accountId: number | null;
      debit: string;
      credit: string;
      description: string;
    }[]
  >([{ accountId: null, debit: "0", credit: "0", description: "" }]);

  const create = trpc.accounting.scheduled.create.useMutation({
    onSuccess: () => {
      toast.success("تم جدولة القيد");
      setOpen(false);
      setName("");
      setDesc("");
      setBranchId(null);
      setNextRunAt("");
      setLegs([{ accountId: null, debit: "0", credit: "0", description: "" }]);
      utils.accounting.scheduled.list.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الجدولة"),
  });
  const del = trpc.accounting.scheduled.delete.useMutation({
    onSuccess: () => utils.accounting.scheduled.list.invalidate(),
  });
  const processDue = trpc.accounting.scheduled.processDue.useMutation({
    onSuccess: (r: any) => {
      toast.success(`تم تنفيذ ${r?.processed ?? 0} قيد مستحق`);
      utils.accounting.scheduled.list.invalidate();
      utils.modules.journal.list.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر التنفيذ"),
  });

  const updateLeg = (i: number, patch: any) =>
    setLegs(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const accName = (id?: number | null) =>
    (accounts ?? []).find((a: any) => a.id === id)?.name || `#${id}`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-foreground">
            القيود المحاسبية المجدولة
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-200 text-indigo-700"
            disabled={processDue.isPending}
            onClick={() => processDue.mutate()}
          >
            {processDue.isPending ? "جاري التنفيذ..." : "تنفيذ المستحق"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> جدولة قيد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base">قيد مجدول جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">الاسم</Label>
                    <Input
                      className="h-9 text-xs"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">التكرار</Label>
                    <select
                      className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs bg-card"
                      value={frequency}
                      onChange={e => setFrequency(e.target.value as any)}
                    >
                      <option value="once">مرة واحدة</option>
                      <option value="daily">يومي</option>
                      <option value="weekly">أسبوعي</option>
                      <option value="monthly">شهري</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">تاريخ/وقت التشغيل</Label>
                    <Input
                      type="datetime-local"
                      className="h-9 text-xs"
                      value={nextRunAt}
                      onChange={e => setNextRunAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">الفرع</Label>
                    <select
                      className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs bg-card"
                      value={branchId ?? ""}
                      onChange={e =>
                        setBranchId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">الفرع الرئيسي</option>
                      {(branches ?? []).map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-[11px]">الوصف</Label>
                  <Input
                    className="h-9 text-xs"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-[11px]">حركات القيد</Label>
                  <div className="space-y-2">
                    {legs.map((l, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-12 gap-1 items-center"
                      >
                        <select
                          className="col-span-5 h-9 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                          value={l.accountId ?? ""}
                          onChange={e =>
                            updateLeg(i, {
                              accountId: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        >
                          <option value="">الحساب</option>
                          {(accounts ?? []).map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          className="col-span-3 h-9 text-xs"
                          placeholder="مدين"
                          value={l.debit}
                          onChange={e =>
                            updateLeg(i, { debit: e.target.value })
                          }
                        />
                        <Input
                          className="col-span-3 h-9 text-xs"
                          placeholder="دائن"
                          value={l.credit}
                          onChange={e =>
                            updateLeg(i, { credit: e.target.value })
                          }
                        />
                        <button
                          className="col-span-1 text-rose-500"
                          onClick={() =>
                            setLegs(ls => ls.filter((_, idx) => idx !== i))
                          }
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <Input
                          className="col-span-12 h-9 text-xs"
                          placeholder="البيان"
                          value={l.description}
                          onChange={e =>
                            updateLeg(i, { description: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 text-[11px] text-indigo-600"
                    onClick={() =>
                      setLegs(ls => [
                        ...ls,
                        {
                          accountId: null,
                          debit: "0",
                          credit: "0",
                          description: "",
                        },
                      ])
                    }
                  >
                    + حركة
                  </Button>
                </div>

                <Button
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={!name || !nextRunAt || create.isPending}
                  onClick={() =>
                    create.mutate({
                      name,
                      description: desc || undefined,
                      branchId: branchId ?? undefined,
                      frequency,
                      nextRunAt: new Date(nextRunAt).toISOString(),
                      legs: legs
                        .filter(l => l.accountId != null)
                        .map(l => ({
                          accountId: l.accountId as number,
                          debit: l.debit || "0",
                          credit: l.credit || "0",
                          description: l.description || undefined,
                        })),
                    })
                  }
                >
                  {create.isPending ? "جاري الحفظ..." : "حفظ الجدولة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : (list ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            لا توجد قيود مجدولة. أضف قيداً ليُنفَّذ تلقائياً حسب التكرار.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(list ?? []).map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {s.name}
                    </span>
                    <Badge
                      className={
                        s.isActive
                          ? "bg-emerald-100 text-emerald-700 text-[10px]"
                          : "bg-muted text-muted-foreground text-[10px]"
                      }
                    >
                      {s.isActive ? "نشط" : "متوقف"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {s.frequency}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    التشغيل القادم:{" "}
                    {s.nextRunAt
                      ? new Date(s.nextRunAt).toLocaleString("ar")
                      : "-"}
                    {" • "}
                    {s.legs?.length ?? 0} حركة
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[10px] h-7 text-rose-600"
                  onClick={() => del.mutate({ id: s.id })}
                >
                  حذف
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Journal() {
  return (
    <RequireAuth>
      <JournalPage />
    </RequireAuth>
  );
}
