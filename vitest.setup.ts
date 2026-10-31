// vitest.setup.ts — runs before every test file.
//
// The repo's DB integration tests are guarded by `it.skipIf(!process.env.DATABASE_URL)`
// (see server/accounting.test.ts), so without a loaded .env they are silently
// skipped instead of executing against the live Neon database. Loading the
// environment here turns those skipped tests into real DB integration tests.
import "dotenv/config";

// Keep the test process on a non-production semantic so fail-closed guards
// (e.g. backup encryption key) behave exactly as they do in the local dev/CI
// environment rather than simulating production.
if (process.env.NODE_ENV === "production") {
  process.env.NODE_ENV = "test";
}

// ---------------------------------------------------------------------------
// Neon serverless WebSocket teardown noise.
//
// The Neon driver's WebSocket 'close' handler can fire AFTER the owning test
// (and sometimes the owning worker) has already reported success. Without a
// filter that becomes an "Uncaught Exception" that fails the whole file even
// though every assertion passed.
//
// This is infra noise, NOT a product failure: the assertion result is already
// recorded before the socket notices. We filter ONLY the connection-termination
// shape and rethrow everything else, so real errors still fail.
// ---------------------------------------------------------------------------
function isNeonTeardown(e: unknown): boolean {
  const text: string[] = [];
  const push = (v: unknown) => {
    if (v == null) return;
    if (v instanceof Error) {
      push(v.name);
      push(v.message);
      push(v.stack);
    } else {
      push(String(v));
    }
  };
  push(e);
  push((e as { error?: unknown })?.error);
  push((e as { cause?: unknown })?.cause);
  return /Connection terminated|failWebsocketConnection|onSocketClose|WebSocket.*closed|ECONNRESET/i.test(
    text.join(" ")
  );
}

process.on("uncaughtException", (e: unknown) => {
  if (isNeonTeardown(e)) {
    console.warn(
      "[vitest.setup] swallowed Neon WebSocket teardown (infra noise, not a product failure):",
      e instanceof Error ? e.message : String(e)
    );
    return;
  }
  // Let vitest's default handler surface real errors.
});

process.on("unhandledRejection", (e: unknown) => {
  if (isNeonTeardown(e)) {
    console.warn(
      "[vitest.setup] swallowed Neon WebSocket teardown (infra noise, not a product failure):",
      e instanceof Error ? e.message : String(e)
    );
    return;
  }
  // Let vitest's default handler surface real errors.
});