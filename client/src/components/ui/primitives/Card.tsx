/**
 * Card — Primitive content container component
 * Flexible card system with elevation, padding, and composition patterns.
 * Replaces: custom card implementations, panels, tiles, containers
 */

import React, { forwardRef, type HTMLAttributes, type ImgHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Box } from './Box';
import { Text } from './Text';
import { Button } from './Button';

const cardVariants = cva(
  'transition-all duration-normal ease-standard-decelerate ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-accent-primary-DEFAULT/50',
  {
    variants: {
      variant: {
        default: 'bg-background-primary-DEFAULT border border-border-primary-DEFAULT shadow-sm',
        elevated: 'bg-background-primary-DEFAULT shadow-md border-none',
        outlined:
          'bg-background-primary-DEFAULT border-2 border-border-primary-DEFAULT shadow-none',
        filled: 'bg-background-tertiary-DEFAULT border-none shadow-none',
        ghost: 'bg-transparent border-none shadow-none',
        interactive:
          'bg-background-primary-DEFAULT border border-border-primary-DEFAULT shadow-sm hover:shadow-md active:shadow-xs cursor-pointer',
        selected: 'bg-accent-primary-light border-2 border-accent-primary-DEFAULT shadow-sm',
        loading:
          'bg-background-tertiary-DEFAULT border border-border-primary-DEFAULT shadow-sm relative overflow-hidden',
      },
      padding: {
        none: 'p-0',
        xs: 'p-3',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
      },
    },
    compoundVariants: [
      { variant: 'interactive', className: 'hover:-translate-y-0.5' },
      { variant: 'loading', className: 'animate-pulse' },
    ],
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      radius: 'md',
    },
  }
);

const cardHeaderVariants = cva('flex items-start justify-between gap-4', {
  variants: { bordered: { true: 'border-b border-border-primary-DEFAULT pb-4', false: 'pb-0' } },
});

const cardContentVariants = cva('', {
  variants: { padded: { true: '', false: 'p-0' } },
});

const cardFooterVariants = cva('flex items-center justify-end gap-3 mt-auto', {
  variants: { bordered: { true: 'border-t border-border-primary-DEFAULT pt-4', false: 'pt-0' } },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  headerBordered?: boolean;
  footerBordered?: boolean;
  image?: string;
  imageAlt?: string;
  imagePosition?: 'top' | 'bottom' | 'left' | 'right' | 'cover';
  testId?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      radius = 'md',
      header,
      footer,
      headerAction,
      headerBordered = true,
      footerBordered = true,
      image,
      imageAlt,
      imagePosition = 'top',
      children,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const cardClassName = cardVariants({ variant, padding, radius });

    return (
      <Box
        ref={ref}
        as={variant === 'interactive' ? 'button' : 'div'}
        type={variant === 'interactive' ? 'button' : undefined}
        className={twMerge(cardClassName, className)}
        data-testid={testId}
        {...props}
      >
        {image && imagePosition === 'top' && (
          <Box
            as="img"
            src={image}
            alt={imageAlt || ''}
            width="full"
            height="auto"
            className={twMerge('object-cover', radius !== 'none' && 'rounded-t-md')}
          />
        )}

        {image && imagePosition === 'cover' && (
          <Box
            as="img"
            src={image}
            alt={imageAlt || ''}
            width="full"
            height="full"
            position="absolute"
            inset={0}
            className="object-cover z-0"
            aria-hidden="true"
          />
        )}

        {header && (
          <Box
            as="header"
            bordered={headerBordered}
            className={cardHeaderVariants({ bordered: headerBordered })}
          >
            <Box display="flex" flexDirection="col" gap={1} flex={1}>
              {header}
            </Box>
            {headerAction && (
              <Box display="flex" alignItems="center" gap={2}>
                {headerAction}
              </Box>
            )}
          </Box>
        )}

        <Box
          as="main"
          padded={padding !== 'none'}
          className={cardContentVariants({ padded: padding !== 'none' })}
        >
          {children}
        </Box>

        {footer && (
          <Box
            as="footer"
            bordered={footerBordered}
            className={cardFooterVariants({ bordered: footerBordered })}
          >
            {footer}
          </Box>
        )}

        {image && imagePosition === 'bottom' && (
          <Box
            as="img"
            src={image}
            alt={imageAlt || ''}
            width="full"
            height="auto"
            className={twMerge('object-cover', radius !== 'none' && 'rounded-b-md')}
          />
        )}
      </Box>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for composition
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  avatar?: React.ReactNode;
  bordered?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, avatar, bordered = true, className, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="header"
      display="flex"
      alignItems="flex-start"
      justifyContent="space-between"
      gap={4}
      paddingY={bordered ? 4 : 0}
      bordered={bordered}
      className={twMerge(cardHeaderVariants({ bordered }), className)}
      {...props}
    >
      <Box display="flex" flexDirection="col" gap={1} flex={1}>
        {avatar && (
          <Box className="w-10 h-10 rounded-full bg-background-tertiary-DEFAULT flex items-center justify-center">
            {avatar}
          </Box>
        )}
        {title && (
          <Text as="h3" variant="titleMd" color="primary">
            {title}
          </Text>
        )}
        {subtitle && (
          <Text variant="bodySm" color="secondary">
            {subtitle}
          </Text>
        )}
        {children}
      </Box>
      {action && (
        <Box display="flex" alignItems="center" gap={2}>
          {action}
        </Box>
      )}
    </Box>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ padded = true, className, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="main"
      padded={padded}
      className={twMerge(cardContentVariants({ padded }), className)}
      {...props}
    >
      {children}
    </Box>
  )
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ bordered = true, className, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="footer"
      display="flex"
      alignItems="center"
      justifyContent="flex-end"
      gap={3}
      bordered={bordered}
      className={twMerge(cardFooterVariants({ bordered }), className)}
      {...props}
    >
      {children}
    </Box>
  )
);
CardFooter.displayName = 'CardFooter';

