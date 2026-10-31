import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ModuleIdentity } from "@/lib/design";

/**
 * ModuleCard — a consistent, branded tile for a business module (accounting,
 * engineering, …). Composes the central ModuleIdentity so every surface stays
 * visually aligned while remaining clearly differentiated.
 */
export function ModuleCard({
  module,
  title,
  description,
  badge,
  onClick,
  className,
  children,
}: {
  module: ModuleIdentity;
  title?: string;
  description?: string;
  badge?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const Icon = module.icon;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group surface rounded-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "p-3 rounded-2xl text-white shadow bg-gradient-to-br",
              module.gradient
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
          {badge && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold bg-background",
                module.border
              )}
              style={{ color: module.accent }}
            >
              {badge}
            </Badge>
          )}
        </div>
        {title && (
          <h3 className="mt-3 font-bold text-foreground font-display text-sm">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </Card>
  );
}
