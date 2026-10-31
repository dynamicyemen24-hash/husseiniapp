/**
 * withViewTransition — تطبيق انتقالات العرض (View Transitions API) عند تغيير
 * المسار في SPA، بأسلوب progressive enhancement:
 *  - المتصفحات الداعمة (Chrome/Edge 111+) تحصل على انسياب بصري راقٍ بين الصفحات.
 *  - المتصفحات غير الداعمة أو مع تفضيل «تقليل الحركة» تنفّذ التحديث مباشرة.
 * حركة بحتة: لا تغيير أي منطق تنقّل.
 */
type DocumentWithVT = Document & {
  startViewTransition?: (updateCallback: () => void) => unknown;
};

export function withViewTransition(update: () => void): void {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  const doc = document as DocumentWithVT;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
