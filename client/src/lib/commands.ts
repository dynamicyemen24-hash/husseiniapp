/**
 * client/src/lib/commands.ts — سجل أوامر العمل (مصدر وحيد)
 * ============================================================
 * "النيّة" قبل "المكان": المستخدم يريد إنجاز عمل ("سجّل قيداً"، "اقفل فترة")
 * لا فتح شاشة. هذا السجل يربط كل نيّة بالمسار والصلاحية التي تنفذها،
 * فيستهلكه:
 *   • شريط الأوامر الدائم  (WorkContextBar) — أزرار النوايا السريعة
 *   • لوحة الأوامر Ctrl+K  (CommandPalette)    — نتائج النوايا
 *
 * المبادئ المطبّقة (Fiori / Dynamics — بروح لا بنسخ):
 *   • Role-based    — كل أمر يحمل الصلاحية التي يتطلّبها؛ يُخفى لمن لا يملكها.
 *   • Intent-based  — التسمية تصف العمل لا الشاشة.
 *   • Responsive    — ترتيب Commands حسب النية لا حسب المسار، فيبقى الأول
 *                     هو الأقرب لنيّة المستخدم.
 *   • Command-driven — الإجراء يُنفَّذ بمسار واحد (navigate) أو تفاعل (event).
 *
 * مصدر واحد يغذّي الواجهتين ⇒ لا انحراف بينهما، ولا تكرار.
 */
