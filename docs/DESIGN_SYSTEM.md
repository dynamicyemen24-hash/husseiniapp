# Design System — "Heritage Futurism" (تراث المستقبل) v3.0

> **v3.0 — الرقي والعصرية القصوى (2026):** طباعة سائلة `clamp()`، ظلال ناعمة ملونة، `glass-ultra` بتشبع 1.4، شبكات `bento-grid`، أزرار `btn-pill`، `aurora-mesh`، وحركة `stagger`. كل ذلك فوق أساس `v2.15` — لا كسر، فقط رقي.

## 0. ما الجديد في v3.0 — Heritage Futurism

| المجال | قبل (v2.15)                      | بعد (v3.0)                                                | الأثر                                      |
| ------ | -------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| طباعة  | `text-2xl/4xl` ثابتة             | `text-fluid-hero` `clamp(2.25rem,5vw+1rem,4.75rem)` سائلة | عنوان يتأقلم بسلاسة على كل شاشة بلا قفزات  |
| ظلال   | `shadow-elevated/floating` ثقيلة | `shadow-modern-soft/medium/large` ناعمة ملونة             | عمق فاخر بلا ثقل، tinted soft shadows 2026 |
| زجاج   | `glass/glass-premium` 12/20px    | `glass-ultra` 24px + saturate 1.4 + inner highlight       | زجاج visionOS فائق الشفافية                |
| تخطيط  | `grid-cols-3` عادي               | `bento-grid` 12 عمود مع `bento-card` + hover radial       | شبكات Bento عصرية (Apple/Linear)           |
| أزرار  | `h-9` مربعة                      | `btn-pill` حبوبية بتدرج ومطاطية                           | CTAs عصرية بحبوبية وتوهج                   |
| حركة   | `reveal` فقط                     | `stagger` متتابع + `spring-pop`                           | ظهور متدرج يبعث الحيوية                    |
| خلفية  | `tech-grid` ثابت                 | `aurora-mesh` متدرج متحرك                                 | أورورا نابضة للحيوية                       |

## v2.15 أرشيف — الأساس الصلب

# Design System — "Heritage Ledger" (دفتر التراث) v2.15 (مؤرشف)

> نظام التصميم المعياري العالمي لمنصة الحسينية. الهدف: **مصدر واحد للحقيقة** لكل لون
> وخط وتباعد، قابل للتبديل بين السمات، بمطابقة WCAG AA كحد أدنى.

## 1. البنية الطبقية للتوكنات

```
الطبقة 1 — قيم خام (@theme inline في client/src/index.css)
   --brand-50 … --brand-900   سلّم الهوية (نحاسي تراثي)
   --ink, --ink-deep, --ink-500…800   سلّم الحبر (أخضر داكن)
   --sand   السطح الأساسي
   --success, --warning, --info   لوحة دلالية عالمية (v2.15)

الطبقة 2 — توكنات دلالية (shadcn)
   --background, --foreground, --muted, --accent, --border,
   --primary, --destructive, --success, --warning, --info …
   ← تشير إلى الطبقة 1، وتتغير قيمها مع كل سمة (فاتح/داكن/لوحات)
```

**قاعدة ذهبية:** المكوّنات تستهلك الطبقة 2 (الدلالية) كلما وُجدت، والطبقة 1
للهوية الصريحة فقط (تدرّجات العلامة، شارات البطل…).

## 2. السمات

| السمة                         | الهوية          | الحبر               | الاستخدام       |
| ----------------------------- | --------------- | ------------------- | --------------- |
| Heritage Ledger (افتراضي)     | نحاسي `#b87945` | أخضر عميق `#0e2a2b` | الهوية الرئيسية |
| Midnight Ledger               | أزرق `#6c9dff`  | كحلي `#0b1424`      | الوضع الداكن    |
| Emerald / Rose / Teal / Ocean | بديلة           | —                   | تخصيص المستأجر  |

تبديل السمة = تغيير قيم الطبقتين على `:root[data-theme]` — **صفر تعديل في
المكوّنات**. هذا هو سبب حظر القيم الثابتة.

## 3. القواعد الإلزامية

1. **ممنوع `[#hex]` في الكلاسات.** أي لون يُكتب `bg-[#b87945]` يكسر تبديل
   السمات وينزاح من السلّم. استخدم `bg-brand`.
2. **SVG/Canvas فقط يُسمح له بقيم حرفية** (`stopColor`, `stroke`, بيانات
   Recharts) لأن `var()` لا يعمل داخل خاصيات الرسم — ويُفضّل الجسر:
   ```ts
   import { cssVar } from "@/lib/cssVar"; // إن وُجد، أو getComputedStyle
   <stop stopColor="var(--brand)" />      // يعمل في SVG الحديث
   ```
   ملاحظة: متصفحات حديثة تدعم `var()` في `stopColor`/`stroke` كخاصيات CSS،
   وليس كسمات HTML — استخدم `style={{ stopColor: "var(--brand)" }}`.
