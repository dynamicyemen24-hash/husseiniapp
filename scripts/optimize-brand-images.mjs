/**
 * scripts/optimize-brand-images.mjs
 * ---------------------------------
 * Brand raster pipeline — reads HIGH-RES MASTERS from the repo-root `public/`
 * folder (never deployed) and writes web-optimized assets into
 * `client/public/` (deployed), using Chrome's canvas encoder via Playwright
 * (zero image-processing dependencies).
 *
 *   masters/                                 → deployed output
 *   public/ALHUSAINIALOGO.png (1.3 MB)       → platform-logo.webp  (512px, ~30 KB)
 *   public/brand/uamex-erp-master.png        → uamex-erp.webp      (288px, ~22 KB)
 *   public/Elias AI ico/Elias AI.jpg (2.6 MB) → elias-avatar.jpg    (800px JPEG q78)
 *                                             elias-avatar-sm.jpg (240px JPEG q78)
 *
 * Aspect ratio is preserved (fit within max dimension) — no forced square.
 * Run: node scripts/optimize-brand-images.mjs
 */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PUB = resolve(ROOT, "client", "public");

const JOBS = [
  {
    src: "public/ALHUSAINIALOGO.png",
    out: "client/public/platform-logo.webp",
    max: 512,
    type: "image/webp",
    quality: 0.92,
  },
  {
    src: "public/brand/uamex-erp-master.png",
    out: "client/public/uamex-erp.webp",
    max: 288,
    type: "image/webp",
    quality: 0.92,
  },
  {
    src: "public/Elias AI ico/Elias AI.jpg",
    out: "client/public/elias-avatar.jpg",
    max: 800,
    type: "image/jpeg",
    quality: 0.78,
  },
  {
    src: "public/Elias AI ico/Elias AI.jpg",
    out: "client/public/elias-avatar-sm.jpg",
    max: 240,
    type: "image/jpeg",
    quality: 0.78,
  },
];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();

for (const job of JOBS) {
  const srcAbs = resolve(ROOT, job.src);
  await page.goto(pathToFileURL(srcAbs).href);
  const dataUrl = await page.evaluate(
    async ({ max, type, quality }) => {
      const img = document.querySelector("img");
      await img.decode();
      const scale = Math.min(
        1,
        max / Math.max(img.naturalWidth, img.naturalHeight)
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      return { data: canvas.toDataURL(type, quality), w, h };
    },
    { max: job.max, type: job.type, quality: job.quality }
  );
  const buf = Buffer.from(dataUrl.data.split(",")[1], "base64");
  const outAbs = resolve(ROOT, job.out);
  await writeFile(outAbs, buf);
  console.log(
    `${job.out.replace("client/public/", "").padEnd(24)} → ${Math.round(buf.length / 1024)} KB (${dataUrl.w}×${dataUrl.h})`
  );
}

await browser.close();
console.log("✅ brand rasters optimized");
