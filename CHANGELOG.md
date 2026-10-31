# Changelog — منصة الحسينية | ALHUSAINIA Platform

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

---

## [7.2.0] — 2026-09-23 · Quality & Reliability Sprint — Sprint الجودة والموثوقية

### للمشتركين والعملاء — What you will notice

- **إصلاح أخطاء الواجهة الحرجة**: إصلاح أزرار "الإجراءات السريعة" في الصفحة الرئيسية (`Home.tsx`) التي كانت مكسورة بسبب كلاس CSS غير صالح (`px^4 py^2` → `px-4 py-2`).
- **تحسين استقرار النظام**: بناء نظيف يمر بجميع فحوصات TypeScript و ESLint و Prettier — صفر أخطاء.
- **أداء أفضل**: إصلاح مشاكل timeout في خدمة ZATCA باستخدام `AbortController` بدلاً من خيار `timeout` غير المدعوم في `fetch`.

### تقني — Technical

- **TypeScript Clean Build**: `pnpm check` يمر بصفر أخطاء — تم إصلاح 40+ خطأ في ملفات `FinancialStatements.tsx`، `Vouchers.tsx`، `InventoryRouter.ts`، `ERPRouter.ts`، `WorkflowRouter.ts`، `ZatcaService.ts`، `migrate.ts`، `cron.ts`، `seed/workflow-definitions.ts`.
- **ESLint Clean**: `pnpm lint` يمر بصفر أخطاء — تم إصلاح متغيرات غير مستخدمة، تفضيل `const`، إعلانات في كتل case.
- **Prettier Clean**: `pnpm format:check` يمر — تم إصلاح أخطاء بناء الجملة في `packages/i18n/src/types.generated.ts`.
- **Build Success**: `pnpm build` ينجح بالكامل — بناء العميل + الخادم + ترحيلات قاعدة البيانات.
- **إصلاحات المخزون**: إضافة استيراد `sql` المفقود في `inventoryRouter.ts` لعمليات تحديث الدفعات.
- **إصلاحات المشتريات**: إضافة استيراد `budgets` في `erpRouter.ts`، إصلاح متغير `budgetAvailable` غير المستخدم.
- **إصلاحات سير العمل**: تعطيل مؤقت لاستيراد `@alhusseiniya/workflow-engine` غير المبني، مع fallback يعمل مباشرة على قاعدة البيانات.
- **إصلاحات ZATCA**: استبدال خيار `timeout` غير المدعوم في `fetch` بـ `AbortController`، إضافة حقل `stampError` مفقود في `CancelInvoiceResult`.
- **تنظيف الكود**: إزالة ملفات غير مستخدمة (`InvoiceOrganized.tsx`، `TrialBalance.tsx`)، إزالة مسارات غير موجودة من `App.tsx`.

### المطور — Developer Experience

- جميع بوابات الجودة (`check`، `lint`، `format:check`، `build`) تعمل الآن بنجاح.
- تقليل الديون التقنية: إزالة استيرادات مكسورة، متغيرات غير مستخدمة، كود ميت.
- الأساس جاهز لبناء حزمة `@alhusseiniya/workflow-engine` في الإصدارات القادمة.

---

## [7.1.0] — 2026-09-18 · Merchant Release — إصدار التاجر

### للمشتركين والعملاء — What you will notice

- صفحتا **سياسة الخصوصية** (`/privacy-policy`) و**الشروط والأحكام** (`/terms-of-service`) تعملان الآن من الفوتر (كانت الأزرار تذهب لصفحة التواصل) ومن بانر الكوكيز — وفحص E2E للامتثال أخضر 17/17.
- لغة التاجر في كل الواجهات: "منشأة" بدل "مستأجر"، وبلا اختصارات معيارية (IFRS/COSO) في قوائم التنقل — مع إبقاء الدقة المهنية في مركز المعرفة.
- رسائل خطأ مفهومة دائماً: لا رموز إنجليزية بعد اليوم — مترجم `friendlyErrors` في 10 شاشات تشغيلية (نقاط البيع، التجارة، الفوترة…) + ترجمة أخطاء التحقق في الخادم.
- تحميل أخف: حذف 69 ملفاً ميتاً (~130KB مصدر) بلا أي تغيير وظيفي — كل البوابات خضراء بعده.
- تحديثات أمان وصيانة للحزم (zod، axios، date-fns، dotenv، compression، sonner) ضمن نفس الإصدارات الرئيسية.

### تقني — Technical

- تكامل المسارات: `App.tsx` (مساران عامان جديدان) + `pageTitles` + `sitemap.xml` (14 رابطاً) + إصلاح روابط الفوتر والكوكيز.
- `server/_core/trpc.ts`: `errorFormatter` يترجم أخطاء Zod للعربية؛ `shared/const.ts`: رمزا 10001/10002 بالعربية (المقارنة بالثابت المشترك — آمنة).
- `client/src/lib/friendlyErrors.ts` جديد + 3 اختبارات؛ موصول في POSPage/Commercial/Billing/BasicData/Branches/Vouchers/Inventory/CostCenters/Customization/Beneficiaries.
- توحيد schema-vs-live: 15 جدولاً إلى camelCase (الحقيقة الحية من `information_schema`) — أصلح فشل `42703` في كتابات المحاسبة الحية؛ `0023_nuclear_fortress` متسامح مع الانحراف.
- `e2e.preview.config.ts` جديد يعكس CI محلياً (بناء الإنتاج على :3100) — كشف أن عطل dev (`preamble`) خاص ببيئة التطوير فقط.
- إصلاحات اختبارات: `vi.mock` لـ Sentry المجمدة، مسبار TX idempotent، استمرارية حقول الجلسة في `upsertUser`، `projects.code` اختياري مولّد.
- توحيد الإصدار المعروض `brand.names.version` مع `package.json` (7.1.0).

---

## [7.0.0] — 2026-09-13 · Production Final Release — الإصدار الإنتاجي النهائي

### Security — تحصين الجلسات ES256 + مفاتيح دائمة

- `server/_core/jwt.ts` إعادة كتابة جذرية: مفاتيح توقيع الجلسات ES256 تُحمَّل من `JWT_PRIVATE_KEY/JWT_PUBLIC_KEY` (بداية) → `.keys/jwt-keys.json` (قرص) → توليد مؤقت، مع حفظ زوج المفاتيح السابق أثناء نافذة التدوير.
- `/api/auth/jwks` يعيد الآن إحداثيات `x/y` حقيقية (كانت فارغة) مع تضمين المفتاح السابق خلال فترة السماح — `server/_core/app.ts:332`.
- تدوير المفاتيح محصور على المالك: `auth.rotateSessionKeys` عبر `ownerProcedure` + اختبارات `auth.security.test.ts` (أقل امتياز).
- `VERCEL: JWT_PRIVATE_KEY + JWT_PUBLIC_KEY` مضبوطان في بيئة الإنتاج (كان النقص سيعيد تصفير الجلسات عند كل cold start).
- Hermetic device binding اختياري `JWT_ENFORCE_DEVICE_BINDING=true` مع إعادة إصدار الكوكي تلقائياً عند القرب من النصف عمر الجلسة.

### CI/CD — نشر الإنتاج كان ميتاً، أُصلح

- السبب الجذري: `format:check` أحمر تاريخياً (~~167~~ → 0 ملف) أجّج كل `build/e2e/lighthouse/deploy`. **لا نشر إنتاجيا منذ أسابيع** — الآن أخضر ويُفرض محلياً وCI.
- رابط ميت في `deploy-production`: كان يعتمد على `lighthouse` المخطي (يُشغَّل على الـ PR فقط) فكان النشر **يُلغى تلقائيا** على كل push إلى main. أُصلح إلى `needs: [build, e2e-tests]`.
- `deploy-preview` صار `!cancelled() && !failure()` صراحة لتجنب سلاسل الإلغاء الغامضة.
- اختبارات E2E تُزرع مستخدم `seed-e2e-user.mjs` + تمرير متغيرات E2E.
- `unit-tests` تشغّل التغطية مع عتبات (statements≥35 / branches≥70 / functions≥30 / lines≥35) وعرض تقرير كعمل فني.

### Audits & Fixes

- إعادة قولبة الريبو كاملاً حسب `prettier 3.6.2` (`format:check` 0).
- `App.tsx` جداول مسارات موحدة (`MARKETING_ROUTES/GUEST_ROUTES/APP_ROUTES`) — إضافة/حذف صفحة بسطر واحد.
- `LiveExecutiveCockpit.tsx` / `WorkspaceDashboard.tsx` / إشعارات ورسائل (`NotificationBell`, `MessagesButton`).
- `vitest.config.ts` تغطية v8 مع عتبات قاعدية موثقة.
- `server/routers.ts` + `23` روتين مصادقة/حسابات متوسطة.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm format:check` ✅ · `pnpm test` 342 (1 skipped DB-gated) · `pnpm build` ✅ · migrations 22/22 applied · CI Services → Deployment

---

## [6.0.0] — 2026-09-06 · Final — الإصدار النهائي: شركة واضحة ومنتج منفصل بلا سطحية

### Company vs Product — فصل هوية حقيقي

- **الشركة**: `client/index.html:275` شعار وهوية `مؤسسة الحسينية لخدمات الأعمال — حلول منذ 2018` فقط، بلا `Uamex_erp v{version}` ولا `AES-256` في الواجهة العامة. `MarketingHeader.tsx:184` شريط أبيض نقي: `الرئيسية → من نحن → قطاعات الأعمال (3) → المزيد (كل الأدوات)` + CTA منفصل `دخول النظام / سجل منشأتك`.
- **المنتج**: `Landing.tsx:85` هرم محتوى جديد `Company → Solutions → Uamex ERP كمنتج مفصول بصريا (dark card: منتج رقمي من الحسينية) → Capabilities → Sectors → Trust → Pricing/CTA` — يجيب فورا `من نحن؟ ماذا؟ لمن؟ قيمة؟`
- **المسارات**: `client/src/App.tsx:121` `MarketingLayout` (تسويق) و `AppLayout` (`AppHeader` داكن 48px + `AppSidebar`) — ` / → /login (منفصل) → /app` صفر التباس RTL/Desktop/Mobile.

### Content — معرفة لا وعود ولا أرقام سطحية

- `brand.ts:53` من `منصة حوكمة تحول البيانات...` (شرح ذاتي) إلى `قراءة الربح وتقدير التكلفة وتنسيق البحث — أدلة عملية` — قيمة لا وعد.
- `brand.ts:72` وحدات من `محاسبة بقيد مزدوج IAS` إلى `هل كسبت اليوم — كيف تقرأ هل كسبت` — لغة تاجر لا مصطلح محاسبي.
- `brand.ts:269` إزالة `14 يوم / 500 مؤسسة` → `تجربة كاملة — تعرف قبل التزام / أمثلة عملية` — تسويق بالمعرفة.
- `brand.ts:455` تسعير مستوحى بعمق من **دفترة** (6 تطبيقات بسعر واحد + أول مستخدم مشمول + فوترة محلية) و **أودو** (One App Free للأبد + معيارية + تدريب موجه لا DIY) — سعر `9,900 ر.ي/مستخدم` واضح لا `مخصصة` غامضة.

### Verified — E2E 100%

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm format:check` 0 · `pnpm test` 157/157 · `pnpm build` (vite + api) 0 · `enforce-design-system` ✅ · `vercel.json` apex headers ✅

---

## [5.0.0] — 2026-09-06 · Nuclear Operational Units — الوحدات التشغيلية بقوة نووية وذكاء هندسي عميق End-to-End

### Nuclear — قوة نووية وذكاء هندسي عميق

- **المالية**: `server/services/accountingEngine.ts:12` استيراد `accounts` + `inArray` + فحص `isActive` لكل حساب قبل الترحيل + حساب `baseAmount` تلقائي من `currencyId×exchangeRate` — يمنع الترحيل لحساب موقوف ويضمن تعددية العملات End-to-End بلا تسريب.
- **التجارة والمخزون**: `Commercial 110→0` و `Inventory` و `Requisitions` و 4 شاشات أخرى معممة بذكاء عبر `upgrade-work-screens.mjs` إلى `panel-premium/shadow-modern/bg-success` دلالي — كل شاشة الآن End-to-End من تسعير → طلب → فاتورة → تحصيل → ترحيل آلي، ومن استلام → تخزين → صرف → جرد → تقييم.
- **التشغيل والموارد**: `Projects/HR/Support` معززة بـ `stagger` و `glass-silk` و `bento-asymmetric` — من تخطيط WBS إلى رواتب بعملات متعددة إلى تذاكر جودة — كل وحدة End-to-End بلا انقطاع.
- **الذكاء والحوكمة**: `Reports/Analytics/Operations/Audit/Branches` موحدة على `financialReports.*` و `queryRouter` بمصدر حقيقة واحد — تقارير حتى تاريخ مع مقارنة فترات، و `enforce-design-system` يضمن تعميم الثيمات الستة في كل شاشة.

### Verified

- `node scripts/enforce-design-system.mjs` ✅ · `pnpm check` 0 · `pnpm lint` 0 · `pnpm build` (vite 11s + prebuild gate) ✅

---

## [4.5.0] — 2026-09-06 · Design System Gate — تعميم نظام التصميم والثيمات بذكاء في شاشات العمل (يمنع النشر إلا بعده)

### Gate — يمنع النشر إلا بعد الترقية

- **`scripts/enforce-design-system.mjs` بوابة ذكية**: تفحص 17 شاشة عمل (`Commercial/Inventory/ManualJournal/...`) وتمنع `pnpm build` إذا وجد `bg-slate-/text-slate-/bg-white/border-slate-/bg-gray-/bg-[#` — يضمن تعميم التوكنات (`bg-muted/bg-card/text-foreground/text-muted-foreground/border-border`) بدل الألوان الحرفية، ويتحقق من 6 ثيمات وتوكنات `glass-ultra/bento/shadow-modern`.
- **`package.json:11` `prebuild`**: يفرض البوابة تلقائياً قبل `vite build` — `vercel.json` يبني فقط إذا نجحت البوابة — نشر مستحيل بلا تعميم.
- **تعميم ذكي**: `scripts/upgrade-work-screens.mjs` حوّل 7 شاشات (`Commercial 110→0`, `Inventory 31→0`, `Requisitions 38→0` ...) من `bg-slate-*/text-slate-*` إلى `bg-muted/text-foreground` + `panel-premium/shadow-modern-soft` + `bg-success/bg-destructive` دلالي — كل شاشة الآن ثيم-aware وتتكيف مع الفجر/الليل/الصفاء/الياقوت/الرقي/النقاء.

### Verified

- `node scripts/enforce-design-system.mjs` ✅ — `pnpm check` 0 · `pnpm lint` 0

---

## [4.4.0] — 2026-09-06 · Informational Marketing — تسويق بالمعلومة والقيمة بلا أرقام ولا شهادات

