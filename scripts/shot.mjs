import pkg from "../node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.js";
const { chromium } = pkg;

const url = process.argv[2] || "http://localhost:8100/";
const out = process.argv[3] || "screenshot.png";
const w = Number(process.argv[4] || 1920);
const h = Number(process.argv[5] || 1080);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: w, height: h } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log("saved:", out);
