/**
 * validation — تحقق دقيق للبيانات مع مرونة دولية
 * - هاتف: يقبل +967, 966, 971 مع مسافات وشرطات، ويتحقق من الطول
 * - بريد: RFC 5322 مبسط
 * - ضريبي: حسب الدولة (SA 15 رقم، AE 15، YE اختياري)
 * - اسم: لا تكرار لمسافات، طول 2-120
 */

const PHONE_PATTERNS: Record<string, RegExp> = {
  YE: /^(\+967|967|0)?\s*7[0-9]{8}$/,
  SA: /^(\+966|966|0)?\s*5[0-9]{8}$/,
  AE: /^(\+971|971|0)?\s*5[0-9]{8}$/,
  EG: /^(\+20|20|0)?\s*1[0-9]{9}$/,
  JO: /^(\+962|962|0)?\s*7[0-9]{8}$/,
  OTHER: /^\+?[0-9\s\-()]{7,20}$/,
};

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-()]/g, "");
}

export function validatePhone(
  phone: string,
  country: string = "OTHER"
): { ok: boolean; normalized: string; error?: string } {
  const n = normalizePhone(phone);
  if (!n) return { ok: false, normalized: n, error: "رقم الهاتف مطلوب" };
  const pattern = PHONE_PATTERNS[country] || PHONE_PATTERNS.OTHER;
  // مرونة: إذا كان الرقم دولي يبدأ بـ +، نقبل أي نمط دولي
  if (n.startsWith("+") && PHONE_PATTERNS.OTHER.test(phone))
    return { ok: true, normalized: n };
  if (!pattern.test(phone))
    return {
      ok: false,
      normalized: n,
      error: "صيغة الهاتف غير صحيحة لهذه الدولة",
    };
  return { ok: true, normalized: n };
}

export function validateEmail(email: string): { ok: boolean; error?: string } {
  if (!email) return { ok: true, error: undefined }; // اختياري
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email.trim())) return { ok: false, error: "البريد غير صحيح" };
  return { ok: true };
}

export function validateTaxNumber(
  tax: string,
  country: string
): { ok: boolean; error?: string } {
  if (!tax) return { ok: true, error: undefined };
  const digits = tax.replace(/\D/g, "");
  if (country === "SA" && digits.length !== 15)
    return { ok: false, error: "الرقم الضريبي السعودي 15 رقماً" };
  if (country === "AE" && digits.length !== 15)
    return { ok: false, error: "الرقم الضريبي الإماراتي 15 رقماً" };
  if (digits.length < 5) return { ok: false, error: "الرقم الضريبي قصير جداً" };
  return { ok: true };
}

export function validateName(name: string): { ok: boolean; error?: string } {
  const t = name.trim().replace(/\s+/g, " ");
  if (t.length < 2) return { ok: false, error: "الاسم قصير جداً" };
  if (t.length > 120) return { ok: false, error: "الاسم طويل جداً" };
  return { ok: true };
}
