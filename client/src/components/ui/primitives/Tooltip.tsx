/**
 * Tooltip — Primitive hint + popover component
 * Hover/focus hint for icon buttons and dense POS affordances.
 * Popover export covers sheets/menus that need Escape + outside-click
 * dismissal. Touch devices get focus-triggered hints (hover is never
 * the only path — DESIGN.md).
 */

import React, {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useState,
  useRef,
  useEffect,
  useId,
  type HTMLAttributes,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Portal } from './Portal';

const tooltipVariants = cva(
  'z-[800] max-w-xs rounded-md border border-hairline bg-ink px-2.5 py-1.5 text-xs text-surface shadow-lg',
  {
    variants: {
      side: {
        top: 'mb-2',
        bottom: 'mt-2',
        left: 'me-2',
        right: 'ms-2',
      },
    },
    defaultVariants: { side: 'top' },
  }
);

export interface TooltipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'>, VariantProps<typeof tooltipVariants> {
  content: React.ReactNode;
  children: React.ReactElement;
  delayMs?: number;
  testId?: string;
  /**
   * Classes for the wrapper element that hugs the trigger. Defaults to
   * `inline-flex`, which is right for an icon button. A full-width row passes
   * `block w-full` (or `flex w-full`) so the hovering area matches the row the
   * user actually reads, and the hint is not limited to one icon.
   */
  wrapperClassName?: string;
}

type Side = 'top' | 'bottom' | 'left' | 'right';

/** Distance between the trigger and the bubble, in px. */
const GAP = 8;
/** Minimum distance the bubble keeps from the window edge, in px. */
const EDGE = 8;

/**
 * Resolves the side the bubble actually renders on.
 *
 * The requested side is honoured when the bubble fits; otherwise it flips to
 * the opposite side, and finally falls back to the roomier vertical side. A
 * hint that hangs off the top of the viewport is the same defect as no hint —
 * the operator reads a clipped paragraph and stops trusting it.
 */
function resolveSide(anchor: DOMRect, w: number, h: number, requested: Side): Side {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fits: Record<Side, boolean> = {
    top: anchor.top - h - GAP >= EDGE,
    bottom: anchor.bottom + h + GAP <= vh - EDGE,
    left: anchor.left - w - GAP >= EDGE,
    right: anchor.right + w + GAP <= vw - EDGE,
  };
  if (fits[requested]) return requested;
  const opposite: Record<Side, Side> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  if (fits[opposite[requested]]) return opposite[requested];
  // Neither side has room (a trigger in a very short viewport): prefer the
  // side with the most space rather than clipping both.
  const vertical = anchor.top >= vh - anchor.bottom ? 'top' : 'bottom';
  return requested === 'top' || requested === 'bottom'
    ? vertical
    : fits[requested]
      ? requested
      : vertical;
}

/** Fixed-position coordinates for the resolved side, clamped into the window. */
function coordinates(anchor: DOMRect, w: number, h: number, side: Side) {
  let left: number;
  let top: number;
  if (side === 'top' || side === 'bottom') {
    left = anchor.left + anchor.width / 2 - w / 2;
    top = side === 'top' ? anchor.top - h - GAP : anchor.bottom + GAP;
  } else {
    left = side === 'left' ? anchor.left - w - GAP : anchor.right + GAP;
    top = anchor.top + anchor.height / 2 - h / 2;
  }
  const maxLeft = Math.max(EDGE, window.innerWidth - w - EDGE);
  const maxTop = Math.max(EDGE, window.innerHeight - h - EDGE);
  return {
    left: Math.min(Math.max(left, EDGE), maxLeft),
    top: Math.min(Math.max(top, EDGE), maxTop),
  };
}

