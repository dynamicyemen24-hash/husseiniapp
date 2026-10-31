/**
 * ThemeToggle component - Switch between light and dark themes.
 */

"use client";

import * as React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-card p-2 text-neutral-700 transition-all hover:bg-neutral-100 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      aria-label={
        isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"
      }
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="size-5 text-yellow-500" />
      ) : (
        <Moon className="size-5 text-neutral-700" />
      )}
    </button>
  );
}

/**
 * Toast notification component for user feedback.
 */

import { X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "info",
  onClose,
  duration = 5000,
}: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const typeStyles = {
    success: "bg-success-50 border-success-200 text-success-700",
    error: "bg-error-50 border-error-200 text-error-700",
    warning: "bg-warning-50 border-warning-200 text-warning-700",
    info: "bg-info-50 border-info-200 text-info-700",
  };

  const typeIcons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`inline-flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${typeStyles[type]}`}
    >
      <span className="text-lg font-bold">{typeIcons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 rounded-full p-1 hover:bg-black/5"
        aria-label="إغلاق الإشعار"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * ConfirmDialog component for user confirmation.
 */

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1040] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="rounded-xl bg-card p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-warning-50 p-3">
            <AlertTriangle className="size-6 text-warning-600" />
          </div>
          <div className="flex-1">
            <h3
              id="confirm-title"
              className="text-lg font-bold text-neutral-900"
            >
              {title}
            </h3>
            <p id="confirm-message" className="mt-2 text-sm text-neutral-600">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
