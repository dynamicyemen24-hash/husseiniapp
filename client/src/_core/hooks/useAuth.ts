import { useCallback, useEffect } from "react";
import { goLogin } from "@/const";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  AUTH_GC_TIME_MS,
  AUTH_MAX_RETRIES,
  AUTH_STALE_TIME_MS,
  LOGIN_PATH,
  clearSessionTokenMirror,
  isTransientAuthError,
  isUnauthorizedError,
  sanitizeRedirectPath,
  writeRuntimeUserInfo,
} from "@/_core/auth";
/** The authenticated user payload as returned by `auth.me`. */
export type AuthUser = NonNullable<RouterOutputs["auth"]["me"]>;

/**
 * Disjoint auth status — never collapse these into a single boolean.
 * `error` covers transient failures too: network failure ≠ logged out.
 */
export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "logging-out"
  | "error";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Public facade for authentication state. Consumers get `user`,
 * `isAuthenticated`, `loading`, `error`, `refresh` and an idempotent,
 * race-safe `logout` — without knowing anything about tRPC internals, the
 * query cache, storage mirrors, or redirect mechanics.
 *
 * Source of truth: `auth.me` (server session cookie / Bearer mirror).
 */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    // UNAUTHORIZED is a definitive answer — retrying it is pointless. Transient
    // transport/server errors ARE retried so a flaky connection never flips
    // the UI into "logged out".
    retry: (failureCount, error) =>
      isTransientAuthError(error) && failureCount < AUTH_MAX_RETRIES,
    // Self-healing after exhaustion of inline retries: refetching on window
    // focus ONLY when the last attempt failed with a transient error gives a
    // zero-effort recovery path ("switch away and back") without reintroducing
    // the refetch storms the global `refetchOnWindowFocus: false` prevents.
    // A definitive UNAUTHORIZED never refocus-refetches.
    refetchOnWindowFocus: query => isTransientAuthError(query.state.error),
    staleTime: AUTH_STALE_TIME_MS,
    gcTime: AUTH_GC_TIME_MS,
  });

  // Subscribed only for isPending/error state; mutateAsync comes from the
  // mutation hook result (the utils proxy does not expose mutation verbs).
  const logoutMutation = trpc.auth.logout.useMutation();

  /**
   * Idempotent logout. Safe in every state:
   * authenticated / expired session / already logged out (401 → success).
   * Non-UNAUTHORIZED failures (e.g. network down) propagate to the caller but
   * local cleanup still runs in `finally` — fail-closed for UX consistency.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (!isUnauthorizedError(error)) throw error;
    } finally {
      // Critical section against the classic logout/me race:
      //   me request ──▶ logout ──▶ old me response lands
      // 1. Abort any in-flight `auth.me` request so a stale response cannot
      //    write an authenticated user back into the cache after we reset it.
      await utils.auth.me.cancel().catch(() => undefined);
      // 2. Reset the cache to server truth: the session token was just cleared
      //    backend-side, so `null` IS the authoritative value — no refetch or
      //    broad invalidation needed.
      utils.auth.me.setData(undefined, null);
      // 3. Clear browser-side mirrors of the session (Preview Bearer token +
      //    runtime user info copy) so nothing survives client-side.
      clearSessionTokenMirror();
      writeRuntimeUserInfo(null);
    }
  }, [logoutMutation, utils]);

  const isLoading = meQuery.isLoading;
  const isLoggingOut = logoutMutation.isPending;
  const user = meQuery.data ?? null;
  const isAuthenticated = Boolean(meQuery.data);
  // Legacy API preserved (`loading`), plus the finer-grained fields.
  const loading = isLoading || isLoggingOut;
  const error = meQuery.error ?? logoutMutation.error ?? null;

  let status: AuthStatus;
  if (isLoggingOut) status = "logging-out";
  else if (isLoading) status = "loading";
  else if (isAuthenticated) status = "authenticated";
  else if (meQuery.error) status = "error";
  else status = "unauthenticated";

  // Mirror the SETTLED session into localStorage for non-React consumers
  // (preview runtime). Effect-only: side effects are illegal during render.
  // Idempotent, so React StrictMode double-invocation is harmless.
  useEffect(() => {
    if (isLoading) return; // don't clobber the mirror with pre-query state
    writeRuntimeUserInfo(user);
  }, [isLoading, user]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    // Navigate only once the server gave a DEFINITIVE answer (success with
    // null). Loading states, transient network errors and in-progress logouts
    // must never trigger a redirect — network failure ≠ logged out.
    if (!meQuery.isSuccess || isAuthenticated) return;

    if (typeof window === "undefined") return;

    const { pathname } = window.location;
    // Already on (or under) the login page → prevents redirect loops and
    // StrictMode double-navigation from re-triggering a full page load.
    if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`))
      return;

    if (redirectPath) {
      if (pathname === redirectPath) return;
      const safeTarget = sanitizeRedirectPath(redirectPath);
      if (!safeTarget) return; // open-redirect attempt → ignore silently
      window.location.href = safeTarget;
      return;
    }
    goLogin();
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    meQuery.isSuccess,
    isAuthenticated,
  ]);

  // Stable identities: `utils` proxies are stable across renders.
  const refresh = useCallback(() => utils.auth.me.refetch(), [utils]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isLoggingOut,
    loading,
    status,
    error,
    refresh,
    logout,
  };
}
