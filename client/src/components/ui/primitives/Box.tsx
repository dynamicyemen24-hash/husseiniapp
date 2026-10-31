/**
 * Box — Primitive layout component
 * The foundation of all layout composition. Uses CSS Grid/Flexbox via props.
 * Replaces: div, section, article, aside, header, footer, main with semantic props.
 */

import React, { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const boxVariants = cva('', {
  variants: {
    display: {
      block: 'block',
      flex: 'flex',
      inlineFlex: 'inline-flex',
      grid: 'grid',
      inlineGrid: 'inline-grid',
      contents: 'contents',
      hidden: 'hidden',
      none: 'hidden',
    },
    flexDirection: {
      row: 'flex-row',
      rowReverse: 'flex-row-reverse',
      col: 'flex-col',
      colReverse: 'flex-col-reverse',
    },
    flexWrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      wrapReverse: 'flex-wrap-reverse',
    },
    alignItems: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justifyContent: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      7: 'gap-7',
      8: 'gap-8',
      9: 'gap-9',
      10: 'gap-10',
      11: 'gap-11',
      12: 'gap-12',
      13: 'gap-13',
      14: 'gap-14',
      15: 'gap-15',
      16: 'gap-16',
    },
    gridTemplateColumns: {
      none: 'grid-cols-none',
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
      8: 'grid-cols-8',
      9: 'grid-cols-9',
      10: 'grid-cols-10',
      11: 'grid-cols-11',
      12: 'grid-cols-12',
    },
    gridTemplateRows: {
      none: 'grid-rows-none',
      1: 'grid-rows-1',
      2: 'grid-rows-2',
      3: 'grid-rows-3',
      4: 'grid-rows-4',
      5: 'grid-rows-5',
      6: 'grid-rows-6',
    },
    alignContent: {
      start: 'content-start',
      center: 'content-center',
      end: 'content-end',
      between: 'content-between',
      around: 'content-around',
      evenly: 'content-evenly',
      stretch: 'content-stretch',
    },
    justifyItems: {
      start: 'justify-items-start',
      center: 'justify-items-center',
      end: 'justify-items-end',
      stretch: 'justify-items-stretch',
    },
    position: {
      static: 'static',
      relative: 'relative',
      absolute: 'absolute',
      fixed: 'fixed',
      sticky: 'sticky',
    },
    inset: {
      0: 'inset-0',
      auto: 'inset-auto',
    },
    top: { 0: 'top-0', auto: 'top-auto', full: 'top-full' },
    right: { 0: 'right-0', auto: 'right-auto', full: 'right-full' },
    bottom: { 0: 'bottom-0', auto: 'bottom-auto', full: 'bottom-full' },
    left: { 0: 'left-0', auto: 'left-auto', full: 'left-full' },
    zIndex: {
      base: 'z-0',
      aboveBase: 'z-1',
      dropdown: 'z-100',
      sticky: 'z-200',
      header: 'z-300',
      overlay: 'z-400',
      modal: 'z-500',
      popover: 'z-600',
      toast: 'z-700',
      tooltip: 'z-800',
      maximum: 'z-9999',
    },
    overflow: {
      auto: 'overflow-auto',
      hidden: 'overflow-hidden',
      clip: 'overflow-clip',
      visible: 'overflow-visible',
      scroll: 'overflow-scroll',
      xAuto: 'overflow-x-auto',
      yAuto: 'overflow-y-auto',
      xHidden: 'overflow-x-hidden',
      yHidden: 'overflow-y-hidden',
    },
    width: {
      full: 'w-full',
      screen: 'w-screen',
      min: 'w-min',
      max: 'w-max',
      fit: 'w-fit',
      '1/2': 'w-1/2',
      '1/3': 'w-1/3',
      '2/3': 'w-2/3',
      '1/4': 'w-1/4',
      '3/4': 'w-3/4',
      '1/5': 'w-1/5',
      '2/5': 'w-2/5',
      '3/5': 'w-3/5',
      '4/5': 'w-4/5',
      '1/6': 'w-1/6',
      '5/6': 'w-5/6',
    },
    height: {
      full: 'h-full',
      screen: 'h-screen',
      min: 'h-min',
      max: 'h-max',
      fit: 'h-fit',
      '1/2': 'h-1/2',
      '1/3': 'h-1/3',
      '2/3': 'h-2/3',
      '1/4': 'h-1/4',
      '3/4': 'h-3/4',
    },
    minWidth: {
      0: 'min-w-0',
      full: 'min-w-full',
      min: 'min-w-min',
      max: 'min-w-max',
      fit: 'min-w-fit',
    },
    maxWidth: {
      none: 'max-w-none',
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      full: 'max-w-full',
      min: 'max-w-min',
      max: 'max-w-max',
      fit: 'max-w-fit',
      prose: 'max-w-prose',
      screenSm: 'max-w-screen-sm',
      screenMd: 'max-w-screen-md',
      screenLg: 'max-w-screen-lg',
      screenXl: 'max-w-screen-xl',
      screen2Xl: 'max-w-screen-2xl',
    },
    minHeight: {
      0: 'min-h-0',
      full: 'min-h-full',
      screen: 'min-h-screen',
      min: 'min-h-min',
      max: 'min-h-max',
      fit: 'min-h-fit',
    },
    maxHeight: {
      none: 'max-h-none',
      full: 'max-h-full',
      screen: 'max-h-screen',
      min: 'max-h-min',
      max: 'max-h-max',
      fit: 'max-h-fit',
    },
    padding: {
      0: 'p-0',
      1: 'p-1',
      2: 'p-2',
      3: 'p-3',
      4: 'p-4',
      5: 'p-5',
      6: 'p-6',
      7: 'p-7',
      8: 'p-8',
      9: 'p-9',
      10: 'p-10',
      11: 'p-11',
      12: 'p-12',
      13: 'p-13',
      14: 'p-14',
      15: 'p-15',
      16: 'p-16',
    },
    paddingX: {
      0: 'px-0',
      1: 'px-1',
      2: 'px-2',
      3: 'px-3',
      4: 'px-4',
      5: 'px-5',
      6: 'px-6',
      7: 'px-7',
      8: 'px-8',
      9: 'px-9',
      10: 'px-10',
      11: 'px-11',
      12: 'px-12',
      13: 'px-13',
      14: 'px-14',
      15: 'px-15',
      16: 'px-16',
    },
    paddingY: {
      0: 'py-0',
      1: 'py-1',
      2: 'py-2',
      3: 'py-3',
      4: 'py-4',
      5: 'py-5',
      6: 'py-6',
      7: 'py-7',
      8: 'py-8',
      9: 'py-9',
      10: 'py-10',
      11: 'py-11',
      12: 'py-12',
      13: 'py-13',
      14: 'py-14',
      15: 'py-15',
      16: 'py-16',
    },
    paddingTop: {
      0: 'pt-0',
      1: 'pt-1',
      2: 'pt-2',
      3: 'pt-3',
      4: 'pt-4',
      5: 'pt-5',
      6: 'pt-6',
      7: 'pt-7',
      8: 'pt-8',
      9: 'pt-9',
      10: 'pt-10',
      11: 'pt-11',
      12: 'pt-12',
      13: 'pt-13',
      14: 'pt-14',
      15: 'pt-15',
      16: 'pt-16',
    },
    paddingRight: {
      0: 'pr-0',
      1: 'pr-1',
      2: 'pr-2',
      3: 'pr-3',
      4: 'pr-4',
      5: 'pr-5',
      6: 'pr-6',
      7: 'pr-7',
      8: 'pr-8',
      9: 'pr-9',
      10: 'pr-10',
      11: 'pr-11',
      12: 'pr-12',
      13: 'pr-13',
      14: 'pr-14',
      15: 'pr-15',
      16: 'pr-16',
    },
    paddingBottom: {
      0: 'pb-0',
      1: 'pb-1',
      2: 'pb-2',
      3: 'pb-3',
      4: 'pb-4',
      5: 'pb-5',
      6: 'pb-6',
      7: 'pb-7',
      8: 'pb-8',
      9: 'pb-9',
      10: 'pb-10',
      11: 'pb-11',
      12: 'pb-12',
      13: 'pb-13',
      14: 'pb-14',
      15: 'pb-15',
      16: 'pb-16',
    },
    paddingLeft: {
      0: 'pl-0',
      1: 'pl-1',
      2: 'pl-2',
      3: 'pl-3',
      4: 'pl-4',
      5: 'pl-5',
      6: 'pl-6',
      7: 'pl-7',
      8: 'pl-8',
      9: 'pl-9',
      10: 'pl-10',
      11: 'pl-11',
      12: 'pl-12',
      13: 'pl-13',
      14: 'pl-14',
      15: 'pl-15',
      16: 'pl-16',
    },
    margin: {
      0: 'm-0',
      1: 'm-1',
      2: 'm-2',
      3: 'm-3',
      4: 'm-4',
      5: 'm-5',
      6: 'm-6',
      7: 'm-7',
      8: 'm-8',
      9: 'm-9',
      10: 'm-10',
      11: 'm-11',
      12: 'm-12',
      13: 'm-13',
      14: 'm-14',
      15: 'm-15',
      16: 'm-16',
      auto: 'm-auto',
    },
    marginX: {
      0: 'mx-0',
      1: 'mx-1',
      2: 'mx-2',
      3: 'mx-3',
      4: 'mx-4',
      5: 'mx-5',
      6: 'mx-6',
      7: 'mx-7',
      8: 'mx-8',
      9: 'mx-9',
      10: 'mx-10',
      11: 'mx-11',
      12: 'mx-12',
      13: 'mx-13',
      14: 'mx-14',
      15: 'mx-15',
      16: 'mx-16',
      auto: 'mx-auto',
    },
    marginY: {
      0: 'my-0',
      1: 'my-1',
      2: 'my-2',
      3: 'my-3',
      4: 'my-4',
      5: 'my-5',
      6: 'my-6',
      7: 'my-7',
      8: 'my-8',
      9: 'my-9',
      10: 'my-10',
      11: 'my-11',
      12: 'my-12',
      13: 'my-13',
      14: 'my-14',
      15: 'my-15',
      16: 'my-16',
      auto: 'my-auto',
    },
    marginTop: {
      0: 'mt-0',
      1: 'mt-1',
      2: 'mt-2',
      3: 'mt-3',
      4: 'mt-4',
      5: 'mt-5',
      6: 'mt-6',
      7: 'mt-7',
      8: 'mt-8',
      9: 'mt-9',
      10: 'mt-10',
      11: 'mt-11',
      12: 'mt-12',
      13: 'mt-13',
      14: 'mt-14',
      15: 'mt-15',
      16: 'mt-16',
      auto: 'mt-auto',
    },
    marginRight: {
      0: 'mr-0',
      1: 'mr-1',
      2: 'mr-2',
      3: 'mr-3',
      4: 'mr-4',
      5: 'mr-5',
      6: 'mr-6',
      7: 'mr-7',
      8: 'mr-8',
      9: 'mr-9',
      10: 'mr-10',
      11: 'mr-11',
      12: 'mr-12',
      13: 'mr-13',
      14: 'mr-14',
      15: 'mr-15',
      16: 'mr-16',
      auto: 'mr-auto',
    },
    marginBottom: {
      0: 'mb-0',
      1: 'mb-1',
      2: 'mb-2',
      3: 'mb-3',
      4: 'mb-4',
      5: 'mb-5',
      6: 'mb-6',
      7: 'mb-7',
      8: 'mb-8',
      9: 'mb-9',
      10: 'mb-10',
      11: 'mb-11',
      12: 'mb-12',
      13: 'mb-13',
      14: 'mb-14',
      15: 'mb-15',
      16: 'mb-16',
      auto: 'mb-auto',
    },
    marginLeft: {
      0: 'ml-0',
      1: 'ml-1',
      2: 'ml-2',
      3: 'ml-3',
      4: 'ml-4',
      5: 'ml-5',
      6: 'ml-6',
      7: 'ml-7',
      8: 'ml-8',
      9: 'ml-9',
      10: 'ml-10',
      11: 'ml-11',
      12: 'ml-12',
      13: 'ml-13',
      14: 'ml-14',
      15: 'ml-15',
      16: 'ml-16',
      auto: 'ml-auto',
    },
    borderRadius: {
      none: 'rounded-none',
      xs: 'rounded-xs',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
      full: 'rounded-full',
    },
    borderWidth: { 0: 'border-0', 1: 'border', 2: 'border-2', 4: 'border-4', 8: 'border-8' },
    borderColor: {
      inherit: 'border-inherit',
      current: 'border-current',
      transparent: 'border-transparent',
      primary: 'border-primary',
      secondary: 'border-secondary',
      success: 'border-success',
      warning: 'border-warning',
      error: 'border-error',
      focus: 'border-focus',
    },
    borderStyle: {
      solid: 'border-solid',
      dashed: 'border-dashed',
      dotted: 'border-dotted',
      double: 'border-double',
      none: 'border-none',
    },
    shadow: {
      none: 'shadow-none',
      xs: 'shadow-xs',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
      inner: 'shadow-inner',
      focus: 'shadow-focus',
    },
    opacity: {
      0: 'opacity-0',
      5: 'opacity-5',
      10: 'opacity-10',
      20: 'opacity-20',
      25: 'opacity-25',
      30: 'opacity-30',
      40: 'opacity-40',
      50: 'opacity-50',
      60: 'opacity-60',
      70: 'opacity-70',
      75: 'opacity-75',
      80: 'opacity-80',
      90: 'opacity-90',
      95: 'opacity-95',
      100: 'opacity-100',
    },
    transition: {
      none: 'transition-none',
      all: 'transition-all',
      colors: 'transition-colors',
      opacity: 'transition-opacity',
      shadow: 'transition-shadow',
      transform: 'transition-transform',
      width: 'transition-width',
      height: 'transition-height',
      spacing: 'transition-spacing',
      borderRadius: 'transition-border-radius',
    },
    duration: {
      instant: 'duration-0',
      extraFast: 'duration-50',
      fast: 'duration-100',
      normal: 'duration-200',
      slow: 'duration-300',
      extraSlow: 'duration-400',
      slowest: 'duration-500',
    },
    easing: {
      linear: 'ease-linear',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
      standard: 'ease-standard',
      standardAccelerate: 'ease-standard-accelerate',
      standardDecelerate: 'ease-standard-decelerate',
      emphasized: 'ease-emphasized',
      emphasizedAccelerate: 'ease-emphasized-accelerate',
      emphasizedDecelerate: 'ease-emphasized-decelerate',
      bounce: 'ease-bounce',
      spring: 'ease-spring',
    },
    cursor: {
      auto: 'cursor-auto',
      default: 'cursor-default',
      pointer: 'cursor-pointer',
      wait: 'cursor-wait',
      text: 'cursor-text',
      move: 'cursor-move',
      help: 'cursor-help',
      notAllowed: 'cursor-not-allowed',
      none: 'cursor-none',
      grab: 'cursor-grab',
      grabbing: 'cursor-grabbing',
      zoomIn: 'cursor-zoom-in',
      zoomOut: 'cursor-zoom-out',
      colResize: 'cursor-col-resize',
      rowResize: 'cursor-row-resize',
    },
    userSelect: {
      auto: 'select-auto',
      text: 'select-text',
      all: 'select-all',
      none: 'select-none',
    },
    pointerEvents: {
      auto: 'pointer-events-auto',
      none: 'pointer-events-none',
    },
    visibility: {
      visible: 'visible',
      invisible: 'invisible',
      collapse: 'collapse',
    },
  },
  compoundVariants: [
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      className: 'flex items-center justify-center',
    },
    { display: 'flex', flexDirection: 'col', gap: 4, className: 'flex flex-col gap-4' },
    { display: 'grid', gridTemplateColumns: 12, gap: 4, className: 'grid grid-cols-12 gap-4' },
  ],
  defaultVariants: {
    display: 'block',
  },
});

