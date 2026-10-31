/**
 * friendlyErrors.ts — مترجم الأخطاء بلغة التاجر العربي
 * =====================================================
 * كل رسائل الخادم التقنية (رموز tRPC/HTTP، أخطاء الشبكة، رسائل المطورين
 * بالإنجليزية) تُترجم هنا إلى عربية مفهومة لصاحب المحل — مع تمرير الرسائل
 * العربية المنسقة من الخادم كما هي (لأنها مكتوبة له أصلاً).
 *
 * القاعدة الذهبية: لا يرى التاجر أبداً كلمات مثل FORBIDDEN أو 429 أو stack.
 */

const DEFAULT_FALLBACK = "تعذر إتمام العملية — حاول مرة أخرى";

/** هل النص عربي بما يكفي ليُعرض مباشرة؟ */
function looksArabic(text: string): boolean {
  const letters = text.replace(/[^A-Za-z\u0600-\u06FF]/g, "");
  if (letters.length < 4) return false;
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  return arabic / letters.length > 0.5;
}

type Rule = { test: RegExp; message: string };

/** مرتبة من الأخص إلى الأعم — أول تطابق يفوز. */
const RULES: Rule[] = [
  // الجلسة والصلاحيات
  {
    test: /UNAUTHED|UNAUTHORIZED|\b401\b|انتهت صلاحية الجلسة|انتهت الجلسة/i,
    message: "انتهت جلسة الدخول — سجّل الدخول مرة أخرى للمتابعة",
  },
  {
    test: /FORBIDDEN|\b403\b|صلاحية|ليس لديك/i,
    message: "ليس لديك صلاحية لهذا الإجراء — تواصل مع مدير المنشأة",
  },
  // التكرار والتعارض (idempotency)
  {
    test: /CONFLICT|\b409\b|already exists|duplicate|مكرر|منفذ مسبق|لا حاجة لإعادته/i,
    message: "تم تنفيذ هذا الإجراء مسبقاً — لا حاجة لإعادته",
  },
  // الضغط والحدود
  {
    test: /TOO_MANY_REQUESTS|\b429\b|rate.?limit|طلبات كثيرة/i,
    message: "طلبات كثيرة في وقت قصير — انتظر لحظات ثم حاول مجدداً",
  },
  // غير موجود
  {
    test: /NOT_FOUND|\b404\b|غير موجود|لم يتم العثور/i,
    message: "السجل المطلوب غير موجود — ربما حُذف أو نُقل",
  },
  // عزل المنشآت
  {
    test: /CROSS_TENANT|tenant|منشأة أخرى|غير مصرح/i,
    message: "هذا السجل يتبع منشأة أخرى — لا يمكن الوصول إليه",
  },
  // المخزون
  {
    test: /insufficient.?stock|out of stock|الكمية.*(غير متوفر|لا تكفي)|رصيد.*سالب|نفد/i,
    message: "الكمية المطلوبة غير متوفرة في المخزون — راجع الرصيد أولاً",
  },
  // الفترات المالية
  {
    test: /period.*(closed|locked)|الفترة.*مغلقة|فترة مغلقة/i,
    message: "الفترة المالية مغلقة — لا يمكن الترحيل إليها، تواصل مع المحاسب",
  },
  // التحقق من المدخلات
  {
    test: /BAD_REQUEST|\b400\b|ZodError|validation|invalid|تحقق من البيانات|مطلوب/i,
    message: "تحقق من البيانات المدخلة — بعض الحقول ناقصة أو غير صحيحة",
  },
  // الشبكة والاتصال
  {
    test: /Failed to fetch|NetworkError|network|timeout|timed out|ECONN|OFFLINE|انقطع الاتصال|لا يوجد اتصال/i,
    message: "انقطع الاتصال بالخدمة — تحقق من الإنترنت وحاول مجدداً",
  },
  // الخادم وقاعدة البيانات
  {
    test: /DATABASE_UNAVAILABLE|INTERNAL_SERVER_ERROR|\b50[03]\b|UNAVAILABLE|قاعدة البيانات|عطل فني/i,
    message: "الخدمة مشغولة الآن — حاول مجدداً بعد قليل",
  },
];

function extractRaw(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const withData = error as Error & {
      data?: { code?: string; message?: string };
      shape?: { message?: string; data?: { code?: string } };
    };
    const code = withData.data?.code ?? withData.shape?.data?.code ?? "";
    const shaped = withData.data?.message ?? withData.shape?.message ?? "";
    return [code, error.message, shaped].filter(Boolean).join(" ");
  }
  try {
    const obj = error as Record<string, unknown>;
    const parts = [obj.code, obj.message].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    if (parts.length) return parts.join(" ");
    return JSON.stringify(error).slice(0, 300);
  } catch {
    return String(error).slice(0, 300);
  }
}

/**
 * ترجم أي خطأ إلى رسالة تاجر ودية.
 * - الرسائل العربية القصيرة من الخادم تُمرَّر كما هي.
 * - الرموز التقنية تُطابَق على RULES.
 * - أي شيء آخر → fallback (مع تسجيله للمطور في الكونسول).
 */
export function friendlyError(
  error: unknown,
  fallback: string = DEFAULT_FALLBACK
): string {
  const raw = extractRaw(error).trim();
  if (!raw) return fallback;
  // رسالة خادم عربية مختصرة ومنسقة؟ اعرضها مباشرة.
  if (raw.length <= 220 && looksArabic(raw)) return raw;
  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.message;
  }
  if (typeof console !== "undefined" && import.meta.env?.DEV) {
    console.warn("[friendlyError] unmapped:", raw.slice(0, 200));
  }
  return fallback;
}
