# AGENTS.md - دليل أوامر المشروع

## أوامر التطوير والبناء

```bash
# تثبيت الحزم
pnpm install

# تشغيل خادم التطوير
pnpm dev

# بناء المشروع للإنتاج
pnpm build

# تشغيل الإنتاج محلياً
pnpm start

# فحص أخطاء TypeScript
pnpm check

# تنسيق الكود
pnpm format

# تشغيل الاختبارات
pnpm test

# تحديث قاعدة البيانات
pnpm db:push
```

## هيكل المشروع

```
husseiniya-platform/
├── client/          # واجهة React (Vite + Tailwind + shadcn/ui)
├── server/          # خادم Express + tRPC
├── shared/          # الكود المشترك
├── drizzle/         # مخطط قاعدة البيانات
└── api/             # نقطة الدخول للإنتاج (Vercel)
```

## التقنيات الرئيسية

- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui, tRPC Client
- **Backend**: Express, tRPC Server, Drizzle ORM, Neon PostgreSQL
- **النشر**: Vercel (Serverless + SPA)

## ملاحظات مهمة

- استخدام `pnpm` كمدير حزم
- TypeScript في وضع strict
- قاعدة البيانات: Neon PostgreSQL (Serverless)
- المصادقة: JWT tokens مع OAuth
