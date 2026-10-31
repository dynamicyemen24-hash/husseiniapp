import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    // Layout
    "relative grid w-full items-start",
    "grid-cols-[0_1fr]",
    "gap-y-0.5",

    // Spacing
    "rounded-lg border px-4 py-3",

    // Typography
    "text-sm",

    // Icon layout
    "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]",
    "has-[>svg]:gap-x-3",
    "[&>svg]:size-4",
    "[&>svg]:translate-y-0.5",
    "[&>svg]:text-current",
  ].join(" "),
  {
    variants: {
      variant: {
        default: ["border-border", "bg-card", "text-card-foreground"].join(" "),

        destructive: [
          "border-destructive/30",
          "bg-card",
          "text-destructive",
          "[&>svg]:text-current",
          "*:data-[slot=alert-description]:text-destructive/90",
        ].join(" "),
      },
    },

    defaultVariants: {
      variant: "default",
    },
  }
);

type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants>;

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 min-h-4",
        "font-medium tracking-tight",
        "leading-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2",
        "grid justify-items-start gap-1",
        "text-sm leading-relaxed",
        "text-muted-foreground",
        "[&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };

export type { AlertProps };
