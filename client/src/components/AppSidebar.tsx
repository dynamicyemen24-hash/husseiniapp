import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { goToMarketing } from "@/lib/deploymentLinks";
import {
  Menu,
  X,
  ChevronsRight,
  ChevronsLeft,
  LogOut,
  Globe,
} from "lucide-react";
import { UTILITY_LINKS, APP_GROUPS } from "@/lib/nav";
import { useAuth } from "@/_core/hooks/useAuth";
import { ProductLogo } from "@/components/BrandLogo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { MessagesButton } from "@/components/MessagesButton";
import { ROLE_DEFINITIONS, type RoleCode } from "@shared/permissions";

/**
 * ────────────────────────────────────────────────────────────────────────
 * AppSidebar — Layer 2 navigation (authenticated app shell)
 * ────────────────────────────────────────────────────────────────────────
 *
 * A collapsible sidebar (desktop rail ↔ full, mobile drawer) that gives
 * power users one-click access to every workspace. Utility tools live in a
 * secondary section. Collapsing keeps dense screens uncluttered while
 * preserving instant navigation via icon tooltips.
 */
export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => setOpen(false), [location]);

  const renderSidebar = (
    variant: "desktop" | "drawer",
    isCollapsed: boolean
  ) => {
    const isDrawer = variant === "drawer";
    const compact = isCollapsed && !isDrawer;

    const navClass = (active: boolean) =>
      active
        ? "bg-brand text-ink-deep font-bold shadow relative"
        : "text-white/70 hover:bg-white/5 hover:text-white relative";

    return (
      <div className="flex flex-col h-full">
        {/* Brand mark + collapse / close controls */}
        <div className="flex items-center gap-2.5 px-3 py-4 border-b border-white/10">
          <ProductLogo size={compact ? 30 : 36} compact={compact} />
          {isDrawer ? (
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden mr-auto text-white/60 hover:text-white p-1"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            !compact && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="mr-auto text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="طي القائمة"
                title="طي/توسيع القائمة"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            )
          )}
          {compact && !isDrawer && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="absolute top-3 left-2 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="توسيع القائمة"
              title="توسيع القائمة"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User badge */}
        {user && (
          <div
            className={`px-4 py-3 border-b border-white/10 flex items-center gap-2.5 ${
              compact ? "justify-center" : ""
            }`}
          >
            <NotificationBell compact={compact} />
            <MessagesButton compact={compact} />
            <div className="w-8 h-8 rounded-full brand-gradient-warm flex items-center justify-center text-ink font-black text-xs shrink-0">
              {(user.name || "م").charAt(0)}
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user.name || "مشرف المنصة"}
                </p>
                <p className="text-[10px] text-brand-300">
                  {ROLE_DEFINITIONS[user.role as RoleCode]?.label ?? "مستخدم"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Primary app navigation — 5 مجالات تشغيلية منفصلة (Finance/Commerce/Ops/Intelligence/Governance) */}
        <nav
          className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto scrollbar-thin"
          aria-label="تنقل النظام"
        >
          {APP_GROUPS.map(group => (
            <div key={group.key} className="space-y-1">
              {!compact ? (
                <div className="px-2 pb-1">
                  <p className="text-[9px] font-black tracking-[0.12em] text-white/60 flex items-center gap-1.5">
                    {group.label}
                    <span className="h-px flex-1 bg-white/10" />
                  </p>
                  <p className="text-[10px] text-white/60 leading-none mt-0.5">
                    {group.description}
                  </p>
                </div>
              ) : (
                <div className="h-px bg-white/10 mx-2" />
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive =
                  location === item.path ||
                  (item.path !== "/app" && location.startsWith(item.path));
                return (
                  <button
                    key={`${group.key}-${item.path}`}
                    onClick={() => setLocation(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    title={
                      compact
                        ? `${group.label}: ${item.label}`
                        : item.description || item.label
                    }
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${navClass(isActive)} ${compact ? "justify-center" : ""}`}
                  >
                    {isActive && (
                      <span className="absolute inset-y-2 right-0 w-1 rounded-full bg-brand-300" />
                    )}
                    <Icon className="w-4 h-4 shrink-0" />
                    {!compact && <span className="truncate">{item.label}</span>}
                    {!compact && item.highlight && !isActive && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* أدوات الموقع التعريفي — مفصولة بصرياً عن النظام */}
          <div className="pt-2 border-t border-white/10 space-y-1">
            {!compact && (
              <p className="text-[9px] font-bold text-white/60 tracking-wider px-2 pb-1">
                روابط الموقع التعريفي
              </p>
            )}
            {UTILITY_LINKS.map(item => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  title={compact ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${navClass(isActive)} ${compact ? "justify-center" : ""}`}
                >
                  {isActive && (
                    <span className="absolute inset-y-2 right-0 w-1 rounded-full bg-brand-300" />
                  )}
                  <Icon className="w-4 h-4 shrink-0 opacity-60" />
                  {!compact && (
                    <span className="text-white/60">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer: collapse toggle (desktop) + theme + back to site + logout */}
        <div className="border-t border-white/10 p-2.5 space-y-1">
          <div
            className={`flex items-center gap-1 ${compact ? "" : "justify-between"}`}
          >
            <ThemeSwitcher compact={compact} />
            {compact && !isDrawer && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-center px-3 py-2 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="توسيع القائمة"
                title="توسيع القائمة"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={goToMarketing}
            title={compact ? "الموقع الإلكتروني والخدمات" : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/65 hover:bg-white/10 hover:text-white transition-colors ${
              compact ? "justify-center" : ""
            }`}
          >
            <Globe className="w-4 h-4 text-brand-300 shrink-0" />
            {!compact && <span>الموقع الإلكتروني والخدمات</span>}
          </button>
          {user && (
            <button
              onClick={async () => {
                await logout();
                goToMarketing();
              }}
              title={compact ? "تسجيل الخروج" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 transition-colors ${
                compact ? "justify-center" : ""
              }`}
            >
              <LogOut className="w-4 h-4" />
              {!compact && <span>تسجيل الخروج</span>}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar — Apex Luxury with silk texture */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-ink border-l border-white/10 sticky top-0 h-screen z-40 transition-[width] duration-300 texture-silk shadow-luxury ${
          collapsed ? "w-[76px]" : "w-60"
        }`}
        dir="rtl"
      >
        {renderSidebar("desktop", collapsed)}
      </aside>

      {/* Mobile drawer trigger + drawer */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 min-h-11 min-w-11 bg-brand text-ink-deep p-3 rounded-2xl shadow-2xl hover:scale-105 transition-transform"
        aria-label="فتح قائمة النظام"
        aria-expanded={open}
        aria-controls="mobile-system-navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" dir="rtl">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer panel */}
          <aside
            id="mobile-system-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة النظام"
            className="relative w-72 max-w-[85vw] bg-ink border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300"
          >
            {renderSidebar("drawer", false)}
          </aside>
        </div>
      )}
    </>
  );
}
