/**
 * Checkbox — Primitive selection primitive
 * Exports Checkbox + Radio + Switch with one shared contract:
 * visible label, helper/error text, 44px touch target on coarse pointers,
 * keyboard-first (Space/Enter) and screen-reader announcements.
 */

import React, { forwardRef, type InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Text } from './Text';

const boxVariants = cva(
  'flex shrink-0 items-center justify-center rounded-sm border transition-all duration-100 ' +
    'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-target',
  {
    variants: {
      checked: {
        true: 'bg-brand border-brand text-surface',
        false: 'bg-surface border-hairline text-transparent hover:border-brand',
      },
      invalid: {
        true: 'border-err',
        false: '',
      },
      size: {
        sm: 'h-4 w-4 min-h-4 min-w-4',
        md: 'h-5 w-5 min-h-5 min-w-5',
        lg: 'h-6 w-6 min-h-6 min-w-6',
      },
    },
    defaultVariants: { checked: false, invalid: false, size: 'md' },
  }
);

export interface CheckboxProps
  // `checked` is redeclared as a controlled boolean below (the DOM
  // InputHTMLAttributes checked is optional and would collide — TS2320).
  extends
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'checked'>,
    VariantProps<typeof boxVariants> {
  label?: string;
  hint?: string;
  error?: string;
  testId?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      hint,
      error,
      checked,
      defaultChecked,
      disabled,
      required,
      id,
      size = 'md',
      invalid,
      className,
      testId,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || `checkbox-${React.useId()}`;
    const isChecked = checked ?? defaultChecked ?? false;
    const isInvalid = invalid ?? !!error;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <span className={twMerge('inline-flex items-start gap-2', className)} data-testid={testId}>
        <span className={twMerge(boxVariants({ checked: !!isChecked, invalid: isInvalid, size }))}>
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked ?? undefined}
            defaultChecked={defaultChecked ?? undefined}
            disabled={disabled}
            required={required}
            onChange={onChange}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={!!error}
            className="sr-only"
            {...props}
          />
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none"
          >
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {(label || hint || error) && (
          <span className="flex flex-col gap-0.5">
            {label && (
              <Text
                as="label"
                htmlFor={inputId}
                variant="labelSm"
                color={error ? 'error' : 'secondary'}
              >
                {label}
                {required && (
                  <Text color="error" className="ms-1">
                    *
                  </Text>
                )}
              </Text>
            )}
            {(hint || error) && (
              <Text
                variant="captionSm"
                color={error ? 'error' : 'tertiary'}
                role={error ? 'alert' : undefined}
              >
                {error || hint}
              </Text>
            )}
          </span>
        )}
      </span>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// Radio — single-choice circle in the same contract.
export interface RadioProps extends Omit<CheckboxProps, 'checked' | 'defaultChecked' | 'size'> {
  checked?: boolean;
  defaultChecked?: boolean;
  value?: string;
  name?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      hint,
      error,
      checked,
      defaultChecked,
      disabled,
      required,
      id,
      name,
      value,
      className,
      testId,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || `radio-${React.useId()}`;
    const isChecked = checked ?? defaultChecked ?? false;
    return (
      <span className={twMerge('inline-flex items-start gap-2', className)} data-testid={testId}>
        <span
          className={twMerge(
            'flex shrink-0 h-5 w-5 items-center justify-center rounded-full border transition-all duration-100 cursor-pointer',
            'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2',
            isChecked ? 'border-brand' : 'border-hairline hover:border-brand bg-surface',
            error && 'border-err',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={ref}
            id={inputId}
            type="radio"
            name={name}
            value={value}
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            required={required}
            onChange={onChange}
            aria-invalid={!!error}
            className="sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={twMerge(
              'h-2.5 w-2.5 rounded-full',
              isChecked ? 'bg-brand' : 'bg-transparent'
            )}
          />
        </span>
        {(label || hint || error) && (
          <span className="flex flex-col gap-0.5">
            {label && (
              <Text
                as="label"
                htmlFor={inputId}
                variant="labelSm"
                color={error ? 'error' : 'secondary'}
              >
                {label}
              </Text>
            )}
            {(hint || error) && (
              <Text
                variant="captionSm"
                color={error ? 'error' : 'tertiary'}
                role={error ? 'alert' : undefined}
              >
                {error || hint}
              </Text>
            )}
          </span>
        )}
      </span>
    );
  }
);
Radio.displayName = 'Radio';

// Switch — on/off toggle for settings, printers, offline mode.
export interface SwitchProps extends Omit<CheckboxProps, 'size'> {
  size?: 'sm' | 'md';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      hint,
      checked,
      defaultChecked,
      disabled,
      id,
      size: _size,
      className,
      testId,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || `switch-${React.useId()}`;
    const isChecked = checked ?? defaultChecked ?? false;
    return (
      <span className={twMerge('inline-flex items-center gap-2', className)} data-testid={testId}>
        <span
          className={twMerge(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer',
            'focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2',
            isChecked ? 'bg-brand' : 'bg-subtle border border-hairline',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            role="switch"
            aria-checked={!!isChecked}
            checked={checked ?? undefined}
            defaultChecked={defaultChecked ?? undefined}
            disabled={disabled}
            onChange={onChange}
            className="sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={twMerge(
              'inline-block h-4 w-4 rounded-full bg-surface shadow transition-transform duration-200',
              isChecked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-1 rtl:-translate-x-1'
            )}
          />
        </span>
        {label && (
          <Text as="label" htmlFor={inputId} variant="labelSm" color="secondary">
            {label}
          </Text>
        )}
        {hint && (
          <Text variant="captionSm" color="tertiary">
            {hint}
          </Text>
        )}
      </span>
    );
  }
);
Switch.displayName = 'Switch';
