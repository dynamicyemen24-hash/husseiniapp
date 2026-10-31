import React from "react";
import { useLocation } from "wouter";
import { goToSystem } from "@/lib/deploymentLinks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Building2,
  BookOpen,
  Layers,
  ShieldCheck,
  CheckCircle2,
  HardHat,
  Calculator,
  Users,
  BarChart3,
  Cpu,
  Award,
  ArrowUpLeft,
  Database,
  TrendingUp,
} from "lucide-react";
import { brand, whatsappLink } from "@/lib/brand";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductLogo } from "@/components/BrandLogo";

export default function Landing() {
  const [, setLocation] = useLocation();
  return (
    <div className="bg-white text-ink" dir="rtl">
      {/* 1. Welcome/Hero — يجيب فورا: من نحن/ماذا/لمن/قيمة */}
      <section className="relative isolate overflow-hidden bg-[#0b1d1e] text-white">
        <div
          className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:56px_56px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.12)]" />
              الحسينية لخدمات الأعمال · منظومة تنمو معك
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.2] tracking-tight sm:text-5xl lg:text-6xl">
              قرار أوضح،{" "}
              <span className="bg-gradient-to-l from-brand-200 via-brand-300 to-amber-100 bg-clip-text text-transparent">
                عمل أقوى
              </span>
              <br />
              ومنظومة تستمر.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              نربط خدمات الأعمال والاستشارات مع{" "}
              <strong className="text-brand-200">Uamex ERP</strong> في تجربة
              واحدة تساعد المؤسسة على تنظيم المال، وتشغيل الفرق، ومتابعة النمو
              بثقة.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => goToSystem("/login")}
                className="h-12 rounded-xl bg-brand px-7 font-black text-ink-deep shadow-[0_12px_28px_rgba(184,121,69,.28)] hover:bg-brand-deep"
              >
                ابدأ مع Uamex ERP
                <ArrowUpLeft className="mr-2 h-4 w-4" />
              </Button>
              <Button
                onClick={() =>
                  document
                    .getElementById("solutions")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="h-12 rounded-xl border border-white/15 bg-white/[0.07] px-7 font-black text-white hover:bg-white/[0.13]"
              >
                استكشف الحلول
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> تجربة 14
                يومًا
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-200" /> صلاحيات وسجل
                متابعة
              </span>
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-200" /> بيانات مترابطة
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:mr-auto">
            <div
              className="absolute -inset-5 rounded-[2rem] border border-brand/15 bg-brand/5 blur-sm"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#102a2b]/95 p-3 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <ProductLogo size={30} onDark />
                  <div>
                    <div className="text-[11px] font-black text-white">
                      Uamex ERP
                    </div>
                    <div className="text-[9px] text-white/45">
                      مركز القيادة التنفيذي
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{" "}
                  مباشر الآن
                </div>
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <div className="text-[10px] text-white/50">
                        صافي التدفق النقدي
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        + 248,600{" "}
                        <span className="text-xs font-medium text-white/45">
                          ر.س
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-200">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex h-28 items-end gap-2 px-1">
                    {[34, 47, 41, 64, 54, 72, 68, 92, 80, 96, 87, 100].map(
                      (height, index) => (
                        <span
                          key={index}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-brand/45 to-brand-200"
                          style={{
                            height: String(height) + "%",
                            opacity: 0.45 + index / 24,
                          }}
                        />
                      )
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-[9px] text-white/35">
                    <span>يناير</span>
                    <span>يونيو</span>
                    <span>ديسمبر</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between text-[10px] text-white/50">
                      <span>الأداء التشغيلي</span>
                      <BarChart3 className="h-4 w-4 text-brand-200" />
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      92.4%
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[92%] rounded-full bg-emerald-300" />
                    </div>
                    <div className="mt-2 text-[9px] text-emerald-200">
                      +8.6% عن الشهر السابق
                    </div>
                  </div>
                  <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4">
                    <div className="flex items-center gap-2 text-[10px] text-brand-100">
                      <Cpu className="h-4 w-4" /> تنبيه ذكي
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-white/75">
                      تمت مطابقة 18 طلب شراء مع فواتيرها دون فروقات.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
                {[
                  ["12", "فرعًا"],
                  ["1,248", "عملية اليوم"],
                  ["99.6%", "اكتمال البيانات"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-white/[0.035] px-3 py-2"
                  >
                    <div className="text-sm font-black text-white">{value}</div>
                    <div className="mt-0.5 text-[9px] text-white/40">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-white/15 bg-[#173536] px-4 py-3 shadow-xl sm:block">
              <div className="flex items-center gap-2 text-[10px] font-bold text-white">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-300/15 text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                </span>{" "}
                البيانات تحت السيطرة
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. تعريف الشركة وقيمتها */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <Badge variant="outline" className="border-slate-200">
            من نحن
          </Badge>
          <h2 className="text-2xl lg:text-3xl font-black">
            خدمات واضحة، ومخرجات تساعدك على اتخاذ القرار
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            نبدأ بفهم احتياجك، ثم نحدد نطاق العمل ومخرجاته بوضوح. في خدماتنا
            المهنية والرقمية نركز على معلومات منظمة وخطوات يمكن متابعتها
            ومراجعتها.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50">
            <Building2 className="w-6 h-6 text-brand mb-3" />
            <h3 className="font-black">الرؤية</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              أن نكون الشريك الاستراتيجي للمؤسسات العربية في التحول إلى عمل منظم
              وآمن وقابل للنمو.
            </p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
            <Layers className="w-6 h-6 text-brand mb-3" />
            <h3 className="font-black">الرسالة</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              تمكين المؤسسات عبر منظومة واحدة تدير الحسابات والمشاريع والموارد
              بمرونة وشفافية.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <Award className="w-6 h-6 text-brand mb-3" />
            <h3 className="font-black">قيمنا</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              تميز — موثوقية — ابتكار — شراكة. تفاصيل صغيرة تصنع فارقا كبيرا.
            </p>
          </div>
        </div>
      </section>

      {/* 3. الحلول والخدمات */}
      <section
        id="solutions"
        className="bg-slate-50 border-y border-slate-200 py-12"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge className="bg-slate-900 text-white">الحلول والخدمات</Badge>
            <h2 className="text-2xl lg:text-3xl font-black">
              خدمات متنوعة، لكل منها نطاق واضح
            </h2>
            <p className="text-sm text-slate-600">
              اختر الخدمة التي تناسب احتياجك، وسنوضح لك نطاقها وخطوات طلبها.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <Building2 className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-black">الاستشارات المؤسسية</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                هياكل تنظيمية، أدلة إجراءات، مؤشرات أداء، وحوكمة قرار ببيان لا
                بتوقع.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  تحليل قوائم وميزانيات تقديرية
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  مصفوفة صلاحيات واضحة
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <HardHat className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-black">الهندسة والمساحة</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                مخططات تنفيذية، رفع مساحي دقيق، جداول كميات BOQ وحساب حفر وردم.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Shop
                  Drawings و BIM
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  GPS/درون بدقة عالية
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6">
              <BookOpen className="w-8 h-8 text-brand mb-3" />
              <h3 className="font-black">الخدمات المعرفية</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                تنسيق أبحاث، تحليل SPSS، طباعة وتجليد بمعايير الجامعات.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> APA
                  7th وتوثيق مراجع
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                  صيانة أجهزة محمولة وحواسيب
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Uamex ERP كمنتج رئيسي — مفصول بصريا */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-slate-900 text-white p-8 lg:p-10 flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1 space-y-3">
            <ProductLogo size={42} onDark />
            <Badge className="bg-white/10 text-brand-300 border-white/20">
              منتج رقمي من الحسينية
            </Badge>
            <h2 className="text-2xl lg:text-3xl font-black">
              إدارة مترابطة لأعمالك اليومية
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Uamex ERP منتج رقمي من الحسينية لخدمات الأعمال، يجمع عمليات
              المحاسبة والمبيعات والمشتريات والمخزون في مساحة عمل واحدة. وتظهر
              بيانات منشأتك في المستندات والتقارير التي تنشئها.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => goToSystem("/login")}
                className="bg-brand text-ink-deep font-black"
              >
                جرّب Uamex ERP
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/pricing")}
                className="border-white/20 text-white bg-white/5"
              >
                الأسعار
              </Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 w-full">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <Cpu className="w-5 h-5 text-brand-300 mb-2" />
              <p className="text-xs font-bold">متابعة مالية</p>
              <p className="text-[11px] text-white/50">
                راجع الإيرادات والمصروفات والأرصدة المسجلة
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <BarChart3 className="w-5 h-5 text-brand-300 mb-2" />
              <p className="text-xs font-bold">تقارير وقوائم</p>
              <p className="text-[11px] text-white/50">
                حدّد الفترة والبيانات التي تحتاجها
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <ShieldCheck className="w-5 h-5 text-brand-300 mb-2" />
              <p className="text-xs font-bold">صلاحيات ومراجعة</p>
              <p className="text-[11px] text-white/50">
                إدارة وصول المستخدمين حسب الأدوار
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <Calculator className="w-5 h-5 text-brand-300 mb-2" />
              <p className="text-xs font-bold">استمرارية العمل</p>
              <p className="text-[11px] text-white/50">
                بعض الوظائف تدعم العمل دون اتصال
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5 How a business transaction flows through the product. */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center space-y-2 mb-8">
          <Badge variant="outline" className="border-slate-200">
            طريقة العمل
          </Badge>
          <h2 className="text-2xl lg:text-3xl font-black">
            أثر العملية واضح في مسارها
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto">
            تتبع العملية من تسجيلها إلى مراجعة أثرها، وفق الوحدات والإعدادات
            المفعّلة لمنشأتك.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              name: "١. سجّل العملية",
              before: "فاتورة بيع أو شراء، طلب توريد، أو حركة مالية.",
              after: "أدخل التفاصيل مرة واحدة في المستند المناسب.",
            },
            {
              name: "٢. راجع الأثر",
              before: "تحقق من البنود والحسابات والجهة المرتبطة.",
              after: "تظهر الآثار المرتبطة بحسب إعدادات النظام.",
            },
            {
              name: "٣. تابع النتائج",
              before: "اختر الفترة والفرع أو الحساب الذي تريد مراجعته.",
              after: "استخدم التقارير لمتابعة الأرقام واتخاذ قرارك.",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col gap-3"
            >
              <p className="font-black text-sm">{s.name}</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {s.before}
              </p>
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 leading-relaxed">
                {s.after}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Uamex ERP workspaces */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mx-auto max-w-2xl space-y-2 text-center">
            <Badge variant="outline" className="border-slate-200">
              Uamex ERP
            </Badge>
            <h2 className="font-black text-xl">مساحات مترابطة لإدارة العمل</h2>
            <p className="text-sm text-slate-600">
              نظّم العمليات بحسب الوحدات التي تحتاجها، وتابع أثر البيانات
              المرتبطة في مساحة عمل واحدة.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3 mt-6">
            {brand.uamex.modules.map(module => (
              <div
                key={module.key}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs font-black">{module.name}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {module.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. الثقة */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
          <h3 className="font-black flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> ثقة تبنى ببيان
          </h3>
          <div className="grid md:grid-cols-3 gap-2 mt-4 text-xs">
            {brand.trustBadges.map(b => (
              <div
                key={b}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. الأسعار/التواصل + CTA نهائي */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl font-black">جاهز لتنظيم عملك؟</h2>
          <p className="text-sm text-white/60">
            ابدأ بتجربة 14 يوما — بدون بطاقة — أو تحدث معنا.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => setLocation("/pricing")}
              className="bg-white text-slate-900 font-black h-11 px-7"
            >
              الأسعار
            </Button>
            <a
              href={whatsappLink(
                "السلام عليكم، أود الاستفسار عن خدمات الحسينية"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-11 px-7 rounded-xl bg-brand text-ink-deep font-black"
            >
              تواصل واتساب
            </a>
            <Button
              variant="outline"
              onClick={() => goToSystem("/login")}
              className="h-11 px-7 border-white/20 text-white bg-white/5"
            >
              دخول النظام
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ مختصر */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <h3 className="font-black text-center mb-4">أسئلة شائعة</h3>
        <Accordion type="single" collapsible>
          {brand.faq.slice(0, 4).map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger className="text-sm font-bold text-right">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-slate-600 leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
