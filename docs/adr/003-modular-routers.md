# ADR-003: بنية الراوترات المعيارية (Modular Router Architecture)

## الحالة
مقبول

## السياق
ملف `server/routers.ts` نما ليصبح 11,555 سطر، يحتوي على جميع تعريفات التروترات (routers) في ملف واحد. هذا يسبب:
- صعوبة في التنقل والصيانة
- conflicts في الدمج (merge conflicts) متكررة
- وقت تحميل TypeScript بطيء
- صعوبة في اختبار الوحدات المعزولة
- violation لمبدأ Single Responsibility

## القرار
تفكيك `routers.ts` إلى بنية معيارية في `server/routers/` مع:
- `index.ts`: جامع الراوترات الرئيسي
- `auth/`, `financial/`, `inventory/`, `procurement/`, `sales/`, `hr/`, `analytics/`, `system/`: وحدات حسب المجال
- كل وحدة تصدر router خاص بها
- الراوترات الموجودة تبقى في الجذر كمرجع انتقالي

## البدائل المرفوضة
| البديل | سبب الرفض |
|---------|-----------|
| الإبقاء على ملف واحد | غير مستدام، يزداد تعقيداً |
| تقسيم عشوائي | لا يتبع حدود المجال (domain boundaries) |
| Micro-services | تعقيد تشغيلي زائد لحجم الفريق الحالي |

## العواقب
### الإيجابية
- فصل الاهتمامات (Separation of Concerns) واضح
- سهولة إضافة ميزات جديدة في الوحدة المناسبة
- اختبارات وحدة معزولة لكل مجال
- تقليل merge conflicts
- TypeScript compilation أسرع (incremental)

### السلبية
- حاجة لتحديث الاستيرادات (imports) في الكود الموجود
- تعقيد أولي في فهم البنية الجديدة
- بعض الراوترات المشتركة تحتاج لمكان مشترك

### المخاطر والتخفيف
- **خطر**: كسر الاستيرادات الموجودة → **تخفيف**: استخدام barrel exports، توجيهات TypeScript paths
- **خطر**: تكرار الكود بين الوحدات → **تخفيف**: shared utilities في `server/_core/` و `shared/`

## خطة التنفيذ
- [x] إنشاء بنية المجلدات `server/routers/{auth,financial,inventory,procurement,sales,hr,analytics,system}`
- [x] إنشاء `server/routers/index.ts` كجامع رئيسي
- [x] إنشاء routers placeholder لكل وحدة
- [ ] نقل الراوترات الفعلية من `routers.ts` إلى الوحدات المناسبة
- [ ] تحديث `server/_core/index.ts` لاستخدام `server/routers/index.ts`
- [ ] حذف `server/routers.ts` القديم

## المراجع
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Modular Monolith](https://www.milanjovanovic.tech/blog/modular-monolith-architecture)

---
*تاريخ الإنشاء: 2026-10-23*
*المؤلف: AI Assistant*