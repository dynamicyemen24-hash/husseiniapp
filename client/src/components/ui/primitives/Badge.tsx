/**
 * Badge — Primitive status/count primitive
 * Semantic ok/warn/err/info + brand + neutral. Icon+label pairing required:
 * color is never the only signal (DESIGN.md).
 */

import React, { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium whitespace-nowrap transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        brand: 'bg-brand-soft text-brand-strong',
        neutral: 'bg-subtle text-muted border border-hairline',
        ok: 'bg-ok-soft text-ok-strong',
        warn: 'bg-warn-soft text-warn-strong',
        err: 'bg-err-soft text-err-strong',
        info: 'bg-info-soft text-info-strong',
        outline: 'bg-transparent text-ink border border-hairline',
        solid: 'bg-ink text-surface',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-2xs rounded-xs min-h-[20px]',
        sm: 'px-2 py-0.5 text-xs rounded-sm min-h-[24px]',
        md: 'px-2.5 py-1 text-sm rounded-md min-h-[28px]',
      },
      pill: {
        true: 'rounded-full',
        false: '',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm', pill: true },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dotColor?: 'ok' | 'warn' | 'err' | 'info' | 'brand';
  icon?: React.ReactNode;
  testId?: string;
}

const DOT_COLORS: Record<string, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  err: 'bg-err',
  info: 'bg-info',
  brand: 'bg-brand',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'neutral',
      size = 'sm',
      pill = true,
      dotColor,
      icon,
      children,
      className,
      testId,
      ...props
    },
    ref
  ) => (
    <span
      ref={ref}
      data-testid={testId}
      data-variant={variant}
      className={twMerge(badgeVariants({ variant, size, pill }), className)}
      {...props}
    >
      {dotColor && (
        <span
          aria-hidden="true"
          className={twMerge('h-1.5 w-1.5 rounded-full shrink-0', DOT_COLORS[dotColor])}
        />
      )}
      {icon && (
        <span aria-hidden="true" className="flex-shrink-0">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
);
Badge.displayName = 'Badge';

// CountBadge — numeric bubble for carts, notifications, tabs.
export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number;
  max?: number;
  showZero?: boolean;
}

export const CountBadge = forwardRef<HTMLSpanElement, CountBadgeProps>(
  ({ count, max = 99, showZero = false, testId, ...props }, ref) => {
    if (count === 0 && !showZero) return null;
    const label = count > max ? `${max}+` : String(count);
    return (
      <Badge
        ref={ref}
        variant="err"
        size="xs"
        testId={testId}
        aria-label={`${count} عنصر`}
        {...props}
      >
        <span className="num">{label}</span>
      </Badge>
    );
  }
);
CountBadge.displayName = 'CountBadge';
