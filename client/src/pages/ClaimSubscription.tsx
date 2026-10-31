import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * صفحة /claim — عامة (بدون مصادقة).
 * العميل يُدخل رمز التفعيل الذي استلمه عبر البريد أو واتساب أو يدوياً من
 * إدارة المنصة، فيتحول الرمز إلى اشتراك نشط عند أول دخول له.
 */
export default function ClaimSubscription() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const claim = trpc.billing.claimSubscription.useMutation({
    onSuccess: data => {
      toast.success((data as any).message ?? "تم تفعيل الاشتراك بنجاح");
      navigate("/login");
    },
    onError: (err: any) => {
      const msg: string = err?.data?.message ?? err?.message ?? "";
      if (msg.startsWith("AUTH_REQUIRED") || msg.includes("معرّف المؤسسة")) {
        toast.info("سجّل الدخول أولاً ثم أعد إدخال الرمز — سيعمل تلقائياً.");
        navigate("/login");
        return;
      }
      toast.error(msg || "رمز غير صالح — تواصل مع الدعم.");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      toast.error("أدخل رمز التفعيل");
      return;
    }
    // منع تلوث tenantId=0 — نأخذ tenantId من جلسة المستخدم إن وجد، وإلا نطلب تسجيل الدخول
    const tenantId =
      (user as any)?.tenantId ??
      (user as any)?.tenant_id ??
      (user as any)?.tenant?.id;
    if (!tenantId) {
      toast.info(
        "سجّل الدخول أولاً — الرمز سيرتبط بمؤسستك تلقائياً بعد الدخول."
      );
      navigate("/login");
      return;
    }
    setSubmitting(true);
    claim.mutate(
      { code: clean, tenantId: Number(tenantId) },
      { onSettled: () => setSubmitting(false) }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-center">
            <Ticket className="w-5 h-5 text-brand" />
            تفعيل الاشتراك برمز التفعيل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">رمز التفعيل</Label>
              <Input
                id="code"
                name="code"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="مثال: PLAN-4F7K2M9Q"
                className="font-mono text-center tracking-widest"
                autoComplete="one-time-code"
                maxLength={40}
                style={{ textTransform: "uppercase" }}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground text-center">
                الرمز وصلك عبر البريد الإلكتروني أو واتساب من فريق المبيعات.
              </p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  جاري التفعيل…
                </>
              ) : (
                "تفعيل الاشتراك"
              )}
            </Button>
          </form>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            تفعيلكم لا يوقف عملكم أبداً — المهلة المرنة مفعّلة دائماً.
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4">
            لا تملك الرمز؟{" "}
            <Link
              to="/contact"
              className="underline hover:text-brand transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              تواصل مع المبيعات
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
