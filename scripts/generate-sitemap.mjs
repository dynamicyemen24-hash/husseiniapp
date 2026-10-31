/**
 * ALHUSAINIA — Sitemap Generator (ESM)
 * =====================================
 * Generates client/public/sitemap.xml with hreflang alternates for the
 * single-URL language-aware site (ar/en/x-default → canonical URL).
 *
 * Run: node scripts/generate-sitemap.mjs
 */
import { writeFileSync } from "fs";
import path from "path";

const BASE = "https://alhusainiaye.vercel.app";
const LAST_MOD = new Date().toISOString().slice(0, 10);

/** [route, priority, changefreq] — keep in sync with client/src/lib/nav.ts */
const ROUTES = [
  ["/", "1.0", "weekly"],
  ["/about", "0.8", "monthly"],
  ["/store", "0.9", "daily"],
  ["/pricing", "0.8", "monthly"],
  ["/contact", "0.7", "monthly"],
  ["/portal", "0.7", "weekly"],
  ["/download", "0.6", "monthly"],
  ["/insights", "0.7", "weekly"],
  ["/tools", "0.6", "monthly"],
  ["/solutions", "0.7", "monthly"],
  ["/governance", "0.6", "monthly"],
  ["/integrate", "0.6", "monthly"],
  ["/privacy-policy", "0.3", "yearly"],
  ["/terms-of-service", "0.3", "yearly"],
];

const url = route => `${BASE}${route}`;

const entries = ROUTES.map(
  ([route, priority, changefreq]) => `  <url>
    <loc>${url(route)}</loc>
    <lastmod>${LAST_MOD}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="${url(route)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${url(route)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(route)}" />
  </url>`
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

const out = path.join(process.cwd(), "client", "public", "sitemap.xml");
writeFileSync(out, xml, "utf-8");
console.log(`✓ sitemap.xml generated (${ROUTES.length} URLs) → ${out}`);
