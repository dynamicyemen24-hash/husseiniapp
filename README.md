# لخدمات الأعمال الحسينية | ALHUSAINIA Platform

> لخدمات الأعمال الحسينية
>
> **اسم نظام الإدارة الموحّد: [`Uamex_erp`](public/UAMEX_ERP/UAMEX_ERPLOGO.png)** — وحدة الأعمال/المحاسبة الرسمية المتكاملة (Unified Asset Management &amp; Enterprise Exchange).

[![CI](https://github.com/alhusainia/husseiniya-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/alhusainia/husseiniya-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## الميزات الرئيسية

### نظام محاسبي متكامل

- دليل حسابات شجري متعدد المستويات
- قيود مزدوجة مع تدقيق تلقائي
- أرصدة افتتاحية وإقفال دورة محاسبية
- تقارير مالية شاملة (ميزانية عمومية، قائمة دخل، تدفق نقدي)

### إدارة المبيعات والمشتريات

- فواتير مبيعات ومشتريات مع حساب ضريبة القيمة المضافة
- إدارة العملاء والموردين
- سندات قبض وصرف
- نقاط بيع متكاملة

### إدارة المخازن والمنتجات

- كتالوج منتجات مع أكواد وباركود
- حركات مخزون (وارد/صادر/تحويل/تسوية)
- تنبيهات الحد الأدنى للمخزون
- استيراد وتصدير CSV

### متجر إلكتروني

- كتالوج عام للمنتجات
- سلة مشتريات وإتمام طلبات
- ربط مع الموقع الخارجي (WordPress/PHP)
- Webhook للطلبات الجديدة

### أدوات متقدمة

- لوحة تحكم تفاعلية مع رسوم بيانية
- ذكاء اصطناعي لتحليل المستندات
- دعم عدم الاتصال (Offline PWA)
- طباعة فواتير وسندات احترافية

---

## التقنيات المستخدمة

| التقنية             | الدور               |
| ------------------- | ------------------- |
| **React 19**        | واجهة المستخدم      |
| **Vite**            | بناء وتطوير التطبيق |
| **TypeScript**      | لغة البرمجة         |
| **Tailwind CSS**    | التنسيق             |
| **shadcn/ui**       | مكتبة المكونات      |
| **Express**         | خادم HTTP           |
| **tRPC**            | API TypeSafe        |
| **Drizzle ORM**     | ORM لقاعدة البيانات |
| **Neon PostgreSQL** | قاعدة البيانات      |
| **Vercel**          | الاستضافة           |

---

## البدء السريع

### المتطلبات

- Node.js 20+
- pnpm 10+
- حساب Neon PostgreSQL

### التثبيت

```bash
# استنساخ المستودع
git clone https://github.com/alhusainia/husseiniya-platform.git
cd husseiniya-platform

# تثبيت الحزم
pnpm install

# إعداد المتغيرات البيئية
cp .env.example .env
# عدّل .env بإضافة DATABASE_URL و JWT_SECRET

# تحديث قاعدة البيانات
pnpm db:push

# تشغيل خادم التطوير
pnpm dev
```

### أوامر مهمة

```bash
pnpm dev          # تشغيل خادم التطوير
pnpm build        # بناء المشروع للإنتاج
pnpm start        # تشغيل الإنتاج
pnpm check        # فحص أخطاء TypeScript
pnpm lint         # فحص أخطاء الكود
pnpm format       # تنسيق الكود
pnpm test         # تشغيل الاختبارات
```

---

## هيكل المشروع

```
husseiniya-platform/
├── client/                    # واجهة المستخدم (React + Vite)
│   ├── src/
│   │   ├── components/        # المكونات المشتركة
│   │   ├── pages/             # صفحات التطبيق
│   │   ├── lib/               # مكتبات مساعدة
│   │   ├── hooks/             # Custom Hooks
│   │   └── contexts/          # React Contexts
│   └── public/                # الملفات الثابتة
├── server/                    # الخادم (Express + tRPC)
│   ├── _core/                 # نواة الخادم
│   ├── routers.ts             # مسارات API
│   └── db.ts                  # اتصال قاعدة البيانات
├── shared/                    # الكود المشترك
├── drizzle/                   # مخطط قاعدة البيانات
└── api/                       # نقطة الدخول للإنتاج
```

---

## المتغيرات البيئية

| المتغير            | الوصف                                     | مطلوب          |
| ------------------ | ----------------------------------------- | -------------- |
| `DATABASE_URL`     | رابط قاعدة البيانات Neon                  | نعم            |
| `JWT_SECRET`       | سر تشفير JWT                              | نعم            |
| `OWNER_OPEN_ID`    | معرّف المالك                              | نعم            |
| `OAUTH_SERVER_URL` | رابط خادم OAuth                           | نعم            |
| `SMTP_HOST`        | مضيف SMTP لإرسال رسائل التفعيل والاسترجاع | نعم في الإنتاج |
| `SMTP_PORT`        | منفذ SMTP                                 | نعم في الإنتاج |
| `SMTP_USER`        | اسم مستخدم SMTP                           | نعم في الإنتاج |
| `SMTP_PASS`        | كلمة مرور SMTP                            | نعم في الإنتاج |
| `EMAIL_FROM`       | عنوان البريد المرسل                       | نعم في الإنتاج |
| `LLM_API_KEY`      | مفتاح API للذكاء الاصطناعي                | لا             |
| `S3_BUCKET`        | اسم حاوية التخزين                         | لا             |

---

## النشر

### Vercel (الموصى به)

1. اربط المستودع بـ Vercel
2. أضف المتغيرات البيئية في Vercel Dashboard
3. سيقوم Vercel بالبناء والنشر تلقائياً

### النشر المحلي

```bash
pnpm build
pnpm start
```

---

## الأمان

- ** Helmet.js **: headers أمان متقدمة
- **Rate Limiting**: حماية ضد هجمات Brute Force
- **CORS مقيد**: فقط للمواقع المصرح بها
- **JWT آمن**: صلاحية 30 يوم مع تشفير HS256
- **CSP**: سياسة محتوى صارمة

---

## الترخيص

MIT License - راجع ملف [LICENSE](LICENSE) للتفاصيل.

---

## التواصل

** الحسينية لخدمات الأعمال **

- الموقع: [alhusainiaye.vercel.app](https://alhusainiaye.vercel.app)
