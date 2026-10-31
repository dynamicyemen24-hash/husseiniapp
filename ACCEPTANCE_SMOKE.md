# ACCEPTANCE_SMOKE — رحلة القبول الدخانية (5 خطوات)

الهدف: إثبات أن المسار النقدي يعمل حياً (auth → لوحة → ميزان → طلب → تتبع) قبل أي نشر.
الزمن المستهدف: < 5 دقائق. لا E2E كامل (16/16 ثقيل) — هذه الرحلة فقط.

## المتطلبات

- `DATABASE_URL` حي (Neon) + مستخدم E2E (`E2E_USERNAME`/`E2E_PASSWORD`/`E2E_TENANT_ID`) أو جلسة محلية.
- الخادم يعمل: `pnpm dev` (محلياً `http://localhost:3000`).

## الرحلة (tRPC)

1. `auth.me` — الهوية آمنة (لا `passwordHash`/`currentSessionId` في الرد).
2. `query.dashboardSummary` `{ days: 30 }` — KPIs حية (salesTrend/lowStockCount/recentActivity).
3. `financialReports.trialBalance` `{}` — صفوف + `totals.debit == totals.credit` (قيد مزدوج متوازن).
4. `store.placeOrder` `{ customerName, items: [{ productId, quantity }] }` — يُرجع `orderNumber` (مثال `WEB-YYYYMMDD-XXXXXX`)، مع `idempotencyKey` لاختبار عدم التكرار.
5. `orders.track` `{ query: "<orderNumber>" }` — يعيد نفس الطلب (بحث برقم الطلب أو هاتف العميل فقط، حد 20).

## أوامر التحقق

```bash
# 1) وحدة سريعة (ملف واحد فقط — لا تشغل E2E كامل)
pnpm exec vitest run server/performance.test.ts --reporter=basic

# 2) الأنواع (ملفاتنا نظيفة؛ الفشل الحالي مسبق في server/automation.ts + server/backupRouter.ts)
pnpm exec tsc --noEmit --pretty false | Select-String -Pattern "inventoryRouter|erpRouter|healthcareRouter|billingRouter|modulesRouter|financialReportsRouter|accounting.test|dbLive"

# 3) ميزانية الحزمة (الإجمالي ≤ 6MB، index الأولية ≤ 0.6MB)
node scripts/check-bundle-budget.mjs
# ✅ المقاس: إجمالي 3.88MB / index ~0.27MB — charts/motion/trpc/ui في chunks كسولة (vite.config.ts + lazy() في App.tsx)

# 4) k6 smoke فقط (لا load/stress هنا) — يتطلب خادماً حياً على BASE_URL
k6 run scripts/load-test.js -e BASE_URL=http://localhost:3000 -e K6_SCENARIO=smoke
# البديل Windows: powershell -ExecutionPolicy Bypass -File scripts/run-load-test.ps1 smoke
# العتبات: health p95 < 1000ms، trpc p95 < 4000ms، errors < 5% (راجع scripts/load-test.js)

# 5) قبول يدوي عبر HTTP (بعد تسجيل الدخول — انسخ الكوكي/التوكن)
# GET  /api/trpc/auth.me?input=%7B%22json%22%3A%7B%7D%7D
# GET  /api/trpc/query.dashboardSummary?input=%7B%22json%22%3A%7B%22days%22%3A30%7D%7D
# GET  /api/trpc/financialReports.trialBalance?input=%7B%22json%22%3A%7B%7D%7D
# POST /api/trpc/store.placeOrder  {"json":{"customerName":"زبون الدخان","items":[{"productId":1,"quantity":1}]}}
# GET  /api/trpc/orders.track?input=%7B%22json%22%3A%7B%22query%22%3A%22WEB-...%22%7D%7D
```

## معايير النجاح

- كل خطوة 200 + شكل الرد كما أعلاه؛ `trialBalance.totals.debit ≈ totals.credit`.
- `orders.track` لا يسرب طلبات الآخرين (بحث فقط، بلا list مجهول).
- أي فشل في 1–3 يوقف النشر (بوابة CI).

## ملاحظة QA (skip الصامت)

- `server/accounting.test.ts` (4 اختبارات) + `server/dbLive.test.ts` (قفل P0) تفشل صراحة في CI عند غياب `DATABASE_URL` (لا skip صامت)؛ محلياً تتخطى فقط خارج CI.
- `e2e/*.spec.ts` تتخطى عند غياب `E2E_USERNAME/E2E_PASSWORD` — مقصود (بوابة اعتماد، ليست محاسبة/أمن حرجة).
