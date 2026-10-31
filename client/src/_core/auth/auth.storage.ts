import {
  RUNTIME_USER_INFO_STORAGE_KEY,
  SESSION_MIRROR_STORAGE_KEY,
} from "./auth.constants";

/**
 * Browser storage access for the auth layer.
 *
 * Design rules:
 * - SSR-safe: every access checks for the global first, so this module can be
 *   imported in non-browser environments without throwing.
 * - Exception-safe: restricted contexts (private browsing, quota exceeded,
 *   disabled storage) degrade silently instead of crashing the app.
 * - NOT a source of truth: authentication state comes exclusively from
 *   `auth.me` / the server session cookie. These keys are convenience mirrors.
 */

function runQuietly(operation: () => void): void {
  try {
    operation();
  } catch {
    // Storage unavailable / quota exceeded / serialization failure.
    // The mirror is best-effort by design — never surface to the user.
  }
}

/**
 * Remove the mirrored session token from sessionStorage so header-based
 * sessions (Safari ITP / WebView Bearer fallback) are logged out too.
 */
export function clearSessionTokenMirror(): void {
  if (typeof sessionStorage === "undefined") return;
  runQuietly(() => sessionStorage.removeItem(SESSION_MIRROR_STORAGE_KEY));
}

/**
 * Mirror the settled `auth.me` payload for non-React consumers. Writing `null`
 * removes the entry entirely (logout / session expiry), so no stale user data
 * survives after the session ends. Values are plain JSON-serializable query
 * payloads; a serialization failure is swallowed rather than breaking logout.
 */
export function writeRuntimeUserInfo(user: unknown): void {
  if (typeof localStorage === "undefined") return;
  runQuietly(() => {
    if (user === null || user === undefined) {
      localStorage.removeItem(RUNTIME_USER_INFO_STORAGE_KEY);
    } else {
      localStorage.setItem(RUNTIME_USER_INFO_STORAGE_KEY, JSON.stringify(user));
    }
  });
}