export interface BoxProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof boxVariants> {
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
  testId?: string;
  // Pass-through styling props used by composed primitives (Modal, Select,
  // Card). They are intentionally NOT part of boxVariants: Box strips them
  // from the DOM instead of leaking unknown attributes to React.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [extra: string]: any;
}

const BOX_VARIANT_KEYS = new Set([
  'display',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'justifyContent',
  'gap',
  'gridTemplateColumns',
  'gridTemplateRows',
  'alignContent',
  'justifyItems',
  'position',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'overflow',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginX',
  'marginY',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'shadow',
  'opacity',
  'transition',
  'duration',
  'easing',
  'cursor',
  'userSelect',
  'pointerEvents',
  'visibility',
]);

// Props that are styling intent, never DOM attributes. Stripped before spread.
const NON_DOM_PROPS = new Set([
  'bordered',
  'padded',
  'variant',
  'size',
  'backgroundColor',
  'borderBottomWidth',
  'textAlign',
  'overflowX',
  'overflowY',
  'flex',
  'minWidth',
  'maxHeight',
  'as',
  'testId',
  'display',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'justifyContent',
  'gap',
  'gridTemplateColumns',
  'gridTemplateRows',
  'alignContent',
  'justifyItems',
  'position',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'overflow',
  'width',
  'height',
  'maxWidth',
  'minHeight',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'shadow',
  'opacity',
  'transition',
  'duration',
  'easing',
  'cursor',
  'userSelect',
  'pointerEvents',
  'visibility',
  'padding',
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginX',
  'marginY',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
]);

