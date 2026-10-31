/**
 * خريطة عناوين كل صفحة — تُحدَّث document.title عند التنقل (تحسين SEO + UX):
 * الزائر يعرف أين هو، والألسنة التاريخية تصبح قابلة للقراءة والعودة إليها.
 *
 * صفحات التعريف تحمل اسم الشركة؛ صفحات العمل تحمل اسم المنتج.
 */
import { brand } from "@/lib/brand";

/** العلامة الأساسية — العربية أولاً، متسقة مع brand.ts (وليس رومنة ثابتة). */
const COMPANY = brand.names.siteName;
const PRODUCT = brand.names.erpDisplay;
const appTitle = (title: string) => `${title} | ${PRODUCT}`;

/** العنوان الافتراضي للصفحة الرئيسية — استعلام مباشر من أي مكان. */
export const DEFAULT_PAGE_TITLE = `${COMPANY} — ${brand.tagline}`;

export const PAGE_TITLES: Record<string, string> = {
  // ── الصفحات العامة (الزائر) ──
  "/": DEFAULT_PAGE_TITLE,
  "/login": appTitle("تسجيل الدخول"),
  "/about": `التعريف بالخدمات | ${COMPANY}`,
  "/portal": `بوابة تتبع الطلبات | ${COMPANY}`,
  "/download": `تحميل تطبيق ${PRODUCT} | ${COMPANY}`,
  "/pricing": `الأسعار والباقات | ${PRODUCT}`,
  "/contact": `تواصل معنا | ${COMPANY}`,
  "/insights": `مركز المعرفة | ${COMPANY}`,
  "/tools": `حاسبات ذكية | ${COMPANY}`,
  "/solutions": `الحلول البرمجية | ${COMPANY}`,
  "/governance": `حوكمة المشاريع | ${COMPANY}`,
  "/integrate": `مركز التكامل | ${PRODUCT}`,
  "/privacy-policy": `سياسة الخصوصية | ${COMPANY}`,
  "/terms-of-service": `الشروط والأحكام | ${COMPANY}`,

  // ── الصفحات التشغيلية (المشترك) ──
  "/app": appTitle("لوحة العمل"),
  "/accounting": appTitle("النظام المحاسبي"),
  "/commercial": appTitle("العمليات التجارية"),
  "/reports": appTitle("التقارير المالية"),
  "/settings": appTitle("إعدادات المؤسسة"),
  "/erp": appTitle("مساحة العمل"),
  "/inventory": appTitle("إدارة المخزون"),
  "/store": appTitle("المتجر الإلكتروني"),
  "/security": appTitle("الأمان والصلاحيات"),
  "/procurement-workspace": appTitle("مساحة المشتريات"),
  "/supplier-analytics": appTitle("تحليل الموردين"),
  "/procurement": appTitle("المشتريات"),
  "/projects": appTitle("إدارة المشاريع"),
  "/hr": appTitle("الموارد البشرية"),
  "/support": appTitle("الدعم والجودة"),
  "/pos": appTitle("نقاط البيع"),
  "/permissions": appTitle("الصلاحيات"),
  "/basic-data": appTitle("البيانات الأساسية"),
  "/journal": appTitle("القيود المحاسبية"),
  "/manual-journal": appTitle("القيد اليدوي"),
  "/customization": appTitle("التخصيص والحقول"),
  "/branches": appTitle("الفروع والصلاحيات"),
  "/audit": appTitle("سجل التدقيق"),
  "/requisitions": appTitle("طلبات التوريد"),
  "/operations": appTitle("لوحة العمليات"),
  "/analytics": appTitle("التحليلات"),
  "/billing": appTitle("الاشتراك والفوترة"),
  "/onboarding": appTitle("تهيئة المؤسسة"),
  "/cost-centers": appTitle("مراكز التكلفة"),
  "/zatca": appTitle("الفوترة الإلكترونية (ZATCA)"),
  "/beneficiaries": appTitle("العملاء والمستفيدون"),
  "/financial-statements": appTitle("القوائم المالية"),
  "/statements": appTitle("الدفاتر والكشوف"),
  "/fiscal-periods": appTitle("الفترات المالية والإقفال"),

  // ── حالات الخطأ ──
  "/404": `الصفحة غير موجودة | ${COMPANY}`,
};

/** المسارات الديناميكية الفرعية (مثل /commercial/invoice/create) — بادئة → عنوان. */
const DYNAMIC_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["/commercial/invoice/", appTitle("إنشاء فاتورة")],
  ["/commercial/", appTitle("العمليات التجارية")],
  ["/erp/", appTitle("مساحة العمل")],
  ["/pos/", appTitle("نقاط البيع")],
];

