import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionBarProps {
  actions: {
    id: string;
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    variant?: "default" | "primary" | "danger";
    shortcut?: string;
  }[];
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-card text-foreground hover:bg-muted border border-border",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  danger: "bg-destructive text-white hover:bg-destructive/90",
};

export function QuickActionBar({ actions, className }: QuickActionBarProps) {
  return (
    <>
      {/* Spacer reserves space so the fixed bar never overlaps page content */}
      <div aria-hidden className="h-20" />
      <div
        dir="rtl"
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-2 px-3 py-2",
          "rounded-2xl border border-border/50",
          "bg-card/80 backdrop-blur-xl shadow-lg",
          "sm:gap-3",
          className
        )}
      >
        {actions.map(action => {
          const Icon = action.icon;
          const variantClass = variantStyles[action.variant ?? "default"];

          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-auto gap-2 rounded-xl px-3 py-2",
                    "transition-all duration-200",
                    variantClass,
                    "hover:scale-105 active:scale-95"
                  )}
                  onClick={action.onClick}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline text-xs font-medium">
                    {action.label}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>{action.label}</span>
                {action.shortcut && (
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    {action.shortcut}
                  </kbd>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}
