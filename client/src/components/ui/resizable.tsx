import * as React from "react";
import { cn } from "@/lib/utils";

function Resizable({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div data-slot="resizable" className={cn("flex", className)} {...props}>
      {children}
    </div>
  );
}

function ResizablePanel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="resizable-panel"
      className={cn("flex-1 min-w-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function ResizableHandle({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="resizable-handle"
      className={cn(
        "flex w-4 items-center justify-center bg-border hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  );
}

export { Resizable, ResizablePanel, ResizableHandle };
