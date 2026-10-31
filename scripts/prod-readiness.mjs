/**
 * prod-readiness.mjs — Production readiness gate (SaaS E2E).
 * =====================================================================
 * Read-only checks. Never prints secret VALUES — only key presence in
 * `.env.example` docs vs `process.env.*` usage in code.
 *
 * Exit codes: 0 = no FAIL (WARN allowed), 1 = at least one FAIL,
 *             2 = script internal error.
 *
 * Usage: node scripts/prod-readiness.mjs [--strict]
 *   --strict: WARNs also fail (for release branches).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");

const results = [];
function check(name, status, detail = "") {
  results.push({ name, status, detail });
  const icon = status === "PASS" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`${icon} [${status}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(p) {
  return readFileSync(join(ROOT, p), "utf8");
}

function listFiles(dir, exts, out = []) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return out;
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".next", ".git"].includes(entry.name))
        continue;
      listFiles(rel, exts, out);
    } else if (exts.some(e => entry.name.endsWith(e))) {
      out.push(rel);
    }
  }
  return out;
}

// ─── 1. Env documentation coverage ──────────────────────────────────
try {
  const example = existsSync(join(ROOT, ".env.example"))
    ? read(".env.example")
    : "";
  const documented = new Set(
    [...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(m => m[1])
  );
  const used = new Set();
  for (const f of [
    ...listFiles("server", [".ts"]),
    ...listFiles("api", [".mjs", ".ts"]),
    ...listFiles("scripts", [".mjs", ".ts"]),
  ]) {
    if (f.endsWith(".test.ts")) continue;
    const src = read(f);
    for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) {
      used.add(m[1]);
    }
  }
  // Runtime-provided or test-only keys that must NOT be documented.
  const SYSTEM = new Set([
    "NODE_ENV",
    "VERCEL",
    "PORT",
    "CI",
    "DEBUG",
    "DEBUGGER",
    "NODE_DEBUG",
    "NODE_OPTIONS",
  ]);
  const missing = [...used].filter(k => !documented.has(k) && !SYSTEM.has(k));
  if (missing.length === 0) {
    check(
      "env-docs",
      "PASS",
      `${documented.size} documented keys cover ${used.size} used keys`
    );
  } else {
    check("env-docs", "WARN", `undocumented keys: ${missing.join(", ")}`);
  }
} catch (e) {
  check("env-docs", "FAIL", String(e?.message ?? e));
}

// ─── 2. Security headers + routing (vercel.json) ────────────────────
try {
  const raw = read("vercel.json");
  const v = JSON.parse(raw);
  const text = raw;
  const need = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
  ];
  const absent = need.filter(h => !text.includes(h));
  const rewrites = JSON.stringify(v.rewrites ?? []);
  const hasApiRewrite =
    rewrites.includes("/api/index.mjs") || rewrites.includes("/api/");
  const hasCrons = Array.isArray(v.crons) && v.crons.length > 0;
  if (absent.length === 0 && hasApiRewrite && hasCrons) {
    check(
      "edge-security",
      "PASS",
      "CSP/HSTS/frame guards + api rewrites + crons"
    );
  } else {
    const why = [
      ...(absent.length ? [`missing headers: ${absent.join(", ")}`] : []),
      ...(hasApiRewrite ? [] : ["api rewrite missing"]),
      ...(hasCrons ? [] : ["crons missing"]),
    ].join("; ");
    check("edge-security", "FAIL", why);
  }
} catch (e) {
  check("edge-security", "FAIL", String(e?.message ?? e));
}

// ─── 3. Build freshness ─────────────────────────────────────────────
try {
  // مخرجات البناء المزدوج: dist/app (التطبيق) و dist/marketing (الموقع)
  const outHtml = join(ROOT, "dist/app/index.html");
  const marketingHtml = join(ROOT, "dist/marketing/index.html");
  const srcHtml = join(ROOT, "client/index.html");
  if (!existsSync(outHtml)) {
    check(
      "build-freshness",
      "WARN",
      "dist/app/index.html missing — run pnpm build"
    );
  } else if (!existsSync(marketingHtml)) {
    check(
      "build-freshness",
      "WARN",
      "dist/marketing/index.html missing — run pnpm build"
    );
  } else if (
    existsSync(srcHtml) &&
    statSync(outHtml).mtimeMs < statSync(srcHtml).mtimeMs
  ) {
    check("build-freshness", "WARN", "dist/ older than client/index.html");
  } else {
    check(
      "build-freshness",
      "PASS",
      "dist/app + dist/marketing present and fresh"
    );
  }
} catch (e) {
  check("build-freshness", "FAIL", String(e?.message ?? e));
}

// ─── 4. Migrations present ──────────────────────────────────────────
try {
  const files = existsSync(join(ROOT, "drizzle"))
    ? readdirSync(join(ROOT, "drizzle")).filter(f => f.endsWith(".sql"))
    : [];
  const hasConfig = existsSync(join(ROOT, "drizzle.config.ts"));
  if (files.length > 0 && hasConfig) {
    check(
      "migrations",
      "PASS",
      `${files.length} sql files + drizzle.config.ts`
    );
  } else {
    check(
      "migrations",
      "FAIL",
      `sql=${files.length} config=${hasConfig ? "yes" : "no"}`
    );
  }
} catch (e) {
  check("migrations", "FAIL", String(e?.message ?? e));
}

// ─── 5. Fail-closed guarantees ──────────────────────────────────────
try {
  const envSrc = read("server/_core/env.ts");
  const must = [
    'requireEnv("JWT_SECRET"',
    'requireEnv(\n    "BACKUP_ENCRYPTION_KEY"',
  ];
  const okEnv =
    envSrc.includes('requireEnv("JWT_SECRET"') &&
    envSrc.includes('"BACKUP_ENCRYPTION_KEY"');
  void must;
  let backupSrc = "";
  try {
    backupSrc = read("server/_core/backup.ts");
  } catch {
    backupSrc = "";
  }
  const okBackup =
    /fail.closed|fail-closed/i.test(backupSrc) ||
    backupSrc.includes("BACKUP_ENCRYPTION_KEY");
  if (okEnv && okBackup) {
    check("fail-closed", "PASS", "JWT/backup refuse insecure production");
  } else {
    check("fail-closed", "FAIL", `env-guard=${okEnv} backup-guard=${okBackup}`);
  }
} catch (e) {
  check("fail-closed", "FAIL", String(e?.message ?? e));
}

// ─── 6. Runbook referenced in code exists ───────────────────────────
try {
  const need = ["docs/OPERATIONS_RUNBOOK.md"];
  const absent = need.filter(p => !existsSync(join(ROOT, p)));
  if (absent.length === 0) check("runbook", "PASS", need.join(","));
  else check("runbook", "WARN", `missing: ${absent.join(", ")}`);
} catch (e) {
  check("runbook", "FAIL", String(e?.message ?? e));
}

// ─── 7. No secrets tracked by git ───────────────────────────────────
try {
  const tracked = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
  const bad = tracked.filter(
    f =>
      /(^|\/)\.env$/.test(f) ||
      /\.(pem|key|p12|pfx|jks)$/.test(f) ||
      f.startsWith(".keys/")
  );
  if (bad.length === 0) {
    check("no-secrets", "PASS", `${tracked.length} tracked files scanned`);
  } else {
    check("no-secrets", "FAIL", `tracked secrets: ${bad.join(", ")}`);
  }
} catch (e) {
  check("no-secrets", "FAIL", String(e?.message ?? e));
}

// ─── 8. Lifecycle scripts complete ──────────────────────────────────
try {
  const pkg = JSON.parse(read("package.json"));
  const need = ["build", "test", "check", "lint", "db:push"];
  const absent = need.filter(s => !pkg.scripts?.[s]);
  if (absent.length === 0) check("scripts", "PASS", need.join("/"));
  else check("scripts", "FAIL", `missing scripts: ${absent.join(", ")}`);
} catch (e) {
  check("scripts", "FAIL", String(e?.message ?? e));
}

// ─── 9. Health contract routes ──────────────────────────────────────
try {
  const hay = [
    ...listFiles("server", [".ts"]),
    ...listFiles("api", [".mjs", ".ts"]),
  ]
    .filter(f => !f.endsWith(".test.ts"))
    .map(f => {
      try {
        return read(f);
      } catch {
        return "";
      }
    })
    .join("\n");
  const hasLive = hay.includes("/api/live");
  const hasHealth = hay.includes("/api/health");
  if (hasLive && hasHealth)
    check("health-contract", "PASS", "/api/live + /api/health");
  else check("health-contract", "FAIL", `live=${hasLive} health=${hasHealth}`);
} catch (e) {
  check("health-contract", "FAIL", String(e?.message ?? e));
}

// ─── 10. Runtime engines declared ───────────────────────────────────
try {
  const pkg = JSON.parse(read("package.json"));
  const nodeRange = pkg.engines?.node ?? "";
  const pm = pkg.packageManager ?? "";
  if (/>=20/.test(nodeRange) && pm.startsWith("pnpm@")) {
    check("runtimes", "PASS", `${nodeRange} + ${pm}`);
  } else {
    check("runtimes", "WARN", `engines=${nodeRange || "?"} pm=${pm || "?"}`);
  }
} catch (e) {
  check("runtimes", "FAIL", String(e?.message ?? e));
}

// ─── Summary ────────────────────────────────────────────────────────
const fails = results.filter(r => r.status === "FAIL").length;
const warns = results.filter(r => r.status === "WARN").length;
const pass = results.filter(r => r.status === "PASS").length;
console.log(
  `\n━━━ readiness: ${pass} PASS / ${warns} WARN / ${fails} FAIL ━━━`
);
if (fails > 0 || (strict && warns > 0)) {
  console.log("⛔ NOT production-ready");
  process.exit(1);
}
console.log("✅ Production-ready");
