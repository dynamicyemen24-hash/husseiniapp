/**
 * Text — Primitive typography component
 * Semantic text rendering with design token integration.
 * Replaces: h1-h6, p, span, label, small, strong, em, code, pre, blockquote
 */

import React, { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const textVariants = cva('', {
  variants: {
    variant: {
      displayXl: 'text-display-xl font-bold tracking-tight',
      displayLg: 'text-display-lg font-bold tracking-tight',
      displayMd: 'text-display-md font-semibold tracking-tight',
      displaySm: 'text-display-sm font-semibold tracking-tight',
      headlineXl: 'text-headline-xl font-semibold tracking-tight',
      headlineLg: 'text-headline-lg font-semibold tracking-tight',
      headlineMd: 'text-headline-md font-semibold',
      headlineSm: 'text-headline-sm font-semibold',
      titleLg: 'text-title-lg font-semibold',
      titleMd: 'text-title-md font-medium',
      titleSm: 'text-title-sm font-medium',
      bodyLg: 'text-body-lg font-normal leading-relaxed',
      bodyMd: 'text-body-md font-normal leading-relaxed',
      bodySm: 'text-body-sm font-normal leading-normal',
      bodyXs: 'text-body-xs font-normal leading-normal',
      labelLg: 'text-label-lg font-medium tracking-wide',
      labelMd: 'text-label-md font-medium tracking-wide',
      labelSm: 'text-label-sm font-medium tracking-wider',
      captionMd: 'text-caption-md font-normal tracking-wider',
      captionSm: 'text-caption-sm font-normal tracking-wider',
      captionXs: 'text-caption-xs font-normal tracking-widest',
      codeLg: 'text-code-lg font-mono',
      codeMd: 'text-code-md font-mono',
      codeSm: 'text-code-sm font-mono',
    },
    color: {
      primary: 'text-content-primary',
      secondary: 'text-content-secondary',
      tertiary: 'text-content-tertiary',
      disabled: 'text-content-disabled',
      inverse: 'text-content-inverse',
      link: 'text-content-link',
      success: 'text-status-positive-DEFAULT',
      warning: 'text-status-critical-DEFAULT',
      error: 'text-status-negative-DEFAULT',
      info: 'text-status-informative-DEFAULT',
      accent: 'text-accent-primary-DEFAULT',
      accentSecondary: 'text-accent-secondary-DEFAULT',
    },
    weight: {
      thin: 'font-thin',
      extraLight: 'font-extralight',
      light: 'font-light',
      regular: 'font-normal',
      medium: 'font-medium',
      semiBold: 'font-semibold',
      bold: 'font-bold',
      extraBold: 'font-extrabold',
      black: 'font-black',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
      start: 'text-start',
      end: 'text-end',
    },
    decoration: {
      none: 'no-underline',
      underline: 'underline',
      lineThrough: 'line-through',
      overline: 'overline',
    },
    transform: {
      none: 'normal-case',
      uppercase: 'uppercase',
      lowercase: 'lowercase',
      capitalize: 'capitalize',
    },
    overflow: {
      visible: 'overflow-visible',
      hidden: 'overflow-hidden',
      ellipsis: 'truncate',
      clip: 'text-clip',
    },
    whitespace: {
      normal: 'whitespace-normal',
      nowrap: 'whitespace-nowrap',
      pre: 'whitespace-pre',
      preLine: 'whitespace-pre-line',
      preWrap: 'whitespace-pre-wrap',
      breakSpaces: 'whitespace-break-spaces',
    },
    break: {
      normal: 'break-normal',
      words: 'break-words',
      all: 'break-all',
      keep: 'break-keep',
    },
    fontFamily: {
      sans: 'font-sans',
      mono: 'font-mono',
      arabic: 'font-arabic',
    },
  },
  compoundVariants: [
    { variant: 'displayXl', color: 'primary', className: 'text-content-primary' },
    { variant: 'captionMd', color: 'tertiary', className: 'text-content-tertiary' },
    { variant: 'labelMd', weight: 'medium', className: 'font-medium' },
  ],
  defaultVariants: {
    variant: 'bodyMd',
    color: 'primary',
  },
});

export interface TextProps
  // `color` is redeclared as a semantic union below (the DOM
  // HTMLAttributes color is a free string and would collide — TS2320).
  extends Omit<HTMLAttributes<HTMLElement>, 'color'>, VariantProps<typeof textVariants> {
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  testId?: string;
  component?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'p'
    | 'span'
    | 'label'
    | 'small'
    | 'strong'
    | 'em'
    | 'code'
    | 'pre'
    | 'blockquote'
    | 'a';
  href?: string;
  // <label> support: Text renders labels via as="label"; htmlFor must be
  // accepted and forwarded (it is a no-op on any other element).
  htmlFor?: string;
  /** Heading level — consumed by Heading/H1-H6, never reaches the DOM. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Code: inline <code> vs block <pre>. Consumed by Code. */
  inline?: boolean;
  /** Blockquote attribution. Consumed by Blockquote. */
  cite?: string;
}

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as,
      component,
      href,
      className,
      testId,
      children,
      variant,
      color,
      weight,
      align,
      decoration,
      transform,
      overflow,
      whitespace,
      break: textBreak,
      fontFamily,
      level: _level,
      inline: _inline,
      cite: _cite,
      ...props
    },
    ref
  ) => {
    const variantClassName = textVariants({
      variant,
      color,
      weight,
      align,
      decoration,
      transform,
      overflow,
      whitespace,
      break: textBreak,
      fontFamily,
    });

    // Determine the actual element to render
    let Element: React.ElementType = as || component || 'span';
    if (href && Element === 'span') Element = 'a';
    const restProps: Record<string, unknown> = { ...props };
    if (Element === 'a' && href) restProps.href = href;

    return (
      <Element
        ref={ref}
        className={twMerge(variantClassName, className)}
        data-testid={testId}
        {...restProps}
      >
        {children}
      </Element>
    );
  }
);

