/**
 * Central configuration for the client-side authentication layer.
 *
 * The server session (signed httpOnly cookie, optionally mirrored as a Bearer
 * token for WebView/Preview contexts) is the ONLY source of truth; these
 * constants only tune how the client observes it.
 */

/** How long a resolved `auth.me` payload stays fresh without refetching. */
export const AUTH_STALE_TIME_MS = 5 * 60 * 1000;

/** How long an inactive `auth.me` cache entry survives before GC. */
export const AUTH_GC_TIME_MS = 10 * 60 * 1000;

/**
 * Max retries for TRANSIENT failures (transport / 5xx / rate limit) of the
 * `auth.me` query. UNAUTHORIZED is a definitive answer and is never retried —
 * see `isTransientAuthError` in auth.errors.ts.
 */
export const AUTH_MAX_RETRIES = 2;

/**
 * sessionStorage key where the Manus preview runtime mirrors the session token
 * so it can be forwarded as a Bearer header when cookies are blocked
 * (Safari ITP / private browsing / WebView). Cleared on logout.
 */
export const SESSION_MIRROR_STORAGE_KEY = "manus-cookie";

/**
 * localStorage key where the settled `auth.me` payload is mirrored for
 * non-React consumers (preview runtime). This is a convenience mirror, NEVER
 * the source of truth, and is removed as soon as the session ends.
 */
export const RUNTIME_USER_INFO_STORAGE_KEY = "manus-runtime-user-info";

/** Path of the unified login page used by `goLogin()`. */
export const LOGIN_PATH = "/login";