export interface CardImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  position?: 'top' | 'bottom' | 'left' | 'right' | 'cover';
}

export const CardImage = forwardRef<HTMLImageElement, CardImageProps>(
  ({ position = 'top', className, ...props }, ref) => (
    <Box
      ref={ref}
      as="img"
      width="full"
      height="auto"
      className={twMerge(
        'object-cover',
        position === 'top' && 'rounded-t-md',
        position === 'bottom' && 'rounded-b-md',
        position === 'left' && 'rounded-l-md',
        position === 'right' && 'rounded-r-md',
        position === 'cover' && 'absolute inset-0 z-0',
        className
      )}
      {...props}
    />
  )
);
CardImage.displayName = 'CardImage';

// Specialized card types
export interface StatsCardProps {
  label: string;
  value: string | number;
  change?: { value: number; label: string; trend: 'up' | 'down' | 'neutral' };
  icon?: React.ReactNode;
  iconColor?: string;
  trendColor?: 'positive' | 'negative' | 'neutral';
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
  testId?: string;
}

export const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      label,
      value,
      change,
      icon,
      iconColor = 'accent-primary-DEFAULT',
      trendColor = 'neutral',
      variant = 'default',
      className,
      ...props
    },
    ref
  ) => (
    <Card ref={ref} variant={variant} className={className} {...props}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4}>
          <Box display="flex" flexDirection="col" gap={2} flex={1}>
            {icon && (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                width={10}
                height={10}
                borderRadius="lg"
                backgroundColor={iconColor}
                className="text-ink"
              >
                {icon}
              </Box>
            )}
            <Box display="flex" flexDirection="col" gap={0.5}>
              <Text variant="captionSm" color="secondary">
                {label}
              </Text>
              <Text variant="headlineMd" color="primary">
                {value}
              </Text>
            </Box>
          </Box>
          {change && (
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              className={twMerge(
                change.trend === 'up' && 'text-status-positive-DEFAULT',
                change.trend === 'down' && 'text-status-negative-DEFAULT',
                change.trend === 'neutral' && 'text-content-tertiary'
              )}
            >
              {change.trend === 'up' && (
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1L7 13M1 7L13 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {change.trend === 'down' && (
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1L7 13M1 7L13 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <Text variant="captionSm" weight="medium">
                {change.value > 0 ? '+' : ''}
                {change.value}%
              </Text>
              <Text variant="captionXs" color="tertiary">
                {change.label}
              </Text>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  )
);
StatsCard.displayName = 'StatsCard';

export interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action: React.ReactNode;
  secondaryAction?: React.ReactNode;
  image?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
  testId?: string;
}

export const ActionCard = forwardRef<HTMLDivElement, ActionCardProps>(
  (
    {
      title,
      description,
      icon,
      action,
      secondaryAction,
      image,
      variant = 'default',
      className,
      ...props
    },
    ref
  ) => (
    <Card ref={ref} variant={variant} className={className} {...props}>
      {image && <CardImage position="top" src={image} alt="" />}
      <CardContent>
        <Box display="flex" gap={3}>
          {icon && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              width={12}
              height={12}
              borderRadius="lg"
              backgroundColor="accent-primary-light"
              className="text-accent-primary-DEFAULT flex-shrink-0"
            >
              {icon}
            </Box>
          )}
          <Box flex={1} minWidth={0}>
            <Text variant="titleSm" color="primary">
              {title}
            </Text>
            {description && (
              <Text variant="bodySm" color="secondary">
                {description}
              </Text>
            )}
          </Box>
        </Box>
        <CardFooter>
          {secondaryAction && (
            <Button variant="ghost" size="sm">
              {secondaryAction}
            </Button>
          )}
          {action}
        </CardFooter>
      </CardContent>
    </Card>
  )
);
ActionCard.displayName = 'ActionCard';

export interface MediaCardProps {
  media: React.ReactNode;
  title: string;
  description?: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  mediaPosition?: 'top' | 'left' | 'right';
  className?: string;
  testId?: string;
}

export const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(
  (
    {
      media,
      title,
      description,
      metadata,
      actions,
      variant = 'default',
      mediaPosition = 'top',
      className,
      ...props
    },
    ref
  ) => (
    <Card
      ref={ref}
      variant={variant}
      className={twMerge(
        mediaPosition === 'left' && 'flex flex-row',
        mediaPosition === 'right' && 'flex flex-row-reverse',
        className
      )}
      {...props}
    >
      {mediaPosition === 'top' && <CardContent padded={false}>{media}</CardContent>}
      {mediaPosition !== 'top' && (
        <Box width={mediaPosition === 'left' ? '40%' : '40%'} className="flex-shrink-0">
          <CardContent padded={false}>{media}</CardContent>
        </Box>
      )}
      <CardContent className={mediaPosition !== 'top' ? 'flex-1' : ''}>
        <Box display="flex" flexDirection="col" gap={2} height="full">
          <Box display="flex" flexDirection="col" gap={0.5} flex={1}>
            <Text variant="titleMd" color="primary">
              {title}
            </Text>
            {description && (
              <Text variant="bodySm" color="secondary">
                {description}
              </Text>
            )}
          </Box>
          {metadata && <Box className="mt-auto">{metadata}</Box>}
          {actions && (
            <CardFooter>
              <Box display="flex" gap={2} width="full">
                {actions}
              </Box>
            </CardFooter>
          )}
        </Box>
      </CardContent>
    </Card>
  )
);
MediaCard.displayName = 'MediaCard';