3. **تثبيت الكثافة:** سلّم `brand` بخطوة ΔE متدرّجة (50→900). أي لون جديد
   يُضاف إلى السلّم لا كمقدار مستقل.
4. **تباين AA:** النص على `brand` = `ink` (نسبة ≥ 7). اختبر أي زوج جديد عبر
   `scripts/nearest-token.mjs` قبل الإضافة.

## 4. أدوات الحوكمة

| أداة                                            | الغرض                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `node scripts/migrate-color-tokens.mjs [--dry]` | ترحيل الكلاسات الحرفية إلى التوكنات (idempotent، يشمل إصلاح الشرطة المزدوجة) |
| `node scripts/nearest-token.mjs <hex>...`       | إيجاد أقرب توكن رسمي لأي لون (مسافة RGB مرجّحة بالإدراك)                     |
| `node scripts/fix-contrast.mjs [--dry]`         | فرض وصفة الزر المطابقة لـ AA على كل `bg-brand`                               |

### سجل الترحيل 2026-09

- **1,033 كلاساً حرفياً** في 48 ملفاً حُوّلت إلى توكنات مسماة.
- **~35 لوناً شبه مكرر** وُحّدت إلى أقرب توكن (ΔE مرجّح ≤ 28؛ معظمها ≤ 12).
- اللوحات/التدرجات في `lib/design.ts` و`Landing.tsx` كلها على التوكنات.

## 5. مطابقة أزواج النص الشائعة (Heritage Ledger — محسوبة فعلياً)

| الخلفية          | النص       | النسبة | الحكم                          |
| ---------------- | ---------- | ------ | ------------------------------ |
| `sand`           | `ink`      | 14.31  | ✅ AAA                         |
| `brand-50`       | `ink`      | 13.88  | ✅ AAA                         |
| `brand-300`      | `ink`      | 6.81   | ✅ AA+                         |
| `brand-deep`     | `sand`     | 4.71   | ✅ AA                          |
| `brand`          | `ink-deep` | 4.76   | ✅ AA                          |
| `brand-700`      | `sand`     | 6.46   | ✅ AA+                         |
| ~~`brand`~~      | ~~`ink`~~  | 4.23   | ❌ ممنوع — أقل من 4.5          |
| ~~`brand-deep`~~ | ~~`ink`~~  | 3.04   | ❌ ممنوع (حالة hover القديمة!) |

### وصفة الزر الأساسي (إلزامية)

```tsx
// ✅ الوصفة المطابقة لـ WCAG AA في الحالتين
className = "bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand ...";

// ❌ الأنماط المحظورة
className = "bg-brand text-ink ..."; // 4.23
className = "bg-brand hover:bg-brand-deep text-ink-deep ..."; // hover = 3.04
```

ملاحظة: `ink-deep` و`ink` غير قابلين للتمييز بصرياً (ΔE ≈ 1.5) — الانتقال
بينهما آمن حتى لو تطبّق على عنصر شقيق في نفس السطر.

أزواج جاهزة للحقن على خلفيات هوية أخرى (Emerald/Rose/Teal/Ocean): استخدم
دائماً `text-ink-deep` على درجات 400–500، و`text-sand` على 600–800.

## 6. المكوّنات العالمية (World-Class Components v2.15)

جميع المكوّنات التالية معرفة في `client/src/index.css` — صفر JavaScript.

### 6.1 شريط الحالة (Status Strip)

```html
<div class="status-strip status-strip-success">
  <CheckCircle class="w-4 h-4" />
  تم التفعيل بنجاح
</div>
```

الأصناف: `status-strip-success`, `status-strip-warning`, `status-strip-danger`, `status-strip-info`

### 6.2 بطاقات KPIs (Stat Cards)

```html
<div class="stat-card">
  <div class="stat-label">إجمالي المبيعات</div>
  <div class="stat-value">1,245,600</div>
  <div class="stat-delta stat-delta-up">+12.5% عن الشهر الماضي</div>
</div>
```

### 6.3 شريط التقدم الممتاز (Progress Premium)

```html
<div class="progress-premium">
  <div class="progress-fill" style="width: 68%"></div>
</div>
```

### 6.4 شريط التقدم غير المحدد (Indeterminate)

```html
<div class="progress-indeterminate"></div>
```

### 6.5 شبكة البيانات (DataGridView)

