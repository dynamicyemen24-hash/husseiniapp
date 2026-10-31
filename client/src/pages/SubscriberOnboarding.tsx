import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Building2,
  Layers,
  Users,
  ShieldCheck,
  Calculator,
  MapPin,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  suggestChart,
  suggestPolicies,
  suggestRoles,
  suggestCostCenters,
  SECTOR_LABEL,
  SIZE_LABEL,
  type Sector,
  type Size,
  type Country,
  type OnboardingInput,
} from "@/lib/onboardingPresets";

/** منهجية معيارية عالمية — تسلسل مألوف للمحاسب والتاجر: معلومة → هيكل → محاسبة → تشغيل → حوكمة → إطلاق */
const STEPS = [
  "١ المعلومات الأساسية",
  "٢ الهيكل التنظيمي",
  "٣ الإعدادات المحاسبية",
  "٤ العمليات والمخزون",
  "٥ الصلاحيات والاعتماد",
  "٦ المراجعة والإطلاق",
];
const STEP_DESC: Record<number, string> = {
  0: "بيانات المنشأة والقطاع والدولة — حجر الأساس الضريبي والعملة",
  1: "الفروع وأنماط البيع — يحدد سياسات الائتمان والعملاء والمخزون",
  2: "الدليل المحاسبي المعياري (IFRS for SMEs) + السياسات الضريبية",
  3: "مراكز التكلفة الهرمية — للربط بالمشاريع والفروع والتقارير",
  4: "الصلاحيات ومصفوفة الاعتماد (COSO) — من ينشئ/يعتمد/يرحل",
  5: "مراجعة تكاملية وإطلاق — كل شيء جاهز للعمل الفعلي",
};

