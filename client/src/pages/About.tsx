import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { OperationExplainer } from "@/components/OperationExplainer";
import { ServiceCard } from "@/components/ServiceCard";
import {
  Building2,
  BookOpen,
  Compass,
  Cpu,
  Layers,
  ShieldCheck,
  Wrench,
  Smartphone,
  FileText,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Send,
  ShoppingCart,
  ArrowRight,
  Award,
  Users,
  Check,
  MessageSquare,
  Clock,
  HelpCircle,
  FileCheck,
  Search,
  Laptop,
  Monitor,
  HardHat,
  Map,
  Ruler,
  Calculator,
  Truck,
  FileSpreadsheet,
  Scale,
  Home as HomeIcon,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { brand, whatsappLink } from "@/lib/brand";
import { HeroBackground } from "@/components/ModernBackground";
import { Globe, TrendingUp, BarChart3 } from "lucide-react";

export default function About() {
  const [, setLocation] = useLocation();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedService, setSelectedService] =
    useState<string>("استشارة هندسية");

  // Vision, Mission & Values
  const vision =
    "أن تكون الحسينية جهة يعتمد عليها الأفراد والمنشآت للحصول على خدمات مهنية واضحة ومناسبة لاحتياجهم.";
  const mission =
    "فهم متطلبات العميل، وتحديد نطاق الخدمة ومخرجاتها بوضوح، وتقديم الخبرة المهنية والحلول الرقمية الملائمة.";
  const values = [
    {
      ar: "التميز",
      en: "Excellence",
      desc: "نحرص على أعلى معايير الجودة في كل خدمة، ونؤمن بأن التفاصيل الصغيرة تصنع الفارق الكبير.",
    },
    {
      ar: "الموثوقية",
      en: "Reliability",
      desc: "التزامنا التام بوعدنا، وشفافيتنا في التعاملات، وثقتنا في قدراتنا التقنية والمهنية.",
    },
    {
      ar: "الابتكار",
      en: "Innovation",
      desc: "نتبنى أحدث التقنيات وأساليب العمل الحديثة، ونسعى دائماً لتجاوز توقعات عملائنا بحلول إبداعية.",
    },
    {
      ar: "الشراكة",
      en: "Partnership",
      desc: "نعمل جنبًا إلى جنب مع عملائنا كنصيرين حقيقيين، نضع مصلحة مشروعهم نصب أعيننا في كل خطوة.",
    },
  ];

  // Request Form States
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Contractor & Landowner Engineering Configurator States
  const [engProjectType, setEngProjectType] = useState<string>(
    "أرض خاوية / مخطط سكني"
  );
  const [engArea, setEngArea] = useState<string>("500");
  const [engSelectedServices, setEngSelectedServices] = useState<string[]>([
    "الرفع المساحي وتثبيت الحدود",
    "المخططات المعمارية والإنشائية",
    "جدول الكميات والحصر (BOQ)",
  ]);

  const toggleEngService = (serviceName: string) => {
    setEngSelectedServices(prev =>
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  // Expert Engineering Services Suite (Contractors, Landowners, Real Estate Developers)
  const expertEngineeringServices = [
    {
      id: "blueprints",
      title: "التصاميم والمخططات التنفيذية (BIM & Shop Drawings)",
      icon: Ruler,
      color: "from-blue-700 to-ink",
      badge: "للمقاولين وأصحاب الأراضي",
      description:
        "إعداد التصاميم المعمارية والإنشائية والكهروميكانيكية 2D/3D ونمذجة (BIM) شديدة الواقعية.",
      features: [
        "خرائط معمارية وإعادة توزيع المساحات والاستخدام الأمثل",
        "مخططات إنشائية زلزلية ومطابقة للكود الإنشائي المعتمد",
        "مخططات الكهروميكانيك MEP (كهرباء، سباكة، تكييف، وحريق)",
        "المخططات التنفيذية للمقاولين (Shop Drawings) ومخططات (As-Built Drawings)",
        "كشف التعارضات والتنسيق التخصصي (BIM Clash Detection)",
      ],
    },
    {
      id: "surveying",
      title: "المساحة الرقمية وتثبيت الحدود والأراضي",
      icon: Map,
      color: "from-brand to-amber-900",
      badge: "لأصحاب الأراضي والمقاولين",
      description:
        "الرفع المساحي الرقمي ألترا دقيق بـ GPS و Total Station وإسقاط الأنساب وتثبيت الحدود.",
      features: [
        "رفع مساحي رقمي دقيق بأحدث أجهزة GPS و Total Station ودرون",
        "إسقاط وتحديد حدود الأراضي، وتثبيت الزوايا والمحاور بحضور المساح",
        "مخططات الفرز والتجميع والتقسيم العقاري وتوثيق المساحات بالمليمتر",
        "إصدار المخططات التوجيهية وتراخيص البناء والاعتمادات الرسمية",
      ],
    },
    {
      id: "boq",
      title: "حساب الكميات وجداول BOQ والمواصفات",
      icon: Calculator,
      color: "from-emerald-700 to-ink",
      badge: "للمقاولين والمستثمرين",
      description:
        "حصر كلي دقيق للحديد، الخرسانات، التشطيبات، وإعداد جداول الكميات وتكلفة المشروع.",
      features: [
        "إعداد جداول الكميات التفصيلية (BOQ) وحصر المواد بدقة متناهية",
        "حساب أوزان حديد التسليح وحجم الخرسانات المسلحة والعادية",
        "إعداد كراسات الشروط والمواصفات القياسية للمناقصات والمشاريع",
        "مراجعة وتدقيق مستخلصات المقاولين والموردين المالية والفنية",
      ],
    },
    {
      id: "cut-fill",
      title: "حساب كميات الحفر والردم وتسوية المواقع",
      icon: Truck,
      color: "from-amber-700 to-orange-900",
      badge: "للمقاولين والمخططات",
      description:
        "حساب دقيق لحجوم القطع والردم (Cut & Fill) وتسوية الأراضي الجبلية والمواقع المعقدة.",
      features: [
        "الرفع الطبوغرافي الرقمي ثلاثي الأبعاد ودراسة طبوغرافية الأرض",
        "حساب حجم الحفر والردم بالتفصيل لتقليل التكاليف التشغيلية",
        "تخطيط شبكات الطرق الداخلية وتسوية المنسوب العام للمخططات",
        "تقارير دراسة التربة ومجاري السيول والتسوية الهندسية",
      ],
    },
    {
      id: "supervision",
      title: "الإشراف الهندسي المقيم وفحص الصبات",
      icon: HardHat,
      color: "from-slate-800 to-slate-950",
      badge: "للمقاولين والملاك",
      description:
        "إشراف هندسي ميداني مقيم وزيارات دورية لضمان مطابقة التنفيذ والجودة والسلامة.",
      features: [
        "الإشراف الميداني على صب الخرسانات وفحص حديد التسليح",
        "استلام المراحل الإنشائية خطوة بخطوة وإصدار شهادات الاستلام",
        "فحص وتدقيق السلامة الإنشائية للمباني القائمة وحساب الأحمال",
        "اعتماد عينات المواد وضبط الجودة الإنشائية والمعمارية",
      ],
    },
    {
      id: "realestate",
      title: "استشارات التطوير العقاري والتقييم والتثمين",
      icon: Scale,
      color: "from-purple-800 to-indigo-950",
      badge: "للمستثمرين والملاك",
      description:
        "دراسات الجدوى الاقتصادية والهندسية، والتقييم والتثمين العقاري المعتمد للأراضي والمباني.",
      features: [
        "دراسات الجدوى الهندسية والاستثمارية للمشاريع والمجمعات",
        "التقييم والتثمين العقاري المعتمد للأراضي والمباني والمنشآت",
        "تحليل أعلى وأفضل استخدام للأرض (Highest and Best Use - HBU)",
        "تسويق واستثمار الأراضي وتطوير المخططات العمرانية",
      ],
    },
  ];

  // Additional Business Consulting Services
  const generalBusinessServices = [
    {
      id: "technical",
      title: "الاستشارات التقنية والأنظمة",
      icon: Cpu,
      color: "from-emerald-600 to-teal-700",
      badge: "مؤسسة الحسينية",
      description:
        "حلول التحول الرقمي وتطوير وإدارة الأنظمة البرمجية والمحاسبية والمؤسسية (ERP).",
      features: [
        "تخصيص وتكامل الأنظمة المحاسبية والإدارية",
        "أتمتة بيئات العمل والتحول الرقمي المباشر",
        "تقديم استشارات البنية التحتية والشبكات",
        "حلول حماية البيانات والأمن السيبراني المؤسسي",
      ],
    },
    {
      id: "administrative",
      title: "الاستشارات المؤسسية والإدارية",
      icon: Layers,
      color: "from-brand to-amber-700",
      badge: "مؤسسة الحسينية",
      description:
        "صياغة الهياكل التنظيمية ودلائل الإجراءات والحوكمة وتطوير كفاءة المؤسسات.",
      features: [
        "تصميم الهياكل التنظيمية وبناء الوصف الوظيفي",
        "إعداد أدلة الإجراءات والسياسات الإدارية المعتمدة",
        "تطوير مؤشرات الأداء الرئيسية (KPIs) وتقييم العمليات",
        "التخطيط الاستراتيجي وتدريب الكوادر القيادية",
      ],
    },
    {
      id: "financial",
      title: "الاستشارات والحلول المحاسبية",
      icon: ShieldCheck,
      color: "from-slate-700 to-slate-900",
      badge: "مؤسسة الحسينية",
      description:
        "إعداد ودعم الأنظمة المالية والمحاسبية وتدقيق الحسابات وإقفال الدورات المالية.",
      features: [
        "بناء وتصميم دليل الحسابات المعتمد وفق المعايير",
        "إعادة هيكلة الحسابات وإقفال القوائم المالية السنوية",
        "المراجعة والتدقيق المالي وإعداد الميزانيات التقديرية",
        "دعم واستشارات نظام الحسينية المحاسبي المتقدم",
      ],
    },
  ];

  // Library Services List
  const libraryServices = [
    {
      id: "student",
      title: "الخدمات الطلابية والمكتبية",
      icon: FileText,
      color: "from-sky-500 to-blue-700",
      badge: "مكتبة الحسينية الحديثة",
      description:
        "طباعة وتصوير عالي الدقة، تغليف حراري وحلزوني، وتنسيق الأبحاث ومشاريع التخرج.",
      features: [
        "طباعة ملونة وأسود لجميع الأحجام بالدقة الفائقة",
        "تغليف حراري وحلزوني وجلد لرسائل الماجستير والكتيبات",
        "تنسيق وطباعة مشاريع التخرج والأوراق العلمية",
        "مسح ضوئي (Scan) عالي الدقة وتوفير القرطاسية المتكاملة",
      ],
    },
    {
      id: "design",
      title: "التصاميم والطباعة الإبداعية",
      icon: Sparkles,
      color: "from-purple-600 to-brand",
      badge: "مكتبة الحسينية الحديثة",
      description:
        "ابتكار الهويات البصرية، الشعارات، البروشورات، العروض التقديمية والمواد التسويقية.",
      features: [
        "تصميم الشعارات والهويات البصرية الكاملة للشركات",
        "تصميم البروشورات، الفلاير، والبنرات الإعلانية",
        "إعداد العروض التقديمية الاحترافية (PowerPoint)",
        "تصميم وتجهيز بطاقات العمل (Kard) والمطبوعات",
      ],
    },
    {
      id: "research",
      title: "البحوث والدراسات الأكاديمية",
      icon: BookOpen,
      color: "from-amber-600 to-brand-700",
      badge: "مكتبة الحسينية الحديثة",
      description:
        "إعداد وتدقيق الأوراق العلمية والبحوث التخصصية والتحليل الإحصائي الأكاديمي.",
      features: [
        "المساعدة في إعداد وتهيئة خطط الأبحاث والأوراق الأكاديمية",
        "التحليل الإحصائي للبيانات باستخدام (SPSS & Excel)",
        "التدقيق اللغوي والنحوي وإعادة الصياغة الأكاديمية",
        "توثيق المراجع والفرس وفق النظام العالمي (APA/IEEE)",
      ],
    },
    {
      id: "maintenance",
      title: "صيانة الموبايل والكمبيوتر",
      icon: Wrench,
      color: "from-rose-600 to-red-800",
      badge: "مكتبة الحسينية الحديثة",
      description:
        "صيانة شاملة للأجهزة الذكية، اللاب توب، أجهزة الكمبيوتر، حل البرمجيات والعتاد.",
      features: [
        "صيانة شاشات وبطاريات وأجهزة الموبايل (iPhone & Android)",
        "حل مشاكل السوفتوير، التحديثات، وفك الحظر والترقية",
        "صيانة أجهزة الحاسوب واللاب توب (Hardware & Motherboard)",
        "تثبيت وتنسيق الويندوز، تسريع الأجهزة وإزالة الفيروسات",
      ],
    },
  ];

  const handleOpenRequestModal = (serviceName: string) => {
    setSelectedService(serviceName);
    setRequestDialogOpen(true);
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) {
      toast.error("الرجاء إدخال اسم العميل ورقم الهاتف / الواتساب");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const refCode = `HSN-${dateStr}-${randNum}`;
      setSubmittedRef(refCode);
      setIsSubmitting(false);
      toast.success("تم تسجيل طلبك بنجاح! يسعدنا تواصلكم.");
    }, 800);
  };

  const handleOpenWhatsApp = () => {
    const text = `السلام عليكم مؤسسة الحسينية ومكتبة الحسينية الحديثة،\nأود طلب خدمة / استشارة:\n- الخدمة: ${selectedService}\n- الاسم: ${clientName || "عميل"}\n- الهاتف: ${clientPhone}\n- التفاصيل: ${notes || "لا يوجد"}\n- كود الطلب: ${submittedRef || "جديد"}`;
    window.open(whatsappLink(text), "_blank");
  };

  const handleSendEngConfiguratorQuote = () => {
    if (!clientPhone.trim()) {
      toast.error("يرجى إدخال رقم هاتفك لتزويدك بالتسعيرة الرسمية");
      return;
    }
    const msg = `السلام عليكم قسم الاستشارات الهندسية - مؤسسة الحسينية،\nأود طلب عرض سعر رسمي للمشروع الهندسي:\n- نوع المشروع: ${engProjectType}\n- المساحة التقديرية: ${engArea} م²\n- الخدمات المطلوبة:\n  * ${engSelectedServices.join("\n  * ")}\n- الاسم/الجهة: ${clientName || "مالك/مقاول"}\n- الهاتف: ${clientPhone}`;
    window.open(whatsappLink(msg, brand.contact.whatsapp2), "_blank");
  };

  return (
    <div className="min-h-screen bg-sand text-ink pb-20 font-sans" dir="rtl">
      {/* Header Navbar */}
      {/* Hero Banner — Modern animated background */}
      <section className="relative text-white py-16 px-4 overflow-hidden border-b border-ink-600">
        <HeroBackground />

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 bg-ink-600 border border-brand/40 text-brand-300 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow">
            <HardHat className="w-3.5 h-3.5 text-brand" />
            خدمات أعمال واستشارات وهندسة وخدمات معرفية
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-display tracking-tight leading-tight">
            الحسينية لخدمات الأعمال <br className="hidden sm:inline" />
            <span className="text-brand-300">خبرة مهنية وحلول عملية</span>
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-base text-slate-300 leading-relaxed font-light">
            {brand.promise}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              onClick={() =>
                handleOpenRequestModal(
                  "استشارة هندسية / مشروع للمقاولين والأراضي"
                )
              }
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs sm:text-sm h-11 px-6 shadow-lg rounded-xl flex items-center gap-2"
            >
              <HardHat className="w-4 h-4" />
              اطلب استشارة هندسية
            </Button>

            <Button
              onClick={() =>
                document
                  .getElementById("business-services")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              variant="outline"
              className="border-ink-500 bg-ink-600 text-white hover:bg-ink-500 text-xs sm:text-sm h-11 px-5 rounded-xl flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-brand-300" />
              استكشف خدماتنا
            </Button>

            <Button
              onClick={() =>
                document
                  .getElementById("how-it-operates")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              variant="outline"
              className="border-brand/40 bg-brand/10 text-brand-200 hover:bg-brand/20 text-xs sm:text-sm h-11 px-5 rounded-xl flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              شاهد كيف يعمل النظام
            </Button>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-10 text-right">
            {brand.stats.map((stat, i) => (
              <div
                key={i}
                className="bg-ink-800/80 border border-ink-600 p-3.5 rounded-xl text-center"
              >
                <div className="text-xl font-bold text-brand-300 font-mono">
                  {stat.value}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── رسالة الشركة القوية + الرؤية والرسالة ── */}
      <section className="bg-white border-y border-slate-200 py-10 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Company identity and service scope; product branding appears on product surfaces. */}
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Badge className="bg-slate-900 text-white font-black text-xs px-3 py-1">
              من نحن — الحسينية لخدمات الأعمال
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-ink leading-tight">
              خبرة عملية تبدأ من فهم احتياجك
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              تقدم الحسينية لخدمات الأعمال استشارات وخدمات هندسية ومعرفية، إلى
              جانب حلول رقمية مستقلة مثل Uamex ERP. لكل خدمة نطاق ومخرجات واضحة،
              ويُحدّد العمل مع العميل بحسب متطلباته.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-5 h-5 text-brand" />
                <h3 className="font-black text-ink">الرؤية</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {vision}
              </p>
            </div>
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-brand" />
                <h3 className="font-black text-ink">الرسالة</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {mission}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {values.map(v => (
              <div
                key={v.ar}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center"
              >
                <div className="text-[11px] font-black tracking-widest text-brand">
                  {v.en}
                </div>
                <div className="font-black text-ink mt-1">{v.ar}</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main
        id="business-services"
        className="max-w-7xl mx-auto px-4 py-12 space-y-16 scroll-mt-24"
      >
        {/* ─── SECTION 0: كيف يعمل النظام فعلياً (مكوّن تفاعلي — لا بطاقات تسويقية) ─── */}
        <section id="how-it-operates" className="scroll-mt-24 space-y-6">
          <div className="max-w-3xl space-y-3">
            <Badge className="bg-ink text-sand font-black text-xs px-3 py-1">
              بدون وعود —تشغيل موضّح
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-ink leading-tight">
              اختر عملية حقيقية وشاهد أثرها يُحسب live
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              لا نعرض شعارات ولا نسباً. اختر العملية التي تمارسها كل يوم، غيّر
              أرقامها، وستظهر لك الأثر المحاسبي والمخزني والتقاريري كما ينتجها
              النظام فعلياً — ثم المسار الذي تعبره العملية خطوة بخطوة.
            </p>
          </div>
          <OperationExplainer />
        </section>

        {/* ─── SECTION 1: جناح الخدمات الهندسية المتقدمة (للمقاولين وأصحاب الأراضي) ─── */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <Badge className="bg-brand text-ink-deep font-bold text-xs px-3 py-1 mb-2">
                القطاع الهندسي والتطوير العقاري
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink font-display flex items-center gap-2">
                <HardHat className="w-7 h-7 text-brand" />
                الخدمات الهندسية التخصصية للمقاولين وأصحاب الأراضي والعقارات
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                مخططات تنفيذي (Shop Drawings)، رفع مساحي رقمي بـ GPS ودرون،
                جداول كميات (BOQ)، حساب حفر وردم، وإشراف ميداني.
              </p>
            </div>

            <Button
              onClick={() => handleOpenRequestModal("استشارة هندسية تخصصية")}
              className="bg-ink hover:bg-ink-600 text-white text-xs h-9 font-medium px-4 rounded-lg flex items-center gap-1.5 shadow"
            >
              <MessageSquare className="w-3.5 h-3.5 text-brand-300" />
              طلب استشارة هندسية مخصصة
            </Button>
          </div>

          {/* Grid of Expert Engineering Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expertEngineeringServices.map((service, i) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={i}
                badgeClassName="border-brand/40 text-brand-700 bg-amber-50"
                footnote="اعتماد مهندسين استشاريين"
                onAction={() => handleOpenRequestModal(service.title)}
              />
            ))}
          </div>

          {/* ─── INTERACTIVE CONFIGURATOR: حاسبة ومستكشف الخدمات الهندسية للمقاولين والأراضي ─── */}
          <Card className="border-2 border-brand/30 bg-gradient-to-br from-ink to-ink-700 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-ink-600 pb-4 gap-4">
              <div>
                <Badge className="bg-brand text-ink-deep font-bold text-xs px-3 py-1 mb-2">
                  أداة خبير الهندسة للمقاولين والملاك
                </Badge>
                <h3 className="text-xl sm:text-2xl font-bold font-display text-white flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-brand-300" />
                  مستكشف وحاسبة طلبات الخدمات الهندسية للمشاريع والمخططات
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  حدد بيانات أرضك أو مشروعك المقاولاتي واحصل على تسعيرة وعرض
                  هندسي موثوق فوراً.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Col 1: Project Params */}
              <div className="space-y-4 bg-ink-800 p-4 rounded-2xl border border-ink-600">
                <h4 className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> 1. طبيعة المشروع والعرصة
                </h4>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    نوع المشروع / العقار
                  </Label>
                  <select
                    value={engProjectType}
                    onChange={e => setEngProjectType(e.target.value)}
                    className="w-full h-9 bg-ink border border-ink-500 text-white text-xs rounded-lg px-2"
                  >
                    <option value="أرض خاوية / مخطط سكني">
                      أرض خاوية / مخطط سكني أو تجاري
                    </option>
                    <option value="مشروع بناية / عمارة استثمارية">
                      مشروع بناية / عمارة استثمارية
                    </option>
                    <option value="مشروع مقاولات وتنفيذ خرسانات">
                      مشروع مقاولات وتنفيذ خرسانات
                    </option>
                    <option value="منزل / فيلا سكنية">
                      منزل / فيلا سكنية شخصية
                    </option>
                    <option value="عقار قائم للتثمين والتقييم">
                      عقار قائم للتثمين والتقييم العقاري
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    المساحة الإجمالية التقديرية ($m^2$)
                  </Label>
                  <Input
                    type="number"
                    value={engArea}
                    onChange={e => setEngArea(e.target.value)}
                    className="h-9 bg-ink border border-ink-500 text-white text-xs font-mono"
                    placeholder="مثال: 500"
                  />
                </div>
              </div>

              {/* Col 2: Required Engineering Services Checkbox Grid */}
              <div className="space-y-4 bg-ink-800 p-4 rounded-2xl border border-ink-600 md:col-span-2">
                <h4 className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" /> 2. حدد حزمة الخدمات
                  الهندسية المطلوبة للمشروع
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    "الرفع المساحي وتثبيت الحدود",
                    "المخططات المعمارية والإنشائية 2D/3D",
                    "مخططات التنفيذي Shop Drawings (للمقاولين)",
                    "جدول الكميات والحصر (BOQ)",
                    "حساب كميات الحفر والردم (Cut & Fill)",
                    "مخططات الكهروميكانيك MEP (كهرباء/سباكة/تكييف)",
                    "الإشراف الهندسي الميداني وفحص الصبات",
                    "دراسة التقييم والتثمين والجدوى العقارية",
                  ].map((srv, idx) => {
                    const isSelected = engSelectedServices.includes(srv);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleEngService(srv)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-brand/20 border-brand text-white font-bold"
                            : "bg-ink border-ink-500 text-slate-300 hover:border-brand/50"
                        }`}
                      >
                        <span>{srv}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isSelected
                              ? "bg-brand text-ink-deep"
                              : "border border-slate-500"
                          }`}
                        >
                          {isSelected && "✓"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-ink-600">
                  <div className="text-xs text-slate-300">
                    تم تحديد{" "}
                    <span className="text-brand-300 font-bold font-mono">
                      {engSelectedServices.length}
                    </span>{" "}
                    خدمات لمساحة{" "}
                    <span className="text-brand-300 font-bold font-mono">
                      {engArea || "0"} م²
                    </span>
                  </div>

                  <Button
                    onClick={handleSendEngConfiguratorQuote}
                    className="w-full sm:w-auto bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-9 px-5 rounded-xl shadow flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    طلب عرض سعر رسمي للمشروع الهندسي
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ─── SECTION 2: الاستشارات التقنية والمؤسسية والإدارية ─── */}
        <section className="space-y-8">
          <div className="border-b border-slate-200 pb-4">
            <Badge className="bg-ink text-brand-300 font-bold text-xs px-3 py-1 mb-2">
              استشارات الشركات والمؤسسات
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink font-display flex items-center gap-2">
              <Building2 className="w-7 h-7 text-ink" />
              الاستشارات التقنية والمؤسسية والإدارية والمالية
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              أتمتة الشركات، بناء الهياكل التنظيمية، الدلائل المحاسبية، وتأهيل
              المؤسسات للنمو والاستقرار.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {generalBusinessServices.map((service, i) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={i}
                badgeClassName="border-slate-300 text-slate-700 bg-white"
                actionClassName="bg-ink hover:bg-ink-600 text-white font-bold"
                onAction={() => handleOpenRequestModal(service.title)}
              />
            ))}
          </div>
        </section>

        {/* ─── SECTION 3: مكتبة الحسينية الحديثة ─── */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-slate-200 pb-4 gap-4">
            <div>
              <Badge className="bg-sky-700 text-white font-bold text-xs px-3 py-1 mb-2">
                قطاع الطلاب والبحوث والتقنية
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink font-display flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-sky-700" />
                مكتبة الحسينية الحديثة
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                الخدمات الطلابية والمكتبية، التصاميم الإبداعية، البحوث والدراسات
                الأكاديمية، وصيانة الموبايل والكمبيوتر.
              </p>
            </div>

            <Button
              onClick={() => setLocation("/app")}
              variant="outline"
              className="border-sky-700 text-sky-800 hover:bg-sky-50 text-xs h-9 font-medium px-4 rounded-lg flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              تصفح متجر الخدمات والمنتجات
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {libraryServices.map((service, i) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={i}
                badgeClassName="border-sky-300 text-sky-800 bg-sky-50"
                checkClassName="text-sky-600"
                titleClassName="text-lg"
                footnote="تنفيذ سريع وموثوق"
                actionClassName="bg-sky-700 hover:bg-sky-800 text-white font-bold"
                onAction={() => handleOpenRequestModal(service.title)}
              />
            ))}
          </div>
        </section>

        {/* ─── SECTION 4: أسئلة شائعة للمقاولين والملاك (FAQ) ─── */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-ink flex items-center justify-center gap-2">
              <HelpCircle className="w-6 h-6 text-brand" />
              الأسئلة الشائعة للمقاولين وأصحاب الأراضي والخدمات
            </h2>
            <p className="text-xs text-slate-600">
              إجابات الخبراء حول المخططات، الرفع المساحي، والخدمات المعتمدة
            </p>
          </div>

          <Card className="border border-slate-200 p-4 bg-white max-w-3xl mx-auto shadow-sm">
            <Accordion type="single" collapsible className="w-full text-xs">
              <AccordionItem value="item-1">
                <AccordionTrigger className="font-bold text-slate-900 text-xs sm:text-sm">
                  كيف يتم الرفع المساحي وتثبيت حدود الأراضي بحضور المساح؟
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-xs leading-relaxed">
                  يقوم المساح المعتمد بالنزول الميداني بأحدث أجهزة الـ GPS والـ
                  Total Station، ويتم مطابقة الكروكي والوثائق الرسمية وتحديد
                  الأنساب وتثبيت الزوايا بدقة متناهية وإصدار تقرير مساحي رقمي
                  معتمد.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="font-bold text-slate-900 text-xs sm:text-sm">
                  ما الفرق بين المخططات المعمارية ومخططات التنفيذي (Shop
                  Drawings) للمقاولين؟
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-xs leading-relaxed">
                  المخططات المعمارية تضع الرؤية والتوزيع العام، بينما مخططات
                  التنفيذي (Shop Drawings) هي الخرائط التفصيلية الدقيقة التي
                  يحتاجها المقاول في الموقع لتنفيذ تفريد حديد التسليح، الوصلات،
                  والتأسيسات بدون أي خطأ أو هدر في المواد.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="font-bold text-slate-900 text-xs sm:text-sm">
                  كيف تساعد جداول الكميات (BOQ) وحساب الحفر والردم في ضبط
                  ميزانية المقاول والمالك؟
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-xs leading-relaxed">
                  تمنع جداول الـ BOQ أي تلاعب أو تقدير عشوائي للتكاليف، حيث تضمن
                  حصر دقيق بالطن والمتر المكعب لحديد التسليح والخرسانات، وحساب
                  حجوم القطع والردم (Cut & Fill) لتجنب دفع تكاليف نقل زائدة.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="font-bold text-slate-900 text-xs sm:text-sm">
                  هل تقوم مكتبة الحسينية بالتحليل الإحصائي وتنسيق رسائل
                  الماجستير والصيانة؟
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-xs leading-relaxed">
                  نعم، لدينا متخصصون أكاديميون في تنسيق الرسائل العلمية وتطبيق
                  معايير الجامعة، بالإضافة للتحليل الإحصائي عبر برنامج SPSS و
                  Excel وصيانة أجهزة الموبايل والكمبيوتر عتاداً وسوفتوير.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </section>

        {/* ─── SECTION 5: معلومات الاتصال والمقر ─── */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4 text-right">
            <Badge className="bg-brand text-ink-deep font-bold text-xs px-3 py-1">
              تواصل معنا المباشر
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
              يسعدنا تشريفكم المقر الرئيسي أو التواصل الهاتفي
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              فريق المهندسين والمستشارين والفنيين في مؤسسة ومكتبة الحسينية
              بانتظاركم لإنجاز مشاريعكم الهندسية والعقارية والمكتبية.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-amber-50 rounded-lg text-brand">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900">
                    العنوان والمقر:
                  </span>
                  <span>
                    المركز الرئيسي — اليمن، ذمار، شارع المدينة الرياضية
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-amber-50 rounded-lg text-brand">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900">
                    رقم الهاتف والواتساب:
                  </span>
                  <span className="font-mono text-xs">
                    {brand.contact.phone} / {brand.contact.phone2}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-amber-50 rounded-lg text-brand">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900">
                    البريد الإلكتروني الرسمي:
                  </span>
                  <span className="font-mono text-xs">
                    {brand.contact.engineeringEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ink text-white p-6 rounded-2xl space-y-4 text-center border border-ink-600">
            <HardHat className="w-10 h-10 mx-auto text-brand-300" />
            <h3 className="text-base font-bold font-display">
              هل لديك مشروع مقاولات أو مخطط أرض؟
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              تواصل مباشرة مع الاستشاري الهندسي لإعداد دراسة ومخطط وجدول كميات
              مخصص لمشروعك.
            </p>
            <Button
              onClick={() =>
                handleOpenRequestModal("طلب دراسة ومخطط هندسي للمقاولين")
              }
              className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-10 rounded-xl"
            >
              طلب تسعيرة ودراسة هندسية الآن
            </Button>
          </div>
        </section>
      </main>

      {/* Interactive Service Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-lg font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Send className="w-4 h-4 text-brand" />
              طلب خدمة / استشارة — {selectedService}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              أدخل بياناتك وسيتم التواصل معك مباشرة لتلبية طلبك بأفضل جودة.
            </DialogDescription>
          </DialogHeader>

          {submittedRef ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  تم إرسال الطلب بنجاح!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  رقم مرجع الطلب الخاص بك:
                </p>
                <div className="inline-block bg-slate-100 text-brand font-mono font-bold text-sm px-3 py-1 rounded border border-slate-200 mt-2">
                  {submittedRef}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                يمكنك الضغط على الزر أدناه لمتابعة الطلب فوراً عبر واتساب
                المؤسسة.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  onClick={handleOpenWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 font-bold rounded-lg flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  متابعة عبر الواتساب
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedRef(null);
                    setRequestDialogOpen(false);
                  }}
                  className="text-xs h-9 px-4"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendRequest} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  نوع الخدمة المطلوب:
                </Label>
                <input
                  type="text"
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    الاسم الكامل / الجهة *
                  </Label>
                  <Input
                    required
                    placeholder="مثال: المهندس / المالك محمد علي"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    رقم الهاتف / الواتساب *
                  </Label>
                  <Input
                    required
                    placeholder="770000000"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="h-8 text-xs bg-white font-mono text-left"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  البريد الإلكتروني (اختياري)
                </Label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="h-8 text-xs bg-white text-left font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">
                  تفاصيل وسياق الطلب / الملاحظات الهندسة
                </Label>
                <Textarea
                  rows={3}
                  placeholder="اكتب المساحة، الموقع، أو نوع المخطط والجدول المطلوب..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>

              <DialogFooter className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRequestDialogOpen(false)}
                  className="text-xs h-8"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="text-xs h-8 bg-brand hover:bg-brand-deep text-white font-bold"
                >
                  {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
    </div>
  );
}
