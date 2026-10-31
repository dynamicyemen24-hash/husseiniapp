# Incident Response Runbook — منصة الحسينية (Uamex_erp)

> **مستوى السرية:** داخلي — فريق العمليات فقط
> **آخر تحديث:** 2026-08-29
> **النسخة:** 1.0

---

## 1. مصفوفة الشدة (Severity Matrix)

| المستوى              | الوصف                                      | SLA الاستجابة | أمثلة                                          |
| -------------------- | ------------------------------------------ | ------------- | ---------------------------------------------- |
| **SEV-1 (Critical)** | خدمة كاملة معطلة، فقدان بيانات، تسريب أمني | **15 دقيقة**  | DB down، 5xx > 5%، data breach، backup failure |
| **SEV-2 (High)**     | ميزة رئيسية معطلة، أداء متدني بشدة         | **1 ساعة**    | login broken، invoices fail، export timeout    |
| **SEV-3 (Medium)**   | ميزة ثانوية معطلة، خطأ في التقارير         | **4 ساعات**   | dashboard widget broken، PDF misrender         |
| **SEV-4 (Low)**      | cosmetic، تحسين، توثيق                     | **أسبوع**     | typo، color mismatch، doc update               |

---

## 2. قنوات الإبلاغ والتصعيد

| القناة             | الغرض                                       | رابط/معرّف                                      |
| ------------------ | ------------------------------------------- | ----------------------------------------------- |
| **Sentry Alerts**  | تلقائي — SEV-1/2 منExceptions & Performance | `https://sentry.io/organizations/<org>/alerts/` |
| **Uptime Monitor** | تلقائي — `/api/health` → 503                | UptimeRobot / BetterStack / Pingdom             |
| **On-call Slack**  | تواصل فوري للفريق                           | `#incidents-oncall`                             |
| **WhatsApp Group** | تصعيد إداري / عملاء                         | `Uamex On-call`                                 |
| **Status Page**    | تواصل عام للعملاء                           | `alhusainiaye.vercel.app`                       |

---

## 3. إجراءات الاستجابة الموحدة (Runbooks)

### 3.1 SEV-1: قاعدة البيانات غير متاحة (DB Down)

**الأعراض:** `/api/health` يعيد 503، Sentry يفيض بـ `connection refused`، `pg` errors.

| الخطوة | الإجراء                      | الأمر/التحقق                                                                             | المالك         |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| 1      | تأكيد التأثير                | `curl -s https://alhusainiaye.vercel.app/api/health \| jq .dbAvailable`                  | On-call        |
| 2      | فحص Neon Dashboard           | `https://console.neon.tech/projects/<project-id>` — هل المشروع نشط؟ هل وصلت للحد الأقصى؟ | On-call        |
| 3      | فحص Vercel Function Logs     | `vercel logs api/index.mjs --follow`                                                     | On-call        |
| 4      | إذا Neon معطل → **Failover** | غير مجدي (Neon managed) — تواصل دعم Neon فوراً                                           | On-call + Lead |
| 5      | إذا connection pool مستنزف   | أعد تشغيل Vercel functions: `vercel rollback` أو redeploy                                | On-call        |
| 6      | تواصل العملاء                | أنشر على Status Page + WhatsApp group                                                    | Lead           |
| 7      | Post-mortem                  | خلال 48 ساعة — قالب في القسم 4                                                           | Lead           |

---

### 3.2 SEV-1: أخطاء 5xx مفاجئة (Error Spike)

**الأعراض:** Sentry alert `error rate > 5%`، Vercel logs يظهر stack traces.

| الخطوة | الإجراء                              | الأمر/التحقق                                                                                          | المالك  |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------- |
| 1      | تحديد الـ release المسبب             | Sentry → Releases →filter by time window                                                              | On-call |
| 2      | إذا release جديد → **Rollback فوري** | `vercel rollback <deployment-url>`                                                                    | On-call |
| 3      | إذا لا release جديد → تحقق من DB     | `SELECT * FROM activity_logs WHERE created_at > now() - interval '1 hour' AND action LIKE '%error%';` | On-call |
| 4      | تحقق من أسرار البيئة                 | Vercel Dashboard → Environment Variables — هل `JWT_SECRET`، `CRON_SECRET` صحيحة؟                      | On-call |
| 5      | عزل المسار المسبب                    | Sentry → Issues → Group by `transaction`                                                              | On-call |
| 6      | Hotfix أو rollback                   | Hotfix فقط إذا < 30 دقيقة وثقة عالية، غير ذلك rollback                                                | Lead    |

---

### 3.3 SEV-2: فشل النسخ الاحتياطي (Backup Failure)

**الأعراض:** Cron job `/api/cron/tick` يعيد 500، Sentry يلتقط `BACKUP_ENCRYPTION_KEY missing` أو S3 error.

