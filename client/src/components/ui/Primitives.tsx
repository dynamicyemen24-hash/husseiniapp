import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Inbox } from 'lucide-react';
import './cyber-card.css';

/* Utility to combine class names */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ------------------------------ Page shell ------------------------------ */
export const ScreenHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle: string;
  accent?: string;
  actions?: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, actions }) => (
  <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h1
          className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl"
          title={title}
        >
          {title}
        </h1>
        <p className="mt-1 text-xs text-muted sm:mt-1.5 sm:text-sm">{subtitle}</p>
      </div>
    </div>
    {actions && (
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        {actions}
      </div>
    )}
  </div>
);

export const Pill: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = 'bg-subtle text-muted border-hairline',
}) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tone}`}>{children}</span>
);

/* ------------------------------ Async states ---------------------------- */
export const StandardProgress: React.FC<{
  label?: string;
  detail?: string;
  value?: number;
  tone?: 'brand' | 'amber' | 'rose';
}> = ({
  label = 'جارٍ تجهيز بيئة العمل…',
  detail = 'يتم تحميل البيانات دون تعطيل الشاشة',
  value,
  tone = 'brand',
}) => {
  const bar = tone === 'rose' ? 'bg-err-500' : tone === 'amber' ? 'bg-warn-500' : 'bg-brand-600';
  return (
    <div
      className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{label}</p>
          <p className="mt-1 text-xs text-muted truncate">{detail}</p>
        </div>
        <Loader2 className="shrink-0 animate-spin text-brand" size={18} aria-hidden="true" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bar} ${value === undefined ? 'w-2/5 animate-pulse' : ''}`}
          style={
            value === undefined ? undefined : { width: `${Math.max(0, Math.min(100, value))}%` }
          }
        />
      </div>
      {value !== undefined && (
        <p className="mt-1 text-end text-2xs text-faint text-numeric">{Math.round(value)}%</p>
      )}
    </div>
  );
};

