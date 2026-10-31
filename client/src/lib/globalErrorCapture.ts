/**
 * installGlobalErrorCapture — شبكة الأمان الأخيرة خارج React.
 *
 * ErrorBoundary يلتقط أخطاء الرندر فقط؛ أما أخطاء المُعالجات غير المتزامنة
 * والوعود المرفوضة (rejections) فكانت تسقط صامتة في الإنتاج. هذا المُركِّب:
 *  - يمنح كل خطأ رقمًا مرجعيًا بنفس صيغة ErrorBoundary ليستشهد به المستخدم
 *    مع الدعم ويطابقه المهندس فورًا في الكونسول.
 *  - يحتفظ بآخر 20 خطأً في نافذة التشخيص `window.__alhDiag` لفريق الدعم
 *    دون أي تبعية خارجية أو إرسال بيانات إلى طرف ثالث (خصوصية كاملة).
 */
interface CapturedError {
  at: string;
  kind: "error" | "unhandledrejection";
  message: string;
  ref: string;
}

export function installGlobalErrorCapture(): void {
  if (typeof window === "undefined") return;

  const w = window as Window & { __alhDiag?: { errors: CapturedError[] } };
  if (w.__alhDiag) return; // تركيب مرة واحدة فقط

  const diag: { errors: CapturedError[] } = (w.__alhDiag = { errors: [] });

  const capture = (
    kind: CapturedError["kind"],
    raw: unknown,
    extra?: unknown
  ) => {
    const ref =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8).toUpperCase()
        : Math.random().toString(36).slice(2, 10).toUpperCase();
    const message =
      raw instanceof Error
        ? raw.message
        : typeof raw === "string"
          ? raw
          : JSON.stringify(raw).slice(0, 200);

    diag.errors.push({ at: new Date().toISOString(), kind, message, ref });
    // حلقة تشخيص محدودة — لا نموّ غير مقيد في الذاكرة
    if (diag.errors.length > 20) diag.errors.shift();

    console.error(`[ALHUSAINIA] Global ${kind} (#${ref}):`, raw, extra ?? "");
  };

  window.addEventListener("error", ev =>
    capture(
      "error",
      ev.error ?? ev.message,
      ev.filename ? `${ev.filename}:${ev.lineno}` : undefined
    )
  );
  window.addEventListener("unhandledrejection", ev =>
    capture("unhandledrejection", ev.reason)
  );
}
