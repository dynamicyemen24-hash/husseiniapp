/**
 * Modal — Primitive dialog component
 * Accessible modal dialog with focus management, animations, and variants.
 * Replaces: custom modal implementations, alert dialogs, confirmation dialogs
 */

import React, { forwardRef, useRef, useEffect, useCallback, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Box } from './Box';
import { Text } from './Text';
import { Button } from './Button';
import { Portal } from './Portal';
import { X } from 'lucide-react';

const modalOverlayVariants = cva(
  'fixed inset-0 bg-overlay-medium transition-opacity duration-normal ease-standard-decelerate ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  {
    variants: {
      visible: { true: 'opacity-100 pointer-events-auto', false: 'opacity-0 pointer-events-none' },
    },
  }
);

const modalContentVariants = cva(
  'fixed z-[500] w-full max-w-lg bg-background-primary-DEFAULT shadow-level-5 ' +
    'rounded-lg transition-all duration-normal ease-standard-decelerate ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
    'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ' +
    'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ' +
    'focus:outline-none',
  {
    variants: {
      size: {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        full: 'max-w-[90vw] max-h-[90vh]',
      },
      position: {
        center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        top: 'top-4 left-1/2 -translate-x-1/2',
        bottom: 'bottom-4 left-1/2 -translate-x-1/2',
        left: 'top-1/2 left-4 -translate-y-1/2',
        right: 'top-1/2 right-4 -translate-y-1/2',
      },
    },
    defaultVariants: {
      size: 'md',
      position: 'center',
    },
  }
);

const modalHeaderVariants = cva(
  'flex items-start justify-between gap-4 p-6 border-b border-border-primary-DEFAULT',
  { variants: { bordered: { true: 'border-b border-border-primary-DEFAULT', false: '' } } }
);

const modalBodyVariants = cva('p-6 overflow-y-auto', {
  variants: { padded: { true: '', false: 'p-0' } },
});

const modalFooterVariants = cva(
  'flex items-center justify-end gap-3 p-6 border-t border-border-primary-DEFAULT',
  { variants: { bordered: { true: 'border-t border-border-primary-DEFAULT', false: '' } } }
);