Text.displayName = 'Text';

// Semantic heading components
const HEADING_ELEMENTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
const HEADING_VARIANTS = {
  1: 'displayLg',
  2: 'headlineLg',
  3: 'headlineMd',
  4: 'headlineSm',
  5: 'titleLg',
  6: 'titleMd',
} as const;

export const Heading = forwardRef<HTMLElement, TextProps>(
  ({ className, children, level = 1, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        as={HEADING_ELEMENTS[level - 1]}
        variant={HEADING_VARIANTS[level]}
        className={className}
        {...props}
      >
        {children}
      </Text>
    );
  }
);
Heading.displayName = 'Heading';

export const H1 = (props: TextProps) => <Heading level={1} {...props} />;
export const H2 = (props: TextProps) => <Heading level={2} {...props} />;
export const H3 = (props: TextProps) => <Heading level={3} {...props} />;
export const H4 = (props: TextProps) => <Heading level={4} {...props} />;
export const H5 = (props: TextProps) => <Heading level={5} {...props} />;
export const H6 = (props: TextProps) => <Heading level={6} {...props} />;

export const Paragraph = forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} as="p" variant="bodyMd" className={className} {...props}>
      {children}
    </Text>
  )
);
Paragraph.displayName = 'Paragraph';

export const Label = forwardRef<HTMLLabelElement, TextProps>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} as="label" variant="labelMd" className={className} {...props}>
      {children}
    </Text>
  )
);
Label.displayName = 'Label';

export const Caption = forwardRef<HTMLElement, TextProps>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} as="small" variant="captionMd" className={className} {...props}>
      {children}
    </Text>
  )
);
Caption.displayName = 'Caption';