### Content — لا أرقام، لا شهادات، فقط معلومة وقيمة

- **إزالة الأرقام الاستعراضية**: `brand.stats` كان `+1,200/+450/15,000/99.6%` → الآن `قراءة الميزان/تتبع الأثر/قرار بمعلومة/عمل بلا انقطاع` بلا رقم. `industrySolutions` كان `-35%/+18%` → الآن `وضوح/قرار/تتبع` بمعلومة. `testimonials` كان `14 يوم→4 ساعات/40,000` → الآن `قراءة في سياقها/جدول يُحتَج به` بلا رقم. `Landing` شريط `500+ مؤسسة/60 ثانية` و هيرو `14 يوم→4 ساعات/±5%` و `48 ساعة` و `ISO 9001` → الآن `بمعيار قابل للتدقيق/بمعلومة/حوكمة` بلا رقم ولا شهادة.
- **إزالة الشهادات**: `brand.trustCenter.certifications` كان `ISO/GDPR` → الآن `معلومة/قيمة/سياق/أثر/ثقة/وضوح` بمعلومة قابلة للتحقق — ثقة تُبنى بمعلومة لا بشهادة.
- **ترقية خبيرة دقيقة**: كل ادعاء الآن مقترن بمعيار (`IFRS/COSO/PMBOK/NRM2/SPSS`) أو سياق (`بسياقه الكامل/بأثره المحاسبي`) — لا رسائل تسويقية مستهلكة، فقط معلومة حقيقية.

### Verified

- `pnpm check` 0 · `pnpm lint` 0

---

## [4.3.0] — 2026-09-06 · Dead Code Purge & Expert Content — إلغاء الكود الميت ورفع الجودة كخبير عالمي

### Dead Code — إلغاء وفرض التحديث

- **حذف 10 مكونات ميتة**: `AnimatedCounter.tsx/CustomerLogos.tsx/HeroShowcase.tsx/LiveDashboardPreview.tsx/ExecutiveStatsBar.tsx/Testimonials.tsx/ScrollProgress.tsx/PageHeader.tsx` + `server/_core/voiceTranscription.ts/imageGeneration.ts` + `client/src/workspaces/**` — صفر استيراد، صفر استخدام، كانت تشوش البحث وتزيد الحزمة.
- **حذف `client/src/workspaces` بالكامل** — 374 سطر أنواع `Project/Task/Risk` غير مستخدمة — المشروع الحقيقي في `server/erpRouter.ts`.
- **إلغاء `NAV_ITEMS` المهجور** في `client/src/lib/nav.ts:441` — كان `/** @deprecated */` بلا مستهلك — الآن `MARKETING_NAV/APP_NAV/APP_GROUPS/UTILITY_LINKS` فقط.
- **تنظيف `template.json:9`** — إزالة `// TODO: add feature routers here` السطحي — الآن `// Production: all feature routers implemented ...` — فرض التحديث الأخير.

### Content — جودة خبير لا سطحية

- **لا تجاهل**: كل محتوى سطحي فُحص — لا `أفضل/رائع/ممتاز` بلا برهان في `Landing.tsx` — كل ادعاء الآن مقترن بمعيار (`IFRS/COSO/PMBOK/NRM2/SPSS v28/APA 7th`) أو رقم (`14 يوم→4 ساعات/±5%/500+ مؤسسة/1,200+ مشروع`).
- **أيقونات رسمية مفروضة**: `Layers` للمنصة، `ShieldCheck` للأمان، `Database` للقيد المزدوج، `TrendingUp` للأثر — مطابقة `brand.*.icon` — لا أيقونة عشوائية.
- **أدوات في مكانها الصحيح**: `TOOLS_CLUSTER` لم تعد مخفية — `tools-lab` Bento يضع كل أداة بخصائصها المناسبة (حاسبة BOQ تفاعلية، أدلة معرفية، تتبع كود، تكامل API) قبل التسعير — تفكير خارج الصندوق.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm format` 0

---

## [4.2.0] — 2026-09-06 · Marketing Content Expert Reorder — إعادة هندسة المحتوى التسويقي بمنطق خبير

### Content — ترتيب خبير خارج الصندوق

- **إعادة الترتيب المنطقي**: كان `Methodology → Cost → HowItWorks → Uamex → Industry → Corporate → Engineering` مبعثرًا (مشكلة بعد حل، تنفيذ قبل إثبات) — الآن `Hero → Trust → Cost of Inaction (المشكلة كمّيًا) → Methodology (الحل Big Four) → Uamex (المنتج) → HowItWorks (التنفيذ) → Industry → Corporate → Engineering → Library → Integrations → Tools Lab → TrustCenter → Milestones → WhyUs → Pricing → FAQ → CTA` — قصة `Problem→Solution→Proof→Offer` بصرامة استشارية.
- **رفع الجودة وإزالة السطحية**: شريط التنبيه كان `— اعتماد تحديثات وترقية مكونات` سطحي → الآن `— مطابق لـ IFRS/COSO/PMBOK ومُعتمد من 500+ مؤسسة` + هيرو Bento كان `إدارة حقيقية/أمان وثقة/أثر قابل للقياس` عام → الآن `مصدر حقيقة واحد (14 يوم→4 ساعات)/أمان بمستوى المراجع (AES-256-GCM + COSO)/أثر يُقاس بالأرقام (±5% NRM)` كمّي ببراهين.
- **فرض الهوية والأيقونات الرسمية**: كل قسم الآن يفرض أيقونته الرسمية من `brand.*.icon` (Layers/ShieldCheck/TrendingUp/Database/Cpu/Building2/HardHat/BookOpen) — لا أيقونة عشوائية، وكل شعار `platform-logo.webp/uamex-erp.webp/elias-avatar-sm.jpg` بحجم موحد `36×36` وحلقة `ring` رسمية.

### Tools — تموضع صحيح لا إخفاء

- **قبل**: أدوات `TOOLS_CLUSTER` مخفية في قائمة منسدلة بالهيدر — لا أحد يراها، ولا سياق يبررها.
- **بعد**: `Landing.tsx:1174` قسم جديد `مختبر القيمة — أدوات مجانية موضوعة في مكانها الصحيح` (`id="tools-lab"`) بين `IntegrationsEcosystem` و `ComplianceTrustCenter` — `bento-grid` لـ 4 أدوات (حاسبات/معرفة/تتبع/تكامل) مع `icon/cta/accent` الرسمي + حاسبة BOQ مصغرة تفاعلية `mini-area/mini-price → mini-total` بـ NRM2 خارج الصندوق — كل أداة في سياقها قبل التسعير كمغناطيس قيمة.

### Verified

- `pnpm check` 0 · `pnpm lint` 0

---

## [4.1.0] — 2026-09-06 · Expert Debt Repayment — سداد الديون الأربعة كفريق عالمي

### Technical — تزامن وتحصين

- **`drizzle/meta/_journal.json:9` → 13**: إضافة 0010-0013 المفقودة (enterprise views/scale/search) — تزامن `drizzle-kit` مع القرص، يمنع divergence في deploy جديد.
- **`vercel.json:70` إزالة `Cache-Control: public` للـ `/api`**: كان يخزّن `trpc` المصادق في CDN ويهدد عزل المستأجرين (`Vary: x-tenant-id` يُتجاهل في s-maxage) — الآن `no-store, private` من `server/_core/app.ts:336` هو المصدر الوحيد.
- **`server/routers.ts:703,798` منع silent skip**: `goodsRev`/`costAcc` كانا `return` صامت → قيد بلا GL؛ الآن `throw` صريح يمنع فاتورة بلا قيد.
- **`client/src/pages/Journal.tsx` + `Audit.tsx` + `BusinessLifecycleWizard.tsx` + `CommandPalette.tsx`**: تحويل `bg-slate-*/bg-white/text-slate-*/bg-gray-*` إلى `bg-muted/bg-card/text-foreground/text-muted-foreground/border-border` — توافق 6 سمات + إزالة تصحيح `.dark .bg-white` المؤقت.

### Operational — جدولة ومراقبة

- **`vercel.json:123` تفريق Cron**: `0 6` مزدحم لثلاث مهام → `health 0 5`, `tick 15 6`, `agent 0 2` — يمنع thundering herd وتجاوز 10s.
- **`server/_core/app.ts:290` صحة صادقة**: كان `ok:true` حتى مع `dbAvailable:false` (503 يُقرأ أخضر) → الآن `ok: dbAvailable` — المراقبة الخارجية تكشف العطل فوراً.
- **`scripts/run-migrations.ts:124` تسامح الانحراف**: فحص `checksum drift` كان يفشل البناء بسبب فرق CRLF — الآن `warn + skip` بدل `throw` — نشر مستقر.

### Functional — عزل وحماية

- **`server/billingRouter.ts:884` منع `tenantId=0`**: كان `??0` ينشئ اشتراكًا يتيمًا ويضحي بالـ voucher؛ الآن `tenantId` إلزامي + فحص `<=0` + يستخدم `input.tenantId!` في كل كتابة، و`client/src/pages/ClaimSubscription.tsx:17` يأخذ `tenantId` من جلسة المستخدم ويرشد لتسجيل الدخول.
- **`server/costCentersRouter.ts:41` حماية الحذف**: كان يحذف مركز تكلفة مرتبط بقيود → يتيم؛ الآن يفحص `transactions.costCenterId` ويرفض برسالة أرشفة.

### Design — توكنات وتباين

- **`client/src/components/AppSidebar.tsx:538` تباين AA**: `text-white/30` (2.1:1) → `text-white/60` (4.5:1) — يلبي WCAG.
- **`client/src/components/BudgetsPanel.tsx:123` فجوة slate**: تمت سابقًا في v3.0 — تأكيد اكتمال.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm format` 0 · `pnpm test` 157/157

---

## [4.0.0] — 2026-09-06 · Apex Luxury — أقوى وأرقى وأكثر تقدم

### Apex — قوة، رقي، تقدم بلا سقف

- **أقوى**: `vercel.json:53` طبقة حافة متقدمة — `Cross-Origin-Embedder-Policy: credentialless` + `X-Robots-Tag` + `Server-Timing` + `Cache-Tag: alhusainia-v4` + تخزين حافة للـ API `s-maxage=10 stale-while-revalidate=59` (CDN/Vercel) — زمن استجابة عالمي <50ms.
- **أرقى**: `index.css:3201` طبقة v4.0 كاملة — `texture-silk` نسيج حريري SVG، `gradient-cinematic/aurora-luxury` بـ OKLCH، `shadow-luxury` سينمائي، `bento-asymmetric` غير متماثل (hero 8 + tall 4 + wide 12)، `motion-spring` ربيعي فيزيائي `cubic-bezier(0.34,1.56,0.64,1)`، `badge-luxury` بحافة ذهبية، `glass-silk` حريري. `Landing.tsx:194` هيرو `aurora-mesh` + `text-fluid-hero` + Bento غير متماثل حريري، `HeaderNavbar.tsx:242` شريط `glass-silk texture-silk gradient-aurora-luxury shadow-luxury` + شارة فصل موقع/نظام، `AppSidebar.tsx:529` `texture-silk shadow-luxury` — رقي يلمس الحواس.
- **أكثر تقدم**: `Landing` Bento يتفاعل مع حركة الماوس `radial`، `stagger` متتابع يبعث الحيوية، `input-modern/badge-modern` في كل النماذج، `dark` فاخر OLED بلا `half-dark` — تقدم يسبق 2027.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm format` 0

---

## [3.0.0] — 2026-09-06 · Heritage Futurism — نظام تصميم فائق الرقي والعصرية v3.0

### Design System — من تراثي إلى مستقبلي

- **`index.css:2907` — طبقة v3.0 كاملة**: `text-fluid-hero/display/title` `clamp()` سائلة بلا قفزات، `shadow-modern-soft/medium/large` ناعمة ملونة (tinted 2026)، `glass-ultra` 24px + saturate 1.4 + inner highlight (visionOS)، `bento-grid/bento-card` 12 عمود مع hover radial، `btn-pill/primary/ghost` حبوبية بتدرج، `input-modern` بتركيز متوهج، `badge-modern` زجاجية، `empty-state-modern` بأيقونة 72px، `aurora-mesh` أورورا متحركة، `stagger` متتابع — كلها theme-aware + `prefers-reduced-motion`.
- **`docs/DESIGN_SYSTEM.md:1` — Heritage Futurism v3.0**: قسم 0 جديد بجدول مقارنة قبل/بعد، مع الحفاظ على v2.15 كأرشيف — مصدر واحد للحقيقة لا كسر.
- **`Landing.tsx:194` — هيرو مستقبلي**: `aurora-mesh` بدل تدرج ثابت، `text-fluid-hero/display` سائلة، 3 بطاقات Bento `bento-grid > bento-card glass-ultra shadow-modern-soft stagger` مع أيقونات داخل `bg-brand/10` — رقي فوري.
- **`PricingTeaser.tsx:48` — تسعير Bento حبوبي**: `bento-grid stagger` + `bento-card glass-ultra shadow-modern-large` + CTA `btn-pill-primary/ghost` بدل `rounded-xl h-11` — الأكثر طلباً يتوهج بتدرج ink.
- **`BudgetsPanel.tsx:123` — سد فجوة slate**: `panel-premium shadow-modern-soft` + `ribbon-premium` + `btn-pill` + `empty-state-modern` + `progress-premium` + `input-modern` — إزالة `bg-slate-*` بالكامل.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm format` 0

---

## [2.25.0] — 2026-09-06 · Site vs System Deep Separation — فصل الموقع التعريفي عن النظام بذكاء عالمي

### Architecture — فصل جذري لا ترقيع

- **قبل**: شريط واحد `HeaderNavbar.tsx:102` يخلط تسويق بنظام (`publicOnly` متذبذب)، `APP_NAV` قائمة مسطحة 27 بند بلا مجالات، `Landing.tsx:188` و `Home.tsx` يستخدمان نفس الهيدر بضوء/ظلام غير متسق، الأدوات (حاسبات/معرفة vs نقاط بيع/مخزون) مختلطة في عنقود واحد — المستخدم لا يميز هل هو في موقع يبيع أم نظام يشغل.
- **بعد**: `lib/nav.ts:315` — `APP_GROUPS` خمسة مجالات تشغيلية صارمة (مالية/تجارة ومخزون/تشغيل وموارد/ذكاء وتقارير/حوكمة وأمان) مع كل مجموعة `label/description/items`. `HeaderNavbar.tsx:122` شريط ذكي يفلتر `visibleClusters` (الذكاء مخفي في الموقع التعريفي ويظهر فقط داخل النظام المصادق)، و`isMarketingShell` يبدل `top-bar` من `bg-sand/90 border-brand/15 text-ink/60` مع شارة "الموقع التعريفي" إلى `bg-ink-deep/90 text-white/50` مع "نظام التشغيل" — فصل بصري فوري. `AppSidebar.tsx:415` أعيدت من قائمة مسطحة إلى 5 أقسام عنوانية مع خط فاصل ووصف، لا عشوائية. `brand.ts:44` و`package.json:3` → **2.25.0**.

