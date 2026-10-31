import React from "react";
import { useLocation } from "wouter";
import { goToSystem } from "@/lib/deploymentLinks";
import { withViewTransition } from "@/lib/viewTransition";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Globe,
  ChevronDown,
  Phone,
  ShieldCheck,
  Settings,
  Zap,
  Home as HomeIcon,
  CheckCircle2,
  Award,
  Building2,
  Users,
  BarChart3,
  Sparkles,
  ArrowRight,
  Search,
  Mail,
  MapPin,
} from "lucide-react";
import { MessageSquare } from "lucide-react";
import {
  HusHomeIcon,
  HusLayersIcon,
  HusGridIcon,
  HusSearchIcon,
  HusPlatformIcon,
  HusCompassIcon,
} from "@/components/icons/HusIcons";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { BrandLogo, BrandMark } from "@/components/BrandLogo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  MARKETING_NAV,
  UTILITY_LINKS,
  PLATFORM_CLUSTER,
  SOLUTIONS_CLUSTER,
  COMPANY_CLUSTER,
  TOOLS_CLUSTER,
  type NavItem,
} from "@/lib/nav";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface Props {
  onOpenSettings?: () => void;
}

/** ترتيب خبير للصفحات التعريفية: الرئيسية → من نحن → قطاعات الأعمال → المزيد(كل الأدوات) */
const DIRECT_NAV_PATHS = ["/", "/about"];
const BUSINESS_SECTORS_ITEMS: NavItem[] = [...SOLUTIONS_CLUSTER];
const MORE_ITEMS: NavItem[] = [
  ...TOOLS_CLUSTER,
  ...COMPANY_CLUSTER.filter(c => c.path !== "/about"),
  ...PLATFORM_CLUSTER,
];
const DOMAIN_CLUSTERS: ReadonlyArray<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}> = [
  {
    key: "business",
    label: "قطاعات الأعمال",
    icon: HusLayersIcon,
    items: BUSINESS_SECTORS_ITEMS,
  },
  { key: "more", label: "المزيد", icon: HusGridIcon, items: MORE_ITEMS },
];
const NAV_BY_PATH = new Map(
  [
    ...MARKETING_NAV,
    ...UTILITY_LINKS,
    ...SOLUTIONS_CLUSTER,
    ...COMPANY_CLUSTER,
    ...PLATFORM_CLUSTER,
    ...TOOLS_CLUSTER,
    { path: "/", label: "الرئيسية", icon: HomeIcon } as NavItem,
  ].map(item => [item.path, item])
);
const ROUTE_PREFETCHERS: Record<string, () => Promise<unknown>> = {
  "/about": () => import("@/pages/About"),
  "/pricing": () => import("@/pages/Pricing"),
  "/contact": () => import("@/pages/Contact"),
  "/tools": () => import("@/pages/InteractiveCalculators"),
  "/insights": () => import("@/pages/KnowledgeHub"),
  "/portal": () => import("@/pages/Portal"),
  "/integrate": () => import("@/pages/Integrate"),
  "/download": () => import("@/pages/Download"),
};
const prefetched = new Set<string>();
function prefetch(path: string) {
  const clean = path.split("#")[0] || "/";
  const loader = ROUTE_PREFETCHERS[clean];
  if (!loader || prefetched.has(clean)) return;
  prefetched.add(clean);
  void loader().catch(() => {});
}

