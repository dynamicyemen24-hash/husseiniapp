import { TRPCClientError } from "@trpc/client";

/**
 * tRPC error classification for the auth layer.
 *
 * The key distinction: a transport failure (server unreachable) is NOT the
 * same as "logged out". Only a definitive UNAUTHORIZED answer means the
 * session is gone; everything else may be transient.
 */

/** tRPC codes that describe transient/infra failures worth retrying. */
const RETRYABLE_TRPC_CODES = new Set([
  "INTERNAL_SERVER_ERROR",
  "TIMEOUT",
  "TOO_MANY_REQUESTS",
]);

type WithErrorCode = { data?: { code?: unknown } };

/**
 * Extract a tRPC error code from an unknown thrown value.
 *
 * Works for `TRPCClientError` instances as well as framework-wrapped copies
 * (duck-typed fallback), because tRPC always exposes the server code at
 * `error.data.code`. Returns `null` when there is no code — which is exactly
 * how transport-level failures (e.g. "Failed to fetch") look.
 */
export function getTrpcErrorCode(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const candidate: WithErrorCode | null =
    error instanceof TRPCClientError ? error : (error as WithErrorCode);
  const code = candidate?.data?.code;
  return typeof code === "string" ? code : null;
}

/** True when the error is a definitive "no session" answer from the server. */
export function isUnauthorizedError(error: unknown): boolean {
  return getTrpcErrorCode(error) === "UNAUTHORIZED";
}

/**
 * True when the error looks transient (transport failure or retryable server
 * condition) and therefore must NOT be treated as "unauthenticated".
 */
export function isTransientAuthError(error: unknown): boolean {
  const code = getTrpcErrorCode(error);
  // No code at all → transport-level failure ("Failed to fetch", timeout…).
  return code === null || RETRYABLE_TRPC_CODES.has(code);
}
