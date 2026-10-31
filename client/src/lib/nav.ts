import type { ComponentType } from "react";
import {
  ShoppingCart,
  BarChart3,
  Package,
  Boxes,
  Download,
  Globe2,
  Info,
  Search,
  Home as HomeIcon,
  LayoutDashboard,
  LayoutGrid,
  Gauge,
  Wallet,
  Users,
  Settings,
  CreditCard,
  Phone,
  Truck,
  FolderKanban,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  BookOpen,
  Scale,
  SlidersHorizontal,
  Building2,
  History,
  ClipboardList,
  Calculator,
  CalendarClock,
  Cpu,
  TrendingUp,
  TrendingDown,
  FileText,
  PackageCheck,
  Factory,
  Server,
} from "lucide-react";
import {
  HusHomeIcon,
  HusLayersIcon,
  HusPlatformIcon,
  HusCompassIcon,
  HusLinkIcon,
  HusShieldIcon,
  HusScaleIcon,
} from "@/components/icons/HusIcons";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
  /** سطر وصفي يظهر تحت العنصر في القوائم المنسدلة ودرج الجوال. */
  description?: string;
}

/**
 * ────────────────────────────────────────────────────────────────────────
 * Navigation Architecture (Global SaaS B2B Standard)
 * ────────────────────────────────────────────────────────────────────────
 *
 * Layer 1 — MARKETING_NAV: public site header (Hick's Law compliant).
 * Layer 2 — APP_NAV: sidebar navigation inside the authenticated app shell.
 * Layer 3 — UTILITY_LINKS: helper tools, surfaced contextually (footer,
 *           store page, settings) — never in the primary navigation.
 */

/** Public marketing site navigation — HusIcons الرسمية 100% Tajawal */
export const MARKETING_NAV: NavItem[] = [
  {
    path: "/",
    label: "الرئيسية",
    icon: HusHomeIcon,
    description: "نظرة شاملة — من القيد إلى القرار",
  },
  {
    path: "/#uamex",
    label: "المنصة الموحدة",
    icon: HusPlatformIcon,
    description: "Uamex_erp — كل حساباتك وفروعك في شاشة واحدة",
  },
  {
    path: "/#corporate",
    label: "الاستشارات المؤسسية",
    icon: HusLayersIcon,
    description: "نظام عمل واضح — من التشخيص إلى النتيجة",
  },
  {
    path: "/#engineering",
    label: "الهندسة والمساحة",
    icon: HusCompassIcon,
    description: "تقديرات هندسية موثقة يقبلها الممولون",
  },
  {
    path: "/#library",
    label: "الخدمات المعرفية",
    icon: HusPlatformIcon,
    description: "SPSS v28 + APA 7th — من البحث إلى النشر",
  },
  {
    path: "/pricing",
    label: "الأسعار",
    icon: HusScaleIcon,
    description: "باقات تنمو معك — 14 يوماً مجاناً بلا بطاقة",
  },
  {
    path: "/about",
    label: "من نحن",
    icon: HusLayersIcon,
    description: "قصة الحسينية ورسالتها وخدماتها المؤسسية",
  },
  {
    path: "/contact",
    label: "تواصل",
    icon: HusLinkIcon,
    description: "استشارة أولية مجانية خلال 24 ساعة",
  },
  // الأدوات — تُعرض في قائمة واحدة ذكية
  {
    path: "/tools",
    label: "حاسبات ذكية",
    icon: HusScaleIcon,
    description: "BOQ، رواتب، وفوترة — حاسبة فورية",
  },
  {
    path: "/insights",
    label: "مركز المعرفة",
    icon: HusPlatformIcon,
    description: "أدلة عملية مبسطة وتشخيصات مالية",
  },
];

/**
 * ────────────────────────────────────────────────────────────────────────
 * Domain-Driven Mega Clusters — منطق خبير لمستوى شركة عالمية (2026-09)
 * ────────────────────────────────────────────────────────────────────────
 * 4 مجالات فقط — كل مجال يجيب عن سؤال واحد واضح:
 * الحلول: ماذا تحل لي؟ (JTBD) · المنصة: كيف تعمل؟ (How) · الموارد: كيف أتعلم وأدمج؟ · الشركة: من أنتم؟
 * MarketingHeader يستهلك هذه العناقيد مباشرة — لا عشوائية، لا خلط تسويق/نظام.
 */

// المنصة: كيف تعمل — مصدر الحقيقة الموحد فقط (لا يخلط بالخدمات)
export const PLATFORM_CLUSTER: NavItem[] = [
  {
    path: "/#uamex",
    label: "Uamex_erp — المنصة الموحدة",
    icon: HusPlatformIcon,
    highlight: true,
    description: "قيود محمية من التعديل + صلاحية لكل موظف",
  },
  {
    path: "/#methodology",
    label: "المنهجية المعتمدة",
    icon: HusScaleIcon,
    description: "منهجية معتمدة — كل رقم قابل للمراجعة",
  },
  {
    path: "/#trust-center",
    label: "الأمن والامتثال",
    icon: HusShieldIcon,
    description: "تشفير كامل + عزل بيانات كل منشأة + نسخ احتياطي مشفّر",
  },
];

