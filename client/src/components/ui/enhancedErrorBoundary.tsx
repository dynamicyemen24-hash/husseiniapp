/**
 * ErrorBoundary enhanced with AI suggestions.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, Lightbulb, Wrench } from "lucide-react";
import { getAIEngine } from "@/lib/aiEngine";
import { cn } from "@/lib/utils";

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  suggestions: string[];
}

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class EnhancedErrorBoundary extends React.Component<
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      suggestions: [],
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<EnhancedErrorBoundaryState> {
    const engine = getAIEngine();
    const suggestions = engine
      .predict({ errorType: error.name, errorMessage: error.message })
      .map(s => s.predictedValue);

    return {
      hasError: true,
      error,
      suggestions: suggestions.slice(0, 3),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <motion.div
          className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border bg-card shadow-lg"
          style={{ minHeight: "400px" }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-full bg-red-50 p-4">
            <AlertTriangle className="size-10 text-red-600" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-neutral-900">
            حدث خطأ غير متوقع
          </h2>
          <p className="mt-2 text-sm text-neutral-600 max-w-md">
            {this.state.error?.message ?? "تعذر تحميل هذا المحتوى"}
          </p>

          {this.state.suggestions.length > 0 && (
            <motion.div
              className="mt-4 flex flex-col items-start gap-2 rounded-lg bg-amber-50 p-4 text-left w-full max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <Lightbulb className="size-4" />
                <span>اقتراحات ذكية</span>
              </div>
              {this.state.suggestions.map((s, i) => (
                <p
                  key={i}
                  className="text-xs text-amber-700 flex items-center gap-1"
                >
                  <Wrench className="size-3" />
                  {s}
                </p>
              ))}
            </motion.div>
          )}

          <button
            onClick={() => {
              this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                suggestions: [],
              });
              window.location.reload();
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-600"
          >
            <RefreshCw className="size-4" />
            إعادة التحميل
          </button>
        </motion.div>
      );
    }

    return this.props.children;
  }
}
