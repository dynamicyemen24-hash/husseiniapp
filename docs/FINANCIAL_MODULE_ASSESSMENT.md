# uamex ERP — تقييم شامل وتصميم منظومة الحسابات والمالية المتقدمة

**الإصدار:** 1.0 — مراجعة شاملة (Assessment + Target Architecture)
**التاريخ:** 2026-08-29
**النطاق:** وحدة الحسابات والمالية كاملة — General Ledger → Treasury → Budgeting → Management/Cost Accounting → Investments → Consolidation → Reporting → Controls

> **ملاحظة معمارية مهمة:** يُشير برومبت المهمة إلى أن النظام مبني بـ C#، لكن **هذا المستودع `husseiniya-platform` مبني بـ TypeScript**:
> React 19 + Vite + Tailwind + shadcn/ui (Frontend) / Express + tRPC 11 + Drizzle ORM + PostgreSQL/Neon (Backend).
> لذلك تمت ترجمة كل توصيات البنية المعمارية (DDD, Clean Architecture, Services, Rule Engine…) إلى النمط الفعلي:
> **tRPC router layer → Service layer → Drizzle/PostgreSQL**, مع الحفاظ على نفس المبادئ المعمارية (SOLID, Separation of Concerns, Domain Services, Idempotency, Concurrency, Event-driven, Background Processing).

---

## A. Executive Summary (الملخص التنفيذي)

### الوضع الحالي باختصار

النظام يحتوي على **نواة محاسبية مزدوجة القيد Functional** جيدة التأسيس، مع عدد كبير من **الجداول المتقدمة ميتة (Dead Tables)** تُظهر نية معمارية بعيدة لم تُنفَّذ فعلياً.

**النقاط القوية الحالية:**

1. **دليل حسابات هرمي** متعدد المستويات مع `parentAccountId` + `moveAccount` (إعادة تنظير) وقيد فريد `(code, tenantId)`.
2. **ترحيل آلي للقيود** من المبيعات والمشتريات عبر `postInvoiceGlEntries` / `postPaymentGlEntries` (راوتر `routers.ts:572–985`)، مع محرك توازن `doubleEntryValidator` وتكلفة بضاعة مباعة/مخزون.
3. **قيود يدوية متوازنة** عبر `createManualJournalEntry` (تحقق الخط + إلزامية `isImmutable`).
4. **قيود مجدولة/متكررة** (scheduled + recurring expenses) مع محرك أتمتة + cron.
5. **إقفال سنوي** `closing.preview/execute` يُغلق الإيرادات/المصروفات إلى الأرباح المحتجزة (رمز 3010).
6. **أرصدة افتتاحية** + **ميزان مراجعة / قائمة دخل / ميزانية عمومية** تُحسب (وإن كان **جانب العميل** فقط).
7. **سجل تدقيق معرّف بالتجزئة (Hash-chained)** `activityLogs` + `auditLogs` مع `oldValues/newValues`.
8. **عملة متعددة في المخطط**: جداول `currencies` + `exchangeRates` وأعمدة `currencyId/exchangeRate/baseAmount` عبر ~20 جدولاً.
9. **مراكز تكلفة/أبعاد، موازنة، تحليل انحرافات، تخصيص تكاليف، كيانات دمج، KPIs، تعريفات تقارير** — كلها موجودة **في المخطط فقط**.

### الفجوة المركزية التي يجب معالجتها أولاً

|                       |                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **المشكلة 1 (حرجة)**  | **التوازن غير مفروض على القيود الفردية**: `addTransaction` / `addBatchTransactions` / `dailyEntry` تُدخل قِيدَ طرف واحد (leg) **بدون أي تحقق من التوازن** — فيمكن اختلال دفتر الأستاذ.                                               |
| **المشكلة 2 (حرجة)**  | **أكثر من 15 جدولاً متقدماً ميتاً** (budgetScenarios, budgetLines, varianceAnalyses, allocationRules/Runs, consolidationEntities/Adjustments, kpis, kpiMeasurements, reportDefinitions/Executions) — منشأة في DB بلا أي code يخدمها. |
| **المشكلة 3 (عالية)** | **فترة محاسبية dead**: جدول `fiscalPeriods` بلا أي إجراءات open/close/reopen؛ إقفال الفترة غير مربوط بـ `closing.execute` ولا يوجد أي منع للترحيل في فترة مغلقة.                                                                     |
| **المشكلة 4 (عالية)** | **لا توجد أبعاد تحليلية عامة قابلة للتكوين** — `costCenterId` موجود لكن لا يُملأ من أي إدراج؛ لا مشاريع/عقود/أقسام/أصول كأبعاد قيد.                                                                                                  |
| **المشكلة 5 (عالية)** | **العملات لا تُحَوَّل فعلياً**: `baseAmount` يُحسب في مكان واحد فقط (`automation.ts:476`)، بلا إعادة تقييم، بلا فروق عملة محققة/غير محققة، لا AR/AP/Bank متعدد العملات.                                                              |
| **المشكلة 6 (عالية)** | **لا يوجد Workflow موافقات عام** — الموافقة إمّا per-module أو لا؛ لا Approval Matrix بالمبلغ/الدور/الفرع.                                                                                                                           |
| **المشكلة 7 (عالية)** | **الوحدات الفرعية المتقدمة غائبة كلياً**: أصول ثابتة، استثمارات، قروض/تمويل، ضريبة (واحدة VAT flat فقط + QR)، خزينة/بنوك/تسوية، كشف حساب، أعمار ذمم، تقارير GL على الخادم.                                                           |

### توصية استراتيجية (Roadmap مختصر)

