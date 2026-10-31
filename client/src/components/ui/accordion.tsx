import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header
      data-slot="accordion-header"
      className="flex w-full"
    >
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          // Layout
          "flex min-w-0 flex-1 items-start justify-between gap-4",

          // Typography
          "text-start text-sm font-medium",

          // Spacing
          "rounded-md py-4",

          // Interaction
          "outline-none transition-[color,background-color,box-shadow]",
          "hover:underline",
          "disabled:pointer-events-none disabled:opacity-50",

          // Focus / Accessibility
          "focus-visible:border-ring",
          "focus-visible:ring-ring/50",
          "focus-visible:ring-[3px]",

          // Open state
          "[&[data-state=open]>svg]:rotate-180",

          // Consumer overrides
          className
        )}
        {...props}
      >
        <span className="min-w-0 flex-1">{children}</span>

        <ChevronDownIcon
          aria-hidden="true"
          focusable="false"
          className={cn(
            "pointer-events-none size-4 shrink-0",
            "translate-y-0.5",
            "text-muted-foreground",
            "transition-transform duration-200"
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        "overflow-hidden text-sm",
        "data-[state=open]:animate-accordion-down",
        "data-[state=closed]:animate-accordion-up",
        className
      )}
      {...props}
    >
      <div className="pt-0 pb-4">{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
