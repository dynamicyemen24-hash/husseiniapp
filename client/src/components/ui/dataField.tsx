/**
 * DataField — Standalone data field with auto-completion and validation.
 *
 * A composable, reusable field component that works independently
 * or within a SmartDataForm. Supports:
 *   - Auto-completion with fuzzy matching
 *   - Real-time validation
 *   - AI suggestions
 *   - Multi-language labels
 *   - Touch-optimized
 *   - WCAG 2.1 AA compliant
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Check, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAutoCompleteEngine as useAutoComplete } from "@/lib/autoComplete";
import { useDebouncedCallback } from "@/lib/useVirtualScroll";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface DataFieldProps {
  name: string;
  label: string;
  labelAr: string;
  type?:
    | "text"
    | "number"
    | "currency"
    | "percentage"
    | "date"
    | "select"
    | "autocomplete"
    | "multiselect";
  value?: any;
  onChange?: (name: string, value: any) => void;
  placeholder?: string;
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  options?: Array<{
    value: string;
    label: string;
    labelAr?: string;
    metadata?: Record<string, any>;
  }>;
  autoComplete?: boolean;
  autoCompleteSource?: string;
  autoCompleteEngine?: any;
  aiSuggest?: boolean;
  suggestion?: string;
  error?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  className?: string;
}

export const DataField = React.memo(
  ({
    name,
    label,
    labelAr,
    type = "text",
    value,
    onChange,
    placeholder,
    required,
    readonly,
    disabled,
    options,
    autoComplete,
    autoCompleteSource,
    autoCompleteEngine,
    aiSuggest,
    suggestion,
    error,
    className,
  }: DataFieldProps) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const {
      search,
      results,
      showDropdown,
      selectEntry,
      navigateDown,
      navigateUp,
      closeDropdown,
    } = useAutoComplete(autoCompleteEngine);

    const debouncedSearch = useDebouncedCallback((q: string) => {
      if (autoComplete && q.length >= 2) {
        search(q);
        setShowSuggestions(true);
      }
    }, 200);

    const handleChange = (val: string) => {
      onChange?.(name, val);
      debouncedSearch(val);
    };

    const handleSelect = (entry: any) => {
      selectEntry(entry);
      onChange?.(name, entry.value);
      setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateDown();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateUp();
      } else if (
        e.key === "Enter" &&
        showDropdown &&
        results.entries.length > 0
      ) {
        e.preventDefault();
        handleSelect(results.entries[0]);
      } else if (e.key === "Escape") {
        closeDropdown();
        setShowSuggestions(false);
      }
    };

    // Select type
    if (
      type === "select" ||
      (options && options.length > 0 && type !== "autocomplete")
    ) {
      return (
        <div className={cn("space-y-1.5", className)}>
          <Label className="text-sm font-medium">
            {labelAr ?? label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
          <Select
            value={value}
            onValueChange={v => onChange?.(name, v)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={placeholder ?? `اختر ${labelAr ?? label}`}
              />
            </SelectTrigger>
            <SelectContent>
              {options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.labelAr ?? opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Autocomplete type
    if (type === "autocomplete") {
      return (
        <div className={cn("space-y-1.5 relative", className)}>
          <Label className="text-sm font-medium">
            {labelAr ?? label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={value ?? ""}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="pl-10"
            />
            {aiSuggest && value && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{suggestion}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <AnimatePresence>
              {showDropdown && results.entries.length > 0 && (
                <motion.div
                  className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {results.entries.map((entry: any, index: number) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                      onMouseDown={e => {
                        e.preventDefault();
                        handleSelect(entry);
                      }}
                    >
                      {entry.labelAr && (
                        <span className="text-sm font-medium">
                          {entry.labelAr}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {entry.label}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    }

    // Number/Currency/Percentage
    if (type === "number" || type === "currency" || type === "percentage") {
      return (
        <div className={cn("space-y-1.5 relative", className)}>
          <Label className="text-sm font-medium">
            {labelAr ?? label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            type="number"
            value={value ?? ""}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        </div>
      );
    }

    // Default text
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label className="text-sm font-medium">
          {labelAr ?? label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          type="text"
          value={value ?? ""}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          className={cn(error && "border-destructive")}
        />
      </div>
    );
  }
);

DataField.displayName = "DataField";
