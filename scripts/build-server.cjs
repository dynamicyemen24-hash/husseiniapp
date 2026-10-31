/**
 * Server bundle builder using esbuild Node.js API.
 * Replaces the `esbuild` CLI call in the build script so that the
 * `--alias` flag works reliably across platforms (the CLI `--alias:@shared`
 * syntax is broken on Windows).
 */
const { build } = require("esbuild");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const apiDir = path.join(projectRoot, "api");
const serverlessDir = path.join(projectRoot, "server", "serverless");

// Ensure the output directory exists
fs.mkdirSync(apiDir, { recursive: true });

function baseConfig(entryPoint, outfile) {
  return {
    entryPoints: [entryPoint],
    platform: "node",
    packages: "external",
    bundle: true,
    format: "esm",
    outfile,
    alias: {
      "@shared": path.join(projectRoot, "shared"),
    },
    define: {
      __APP_VERSION__: JSON.stringify(
        require(path.join(projectRoot, "package.json")).version
      ),
    },
    // Production hardening: minified server bundles (smaller cold starts on
    // Vercel) while keeping original names for readable stack traces.
    minify: true,
    keepNames: true,
    legalComments: "none",
    logLevel: "info",
    sourcemap: false,
  };
}

// Map of label → esbuild build options (label kept OUT of build() call).
const jobs = [
  // Main API — single source of truth for the app version = package.json
  [
    "api/index.mjs",
    baseConfig(
      path.join(projectRoot, "server", "prod-entry.ts"),
      path.join(apiDir, "index.mjs")
    ),
  ],
  // Cron serverless trigger (self-contained bundle)
  [
    "api/cron.mjs",
    baseConfig(
      path.join(serverlessDir, "cron.ts"),
      path.join(apiDir, "cron.mjs")
    ),
  ],
  // Strict-rule agent endpoint (self-contained bundle)
  [
    "api/agent.mjs",
    baseConfig(
      path.join(serverlessDir, "agent.ts"),
      path.join(apiDir, "agent.mjs")
    ),
  ],
];

/**
 * Inject the Vite asset manifest into the service worker so the ENTIRE app
 * shell (incl. React.lazy route chunks + locale, none of which index.html
 * references) is precached offline from the very first visit.
 * Reads the `/*__ASSET_MANIFEST__*\/` token inside client/public/sw.js and
 * replaces it with the real list of emitted chunks in dist/app/sw.js.
 */
function injectSWAssetManifest() {
  const publicDir = path.join(projectRoot, "dist", "app");
  const swTemplate = path.join(publicDir, "sw.js");
  const assetsDir = path.join(publicDir, "assets");
  if (!fs.existsSync(swTemplate) || !fs.existsSync(assetsDir)) {
    console.warn(
      "⚠ service worker: dist/app/sw.js أو dist/app/assets غير موجود — تم تجاوز حقن قائمة الأصول"
    );
    return;
  }

  const assets = fs
    .readdirSync(assetsDir)
    .filter(f => /\.(js|css)$/.test(f))
    .sort()
    .map(f => `/assets/${f}`);

  const sw = fs.readFileSync(swTemplate, "utf8");
  const injected = sw.replace(
    "/*__ASSET_MANIFEST__*/ []",
    JSON.stringify(assets)
  );
  fs.writeFileSync(swTemplate, injected);
  console.log(`✓ Service worker manifest injected (${assets.length} chunks)`);
}

Promise.all(jobs.map(([, opts]) => build(opts)))
  .then(() => {
    jobs.forEach(([label]) =>
      console.log(`✓ Serverless bundle built: ${label}`)
    );
    injectSWAssetManifest();
    process.exit(0);
  })
  .catch(err => {
    console.error("✗ Serverless bundling failed:", err);
    process.exit(1);
  });
