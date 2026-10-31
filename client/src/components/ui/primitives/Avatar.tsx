/**
 * Avatar — Primitive identity primitive
 * Customer / cashier / product identity with graceful image fallback
 * (initials) and every-theme contrast. Used by POS headers, customer
 * lists and the shell account menu.
 */

import React, { forwardRef, useState, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ' +
    'bg-subtle text-muted font-semibold select-none border border-hairline',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-2xs',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-16 w-16 text-xl',
      },
      status: {
        none: '',
        online: '',
        offline: '',
        busy: '',
      },
    },
    defaultVariants: { size: 'md', status: 'none' },
  }
);

const STATUS_DOT: Record<string, string> = {
  online: 'bg-ok',
  offline: 'bg-faint',
  busy: 'bg-err',
};

export interface AvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  name?: string;
  fallback?: React.ReactNode;
  testId?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    { src, alt, name = '', fallback, size = 'md', status = 'none', className, testId, ...props },
    ref
  ) => {
    const [failed, setFailed] = useState(false);
    const showImage = !!src && !failed;
    return (
      <span
        ref={ref}
        role="img"
        aria-label={alt ?? name}
        data-testid={testId}
        data-size={size}
        className={twMerge(avatarVariants({ size, status }), className)}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt ?? name}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span aria-hidden="true" className="font-display">
            {fallback ?? initialsOf(name)}
          </span>
        )}
        {status && status !== 'none' && (
          <span
            aria-hidden="true"
            className={twMerge(
              'absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-surface',
              STATUS_DOT[status]
            )}
          />
        )}
      </span>
    );
  }
);
Avatar.displayName = 'Avatar';

// AvatarGroup — stacked customer/cashier row for headers and receipts.
export function AvatarGroup({
  items,
  max = 4,
  size = 'sm',
  testId,
  className,
}: {
  items: Array<{ name: string; src?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  testId?: string;
  className?: string;
}): React.JSX.Element {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <span
      className={twMerge('inline-flex items-center -space-x-2 space-x-reverse', className)}
      data-testid={testId}
    >
      {shown.map(it => (
        <Avatar
          key={it.name}
          name={it.name}
          src={it.src}
          size={size}
          className="ring-2 ring-surface"
        />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-subtle text-xs text-muted border border-hairline ring-2 ring-surface">
          <span className="num">+{extra}</span>
        </span>
      )}
    </span>
  );
}
