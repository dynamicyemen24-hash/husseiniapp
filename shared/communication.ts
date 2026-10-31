/**
 * shared/communication.ts
 * -------------------------
 * إعدادات التواصل والمشاركة للطلبات والتقارير (واتساب / إيميل).
 * تُخزَّن داخل `settings.communicationConfig` (JSON text) وتُحرر من
 * «الإعدادات العامة»، ويُتحكم في الاستخدام عبر صلاحيات COMMUNICATION_*.
 */

export const COMMUNICATION_CHANNELS = ["whatsapp", "email"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];

export const SHAREABLE_DOCUMENT_TYPES = [
  "purchase_order",
  "goods_receipt",
  "purchase_invoice",
  "procurement_report",
] as const;
export type ShareableDocumentType = (typeof SHAREABLE_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<ShareableDocumentType, string> = {
  purchase_order: "أمر شراء",
  goods_receipt: "سند استلام",
  purchase_invoice: "فاتورة مشتريات",
  procurement_report: "تقرير المشتريات",
};

/**
 * إعدادات التواصل القابلة للتحكم من الإعدادات العامة:
 * - whatsappEnabled / emailEnabled: تشغيل/إيقاف القناة كلياً.
 * - whatsappCountryCode: رمز الدولة للرقم الافتراضي (مثل 967 لليمن).
 * - whatsappFallbackNumber / emailFallbackTo: وجهة افتراضية عند غياب
 *   بيانات المورد.
 * - requireApprovedState: منع مشاركة المستندات غير المعتمدة
 *   (المسودات / الملغاة / غير المدفوعة حسب نوع المستند).
 */
export interface CommunicationSettings {
  whatsappEnabled: boolean;
  whatsappCountryCode: string;
  whatsappFallbackNumber: string;
  emailEnabled: boolean;
  emailFallbackTo: string;
  requireApprovedState: boolean;
}

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  whatsappEnabled: true,
  whatsappCountryCode: "967",
  whatsappFallbackNumber: "",
  emailEnabled: true,
  emailFallbackTo: "",
  requireApprovedState: false,
};

/** دمج إعدادات محفوظة جزئية/خاطئة مع القيم الافتراضية بأمان. */
export function mergeCommunicationSettings(
  raw: Partial<CommunicationSettings> | null | undefined
): CommunicationSettings {
  return {
    whatsappEnabled:
      typeof raw?.whatsappEnabled === "boolean"
        ? raw.whatsappEnabled
        : DEFAULT_COMMUNICATION_SETTINGS.whatsappEnabled,
    whatsappCountryCode:
      typeof raw?.whatsappCountryCode === "string" &&
      raw.whatsappCountryCode.trim() !== ""
        ? raw.whatsappCountryCode.trim()
        : DEFAULT_COMMUNICATION_SETTINGS.whatsappCountryCode,
    whatsappFallbackNumber:
      typeof raw?.whatsappFallbackNumber === "string"
        ? raw.whatsappFallbackNumber
        : DEFAULT_COMMUNICATION_SETTINGS.whatsappFallbackNumber,
    emailEnabled:
      typeof raw?.emailEnabled === "boolean"
        ? raw.emailEnabled
        : DEFAULT_COMMUNICATION_SETTINGS.emailEnabled,
    emailFallbackTo:
      typeof raw?.emailFallbackTo === "string"
        ? raw.emailFallbackTo
        : DEFAULT_COMMUNICATION_SETTINGS.emailFallbackTo,
    requireApprovedState:
      typeof raw?.requireApprovedState === "boolean"
        ? raw.requireApprovedState
        : DEFAULT_COMMUNICATION_SETTINGS.requireApprovedState,
  };
}

export interface ShareDocumentSummary {
  documentLabel: string;
  documentNumber?: string;
  supplierName?: string;
  dateText?: string;
  total: string | number;
  paidAmount?: string | number;
  status?: string;
  notes?: string;
  extraLines?: string[];
}

/** تنسيق الأرقام بالعربية لرسائل المشاركة. */
export function formatShareNumber(
  value: string | number | null | undefined
): string {
  const n = parseFloat(String(value ?? "0"));
  if (isNaN(n)) return "0";
  return n.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * بناء نص رسالة المشاركة (وثيقة أو تقرير) — دالة خالصة مشتركة بين
 * الخادم (مصدر الحقيقة) والواجهة (معاينة) فلا يتباين النص.
 */
export function buildShareMessage(summary: ShareDocumentSummary): string {
  const lines: string[] = [];
  lines.push(
    `${summary.documentLabel}${summary.documentNumber ? ` ${summary.documentNumber}` : ""}`
  );
  if (summary.supplierName) lines.push(`المورد: ${summary.supplierName}`);
  if (summary.dateText) lines.push(`التاريخ: ${summary.dateText}`);
  lines.push(`الإجمالي: ${formatShareNumber(summary.total)}`);
  if (summary.paidAmount !== undefined && summary.paidAmount !== null)
    lines.push(`المدفوع: ${formatShareNumber(summary.paidAmount)}`);
  if (summary.status) lines.push(`الحالة: ${summary.status}`);
  for (const extra of summary.extraLines ?? []) lines.push(extra);
  if (summary.notes) lines.push(`ملاحظات: ${summary.notes}`);
  return lines.join("\n");
}

/**
 * تطهير رقم واتساب لحالة `wa.me/<digits>`:
 * يزيل كل ما ليس رقماً، ويتعامل مع البادئات 00 / 0 / رمز الدولة.
 */
export function normalizeWhatsAppNumber(
  raw: string | null | undefined,
  countryCode: string
): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  const cc = String(countryCode ?? "").replace(/\D/g, "");
  if (!cc) return digits;
  return digits.startsWith(cc) ? digits : `${cc}${digits}`;
}
