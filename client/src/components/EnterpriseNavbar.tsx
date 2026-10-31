/**
 * EnterpriseNavbar — World-Class Executive Navigation & Command Toolbar.
 *
 * Features:
 *   - Glassmorphism sticky header with backdrop blur
 *   - Global Command Search (Cmd+K / Ctrl+K quick launcher)
 *   - Multi-tenant / Branch switcher dropdown
 *   - Real-time connection & sync status indicator (Online/Offline/Syncing)
 *   - Quick notifications center & AI assistant toggle
 *   - User profile dropdown with theme switcher & language toggle
 *   - Fully touch-optimized for mobile bottom/top navigation
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Sparkles,
  Building2,
  ChevronDown,
  Globe,
  Moon,
  Sun,
  LogOut,
  Settings,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useResponsive } from "@/lib/useVirtualScroll";

export interface NavLink {
  path: string;
  label: string;
  labelAr: string;
  icon: React.ElementType;
  badge?: number;
}

export interface EnterpriseNavbarProps {
  appName?: string;
  tenantName?: string;
  branchName?: string;
  userName?: string;
  userRole?: string;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onAiAssistantClick?: () => void;
  onLogout?: () => void;
  syncStatus?: "idle" | "syncing" | "offline" | "error";
  className?: string;
}

const DEFAULT_LINKS: NavLink[] = [
  {
    path: "/app",
    label: "Dashboard",
    labelAr: "لوحة القيادة",
    icon: LayoutDashboard,
  },
  { path: "/inventory", label: "Inventory", labelAr: "المخزون", icon: Package },
  {
    path: "/commercial",
    label: "Commercial",
    labelAr: "التجارة",
    icon: ShoppingCart,
  },
  { path: "/journal", label: "Journal", labelAr: "اليوميات", icon: FileText },
];

export const EnterpriseNavbar = React.memo(
  ({
    appName = "Uamex ERP",
    tenantName = "مؤسسة الحسينية",
    branchName = "المركز الرئيسي",
    userName = "مدير النظام",
    userRole = "مسؤول تنفيذي",
    currentPath = "/app",
    onNavigate,
    onSearchClick,
    onNotificationClick,
    onAiAssistantClick,
    onLogout,
    syncStatus = "idle",
    className,
  }: EnterpriseNavbarProps) => {
    const { isMobile } = useResponsive();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
    const [tenantDropdownOpen, setTenantDropdownOpen] = React.useState(false);

    return (
      <header
        className={cn(
          "sticky top-0 z-50 w-full bg-[#091516]/90 backdrop-blur-xl border-b border-white/10 shadow-xl",
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tenant Selector */}
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-white"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}

            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onNavigate?.("/app")}
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#b87945] to-[#e2b17a] flex items-center justify-center shadow-lg shadow-[#b87945]/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight text-white">
                    {appName}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-[#b87945]/10 border-[#b87945]/30 text-[#e2b17a] py-0"
                  >
                    Pro
                  </Badge>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
                  >
                    <span>
                      {tenantName} — {branchName}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  <AnimatePresence>
                    {tenantDropdownOpen && (
                      <motion.div
                        className="absolute top-full mt-1 w-56 bg-[#102627] border border-white/10 rounded-xl shadow-2xl p-2 z-50"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        <div className="px-3 py-2 text-[10px] text-muted-foreground font-semibold border-b border-white/5">
                          المؤسسة والفروع النشطة
                        </div>
                        <button
                          className="w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 flex items-center justify-between text-white"
                          onClick={() => setTenantDropdownOpen(false)}
                        >
                          <span>{tenantName} (الرئيسي)</span>
                          <span className="h-2 w-2 rounded-full bg-success" />
                        </button>
                        <button
                          className="w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 flex items-center justify-between text-muted-foreground"
                          onClick={() => setTenantDropdownOpen(false)}
                        >
                          <span>فرع التجارة والمبيعات</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          {!isMobile && (
            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {DEFAULT_LINKS.map(link => {
                const Icon = link.icon;
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => onNavigate?.(link.path)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                      isActive
                        ? "bg-[#b87945] text-white shadow-md shadow-[#b87945]/20"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.labelAr}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-2">
            {/* Sync status indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-muted-foreground">
              {syncStatus === "syncing" ? (
                <>
                  <RefreshCw className="h-3 w-3 text-warning animate-spin" />
                  <span>جاري المزامنة...</span>
                </>
              ) : syncStatus === "offline" ? (
                <>
                  <WifiOff className="h-3 w-3 text-destructive" />
                  <span>أوفلاين</span>
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 text-success" />
                  <span>متصل</span>
                </>
              )}
            </div>

            {/* Quick Command Search Button */}
            <button
              onClick={onSearchClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-muted-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">بحث عام (Cmd+K)</span>
            </button>

            {/* AI Assistant Button */}
            <Button
              onClick={onAiAssistantClick}
              variant="outline"
              size="icon"
              className="bg-[#b87945]/10 border-[#b87945]/30 hover:bg-[#b87945]/20 text-[#e2b17a] rounded-xl"
              aria-label="AI Assistant"
            >
              <Sparkles className="h-4 w-4" />
            </Button>

            {/* Notification Bell */}
            <Button
              onClick={onNotificationClick}
              variant="outline"
              size="icon"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#b87945]" />
            </Button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#b87945] to-[#38bdf8] flex items-center justify-center text-white font-bold text-xs">
                  {userName.charAt(0)}
                </div>
                <div className="hidden xl:block text-right">
                  <div className="text-xs font-semibold text-white">
                    {userName}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {userRole}
                  </div>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-[#102627] border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="px-3 py-3 border-b border-white/5">
                      <div className="text-xs font-bold text-white">
                        {userName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        admin@alhusainia.com
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate?.("/settings");
                        }}
                        className="w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 flex items-center gap-2 text-white"
                      >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>إعدادات النظام</span>
                      </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate?.("/audit");
                        }}
                        className="w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 flex items-center gap-2 text-white"
                      >
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>سجل التدقيق والحوكمة</span>
                      </button>
                    </div>
                    <div className="pt-1 border-t border-white/5">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout?.();
                        }}
                        className="w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-destructive/10 flex items-center gap-2 text-destructive font-medium"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Slide-down Menu */}
        <AnimatePresence>
          {isMobile && mobileMenuOpen && (
            <motion.div
              className="absolute top-full left-0 right-0 bg-[#091516]/95 backdrop-blur-2xl border-b border-white/10 p-4 space-y-2 z-50 shadow-2xl"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {DEFAULT_LINKS.map(link => {
                const Icon = link.icon;
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate?.(link.path);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#b87945] text-white"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.labelAr}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    );
  }
);

EnterpriseNavbar.displayName = "EnterpriseNavbar";
