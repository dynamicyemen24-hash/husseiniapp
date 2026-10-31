/**
 * Public surface of the auth layer. Consumers should depend on this barrel
 * (or on the `useAuth` hook) rather than reaching into internal modules.
 */
export {
  AUTH_GC_TIME_MS,
  AUTH_MAX_RETRIES,
  AUTH_STALE_TIME_MS,
  LOGIN_PATH,
} from "./auth.constants";
export {
  getTrpcErrorCode,
  isTransientAuthError,
  isUnauthorizedError,
} from "./auth.errors";
export { clearSessionTokenMirror, writeRuntimeUserInfo } from "./auth.storage";
export { sanitizeRedirectPath } from "./auth.utils";
