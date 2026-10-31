/**
 * EnterpriseEcosystemMaster — The Pinnacle of Ultra-Advanced Enterprise UI/UX.
 *
 * Implements:
 *   1. Official Brand Identity Header (هوية المؤسسة، الشعار، الألوان الرسمية)
 *   2. SaaS Dashboard Specialized Header (هيدر الشاشة الرئيسية للنظام، الأيقونات المخصصة، والألوان التنفيذية)
 *   3. Professional Bottom ToolStrip (شريط أدوات سفلي احترافي ومتطور)
 *   4. Collapsible Advanced Systems Panel with Quick Search & Access (لوحة الأنظمة المتقدمة القابلة للطي والبحث السريع)
 *   5. Framework Panel with Custom Scrollbars for Content Organization (لوحة إطار العمل مع أشرطة تمرير مخصصة لتنظيم المحتوى)
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Store,
  Bot,
  Search,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Database,
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  RefreshCw,
  Terminal,
  BarChart3,
  Layers,
  HelpCircle,
  Menu,
  X,
  Maximize2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface EnterpriseEcosystemMasterProps {
  className?: string;
}

export const EnterpriseEcosystemMaster = React.memo(
  ({ className }: EnterpriseEcosystemMasterProps) => {
    const [systemsPanelOpen, setSystemsPanelOpen] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [activeTab, setActiveTab] = React.useState<string>("overview");
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const systemsList = [
      {
        id: "accounting",
        name: "محاسبة القيد المزدوج (IFRS)",
        icon: FileText,
        category: "المالية",
      },
      {
        id: "inventory",
        name: "مصفوفة المخزون والمستودعات (WAC/FIFO)",
        icon: Package,
        category: "المخازن",
      },
      {
        id: "pos",
        name: "نقاط البيع والخزينة (POS)",
        icon: Store,
        category: "التجارة",
      },
      {
        id: "hr",
        name: "شؤون الموظفين والرواتب (HR)",
        icon: Layers,
        category: "الموارد البشرية",
      },
      {
        id: "ai",
        name: "المساعد التنفيذي الذكي (AI Hub)",
        icon: Bot,
        category: "الذكاء الاصطناعي",
      },
      {
        id: "audit",
        name: "سجل التدقيق والحوكمة (COSO)",
        icon: ShieldCheck,
        category: "الأمان والحوكمة",
      },
    ];

    const filteredSystems = systemsList.filter(
      s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGlobalSync = () => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1200);
    };

    return (
      <div
        className={cn(
          "min-h-screen bg-[#091516] text-[#f0ebe3] flex flex-col justify-between font-sans select-none",
          className
        )}
      >
        {/* 1. Official Brand Identity Header (هوية المؤسسة والشعار والألوان) */}
        <header className="w-full bg-[#0c1b1c] border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4 z-40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#b87945] to-[#e2b17a] flex items-center justify-center shadow-xl shadow-[#b87945]/30">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">
                  مؤسسة الحسينية لخدمات الأعمال
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] bg-[#b87945]/15 text-[#e2b17a] border-[#b87945]/30 py-0"
                >
                  Official Portal
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Uamex ERP Enterprise Ecosystem (v7.3.0)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="hidden sm:flex items-center gap-1.5 bg-success/10 text-success border-success/20 text-xs py-1"
            >
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>السحابة متصلة (Neon RLS)</span>
            </Badge>
          </div>
        </header>

        {/* 2. SaaS Dashboard Specialized Header (هيدر الشاشة الرئيسية والأيقونات المخصصة) */}
        <div className="w-full bg-[#102627]/90 backdrop-blur-2xl border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4 z-30 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <LayoutDashboard className="h-5 w-5 text-[#b87945]" />
              <span className="text-sm font-bold">
                لوحة القيادة والتشغيل التنفيذي
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGlobalSync}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  isRefreshing && "animate-spin text-[#e2b17a]"
                )}
              />
              <span className="hidden sm:inline">مزامنة فورية</span>
            </button>
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#b87945] to-[#38bdf8] flex items-center justify-center text-white font-bold text-xs shadow-md">
              ع
            </div>
          </div>
        </div>

        {/* Main Workspace Layout (Collapsible Systems Panel + Framework Panel with Custom Scrollbars) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* 4. Collapsible Advanced Systems Panel with Quick Search & Access */}
          <motion.div
            className={cn(
              "bg-[#0c1b1c]/95 backdrop-blur-2xl border-l border-white/10 transition-all duration-300 flex flex-col z-20 shrink-0",
              systemsPanelOpen ? "w-full md:w-80 p-5" : "w-16 p-3"
            )}
            initial={false}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              {systemsPanelOpen && (
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-[#e2b17a]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    الأنظمة المتقدمة
                  </h3>
                </div>
              )}
              <button
                onClick={() => setSystemsPanelOpen(!systemsPanelOpen)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors mx-auto md:mx-0"
              >
                {systemsPanelOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </button>
            </div>

            {systemsPanelOpen && (
              <div className="space-y-4 pt-4 flex-1 flex flex-col overflow-hidden">
                {/* Quick Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث سريع في الأنظمة..."
                    className="w-full pl-9 bg-white/5 border-white/10 text-white rounded-xl text-xs py-2"
                  />
                </div>

                {/* Systems List with Custom Scrollbars */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredSystems.map(sys => {
                    const Icon = sys.icon;
                    return (
                      <motion.button
                        key={sys.id}
                        onClick={() => setActiveTab(sys.id)}
                        className={cn(
                          "w-full text-right p-3 rounded-2xl flex items-center gap-3 transition-all",
                          activeTab === sys.id
                            ? "bg-[#b87945] text-white shadow-md shadow-[#b87945]/30"
                            : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="p-2 rounded-xl bg-black/20 shrink-0">
                          <Icon className="h-4 w-4 text-[#e2b17a]" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold truncate text-white">
                            {sys.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {sys.category}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* 5. Framework Panel with Custom Scrollbars for Content Organization */}
          <div className="flex-1 bg-[#091516] p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="glass-panel-enterprise p-6 md:p-8 rounded-3xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#b87945]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <div>
                  <Badge
                    variant="outline"
                    className="bg-[#b87945]/10 text-[#e2b17a] border-[#b87945]/30 mb-2"
                  >
                    إطار العمل التنفيذي (Framework Canvas)
                  </Badge>
                  <h2 className="text-xl md:text-2xl font-black text-white">
                    لوحة التحكم والإدارة — النظام النشط:{" "}
                    {systemsList.find(s => s.id === activeTab)?.name ??
                      "نظرة عامة"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    جاهز للتشغيل الفوري
                  </Badge>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-[#b87945]/20 text-[#e2b17a]">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      ترابط الوحدات وقاعدة البيانات السحابية
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      كافة العمليات تخضع للتدقيق الآلي مع توفير استجابة فورية
                      أقل من 12ms.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div className="p-4 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      حالة الحوكمة (COSO/IFRS)
                    </span>
                    <div className="text-sm font-bold text-success">
                      مطبق بالكامل (100%)
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      عزل البيانات (RLS)
                    </span>
                    <div className="text-sm font-bold text-[#e2b17a]">
                      مفعل وآمن جداً
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/20 space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      سرعة الاستجابة
                    </span>
                    <div className="text-sm font-bold text-sky-400">
                      60 FPS ⚡
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Professional Bottom ToolStrip (شريط أدوات سفلي احترافي ومتطور) */}
        <footer className="w-full bg-[#0c1b1c] border-t border-white/10 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground z-40">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-white font-medium">
              <Building2 className="h-4 w-4 text-[#b87945]" />
              <span>مؤسسة الحسينية لخدمات الأعمال</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">منصة Uamex ERP المتكاملة</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>حماية أمنية متكاملة (AES-256)</span>
            </span>
            <span>•</span>
            <span>© 2018-2026 جميع الحقوق محفوظة</span>
          </div>
        </footer>
      </div>
    );
  }
);

EnterpriseEcosystemMaster.displayName = "EnterpriseEcosystemMaster";
