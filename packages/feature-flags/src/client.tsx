/**
 * ALHUSAINIA Feature Flags — React Client
 * =======================================
 * React hooks and provider for client-side feature flags.
 */

import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from "react";
import type { FlagKey, EvaluationContext, EvaluationResult, ClientFlagState, FlagsRegistry } from "./types";
import { createFlagClient } from "./evaluate";

/** Client-side flags context */
interface FeatureFlagsContextValue<T extends FlagsRegistry> {
  flags: T;
  context: EvaluationContext;
  getFlag: <K extends FlagKey>(key: K, context?: Partial<EvaluationContext>) => EvaluationResult<T[K]["defaultValue"]>;
  getValue: <K extends FlagKey>(key: K, context?: Partial<EvaluationContext>) => T[K]["defaultValue"];
  isEnabled: <K extends FlagKey>(key: K, context?: Partial<EvaluationContext>) => boolean;
  subscribe: (callback: () => void) => () => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue<any> | null>(null);

/**
 * Provider component — wraps app with feature flags
 */
export function FeatureFlagsProvider<T extends FlagsRegistry>({
  children,
  flags,
  initialContext,
  pollInterval = 30000,
}: {
  children: ReactNode;
  flags: T;
  initialContext: EvaluationContext;
  pollInterval?: number;
}) {
  const [context, setContext] = useState(initialContext);
  const [serverFlags, setServerFlags] = useState<Record<FlagKey, any>>({});
  const [version, setVersion] = useState(0);

  const client = createFlagClient(flags, context);

  // Subscribe to context changes
  const subscribe = (callback: () => void) => {
    setVersion(v => v + 1);
    return () => {};
  };

  // Poll for flag updates (in production, use SSE/WebSocket)
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(async () => {
      try {
        // In real implementation, fetch from API
        // const response = await fetch('/api/feature-flags', {
        //   headers: { 'x-request-id': context.requestId || '' }
        // });
        // const data = await response.json();
        // setServerFlags(data.flags);
        // setVersion(v => v + 1);
      } catch {
        // Silent fail - keep using cached flags
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, context.requestId]);

  // Merge server flags as overrides
  useEffect(() => {
    for (const [key, value] of Object.entries(serverFlags)) {
      client.setOverride(key as FlagKey, value);
    }
  }, [serverFlags]);

  const value: FeatureFlagsContextValue<T> = {
    flags,
    context,
    getFlag: client.getFlag,
    getValue: client.getValue,
    isEnabled: client.isEnabled,
    subscribe,
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags
 */
export function useFeatureFlags<T extends FlagsRegistry>() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }
  return ctx as FeatureFlagsContextValue<T>;
}

/**
 * Hook for a single flag with reactive updates
 */
export function useFlag<K extends FlagKey, TValue>(
  key: K,
  options?: { context?: Partial<EvaluationContext> }
): ClientFlagState<TValue> {
  const { getFlag, subscribe } = useFeatureFlags();

  const getSnapshot = () => getFlag(key, options?.context) as EvaluationResult<TValue>;
  const getServerSnapshot = () => getSnapshot();

  // Use sync external store for React 18 concurrent features
  const result = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    value: result.value,
    loading: false, // In real impl, track loading state
    error: null,
  };
}

/**
 * Hook for boolean flag (convenience)
 */
export function useFeatureFlag<K extends FlagKey>(
  key: K,
  options?: { context?: Partial<EvaluationContext>; defaultValue?: boolean }
): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key, options?.context) ?? options?.defaultValue ?? false;
}

/**
 * Hook for all flags values (for debugging/admin)
 */
export function useAllFlags(options?: { context?: Partial<EvaluationContext> }): Record<FlagKey, any> {
  const { getAllValues, subscribe } = useFeatureFlags();

  const getSnapshot = () => getAllValues(options?.context);
  const getServerSnapshot = () => getSnapshot();

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * HOC for conditional rendering based on flag
 */
export function withFeatureFlag<K extends FlagKey, TProps extends object>(
  key: K,
  Component: React.ComponentType<TProps>,
  fallback?: React.ComponentType<TProps> | React.ReactNode
) {
  return function WithFeatureFlag(props: TProps) {
    const enabled = useFeatureFlag(key);
    if (!enabled) {
      return fallback ? (typeof fallback === "function" ? <fallback {...props} /> : fallback) : null;
    }
    return <Component {...props} />;
  };
}