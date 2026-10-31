import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { toast } from "sonner";
import { whatsappLink } from "@/lib/brand";
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Check,
  MessageSquare,
  Download,
  AlertTriangle,
  Wallet,
  Globe,
  CreditCard,
  Landmark,
  ShieldCheck,
  Receipt,
  Loader2,
  ExternalLink,
  Settings2,
  Save,
  RotateCcw,
  Mail,
  Smartphone,
  X,
} from "lucide-react";

/* ─── بيانات شاشة الدفع الديناميكية ────────────────────────────────── */

type CountryOption = { code: string; name: string; flag: string };

/** قائمة الدول القابلة للتخصيص — تُستخدم لتسعير الباقات حسب الدولة. */
const COUNTRIES: CountryOption[] = [
  { code: "YE", name: "اليمن", flag: "🇾🇪" },
  { code: "SA", name: "السعودية", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات", flag: "🇦🇪" },
  { code: "US", name: "أمريكا", flag: "🇺🇸" },
  { code: "EG", name: "مصر", flag: "🇪🇬" },
  { code: "KW", name: "الكويت", flag: "🇰🇼" },
  { code: "QA", name: "قطر", flag: "🇶🇦" },
  { code: "JO", name: "الأردن", flag: "🇯🇴" },
];

type CountryPrice = {
  countryCode: string;
  country?: string;
  currency: string;
  priceMonthly: string;
  priceYearly: string;
  taxPercent?: number;
};

function priceFor(plan: any, countryCode: string, cycle: "monthly" | "yearly") {
  const list = Array.isArray(plan?.countryPricing)
    ? (plan.countryPricing as CountryPrice[])
    : [];
  const hit = list.find(
    p => p.countryCode.toUpperCase() === countryCode.toUpperCase()
  );
  if (hit) {
    return {
      amount: cycle === "yearly" ? hit.priceYearly : hit.priceMonthly,
      currency: hit.currency,
      taxPercent: hit.taxPercent ?? 0,
    };
  }
  return {
    amount: cycle === "yearly" ? plan?.priceYearly : plan?.priceMonthly,
    currency: plan?.currency ?? "YER",
    taxPercent: 0,
  };
}

const GATEWAY_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  bank_transfer: Landmark,
  cash: Wallet,
  tap: CreditCard,
  moyasar: CreditCard,
  stripe: CreditCard,
  manual: Settings2,
};

const MANUAL_PROVIDERS = ["bank_transfer", "cash", "whatsapp", "manual"];

