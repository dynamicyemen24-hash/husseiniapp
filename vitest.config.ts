import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

/**
 * نطاق التغطية المُنفَّذ (بوابة الجودة في CI).
 * ==========================================================================
 * يركّز القياس على النواة التي تحمي الدفاتر والبيانات:
 *   • shared/            — محركات التقارير والنسب (مصدر حقيقة واحد)
 *   • server/_core/      — البنية التحتية (مصادقة، ذاكرة، ترحيل، مقاييس)
 *   • server/services/   — محرّك القيد المزدوج والخدمات المالية
 *   • server/eliasPro/   — نظام الصيانة والتشخيص
 *   • محاسبي (4 راوترات) — المحاسبة الإدارية، التكاليف، الإنتاج، الشركاء
 *
 * بقية السطح (راوترات المجال + واجهة العميل) تغطيه اختبارات التكامل
 * (testcontainers) وE2E (Playwright)؛ القياس الشامل متاح عبر
 * `pnpm test:coverage:full` (COVERAGE_SCOPE=full) للمراجعة الدورية.
 *
 * العتبات "مِحْكَم" (ratchet): تُرفع فقط مع اختبارات جديدة — لا تُخفض.
 */
const CORE_COVERAGE_INCLUDE = [
  "shared/**/*.ts",
  "server/_core/**/*.ts",
  "server/services/**/*.ts",
  "server/eliasPro/**/*.ts",
  "server/managerialAccountingRouter.ts",
  "server/advancedCostAccountingRouter.ts",
  "server/productionAccountingRouter.ts",
  "server/partnerAccountingRouter.ts",
];

const FULL_COVERAGE_INCLUDE = [
  "server/**/*.ts",
  "shared/**/*.ts",
  "client/src/**/*.ts",
];

const COVERAGE_EXCLUDE = [
  "server/**/*.test.ts",
  "server/**/*.spec.ts",
  "shared/**/*.test.ts",
  "shared/**/*.spec.ts",
  "client/src/**/*.test.ts",
  "client/src/**/*.spec.ts",
  "server/_core/index.ts",
  "server/prod-entry.ts",
  "server/serverless/**",
  "client/src/main.tsx",
  "client/src/components/ui/**",
];

const isFullScope = process.env.COVERAGE_SCOPE === "full";

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "shared/**/*.test.ts",
      "shared/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.spec.ts",
    ],
    // Container-backed integration suites have their own config + runner
    // (`vitest.integration.config.ts` via `pnpm test:integration`, with a
    // dedicated CI job). Excluding them here keeps `pnpm test` a pure unit
    // run that stays green on machines without a container runtime.
    exclude: ["server/**/*.integration.test.ts"],
    // Load .env so the DB-backed integration tests (guarded by
    // `!process.env.DATABASE_URL`) actually execute against the live database.
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: isFullScope ? FULL_COVERAGE_INCLUDE : CORE_COVERAGE_INCLUDE,
      exclude: COVERAGE_EXCLUDE,
      thresholds: isFullScope
        ? undefined
        : {
            // Baseline المُنفَّذ (measured) مع هامش صغير — العتبات تُرفع
            // فقط عند إضافة اختبارات جديدة (رافعة صاعدة).
            // Current baseline: statements 40%, branches 72%, functions 46%
            // Phase 1 targets will be raised incrementally
            statements: 40,
            branches: 72,
            functions: 46,
            lines: 40,
          },
    },
  },
});