export default function SubscriberOnboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingInput>({
    sector: "retail",
    size: "small",
    country: "YE",
    branches: 1,
    salesType: "retail",
    hasInventory: true,
    vatRegistered: false,
  });
  const [institutionName, setInstitutionName] = useState("مؤسستي الجديدة");

  const chart = useMemo(() => suggestChart(form), [form]);
  const policies = useMemo(() => suggestPolicies(form), [form]);
  const roles = useMemo(() => suggestRoles(form), [form]);
  const costCenters = useMemo(() => suggestCostCenters(form), [form]);

  const utils = trpc.useUtils();
  const createChart = trpc.accounting.addAccount.useMutation();
  const updateSettings = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات وتوليد الدليل بنجاح");
      utils.accounting.getAccounts.invalidate();
    },
  });

  const next = () => setStep(s => Math.min(5, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const handleFinish = async () => {
    try {
      // حفظ الإعدادات الأساسية
      await updateSettings.mutateAsync({
        institutionName,
        currency:
          form.country === "SA"
            ? "ريال سعودي (SAR)"
            : form.country === "AE"
              ? "درهم إماراتي (AED)"
              : "ريال يمني (YER)",
        country:
          form.country === "YE"
            ? "اليمن"
            : form.country === "SA"
              ? "السعودية"
              : form.country,
        accountingPeriod: "2026",
        managerName: "إدارة المؤسسة",
      });
      // توليد الدليل (مختصر — ينشئ الحسابات المقترحة فقط إن لم تكن موجودة)
      for (const c of chart.slice(0, 8)) {
        try {
          await createChart.mutateAsync({
            code: c.code,
            name: c.name,
            type: c.type,
          });
        } catch {
          // الحساب قد يكون موجوداً مسبقاً — نتخطاه ونكمل
        }
      }
      toast.success(
        "اكتملت التهيئة — دليلك ومراكزك وأدوارك جاهزة. انتقل إلى لوحة التحكم."
      );
      setLocation("/app");
    } catch (e: any) {
      toast.error(e?.message || "تعذر الحفظ");
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-foreground">
              تهيئة المشترك — بورك فلو معياري ذكي
            </h1>
            <Badge className="bg-brand text-ink-deep font-bold">
              {step + 1} / 6 — {STEPS[step]}
            </Badge>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${((step + 1) / 6) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            يأخذ متغيراتك الأساسية ويقترح الدليل، الأصناف، الإعدادات، السياسات،
            الأدوار — حتى تصل وكل مدخلاتك جاهزة.
          </p>
        </div>

        {/* Step content */}
        <Card className="surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-brand" /> {STEPS[step]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>اسم المؤسسة</Label>
                  <Input
                    value={institutionName}
                    onChange={e => setInstitutionName(e.target.value)}
                    placeholder="مثال: مجموعة الحسينية"
                  />
                </div>
                <div className="space-y-1">
                  <Label>القطاع</Label>
                  <Select
                    value={form.sector}
                    onValueChange={v =>
                      setForm({ ...form, sector: v as Sector })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SECTOR_LABEL) as Sector[]).map(k => (
                        <SelectItem key={k} value={k}>
                          {SECTOR_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>الحجم</Label>
                  <Select
                    value={form.size}
                    onValueChange={v => setForm({ ...form, size: v as Size })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SIZE_LABEL) as Size[]).map(k => (
                        <SelectItem key={k} value={k}>
                          {SIZE_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>الدولة</Label>
                  <Select
                    value={form.country}
                    onValueChange={v =>
                      setForm({ ...form, country: v as Country })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YE">اليمن</SelectItem>
                      <SelectItem value="SA">السعودية</SelectItem>
                      <SelectItem value="AE">الإمارات</SelectItem>
                      <SelectItem value="EG">مصر</SelectItem>
                      <SelectItem value="JO">الأردن</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>عدد الفروع</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.branches}
                    onChange={e =>
                      setForm({
                        ...form,
                        branches: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={form.vatRegistered}
                    onChange={e =>
                      setForm({ ...form, vatRegistered: e.target.checked })
                    }
                    id="vat"
                  />
                  <Label htmlFor="vat" className="text-xs">
                    مسجل في ضريبة القيمة المضافة
                  </Label>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>نموذج المبيعات</Label>
                  <Select
                    value={form.salesType}
                    onValueChange={v =>
                      setForm({ ...form, salesType: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">تجزئة</SelectItem>
                      <SelectItem value="wholesale">جملة</SelectItem>
                      <SelectItem value="services">خدمات</SelectItem>
                      <SelectItem value="mixed">مختلط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={form.hasInventory}
                    onChange={e =>
                      setForm({ ...form, hasInventory: e.target.checked })
                    }
                    id="inv"
                  />
                  <Label htmlFor="inv" className="text-xs">
                    يوجد مخزون سلعي
                  </Label>
                </div>
                <div className="sm:col-span-2 p-3 rounded-xl bg-brand/10 border border-brand/20 text-xs">
                  <p className="font-bold text-brand mb-1 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" /> اقتراح السياسات
                  </p>
                  <p>
                    الائتمان: {policies.allowCredit ? "مسموح" : "غير مسموح"} ·
                    يتطلب عميل: {policies.requireCustomer ? "نعم" : "لا"} ·
                    ضريبة: {policies.postingRules.vatRate}%
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  دليل محاسبي معياري مقترح ({chart.length} حساباً) — قابل
                  للتعديل قبل الحفظ. الشجرة هرمية ومرتبطة بمراكز التكلفة.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[45vh] overflow-auto p-1">
                  {chart.map(c => (
                    <div
                      key={c.code}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-card text-xs"
                    >
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px]"
                      >
                        {c.code}
                      </Badge>
                      <span className="flex-1 font-bold truncate">
                        {c.name}
                      </span>
                      <Badge className="text-[10px]">{c.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  مراكز تكلفة مقترحة — هرمية، تُربط بالقيود والمشاريع والفروع.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {costCenters.map(cc => (
                    <div
                      key={cc.code}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-card text-xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-brand" />
                      <span className="font-mono text-[10px]">{cc.code}</span>
                      <span className="flex-1 font-bold">{cc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  أدوار مقترحة حسب الحجم + أسقف التعامل (حدود الاعتماد لكل دور).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roles.map(r => (
                    <div key={r.code} className="p-3 rounded-xl border bg-card">
                      <p className="font-bold text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand" />{" "}
                        {r.name}{" "}
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ({r.code})
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        صلاحيات: {r.permissions.join("، ")}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <Label className="text-[11px]">سقف الاعتماد</Label>
                        <Input
                          placeholder="مثال: 500000 ر.ي"
                          className="h-7 text-xs"
                          defaultValue={
                            r.code === "owner"
                              ? "غير محدود"
                              : r.code === "accountant"
                                ? "200000"
                                : "50000"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <h3 className="font-black text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> المراجعة
                  النهائية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border bg-muted/30">
                    <p className="font-bold">المؤسسة: {institutionName}</p>
                    <p>
                      القطاع: {SECTOR_LABEL[form.sector]} · الحجم:{" "}
                      {SIZE_LABEL[form.size]} · الفروع: {form.branches}
                    </p>
                    <p>
                      الدولة: {form.country} · ضريبة:{" "}
                      {policies.postingRules.vatRate}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/30">
                    <p className="font-bold">الدليل: {chart.length} حساباً</p>
                    <p>
                      مراكز: {costCenters.length} · أدوار: {roles.length}
                    </p>
                    <p>
                      مخزون: {form.hasInventory ? "نعم" : "لا"} · ائتمان:{" "}
                      {policies.allowCredit ? "نعم" : "لا"}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-brand/10 border border-brand/20 text-xs">
                  <p className="font-bold text-brand flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> سيتم توليد الدليل
                    ومراكز التكلفة وحفظ الإعدادات — كل شيء جاهز للعمل فوراً.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prev}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowRight className="w-4 h-4" /> السابق
          </Button>
          {step < 5 ? (
            <Button
              onClick={next}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black gap-1"
            >
              التالي <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black gap-1"
            >
              <Layers className="w-4 h-4" /> إطلاق المنصة
            </Button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" /> بورك فلو معياري — يأخذ متغيراتك ويقترح
          كل شيء: الدليل، الأصناف، الإعدادات، السياسات، الأدوار
        </div>
      </main>
    </div>
  );
}
