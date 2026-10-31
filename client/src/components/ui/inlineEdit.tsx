/**
 * InlineEdit — Double-click to edit component.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Edit3 } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "text" | "select";
  options?: string[];
}

export function InlineEdit({
  value,
  onSave,
  placeholder = "اضغط للتعديل...",
  className,
  variant = "text",
  options = [],
}: InlineEditProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.button
            key="view"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800",
              !value && "text-neutral-400"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsEditing(true);
              setEditValue(value);
            }}
          >
            <Edit3 className="size-3 text-neutral-400" />
            {value || placeholder}
          </motion.button>
        ) : (
          <motion.div
            key="edit"
            className="flex items-center gap-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {variant === "select" ? (
              <select
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="rounded-lg border border-brand-300 bg-card px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                onBlur={handleSave}
                autoFocus
              >
                {options.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
                onBlur={handleSave}
                className="w-32 rounded-lg border border-brand-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                autoFocus
              />
            )}
            <button
              onClick={handleSave}
              className="size-6 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600"
            >
              <Check className="size-3" />
            </button>
            <button
              onClick={handleCancel}
              className="size-6 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center hover:bg-neutral-300"
            >
              <X className="size-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Pressable — Button with press feedback animation.
 */
export function Pressable({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-2 font-medium transition-all",
        "active:scale-95 active:shadow-sm",
        className
      )}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
    >
      {children}
    </motion.button>
  );
}

/**
 * ShineButton — Button with shine hover effect.
 */
export function ShineButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-lg bg-brand px-6 py-2.5 font-semibold text-brand-foreground transition-all",
        "hover:shadow-brand hover:shadow-brand/30",
        "active:scale-95",
        className
      )}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
      />
    </motion.button>
  );
}
