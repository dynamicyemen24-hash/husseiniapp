import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
import {
  MailCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Send,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { brand } from "@/lib/brand";

type Status = "idle" | "verifying" | "success" | "error";

/**
 * VerifyEmail — التحقق من البريد الإلكتروني عبر رابط الاستخدام الواحد.
 * المسار: /verify-email?token=...
 *
 * دورة محكمة:
 *  - يتحقق الخادم من المطابقة والصلاحية (token_hash + expiry).
 *  - عند خطأ/انتهاء الصلاحية: نموذج إعادة إرسال يمنع حصر المستخدم في طريق مسدود.
 *  - مكافحة تعداد البريد: الاستجابة موحّدة دائماً «إن كان البريد مسجلاً».
 */
export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [status, setStatus] = useState<Status>(() =>
    token ? "verifying" : "idle"
  );
  const [email, setEmail] = useState("");
  const [resentEmail, setResentEmail] = useState("");

  useEffect(() => {
    document.title = "التحقق من البريد الإلكتروني — " + brand.names.siteName;
    document.body.setAttribute("data-page", "verify-email");
    return () => document.body.removeAttribute("data-page");
  }, []);

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => setStatus("success"),
    onError: () => setStatus("error"),
  });

  const resend = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: () => {
      setResentEmail(email);
      toast.success(
        "أُرسل رابط التحقق من جديد — تفقّد صندوق الوارد (والرسائل غير المرغوب فيها)"
      );
    },
    onError: err => toast.error(err.message || "تعذّر إرسال رابط التحقق"),
  });

  // Run verification automatically once — a valid link should never require a click.
  useEffect(() => {
    if (token) verify.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <MailCheck className="w-3.5 h-3.5" />
            خطوة أمان واحدة — ثوانٍ معدودة
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-display text-white leading-tight">
            بريدك المُحقَّق
            <br />
            <span className="text-brand-300">يفتح لك كل شيء</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            البريد المُتحقق منه يعني أن الحساب باسمٍ حقيقي قابل للوصول، ويقلّل
            عمليات الاختراق، ويتيح استعادة كلمة المرور واستقبال التنبيهات
            المالية الحساسة بأمان.
          </p>
          <ul className="space-y-2.5 text-xs text-slate-200">
            {[
              "استعادة كلمة المرور بسلاسة عند الحاجة",
              "إشعارات دفع الأجور والمدفوعات المتأخرة للمالك",
              "ترقية كل رمز تفعيل بعد الاستخدام مباشرة",
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

        {/* Card column */}
        <div className="lg:col-span-7 w-full max-w-lg mx-auto">
          <Card className="bg-white/5 border-2 border-white/10 text-white shadow-2xl rounded-3xl p-2 overflow-hidden backdrop-blur-xl">
            <CardHeader className="p-5 pb-3">
              <div className="space-y-1.5">
                <h1 className="text-lg font-black text-white flex items-center gap-2">
                  <MailCheck className="w-5 h-5 text-brand" />
                  التحقق من البريد الإلكتروني
                </h1>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  نتحقق من صحة الرابط الآمن ثم نُفعّل الحساب فوراً.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-2">
              {status === "verifying" && (
                <div className="py-10 text-center space-y-4">
                  <Loader2 className="w-10 h-10 text-brand animate-spin mx-auto" />
                  <div>
                    <p className="font-black text-white text-sm">
                      جارٍ التحقق من الرابط…
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      تتم المصادقة والتفعيل خلال لحظات.
                    </p>
                  </div>
                </div>
              )}

              {status === "idle" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-[12px] text-amber-200 leading-relaxed flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-black mb-1">رابط التحقق ناقص</p>
                      وصلت من دون رمز تحقق. أدخل بريدك أدناه لإعادة إرسال
                      الرابط، أو سجّل الدخول مباشرة إن كان حسابك مُفعّلاً.
                    </div>
                  </div>
                  <ResendForm
                    email={email}
                    setEmail={setEmail}
                    resend={resend}
                  />
                </div>
              )}

              {status === "success" && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-black text-white">
                      تم التحقق من بريدك بنجاح
                    </h2>
                    <p className="text-[12px] text-slate-400 leading-relaxed">
                      حسابك الآن مكتمل الأمان: البريد مُتحقق، وبيانات المنشأة
                      محمية، وكل التنبيهات الحساسة ستصل إلى بريدك مباشرة.
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl gap-2"
                  >
                    سجّل الدخول الآن
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-[12px] text-rose-200 leading-relaxed flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-black mb-1">
                        انتهت صلاحية الرابط أو أنه غير صحيح
                      </p>
                      {resentEmail ? (
                        <span>
                          أرسلنا رابطاً جديداً إلى{" "}
                          <b dir="ltr">{resentEmail}</b>. تفقّد صندوق الوارد. إن
                          لم يصلك، أعد الإرسال من الحقل أدناه.
                        </span>
                      ) : (
                        <span>
                          روابط التحقق صالحة لوقت محدود حفاظاً على أمانك. أدخل
                          بريدك لإعادة إرسال رابط جديد.
                        </span>
                      )}
                    </div>
                  </div>
                  <ResendForm
                    email={email}
                    setEmail={setEmail}
                    resend={resend}
                  />
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

/** إعادة إرسال رابط التحقق — استجابة موحّدة لمنع تعداد البريد (anti-enumeration). */
function ResendForm({
  email,
  setEmail,
  resend,
}: {
  email: string;
  setEmail: (v: string) => void;
  resend: {
    isPending: boolean;
    mutate: (args: { email: string }) => void;
  };
}) {
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    resend.mutate({ email: email.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-300">
          البريد الإلكتروني المسجل
        </Label>
        <Input
          required
          type="email"
          dir="ltr"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="name@company.com"
          autoComplete="email"
          className="h-11 bg-ink border-white/15 text-white text-xs rounded-xl font-mono text-left"
          aria-label="البريد الإلكتروني المسجل"
        />
      </div>
      <Button
        type="submit"
        disabled={resend.isPending}
        className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 rounded-xl gap-2 shadow-xl"
      >
        <Send className="w-4 h-4" />
        {resend.isPending ? "جارٍ الإرسال…" : "إعادة إرسال رابط التحقق"}
      </Button>
    </form>
  );
}
