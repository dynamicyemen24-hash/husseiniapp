import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { brand } from "@/lib/brand";

/**
 * ResetPassword — دورة استعادة كلمة المرور الآمنة.
 * المسار: /reset-password?token=...
 *
 * المبادئ:
 *  - رابط استخدامٍ واحد: يُلغى الرمز فور الاستخدام (server-side).
 *  - كلمة مرور قوية: 8 أحرف كحد أدنى + مطابقة الحقلين قبل الإرسال.
 *  - عند النجاح: رسالة واضحة + CTA واحد («الدخول الآن») بلا ازدحام.
 *  - عند الفشل (منتهي/غير صحيح): رسالة إرشادية تعيد المستخدم لطلب رابط جديد.
 */
export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "إعادة تعيين كلمة المرور — " + brand.names.siteName;
    document.body.setAttribute("data-page", "reset-password");
    return () => document.body.removeAttribute("data-page");
  }, []);

  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      setPassword("");
      setConfirm("");
      toast.success(
        "تم إعادة تعيين كلمة المرور بنجاح — يمكنك الآن الدخول بكلمتك الجديدة"
      );
    },
    onError: err => {
      toast.error(err.message || "تعذّرت إعادة التعيين — أعد المحاولة");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    reset.mutate({ token, password, confirmPassword: confirm });
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
            onClick={() => setLocation("/")}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" && setLocation("/")}
          >
            <BrandLogo size={38} />
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="border-white/15 text-white/80 hover:text-white bg-white/5 text-xs h-8 px-3 rounded-lg flex items-center gap-1"
          >
            <span>العودة للموقع الرئيسي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Info column */}
        <div className="lg:col-span-5 space-y-6 text-right">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-brand/40 text-brand-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow">
            <ShieldCheck className="w-3.5 h-3.5" />
            أمان الحساب — أولوية لا تنازل فيها
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
            كلمة مرور قوية
            <br />
            <span className="text-brand-300">هي خط دفاعك الأول</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            نستخدم رابط استخدامٍ واحد مرتبطاً برمز آمن، ويُلغى فور إعادة التعيين
            حتى لا يمكن استخدامه مرة ثانية بأي شكل.
          </p>
          <ul className="space-y-2.5 text-xs text-slate-200">
            {[
              "8 أحرف على الأقل مع مزيج من الأحرف والأرقام",
              "لا تُعِد استخدام كلمة مرور سبق استخدامها في خدمات أخرى",
              "الرابط صالح لساعات قليلة فقط — أعد الطلب عند انتهائه",
            ].map(tip => (
              <li
                key={tip}
                className="flex items-start gap-2.5 p-3 bg-white/5 border border-white/10 rounded-2xl"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form column */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          <Card className="bg-white/5 border-2 border-white/10 text-white shadow-2xl rounded-3xl p-2 overflow-hidden backdrop-blur-xl">
            <CardHeader className="p-5 pb-3">
              <div className="space-y-1.5">
                <h1 className="text-lg font-black text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-brand" />
                  إعادة تعيين كلمة المرور
                </h1>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  أنشئ كلمة مرور جديدة لحسابك في {brand.names.siteName}.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              {!token ? (
                /* رابط ناقص — لا يمكن الاستمرار بأمان */
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-[12px] text-amber-200 leading-relaxed flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-black mb-1">رابط إعادة التعيين ناقص</p>
                      وصلت من دون رمز التحقق. اطلب رابطاً جديداً من صفحة تسجيل
                      الدخول عبر «نسيت كلمة المرور؟».
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl"
                  >
                    <Lock className="w-4 h-4" />
                    الانتقال إلى تسجيل الدخول
                  </Button>
                </div>
              ) : done ? (
                /* نجاح — CTA واحد واضح */
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-black text-white">
                      تمت إعادة التعيين بنجاح
                    </h2>
                    <p className="text-[12px] text-slate-400 leading-relaxed">
                      يمكنك الآن الدخول بحسابك بالكلمة المرور الجديدة. جرّبها
                      على الفور، وإذا نسيتها مجدداً فلا مشكلة — طلب الاستعادة
                      يستغرق دقيقة واحدة فقط.
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl gap-2"
                  >
                    الدخول الآن
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              ) : (
                /* النموذج */
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">
                      كلمة المرور الجديدة
                    </Label>
                    <div className="relative">
                      <Input
                        required
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="8 أحرف على الأقل"
                        autoComplete="new-password"
                        className="h-11 bg-ink border-white/15 text-white text-xs rounded-xl font-mono pl-10"
                        minLength={8}
                        maxLength={200}
                        aria-label="كلمة المرور الجديدة"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label={
                          showPassword
                            ? "إخفاء كلمة المرور"
                            : "إظهار كلمة المرور"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-300">
                      تأكيد كلمة المرور
                    </Label>
                    <Input
                      required
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      autoComplete="new-password"
                      className="h-11 bg-ink border-white/15 text-white text-xs rounded-xl font-mono"
                      minLength={8}
                      maxLength={200}
                      aria-label="تأكيد كلمة المرور"
                    />
                  </div>

                  {reset.isError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[11px] text-rose-200 leading-relaxed"
                    >
                      <p className="font-black mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        لم تكتمل إعادة التعيين
                      </p>
                      {reset.error.message ||
                        "الرابط غير صحيح أو منتهي الصلاحية — اطلب رابطاً جديداً."}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/login")}
                      className="border-white/15 text-white/70 hover:text-white bg-white/5 text-xs h-11 rounded-xl"
                    >
                      رجوع للدخول
                    </Button>
                    <Button
                      type="submit"
                      disabled={reset.isPending}
                      className="flex-1 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl gap-2 shadow-xl"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${reset.isPending ? "animate-spin" : ""}`}
                      />
                      {reset.isPending
                        ? "جارٍ الحفظ…"
                        : "حفظ كلمة المرور الجديدة"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
