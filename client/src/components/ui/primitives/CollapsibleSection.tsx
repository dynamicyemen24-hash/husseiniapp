/**
 * CollapsibleSection — قسم قابل للطي/العرض مع تذكّر الحالة.
 *
 * يستخدَم في شاشات الإعدادات واللوحات لتقليل الازدحام البصري: يُطوى القسم
 * غير المهم ويُعرض عند الحاجة. الحالة تُحفظ في localStorage per key بحيث
 * تظل الأقسام مطوية أو مفتوحة عبر إعادة التحميل.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  /** عنوان القسم المعروض في الرأس القابل للنقر. */
  title: string;
  /** مفتاح تخزين الحالة في localStorage (مستعجل، الاختيار aftr). */
  storageKey?: string;
  /** هل يبدأ مفتوحاً افتراضياً (قبل قراءة المحفوظ). */
  defaultOpen?: boolean;
  /** أيقونة مخصصة للرأس. */
  icon?: React.ElementType;
  /** وصف مساعد يظهر تحت العنوان. */
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** معرف اختبار ثابت للتفاعل الآلي — يُدمج في data-testid. */
  testId?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  storageKey,
  defaultOpen = true,
  icon: Icon,
  description,
  children,
  className = '',
  testId,
}) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) setOpen(raw === '1');
    } catch {
      /* localStorage غير متاح — تستخدم القيمة الافتراضية */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* best-effort */
      }
    },
    [storageKey]
  );

  return (
    <section
      className={`border border-hairline rounded-xl ${className}`}
      data-testid={testId ?? `collapsible-section-${storageKey ?? title.replace(/\s+/g, '-')}`}
    >
      <button
        type="button"
        onClick={() => persist(!open)}
        aria-expanded={open}
        aria-controls={`collapsible-${storageKey ?? title.replace(/\s+/g, '-')}`}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-ink transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {description && <span className="text-2xs text-faint">{description}</span>}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted transition-transform duration-200" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-200" />
        )}
      </button>

      {open && <div className="border-t border-hairline bg-surface/50 px-4 pb-4">{children}</div>}
    </section>
  );
};
