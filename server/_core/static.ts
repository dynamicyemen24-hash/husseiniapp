import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * يخدم ملفات البناء الثابتة (صدفة SPA + الأصول).
 *
 * مخرجات البناء في البنية الحالية (بناء مزدوج):
 *   • dist/app      → تطبيق النظام (main.app.tsx)
 *   • dist/marketing → الموقع التعريفي (main.marketing.tsx)
 *
 * `dist/public` مسار قديم (قبل البناء المزدوج) ويُستخدم كبديل احتياطي
 * حتى لا تنكسر البيئات المنشورة سابقاً.
 */
const BUILD_DIR_CANDIDATES = ["app", "public"];

function resolveBuildDir(): string | null {
  const root = path.resolve(import.meta.dirname, "..", "dist");
  for (const candidate of BUILD_DIR_CANDIDATES) {
    const dir = path.join(root, candidate);
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

export function serveStatic(app: Express) {
  const distPath = resolveBuildDir();

  if (!distPath) {
    console.error(
      "Could not find a build directory (dist/app or dist/public) — run `pnpm build` before starting the server"
    );
    app.use("*", (_req, res) => {
      res
        .status(503)
        .type("text/plain; charset=utf-8")
        .send("النسخة غير مبنية — نفّذ `pnpm build` ثم أعد التشغيل");
    });
    return;
  }

  app.use(express.static(distPath));

  // SPA fallback: أي مسار غير ملف يُخدم بصدفة التطبيق (client-side routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
