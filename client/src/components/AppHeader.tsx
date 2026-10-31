import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { ShieldCheck } from "lucide-react";
import { HusSearchIcon } from "@/components/icons/HusIcons";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { ProductLogo } from "@/components/BrandLogo";
import { APP_NAV } from "@/lib/nav";

/** Product-first navigation for the authenticated workspace. */
export function AppHeader() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const current = APP_NAV.find(
    item =>
      location === item.path ||
      (item.path !== "/app" && location.startsWith(item.path))
  );

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-white/10 bg-ink-deep/95 text-white backdrop-blur supports-[backdrop-filter]:bg-ink-deep/85"
      dir="rtl"
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <ProductLogo size={32} />
          <span
            className="hidden h-5 w-px bg-white/15 sm:block"
            aria-hidden="true"
          />
          <span
            className="hidden truncate text-xs font-semibold text-white/80 sm:block"
            aria-current="page"
          >
            {current?.label ?? "لوحة العمل"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("alh:open-command"))}
            aria-label="فتح البحث والأوامر السريعة"
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <HusSearchIcon size={15} className="text-brand-300" />
            <span className="hidden text-[11px] sm:inline">بحث</span>
            <kbd className="hidden rounded border border-white/10 bg-white/5 px-1 text-[9px] text-white/50 xl:inline">
              Ctrl K
            </kbd>
          </button>
          <ThemeSwitcher compact />
          <TenantSwitcher />
          {isAuthenticated && (
            <span
              className="hidden min-h-9 items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 text-[11px] font-bold text-brand-300 md:inline-flex"
              title={user?.name || "المستخدم"}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="max-w-24 truncate">
                {user?.name?.split(" ")[0] || "المستخدم"}
              </span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
