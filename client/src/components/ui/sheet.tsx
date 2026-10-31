import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type SheetSide = "top" | "bottom" | "left" | "right";

function Sheet({ ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet" {...props} />;
}

function SheetTrigger({
  className,
  children,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp data-slot="sheet-trigger" className={cn("", className)} {...props}>
      {children}
    </Comp>
  );
}

function SheetContent({
  className,
  side = "right",
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & {
  side?: SheetSide;
  showCloseButton?: boolean;
}) {
  const sideClasses: Record<SheetSide, string> = {
    right: "inset-y-0 right-0 w-full max-w-md border-l",
    left: "inset-y-0 left-0 w-full max-w-md border-r",
    top: "inset-x-0 top-0 h-full max-h-md border-b",
    bottom: "inset-x-0 bottom-0 h-full max-h-md border-t",
  };

  return (
    <div
      data-slot="sheet-content"
      className={cn(
        "fixed inset-0 z-50 bg-background shadow-xl transition-all duration-300 ease-in-out",
        sideClasses[side],
        className
      )}
      {...props}
    >
      <div className="relative h-full flex flex-col p-6">
        {showCloseButton && (
          <button
            data-slot="sheet-close"
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function SheetOverlay({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-40 bg-black/80 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sheet-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetOverlay,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