export function MarketingHeader({ onOpenSettings }: Props) {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { setLanguage, language } = useI18n();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openCluster, setOpenCluster] = React.useState<string | null>(null);
  const [mobileOpenClusters, setMobileOpenClusters] = React.useState<
    Record<string, boolean>
  >({});
  const [scrolled, setScrolled] = React.useState(false);

  const visibleClusters = DOMAIN_CLUSTERS;
  const homeItem: NavItem = {
    path: "/",
    label: "الرئيسية",
    icon: HusHomeIcon,
    description: "نظرة شاملة — من القيد إلى القرار",
  };
  const aboutItem = COMPANY_CLUSTER.find(c => c.path === "/about")!;
  const mobileNav: NavItem[] = [
    homeItem,
    aboutItem,
    ...BUSINESS_SECTORS_ITEMS,
    ...MORE_ITEMS,
  ];

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenCluster(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  React.useEffect(() => {
    setOpenCluster(null);
    setMobileOpen(false);
  }, [location]);
  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navigateOrScroll = React.useCallback(
    (path: string) => {
      setMobileOpen(false);
      if (!path.includes("#")) {
        withViewTransition(() => setLocation(path));
        return;
      }
      const [pagePath, hash] = path.split("#");
      const scrollToHash = () =>
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (location !== pagePath && pagePath !== "/") {
        withViewTransition(() => setLocation(pagePath));
        window.setTimeout(scrollToHash, 380);
      } else if (location !== "/" && pagePath === "/") {
        withViewTransition(() => setLocation("/"));
        window.setTimeout(scrollToHash, 380);
      } else {
        scrollToHash();
      }
    },
    [location, setLocation]
  );

  const baseBtn =
    "nav-apex h-8 px-3 text-[13px] transition-all gap-1.5 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none rounded-lg";
  const navClass = (active: boolean, highlight?: boolean) => {
    if (active) return "bg-slate-900 text-white font-bold shadow-sm";
    if (highlight)
      return "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100";
    return "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent";
  };

  return (
    <header className="sticky top-0 z-50 text-ink" dir="rtl">
      {/* Top Bar — Official Identity */}
      <div
        className={`hidden lg:flex items-center justify-between px-4 backdrop-blur border-b text-[11px] transition-all duration-300 ${
          scrolled
            ? "h-0 overflow-hidden opacity-0 py-0 border-transparent"
            : "h-7 py-0 opacity-100"
        } bg-white/80 border-slate-200 text-slate-500`}
        aria-label="معلومات المؤسسة"
      >
        <div className="flex items-center gap-3 tracking-normal">
          {/* Official Brand Mark in Top Bar */}
          <BrandLogo size={18} withWordmark={false} onDark={false} />
          <span className="hidden xl:inline font-medium text-slate-700">
            {brand.names.siteName}
          </span>
        </div>
        <div className="flex items-center gap-4 font-medium text-slate-600">
          <a
            href={`tel:${brand.contact.phone}`}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
            aria-label="اتصال هاتفي"
          >
            <Phone className="w-3.5 h-3.5 text-brand" />
            {brand.contact.phone}
          </a>
          <span className="w-px h-4 bg-slate-200" />
          <a
            href={`mailto:${brand.contact.email}`}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors hidden sm:inline-flex"
            aria-label="بريد إلكتروني"
          >
            <Mail className="w-3.5 h-3.5 text-brand" />
            {brand.contact.email}
          </a>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            {brand.contact.address}
          </span>
        </div>
      </div>

      {/* Main Header — Brand + Navigation + Actions */}
      <div className="header-apex">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4 h-[56px]">
          {/* Brand Lockup — Official Identity */}
          <div
            className="flex items-center gap-3 cursor-pointer group/brand shrink-0"
            onClick={() => setLocation("/")}
            role="link"
            aria-label={`الرئيسية — ${brand.names.siteName}`}
          >
            <BrandLogo size={32} withWordmark={true} onDark={true} />
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center gap-1 flex-1 justify-center"
            aria-label="التنقل الرئيسي"
          >
            {/* Direct Navigation: Home + About */}
            {DIRECT_NAV_PATHS.map(p => {
              const item = NAV_BY_PATH.get(p);
              if (!item) return null;
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateOrScroll(item.path)}
                  onMouseEnter={() => prefetch(item.path)}
                  aria-current={isActive ? "page" : undefined}
                  className={`${baseBtn} ${navClass(isActive, item.highlight)} group relative`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  <span
                    className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-brand transition-all ${
                      isActive ? "w-2/3" : "w-0 group-hover:w-2/3"
                    }`}
                  />
                </Button>
              );
            })}

            {/* Mega-menu Clusters */}
            {visibleClusters.map(cluster => {
              const Icon = cluster.icon;
              const items = cluster.items;
              const isOpen = openCluster === cluster.key;
              const containsActive = items.some(i => location === i.path);
              return (
                <div
                  key={cluster.key}
                  className="relative"
                  onMouseEnter={() => {
                    setOpenCluster(cluster.key);
                    items.forEach(it => prefetch(it.path));
                  }}
                  onMouseLeave={() => setOpenCluster(null)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenCluster(isOpen ? null : cluster.key)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={`${baseBtn} ${navClass(containsActive)} group`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        !containsActive ? "text-slate-400" : "text-brand"
                      }`}
                    />
                    {cluster.label}
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.16 }}
                        className="absolute top-full right-0 mt-2 rounded-2xl border p-2 min-w-[340px] bg-card border-slate-200 shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
                      >
                        {items.map(item => {
                          const I = item.icon;
                          const active = location === item.path;
                          return (
                            <button
                              key={item.path}
                              onClick={() => navigateOrScroll(item.path)}
                              aria-current={active ? "page" : undefined}
                              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-right ${
                                active
                                  ? "bg-slate-900 text-white"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <span
                                className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
                                  active
                                    ? "bg-white/10 border-white/10 text-white"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <I className="w-4 h-4" />
                              </span>
                              <span className="flex flex-col gap-0.5 text-right">
                                <span
                                  className={`text-[13px] font-bold ${
                                    active ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {item.description && (
                                  <span
                                    className={`text-[11px] ${
                                      active
                                        ? "text-white/70"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {item.description}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-r border-slate-200">
              {isAuthenticated ? (
                <Button
                  onClick={() => goToSystem("/app")}
                  className="bg-brand hover:bg-brandDeep text-white font-bold h-8 px-4 rounded-lg text-[13px] flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ادخل النظام</span>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => goToSystem("/login")}
                    className="hidden lg:inline-flex h-8 px-3.5 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50"
                  >
                    دخول النظام
                  </Button>
                  <Button
                    onClick={() => goToSystem("/login")}
                    className="bg-brand hover:bg-brandDeep text-white font-bold h-8 px-4 rounded-lg text-[13px] flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">سجل منشأتك</span>
                  </Button>
                </>
              )}
            </div>
          </nav>

          {/* Right Actions: Settings + Theme + Language + Mobile Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
                className="h-8 text-xs px-2.5 hidden sm:flex bg-card border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Settings className="w-3.5 h-3.5" />
                إعدادات
              </Button>
            )}
            <ThemeSwitcher compact />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-50"
              aria-label={`تبديل اللغة إلى ${language === "ar" ? "English" : "العربية"}`}
            >
              <Globe className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 h-9 w-9 text-slate-700"
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 top-[84px] bg-black/40 backdrop-blur-sm z-40"
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute inset-x-3 top-full mt-2 rounded-2xl border bg-card border-slate-200 shadow-xl p-3 space-y-3 max-h-[70vh] overflow-y-auto z-50"
              role="dialog"
              aria-modal="true"
              aria-label="قائمة التنقل"
            >
              {/* Mobile CTA Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    goToSystem("/login");
                    setMobileOpen(false);
                  }}
                  className="h-9 text-xs border-slate-200"
                >
                  دخول النظام
                </Button>
                <Button
                  onClick={() => {
                    goToSystem("/login");
                    setMobileOpen(false);
                  }}
                  className="h-9 text-xs bg-brand hover:bg-brandDeep text-white"
                >
                  سجل منشأتك
                </Button>
              </div>

              {/* Mobile Nav Items */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                {mobileNav.map(item => {
                  const I = item.icon;
                  const active = location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigateOrScroll(item.path)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <I className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}

                {/* Mobile Cluster Menus */}
                {visibleClusters.map(cluster => {
                  const Icon = cluster.icon;
                  const items = cluster.items;
                  const isOpen = mobileOpenClusters[cluster.key] ?? false;
                  const containsActive = items.some(i => location === i.path);
                  return (
                    <div
                      key={cluster.key}
                      className="border-t border-slate-100 pt-1"
                    >
                      <button
                        onClick={() =>
                          setMobileOpenClusters(prev => ({
                            ...prev,
                            [cluster.key]: !prev[cluster.key],
                          }))
                        }
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                          containsActive
                            ? "text-brand"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                        aria-expanded={isOpen}
                      >
                        <span className="flex items-center gap-2">
                          <Icon
                            className={`w-4 h-4 ${containsActive ? "text-brand" : "text-slate-400"}`}
                          />
                          {cluster.label}
                        </span>
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="space-y-1 mt-1 ml-8 pr-2 border-r border-slate-100">
                          {items.map(item => {
                            const I = item.icon;
                            const active = location === item.path;
                            return (
                              <button
                                key={item.path}
                                onClick={() => navigateOrScroll(item.path)}
                                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] font-medium ${
                                  active
                                    ? "bg-brand/10 text-brand"
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <I className="w-3.5 h-3.5" />
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
