/**
 * Button — Primitive interactive component
 * Comprehensive button system with all variants, sizes, and states.
 * Replaces: button, input[type="button"], input[type="submit"], a.button
 */

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Box } from './Box';
import { Text } from './Text';
import { Spinner } from './Spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-fast ease-standard-decelerate ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
    'active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-primary-DEFAULT text-accent-primary-onColor ' +
          'hover:bg-accent-primary-hover active:bg-accent-primary-active ' +
          'focus-visible:ring-accent-primary-DEFAULT/50 ' +
          'shadow-sm hover:shadow-md active:shadow-xs',
        secondary:
          'bg-accent-secondary-DEFAULT text-accent-secondary-onColor ' +
          'hover:bg-accent-secondary-hover active:bg-accent-secondary-active ' +
          'focus-visible:ring-accent-secondary-DEFAULT/50 ' +
          'shadow-sm hover:shadow-md active:shadow-xs',
        tertiary:
          'bg-transparent text-accent-primary-DEFAULT ' +
          'hover:bg-accent-primary-light active:bg-accent-primary-lighter ' +
          'focus-visible:ring-accent-primary-DEFAULT/50 ' +
          'shadow-none',
        ghost:
          'bg-transparent text-content-primary ' +
          'hover:bg-background-tertiary-DEFAULT active:bg-background-tertiary-hover ' +
          'focus-visible:ring-content-tertiary ' +
          'shadow-none',
        destructive:
          'bg-status-negative-DEFAULT text-status-negative-onColor ' +
          'hover:bg-status-negative-hover active:bg-status-negative-active ' +
          'focus-visible:ring-status-negative-DEFAULT/50 ' +
          'shadow-sm hover:shadow-md active:shadow-xs',
        outline:
          'bg-transparent border border-border-primary-DEFAULT text-content-primary ' +
          'hover:bg-background-tertiary-DEFAULT active:bg-background-tertiary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/50 ' +
          'shadow-none',
        outlineDestructive:
          'bg-transparent border border-status-negative-DEFAULT text-status-negative-DEFAULT ' +
          'hover:bg-status-negative-light active:bg-status-negative-lighter ' +
          'focus-visible:ring-status-negative-DEFAULT/50 ' +
          'shadow-none',
        success:
          'bg-status-positive-DEFAULT text-status-positive-onColor ' +
          'hover:bg-status-positive-hover active:bg-status-positive-active ' +
          'focus-visible:ring-status-positive-DEFAULT/50 ' +
          'shadow-sm hover:shadow-md active:shadow-xs',
        warning:
          'bg-status-critical-DEFAULT text-status-critical-onColor ' +
          'hover:bg-status-critical-hover active:bg-status-critical-active ' +
          'focus-visible:ring-status-critical-DEFAULT/50 ' +
          'shadow-sm hover:shadow-md active:shadow-xs',
      },
      size: {
        xs: 'px-2.5 py-1 text-label-sm gap-1 rounded-xs min-h-[28px]',
        sm: 'px-3 py-1.5 text-label-md gap-1.5 rounded-sm min-h-[32px]',
        md: 'px-4 py-2 text-label-lg gap-2 rounded-md min-h-[40px]',
        lg: 'px-6 py-3 text-title-sm gap-2.5 rounded-lg min-h-[48px]',
        xl: 'px-8 py-4 text-title-md gap-3 rounded-xl min-h-[56px]',
        icon: 'p-2 rounded-md min-h-[40px] min-w-[40px]',
        iconSm: 'p-1.5 rounded-sm min-h-[32px] min-w-[32px]',
        iconLg: 'p-3 rounded-lg min-h-[48px] min-w-[48px]',
      },
      fullWidth: {
        true: 'w-full',
      },
      loading: {
        true: 'relative text-transparent',
      },
      rounded: {
        none: 'rounded-none',
        xs: 'rounded-xs',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    compoundVariants: [
      { variant: 'primary', size: 'icon', className: 'bg-accent-primary-DEFAULT' },
      { variant: 'secondary', size: 'icon', className: 'bg-accent-secondary-DEFAULT' },
      { variant: 'destructive', size: 'icon', className: 'bg-status-negative-DEFAULT' },
      { variant: 'ghost', loading: true, className: 'bg-transparent' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
      rounded: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  as?: React.ElementType;
  href?: string;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  testId?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      as: Component = 'button',
      href,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className,
      testId,
      rounded = 'md',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isLink = href && Component === 'button';
    const Element = isLink ? 'a' : Component;

    const buttonClassName = buttonVariants({
      variant,
      size,
      fullWidth,
      loading,
      rounded,
    });

    const isDisabled = disabled || loading;

    return (
      <Element
        ref={ref}
        href={isLink ? href : undefined}
        type={isLink ? undefined : type}
        className={twMerge(buttonClassName, className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        data-testid={testId}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Spinner
              size={
                size === 'xs' || size === 'sm' || size === 'iconSm'
                  ? 'sm'
                  : size === 'lg' || size === 'xl' || size === 'iconLg'
                    ? 'lg'
                    : 'md'
              }
            />
            {loadingText && (
              <Text variant="bodySm" className="sr-only">
                {loadingText}
              </Text>
            )}
          </span>
        )}
        {!loading && leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className={twMerge('flex items-center', loading && 'invisible')}>{children}</span>
        {!loading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Element>
    );
  }
);

Button.displayName = 'Button';

// IconButton — for icon-only buttons
export interface IconButtonProps extends ButtonProps {
  'aria-label': string;
  children: React.ReactNode;
  size?: 'iconSm' | 'icon' | 'iconLg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 'aria-label': ariaLabel, children, size = 'icon', className, ...props }, ref) => (
    <Button
      ref={ref}
      size={size}
      className={twMerge('p-0', className)}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Button>
  )
);
IconButton.displayName = 'IconButton';

// ButtonGroup — for grouping related buttons
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  ariaLabel?: string;
  testId?: string;
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, className, orientation = 'horizontal', ariaLabel, testId }, ref) => (
    <Box
      ref={ref}
      as="div"
      role="group"
      aria-label={ariaLabel}
      display="inline-flex"
      flexDirection={orientation === 'vertical' ? 'col' : 'row'}
      className={twMerge(
        'rounded-md overflow-hidden shadow-sm',
        orientation === 'horizontal' ? 'space-x-0' : 'space-y-0',
        className
      )}
      data-testid={testId}
    >
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
ButtonGroup.displayName = 'ButtonGroup';

// FloatingActionButton (FAB)
export interface FABProps extends ButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offset?: { x: number; y: number };
}

