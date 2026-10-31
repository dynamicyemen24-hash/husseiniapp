# ADR-002: استخدام Drizzle ORM مع Neon PostgreSQL

## الحالة
مقبول

## السياق
يحتاج المشروع إلى ORM لقاعدة بيانات PostgreSQL مستضافة على Neon (serverless). الخيارات:
- Prisma
- Drizzle ORM
- TypeORM
- Sequelize
- SQL خام (pg/Knex)

المتطلبات:
- Type safety كامل
- أداء عالي في بيئة serverless
- دعم migrations
- Bundle size صغير
- دعم Neon serverless driver

## القرار
سنستخدم **Drizzle ORM** مع **@neondatabase/serverless** driver.

الأسباب:
1. **Type Safety من الدرجة الأولى**: يستنتج الأنواع من schema مباشرة
2. **Zero-overhead**: لا runtime overhead، يستهدف SQL مباشرة
3. **Serverless-first**: مصمم للـ edge/serverless، يعمل مع Neon driver
4. **Bundle size صغير**: ~100KB vs Prisma ~10MB+
5. **SQL-like API**: قريب من SQL، سهل التصحيح والتحسين
6. **Drizzle Kit**: أداة migrations ممتازة

## البدائل المرفوضة
| البديل | سبب الرفض |
|---------|-----------|
| Prisma | Bundle size كبير، cold start بطيء في serverless، binary engine |
| TypeORM | decorator-based، أداء أقل، API معقد |
| Sequelize | promise-based API قديم، type safety أضعف |
| Knex/raw SQL | لا type safety، صيانة صعبة للـ migrations |

## العواقب
### الإيجابية
- Cold start سريع في Vercel/Neon
- Type safety مضمون عند compile time
- SQL قابل للقراءة والتصحيح
- Migrations قابلة للمراجعة (SQL نقي)

### السلبية
- لا يدعم relations التلقائية مثل Prisma (يتطلب join يدوي)
- مجتمع أصغر من Prisma
- لا يوجد visual schema editor

### المخاطر والتخفيف
- **خطر**: نضج أقل من Prisma → **تخفيف**: Drizzle مستقر v0.30+، مستخدم في إنتاج
- **خطر**: محدودية بعض الميزات المتقدمة → **تخفيف**: يمكن استخدام SQL خام عند الحاجة

## خطة التنفيذ
- [x] إعداد Drizzle مع Neon serverless driver
- [x] تكوين Drizzle Kit للـ migrations
- [x] تعريف Schema مع العلاقات
- [ ] إضافة فهارس للأداء
- [ ] توثيق أنماط الاستعلامات الشائعة

## المراجع
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)

---
*تاريخ الإنشاء: 2026-10-23*
*المؤلف: AI Assistant*