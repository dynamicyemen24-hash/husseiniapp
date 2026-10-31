import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { toast } from "sonner";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes, Tag, Plus, Ruler, Coins } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BasicData() {
  const { isAdmin } = usePermissions();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<
    "units" | "categories" | "currencies" | "salesReps"
  >("units");
  const [unit, setUnit] = useState({ code: "", name: "", symbol: "" });
  const [cat, setCat] = useState({ code: "", name: "", type: "product" });

  const { data: curs } = trpc.modules.currencies.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const createCur = trpc.modules.currencies.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة العملة");
      setCur({ code: "", name: "", symbol: "", rate: "1", isDefault: false });
      utils.modules.currencies.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الإضافة")),
  });
  const updateCur = trpc.modules.currencies.update.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      setEditCur(null);
      utils.modules.currencies.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر التحديث")),
  });
  const setDefaultCur = trpc.modules.currencies.setDefault.useMutation({
    onSuccess: () => utils.modules.currencies.list.invalidate(),
  });
  const [cur, setCur] = useState({
    code: "",
    name: "",
    symbol: "",
    rate: "1",
    isDefault: false,
  });
  const [editCur, setEditCur] = useState<any | null>(null);

  // ─── Sales Reps (Module A) ───
  const { data: reps, isPending: loadingReps } =
    trpc.modules.salesReps.list.useQuery(undefined, { staleTime: 60_000 });
  const repReport = trpc.modules.salesReps.commissionReport.useQuery(
    undefined,
    {
      staleTime: 60_000,
    }
  );
  const createRep = trpc.modules.salesReps.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة المندوب");
      setRep({
        name: "",
        phone: "",
        commissionType: "percent",
        commissionValue: "0",
        bonusThreshold: "",
        bonusAmount: "",
      });
      setShowRep(false);
      utils.modules.salesReps.list.invalidate();
      utils.modules.salesReps.commissionReport.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الإضافة")),
  });
  const updateRep = trpc.modules.salesReps.update.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      setEditRep(null);
      utils.modules.salesReps.list.invalidate();
      utils.modules.salesReps.commissionReport.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر التحديث")),
  });
  const deleteRep = trpc.modules.salesReps.delete.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      utils.modules.salesReps.list.invalidate();
      utils.modules.salesReps.commissionReport.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الحذف")),
  });
  const [showRep, setShowRep] = useState(false);
  const [rep, setRep] = useState({
    name: "",
    phone: "",
    commissionType: "percent" as "percent" | "fixed",
    commissionValue: "0",
    bonusThreshold: "",
    bonusAmount: "",
  });
  const [editRep, setEditRep] = useState<any | null>(null);
  const [showRepReport, setShowRepReport] = useState(false);

  const { data: units, isPending: loadingUnits } =
    trpc.modules.masterData.listUnits.useQuery(undefined, {
      staleTime: 60_000,
    });
  const { data: cats, isPending: loadingCats } =
    trpc.modules.masterData.listCategories.useQuery(undefined, {
      staleTime: 60_000,
    });

  const createUnit = trpc.modules.masterData.createUnit.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة وحدة القياس");
      setUnit({ code: "", name: "", symbol: "" });
      utils.modules.masterData.listUnits.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الإضافة")),
  });
  const createCat = trpc.modules.masterData.createCategory.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة التصنيف");
      setCat({ code: "", name: "", type: "product" });
      utils.modules.masterData.listCategories.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الإضافة")),
  });

  if (!isAdmin) return <DeniedScreen />;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <main className="flex-1 p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-brand">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              البيانات الأساسية
            </h1>
            <p className="text-[11px] text-muted-foreground">
              وحدات القياس والتصنيفات الموحدة للمؤسسة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="وحدات القياس"
            value={units?.length ?? 0}
            tone="info"
            icon={Ruler}
          />
          <StatCard
            label="التصنيفات"
            value={cats?.length ?? 0}
            tone="positive"
            icon={Tag}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "units" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("units")}
          >
            وحدات القياس
          </Button>
          <Button
            variant={tab === "categories" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("categories")}
          >
            التصنيفات
          </Button>
          <Button
            variant={tab === "currencies" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("currencies")}
          >
            العملات
          </Button>
          <Button
            variant={tab === "salesReps" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("salesReps")}
          >
            المندوبون
          </Button>
        </div>

        {tab === "units" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:col-span-2">
              <h2 className="text-sm font-bold text-foreground">
                وحدات القياس
              </h2>
              <div className="space-y-2">
                {(units ?? []).map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-2"
                  >
                    <div>
                      <div className="font-bold text-[12px] text-foreground">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {u.code}
                        {u.symbol ? ` • ${u.symbol}` : ""}
                      </div>
                    </div>
                    {!u.isActive && (
                      <span className="text-[10px] text-destructive">
                        غير نشط
                      </span>
                    )}
                  </div>
                ))}
                {!units?.length && (
                  <p className="text-[12px] text-muted-foreground">
                    لا توجد وحدات بعد
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1">
                <Plus className="h-4 w-4" /> وحدة جديدة
              </h2>
              <div>
                <Label className="text-[11px]">الكود</Label>
                <Input
                  value={unit.code}
                  onChange={e => setUnit({ ...unit, code: e.target.value })}
                  placeholder="KG"
                />
              </div>
              <div>
                <Label className="text-[11px]">الاسم</Label>
                <Input
                  value={unit.name}
                  onChange={e => setUnit({ ...unit, name: e.target.value })}
                  placeholder="كيلوغرام"
                />
              </div>
              <div>
                <Label className="text-[11px]">الرمز</Label>
                <Input
                  value={unit.symbol}
                  onChange={e => setUnit({ ...unit, symbol: e.target.value })}
                  placeholder="kg"
                />
              </div>
              <Button
                className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                disabled={!unit.code || !unit.name || createUnit.isPending}
                onClick={() =>
                  createUnit.mutate({
                    code: unit.code,
                    name: unit.name,
                    symbol: unit.symbol || undefined,
                  })
                }
              >
                {createUnit.isPending ? "جاري الإضافة..." : "إضافة وحدة"}
              </Button>
            </div>
          </div>
        ) : tab === "categories" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:col-span-2">
              <h2 className="text-sm font-bold text-foreground">التصنيفات</h2>
              <div className="space-y-2">
                {(cats ?? []).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-2"
                  >
                    <div>
                      <div className="font-bold text-[12px] text-foreground">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.code} • {c.type}
                      </div>
                    </div>
                  </div>
                ))}
                {!cats?.length && (
                  <p className="text-[12px] text-muted-foreground">
                    لا توجد تصنيفات بعد
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1">
                <Plus className="h-4 w-4" /> تصنيف جديد
              </h2>
              <div>
                <Label className="text-[11px]">الكود</Label>
                <Input
                  value={cat.code}
                  onChange={e => setCat({ ...cat, code: e.target.value })}
                  placeholder="DAIRY"
                />
              </div>
              <div>
                <Label className="text-[11px]">الاسم</Label>
                <Input
                  value={cat.name}
                  onChange={e => setCat({ ...cat, name: e.target.value })}
                  placeholder="منتجات الألبان"
                />
              </div>
              <div>
                <Label className="text-[11px]">النوع</Label>
                <select
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px]"
                  value={cat.type}
                  onChange={e => setCat({ ...cat, type: e.target.value })}
                >
                  <option value="product">منتجات</option>
                  <option value="service">خدمات</option>
                  <option value="expense">مصروفات</option>
                </select>
              </div>
              <Button
                className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                disabled={!cat.code || !cat.name || createCat.isPending}
                onClick={() =>
                  createCat.mutate({
                    name: cat.name,
                  })
                }
              >
                {createCat.isPending ? "جاري الإضافة..." : "إضافة تصنيف"}
              </Button>
            </div>
          </div>
        ) : tab === "currencies" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:col-span-2">
              <h2 className="text-sm font-bold text-foreground">العملات</h2>
              <div className="space-y-2">
                {(curs ?? []).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-2"
                  >
                    <div>
                      <div className="font-bold text-[12px] text-foreground">
                        {c.name}{" "}
                        <span className="text-muted-foreground">
                          ({c.code} • {c.symbol})
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        السعر: {c.rate}
                        {c.isDefault && " • افتراضية"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!c.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[10px] h-7 text-brand"
                          onClick={() => setDefaultCur.mutate({ id: c.id })}
                        >
                          افتراضي
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-7"
                        onClick={() =>
                          setEditCur({
                            id: c.id,
                            name: c.name,
                            symbol: c.symbol,
                            rate: c.rate,
                            isDefault: c.isDefault,
                          })
                        }
                      >
                        تعديل
                      </Button>
                    </div>
                  </div>
                ))}
                {!curs?.length && (
                  <p className="text-[12px] text-muted-foreground">
                    لا توجد عملات
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1">
                <Plus className="h-4 w-4" /> عملة جديدة
              </h2>
              <div>
                <Label className="text-[11px]">الكود</Label>
                <Input
                  value={cur.code}
                  onChange={e =>
                    setCur({ ...cur, code: e.target.value.toUpperCase() })
                  }
                  placeholder="USD"
                />
              </div>
              <div>
                <Label className="text-[11px]">الاسم</Label>
                <Input
                  value={cur.name}
                  onChange={e => setCur({ ...cur, name: e.target.value })}
                  placeholder="الدولار الأمريكي"
                />
              </div>
              <div>
                <Label className="text-[11px]">الرمز</Label>
                <Input
                  value={cur.symbol}
                  onChange={e => setCur({ ...cur, symbol: e.target.value })}
                  placeholder="$"
                />
              </div>
              <div>
                <Label className="text-[11px]">سعر الصرف (مقابل الأساس)</Label>
                <Input
                  value={cur.rate}
                  onChange={e => setCur({ ...cur, rate: e.target.value })}
                  placeholder="1"
                />
              </div>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={cur.isDefault}
                  onChange={e =>
                    setCur({ ...cur, isDefault: e.target.checked })
                  }
                />
                عملة افتراضية
              </label>
              <Button
                className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                disabled={!cur.code || !cur.name || createCur.isPending}
                onClick={() =>
                  createCur.mutate({
                    code: cur.code,
                    name: cur.name,
                    symbol: cur.symbol,
                    rate: cur.rate || "1",
                    isDefault: cur.isDefault,
                  })
                }
              >
                {createCur.isPending ? "جاري الإضافة..." : "إضافة عملة"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">
                  المندوبون والنسب
                </h2>
                <Button
                  size="sm"
                  className="bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                  onClick={() => setShowRepReport(true)}
                >
                  تقرير العمولات
                </Button>
              </div>
              <div className="space-y-2">
                {(reps ?? []).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-2"
                  >
                    <div>
                      <div className="font-bold text-[12px] text-foreground">
                        {r.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.phone ? `${r.phone} • ` : ""}
                        {r.commissionType === "percent"
                          ? `نسبة ${r.commissionValue}%`
                          : `مبلغ ${r.commissionValue}`}
                        {!r.isActive && " • غير نشط"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-7"
                        onClick={() =>
                          setEditRep({
                            id: r.id,
                            name: r.name,
                            phone: r.phone ?? "",
                            commissionType: r.commissionType,
                            commissionValue: r.commissionValue,
                            bonusThreshold: r.bonusThreshold ?? "",
                            bonusAmount: r.bonusAmount ?? "",
                          })
                        }
                      >
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-7 text-destructive"
                        onClick={() => {
                          if (confirm("حذف المندوب؟"))
                            deleteRep.mutate({ id: r.id });
                        }}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
                {!reps?.length && (
                  <p className="text-[12px] text-muted-foreground">
                    لا يوجد مندوبون بعد
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1">
                <Plus className="h-4 w-4" /> مندوب جديد
              </h2>
              <div>
                <Label className="text-[11px]">الاسم</Label>
                <Input
                  value={rep.name}
                  onChange={e => setRep({ ...rep, name: e.target.value })}
                  placeholder="اسم المندوب"
                />
              </div>
              <div>
                <Label className="text-[11px]">الهاتف</Label>
                <Input
                  value={rep.phone}
                  onChange={e => setRep({ ...rep, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div>
                <Label className="text-[11px]">نوع النسبة</Label>
                <select
                  className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px]"
                  value={rep.commissionType}
                  onChange={e =>
                    setRep({ ...rep, commissionType: e.target.value as any })
                  }
                >
                  <option value="percent">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px]">قيمة النسبة</Label>
                <Input
                  value={rep.commissionValue}
                  onChange={e =>
                    setRep({ ...rep, commissionValue: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-[11px]">
                  حد البونص (إجمالي المبيعات)
                </Label>
                <Input
                  value={rep.bonusThreshold}
                  onChange={e =>
                    setRep({ ...rep, bonusThreshold: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
              <div>
                <Label className="text-[11px]">مبلغ البونص</Label>
                <Input
                  value={rep.bonusAmount}
                  onChange={e =>
                    setRep({ ...rep, bonusAmount: e.target.value })
                  }
                  placeholder="اختياري"
                />
              </div>
              <Button
                className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                disabled={!rep.name || createRep.isPending}
                onClick={() =>
                  createRep.mutate({
                    name: rep.name,
                    phone: rep.phone || undefined,
                    commissionType: rep.commissionType,
                    commissionValue: rep.commissionValue || "0",
                    bonusThreshold: rep.bonusThreshold || undefined,
                    bonusAmount: rep.bonusAmount || undefined,
                  })
                }
              >
                {createRep.isPending ? "جاري الإضافة..." : "إضافة مندوب"}
              </Button>
            </div>
          </div>
        )}

        <Dialog open={!!editCur} onOpenChange={o => !o && setEditCur(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">تعديل العملة</DialogTitle>
            </DialogHeader>
            {editCur && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px]">الاسم</Label>
                  <Input
                    value={editCur.name}
                    onChange={e =>
                      setEditCur({ ...editCur, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">الرمز</Label>
                  <Input
                    value={editCur.symbol}
                    onChange={e =>
                      setEditCur({ ...editCur, symbol: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">سعر الصرف</Label>
                  <Input
                    value={editCur.rate}
                    onChange={e =>
                      setEditCur({ ...editCur, rate: e.target.value })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={editCur.isDefault}
                    onChange={e =>
                      setEditCur({ ...editCur, isDefault: e.target.checked })
                    }
                  />
                  عملة افتراضية
                </label>
                <Button
                  className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                  disabled={updateCur.isPending}
                  onClick={() =>
                    updateCur.mutate({
                      id: editCur.id,
                      name: editCur.name,
                      symbol: editCur.symbol,
                      rate: editCur.rate,
                    })
                  }
                >
                  {updateCur.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editRep} onOpenChange={o => !o && setEditRep(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">تعديل المندوب</DialogTitle>
            </DialogHeader>
            {editRep && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px]">الاسم</Label>
                  <Input
                    value={editRep.name}
                    onChange={e =>
                      setEditRep({ ...editRep, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">الهاتف</Label>
                  <Input
                    value={editRep.phone}
                    onChange={e =>
                      setEditRep({ ...editRep, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">نوع النسبة</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px]"
                    value={editRep.commissionType}
                    onChange={e =>
                      setEditRep({ ...editRep, commissionType: e.target.value })
                    }
                  >
                    <option value="percent">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[11px]">قيمة النسبة</Label>
                  <Input
                    value={editRep.commissionValue}
                    onChange={e =>
                      setEditRep({
                        ...editRep,
                        commissionValue: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">حد البونص</Label>
                  <Input
                    value={editRep.bonusThreshold}
                    onChange={e =>
                      setEditRep({ ...editRep, bonusThreshold: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">مبلغ البونص</Label>
                  <Input
                    value={editRep.bonusAmount}
                    onChange={e =>
                      setEditRep({ ...editRep, bonusAmount: e.target.value })
                    }
                  />
                </div>
                <Button
                  className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                  disabled={updateRep.isPending}
                  onClick={() =>
                    updateRep.mutate({
                      id: editRep.id,
                      name: editRep.name,
                      phone: editRep.phone || undefined,
                      commissionType: editRep.commissionType,
                      commissionValue: editRep.commissionValue || "0",
                      bonusThreshold: editRep.bonusThreshold || undefined,
                      bonusAmount: editRep.bonusAmount || undefined,
                    })
                  }
                >
                  {updateRep.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showRepReport} onOpenChange={setShowRepReport}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">تقرير العمولات</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(repReport.data ?? []).map((row: any) => (
                <div
                  key={row.rep.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-2"
                >
                  <div>
                    <div className="font-bold text-[12px] text-foreground">
                      {row.rep.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      إجمالي المبيعات: {row.salesTotal}
                    </div>
                  </div>
                  <div className="text-left text-[11px]">
                    <div>عمولة: {row.commission}</div>
                    <div>بونص: {row.bonus}</div>
                    <div className="font-bold text-brand">
                      الإجمالي: {row.commission + row.bonus}
                    </div>
                  </div>
                </div>
              ))}
              {(repReport.data ?? []).length === 0 && (
                <p className="text-[12px] text-muted-foreground">
                  لا توجد بيانات مبيعات للمندوبين
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
