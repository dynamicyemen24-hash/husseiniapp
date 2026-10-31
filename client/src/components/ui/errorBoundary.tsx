/**
 * Global Error Boundary - WCAG 2.1 compliant error handling.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private recoveryTimer?: number;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Keep diagnostics in monitoring/console, never in the customer's UI.
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary]", error, errorInfo);
    }

    // Recover transparently from a stale chunk or a transient render fault.
    // One automatic retry per tab is enough to avoid loops while keeping the
    // normal experience free from technical error screens.
    try {
      const key = "alh-recovery-attempt";
      const attempted = sessionStorage.getItem(key) === "1";
      if (!attempted) {
        sessionStorage.setItem(key, "1");
        this.recoveryTimer = window.setTimeout(() => {
          window.location.reload();
        }, 350);
      }
    } catch {
      // Storage may be disabled; the quiet fallback below remains available.
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) window.clearTimeout(this.recoveryTimer);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="status"
          aria-live="polite"
          dir="rtl"
          className={cn(
            "flex min-h-[300px] flex-col items-center justify-center p-8 text-center",
            "rounded-xl border border-border/60 bg-card shadow-sm"
          )}
        >
          <div className="grid size-12 place-items-center rounded-full bg-brand/10">
            <RefreshCw className="size-5 animate-spin text-brand" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            نعيد ترتيب مساحة العمل
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            لحظات ونعود بك إلى تجربة مستقرة.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            متابعة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline Error Display - For form validation and API errors.
 */
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700",
        className
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
