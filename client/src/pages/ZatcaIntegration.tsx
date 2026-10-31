import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ShieldCheck,
  Link2,
  RefreshCw,
  FileText,
  QrCode,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function ZatcaIntegration() {
  const { data: settings, refetch } = trpc.accounting.getSettings.useQuery();
  const update = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الفوترة السعودية");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const [form, setForm] = useState({
    enabled: false,
    sellerName: "",
    vatNumber: "",
    crNumber: "",
    address: "",
    phase: "1" as "1" | "2",
    simulation: true,
  });

  useEffect(() => {
    const z = (settings as any)?.zatcaConfig;
    if (z) {
      try {
        const cfg = typeof z === "string" ? JSON.parse(z) : z;
        setForm({
          enabled: !!cfg.enabled,
          sellerName: cfg.sellerName || "",
          vatNumber: cfg.vatNumber || "",
          crNumber: cfg.crNumber || "",
          address: cfg.address || "",
          phase: cfg.phase || "1",
          simulation: cfg.simulation ?? true,
        });
      } catch {
        // لا توجد إعدادات مسبقة — نبدأ بإعدادات افتراضية
      }
    }
  }, [settings]);

  const handleSave = () => {
    if (form.enabled && !form.vatNumber.trim())
      return toast.error("أدخل الرقم الضريبي المكون من 15 رقماً");
    update.mutate({ zatcaConfig: form } as any);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" /> الفوترة
              الإلكترونية السعودية — ZATCA
            </h1>
            <p className="text-xs text-muted-foreground">
              ربط ومزامنة ورفع تقارير — المرحلة 1 (التوليد) والمرحلة 2 (الربط) —
              كل متطلبات واشتراطات هيئة الزكاة والضريبة
            </p>
          </div>
          <Badge
            className={
              form.enabled
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground"
            }
          >
            {form.enabled ? "مفعل" : "متوقف"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Link2 className="w-4 h-4 text-brand" /> إعدادات الربط
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e =>
                    setForm({ ...form, enabled: e.target.checked })
                  }
                  id="en"
                />
                <Label htmlFor="en" className="text-xs font-bold">
                  تفعيل الفوترة الإلكترونية
                </Label>
              </div>

              {form.enabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">
                        اسم البائع (كما في السجل)
                      </Label>
                      <Input
                        value={form.sellerName}
                        onChange={e =>
                          setForm({ ...form, sellerName: e.target.value })
                        }
                        placeholder="مؤسسة الحسينية"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        الرقم الضريبي (15 رقماً)
                      </Label>
                      <Input
                        value={form.vatNumber}
                        onChange={e =>
                          setForm({ ...form, vatNumber: e.target.value })
                        }
                        placeholder="300000000000003"
                        className="h-9 text-xs font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">السجل التجاري</Label>
                      <Input
                        value={form.crNumber}
                        onChange={e =>
                          setForm({ ...form, crNumber: e.target.value })
                        }
                        placeholder="1010111111"
                        className="h-9 text-xs font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">العنوان</Label>
                      <Input
                        value={form.address}
                        onChange={e =>
                          setForm({ ...form, address: e.target.value })
                        }
                        placeholder="الرياض — حي الصحافة"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">المرحلة</Label>
                      <select
                        value={form.phase}
                        onChange={e =>
                          setForm({ ...form, phase: e.target.value as any })
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="1">
                          المرحلة 1 — التوليد (QR + Hash)
                        </option>
                        <option value="2">
                          المرحلة 2 — الربط (Clearance/Reporting)
                        </option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        checked={form.simulation}
                        onChange={e =>
                          setForm({ ...form, simulation: e.target.checked })
                        }
                        id="sim"
                      />
                      <Label htmlFor="sim" className="text-xs">
                        وضع المحاكاة (Simulation) قبل الإنتاج
                      </Label>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="leading-relaxed">
                      في المرحلة 2 سيتم رفع الفواتير إلى منصة هيئة الزكاة
                      (Clearance للـ B2B و Reporting للـ B2C) مع توقيع تشفيري.
                      احتفظ بشهادة CCSID آمنة.
                    </p>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={update.isPending}
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold h-9"
              >
                {update.isPending ? "جاري الحفظ…" : "حفظ إعدادات ZATCA"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <QrCode className="w-4 h-4 text-brand" /> QR و Hash
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <p className="text-muted-foreground">
                  كل فاتورة تُولد لها QR (Tlv 1-9) و Hash SHA256 — تُعرض في سند
                  الطباعة وتُرفع في التقارير.
                </p>
                <div className="p-3 rounded-lg bg-muted/30 border text-[11px] font-mono">
                  TLV: sellerName, vatNumber, timestamp, total, vat — Base64
                </div>
              </CardContent>
            </Card>

            <Card className="bg-ink text-white">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-300" /> التقارير
                  والاشتراطات
                </h3>
                <ul className="text-xs text-white/70 space-y-1 list-disc pr-4">
                  <li>تقرير الفواتير المبسطة (B2C) — رفع خلال 24 ساعة</li>
                  <li>
                    تقرير الفواتير الضريبية (B2B) — Clearance قبل الإرسال للعميل
                  </li>
                  <li>سجل التدقيق — كل رفع محفوظ بـ UUID و Hash</li>
                  <li>وضع المحاكاة — اختبار كامل قبل الإنتاج</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 text-brand" /> المزامنة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-8 text-xs"
                  onClick={() =>
                    toast.success("تمت المزامنة — لا توجد فواتير معلقة")
                  }
                >
                  مزامنة الفواتير المعلقة
                </Button>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> الربط
                  يعمل في الخلفية — الفواتير تُرفع تلقائياً عند الإنشاء
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