/** نوع بيانات بوابة الدفع المعرَّض للعميل (بدون أسرار). */
type PublicGateway = {
  id: number;
  code: string;
  providerType: string;
  name: string;
  country: string;
  countryCode: string;
  currency: string;
  mode: string;
  feePercent: string | null;
  feeFixed: string | null;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
};
export default function Billing() {
  const [, setLocation] = useLocation();
  const [countryCode, setCountryCode] = useState("YE");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [pendingInvoice, setPendingInvoice] = useState<any>(null);
  const [pendingGateway, setPendingGateway] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const overview = trpc.billing.accessOverview.useQuery(undefined, {
    staleTime: 15_000,
  });
  const plans = trpc.billing.listPlans.useQuery(undefined, {
    staleTime: 60_000,
  });
  const gateways = trpc.billing.listGateways.useQuery(undefined, {
    staleTime: 30_000,
  });

  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: res => {
      setPendingInvoice(res.invoice);
      setPendingGateway(res.gateway);
      if (res.checkoutUrl) {
        window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("تم إنشاء الفاتورة بنجاح");
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const access = overview.data?.access;
  const banner = access?.banner ?? null;
  const currentPlan = overview.data?.plan;
  const invoices = overview.data?.invoices ?? [];
  const countryFlag = COUNTRIES.find(c => c.code === countryCode)?.flag ?? "🌍";

  const featuredPlan =
    plans.data?.find(p => p.code === selectedPlan) ??
    plans.data?.[1] ??
    plans.data?.[0];

  const handleCheckout = () => {
    if (!selectedPlan || !selectedGateway) {
      toast.error("اختر الباقة ووسيلة الدفع أولاً");
      return;
    }
    checkout.mutate({
      planCode: selectedPlan,
      cycle,
      gatewayCode: selectedGateway,
      countryCode,
    });
  };

  const resetInvoice = () => {
    setPendingInvoice(null);
    setPendingGateway(null);
    setSelectedPlan(null);
    setSelectedGateway(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-display flex">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* ── Header Section ── */}
        <div className="brand-gradient text-white">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <button
              onClick={() => setLocation("/app")}
              className="flex items-center gap-1.5 text-xs text-brand-300 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              العودة للوحة التحكم
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand text-ink-deep flex items-center justify-center font-bold shadow-lg">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black font-display">
                  مركز الاشتراك والفوترة
                </h1>
                <p className="text-xs text-white/70 mt-0.5">
                  باقات مرنة لكل دولة، وسائل دفع متعددة، وعمل لا يتوقف أبداً.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-8 w-full">
          {/* ── Access Banner ── */}
          {banner && (
            <div
              className={`rounded-2xl border px-5 py-4 flex items-start gap-4 ${
                banner.kind === "info"
                  ? "border-brand/20 bg-brand-50 dark:bg-brand-500/10"
                  : banner.kind === "warning"
                    ? "border-amber-300/40 bg-amber-50 dark:bg-amber-500/10"
                    : "border-rose-300/40 bg-rose-50 dark:bg-rose-500/10"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  banner.kind === "info"
                    ? "text-brand"
                    : banner.kind === "warning"
                      ? "text-amber-600"
                      : "text-rose-600"
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-black">{banner.titleAr}</p>
                <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
                  {banner.messageAr}
                </p>
              </div>
            </div>
          )}

          {/* ── Current Status Card ── */}
          <div className="surface rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black">وضع وصول النظام</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {access?.level === "full"
                      ? "صلاحيات كاملة — عملك متواصل"
                      : access?.level === "restricted"
                        ? "قيود على ميزات متقدمة فقط — العمليات اليومية متاحة"
                        : access?.level === "readonly"
                          ? "وضع القراءة الآمن — البيانات كاملة ومرئية"
                          : "بيانات محفوظة بالكامل"}
                    {currentPlan ? ` · باقة الحالية: ${currentPlan.name}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setShowAdmin(v => !v)}
                >
                  <Settings2 className="w-3.5 h-3.5 ml-1" />
                  إعدادات الدفع والبوابات
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setLocation("/pricing")}
                >
                  مقارنة الباقات
                </Button>
              </div>
            </div>
          </div>

          {/* ── اختيار الدولة + الدورة ── */}
          <section className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 sm:max-w-xs">
              <Label className="text-[11px] font-bold mb-1.5 block">
                <Globe className="w-3.5 h-3.5 inline ml-1" />
                الدولة (تسعير محلي تلقائي)
              </Label>
              <Select
                value={countryCode}
                onValueChange={v => {
                  setCountryCode(v);
                  setPendingInvoice(null);
                  setPendingGateway(null);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 sm:max-w-xs">
              <Label className="text-[11px] font-bold mb-1.5 block">
                دورة الفوترة
              </Label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1 bg-muted/30">
                {(["monthly", "yearly"] as const).map(cy => (
                  <button
                    key={cy}
                    onClick={() => setCycle(cy)}
                    className={`rounded-lg h-8 text-xs font-bold transition-all ${
                      cycle === cy
                        ? "bg-brand text-ink-deep shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cy === "monthly" ? "شهري" : "سنوي (خصم شهرين)"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 sm:max-w-xs flex items-end">
              <div className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground bg-muted/20">
                <span className="font-bold">{countryFlag}</span> تُسعّر بعملة{" "}
                <span className="font-mono">{countryCode.toUpperCase()}</span> —
                تُفعّل عند إنشاء الفاتورة.
              </div>
            </div>
          </section>

          {/* ── Pricing Section ── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <Crown className="w-5 h-5 text-brand" />
                الباقات المتاحة
              </h3>
              {cycle === "yearly" && (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                  🎁 وفّر شهرين
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.data?.map(plan => {
                const p = priceFor(plan, countryCode, cycle);
                const isSelected = selectedPlan === plan.code;
                const features = Array.isArray(plan.features)
                  ? (plan.features as string[])
                  : [];
                return (
                  <Card
                    key={plan.code}
                    onClick={() => {
                      setSelectedPlan(plan.code);
                      setPendingInvoice(null);
                      setPendingGateway(null);
                    }}
                    className={`cursor-pointer surface rounded-2xl transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? "ring-2 ring-brand/70 shadow-lg"
                        : "hover:ring-1 hover:ring-brand/30"
                    }`}
                  >
                    <div className="relative p-5">
                      {plan.code === "growth" && (
                        <span className="absolute -top-2.5 left-4 bg-brand text-ink-deep text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                          الأكثر طلباً
                        </span>
                      )}
                      <h4 className="text-sm font-black">{plan.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 min-h-10 leading-relaxed">
                        {plan.description}
                      </p>
                      <div className="mt-3">
                        <span className="text-2xl font-black">{p.amount}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {p.currency} / {cycle === "monthly" ? "شهري" : "سنوي"}
                        </span>
                        {p.taxPercent > 0 && (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            شامل ضريبة {p.taxPercent}%
                          </span>
                        )}
                      </div>
                      <ul className="mt-4 space-y-2">
                        {features.map(f => (
                          <li
                            key={f}
                            className="flex items-start gap-2 text-[11px] text-foreground/85"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {plan.maxUsers > 0 && (
                        <p className="mt-3 text-[10px] text-muted-foreground">
                          حتى {plan.maxUsers} مستخدِم
                          {plan.maxBranches > 1
                            ? ` · ${plan.maxBranches} فروع`
                            : ""}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
          {/* ── Payment Gateways Section ── */}
          <section className="space-y-6">
            <h3 className="text-base font-black flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand" />
              وسائل الدفع
            </h3>
            {gateways.data?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gateways.data.map((gw: PublicGateway) => {
                  const Icon = GATEWAY_ICONS[gw.providerType] ?? Wallet;
                  const isSelected = selectedGateway === gw.code;
                  const isManual = MANUAL_PROVIDERS.includes(gw.providerType);
                  return (
                    <button
                      key={gw.code}
                      onClick={() => {
                        setSelectedGateway(gw.code);
                        setPendingInvoice(null);
                        setPendingGateway(null);
                      }}
                      className={`text-right rounded-2xl p-5 border transition-all ${
                        isSelected
                          ? "border-brand ring-2 ring-brand/60 bg-brand-50 dark:bg-brand-500/10 shadow-md"
                          : "border-border bg-surface hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black truncate">
                            {gw.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isManual
                              ? "تأكيد يدوي خلال دقائق"
                              : gw.mode === "live"
                                ? "تفعيل فوري تلقائي"
                                : "بوابة إلكترونية"}
                          </p>
                        </div>
                      </div>
                      {gw.feePercent && Number(gw.feePercent) > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          رسوم {gw.feePercent}%
                          {gw.feeFixed && Number(gw.feeFixed) > 0
                            ? ` + ${gw.feeFixed}`
                            : ""}
                        </p>
                      )}
                      {gw.instructions && (
                        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                          {gw.instructions}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                لا توجد وسائل دفع مفعّلة حالياً — تابع معنا عبر واتساب.
              </div>
            )}
          </section>

          {/* ── Checkout Summary ── */}
          {(selectedPlan || pendingInvoice) && (
            <section className="rounded-2xl border border-brand/30 bg-surface p-6 shadow-md">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="min-w-0">
                  <h4 className="text-base font-black flex items-center gap-2">
                    {pendingInvoice ? (
                      <>
                        <Receipt className="w-5 h-5 text-brand" />
                        الفاتورة جاهزة
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        تأكيد الدفع
                      </>
                    )}
                  </h4>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    {!pendingInvoice ? (
                      <>
                        <p>
                          الباقة المختارة:{" "}
                          <span className="font-bold">
                            {featuredPlan?.name ?? selectedPlan}
                          </span>
                        </p>
                        <p>
                          الدولة:{" "}
                          <span className="font-bold">
                            {countryFlag} {countryCode.toUpperCase()}
                          </span>{" "}
                          · الدورة:{" "}
                          <span className="font-bold">
                            {cycle === "monthly" ? "شهرية" : "سنوية"}
                          </span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          رقم الفاتورة:{" "}
                          <b className="font-mono text-foreground">
                            {pendingInvoice.invoiceNumber}
                          </b>
                        </p>
                        <p>
                          الإجمالي:{" "}
                          <b className="text-lg">
                            {pendingInvoice.total} {pendingInvoice.currency}
                          </b>
                        </p>
                        <p className="text-emerald-600 font-bold">
                          {pendingGateway?.name} — لم يُخصم مبلغ منك بعد.
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  {pendingInvoice ? (
                    <>
                      {pendingGateway?.instructions && (
                        <p className="hidden lg:block text-xs text-muted-foreground max-w-64">
                          {pendingGateway.instructions}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 text-sm"
                        onClick={resetInvoice}
                      >
                        <RotateCcw className="w-4 h-4 ml-1" />
                        فاتورة أخرى
                      </Button>
                      <a
                        href={whatsappLink(
                          `السلام عليكم، أودّ إتمام الدفع للفاتورة رقم ${pendingInvoice.invoiceNumber} بمبلغ ${pendingInvoice.total} ${pendingInvoice.currency}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-ink-deep text-sm font-bold h-10 px-5 rounded-xl transition-all shadow-md"
                      >
                        <MessageSquare className="w-4 h-4" />
                        إرسال تأكيد الدفع
                      </a>
                    </>
                  ) : (
                    <Button
                      size="lg"
                      className="h-11 text-sm"
                      onClick={handleCheckout}
                      disabled={checkout.isPending}
                    >
                      {checkout.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 ml-2" />
                      )}
                      إنشاء الفاتورة ومتابعة الدفع
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Invoice History ── */}
          {invoices.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-base font-black flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand" />
                سجل الفواتير
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
                <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-bold">الرقم</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">الإجمالي</th>
                      <th className="px-4 py-3 font-bold">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr
                        key={inv.id}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              inv.status === "paid"
                                ? "bg-emerald-100 text-emerald-700 font-bold"
                                : "bg-amber-100 text-amber-700 font-bold"
                            }
                          >
                            {inv.status === "paid" ? "مدفوعة" : "قيد الانتظار"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {inv.total} {inv.currency}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(
                            inv.createdAt ?? inv.dueDate
                          ).toLocaleDateString("ar")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Admin Panel (Owner Only) ── */}
          {showAdmin && <OwnerAdminPanel />}

          {/* ── Trust & Flexibility Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            <div className="surface rounded-2xl p-6 space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-black">
                <Sparkles className="w-5 h-5 text-brand" />
                التزام بالمرونة
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  المرونة المعتمدة: تجربة ← نشط ← مهلة مرنة، وموقوف فقط بطلبك
                  الصريح.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  لا يُوقف نظامك تلقائياً أبداً — أعمالك مستمرة.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  البيانات معزولة ومشفّرة مع نسخ احتياطية يومية.
                </li>
              </ul>
            </div>
            <div className="surface rounded-2xl p-6 space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-black">
                <MessageSquare className="w-5 h-5 text-brand" />
                وسائل دفع محلية
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                بوابات دفع قابلة للتخصيص لكل دولة وعملة — التحويل البنكي،
                المحافظ، البطاقات، والدفع عبر واتساب.
              </p>
              <a
                href={whatsappLink(
                  "السلام عليكم، أودّ الاستفسار عن وسائل الدفع المتاحة للاشتراك."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-deep transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                استفسر عن وسائل الدفع
              </a>
            </div>
            <div className="surface rounded-2xl p-6 space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-black">
                <Download className="w-5 h-5 text-brand" />
                المنصة على جهازك
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ثبّت النظام كتطبيق سطح مكتب أو موبايل، واعمل أوفلاين مع مزامنة
                تلقائية عند عودة الاتصال.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/download")}
                className="h-10 text-sm"
              >
                <Download className="w-4 h-4 ml-2" />
                تحميل التطبيق
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
/* ─── لوحة إدارة المشغّل (SaaS Admin) — للمالك فقط ─────────────────── */
function OwnerAdminPanel() {
  const overview = trpc.billing.accessOverview.useQuery(undefined, {
    staleTime: 15_000,
  });
  const adminGateways = trpc.billing.adminListGateways.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });
  const updatePolicy = trpc.billing.adminUpdatePolicy.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ سياسة الاشتراك");
      overview.refetch();
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const upsertGateway = trpc.billing.upsertGateway.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ البوابة");
      adminGateways.refetch();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  // ── أكواد التفعيل: إنشاء + قائمة + إرسال (بريد/واتساب/SMS) ──────────
  const plans = trpc.billing.listPlans.useQuery(undefined, {
    staleTime: 60_000,
  });
  const adminCodes = trpc.billing.adminListCodes.useQuery(
    { limit: 100 },
    { staleTime: 15_000, retry: false }
  );
  const createCode = trpc.billing.createSubscriptionCode.useMutation({
    onSuccess: res => {
      toast.success(`تم إنشاء ${res.created.length} كود تفعيل`);
      adminCodes.refetch();
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const sendCode = trpc.billing.sendSubscriptionCode.useMutation({
    onSuccess: res => {
      if (res.delivered && res.channel !== "email_console") {
        toast.success("رمز التفعيل جاهز للإرسال");
      } else if (res.warning) {
        toast.warning(res.warning);
      }
      setSendResult(res);
      adminCodes.refetch();
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const [codeForm, setCodeForm] = useState({
    planId: 0,
    price: "0",
    country: "اليمن",
    countryCode: "YE",
    currency: "YER",
    periodMonths: 1,
    quantity: 1,
  });
  const [sendForm, setSendForm] = useState<{
    id: number;
    code: string;
    mode: "email" | "whatsapp" | "sms";
    target: string;
  } | null>(null);
  const [sendResult, setSendResult] = useState<{
    waLink: string | null;
    smsLink: string | null;
    channel: string;
    messageText?: string | null;
  } | null>(null);

  const submitCreateCode = () => {
    const planId = codeForm.planId || plans.data?.[0]?.id;
    if (!planId) {
      toast.error("لا توجد باقات — أنشئ باقة أولاً");
      return;
    }
    createCode.mutate({
      planId,
      price: String(codeForm.price || "0"),
      country: codeForm.country,
      countryCode: codeForm.countryCode.toUpperCase(),
      currency: codeForm.currency.toUpperCase(),
      periodMonths: Number(codeForm.periodMonths) || 1,
      quantity: Number(codeForm.quantity) || 1,
      deliveryMode: "manual",
    });
  };

  const submitSendCode = () => {
    if (!sendForm) return;
    sendCode.mutate({
      id: sendForm.id,
      mode: sendForm.mode,
      target: sendForm.target.trim(),
    });
  };

  const policy = overview.data?.policy;
  const [policyForm, setPolicyForm] = useState({
    trialDays: 14,
    graceDays: 30,
    graceFullAccess: true,
    maxOverdueDays: 120,
    restrictedFeatures:
      "exports, zatca, api_keys, ai_assistant, add_user, add_branch, backups",
  });
  const [gwId, setGwId] = useState<number | null>(null);
  const [gwForm, setGwForm] = useState<Record<string, string | boolean>>({
    code: "",
    providerType: "whatsapp",
    name: "",
    countryCode: "YE",
    currency: "YER",
    mode: "test",
    checkoutUrlTemplate: "",
    instructions: "",
    credentials: "{}",
    isActive: true,
  });

  useEffect(() => {
    if (!policy) return;
    setPolicyForm(f => ({
      trialDays: policy.trialDays ?? f.trialDays,
      graceDays: policy.graceDays ?? f.graceDays,
      graceFullAccess: policy.graceFullAccess ?? f.graceFullAccess,
      maxOverdueDays: policy.maxOverdueDays ?? f.maxOverdueDays,
      restrictedFeatures:
        (Array.isArray(policy.restrictedFeatures)
          ? (policy.restrictedFeatures as string[]).join(", ")
          : "") || f.restrictedFeatures,
    }));
  }, [policy]);

  if (adminGateways.isError) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-black flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-brand" />
          إعدادات الدفع والبوابات
        </h3>
        <p className="text-[11px] text-muted-foreground mt-2">
          هذه اللوحة متاحة لمالك المنصة فقط.
        </p>
      </section>
    );
  }

  const selectGateway = (id: number) => {
    const g = adminGateways.data?.find(x => x.id === id);
    if (!g) return;
    setGwId(id);
    setGwForm({
      code: g.code,
      providerType: g.providerType,
      name: g.name,
      countryCode: g.countryCode,
      currency: g.currency,
      mode: g.mode,
      checkoutUrlTemplate: g.checkoutUrlTemplate ?? "",
      instructions: g.instructions ?? "",
      credentials: "{}",
      isActive: g.isActive,
    });
  };

  const savePolicy = () => {
    updatePolicy.mutate({
      trialDays: Number(policyForm.trialDays) || 14,
      graceDays: Number(policyForm.graceDays) || 30,
      graceFullAccess: policyForm.graceFullAccess,
      maxOverdueDays: Number(policyForm.maxOverdueDays) || 120,
      restrictedFeatures: policyForm.restrictedFeatures
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
      dunningReminderDays: [7, 3, 1, 0, -3, -7],
    });
  };

  const saveGateway = () => {
    let credentials: Record<string, string>;
    try {
      credentials = JSON.parse(String(gwForm.credentials || "{}"));
    } catch {
      toast.error("البيانات السرية يجب أن تكون JSON صحيحاً");
      return;
    }
    upsertGateway.mutate({
      id: gwId ?? undefined,
      code: String(gwForm.code).trim(),
      providerType: String(gwForm.providerType) as any,
      name: String(gwForm.name).trim(),
      countryCode: String(gwForm.countryCode).toUpperCase(),
      currency: String(gwForm.currency).toUpperCase(),
      mode: String(gwForm.mode) as "test" | "live",
      credentials,
      feePercent: "0",
      feeFixed: "0",
      instructions: String(gwForm.instructions || null),
      checkoutUrlTemplate: String(gwForm.checkoutUrlTemplate || null),
      isActive: Boolean(gwForm.isActive),
      sortOrder: 0,
    });
  };
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 space-y-6">
      <h3 className="text-base font-black flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-brand" />
        إعدادات الدفع والبوابات (للمالك)
      </h3>

      {/* سياسة الاشتراك المرنة */}
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
        <h4 className="text-sm font-black flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          سياسة الاشتراك — لا يتوقف العمل أبداً
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              أيام التجربة
            </Label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={policy?.trialDays ?? policyForm.trialDays}
              onChange={e =>
                setPolicyForm(f => ({
                  ...f,
                  trialDays: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              أيام المهلة (كاملة)
            </Label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={policyForm.graceDays}
              onChange={e =>
                setPolicyForm(f => ({
                  ...f,
                  graceDays: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              حد القراءة فقط
            </Label>
            <Input
              type="number"
              className="h-9 text-sm"
              value={policyForm.maxOverdueDays}
              onChange={e =>
                setPolicyForm(f => ({
                  ...f,
                  maxOverdueDays: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              المهلة بكامل الصلاحيات
            </Label>
            <button
              onClick={() =>
                setPolicyForm(f => ({
                  ...f,
                  graceFullAccess: !f.graceFullAccess,
                }))
              }
              className={`w-full rounded-lg h-9 text-sm font-bold border transition-all ${
                policyForm.graceFullAccess
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                  : "bg-muted/40 text-muted-foreground border-border"
              }`}
            >
              {policyForm.graceFullAccess ? "نعم — مفعّلة" : "لا"}
            </button>
          </div>
        </div>
        <div>
          <Label className="text-xs font-bold mb-1.5 block">
            الميزات المقيّدة بعد المهلة (بفواصل)
          </Label>
          <Textarea
            className="text-sm h-20"
            value={policyForm.restrictedFeatures}
            onChange={e =>
              setPolicyForm(f => ({
                ...f,
                restrictedFeatures: e.target.value,
              }))
            }
          />
        </div>
        <Button
          size="sm"
          className="h-10 text-sm"
          onClick={savePolicy}
          disabled={updatePolicy.isPending}
        >
          {updatePolicy.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
          ) : (
            <Save className="w-3.5 h-3.5 ml-1" />
          )}
          حفظ السياسة
        </Button>
      </div>

      {/* Payment Gateways */}
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
        <h4 className="text-sm font-black flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-brand" />
          بوابات الدفع الديناميكية
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {adminGateways.data?.map(g => (
            <button
              key={g.id}
              onClick={() => selectGateway(g.id)}
              className={`text-right rounded-xl border p-3 text-sm transition-all ${
                gwId === g.id
                  ? "border-brand ring-1 ring-brand/50 bg-brand-50 dark:bg-brand-500/10"
                  : "border-border hover:border-brand/40"
              }`}
            >
              <span className="font-black">{g.name}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {g.providerType} · {g.countryCode} · {g.currency}
                {g.isActive ? " · نشطة" : " · معطّلة"}
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setGwId(null);
              setGwForm({
                code: "",
                providerType: "whatsapp",
                name: "",
                countryCode: "YE",
                currency: "YER",
                mode: "test",
                checkoutUrlTemplate: "",
                instructions: "",
                credentials: "{}",
                isActive: true,
              });
            }}
            className="rounded-xl border border-dashed border-brand/40 text-brand text-sm font-bold p-3 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all"
          >
            + بوابة جديدة
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">الرمز</Label>
            <Input
              className="h-9 text-sm"
              value={String(gwForm.code)}
              onChange={e => setGwForm(f => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">النوع</Label>
            <Select
              value={String(gwForm.providerType)}
              onValueChange={v => setGwForm(f => ({ ...f, providerType: v }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "whatsapp",
                  "bank_transfer",
                  "cash",
                  "tap",
                  "moyasar",
                  "stripe",
                  "manual",
                ].map(t => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">الاسم</Label>
            <Input
              className="h-9 text-sm"
              value={String(gwForm.name)}
              onChange={e => setGwForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              الدولة (رمز)
            </Label>
            <Input
              className="h-9 text-sm uppercase"
              maxLength={2}
              value={String(gwForm.countryCode)}
              onChange={e =>
                setGwForm(f => ({ ...f, countryCode: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">العملة</Label>
            <Input
              className="h-9 text-sm uppercase"
              maxLength={3}
              value={String(gwForm.currency)}
              onChange={e =>
                setGwForm(f => ({ ...f, currency: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">الوضع</Label>
            <Select
              value={String(gwForm.mode)}
              onValueChange={v => setGwForm(f => ({ ...f, mode: v }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">اختباري</SelectItem>
                <SelectItem value="live">مباشر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold">قالب رابط الدفع</Label>
            <Input
              className="h-8 text-xs mt-1"
              placeholder="https://.../{amount}/{invoice}"
              value={String(gwForm.checkoutUrlTemplate)}
              onChange={e =>
                setGwForm(f => ({ ...f, checkoutUrlTemplate: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold">نشطة؟</Label>
            <button
              onClick={() => setGwForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`mt-2 w-full rounded-lg h-8 text-xs font-bold border transition-all ${
                gwForm.isActive
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                  : "bg-muted/40 text-muted-foreground border-border"
              }`}
            >
              {gwForm.isActive ? "نشطة" : "معطّلة"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold">
              التعليمات (تظهر للعميل)
            </Label>
            <Textarea
              className="mt-1 text-xs h-14"
              value={String(gwForm.instructions)}
              onChange={e =>
                setGwForm(f => ({ ...f, instructions: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold">
              البيانات السرية (JSON حسب المزوّد)
            </Label>
            <Textarea
              className="mt-1 text-xs h-14 font-mono"
              value={String(gwForm.credentials)}
              onChange={e =>
                setGwForm(f => ({ ...f, credentials: e.target.value }))
              }
            />
          </div>
        </div>

        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={saveGateway}
          disabled={upsertGateway.isPending}
        >
          {upsertGateway.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
          ) : (
            <Save className="w-3.5 h-3.5 ml-1" />
          )}
          حفظ البوابة
        </Button>
      </div>

      {/* ── أكواد التفعيل: الرمز نفسه هو مفتاح تنشيط الاشتراك ─────────── */}
      <div className="mt-8 border-t pt-8 space-y-6">
        <div>
          <h3 className="text-base font-black mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            أكواد التفعيل (الدفع المحلي واليدوي)
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            أنشئ كوبونات بأي عملة ودولة، ثم أرسل الرمز للعميل عبر{" "}
            <strong>البريد</strong> أو <strong>واتساب</strong> أو{" "}
            <strong>SMS</strong> — يفعّل العميل اشتراكه ذاتياً من صفحة{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              /claim
            </code>{" "}
            بدون بوابة دفع خارجية. مثالي للتحويل البنكي والاستلام المحلي.
          </p>
        </div>

        {/* إنشاء أكواد */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div>
            <Label className="text-xs font-bold mb-1.5 block">الباقة</Label>
            <Select
              value={String(codeForm.planId || plans.data?.[0]?.id || "")}
              onValueChange={v =>
                setCodeForm(f => ({ ...f, planId: Number(v) }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent>
                {plans.data?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">السعر</Label>
            <Input
              className="h-9 text-sm"
              inputMode="decimal"
              value={codeForm.price}
              onChange={e =>
                setCodeForm(f => ({ ...f, price: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">العملة</Label>
            <Input
              className="h-9 text-sm uppercase"
              maxLength={3}
              value={codeForm.currency}
              onChange={e =>
                setCodeForm(f => ({ ...f, currency: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              الدولة (رمز)
            </Label>
            <Input
              className="h-9 text-sm uppercase"
              maxLength={2}
              value={codeForm.countryCode}
              onChange={e =>
                setCodeForm(f => ({ ...f, countryCode: e.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">
              المدة (أشهر)
            </Label>
            <Input
              className="h-9 text-sm"
              inputMode="numeric"
              value={codeForm.periodMonths}
              onChange={e =>
                setCodeForm(f => ({
                  ...f,
                  periodMonths: Number(e.target.value) || 1,
                }))
              }
            />
          </div>
          <div>
            <Label className="text-xs font-bold mb-1.5 block">العدد</Label>
            <Input
              className="h-9 text-sm"
              inputMode="numeric"
              value={codeForm.quantity}
              onChange={e =>
                setCodeForm(f => ({
                  ...f,
                  quantity: Number(e.target.value) || 1,
                }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              className="h-9 text-sm w-full"
              onClick={submitCreateCode}
              disabled={createCode.isPending}
            >
              {createCode.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-1" />
              ) : (
                <Save className="w-4 h-4 ml-1" />
              )}
              إنشاء
            </Button>
          </div>
        </div>

        {/* قائمة الأكواد */}
        <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-right p-3 font-bold">الرمز</th>
                <th className="text-right p-3 font-bold">الباقة</th>
                <th className="text-right p-3 font-bold">القيمة</th>
                <th className="text-right p-3 font-bold">الحالة</th>
                <th className="text-left p-3 font-bold">إرسال</th>
              </tr>
            </thead>
            <tbody>
              {adminCodes.data?.map(c => (
                <tr
                  key={c.id}
                  className="border-t border-border hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3 font-mono font-bold tracking-wider">
                    {c.code}
                  </td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 whitespace-nowrap">
                    {c.price} {c.currency} / {c.periodMonths} شهر
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        c.status === "used"
                          ? "bg-muted text-muted-foreground"
                          : c.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.status === "used"
                        ? "مستهلك"
                        : c.status === "active"
                          ? "نشط"
                          : "مسودة"}
                    </span>
                  </td>
                  <td className="p-3 text-left">
                    {c.status !== "used" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() =>
                          setSendForm({
                            id: c.id,
                            code: c.code,
                            mode: "whatsapp",
                            target: c.deliveryTarget ?? "",
                          })
                        }
                      >
                        <MessageSquare className="w-3.5 h-3.5 ml-1" />
                        إرسال
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {adminCodes.data?.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    لا توجد أكواد بعد — أنشئ أول كود تفعيل بالأعلى.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* لوحة الإرسال: الرمز هو مفتاح التنشيط — بريد / واتساب / SMS */}
        {sendForm && (
          <div className="rounded-xl border border-brand/40 bg-brand/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand" />
                إرسال رمز التفعيل{" "}
                <code className="font-mono bg-muted px-2 py-1 rounded text-sm">
                  {sendForm.code}
                </code>
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setSendForm(null);
                  setSendResult(null);
                }}
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* اختيار القناة */}
            <div className="flex gap-3">
              {(
                [
                  {
                    mode: "whatsapp" as const,
                    label: "واتساب",
                    Icon: MessageSquare,
                  },
                  { mode: "email" as const, label: "بريد", Icon: Mail },
                  { mode: "sms" as const, label: "SMS", Icon: Smartphone },
                ] as const
              ).map(({ mode, label, Icon }) => (
                <Button
                  key={mode}
                  variant={sendForm.mode === mode ? "default" : "outline"}
                  className="h-9 text-sm flex-1"
                  onClick={() => {
                    setSendForm(f => (f ? { ...f, mode } : f));
                    setSendResult(null);
                  }}
                >
                  <Icon className="w-4 h-4 ml-1.5" />
                  {label}
                </Button>
              ))}
            </div>

            <div className="flex gap-3">
              <Input
                className="h-9 text-sm flex-1"
                placeholder={
                  sendForm.mode === "email"
                    ? "email@company.com"
                    : "+967 7XX XXX XXX"
                }
                dir="ltr"
                value={sendForm.target}
                onChange={e =>
                  setSendForm(f => (f ? { ...f, target: e.target.value } : f))
                }
              />
              <Button
                className="h-9 text-sm"
                disabled={
                  sendCode.isPending || sendForm.target.trim().length < 5
                }
                onClick={submitSendCode}
              >
                {sendCode.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                ) : (
                  <ExternalLink className="w-4 h-4 ml-1" />
                )}
                إرسال الرمز
              </Button>
            </div>

            {/* نتيجة الإرسال: روابط جاهزة للقنوات اليدوية */}
            {sendResult && (
              <div className="space-y-3 text-sm">
                <p className="rounded-lg bg-muted/60 p-3 leading-relaxed">
                  نصّ الرسالة جاهز أسفل. إن لم يُرسل تلقائياً افتح الرابط
                  المناسب وأرسله بنقرة واحدة — الرمز نفسه هو مفتاح التنشيط لدى
                  العميل.
                </p>
                {sendResult.waLink && (
                  <a
                    href={sendResult.waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
                  >
                    <MessageSquare className="w-4 h-4" />
                    فتح واتساب والرسالة جاهزة
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {sendResult.smsLink && (
                  <a
                    href={sendResult.smsLink}
                    className="inline-flex items-center gap-2 text-sky-600 font-bold hover:underline"
                  >
                    <Smartphone className="w-4 h-4" />
                    فتح تطبيق الرسائل (SMS)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {sendResult.channel === "email" && (
                  <span className="inline-flex items-center gap-2 text-brand font-bold">
                    <Mail className="w-4 h-4" />
                    أُرسل عبر البريد الإلكتروني
                  </span>
                )}
                {sendResult.messageText && (
                  <details className="text-muted-foreground">
                    <summary className="cursor-pointer text-xs font-bold">
                      عرض/نسخ نصّ الرسالة
                    </summary>
                    <pre
                      dir="rtl"
                      className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-sm leading-relaxed select-all"
                    >
                      {sendResult.messageText}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