export const Loading: React.FC<{ label?: string }> = ({ label = 'جارٍ التحميل…' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-muted">
    <Loader2 className="animate-spin" size={22} />
    <span className="text-sm">{label}</span>
  </div>
);

/**
 * الهيكل العظمي لفتح الشاشة — بديل «التحميل الدائر» التقليدي.
 *
 * A spinner only says "wait". A skeleton SAYS WHAT IS COMING: a title bar,
 * KPI cards, then a table — the exact shape the lazy screen will paint. The
 * operator's eye settles on the layout instead of staring at a circle, and
 * arrival feels instant because the frame was already on screen. Every bar
 * is decorative (`aria-hidden`); the container carries the polite status text
 * so assistive tech hears one line, not a pulse.
 */
export const ScreenSkeleton: React.FC<{ detail?: string }> = ({
  detail = 'تُفتح الشاشة دون تعطيل بقية جلساتك',
}) => (
  <div className="w-full space-y-3" role="status" aria-live="polite" aria-busy="true">
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-44 max-w-[45%] rounded-lg bg-subtle animate-pulse" />
        <div className="h-3 w-28 rounded bg-subtle/60 animate-pulse" />
      </div>
      <div className="h-9 w-28 shrink-0 rounded-xl bg-subtle animate-pulse" />
    </div>
    {detail && <p className="text-2xs text-faint">{detail}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map(n => (
        <div
          key={n}
          className="rounded-2xl border border-hairline bg-surface p-4 space-y-2"
          aria-hidden="true"
        >
          <div className="h-3 w-16 rounded bg-subtle animate-pulse" />
          <div className="h-7 w-24 rounded-lg bg-subtle animate-pulse" />
        </div>
      ))}
    </div>
    <div
      className="overflow-hidden rounded-2xl border border-hairline bg-surface"
      aria-hidden="true"
    >
      <div className="h-10 border-b border-hairline bg-subtle/40 animate-pulse" />
      {[0, 1, 2, 3, 4].map(n => (
        <div
          key={n}
          className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0"
        >
          <div
            className="h-3 rounded bg-subtle animate-pulse"
            style={{ width: `${40 - n * 5}%` }}
          />
          <div className="ms-auto h-3 w-12 rounded bg-subtle/60 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
    <AlertCircle className="text-err" size={34} />
    <p className="text-err-strong text-sm font-medium max-w-md">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 px-5 py-2 bg-ink text-surface hover:opacity-85 rounded-xl text-xs font-bold transition-opacity"
      >
        إعادة المحاولة
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  message: string;
  action?: React.ReactNode;
}> = ({ message, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-faint">
    <Inbox size={34} />
    <p className="text-sm text-muted">{message}</p>
    {action}
  </div>
);

export const Toast: React.FC<{
  kind: 'ok' | 'err';
  message: string;
  onClose: () => void;
}> = ({ kind, message, onClose }) => (
  <div
    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl elev-2 border text-sm font-bold max-w-lg ${
      kind === 'ok'
        ? 'bg-surface border-hairline text-ink'
        : 'bg-err-soft border-err/30 text-err-strong'
    }`}
    role="status"
  >
    {kind === 'ok' ? (
      <CheckCircle2 size={18} className="text-brand" />
    ) : (
      <AlertCircle size={18} className="text-err" />
    )}
    <span>{message}</span>
    <button
      onClick={onClose}
      className="text-faint hover:text-ink text-lg leading-none"
      aria-label="إغلاق"
    >
      ×
    </button>
  </div>
);

/* ------------------------------ Form parts ------------------------------ */
const fieldBase =
  'w-full bg-surface border border-hairline rounded-xl px-3.5 py-2.5 text-sm ' +
  'text-ink placeholder-faint outline-none transition ' +
  'focus:border-brand focus:ring-2 focus:ring-brand/20';

export const Field: React.FC<{
  label?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}> = ({ label, children, hint, className = '' }) => (
  <label className={`block space-y-1.5 ${className}`.trim()}>
    {label && <span className="block text-xs font-bold text-muted">{label}</span>}
    {children}
    {hint && <span className="block text-xs text-faint">{hint}</span>}
  </label>
);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(fieldBase, className)} />
);

export const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn(fieldBase, 'min-h-[80px] resize-y', className)} />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn(fieldBase, className)} />
);

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

export const SearchableSelect: React.FC<{
  value?: string | number | null;
  onChange?: (value: any) => void;
  options?: SearchableSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}> = ({ value, onChange, options = [], placeholder, className, disabled }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const selected = options.find(o => String(o.value) === String(value ?? ''));
  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={rootRef} className={`relative ${className ?? 'w-full'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${fieldBase} flex items-center justify-between text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className={selected ? 'text-ink' : 'text-faint'}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        <span className="text-muted text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-hairline bg-surface shadow-lg">
          <div className="p-2 border-b border-hairline">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="..."
              className={fieldBase}
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-xs text-muted">—</li>}
            {filtered.map(o => (
              <li
                key={String(o.value)}
                onClick={() => {
                  onChange?.(o.value);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-subtle ${String(o.value) === String(value ?? '') ? 'bg-subtle font-bold' : ''}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  }
> = ({ className = '', loading = false, disabled, children, size = 'md', ...rest }) => {
  const sizeClass =
    size === 'xs'
      ? 'px-2.5 py-1 text-xs'
      : size === 'sm'
        ? 'px-3 py-1.5 text-xs'
        : size === 'lg'
          ? 'px-6 py-3 text-base'
          : size === 'xl'
            ? 'px-8 py-4 text-lg'
            : 'px-5 py-2.5 text-sm';
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      className={`${sizeClass} bg-brand-600 hover:bg-brand-500 disabled:opacity-50
      disabled:cursor-not-allowed text-ink rounded-xl font-bold
      transition-all inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${className}`}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
        />
      )}
      {children}
    </button>
  );
};

export const GhostButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }
> = ({ className = '', size = 'md', ...rest }) => {
  const sizeClass =
    size === 'xs'
      ? 'px-2.5 py-1 text-xs'
      : size === 'sm'
        ? 'px-3 py-1.5 text-xs'
        : size === 'lg'
          ? 'px-6 py-3 text-base'
          : size === 'xl'
            ? 'px-8 py-4 text-lg'
            : 'px-4 py-2.5 text-sm';
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={`${sizeClass} bg-subtle hover:bg-hairline/60 text-ink border border-hairline
      rounded-xl font-bold transition-colors inline-flex items-center
      gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}
    />
  );
};

/* ---------------------------- Dialog layer ------------------------------ */
/*
 * Shared keyboard & focus contract for every modal surface, following the
 * SAP Fiori `sap.m.Dialog` rules:
 *
 *   1. Focus enters the dialog when it opens — the first control in the BODY,
 *      never the close button. A focused "×" makes Enter discard the form the
 *      operator just filled, which is the worst possible default.
 *   2. Tab cannot leave the panel. The trap also catches focus that starts
 *      OUTSIDE and pulls it back, so controls behind the backdrop stay
 *      unreachable by keyboard.
 *   3. Escape dismisses the TOPMOST layer only. `openDialogs` orders every
 *      live dialog, so a confirmation over an edit form closes the confirm
 *      and leaves the form standing.
 *   4. Focus returns to the control that opened the dialog, so keyboard
 *      operators continue where they were instead of restarting at the top.
 *   5. The page behind stops scrolling while a dialog is up, with the
 *      scrollbar width compensated — otherwise the content jumps sideways on
 *      Windows, where scrollbars are not overlay-class.
 *
 * Escape is handled on `document` (bubble phase), which runs BEFORE the
 * shell's `window` listeners in App.tsx — and `stopPropagation` there stops
 * them. Before this layer existed, pressing Escape inside an open dialog also
 * closed the workbench session or the overlay underneath it.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Visible focusables only — hidden rows and collapsed panels don't count. */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => el.getClientRects().length > 0
  );
}

/* Every open dialog, oldest first; the last entry is the topmost layer. */
const openDialogs: number[] = [];
let dialogSeq = 0;

/**
 * Shared keyboard & focus layer for modal surfaces.
 *
 * `Modal` and `ConfirmDialog` below use it internally. Custom overlays that
 * render their own backdrop+panel markup (dialogs written before this layer
 * existed) can adopt it without touching their DOM: pass the open flag, the
 * close callback, and a ref on the PANEL element — the hook adds Escape,
 * the Tab trap, initial focus, focus restore and the scroll lock.
 * The panel needs `tabIndex={-1}` so it can hold focus itself.
 */
export function useDialogLayer(opts: {
  open: boolean;
  onClose: () => void;
  /** Panel the trap bounds. Carries tabIndex=-1 so it can hold focus itself. */
  panelRef: React.RefObject<HTMLElement | null>;
  /** Region whose first visible control receives focus on open (the body). */
  contentRef?: React.RefObject<HTMLElement | null>;
  /** Explicit autofocus target; wins over `contentRef` (ConfirmDialog). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}): void {
  const { open, onClose, panelRef, contentRef, initialFocusRef } = opts;

  // The layer must depend on `open` alone. Callers pass inline arrows for
  // onClose; listing it in the deps would restart the effect on every render
  // and yank focus back to the first field while the operator is typing.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;

    const token = (dialogSeq += 1);
    openDialogs.push(token);
    const isTopmost = () => openDialogs[openDialogs.length - 1] === token;

    // The control that opened the dialog — focus returns to it on close.
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Freeze the page behind, compensating the scrollbar so nothing shifts.
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`;

    const explicit = initialFocusRef?.current;
    const inContent = contentRef?.current ? focusableWithin(contentRef.current)[0] : null;
    (explicit ?? inContent ?? panelRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isTopmost()) return; // a layer above us owns this Escape
        e.stopPropagation(); // …and it never reaches the shell's window listeners
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusableWithin(panel);
      if (items.length === 0) {
        e.preventDefault(); // nothing focusable — keep focus on the panel
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && panel.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const at = openDialogs.indexOf(token);
      if (at >= 0) openDialogs.splice(at, 1);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      // Back to the trigger when it still exists; a row deleted behind the
      // dialog leaves focus wherever the browser puts it.
      if (trigger && document.contains(trigger)) trigger.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `open` by design
  }, [open]);
}

/* ------------------------------- Modal ---------------------------------- */
export const Modal: React.FC<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  /** Optional pixel cap on the panel width. Defaults to the `max-w-2xl` base. */
  width?: number;
  /**
   * Accepted for parity with dialog APIs that defer unmounting. This Modal
   * already returns null while closed, so the content is never mounted between
   * opens and no state survives a reopen — the flag is a documented no-op.
   */
  destroyOnClose?: boolean;
  children: React.ReactNode;
}> = ({ open, title, description, onClose, width, destroyOnClose, children }) => {
  void destroyOnClose;
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = `dlg-${useId().replace(/[^a-zA-Z0-9-_]/g, '')}`;
  const descId = description ? `${titleId}-desc` : undefined;
  // Escape, Tab-trap, initial focus and focus restore: see useDialogLayer.
  useDialogLayer({ open, onClose, panelRef, contentRef });

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-subtle backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl focus:outline-none sm:max-h-[calc(100dvh-4rem)]"
        style={width ? { maxWidth: `min(${width}px, calc(100vw - 1.5rem))` } : undefined}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hairline px-4 py-3 sm:px-5 sm:py-4">
          <h3 id={titleId} className="min-w-0 truncate text-base font-semibold text-ink">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-2xl leading-none text-faint transition-colors hover:bg-subtle hover:text-ink"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------- ConfirmDialog ---------------------------- */
/* Accessible confirmation for destructive actions.
 *
 * Every admin screen used the browser's native `confirm()` before this
 * existed: unstyled, not themeable, not announced as an alert by screen
 * readers, and blocking the main thread. A till operator deleting an
 * appointment should get the same themed, keyboard-dismissible confirmation
 * the rest of the product uses. Escape cancels, and the confirm action is
 * autofocused so destroying data always costs one deliberate keystroke more
 * than the operator already spent to open it.
 */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'err' | 'brand';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  tone = 'err',
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape cancels (topmost layer only — see useDialogLayer), focus starts on
  // the confirm action so destroying data costs one deliberate keystroke more
  // than opening the dialog did, and Tab is trapped inside the panel.
  useDialogLayer({ open, onClose: onCancel, panelRef: dialogRef, initialFocusRef: confirmRef });

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-subtle backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md surface-card elev-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 focus:outline-none"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? 'confirm-dialog-desc' : undefined}
      >
        <div className="p-5 space-y-3">
          <h3
            id="confirm-dialog-title"
            className="text-base font-semibold text-ink flex items-center gap-2"
          >
            <AlertCircle size={18} className={tone === 'err' ? 'text-err' : 'text-brand'} />
            {title}
          </h3>
          {message && (
            <p id="confirm-dialog-desc" className="text-sm text-muted leading-relaxed">
              {message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-hairline bg-subtle/40">
          <GhostButton type="button" onClick={onCancel}>
            {cancelLabel}
          </GhostButton>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2 ${
              tone === 'err' ? 'bg-err hover:brightness-110' : 'bg-brand-600 hover:bg-brand-500'
            } text-ink`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------- Layout helpers ---------------------------- */
export const Stat: React.FC<{
  label: string;
  value: string;
  tone?: string;
  icon?: React.ElementType;
  /**
   * Opt into the active-sector pulse glow. Kept opt-in because most stats are
   * ordinary tiles; the administrative surfaces are where the identity earns
   * the motion.
   */
  cyber?: boolean;
  className?: string;
}> = ({ label, value, tone = 'text-ink', icon: Icon, cyber = false, className = '' }) => (
  <div className={cn('surface-card p-4', cyber && 'cyber-card', className)}>
    <div className="flex items-center gap-2 text-faint text-xs font-bold mb-1.5">
      {Icon && <Icon size={14} />}
      {label}
    </div>
    <p className={`text-2xl font-semibold text-numeric tracking-tight ${tone}`}>{value}</p>
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** Opt into the active-sector pulse glow (administrative card surfaces). */
  cyber?: boolean;
}> = ({ children, className = '', onClick, cyber = false }) => (
  <div className={cn('surface-card p-5', cyber && 'cyber-card', className)} onClick={onClick}>
    {children}
  </div>
);

/* --------------------------- Status semantics --------------------------- */
/* Fiori ObjectStatus + Fluent Badge + Redwood pattern, theme-token driven. */
export type StatusTone = 'ok' | 'warn' | 'err' | 'info' | 'brand' | 'neutral';

const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  ok: 'bg-ok-soft text-ok-strong border-ok/30',
  warn: 'bg-warn-soft text-warn-strong border-warn/30',
  err: 'bg-err-soft text-err-strong border-err/30',
  info: 'bg-info-soft text-info-strong border-info/30',
  brand: 'bg-brand-soft text-brand-strong border-brand/30',
  neutral: 'bg-subtle text-muted border-hairline',
};

export const StatusBadge: React.FC<{
  tone?: StatusTone;
  dot?: boolean;
  label?: string;
  children?: React.ReactNode;
}> = ({ tone = 'neutral', dot = false, label, children }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_TONE_CLASS[tone]}`}
  >
    {dot && (
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${
          tone === 'ok'
            ? 'bg-ok'
            : tone === 'warn'
              ? 'bg-warn'
              : tone === 'err'
                ? 'bg-err'
                : tone === 'info'
                  ? 'bg-info'
                  : tone === 'brand'
                    ? 'bg-brand'
                    : 'bg-faint'
        }`}
      />
    )}
    {label ?? children}
  </span>
);

/* ------------------------------ Skeletons ------------------------------- */
/* Content-shaped loading: reserves layout so first paint never jumps. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded-lg bg-subtle border border-hairline ${className}`}
  />
);

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2.5" role="status" aria-label="جارٍ تحميل البيانات">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-11 w-full" />
    ))}
  </div>
);

export const SkeletonCards: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div
    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    role="status"
    aria-label="جارٍ تحميل البيانات"
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="surface-card p-4 space-y-3">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-7 w-4/5" />
      </div>
    ))}
  </div>
);

/* ------------------------------ SearchField ----------------------------- */
/* Fiori SearchField: debounced-ready input with clear action + kbd hint. */
export const SearchField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  kbd?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, placeholder = 'بحث…', kbd, autoFocus }) => (
  <div className="relative">
    <svg
      aria-hidden="true"
      className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
    <input
      type="search"
      value={value}
      autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full bg-surface border border-hairline rounded-xl ps-9 pe-16 py-2.5 text-sm text-ink placeholder-faint outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="مسح البحث"
        className="absolute end-9 top-1/2 -translate-y-1/2 w-5 h-5 grid place-items-center rounded-full text-faint hover:text-ink hover:bg-subtle transition-colors"
      >
        ×
      </button>
    )}
    {kbd && (
      <kbd className="absolute end-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-hairline bg-subtle text-2xs font-mono text-faint">
        {kbd}
      </kbd>
    )}
  </div>
);

