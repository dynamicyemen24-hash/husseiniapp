/**
 * WCAG 2.1 AA Compliant Smart Combobox with Full Accessibility.
 * Features: Type-ahead, keyboard navigation, ARIA attributes, loading states.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export interface ComboboxOption {
  value: string;
  label: string;
  code?: string;
  description?: string;
  disabled?: boolean;
}

interface SmartComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string, option?: ComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  maxHeight?: number;
  className?: string;
  renderOption?: (
    option: ComboboxOption,
    highlighted: boolean
  ) => React.ReactNode;
  /** ARIA: Additional description for screen readers */
  ariaDescription?: string;
}

export function SmartCombobox({
  options,
  value,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "ابحث...",
  label,
  disabled = false,
  loading = false,
  emptyMessage = "لا توجد نتائج",
  maxHeight = 250,
  className,
  renderOption,
  ariaDescription,
}: SmartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  // Filter options
  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => {
      const label = o.label.toLowerCase();
      const code = o.code?.toLowerCase() ?? "";
      const desc = o.description?.toLowerCase() ?? "";
      return label.includes(q) || code.includes(q) || desc.includes(q);
    });
  }, [options, search]);

  // Reset highlighted index when options change
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[role='option']");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          const option = filtered[highlightedIndex];
          if (!option.disabled) {
            onChange(option.value, option);
            setOpen(false);
            setSearch("");
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
      case "Tab":
        setOpen(false);
        setSearch("");
        break;
    }
  };

  const handleSelect = (option: ComboboxOption) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setOpen(false);
    setSearch("");
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setHighlightedIndex(-1);
    if (!open) setOpen(true);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
    inputRef.current?.focus();
  };

  // Generate unique IDs for ARIA
  const listId = `combobox-list-${React.useId()}`;
  const labelId = `combobox-label-${React.useId()}`;

  return (
    <div data-slot="smart-combobox" className={cn("relative", className)}>
      {label && (
        <label
          id={labelId}
          className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen(!open);
              if (!open) inputRef.current?.focus();
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={ariaDescription ? `${labelId}-desc` : undefined}
          aria-disabled={disabled}
          aria-activedescendant={
            open && highlightedIndex >= 0
              ? `option-${filtered[highlightedIndex]?.value}`
              : undefined
          }
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm bg-card",
            "transition-all duration-200 ease-out",
            "border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200",
            "hover:border-neutral-400",
            disabled && "opacity-50 cursor-not-allowed bg-neutral-100",
            open && "border-brand-500 ring-2 ring-brand-200"
          )}
        >
          <span className={cn(!selectedOption && "text-neutral-400")}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{selectedOption.label}</span>
                {selectedOption.code && (
                  <span className="text-xs text-neutral-500">
                    ({selectedOption.code})
                  </span>
                )}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-1">
            {loading && <Skeleton className="h-4 w-4 rounded-full" />}
            {!loading && selectedOption && (
              <Check className="size-4 text-success-600" />
            )}
            <ChevronDown
              className={cn(
                "size-4 opacity-50 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>

        {open && (
          <div
            id={listId}
            ref={listRef}
            role="listbox"
            aria-labelledby={labelId}
            aria-describedby={ariaDescription ? `${labelId}-desc` : undefined}
            className="absolute z-50 w-full rounded-lg border bg-card shadow-lg mt-1"
            style={{ maxHeight }}
          >
            <div className="relative p-2 border-b">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                ref={inputRef}
                placeholder={searchPlaceholder}
                value={search}
                onChange={handleInputChange}
                className="pl-9"
                autoFocus
                aria-label={searchPlaceholder}
              />
              {search && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  aria-label="مسح البحث"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div
              className="overflow-y-auto"
              style={{ maxHeight: maxHeight - 80 }}
            >
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-neutral-500">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((opt, index) => {
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={opt.value}
                      id={`option-${opt.value}`}
                      role="option"
                      aria-selected={value === opt.value}
                      aria-disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        isHighlighted && "bg-brand-50",
                        value === opt.value && "bg-brand-100 font-medium",
                        opt.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {renderOption ? (
                        renderOption(opt, isHighlighted)
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span>{opt.label}</span>
                            {opt.code && (
                              <span className="text-xs text-neutral-500">
                                ({opt.code})
                              </span>
                            )}
                          </span>
                          {value === opt.value && (
                            <Check className="size-4 text-brand-600" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {ariaDescription && (
        <span id={`${labelId}-desc`} className="sr-only">
          {ariaDescription}
        </span>
      )}
    </div>
  );
}