export interface ModalProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof modalContentVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  bodyPadding?: boolean;
  footerPadding?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null> | 'first' | 'close';
  testId?: string;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      size = 'md',
      position = 'center',
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      header,
      footer,
      headerAction,
      bodyPadding = true,
      footerPadding = true,
      trapFocus = true,
      restoreFocus = true,
      initialFocus = 'first',
      testId,
      className,
      ...props
    },
    ref
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);
    const reactId = React.useId();
    const modalId = `modal-${reactId}`;
    const titleId = title ? `${modalId}-title` : undefined;
    const descriptionId = description ? `${modalId}-description` : undefined;

    const handleClose = useCallback(() => {
      onOpenChange(false);
    }, [onOpenChange]);

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
          handleClose();
        }
      },
      [closeOnOverlayClick, handleClose]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!closeOnEscape) return;
        if (e.key === 'Escape') {
          handleClose();
        }
      },
      [closeOnEscape, handleClose]
    );

    const handleFocusTrap = useCallback(
      (e: React.KeyboardEvent) => {
        // Tab-trap: Tab on the last control wraps to the first, Shift+Tab on
        // the first wraps to the last. Attached via onKeyDown on the content.
        if (!trapFocus || !contentRef.current || e.key !== 'Tab') return;
        const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      },
      [trapFocus]
    );

    useEffect(() => {
      if (open) {
        previousActiveElement.current = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';

        const focusTarget =
          initialFocus === 'first'
            ? contentRef.current?.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              )
            : initialFocus === 'close'
              ? closeButtonRef.current
              : typeof initialFocus === 'object' &&
                  initialFocus !== null &&
                  'current' in initialFocus
                ? (initialFocus as React.RefObject<HTMLElement | null>).current
                : null;

        const t = window.setTimeout(() => focusTarget?.focus(), 0);
        return () => window.clearTimeout(t);
      } else {
        document.body.style.overflow = '';
        if (restoreFocus && previousActiveElement.current) {
          const el = previousActiveElement.current;
          const t = window.setTimeout(() => el.focus(), 0);
          return () => window.clearTimeout(t);
        }
        return undefined;
      }
    }, [open, initialFocus, restoreFocus]);

    useEffect(() => {
      if (!open) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) handleClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, closeOnEscape, handleClose]);

    if (!open) return null;

    return (
      <Portal>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          data-state={open ? 'open' : 'closed'}
          data-size={size}
          data-position={position}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* The dim layer OWNS the click: it is `pointer-events-auto` and
           * covers the viewport, so a handler on the dialog root could never
           * see `target === currentTarget`. Attached here, the guard still
           * refuses any click that bubbles up from dialog content. */}
          <div
            className={modalOverlayVariants({ visible: true })}
            aria-hidden="true"
            onClick={handleOverlayClick}
          />

          <Box
            ref={contentRef}
            as="div"
            role="document"
            id={modalId}
            size={size}
            position={position}
            className={twMerge(modalContentVariants({ size, position }), className)}
            onKeyDown={handleFocusTrap}
            {...props}
            data-testid={testId}
          >
            {(title || showCloseButton || headerAction) && (
              <Box as="header" bordered={true} className={modalHeaderVariants({ bordered: true })}>
                <Box display="flex" flexDirection="col" gap={1} flex={1}>
                  {title && (
                    <Text id={titleId} as="h2" variant="titleLg" color="primary">
                      {title}
                    </Text>
                  )}
                  {description && (
                    <Text id={descriptionId} variant="bodySm" color="secondary">
                      {description}
                    </Text>
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  {headerAction}
                  {showCloseButton && (
                    <Button
                      ref={closeButtonRef}
                      variant="ghost"
                      size="icon"
                      onClick={handleClose}
                      aria-label="Close modal"
                      className="text-content-tertiary hover:text-content-primary"
                    >
                      <X width={20} height={20} aria-hidden="true" />
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* BODY — plain landmark content inside the ONE dialog above:
             * a nested dialog role here would double-announce the surface
             * to assistive technology (interaction-contract failure mode). */}
            <Box
              as="main"
              padded={bodyPadding}
              className={modalBodyVariants({ padded: bodyPadding })}
            >
              {header ? header : children}
            </Box>

            {(footer || (footer === undefined && children)) && (
              <Box
                as="footer"
                bordered={footerPadding}
                className={modalFooterVariants({ bordered: footerPadding })}
              >
                {footer}
              </Box>
            )}
          </Box>
        </div>
      </Portal>
    );
  }
);

Modal.displayName = 'Modal';

// AlertDialog — for critical confirmations
export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'destructive' | 'primary' | 'secondary' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  testId?: string;
}

export const AlertDialog = forwardRef<HTMLDivElement, AlertDialogProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      confirmVariant = 'destructive',
      onConfirm,
      onCancel,
      loading = false,
      testId,
    },
    ref
  ) => {
    const handleConfirm = () => {
      onConfirm();
      onOpenChange(false);
    };

    const handleCancel = () => {
      onCancel?.();
      onOpenChange(false);
    };

    return (
      <Modal
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        size="sm"
        showCloseButton={false}
        footer={
          <>
            <Button variant="ghost" onClick={handleCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} onClick={handleConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </>
        }
        testId={testId}
      />
    );
  }
);
AlertDialog.displayName = 'AlertDialog';

// ConfirmDialog — simple confirmation
export interface ConfirmDialogProps extends Omit<AlertDialogProps, 'confirmVariant'> {
  variant?: 'destructive' | 'primary' | 'secondary' | 'warning';
}

export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  ({ variant = 'destructive', ...props }, ref) => (
    <AlertDialog ref={ref} confirmVariant={variant} {...props} />
  )
);
ConfirmDialog.displayName = 'ConfirmDialog';

// Drawer — side panel modal
export interface DrawerProps extends Omit<ModalProps, 'position' | 'size'> {
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  ({ position = 'right', size = 'md', ...props }, ref) => {
    const sizeMap = {
      sm: position === 'left' || position === 'right' ? 'max-w-sm' : 'max-h-sm',
      md: position === 'left' || position === 'right' ? 'max-w-md' : 'max-h-md',
      lg: position === 'left' || position === 'right' ? 'max-w-lg' : 'max-h-lg',
      full: 'max-w-[90vw] max-h-[90vh]',
    };

    return (
      <Modal
        ref={ref}
        position={position}
        size="full"
        className={twMerge(
          position === 'left' || position === 'right'
            ? 'rounded-l-none rounded-r-none h-full'
            : 'rounded-t-none rounded-b-none w-full',
          sizeMap[size]
        )}
        {...props}
      />
    );
  }
);
Drawer.displayName = 'Drawer';

// Sheet — bottom sheet modal (mobile)
export interface SheetProps extends Omit<ModalProps, 'position' | 'size'> {
  snapPoints?: number[];
  defaultSnap?: number;
}

export const Sheet = forwardRef<HTMLDivElement, SheetProps>(
  ({ snapPoints = [0.25, 0.5, 0.9], defaultSnap = 0.5, ...props }, ref) => (
    <Drawer
      ref={ref}
      position="bottom"
      size="full"
      className="rounded-t-xl rounded-b-none h-auto max-h-[90vh]"
      {...props}
    />
  )
);
Sheet.displayName = 'Sheet';
