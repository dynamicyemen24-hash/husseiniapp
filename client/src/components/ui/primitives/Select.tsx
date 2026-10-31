/**
 * Select — Primitive form select component
 * Comprehensive select system with search, multi-select, and async options.
 * Replaces: select, custom dropdown comboboxes
 */

import React, {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useCallback,
  type SelectHTMLAttributes,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { Box } from './Box';
import { Text } from './Text';
import { Input } from './Input';
import { Portal } from './Portal';
import { Check } from 'lucide-react';

const selectTriggerVariants = cva(
  'w-full transition-all duration-fast ease-standard-decelerate ' +
    'placeholder:text-content-tertiary ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-background-tertiary-DEFAULT ' +
    'selection:bg-accent-primary-light selection:text-accent-primary-DEFAULT',
  {
    variants: {
      variant: {
        default:
          'bg-background-primary-DEFAULT border border-border-primary-DEFAULT ' +
          'hover:border-border-primary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        filled:
          'bg-background-tertiary-DEFAULT border border-transparent ' +
          'hover:bg-background-tertiary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        outlined:
          'bg-transparent border-2 border-border-primary-DEFAULT ' +
          'hover:border-border-primary-hover ' +
          'focus-visible:ring-accent-primary-DEFAULT/20 focus-visible:border-accent-primary-DEFAULT ' +
          'text-content-primary',
        error:
          'bg-background-primary-DEFAULT border border-status-negative-DEFAULT ' +
          'hover:border-status-negative-hover ' +
          'focus-visible:ring-status-negative-DEFAULT/20 focus-visible:border-status-negative-DEFAULT ' +
          'text-content-primary',
        success:
          'bg-background-primary-DEFAULT border border-status-positive-DEFAULT ' +
          'hover:border-status-positive-hover ' +
          'focus-visible:ring-status-positive-DEFAULT/20 focus-visible:border-status-positive-DEFAULT ' +
          'text-content-primary',
      },
      size: {
        xs: 'px-2.5 py-1.5 text-body-xs rounded-xs min-h-[28px]',
        sm: 'px-3 py-2 text-body-sm rounded-sm min-h-[32px]',
        md: 'px-4 py-2.5 text-body-md rounded-md min-h-[40px]',
        lg: 'px-5 py-3 text-body-lg rounded-lg min-h-[48px]',
        xl: 'px-6 py-4 text-title-sm rounded-xl min-h-[56px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const selectContentVariants = cva(
  'bg-background-primary-DEFAULT border border-border-primary-DEFAULT ' +
    'shadow-lg rounded-md overflow-hidden ' +
    'focus:outline-none ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
    'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
  {
    variants: {
      size: {
        xs: 'max-h-[160px]',
        sm: 'max-h-[200px]',
        md: 'max-h-[240px]',
        lg: 'max-h-[280px]',
        xl: 'max-h-[320px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: React.ReactNode;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps
  // onClick/onKeyDown are owned by the trigger button (a native-select
  // handler signature would not type-check on a <button> and would override
  // the open/close behavior if spread). Consumers use onChange/onOpenChange.
  extends
    Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      'size' | 'onChange' | 'children' | 'onClick' | 'onKeyDown'
    >,
    VariantProps<typeof selectTriggerVariants> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  maxSelected?: number;
  clearable?: boolean;
  closeOnSelect?: boolean;
  portal?: boolean;
  renderOption?: (option: SelectOption, selected: boolean) => React.ReactNode;
  renderValue?: (options: SelectOption[]) => React.ReactNode;
  onChange?: (value: string | string[], option: SelectOption | SelectOption[]) => void;
  onOpenChange?: (open: boolean) => void;
  /**
   * Server-driven search: when provided, typing calls this instead of
   * filtering locally (AsyncSelect). The parent owns the option list.
   */
  onSearch?: (query: string) => void;
  testId?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options = [],
      groups = [],
      placeholder = 'Select an option',
      searchable = false,
      multiple = false,
      maxSelected,
      clearable = false,
      closeOnSelect = true,
      portal = true,
      renderOption,
      renderValue,
      variant = 'default',
      size = 'md',
      disabled,
      required,
      id,
      value,
      defaultValue,
      onChange,
      onOpenChange,
      onSearch,
      testId,
      containerClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedValues = React.useMemo(() => {
      const vals = value ?? defaultValue ?? [];
      return Array.isArray(vals) ? vals : [vals];
    }, [value, defaultValue]);

    const selectedOptions = React.useMemo(() => {
      const allOptions = groups.flatMap(g => g.options).concat(options);
      return selectedValues
        .map(v => allOptions.find(o => o.value === v))
        .filter(Boolean) as SelectOption[];
    }, [selectedValues, options, groups]);

    const allOptions = React.useMemo(() => {
      const opts: SelectOption[] = [...options];
      groups.forEach(g => {
        opts.push({ value: `__group_${g.label}__`, label: g.label, disabled: true });
        g.options.forEach(o => opts.push({ ...o, group: g.label }));
      });
      return opts;
    }, [options, groups]);

    const filteredOptions = React.useMemo(() => {
      // Server-driven mode (onSearch): the parent owns filtering, so the
      // local query must not narrow an in-flight option list to empty.
      if (!searchQuery || onSearch) return allOptions;
      return allOptions.filter(
        opt =>
          opt.disabled ||
          opt.label.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
          opt.description?.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
      );
    }, [allOptions, searchQuery, onSearch]);

    const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
      if (open) {
        setFocusedIndex(-1);
        setSearchQuery('');
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        setAnchor(null);
      }
    };

    // Anchor the floating list under the trigger; flip upward when the
    // viewport below is too short (POS drawers, short viewports).
    const updateAnchor = useCallback(() => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 4;
      const estH = Math.min(300, 48 * Math.max(filteredOptions.length, 1) + (searchable ? 64 : 16));
      const below = window.innerHeight - r.bottom - margin;
      const above = r.top - margin;
      const openUp = below < Math.min(estH, 160) && above > below;
      setAnchor({
        top: openUp ? Math.max(margin, r.top - estH) : r.bottom + margin,
        left: Math.max(margin, Math.min(r.left, window.innerWidth - r.width - margin)),
        width: r.width,
      });
    }, [filteredOptions.length, searchable]);

    useEffect(() => {
      if (!isOpen) return;
      updateAnchor();
      window.addEventListener('resize', updateAnchor);
      // Capture phase: a scroll in ANY ancestor (table body, sheet) moves
      // the trigger, so the list must follow or close.
      window.addEventListener('scroll', updateAnchor, true);
      return () => {
        window.removeEventListener('resize', updateAnchor);
        window.removeEventListener('scroll', updateAnchor, true);
      };
    }, [isOpen, updateAnchor]);

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
      // Clicks on the trigger itself fall through to its own toggle.
      if (triggerRef.current?.contains(e.target as Node)) return;
      handleOpenChange(false);
    };

    const handleSelect = (option: SelectOption) => {
      if (option.disabled || option.value.startsWith('__group_')) return;

      let newValues: string[];
      if (multiple) {
        const current = [...selectedValues];
        const index = current.indexOf(option.value);
        if (index >= 0) {
          newValues = current.filter((_, i) => i !== index);
        } else if (!maxSelected || current.length < maxSelected) {
          newValues = [...current, option.value];
        } else return;
      } else {
        newValues = [option.value];
      }

      onChange?.(
        multiple ? newValues : newValues[0],
        multiple ? selectedOptions.find(o => o.value === option.value) || option : option
      );

      if (!multiple || closeOnSelect) {
        handleOpenChange(false);
      }
      setFocusedIndex(-1);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(multiple ? [] : '', null as any);
      handleOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      const enabledOptions = filteredOptions.filter(
        o => !o.disabled && !o.value.startsWith('__group_')
      );
      if (!enabledOptions.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(i => Math.min(i + 1, enabledOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && enabledOptions[focusedIndex]) {
            handleSelect(enabledOptions[focusedIndex]);
          }
          break;
        case 'Escape':
          handleOpenChange(false);
          triggerRef.current?.focus();
          break;
        case 'Tab':
          handleOpenChange(false);
          break;
        default:
          if (searchable && e.key.length === 1) {
            setSearchQuery(prev => prev + e.key.toLowerCase());
          }
      }
    };

    const triggerId = `select-trigger-${id || React.useId()}`;
    const contentId = `select-content-${id || React.useId()}`;

    const displayValue = React.useMemo(() => {
      if (renderValue) return renderValue(selectedOptions);
      if (!selectedOptions.length) return placeholder;
      if (multiple) {
        return selectedOptions.length === 1
          ? selectedOptions[0].label
          : `${selectedOptions.length} selected`;
      }
      return selectedOptions[0].label;
    }, [selectedOptions, placeholder, multiple, renderValue]);

    const Content = () => (
      <div
        ref={contentRef as React.RefObject<HTMLDivElement>}
        role="listbox"
        aria-multiselectable={multiple}
        aria-labelledby={triggerId}
        id={contentId}
        className={twMerge(selectContentVariants({ size }), 'relative')}
        onKeyDown={handleKeyDown}
      >
        {searchable && (
          <div className="p-3 border-b border-hairline">
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
              variant="ghost"
              size={size}
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M11 11L15 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
              className="w-full"
            />
          </div>
        )}

        <div className="flex flex-col overflow-y-auto max-h-full">
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-content-tertiary">No options found</div>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              const isGroup = option.value.startsWith('__group_');
              const isFocused = index === focusedIndex;

              if (isGroup) {
                return (
                  <div
                    key={option.value}
                    className="px-3 py-1 text-caption-sm font-medium text-content-tertiary uppercase tracking-wider"
                  >
                    {option.label}
                  </div>
                );
              }

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  data-focus={isFocused}
                  data-selected={isSelected}
                  className={twMerge(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                    isFocused && 'bg-background-tertiary-DEFAULT',
                    isSelected && 'bg-accent-primary-light',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {option.icon && (
                    <span className="flex text-content-secondary" aria-hidden="true">
                      {option.icon}
                    </span>
                  )}
                  <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <Text
                      variant="bodySm"
                      color={option.disabled ? 'tertiary' : isSelected ? 'primary' : 'primary'}
                      className={twMerge('truncate', isSelected && 'font-medium')}
                    >
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text variant="captionXs" color="tertiary" className="truncate">
                        {option.description}
                      </Text>
                    )}
                  </span>
                  {option.badge && <span>{option.badge}</span>}
                  {multiple && isSelected && (
                    <Check
                      width={16}
                      height={16}
                      className="text-accent-primary-DEFAULT flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {!multiple && isSelected && (
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-accent-primary-DEFAULT flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="w-2 h-2 rounded-full bg-accent-primary-DEFAULT" />
                    </span>
                  )}
                </div>
              );
            })
          )}{' '}
        </div>
      </div>
    );

    const triggerClassName = twMerge(
      selectTriggerVariants({ variant, size }),
      'flex items-center justify-between gap-2',
      className
    );

    const renderTrigger = () => (
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? contentId : undefined}
        aria-disabled={disabled}
        aria-required={required}
        disabled={disabled}
        onClick={() => !disabled && handleOpenChange(!isOpen)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            handleOpenChange(true);
          } else if (e.key === 'Escape') {
            handleOpenChange(false);
          }
        }}
        className={triggerClassName}
        // Select-element handlers (FocusEvent<HTMLSelectElement>) are
        // intentionally adapted to the trigger <button>: at runtime React
        // attaches them unchanged, and the trigger owns open/close.
        {...(props as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <span
          className={twMerge(
            'flex-1 text-start truncate',
            !selectedOptions.length && 'text-content-tertiary'
          )}
        >
          {displayValue}
        </span>
        {multiple && selectedOptions.length > 0 && (
          <span className="ml-2 flex-1 flex flex-wrap gap-1">
            {selectedOptions.slice(0, 3).map(opt => (
              <span
                key={opt.value}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-primary-light text-caption-xs text-accent-primary-DEFAULT"
              >
                {opt.label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    handleSelect(opt);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(opt);
                    }
                  }}
                  className="ml-1 hover:text-accent-primary-DEFAULT cursor-pointer"
                  aria-label={`Remove ${opt.label}`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path
                      d="M3 3L7 7M7 3L3 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            ))}
            {selectedOptions.length > 3 && (
              <span className="px-1.5 py-0.5 text-caption-xs text-content-tertiary">
                +{selectedOptions.length - 3}
              </span>
            )}
          </span>
        )}
        {clearable && selectedOptions.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClear(e as unknown as React.MouseEvent);
              }
            }}
            aria-label="Clear selection"
            className="ml-1 flex-shrink-0 cursor-pointer p-1 rounded-sm text-content-tertiary hover:text-content-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          className={twMerge('flex-shrink-0 ml-2 text-content-tertiary', isOpen && 'rotate-180')}
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );

    const trigger = renderTrigger();
    const content = <Content />;

    return (
      <Box
        ref={ref}
        display="flex"
        flexDirection="col"
        gap={2}
        className={containerClassName}
        data-testid={testId}
      >
        {label && (
          <Text
            as="label"
            htmlFor={triggerId}
            variant="labelSm"
            color={error ? 'error' : isOpen ? 'primary' : 'secondary'}
            className={twMerge('transition-colors', label === '' && 'sr-only')}
          >
            {label}
            {required && (
              <Text color="error" className="ml-1">
                *
              </Text>
            )}
          </Text>
        )}

        <Box position="relative">
          {trigger}
          {isOpen && (
            <Portal>
              {/* Click-catcher: outside clicks dismiss; trigger clicks fall
                  through to the trigger's own toggle. */}
              <div
                aria-hidden="true"
                onMouseDown={handleOverlayMouseDown}
                style={{ position: 'fixed', inset: 0, zIndex: 100 }}
              />
              <div
                style={{
                  position: 'fixed',
                  top: anchor?.top ?? 0,
                  left: anchor?.left ?? 0,
                  width: anchor?.width,
                  zIndex: 101,
                  visibility: anchor ? 'visible' : 'hidden',
                }}
              >
                {content}
              </div>
            </Portal>
          )}
        </Box>

        {(hint || error) && (
          <Text
            variant="captionSm"
            color={error ? 'error' : hint ? 'tertiary' : 'success'}
            className="transition-colors"
            role={error ? 'alert' : undefined}
            aria-live={error ? 'polite' : undefined}
          >
            {error || hint}
          </Text>
        )}
      </Box>
    );
  }
);