| الخطوة | الإجراء                        | الأمر/التحقق                                                                                         | المالك                      |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------- | ------- |
| 1      | تحقق من المفتاح                | `vercel env ls                                                                                       | grep BACKUP_ENCRYPTION_KEY` | On-call |
| 2      | تحقق من S3 credentials         | `vercel env ls                                                                                       | grep S3\_`                  | On-call |
| 3      | شغل يدوياً للتشخيص             | `curl -X POST https://alhusainiaye.vercel.app/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"` | On-call                     |
| 4      | إذا S3 quota ممتلئ             | نظف bucket أو زد الحصة                                                                               | Lead                        |
| 5      | إذا encryption key مفقود       | أضف في Vercel → Redeploy                                                                             | On-call                     |
| 6      | تحقق من استعادة النسخة الأخيرة | `trpc.backup.verify` ثم `trpc.backup.restore dry-run`                                                | On-call                     |

---

### 3.4 SEV-2: مشاكل المصادقة / OAuth Loop

**الأعراض:** مستخدمون لا يستطيعون تسجيل الدخول، redirect loop، `ACCOUNT_NOT_FOUND` خطأ.

| الخطوة | الإجراء                              | الأمر/التحقق                                               | المالك  |
| ------ | ------------------------------------ | ---------------------------------------------------------- | ------- |
| 1      | تحقق من OAuth Provider               | `curl -I $OAUTH_SERVER_URL/health`                         | On-call |
| 2      | تحقق من cookies / CSP                | Vercel → Functions → Headers — هل `SameSite=None; Secure`؟ | On-call |
| 3      | تحقق من `VITE_OAUTH_PORTAL_URL`      | هل يتطابق مع `OAUTH_SERVER_URL`؟                           | On-call |
| 4      | مسح sessionStorage للعملاء المتأثرين | أعلن في Status Page: "امسح بيانات الموقع وأعد المحاولة"    | Lead    |
| 5      | إذا provider معطل → Fallback         | فعّل `OWNER_PASSWORD` login مؤقتاً                         | Lead    |

---

### 3.5 SEV-3: أداء متدني (High Latency)

**الأعراض:** Sentry Performance `p95 > 3s`، Lighthouse CI يفشل، شكاوى عملاء.

| الخطوة | الإجراء                    | الأمر/التحقق                                                | المالك  |
| ------ | -------------------------- | ----------------------------------------------------------- | ------- |
| 1      | حدد المسار البطيء          | Sentry → Performance → Slowest transactions                 | On-call |
| 2      | تحقق من فهارس DB           | `EXPLAIN ANALYZE <slow-query>`                              | On-call |
| 3      | تحقق من Vercel Cold Starts | هل هناك deployments جديدة؟ `vercel inspect <url> --profile` | On-call |
| 4      | إذا query معين → أضف index | `pnpm db:push` بعد إضافة index في `schema.ts`               | On-call |
| 5      | إذا chunk JS ضخم           | راجع `manualChunks` في `vite.config.ts`                     | On-call |

---

## 4. قالب Post-Mortem (Blame-free)

```markdown
# Post-Mortem: INC-YYYYMMDD-XXX

**التاريخ:** YYYY-MM-DD
**المستوى:** SEV-X
**المدة:** Xh Ym (من الكشف للحل)
**الحالة:** Resolved / Mitigated

## الملخص التنفيذي

وصف مختصر (2-3 جمل) للحادث والتأثير على العملاء.

## الخط الزمني (Timeline)

| الوقت (UTC) | الحدث                 | المصدر                |
| ----------- | --------------------- | --------------------- |
| HH:MM       | Alert fired           | Sentry / Uptime       |
| HH:MM       | On-call acknowledged  | Slack                 |
| HH:MM       | Root cause identified | Logs / Dashboard      |
| HH:MM       | Mitigation deployed   | Vercel rollback / fix |
| HH:MM       | Recovery confirmed    | Health check green    |

## السبب الجذري (Root Cause - 5 Whys)

1. لماذا حدث الخطأ؟ ...
2. لماذا لم يتم اكتشافه مبكراً؟ ...
3. ...

## الإجراءات التصحيحية (Action Items)

| الإجراء                 | النوع      | المالك | الموعد     | تذكرة |
| ----------------------- | ---------- | ------ | ---------- | ----- |
| Add index on X          | Prevention | @dev   | YYYY-MM-DD | #123  |
| Improve alert threshold | Detection  | @ops   | YYYY-MM-DD | #124  |
| Document runbook for Y  | Process    | @lead  | YYYY-MM-DD | #125  |

## الدروس المستفادة

- ما نجح؟
- ما فشل؟
- ما سنغيّره؟
```

---

## 5. إجراءات Rollback (إعادة النشر السابق)

