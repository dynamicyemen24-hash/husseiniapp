/**
 * Toast — Primitive notification + alert component
 * Toasts for transient sync/status signals (offline queue, saved sales);
 * Alert for inline form/page feedback with icon+label pairing.
 * Auto-dismiss respects reduced motion and screen-reader live regions.
 */

import React, { forwardRef, useEffect, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Portal } from './Portal';

const toastVariants = cva(
  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg elev-2 ' +
    'transition-all duration-200 motion-reduce:transition-none bg-surface',
  {
    variants: {
      tone: {
        neutral: 'border-hairline text-ink',
        ok: 'border-ok/30 text-ink',
        warn: 'border-warn/30 text-ink',
        err: 'border-err/30 text-ink',
        info: 'border-info/30 text-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
);

const TONE_DOT: Record<string, string> = {
  neutral: 'bg-faint',
  ok: 'bg-ok',
  warn: 'bg-warn',
  err: 'bg-err',
  info: 'bg-info',
};

export interface ToastProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof toastVariants> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  durationMs?: number;
  onClose?: () => void;
  testId?: string;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      title,
      description,
      icon,
      tone = 'neutral',
      durationMs = 5000,
      onClose,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    useEffect(() => {
      if (!durationMs || durationMs <= 0) return;
      const t = window.setTimeout(() => onClose?.(), durationMs);
      return () => window.clearTimeout(t);
    }, [durationMs, onClose]);

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        data-testid={testId}
        data-tone={tone}
        className={twMerge(toastVariants({ tone }), className)}
        {...props}
      >
        <span
          aria-hidden="true"
          className={twMerge('mt-1 h-2 w-2 rounded-full shrink-0', TONE_DOT[tone ?? 'neutral'])}
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-ink">{title}</span>
          {description && <span className="text-sm text-muted">{description}</span>}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق التنبيه"
            className="rounded-sm p-1 text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = 'Toast';

// ToastViewport — fixed stack region (bottom-start in RTL).
export function ToastViewport({
  children,
  testId,
  className,
}: {
  children: React.ReactNode;
  testId?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <Portal>
      <div
        aria-live="polite"
        data-testid={testId}
        className={twMerge(
          'pointer-events-none fixed bottom-4 start-4 z-[700] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 pb-safe',
          className
        )}
      >
        {children}
      </div>
    </Portal>
  );
}

// Alert — inline page/form feedback. Always icon + text, never color alone.
const alertVariants = cva('flex items-start gap-3 rounded-lg border p-3 text-sm', {
  variants: {
    tone: {
      neutral: 'border-hairline bg-subtle text-ink',
      ok: 'border-ok/30 bg-ok-soft text-ok-strong',
      warn: 'border-warn/30 bg-warn-soft text-warn-strong',
      err: 'border-err/30 bg-err-soft text-err-strong',
      info: 'border-info/30 bg-info-soft text-info-strong',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  testId?: string;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ title, icon, tone = 'neutral', children, onClose, className, testId, ...props }, ref) => (
    <div
      ref={ref}
      role={tone === 'err' ? 'alert' : 'status'}
      data-testid={testId}
      data-tone={tone}
      className={twMerge(alertVariants({ tone }), className)}
      {...props}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon ?? (
          <span className={twMerge('block h-2 w-2 rounded-full', TONE_DOT[tone ?? 'neutral'])} />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <span className="font-semibold">{title}</span>}
        {children && <span>{children}</span>}
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="rounded-sm p-1 opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 3L11 11M11 3L3 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
);
Alert.displayName = 'Alert';