Select.displayName = 'Select';

// AsyncSelect — for async options loading
export interface AsyncSelectProps extends Omit<SelectProps, 'options' | 'groups' | 'onSearch'> {
  loadOptions: (query: string) => Promise<SelectOption[]>;
  cacheOptions?: boolean;
  debounceMs?: number;
}

export const AsyncSelect = forwardRef<HTMLDivElement, AsyncSelectProps>(
  (
    { loadOptions, cacheOptions = true, searchable = true, debounceMs = 200, hint, ...props },
    ref
  ) => {
    const [options, setOptions] = useState<SelectOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const cacheRef = useRef<Map<string, SelectOption[]>>(new Map());
    const abortRef = useRef<AbortController | null>(null);

    const handleSearch = useCallback(
      (q: string) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const cached = cacheOptions && cacheRef.current.get(q);
        if (cached) {
          setOptions(cached);
          return;
        }

        setLoading(true);
        loadOptions(q)
          .then(newOptions => {
            if (!abortRef.current?.signal.aborted) {
              setOptions(newOptions);
              if (cacheOptions) cacheRef.current.set(q, newOptions);
            }
          })
          .catch(() => {
            if (!abortRef.current?.signal.aborted) setOptions([]);
          })
          .finally(() => {
            if (!abortRef.current?.signal.aborted) setLoading(false);
          });
      },
      [loadOptions, cacheOptions]
    );

    // Debounced remote reload: the first (empty) query fires immediately so
    // the list is populated on open; keystrokes wait for a pause.
    useEffect(() => {
      if (query === '') {
        handleSearch('');
        return;
      }
      const timeout = window.setTimeout(() => handleSearch(query), debounceMs);
      return () => window.clearTimeout(timeout);
    }, [query, debounceMs, handleSearch]);

    useEffect(() => {
      return () => abortRef.current?.abort();
    }, []);

    return (
      <Select
        ref={ref}
        options={options}
        searchable={searchable}
        onSearch={setQuery}
        hint={loading ? 'جارٍ تحميل الخيارات…' : hint}
        {...props}
      />
    );
  }
);
AsyncSelect.displayName = 'AsyncSelect';
