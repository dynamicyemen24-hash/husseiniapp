/**
 * Smart Combobox Component System
 * Provides searchable, categorized dropdowns with auto-complete for basic data.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ComboboxOption {
  value: string;
  label: string;
  code?: string;
  description?: string;
  group?: string;
  icon?: React.ReactNode;
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
  groupBy?: string;
  renderOption?: (option: ComboboxOption) => React.ReactNode;
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
  groupBy,
  renderOption,
}: SmartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOption = options.find(o => o.value === value);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        o.code?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const grouped = React.useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, ComboboxOption[]>();
    for (const opt of filtered) {
      const key = String(opt[groupBy as keyof ComboboxOption] ?? "other");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    return map;
  }, [filtered, groupBy]);

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.value, opt);
    setOpen(false);
    setSearch("");
  };

  return (
    <div data-slot="smart-combobox" className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm bg-background",
          "transition-colors hover:border-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn(!selectedOption && "text-muted-foreground")}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon && (
                <span className="opacity-60">{selectedOption.icon}</span>
              )}
              <span>{selectedOption.label}</span>
              {selectedOption.code && (
                <span className="text-xs text-muted-foreground">
                  ({selectedOption.code})
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="size-4 opacity-50" />
      </button>

      {open && (
        <div
          className="absolute z-50 w-full rounded-md border bg-background shadow-lg"
          style={{ maxHeight }}
        >
          <div className="relative p-2 border-b">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  onChange("", undefined);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: maxHeight - 80 }}
          >
            {grouped ? (
              Array.from(grouped.entries()).map(([group, items]) => (
                <div key={group}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {group}
                  </div>
                  {items.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent",
                        value === opt.value && "bg-accent font-medium"
                      )}
                    >
                      {renderOption ? (
                        renderOption(opt)
                      ) : (
                        <div className="flex items-center justify-between">
                          <span>{opt.label}</span>
                          {opt.code && (
                            <span className="text-xs text-muted-foreground">
                              {opt.code}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent",
                    value === opt.value && "bg-accent font-medium"
                  )}
                >
                  {renderOption ? (
                    renderOption(opt)
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      {opt.code && (
                        <span className="text-xs text-muted-foreground">
                          {opt.code}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-select Combobox with tags
 */
interface MultiSelectComboboxProps {
  options: ComboboxOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

export function MultiSelectCombobox({
  options,
  selectedValues,
  onChange,
  placeholder = "اختر...",
  className,
  maxTags = 5,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) || o.code?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const selectedOptions = options.filter(o => selectedValues.includes(o.value));

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else if (selectedValues.length < maxTags) {
      onChange([...selectedValues, value]);
    }
  };

  return (
    <div
      data-slot="multi-select-combobox"
      className={cn("relative", className)}
    >
      <div className="flex flex-wrap gap-1.5 rounded-md border px-2 py-1.5 bg-background min-h-[42px]">
        {selectedOptions.map(opt => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand"
          >
            {opt.label}
            <button
              onClick={() => handleToggle(opt.value)}
              className="ml-1 text-brand/70 hover:text-brand"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm flex-1 min-w-[60px]"
        />
      </div>

      {open && (
        <div className="absolute z-50 w-full rounded-md border bg-background shadow-lg mt-1">
          <div className="p-2 border-b">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                لا توجد نتائج
              </div>
            ) : (
              filtered.map(opt => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2",
                      isSelected && "bg-accent"
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="size-4 text-brand"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span>{opt.label}</span>
                    {opt.code && (
                      <span className="text-xs text-muted-foreground">
                        ({opt.code})
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Auto-fill trigger - automatically fills fields when a value is selected
 */
interface AutoFillFields {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  discountPercent?: number;
  paymentTerms?: string;
}

export interface AutoFillRule {
  sourceField: string;
  fillFields: AutoFillFields;
}

export function createAutoFillRules(): Record<string, AutoFillFields> {
  return {};
}

export function applyAutoFill(
  selectedData: Record<string, unknown>,
  rule: AutoFillRule
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(rule.fillFields)) {
    if (typeof value === "function") {
      result[field] = value(selectedData as any);
    } else {
      result[field] = value;
    }
  }
  return result;
}
