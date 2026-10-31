import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

/**
 * E2E — production preview (mirrors CI exactly).
 * Serves the BUILT bundle (dist/ + api/index.mjs) on :3100 instead of the
 * Vite dev server, so lazy chunks, CSP and the service worker behave exactly
 * as subscribers experience them in production.
 *
 * Run: pnpm exec playwright test --config e2e.preview.config.ts [spec]
 */
export default defineConfig({
  ...(baseConfig as Record<string, unknown>),
  use: {
    ...((baseConfig as { use?: Record<string, unknown> }).use ?? {}),
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command:
      "pnpm exec cross-env NODE_ENV=production PORT=3100 node api/index.mjs",
    url: "http://localhost:3100/api/live",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