export const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(
  (
    {
      content,
      children,
      side = 'top',
      delayMs = 200,
      className,
      testId,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
    const timer = useRef<number | null>(null);
    const anchorRef = useRef<HTMLSpanElement | null>(null);
    const bubbleRef = useRef<HTMLSpanElement | null>(null);
    const id = useId();

    const show = useCallback(() => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOpen(true), delayMs);
    }, [delayMs]);

    const hide = useCallback(() => {
      if (timer.current) window.clearTimeout(timer.current);
      setOpen(false);
      setCoords(null);
    }, []);

    useEffect(
      () => () => {
        if (timer.current) window.clearTimeout(timer.current);
      },
      []
    );

    /*
     * Position the bubble against the trigger, not the page.
     *
     * The bubble is portalled to `document.body` so no `overflow: hidden`
     * ancestor can clip it, which also means it must be placed explicitly:
     * `position: fixed` plus the trigger's viewport rect. The measuring pass
     * renders the bubble hidden (visibility) so a tooltip never flashes at the
     * top-left corner before it lands.
     */
    useLayoutEffect(() => {
      if (!open) return;
      const place = () => {
        const anchor = anchorRef.current;
        const bubble = bubbleRef.current;
        if (!anchor) return;
        const a = anchor.getBoundingClientRect();
        const b = bubble?.getBoundingClientRect();
        const w = b?.width || 240;
        const h = b?.height || 32;
        const resolved = resolveSide(a, w, h, side ?? 'top');
        setCoords(coordinates(a, w, h, resolved));
      };
      place();
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      return () => {
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
      };
    }, [open, side, content]);

    const child = React.isValidElement(children)
      ? React.cloneElement(
          children as React.ReactElement<{
            'aria-describedby'?: string;
            onMouseEnter?: (e: unknown) => void;
            onMouseLeave?: () => void;
            onFocus?: (e: unknown) => void;
            onBlur?: () => void;
          }>,
          {
            'aria-describedby': open ? id : undefined,
            onMouseEnter: (e: unknown) => {
              (
                children as React.ReactElement<{ onMouseEnter?: (e: unknown) => void }>
              ).props.onMouseEnter?.(e);
              show();
            },
            onMouseLeave: () => {
              (
                children as React.ReactElement<{ onMouseLeave?: () => void }>
              ).props.onMouseLeave?.();
              hide();
            },
            onFocus: (e: unknown) => {
              (children as React.ReactElement<{ onFocus?: (e: unknown) => void }>).props.onFocus?.(
                e
              );
              setOpen(true);
            },
            onBlur: () => {
              (children as React.ReactElement<{ onBlur?: () => void }>).props.onBlur?.();
              hide();
            },
          }
        )
      : children;

    const setAnchor = useCallback(
      (node: HTMLSpanElement | null) => {
        anchorRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLSpanElement | null>).current = node;
      },
      [ref]
    );

    return (
      <span
        ref={setAnchor}
        data-testid={testId}
        className={twMerge('inline-flex', wrapperClassName)}
        {...props}
      >
        {child}
        {open && (
          <Portal>
            <span
              ref={bubbleRef}
              role="tooltip"
              id={id}
              style={{
                position: 'fixed',
                left: coords?.left ?? 0,
                top: coords?.top ?? 0,
                visibility: coords ? 'visible' : 'hidden',
                pointerEvents: 'none',
              }}
              className={twMerge(tooltipVariants({ side }), 'w-max', className)}
            >
              {content}
            </span>
          </Portal>
        )}
      </span>
    );
  }
);
Tooltip.displayName = 'Tooltip';

// Popover — click-triggered panel with Escape + outside dismissal.
export interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  testId?: string;
  className?: string;
  ariaLabel?: string;
}

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  testId,
  className,
  ariaLabel,
}: PopoverProps): React.JSX.Element {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const panelRef = useRef<HTMLDivElement>(null);

  const set = (v: boolean) => {
    setInternal(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') set(false);
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) set(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [isOpen]);

  const triggerEl = React.isValidElement(trigger)
    ? React.cloneElement(
        trigger as React.ReactElement<{
          onClick?: (e: unknown) => void;
          'aria-expanded'?: boolean;
          'aria-haspopup'?: string;
        }>,
        {
          onClick: (e: unknown) => {
            (trigger as React.ReactElement<{ onClick?: (e: unknown) => void }>).props.onClick?.(e);
            set(!isOpen);
          },
          'aria-expanded': isOpen,
          'aria-haspopup': 'dialog',
        }
      )
    : trigger;

  return (
    <span className="relative inline-flex" data-testid={testId}>
      {triggerEl}
      {isOpen && (
        <Portal>
          <div
            ref={panelRef}
            role="dialog"
            aria-label={ariaLabel}
            className={twMerge(
              'z-[600] min-w-48 rounded-lg border border-hairline bg-surface p-3 shadow-lg elev-2',
              className
            )}
          >
            {children}
          </div>
        </Portal>
      )}
    </span>
  );
}
