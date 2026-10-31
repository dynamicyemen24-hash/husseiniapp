/**
 * Loading Spinner and Status Components
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({
  size = 24,
  className,
  label = "جاري التحميل",
}: SpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label={label}
    >
      <RefreshCw
        className="animate-spin"
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Inline Loading indicator for button states.
 */
interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "outline";
}

export function LoadingButton({
  loading,
  children,
  onClick,
  className,
  variant = "default",
}: LoadingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all",
        loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90",
        variant === "default"
          ? "bg-brand text-brand-foreground hover:bg-brand-600"
          : "border border-neutral-300 bg-card hover:bg-neutral-50"
      )}
      aria-busy={loading}
    >
      {loading && <RefreshCw className="mr-2 size-4 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * Status Strip Component with semantic colors.
 */
interface StatusStripProps {
  status: "info" | "success" | "warning" | "error" | "neutral";
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function StatusStrip({
  status,
  children,
  className,
  pulse = false,
}: StatusStripProps) {
  const statusStyles = {
    info: "bg-info-50 text-info-700 border-info-200",
    success: "bg-success-50 text-success-700 border-success-200",
    warning: "bg-warning-50 text-warning-700 border-warning-200",
    error: "bg-error-50 text-error-700 border-error-200",
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        pulse && "animate-pulse",
        className
      )}
    >
      {children}
    </span>
  );
}
