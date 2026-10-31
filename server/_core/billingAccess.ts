/**
 * billingAccess — طبقة "لا يتوقف العمل أبداً" فوق دورة الاشتراك.
 *
 * الفلسفة (جاذبية العملاء + استمرارية الأعمال):
 *   انتهاء الاشتراك ≠ إيقاف النظام.
 *   - الدورة النشطة: صلاحيات كاملة.
 *   - مهلة سماح (graceDays): صلاحيات كاملة (قابلة للضبط) مع لافتة ترحيبية.
 *   - تجاوز المهلة: تُقيَّد ميزات غير حرجة فقط (تصدير، ZATCA، API، إضافة
 *     مستخدمين…) بينما تبقى العمليات اليومية والاستعلام متاحة دائماً.
 *   - القراءة فقط بعد الحد الأقصى للتجاوز (maxOverdueDays) — البيانات محفوظة
 *     ومرئية، والإيقاف التام يحدث فقط بطلب صريح من العميل.
 *
 * `resolveAccess` دالة نقية قابلة للاختبار بدون قاعدة بيانات؛ أما `enforceFeature`
 * فتجلب الحالة والسياسة من DB مع ذاكرة قصيرة (60 ثانية).
 */

import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  settings,
  subscriptionPolicies,
  tenantSubscriptions,
  type SubscriptionPolicy,
} from "../../drizzle/schema";

export type AccessLevel = "full" | "restricted" | "readonly" | "blocked";

export type AccessBanner = {
  kind: "info" | "warning" | "urgent";
  titleAr: string;
  messageAr: string;
};

export type AccessDecision = {
  level: AccessLevel;
  restrictedFeatures: string[];
  banner: AccessBanner | null;
  daysLeft: number | null;
};

/** كتالوج الميزات القابلة للتقييد (تظهر بأسمائها العربية في الواجهات). */
export const FEATURE_CATALOG: Record<string, string> = {
  exports: "تصدير التقارير (PDF/Excel)",
  zatca: "الفوترة الإلكترونية (ZATCA)",
  api_keys: "مفاتيح API والتكامل الخارجي",
  ai_assistant: "المساعد الذكي (إلياس)",
  add_user: "إضافة مستخدمين جدد",
  add_branch: "إضافة فروع جديدة",
  backups: "النسخ الاحتياطي السحابي",
  advanced_modules: "الوحدات المتقدمة (مشاريع/موارد بشرية)",
};

export const DEFAULT_RESTRICTED_FEATURES = [
  "exports",
  "zatca",
  "api_keys",
  "ai_assistant",
  "add_user",
  "add_branch",
  "backups",
];

/** الميزات التي لا تُقيَّد أبداً — العمليات اليومية للحفاظ على استمرارية العمل. */
export const NEVER_RESTRICTED = new Set([
  "daily_sales",
  "daily_purchases",
  "view_reports",
  "journal_entries",
]);

export const DEFAULT_POLICY: Pick<
  SubscriptionPolicy,
  | "trialDays"
  | "graceDays"
  | "graceFullAccess"
  | "maxOverdueDays"
  | "restrictedFeatures"
  | "dunningReminderDays"
> = {
  trialDays: 14,
  graceDays: 30,
  graceFullAccess: true,
  maxOverdueDays: 120,
  restrictedFeatures: DEFAULT_RESTRICTED_FEATURES,
  dunningReminderDays: [7, 3, 1, 0, -3, -7],
};

type ResolveInput = {
  status: string | null | undefined;
  /** نهاية الدورة الحالية للاشتراك المدفوع (null = غير محدد → يعامل كمهلة). */
  periodEnd: Date | string | null | undefined;
  policy?: Partial<
    Pick<
      SubscriptionPolicy,
      "graceDays" | "graceFullAccess" | "maxOverdueDays" | "restrictedFeatures"
    >
  >;
};

const DAY_MS = 86_400_000;