export const Code = forwardRef<HTMLElement, TextProps>(
  ({ className, children, inline = true, ...props }, ref) => (
    <Text
      ref={ref}
      as={inline ? 'code' : 'pre'}
      variant={inline ? 'codeMd' : 'codeLg'}
      fontFamily="mono"
      className={twMerge(
        inline
          ? 'px-1.5 py-0.5 rounded-sm bg-background-tertiary-DEFAULT'
          : 'p-4 rounded-md overflow-x-auto',
        className
      )}
      {...props}
    >
      {children}
    </Text>
  )
);
Code.displayName = 'Code';

export const Blockquote = forwardRef<HTMLQuoteElement, TextProps>(
  ({ className, children, cite, ...props }, ref) => (
    <Text
      ref={ref}
      as="blockquote"
      variant="bodyMd"
      color="secondary"
      className={twMerge('border-l-4 border-accent-primary-DEFAULT pl-4 italic', className)}
      {...props}
    >
      {children}
      {cite && (
        <footer className="mt-2 text-caption-sm text-content-tertiary not-italic">— {cite}</footer>
      )}
    </Text>
  )
);
Blockquote.displayName = 'Blockquote';

export const Link = forwardRef<HTMLAnchorElement, TextProps>(
  ({ className, children, href, variant = 'link', ...props }, ref) => (
    <Text
      ref={ref}
      as="a"
      href={href}
      // `variant` here selects the link tone; any other text variant falls
      // back to primary ink (a text size is meaningless as a color).
      color={variant === 'link' ? 'link' : 'primary'}
      variant="labelMd"
      className={twMerge('underline-offset-2 hover:underline', className)}
      {...props}
    >
      {children}
    </Text>
  )
);
Link.displayName = 'Link';

export const Strong = forwardRef<HTMLElement, TextProps>(
  ({ className, children, ...props }, ref) => (
    <Text ref={ref} as="strong" weight="bold" className={className} {...props}>
      {children}
    </Text>
  )
);
Strong.displayName = 'Strong';

export const Em = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text ref={ref} as="em" className={twMerge('italic', className)} {...props}>
    {children}
  </Text>
));
Em.displayName = 'Em';

export const Mark = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text
    ref={ref}
    as="mark"
    className={twMerge(
      'bg-status-critical-light text-status-critical-DEFAULT px-1 rounded-xs',
      className
    )}
    {...props}
  >
    {children}
  </Text>
));
Mark.displayName = 'Mark';

export const Del = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text ref={ref} as="del" decoration="lineThrough" className={className} {...props}>
    {children}
  </Text>
));
Del.displayName = 'Del';

export const Ins = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text ref={ref} as="ins" decoration="underline" className={className} {...props}>
    {children}
  </Text>
));
Ins.displayName = 'Ins';

export const Sub = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text ref={ref} as="sub" variant="captionSm" className={className} {...props}>
    {children}
  </Text>
));
Sub.displayName = 'Sub';

export const Sup = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text ref={ref} as="sup" variant="captionSm" className={className} {...props}>
    {children}
  </Text>
));
Sup.displayName = 'Sup';

export const Kbd = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text
    ref={ref}
    as="kbd"
    variant="codeSm"
    fontFamily="mono"
    className={twMerge(
      'px-1.5 py-0.5 rounded-sm bg-background-tertiary-DEFAULT border border-border-primary-DEFAULT shadow-xs',
      className
    )}
    {...props}
  >
    {children}
  </Text>
));
Kbd.displayName = 'Kbd';

export const Samp = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text ref={ref} as="samp" variant="codeSm" fontFamily="mono" className={className} {...props}>
    {children}
  </Text>
));
Samp.displayName = 'Samp';

export const Var = forwardRef<HTMLElement, TextProps>(({ className, children, ...props }, ref) => (
  <Text
    ref={ref}
    as="var"
    variant="codeSm"
    fontFamily="mono"
    className={twMerge('italic', className)}
    {...props}
  >
    {children}
  </Text>
));
Var.displayName = 'Var';
