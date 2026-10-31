/**
 * Input — Primitive form input component
 * Comprehensive input system with validation, icons, and states.
 * Replaces: input, textarea, select (for native)
 */

import React, { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Box } from './Box';
import { Text } from './Text';
import { Button } from './Button';

const inputVariants = cva(
  'w-full transition-all duration-fast ease-standard-decelerate ' +
    'placeholder:text-content-tertiary ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-background-tertiary-DEFAULT ' +
    'readonly:bg-background-tertiary-DEFAULT readonly:cursor-default ' +
    'selection:bg-accent-primary-light selection:text-accent-primary-DEFAULT',
  {
    variants: {
      variant: {
        default:
          'bg-background-primary-DEFAULT border border-border-primary-DEFAULT ' +
          'hover:border-border-primary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        filled:
          'bg-background-tertiary-DEFAULT border border-transparent ' +
          'hover:bg-background-tertiary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        outlined:
          'bg-transparent border-2 border-border-primary-DEFAULT ' +
          'hover:border-border-primary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        ghost:
          'bg-transparent border border-transparent ' +
          'hover:bg-background-tertiary-DEFAULT ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        error:
          'bg-background-primary-DEFAULT border border-status-negative-DEFAULT ' +
          'hover:border-status-negative-hover ' +
          'focus-visible:ring-status-negative-DEFAULT/20 focus-visible:border-status-negative-DEFAULT ' +
          'text-content-primary',
        success:
          'bg-background-primary-DEFAULT border border-status-positive-DEFAULT ' +
          'hover:border-status-positive-hover ' +
          'focus-visible:ring-status-positive-DEFAULT/20 focus-visible:border-status-positive-DEFAULT ' +
          'text-content-primary',
      },
      size: {
        xs: 'px-2.5 py-1.5 text-body-xs rounded-xs min-h-[28px]',
        sm: 'px-3 py-2 text-body-sm rounded-sm min-h-[32px]',
        md: 'px-4 py-2.5 text-body-md rounded-md min-h-[40px]',
        lg: 'px-5 py-3 text-body-lg rounded-lg min-h-[48px]',
        xl: 'px-6 py-4 text-title-sm rounded-xl min-h-[56px]',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    compoundVariants: [
      { variant: 'error', size: 'xs', className: 'text-body-xs' },
      { variant: 'success', size: 'xs', className: 'text-body-xs' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: true,
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof inputVariants> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  showPasswordToggle?: boolean;
  clearable?: boolean;
  testId?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      leftElement,
      rightElement,
      showPasswordToggle = false,
      clearable = false,
      variant = 'default',
      size = 'md',
      disabled,
      readOnly,
      required,
      id,
      className,
      containerClassName,
      testId,
      onChange,
      onBlur,
      onFocus,
      value,
      defaultValue,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(type === 'password');
    const [hasValue, setHasValue] = React.useState(!!(value ?? defaultValue));
    const [focused, setFocused] = React.useState(false);
    const inputId = id || `input-${React.useId()}`;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    React.useEffect(() => {
      setHasValue(!!(value ?? defaultValue));
    }, [value, defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      onChange?.(e);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange?.({
        target: { name: inputId, value: '', type },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
      setHasValue(false);
      if (ref && typeof ref === 'object' && 'current' in ref) {
        (ref as React.RefObject<HTMLInputElement | null>).current?.focus();
      }
    };

    const handlePasswordToggle = () => {
      setShowPassword(!showPassword);
    };

    const isError = variant === 'error' || !!error;
    const isSuccess = variant === 'success';

    return (
      <Box
        display="flex"
        flexDirection="col"
        gap={2}
        className={containerClassName}
        data-testid={testId}
      >
        {label && (
          <Text
            as="label"
            htmlFor={inputId}
            variant="labelSm"
            color={isError ? 'error' : isSuccess ? 'success' : focused ? 'primary' : 'secondary'}
            className={twMerge('transition-colors', label === '' && 'sr-only')}
          >
            {label}
            {required && (
              <Text color="error" className="ml-1">
                *
              </Text>
            )}
          </Text>
        )}

        <Box
          display="flex"
          alignItems="center"
          position="relative"
          className={twMerge('group', leftElement && 'pl-0', rightElement && 'pr-0')}
        >
          {leftElement && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="absolute"
              left={3}
              top={0}
              bottom={0}
              width="auto"
              pointerEvents="none"
              className="text-content-tertiary"
            >
              {leftElement}
            </Box>
          )}

          {leftIcon && !leftElement && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="absolute"
              left={3}
              top={0}
              bottom={0}
              width="auto"
              pointerEvents="none"
              className={twMerge('text-content-tertiary', hasValue && 'opacity-60')}
            >
              {leftIcon}
            </Box>
          )}

          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : type}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            aria-describedby={describedBy}
            aria-invalid={isError}
            aria-errormessage={errorId}
            aria-required={required}
            className={twMerge(
              inputVariants({ variant, size }),
              'bg-background-primary-DEFAULT',
              leftElement && 'pl-10',
              leftIcon && !leftElement && 'pl-10',
              (rightIcon || rightElement || showPasswordToggle || clearable) && 'pr-10',
              className
            )}
            {...props}
          />

          {rightElement && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="absolute"
              right={3}
              top={0}
              bottom={0}
              width="auto"
              pointerEvents="none"
              className="text-content-tertiary"
            >
              {rightElement}
            </Box>
          )}

          {clearable && hasValue && !disabled && !readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={handleClear}
              aria-label="Clear input"
              style={{
                position: 'absolute',
                insetInlineEnd: rightElement ? 36 : rightIcon || showPasswordToggle ? 32 : 3,
              }}
              className="text-content-tertiary hover:text-content-primary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          )}

          {showPasswordToggle && (
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              onClick={handlePasswordToggle}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                insetInlineEnd: clearable && hasValue ? 36 : rightElement ? 36 : rightIcon ? 32 : 3,
              }}
              className="text-content-tertiary hover:text-content-primary"
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M1 1L15 15M9.5 5.5C11.433 5.5 13 7.067 13 9C13 10.933 11.433 12.5 9.5 12.5C7.567 12.5 6 10.933 6 9C6 7.067 7.567 5.5 9.5 5.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4.5 11.5L6.5 9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M1 1L15 15M3.5 9.5C4.32843 8.08579 5.5 7 7 7C8.5 7 9.67157 8.08579 10.5 9.5M10.5 9.5C11.3284 10.9142 11.5 12.5 11.5 12.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </Button>
          )}

          {rightIcon && !rightElement && !showPasswordToggle && !clearable && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="absolute"
              right={3}
              top={0}
              bottom={0}
              width="auto"
              pointerEvents="none"
              className={twMerge('text-content-tertiary', hasValue && 'opacity-60')}
            >
              {rightIcon}
            </Box>
          )}
        </Box>

        {(hint || error) && (
          <Text
            id={error ? errorId : hintId}
            variant="captionSm"
            color={error ? 'error' : hint ? 'tertiary' : 'success'}
            className="transition-colors"
            role={error ? 'alert' : undefined}
            aria-live={error ? 'polite' : undefined}
          >
            {error || hint}
          </Text>
        )}
      </Box>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
const textareaVariants = cva(
  'w-full resize-y min-h-[80px] transition-all duration-fast ease-standard-decelerate ' +
    'placeholder:text-content-tertiary ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-background-tertiary-DEFAULT ' +
    'readonly:bg-background-tertiary-DEFAULT readonly:cursor-default ' +
    'selection:bg-accent-primary-light selection:text-accent-primary-DEFAULT',
  {
    variants: {
      variant: {
        default:
          'bg-background-primary-DEFAULT border border-border-primary-DEFAULT ' +
          'hover:border-border-primary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        filled:
          'bg-background-tertiary-DEFAULT border border-transparent ' +
          'hover:bg-background-tertiary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        outlined:
          'bg-transparent border-2 border-border-primary-DEFAULT ' +
          'hover:border-border-primary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        error:
          'bg-background-primary-DEFAULT border border-status-negative-DEFAULT ' +
          'hover:border-status-negative-hover ' +
          'focus-visible:ring-status-negative-DEFAULT/20 focus-visible:border-status-negative-DEFAULT ' +
          'text-content-primary',
        success:
          'bg-background-primary-DEFAULT border border-status-positive-DEFAULT ' +
          'hover:border-status-positive-hover ' +
          'focus-visible:ring-status-positive-DEFAULT/20 focus-visible:border-status-positive-DEFAULT ' +
          'text-content-primary',
      },
      size: {
        sm: 'px-3 py-2 text-body-sm rounded-sm',
        md: 'px-4 py-2.5 text-body-md rounded-md',
        lg: 'px-5 py-3 text-body-lg rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface TextareaProps
  extends
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  hint?: string;
  error?: string;
  minRows?: number;
  maxRows?: number;
  autoResize?: boolean;
  testId?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      variant = 'default',
      size = 'md',
      disabled,
      readOnly,
      required,
      id,
      minRows = 3,
      maxRows,
      autoResize = true,
      className,
      containerClassName,
      testId,
      onChange,
      onBlur,
      onFocus,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false);
    const textareaId = id || `textarea-${React.useId()}`;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
    };

    const isError = variant === 'error' || !!error;

    return (
      <Box
        display="flex"
        flexDirection="col"
        gap={2}
        className={containerClassName}
        data-testid={testId}
      >
        {label && (
          <Text
            as="label"
            htmlFor={textareaId}
            variant="labelSm"
            color={isError ? 'error' : focused ? 'primary' : 'secondary'}
            className={twMerge('transition-colors', label === '' && 'sr-only')}
          >
            {label}
            {required && (
              <Text color="error" className="ml-1">
                *
              </Text>
            )}
          </Text>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          aria-describedby={describedBy}
          aria-invalid={isError}
          aria-errormessage={errorId}
          aria-required={required}
          rows={minRows}
          style={{ maxHeight: maxRows ? `${maxRows * 1.5}rem` : undefined }}
          className={twMerge(
            textareaVariants({ variant, size }),
            'bg-background-primary-DEFAULT',
            autoResize && 'resize-y',
            className
          )}
          {...props}
        />

        {(hint || error) && (
          <Text
            id={error ? errorId : hintId}
            variant="captionSm"
            color={error ? 'error' : hint ? 'tertiary' : 'success'}
            className="transition-colors"
            role={error ? 'alert' : undefined}
            aria-live={error ? 'polite' : undefined}
          >
            {error || hint}
          </Text>
        )}
      </Box>
    );
  }
);

Textarea.displayName = 'Textarea';

// InputGroup — for grouped inputs with addons
export interface InputGroupProps {
  children: React.ReactNode;
  className?: string;
  testId?: string;
}

export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(
  ({ children, className, testId }, ref) => (
    <Box ref={ref} display="flex" className={twMerge('w-full', className)} data-testid={testId}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement<{ className?: string }>(child)) return child;
        return React.cloneElement(child, {
          className: twMerge(
            child.props.className,
            index === 0 ? 'rounded-r-none' : '',
            index === React.Children.count(children) - 1 ? 'rounded-l-none' : '',
            index > 0 && index < React.Children.count(children) - 1 ? 'rounded-none' : ''
          ),
        });
      })}
    </Box>
  )
);
InputGroup.displayName = 'InputGroup';

export interface InputGroupAddonProps {
  children: React.ReactNode;
  position?: 'before' | 'after';
  className?: string;
}

export const InputGroupAddon = forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ children, position = 'before', className }, ref) => (
    <Box
      ref={ref}
      display="flex"
      alignItems="center"
      justifyContent="center"
      paddingX={3}
      backgroundColor="background-tertiary-DEFAULT"
      borderWidth={1}
      borderColor="border-primary-DEFAULT"
      borderRadius={position === 'before' ? 'rounded-r-none' : 'rounded-l-none'}
      className={twMerge(
        'text-content-secondary whitespace-nowrap',
        position === 'before' ? 'border-r-0' : 'border-l-0',
        className
      )}
    >
      {children}
    </Box>
  )
);
InputGroupAddon.displayName = 'InputGroupAddon';
