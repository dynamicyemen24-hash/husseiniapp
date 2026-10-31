import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brand, whatsappLink, engineeringConsultLink } from "@/lib/brand";
import {
  BookOpen,
  Building2,
  HardHat,
  Cpu,
  CheckCircle2,
  Search,
  Sparkles,
  FileText,
  Clock,
  BarChart3,
  MessageSquare,
  Phone,
} from "lucide-react";

interface GuideItem {
  id: string;
  category: "corporate" | "engineering" | "tech" | "research";
  categoryLabel: string;
  categoryColor: string;
  title: string;
  targetPersona: string;
  readTime: string;
  summary: string;
  problem: string;
  methodology: string[];
  metrics: string;
  ctaText: string;
  ctaAction: () => void;
}

export default function KnowledgeHub() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const guides: GuideItem[] = [
    {
      id: "procurement-governance",
      category: "corporate",
      categoryLabel: "استشارات مؤسسية وحوكمة",
      categoryColor: "bg-brand/10 text-brand border-brand/20",
      title: "دليل حصر وضبط دورة المشتريات والمخازن لمنع الهدر والتسريب",
      targetPersona: "للمدراء الماليين والتنفيذيين وأصحاب الشركات التجارية",
      readTime: "6 دقائق قراءة استشارية",
      summary:
        "منهجية ثلاثية لفصل الصلاحيات والربط بين أمر الشراء وإذن الاستلام والفاتورة لمنع أي تلاعب أو ازدواجية.",
      problem:
        "غياب المطابقة التلقائية بين ما تم شراؤه وما دخل المخزن وما تم صرفه، مما يسبب فروقات جرد سنوية وعجزاً غير مبرر.",
      methodology: [
        "اعتماد نظام المطابقة الثلاثية (Three-Way Matching) بين أمر الشراء وسند الإدخال وفاتورة المورد.",
        "فصل صلاحيات طلب الشراء عن صلاحية الاعتماد وصلاحية الصرف المخزني.",
        "تطبيق نظام التكلفة المعيارية وتحديد نقاط إعادة الطلب التلقائية لمنع تجميد رأس المال في مخزون راكد.",
        "تفعيل سجل التدقيق الرقمي (Audit Trail) لكل عملية تعديل أو إلغاء في الفواتير.",
      ],
      metrics:
        "تخفيض نسبة الفاقد المخزني بنسبة تصل إلى 92% وانضباط كامل في المطابقات المالية الشهرية.",
      ctaText: "طلب جلسة حوكمة لدورة المشتريات والمخازن",
      ctaAction: () =>
        window.open(
          whatsappLink(
            "السلام عليكم، أود حجز جلسة استشارية حول حوكمة دورة المشتريات والمخازن في مؤسستنا."
          ),
          "_blank"
        ),
    },
    {
      id: "boq-estimation-standards",
      category: "engineering",
      categoryLabel: "هندسة ومقاولات ومساحة",
      categoryColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      title:
        "الدليل الهندسي لإعداد جداول الكميات (BOQ) وتفادي الخسائر في المناقصات",
      targetPersona: "للمقاولين، المهندسين التنفيذيين، والمستثمرين العقاريين",
      readTime: "8 دقائق قراءة استشارية",
      summary:
        "معايير تفكيك بنود المشروع إلى تكاليف مباشرة وغير مباشرة مع احتساب نسب الهلك الواقعية.",
      problem:
        "التسعير التقديري أو الاعتماد على أسعار سابقة دون دراسة الموقع وتغير أسعار الحديد والأسمنت، مما يؤدي لنفاد السيولة أثناء التنفيذ.",
      methodology: [
        "تفكيك البند الهندسي إلى: كلفة المواد الأولية + أجور العمالة المباشرة + كلفة تشغيل المعدات + نسبة الهلك الحتمية.",
        "تحميل المصاريف غير المباشرة (Overheads) ونسب الطوارئ وتكلفة التمويل بدقة رياضية.",
        "حصر كميات حديد التسليح عبر برامج الـ BIM وجداول التفريد المعتمدة قبل التعاقد مع الموردين.",
        "صياغة شروط المواصفات القياسية وحالات تغير الأسعار في العقود لحماية المقاول والمالك.",
      ],
      metrics:
        "حماية هامش الربح المتوقع بنسبة 100% وتفادي فروقات التكلفة المفاجئة في بنود الهيكل والتشطيب.",
      ctaText: "طلب إعداد أو تدقيق جدول كميات (BOQ)",
      ctaAction: () =>
        window.open(
          engineeringConsultLink("إعداد وتدقيق جدول كميات BOQ للمشروع"),
          "_blank"
        ),
    },
    {
      id: "digital-surveying-boundaries",
      category: "engineering",
      categoryLabel: "هندسة ومقاولات ومساحة",
      categoryColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      title:
        "الرفع المساحي الرقمي وتثبيت حدود الأراضي: حماية الاستثمار العقاري",
      targetPersona: "لأصحاب الأراضي، المطورين العقاريين، والمكاتب الهندسية",
      readTime: "5 دقائق قراءة استشارية",
      summary:
        "خطوات الإسقاط الرقمي الدقيق بالإحداثيات العالمية وتجنب نزاعات الحدود والشوارع التوجيهية.",
      problem:
        "الاعتماد على القياسات التقليدية اليدوية يؤدي لأخطاء تداخل بين الجيران ومشاكل أثناء استخراج رخص البناء والفرز.",
      methodology: [
        "الرفع الحقلي بأجهزة المحطة الشاملة (Total Station) و GPS عالي الدقة بنظام الإحداثيات العالمي WGS84.",
        "مطابقة الحدود الطبيعية للأرض مع بصائر الملكية والمخططات التوجيهية المعتمدة رسمياً.",
        "تثبيت محاور وزوايا الأرض بنقاط خرسانية مرجعية موثقة بتقرير مساحي معتمد.",
        "إعداد مخططات الفرز العقاري وإسقاط الشوارع والمناسيب بدقة المليمتر.",
      ],
      metrics:
        "ضمان سلامة الموقف القانوني والفني للأرض بنسبة 100% وسرعة استخراج التراخيص دون تعديل.",
      ctaText: "حجز فريق مساحي متخصص لموقعك",
      ctaAction: () =>
        window.open(
          engineeringConsultLink("طلب رفع مساحي وتثبيت حدود قطعة أرض"),
          "_blank"
        ),
    },
    {
      id: "erp-custom-vs-ready",
      category: "tech",
      categoryLabel: "أنظمة ERP والتحول الرقمي",
      categoryColor: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      title: "متى يكفيك نظام ERP قياسي، ومتى تحتاج إلى نظام برمجي مخصص؟",
      targetPersona: "لأصحاب الشركات، مدراء تقنية المعلومات، ورواد الأعمال",
      readTime: "7 دقائق قراءة استشارية",
      summary:
        "معايير الاختيار التقني والمالي بين الأنظمة الجاهزة والتطوير البرمجي المخصص لتفادي دفع تكاليف غير مبررة.",
      problem:
        "شراء برمجيات معقدة بمبالغ ضخمة لا تناسب بيئة العمل، أو العكس: محاولة تطويع برنامج محاسبي بسيط لإدارة منظومة معقدة.",
      methodology: [
        "تحليل الفجوة الإجرائية (Process Gap Analysis) بين نموذج عمل شركتك والأنظمة المتاحة.",
        "تقييم مرونة قاعدة البيانات وقابلية التوسع (Scalability) وربط الفروع عن بُعد.",
        "معايير الربط عبر واجهات الـ API مع أنظمة نقاط البيع، الدفع الإلكتروني، والشحن.",
        "دراسة كلفة الامتلاك الكلية (TCO): كلفة الترخيص + التدريب + الصيانة + الاستضافة.",
      ],
      metrics:
        "توفير ما يصل إلى 60% من ميزانية التحول الرقمي باختيار المنظومة الملائمة لاحتياجك الفعلي.",
      ctaText: "طلب استشارة تقييم احتياج برمجي ونظام ERP",
      ctaAction: () =>
        window.open(
          whatsappLink(
            "السلام عليكم، أود استشارة حول اختيار النظام البرمجي ونظام Uamex_erp الأنسب لنشاطنا."
          ),
          "_blank"
        ),
    },
    {
      id: "academic-research-methodology",
      category: "research",
      categoryLabel: "دراسات وبحوث وتصاميم",
      categoryColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      title: "منهجية إعداد البحوث العلمية والتحليل الإحصائي القياسي للباحثين",
      targetPersona:
        "لطلاب الدراسات العليا، الباحثين الأكاديميين، والمراكز الاستشارية",
      readTime: "5 دقائق قراءة استشارية",
      summary:
        "معايير إعداد خطط البحث (Research Proposal)، التحليل الإحصائي بالـ SPSS، وضمان الأصالة والتوثيق المعتمد.",
      problem:
        "ضعف الترابط المنهجي بين مشكلة البحث والفرضيات، وأخطاء التحليل الإحصائي للبيانات التي ترفضها لجان التحكيم.",
      methodology: [
        "صياغة المشكلة وتحديد الفرضيات العلمية والمتغيرات التابعة والمستقلة بدقة.",
        "تصميم أدوات جمع البيانات (الاستبيانات والمقابلات) واختبار الصدق والثبات (Cronbach Alpha).",
        "تطبيق النماذج الإحصائية المتقدمة (الانحدار المتعدد، اختبارات T و ANOVA).",
        "التوثيق المرجعي وفق الدليل العالمي القياسي (APA / Harvard) ومراجعة خلو العمل من الانتحال.",
      ],
      metrics:
        "قبول علمي محكّم وتوافق كامل مع المعايير الأكاديمية الصارمة للجامعات والمجلات المصنفة.",
      ctaText: "طلب استشارة ومساعدة في التحليل الإحصائي أو البحث",
      ctaAction: () =>
        window.open(
          whatsappLink(
            "السلام عليكم، أحتاج مساعدة واستشارة في إعداد بحث / تحليل إحصائي."
          ),
          "_blank"
        ),
    },
    {
      id: "student-services-technical-prep",
      category: "research",
      categoryLabel: "خدمات مكتبية وأكاديمية",
      categoryColor: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      title:
        "دليل التجهيز الأكاديمي والتصاميم الطلابية وصيانة الأجهزة في مكتبة الحسينية الحديثة",
      targetPersona: "لطلاب الجامعات، الدراسات العليا، وأصحاب المكاتب والشركات",
      readTime: "4 دقائق قراءة استشارية",
      summary:
        "خدمات متكاملة تشمل الإخراج الفني للبحوث، صيانة وتجهيز الحواسب واللابتوبات، والطباعة الرقمية والحرارية الفاخرة.",
      problem:
        "تعطل الأجهزة المفاجئ أثناء إعداد الأبحاث والرسائل، والطباعة الرديئة أو الإخراج الفني غير الاحترافي الذي يقلل من قيمة العمل الأكاديمي.",
      methodology: [
        "فحص وصيانة أجهزة اللابتوب والكمبيوتر المكتبي وتثبيت البرمجيات الهندسية والأكاديمية المعتمده.",
        "التنسيق الطباعي الفاخر مع التجليد الحراري والحلزوني والطباعة الملونة عالية الدقة.",
        "تصميم العروض التقديمية التفاعلية (PowerPoint / Canva) والبوسترات المشاركة في المؤتمرات العلمية.",
        "تحويل المستندات الورقية إلى أرشيف رقمي منظم بجودة عالية (PDF Searchable).",
      ],
      metrics:
        "تسليم عاجل ودقيق مع ضمان كفاءة الأجهزة 100% وإخراج أكاديمي يليق بالباحث والجامعة.",
      ctaText: "تواصل مع مكتبة الحسينية الحديثة فوراً",
      ctaAction: () =>
        window.open(
          whatsappLink(
            "السلام عليكم مكتبة الحسينية الحديثة، أود الاستفسار وطلب خدمة طلابية/أكاديمية/صيانة."
          ),
          "_blank"
        ),
    },
    {
      id: "ifrs-sme-recognition",
      category: "corporate",
      categoryLabel: "استشارات مؤسسية وحوكمة",
      categoryColor: "bg-brand/10 text-brand border-brand/20",
      title:
        "الدليل المعياري لتطبيق IFRS للمؤسسات الصغيرة والمتوسطة في السجلات اليومية",
      targetPersona: "لأصحاب المؤسسات الصغيرة والمتوسطة والمحاسبين العمليين",
      readTime: "9 دقائق قراءة معيارية",
      summary:
        "تبسيط عملي لمتطلبات الاعتراف والقياس والإفصاح وفق معيار IFRS for SMEs الصادر عن مجلس معايير المحاسبة الدولية (IASB).",
      problem:
        "خلطٌ بين الأسس الضريبية والأسس المحاسبية، وسياسات محاسبية تتغير من سنة لأخرى — فتفقد القوائم المالية قابلية المقارنة ومصداقيتها أمام البنوك والممولين.",
      methodology: [
        "تحديد أهلية المؤسسة لمعيار IFRS للمؤسسات الصغيرة والمتوسطة (غير المُدرجة، لا التزام عام مسؤول).",
        "اعتماد سياسات الاعتراف والقياس الموثقة (التكلفة التاريخية مقابل القيمة العادلة) وثباتها بين الفترات المالية.",
        "بناء دليل حسابات مطابق لهيكل القوائم المعياري: المركز المالي، الدخل الشامل، والتدفقات النقدية.",
        "تطبيق متطلبات الإفصاح بالحد الأدنى مع جدول تسويات إقفال السنة وفق الأقسام 1–35 من المعيار.",
      ],
      metrics:
        "قوائم مالية قابلة للتدقيق الخارجي ومقبولة لدى البنوك والممولين دون تسويات استثنائية أو إعادة صياغة سنوية.",
      ctaText: "طلب جلسة مواءمة سجلاتكم مع IFRS للمؤسسات الصغيرة والمتوسطة",
      ctaAction: () =>
        window.open(
          whatsappLink(
            "السلام عليكم، أود حجز جلسة استشارية لمواءمة سجلاتنا المحاسبية مع معيار IFRS للمؤسسات الصغيرة والمتوسطة."
          ),
          "_blank"
        ),
    },
    {
      id: "iso27001-readiness",
      category: "tech",
      categoryLabel: "أنظمة ERP والتحول الرقمي",
      categoryColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      title: "قائمة الفحص التنفيذية لجاهزية أمن المعلومات وفق ISO/IEC 27001",
      targetPersona:
        "لمدراء العمليات ومسؤولي التقنية في المؤسسات الناشئة والصغيرة",
      readTime: "7 دقائق قراءة معيارية",
      summary:
        "خارطة طريق عملية لضوابط الملحق A (Annex A Controls) مصغّرة بذكاء لتناسب حجم المؤسسات الصغيرة والمتوسطة ومواردها.",
      problem:
        "وعود أمن عامة بلا توثيق، وغياب جرد للأصول والصلاحيات يجعل أي حادثة أمنية غير قابلة للتحقيق أو الاحتواء أو التعويض.",
      methodology: [
        "تحديد نطاق نظام إدارة أمن المعلومات (ISMS Scope) وجرد الأصول المعلوماتية وتعيين مالكٍ لكل أصل.",
        "تقييم المخاطر بمنهجية موثقة (الاحتمال × الأثر) ومعالجتها عبر ضوابط الملحق A المناسبة للحجم الفعلي.",
        "فرض ضوابط الوصول: مبدأ الحد الأدنى للصلاحيات، المصادقة متعددة العوامل، وسجل دخول كامل قابل للمراجعة.",
        "اختبار الاستعادة فعلياً من نسخة احتياطية مشفّرة وتوثيق النتيجة — كل ربع سنة دون استثناء.",
      ],
      metrics:
        "جاهزية تدقيق موثقة وخطة معالجة مخاطر معتمدة — أمانٌ يُثبت بالأدلة لا بشعارات الموقع الإلكتروني.",
      ctaText: "طلب تقييم جاهزية ISO 27001 لمؤسستكم",
      ctaAction: () =>
        window.open(
          whatsappLink(
            "السلام عليكم، أود طلب تقييم جاهزية أمن المعلومات وفق ISO/IEC 27001 لمؤسستنا."
          ),
          "_blank"
        ),
    },
  ];

  const filteredGuides = guides.filter(g => {
    const matchesCategory =
      selectedCategory === "all" || g.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.targetPersona.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
            مركز المعرفة والأدلة الاستشارية
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-balance">
            منهجيات ومعايير حقيقية
            <span className="block gradient-text-white">
              {" "}
              لا تنظير ولا مبالغة
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base text-white/65 leading-relaxed font-light">
            أدلة تشغيلية، دراسات حالة ميدانية، ومعايير حسابية وهندسية موجهة
            لمدراء الشركات، المقاولين، وأصحاب المشاريع والباحثين.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="relative">
              <Search className="w-5 h-5 text-white/40 absolute right-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث في الأدلة: BOQ، مشتريات، مساحة، ERP، بحوث..."
                className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-brand-300 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter Tabs ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pt-12 pb-6">
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border pb-6">
          {[
            { id: "all", label: "كافة الأدلة والمعارف", icon: BookOpen },
            {
              id: "corporate",
              label: "استشارات مؤسسية وحوكمة",
              icon: Building2,
            },
            {
              id: "engineering",
              label: "هندسة ومقاولات ومساحة",
              icon: HardHat,
            },
            { id: "tech", label: "أنظمة ERP والتحول الرقمي", icon: Cpu },
            { id: "research", label: "دراسات وبحوث وتصاميم", icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedCategory(id)}
              className={
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all " +
                (selectedCategory === id
                  ? "bg-brand text-ink-deep shadow-md scale-105"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border hover:bg-card/80")
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Guides List ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="space-y-8">
          {filteredGuides.map(guide => (
            <Card
              key={guide.id}
              className="rounded-3xl border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <Badge
                  variant="outline"
                  className={
                    "text-xs font-bold px-3 py-1 rounded-lg " +
                    guide.categoryColor
                  }
                >
                  {guide.categoryLabel}
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {guide.readTime}
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-foreground mb-2 leading-snug">
                {guide.title}
              </h2>
              <p className="text-xs text-brand font-bold mb-4">
                🎯 الفئة المستهدفة: {guide.targetPersona}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {guide.summary}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-muted/40 p-5 rounded-2xl border border-border/50 mb-6">
                <div>
                  <h4 className="text-xs font-black text-rose-500 flex items-center gap-1.5 mb-2">
                    <span>⚠️</span> المشكلة الشائعة في الواقع الميداني:
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {guide.problem}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-600 flex items-center gap-1.5 mb-2">
                    <span>💡</span> المنهجية التطبيقية والمعيار المعتمد:
                  </h4>
                  <ul className="space-y-1.5">
                    {guide.methodology.map((step, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
                <div className="text-xs text-foreground font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand" />
                  <span>الأثر المتوقع: </span>
                  <span className="text-muted-foreground font-normal">
                    {guide.metrics}
                  </span>
                </div>
                <Button
                  onClick={guide.ctaAction}
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-10 px-5 rounded-xl gap-2 transition-all hover:scale-105"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {guide.ctaText}
                </Button>
              </div>
            </Card>
          ))}

          {filteredGuides.length === 0 && (
            <div className="text-center py-16 surface rounded-3xl">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-foreground mb-1">
                لم يتم العثور على أدلة مطابقة
              </h3>
              <p className="text-xs text-muted-foreground">
                جرّب تغيير كلمات البحث أو اختيار تبويب آخر.
              </p>
            </div>
          )}
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-16 rounded-3xl bg-ink text-white p-8 sm:p-12 relative overflow-hidden text-center">
          <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black text-balance">
              هل تواجه تحدياً خاصاً في مؤسستك أو مشروعك؟
            </h3>
            <p className="text-sm text-white/60 leading-relaxed font-light">
              فريقنا الهندسي والاستشاري مستعد لدراسة واقع عملك وتقديم حل مخصص
              مبني على معايير دقيقة.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <a
                href={whatsappLink(
                  "السلام عليكم مؤسسة الحسينية، أود حجز جلسة استشارة متخصصة لمشروعي."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
              >
                <MessageSquare className="w-4 h-4" />
                تواصل مع مستشار متخصص الآن
              </a>
              <a
                href={"tel:" + brand.contact.phone.replace(/\s/g, "")}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105"
              >
                <Phone className="w-4 h-4 text-brand-300" />
                اتصال مباشر: {brand.contact.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
