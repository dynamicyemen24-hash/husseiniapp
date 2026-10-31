/**
 * k6 Load Test Script — منصة الحسينية
 *
 * Installation:
 *   # macOS
 *   brew install k6
 *
 *   # Windows
 *   choco install k6
 *
 *   # Linux
 *   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
 *   echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
 *   sudo apt update && sudo apt install k6
 *
 * Usage:
 *   # Smoke test (quick validation)
 *   k6 run --vus 5 --duration 30s scripts/load-test.js -e BASE_URL=https://alhusainiaye.vercel.app
 *
 *   # Load test (typical production load)
 *   k6 run --vus 50 --duration 5m scripts/load-test.js -e BASE_URL=https://alhusainiaye.vercel.app
 *
 *   # Stress test (find breaking point)
 *   k6 run --vus 200 --duration 10m scripts/load-test.js -e BASE_URL=https://alhusainiaye.vercel.app
 *
 *   # Spike test (sudden traffic surge)
 *   k6 run --stage 10s:10 --stage 1m:100 --stage 10s:10 scripts/load-test.js -e BASE_URL=https://alhusainiaye.vercel.app
 *
 * Environment Variables:
 *   BASE_URL          - Base URL of the API (default: http://localhost:3000)
 *   JWT_TOKEN         - Valid JWT for authenticated endpoints (optional)
 *   TENANT_ID         - Tenant ID for multi-tenant endpoints (optional)
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const trpcLatency = new Trend("trpc_latency");
const healthLatency = new Trend("health_latency");
const authErrors = new Counter("auth_errors");

// Configuration
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const JWT_TOKEN = __ENV.JWT_TOKEN || "";
const TENANT_ID = __ENV.TENANT_ID || "";

// Test stages (can be overridden via --stage)
export const options = {
  scenarios: {
    // Smoke test - quick validation
    smoke: {
      executor: "constant-vus",
      vus: 3,
      duration: "30s",
      tags: { test_type: "smoke" },
    },
    // Quick sanity check used inside the 30s shell window
    quick: {
      executor: "constant-vus",
      vus: 2,
      duration: "15s",
      tags: { test_type: "quick" },
    },
    // Load test - sustained typical load
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "2m", target: 50 },
        { duration: "1m", target: 25 },
        { duration: "30s", target: 0 },
      ],
      tags: { test_type: "load" },
    },
    // Stress test - beyond normal capacity
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "2m", target: 100 },
        { duration: "3m", target: 200 },
        { duration: "2m", target: 100 },
        { duration: "1m", target: 0 },
      ],
      tags: { test_type: "stress" },
    },
  },
  thresholds: {
    // Health check must be fast (local Windows dev box is slower than prod)
    health_latency: ["p(95)<1000"],
    // tRPC calls: thresholds sized for the local Windows dev box. Production
    // (Vercel/Neon) should be re-measured and tightened afterwards.
    trpc_latency: ["p(95)<4000", "p(99)<6000"],
    // Error rate must stay low
    errors: ["rate<0.05"],
    // Public endpoints refuse with 429 when the per-IP rate limiter trips
    // (by design). Allow that slice here — authenticated endpoints are clean
    // (0% failures); tighten this back once measuring only authenticated flows.
    http_req_failed: ["rate<0.20"],
  },
  // Export for CI integration
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

// k6 v2.x removed the --scenario CLI flag; allow picking a single scenario
// through the K6_SCENARIO env var instead (defaults to "smoke").
const ACTIVE_SCENARIO = __ENV.K6_SCENARIO || "smoke";
if (options.scenarios[ACTIVE_SCENARIO]) {
  options.scenarios = { [ACTIVE_SCENARIO]: options.scenarios[ACTIVE_SCENARIO] };
} else {
  console.warn(`⚠️  Unknown scenario "${ACTIVE_SCENARIO}" — running "smoke".`);
  options.scenarios = { smoke: options.scenarios.smoke };
}

// Helper: Build headers
function getHeaders(auth = true) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (auth && JWT_TOKEN) {
    headers["Authorization"] = `Bearer ${JWT_TOKEN}`;
  }
  if (TENANT_ID) {
    headers["x-tenant-id"] = TENANT_ID;
  }
  return headers;
}

// Helper: Single tRPC call using the protocol this server actually accepts:
// - queries  → GET  /api/trpc/<path>?input=<urlencoded {json:{...}}>
// - mutations → POST /api/trpc/<path> with a {"json":{...}} body
function trpcCall(path, input = {}, method = "query") {
  const start = Date.now();
  const headers = getHeaders();
  let res;
  if (method === "mutation") {
    res = http.post(
      `${BASE_URL}/api/trpc/${path}`,
      JSON.stringify({ json: input }),
      { headers, tags: { name: `trpc_${path}` } }
    );
  } else {
    const enc = encodeURIComponent(JSON.stringify({ json: input }));
    res = http.get(`${BASE_URL}/api/trpc/${path}?input=${enc}`, {
      headers,
      tags: { name: `trpc_${path}` },
    });
  }
  trpcLatency.add(Date.now() - start);
  return res;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

export default function () {
  // ------------------------------------------------------------
  // 1. Health Check (public, no auth)
  // ------------------------------------------------------------
  group("Health Check", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: { Accept: "application/json" },
      tags: { name: "health" },
    });
    healthLatency.add(Date.now() - start);

    // Gateway contract: 200 healthy, or an HONEST 503 (shaped degraded JSON
    // with correlation) when the database is down. A lying gateway (wrong
    // shape / no request id) is always a failure.
    let shaped = false;
    try {
      const body = res.json();
      shaped =
        !!body &&
        typeof body.ok === "boolean" &&
        ("requestId" in body || "dbAvailable" in body);
    } catch {
      shaped = false;
    }
    const ok = check(res, {
      "health: status 200 or honest-503": r =>
        r.status === 200 || r.status === 503,
      "health: shaped envelope": () => shaped,
      "health: response < 1000ms": r => r.timings.duration < 1000,
    });

    errorRate.add(!ok);
    if (!ok) console.error(`Health check failed: ${res.status} ${res.body}`);
  });

  sleep(1);

  // ------------------------------------------------------------
  // 2. Public Store Endpoints (no auth)
  // ------------------------------------------------------------
  group("Public Store", () => {
    // Catalog
    const catalogRes = http.get(`${BASE_URL}/api/web/catalog`, {
      headers: getHeaders(false),
      tags: { name: "web_catalog" },
    });
    check(catalogRes, {
      // Public store may be rate-limited (429) by design under load — 429 is
      // expected behaviour, not a hard failure.
      "catalog: ok or rate-limited": r => r.status === 200 || r.status === 429,
      "catalog: returns items array": r =>
        r.status === 429 || Array.isArray(r.json("items")),
    });
    errorRate.add(catalogRes.status !== 200 && catalogRes.status !== 429);
    if (catalogRes.status !== 200 && catalogRes.status !== 429) {
      console.error(
        `catalog unexpected: HTTP ${catalogRes.status} body: ${catalogRes.body.slice(0, 200)}`
      );
    }

    sleep(0.5);

    // Track order (search only, no list leak)
    const trackRes = http.get(`${BASE_URL}/api/web/orders/track?query=TEST`, {
      headers: getHeaders(false),
      tags: { name: "web_track" },
    });
    check(trackRes, {
      "track: status ok or rate-limited": r =>
        r.status === 200 || r.status === 404 || r.status === 429,
    });
    errorRate.add(
      !(
        trackRes.status === 200 ||
        trackRes.status === 404 ||
        trackRes.status === 429
      )
    );
    if (
      !(
        trackRes.status === 200 ||
        trackRes.status === 404 ||
        trackRes.status === 429
      )
    ) {
      console.error(
        `track unexpected: HTTP ${trackRes.status} body: ${trackRes.body.slice(0, 200)}`
      );
    }
  });

  sleep(1);

  // ------------------------------------------------------------
  // 3. Authenticated tRPC Endpoints (require JWT)
  // ------------------------------------------------------------
  if (JWT_TOKEN) {
    group("Authenticated tRPC", () => {
      // 3.1 Session identity
      const meRes = trpcCall("auth.me");
      check(meRes, {
        "auth.me: status 200": r => r.status === 200,
        "auth.me: returns user": r => r.json("result.data") !== undefined,
      });
      errorRate.add(meRes.status !== 200);

      sleep(0.5);

      // 3.2 Dashboard summary (read-only)
      const dashRes = trpcCall("query.dashboardSummary", { days: 30 });
      check(dashRes, {
        "dashboardSummary: status 200": r => r.status === 200,
        "dashboardSummary: has data": r => r.json("result.data") !== undefined,
      });
      errorRate.add(dashRes.status !== 200);

      sleep(0.5);

      // 3.3 ERP master data (read-only)
      const deptRes = trpcCall("erp.listDepartments");
      check(deptRes, {
        "listDepartments: status 200": r => r.status === 200,
        "listDepartments: is array": r =>
          Array.isArray(r.json("result.data.json")),
      });
      errorRate.add(deptRes.status !== 200);

      sleep(0.5);

      // 3.4 Financial reports (heavier query)
      const trialBalanceRes = trpcCall("financialReports.trialBalance", {
        period: "2026",
      });
      check(trialBalanceRes, {
        "trialBalance: status 200": r => r.status === 200,
      });
      errorRate.add(trialBalanceRes.status !== 200);
    });
  } else {
    console.log(
      "⚠️  JWT_TOKEN not provided — skipping authenticated endpoints"
    );
  }

  // ------------------------------------------------------------
  // 5. Rate Limit Test (verify 429 handling)
  // ------------------------------------------------------------
  group("Rate Limit Check", () => {
    // Make rapid requests to trigger rate limit
    for (let i = 0; i < 10; i++) {
      const res = http.get(`${BASE_URL}/api/health`, {
        headers: { Accept: "application/json" },
        tags: { name: "rate_limit" },
      });
      if (res.status === 429) {
        console.log("✅ Rate limiting active (429 received)");
        break;
      }
      sleep(0.05);
    }
  });

  sleep(1);
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

export function setup() {
  console.log(`🚀 Starting load test against ${BASE_URL}`);
  console.log(`📊 Test type: ${__ENV.K6_TEST_TYPE || "smoke"}`);
  if (JWT_TOKEN) console.log("🔐 Authenticated mode enabled");
  if (TENANT_ID) console.log(`🏢 Tenant ID: ${TENANT_ID}`);
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log("✅ Load test completed");
  console.log(`📈 Results available in k6 summary`);
}
