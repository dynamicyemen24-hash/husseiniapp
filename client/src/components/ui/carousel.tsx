import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Carousel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carousel"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CarouselContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carousel-content"
      className={cn("flex transition-transform duration-500", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CarouselItem({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carousel-item"
      className={cn("min-w-full shrink-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CarouselPrevious({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="carousel-previous"
      className={cn(
        "absolute left-2 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 shadow-sm transition-colors hover:bg-background",
        className
      )}
      {...props}
    >
      <ChevronLeft className="size-4" />
    </button>
  );
}

function CarouselNext({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="carousel-next"
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 shadow-sm transition-colors hover:bg-background",
        className
      )}
      {...props}
    >
      <ChevronRight className="size-4" />
    </button>
  );
}

function CarouselDots({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="carousel-dots"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

function CarouselDot({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      data-slot="carousel-dot"
      className={cn(
        "rounded-full transition-all",
        active ? "bg-brand w-6" : "bg-muted-foreground/30 w-2",
        "h-2",
        className
      )}
      {...props}
    />
  );
}

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
  CarouselDot,
};