/**
 * دالة نقية: تحوّل حالة الاشتراك إلى قرار وصول مع رسالة عربية مناسبة.
 * - active + دورة سارية → full
 * - تجاوز نهاية الدورة خلال graceDays → full (إن graceFullAccess) أو restricted
 * - تجاوز graceDays → restricted (قيود على ميزات غير حرجة فقط)
 * - تجاوز graceDays + maxOverdueDays → readonly (قراءة فقط، لا حجب)
 * - suspended (بطلب العميل الصريح فقط) → blocked
 */
export function resolveAccess(
  input: ResolveInput,
  now: Date = new Date()
): AccessDecision {
  const graceDays = Math.max(
    0,
    input.policy?.graceDays ?? DEFAULT_POLICY.graceDays
  );
  const maxOverdue = Math.max(
    graceDays,
    input.policy?.maxOverdueDays ?? DEFAULT_POLICY.maxOverdueDays
  );
  const graceFullAccess =
    input.policy?.graceFullAccess ?? DEFAULT_POLICY.graceFullAccess;
  const restricted =
    (input.policy?.restrictedFeatures as string[] | null) ??
    DEFAULT_RESTRICTED_FEATURES;

  const status = input.status ?? "trial";
  const end = input.periodEnd ? new Date(input.periodEnd) : null;

  if (status === "suspended") {
    return {
      level: "blocked",
      restrictedFeatures: [],
      banner: {
        kind: "urgent",
        titleAr: "الاشتراك موقوف بطلبكم",
        messageAr:
          "بياناتكم محفوظة بالكامل. تواصلوا مع الدعم لإعادة التفعيل والاستمرار فوراً.",
      },
      daysLeft: null,
    };
  }

  // دورة سارية أو نهاية غير محددة → صلاحيات كاملة.
  if (!end || end.getTime() > now.getTime()) {
    const daysLeft = end
      ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
      : null;
    const banner =
      status === "trial" && daysLeft !== null
        ? {
            kind: "info" as const,
            titleAr: `تبقّى ${daysLeft} يوماً من فترة التجربة`,
            messageAr:
              "جميع الوحدات مفعّلة بدون بطاقة ائتمان. فعّلوا الاشتراك في الوقت المناسب — ولن يتوقف عملكم بعده أبداً.",
          }
        : status === "active" && daysLeft !== null && daysLeft <= 7
          ? {
              kind: "info" as const,
              titleAr: "تنبيه ودي: الدورة تنتهي قريباً",
              messageAr:
                "جدّدوا الاشتراك من صفحة الفوترة — وبعدها يستمر نظامكم بالعمل خلال مهلة مرنة بدون أي انقطاع.",
            }
          : null;
    return { level: "full", restrictedFeatures: [], banner, daysLeft };
  }

  // انتهت الدورة → عدّاد التجاوز.
  const overdueDays = Math.floor((now.getTime() - end.getTime()) / DAY_MS);

  if (overdueDays <= graceDays) {
    if (graceFullAccess) {
      return {
        level: "full",
        restrictedFeatures: [],
        banner: {
          kind: "warning",
          titleAr: "مهلة تجديد مرنة — النظام يعمل بكامل قدرته",
          messageAr: `متبقٍ ${graceDays - overdueDays + 1} يوماً من المهلة المجانية. أعمالكم مستمرة بدون أي قيود، وجدّدوا على راحتكم.`,
        },
        daysLeft: graceDays - overdueDays,
      };
    }
    return {
      level: "restricted",
      restrictedFeatures: restricted,
      banner: {
        kind: "warning",
        titleAr: "مهلة تجديد — بعض الميزات متأجلة مؤقتاً",
        messageAr:
          "عملياتكم اليومية مستمرة كالمعتاد؛ فقط بعض الميزات المتقدمة تنتظر التجديد.",
      },
      daysLeft: graceDays - overdueDays,
    };
  }

  if (overdueDays <= maxOverdue) {
    return {
      level: "restricted",
      restrictedFeatures: restricted,
      banner: {
        kind: "warning",
        titleAr: "النظام يعمل — بعض الميزات متأجلة",
        messageAr:
          "العمليات اليومية والاستعلام متاحان دائماً. جدّدوا الاشتراك لإعادة تفعيل: التصدير، الفوترة الإلكترونية، التكاملات، والميزات المتقدمة.",
      },
      daysLeft: maxOverdue - overdueDays,
    };
  }

  return {
    level: "readonly",
    restrictedFeatures: restricted,
    banner: {
      kind: "urgent",
      titleAr: "وضع القراءة الآمن",
      messageAr:
        "بياناتكم كاملة ومرئية وآمنة. لإعادة التسجيل والتصدير، فعّلوا الاشتراك أو تواصلوا مع الدعم.",
    },
    daysLeft: 0,
  };
}

