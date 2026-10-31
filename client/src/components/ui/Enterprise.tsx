/**
 * Enterprise.tsx — نظام التصميم والمكونات العامة المتقدمة للجيل التالي
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * يوفر هذا الملف مكتبة مكونات عامة موحدة ومتقدمة تعمل مع جميع الثيمات
 * (light, dark, oled, high_contrast) تلقائياً عبر
 * توكنز CSS المتغيرة. جميع المكونات تدعم RTL، WCAG 2.2 AA، والتكيف التلقائي
 * مع كثافة المحتوى (compact/comfortable/spacious).
 *
 * المكونات الجديدة للجيل التالي:
 *   • SmartCard — بطاقة ذكية مع مؤشر حالة وتفاعل حركي
 *   • AdaptiveGrid — شبكة متجاوبة تتكيف مع عدد العناصر وحجم الشاشة
 *   • IntelligentSearchBar — شريط بحث ذكي مع اقتراحات وتنقل فوري
 *   • QuickActionChip — إجراء سريع مع أيقونة ونص وتأثير حركي
 *   • StatusIndicator — مؤشر حالة تشغيلي مع تنبيه ذكي
 *   • ProfessionalTable — جدول احترافي مع تمرير افتراضي وتصنيف ذكي
 *   • MetricCard — بطاقة مقياس رئيسية مع اتجاه ومقارنة
 *   • AlertPanel — لوحة تنبيهات عملياتية مع إجراءات تصحيحية
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  X,
  Plus,
  Menu,
  Activity,
  Bell,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { StatusBadge, type StatusTone } from './Primitives';

/* ════════════════════════════════════════════════════════════════════════════
   توكنز التصميم الموحدة
   ════════════════════════════════════════════════════════════════════════════ */
const TONE_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-ok-soft/10 border-ok/30 text-ok-strong',
  warn: 'bg-warn-soft/10 border-warn/30 text-warn-strong',
  err: 'bg-err-soft/10 border-err/30 text-err-strong',
  info: 'bg-info-soft/10 border-info/30 text-info-strong',
  brand: 'bg-brand-soft/10 border-brand/30 text-brand',
  neutral: 'bg-subtle border-hairline text-muted',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: Menu,
  pending: Clock,
  approved: CheckCircle2,
  sent: ArrowRight,
  received: Package,
  posted: Activity,
  cancelled: X,
  err: AlertCircle,
  ok: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
};

/* ════════════════════════════════════════════════════════════════════════════
   SmartCard — بطاقة ذكية مع مؤشر حالة وتفاعل حركي
   ════════════════════════════════════════════════════════════════════════════ */
