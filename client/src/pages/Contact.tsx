import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brand, whatsappLink } from "@/lib/brand";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  Clock,
  Building2,
  HardHat,
  GraduationCap,
  Cpu,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const SERVICE_CHANNELS = [
  {
    id: "corporate",
    icon: Building2,
    title: "استشارات مؤسسية وإدارية",
    sub: "للمدراء وأصحاب الشركات والمقاولين الكبار",
    color: "bg-brand/10 text-brand",
    msg: "السلام عليكم مؤسسة الحسينية، أحتاج استشارة مؤسسية وإدارية.",
    phoneKey: "phone" as const,
  },
  {
    id: "engineering",
    icon: HardHat,
    title: "الخدمات الهندسية والمساحية",
    sub: "للمقاولين وأصحاب الأراضي والمهندسين",
    color: "bg-amber-500/10 text-amber-500",
    msg: "السلام عليكم، أحتاج خدمة هندسية (BOQ / رفع مساحي / مخطط).",
    phoneKey: "phone2" as const,
  },
  {
    id: "library",
    icon: GraduationCap,
    title: "الخدمات الطلابية والمكتبية",
    sub: "للطلاب والباحثين وطلبات المكتبة",
    color: "bg-emerald-500/10 text-emerald-500",
    msg: "السلام عليكم، أحتاج مساعدة في خدمة طلابية أو مكتبية.",
    phoneKey: "phone" as const,
  },
  {
    id: "uamex",
    icon: Cpu,
    title: "نظام Uamex_erp — عروض واشتراك",
    sub: "للشركات والمؤسسات الراغبة في تطبيق النظام",
    color: "bg-sky-500/10 text-sky-400",
    msg: "السلام عليكم، أود طلب عرض تجريبي لنظام Uamex_erp.",
    phoneKey: "phone" as const,
  },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const setField =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error("يرجى تعبئة الاسم ورقم الهاتف والرسالة");
      return;
    }
    const composed = [
      "السلام عليكم مؤسسة الحسينية، نموذج تواصل من الموقع:",
      "",
      `الاسم: ${form.name}`,
      `الهاتف: ${form.phone}`,
      form.email ? `البريد: ${form.email}` : "",
      form.service ? `نوع الطلب: ${form.service}` : "",
      "",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(whatsappLink(composed), "_blank", "noopener,noreferrer");
    setSent(true);
    toast.success(
      "تم تجهيز رسالتك — أرسلها في الواتساب ويردّ عليك فريقنا خلال دقائق"
    );
  };

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
              "radial-gradient(ellipse at center, rgba(184,121,69,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand/15 border border-brand/30 text-brand-300 px-5 py-2 rounded-full text-xs font-black">
            <Sparkles className="w-4 h-4" />
            فريقنا جاهز لمساعدتك
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-balance">
            كيف يمكننا
            <span className="block gradient-text-white"> مساعدتك اليوم؟</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-white/60 leading-relaxed font-light">
            سواء كنت مقاولاً تحتاج BOQ، أو طالباً تبحث عن مراجع، أو مديراً يريد
            تطبيق Uamex_erp — فريقنا يردّ عليك خلال دقائق.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
            >
              <Phone className="w-4 h-4 text-brand-300" />
              {brand.contact.phone}
            </a>
            <a
              href={`tel:${brand.contact.phone2.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
            >
              <Phone className="w-4 h-4 text-brand-300" />
              {brand.contact.phone2}
            </a>
            <a
              href={whatsappLink(
                "السلام عليكم مؤسسة الحسينية، أود الاستفسار عن خدماتكم."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn"
            >
              <MessageSquare className="w-4 h-4" />
              واتساب — رد فوري
            </a>
          </div>
        </div>
      </section>

      {/* ── Service Channel Routing ────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-foreground mb-2">
            حدّد طبيعة طلبك للوصول الأسرع
          </h2>
          <p className="text-sm text-muted-foreground">
            كل قسم له فريق متخصص — تواصل مباشرة مع الشخص المناسب
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICE_CHANNELS.map(
            ({ id, icon: Icon, title, sub, color, msg, phoneKey }) => (
              <a
                key={id}
                href={whatsappLink(msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="group surface rounded-3xl p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl hover:border-brand/30 transition-all glow-brand-hover"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground leading-snug mb-1">
                    {title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {sub}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-xs text-brand-300 font-bold group-hover:text-brand transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  راسلنا على واتساب
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {brand.contact[phoneKey]}
                </div>
              </a>
            )
          )}
        </div>
      </section>

      {/* ── Contact Form + Sidebar ─────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-border bg-card p-8 shadow-sm">
              {sent ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-foreground">
                    تم تجهيز رسالتك!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                    فُتحت نافذة الواتساب مع رسالتك جاهزة للإرسال — أرسلها ويردّ
                    عليك أحد خبرائنا خلال دقائق.
                  </p>
                  <a
                    href={whatsappLink(
                      "السلام عليكم، أرسلت نموذج التواصل وأود متابعته."
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn mt-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    متابعة عبر واتساب
                  </a>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      أرسل رسالتك
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      سنراجع طلبك ونتواصل معك. الحقول المُشار إليها بـ * مطلوبة.
                    </p>
                  </div>
                  <form onSubmit={submit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          الاسم الكامل *
                        </Label>
                        <Input
                          value={form.name}
                          onChange={setField("name")}
                          placeholder="المهندس / الأستاذ / الدكتور..."
                          className="h-11 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                          رقم الهاتف *
                        </Label>
                        <Input
                          value={form.phone}
                          onChange={setField("phone")}
                          dir="ltr"
                          placeholder="+967 77..."
                          className="h-11 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">
                        البريد الإلكتروني
                      </Label>
                      <Input
                        value={form.email}
                        onChange={setField("email")}
                        type="email"
                        dir="ltr"
                        placeholder="name@company.com"
                        className="h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">طبيعة الطلب</Label>
                      <select
                        value={form.service}
                        onChange={setField("service")}
                        className="w-full h-11 text-sm border border-input rounded-lg px-3 bg-background text-foreground"
                      >
                        <option value="">اختر القسم المناسب (اختياري)</option>
                        <option value="corporate">
                          استشارات مؤسسية وإدارية
                        </option>
                        <option value="engineering">
                          خدمات هندسية ومساحية
                        </option>
                        <option value="library">خدمات طلابية ومكتبية</option>
                        <option value="uamex">نظام Uamex_erp</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">تفاصيل طلبك *</Label>
                      <Textarea
                        value={form.message}
                        onChange={setField("message")}
                        placeholder="صِف حاجتك بوضوح — كلما كانت التفاصيل أكثر، كان ردّنا أدق وأسرع..."
                        className="min-h-32 text-sm resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black gap-2 text-sm rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                      إرسال الرسالة
                    </Button>
                  </form>
                </>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <Card className="rounded-3xl border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-brand" />
                </div>
                <h3 className="font-bold text-foreground text-sm">
                  ساعات العمل
                </h3>
              </div>
              <ul className="space-y-2.5">
                {[
                  { d: "الأحد — الخميس", h: "8 ص — 6 م" },
                  { d: "السبت", h: "10 ص — 4 م" },
                  { d: "الجمعة", h: "مغلق" },
                ].map(({ d, h }, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-muted-foreground">{d}</span>
                    <span
                      className={`font-bold ${
                        h === "مغلق" ? "text-rose-400" : "text-foreground"
                      }`}
                    >
                      {h}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-emerald-500 font-bold">
                    واتساب متاح 24/7
                  </span>{" "}
                  — الرد الفوري لجميع العملاء في أي وقت.
                </p>
              </div>
            </Card>

            <Card className="rounded-3xl bg-ink text-white p-6 border-0">
              <h3 className="font-bold text-white text-sm mb-4">تواصل مباشر</h3>
              <div className="space-y-3 text-xs">
                <a
                  href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 text-white/70 hover:text-brand-300 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40">
                      الخط الرئيسي
                    </div>
                    <div className="font-mono font-bold">
                      {brand.contact.phone}
                    </div>
                  </div>
                </a>
                <a
                  href={`tel:${brand.contact.phone2.replace(/\s/g, "")}`}
                  className="flex items-center gap-3 text-white/70 hover:text-brand-300 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40">
                      الخدمات الهندسية
                    </div>
                    <div className="font-mono font-bold">
                      {brand.contact.phone2}
                    </div>
                  </div>
                </a>
                <a
                  href={`mailto:${brand.contact.email}`}
                  className="flex items-center gap-3 text-white/70 hover:text-brand-300 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40">البريد</div>
                    <div>{brand.contact.email}</div>
                  </div>
                </a>
                <div className="flex items-start gap-3 text-white/50">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40">الموقع</div>
                    <div className="leading-relaxed">
                      {brand.contact.address}
                    </div>
                    <div className="text-brand-300">
                      {brand.contact.country}
                    </div>
                  </div>
                </div>
              </div>
              <a
                href={whatsappLink(
                  "السلام عليكم مؤسسة الحسينية، أود الحصول على استشارة سريعة."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn w-full justify-center mt-5"
              >
                <MessageSquare className="w-4 h-4" />
                محادثة واتساب — الأسرع
              </a>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