export const Box = forwardRef<HTMLDivElement, BoxProps>(
  ({ as: Component = 'div', className, testId, children, ...props }, ref) => {
    const variantProps: Record<string, unknown> = {};
    for (const key of BOX_VARIANT_KEYS) {
      const v = (props as Record<string, unknown>)[key];
      // cva variants accept string | number only — responsive objects
      // ({ base, sm, lg }) are not supported and are dropped to className.
      if (typeof v === 'string' || typeof v === 'number') variantProps[key] = v;
    }
    const variantClassName = boxVariants(variantProps as Parameters<typeof boxVariants>[0]);
    const restProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (NON_DOM_PROPS.has(key)) continue;
      // Drop any remaining object-valued styling prop (responsive leftovers).
      if (typeof value === 'object' && value !== null && !React.isValidElement(value)) continue;
      restProps[key] = value;
    }
    return (
      <Component
        ref={ref}
        className={twMerge(variantClassName, className)}
        data-testid={testId}
        {...restProps}
      >
        {children}
      </Component>
    );
  }
);

Box.displayName = 'Box';

// Semantic layout components built on Box
export const Flex = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box ref={ref} display="flex" className={className} {...props}>
      {children}
    </Box>
  )
);
Flex.displayName = 'Flex';

export const Grid = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box ref={ref} display="grid" className={className} {...props}>
      {children}
    </Box>
  )
);
Grid.displayName = 'Grid';

