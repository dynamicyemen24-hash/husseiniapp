import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { Check, Moon, Sun, Palette } from "lucide-react";

/**
 * ThemeSwitcher — professional theme picker.
 * Shows every preset as a swatch preview (3 dots) with a live check mark.
 * `className`/`variant` adapt to the host surface (navbar vs. sidebar).
 */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, meta, themes, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <button
          type="button"
          aria-label="اختيار المظهر"
          title={meta.label}
          className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white ${
            compact ? "w-8 p-0" : ""
          }`}
        >
          {meta.mode === "dark" ? (
            <Moon className="h-3.5 w-3.5 text-brand-300" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-brand-300" />
          )}
          {!compact && <span>{meta.label}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 font-display">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Palette className="h-3.5 w-3.5" />
          المظهر البصري
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto p-1">
          {themes.map(t => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => setTheme(t.id)}
              className="flex items-center gap-3 rounded-lg px-2 py-2 focus:bg-muted"
            >
              <span
                className="flex h-6 w-12 shrink-0 overflow-hidden rounded-md border border-border"
                aria-hidden
              >
                {t.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-full flex-1"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              <span className="flex-1 space-y-0.5">
                <span className="block text-xs font-bold">{t.label}</span>
                <span className="block text-[10px] leading-tight text-muted-foreground">
                  {t.description}
                </span>
              </span>
              {t.id === theme && (
                <Check className="h-4 w-4 shrink-0 text-brand" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSwitcher;
