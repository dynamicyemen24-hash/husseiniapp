import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { goToMarketing } from "@/lib/deploymentLinks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  KeyRound,
  ChevronLeft,
  AlertTriangle,
  UserPlus,
  Sparkles,
  CheckCircle2,
  Coins,
  Clock,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductLogo } from "@/components/BrandLogo";
import { brand, whatsappLink } from "@/lib/brand";

const CURRENCIES = [
  { code: "YER", label: "ريال يمني (YER)" },
  { code: "SAR", label: "ريال سعودي (SAR)" },
  { code: "USD", label: "دولار أمريكي (USD)" },
  { code: "AED", label: "درهم إماراتي (AED)" },
  { code: "EGP", label: "جنيه مصري (EGP)" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const redirectTo = new URLSearchParams(window.location.search).get(
    "redirect"
  );
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaUsername, setMfaUsername] = useState("");
  // End-to-end readiness: inline (not toast-only) authentication error surfaced
  // through a live region so screen readers announce it instantly and the user
  // sees exactly what failed without hunting for a toast.
  const [loginError, setLoginError] = useState<string | null>(null);

  // End-to-end: announce the page purpose and fix <title> on first focus so the
  // login surface is unambiguously identified to assistive tech.
  useEffect(() => {
    document.title = "تسجيل الدخول — الحسينية لخدمات الأعمال";
    document.body.setAttribute("data-page", "login");
    return () => {
      document.body.removeAttribute("data-page");
    };
  }, []);

  // Simplified Registration States
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCountry, setRegCountry] = useState("اليمن");
  const [regCurrency, setRegCurrency] = useState("YER");
  const [regEmail, setRegEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const goApp = () => {
    setLocation(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/app");
  };

  const login = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      if (data?.mfaRequired) {
        setMfaRequired(true);
        setMfaUsername(username.trim());
        toast.info("الحساب محمي بتحقق ثنائي — أدخل رمز 6 أرقام");
        return;
      }
      goApp();
    },
    onError: (err: any) => {
      const code = err?.data?.code || err?.code;
      const msg = err?.message || "";
      if (code === "NOT_FOUND" || msg === "ACCOUNT_NOT_FOUND") {
        setNotFound(true);
        toast.error("لا يوجد حساب مسجّل بهذا الاسم");
        return;
      }
      if (code === "FORBIDDEN" && msg.startsWith("LOCKED:")) {
        const mins = msg.split(":")[1];
        setLocked(mins);
        return;
      }
      toast.error(msg || "تعذر تسجيل الدخول");
      setLoginError(
        msg || "تعذر تسجيل الدخول. تحقّق من اسم المستخدم وكلمة المرور."
      );
    },
  });

  const verifyMfa = trpc.auth.verifyMfa.useMutation({
    onSuccess: () => {
      toast.success("تم التحقق الثنائي بنجاح");
      goApp();
    },
    onError: (err: any) => toast.error(err?.message || "رمز غير صحيح"),
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("تم تهيئة منشأتك وتفعيل الفترة التجريبية بنجاح!");
      setTimeout(() => goApp(), 600);
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      const code = err?.data?.code || err?.code;
      if (code === "CONFLICT") {
        toast.error("اسم المستخدم مُستخدم مسبقاً، اختر اسماً آخر");
        return;
      }
      toast.error(msg || "تعذر إنشاء الحساب");
    },
  });

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      toast.success("إذا كان البريد مسجلاً، ستصلك تعليمات إعادة التعيين");
      setForgotEmail("");
    },
    onError: () => toast.error("تعذر إرسال طلب إعادة التعيين، حاول لاحقاً"),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setNotFound(false);
    setLocked(null);
    setLoginError(null);
    if (!username.trim() || !password) {
      toast.error("الرجاء إدخال اسم المستخدم وكلمة المرور");
      setLoginError("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    login.mutate({ username: username.trim(), password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      toast.error("الرجاء تعبئة اسم المنشأة واسم المستخدم وكلمة المرور");
      return;
    }
    if (regPassword.length < 8) {
      toast.error("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (!acceptTerms) {
      toast.error("يجب الموافقة على شروط الاستخدام وسياسة الخصوصية");
      return;
    }
    register.mutate({
      name: regName.trim(),
      username: regUsername.trim(),
      password: regPassword,
      country: regCountry,
      currency: regCurrency,
      email: regEmail.trim() || undefined,
      acceptTerms: true,
    });
  };

  return (
    <div
      className="min-h-screen bg-ink-deep text-white flex flex-col justify-between font-display"
      dir="rtl"
    >
      {/* ── Header ───────────────────────────────────── */}
      <header className="border-b border-white/10 bg-ink/80 backdrop-blur px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={goToMarketing}
          >
            <ProductLogo size={38} />
          </div>
          <Button
            variant="outline"
            onClick={goToMarketing}
            className="border-white/15 text-white/80 hover:text-white bg-white/5 text-xs h-8 px-3 rounded-lg flex items-center gap-1"
          >
            <span>العودة للموقع الرئيسي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Main Container ───────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Info Column */}
        <div className="lg:col-span-5 space-y-6 text-right">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-brand/40 text-brand-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow">
            <img
              src="/uamex-favicon-32.png"
              alt=""
              width={16}
              height={16}
              className="rounded-[4px]"
            />
            تسجيل الدخول إلى {brand.names.erpDisplay}
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
            أعمالك، مترابطة في مساحة واحدة
            <br />
            <span className="text-brand-300">المهيأة لبيئة عملك الحقيقية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            تابع المبيعات والمشتريات والمخزون والمالية من مساحة عمل واحدة،
            بإعدادات تناسب منشأتك وصلاحيات واضحة لفريقك.
          </p>

          <div className="space-y-3 pt-2 text-xs text-slate-200">
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="p-2 bg-brand rounded-xl text-ink-deep font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  ابدأ بفترة تجريبية
                </span>
                <span className="text-[11px] text-slate-400">
                  استكشف بيئة العمل قبل اختيار الخطة المناسبة لمنشأتك.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="p-2 bg-emerald-600 rounded-xl text-white font-bold">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  إعداد يناسب نشاطك
                </span>
                <span className="text-[11px] text-slate-400">
                  ابدأ ببيانات مؤسستك، ثم اضبط الحسابات والسياسات بحسب احتياجك.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right / Interactive Form Column */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          <Card className="bg-white/5 border-2 border-white/10 text-white shadow-2xl rounded-3xl p-2 overflow-hidden backdrop-blur-xl">
            <CardHeader className="p-5 pb-3">
              <Tabs
                value={activeTab}
                onValueChange={v => {
                  setActiveTab(v as any);
                  setNotFound(false);
                  setLocked(null);
                }}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 bg-ink p-1 rounded-xl border border-white/15 h-10">
                  <TabsTrigger
                    value="login"
                    className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink-deep"
                  >
                    دخول المنشأة
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-ink-deep"
                  >
                    تأسيس منشأة جديدة
                  </TabsTrigger>
                </TabsList>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  {activeTab === "login"
                    ? "للمحاسب والتاجر: أدخل بيانات منشأتك للدخول إلى النظام التشغيلي"
                    : "للمالك الجديد: أنشئ منشأتك بمعايير IFRS for SMEs — 14 يوم تجربة مجانية"}
                </p>
              </Tabs>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              {/* ── Tab 1: Existing User Login ─────────────── */}
              {activeTab === "login" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {showForgot ? (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        forgotPassword.mutate({ email: forgotEmail.trim() });
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-300">
                          البريد الإلكتروني المسجل
                        </Label>
                        <Input
                          required
                          type="email"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="name@company.com"
                          autoComplete="email"
                          className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        سنرسل رابطًا مؤقتًا لإعادة تعيين كلمة المرور إن كان
                        البريد مرتبطًا بحساب.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowForgot(false)}
                          className="border-white/15 text-white/70 h-10"
                        >
                          رجوع
                        </Button>
                        <Button
                          type="submit"
                          disabled={forgotPassword.isPending}
                          className="flex-1 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black h-10"
                        >
                          {forgotPassword.isPending
                            ? "جاري الإرسال…"
                            : "إرسال رابط الاستعادة"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {locked && (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[11px] text-rose-200">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          تم قفل الحساب مؤقتاً بسبب محاولات متكررة. حاول بعد{" "}
                          {locked} دقيقة.
                        </div>
                      )}
                      {notFound && (
                        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                          <div className="flex items-center gap-2 font-bold mb-1">
                            <AlertTriangle className="w-4 h-4" /> لا يوجد حساب
                            مسجل بهذا الاسم
                          </div>
                          <p className="mb-2">
                            يمكنك فتح حساب وتهيئة منشأتك مجاناً في دقيقة.
                          </p>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => {
                              setActiveTab("register");
                              setNotFound(false);
                            }}
                            className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-[11px] h-8"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> فتح حساب جديد
                          </Button>
                        </div>
                      )}

                      {mfaRequired && (
                        <div className="space-y-3 p-4 rounded-xl bg-brand/10 border border-brand/30 animate-in fade-in">
                          <p className="text-xs font-black text-brand-300 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> التحقق الثنائي
                            مطلوب — OWASP A07
                          </p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            أدخل رمز 6 أرقام من تطبيق Authenticator
                            (Google/Microsoft Authenticator) المرتبط بحسابك
                          </p>
                          <Input
                            value={mfaCode}
                            onChange={e =>
                              setMfaCode(
                                e.target.value.replace(/\D/g, "").slice(0, 6)
                              )
                            }
                            placeholder="000000"
                            className="h-11 bg-ink border-white/15 text-white text-center font-mono text-lg tracking-[0.3em]"
                            maxLength={6}
                            inputMode="numeric"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setMfaRequired(false);
                                setMfaCode("");
                              }}
                              className="flex-1 border-white/15 text-white/70 h-10"
                            >
                              رجوع
                            </Button>
                            <Button
                              type="button"
                              disabled={
                                verifyMfa.isPending || mfaCode.length !== 6
                              }
                              onClick={() =>
                                verifyMfa.mutate({
                                  username: mfaUsername,
                                  token: mfaCode,
                                })
                              }
                              className="flex-1 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black h-10"
                            >
                              {verifyMfa.isPending
                                ? "جاري التحقق…"
                                : "تحقق ودخول"}
                            </Button>
                          </div>
                          <p className="text-[10px] text-white/30 text-center">
                            الرمز يتغير كل 30 ثانية — لا تشاركه
                          </p>
                        </div>
                      )}

                      {!mfaRequired && (
                        <form
                          onSubmit={handleLogin}
                          className="space-y-4"
                          noValidate
                        >
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                              <KeyRound className="w-3.5 h-3.5 text-brand-300" />{" "}
                              اسم المستخدم
                            </Label>
                            <Input
                              required
                              type="text"
                              name="username"
                              placeholder="اسم المستخدم"
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl"
                              autoComplete="username"
                              autoFocus
                              aria-label="اسم المستخدم"
                              aria-describedby="login-error"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5 text-brand-300" />{" "}
                              كلمة المرور
                            </Label>
                            <div className="relative">
                              <Input
                                required
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="h-10 bg-ink border-white/15 text-white text-xs rounded-xl font-mono pl-10"
                                autoComplete="current-password"
                                aria-label="كلمة المرور"
                                aria-describedby="login-error"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <Button
                            type="submit"
                            disabled={login.isPending}
                            className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
                          >
                            <Zap className="w-4 h-4" />
                            {login.isPending ? "جاري التحقق…" : "دخول النظام"}
                          </Button>

                          {loginError && (
                            <div
                              id="login-error"
                              role="alert"
                              aria-live="assertive"
                              className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[11px] text-rose-200"
                            >
                              {loginError}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowForgot(true)}
                            className="w-full text-[11px] text-brand-300 hover:text-brand-200"
                          >
                            نسيت كلمة المرور؟
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Tab 2: Simplified Registration ─────────── */}
              {activeTab === "register" && (
                <div className="animate-in fade-in duration-200">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-300">
                        اسم المنشأة / الشركة *
                      </Label>
                      <Input
                        required
                        placeholder="مثال: شركة الأفق للتجارة — أو أي نشاط"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-300">
                          اسم المستخدم *
                        </Label>
                        <Input
                          required
                          placeholder="حروف وأرقام فقط"
                          value={regUsername}
                          onChange={e => setRegUsername(e.target.value)}
                          className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl font-mono"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-300">
                          كلمة المرور *
                        </Label>
                        <Input
                          required
                          type="password"
                          placeholder="8 أحرف على الأقل"
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={e => setAcceptTerms(e.target.checked)}
                        className="mt-0.5 accent-brand"
                      />
                      <span>
                        أوافق على شروط الاستخدام وسياسة الخصوصية وأقر بصحة
                        بيانات المنشأة.
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-300">
                          الدولة
                        </Label>
                        <select
                          value={regCountry}
                          onChange={e => {
                            setRegCountry(e.target.value);
                            if (e.target.value === "السعودية")
                              setRegCurrency("SAR");
                          }}
                          className="h-9 w-full bg-ink border border-white/15 text-white text-xs rounded-xl px-2"
                        >
                          <option value="اليمن">اليمن</option>
                          <option value="السعودية">السعودية</option>
                          <option value="الإمارات العربية المتحدة">
                            الإمارات العربية المتحدة
                          </option>
                          <option value="مصر">مصر</option>
                          <option value="الأردن">الأردن</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-300">
                          العملة
                        </Label>
                        <select
                          value={regCurrency}
                          onChange={e => setRegCurrency(e.target.value)}
                          className="h-9 w-full bg-ink border border-white/15 text-white text-xs rounded-xl px-2 font-semibold"
                        >
                          {CURRENCIES.map(cur => (
                            <option key={cur.code} value={cur.code}>
                              {cur.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-300">
                        البريد الإلكتروني (اختياري)
                      </Label>
                      <Input
                        type="email"
                        placeholder="name@company.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className="h-9 bg-ink border-white/15 text-white text-xs rounded-xl"
                      />
                    </div>

                    {/* Free Trial Banner */}
                    <div className="p-4 rounded-2xl bg-brand/10 border border-brand/30 space-y-2 text-right">
                      <div className="flex items-center gap-2 text-xs font-black text-brand-300">
                        <Sparkles className="w-4 h-4 text-brand" />
                        <span>فترة تجريبية مجانية 14 يوماً</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        وصول كامل لكافة مساحات العمل والميزات بدون أي متطلبات
                        بطاقة ائتمان. بياناتك محفوظة وآمنة بالكامل ويمكنك
                        الترقية في أي وقت.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("login")}
                        className="border-white/15 text-white/70 hover:text-white bg-white/5 text-xs h-11 rounded-xl"
                      >
                        تسجيل الدخول بدلاً من ذلك
                      </Button>
                      <Button
                        type="submit"
                        disabled={register.isPending || !acceptTerms}
                        className="flex-1 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl gap-2 shadow-xl"
                      >
                        <Zap className="w-4 h-4" />
                        <span>
                          {register.isPending
                            ? "جاري تهيئة المنشأة..."
                            : "إطلاق المنصة وبدء العمل"}
                        </span>
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
