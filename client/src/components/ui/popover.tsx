import * as React from "react";
import { cn } from "@/lib/utils";

function Popover({ children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="popover" {...props}>
      {children}
    </div>
  );
}

function PopoverTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="popover-trigger"
      className={cn("", className)}
      {...props}
    >
      {children}
    </button>
  );
}

function PopoverContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