```bash
# 1. قائمة آخر 10 نشرات
vercel list alhusainia-platform --limit 10

# 2. حدد الـ deployment المستقر (أخضر في CI)
# انسخ الـ URL أو الـ Deployment ID

# 3. نفذ rollback
vercel rollback <DEPLOYMENT_URL> --token=$VERCEL_TOKEN

# 4. تحقق من الصحة
curl -s https://alhusainiaye.vercel.app/api/health | jq .

# 5. إذا rollback فشل → redeploy من main branch
vercel --prod --token=$VERCEL_TOKEN
```

**ملاحظات حرجة:**

- Rollback يعيد الـ **code + env vars** للحالة السابقة
- لا يمس قاعدة البيانات (migrations لا ترجع للوراء تلقائياً)
- إذا migration سبب المشكلة → تحتاج migration down يدوي (راجع `drizzle/migrations/`)

---

## 6. تدوير الأسرار (Secret Rotation) — ربع سنوي

| السر                    | الأمر                      | التكرار    | الملاحظات                              |
| ----------------------- | -------------------------- | ---------- | -------------------------------------- |
| `JWT_SECRET`            | `openssl rand -base64 64`  | 90 يوم     | يتطلب تسجيل خروج جميع المستخدمين       |
| `CRON_SECRET`           | `openssl rand -base64 48`  | 90 يوم     | حدّث في Vercel + cron scheduler        |
| `AGENT_SECRET`          | `openssl rand -base64 48`  | 90 يوم     | حدّث في Vercel                         |
| `BACKUP_ENCRYPTION_KEY` | `openssl rand -base64 32`  | 180 يوم    | **لا تغيّر دون اختبار استعادة أولاً!** |
| `SENTRY_DSN`            | Sentry UI → Settings → DSN | عند الحاجة | لا ينتهي صلاحيته عادةً                 |
| `OAUTH_CLIENT_SECRET`   | OAuth Provider UI          | 90 يوم     | حدّث في Vercel + provider              |

**إجراء التدوير:**

1. أنشئ السر الجديد محلياً
2. حدّث في Vercel Dashboard → Environment Variables
3. `vercel --prod` لنشر التغيير
4. تحقق من `/api/health` و Sentry
5. أرشِف السر القديم في 1Password / Bitwarden

---

## 7. جهات الاتصال (Contacts)

| الدور               | الاسم | Slack             | Phone (طوارئ) | البريد                           |
| ------------------- | ----- | ----------------- | ------------- | -------------------------------- |
| **Tech Lead / IC**  |       | `@tech-lead`      | +967-XXX-XXXX | lead@alhusainiaye.vercel.app     |
| **Backend Owner**   |       | `@backend-owner`  | +967-XXX-XXXX | backend@alhusainiaye.vercel.app  |
| **Frontend Owner**  |       | `@frontend-owner` | +967-XXX-XXXX | frontend@alhusainiaye.vercel.app |
| **DevOps / Vercel** |       | `@devops`         | +967-XXX-XXXX | devops@alhusainiaye.vercel.app   |
| **Product Owner**   |       | `@po`             | +967-XXX-XXXX | po@alhusainiaye.vercel.app       |
| **Neon Support**    | —     | —                 | —             | support@neon.tech                |
| **Vercel Support**  | —     | —                 | —             | support@vercel.com               |
| **Sentry Support**  | —     | —                 | —             | support@sentry.io                |

---

## 8. روابط سريعة (Quick Links)

| المورد                 | الرابط                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| **Vercel Dashboard**   | `https://vercel.com/<team>/alhusainia-platform`                      |
| **Neon Console**       | `https://console.neon.tech/projects/<project-id>`                    |
| **Sentry Issues**      | `https://sentry.io/organizations/<org>/issues/?project=<project-id>` |
| **Sentry Performance** | `https://sentry.io/organizations/<org>/performance/`                 |
| **Status Page**        | `https://alhusainiaye.vercel.app`                                    |
| **GitHub Actions**     | `https://github.com/<org>/husseiniya-platform/actions`               |
| **Runbook هذا الملف**  | `docs/INCIDENT_RESPONSE_RUNBOOK.md`                                  |

---

## 9. قائمة التحقق قبل النشر (Pre-deploy Checklist)

- [ ] جميع اختبارات CI خضراء (lint, typecheck, unit, e2e, lighthouse)
- [ ] لا توجد migrations معلقة (`pnpm db:push` جاف)
- [ ] متغيرات البيئة في Vercel محدثة (خاصة الأسرار)
- [ ] Sentry release تم إنشاؤه (`sentry-cli releases new <version>`)
- [ ] Source maps رفعت لـ Sentry (بناء الإنتاج)
- [ ] Change log محدث (`CHANGELOG.md`)
- [ ] تم إعلام الفريق في `#releases`
- [ ] Rollback plan موثق في PR description

---

_هذا المستند حي — حدّثه بعد كل حادث أو تغيير في البنية التحتية._
