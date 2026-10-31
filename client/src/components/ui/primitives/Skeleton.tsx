/**
 * Skeleton — DEPRECATED alias.
 *
 * The canonical loading placeholder lives in `./Spinner` (Skeleton +
 * SkeletonRows + Progress, theme-token driven). This file exists only so
 * deep imports (`./Skeleton`) keep working; it re-exports the canonical
 * implementation and adds no new component. Do not add new exports here —
 * extend `./Spinner` instead.
 */

export { Skeleton, SkeletonRows, Progress } from './Spinner';
export type { SkeletonProps } from './Spinner';

/** @deprecated Use `shape` from `./Spinner` (`text | title | avatar | card | row`). */
export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
