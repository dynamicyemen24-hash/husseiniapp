import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brand, whatsappLink, engineeringConsultLink } from "@/lib/brand";
import { toast } from "sonner";
import {
  HardHat,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Phone,
  MessageSquare,
  Sparkles,
  Clock,
  Eye,
  FileSpreadsheet,
  Ruler,
  FileCheck,
  Check,
} from "lucide-react";

export default function ProjectGovernance() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    location: "",
    projectType: "عمارة سكنية",
    details: "",
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("يرجى إدخال الاسم ورقم الهاتف");
      return;
    }
    const msg =
      "السلام عليكم مؤسسة الحسينية،\nأود طلب خدمة متابعة وإشراف على مشروع:\n- الاسم: " +
      form.name +
      "\n- الهاتف: " +
      form.phone +
      "\n- موقع المشروع: " +
      (form.location || "غير محدد") +
      "\n- نوع المشروع: " +
      form.projectType +
      "\n- التفاصيل: " +
      (form.details || "لا يوجد");
    window.open(engineeringConsultLink(msg), "_blank");
    setSent(true);
    toast.success("تم إرسال طلبك — سيتواصل معك الاستشاري الهندسي مباشرة");
  };

  const steps = [
    {
      step: "1",
      title: "مراجعة المخططات وجدول الكميات",
      desc: "ندقق المخططات المعمارية والإنشائية وجداول الأسعار قبل بدء التنفيذ لمنع أي أخطاء أو هدر في المواد.",
      icon: Ruler,
    },
    {
      step: "2",
      title: "الإشراف الميداني واستلام الصبات",
      desc: "يتواجد مهندسنا في الموقع لفحص حديد التسليح، مطابقة الخرسانة، واستلام كل مرحلة بشهادة استلام رسمية.",
      icon: Eye,
    },
    {
      step: "3",
      title: "تدقيق الفواتير والمستخلصات",
      desc: "نراجع كميات المواد الموردة وأجور المقاولين بدقة لضمان أن كل ريال يُدفع في مكانه الصحيح.",
      icon: FileSpreadsheet,
    },
    {
      step: "4",
      title: "تقارير دورية موثقة بالصور",
      desc: "نرسل لك تقريراً مصوراً وشاملاً لحالة العمل ونسبة الإنجاز لتكون في قلب المشروع أينما كان مكانك.",
      icon: FileCheck,
    },
  ];

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground font-display"
      dir="rtl"
    >
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative text-white py-24 px-4 overflow-hidden bg-ink">
        <div className="absolute inset-0 tech-grid opacity-25 pointer-events-none" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(184,121,69,0.14) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand/15 border border-brand/30 text-brand-300 px-5 py-2 rounded-full text-xs font-black">
            <ShieldCheck className="w-4 h-4" />
            حماية الاستثمار وضبط التنفيذ الميداني
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-balance">
            إدارة ومتابعة المشاريع
            <span className="block gradient-text-white">
              {" "}
              للمستثمرين وأصحاب الأعمال
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-white/65 leading-relaxed font-light">
            سواء كنت داخل الوطن أو خارجه، يتولى فريقنا الهندسي الإشراف الميداني
            على مشروعك، تدقيق الفواتير، وضمان البناء بالمواصفات المعتمدة دون
            زيادة في التكاليف.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href={whatsappLink(
                "السلام عليكم مؤسسة الحسينية، أود استشارة حول متابعة وإشراف على مشروعي."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn"
            >
              <MessageSquare className="w-4 h-4" />
              تواصل مع المهندس المشرف مباشرة
            </a>
            <a
              href={"tel:" + brand.contact.phone2.replace(/\s/g, "")}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
            >
              <Phone className="w-4 h-4 text-brand-300" />
              الخط الهندسي: {brand.contact.phone2}
            </a>
          </div>
        </div>
      </section>

      {/* ── 4 Key Execution Pillars ─────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
            كيف نحمي مشروعك ونتابع تنفيذه؟
          </h2>
          <p className="text-sm text-muted-foreground">
            خطوات عملية واضحة تضمن جودة البناء وتمنع الهدر والأخطاء المكلفة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Card
                key={idx}
                className="rounded-3xl border-border bg-card p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-mono font-black text-brand mb-1">
                    المرحلة {s.step}
                  </div>
                  <h3 className="font-bold text-base text-foreground mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Benefits Comparison Grid ────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="surface rounded-3xl p-8 sm:p-12 border border-border">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl font-black text-foreground mb-2">
              الفرق بين البناء العشوائي والإشراف الهندسي المعتمد
            </h3>
            <p className="text-xs text-muted-foreground">
              مقارنة واقعية توضح حجم الأمان المالي والفني لمشروعك
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-2xl space-y-3">
              <h4 className="font-bold text-sm text-rose-600 flex items-center gap-2">
                <span>✕</span> بدون إشراف ومتابعة هندسية محايدة:
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>
                    زيادة غير محسوبة في كميات الحديد والخرسانة ترفع التكلفة
                    20-30%.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>
                    أخطاء في أبعاد الغرف والأعمدة يصعب تداركها بعد الصب.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">•</span>
                  <span>
                    غياب التقارير الدقيقة واضطرار المالك للاعتماد على كلام غير
                    موثق.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-2xl space-y-3">
              <h4 className="font-bold text-sm text-emerald-600 flex items-center gap-2">
                <span>✓</span> مع إشراف ومتابعة مؤسسة الحسينية:
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    ضبط كميات المواد وفق الكود الهندسي ومنع أي هدر في الشراء.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    فحص دقيق لتسليح الخرسانة وعينات الصب قبل وأثناء العمل.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    تقارير منتظمة بالصور ومستخلصات مالية مدققة أولاً بأول.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Consultation Request Form ───────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <Card className="rounded-3xl border-border bg-card p-8 sm:p-10 shadow-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <Badge
              variant="outline"
              className="mb-2 bg-brand/10 text-brand border-brand/20"
            >
              طلب استشارة ومتابعة
            </Badge>
            <h3 className="text-2xl font-black text-foreground mb-1">
              أخبرنا عن مشروعك لنبدأ التنسيق معك
            </h3>
            <p className="text-xs text-muted-foreground">
              سيتواصل معك المهندس المختص لدراسة المخططات وتقديم خطة العمل
              والتسعيرة المناسبة.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">الاسم الكامل *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="الاسم الكريم..."
                  className="h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  رقم الهاتف / الواتساب *
                </Label>
                <Input
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+967 أو +966..."
                  dir="ltr"
                  className="h-11 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  موقع المشروع (المدينة / المنطقة)
                </Label>
                <Input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="مثال: ذمار - شارع... أو صنعاء..."
                  className="h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">نوع المشروع</Label>
                <select
                  value={form.projectType}
                  onChange={e =>
                    setForm({ ...form, projectType: e.target.value })
                  }
                  className="w-full h-11 text-sm border border-input rounded-lg px-3 bg-background text-foreground"
                >
                  <option value="عمارة سكنية">عمارة سكنية</option>
                  <option value="مبنى تجاري">مبنى تجاري</option>
                  <option value="فيلا / منزل خاص">فيلا / منزل خاص</option>
                  <option value="أرض ومخطط عقاري">أرض ومخطط عقاري</option>
                  <option value="مشروع مقاولات عام">مشروع مقاولات عام</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                تفاصيل إضافية عن حالة المشروع الحالية
              </Label>
              <Textarea
                value={form.details}
                onChange={e => setForm({ ...form, details: e.target.value })}
                placeholder="مثال: الأرض جاهزة للبناء، أو المخططات مكتملة ونحتاج إشراف وتدقيق كميات..."
                className="min-h-24 text-sm resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-sm rounded-xl gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              إرسال ومناقشة المشروع عبر الواتساب
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
