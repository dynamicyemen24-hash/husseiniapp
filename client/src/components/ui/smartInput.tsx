/**
 * SmartInput — AI-aware input with auto-suggestions.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  isLoading?: boolean;
  onSelectSuggestion?: (suggestion: string) => void;
  className?: string;
}

export function SmartInput({
  value,
  onChange,
  placeholder = "ابحث...",
  suggestions = [],
  isLoading = false,
  onSelectSuggestion,
  className,
}: SmartInputProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-500 animate-pulse" />
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setShowSuggestions(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-neutral-200 bg-card pl-10 pr-4 py-3 text-sm transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none",
            "dark:border-neutral-700 dark:text-neutral-100"
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-brand-500" />
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            className="absolute left-0 right-0 mt-2 rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                className={cn(
                  "w-full px-4 py-2.5 text-sm text-left transition-colors",
                  index === activeIndex
                    ? "bg-brand-50 text-brand-700"
                    : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                )}
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                  onSelectSuggestion?.(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <Sparkles className="inline size-3 mr-2 text-brand-500" />
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * SmartSelect — AI-enhanced select with search and suggestions.
 */
export function SmartSelect({
  value,
  onChange,
  options,
  placeholder = "اختر...",
  isLoading = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-xl border border-neutral-200 bg-card px-4 py-3 text-sm text-left transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none",
          isOpen && "border-brand-500 ring-2 ring-brand-200"
        )}
      >
        <span className={value ? "text-neutral-900" : "text-neutral-400"}>
          {value
            ? (options.find(o => o.value === value)?.label ?? placeholder)
            : placeholder}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 right-0 mt-2 rounded-xl border border-neutral-200 bg-card shadow-xl max-h-60 overflow-auto dark:border-neutral-700"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <motion.div
                  className="size-6 rounded-full border-2 border-brand-200 border-t-brand-600"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-500">
                لا توجد نتائج
              </div>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  className={cn(
                    "w-full px-4 py-2.5 text-sm text-left transition-colors",
                    value === option.value
                      ? "bg-brand-50 text-brand-700 font-medium"
                      : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
