import * as React from "react";
import { Command } from "cmdk";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandPaletteItem {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = "ابحث عن صفحة، إجراء، أو سجل...",
}: CommandPaletteProps) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const groups = Array.from(new Set(items.map((i) => i.group ?? "عام")));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <Command
        className={cn(
          "relative w-full max-w-xl rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Command.Input
            placeholder={placeholder}
            className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            لا توجد نتائج.
          </Command.Empty>
          {groups.map((g) => (
            <Command.Group
              key={g}
              heading={g}
              className="px-2 py-1 text-xs font-semibold text-muted-foreground"
            >
              {items
                .filter((i) => (i.group ?? "عام") === g)
                .map((i) => (
                  <Command.Item
                    key={i.id}
                    value={`${i.label} ${i.hint ?? ""}`}
                    onSelect={() => {
                      i.onSelect?.();
                      onOpenChange(false);
                    }}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span>{i.label}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {i.hint}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}

export default CommandPalette;
