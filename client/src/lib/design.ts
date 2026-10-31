/**
 * ALHUSAINIA — Modular Design System
 * ===================================
 * Central, typed source of truth for the platform's modular architecture.
 * Each business "module" (accounting, engineering, commercial, library,
 * analytics) carries a consistent visual identity so the whole product feels
 * coherent yet clearly differentiated — the hallmark of a world-class,
 * modular SaaS design language.
 */
import {
  Building2,
  HardHat,
  ShoppingCart,
  BookOpen,
  Sparkles,
  Users,
  FolderKanban,
  Truck,
  Headset,
  ShieldCheck,
  Receipt,
  Package,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "accounting"
  | "engineering"
  | "commercial"
  | "library"
  | "analytics"
  | "hr"
  | "projects"
  | "procurement"
  | "support"
  | "quality"
  | "pos"
  | "distribution";

export interface ModuleIdentity {
  key: ModuleKey;
  /** Arabic display name. */
  label: string;
  /** Short English key (used in URLs / analytics). */
  en: string;
  /** Primary accent (Tailwind-compatible hex). */
  accent: string;
  /** Light tint used for soft backgrounds/badges. */
  tint: string;
  /** Solid gradient pair for hero tiles. */
  gradient: string;
  /** Border class for active states. */
  border: string;
  icon: LucideIcon;
  /** One-line value proposition. */
  tagline: string;
  /** World-class: longer 2-sentence pitch for hero/landing. */
  pitch?: string;
  /** World-class: KPI bullet for module header. */
  kpi?: string;
  /** Optional roles allowed to see this module. Omit = visible to all. */
  roles?: string[];
}

export const MODULES: Record<ModuleKey, ModuleIdentity> = {
  accounting: {
    key: "accounting",
    label: "المحاسبة والمالية",
    en: "accounting",
    accent: "#0e2a2b",
    tint: "bg-ink/5",
    gradient: "from-ink via-ink-700 to-ink-500",
    border: "border-ink",
    icon: Building2,
    tagline:
      "نظام محاسبي مرن يخدم جميع أنواع الأنشطة التجارية والصناعية والخدمية.",
    pitch:
      "ميزان مراجعة يُفتح في ثوانٍ بدل أيام — قوائم مالية جاهزة للمراجع الخارجي في أول يوم عمل.",
    kpi: "≤ 4 ساعات لإغلاق الشهر",
  },
  engineering: {
    key: "engineering",
    label: "الهندسة والمقاولات",
    en: "engineering",
    accent: "#b87945",
    tint: "bg-brand/10",
    gradient: "from-brand via-brand-400 to-brand-deep",
    border: "border-brand",
    icon: HardHat,
    tagline:
      "إدارة المشاريع والتنفيذ للأنشطة الصناعية والخدمية والبنية التحتية.",
    pitch:
      "متابعة المشاريع والمهام عبر جميع أنواع الأنشطة التجارية — على أطر PMBOK وCOSO.",
    kpi: "±5% دقة تقدير",
  },
  commercial: {
    key: "commercial",
    label: "المبيعات والمخزون",
    en: "commercial",
    accent: "#0f766e",
    tint: "bg-teal-700/10",
    gradient: "from-teal-700 via-teal-600 to-teal-800",
    border: "border-teal-700",
    icon: ShoppingCart,
    tagline:
      "إدارة الفواتير والمخزون لعملك سواء كان تجارياً أو خدمياً أو صناعياً.",
    pitch:
      "دورة تجارية كاملة: عروض أسعار ← أوامر بيع ← فواتير ← تحصيل ← ترحيل تلقائي للمحاسبة والمخزون.",
    kpi: "70% خفض زمن الإغلاق",
  },
  library: {
    key: "library",
    label: "المكتبة والصيانة",
    en: "library",
    accent: "#0369a1",
    tint: "bg-sky-700/10",
    gradient: "from-sky-700 via-sky-600 to-sky-800",
    border: "border-sky-700",
    icon: BookOpen,
    tagline: "المعارف والصيانة للدعم المؤسسي لجميع الأنشطة.",
  },
  analytics: {
    key: "analytics",
    label: "التحليلات والذكاء",
    en: "analytics",
    accent: "#7c3aed",
    tint: "bg-violet-600/10",
    gradient: "from-violet-600 via-violet-500 to-violet-700",
    border: "border-violet-600",
    icon: Sparkles,
    tagline: "لوحة تحلل ذكية لأداء أي نشاط تجاري أو صناعي أو طبي.",
  },
  hr: {
    key: "hr",
    label: "الموارد البشرية",
    en: "hr",
    accent: "#0d9488",
    tint: "bg-teal-600/10",
    gradient: "from-teal-600 via-teal-500 to-teal-700",
    border: "border-teal-600",
    icon: Users,
    tagline: "إدارة الأقسام والموظفين والحضور والرواتب لجميع أنواع الأنشطة.",
  },
  projects: {
    key: "projects",
    label: "إدارة المشاريع",
    en: "projects",
    accent: "#ca8a04",
    tint: "bg-yellow-600/10",
    gradient: "from-yellow-600 via-yellow-500 to-yellow-700",
    border: "border-yellow-600",
    icon: FolderKanban,
    tagline: "متابعة المشاريع والمهام عبر جميع أنواع الأنشطة التجارية.",
  },
  procurement: {
    key: "procurement",
    label: "المشتريات والاعتماد",
    en: "procurement",
    accent: "#b45309",
    tint: "bg-amber-700/10",
    gradient: "from-amber-700 via-amber-600 to-amber-800",
    border: "border-amber-700",
    icon: Truck,
    tagline: "سلاسل التوريد والشراء لأنشطة صناعية وطبية وخدمة.",
  },
  distribution: {
    key: "distribution",
    label: "التوزيع اللوجستي",
    en: "distribution",
    accent: "#dc2626",
    tint: "bg-red-600/10",
    gradient: "from-red-600 via-red-400 to-rose-400",
    border: "border-red-600",
    icon: Package,
    tagline: "التوزيع السريع بين الفروع والمخازن لجميع أنواع الأنشطة.",
  },
  support: {
    key: "support",
    label: "خدمة العملاء",
    en: "support",
    accent: "#2563eb",
    tint: "bg-blue-600/10",
    gradient: "from-blue-600 via-blue-500 to-blue-700",
    border: "border-blue-600",
    icon: Headset,
    tagline: "متابعة العملاء والدعم لجميع أنواع الأنشطة التجارية والخدمية.",
  },
  quality: {
    key: "quality",
    label: "الجودة والفحص",
    en: "quality",
    accent: "#16a34a",
    tint: "bg-green-600/10",
    gradient: "from-green-600 via-green-500 to-green-700",
    border: "border-green-600",
    icon: ShieldCheck,
    tagline: "فحوصات الجودة والرقابة لجميع الأنشطة الصناعية والطبية والخدمية.",
  },
  pos: {
    key: "pos",
    label: "نقاط البيع",
    en: "pos",
    accent: "#b87945",
    tint: "bg-brand/10",
    gradient: "from-brand via-brand-400 to-brand-deep",
    border: "border-brand",
    icon: Receipt,
    tagline: "محطة بيع للأنشطة التجارية والخدمية والمطاعم.",
  },
};

export const MODULE_LIST: ModuleIdentity[] = Object.values(MODULES);

/**
 * Modules visible to a given role. Modules without `roles` are visible to
 * everyone. Admins/owners see every module.
 */
export function modulesForRole(role?: string | null): ModuleKey[] {
  if (!role || role === "admin" || role === "owner") {
    return MODULE_LIST.map(m => m.key);
  }
  return MODULE_LIST.filter(m => !m.roles || m.roles.includes(role)).map(
    m => m.key
  );
}

/** Greeting by local time of day — used in welcoming headers. */
export function greetingByHour(hour = new Date().getHours()): string {
  if (hour < 12) return "صباح الخير";
  if (hour < 18) return "مساء الخير";
  return "مساء الخير";
}

/** Format a money amount with thousands separators + currency code. */
export function formatMoney(
  value: number | string | null | undefined,
  currency = "YER"
): string {
  const n =
    typeof value === "number" ? value : parseFloat(String(value ?? "0")) || 0;
  return `${n.toLocaleString("en-US")} ${currency}`;
}

// ─── World-Class Design Tokens (added) ───

export const designTokens = {
  colors: {
    brand: {
      50: "#fef3f2",
      100: "#fde8e6",
      200: "#fcd1cc",
      300: "#f9b1ad",
      400: "#f58578",
      500: "#F27059",
      600: "#E85A40",
      700: "#D44730",
      800: "#B83827",
      900: "#9A3024",
      950: "#5D1A16",
    },
    neutral: {
      0: "#FFFFFF",
      50: "#F8F9FA",
      100: "#F1F3F5",
      200: "#E9ECEF",
      300: "#DEE2E6",
      400: "#CED4DA",
      500: "#ADB5BD",
      600: "#868E96",
      700: "#495057",
      800: "#343A40",
      900: "#212529",
      950: "#1A1D20",
    },
    success: { 50: "#E6FFED", 100: "#C6F6D5", 500: "#22C55E", 600: "#16A34A" },
    warning: { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 600: "#D97706" },
    error: { 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444", 600: "#DC2626" },
    info: { 50: "#EFF6FF", 100: "#DBEAFE", 500: "#3B82F6", 600: "#2563EB" },
  },
  radius: {
    none: "0",
    sm: "0.125rem",
    base: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    brand: "0 4px 14px 0 rgb(242 112 89 / 0.35)",
    glow: "0 0 20px 4px rgb(242 112 89 / 0.25)",
  },
  transition: {
    duration: {
      instant: "150ms",
      fast: "200ms",
      normal: "300ms",
      slow: "500ms",
    },
    easing: {
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
  zIndex: {
    dropdown: 1000,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
} as const;

export function injectDesignTokens(): void {
  const root = document.documentElement;
  const brand = designTokens.colors.brand;
  const neutral = designTokens.colors.neutral;
  const success = designTokens.colors.success;
  const warning = designTokens.colors.warning;
  const error = designTokens.colors.error;
  const info = designTokens.colors.info;

  Object.entries(brand).forEach(([k, v]) =>
    root.style.setProperty(`--brand-${k}`, v)
  );
  Object.entries(neutral).forEach(([k, v]) =>
    root.style.setProperty(`--neutral-${k}`, v)
  );
  Object.entries(success).forEach(([k, v]) =>
    root.style.setProperty(`--success-${k}`, v)
  );
  Object.entries(warning).forEach(([k, v]) =>
    root.style.setProperty(`--warning-${k}`, v)
  );
  Object.entries(error).forEach(([k, v]) =>
    root.style.setProperty(`--error-${k}`, v)
  );
  Object.entries(info).forEach(([k, v]) =>
    root.style.setProperty(`--info-${k}`, v)
  );
}