// ── Cached policy (60s) ─────────────────────────────────────────────

let policyCache: { policy: typeof DEFAULT_POLICY; expiresAt: number } | null =
  null;

/** Test helper. */
export function resetPolicyCache() {
  policyCache = null;
}

export async function getActivePolicy(): Promise<typeof DEFAULT_POLICY> {
  const now = Date.now();
  if (policyCache && policyCache.expiresAt > now) return policyCache.policy;

  const db = await getDb();
  let policy = DEFAULT_POLICY;
  if (db) {
    try {
      const rows = await db
        .select()
        .from(subscriptionPolicies)
        .where(eq(subscriptionPolicies.code, "default"))
        .limit(1);
      const row = rows[0];
      if (row) {
        policy = {
          trialDays: row.trialDays,
          graceDays: row.graceDays,
          graceFullAccess: row.graceFullAccess,
          maxOverdueDays: row.maxOverdueDays,
          restrictedFeatures:
            (row.restrictedFeatures as string[] | null) ??
            DEFAULT_RESTRICTED_FEATURES,
          dunningReminderDays:
            (row.dunningReminderDays as number[] | null) ??
            DEFAULT_POLICY.dunningReminderDays,
        };
      }
    } catch {
      // جدول السياسات غير مُهيأ بعد → الافتراضية.
    }
  }
  policyCache = { policy, expiresAt: now + 60_000 };
  return policy;
}

/**
 * يرمي FORBIDDEN فقط عندما تكون الميزة مقيّدة فعلاً. لا يقيّد أبداً
 * ميزات NEVER_RESTRICTED (العمليات اليومية).
 */
export async function enforceFeature(
  tenantId: number,
  feature: string
): Promise<AccessDecision> {
  const db = await getDb();
  const statusRows = db
    ? await db
        .select({
          subscriptionStatus: settings.subscriptionStatus,
          trialEndsAt: settings.trialEndsAt,
        })
        .from(settings)
        .where(eq(settings.tenantId, tenantId))
        .limit(1)
    : [];
  const subRows = db
    ? await db
        .select({ currentPeriodEnd: tenantSubscriptions.currentPeriodEnd })
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tenantId))
        .orderBy(tenantSubscriptions.id)
        .limit(1)
    : [];

  const decision = resolveAccess(
    {
      status: statusRows[0]?.subscriptionStatus,
      periodEnd: subRows[0]?.currentPeriodEnd ?? statusRows[0]?.trialEndsAt,
      policy: await getActivePolicy(),
    },
    new Date()
  );

  if (decision.level === "blocked") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "SUBSCRIPTION_SUSPENDED: الاشتراك موقوف بطلبكم — تواصلوا مع الدعم لإعادة التفعيل",
    });
  }

  if (
    decision.level !== "full" &&
    decision.restrictedFeatures.includes(feature) &&
    !NEVER_RESTRICTED.has(feature)
  ) {
    const label = FEATURE_CATALOG[feature] ?? feature;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `FEATURE_RESTRICTED: «${label}» متأجلة مؤقتاً حتى تجديد الاشتراك — عملياتكم اليومية مستمرة كالمعتاد، وجدّدوا من صفحة «الاشتراك والفوترة».`,
    });
  }

  return decision;
}
