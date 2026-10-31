import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  Building2,
  Globe,
  Database,
  MessageCircle,
  Sparkles,
} from "lucide-react";

export default function Settings() {
  const { data: settingsData, refetch } =
    trpc.accounting.getSettings.useQuery();
  const updateSettings = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المؤسسة بنجاح");
      refetch();
    },
    onError: e => toast.error(e.message || "فشل حفظ الإعدادات"),
  });

  const [instName, setInstName] = useState("مؤسسة الحسينية لخدمات الأعمال");
  const [currency, setCurrency] = useState("ريال يمني (YER)");
  const [period, setPeriod] = useState("السنة المالية 2026");
  const [manager, setManager] = useState("إدارة المؤسسة");
  const [notes, setNotes] = useState("");
  const [country, setCountry] = useState("اليمن");
  const [zatca, setZatca] = useState({
    enabled: false,
    sellerName: "",
    vatNumber: "",
  });
  const [wsCode, setWsCode] = useState("");
  const [wsName, setWsName] = useState("");
  const [wsAddr, setWsAddr] = useState("");
  const [devCode, setDevCode] = useState("");
  const [devName, setDevName] = useState("");
  const [devType, setDevType] = useState("pos");

  const workSites = trpc.workSites.list.useQuery();
  const createWs = trpc.workSites.create.useMutation({
    onSuccess: () => {
      setWsCode("");
      setWsName("");
      setWsAddr("");
      workSites.refetch();
    },
  });
  const removeWs = trpc.workSites.remove.useMutation({
    onSuccess: () => workSites.refetch(),
  });
  const devices = trpc.devices.list.useQuery();
  const createDev = trpc.devices.create.useMutation({
    onSuccess: () => {
      setDevCode("");
      setDevName("");
      setDevType("pos");
      devices.refetch();
    },
  });
  const removeDev = trpc.devices.remove.useMutation({
    onSuccess: () => devices.refetch(),
  });

  const [posConfig, setPosConfig] = useState("{}");
  const [salesPolicy, setSalesPolicy] = useState("{}");
  const [paymentMethods, setPaymentMethods] = useState("[]");
  const [postingRules, setPostingRules] = useState("{}");

  const [comm, setComm] = useState({
    whatsappEnabled: true,
    whatsappCountryCode: "967",
    whatsappFallbackNumber: "",
    emailEnabled: true,
    emailFallbackTo: "",
    requireApprovedState: false,
  });
  const [externalAI, setExternalAI] = useState({
    enabled: false,
    baseUrl: "",
    model: "",
    apiKey: "",
    hasApiKey: false,
  });

  useEffect(() => {
    if (settingsData) {
      setInstName(
        settingsData.institutionName || "مؤسسة الحسينية لخدمات الأعمال"
      );
      setCurrency(settingsData.currency || "ريال يمني (YER)");
      setPeriod(settingsData.accountingPeriod || "السنة المالية 2026");
      setManager(settingsData.managerName || "إدارة المؤسسة");
      setNotes((settingsData as any)?.notes || "");
      setCountry((settingsData as any)?.country || "اليمن");
      try {
        const z = (settingsData as any)?.zatcaConfig;
        if (z && typeof z === "object")
          setZatca({
            enabled: !!z.enabled,
            sellerName: z.sellerName || "",
            vatNumber: z.vatNumber || "",
          });
      } catch {
        /* ignore */
      }
      try {
        setPosConfig(
          JSON.stringify((settingsData as any).posConfig ?? {}, null, 2)
        );
        setSalesPolicy(
          JSON.stringify((settingsData as any).salesPolicy ?? {}, null, 2)
        );
        setPaymentMethods(
          JSON.stringify((settingsData as any).paymentMethods ?? [], null, 2)
        );
        setPostingRules(
          JSON.stringify((settingsData as any).postingRules ?? {}, null, 2)
        );
      } catch {
        /* ignore */
      }
      try {
        const c = (settingsData as any)?.communicationConfig;
        if (c && typeof c === "object")
          setComm({
            whatsappEnabled: c.whatsappEnabled !== false,
            whatsappCountryCode: c.whatsappCountryCode || "967",
            whatsappFallbackNumber: c.whatsappFallbackNumber || "",
            emailEnabled: c.emailEnabled !== false,
            emailFallbackTo: c.emailFallbackTo || "",
            requireApprovedState: !!c.requireApprovedState,
          });
      } catch {
        /* ignore */
      }
      const ai = (settingsData as any)?.externalAIConfig;
      if (ai)
        setExternalAI({
          enabled: !!ai.enabled,
          baseUrl: ai.baseUrl || "",
          model: ai.model || "",
          apiKey: "",
          hasApiKey: !!ai.hasApiKey,
        });
    }
  }, [settingsData]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const pc = posConfig,
      sp = salesPolicy,
      pm = paymentMethods,
      pr = postingRules;
    try {
      JSON.parse(pc);
    } catch {
      toast.error("إعدادات نقطة البيع ليست JSON صالحاً");
      return;
    }
    try {
      JSON.parse(sp);
    } catch {
      toast.error("سياسة المبيعات ليست JSON صالحاً");
      return;
    }
    try {
      JSON.parse(pm);
    } catch {
      toast.error("طرق الدفع ليست JSON صالحاً");
      return;
    }
    try {
      JSON.parse(pr);
    } catch {
      toast.error("قواعد الترحيل ليست JSON صالحاً");
      return;
    }
    updateSettings.mutate({
      institutionName: instName,
      currency,
      accountingPeriod: period,
      managerName: manager,
      notes,
      country,
      posConfig: pc,
      salesPolicy: sp,
      paymentMethods: pm,
      postingRules: pr,
      zatcaConfig: JSON.stringify(zatca),
      communicationConfig: JSON.stringify(comm),
      externalAIConfig: {
        enabled: externalAI.enabled,
        baseUrl: externalAI.baseUrl,
        model: externalAI.model,
        apiKey: externalAI.apiKey || undefined,
      },
    } as any);
  };

  return (
    <div className="min-h-screen bg-sand text-ink pb-20" dir="rtl">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <Badge className="bg-brand text-ink-deep font-bold text-xs px-3 py-1 mb-1">
              Uamex ERP · الإعدادات
            </Badge>
            <h1 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-brand" />
              إعدادات المؤسسة
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              حدّث اسم منشأتك وبياناتها التشغيلية؛ تظهر هذه الهوية في مستنداتك
              وتقاريرك.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Sparkles className="w-5 h-5 text-violet-600" /> مزودات الذكاء
                الاصطناعي والتكاملات
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                إعداد متوافق مع واجهات OpenAI لمساعد المؤسسة والتحليل المالي
                واستخراج بنود الفواتير من الصور. تحفظ بيانات الاعتماد مشفرة ولا
                تعاد إلى المتصفح.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">
                  تفعيل استخراج الفواتير من الصور
                </span>
                <input
                  type="checkbox"
                  checked={externalAI.enabled}
                  onChange={e =>
                    setExternalAI({ ...externalAI, enabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-violet-600"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    عنوان API الأساسي (HTTPS)
                  </Label>
                  <Input
                    dir="ltr"
                    value={externalAI.baseUrl}
                    onChange={e =>
                      setExternalAI({ ...externalAI, baseUrl: e.target.value })
                    }
                    placeholder="https://api.example.com"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    اسم النموذج
                  </Label>
                  <Input
                    dir="ltr"
                    value={externalAI.model}
                    onChange={e =>
                      setExternalAI({ ...externalAI, model: e.target.value })
                    }
                    placeholder="vision-model"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-700">
                    مفتاح API{" "}
                    {externalAI.hasApiKey && "(مخزن؛ اتركه فارغاً للاحتفاظ به)"}
                  </Label>
                  <Input
                    dir="ltr"
                    type="password"
                    autoComplete="new-password"
                    value={externalAI.apiKey}
                    onChange={e =>
                      setExternalAI({ ...externalAI, apiKey: e.target.value })
                    }
                    placeholder={
                      externalAI.hasApiKey
                        ? "••••••••••••••••"
                        : "أدخل مفتاح المزود"
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                يُضاف المسار <span dir="ltr">/v1/chat/completions</span>{" "}
                تلقائياً. يجب أن يدعم المزود الصور وإخراج JSON. لن تُرسل الصورة
                إلا عند طلب الاستخراج.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Building2 className="w-5 h-5 text-brand" />
                بيانات المؤسسة العامة
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                البيانات الأساسية التي تظهر في جميع التقارير، السندات، والفواتير
                الصادرة.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    الدولة
                  </Label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white text-xs px-2"
                  >
                    <option value="اليمن">اليمن</option>
                    <option value="السعودية">السعودية (ZATCA)</option>
                    <option value="الإمارات">الإمارات</option>
                    <option value="مصر">مصر</option>
                    <option value="الكويت">الكويت</option>
                    <option value="الأردن">الأردن</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    اسم المؤسسة الرسمي
                  </Label>
                  <Input
                    value={instName}
                    onChange={e => setInstName(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    العملة المعتمدة في النظام
                  </Label>
                  <Input
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    الفترة المالية / المحاسبية
                  </Label>
                  <Input
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    اسم المشرف / المدير المسؤول
                  </Label>
                  <Input
                    value={manager}
                    onChange={e => setManager(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  ملاحظات وترويسة السندات الرسمية
                </Label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 text-xs bg-white text-slate-800"
                  placeholder="ملاحظات تظهر في ترويسة التقارير والفواتير الرسمية..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                التواصل والمشاركة
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                قنوات إرسال الطلبات والتقارير (واتساب / إيميل) لفرق المشتريات
                والموردين — وتُطبَّق على أزرار «مشاركة».
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">
                  تفعيل واتساب
                </span>
                <input
                  type="checkbox"
                  checked={comm.whatsappEnabled}
                  onChange={e =>
                    setComm({ ...comm, whatsappEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    رمز الدولة للواتساب
                  </Label>
                  <Input
                    value={comm.whatsappCountryCode}
                    onChange={e =>
                      setComm({
                        ...comm,
                        whatsappCountryCode: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="bg-white border-slate-200 text-xs h-9"
                    placeholder="967"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    رقم واتساب احتياطي (اختياري)
                  </Label>
                  <Input
                    value={comm.whatsappFallbackNumber}
                    onChange={e =>
                      setComm({
                        ...comm,
                        whatsappFallbackNumber: e.target.value,
                      })
                    }
                    className="bg-white border-slate-200 text-xs h-9 ltr"
                    placeholder="771234567 — يُستخدم عند غياب رقم المورد"
                  />
                </div>
              </div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">
                  تفعيل الإيميل
                </span>
                <input
                  type="checkbox"
                  checked={comm.emailEnabled}
                  onChange={e =>
                    setComm({ ...comm, emailEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-emerald-600"
                />
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  بريد احتياطي (اختياري)
                </Label>
                <Input
                  value={comm.emailFallbackTo}
                  onChange={e =>
                    setComm({ ...comm, emailFallbackTo: e.target.value })
                  }
                  className="bg-white border-slate-200 text-xs h-9 ltr"
                  placeholder="receiving@example.com — يُستخدم عند غياب بريد المورد"
                />
              </div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">
                  اشتراط الحالة المعتمدة قبل المشاركة
                </span>
                <input
                  type="checkbox"
                  checked={comm.requireApprovedState}
                  onChange={e =>
                    setComm({ ...comm, requireApprovedState: e.target.checked })
                  }
                  className="w-4 h-4 accent-brand"
                />
              </label>
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                عند تفعيله: لا تُرسل أوامر الشراء إلا بحالة «issued وما فوق» ولا
                تُرسل السندات إلا «posting» والفواتير إلا «confirmed وما فوق».
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Database className="w-5 h-5 text-emerald-600" />
                حالة النظام والتزامن المحلي (PWA & Offline)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-slate-700">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold block text-slate-900">
                    تخزين البيانات أوفلاين (IndexedDB)
                  </span>
                  <span className="text-slate-500">
                    حفظ تلقائي لكافة العمليات بدون انقطاع عند غياب الإنترنت.
                  </span>
                </div>
                <Badge className="bg-emerald-600 text-white font-bold">
                  نشط وفعّال
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold block text-slate-900">
                    التزامن التلقائي السحابي
                  </span>
                  <span className="text-slate-500">
                    مزامنة البيانات فور عودة الاتصال بخادم المنصة.
                  </span>
                </div>
                <Badge className="bg-blue-600 text-white font-bold">
                  مستقر
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand/30 shadow-sm bg-white">
            <CardHeader className="bg-amber-50/60 border-b border-amber-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Globe className="w-5 h-5 text-brand" />
                البنية متعددة المنشآت (منشآت · دول · فروع · عملات)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                منظومة الحسينية مبنية لتخدم مؤسسات وفروعاً متعددة تحت نفس
                المنصة، مع عزل كامل للبيانات لكل مشترك.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  {
                    t: "مؤسسات متعددة (Tenants)",
                    d: "每个 مشترك بياناته مستقلة",
                  },
                  { t: "دول وعملات متعددة", d: "YER, SAR, USD, AED…" },
                  { t: "فروع متعددة", d: "صلاحيات لكل فرع وحركة مستقلة" },
                  { t: "وحدات قياس", d: "م، م²، طن، قطعة، لتر…" },
                  { t: "مراكز تكلفة", d: "توزيع وتتبع التكاليف بدقة" },
                  { t: "مخطط حسابي لكل فرع", d: "تقارير مركزية ومجمّعة" },
                ].map(c => (
                  <div
                    key={c.t}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1"
                  >
                    <p className="font-bold text-slate-900">{c.t}</p>
                    <p className="text-[11px] text-slate-500">{c.d}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                تلميح: تُربط الطلبات الواردة من موقعك الخارجي بالفرع والعملة
                الصحيحين عبر حقول{" "}
                <code className="font-mono text-brand">branchCode</code> و{" "}
                <code className="font-mono text-brand">currency</code> في مركز
                التكامل — راجع صفحة «مركز التكامل».
              </p>
            </CardContent>
          </Card>

          <Card className="border border-ink/15 shadow-sm bg-white">
            <CardHeader className="bg-ink/5 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Database className="w-5 h-5 text-ink" />
                تكوين نقاط البيع والمخزون (السعودية · اليمن)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                ضبط السياسات، طرق الدفع، العملات، والقنوات والوسطاء، وقواعد
                الترحيل المحاسبي. تُحرر بصيغة JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  إعدادات نقطة البيع (posConfig)
                </Label>
                <textarea
                  rows={4}
                  value={posConfig}
                  onChange={e => setPosConfig(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 text-[11px] bg-slate-50 text-slate-800 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  سياسة المبيعات (salesPolicy)
                </Label>
                <textarea
                  rows={4}
                  value={salesPolicy}
                  onChange={e => setSalesPolicy(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 text-[11px] bg-slate-50 text-slate-800 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  طرق الدفع (paymentMethods) — نقدي/بطاقة/تحويل/مدى/STC Pay…
                </Label>
                <textarea
                  rows={4}
                  value={paymentMethods}
                  onChange={e => setPaymentMethods(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 text-[11px] bg-slate-50 text-slate-800 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  قواعد الترحيل المحاسبي (postingRules)
                </Label>
                <textarea
                  rows={4}
                  value={postingRules}
                  onChange={e => setPostingRules(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 text-[11px] bg-slate-50 text-slate-800 font-mono"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-ink/15 shadow-sm bg-white">
            <CardHeader className="bg-ink/5 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Database className="w-5 h-5 text-ink" />
                الفواتير الإلكترونية السعودية (ZATCA)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                يُفعَّل تلقائياً عند اختيار الدولة «السعودية» ويولّد رمز QR وفق
                الهيئة العامة للزكاة والضريبة والجمارك عند كل فاتورة بيع.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={zatca.enabled}
                  onChange={e =>
                    setZatca({ ...zatca, enabled: e.target.checked })
                  }
                />
                تفعيل ZATCA (الفوترة الإلكترونية)
              </label>
              {zatca.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      اسم البائع المسجل
                    </Label>
                    <Input
                      value={zatca.sellerName}
                      onChange={e =>
                        setZatca({ ...zatca, sellerName: e.target.value })
                      }
                      className="bg-white border-slate-200 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      الرقم الضريبي (VAT Number)
                    </Label>
                    <Input
                      value={zatca.vatNumber}
                      onChange={e =>
                        setZatca({ ...zatca, vatNumber: e.target.value })
                      }
                      className="bg-white border-slate-200 text-xs h-9"
                      placeholder="مثل: 300000000000003"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-ink/15 shadow-sm bg-white">
            <CardHeader className="bg-ink/5 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Globe className="w-5 h-5 text-ink" />
                مواقع العمل والأجهزة (الرقابة وتتبع الأثر)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                تُربط بالمستندات لتتبع موقع التنفيذ والجهاز والإحداثيات وضمان
                عدم تداخل الترقيم عبر المستخدم والفرع والمؤسسة والمشترك.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  className="h-9 text-xs"
                  placeholder="كود الموقع"
                  value={wsCode}
                  onChange={e => setWsCode(e.target.value)}
                />
                <Input
                  className="h-9 text-xs"
                  placeholder="اسم الموقع"
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                />
                <Input
                  className="h-9 text-xs"
                  placeholder="العنوان"
                  value={wsAddr}
                  onChange={e => setWsAddr(e.target.value)}
                />
                <Button
                  size="sm"
                  className="bg-ink hover:bg-ink-deep text-xs"
                  disabled={!wsCode || !wsName || createWs.isPending}
                  onClick={() =>
                    createWs.mutate({
                      code: wsCode,
                      name: wsName,
                      address: wsAddr,
                    })
                  }
                >
                  إضافة موقع
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(workSites.data || []).map(w => (
                  <span
                    key={w.id}
                    className="inline-flex items-center text-[11px] bg-slate-100 rounded-full px-2 py-1"
                  >
                    {w.code} - {w.name}
                    <button
                      className="ml-1 text-rose-600"
                      onClick={() => removeWs.mutate({ id: w.id })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 border-t">
                <Input
                  className="h-9 text-xs"
                  placeholder="كود الجهاز"
                  value={devCode}
                  onChange={e => setDevCode(e.target.value)}
                />
                <Input
                  className="h-9 text-xs"
                  placeholder="اسم الجهاز"
                  value={devName}
                  onChange={e => setDevName(e.target.value)}
                />
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white text-xs px-2"
                  value={devType}
                  onChange={e => setDevType(e.target.value)}
                >
                  <option value="pos">نقطة بيع</option>
                  <option value="scanner">ماسح</option>
                  <option value="scale">ميزان</option>
                  <option value="other">أخرى</option>
                </select>
                <Button
                  size="sm"
                  className="bg-ink hover:bg-ink-deep text-xs"
                  disabled={!devCode || !devName || createDev.isPending}
                  onClick={() =>
                    createDev.mutate({
                      code: devCode,
                      name: devName,
                      type: devType,
                    })
                  }
                >
                  إضافة جهاز
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(devices.data || []).map(d => (
                  <span
                    key={d.id}
                    className="inline-flex items-center text-[11px] bg-slate-100 rounded-full px-2 py-1"
                  >
                    {d.code} - {d.name} ({d.type})
                    <button
                      className="ml-1 text-rose-600"
                      onClick={() => removeDev.mutate({ id: d.id })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateSettings.isPending}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-10 px-6 rounded-xl flex items-center gap-2 shadow"
            >
              <Save className="w-4 h-4" />
              {updateSettings.isPending
                ? "جاري الحفظ..."
                : "حفظ إعدادات المؤسسة"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