export interface SmartCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  tone?: StatusTone;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function SmartCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'brand',
  trend,
  trendValue,
  onClick,
  children,
}: SmartCardProps) {
  const toneClass = TONE_CLASSES[tone];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const trendClass =
    trend === 'up' ? 'text-ok-strong' : trend === 'down' ? 'text-err-strong' : 'text-muted';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? title : undefined}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${toneClass}
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-current opacity-10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-bold text-faint uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black font-mono mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted mt-1 line-clamp-1">{subtitle}</p>}
          {trend && trendValue && (
            <p className={`mt-2 text-xs font-bold flex items-center gap-1 ${trendClass}`}>
              {TrendIcon && <TrendIcon size={12} aria-hidden="true" />}
              {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-current/10 text-current`}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
      {children && <div className="mt-4 pt-4 border-t border-current/20">{children}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MetricCard — بطاقة مقياس رئيسية مع اتجاه ومقارنة
   ════════════════════════════════════════════════════════════════════════════ */
export interface MetricCardProps {
  label: string;
  current: string | number;
  previous?: string | number;
  unit?: string;
  icon?: React.ElementType;
  target?: string | number;
}

export function MetricCard({
  label,
  current,
  previous,
  unit,
  icon: Icon,
  target,
}: MetricCardProps) {
  const currNum = typeof current === 'number' ? current : Number(current.replace(/[^0-9.-]/g, ''));
  const prevNum = previous
    ? typeof previous === 'number'
      ? previous
      : Number(previous.replace(/[^0-9.-]/g, ''))
    : null;
  const change =
    prevNum !== null && currNum !== null ? ((currNum - prevNum) / prevNum) * 100 : null;
  const isPositive = change !== null ? change >= 0 : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface p-5 transition-all hover:shadow-lg hover:border-brand/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-bold text-faint uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black font-mono mt-1">
            {current}
            {unit ?? ''}
          </p>
          {previous !== undefined && change !== null && (
            <p
              className={`mt-1 text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-ok-strong' : 'text-err-strong'}`}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {change >= 0 ? '+' : ''}
              {change.toFixed(1)}% عن الفترة السابقة
            </p>
          )}
          {target && (
            <p className="mt-1 text-2xs text-muted">
              الهدف: {target}
              {unit ?? ''}
            </p>
          )}
        </div>
        {Icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft/60 text-brand">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   AdaptiveGrid — شبكة متجاوبة تتكيف مع عدد العناصر وحجم الشاشة
   ════════════════════════════════════════════════════════════════════════════ */
export interface AdaptiveGridProps {
  children: React.ReactNode;
  cols?: { base?: number; sm?: number; lg?: number; xl?: number };
  gap?: string;
}

export function AdaptiveGrid({
  children,
  cols = { base: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'gap-4',
}: AdaptiveGridProps) {
  return (
    <div
      className={`grid ${gap} grid-cols-${cols.base ?? 1} sm:grid-cols-${cols.sm ?? 2} lg:grid-cols-${cols.lg ?? 3} xl:grid-cols-${cols.xl ?? 4}`}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   QuickActionChip — إجراء سريع مع أيقونة ونص وتأثير حركي
   ════════════════════════════════════════════════════════════════════════════ */
export interface QuickActionChipProps {
  label: string;
  hint?: string;
  icon?: React.ElementType;
  tone?: 'brand' | 'ok' | 'warn' | 'info';
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
}

export function QuickActionChip({
  label,
  hint,
  icon: Icon,
  tone = 'brand',
  onClick,
  disabled,
  badge,
}: QuickActionChipProps) {
  const toneClass = {
    brand: 'bg-brand hover:bg-brand/90 text-canvas border-brand/30',
    ok: 'bg-ok hover:bg-ok/90 text-canvas border-ok/30',
    warn: 'bg-warn hover:bg-warn/90 text-ink border-warn/30',
    info: 'bg-info hover:bg-info/90 text-ink border-info/30',
  }[tone];

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`w-full group relative overflow-hidden rounded-2xl border p-4 text-right transition-all duration-300 ${toneClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'border-hairline hover:border-current/50 hover:shadow-md hover:-translate-y-0.5'}`}
    >
      {badge && (
        <span className="absolute -top-1 -right-1 rounded-full bg-err-strong text-2xs font-bold px-1.5 py-0.5 z-10">
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="block truncate text-xs font-black text-ink group-hover:text-ink">{label}</p>
          {hint && <p className="mt-1 block truncate text-2xs text-faint">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-current/10 text-current group-hover:bg-current group-hover:text-canvas transition-all`}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   IntelligentSearchBar — شريط بحث ذكي مع اقتراحات وتنقل فوري
   ════════════════════════════════════════════════════════════════════════════ */
export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  onClick: () => void;
}

export interface IntelligentSearchBarProps {
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSearch?: (query: string) => void;
  onSelect?: (suggestion: SearchSuggestion) => void;
  value?: string;
}

export function IntelligentSearchBar({
  placeholder = 'ابحث عن أي شاشة أو أداة…',
  suggestions = [],
  onSearch,
  onSelect,
  value,
}: IntelligentSearchBarProps) {
  const [query, setQuery] = useState(value ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return suggestions.slice(0, 5);
    const q = query.trim().toLowerCase();
    return suggestions
      .filter(s => s.title.toLowerCase().includes(q) || s.subtitle?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query, suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch?.(query);
      setIsOpen(false);
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full bg-surface border border-hairline rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder-faint focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
        />
      </div>
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl">
          {filteredSuggestions.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect?.(s);
                s.onClick();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-brand-soft/30 transition-colors border-b border-hairline/50 last:border-b-0"
            >
              {s.icon && (
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface/50 text-muted">
                  <s.icon size={14} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-black text-ink truncate">{s.title}</p>
                {s.subtitle && <p className="text-2xs text-faint truncate">{s.subtitle}</p>}
              </div>
              <ArrowRight size={12} className="text-faint shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   StatusIndicator — مؤشر حالة تشغيلي مع تنبيه ذكي
   ════════════════════════════════════════════════════════════════════════════ */
export interface StatusIndicatorProps {
  label: string;
  status: StatusTone;
  value?: string | number;
  icon?: React.ElementType;
  onClick?: () => void;
}

export function StatusIndicator({
  label,
  status,
  value,
  icon: Icon,
  onClick,
}: StatusIndicatorProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${TONE_CLASSES[status]}
        ${onClick ? 'cursor-pointer hover:bg-current/10' : ''}`}
    >
      {Icon && (
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-current/20 text-current`}
        >
          <Icon size={12} />
        </div>
      )}
      <span className="text-ink">{label}</span>
      {value !== undefined && <span className="font-mono">{value}</span>}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ProfessionalTable — جدول احترافي مع تمرير افتراضي وتصنيف ذكي
   ════════════════════════════════════════════════════════════════════════════ */
export interface ProfessionalTableProps<T> {
  title: string;
  columns: Array<{ key: string; label: string; width?: string }>;
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  onExport?: () => void;
  stickyHeader?: boolean;
}

export function ProfessionalTable<T>({
  title,
  columns,
  data,
  renderRow,
  emptyMessage = 'لا بيانات بعد.',
  onExport,
  stickyHeader = true,
}: ProfessionalTableProps<T>) {
  return (
    <section className="surface-card overflow-hidden rounded-2xl border border-hairline shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-hairline p-4">
        <h3 className="text-sm font-black text-ink">{title}</h3>
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft/30"
          >
            <Download className="h-3.5 w-3.5" /> تصدير
          </button>
        )}
      </header>
      <div className="mobile-scroll-x overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead
            className={`bg-subtle text-faint border-b border-hairline uppercase tracking-wider ${stickyHeader ? 'sticky top-0 z-10' : ''}`}
          >
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`p-3 font-bold text-right ${col.width ? `w-[${col.width}]` : ''}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="p-3 text-center w-16">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/80">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={`${item}-${index}`} className="transition-colors hover:bg-hairline/40">
                  {renderRow(item, index)}
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-subtle hover:bg-brand-soft/50 text-muted hover:text-brand transition-colors"
                      aria-label="تعديل"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   AlertPanel — لوحة تنبيهات عملياتية مع إجراءات تصحيحية
   ════════════════════════════════════════════════════════════════════════════ */
export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  action?: { label: string; onClick: () => void };
}

export interface AlertPanelProps {
  alerts: AlertItem[];
  title?: string;
  onDismiss?: (id: string) => void;
}

export function AlertPanel({ alerts, title = 'تنبيهات تشغيلية', onDismiss }: AlertPanelProps) {
  const severityClass: Record<AlertItem['severity'], string> = {
    critical: 'bg-err-soft border-err/30 text-err-strong border-l-4 border-err-strong',
    warning: 'bg-warn-soft border-warn/30 text-warn-strong border-l-4 border-warn-strong',
    info: 'bg-info-soft border-info/30 text-info-strong border-l-4 border-info-strong',
  };

  const severityIcon: Record<AlertItem['severity'], React.ElementType> = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-black text-ink">{title}</h3>
      <div className="space-y-2">
        {alerts.map(alert => {
          const SeverityIcon = severityIcon[alert.severity];
          const action = alert.action;
          return (
            <div
              key={alert.id}
              className={`relative rounded-xl border p-3 transition-all ${severityClass[alert.severity]}`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${alert.severity === 'critical' ? 'bg-err-strong text-canvas' : alert.severity === 'warning' ? 'bg-warn-strong text-ink' : 'bg-info-strong text-canvas'}`}
                >
                  <SeverityIcon size={12} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-ink">{alert.title}</p>
                  <p className="text-2xs text-muted mt-0.5">{alert.message}</p>
                </div>
                {action && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    className="mt-1 inline-flex items-center gap-1 rounded-lg border border-current px-2 py-1 text-xs font-bold text-current hover:bg-current/10 transition"
                  >
                    <Plus size={12} aria-hidden="true" /> {action.label}
                  </button>
                )}
              </div>
              {onDismiss && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDismiss(alert.id);
                  }}
                  className="absolute top-2 right-2 p-1 text-faint hover:text-ink"
                  aria-label="إغلاق التنبيه"
                >
                  <Bell size={14} className="text-current" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   لوحة ألوان الرسوم من التوكنز
   ════════════════════════════════════════════════════════════════════════════ */
export const ENTERPRISE_PALETTE = [
  'var(--t-brand, #0070F2)',
  'var(--t-ok)',
  'var(--t-warn)',
  'var(--t-brand)',
  'var(--t-err)',
  'var(--t-ok)',
] as const;

/* ════════════════════════════════════════════════════════════════════════════
   SmartImportButton — زر استيراد ذكي موحّد (CSV/Excel/JSON) عبر مركز الاستيراد
   ════════════════════════════════════════════════════════════════════════════ */
export interface SmartImportButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function SmartImportButton({
  onClick,
  label = 'استيراد ذكي',
  disabled = false,
}: SmartImportButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs font-bold text-brand hover:bg-brand-soft/30 hover:border-brand/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Upload size={13} aria-hidden="true" /> {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BulkActionBar — شريط العمليات الجماعية: يجعل الحجم والحد الظاهر حقيقيّين
   ════════════════════════════════════════════════════════════════════════════ */
export interface BulkActionBarProps {
  total: number;
  selected: number;
  limit: number;
}

export function BulkActionBar({ total, selected, limit }: BulkActionBarProps) {
  const overLimit = total > limit;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
        overLimit
          ? 'border-warn/30 bg-warn-soft/40 text-warn-strong'
          : 'border-hairline bg-subtle text-muted'
      }`}
    >
      <span>
        الإجمالي <span className="font-mono">{total}</span> سطراً
        {overLimit && (
          <>
            {' '}
            — المعروض <span className="font-mono">{limit}</span> فقط
          </>
        )}
      </span>
      <span aria-hidden="true" className="text-faint">
        •
      </span>
      <span>
        المحدد <span className="font-mono">{selected}</span>
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   OpsNote — ملاحظة تشغيلية دلالية (خطأ/تحذير/سليم/معلومة)
   ════════════════════════════════════════════════════════════════════════════ */
export type OpsNoteKind = 'err' | 'warn' | 'ok' | 'info';

export interface OpsNoteProps {
  kind: OpsNoteKind;
  title: string;
  children?: React.ReactNode;
}

const OPS_NOTE_STYLE: Record<OpsNoteKind, { wrap: string; icon: React.ElementType }> = {
  err: { wrap: 'border-err/30 bg-err-soft/40 text-err-strong', icon: AlertCircle },
  warn: { wrap: 'border-warn/30 bg-warn-soft/40 text-warn-strong', icon: AlertTriangle },
  ok: { wrap: 'border-ok/30 bg-ok-soft/40 text-ok-strong', icon: CheckCircle2 },
  info: { wrap: 'border-info/30 bg-info-soft/40 text-info-strong', icon: Info },
};

export function OpsNote({ kind, title, children }: OpsNoteProps) {
  const { wrap, icon: Icon } = OPS_NOTE_STYLE[kind];
  return (
    <div className={`rounded-xl border p-3 text-xs ${wrap}`}>
      <p className="flex items-center gap-1.5 font-black">
        <Icon size={13} aria-hidden="true" /> {title}
      </p>
      {children && <div className="mt-1.5 text-xs opacity-90 space-y-1">{children}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SmartStatus — حالة مستند موحّدة: تسمية عربية + لون دلالي من كلمة الحالة
   ════════════════════════════════════════════════════════════════════════════ */
export interface SmartStatusProps {
  status: string;
  labels?: Record<string, string>;
  dot?: boolean;
}

const OK_STATUSES = new Set([
  'approved',
  'matched',
  'passed',
  'active',
  'posted',
  'received',
  'closed',
  'ok',
  'complete',
  'completed',
]);
const WARN_STATUSES = new Set([
  'pending',
  'pending_match',
  'pending_approval',
  'partially_received',
  'conditional',
  'qty_mismatch',
  'price_mismatch',
  'tax_mismatch',
  'overshipment',
  'scheduled',
  'warn',
]);
const ERR_STATUSES = new Set([
  'cancelled',
  'rejected',
  'failed',
  'DISPUTED',
  'unmatched',
  'err',
  'void',
  'reversed',
]);
const INFO_STATUSES = new Set(['sent', 'submitted', 'info', 'in_progress', 'processing']);
const NEUTRAL_STATUSES = new Set(['draft', 'new', 'open', 'neutral']);

/** Maps a document status keyword to a semantic tone. Unknown → info. */
export function toneForStatus(status: string): StatusTone {
  if (OK_STATUSES.has(status)) return 'ok';
  if (WARN_STATUSES.has(status)) return 'warn';
  if (ERR_STATUSES.has(status)) return 'err';
  if (INFO_STATUSES.has(status)) return 'info';
  if (NEUTRAL_STATUSES.has(status)) return 'neutral';
  return 'info';
}

export function SmartStatus({ status, labels, dot = true }: SmartStatusProps) {
  const Icon = STATUS_ICONS[status];
  return (
    <StatusBadge tone={toneForStatus(status)} dot={dot}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {labels?.[status] ?? status}
    </StatusBadge>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ExportMenu — قائمة تنزيل منسدلة: زر واحد يكشف الخيارات مع شرح كل خيار
   ════════════════════════════════════════════════════════════════════════════ */
export interface ExportOption {
  id: string;
  label: string;
  hint: string;
  onSelect: () => void;
}

export interface ExportMenuProps {
  label?: string;
  options: ExportOption[];
}

export function ExportMenu({ label = 'تنزيل', options }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs font-bold text-brand hover:bg-brand-soft/30 transition-colors"
      >
        <Download size={13} aria-hidden="true" /> {label}
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-1 w-64 overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl"
        >
          {options.map(opt => (
            <button
              key={opt.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                opt.onSelect();
              }}
              className="w-full border-b border-hairline/50 px-3 py-2.5 text-right transition-colors last:border-b-0 hover:bg-brand-soft/30"
            >
              <p className="text-xs font-black text-ink">{opt.label}</p>
              <p className="mt-0.5 text-2xs text-muted">{opt.hint}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