- **Phase 1 (Core Financial)**: فرض التوازن، تفعيل الفترات، أبعاد، إصلاح GL reports للخادم، AR/AP أدوات، تسويات بنكية، دفعات، عملات.
- **Phase 2 (Financial Control)**: تفعيل الجداول الميتة (موازنات، أبعاد، تخصيص، أصول، قيود/**workflow matrix**) + مصرف الصلاحيات.
- **Phase 3 (Advanced)**: دمج شركات، خزينة، محاسبة مشاريع، استثمارات، محاسبة تكاليف/إدارية، تقارير متقدمة.
- **Phase 4 (Intelligent)**: Analytics/تنبؤ/كشف شذوذ/تدقيق ذكي.

---

## B. Financial Module Capability Map (خريطة القدرات الحالية)

| القدرة                              | الوضع الحالي                                             | الدرجة |
| ----------------------------------- | -------------------------------------------------------- | ------ |
| دليل حسابات هرمي متعدد المستويات    | ✅ `accounts.parentAccountId` + `moveAccount`            | قوي    |
| قيود يدوية متوازنة                  | ✅ `createManualJournalEntry` (خط inline)                | جيد    |
| قيود آلية من مبيعات/مشتريات         | ✅ `postInvoiceGlEntries`/`postPaymentGlEntries`         | جيد    |
| قيود مجدولة/متكررة + أتمتة cron     | ✅ `scheduled` + `recurringExpenses` + `automation.ts`   | قوي    |
| إقفال سنوي → أرباح محتجزة           | ✅ `closing.preview/execute`                             | جزئي   |
| أرصدة افتتاحية                      | ✅ `getOpeningBalances`/`saveOpeningBalances`            | جيد    |
| تقارير مالية (ميزان/دخل/عمومية)     | ⚠️ حساب **جانب العميل** فقط (`accountingReports.ts`)     | ضعيف   |
| سجل تدقيق مشفّر بالتجزئة            | ✅ `activityLogs`/`auditLogs`                            | جزئي   |
| تعدد عملات (جداول+أعمدة)            | ⚠️ مخطط فقط — لا تحويل فعلي                              | هيكلي  |
| مراكز تكلفة                         | ⚠️ جدول + CRUD (`costCentersRouter`) — لا ربط بالأبعاد   | هيكلي  |
| موازنة                              | ⚠️ جدول `budgets` فترة-واحدة + BudgetsPanel (aggregate)  | ضعيف   |
| موازنات متقدمة (سكاريو/خطوط/انحراف) | ❌ جداول ميتة (budgetScenarios/Lines, varianceAnalyses)  | غائب   |
| تخصيص تكاليف/توزيع                  | ❌ جداول ميتة (allocationRules/Runs)                     | غائب   |
| دمج شركات (Consolidation)           | ❌ جداول ميتة (consolidationEntities/Adjustments)        | غائب   |
| KPIs / تعريفات تقارير               | ❌ جداول ميتة (kpis, kpiMeasurements, reportDefinitions) | غائب   |
| AR/AP Aging, كشف حساب, تحصيل        | ❌                                                       | غائب   |
| خزينة / بنوك / تسوية بنكية / صكوك   | ❌                                                       | غائب   |
| أصول ثابتة + إهلاك                  | ❌ (حسابات أصول فقط)                                     | غائب   |
| استثمارات (ROI/IRR/NPV)             | ❌                                                       | غائب   |
| قروض/تمويل + جدول سداد              | ❌                                                       | غائب   |
| ضريبة (VAT/WHT/رقم ضريبي/إقرار)     | ⚠️ VAT مسطّح + رمز TWO (output/input) + QR               | ضعيف   |
| استحقاقات/مخصصات/مؤجلة              | ⚠️ enum basis فقط                                        | هيكلي  |
| Workflow/موافقات (matrix)           | ⚠️ per-module فقط — لا matrix                            | ضعيف   |
| صلاحيات دقيقة (حساب/بعد/مبلغ)       | ⚠️ admin-vs-nonadmin + branch matrix فقط                 | ضعيف   |
| أداء/فهرسة نقاط ساخنة               | ✅ مؤشرات مركّبة كثيرة (0005, 0001...)                   | قوي    |

---

## C. Gap Analysis (فجوات — مفصّلة على 46 محوراً)

> **الأصناف:** 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low/Enhancement

### 1. الهندسة (COA)

| المجال                          | الموجود                        | المطلوب           | الفجوة | الأولوية | الأثر        | الحل                         |
| ------------------------------- | ------------------------------ | ----------------- | ------ | -------- | ------------ | ---------------------------- |
| مستويات غير محدودة              | parentAccountId                | نفس               | —      | —        | —            | موجود                        |
| حسابات متعددة الأبعاد           | لا                             | dimensions مستقلة | 🟠     | مرتفع    | تحليل متقاطع | أبعاد منفصلة عن COA          |
| أرشفة/حذف                       | لا                             | delete/أرشفة      | 🟡     | متوسط    | نظافة COA    | `isArchived` + منع حذف برصيد |
| استيراد COA حقيقي (Server)      | محاكاة Client بـ N× addAccount | نقطة نهاية        | 🔵     | منخفض    | تجربة        | endpoint `importAccounts`    |
| حسابات system metrics / إحصائية | لا                             | نعم               | 🔵     | منخفض    | تقارير       | type/category                |

### 2. الأبعاد التحليلية (Dimensions)

- **🔴 لا يوجد نظام أبعاد عام قابل للتكوين.** الأعمدة المبعثرة: `branchId` (موجود)، `costCenterId` (موجود لكن **غير مُملأ من أي إدراج**)، `departmentId`/`projectId` على `recurringExpenses` فقط.
- **الطلب:** Dimension registry (company, branch, dept, cost center, project, activity, region, customer, vendor, employee, asset, contract, funding source, campaign, segment, custom).
- **الأثر:** بدون أبعاد لا يمكن ربحية عميل/منتج/مشروع/فرع دقيقة؛ ولا محاسبة مشاريع.
- **الحل:** جداول `dimensions` + `dimensionValues` + جدول ربط `journalLineDimensions(transactionId, dimensionId, valueId)`؛ أبعاد جاهزة تُنشأ افتراضياً (branch, costCenter, project).

### 3. الأستاذ العام GL

| المطلوب               | الحالة | خلاصة                                            |
| --------------------- | ------ | ------------------------------------------------ |
| قيود يومية مركّبة     | ✅     | addBatch/dailyEntry                              |
| قيد متوازن إلزامي     | 🔴     | **لا يُفرض على single-leg**                      |
| قيود متكررة           | ✅     | scheduled + recurring                            |
| قيود عكسية            | 🔴     | علم `isReversed` فقط — **لا يوجد عكس مرآة فعلي** |
| مؤجلة/استحقاق         | 🟠     | enum basis فقط                                   |
| متعددة العملات        | 🟠     | أعمدة فقط — لا تحويل                             |
| متعددة الشركات/الفروع | 🟠     | branchId موجود؛ لا شركة/IC                       |
| Intercompany          | 🟠     | لا                                               |
| تصحيحية/تسوية         | 🟡     | يدوي                                             |
| إعادة تصنيف           | 🟠     | لا                                               |
| إعادة تقييم (عملات)   | 🟠     | لا                                               |
| إقفال                 | ✅     | closing.execute (جزئي)                           |
| اعتماد قيد            | 🟠     | lifecycle موجود لكن يترحل مباشرة                 |

**🔴 النقطة الأولى مُصلحة:** `addTransaction` (routers.ts:1959), `addBatchTransactions` (2026), `dailyEntry` (2083) تُدخل أطرافاً مفردة بلا توازن، و`getSmartSuggestions` يحذّر المستخدم من اختلال — يجب انتقال الدخول إلى **محرك قيود مركزي** يفرض لخطين فأكثر وDR=CR.

### 4. الحسابات المدينة AR

- وجود: مبيعات، دفعات أحادية الفاتورة، نسبة إنجاز.
- **فجوات كبرى:** credit/debit notes ❌، إرجاع/استرداد ❌، سلف/مدفوعات مقدمة ❌، AR Aging ❌، حدود ائتمان (غير مفروضة Server) 🟠، تقييم مخاطر/ديون متعثرة/مخصصات/شطب ❌، تحصيل/خطط ❌، مطالبات ❌، كشف حساب ❌، مطابقة فاتورة↔دفعة (واحدة فحسب) 🟠، تسوية حسابات ❌.
- **إلغاء فاتورة لا يعكس القيود GL** 🔴 (فقط المخزون ورصيد العميل؛ القيود المنشورة تبقى).

### 5. الحسابات الدائنة AP

- وجود: فواتير موردين، دفعات، الخصم/الإضافة ❌، أوامر دفع ❌، سلف ❌، AP Aging ❌، مطابقة ثلاثية (اختياري) 🟠، حجز/اعتماد 🟠، خصومات سداد مبكر ❌، استقطاعات ❌، كشف حساب مورد ❌، التزامات مستقبلية ❌.

### 6. الخزينة Treasury & Cash

- وجود: نقدية/بنوك **كحسابات GL برموز hardcoded** (1010/1020) فقط.
- **فجوات:** لا كيانات bank/cash (IBAN, بنك, صندوق) 🟠، لا تسوية بنكية ❌، لا صكوك ❌، لا حوالات/أوامر قبض/دفع ❌، لا تنبؤ نقدي ❌، لا تدوير نقد (transfer بين 1010↔1020) ❌، لا إدارة سيولة/فوائض/عجز/قروض قصيرة ❌.

### 7. الموازنة Budgeting

- الحالي: `budgets` (period targetRevenue/targetExpense) + BudgetsPanel aggregate + إنذار 90% (automation.ts:939).
- **فجوات:** budgetScenarios/budgetLines/varianceAnalyses **جداول ميتة** 🔴، لا reservation/commitment/consumption ❌، لا حجب تجاوز ❌ (فقط إنذار لا يمنع)، لا versioning/scenarios، لا Budget vs Actual dقيقة.

### 8. التخطيط المالي Financial Planning

- **غائب كلياً** ❌ (لا What-if, Scenario, Rolling Forecast, Sensitivity). الجداول الميتة يمكن أن تؤسس له.

### 9. المحاسبة الإدارية / التكاليف

- costCenters (CRUD فقط) 🟠؛ allocationRules/Runs **ميتة** 🔴؛ لا profit centers/cost pools/drivers/ABC ❌؛ لا variance costing ❌.

### 10-13. التكاليف / ABC / الاستثمارات / الأصول

- **كلها غائبة** ❌ (فقط cost-center type "investment" وأسماء أصول بالسيد).

### 14. الالتزامات/القروض

- **غائبة** ❌ (مثال قيد في test فقط).

### 15. تعدد العملات

- مخطط كامل لكن **لا تحويل/إعادة تقييم/فروق** 🟠 (baseAmount محسوب في مكان واحد).

### 16. الضرائب

- VAT مسطّح (taxRate+taxAmount) + رمز `vatCode` مزدوج (output/input على نفس الحساب 2010) + QR/ZATCA 🟠.
- **فجوات:** WHT ❌، exempt/categories/jurisdictions ❌، فترات/إقرارات/Tax Returns ❌، حساب Output VAT منفصل عن Input VAT 🟠، e-invoice ❌.

### 17. الاستحقاقات/المخصصات/التسويات

- enum `basis` فقط 🟠؛ لا deferred revenue/expense، لا provisions/allowances، لا automatic reversal schedules.

### 18. الإقفال المالي

- closing.execute موجود (🔥 لكن لا يسجّل في `fiscalPeriods`)؛ **لا checklist/مسؤولية/مهام** ❌؛ لا lock بشهر (period not enforced) 🔴؛ لا reopen workflow.

### 19-21. Intercompany / Consolidation / Project Accounting

- كلها **غائبة/ميتة الجداول** 🔴 (جداول consolidationEntities/Adjustments بلا code، لا DueTo/DueFrom، لا Elimination، لا نسبة إنجاز/committed cost/ETC/FAC، لا Revenue Recognition).

### 22-24. الربحية / التقارير / KPIs

- الربحية: فقط تقرير sales-rep (`profitability`) 🟠.
- التقارير: على العميل فقط 🟠؛ `cashFlow`/`accountAnalysis`/`performanceScore` **أنواع dead** 🔵.
- KPIs: جداول `kpis`/`kpiMeasurements` **ميتة** 🔴؛ لا احتساب DSO/DPO/CCC/ROE...

### 25-27. الرقابة / Workflow / المطابقة

- SoD: لا مصفوفة تنفيذ 🟠 (admin binary); Approval Matrix ❌; Delegation ❌; Limits (credit client-only, payment none) 🟠; كشف تكرار جزئي (deduplication service) 🟡; Audit وعيٌّ (فقد خيار legacy) 🟠.
- المطابقة: لا Bank/Customer/Supplier/GL-subledger/Intercompany reconciliation ❌.

### 28-30. المخاطر / القيود الآلية / التكامل

- لا Financial Risk (credit/liquidity/currency) ❌.
- لا Accounting Rules Engine (Event→Conditions→Rule) ❌ — القيود Hard-coded في Routers.
- التكامل: مبيعات/مشتريات/مخزون/نيازك (POS) موجود جزئياً؛ تصنيع/موارد بشرية/رواتب (payroll يركّز قيدين ثابتاً) 🟠؛ أصول/صيانة/بنوك/ضرائب/تجارة إلكترونية لا.

### 31-34. الأمان / الأداء / البيانات / جودة البيانات

- RBAC: roles/userRoles/permissions جداول موجودة لكن **غير مربوطة بالتفويض** 🔴 (المصادقة binary admin).
- أداء: فهارس جيدة ✅؛ لكن **إعادة حوسبة التقارير كل مرة على العميل** 🟠.
- جودة البيانات: لا Data Quality Framework ❌.

---

## D. Target Architecture (المعمارية المستهدفة)

> **المسيطر المعماري (المطلوب):** Financial **Platform** وليست شاشات. محركات مترابطة عبر **نموذج بيانات وقواعد محاسبية موحدة**.

### D1. الطبقات (Layer Stack — TypeScript/tRPC)

```
┌─────────────── UI Layer (React) ───────────────┐
│  Dashboards · Drill-down · Report Designer · Forms │
└───────────────┬───────────────────────────────┘
                │ tRPC (typed RPC)
┌───────────────▼───────────────────────────────┐
│  API / Router Layer (tRPC routers)             │  ← auth/permission/tenant
├───────────────────────────────────────────────┤
│  Application Services (use-cases)              │  ← orchestration, validation
├───────────────────────────────────────────────┤
│  Domain Services & Engines                    │
│   · AccountingEngine   · RuleEngine           │
│   · BudgetEngine       · CostEngine           │
│   · TreasuryEngine     · ReportingEngine      │
│   · WorkflowEngine     · ControlEngine        │
│   · ClosingEngine      · ConsolidationEngine  │
│   · TaxEngine          · AssetEngine          │
├───────────────────────────────────────────────┤
│  Repository / Data Access (Drizzle ORM + Neon) PG │
└───────────────────────────────────────────────┘
        · EventBus (posting events, idempotency keys)
        · BackgroundJobs (cron: backups, schedules, allocations)
```

### D2. المبادئ المعمارية المنفذة

- **Single Source of Truth:** كل ترحيل يمر عبر `AccountingEngine.post(journalDraft)` — لا إدراج مباشر في `transactions`.
- **Double-Entry Invariant مركزي:** `AccountingEngine` يرفض أي قيد غير متوازن ويرفض القيد في فترة مغلقة.
- **Source Transaction Tracking:** كل قيد يحمل `sourceModule/sourceRefType/sourceRefId` (موجود جزئياً) + أبعاد.
- **Idempotency:** مفتاح `postingKey` لمنع تكرار قيد (خاصة cron/retry).
- **Events:** نشرة أحداث (invoicePosted, paymentReceived, expensePosted) تقاد بها الأتمتة والمخزون والمخصصات.
- **Separation of Concerns:** تشغيلية (مبيعات/مخزون) ↔ محاسبية (GL) مع تكامل via `AccountingEngine`.
- **Configuration أولاً / Hard Coding نفياً:** قواعد ترحيل (DEFAULT_POSTING_RULES) تعمّم إلى جدول `postingRules` قابل للتخصيص لكل حدث+حساب+أبعاد.
- **CQRS خفيف للتقارير:** تقارير ثقيلة تعمل على مناظر محسوبة (Materialized/denormalized snapshots) بدل إعادة حساب العميل.

### D3. محرك القيود الآلية (Rule Engine) — التصميم

نموذج **Event → Conditions → Accounting Rule → Debit/Credit → Dimensions → Tax → Currency → Approval**:

```
AccountRule {
  eventKey,            // "SALES_INVOICE_POSTED", "PAYMENT_RECEIVED", ...
  conditions: [...],   // OR/AND: paymentMethod, amount, branchId, ...
  lines: [
    { side: dr|cr, accountResolver, amountExpr, taxExpr,
      dimensions: {branch, costCenter, project, ...} }
  ],
  approval: { flow: "auto"|"matrix", matrixId? },
  active
}
```

يستبدل الحسابات Hard-coded (1010/1030/2010/5000...) بإعداد للمستأجر — مع backward-compat عبر seed المحتوى الحالي.

---

## E. Functional Modules (الوحدات الوظيفية المستهدفة)

يُبنى لكل وحدة **Purpose → Actors → Inputs → Business Rules → Process → Accounting Impact → Data Model → Permissions → Workflow → Reports → APIs → Audit → Test → Dependencies** (يُرفق نموذج مرجعي كامل لوحدة الفواتير في القسم G أدناه).

**قائمة الوحدات المقترحة (المرتبة بحد ذاتها):**

1. **GL Core** (refactor — فرض التوازن، أبعاد، فترات، عكس، تصنيف، أكسجين).
2. **AR Module** (فواتير/إشعارات/سلف/أعمار/تحصيل/كشف).
3. **AP Module** (فواتير/أوامر دفع/سلف/أعمار/مطابقة ثلاثية).
4. **Treasury** (نقد/بنوك/صكوك/حوالات/تسوية/تنبؤ/تدوير).
5. **Multi-currency & FX** (أسعار صرف تاريخية/شراء-بيع/إعادة تقييم/فروق).
6. **Tax Engine** (VAT/WHT/فئات/فترات/إقرارات/QR+e-invoice).
7. **Budgeting** (سكاريوات/خطوط/Reserve/Commit/Control).
8. **Fixed Assets** (سجل/إهلاك بطرق/Disposal/Impairment/إعادة تقييم/Multi-book).
9. **Loans & Financing** (أمورتيزيشن/فائدة/إعادة جدولة/Covenants).
10. **Investments** (محفظة/ROI/IRR/NPV).
11. **Cost & Management Accounting** (Cost pools/drivers/ABC/توزيع).
12. **Project & Contract Accounting** (نسبة إنجاز/Committed/ETC/FAC/Retention).
13. **Intercompany & Consolidation**.
14. **Closing Management** (Checklist/Lock/Reopen).
15. **Workflow & Approvals Engine** (Matrix).
16. **Reconciliation Engine**.
17. **Financial Reporting & Designer**.
18. **KPIs & Financial Analytics**.
19. **Internal Controls & Risk**.
20. **Data Quality Framework**.

---

## F. Accounting Engine (محرك المحاسبة)

### F1. تدفق الترحيل الموحّد

```
[Operation (Invoice/Payment/Expense/Closing/Reclass)]
        │  (postingKey = idempotency guard, source context w/ dimensions + currency + tax)
        ▼
AccountingEngine.prepare():
  - resolve accounts via RuleEngine (postingRules)  w/ per-tenant overrides
  - apply currency conversion → baseAmount (via ExchangeRate service)
  - apply tax legs (output/input VAT, WHT)
  - compute balancing leg/envivia (Dr == Cr)
  - check fiscal period open (reject closed)
AccountingEngine.validate():
  - isBalanced (tolerance 0.01)                  // doubleEntryValidator reuse
  - account exists & active & allowed dimensions
  - budget check (if enabled): reserve/commit
  - approval gate (matrix) if required
AccountingEngine.post() [TRANSACTION]:
  - insert journal_entries (status, immutable=true if posted)
  - insert transactions legs (WITH currency/baseAmount + dimensions + source)
  - write audit (auditLogs w/ old/new)
  - trigger events (for subledger, inventory, budgets, alerts)
```

### F2. قواعد المحاسبة لكل عملية (Business Rules Template)

| العمود                   | المثال                                      |
| ------------------------ | ------------------------------------------- |
| الحدث                    | `SALES_INVOICE_POSTED` (paid vs credit)     |
| المصدر                   | sourceRef = sale #id                        |
| الحساب المدين            | نقد 1010 (المدفوع) + ذمم 1030 (غير المدفوع) |
| الحساب الدائن            | إيرادات حسب صنف (4200...) + VAT output      |
| الأبعاد                  | branch, costCenter, project                 |
| العملة/السعر             | currencyId/exchangeRate → baseAmount        |
| الضريبة                  | taxRate/taxAmount → حساب VAT منفصل          |
| التاريخ المحاسبي/المستند | transactionDate / documentDate              |
| الفترة                   | fiscalPeriodId (إجباري عند الـpost)         |
| رقم القيد                | referenceNo متسلسل                          |
| الحالة                   | posted / draft / reversing                  |
| الاعتماد                 | تلقائي / matrix                             |
| العكس                    | Reverse entry بعلامات معكوسة + audit        |
| أثر القوائم              | يؤثر في ميزان/دخل/ميزانية                   |
| Idempotency              | postingKey فريد                             |

### F3. إصلاحات حرجة في المحرك الحالي

1. **جعل single-leg دخولاً غير صالح** — لا `addTransaction` مباشر.
2. **عكس حقيقي**: إنشاء قيد مرآة معطوب بدل علم `isReversed` فقط.
3. **ربط fiscalPeriod بإجباري** عند الترحيل؛ منع فترة مغلقة.
4. **نقل حساب التقارير إلى الخادم** (تجنب إعادة الحوسبة على العميل)، مع Materialized snapshots.
5. **تعبئة `baseAmount`** لكل ترحيل بمعدل الصرف الرسمي.
6. **توحيد منطق VAT**: حساب Output VAT منفصل عن Input VAT (بدل `vatCode` مزدوج)، مع إمكانية فئات ضريبية.

---

## G. Financial Planning & Budgeting (تصميم)

### G1. النموذج

- إحياء الجداول الميتة: `budgetScenarios` (draft/approved/revised/final + assumptions), `budgetLines` (scenario×account×costCenter×period), `varianceAnalyses`.
- إضافة **Budget Control**: `budgetReservations` (تعليق) + `budgetCommitments` (التزام) + `budgetConsumption` (استهلاك).

### G2. دورات Lifecycle

```
Scenario (Baseline/Forecast) → Lines (per account/CC/period)
   → Approve (versioning) → Reservation (PO/PR)
   → Commitment (contract) → Consumption (actual posting)
   → Variance (Budget vs Actual + Batch price/qty/mix/volume)
   → Control (warn @% , soft-block, hard-block, override w/ permission)
```

- **Rolling Forecast**: نسخ الفعلي + Σ الجاري + تكرار التوقعات الشهرية.
- **What-if/Scenario**: assumptions (growth/inflation/fx) تُطبق على line كمعاملات تكوين.

### G3. مخرج لوحدة موازنة (نموذج كامل لقسم E)

**Purpose:** تخطيط وتحكم مالي بالحدود لكل حساب/مركز/فرع/مشروع.
**Actors:** Financial Planner, Budget Owner, CFO, Finance Manager.
**Inputs:** مدة/سكاريو/إصدار/خطوط (حساب، مركز، مبلغ لكل فترة).
**Business Rules:** مصفوفة اعتماد الإصدار، قواعد الحجب (لا حجب/تحذير/حجب صلب)، استثناءات صلاحيات التجاوز.
**Process:** إنشاء سكاريو → خطوط → اعتماد → نشر في الفترة → احتساب استهلاك عند الترحيل → إنذارات.
**Accounting Impact:** لا قيد مباشر (موازنة أداة؛ تكلفة فقط passive reservation tracking).
**Data Model:** budgetScenarios, budgetLines, budgetReservations, budgetCommitments, budgetConsumption, varianceAnalyses.
**Permissions:** by company/branch/costCenter/amount; approve-budget role.
**Workflow:** Planner → Approver → Final.
**Reports:** Budget vs Actual (per account/CC/period), Variance report, Commitment report.
**APIs:** createScenario, addLine, approveScenario, getActualVsBudget, reserveBudget, commitBudget.
**Audit:** تغيير الخط/الإصدار مسجَّل في auditLogs.
**Test Cases:** تفوّق تجاوز (warn/block), commit>remaining, نسخة revised, منع تعديل معتمد, تصفير فترة, تعدد سكاريو (best/base/worst).
**Dependencies:** GL, Cost Centers, Dimensions, Posting Rules.

---

## H. Management Accounting (المحاسبة الإدارية والتكاليف)

- **Cost Centers** موجودة (إحياء) + **Profit Centers** (نوع cost center = profit).
- **إحياء allocationRules/Runs**: ردّد `allocation_method` (fixed/proportional/step_down/reciprocal/activity_based) مع `basisType` (headcount/area/revenue/direct_hours/machine_hours/custom) و`basisDriverId`.
- **Cost Pools & Drivers & ABC**: جدول `costDrivers` + `costPools` + ربط بنشاطات.
- **Variance Analysis** (إحياء varianceAnalyses): price/qty/mix/volume + commentary + reviewedBy.
- **التوزيع ينشئ قيد تخصيص** (Dr الهدف/ Cr المصدر) عبر AccountingEngine مع `allocationRun` قابل للعكس.

---

## I. Investment Accounting (المحاسبة الاستثمارية)

- جدول `investments` (classification: short/long, equity/stock/bond/deposit, subsidiary/associate/joint).
- `investmentTransactions` (شراء/بيع/عائد/أرباح موزعة/إعادة تقييم + عدد+سعر+قيمة عادلة).
- تقارير محفظة + ROI/IRR/NPV/Payback (خدمات analytic).
- إعادة تقييم → قيد via AccountingEngine (Dr استثمار / Cr مكاسب غير محققة).

---

## J. Treasury (الخزينة)

- كيان واحد `cashAccounts` (نقدية/بنك) مع metadata (بنك، IBAN, فرع، عملة) — **بدل Hard-coded 1010/1020**.
- `cheques` (صادرة/واردة/مقيّدة/ملغاة) + دفتر صكوك.
- `cashTransfers` (تدوير بين 1010↔1020).
- `bankStatements` + `reconciliation` (مطابقة سطور بنكية ↔ حركات) + `reconMatchingRules`.
- **Cash Flow Statement** (تنفيذ نوع `cashFlow` الميت) مباشرة/غير مباشرة (operation/investing/financing).
- **Cash Forecasting**: مدخلات (ذمم مفتوحة، التزامات، رواتب، مصاريف متكررة، ضريبة) → توقعات شهور.

---

## K. Data Model (الجداول/العلاقات الأساسية) — مقترح **إضافة** (لا تكرار)

| الجدول                                                              | الغرض                                  | مفاتيح/فهارس                                  |
| ------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| `dimensions`                                                        | تعريف أبعاد قابلة للتكوين              | (tenantId, code) unique                       |
| `dimensionValues`                                                   | قيم كل بعد                             | (dimensionId, code) unique                    |
| `transactionDimensions`                                             | ربط قيد↔بعد                           | (transactionId, dimensionId, valueId) idx     |
| `postingRules`                                                      | قواعد ترحيل قابلة للتخصيص (RuleEngine) | (tenantId, eventKey)                          |
| `fiscal_period_details` (ترقية fiscalPeriods)                       | ربط lock/reopen log                    | (periodId, changedById, reason)               |
| `journalReversals`                                                  | ربط القيد ↔ قيد العكس                 | (originalId, reversalId)                      |
| `budget_reservations/commitments/consumption`                       | Budget control                         | (scenarioId, accountId, costCenterId, period) |
| `allocation_runs` (إحياء)                                           | سجل تخصيص                              | حالي                                          |
| `fixed_assets` + `depreciation_runs`                                | أصول                                   | (tenantId, code)                              |
| `loans` + `loan_schedules`                                          | قروض                                   |                                               |
| `investments` + `investment_transactions`                           | استثمارات                              |                                               |
| `cash_accounts` + `cheques` + `bank_statements` + `reconciliations` | خزينة                                  |                                               |
| `tax_codes` + `tax_periods` + `tax_returns`                         | ضريبة                                  |                                               |
| `workflow_definitions` + `workflow_steps` + `approval_matrix`       | موافقات                                |                                               |
| `audit_snapshots` (ترقية auditLogs)                                 | old/new منظمة على كل جدول مالي         | (entity, entityId)                            |

**المبادئ:** كل جدول مالي يحمل tenantId، أعمدة sync الموجودة، قيود NOT NULL، فهارس مركّبة، وقيد منطقي بشأن الأرصدة.

---

## L. Business Rules (قواعد العمل الموحّدة)

1. **التوازن إلزامي** في كل قيد مرتّل (Dr = Cr داخل tolerance).
2. **لا ترحيل في فترة مغلقة**؛ إعادة فتح فقط بصلاحية استثنائية + مسجَّلة.
3. **القيد المنشور immutable** (موجود جزئياً عند `isImmutable`).
4. **كل حركة مالية لها Source Transaction** وتتبّع حتى أصل العملية.
5. **المصلحة الحسابية** (dr/cr sides) تُحدد بواسطة قواعد ترحيل قابلة للتخصيص وليس Hard-code.
6. **حد ائتمان/سقف دفعة/سقف إنفاق** تُفرض **Server-side**.
7. **Budget Control** (الافتراضي: warn@90%, block optional, override بالصلاحية).
8. **Multi-currency**: أي ترحيل بعملة ≠ أساسية يحفظ baseAmount بمعدل الصرف الرسمي؛ إعادة تقييم نهاية الفترة للاستحقاق.
9. **مصفوفة اعتماد** بالمبلغ/المستخدم/الدور/الفرع/نوع المعاملة.
10. **منع حذف** أي قيد/حركة معتمدة — العكس قيد جديد.

---

## M. Workflow & Approvals (دورة الموافقات)

- **البنية الحالية**: فقط procurements (chain مُرتّب) وrecurring expenses (اعتماد admin واحد). لا matrix.
- **التالي**: `workflow_definitions` (نوع المعاملة، خطوات، ترتيب)، `workflow_steps` (الدور/المستخدم، مبلغ من→إلى، قرار، توكيل/Delegation)، `approval_matrix` للتكوين.
- **مثال (من البرومبت):** دفعة <X → اعتماد واحد؛ X→Y → اعتمادان؛ >Y → CFO + إدارة عليا.
- التكامل: كل عملية تجتاز `WorkflowEngine.submit(entity) → nextPending → approve/reject → finalize → post`.

---

## N. Reports & KPIs

### N1. تقارير إلزامية (تنفيذ على **الخادم** + Designer)

الميزانية، قائمة الدخل، كشف التدفقات النقدية (جديد)، ميزان مراجعة (Server)، كشف حساب (جديد)، GL/Account statement، AR/AP Aging (جديد)، Budget vs Actual (جديد)، Cash Position، Working Capital، نسب مالية، مراكز تكلفة، مشاريع، استثمارات، ضرائب، إدارية.

### N2. KPIs (إحياء جداول kpis/kpiMeasurements)

Revenue Growth, Gross/Net Margin, EBITDA/EBIT, Current/Quick Ratio, Debt/Equity, ROA/ROE/ROI, Working Capital, DSO, DPO, Inventory Turnover, Cash Conversion Cycle, OCF/FCF — كلها **تُحسب من GL**، مع دعم KPI مخصص.

### N3. Drill-down

**KPI → Report → Account → Journal → Source Transaction** (يمكّن النظام الحالي source-link جزئياً؛ نحتاج لوحات جزء عملي لتحقيقه كاملاً).

---

## O. Security & Audit

- **RBAC كامل**: ربط جداول `roles`/`userRoles`/`permissions` بمنطق الترخيص الخادمي (لا admin binary فقط). إضافة صلاحيات دقيقة: byCompany, byBranch (موجود), byAccount, byDimension, byTransactionType, byAmount.
- **SoD**: منع إنشاء+اعتماد+ترحيل لنفس المستخدم لمبدئ القيد (الافتراضي إلزامي، قابل للضبط).
- **Audit Trail غير قابل للتلاعب**: ترقية إلى `auditLogs` (old/new) على **كل** كتابة مالية؛ `addBatchTransactions` يجب أن يُسجَّل خادمياً (🟠 حالياً لا). إبقاء hash chain.
- خلف audit للتوجيه.

---

## P. Integration Map (التكامل)

| الوحدة                         | الوضع                          | الإجراء                          |
| ------------------------------ | ------------------------------ | -------------------------------- |
| المبيعات/POS                   | ✅ ترحيل تلقائي + QR           | مواءمة AccountMethod/Aging       |
| المشتريات/Procurement          | ✅ ترحيل تلقائي + اعتماد chain | ربط أوامر دفع/سلف                |
| المخزون                        | ✅ FIFO + تكلفة                | إسناد COGS متقدم/تكلفة معيارية   |
| التصنيع                        | —                              | BOM/Routing/Work Centers → تكلفة |
| المشاريع/العقود                | جزئي                           | أبعاد + Project Accounting       |
| الموارد البشرية/الرواتب        | 🟠 (قيدان ثابتان)              | ربط عبر RuleEngine + تكلفة عمل   |
| الأصول                         | —                              | Asset ledger + إهلاك             |
| المالية→تقارير                 | Client                         | **نقل إلى Server Engine**        |
| البنوك/الضرائب/تجارة إلكترونية | —                              | تكامل قادم                       |

---

## Q. API Requirements (tRPC Procedures المطلوبة حضرياً — Priority)

**P1 (Core):**

- `accounting.postJournal(draft)` — موحّد، متوازن، بأبعاد وعملة وفترة.
- `accounting.reverseJournal(id, reason, date)` — عكس حقيقي.
- `accounting.fiscalPeriod.{open,close,reopen,checkPeriod(date)}`.
- `accounting.postingRules.{list,upsert}` — RuleEngine config.
- `reporting.{trialBalance,incomeStatement,balanceSheet,cashFlow,accountStatement}` (Server).
- `dimensions.{list,upsert,assign}`.

**P2 (Control):**

- `budget.{scenarios,lines,approve,reserve,commit,consume,getActual}`.
- `allocation.{rules,runs,execute,reverse}`.
- `asset.{register,depreciate,dispose,impair}`.
- `recipients/ar.{aging,statement,allocatePayment}`; `ap.{aging,statement,paymentOrder}`.
- `reconciliation.{bank,statement,import,match}`.
- `workflow.{definitions,matrix,submit,approve,reject}`.

**P3 (Advanced):**

- `consolidation.{entities,run,eliminate}`; `project.accounting`.
- `treasury.{cashTransfer,cheque,forecast}`; `tax.{returns,codes}`; `investment.*`.

---

## R. Test Matrix (اختبارات — أولويات)

- التوازن: قيد غير متوازن يُرفض من كل المسارات.
- عكس: بعد عكس لا يتغير رصيد صافي؛ يعود للوضع الأصلي.
- فترة مغلقة: تُرفض الحركات؛ reopen مسجّل بصلاحية.
- تعدد عملات: baseAmount صحيح، إعادة تقييم، فروق محققة/غير محققة.
- تعدد شركات/Intercompany: DueTo/DueFrom، Elimination.
- ضريبة: VAT output/input، WHT، فئات/إعفاء، إقرار.
- موازنة: warn/block/commit/consumption.
- أصول: إهلاك شهري/جزئي، بيع (ربح/خسارة)، impairment.
- قروض: أمورتيزيشن، إعادة جدولة، سداد مبكر.
- استثمارات: شراء/بيع/عائد/إعادة تقييم، ROI/IRR.
- قيود: يدوي/آلي/متكرر/عكسي.
- صلاحيات: لا إنشاء+اعتماد+ترحيل لنفس المستخدم؛ سقف مبلغ.
- Workflow: مصفوفة مبالغ، توكيل.
- تزامن: منع deadlock، idempotent cron (postingKey)، أداء على ملايين القيود.

---

## S. Migration Strategy (استراتيجية الترحيل)

1. **آمن/تراكمي (Non-destructive):** إضافة الأعمدة/الجداول الجديدة بأعمدة nullable/defaults + migration 0010 (دون حذف أي عمود موجود).
2. **Backfill**: الأبعاد (branch→dimensionValues, costCenter→…)، fiscalPeriodات من البيانات التاريخية، baseAmount للحركات التاريخية بمعدل صرف افتراضي وكتابة المرجع.
3. **Adapters**: الاحتفاظ بـ`DEFAULT_POSTING_RULES` وترحيلها إلى `postingRules` seed؛ `addTransaction` يبقى لركوبه عبر داخلياً إلى محرك موحد.
4. **قطع (Cutover)**: flag ميزة (featureFlags) — تشغيل المحرك الموحّد per tenant.
5. **التوقفات**: مليونية تدراجية جاهزة على `dataApi`/sync الموجودة (عمود sync راسخ في كل جدول — يسهّل الترحيل خطوة بخطوة).

---

## T. Implementation Roadmap (خارطة التنفيذ)

### Phase 1 — Core Financial (الدفعة الأولى، أعلى أولوية)

1. **فرض التوازن المركزي** + توحيد الدخول عبر AccountingEngine (ينقل addTransaction/addBatch/dailyEntry).
2. **تفعيل الفترات** (open/close/reopen + منع ترحيل بمغلق) + ربط closing.execute بـfiscalPeriods.
3. **نظام أبعاد** (branch/costCenter/project) + ملء costCenterId.
4. **نقل تقارير GL إلى الخادم** + تنفيذ cashFlow statement.
5. **AR/AP أولية**: credit/debit notes، كشف حساب، Aging، سلف/استرداد، إلغاء يعكس GL.

### Phase 2 — Financial Control

6. إحياء **budgetScenarios/budgetLines/varianceAnalyses** + Budget Control (reserve/commit/consume/override).
7. **Workflow matrix + صلاحيات دقيقة (SoD, amount limits)** + ربط RBAC جداول.
8. **إحياء allocationRules/Runs** (توزيع التكاليف + قيد تخصيص).
9. **أصول ثابتة** (سجل + طرق إهلاك + بيع/استبعاد).
10. **تسوية بنكية** + Treasury أساسي (نقد/تدوير/صكوك).
11. **ترقية VAT** (Output/Input منفصلان + فئات) + إسكان الضريبة للحسابات.

### Phase 3 — Advanced Finance

12. **Multi-currency تام** (إعادة تقييم/فروق/تقرير) + قروض/تمويل + استثمارات.
13. **Project/Contract Accounting** (نسبة إنجاز/Committed/ETC/FAC).
14. **Intercompany + Consolidation** (إحياء جداول الدمج).
15. **Cost/Management Accounting** (Cost pools/drivers/ABC) + محاسبة تكاليف تصنيع.
16. **Financial Planning/Rolling Forecast/What-if** + Design تقارير.

### Phase 4 — Intelligent Finance

17. **Financial Analytics/KPI Engine** (إحياء kpis + DSO/DPO/CCC).
18. **أنماط AI**: توقع تدفق نقدي، توقع تحصيل، انحراف، اقتراح تسويات/استحقاق — **مع اعتماد بشري وضوابط** (لا قيد نهائي آلي بلا موافقة).
19. **Reconciliation ذكي + Anomaly Detection** + جودة بيانات.

---

## مناهج تنفيذ نهائي

> **القاعدة:** لا تعامل الوحدة كمجموعة شاشات؛ عالجها كـ **Financial Platform** بمحركات مترابطة (Accounting, Budget, Cost, Treasury, Reporting, Control) على نموذج بيانات موحّد. ضع أي قرار خاص بدولة/سياسة كـ **Localization Rule** (Configurable)، وقيّم أي وظيفة مقترحة بمعيار: القيمة المالية/التشغيلية، الأثر الرقابي ومتانتين، دقة التقارير، قابلية التوسع/الأداء، سهولة الاستخدام، الفعالية، وتوافقها مع بنية tRPC/Drizzle الحالية — **ولا تُضف وظيفة لمجرد وجودها في ERP آخر**.

---

## T. سجل سداد الديون — Debt Paydown Log (End-to-End Pass 1)

**الحالة: مُنفّذ ✅ — تحقّق عبر `pnpm check` (نظيف) واختبارات `server/accounting.test.ts` (3 ✓)**

| الدين                                                                      | الحالة   | التنفيذ                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1: قفل الفترات غير فعّال (مطابقة startDate بالضبط + دالة ميتة)            | ✅ سُدّد | `accountingEngine.ts`: `fiscalPeriodCoversDate` (مدى يومي [start,end]) + `isLockedPeriodStatus` + `findLockedPeriodForDate` + `isPeriodLockedForDate` + `assertPeriodOpen` على المدى والحالتين closing/closed |
| D2: `addBatchTransactions` يقبل حساباً/مركزاً من مؤسسة أخرى (cross-tenant) | ✅ سُدّد | pre-flight دفعي: ملكية كل الحسابات ومراكز التكلفة لكل الصفوف وإلا رفض الدفعة بالكامل                                                                                                                          |
| D3: مسارات الإدخال بلا فحص فترة                                            | ✅ سُدّد | `assertPeriodOpen` في `addTransaction` + `addBatchTransactions` (رفض دفعي) + `dailyEntry` + `createManualJournalEntry` + `updateTransactionLifecycle` (عند الرفع للترحيل)                                     |
| D4: القيد اليدوي يتجاوز المحرك (بلا فترة، بلا isImmutable، بلا أبعاد)      | ✅ سُدّد | فحص الفترة + `isImmutable: true` (متوافق مع `chk_journal_immutable_posted`) + تحقق الحسابات ومراكز التكلفة + `costCenterId` على الرأس والسطور                                                                 |
| D5: بلا فصل مهام (SoD) في دورة الحياة                                      | ✅ سُدّد | `canApproveOwnTransaction`: منشئ الحركة لا يعتمد/يرحّل حركته إلا admin/owner                                                                                                                                  |
| D6: البُعد التحليلي `costCenterId` ميّت                                    | ✈️ نُشّط | مقبول في المحرك (`JournalLeg`/`PostJournalOptions`) وكل مسارات الإدخال + تقرير `financialReports.costCenterSummary` (إيراد/مصروف/صافٍ لكل مركز + غير المُسند)                                                 |
| D7: كشوف العملاء/الموردين خادمية غير موجودة                                | ✅ سُدّد | `financialReportsRouter`: `customerStatement` + `supplierStatement` (فواتير + دفعات + رصيد متحرك)                                                                                                             |

**منهجية:** كل التعديلات additive/غير تدميرية، متوافقة مع قيود المخطط القائمة (checks/immutable)، ومتعددة المستأجرين (tenant-scoped) بالكامل.

**قوائم متبقية (Pass 2 مقترح):** نشر تقارير القوائم المالية على المحرك في واجهات العميل، ربط AR/AP aging بمسارات التسوية (`allocatePayment`)، bank reconciliation، ومصفوفة اعتماد بالمبالغ.
