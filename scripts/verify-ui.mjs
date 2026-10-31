import pkg from "../node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.js";
const { chromium } = pkg;
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const url = process.argv[2] || "http://localhost:8100/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const checks = {
  titleIncludes: await page.title(),
  heroHeadline: await page
    .$eval("h1", el => el.textContent?.trim())
    .catch(() => "MISSING"),
  ctaButtons: await page.$$eval("a,button", els =>
    els
      .filter(e =>
        /ابدأ الآن|Get Started|ابدأ|سعر|Pricing/i.test(e.textContent || "")
      )
      .map(e => e.textContent?.trim())
      .slice(0, 8)
  ),
  featureCards: await page.$$eval("section", secs => secs.length),
  footerLinks: await page.$$eval("footer a,footer button", els =>
    els
      .map(e => e.textContent?.trim())
      .filter(Boolean)
      .slice(0, 12)
  ),
  reducedMotion: await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ),
  ogImageTag: (() => {
    const m = document.querySelector('meta[property="og:image"]');
    return m ? m.getAttribute("content") : null;
  })(),
};
const summary = `TITLE: ${checks.titleIncludes}
HERO H1: ${checks.heroHeadline}
CTAs: ${JSON.stringify(checks.ctaButtons)}
SECTIONS: ${checks.featureCards}
FOOTER LINKS: ${JSON.stringify(checks.footerLinks)}
REDUCED-MOTION: ${checks.reducedMotion}
OG:image: ${checks.ogImageTag}
`;
writeFileSync("verify.txt", summary);
console.log(summary);
await browser.close();