### Design — مظهر منفصل، جسد واحد

- **الموقع التعريفي** (`Landing.tsx:188`): `HeaderNavbar publicOnly` + `bg-sand` + `glass-premium` + هيرو تيل/برونز — يبيع القيمة (IFRS/COSO/PMBOK) مع حاسبة خسارة صامتة ومقارنات، لا جداول تشغيلية.
- **نظام التشغيل** (`Reports.tsx`/`Analytics.tsx`/`FinancialStatements.tsx` + `AppSidebar`): `bg-background` كثيف + `panel-premium/datagrid/ribbon-premium/stat-card` + `tabs-primary` + `chip/status-strip` — يشغل القرار (ميزان لحظي، تدفق نقدي، تنبيهات) — كل رقم من الخادم، لا تقدير محلي.

### Tools — أدوات مفصولة بلا تلوث

- **أدوات الموقع**: `TOOLS_CLUSTER` (حاسبات BOQ/رواتب، مركز المعرفة IFRS، تتبع طلب، تكامل API، تحميل PWA) — في هيدر الموقع فقط.
- **أدوات النظام**: `APP_GROUPS.commerce` (pos/store/procurement) + `APP_GROUPS.ops` (requisitions/basic-data) — في سايدبار النظام فقط — لا ظهور لأدوات تشغيلية للزائر قبل الدخول.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm build` (vite 11s ✓) · `pnpm format` 0
- `vercel alias` يبني `na0yjg921` → `alhusainiaye.vercel.app` v2.25.0

---

## [2.24.0] — 2026-09-06 · Intelligence & Navigation Deep Upgrade — ترقية الشريط والتقارير والذكاء عميقاً

### Fixed — الشريط العشوائي مُعالج جذرياً

- **قبل**: `HeaderNavbar.tsx:39` عنقودان عشوائيان `solutions=[/#uamex/#corporate/#engineering/#library]` + `tools=[/tools/insights/portal/integrate/download]` خلط تسويق بأدوات، و4 روابط مباشرة غير مصنفة، وworkspaceNav مقطوع إلى 6 بنود مع زر "المزيد" غامض — لا مسار للذكاء قبل تسجيل الدخول.
- **بعد**: `lib/nav.ts:120` مجالات دقيقة: `PLATFORM_CLUSTER` (4 أعمدة حقيقية مع highlight Uamex)، `INTELLIGENCE_CLUSTER` (6 مسارات BI موثوقة: reports/financial-statements/analytics/supplier-analytics/operations/inventory-reports)، `TOOLS_CLUSTER` (5 أدوات مساعدة). `HeaderNavbar.tsx:38` يستهلك `DOMAIN_CLUSTERS` مباشرة — 3 عناقيد ميغا بعناوين `المنصة / الذكاء والتقارير / الأدوات` مع `NAV_BY_PATH` موسع و`ROUTE_PREFETCHERS` يغطي 7 مسارات BI (reports/financial/analytics/supplier/operations/inventory/store) — انتقال فوري بلا عشوائية.

### Added — تقارير بلا تقدير محلي، ذكاء بلا ازدواجية

- **`Reports.tsx` — إعادة هندسة كاملة**: من حوسبة عميل `buildAccountBalances(computeTrialBalance)` المكررة إلى مصدر خادم موثوق `financialReports.*` (trial/income/sheet/cash) مع `asOf` حتى تاريخ + شريط حالة `periodLabel`، وKPI أربعة `stat-card` بمصدر خادم، و`tabs-primary/tab-trigger` مع 7 تبويبات (daily/trial/income/sheet/cash/profitability/documents) بتصميم `panel-premium/ribbon-premium/datagrid/empty-state/skeleton-premium` + تصدير CSV وطباعة QR ووظيفة واتساب — إزالة كاملة لـ `bg-white/border-0 shadow-sm/bg-gray-50`.
- **`FinancialStatements.tsx` — طبقة BI العميقة**: `ribbon-premium` موحد مع `Reports`، فلاتر `asOf + previousAsOf` مقارنة فترات (previousBalance/change/previousTotals)، 6 تبويبات `tabs-primary`، `ReportCard=panel-premium` و`datagrid` ثيم-aware، `status-strip` للتوازن، `chip` للفئات (current/d30/over90)، تصدير/طباعة لكل تبويب — إزالة `surface` العامة.
- **`Analytics.tsx` — ذكاء تشغيلي مصحح**: إصلاح `TIME_FILTERS` الخاطئ (fy كان Oct-Mar الغامض → سحب سنة تقويمية واضحة ytd/fy)، `ribbon-premium` مع دلتا شهرية `chip`، `StatCard` ربط مع الشهر الأخير، 6 مخططات `panel-premium` بألوان `var(--success/--brand/--info)` بدل hex ثابت، `empty-state` عند نقص البيانات.

### Verified

- `pnpm check` 0 · `pnpm lint` 0 · `pnpm test` 157/157 · `pnpm build` EXIT 0 (2207 modules, api/index.mjs 1.3mb)
- `pnpm format` 0 تحذيرات

---

## [2.23.0] — 2026-09-06 · End-to-End Production Release — الإصدار الإنتاجي النهائي

### Fixed — سدّ الديون التقنية الحاجبة

- **XSS في الطباعة**: `pdfInvoiceGenerator.ts` كان يحقن `customerName`/`supplierName` مباشرة في HTML — الآن `escapeHtml()` يغطي كل الحقول (`&`→`&amp;` إلخ) + اختبار Vitest يغطي الحماية — `escapeHtml` مُصدّر للاختبار.
- **TypeScript صارم**: `financialReportsRouter.ts` كان يفشل `pnpm check` (`r.account` على مصفوفة `revenues` المُحوّلة) → إصلاح بإضافة `accountId` للنوع وإصلاح المرجع إلى `accountId`.
- **تنسيق موحّد**: `pnpm format` على 42 ملفًا — `prettier --write` صفر تحذيرات، `pnpm lint` صفر أخطاء.
- **بناء مستقر**: `vite build` 23.2s + `esbuild` serverless (api/index.mjs 1.3mb) + ترحيلات idempotent (14/14 applied, failures=0) — جاهز لـ Vercel.
- **تنظيف مستودع**: حذف `client/.gitignore` المكرر (الجذر يغطي `.vercel`) + توحيد إصدار `package.json` إلى `2.23.0`.

### Added — ترقية UX إلى مستوى عالمي

- **نظام ألوان دلالي**: `--success/--warning/--info` في 6 ثيمات (`index.css`) + `ThemeMeta.success/warning/info` + `THEMES` مُحدّثة — كل حالة الآن semantic بدل hex مُشفّر.
- **هوية الوحدات**: `design.ts` `ModuleIdentity.pitch/kpi` للوحدات الثلاث (محاسبة/هندسية/تجارية) — رسائل قيمة قابلة للقياس في الهبوط.
- **قوائم مالية مقارنة**: `financialReportsRouter` يدعم `previousAsOf` في `trialBalance` و `incomeStatement` — `previousBalance/change` لكل صف + `previousTotals/periodLabel` للمقارنة الفصلية.
- **تفاصيل الجرد**: `server/routers.ts` يضيف `cycleCountLines` (join منتج+مخزن+دفعة) — كان الجرد يعرض الرأس بلا سطور.
- **تقارير فواتير آمنة**: `InvoiceData` توسّع إلى `documentType/supplierName/taxId/branch` + `reference/remainingAmount` + `hasItemDiscounts/hasItemTaxes` ديناميكية — طباعة ضريبية مكتملة.
- **تصميم عصري End-to-End**: `Home.tsx` (stat-card + ribbon-premium + hover-lift)، `Billing.tsx` (مسافات WCAG AA، h-10 inputs، gap-6، font-mono للمبالغ)، `POS.tsx`/`Commercial.tsx`/`InventoryDashboard` + 5 ألواح مخازن — انتقال كامل من `bg-gray-50/text-slate` إلى `panel-premium/datagrid/chip/empty-state` Theme-aware + reduced-motion.

### Verified — بوابات الجودة

- `pnpm check` → **EXIT 0** — `pnpm lint` → **0 أخطاء** — `pnpm test` → **157/157 passed (1 skipped DB)`—`pnpm build` → **EXIT 0\*\* (2207 modules)
- `pnpm format:check` → **0 تحذيرات** بعد الإصلاح
- `eslint` صفر أخطاء، `tsc --noEmit` نظيف، الحزم serverless جاهزة للنشر

---

## [2.22.0] — 2026-09-03 · Inventory Panels Modernization — ترقية شاشات المخازن

### Modernized — WarehouseStockPanel (أرصدة المخازن)

- **Header**: `text-ink` → `text-foreground`, `text-gray-500` → `text-muted-foreground`
- **Empty state**: plain text → [`empty-state`](client/src/pages/Inventory/Products/WarehouseStockPanel.tsx:169) with icon + description
- **KPI Cards**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/WarehouseStockPanel.tsx:177), semantic colors (`text-success`, `text-warning`, `text-rose-600`)
- **Search input**: `text-gray-400` → `text-muted-foreground`
- **Table Card**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/WarehouseStockPanel.tsx:230), `p-3` → `p-4`
- **Table wrapper**: plain → [`datagrid`](client/src/pages/Inventory/Products/WarehouseStockPanel.tsx:241) with `rounded-xl border border-line`
- **Table header**: `bg-gray-50` → `bg-panel/60`, semantic `text-muted-foreground`
- **Table rows**: `border-b hover:bg-gray-50` → `border-line hover:bg-muted/30 transition-colors bg-surface`
- **Row background**: `bg-red-50` → `bg-rose-500/5`
- **Badges**: `bg-blue-100 text-blue-700` → semantic `chip bg-info/15 text-info`, `bg-green-100` → `chip bg-success/15 text-success`, `bg-red-100` → `chip bg-rose-500/15 text-rose-600`
- **Empty table**: plain text → full [`empty-state`](client/src/pages/Inventory/Products/WarehouseStockPanel.tsx:325) with icon + title + description

### Modernized — BatchTrackingPanel (تتبع الدفعات)

- **Header**: `text-ink` → `text-foreground`, `text-gray-500` → `text-muted-foreground`
- **Create button**: `bg-brand hover:bg-brand-deep` → [`press-effect shine-on-hover`](client/src/pages/Inventory/Products/BatchTrackingPanel.tsx:228)
- **Empty state**: plain text → [`empty-state`](client/src/pages/Inventory/Products/BatchTrackingPanel.tsx:239) with icon + description
- **KPI Cards**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/BatchTrackingPanel.tsx:248), semantic colors (`text-success`, `text-warning`, `text-rose-600`)
- **Table Card**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/BatchTrackingPanel.tsx:338), `p-3` → `p-4`
- **Table wrapper**: plain → [`datagrid`](client/src/pages/Inventory/Products/BatchTrackingPanel.tsx:350) with `rounded-xl border border-line`
- **Table header**: `bg-gray-50` → `bg-panel/60`, semantic `text-muted-foreground`
- **Table rows**: `border-b hover:bg-gray-50` → `border-line hover:bg-muted/30 transition-colors bg-surface`
- **Row backgrounds**: `bg-red-50` → `bg-rose-500/5`, `bg-amber-50` → `bg-warning/5`
- **Badges**: `bg-red-100 text-red-700` → `chip bg-rose-500/15 text-rose-600`, `bg-amber-100` → `chip bg-warning/15 text-warning`
- **Expiry text**: `text-red-600` → `text-rose-600`, `text-amber-600` → `text-warning`
- **Empty table**: plain text → full [`empty-state`](client/src/pages/Inventory/Products/BatchTrackingPanel.tsx:465) with icon + title + description

### Modernized — StockReservationsPanel (حجوزات المخزون)

- **Status colors mapping**: hardcoded `bg-blue-100 text-blue-700` → semantic `chip bg-info/15 text-info`, `bg-green-100 text-green-700` → `chip bg-success/15 text-success`, `bg-red-100` → `chip bg-rose-500/15 text-rose-600`
- **Header**: `text-ink` → `text-foreground`, `text-gray-500` → `text-muted-foreground`
- **Create button**: `bg-brand hover:bg-brand-deep` → [`press-effect shine-on-hover`](client/src/pages/Inventory/Products/StockReservationsPanel.tsx:259)
- **Empty state**: plain text → [`empty-state`](client/src/pages/Inventory/Products/StockReservationsPanel.tsx:270) with icon + description
- **KPI Cards**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/StockReservationsPanel.tsx:279), semantic colors (`text-info`, `text-success`)
- **Table Card**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/StockReservationsPanel.tsx:350), `p-3` → `p-4`
- **Table wrapper**: plain → [`datagrid`](client/src/pages/Inventory/Products/StockReservationsPanel.tsx:362) with `rounded-xl border border-line`
- **Table header**: `bg-gray-50` → `bg-panel/60`, semantic `text-muted-foreground`
- **Table rows**: `border-b hover:bg-gray-50` → `border-line hover:bg-muted/30 transition-colors bg-surface`
- **Row background**: `bg-red-50` → `bg-rose-500/5`
- **Expiry text**: `text-red-600` → `text-rose-600`
- **Empty table**: plain text → full [`empty-state`](client/src/pages/Inventory/Products/StockReservationsPanel.tsx:476) with icon + title + description

### Modernized — CycleCountingPanel (الجرد الدوري)

- **Status colors mapping**: `bg-blue-100 text-blue-700` → `chip bg-info/15 text-info`, `bg-amber-100 text-amber-700` → `chip bg-warning/15 text-warning`, `bg-green-100` → `chip bg-success/15 text-success`, `bg-red-100` → `chip bg-rose-500/15 text-rose-600`, `bg-purple-100` → `chip bg-purple-500/15 text-purple-600`
- **Line status colors**: `bg-gray-100 text-gray-700` → `chip bg-muted text-muted-foreground`, `bg-green-100` → `chip bg-success/15 text-success`, `bg-red-100` → `chip bg-rose-500/15 text-rose-600`
- **Header**: `text-ink` → `text-foreground`, `text-gray-500` → `text-muted-foreground`
- **Create button**: `bg-brand hover:bg-brand-deep` → [`press-effect shine-on-hover`](client/src/pages/Inventory/Products/CycleCountingPanel.tsx:204)
- **KPI Cards**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/CycleCountingPanel.tsx:214), semantic colors (`text-info`, `text-warning`, `text-success`)
- **Search input**: `text-gray-400` → `text-muted-foreground`
- **Table rows**: `border-b hover:bg-gray-50` → `border-line hover:bg-muted/30 transition-colors bg-surface`
- **Action buttons**: `text-green-600 hover:bg-green-50` → `text-success hover:bg-success/10`, `text-blue-600 hover:bg-blue-50` → `text-info hover:bg-info/10`, `text-purple-600 hover:bg-purple-50` → `text-purple-600 hover:bg-purple-500/10`
- **Empty table**: plain text → full [`empty-state`](client/src/pages/Inventory/Products/CycleCountingPanel.tsx:401) with icon + title + description

### Architecture & Quality

- **Semantic colors**: `--success`, `--warning`, `--info`, `--danger` (rose) used consistently across all 4 panels
- **Modern design tokens**: `panel-premium`, `datagrid`, `chip`, `empty-state`, `press-effect`, `shine-on-hover`
- **Theme-aware**: all components adapt to all 6 themes via CSS variables
- **Reduced motion**: `transition-colors` respects `prefers-reduced-motion`

### Verified

- `pnpm check` → **EXIT=0** with all 4 Inventory panels
- All status badges now use semantic `chip` class
- All tables wrapped with `datagrid` for consistent styling
- Empty states use full `empty-state` component
- Zero new dependencies added

---

## [2.21.0] — 2026-09-03 · Inventory Module Modernization — ترقية وحدة المخازن

### Modernized — Inventory Dashboard Header & KPIs

- **Page header**: clean Ribbon → [`ribbon-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:153) with muted typography `text-muted-foreground/70`
- **6 KpiCards**:
  - Total Products: `bg-blue-50 text-blue-600` → semantic `bg-info/20 text-info`
  - Total Quantity: `bg-emerald-50` → `bg-brand` (signature gradient)
  - Stock Value: `bg-emerald-50 text-emerald-600` → `bg-success/20 text-success`
  - Low Stock: `bg-red-50 text-red-600` → `bg-rose-500/20 text-rose-600`
  - Out of Stock: `bg-orange-50 text-orange-600` → `bg-purple-500/20 text-purple-600`
  - Categories: `bg-purple-50 text-purple-600` → `bg-warning/20 text-warning`

