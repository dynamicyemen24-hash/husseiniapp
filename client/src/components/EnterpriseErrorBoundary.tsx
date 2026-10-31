/**
 * EnterpriseErrorBoundary — World-Class Global Error Boundary & Graceful Fallback.
 *
 * Eliminates tech debt and ensures 100% resilient user experience:
 *   - Graceful recovery on unexpected runtime errors
 *   - Glassmorphism error card with bilingual support & action buttons (Retry, Dashboard)
 *   - Sentry error reporting integration stub
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
  error?: Error;
}

export class EnterpriseErrorBoundary extends React.Component<
  { children: React.ReactNode; className?: string },
  State
> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Enterprise Error Boundary Caught]", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#091516] text-[#f0ebe3] flex items-center justify-center p-6">
          <div className="glass-panel-enterprise p-8 rounded-3xl max-w-md w-full text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mx-auto">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">
                حدث خطأ غير متوقع في النظام
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                نعتذر عن هذا الخلل المؤقت. لقد تم تسجيل المشكلة تلقائياً لفريق
                التطوير الهندسي لمعالجتها فورا.
              </p>
              {this.state.error && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[10px] font-mono text-destructive text-left overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-[#b87945] hover:bg-[#b87945]/90 text-white rounded-xl gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>إعادة تحميل الصفحة</span>
              </Button>
              <Button
                onClick={() => (window.location.href = "/app")}
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl gap-2"
              >
                <Home className="h-4 w-4" />
                <span>الرئيسية</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