import {
  BookOpen,
  Calculator,
  ClipboardList,
  FileText,
  History,
  Layers,
  Package,
  PackageCheck,
  Receipt,
  Scale,
  Server,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "@shared/permissions";

export type CommandIntent =
  | "finance"
  | "commerce"
  | "operations"
  | "governance"
  | "intelligence";

export interface WorkCommand {
  id: string;
  /** تسمية النية — تصف العمل لا الشاشة. */
  label: string;
  /** شرح قصير يظهر في تلميح الزر. */
  hint: string;
  icon: LucideIcon;
  intent: CommandIntent;
  /** المسار المستهدف داخل مساحة العمل. */
  path: string;
  /** الصلاحية المطلوبة — يُخفى الأمر تماماً لمن لا يملكها. */
  permission?: string;
  /** كلمات إضافية untuk البحث في لوحة الأوامر. */
  keywords?: string[];
  /** أولوية الترتيب داخل النية (أصغر = يظهر أولاً). */
  order?: number;
}

export const COMMAND_INTENT_LABELS: Record<CommandIntent, string> = {
  finance: "المالية",
  commerce: "التجارة",
  operations: "التشغيل",
  governance: "الحوكمة",
  intelligence: "الذكاء",
};

export const COMMAND_INTENT_ORDER: CommandIntent[] = [
  "finance",
  "commerce",
  "operations",
  "intelligence",
  "governance",
];

/**
 * نوايا العمل الأساسية. مرتّبة حسب النية، وكل مجموعة تبدأ بفعل واضح.
 * `order` يعكس أولوية الاستخدام اليومي داخل النية.
 */
export const WORK_COMMANDS: WorkCommand[] = [
  // ── المالية ───────────────────────────────────────────────────
  {
    id: "journal.manual",
    label: "تسجيل قيد محاسبي",
    hint: "قيد مزدوج مع التحقق من التوازن",
    icon: BookOpen,
    intent: "finance",
    path: "/manual-journal",
    permission: PERMISSIONS.JOURNAL_CREATE,
    keywords: ["قيد", "دفتر", "مدين", "دائن", "journal"],
    order: 1,
  },
  {
    id: "journal.list",
    label: "متابعة القيود",
    hint: "سجل القيود للمراجعة والترحيل",
    icon: Layers,
    intent: "finance",
    path: "/journal",
    permission: PERMISSIONS.JOURNAL_VIEW,
    keywords: ["قيود", "سجل", "journal"],
    order: 4,
  },
  {
    id: "finance.periods",
    label: "إقفال فترة مالية",
    hint: "قفل الفترة وترحيل الأرصدة إلى النتائج",
    icon: Scale,
    intent: "finance",
    path: "/fiscal-periods",
    permission: PERMISSIONS.FISCAL_PERIODS_VIEW,
    keywords: ["إقفال", "فترة", "قفل"],
    order: 2,
  },
  {
    id: "finance.statements",
    label: "قراءة القوائم المالية",
    hint: "ميزان المراجعة وقائمة الدخل والميزانية",
    icon: TrendingUp,
    intent: "finance",
    path: "/financial-statements",
    permission: PERMISSIONS.FINANCIAL_STATEMENTS_VIEW,
    keywords: ["قوائم", "ميزان", "دخل", "ميزانية"],
    order: 3,
  },
  {
    id: "finance.cost-centers",
    label: "إدارة مراكز التكلفة",
    hint: "التصنيف التحليلي وتحليل الأداء",
    icon: Calculator,
    intent: "finance",
    path: "/cost-centers",
    permission: PERMISSIONS.COST_CENTERS_VIEW,
    keywords: ["تكاليف", "مراكز", "تحليل"],
    order: 5,
  },
  {
    id: "finance.advanced",
    label: "المحاسبة المتقدمة والإنتاج",
    hint: "شركاء، تكاليف الأنشطة، وأوامر التصنيع",
    icon: Wallet,
    intent: "finance",
    path: "/advanced-accounting",
    keywords: ["إنتاج", "شركاء", "abc", "تصنيع"],
    order: 6,
  },

  // ── التجارة ───────────────────────────────────────────────────
  {
    id: "commerce.sale",
    label: "إصدار فاتورة مبيعات",
    hint: "فاتورة ضريبية مرتبطة بالمخزون والحساب",
    icon: Receipt,
    intent: "commerce",
    path: "/commercial?new=sale",
    permission: PERMISSIONS.COMMERCIAL_MANAGE,
    keywords: ["فاتورة", "بيع", "مبيعات", "ضريبة"],
    order: 1,
  },
  {
    id: "commerce.pos",
    label: "بيع سريع في نقطة البيع",
    hint: "شاشة الكاشير مع الإخراج الضريبي",
    icon: ShoppingCart,
    intent: "commerce",
    path: "/pos",
    permission: PERMISSIONS.POS_CREATE_SALE,
    keywords: ["كاشير", "نقطة بيع", "pos"],
    order: 2,
  },
  {
    id: "commerce.purchase-order",
    label: "إنشاء أمر شراء",
    hint: "طلب للمورد يمر بدورة موافقات",
    icon: Truck,
    intent: "commerce",
    path: "/purchase-orders",
    permission: PERMISSIONS.PROCUREMENT_CREATE,
    keywords: ["شراء", "أمر", "مورد", "طلب"],
    order: 3,
  },
  {
    id: "commerce.goods-receipt",
    label: "استلام بضاعة",
    hint: "سند استلام يحدّث الكميات والتكلفة",
    icon: PackageCheck,
    intent: "commerce",
    path: "/goods-receipts",
    permission: PERMISSIONS.PROCUREMENT_RECEIVE,
    keywords: ["استلام", "سند", "كمية"],
    order: 4,
  },
  {
    id: "commerce.inventory",
    label: "مراجعة المخزون",
    hint: "الكميات والقيمة والجرد الدوري",
    icon: Package,
    intent: "commerce",
    path: "/inventory",
    permission: PERMISSIONS.INVENTORY_VIEW,
    keywords: ["مخزون", "جرد", "كمية"],
    order: 5,
  },

  // ── التشغيل ───────────────────────────────────────────────────
  {
    id: "ops.requisitions",
    label: "طلب توريد",
    hint: "طلب داخلي من الوحدة إلى المشتريات",
    icon: ClipboardList,
    intent: "operations",
    path: "/requisitions",
    keywords: ["توريد", "طلب", "احتياج"],
    order: 1,
  },
  {
    id: "ops.hr",
    label: "شؤون الموظفين",
    hint: "الحضور والرواتب وملفات الموظفين",
    icon: Users,
    intent: "operations",
    path: "/hr",
    permission: PERMISSIONS.HR_VIEW,
    keywords: ["موظفين", "رواتب", "حضور"],
    order: 2,
  },
  {
    id: "ops.maintenance",
    label: "منظومة الصيانة والتشخيص",
    hint: "عقد الصيانة وتشخيص صحة الأجهزة وأوامر الإصلاح",
    icon: Wrench,
    intent: "operations",
    path: "/elias-pro",
    keywords: ["صيانة", "تشخيص", "أجهزة", "عقد"],
    order: 3,
  },
  {
    id: "ops.support",
    label: "متابعة التذاكر والجودة",
    hint: "البلاغات وقياس الجودة والاستجابة",
    icon: History,
    intent: "operations",
    path: "/support",
    keywords: ["تذاكر", "جودة", "دعم", "شكاوى"],
    order: 4,
  },

  // ── الذكاء ────────────────────────────────────────────────────
  {
    id: "intel.reports",
    label: "التقارير الموحدة",
    hint: "مصدر حقيقة واحد لكل تقارير المؤسسة",
    icon: FileText,
    intent: "intelligence",
    path: "/reports",
    permission: PERMISSIONS.REPORTS_VIEW,
    keywords: ["تقارير", "تحليل", "أداء"],
    order: 1,
  },
  {
    id: "intel.analytics",
    label: "لوحة التحليلات",
    hint: "مؤشرات فورية واتجاهات مبيعات وهوامش",
    icon: TrendingUp,
    intent: "intelligence",
    path: "/analytics",
    permission: PERMISSIONS.REPORTS_ANALYTICS,
    keywords: ["تحليلات", "مؤشرات", "مبيعات", "هوامش"],
    order: 2,
  },
  {
    id: "intel.operations",
    label: "لوحة العمليات",
    hint: "ما ينتظر قرارك الآن عبر كل الوحدات",
    icon: Layers,
    intent: "intelligence",
    path: "/operations",
    keywords: ["عمليات", "انتظار", "أولويات"],
    order: 3,
  },

  // ── الحوكمة ───────────────────────────────────────────────────
  {
    id: "gov.audit",
    label: "سجل التدقيق",
    hint: "أثر كل عملية: من، متى، ماذا غيّر",
    icon: History,
    intent: "governance",
    path: "/audit",
    keywords: ["تدقيق", "أثر", "سجل"],
    order: 1,
  },
  {
    id: "gov.permissions",
    label: "الصلاحيات والأدوار",
    hint: "من يملك ماذا داخل المؤسسة",
    icon: ShieldCheck,
    intent: "governance",
    path: "/permissions",
    permission: PERMISSIONS.RBAC_VIEW,
    keywords: ["صلاحيات", "أدوار", "صلاح"],
    order: 2,
  },
  {
    id: "gov.zatca",
    label: "الفوترة الإلكترونية",
    hint: "التكامل مع هيئة الزكاة والضريبة",
    icon: ShieldCheck,
    intent: "governance",
    path: "/zatca",
    keywords: ["زكاة", "ضريبة", "فاتورة", "zatca"],
    order: 3,
  },
  {
    id: "gov.basic-data",
    label: "البيانات الأساسية",
    hint: "العملاء والموردون والأصناف والحسابات",
    icon: Package,
    intent: "governance",
    path: "/basic-data",
    keywords: ["بيانات", "عملاء", "موردون", "أصناف"],
    order: 4,
  },
  {
    id: "gov.platform",
    label: "إدارة المستأجرين والاشتراكات",
    hint: "دورة حياة الاشتراك وحالة كل مؤسسة",
    icon: Server,
    intent: "governance",
    path: "/erp",
    keywords: ["مستأجرين", "اشتراك", "منصة"],
    order: 5,
  },
];

/**
 * يفلتر الأوامر حسب الدور والصلاحية.
 * `can` هي بوابة الصلاحيات في العميل (الخادم يبقى المرجع النهائي).
 */
export function filterCommandsForRole(
  commands: WorkCommand[],
  can: (permission: string) => boolean
): WorkCommand[] {
  return commands.filter(c => !c.permission || can(c.permission));
}

/** يرتّب الأوامر حسب النية ثم الأولوية ثم الاسم — ترتيب ثابت لا عشوائي. */
export function sortCommands(commands: WorkCommand[]): WorkCommand[] {
  return [...commands].sort((a, b) => {
    const ia = COMMAND_INTENT_ORDER.indexOf(a.intent);
    const ib = COMMAND_INTENT_ORDER.indexOf(b.intent);
    if (ia !== ib) return ia - ib;
    const oa = a.order ?? 99;
    const ob = b.order ?? 99;
    if (oa !== ob) return oa - ob;
    return a.label.localeCompare(b.label, "ar");
  });
}

/** يجمع الأوامر حسب النية لعرضها كمجموعات في لوحة الأوامر. */
export function groupCommandsByIntent(
  commands: WorkCommand[]
): Array<{ intent: CommandIntent; label: string; commands: WorkCommand[] }> {
  const sorted = sortCommands(commands);
  return COMMAND_INTENT_ORDER.map(intent => ({
    intent,
    label: COMMAND_INTENT_LABELS[intent],
    commands: sorted.filter(c => c.intent === intent),
  })).filter(g => g.commands.length > 0);
}
