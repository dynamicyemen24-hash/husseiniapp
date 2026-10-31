/**
 * Tooltip and Help System — Contextual guidance and rich tooltips.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Info, AlertCircle, CheckCircle } from "lucide-react";

// ─── Tooltip Context ───

interface TooltipData {
  id: string;
  title: string;
  description: string;
  type?: "info" | "warning" | "error" | "success";
}

const TooltipContext = React.createContext<{
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}>({ activeId: null, setActiveId: () => {} });

// ─── TooltipRoot ───

interface TooltipProps {
  id?: string;
  title?: string;
  description?: string;
  type?: "info" | "warning" | "error" | "success";
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({
  id,
  title,
  description,
  type = "info",
  children,
  className,
}: TooltipProps) {
  return (
    <TooltipContext.Provider
      value={{ activeId: id ?? null, setActiveId: () => {} }}
    >
      <div className={cn("relative inline-block", className)}>{children}</div>
    </TooltipContext.Provider>
  );
}

// ─── TooltipProvider ───

interface TooltipProviderProps {
  children: React.ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

// ─── TooltipTrigger ───

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function TooltipTrigger({
  children,
  asChild = false,
}: TooltipTriggerProps) {
  if (asChild) {
    return <>{children}</>;
  }
  return <div className="inline-block">{children}</div>;
}

// ─── TooltipContent ───

interface TooltipContentProps {
  id?: string;
  title?: string;
  description?: string;
  type?: "info" | "warning" | "error" | "success";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  className?: string;
  children?: React.ReactNode;
}

export function TooltipContent({
  id,
  title,
  description,
  type = "info",
  side = "top",
  sideOffset = 5,
  className,
  children,
}: TooltipContentProps) {
  const content = children ?? (
    <div className="flex items-start gap-3">
      {type === "info" && (
        <Info className="size-4 mt-0.5 shrink-0 text-blue-500" />
      )}
      {type === "warning" && (
        <AlertCircle className="size-4 mt-0.5 shrink-0 text-amber-500" />
      )}
      {type === "error" && (
        <AlertCircle className="size-4 mt-0.5 shrink-0 text-red-500" />
      )}
      {type === "success" && (
        <CheckCircle className="size-4 mt-0.5 shrink-0 text-green-500" />
      )}
      <div>
        {title && (
          <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
        )}
        {description && (
          <p className="mt-1 text-xs text-neutral-600">{description}</p>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      className={cn(
        "z-50 min-w-[240px] rounded-lg border bg-card p-4 shadow-xl border-blue-200 bg-blue-50",
        className
      )}
      style={{ marginTop: sideOffset }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {content}
    </motion.div>
  );
}

// ─── HelpButton ───

export function HelpButton({
  id,
  title,
  description,
  type = "info",
  className,
}: {
  id: string;
  title: string;
  description: string;
  type?: "info" | "warning" | "error" | "success";
  className?: string;
}) {
  return (
    <Tooltip id={id} title={title} description={description} type={type}>
      <TooltipTrigger>
        <button
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full border border-neutral-300 bg-card text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700",
            className
          )}
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent title={title} description={description} type={type} />
    </Tooltip>
  );
}

// ─── SmartHelp ───

export function SmartHelp({
  title,
  description,
  icon: Icon = Info,
  steps,
  className,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  steps?: string[];
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border border-brand/20 bg-brand-50/50 p-4 backdrop-blur-sm",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <Icon className="size-5 shrink-0 text-brand-600" />
        <div>
          <h4 className="text-sm font-semibold text-brand-900">{title}</h4>
          <p className="mt-1 text-xs text-brand-700">{description}</p>
          {steps && steps.length > 0 && (
            <ol className="mt-3 space-y-1">
              {steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-brand-600"
                >
                  <span className="size-4 rounded-full bg-brand-200 px-1 text-center text-[10px] font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── LoadingSpinner ───

export function LoadingSpinner({
  label = "جاري التحميل...",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = { sm: "size-4", md: "size-8", lg: "size-12" };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <motion.div
        className={cn(
          "rounded-full border-2 border-brand-200 border-t-brand-600",
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <span className="text-xs text-neutral-500">{label}</span>
    </div>
  );
}

// ─── StatusIndicator ───

export function StatusIndicator({
  status,
  label,
  className,
}: {
  status: "loading" | "success" | "error" | "warning" | "idle";
  label: string;
  className?: string;
}) {
  const statusConfig = {
    loading: { dot: "bg-blue-500 animate-pulse", text: "text-blue-600" },
    success: { dot: "bg-green-500", text: "text-green-600" },
    error: { dot: "bg-red-500", text: "text-red-600" },
    warning: { dot: "bg-amber-500", text: "text-amber-600" },
    idle: { dot: "bg-neutral-300", text: "text-neutral-500" },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("size-2 rounded-full", config.dot)} />
      <span className={cn("text-xs font-medium", config.text)}>{label}</span>
    </div>
  );
}
