import { defineConfig } from "@playwright/test";
import "dotenv/config";

/**
 * E2E — production-grade guard rails.
 *
 * dotenv/config loads .env so E2E_USERNAME / E2E_PASSWORD (and DATABASE_URL
 * for the auto-started dev webServer) are available locally exactly like CI
 * provides them via workflow env. Existing process env always wins (dotenv
 * does not override), so CI secrets are unaffected.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    // CI sets E2E_BASE_URL to the already-running preview server (port 3000);
    // locally default to 3100 with the auto-started dev server below.
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3100",
    // Use the system Chrome — no browser download needed (CI/offline-safe)
    channel: "chrome",
    trace: "retain-on-failure",
    locale: "ar-YE",
    viewport: { width: 1280, height: 720 },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "pnpm exec cross-env NODE_ENV=development PORT=3100 tsx server/_core/index.ts",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chrome",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
    },
  ],
});