export const InlineFlex = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box ref={ref} display="inlineFlex" className={className} {...props}>
      {children}
    </Box>
  )
);
InlineFlex.displayName = 'InlineFlex';

export const Stack = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box ref={ref} display="flex" flexDirection="col" className={className} {...props}>
      {children}
    </Box>
  )
);
Stack.displayName = 'Stack';

export const Row = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box ref={ref} display="flex" flexDirection="row" className={className} {...props}>
      {children}
    </Box>
  )
);
Row.displayName = 'Row';

export const Column = Stack;

export const Container = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box
      ref={ref}
      width="full"
      maxWidth="screenXl"
      marginX="auto"
      paddingX={4}
      className={twMerge('px-4 sm:px-6 lg:px-8', className)}
      {...props}
    >
      {children}
    </Box>
  )
);
Container.displayName = 'Container';

export const Section = forwardRef<HTMLDivElement, BoxProps>(
  ({ className, children, ...props }, ref) => (
    <Box
      ref={ref}
      as="section"
      paddingY={8}
      className={twMerge('py-8 md:py-12 lg:py-16', className)}
      {...props}
    >
      {children}
    </Box>
  )
);
Section.displayName = 'Section';

// NOTE: Card/Paper live in ./Card.tsx (the canonical card primitive).
// They were previously re-declared here with a conflicting API
// (backgroundColor/bordered props that boxVariants never defined).
// Import { Card } from './Card' instead.
