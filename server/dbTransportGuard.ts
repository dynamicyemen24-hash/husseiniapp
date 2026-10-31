/**
 * dbTransportGuard.ts — test-support ONLY (never imported by app code).
 * =====================================================================
 * Distinguishes INFRASTRUCTURE outage from PRODUCT failure for live-DB tests.
 *
 * Background: GitHub runners intermittently cannot open the Neon WebSocket
 * transport at all (DNS/TLS/fetch failure before any SQL runs — verified via
 * the 'Diagnose DB transport' CI step: DNS resolves, TCP 443 reachable, yet
 * session establishment fails). Failing the whole pipeline on that proves
 * nothing about the code while blocking subscriber deploys.
 *
 * Contract:
 * - ONLY connection-level errors skip (loudly, via a ::warning:: annotation
 *   that GitHub surfaces on every affected run + a console banner).
 * - Assertion failures, constraint violations and unexpected errors ALWAYS
 *   fail — the skip can never mask a product regression.
 * - Local runs with a healthy DATABASE_URL are unaffected (probe passes).
 */
import { getPool } from "./db";

const TRANSPORT_PATTERNS =
  /fetch failed|WebSocket|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|UND_ERR|ConnectTimeout|open a WebSocket|network is unreachable|EPIPE/i;

export function isTransportError(e: unknown): boolean {
  const parts: string[] = [];
  const ctorName = (e as { constructor?: { name?: string } })?.constructor
    ?.name;
  if (ctorName) parts.push(ctorName);
  if (e instanceof Error) parts.push(e.name, e.message, e.stack ?? "");
  else parts.push(String(e));
  // The Neon serverless driver surfaces dead transports as an (often
  // message-less) DOM-style ErrorEvent wrapping a TypeError from undici's
  // failWebsocketConnection — match on shape + stack, not just text.
  const inner = (e as { error?: unknown })?.error;
  if (inner instanceof Error) {
    parts.push(
      inner.name,
      inner.message,
      inner.stack ?? "",
      inner.constructor?.name ?? ""
    );
  } else if (inner !== undefined) {
    parts.push(String(inner));
  }
  const cause = (e as { cause?: unknown })?.cause;
  if (cause instanceof Error) parts.push(cause.name, cause.message);
  else if (cause !== undefined) parts.push(String(cause));
  const text = parts.join(" ");
  if (/ErrorEvent|failWebsocketConnection|onSocketClose/.test(text))
    return true;
  return TRANSPORT_PATTERNS.test(text);
}

/**
 * Probe the live transport with a real round-trip (neon Pool.connect() is
 * lazy and resolves before any packet flows — only SELECT 1 proves the path).
 * Skips the calling test on transport outage, throws on anything else.
 */
export async function requireLiveTransport(
  skip: (message?: string) => never
): Promise<void> {
  const pool = getPool();
  if (!pool) return skip("no database pool");
  let alive = false;
  try {
    const client = await pool.connect();
    try {
      await client.query("select 1");
      alive = true;
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    if (!isTransportError(e)) throw e;
  }
  if (!alive) {
    // GitHub parses annotations from STDOUT — console.log, not console.warn.
    console.log(
      "::warning::[dbTransportGuard] Neon transport unreachable from this runner — " +
        "skipping LIVE-DB test (infra outage, NOT a product failure). " +
        "See the 'Diagnose DB transport' CI step; if this persists, compare " +
        "secrets.DATABASE_URL against the Neon dashboard (password rotation is the usual cause)."
    );
    return skip("neon transport unreachable");
  }
}
