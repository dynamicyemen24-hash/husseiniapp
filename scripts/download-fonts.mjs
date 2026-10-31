/**
 * ALHUSAINIA — Font Download Script (v2 — Fontsource CDN)
 * =======================================================
 * Downloads self-hosted WOFF2 subset fonts (Arabic + Latin) from the
 * Fontsource CDN (jsDelivr). Each subset file is ~8-45KB instead of the
 * full ~80-120KB Google bundle.
 *
 * Naming scheme: {family}-{subset}-{weight}-{style}.woff2
 *  - tajawal-arabic-400-normal.woff2
 *  - tajawal-latin-900-normal.woff2
 *  - ibm-plex-sans-arabic-arabic-700-normal.woff2
 *  - ibm-plex-sans-arabic-latin-400-normal.woff2
 *
 * Generates a manifest.json mapping (familyName → weight → sources[])
 * consumed by client/src/lib/fonts.ts.
 *
 * Run: node scripts/download-fonts.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const FONTS_DIR = path.join(process.cwd(), "client", "public", "fonts");
const FONT_CDN = "https://cdn.jsdelivr.net/fontsource/fonts";

/** [fontsourceId, selfHosted slug, cssFamily, weights[]] */
const FONT_REGISTRY = [
  {
    id: "tajawal",
    slug: "tajawal",
    cssFamily: "Tajawal",
    weights: [400, 500, 700, 800, 900],
  },
  {
    id: "ibm-plex-sans-arabic",
    slug: "ibm-plex-sans-arabic",
    cssFamily: "IBM Plex Sans Arabic",
    weights: [300, 400, 500, 600, 700],
  },
];

/** Subset files to fetch per weight. */
const SUBSETS = ["arabic", "latin"];

function filename(slug, subset, weight, style = "normal") {
  return `${slug}-${subset}-${weight}-${style}.woff2`;
}

/** CDN component name (no family prefix — family is the folder). */
function cdnFilename(subset, weight, style = "normal") {
  return `${subset}-${weight}-${style}.woff2`;
}

async function download(url, outPath) {
  // Skip already-downloaded files (idempotent re-runs).
  try {
    const stat = await import("fs/promises").then(fs => fs.stat(outPath));
    if (stat.size > 0) return 0;
  } catch {
    /* not present — proceed */
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  console.log("=== ALHUSAINIA Font Downloader (Fontsource CDN) ===\n");
  mkdirSync(FONTS_DIR, { recursive: true });

  const manifest = {};
  let success = 0;
  let failed = 0;

  for (const font of FONT_REGISTRY) {
    manifest[font.cssFamily] = {};
    for (const weight of font.weights) {
      const sources = [];
      manifest[font.cssFamily][weight] = { sources };
      for (const subset of SUBSETS) {
        const name = filename(font.slug, subset, weight);
        const url = `${FONT_CDN}/${font.id}@latest/${cdnFilename(subset, weight)}`;
        const outPath = path.join(FONTS_DIR, name);
        try {
          const size = await download(url, outPath);
          sources.push(`/fonts/${name}`);
          success++;
          console.log(`  ✓ ${name} (${(size / 1024).toFixed(1)}KB)`);
        } catch (e) {
          failed++;
          console.error(`  ✗ ${name} — ${e.message}`);
        }
      }
    }
  }

  writeFileSync(
    path.join(FONTS_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\n=== Complete: ${success} files, ${failed} failed ===`);
  if (failed === 0) {
    console.log("Manifest written to client/public/fonts/manifest.json.");
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
