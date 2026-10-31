import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brand, whatsappLink, uamexDemoLink } from "@/lib/brand";
import {
  Check,
  Zap,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Wifi,
  Building2,
  Cpu,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { goLogin } from "@/const";

const FEATURE_MATRIX = [
  {
    category: "المحاسبة والمالية",
    features: [
      {
        name: "قيد مزدوج ودليل حسابات شجري",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "ميزان المراجعة والميزانية العمومية",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "قائمة الدخل والتدفقات النقدية",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "إقفال السنة المحاسبية التلقائي",
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "تقارير مقارنة السنوات",
        starter: false,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "المبيعات والمخزون",
    features: [
      {
        name: "فواتير المبيعات والمشتريات",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "إدارة المخزون والحركة التلقائية",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "متابعة المستحقات والديون",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "مخازن متعددة الفروع",
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "متجر إلكتروني مربوط بالمخزون",
        starter: false,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "الإدارة والفروع",
    features: [
      {
        name: "مؤسسة واحدة وفرع واحد",
        starter: true,
        business: false,
        enterprise: false,
      },
      {
        name: "حتى 3 فروع و10 مستخدمين",
        starter: false,
        business: true,
        enterprise: false,
      },
      {
        name: "فروع ومستخدمون غير محدودين",
        starter: false,
        business: false,
        enterprise: true,
      },
      {
        name: "نظام صلاحيات متقدم",
        starter: false,
        business: true,
        enterprise: true,
      },
      {
        name: "سجل التدقيق والمراقبة",
        starter: false,
        business: true,
        enterprise: true,
      },
    ],
  },
  {
    category: "الدعم والتقنية",
    features: [
      {
        name: "يعمل أوفلاين ويتزامن تلقائياً",
        starter: true,
        business: true,
        enterprise: true,
      },
      {
        name: "نسخ احتياطي سحابي آمن",
        starter: true,
        business: true,
        enterprise: true,
      },
      { name: "دعم واتساب", starter: true, business: true, enterprise: true },
      {
        name: "دعم ذو أولوية وSLA",
        starter: false,
        business: false,
        enterprise: true,
      },
      {
        name: "مدير حساب مخصص",
        starter: false,
        business: false,
        enterprise: true,
      },
    ],
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen bg-sand text-ink dark:bg-background dark:text-foreground font-display"
      dir="rtl"
    >
      {/* Hero */}
      <section className="relative text-white py-20 px-4 overflow-hidden bg-ink">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(184,121,69,0.15),transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-brand/15 border border-brand/30 text-brand-300 px-4 py-1.5 rounded-full text-xs font-bold">
            <Cpu className="w-4 h-4" />
            أسعار نظام Uamex_erp
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            ابدأ مجاناً، ادفع فقط عندما تنمو
          </h1>
          <p className="max-w-2xl mx-auto text-base text-white/65 leading-relaxed font-light">
            {brand.pricing.note}
          </p>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            التجربة المجانية تشمل كل الوحدات — بدون قيود، بدون بطاقة ائتمان
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {brand.pricing.plans.map((p, i) => (
            <Card
              key={p.key}
              className={`rounded-3xl flex flex-col relative overflow-hidden ${
                p.highlight
                  ? "border-2 border-brand shadow-2xl shadow-brand/20"
                  : "border border-border"
              }`}
            >
              {p.highlight && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand/50 via-brand to-brand/50" />
              )}
              {p.highlight && (
                <span className="absolute -top-3 right-6 bg-brand text-ink-deep text-[10px] font-black px-3 py-1 rounded-full shadow">
                  الأكثر طلباً
                </span>
              )}

              <div className={`p-6 ${p.highlight ? "bg-brand/5" : ""}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      p.highlight
                        ? "bg-brand text-ink-deep"
                        : "bg-ink/5 dark:bg-white/10 text-foreground"
                    }`}
                  >
                    {p.highlight ? (
                      <Sparkles className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {p.desc}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span
                    className={`text-4xl font-black ${p.highlight ? "text-brand" : "text-foreground"}`}
                  >
                    {p.price}
                  </span>
                  <span className="text-xs text-muted-foreground mr-2">
                    {p.period}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-muted-foreground mb-6">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0 mt-auto">
                {p.key === "starter" ? (
                  <Button
                    onClick={() => goLogin()}
                    className="w-full h-11 font-bold rounded-xl bg-ink hover:bg-ink-deep text-white"
                  >
                    <Zap className="w-4 h-4 ml-2" />
                    {p.cta}
                  </Button>
                ) : p.key === "business" ? (
                  <a
                    href={uamexDemoLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 font-bold rounded-xl bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {p.cta}
                  </a>
                ) : (
                  <Button
                    onClick={() => setLocation("/contact")}
                    variant="outline"
                    className="w-full h-11 font-bold rounded-xl"
                  >
                    {p.cta}
                    <ArrowRight className="w-4 h-4 rotate-180 mr-1" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Feature Matrix */}
        <div className="mt-20">
          <h2 className="text-2xl font-extrabold text-center text-foreground mb-10">
            مقارنة تفصيلية بين الباقات
          </h2>
          <div className="surface rounded-3xl overflow-hidden border border-border">
            {/* Header */}
            <div className="grid grid-cols-4 bg-ink text-white text-xs font-bold">
              <div className="p-4">الميزة</div>
              <div className="p-4 text-center border-r border-white/10">
                البداية
              </div>
              <div className="p-4 text-center border-r border-white/10 bg-brand/20 text-brand-300">
                الأعمال ⭐
              </div>
              <div className="p-4 text-center">المؤسسات</div>
            </div>

            {FEATURE_MATRIX.map((cat, ci) => (
              <div key={ci}>
                <div className="bg-brand/5 border-y border-border px-4 py-2.5">
                  <span className="text-xs font-bold text-brand uppercase tracking-wide">
                    {cat.category}
                  </span>
                </div>
                {cat.features.map((f, fi) => (
                  <div
                    key={fi}
                    className={`grid grid-cols-4 text-xs border-b border-border/50 hover:bg-brand/3 transition-colors ${
                      fi % 2 === 0 ? "" : "bg-sand/30 dark:bg-white/3"
                    }`}
                  >
                    <div className="p-3.5 text-foreground/80">{f.name}</div>
                    <div className="p-3.5 text-center border-r border-border/30">
                      {f.starter ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </div>
                    <div className="p-3.5 text-center border-r border-border/30 bg-brand/5">
                      {f.business ? (
                        <Check className="w-4 h-4 text-brand mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </div>
                    <div className="p-3.5 text-center">
                      {f.enterprise ? (
                        <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {brand.trustBadges.map((b, i) => (
            <div
              key={i}
              className="surface rounded-2xl px-4 py-5 text-xs font-medium text-muted-foreground flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
              {b}
            </div>
          ))}
        </div>

        {/* للخدمات الأخرى */}
        <div className="mt-14 bg-ink rounded-3xl p-10 text-white text-center space-y-5">
          <h3 className="text-xl font-bold">
            الخدمات الهندسية والطلابية لها أسعار منفصلة
          </h3>
          <p className="text-white/60 text-sm max-w-xl mx-auto leading-relaxed">
            خدمات الاستشارات الهندسية (BOQ، رفع مساحي، مخططات) والخدمات الطلابية
            والمكتبية تُسعَّر حسب طبيعة كل طلب وحجمه. تواصل معنا لمعرفة السعر
            المناسب لمشروعك.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink(
                "السلام عليكم، أود الاستفسار عن أسعار الخدمات الهندسية."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black px-6 py-3 rounded-xl text-sm transition-all hover:scale-105"
            >
              <MessageSquare className="w-4 h-4" />
              استفسر عن الخدمات الهندسية
            </a>
            <a
              href={whatsappLink(
                "السلام عليكم، أود الاستفسار عن أسعار الخدمات الطلابية والمكتبية."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 hover:bg-white/10 text-white font-medium px-6 py-3 rounded-xl text-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              استفسر عن الخدمات الطلابية
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