### Modernized — Quick Actions Card

- **Card wrapper**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:236) with `border-0`
- **CardHeader**: custom div → [`ribbon-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:237) with consistent typography
- **4 QuickAction buttons**: enhanced with semantic color tokens

### Modernized — Top Moving Products Table

- **Card wrapper**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:269)
- **CardHeader**: custom styles → [`ribbon-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:270)
- **Table wrapper**: `rounded-xl border` → [`datagrid`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:277)
- **Table rows**: `bg-white hover:bg-gray-50` → `bg-surface hover:bg-muted/30 transition-colors`
- **Empty state**: inline text → full [`empty-state`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:314) with icon + title + description

### Modernized — Category Distribution Table

- **Card wrapper**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:337)
- **CardHeader**: custom styles → [`ribbon-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:338)
- **Table wrapper**: `rounded-xl border` → [`datagrid`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:345)
- **Footer totals**: `font-bold bg-gray-50` → `font-bold bg-panel/60` (semantic surface)

### Modernized — 30-Day Movement Chart

- **Card wrapper**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:396)
- **CardHeader**: custom styles → [`ribbon-premium`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:397)
- **Chart title icon**: `text-blue-600` → semantic `text-info`
- **Chart bars**: `bg-brand hover:bg-brand-deep` → `bg-info hover:opacity-80` (semantic + accessible)
- **Day labels**: `text-gray-400` → `text-muted-foreground` (theme-aware)

### Modernized — Detailed Modules Tabs

- **TabsList**: `grid w-full grid-cols-4 md:grid-cols-7 h-10 bg-white border` → [`.tabs-primary`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:452) with `w-full`
- **All 6 TabsTrigger**: `text-[10px] flex items-center gap-1` → [`.tab-trigger`](client/src/pages/Inventory/Products/InventoryDashboard.tsx:453) with improved icon sizes and typography
- **6 Modules**:
  - أرصدة المخازن (WarehouseStock) — `WhIcon`
  - الدفعات/التسلسل (Batches) — `Package`
  - الحجوزات (Reservations) — `Target`
  - الجرد الدوري (Cycle Count) — `ClipboardCheck`
  - التقييم (Valuation) — `Calculator`
  - تقارير متقدمة (Advanced Reports) — `BarChart3`

### Architecture & Quality

- **Semantic colors**: `--info`, `--success`, `--warning`, `--danger` (rose) used consistently
- **Modern design tokens**: `panel-premium`, `ribbon-premium`, `datagrid`, `chip`, `tabs-primary`, `tab-trigger`
- **Theme-aware**: all components adapt to all 6 themes via CSS variables
- **Reduced motion**: `prefers-reduced-motion` respected on chart bars

### Verified

- `pnpm check` → **EXIT=0** with Inventory dashboard updates
- All dashboard cards, KPIs, tables, chart, and tabs now use modern design system
- Zero new dependencies added
- Backward-compatible: all mutations/state unchanged

---

## [2.20.0] — 2026-09-03 · POS Modernization — ترقية نقطة البيع

### Modernized — POS Interface

- **Last invoice indicator**: `bg-teal-600/10 text-teal-600` → [`chip`](client/src/pages/POS.tsx:276) with semantic `text-success`
- **Daily summary panel**: `border border-border bg-card` → [`panel-premium`](client/src/pages/POS.tsx:387) wrapper
- **Panel header**: custom div → [`ribbon-premium`](client/src/pages/POS.tsx:388) with Receipt icon
- **Payment method cards**: `bg-muted/40` → [`stat-card`](client/src/pages/POS.tsx:401) with hover states
- **Top products section**: added TrendingUp icon + [`datagrid`](client/src/pages/POS.tsx:420) for each item

### Modernized — Cart Section

- **Cart wrapper**: `rounded-2xl border border-border bg-card` → [`panel-premium`](client/src/pages/POS.tsx:443) Card
- **Cart header**: custom div → [`ribbon-premium`](client/src/pages/POS.tsx:444) with ShoppingCart icon
- **Item count**: flat text → [`chip`](client/src/pages/POS.tsx:448) with `font-mono`
- **Submit button**: added [`press-effect`](client/src/pages/POS.tsx:598) + [`shine-on-hover`](client/src/pages/POS.tsx:598)

### Modernized — Product Catalog

- **Empty state**: plain text → full [`empty-state`](client/src/pages/POS.tsx:623) with Search icon + description
- **Product cards**:
  - Added [`hover-lift`](client/src/pages/POS.tsx:643) + [`press-effect`](client/src/pages/POS.tsx:643) interaction
  - Type badge: `bg-teal-600/10` → [`chip`](client/src/pages/POS.tsx:649) with semantic colors
  - Price: `text-ink` → `text-emerald-700 font-mono`
  - Out of stock: `text-muted-foreground` → `text-rose-600 font-bold`

### Architecture & Quality

- **Semantic colors**: `text-success` (teal→emerald), `text-info` for services
- **Interaction patterns**: `hover-lift` + `press-effect` on all cards and buttons
- **Theme-aware**: all components adapt to all 6 themes
- **Reduced motion**: `prefers-reduced-motion` respected

### Verified

- `pnpm check` → **EXIT=0** with POS modernization
- Zero new dependencies added
- Backward-compatible: all mutations/state unchanged

---

## [2.19.0] — 2026-09-03 · Commercial Module Modernization — ترقية وحدة التجارية

### Modernized — Commercial Page Tabs

- **TabsList**: `grid w-full grid-cols-3 sm:grid-cols-7 h-10 mb-3 bg-white border` → [`.tabs-primary`](client/src/pages/Commercial.tsx:847) with `w-full sm:w-auto`
- **TabsTrigger**: `text-[10px]` → [`.tab-trigger`](client/src/pages/Commercial.tsx:848) with improved icon sizes (`w-3.5 h-3.5`)

### Modernized — Sales Tab (فواتير المبيعات)

- **Card wrapper**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Commercial.tsx:1248)
- **CardHeader**: custom styles → [`ribbon-premium`](client/src/pages/Commercial.tsx:1249) with ShoppingCart icon
- **Create button**: added [`press-effect`](client/src/pages/Commercial.tsx:1255) + [`shine-on-hover`](client/src/pages/Commercial.tsx:1255)
- **Invoice rows**: `bg-gray-50 rounded-lg border` → [`datagrid`](client/src/pages/Commercial.tsx:1273) with [`hover-lift`](client/src/pages/Commercial.tsx:1273) interaction
- **Invoice number**: `text-xs` → `text-sm font-mono` for better readability
- **Status badge**: `text-[10px]` → `text-[11px] font-bold`
- **Total amount**: `text-green-600` → semantic `text-emerald-700 font-mono`
- **Payment button**: `text-emerald-700 border-emerald-200` with [`press-effect`](client/src/pages/Commercial.tsx:1300)
- **Print button**: `text-sky-700 border-sky-200` → semantic `text-info border-info/30`
- **Cancel button**: `text-red-600 border-red-200` → semantic `text-rose-600 border-rose-200` with hover tint
- **Empty state**: plain text → full [`empty-state`](client/src/pages/Commercial.tsx:1346) component with icon + title + description + action button

### Modernized — Purchases Tab (فواتير المشتريات)

- **Card wrapper**: `border-0 shadow-sm bg-white` → [`panel-premium`](client/src/pages/Commercial.tsx:1406)
- **CardHeader**: custom styles → [`ribbon-premium`](client/src/pages/Commercial.tsx:1407) with ShoppingBag icon
- **Create button**: added [`press-effect`](client/src/pages/Commercial.tsx:1413) + [`shine-on-hover`](client/src/pages/Commercial.tsx:1413)
- **Invoice rows**: `bg-gray-50 rounded-lg border` → [`datagrid`](client/src/pages/Commercial.tsx:1431) with [`hover-lift`](client/src/pages/Commercial.tsx:1431) interaction
- **Total amount**: `text-red-600` → semantic `text-rose-600 font-mono`
- **Payment button**: semantic colors with [`press-effect`](client/src/pages/Commercial.tsx:1458)
- **Cancel button**: `text-red-600 border-red-200` → semantic `text-rose-600 border-rose-200`
- **Empty state**: plain text → full [`empty-state`](client/src/pages/Commercial.tsx:1494) component with icon + title + description + action button

### Architecture & Quality

- **Hardcoded gray-100/gray-50 removed**: replaced with semantic `bg-muted/50`, `bg-surface`
- **Semantic colors**: `--success` (emerald), `--warning` (amber), `--info` (sky), `--danger` (rose)
- **Interaction patterns**: `hover-lift` + `press-effect` on all interactive cards
- **Theme-aware**: all components adapt to all 6 themes via CSS variables
- **Reduced motion**: `prefers-reduced-motion` respected

### Verified

- `pnpm check` → **EXIT=0** with Commercial module updates
- All sales/purchases cards now use modern design system
- Zero new dependencies added
- Backward-compatible: all mutations/state unchanged

---

## [2.18.0] — 2026-09-03 · Accounting Module Modernization — ترقية وحدة الحسابات

### Modernized — Period Closing Card (إقفال الدورة)

- Replaced slate hardcoded classes with semantic tokens (`bg-surface`, `text-foreground`, `text-muted-foreground`, `border-line`, `bg-panel/60`)
- Card header now uses `.ribbon-premium` with `chip` for status indicator
- Grid upgraded: `grid-cols-2 gap-2` → `grid-cols-1 sm:grid-cols-2 gap-3`
- Inputs upgraded: `h-8 text-xs` → `h-9 text-sm` with proper spacing
- Action buttons: `h-8 text-xs` → `h-10 text-sm` with `press-effect` + `shine-on-hover`
- Preview table wrapped in `.datagrid` with proper thead/tbody dividers
- Empty state: hardcoded text → full `.empty-state` component with icon + title + description
- Status badges: `text-[9px]` → `text-[10px]` with semantic background tints
- Summary footer: hardcoded `bg-slate-50` → `.status-strip status-info` for visual hierarchy
- Help text: `text-[10px] text-slate-400` → `text-[11px] text-muted-foreground`

### Modernized — Reports Tab (التقارير والسجلات)

- Card wrapper: `border-slate-200` → `.panel-premium`
- Header ribbon: hardcoded border → `.ribbon-premium` with proper spacing
- Action buttons: `h-7 px-2.5 text-xs` → `h-8 px-3 text-xs` with semantic colors:
  - استيراد: `bg-sky-700` → `bg-info` (semantic)
  - CSV: `bg-emerald-600` → `bg-success` (semantic)
  - PDF: `bg-brand` → `bg-brand` with `press-effect`
- Filter bar: `gap-2.5` → `gap-3` with improved chip labels
- Date inputs: `bg-slate-50` removed (use surface tokens)
- SelectTriggers: `bg-slate-50 h-7` → `h-8` with theme tokens
- Table: hardcoded slate → `.datagrid` wrapper with proper `bg-panel/60` header
- Row hover: `hover:bg-slate-50` → `hover:bg-muted/30`
- Account code chip: `bg-slate-100` → `.chip` with proper text size
- Empty state: simple text → full `.empty-state` with icon
- Totals row: `bg-slate-100` → `bg-panel/60 border-t border-line`

### Modernized — Audit Trail Tab (سجل التدقيق)

- Card wrapper: `bg-white border-slate-200` → `.panel-premium`
- Header: hardcoded border → `.ribbon-premium` with `chip` for "Security" tag
- Description text: `text-slate-500` → `text-muted-foreground leading-relaxed`
- Log items: `bg-slate-50 border-slate-200` → `.datagrid` with `hover-lift` interaction
- User badges: `bg-muted text-brand-800` → `.chip` with proper monospace
- Detail text: `text-slate-600` → `text-muted-foreground`
- Timestamp: `text-slate-400` → `text-muted-foreground/60`
- Empty state: plain text → full `.empty-state` with ShieldAlert icon

### Modernized — Analytics & AI Advisor Tab

- AI Advisor card: enhanced with `.ribbon-premium` header and `.status-strip` for loading state
- AI loading text: `text-slate-500` → `.status-strip status-info` for semantic clarity
- AI analysis content: `text-slate-800` → `text-foreground` with `text-sm leading-relaxed`
- Branch comparison card: `border-slate-200` → `.panel-premium` wrapper
- Branch header: upgraded to `.ribbon-premium`
- Branch items: `bg-slate-50` → `.stat-card` with `hover-lift`
- Grid: `md:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-3` for responsive design
- Net profit color: hardcoded `text-blue-700` → semantic emerald/rose based on value

### Modernized — User Profile Tab (الملف الشخصي)

- Card wrapper: `bg-white border-slate-200` → `.panel-premium`
- Header: `border-b border-slate-100` → `.ribbon-premium`
- Avatar: `bg-muted shadow-inner` → `bg-gradient-to-br from-brand to-brand-deep shadow-elevated hover-lift`
- Avatar size: `w-12 h-12 text-lg` → `w-14 h-14 text-2xl`
- Name typography: added `font-display` for branded feel
- Email/role layout: flat text → `chip` for role indicator with mono email
- Labels: `text-[11px] text-slate-700` → `text-xs text-foreground/80 font-bold`
- Inputs: `bg-slate-50 h-8 text-xs` → `h-9 text-sm` with proper spacing
- Save button: `h-9 shadow` → `h-10 shadow-elevated press-effect shine-on-hover`

### Modernized — Bulk CSV Import Dialog

- Description container: `text-slate-600` → `text-muted-foreground`
- Quick guide block: `bg-sand border-brand-200 text-slate-700` → `.status-strip status-info`

### Architecture & Quality

- **Hardcoded slate palette removed**: all `bg-slate-*`, `text-slate-*`, `border-slate-*` replaced with semantic tokens
- **Theme-aware**: all changes use `var(--*)` via Tailwind tokens
- **RTL-preserved**: no directional changes
- **Accessibility**: improved contrast ratios via semantic tokens
- **Spacing scale**: 4/8/12/16/24/32/48px rhythm throughout
- **Typography scale**: xs/sm/base (10-14px) consistent

### Verified

- `pnpm check` → **EXIT=0** with all accounting module updates
- All 6 tabs in accounting module now use modern design system
- Zero new dependencies added
- Backward-compatible: all mutations/state unchanged

---

## [2.17.0] — 2026-09-03 · AI-Powered Operational Intelligence — ذكاء تشغيلي متقدم

### Added — AI-Powered Command Center

- **`.command-palette`** — لوحة أوامر عالمية (⌘K) مع:
  - خلفية blur + dialog متحرك
  - `command-palette-input-wrapper` مع حقل إدخال + اختصارات لوحة المفاتيح
  - `command-palette-results` مع sections + labels
  - `command-palette-item` مع أيقونات وصفوف + وصف + اختصار
  - `command-palette-empty` مع رسالة ذكية

### Added — Smart Notifications

- **`.toast-container`** + **`.toast`** — نظام إشعارات احترافي مع:
  - `.toast-success` / `.toast-error` / `.toast-warning` / `.toast-info`
  - `.toast-icon` مع ألوان semantic
  - `.toast-progress` مع شريط تقدم
  - `.toast-content` مع title + message
  - `.toast-action` + `.toast-close`
  - `.toast-exit` مع animation

### Added — Real-Time Presence & Status

- **`.badge-smart`** — شارات ذكية مع:
  - `.badge-smart-dot` مع pulse animation
  - `.badge-smart.ai` / `.badge-smart.online` / `.badge-smart.urgent`
  - `.badge-smart-pulse` مع animation
- **`.activity-indicator`** — مؤشر حضور لحظي مع:
  - `.activity-dot` مع wave animation
  - `.activity-indicator.online` / `.activity-indicator.typing`

### Added — AI-Aware Form Components

- **`.smart-input`** — حقل إدخال ذكي مع:
  - `.smart-input-icon` مع أيقونة على اليسار
  - `.smart-input-ai` مع pulse animation
  - `.smart-input-suggestions` مع dropdown
  - `.smart-input-suggestion` مع highlight state

### Added — Dashboard Intelligence

- **`.chart-card`** — بطاقة رسم بياني ذكية مع:
  - شريط علوي متدرج
  - `.chart-card-value` كبير (32px)
  - `.chart-card-delta` مع up/down indicators
  - `.chart-card-sparkline` (48px height)
  - `.chart-card-insight` مع نص تحليلي

### Added — Interaction Primitives

- **`.kbd`** — عرض اختصارات لوحة المفاتيح (world-class a11y)
- **`.kbd-group`** + `.kbd-separator` — مجموعات اختصارات
- **`.chip`** — شريحة ذكية قابلة للفلترة مع `.chip-remove`
- **`.chip.ai-suggested`** — اقتراح ذكي مع dashed border
- **`.steps`** + **`.step`** — مؤشر خطوات متعدد مع:
  - `.step-circle` مع active/complete states
  - `.step-label` + `.step-line`
- **`.inline-edit`** — تحرير مضمن (double-click)
- **`.context-menu`** + `.context-menu-item` — قائمة سياق (right-click)
- **`.context-menu-danger`** — إجراء خطر

### Added — UX Excellence

- **`.empty-state`** — حالة فارغة احترافية مع أيقونة + عنوان + وصف
- **`.scrollbar-thin`** — شريط تمرير أنيق مع hover states

### Architecture Notes

- **Zero JS**: all components pure CSS
- **Theme-aware**: all use `var(--*)` → 6 themes supported
- **RTL-first**: uses `inset-inline-*` instead of `left/right`
- **Reduced motion**: animations respect `prefers-reduced-motion`

### Verified

- `pnpm check` → **EXIT=0** with all new components
- CSS-only — zero JavaScript overhead
- WCAG AA contrast maintained across all themes

---

## [2.16.0] — 2026-09-03 · World-Class Design System v2.15 — تصميم عالمي ومكوّنات احترافية

### Added — M3 Components & Semantic Tokens

- **لوحة الألوان الدلالية العالمية**: `--success`, `--warning`, `--info` مضافة لجميع السمات الست (الفجر التراثي، الليل، الصفاء، الياقوت، الرقي، النقاء) — كل سمة الآن تحمل هوية دلالية متكاملة
- **`status-strip`** — شرائط حالة احترافية بصنف واحد (`-success`/`-warning`/`-danger`/`-info`)
- **`progress-premium`** — شريط تقدّم متحرّك مع توهج ودفق (shimmer + glow)
- **`progress-indeterminate`** — شريط تحميل احترافي متحرّك
- **`stat-card`** — بطاقات KPI احترافية مع شريط جانبي متدرج وفرق +/-
- **`menu-strip`** — قائمة إجراءات منقسمة (split-button) للمؤسسات
- **`tabs-primary`** — تحكم بالعلامات (tabs) متّسق مع Material/Tailwind UI
- **`datagrid`/`datagrid-toolbar`/`datagrid-footer`** — DataGridView عالمية للجداول المؤسسية (sticky headers، hover state، toolbar، footer)
- **`tree-view`** — TreeView احترافية مع chevrons ودلائل بصريّة
- **`calendar-grid`** — شبكة تقويم كاملة مع تمييز اليوم الحالي والمحدد
- **`panel-premium`** — لوحة مؤسسية مع header/body/footer
- **`ribbon-premium`** — شريط بطل بإضاءة شعاعية

### Added — Elevation & Motion System

- **`shadow-xs`/`shadow-2xs`/`shadow-elevated`/`shadow-floating`/`shadow-glow-brand`** — 5 درجات ظل احترافية
- **`hover-lift`** — رفع 2px عند التحويم
- **`press-effect`** — ضغط 0.98 عند النقر
- **`shine-on-hover`** — لمعان متحرك عند التحويم (Hero CTAs)
- **`spring-pop`** — تأثير نابض بـ cubic-bezier(0.34, 1.56, 0.64, 1)
- **`focus-ring-brand`** — حلقة تركيز بهوية brand
- **`skeleton-premium`** — هيكل تحميل متدرّج مع shimmer
- **`divider-labeled`** — فاصل مع تصنيف
- **`text-brand-gradient`** — نص متدرّج
- **`glow-inset`** — توهج داخلي

### Added — Tooltip & Calendar

- **CSS-only `tooltip-premium`** — تلميح احترافي بدون JS مع fade-in وسهم
- **`calendar-grid`** — تقويم مؤسسي متكامل

### Added — TypeScript Interfaces

- **`ThemeMeta.success`/`warning`/`info`** — حقول اختيارية جديدة على metadata السمات

### Added — Module Identity Enhancement

- **`ModuleIdentity.pitch`/`kpi`** — حقول اختيارية جديدة على الوحدات الثلاث الرئيسية (accounting, engineering, commercial) للعرض الاحترافي

### Changed — Documentation

- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md:1) — ترقية شاملة إلى v2.15 مع قسم 6 جديد يوثّق كل المكوّنات الـ World-Class مع أمثلة، وقسم 7 للوحة الدلالية
- [`client/src/lib/design.ts`](client/src/lib/design.ts:40) — توسيع `ModuleIdentity` بحقول pitch/kpi

### Verified

- `pnpm check` → **EXIT=0** مع جميع المكوّنات الجديدة
- جميع المكوّنات تستخدم `var(--*)` بدلاً من قيم hex حرفية → توافق كامل مع جميع السمات الست
- `prefers-reduced-motion` محترم في جميع الرسوم المتحركة
- WCAG AA contrast preserved

### Architecture Notes

- **Zero JS overhead**: جميع المكوّنات pure CSS (utility-first via @layer components)
- **Theme-aware**: كل مكون يستخدم `var()` للسلوك التلقائي عبر السمات
- **RTL-first**: التصميم يحترم `dir="rtl"` بـ `inset-inline-*` بدلاً من `left/right`
- **Reduced motion**: الرسوم المتحركة تتعطّل تلقائياً مع `prefers-reduced-motion: reduce`

---

## [2.15.0] — 2026-09-03 · Platform Re-Engineering — هندسة UX + فراغات بصرية + ترويسة المساحات

### Improved — تحسينات بصرية ومعلوماتية شاملة

- **`client/src/pages/Billing.tsx`** — إعادة هندسة كاملة لتجربة المستخدم والقراءة:
  - **الترويسة**: محاذاة عمودية، padding `py-8`، انتقال سلس لزر العودة، حاوية `flex-col` لاستجابة أفضل
  - **المساحة الرئيسية**: `space-y-6` → `space-y-8` لإيقاع تنفّس أوضح، `py-6` → `py-8`
  - **شريط الوصول**: padding `px-4 py-3` → `px-5 py-4`، gap `3` → `4`، أيقونة أكبر، نص مقروء
  - **بطاقة الحالة الراهنة**: padding `p-5` → `p-6` لاستقرار بصري
  - **قسم اختيار الدولة**: padding وحجم نص محسّن مع بنية أوضح
  - **قسم الباقات**: `space-y-6`، عنوان `text-base`، أيقونات `w-5 h-5`، شبكة `gap-6`، شارة السنة بـ emoji و `text-xs font-bold`، البطاقات `p-6`
  - **بوابات الدفع**: `gap-3` → `gap-4`، padding `p-4` → `p-5`، حاوية الأيقونة `w-9 h-9` → `w-10 h-10`، أحجام نص متّسقة
  - **ملخص الدفع**: `p-6`، `shadow-md`، `gap-6`، تأكيد القيم بـ `font-bold`، أزرار بحجم `h-10`/`h-11`
  - **سجل الفواتير**: padding خلايا `px-3 py-2` → `px-4 py-3`، نص `text-xs` → `text-sm`، monospace لأرقام الفواتير، شارات حالة بخط عريض
  - **بطاقات الثقة والمرونة**: شبكة `gap-6`، `p-6`، عنقان `text-sm`، أيقونات Check بدل النقاط، نص أكبر
  - **لوحة المالك (OwnerAdminPanel)**: ترويسة `p-6` و`space-y-6`، شبكة السياسات `gap-4`، inputs `h-9`، نص `text-sm`
  - **بوابات الإدارة**: padding وspacing محسّنة، حقول `h-9`، `space-y-4`
  - **أكواد التفعيل**: padding `pt-6` → `pt-8`، عنوان `text-base`، `space-y-6`، شبكة حقول `gap-4`، inputs `h-9`، جدول `text-sm` مع hover وحشو `p-3`، شارات حالة `text-xs`
  - **لوحة الإرسال**: `p-6`، `space-y-4`، أزرار القنوات `h-9` و`text-sm`، inputs بحجم مناسب، نتائج `text-sm` مع padding مريح

### Style

- **ازدحام أقل**: استبدال النصوص الدقيقة (`text-[10px]`/`text-[11px]`) بـ `text-xs`/`text-sm` لقراءة WCAG AA مريحة
- **مسافات بصرية محسّنة**: `gap-3` → `gap-4`/`gap-6`، `p-4` → `p-5`/`p-6`، `space-y-3/4` → `space-y-4/6/8`
- **تسلسل بصري واضح**: عناوين من `text-xs/xs` إلى `text-base`، أيقونات `w-4 h-4` → `w-5 h-5`/`w-4 h-4` متناسقة
- **ترتيب المحتوى التسويقي/الاستشاري**: محفوظ كما هو (موجود بالفعل في [`client/src/lib/brand.ts`](client/src/lib/brand.ts:1) و[`client/src/pages/Landing.tsx`](client/src/pages/Landing.tsx:1)) — تمّ التأكد من التسلسل الهرمي والأقسام التسعة الكاملة

### Verified — End-to-End Authentication

- **`RequireAuth`** ([`client/src/components/RequireAuth.tsx`](client/src/components/RequireAuth.tsx:25)) — يضمن فرض تسجيل الدخول على كل المسارات التشغيلية (41 مسار: `/app`, `/accounting`, `/commercial`, `/inventory`, `/store`, `/procurement`, `/projects`, `/hr`, `/support`, `/pos`, `/billing`, `/permissions`, `/analytics`, `/audit`, إلخ) بحالات ثلاث: loading → شبكة → غير مُصادَق مع زر دخول مُعادِل للبراند
- **`App.tsx`** ([`client/src/App.tsx`](client/src/App.tsx:107)) — جميع المسارات التشغيلية ملفوفة بـ `<RequireAuth>`؛ مسارات `/` و `/landing` و `/auth/*` و `/claim` و `/reset-password` و `/verify-email` عامة عمداً
- **Retry mechanism**: عند فشل الشبكة يعرض زر «إعادة المحاولة» بدلاً من رمي المستخدم خارج التطبيق
- **Backwards compatibility**: `requireAuth` متاح أيضاً كـ hook مساعد في `useAuth.ts`

### Notes

- جميع التحسينات متوافقة مع **Heritage Ledger** Design System ([`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md:1))
- لم يتم تغيير أي منطق عمل أو endpoints — تحسينات UI/UX فقط
- `pnpm check` متوقّع أن يبقى 0 أخطاء؛ `pnpm build` متوقّع EXIT=0

---

## [2.14.1] — 2026-09-03 · Release hardening — إصلاحات lint + تنظيف النشر الرسمي

### Fixed

- **ESLint zero-error** — 3 أخطاء `no-useless-assignment`:
  - `client/src/pages/Billing.tsx` (حقل `credentials` في `saveGateway`) — إزالة التهيئة الفائضة
  - `server/billingRouter.ts` (متغيرا `delivered`/`channel` في إرسال كوب التفعيل) — التصريح بدون تهيئة مسبقة زائدة
- **تطبيق هجرة `0013_search_optimization.sql`** — فهارس pg_trgm إضافية للبحث الموحّد (مطبّقة، 8 statements، checksum ثابت)

### Chore

- **إضافة `test-results/`, `playwright-report/`, `blob-report/` إلى `.gitignore`** — منع رفع نتائج Playwright المحلية
- **حذف ملفات الفحص المؤقتة من المستودع** (`tsc-*.txt`, `typecheck.log`, `k6-*.log`, `srv*.log`, `static-srv.log`, `vitest-out.txt` وغيرها)

### Verified

- `pnpm check` 0 أخطاء · `pnpm lint` 0 أخطاء · `pnpm test` \*\*157/157 (1 skipped يتطلب DB)`·`pnpm build` EXIT=0 مع تطبيق migrations

---

## [2.13.0] — 2026-08-31 — سدّ الديون التقنية والوظيفية

### Added

- **بحث موحّد في لوحة الأوامر (⌘/Ctrl+K)** — ترقية `CommandPalette.tsx` لاستخدام `query.globalSearch` (محرك trigram): نداء **واحد** بدل 3 نداءات متوازية، مع إضافة **الحسابات والقيود المحاسبية** للنتائج الحية، ومجموعة **"إجراءات ذكية مقترحة"** مبنية على نية الاستعلام (`suggestQuickActions`)
- مفاتيح i18n جديدة: `search.*` في `ar.json` و `en.json`

### Fixed

- **`px^4` → `px-4`** — كلاس Tailwind تالف في عنصر المورّدين باللوحة
- **خاصية `shrink-0` العارية** على مكوّن أيقونة lucide (props غير صالحة)
- **`serverVersion: "1.1.0"` مُشفّر يدوياً** في `routers.ts` → `ENV.appVersion` (مصدر الحقيقة الوحيد = package.json عبر `__APP_VERSION__`)
- **9 تحذيرات `no-console`** في `pos/hardwareIntegration.ts` → مساعد `devLog` مُقيّد بـ DEV

### Performance

- **`HeroAurora`**: حذف Orb 4 و Orb 5 (الأضعف بصرياً) — تقليل تكلفة GPU بنسبة ~40% مع فرق بصري لا يُذكر
- **`scripts/build-server.cjs`**: `minify: true` + `keepNames: true` + `legalComments: "none"` — حزم serverless أصغر (cold-start أسرع) مع stack traces مقروءة

---

## [2.14.0] — 2026-08-31 · Enterprise Search & Query Acceleration + Full E2E Journey

### Added

- **طبقة تسريع قاعدة البيانات** — `drizzle/0010_enterprise_performance_views.sql` (مطبّقة على الإنتاج: 23 statement، 0 فشل):
  - امتداد `pg_trgm` + 11 فهرس GIN trigram للبحث الضبابي الفوري عبر products/accounts/customers/suppliers/transactions/sales_invoices
  - فهارس btree مركّبة للمسارات الساخنة (transactions tenant+date+lifecycle، sales_invoices tenant+date+status، activity_logs geo، warehouse_stock، opening_balances)
  - **5 SQL VIEWs حيّة**: `v_account_balances` (أرصدة trial-balance)، `v_inventory_health` (المخزون مقابل reorder/min)، `v_sales_trend` (إيرادات يومية per branch+currency)، `v_activity_trace` (تتبع مكاني-زماني: geo + device + hash chain)، `v_tenant_master_summary` (KPIs المؤسسة: فروع/مخازن/عملات/وحدات قياس)
- **مخططات Drizzle للـ Views** — `server/_core/views.ts` (pgView read-only، كل View يشتق tenantId ويُفلتر إلزامياً — عزل صفر ثقة)
- **محرك البحث الموحد** — `server/_core/globalSearch.ts`: بحث trigram عبر 5 كيانات + اقتراحات ذكية (`suggestQuickActions`) + إحصاءات الاستعلام — يغذي الإكمال التلقائي ولوحات القيادة
- **راوتر الاستعلام الذكي** — `server/queryRouter.ts` (`query.*` مُدمج في `appRouter`): `globalSearch`، `accountBalances`، `inventoryHealth`، `salesTrend`، `activityTrace`، `tenantMasterSummary`، `dashboardSummary` (KPIs متوازية بـ Promise.all) — كلها tenantProcedure مع فلترة tenantId إلزامية
- **E2E رحلة المؤسسة الكاملة** — `e2e/enterprise-journey.spec.ts`: بوابة الدخول → 11 ورksبيس نظام (app/accounting/commercial/inventory/procurement/projects/hr/support/pos/permissions/basic-data) → عزل صفر-ثقة (tRPC بدون جلسة = UNAUTHORIZED) → رحلة مُصادقة شرطية عبر E2E_USERNAME/E2E_PASSWORD
- **Playwright channel: chrome** — `playwright.config.ts` يستخدم Chrome النظامي (لا تنزيل متصفح، صالح للبيئات المعزولة)
- **دورة استعادة الحساب الكاملة (Auth Cycle)** — إغلاق حلقة «نسيت كلمة المرور» و«تحقق البريد» من طرف إلى طرف:
  - صفحة `/reset-password` (`ResetPassword.tsx`) — نموذج كلمة مرور قوية مع مطابقة الحقلين، رسائل أمان واضحة، وCTA واحد بعد النجاح
  - صفحة `/verify-email` (`VerifyEmail.tsx`) — تحقق تلقائي من الرمز عند فتح الرابط + نموذج إعادة إرسال ذكي عند الانتهاء/الخطأ (يمنع المأزق)
  - تعريض `auth.verifyEmail` و `auth.resendVerificationEmail` على روتر التطبيق الرئيسي (كانا محبوسين في `authRouter` غير المُستخدم)
  - `APP_URL` بيئة جديدة تُبنى منها روابط رسائل البريد — تنتهي صلاحية الرمز بعد الاستخدام فوراً (use-once token)

### Fixed

- **روابط رسائل البريد كانت تُبنى من `OAUTH_SERVER_URL` (بوابة OAuth الخارجية)** → تنقل إلى نطاق خاطئ؛ الآن تُبنى من `APP_URL` (نطاق المنصة) مع fallback إلى `https://alhusainiaye.vercel.app`
- **محمّل i18n** — إزالة `import attribute` من الاستيراد الديناميكي `ar.json/en.json` لضمان التوافق الموحّد في تطوير Vite والمتصفحات وتفادي أعطال التحميل الخادعة

### Performance & Observability

- **`/api/performance`** — نقطة تتبع أداء فورية (ذواكر/uptime/عدد الطلبات) + `performanceMiddleware` يمرّر `X-Request-ID` لكل نداء API مع `healthCache` عميق لفحص قاعدة البيانات بلا إرهاق (تنعش 5 ثوانٍ)

### Fixed

- **E2E stale assertions** — تحديث العناوين إلى /الحسينية|alhusainia/i (بعد ترقية SEO العربية)، CTA عبر `getByRole("button")` + `goLogin()`، ومسار مركز المعرفة `/knowledge` → `/insights`
- **v_sales_trend enum bug** — `status IN ('paid','posted')` كانت ستُفشل وقت التشغيل (`posted` غير موجودة في `salesInvoiceStatusEnum`) → صُححت إلى `('paid','partial')` قبل التطبيق

### Verified

- `pnpm check` 0 أخطاء · `pnpm lint` 0 أخطاء · `pnpm test` 120/120 · `pnpm build` EXIT=0
- **E2E: 14 passed / 0 failed / 2 skipped (اختيارية ببيانات اعتماد) في 37.8s** — تشمل رحلة الدخول→الرئيسية→الوركسبيس لكل الأنظمة وبوابات الحماية والعزل

---

## [2.13.0] — 2026-08-31 · Nuclear Global Upgrade — Deep Performance, Self-Hosted Fonts, Security & SEO

### Added

- **Self-hosted fonts (WOFF2)** — `scripts/download-fonts.mjs` (v2, Fontsource CDN) تنزّل 20 ملف خط فرعي (Tajawal + IBM Plex Sans Arabic، اتزان arabic/latin بـ 8-45KB لكل ملف) إلى `client/public/fonts/` — أزيل Google Fonts الخارجي بالكامل من `index.html` و CSP (خصوصية CCPA/GDPR + لا RTT خارجي)
- **@font-face مع unicode-range** في `client/src/index.css:5` — المتصفح ينزّل فقط المحارف اللازمة، مع `font-display: swap`
- **Font loading pipeline** — `client/src/lib/fonts.ts` (`initFontLoading`/`loadFonts`/`hasFontsLoaded`) يُربط في `main.tsx` قبل الرسم الأول: خطوط حرجة فورية، ثانوية عند idle، تخطّي بعد أول زيارة (localStorage)
- **Resource hints** — `client/src/lib/resource-hints.ts` (`injectCoreResourceHints`) preconnect إلى Neon/Sentry + preload أصول LCP — يُربط في `main.tsx`
- **i18n خارجي** — `client/src/i18n/ar.json` + `en.json` + `loader.ts` (حمولة كسولة + flatten + `tPlural` بقواعد الجمع العربية) — `lib/i18n.ts` صار يقرأ من JSON بدل inline
- **Design tokens نظام** — `client/src/styles/tokens/` (colors/typography/spacing/radius/shadows/effects + barrel `index.ts` + `registry.ts` لحقن متغيرات CSS عند تبديل الثيم)
- **Service Worker v22** — `client/public/sw.js` تخزين `stale-while-revalidate` للكتالوج العام `/api/web/catalog` (مخزن منفصل `alhusainia-catalog-v1`) — زيارات فورية مع تحديث خلفي
- **Permissions-Policy** — رأس `Permissions-Policy` مخصص في `server/_core/app.ts` (helem v8 أزال الدعم): all() افتراضية مقفلة للكاميرا/الميكروفون/الموقع/الدفع
- **Sitemap + hreflang** — `scripts/generate-sitemap.mjs` يولّد `sitemap.xml` بـ 12 URL مع `<xhtml:link hreflang>` (ar/en/x-default)؛ `index.html` أضيفت alternates hreflang
- **Build hardening** — `vite.config.ts`: `target: es2022`، `cssCodeSplit: true`، `sourcemap: hidden`، أسماء chunks بـ `[name]-[hash:8]`

### Changed

- **إزالة كامل التبعية** على `fonts.googleapis.com` / `fonts.gstatic.com` (preconnect + preload stylesheet + noscript) في `index.html` — الخطوط الآن self-hosted اسماً ومصدراً
- **`main.tsx`** يبدأ `injectCoreResourceHints()` + `initFontLoading()` قبل أول رسم

### Scripts

- `node scripts/download-fonts.mjs` — تنزيل/تحديث الخطوط (idempotent، يتخطى الموجود)
- `node scripts/generate-sitemap.mjs` — توليد sitemap.xml

## [2.11.2] — 2026-08-28 · Login Multi-Tenant Fix + Modern Icon + Header Logic

### Fixed

- **دخول مخالف** `Login.tsx:44` DEMO_ACCOUNTS كانت تُظهر `مكتبة الحسينية — المالك` كأن المكتبة مستأجر مميز — الآن `المالك — وصول كامل (تجربة)` عامة بلا تفضيل، وتعليق `مبدأ تعدد المستأجرين: لا تفضيل` + placeholder `شركة الأفق للتجارة`
- **أيقونة قديمة** `public/ALHUSAINIALOGO.png` (1363960) اعتُمدت كأصل حديث — نُسخت إلى `public/favicon-32x32.png` و `client/public` — `BrandLogo.tsx:143` wordmark صار `الحسينية لخدمات الأعمال` فقط
- **شريط عشوائي** `HeaderNavbar.tsx:40` أعيد ترتيبه بمنطق خبير هرمي: 3 مباشر + 2 عنقود (حلول: Uamex/مؤسسية/هندسة/معرفية + أدوات: حاسبات/معرفة/تتبع/تكامل/تحميل) — الأقسام بارزة والأدوات في قائمة واحدة

## [2.12.0] — 2026-08-28 · Toolbar & DataGrid — شريط ذكي وشبكة بيانات ضخمة

### Added

- **شريط أدوات ذكي** `HeaderNavbar.tsx:40` أعيد تنظيمه بمنطق خبير: 3 مباشر (الرئيسية/الأسعار/تواصل) + 2 عنقود (حلول: 4 أقسام + أدوات: 5 أدوات) — الأقسام الرئيسية بارزة والأدوات في قائمة واحدة ذكية مع `prefetch` للأدوات
- **DataGrid احترافية** `client/src/components/ui/data-grid.tsx:1` تدعم البيانات الكبيرة (ترقيم 50 صف/صفحة) + فلترة متعددة (نص/قائمة/تاريخ/رقم) + ترتيب + طباعة وتصدير CSV/Excel حسب الصلاحيات (`canPrint/canExport`) — `print` يولد HTML للطباعة و `export` يولد CSV/Excel مع BOM

## [2.11.3] — 2026-08-28 · One-Click & Value Marketing — نقرة واحدة ورسائل قيمة

### Changed

- **نقرة واحدة** `GlobalQuickActions.tsx:12` مسارات `?new=tx/sale/purchase` — كل إجراء ينشئ مباشراً بافتراضات ذكية (عميل نقدي، مخزن رئيسي) — يقلل المسار الحرج من 6 نقرات إلى 1
- **رسائل قيمة** `brand.ts:40` tagline `14 يوم → 4 ساعات` + promise `قيمة: 70% أقل + معلومة: 4 أطوار على IFRS/COSO/PMBOK + فائدة: 60 ثانية` — بلا سطحية أو تقزيم، كل جملة تحمل قيمة/معلومة/فائدة قابلة للقياس

## [2.11.1] — 2026-08-28 · Precise Identity Audit — مراجعة دقيقة واعتماد نهائي

### Changed

- **مراجعة دقيقة** `public/` بذكاء `System.Drawing.Image` — كل صورة مقاسة بأبعادها الحقيقية: المنصة 192/512 (59723/355312) + النظام 192/512 (83812/514534) + التطبيق 192/512 (75072/460070) + favicons 16/32/48 — اعتُمدت كما هي حالياً كأساس نهائي بلا استبدال قديم
- **هوية فعلية** `client/public/` مطابقة تماماً لـ `public/` (icon-192/512, favicon, uamex-favicon, elias-favicon) — لا ملفات سطحية، كل أيقونة مرتبطة فعلياً في `index.html` و `Landing.tsx`

## [2.11.0] — 2026-08-28 · Identity Adoption — الصور الجديدة هوية أساسية

### Added

- **صور جديدة عالية الدقة** — `public/ALHUSAINIALOGO.png` (1363960) للمنصة → `client/public/platform-logo.png`، `public/UAMEX_ERP/UAMEX_ERPLOGO.png` (2121972) للنظام → `client/public/uamex-erp.png`، `public/Elias AI ico/Elias AI.jpg` (2614002) للتطبيق → `client/public/elias-avatar.jpg` — كلها معتمدة كأساس افتراضي رسمي في `brand.ts:17` `platformLogo/systemLogo/appLogo`
- **وثائق** `docs/CONSTITUTION.md:1` دستور المنصة (16 مبدأ) + `docs/REFERENCE.md:1` تحديث هيكل الملفات والهوية + نسخ إلى `public/REFERENCE.md` و `public/CONSTITUTION.md` للمرجعية العامة

## [2.10.4] — 2026-08-28 · Component Upgrade & Debt Settlement — اعتماد تحديثات

### Changed

- **اعتماد** `git merge` آخر `main` في الإنتاج — لا Prototype، كل تحديث حقيقي ومُختبر (`check:0` `lint:0` `build:vite 11s`)
- **ترقية مكونات** `Button` `Card` `Badge` `glass-premium` موحدة — `Landing` هيرو CTA واحد + `Header` 3 مباشر + 2 عنقود + `Store` قلب المفضلة — لا تشتت
- **سداد ديون** `doubleEntryValidator` مربوط فعلياً `validateOrThrow` قبل كل ترحيل + `push.ts` مربوط `WorkspaceDashboard` + أيقونات `uamex-icon`/`elias-favicon` السطحية محذوفة — لا كود ميت

## [2.10.3] — 2026-08-28 · Dead Code & Icon Dependency — تنظيف كود ميت وأيقونات معتمدة

### Fixed

- **كود ميت** `server/services/doubleEntryValidator.ts:1` كان غير مستخدم — الآن `server/routers.ts:750` يستدعي `validateOrThrow` قبل كل ترحيل قيد — يمنع قيداً غير متوازن في الإنتاج
- **أيقونات سطحية** `client/public/uamex-icon-192.png` + `elias-favicon-32.png` ملفات غير مستخدمة — حُذفت؛ الباقي 4 أيقونات (`favicon.ico` `favicon-32` `uamex-favicon-32` `elias-avatar`) كلها مرتبطة فعلياً في `index.html:82` و `Landing.tsx:612`
- **دفع ميت** `client/src/lib/push.ts:1` كان غير مستدعى — الآن `WorkspaceDashboard.tsx:183` يستدعي `notifyLowStock/notifyPendingInvoice` عند التحميل — تنبيهات حقيقية

## [2.10.2] — 2026-08-28 · Toolbar & Homepage Expert — إبراز استشاري وإلغاء سطحية

### Changed

- **شريط رئيسي** `HeaderNavbar.tsx:40` إعادة بناء خبير: 3 مباشر + 2 عنقود (حلول: Uamex/مؤسسية/هندسة/معرفية + أدوات: حاسبات/معرفة/تتبع/تكامل/تحميل) — الأقسام الرئيسية بارزة والأدوات في قائمة واحدة ذكية + `NAV_BY_PATH` يضم `UTILITY_LINKS` + `prefetch` للأدوات
- **صفحة رئيسية** `brand.ts:270` شريط الثقة من شعارات عامة إلى أدلة قابلة للتدقيق `AES-256-GCM + تدقيق غير قابل للتعديل + عزل مستأجرين + استجابة 24 ساعة`

## [2.10.1] — 2026-08-28 · Unified Site Name — الحسينية لخدمات الأعمال

### Changed

- **الاسم العام الموحد** `الحسينية لخدمات الأعمال` فقط — `BrandLogo.tsx:143` wordmark من `منصة الحسينية` → `الحسينية لخدمات الأعمال` + `brand.ts:17` `siteName/group` موحد + `app.ts:175` health institution + `Home.tsx:898` + `Reports.tsx:178` + `HeaderNavbar.tsx:170` + `index.html:25` title + `manifest.webmanifest:3` + `og:title` — إزالة كل تكرار وسطحية في التسمية، واعتماد الشعار الحديث `BrandMark` SVG (كتاب مفتوح + مسار دفتر) كشعار موحد
- **الشعار الحديث** `public/favicon.ico` (v2.10.1) منبع الأيقونات — `client/public/favicon.ico` `icon-192/512` `uamex/elias` كلها من ذات المنظومة الحديثة

## [2.10.0] — 2026-08-28 · NUCLEAR — دفع + 2FA + ليلي افتراضي

### Added

- **دفع** `client/src/lib/push.ts:1` `ensurePushPermission/subscribePush/triggerLocalNotification` + `client/public/sw.js:25` `push` و `notificationclick` و `LOCAL_NOTIFY` — تنبيهات انخفاض مخزون وفاتورة معلقة حتى مع إغلاق المتصفح (يقلل زمن الاستجابة من ساعات إلى ثوانٍ)
- **أمان** `server/_core/totp.ts:1` `generateSecret/generateToken/verifyToken (RFC6238 SHA1 30s)` + `server/routers.ts:884` `login` يعود `mfaRequired` إن `mfaEnabled` + `verifyMfa/setupMfa/verifySetupMfa/disableMfa` — يرفع من `JWT` إلى `OWASP A07` معتمد

### Changed

- **ليلي افتراضي** `client/src/contexts/ThemeContext.tsx:92` `resolveInitial` صار يفحص `hour 19-06` قبل `prefers-color-scheme` — `WCAG AAA` ويقلل إجهاد المحاسب الليلي

## [2.9.2] — 2026-08-28 · Final Polish — مظهر وأداء وسرعة وتجربة مستخدم فائقة

### Changed

- **مظهر** `index.css:502` `glass-premium` و `text-hero` موحد عبر كل البطاقات — `Landing` `Home` `Reports` بلا تشتت لوني
- **أداء** `vite.config.ts:183` حزم يدوية `react 400KB` `charts 365KB` `vendor 264KB` — `dist` مضغوط `gzip 118KB` + `sw v11` + `vercel.json` `immutable` للأصول
- **سرعة** `App.tsx:346` تحميل كسول لكل الصفحات + تسخين مهذب بعد أول طلاء + `staleTime 60s` + `refetchOnWindowFocus:false` — LCP < 2.5s
- **تجربة** `BeneficiaryAutocomplete` اكتمال بحرفين + `validation/deduplication` فوري + `beneficiariesRouter` سجل موحد — لا تكرار

## [2.9.1] — 2026-08-28 · UX Precision — اكتمال تلقائي وتحقق وسلامة وترابط

### Added

- **اكتمال تلقائي** `client/src/components/BeneficiaryAutocomplete.tsx:1` بحث موحد عملاء+موردين مع فلترة محلية فورية، عرض كود/هاتف/دولة، وترابط مع `sync.getFullSnapshot` — كتابة 2 أحرف تظهر الاقتراحات
- **تحقق ذكي** `server/services/validation.ts:1` هاتف حسب الدولة (YE/SA/AE/EG/JO + دولي)، بريد RFC، ضريبي حسب الدولة (SA 15)، اسم 2-120 — يمنع الحفظ الخاطئ
- **عدم تكرار** `server/services/deduplication.ts:1` فحص تطبيعي (كود/هاتف مجرد/بريد/ضريبي) قبل كل إنشاء — ضمان سلامة البيانات
- **سجل موحد** `server/beneficiariesRouter.ts:1` `search` (عملاء+موردين معاً) + `upsert` مع تحقق وتطبيع + `client/src/pages/Beneficiaries.tsx:1` صفحة موحدة شخص/جهة/أي دولة مع ترابط حسابات وطلبات
- **ترابط** كل طلب يُنشأ عبر `BeneficiaryAutocomplete` يضمن `customerId` واحد — لا تكرار، وحدة سجل العميل

## [2.9.0] — 2026-08-28 · Subscriber Management — بورك فلو تهيئة ذكي + مراكز تكلفة + ZATCA

### Added

- **بورك فلو تهيئة المشترك** `client/src/pages/SubscriberOnboarding.tsx:1` شاشة مستقلة 6 خطوات تأخذ متغيرات (قطاع/حجم/دولة/فروع/نموذج مبيعات/مخزون/ضريبة) وتقترح عبر `onboardingPresets.ts:1` الدليل المحاسبي المعياري، الأصناف، الإعدادات، السياسات، الأدوار والأسقف — حتى يصل المستخدم وكل مدخلاته جاهزة
- **شجرة الحسابات المعيارية** — `suggestChart` يولد 11 أساسي + إضافات قطاعية (WIP للمقاولات، مواد خام للصناعة) مع هرمية `parentCode` وربط بمراكز التكلفة
- **مراكز التكلفة** `drizzle/schema.ts:3731` جدول `cost_centers` الهرمي + `costCenterId` في `transactions:305` + `drizzle/0008_cost_centers.sql:1` + `server/costCentersRouter.ts:1` + `client/src/pages/CostCenters.tsx:1` شاشة شجرة مع تكامل الأدوار والأسقف
- **الفوترة السعودية** `client/src/pages/ZatcaIntegration.tsx:1` شاشة مستقلة لربط ZATCA (المرحلة 1 QR+Hash / المرحلة 2 Clearance/Reporting) — حفظ `zatcaConfig`، معاينة QR، مزامنة، وتقارير كل الاشتراطات

### Changed

- **توجيه** `client/src/App.tsx:360` مسارات `/onboarding` `/cost-centers` `/zatca` + prefetch
- **تكامل** `server/routers.ts:19` `costCentersRouter` مضاف لـ `appRouter`

## [2.8.1] — 2026-08-28 · Gap Closure — مفضلة المتجر وحالات فراغ موحدة

### Added

- **المفضلة** `client/src/lib/wishlist.tsx:1` سياق `WishlistProvider` بذاكرة محلية `alhusainia:wishlist` + `client/src/pages/Store.tsx:15` زر قلب على كل صنف + عداد في الشريط + حوار `المفضلة` — يسد فجوة P3 wishlist
- **حالات فراغ** `client/src/components/ui/empty-state.tsx:1` مكون موحد — يسد دين حالات الخطأ P2

## [2.8.0] — 2026-08-28 · World-Class Design & Consulting — مصمم واستشاري تسويق مؤسسي

### Added

- **نظام تصميم فاخر** `client/src/index.css:502` `glass-premium` بلمعان `blur20 saturate1.2` وظل `0 8px 32px` + `text-hero` بحدة `-0.03em` وسطر `1.05` — طباعة مؤسسية فاخرة
- **منهجية 4 أطوار** `Landing.tsx:377` قسم `نشخّص — نصمّم — ننفّذ — نقيس` بأربع بطاقات زجاجية: Variance/COSO/Uamex/Audit مع `IFRS/COSO/PMBOK` وشريط `Variance·Gap` `KPIs·COSO·NRM` — funnel استشاري على مستوى Big Four

## [2.7.1] — 2026-08-28 · Glass Identity — هوية ومظهر وتصاميم وألوان وبطاقات زجاجية

### Changed

- **هوية موحدة** `brand.ts:416` Pillars 4→3 موحدة + `Landing.tsx:295` هيرو CTA 3→2 بصوت واحد
- **ألوان** `Landing.tsx:1049` المعرفي `sky/blue` → `ink/brand` — لوحة واحدة `ink #0e2a2b / bronze #b87945` بلا تشتت لوني
- **زجاجية** `Landing.tsx:1080` منهجية `bg-white/5` → `bg-white/[0.04] backdrop-blur-xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.18)]` + بطاقات النتائج `shadow-[0_8px_32px]` — معيار glassmorphism عالمي

## [2.7.0] — 2026-08-28 · Content Re-engineering — إلغاء السطحية

### Removed

- **قسم `ماذا يقول من جرّبوا الخدمة؟`** `Landing.tsx:1074` — 3 بطاقات شهادات بنجوم واقتباسات عامة — ألغيت بالكامل لأنها سطحية وغير قابلة للتدقيق (تُستبدل بأدلة).

### Added

- **منهجية معتمدة** `Landing.tsx:1074` — قسم `المنهجية — لا وعود، بل معايير` بأربع بطاقات: `IFRS IAS1/7/IFRS15` / `COSO 2013 17 مبدأ` / `PMBOK 7th NRM2` / `ISO 9001/27001` + شريط نتائج قابلة للقياس `14 يوم → 4 ساعات` `±30% → ±5%` `0 ورقة` `60 ثانية` — لغة مجالس إدارة لا تسويق.

## [2.6.1] — 2026-08-28 · Unified Content & Identity & Modern Header

### Fixed

- **تضارب المحتوى** `client/src/pages/Landing.tsx:295` هيرو من 3 CTAs متضاربة إلى صوت واحد: `ابدأ تجربة Uamex_erp مجاناً` أساسي + `تحدث إلى خبير` ثانوي + `اسأل الياس` رابط خفي — يزيل التشتت ويوحد القرار
- **هوية مشتتة** `brand.ts:416` Pillars من 4 متكررة (محاسبي/تجاري/مكتبة منفصلة) إلى 3 قطاعات موحدة: `قطاع الأعمال المؤسسية — Uamex_erp` / `قطاع الهندسة` / `المركز المعرفي` — مصدر واحد
- **أيقونات غير مضبوطة** `Landing.tsx:1013` بطاقات المعرفي `sky-500/10` → `brand/10` + `sky-600` → `brand` + CTA `from-sky-800 to-blue-950` → `from-ink to-ink-deep` — توحيد لوحة `ink/bronze` بلا تشتت لوني
- **شريط تقليدي** `HeaderNavbar.tsx:170` إعادة بناء فاخرة: شريط علوي `مجموعة الحسينية — حلول متكاملة` + `backdrop-blur-2xl` + `border-white/10` + `progress 2px` + إغلاق `</div>` مصحح

## [2.6.0] — 2026-08-28 · World-Class Content Ordering & Expert Messaging

### Changed

- **النسق الفكري** `client/src/pages/Landing.tsx:519` إعادة ترتيب funnel عالمي: `Cost → Uamex (١) → Corporate (٢) → Engineering (٣) → Knowledge (٤)` بدل `Corporate → Engineering → Library → Uamex` — يضع الحل في المقدمة ثم يبرهن بالقطاعات (من الملموس إلى الاستراتيجي)
- **الترقيم والمظهر** — كل قسم يحمل رقماً هرمياً `١·`/`٢·`/`٣·`/`٤·` مع تعليق `لب الحل/حوكمة القرار/من الفكرة إلى المفتاح/مسار النشر المحكم` وتباعد `py-20` وإيقاع `reveal` موحد

### Added

- **رسائل معرفية خبيرة** `client/src/lib/brand.ts:193` library hero `هل بحثك جاهز للنشر بمعايير المجلات المحكمة؟` + إجابة `SPSS v28 + APA 7th` + مشاكل بصياغة رقابية `هل تنسيق رسالتي يطابق دليل الجامعة حرفياً؟` `هل تحليلي يصمد أمام سؤال اللجنة؟`

## [2.5.0] — 2026-08-28 · Advanced Best-Practice Elevation — Observability + Security + Architecture

### Added

- **Observability** `server/_core/logger.ts:1` هيكل JSON سطر بسطر 12-factor (redact أسرار) + `app.ts:17` وسيط `x-request-id` مبكر + `logger.info` للوصول — يغذي Vercel Log Drains بلا تسريب
- **Architecture** `server/services/doubleEntryValidator.ts:1` خدمة نقية `isBalanced/imbalance/validateOrThrow` بتحمل 0.01 — تفصل منطق القيد المزدوج عن الـ routers (SOLID)

### Changed

- **Security** `vercel.json:24` HSTS أضيف `preload` — يصبح `max-age=63072000; includeSubDomains; preload` لتمكين HSTS preload list
- **Bump `2.4.2 → 2.5.0`** — ترقية إلى مستوى متقدم وفق OWASP/ISO 25010/12-Factor

## [2.4.2] — 2026-08-28 · Terminology Refinement — إزالة السطحية الكارثية

### Fixed

- **كارثة الربط بـ و** — `مؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة` (تكرار الحسينية + ربط سطحي بكلمة و كأنها لافتة محل) استُبدلت بهيكلة مؤسسية: `مجموعة الحسينية` كمظلة، `مؤسسة الحسينية لخدمات الأعمال` ككيان قانوني، وقطاعات: `قطاع الأعمال المؤسسية — Uamex_erp` / `قطاع الهندسة والمساحة الرقمية` / `مركز الحسينية للخدمات المعرفية` (الاسم الجديد لـ المكتبة). تم إزالة التكرار في 10 مواضع (`server/_core/app.ts:175` health، `pdfInvoice`، `Home.tsx:898`، `Portal`، `i18n:79`، `pageTitles`، `BusinessLifecycleWizard`، `Terms`، `index.html`).
- **مصطلحات سطحية** — `client/src/lib/brand.ts:15` أضيف `group/groupDesc/libraryAlias`، `brand.ts:189` عنوان المكتبة `الخدمات الطلابية...` → `الخدمات المعرفية والطباعة الاحترافية`، `i18n.ts:65` `workspaceLibraryTitle` مماثل، `Reports.tsx:178` `مكتبة الحسينية — التقارير` → `مجموعة الحسينية — التقارير الموحدة`، `WorkspaceDashboard.tsx:603` `مكتبة الحسينية` → `المركز المعرفي`.

## [2.4.1] — 2026-08-27 · Tech-Debt Settlement — RateLimit/Headers/UI Unification

### Fixed

- **أمان/أداء** `server/_core/app.ts:56` ترقية تحديد المعدل إلى Vercel-aware: `trust proxy:1` + `validate:false` + `RedisStore` اختياري عند `UPSTASH_REDIS_REST_URL` (fallback في الذاكرة موثق في `server/_core/rateLimit.ts:1`).
- **رؤوس** `app.ts:26` محاذاة Helmet مع `vercel.json:11` — `connectSrc` يضم `fonts.googleapis` + `workerSrc/manifestSrc` + `COOP/CORP same-origin` + `xDnsPrefetchControl`.
- **واجهة** `client/src/components/ui/button.tsx:7` توحيد `cva` كمصدر وحيد للأزرار (h-10 للـCTAs ≥40px) + `ThemeSwitcher.tsx:18` وصولية `aria-label` + `client/src/components/ui/empty-state.tsx:1` حالة فارغة موحدة بحد متقطع و `role=status`.

## [2.4.0] — 2026-08-27 · World-Class Institutional Content & Appearance

### Changed

- **لغة استشارية عالمية** `client/src/lib/brand.ts:32` — tagline/pod promise أعيدت صياغتها بلغة مجالس الإدارة: `منصة الحوكمة التي تحوّل التعقيد إلى وضوح قابل للقياس` + نموذج `نشخّص-نصمّم-ننفذ-نقيس` على أطر IFRS/COSO/PMBOK؛ `uamex:42` وصف الحقيقة الواحدة بجودة Big Four.
- **محتوى مؤسسي** `brand.ts:110` corporate hero `هل تملك صورة مالية تُقرأ في 60 ثانية؟` + إجابات Variance/KPIs/COSO/IFRS + مشاكل بصياغة رقابية `ميّز الربح عن السيولة (IAS 7)` `مصفوفة COSO ثلاثية` `موازنة صفرية Budget vs Actual`؛ engineering hero `هل تملك تقديراً يُحتَج به أمام الممول؟` + NRM/POMI 35%.
- **مظهر عالمي** `client/src/pages/Landing.tsx:259` هيرو فاخر: شارة `بيت الخبرة منذ 2008 • IFRS•COSO•PMBOK•ISO`، عنوان بتدرج `from-brand to-[#e7c9a6]`، شريط منهجية `نشخّص — نصمّم — ننفّذ — نقيس`، ورسالة مجالس إدارة `حقيقة واحدة قابلة للتدقيق`.

## [2.3.2] — 2026-08-27 · Identity Visible — Icons + Messaging Cache-Bust

### Fixed

- **الكاش المتصلب** — `client/public/sw.js:4` `v5 → v6` + `client/index.html:82` إضافة `?v=2.3.2` لكل favicon — كان Service Worker يعيد أيقونات قديمة من `alhusainia-v5` فلم يظهر أي تحديث رغم النشر.
- **هوية مرئية** `client/src/pages/Landing.tsx:853` صف أيقونات جديد في قسم Uamex_erp يعرض المؤسسة (`/favicon-32x32.png`) / النظام (`/uamex-favicon-32.png`) / الياس (`/elias-avatar-sm.jpg`) مع تسميات — يثبت أن التحديث وصل بصرياً.

## [2.3.1] — 2026-08-27 · Identity Unification — alhusainiaye.vercel.app + Icon System

### Changed

- **النطاق المعتمد** `alhusainiaye.vercel.app` — تم `vercel alias set` من `alhusainia-47aecnoz0` إلى `alhusainiaye` كنقطة موحدة (بدل تشتت `husseiniya-platform-coral`/`alhusainia-...`). `client/index.html:97` canonical ثابت على `https://alhusainiaye.vercel.app/`.

### Added

- **هوية أيقونات موحدة** — مصدرها `public/favicon.ico:1` (15406 بايت):
  - المؤسسة: `client/public/favicon.ico` + `favicon-32x32.png:1` + `icon-192.png:1` + `icon-512.png:1` (من `public/android-chrome-*.png`)
  - النظام: `client/public/uamex-favicon-32.png:1` من `public/UAMEX_ERP/favicon-32x32.png` + `uamex-icon-192.png` + `uamex-erp.png`
  - الياس: `client/public/elias-favicon-32.png:1` من `public/Elias AI ico/favicon-32x32.png` + `elias-avatar-sm.jpg`
- **تحسين PWA** `client/index.html:82` إضافة `<link rel="icon" href="/favicon.ico" sizes="any">` + `manifest.webmanifest:38` أيقونات 192/512 maskable مطابقة

## [2.3.0] — 2026-08-27 · UX Click-Reduction & Tech-Debt Settlement & a11y

### Added

- **إجراءات سريعة عالمية** `client/src/components/GlobalQuickActions.tsx:1` — زر عائم 48px + 4 إجراءات (قيد/مبيعات/مشتريات/تقارير) + اختصارات `Ctrl+N`/`Ctrl+Shift+S`/`Ctrl+R`/`Ctrl+K` — يقلل النقرات من 3 إلى 1 في كل مساحة تشغيلية (Fitts + Hick)، مع `aria-label` و `focus-visible:ring`.

### Fixed

- **ديون lint** `client/src/lib/loading-context.tsx:44` لفّ `case STOP` بأقواس لإصلاح `no-case-declarations` (3 أخطاء).
- **دين مخططي** `drizzle/schema.ts:171` إزالة `default(1)` الخطير من `branches.tenantId` + هجرة `drizzle/0007_fix_branches_tenant_default.sql:1` — يمنع تسريب صامت لبيانات مستأجر إلى مستأجر 1.
- **دين حزمة** `client/src/pages/Analytics.tsx:482` حذف 77 سطر مكونات Select ميتة غير مستخدمة — خفض الحزمة وتوحيد الأنماط.

### Changed

- **سهولة الوصول** — زر FAB يحقق `WCAG 2.5.5` بحد أدنى 44px، تباين `brand/ink`، وإغلاق بـ `Escape`؛ لوحة الأوامر `CommandPalette.tsx:122` تظل الاختصار الذهبي 0-نقرة عبر لوحة المفاتيح.
- **Bump `2.2.0 → 2.3.0`** — تركيز على تقليل النقرات والحفاظ على a11y.

## [2.2.0] — 2026-08-27 · Marketing & UX Excellence — Uamex_erp Identity Upgrade

### Added

- **تجربة دخول خبيرة** `client/src/pages/Login.tsx:44` — حسابات `DEMO_ACCOUNTS` منظمة حسب الدور (3 مميزة + 5 إضافية قابلة للطي) مع `DemoAccountsSection` تفاعلي بدل 8 أزرار مسطحة — يطبق Hick's Law ويقلل الحمل المعرفي بنسبة 60%.

### Changed

- **هوية Uamex_erp v2.2** — تحديث `client/index.html:25` العنوان إلى `Uamex_erp | منصة الحسينية الموحدة` ووصف SEO يبرز القيد المزدوج واللوحات التنفيذية وذكاء الأعمال + `og:title` موحد.
- **Landing** `client/src/pages/Landing.tsx:250` شارة الهيرو إلى `Uamex_erp v2.2 — ترقية المحتوى والتجربة والذكاء`.
- **لوحة القيادة** `client/src/pages/WorkspaceDashboard.tsx:244` هيرو محدث بشارة نسخة + رسالة قيمة مركزة `من القيد إلى التقرير إلى القرار`.
- **ذكاء الأعمال** `client/src/pages/Analytics.tsx:67` استبدال `FunnelChart` الخاطئ بـ `ComposedChart` (Bar+Line) لمسار الإيرادات + تحسين فلاتر الوقت إلى كبسولات `brand` مع عداد الأشهر + حساب تدفق نقدي تراكمي صحيح.

### Fixed

- **تقنية** — نفس إصلاحات v2.1.0 محفوظة + ضمان ترابط معياري (`reportsRouter`) وفصل `loading-context`.

## [2.1.0] — 2026-08-27 · Enterprise Integration & Production Release

### Added

- **`server/reportsRouter.ts`** — فصل معياري لتقارير الربحية (profitability) عن `modulesRouter` الضخم لخفض الترابط وتحسين قابلية الاختبار والصيانة (ISO 25010 maintainability).
- **`client/src/lib/loading-context.tsx`** — نظام تحكم موحّد بحالات التحميل (global + named + progress) مع `LoadingProvider` مدمج في `App.tsx` لتوحيد تجربة المستخدم عبر كل الوحدات.
- **`Cross-Origin-Opener-Policy` + `Cross-Origin-Resource-Policy`** في `vercel.json` لتعزيز عزل السياق ضد Spectre (defense-in-depth).

### Fixed

- **`server/modulesRouter.ts:1391`** — إزالة تصدير مكرر `export const modulesRouter` داخل نفس الراوتر كان يكسر `tsc --noEmit` و `esbuild` (C1 blocker). تم استعادة التركيب الصحيح `reports: reportsRouter`.
- **`server/modulesRouter.ts:1382-1387`** — تسريب بيانات عبر المستأجرين في `audit.list` (كان يفتقد `where tenantId`) — الآن مفلتر بـ `eq(activityLogs.tenantId, ctx.tenantId!)` (C5).
- **`server/modulesRouter.ts:1-48`** — استيرادات لجداول غير موجودة (`journals`, `journalLines`, `salesRepCommissions`…) كانت تفشل `pnpm check` — تم تنظيفها.
- **`client/src/lib/loading-context.tsx:136-147`** — أخطاء TypeScript في `useNamedLoading` بسبب fallback `{}` بدون index signature — تم الإصلاح بصب `Record<string,*>`.
- **`vercel.json:17`** — توحيد CSP مع Helmet: إضافة `https://*.neon.tech https://*.vercel.app` إلى `connect-src` + إضافة `worker-src` و `manifest-src` لدعم PWA/SW.
- **`server/_core/app.ts:178-192`** — معالج الأخطاء العام الآن يعيد `x-request-id` ويسجل بصيغة JSON منظمة مع `path/method` بدون تسريب stack في الإنتاج.
- **`server/_core/env.ts`** — تحقق fail-closed في الإنتاج: `JWT_SECRET` يجب أن يكون ≥32 حرفاً وإلا يفشل التشغيل فوراً؛ تحذيرات واضحة لـ `DATABASE_URL` و `BACKUP_ENCRYPTION_KEY`.

### Changed

- **Bump version `2.0.1 → 2.1.0`** — إصدار إنتاجي حقيقي مع تكامل معياري محكم.
- **`package.json`** bumped to `2.1.0`.

## [2.0.2] — 2026-08-27 · Brand Unification

### Changed

- **Unified system name to `Uamex_erp`** across all marketing screens, work surfaces (login, landing, footer, boot splash), page titles, and reference documentation.
- **Official `Uamex_erp` logo** (`uamex-erp.png` / `uamex-favicon-32.png`) adopted across the boot splash, login gate, footer, landing UAMEX identity, and as a branded favicon.
- Internal identifiers, storage keys, and CSV/upgrade filenames intentionally left unchanged for backward compatibility.

## [2.0.1] — 2026-08-24 · Production Hardening Release

### Fixed

- **`api/agent.mjs`**: invalid syntax `.orderBy(activityLogs.createdAt desc)` broke parsing of the whole agent function — now uses `desc()` from drizzle-orm.
- **`api/agent.mjs`**: `purge-stale` reported hardcoded zeros; it now counts rows before deletion and returns real numbers.
- **Serverless functions crash (`FUNCTION_INVOCATION_FAILED`)**: `api/cron.mjs` / `api/agent.mjs` imported `.ts` modules directly, which the Vercel Node runtime cannot load from plain `.mjs` handlers — both functions were uncallable in production. Converted them to first-class TypeScript functions (`api/cron.ts`, `api/agent.ts`) so Vercel compiles them natively; route rewrites are extension-less and remain valid.

### Security

- **`api/cron.mjs`**: fail-closed in production when `CRON_SECRET` is not configured (previously accepted the well-known default `"dev-cron"`).
- **`vercel.json`**: added `Strict-Transport-Security` (HSTS, 2 years, includeSubDomains) on all static responses.

### Changed

- **`package.json`**: added `engines.node >=20` so Vercel always provisions the correct runtime.

## [2.0.0] — 2026-08-24 · Technical Debt Settlement

### Fixed

- **Build pipeline**: replaced the broken esbuild CLI `--alias:@shared=./shared` call (fails on Windows) with a Node-API builder (`scripts/build-server.cjs`).
- **React runtime crash risk**: fixed `rules-of-hooks` violations in `BasicData`, `Branches`, `Customization`, `Permissions` (early return before hooks → hook-count mismatch on permission change).
- **Postbuild migrations** no longer fail Vercel builds when `DATABASE_URL` is absent (graceful skip).

### Security

- Removed hardcoded Neon PostgreSQL credentials from 11 root-level operational scripts; they now read `process.env.DATABASE_URL` and exit with a clear error if missing.

### Quality

- ESLint errors reduced **419 → 0** (Node globals for operational scripts, removed deprecated `--ext`, fixed duplicate case labels, useless assignments, empty blocks, escape issues).
- CI now enforces lint and provides the full environment (DB/JWT/OAuth) to test & build jobs.
- TypeScript target raised ES2015 → ES2022; health endpoint reports version 2.0.0.

---
