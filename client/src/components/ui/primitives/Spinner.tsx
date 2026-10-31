/**
 * Spinner — Primitive loading indicator
 * Also exports Skeleton (content placeholder) and Progress (determinate bar)
 * so loading states never shift layout. Reduced-motion safe.
 */

import React, { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const spinnerVariants = cva(
  'animate-spin rounded-full border-solid border-current border-t-transparent motion-reduce:animate-none',
  {
    variants: {
      size: {
        xs: 'h-3 w-3 border-2',
        sm: 'h-4 w-4 border-2',
        md: 'h-5 w-5 border-2',
        lg: 'h-8 w-8 border-[3px]',
        xl: 'h-12 w-12 border-4',
      },
      tone: {
        brand: 'text-brand',
        inherit: 'text-current',
        inverse: 'text-surface',
        muted: 'text-muted',
      },
    },
    defaultVariants: { size: 'md', tone: 'brand' },
  }
);

export interface SpinnerProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, VariantProps<typeof spinnerVariants> {
  label?: string;
  testId?: string;
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = 'md', tone = 'brand', label = 'جارٍ التحميل', className, testId, ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      data-testid={testId}
      className={twMerge(spinnerVariants({ size, tone }), className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </span>
  )
);
Spinner.displayName = 'Spinner';

// Skeleton — stable placeholder that reserves space while data loads.
const skeletonVariants = cva('animate-pulse rounded-md bg-subtle motion-reduce:animate-none', {
  variants: {
    shape: {
      text: 'h-4 w-full',
      title: 'h-6 w-2/3',
      avatar: 'h-10 w-10 rounded-full',
      card: 'h-32 w-full',
      row: 'h-12 w-full',
    },
  },
  defaultVariants: { shape: 'text' },
});

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {
  testId?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ shape = 'text', className, testId, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid={testId}
      className={twMerge(skeletonVariants({ shape }), className)}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

export function SkeletonRows({
  rows = 3,
  testId,
}: {
  rows?: number;
  testId?: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2" data-testid={testId} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} shape="row" />
      ))}
    </div>
  );
}

// Progress — determinate bar with accessible value semantics.
export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  value: number;
  max?: number;
  label?: string;
  testId?: string;
  className?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, label, className, testId, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        data-testid={testId}
        className={twMerge('h-2 w-full overflow-hidden rounded-full bg-subtle', className)}
        {...props}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';
