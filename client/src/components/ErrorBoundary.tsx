import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCcw, MessageSquare, Home } from "lucide-react";
import { brand, whatsappLink } from "@/lib/brand";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

/**
 * ErrorBoundary — enterprise-grade crash recovery screen.
 *
 * Design principles (SAP-grade reliability):
 *  1. NEVER expose stack traces / internals to end users (security + trust).
 *     Technical details stay in the browser console for support engineers.
 *  2. Give the user a clear path FORWARD: retry, go home, or reach human
 *     support via WhatsApp — all one tap away.
 *  3. Generate a short error reference ID so a user can quote it to support
 *     and the engineer can match it to the console entry instantly.
 *  4. Brand-consistent dark surface — an error must still feel "ours".
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorId: null };

  static getDerivedStateFromError(error: Error): State {
    // Short, shareable reference: first 8 hex chars of a random UUID.
    const errorId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8).toUpperCase()
        : Math.random().toString(36).slice(2, 10).toUpperCase();
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Report to Sentry if available
    if (typeof window !== "undefined" && import.meta.env.VITE_SENTRY_DSN) {
      import("@sentry/react").then(Sentry => {
        Sentry.captureException(error, {
          extra: {
            componentStack: info.componentStack,
            errorId: this.state.errorId,
          },
        });
      });
    }

    // Console only — the authoritative log for engineers. The user never
    // sees internals; they see a calm recovery panel instead.
    console.error(
      `[ALHUSAINIA] Unhandled UI error${this.state.errorId ? ` (#${this.state.errorId})` : ""}:`,
      error,
      "\nComponent stack:",
      info.componentStack
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { errorId } = this.state;

    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-ink-deep px-4 py-10 font-display"
        role="alert"
        aria-live="assertive"
      >
        <div className="w-full max-w-md space-y-6 text-center text-white">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              نعتذر عن هذا الخلل المؤقت. بياناتك آمنة ومحفوظة على الخادم — جرّب
              إعادة التحميل للمتابعة من حيث توقفت.
            </p>
          </div>

          {errorId && (
            <p className="text-[11px] font-mono text-white/40" dir="ltr">
              مرجع الخطأ:{" "}
              <span className="text-brand-300 font-bold">#{errorId}</span>
              <span className="block mt-0.5 text-[10px] text-white/30">
                أرسله لفريق الدعم لتشخيص فوري
              </span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black text-xs h-11 px-6 rounded-xl transition-all hover:scale-[1.03] shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة تحميل الصفحة
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="inline-flex items-center justify-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 px-6 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" />
              العودة للرئيسية
            </button>
          </div>

          <a
            href={whatsappLink(
              `السلام عليكم ${brand.names.legalFull}، واجهت خطأ في المنصة${errorId ? ` برقم المرجع #${errorId}` : ""} وأحتاج مساعدة.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[11px] text-white/45 hover:text-brand-300 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            تواصل مع الدعم المباشر
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