export const FAB = forwardRef<HTMLButtonElement, FABProps>(
  (
    {
      position = 'bottom-right',
      offset = { x: 6, y: 6 },
      size = 'iconLg',
      variant = 'primary',
      rounded = 'full',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const positionStyles = {
      'bottom-right': 'fixed bottom-0 right-0',
      'bottom-left': 'fixed bottom-0 left-0',
      'top-right': 'fixed top-0 right-0',
      'top-left': 'fixed top-0 left-0',
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        rounded={rounded}
        className={twMerge(
          positionStyles[position],
          `m-${offset.x}`,
          'shadow-lg hover:shadow-xl',
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
FAB.displayName = 'FAB';

// SpeedDial — FAB with multiple actions
export interface SpeedDialAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  'aria-label': string;
  disabled?: boolean;
}

export interface SpeedDialProps {
  actions: SpeedDialAction[];
  triggerIcon: React.ReactNode;
  triggerLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  direction?: 'up' | 'down' | 'left' | 'right';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export const SpeedDial = forwardRef<HTMLDivElement, SpeedDialProps>(
  (
    {
      actions,
      triggerIcon,
      triggerLabel,
      open = false,
      onOpenChange,
      direction = 'up',
      position = 'bottom-right',
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(open);

    const handleToggle = () => {
      const newOpen = !isOpen;
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    };

    const positionStyles = {
      'bottom-right': 'fixed bottom-6 right-6',
      'bottom-left': 'fixed bottom-6 left-6',
      'top-right': 'fixed top-6 right-6',
      'top-left': 'fixed top-6 left-6',
    };

    const directionStyles = {
      up: 'flex-col-reverse space-y-3',
      down: 'flex-col space-y-3',
      left: 'flex-row-reverse space-x-3',
      right: 'flex-row space-x-3',
    };

    return (
      <Box
        ref={ref}
        display="flex"
        flexDirection={direction === 'up' || direction === 'down' ? 'col' : 'row'}
        className={twMerge(
          positionStyles[position],
          directionStyles[direction],
          'items-center justify-center z-50',
          className
        )}
      >
        {isOpen &&
          actions.map((action, index) => (
            <Button
              key={action.label}
              variant="primary"
              size="icon"
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              disabled={action.disabled}
              aria-label={action['aria-label']}
              className={twMerge(
                'transition-all duration-normal ease-standard-decelerate',
                `delay-[${index * 50}ms]`
              )}
            >
              {action.icon}
            </Button>
          ))}
        <Button
          variant="primary"
          size="iconLg"
          rounded="full"
          onClick={handleToggle}
          aria-label={triggerLabel}
          aria-expanded={isOpen}
          className="shadow-lg hover:shadow-xl transition-all duration-normal ease-standard-decelerate z-10"
        >
          {triggerIcon}
        </Button>
      </Box>
    );
  }
);
SpeedDial.displayName = 'SpeedDial';
