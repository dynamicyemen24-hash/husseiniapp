# ADR-001: استخدام tRPC للتواصل بين العميل والخادم

## الحالة
مقبول

## السياق
يحتاج المشروع إلى طبقة API آمنة من حيث الأنواع (type-safe) تربط واجهة React (العميل) بخادم Express. الخيارات المتاحة كانت:
- REST API مع OpenAPI/Swagger
- GraphQL
- tRPC
- gRPC

المتطلبات:
- أمان الأنواع من طرف إلى طرف (end-to-end type safety)
- دعم TypeScript الأصلي
- أداء عالي مع batching
- سهولة التطوير والصيانة
- دعم React Query للتخزين المؤقت

## القرار
سنستخدم **tRPC v11** كطبقة API الأساسية للتواصل بين العميل والخادم.

الأسباب:
1. **Type Safety كامل**: يشارك أنواع TypeScript بين العميل والخادم دون حاجة لتوليد كود
2. **أداء ممتاز**: يدعم batching تلقائي للطلبات، يقلل round-trips
3. **تكامل ممتاز مع React Query**: يدعم التخزين المؤقت، إعادة التحميل، والتفاؤل التحديثات
4. **بساطة**: لا حاجة لـ schema منفصل أو code generation
5. **دعم Express**: يعمل بشكل طبيعي مع Express middleware

## البدائل المرفوضة
| البديل | سبب الرفض |
|---------|-----------|
| REST + OpenAPI | يتطلب code generation، لا يوجد type safety حقيقي في runtime |
| GraphQL | تعقيد زائد للمشروع، over-fetching/under-fetching issues |
| gRPC | غير مناسب للويب (يتطلب gRPC-web)، تعقيد في الأدوات |

## العواقب
### الإيجابية
- تطوير أسرع مع type safety مضمون
- Refactoring آمن عبر الحدود العميل/الخادم
- Bundle size أصغر (لا يوجد runtime validation library)

### السلبية
- مقيد بـ TypeScript/JavaScript ecosystem
- فريق جديد قد يحتاج وقت للتعلم
- أقل شيوعاً من REST/GraphQL في السوق

### المخاطر والتخفيف
- **خطر**: اعتماد على مكتبة واحدة → **تخفيف**: tRPC مستقر ومستخدم في الإنتاج بشركات كبيرة
- **خطر**: Migration صعب مستقبلاً → **تخفيف**: طبقة الـ router معزولة، يمكن استبدال النقل

## خطة التنفيذ
- [x] إعداد tRPC v11 مع Express adapter
- [x] تكوين React Query integration
- [x] إضافة batching middleware
- [ ] توثيق أنماط الاستخدام للفريق

## المراجع
- [tRPC Documentation](https://trpc.io)
- [React Query Integration](https://trpc.io/docs/react-query)

---
*تاريخ الإنشاء: 2026-10-23*
*المؤلف: AI Assistant*