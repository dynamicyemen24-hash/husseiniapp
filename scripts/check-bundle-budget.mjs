#!/usr/bin/env node
/**
 * check-bundle-budget.mjs — بوابة ميزانية الحزمة
 * يمنع تضخم JS الذي يبطئ التحميل الأول (LCP/TTI) — يفشل البناء عند التجاوز.
 * الميزانية: إجمالي dist/app/assets/*.js بحد أقصى 6MB (الحالي ~4.3MB).
 * recharts وما شابه يجب أن تبقى في chunks كسولة خاصة بمساراتها.
 */
import fs from "fs";
import path from "path";

const BUDGET_BYTES = 6 * 1024 * 1024;
const dir = path.resolve("dist/app/assets");

if (!fs.existsSync(dir)) {
  console.error(
    "⛔ الميزانية: مجلد dist/app/assets غير موجود — هل فشل vite build؟"
  );
  process.exit(1);
}

let total = 0;
const biggest = [];
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".js")) continue;
  const size = fs.statSync(path.join(dir, f)).size;
  total += size;
  biggest.push({ f, size });
}
biggest.sort((a, b) => b.size - a.size);

const mb = v => (v / 1024 / 1024).toFixed(2) + "MB";
console.log(`📦 إجمالي JS: ${mb(total)} / الميزانية ${mb(BUDGET_BYTES)}`);
for (const b of biggest.slice(0, 5)) {
  console.log(`   - ${b.f}: ${mb(b.size)}`);
}

// Early warning: recharts must never leak into the initial entry chunk.
const indexChunk = biggest.find(
  b => b.f.startsWith("index-") || b.f.startsWith("main-")
);
if (indexChunk && indexChunk.size > 600 * 1024) {
  console.error(
    `⛔ الميزانية: الحزمة الأولية ${indexChunk.f} (${mb(indexChunk.size)}) تجاوزت 0.6MB — راجع التقسيم الكسول (lazy) للمكتبات الثقيلة`
  );
  process.exit(1);
}

if (total > BUDGET_BYTES) {
  console.error(
    `⛔ الميزانية: تجاوز إجمالي JS الميزانية (${mb(total)} > ${mb(BUDGET_BYTES)}) — قسّم المسارات الثقيلة (recharts/TipTap) بـ lazy import`
  );
  process.exit(1);
}

console.log("✅ الميزانية: الحزمة ضمن الحدود");
