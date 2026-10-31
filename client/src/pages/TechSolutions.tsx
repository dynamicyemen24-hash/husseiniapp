import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brand, whatsappLink } from "@/lib/brand";
import {
  Smartphone,
  Zap,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Phone,
  Check,
} from "lucide-react";

export default function TechSolutions() {
  const pillars = [
    {
      icon: Smartphone,
      title: "تطوير التطبيقات والمنصات السحابية المخصصة",
      sub: "Custom Web & Mobile Apps",
      color: "bg-brand/10 text-brand border-brand/20",
      description:
        "بناء منصات وتطبيقات ويب وجوال عالية الأداء مصممة خصيصاً وفق المتطلبات الفريدة لنشاطك، مع تكامل مباشر مع قواعد بياناتك وأنظمتك الحالية.",
      features: [
        "بوابات مخصصة لخدمة العملاء، الموردين، والمندوبين الميدانيين.",
        "تطبيقات تجارة إلكترونية B2B و B2C مربوطة لحظياً مع المخازن والحسابات.",
        "بنية سحابية قابلة للتوسع (Serverless / Microservices) بأعلى درجات الأمان.",
        "لوحات تحكم تفاعلية مع تحكم كامل في الصلاحيات المتعددة.",
      ],
      whatsappMsg:
        "السلام عليكم، أود استشارة حول تطوير تطبيق / منصة ويب مخصصة لشركتنا.",
    },
    {
      icon: Zap,
      title: "أتمتة العمليات وتكامل الأنظمة (APIs & Automation)",
      sub: "Process Automation & Integration",
      color: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      description:
        "ربط كافة أطراف المنظومة التقنية لتدفق البيانات آلياً بدون أي تدخل بشري مكرر أو أخطاء إدخال يدوية.",
      features: [
        "ربط بوابات الدفع الإلكتروني والمحافظ الرقمية مع قيود اليومية آلياً.",
        "التكامل مع أجهزة البصمة، نقاط البيع، موازين الشاحنات، وقارئات الباركود.",
        "أتمتة رسائل التنبيهات والإشعارات عبر الواتساب والبريد الإلكتروني والـ SMS.",
        "بناء واجهات برمجة التطبيقات (REST / GraphQL APIs) للربط مع الشركاء.",
      ],
      whatsappMsg:
        "السلام عليكم، أود استشارة حول أتمتة العمليات وربط الأنظمة في مؤسستنا.",
    },
    {
      icon: BarChart3,
      title: "لوحات قياس الأداء والذكاء التحليلي (BI & Dashboards)",
      sub: "Executive Dashboards & KPI Monitoring",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      description:
        "تحويل البيانات المحاسبية والتشغيلية الضخمة إلى مؤشرات بصرية فورية تُمكّن الإدارة العليا من اتخاذ قرارات دقيقة وسريعة.",
      features: [
        "مراقبة هوامش الربحية، السيولة النقدية، والأرصدة المدينة لحظياً.",
        "تحليل حركة الأصناف الراكدة والأكثر مبيعاً ومعدلات الدوران المخزني.",
        "مؤشرات أداء الفرق والمبيعات مع تنبيهات عند انخفاض الأداء عن المستهدف.",
        "تقارير تنبؤية للتدفقات النقدية والالتزامات المستقبلية.",
      ],
      whatsappMsg:
        "السلام عليكم، أود استشارة حول بناء لوحات تحكم ومؤشرات أداء BI للإدارة.",
    },
    {
      icon: ShieldCheck,
      title: "استشارات البنية التحتية، الأمان، والنسخ الاحتياطي",
      sub: "Security, Cloud Infrastructure & Disaster Recovery",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      description:
        "حماية أصولك الرقمية وبياناتك المالية من الفقدان أو التلف أو الاختراق عبر حلول أمان مؤسسية متقدمة.",
      features: [
        "إعداد منظومات النسخ الاحتياطي التلقائي المشفر (On-Premise & Cloud).",
        "ضبط صلاحيات الوصول الصارمة وسجلات التدقيق (Audit Logging) لكل حركة.",
        "تقييم الثغرات واختبارات الاختراق لحماية خوادم وشبكات المؤسسة.",
        "خطة استمرارية الأعمال والتعافي من الكوارث (Disaster Recovery).",
      ],
      whatsappMsg:
        "السلام عليكم، أود استشارة حول أمان البيانات والنسخ الاحتياطي السحابي.",
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
            <Sparkles className="w-4 h-4" />
            الحلول البرمجية والتحول الرقمي المتقدم
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-balance">
            أنظمة مخصصة، تطبيقات ذكية،
            <span className="block gradient-text-white">
              {" "}
              وأتمتة شاملة لعملياتك
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-white/65 leading-relaxed font-light">
            نبني حلولاً تقنية رفيعة المستوى تخدم خصوصية أعمالك، ترتبط بسلاسة مع
            نظامك القائم، وتمنحك سيطرة كاملة على كل تفاصيل مؤسستك.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href={whatsappLink(
                "السلام عليكم مؤسسة الحسينية، أود مناقشة مشروع تطوير برمجي أو أتمتة لنشاطنا."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn"
            >
              <MessageSquare className="w-4 h-4" />
              تواصل مع الاستشاري التقني
            </a>
            <a
              href={"tel:" + brand.contact.phone.replace(/\s/g, "")}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
            >
              <Phone className="w-4 h-4 text-brand-300" />
              {brand.contact.phone}
            </a>
          </div>
        </div>
      </section>

      {/* ── 4 Service Pillars ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
            ركائز الخدمات التقنية والبرمجية
          </h2>
          <p className="text-sm text-muted-foreground">
            حلول شاملة تغطي كافة متطلبات التحول الرقمي والأتمتة المؤسسية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <Card
                key={idx}
                className="rounded-3xl border-border bg-card p-8 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div
                      className={
                        "w-12 h-12 rounded-2xl flex items-center justify-center " +
                        pillar.color
                      }
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {pillar.sub}
                    </Badge>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    {pillar.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {pillar.features.map((feat, fIdx) => (
                      <li
                        key={fIdx}
                        className="text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() =>
                    window.open(whatsappLink(pillar.whatsappMsg), "_blank")
                  }
                  variant="outline"
                  className="w-full h-11 border-border hover:border-brand/40 text-xs font-bold gap-2 rounded-xl"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand" />
                  طلب دراسة واقتراح حل لهذا المجال
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Workflow Methodology ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="surface rounded-3xl p-8 sm:p-12 border border-border">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl font-black text-foreground mb-2">
              منهجية العمل التقني المعتمدة
            </h3>
            <p className="text-xs text-muted-foreground">
              خطوات تنفيذية واضحة تضمن تسليم النظام بالجودة المطلوبة وفي الموعد
              المحدد
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "تحليل الاحتياج والفجوة",
                desc: "جلسات استشارية لفهم نموذج العمل وحصر العمليات المطلوب أتمتتها وتحديد مؤشرات النجاح.",
              },
              {
                step: "02",
                title: "الهندسة والمخطط الفني",
                desc: "تصميم هيكل قاعدة البيانات، واجهات المستخدم، ومخططات سير البيانات (Data Flow).",
              },
              {
                step: "03",
                title: "التطوير والاختبار الميداني",
                desc: "بناء النظام بأحدث التقنيات مع اختبارات أداء وأمان صارمة ومطابقة السيناريوهات الواقعية.",
              },
              {
                step: "04",
                title: "النشر والتدريب والدعم",
                desc: "تشغيل النظام، ترحيل البيانات السابقة، تدريب الكادر، وتقديم دعم فني وضمان تشغيلي.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-2"
              >
                <div className="text-2xl font-black text-brand font-mono">
                  {step}
                </div>
                <h4 className="font-bold text-sm text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
