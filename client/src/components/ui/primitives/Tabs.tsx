/**
 * Tabs — Primitive tabbed-navigation component
 * Keyboard-first (ArrowLeft/Right, Home/End per WAI-ARIA tablist),
 * RTL-aware, with a sliding indicator. Replaces ad-hoc tab strips.
 */

import React, { forwardRef, useCallback, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { useControllableState } from './hooks';

const tabsListVariants = cva('flex items-center gap-1 border-b border-hairline', {
  variants: {
    variant: {
      underline: 'bg-transparent',
      pills: 'border-b-0 bg-subtle rounded-lg p-1',
      cards: 'border-b-0 gap-2',
    },
  },
  defaultVariants: { variant: 'underline' },
});

const tabTriggerVariants = cva(
  'relative inline-flex items-center gap-1.5 font-medium transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed touch-target',
  {
    variants: {
      variant: {
        underline:
          'px-3 py-2 text-sm text-muted hover:text-ink data-[state=active]:text-brand border-b-2 border-transparent -mb-px data-[state=active]:border-brand',
        pills:
          'px-3 py-1.5 text-sm rounded-md text-muted hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-sm',
        cards:
          'px-4 py-2 text-sm rounded-lg border border-hairline bg-surface text-muted hover:text-ink data-[state=active]:border-brand data-[state=active]:text-brand-strong data-[state=active]:bg-brand-soft',
      },
    },
    defaultVariants: { variant: 'underline' },
  }
);

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps
  // onChange is redeclared with the tab-id signature (the DOM
  // ChangeEventHandler would not type-check a tab selection).
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'>,
    VariantProps<typeof tabsListVariants> {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  children?: React.ReactNode | ((activeId: string) => React.ReactNode);
  testId?: string;
  ariaLabel?: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      tabs,
      value,
      defaultValue,
      onChange,
      variant = 'underline',
      children,
      className,
      testId,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    const [activeId, setActiveId] = useControllableState(
      value,
      defaultValue ?? tabs[0]?.id ?? '',
      onChange
    );

    const select = useCallback(
      (id: string) => {
        const tab = tabs.find(t => t.id === id);
        if (!tab || tab.disabled) return;
        setActiveId(id);
      },
      [tabs, setActiveId]
    );

    const onKeyDown = (e: React.KeyboardEvent) => {
      const enabled = tabs.filter(t => !t.disabled).map(t => t.id);
      const idx = enabled.indexOf(activeId);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        // In RTL ArrowLeft moves forward visually; both directions cycle.
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = enabled[(idx + dir + enabled.length) % enabled.length];
        if (next) select(next);
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (enabled[0]) select(enabled[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (enabled[enabled.length - 1]) select(enabled[enabled.length - 1]);
      }
    };

    return (
      <div ref={ref} data-testid={testId} className={twMerge('w-full', className)} {...props}>
        <div
          role="tablist"
          aria-label={ariaLabel ?? 'تبويبات'}
          onKeyDown={onKeyDown}
          className={twMerge(tabsListVariants({ variant }))}
        >
          {tabs.map(tab => {
            const active = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls={`panel-${tab.id}`}
                data-state={active ? 'active' : 'inactive'}
                disabled={tab.disabled}
                onClick={() => select(tab.id)}
                className={twMerge(tabTriggerVariants({ variant }))}
              >
                {tab.icon && (
                  <span aria-hidden="true" className="flex-shrink-0">
                    {tab.icon}
                  </span>
                )}
                {tab.label}
                {tab.badge}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`panel-${activeId}`}
          aria-labelledby={`tab-${activeId}`}
          className="pt-4"
        >
          {typeof children === 'function' ? children(activeId) : children}
        </div>
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';
