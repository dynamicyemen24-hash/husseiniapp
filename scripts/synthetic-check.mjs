#!/usr/bin/env node
/**
 * scripts/synthetic-check.mjs — External synthetic probes (SRE/SLO).
 *
 * Hits (read-only, sends NO credentials and NO real data):
 *   1. GET {base}/api/live          — liveness, expects 200 { ok:true }
 *   2. GET {base}/api/health        — readiness, expects 200 + ok/dbAvailable true
 *   3. GET {base}/api/trpc/auth.me  — tRPC routing, expects HTTP 200 + a valid
 *      tRPC envelope. Unauthenticated `null` is a PASS (proves routing works
 *      without a session cookie).
 *
 * Exit codes: 0 = all checks passed, 1 = any check failed (wire to cron paging),
 *             2 = bad CLI usage.
 * Local dry-run: `node scripts/synthetic-check.mjs --base-url http://127.0.0.1:3000`
 *
 * Env: BASE_URL (or APP_URL) as default base; flags override env.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

function printHelp() {
  console.log(`synthetic-check.mjs — HSY platform synthetic probes (read-only)

Usage:
  node scripts/synthetic-check.mjs [options]

Options:
  --base-url <url>   Base URL of the deployment (default: $BASE_URL, $APP_URL,
                     else http://127.0.0.1:3000). Trailing slash is ignored.
  --timeout <ms>     Per-check timeout in ms (default: ${DEFAULT_TIMEOUT_MS}).
  --json             Print only the final JSON summary (still human-readable
                     lines go to stderr in that mode).
  -h, --help         Show this help and exit 0.

Checks (all GET, no credentials, no writes):
  live      GET /api/live           → 200 + { ok:true }
  health    GET /api/health         → 200 + { ok:true, dbAvailable:true }
  auth.me   GET /api/trpc/auth.me   → HTTP 200 + valid tRPC envelope

Exit codes:
  0  all checks passed
  1  any check failed (page on this from external cron)
  2  bad CLI usage (unknown flag, bad URL/timeout)

Examples:
  node scripts/synthetic-check.mjs --help
  node scripts/synthetic-check.mjs --base-url http://127.0.0.1:3000
  BASE_URL=https://<app>.vercel.app node scripts/synthetic-check.mjs
`);
}

function parseArgs(argv) {
  const opts = {
    baseUrl:
      process.env.BASE_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      "http://127.0.0.1:3000",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    jsonOnly: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      opts.help = true;
    } else if (a === "--base-url") {
      const v = argv[++i];
      if (!v) throw new Error("--base-url requires a value");
      opts.baseUrl = v;
    } else if (a.startsWith("--base-url=")) {
      opts.baseUrl = a.slice("--base-url=".length);
    } else if (a === "--timeout") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0)
        throw new Error("--timeout requires a positive number of ms");
      opts.timeoutMs = Math.floor(v);
    } else if (a.startsWith("--timeout=")) {
      const v = Number(a.slice("--timeout=".length));
      if (!Number.isFinite(v) || v <= 0)
        throw new Error("--timeout requires a positive number of ms");
      opts.timeoutMs = Math.floor(v);
    } else if (a === "--json") {
      opts.jsonOnly = true;
    } else {
      throw new Error(`unknown argument: ${a} (see --help)`);
    }
  }
  let url;
  try {
    url = new URL(opts.baseUrl);
  } catch {
    throw new Error(`invalid --base-url: ${opts.baseUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`invalid --base-url (need http(s)): ${opts.baseUrl}`);
  }
  opts.baseUrl = url.toString().replace(/\/+$/, "");
  return opts;
}

async function fetchJson(url, timeoutMs) {
  const requestId = `synth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-request-id": requestId },
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null; // non-JSON counts as envelope failure where JSON is required
    }
    return {
      status: res.status,
      ms: Date.now() - started,
      requestId: res.headers.get("x-request-id") ?? requestId,
      traceId: res.headers.get("x-trace-id") ?? null,
      body,
      rawShort: typeof text === "string" ? text.slice(0, 200) : "",
    };
  } finally {
    clearTimeout(t);
  }
}

/** tRPC v11 GET responses: single `{ result: { data } }` or batch `[{…}]`. */
function isTrpcEnvelope(body) {
  if (!body || typeof body !== "object") return false;
  if (Array.isArray(body))
    return (
      body.length > 0 &&
      typeof body[0] === "object" &&
      body[0] !== null &&
      ("result" in body[0] || "error" in body[0])
    );
  return "result" in body || "error" in body;
}