export function resolvePageTitle(path: string): string {
  const normalized = normalizePath(path);
  const exact = PAGE_TITLES[normalized];
  if (exact) return exact;

  for (const [prefix, title] of DYNAMIC_PREFIXES) {
    if (normalized.startsWith(prefix)) return title;
  }

  // المسار المعروف يتكون من بادئة وجزء (مثل /accounting/...) — نوّع افتراضياً.
  const [root = ""] = normalized.split("/").filter(Boolean); // أول مقطع
  if (root && normalized.startsWith(`/${root}`) && normalized !== `/${root}`) {
    const base = PAGE_TITLES[`/${root}`];
    if (base) return base;
  }

  return DEFAULT_PAGE_TITLE;
}

/** المسار الأساسي المطلق للموقع — يُستعمل في Canonical وOpenGraph. */
export const SITE_URL = brand.contact.website;

/** الوصف الافتراضي — يظهر في نتائج البحث وعند مشاركة روابط الموقع. */
export const DEFAULT_META_DESCRIPTION =
  "الحسينية لخدمات الأعمال تقدم استشارات وخدمات مهنية وحلولاً رقمية، من بينها Uamex ERP لإدارة العمليات المالية والتجارية والمخزون.";

/** وصف لكل صفحة (SEO): وصف موجز غني بالكلمات المفتاحية العربية. */
export const PAGE_DESCRIPTIONS: Record<string, string> = {
  "/": DEFAULT_META_DESCRIPTION,
  "/login":
    "سجّل الدخول إلى Uamex ERP لإدارة العمليات المالية والتجارية والمخزون في مساحة عمل منشأتك.",
  "/about":
    "التعريف بمجموعة الحسينية — قصة المؤسسة ورسالتها وقيمها وخدماتها المتنوعة.",
  "/portal":
    "بوابة تتبع الطلبات والخدمات — متابعة طلباتكم الهندسية والاستشارية والتجارية في الوقت الفعلي بشفافية كاملة.",
  "/download":
    "تحميل تطبيق ALHUSAINIA وتطبيق الهاتف — اعمل أينما كنت مع مزامنة فورية وأداء عالٍ حتى دون اتصال.",
  "/pricing":
    "باقات وأسعار منصة الحسينية — أسعار تنافسية للباقات تبدأ من الأساسية وصولاً إلى الباقة الشاملة للمؤسسات.",
  "/contact":
    "تواصل معنا عبر واتساب والبريد والموقع — فريق الحسينية جاهز للإجابة على استفساراتك وتقديم الدعم الفوري.",
  "/insights":
    "مركز المعرفة والحسينية — مقالات ودورات وأدلة عملية في المحاسبة وإدارة الأعمال والتقنية والمقاولات.",
  "/tools":
    "حاسبات ذكية تفاعلية — احسب المقاولات والفواتير والرواتب وتحليل الاستثمار مباشرة عبر المتصفح.",
  "/solutions":
    "الحلول البرمجية لمنصة الحسينية — أنظمة جاهزة مرنة تناسب الجمعيات والمكاتب الهندسية وشركات المقاولات.",
  "/governance":
    "حوكمة المشاريع والإدارة — ضوابط الحوكمة الرشيدة لمتابعة المشاريع واتخاذ القرار بشفافية.",
  "/integrate":
    "مركز التكامل والربط — اربط منصة الحسينية بأدواتك المفضلة والمحاسبة والمدفوعات والرسائل بسهولة.",
  "/404":
    "الصفحة غير موجودة — الرابط الذي تبحث عنه غير متاح، توجه إلى الرئيسية للاستمرار.",
};

/** المسارات العامة (الزائر) — تُدار عليها Meta كاملة (Canonical + OpenGraph). */
const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/login",
  "/about",
  "/portal",
  "/download",
  "/pricing",
  "/contact",
  "/insights",
  "/tools",
  "/solutions",
  "/governance",
  "/integrate",
  "/404",
]);

/** مواصفات الـ SEO لمسار محدد — عنوان + وصف + Canonical. */
export interface PageMeta {
  title: string;
  description: string;
  /** رابط مطلق للمسار — null للمسارات التشغيلية المحمية (لا تُشارَك خارجياً). */
  canonical: string | null;
}

/** يجرّد الاستعلام/المرساة من المسار (مثال: `/about?x=1#a` → `/about`). */
function normalizePath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  if (!clean) return "/";
  return clean;
}

export function resolvePageMeta(path: string): PageMeta {
  const normalized = normalizePath(path);
  const title = resolvePageTitle(normalized);
  const description = PAGE_DESCRIPTIONS[normalized] ?? DEFAULT_META_DESCRIPTION;
  const canonical = PUBLIC_ROUTES.has(normalized)
    ? normalized === "/"
      ? SITE_URL
      : `${SITE_URL}${normalized}`
    : null;
  return { title, description, canonical };
}