// الحلول: ماذا تحل لي — 3 مسارات وظيفية بمنطق العميل لا بمنطق الأقسام
export const SOLUTIONS_CLUSTER: NavItem[] = [
  {
    path: "/#corporate",
    label: "الاستشارات المؤسسية",
    icon: HusLayersIcon,
    description: "نتابع الانحرافات ونصمم مؤشرات تقيس شغلك",
  },
  {
    path: "/#engineering",
    label: "الهندسة والمساحة",
    icon: HusCompassIcon,
    description: "جداول كميات دقيقة — مساحة GPS ودرون معتمدة",
  },
  {
    path: "/#library",
    label: "الخدمات المعرفية",
    icon: HusPlatformIcon,
    description: "SPSS v28 + APA 7th — من البحث إلى النشر",
  },
];

// الذكاء والتقارير: كل شاشة BI بطبقة خادم موثوقة — مصدر حقيقة واحد
export const INTELLIGENCE_CLUSTER: NavItem[] = [
  {
    path: "/reports",
    label: "التقارير الموحدة",
    icon: BarChart3,
    highlight: true,
    description:
      "ميزان مراجعة + دخل + ميزانية — حتى تاريخ محدد مع مقارنة فترات",
  },
  {
    path: "/financial-statements",
    label: "القوائم المالية (الخادم)",
    icon: Scale,
    description:
      "Trial Balance / Income / Balance Sheet / Cash Flow / AR-AP Aging",
  },
  {
    path: "/analytics",
    label: "التحليلات الذكية",
    icon: TrendingUp,
    description: "إيرادات/مصروفات/صافي ربح + اتجاهات شهرية + تقسيم فروع",
  },
  {
    path: "/supplier-analytics",
    label: "ذكاء الموردين",
    icon: Truck,
    description: "إنفاق شهري، التزامات مفتوحة، متوسط فاتورة، بطاقة أداء مورد",
  },
  {
    path: "/operations",
    label: "لوحة العمليات",
    icon: Gauge,
    description: "تنبيهات، نواقص، طلبات، قيود مجدولة، تقرير التسليم",
  },
  {
    path: "/inventory",
    label: "تقارير المخزون المتقدمة",
    icon: Boxes,
    description: "تقادم، دوران، ABC، مخزون ميت — داخل تبويب المخزون",
  },
];

// الموارد: كيف أتعلم وأدمج — أدوات ومعرفة بلا تلوث (أيقونات رسمية مخصصة)
export const TOOLS_CLUSTER: NavItem[] = [
  {
    path: "/tools",
    label: "حاسبات ذكية",
    icon: HusScaleIcon,
    description: "BOQ، رواتب، وفوترة — حاسبة فورية",
  },
  {
    path: "/insights",
    label: "مركز المعرفة",
    icon: HusPlatformIcon,
    description: "أدلة عملية مبسطة وتشخيصات مالية",
  },
  {
    path: "/integrate",
    label: "مركز التكامل",
    icon: HusLinkIcon,
    description: "واجهات API و Webhooks",
  },
  {
    path: "/portal",
    label: "تتبع طلبك",
    icon: HusLinkIcon,
    description: "تتبع حالة طلب بالكود",
  },
  {
    path: "/download",
    label: "تحميل التطبيق",
    icon: Download,
    description: "PWA + تعليمات التثبيت",
  },
];

// الشركة: من أنتم — ثقة وتسعير وتواصل (قمع التحويل) — HusIcons
export const COMPANY_CLUSTER: NavItem[] = [
  {
    path: "/about",
    label: "من نحن",
    icon: HusLayersIcon,
    description: "قصة الحسينية ورسالتها وفريقها",
  },
  {
    path: "/pricing",
    label: "الأسعار",
    icon: HusScaleIcon,
    description: "باقات تنمو معك — 14 يوماً مجاناً",
  },
  {
    path: "/contact",
    label: "تواصل",
    icon: HusLinkIcon,
    description: "استشارة أولية مجانية خلال 24 ساعة",
  },
];

/** Authenticated app shell navigation — مشتق من APP_GROUPS (مصدر وحيد) */
const _APP_NAV_FLAT: NavItem[] = [] as NavItem[];
// سيُملأ لاحقاً بعد تعريف APP_GROUPS لتجنب التكرار — انظر أسفل الملف

/**
 * ────────────────────────────────────────────────────────────────────────
 * نظام التشغيل — تقسيم مجالي صارم داخل التطبيق (Finance/Commerce/Ops/Intelligence/Governance)
 * كل مجموعة لها عنوان ووصف — تُعرض في AppSidebar كأقسام منفصلة، لا قائمة مسطحة عشوائية.
 * ────────────────────────────────────────────────────────────────────────
 */
