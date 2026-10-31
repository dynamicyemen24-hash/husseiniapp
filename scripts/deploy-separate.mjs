#!/usr/bin/env node
/**
 * Deploy Marketing & App to separate Vercel projects
 *
 * Usage:
 *   node scripts/deploy-separate.mjs
 *
 * Requires:
 *   - VERCEL_TOKEN in environment
 *   - Two Vercel projects created:
 *     1. Marketing project (e.g., alhusainia-marketing)
 *     2. App project (e.g., alhusainia-app)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = import.meta.dirname;
const ROOT_DIR = path.resolve(PROJECT_ROOT, "..");

function run(cmd, options = {}) {
  console.log(`\n🔧 ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: ROOT_DIR, ...options });
    return true;
  } catch (e) {
    console.error(`❌ Failed: ${cmd}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Deploying Marketing & App to separate Vercel projects...\n");

  // Check for Vercel token
  if (!process.env.VERCEL_TOKEN) {
    console.error("❌ VERCEL_TOKEN environment variable is required");
    process.exit(1);
  }

  // Build both
  console.log("📦 Building marketing site...");
  if (!run("pnpm run build:marketing")) process.exit(1);

  console.log("\n📦 Building app...");
  if (!run("pnpm run build:app")) process.exit(1);

  // Build server
  console.log("\n📦 Building server...");
  if (!run("node scripts/build-server.cjs")) process.exit(1);

  // Deploy marketing
  console.log("\n🌐 Deploying marketing to Vercel...");
  const marketingConfig = path.resolve(ROOT_DIR, "vercel.marketing.json");
  if (
    !run(
      `vercel deploy --prebuilt --prod --token=${process.env.VERCEL_TOKEN} --local-config=${marketingConfig} dist/marketing`
    )
  ) {
    console.error("❌ Marketing deployment failed");
    process.exit(1);
  }

  // Deploy app
  console.log("\n🌐 Deploying app to Vercel...");
  const appConfig = path.resolve(ROOT_DIR, "vercel.app.json");
  if (
    !run(
      `vercel deploy --prebuilt --prod --token=${process.env.VERCEL_TOKEN} --local-config=${appConfig} dist/app`
    )
  ) {
    console.error("❌ App deployment failed");
    process.exit(1);
  }

  console.log("\n✅ Both deployments completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("   1. Configure custom domains in Vercel dashboard");
  console.log(
    "   2. Marketing: https://alhusaainia.vercel.app (or custom domain)"
  );
  console.log(
    "   3. App: https://app.alhusaainia.vercel.app (or custom domain)"
  );
  console.log("   4. Update DNS records to point to Vercel");
}

main().catch(e => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
