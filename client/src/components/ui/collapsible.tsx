import * as React from "react";
import { cn } from "@/lib/utils";

function Collapsible({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      data-slot="collapsible"
      className={cn(
        "grid transition-[grid-template-rows] duration-300",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className
      )}
      {...props}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function CollapsibleTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="collapsible-trigger"
      className={cn(
        "flex w-full items-center justify-between rounded-md p-3 text-left font-medium transition-colors hover:bg-accent",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function CollapsibleContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="collapsible-content"
      className={cn("overflow-hidden text-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