export const APP_GROUPS: ReadonlyArray<{
  key: string;
  label: string;
  description: string;
  items: NavItem[];
}> = [
  {
    key: "finance",
    label: "المالية",
    description: "قيود، قوائم، إقفال",
    items: [
      { path: "/accounting", label: "المحاسبة", icon: Wallet, highlight: true },
      { path: "/journal", label: "القيود المحاسبية", icon: BookOpen },
      { path: "/manual-journal", label: "قيد يدوي ذكي", icon: Scale },
      { path: "/cost-centers", label: "مراكز التكلفة", icon: Calculator },
      {
        path: "/fiscal-periods",
        label: "الفترات والإقفال",
        icon: CalendarClock,
        highlight: true,
      },
      {
        path: "/financial-statements",
        label: "القوائم المالية",
        icon: BarChart3,
        highlight: true,
      },
      {
        path: "/statements",
        label: "الدفاتر والكشوف",
        icon: BookOpen,
        highlight: true,
      },
      {
        path: "/advanced-accounting",
        label: "المحاسبة المتقدمة والإنتاج",
        icon: Factory,
        highlight: true,
      },
    ],
  },
  {
    key: "commerce",
    label: "التجارة والمخزون",
    description: "بيع، شراء، مخازن",
    items: [
      { path: "/commercial", label: "العمليات التجارية", icon: Package },
      { path: "/pos", label: "نقاط البيع", icon: Receipt, highlight: true },
      { path: "/inventory", label: "المخزون", icon: Boxes },
      { path: "/store", label: "المتجر الإلكتروني", icon: ShoppingCart },
      {
        path: "/procurement-workspace",
        label: "Workspace المشتريات",
        icon: Truck,
        highlight: true,
      },
      { path: "/purchase-orders", label: "أوامر الشراء", icon: FileText },
      { path: "/goods-receipts", label: "سندات الاستلام", icon: PackageCheck },
      { path: "/procurement", label: "المشتريات التنفيذية", icon: Truck },
      {
        path: "/supplier-analytics",
        label: "تحليل الموردين",
        icon: BarChart3,
        highlight: true,
      },
      { path: "/projects", label: "المشاريع", icon: FolderKanban },
    ],
  },
  {
    key: "ops",
    label: "التشغيل والموارد",
    description: "مهام، موظفون، جودة",
    items: [
      { path: "/app", label: "لوحة التحكم", icon: LayoutDashboard },
      { path: "/hr", label: "الموارد البشرية", icon: Users },
      { path: "/support", label: "الدعم والجودة", icon: LifeBuoy },
      { path: "/requisitions", label: "طلبات التوريد", icon: ClipboardList },
      { path: "/beneficiaries", label: "السجل الموحد", icon: Users },
      { path: "/basic-data", label: "البيانات الأساسية", icon: Boxes },
      {
        path: "/customization",
        label: "التخصيص والحقول",
        icon: SlidersHorizontal,
      },
      {
        path: "/elias-pro",
        label: "منظومة الياس برو",
        icon: Server,
        highlight: true,
      },
    ],
  },
  {
    key: "intelligence",
    label: "الذكاء والتقارير",
    description: "مصدر حقيقة واحد",
    items: [
      {
        path: "/reports",
        label: "التقارير الموحدة",
        icon: BarChart3,
        highlight: true,
      },
      {
        path: "/analytics",
        label: "التحليلات الذكية",
        icon: BarChart3,
        highlight: true,
      },
      {
        path: "/operations",
        label: "لوحة العمليات",
        icon: Gauge,
        highlight: true,
      },
      { path: "/financial-statements", label: "القوائم المالية", icon: Scale },
      { path: "/supplier-analytics", label: "ذكاء الموردين", icon: Truck },
    ],
  },
  {
    key: "governance",
    label: "الحوكمة والأمان",
    description: "صلاحيات، تدقيق، فروع",
    items: [
      { path: "/audit", label: "سجل التدقيق", icon: History },
      { path: "/security", label: "أمان الحساب", icon: ShieldCheck },
      { path: "/permissions", label: "الصلاحيات", icon: ShieldCheck },
      { path: "/branches", label: "الفروع والصلاحيات", icon: Building2 },
      { path: "/erp", label: "ERP", icon: LayoutGrid },
      {
        path: "/billing",
        label: "الاشتراك والفوترة",
        icon: CreditCard,
        highlight: true,
      },
      { path: "/zatca", label: "الفوترة الإلكترونية", icon: ShieldCheck },
      { path: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

/**
 * Utility tools — intentionally excluded from primary navigation.
 * Surfaced via footer links, the store page, and settings instead.
 */
export const UTILITY_LINKS: NavItem[] = [
  { path: "/portal", label: "تتبع طلبك", icon: HusLinkIcon },
  { path: "/integrate", label: "مركز التكامل", icon: HusLinkIcon },
  { path: "/download", label: "تحميل التطبيق", icon: HusShieldIcon },
  { path: "/onboarding", label: "تهيئة المشترك", icon: HusLayersIcon },
];

// ── اشتقاق APP_NAV من APP_GROUPS — مصدر وحيد يمنع انحراف الروابط ──
function dedupeByPath(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  const out: NavItem[] = [];
  for (const it of items) {
    if (!seen.has(it.path)) {
      seen.add(it.path);
      out.push(it);
    }
  }
  return out;
}
export const APP_NAV: NavItem[] = dedupeByPath(
  APP_GROUPS.flatMap(g => g.items)
);
