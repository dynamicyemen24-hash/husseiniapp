#!/usr/bin/env node
/**
 * inject-sw-precache.mjs — حقن أصول البناء في الـ Service Worker
 * يقرأ dist/app/assets/*.js|css بعد vite build ويحقنها في dist/app/sw.js
 * مع نسخة كاش مشتقة من المحتوى — فيضمن:
 * 1) أول زيارة دون اتصال تعمل (الأصول الحرجة مخزنة من التثبيت، لا من ثاني زيارة)
 * 2) كل بناء يبطل كاش سابقه تلقائياً (لا نسخ قديمة عالقة)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const dist = path.resolve("dist/app");
const swPath = path.join(dist, "sw.js");
const assetsDir = path.join(dist, "assets");

if (!fs.existsSync(swPath)) {
  console.error("⛔ precache: dist/app/sw.js غير موجود — هل فشل vite build؟");
  process.exit(1);
}

let assets = [];
if (fs.existsSync(assetsDir)) {
  assets = fs
    .readdirSync(assetsDir)
    .filter(f => f.endsWith(".js") || f.endsWith(".css"))
    .map(f => `/assets/${f}`)
    .sort();
}

const version = crypto
  .createHash("sha256")
  .update(assets.join("|"))
  .digest("hex")
  .slice(0, 8);

let sw = fs.readFileSync(swPath, "utf8");
if (!sw.includes("/*__PRECACHE_ASSETS__*/")) {
  console.error("⛔ precache: عنصر /*__PRECACHE_ASSETS__*/ مفقود في sw.js");
  process.exit(1);
}

sw = sw.replace(
  "/*__PRECACHE_ASSETS__*/",
  `const PRECACHE_ASSETS = ${JSON.stringify(assets)};`
);
sw = sw.replace("alhusainia-SW_VERSION", `alhusainia-${version}`);
fs.writeFileSync(swPath, sw);

console.log(
  `✅ precache: ${assets.length} أصل في sw.js — نسخة الكاش alhusainia-${version}`
);
