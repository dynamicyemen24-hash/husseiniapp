/**
 * Primitives barrel — tree-shakeable entry for the 15-component system.
 *
 * Import from here (`@/components/ui/primitives`) so bundlers can drop
 * unused primitives from the initial chunk (bundle budget: <200KB gzip).
 * Deep imports (`./Button`) remain valid for code-split screens.
 */

export * from './Box';
export * from './Button';
export * from './Card';
export * from './CollapsibleSection';
export * from './Input';
export * from './Modal';
export * from './Select';
export * from './Text';
export * from './Portal';
export * from './Spinner';
// NOTE: `./Skeleton` is a deprecated alias that re-exports the canonical
// Skeleton from `./Spinner` — intentionally NOT `export *` here, otherwise
// the barrel would export `Skeleton` twice (TS2308). Deep imports of
// `./Skeleton` keep working; new code imports from `./Spinner`.
export type { SkeletonVariant } from './Skeleton';
export * from './Badge';
export * from './Avatar';
export * from './Checkbox';
export * from './Tabs';
export * from './Tooltip';
export * from './Toast';
export * from './hooks';

export const PRIMITIVE_COUNT = 16;
export const PRIMITIVE_FILES = [
  'Box',
  'Button',
  'Card',
  'CollapsibleSection',
  'Input',
  'Modal',
  'Select',
  'Text',
  'Portal',
  'Spinner',
  'Badge',
  'Avatar',
  'Checkbox',
  'Tabs',
  'Tooltip',
  'Toast',
] as const;