/* ------------------------------- MessageStrip ---------------------------- */
/* Fiori MessageStrip: inline semantic notice with optional dismiss. */
export const MessageStrip: React.FC<{
  tone?: StatusTone;
  title?: string;
  onDismiss?: () => void;
  children: React.ReactNode;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  className?: string;
}> = ({ tone = 'info', title, onDismiss, children, role = 'status', 'aria-live': ariaLive = 'polite', className = '' }) => {
  const wrap: Record<StatusTone, string> = {
    ok: 'bg-ok-soft border-ok/30 text-ok-strong',
    warn: 'bg-warn-soft border-warn/30 text-warn-strong',
    err: 'bg-err-soft border-err/30 text-err-strong',
    info: 'bg-info-soft border-info/30 text-info-strong',
    brand: 'bg-brand-soft border-brand/30 text-brand-strong',
    neutral: 'bg-subtle border-hairline text-muted',
  };
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-base ${wrap[tone]} ${className}`.trim()}
      role={role}
      aria-live={ariaLive}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold mb-0.5">{title}</p>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق التنبيه"
          className="shrink-0 w-6 h-6 grid place-items-center rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 transition"
        >
          ×
        </button>
      )}
    </div>
  );
};

/* --------------------------------- Tabs --------------------------------- */
/* Segmented tab bar: roving single-select with aria-selected semantics. */
export const Tabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div
    className="inline-flex items-center gap-1 p-1 rounded-xl bg-subtle border border-hairline"
    role="tablist"
    aria-label="تبويبات العرض"
  >
    {tabs.map(t => {
      const selected = t.id === active;
      return (
        <button
          key={t.id}
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(t.id)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-base font-bold transition-all ${
            selected
              ? 'bg-surface text-ink shadow-sm border border-hairline'
              : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`px-1.5 py-px rounded-md text-2xs font-mono ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-surface text-faint border border-hairline'}`}
            >
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

﻿/* ---------------------------- Form layout ------------------------------- */
export const FormSection: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = '',
}) => (
  <fieldset className={`space-y-3 ${className}`.trim()}>
    {title && <legend className="text-xs font-black text-muted mb-2 px-1">{title}</legend>}
    {children}
  </fieldset>
);

/* ---------------------------- View modes ------------------------------- */
export type ViewMode = 'list' | 'grid' | 'kanban' | 'timeline';

export const ViewModeSwitcher: React.FC<{
  value: ViewMode;
  onChange: (m: ViewMode) => void;
  modes?: ViewMode[];
  className?: string;
}> = ({ value, onChange, modes = ['list', 'grid'], className = '' }) => {
  const labels: Record<ViewMode, string> = {
    list: 'قائمة',
    grid: 'شبكة',
    kanban: 'كانبان',
    timeline: 'خط زمني',
  };
  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl bg-subtle border border-hairline ${className}`} role="tablist" aria-label="وضع العرض">
      {modes.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${active ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {labels[m]}
          </button>
        );
      })}
    </div>
  );
};
/* Re-export Tooltip primitive so callers can import from the Primitives barrel. */
export { Tooltip } from './primitives/Tooltip';
export type { TooltipProps } from './primitives/Tooltip';