function trpcHasError(body) {
  const first = Array.isArray(body) ? body[0] : body;
  return !!first?.error;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(
      `[synthetic-check] usage error: ${e instanceof Error ? e.message : e}`
    );
    console.error("Run with --help for usage.");
    process.exit(2);
  }
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const log = (...a) => {
    (opts.jsonOnly ? console.error : console.log)(...a);
  };
  log(`[synthetic-check] base=${opts.baseUrl} timeout=${opts.timeoutMs}ms`);

  const checks = [];
  let failed = false;

  // 1) Liveness
  try {
    const r = await fetchJson(`${opts.baseUrl}/api/live`, opts.timeoutMs);
    const pass = r.status === 200 && r.body?.ok === true;
    checks.push({
      name: "live",
      pass,
      status: r.status,
      ms: r.ms,
      requestId: r.requestId,
      detail: pass
        ? "ok"
        : `expected 200 {ok:true}, got ${r.status} ${r.rawShort}`,
    });
    log(`[${pass ? "PASS" : "FAIL"}] live (${r.ms}ms, req=${r.requestId})`);
    if (!pass) failed = true;
  } catch (e) {
    checks.push({
      name: "live",
      pass: false,
      status: null,
      ms: null,
      requestId: null,
      detail: e instanceof Error ? e.message : String(e),
    });
    log(`[FAIL] live: ${e instanceof Error ? e.message : e}`);
    failed = true;
  }

  // 2) Readiness (DB-gated — any 503/degraded is a failure for paging)
  try {
    const r = await fetchJson(`${opts.baseUrl}/api/health`, opts.timeoutMs);
    const pass =
      r.status === 200 && r.body?.ok === true && r.body?.dbAvailable === true;
    checks.push({
      name: "health",
      pass,
      status: r.status,
      ms: r.ms,
      requestId: r.requestId,
      detail: pass
        ? `dbLatencyMs=${r.body?.dbLatencyMs} cached=${r.body?.cached} version=${r.body?.version}`
        : `expected 200 {ok:true,dbAvailable:true}, got ${r.status} ${r.rawShort}`,
    });
    log(`[${pass ? "PASS" : "FAIL"}] health (${r.ms}ms, req=${r.requestId})`);
    if (!pass) failed = true;
  } catch (e) {
    checks.push({
      name: "health",
      pass: false,
      status: null,
      ms: null,
      requestId: null,
      detail: e instanceof Error ? e.message : String(e),
    });
    log(`[FAIL] health: ${e instanceof Error ? e.message : e}`);
    failed = true;
  }

  // 3) tRPC routing via public auth.me (unauthenticated null = PASS)
  try {
    const r = await fetchJson(
      `${opts.baseUrl}/api/trpc/auth.me`,
      opts.timeoutMs
    );
    const envelope = isTrpcEnvelope(r.body);
    const pass = r.status === 200 && envelope && !trpcHasError(r.body);
    checks.push({
      name: "auth.me",
      pass,
      status: r.status,
      ms: r.ms,
      requestId: r.requestId,
      detail: pass
        ? "tRPC envelope ok (auth not required)"
        : `expected 200 tRPC result envelope, got ${r.status} ${r.rawShort}`,
    });
    log(`[${pass ? "PASS" : "FAIL"}] auth.me (${r.ms}ms, req=${r.requestId})`);
    if (!pass) failed = true;
  } catch (e) {
    checks.push({
      name: "auth.me",
      pass: false,
      status: null,
      ms: null,
      requestId: null,
      detail: e instanceof Error ? e.message : String(e),
    });
    log(`[FAIL] auth.me: ${e instanceof Error ? e.message : e}`);
    failed = true;
  }

  const summary = {
    ok: !failed,
    base: opts.baseUrl,
    checks,
    time: new Date().toISOString(),
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failed ? 1 : 0);
}

await main();
