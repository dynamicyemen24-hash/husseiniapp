"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AutoCompleteOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface AutoCompleteProps {
  options: AutoCompleteOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  maxItems?: number;
  className?: string;
  onSearch?: (query: string) => void;
}

export function AutoComplete({
  options,
  value,
  onChange,
  placeholder = "بحث...",
  searchPlaceholder = "ابحث...",
  loading = false,
  emptyMessage = "لا توجد نتائج",
  maxItems = 10,
  className,
  onSearch,
}: AutoCompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [localValue, setLocalValue] = useState(value ?? "");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const filtered = options.filter(
    opt =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      opt.value.toLowerCase().includes(query.toLowerCase()) ||
      opt.description?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback(
    (val: string) => {
      setLocalValue(val);
      onChange(val);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={localValue || query}
          onChange={e => {
            setQuery(e.target.value);
            setLocalValue(e.target.value);
            onSearch?.(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
        {localValue && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1 h-7 w-7 p-0 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        {!localValue && (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <Command shouldFilter={false} className="overflow-hidden rounded-lg">
            <CommandInput
              placeholder={searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[250px] overflow-auto p-1">
              <CommandEmpty>
                {loading ? "جاري البحث..." : emptyMessage}
              </CommandEmpty>
              <CommandGroup>
                {filtered.slice(0, maxItems).map(opt => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt.value)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    {opt.icon && (
                      <span className="flex-shrink-0">{opt.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-muted-foreground">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    {localValue === opt.value && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {filtered.length > maxItems && (
                <CommandItem
                  disabled
                  className="text-xs text-muted-foreground px-3 py-2"
                >
                  عرض {maxItems} من {filtered.length} نتيجة
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}

interface AutoCompleteMultiProps {
  options: AutoCompleteOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  maxItems?: number;
  className?: string;
}

export function AutoCompleteMulti({
  options,
  values,
  onChange,
  placeholder = "اختر...",
  loading = false,
  maxItems = 5,
  className,
}: AutoCompleteMultiProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    opt =>
      !values.includes(opt.value) &&
      (opt.label.toLowerCase().includes(query.toLowerCase()) ||
        opt.value.toLowerCase().includes(query.toLowerCase()))
  );

  const handleSelect = (val: string) => {
    if (!values.includes(val)) {
      onChange([...values, val]);
    }
    setQuery("");
    inputRef.current?.focus();
  };

  const handleRemove = (val: string) => {
    onChange(values.filter(v => v !== val));
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-background px-3 py-2 min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {values.map(v => {
          const opt = options.find(o => o.value === v);
          return (
            <Badge
              key={v}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <span className="text-xs">{opt?.label ?? v}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemove(v)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === "Backspace" && !query && values.length > 0) {
              handleRemove(values[values.length - 1]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <Command shouldFilter={false} className="overflow-hidden rounded-lg">
            <CommandInput
              placeholder="ابحث..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[200px] overflow-auto p-1">
              <CommandEmpty>
                {loading ? "جاري البحث..." : "لا توجد نتائج"}
              </CommandEmpty>
              <CommandGroup>
                {filtered.slice(0, maxItems).map(opt => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => handleSelect(opt.value)}
                    className="cursor-pointer px-3 py-2"
                  >
                    <span className="text-sm">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
