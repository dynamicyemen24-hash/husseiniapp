/**
 * تنسيق موحّد للأرقام والعملات في الواجهة العربية —
 * أفضل ممارسة عالمية: أرقام عربية (٠-٩) + فواصل الآلاف + ريال يمني.
 *
 * يُستعمل في الصفحات العامة والتشغيلية على حد سواء لضمان اتساق العرض
 * (تاريخياً كانت بعض الصفحات تستخدم toLocaleString() الافتراضية بأرقام
 * إنجليزية بينما البعض الآخر ar-YE).
 */

/** منسِّق رقمي يمني (أرقام عربية مشرقية + فواصل). */
const nf = new Intl.NumberFormat("ar-YE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nf0 = new Intl.NumberFormat("ar-YE", {
  maximumFractionDigits: 0,
});

/** تنسيق رقمي عربي بمنزلتين عشريتين — للكميات والتفتيتات العامة. */
export function fmtNum(value: string | number | null | undefined): string {
  const n = typeof value === "number" ? value : parseFloat(value ?? "0");
  if (Number.isNaN(n)) return "٠";
  return nf.format(n);
}

/** تنسيق عدد صحيح عربي (بلا كسور) — للإحصاءات والعدادات. */
export function fmtInt(value: string | number | null | undefined): string {
  const n = typeof value === "number" ? value : parseFloat(value ?? "0");
  if (Number.isNaN(n)) return "٠";
  return nf0.format(Math.round(n));
}

/** تنسيق مبلغ نقدي بريال يمني — يُخرج "١٬٢٣٤٫٥٦ ر.ي". */
export function fmtYER(value: string | number | null | undefined): string {
  return `${fmtNum(value)} ر.ي`;
}
