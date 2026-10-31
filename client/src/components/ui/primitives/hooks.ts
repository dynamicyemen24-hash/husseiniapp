/**
 * Shared primitive hooks — one controlled/uncontrolled contract for every
 * interactive primitive (Tabs, Select, Switch…).
 *
 * Without this, each component re-invents `value ?? internal` with subtle
 * differences (does onChange fire when controlled? is setState called on a
 * controlled component?). One hook means one behavior, tested once.
 */

import { useState, useCallback, useId } from 'react';

/**
 * Controllable state: uncontrolled by default (`defaultValue`), fully
 * controlled when `value` is provided. `onChange` fires in both modes.
 * Mirrors the Radix `useControllableState` contract.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void
): readonly [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const current = value ?? internal;

  const set = useCallback(
    (next: T) => {
      // Always sync the internal slot so an uncontrolled-then-controlled
      // transition never renders a stale frame; harmless when controlled.
      setInternal(next);
      onChange?.(next);
    },
    [onChange]
  );

  return [current, set] as const;
}

/**
 * Stable, SSR-safe id for aria wiring (`triggerId`, `panelId`…).
 * Strips the `«r»` colons React inserts so ids stay valid selectors.
 */
export function useStableId(prefix = 'pv'): string {
  const raw = useId();
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9-_]/g, '')}`;
}
