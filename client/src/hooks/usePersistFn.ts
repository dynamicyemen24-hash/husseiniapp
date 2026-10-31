import { useRef } from "react";

// `never[]` parameters make every function assignable to `noop` (parameter
// contravariance), so strongly-typed handlers satisfy the constraint while
// the persisted wrapper keeps the original signature.
type noop = (...args: never[]) => unknown;

/**
 * usePersistFn instead of useCallback to reduce cognitive load.
 *
 * Returns a function with a stable identity across renders that always calls
 * the latest `fn` (no stale closures). Passing `undefined` yields a stable
 * no-op, so optional handlers can be persisted without call-site branching.
 */
export function usePersistFn<T extends noop>(fn?: T): T {
  const fnRef = useRef<T | undefined>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T | null>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args: Parameters<T>) {
      return fnRef.current?.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}