```html
<div class="datagrid-container">
  <div class="datagrid-toolbar">
    <input placeholder="بحث..." class="..." />
    <button>تصدير</button>
  </div>
  <table class="datagrid">
    <thead>
      <tr>
        <th>العميل</th>
        <th>المبلغ</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>...</td>
        <td>...</td>
        <td>...</td>
      </tr>
    </tbody>
  </table>
  <div class="datagrid-footer">
    <span>1–10 من 124</span>
    <div class="flex gap-2">...</div>
  </div>
</div>
```

### 6.6 شجرة العناصر (TreeView)

```html
<div class="tree-view">
  <ul>
    <li class="tree-row" data-expanded="true">
      <Chevron class="tree-chevron" />
      <Folder class="tree-icon" />
      الحسابات
    </li>
    <li class="tree-children">
      <div class="tree-row">فرع صنعاء</div>
      <div class="tree-row">فرع عدن</div>
    </li>
  </ul>
</div>
```

### 6.7 التقويم (Calendar)

```html
<div class="calendar-grid">
  <div class="calendar-header">الأحد</div>
  <div class="calendar-header">الإثنين</div>
  <!-- ... -->
  <div class="calendar-cell" data-today="true">1</div>
  <div class="calendar-cell">
    2
    <span class="calendar-event">اجتماع</span>
  </div>
  <!-- ... -->
</div>
```

### 6.8 التحكم بالعلامات (Tab Control)

```html
<div class="tabs-primary">
  <button class="tab-trigger" data-state="active">الكل</button>
  <button class="tab-trigger">المعلقة</button>
  <button class="tab-trigger">المكتملة</button>
</div>
```

### 6.9 قائمة الإجراءات (Menu Strip)

```html
<div class="menu-strip">
  <span class="menu-strip-action">طباعة</span>
  <div class="menu-strip-divider"></div>
  <button class="menu-strip-trigger">
    <ChevronDown class="w-4 h-4" />
  </button>
</div>
```

### 6.10 لوحة رئيسية (Panel Premium)

```html
<div class="panel-premium">
  <div class="panel-premium-header">
    <h3>ملخص المبيعات</h3>
    <button>...</button>
  </div>
  <div class="panel-premium-body">
    <!-- محتوى -->
  </div>
  <div class="panel-premium-footer">آخر تحديث: منذ 5 دقائق</div>
</div>
```

### 6.11 رفع وتوهّج (Elevation System)

```html
<div class="shadow-xs">
  -- ظل خفيف جداً
  <div class="shadow-2xs">
    -- ظل دقيق
    <div class="shadow-elevated">
      -- ظل مرتفع
      <div class="shadow-floating">
        -- ظل عائم (قوائم منبثقة)
        <div class="shadow-glow-brand">-- توهج بهوي brand</div>
      </div>
    </div>
  </div>
</div>
```

### 6.12 التفاعلات (Micro-interactions)

```html
<button class="hover-lift">
  -- رفع عند التحويم
  <button class="press-effect">
    -- ضغط عند النقر
    <div class="shine-on-hover">
      -- توهج متحرك عند التحويم
      <div class="spring-pop">-- تأثير نابض (pop)</div>
    </div>
  </button>
</button>
```

### 6.13 الرموز (Status Palette — Semantic)

```html
<span class="text-success">✓</span>
<!-- أخضر -->
<span class="text-warning">⚠</span>
<!-- برتقالي -->
<span class="text-info">ℹ</span>
<!-- أزرق -->
```

### 6.14 خلفية HUD (Glass)

```html
<div class="glass">
  -- زجاج خفيف (12px blur)
  <div class="glass-premium">-- زجاج فاخر (20px blur)</div>
</div>
```

## 7. السمات الستة والحالة الدلالية

| السمة                   | brand     | success   | warning   | info      |
| ----------------------- | --------- | --------- | --------- | --------- |
| الفجر التراثي (فاتح)    | `#b87945` | `#15803d` | `#b45309` | `#1d6f8f` |
| الليل الكلاسيكي (داكن)  | `#b87945` | `#4ade80` | `#fbbf24` | `#38bdf8` |
| الصفاء الليلي (داكن)    | `#6c9dff` | `#4ade80` | `#fbbf24` | `#93c5fd` |
| الياقوت التنفيذي (داكن) | `#34d399` | `#6ee7b7` | `#fcd34d` | `#67e8f9` |
| الرقي الذهبي (فاتح)     | `#c06b5a` | `#c2410c` | `#b45309` | `#0369a1` |
| النقاء الأزرق (فاتح)    | `#1d6f8f` | `#0d9488` | `#ca8a04` | `#0284c7` |
