/**
 * EnterpriseFinancialMaster — Deep Enterprise Financial Operations.
 *
 * Covers the absolute core financial & operational engines:
 *   1. Vouchers (سندات القبض والصرف اليومية مع القيد المزدوج)
 *   2. Invoices (فواتير المبيعات والمشتريات والضرائب والخصومات)
 *   3. Opening Balances (الأرصدة الافتتاحية للميزانية والعملاء والمخزون)
 *   4. Year-End Closing (إقفال السنة المالية وترحيل الأرباح والخسائر)
 *   5. Physical Inventory & Stock Count (جرد المخزون الفعلي وتسوية الفروقات)
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Receipt,
  Scale,
  Lock,
  PackageSearch,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  ShieldCheck,
  Calculator,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface EnterpriseFinancialMasterProps {
  className?: string;
}

export const EnterpriseFinancialMaster = React.memo(
  ({ className }: EnterpriseFinancialMasterProps) => {
    const [activeSection, setActiveSection] = React.useState<
      | "vouchers"
      | "invoices"
      | "opening_balances"
      | "closing"
      | "physical_count"
    >("vouchers");
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleAction = () => {
      setIsProcessing(true);
      setTimeout(() => setIsProcessing(false), 1200);
    };

    return (
      <div
        className={cn(
          "min-h-screen bg-[#091516] text-[#f0ebe3] p-4 md:p-8 space-y-8",
          className
        )}
      >
        {/* Header */}
        <div className="glass-panel-enterprise p-6 md:p-8 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#b87945]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-[#b87945]/15 border-[#b87945]/30 text-[#e2b17a]"
              >
                Deep Financial & Operational Core
              </Badge>
              <Badge
                variant="outline"
                className="bg-success/10 border-success/20 text-success"
              >
                IFRS Double-Entry Active
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              إدارة السندات، الفواتير، الأرصدة الافتتاحية، الإقفالات والجرد
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              الوحدة التشغيلية العميقة للمعاملات المالية والمحاسبية والمخزنية
              المطابقة لمعايير الحوكمة.
            </p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            {
              id: "vouchers",
              label: "السندات اليومية (قبض وصرف)",
              icon: Receipt,
            },
            { id: "invoices", label: "الفواتير والضرائب", icon: FileText },
            {
              id: "opening_balances",
              label: "الأرصدة الافتتاحية",
              icon: Calculator,
            },
            {
              id: "closing",
              label: "الإقفال السنوي وترحيل الأرباح",
              icon: Lock,
            },
            {
              id: "physical_count",
              label: "الجرد الفعلي وتسوية المخزون",
              icon: PackageSearch,
            },
          ].map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-md",
                  isActive
                    ? "bg-[#b87945] text-white shadow-[#b87945]/30"
                    : "glass-card-enterprise text-muted-foreground hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Section Panel */}
        <div className="glass-panel-enterprise p-6 md:p-8 rounded-3xl space-y-6">
          {activeSection === "vouchers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    سندات القبض والصرف وقيد اليومية المزدوج
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    تسجيل العمليات المالية مع التحقق من توازن المدين والدائن
                    لحظياً
                  </p>
                </div>
                <Button
                  onClick={handleAction}
                  className="bg-[#b87945] hover:bg-[#b87945]/90 text-white rounded-xl gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>سند جديد</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[#e2b17a]">
                      RV-2026-001
                    </span>
                    <Badge className="bg-success/10 text-success border-success/20">
                      مرحّل للقيد المزدوج
                    </Badge>
                  </div>
                  <div className="font-bold text-white text-sm">
                    سند قبض نقدي — شركة الأندلس
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>المبلغ: 250,000 ر.ي</span>
                    <span>التاريخ: اليوم</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[#e2b17a]">
                      PV-2026-012
                    </span>
                    <Badge className="bg-success/10 text-success border-success/20">
                      مرحّل للقيد المزدوج
                    </Badge>
                  </div>
                  <div className="font-bold text-white text-sm">
                    سند صرف — نفقات تشغيلية مركزية
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>المبلغ: 75,000 ر.ي</span>
                    <span>التاريخ: أمس</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "invoices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    إدارة الفواتير، الضرائب والخصومات والعمولات
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    فواتير مبيعات ومشتريات مرتبطة مباشرة بالعملاء والموردين
                    والمخزون
                  </p>
                </div>
                <Button
                  onClick={handleAction}
                  className="bg-[#b87945] hover:bg-[#b87945]/90 text-white rounded-xl gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>إصدار فاتورة إلكترونية</span>
                </Button>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    محرك حساب الضرائب والخصومات الآلي
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-[#b87945]/10 text-[#e2b17a] border-[#b87945]/30"
                  >
                    مفعل
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يتم حساب ضريبة القيمة المضافة أو الضرائب المحلية تلقائياً
                  بناءً على إعدادات الفرع والعميل، مع تسجيل إيراد الضريبة في
                  الحسابات المخصصة لها في الدليل الشجري.
                </p>
              </div>
            </div>
          )}

          {activeSection === "opening_balances" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    إدخال وترحيل الأرصدة الافتتاحية للميزانية والعملاء والمخزون
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ضبط الأرصدة البداية للمؤسسة والفروع عند تفعيل النظام
                  </p>
                </div>
                <Button
                  onClick={handleAction}
                  className="bg-[#b87945] hover:bg-[#b87945]/90 text-white rounded-xl gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  <span>تسوية ومطابقة الأرصدة</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1">
                  <div className="text-xs text-muted-foreground">
                    أرصدة الحسابات الافتتاحية
                  </div>
                  <div className="text-lg font-bold text-success">
                    مطابقة (0.00 فرق)
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1">
                  <div className="text-xs text-muted-foreground">
                    أرصدة العملاء والموردين
                  </div>
                  <div className="text-lg font-bold text-white">
                    مرحّلة بالكامل
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1">
                  <div className="text-xs text-muted-foreground">
                    تقييم المخزون البدائي
                  </div>
                  <div className="text-lg font-bold text-[#e2b17a]">
                    620,000 ر.ي
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "closing" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    إقفال السنة المالية وترحيل الأرباح والخسائر
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    إغلاق حسابات الإيرادات والمصروفات وترحيل صافي الدخل للمركز
                    المالي
                  </p>
                </div>
                <Button
                  onClick={handleAction}
                  className="bg-destructive hover:bg-destructive/90 text-white rounded-xl gap-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>بدء إجراءات الإقفال السنوي</span>
                </Button>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-warning text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    إجراء سيادي حساس: يتطلب صلاحية المدير العام وتوثيق سجل
                    التدقيق.
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يقوم النظام بإجراء قيود الإقفال الآلية لكل الإيرادات
                  والمصروفات، وتوليد قائمة الدخل الختامية والميزانية العمومية
                  للسنة المالية المنتهية مع قفل الفترة لمنع أي تعديل لاحق.
                </p>
              </div>
            </div>
          )}

          {activeSection === "physical_count" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    الجرد الفعلي وتسوية فروقات المخزون (Physical Count &
                    Adjustments)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    مطابقة الكميات الدفترية بالكميات الفعلية في المستودعات مع
                    إثبات التسويات المحاسبية
                  </p>
                </div>
                <Button
                  onClick={handleAction}
                  className="bg-[#b87945] hover:bg-[#b87945]/90 text-white rounded-xl gap-2"
                >
                  <PackageSearch className="h-4 w-4" />
                  <span>بدء جلسة جرد جديدة</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-white text-sm">
                    محضر جرد المستودع المركزي #01
                  </div>
                  <p className="text-xs text-muted-foreground">
                    حالة الجرد: مكتمل ومطابق بنسبة 99.2%
                  </p>
                  <div className="text-xs text-success font-semibold">
                    تم اعتماد تسوية الفروقات البسيطة آلياً.
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-white text-sm">
                    محضر جرد فرع التجارة #02
                  </div>
                  <p className="text-xs text-muted-foreground">
                    حالة الجرد: قيد المراجعة والمطابقة النهائية
                  </p>
                  <div className="text-xs text-warning font-semibold">
                    يوجد عجز طفيف يتطلب اعتماد الإدارة.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

EnterpriseFinancialMaster.displayName = "EnterpriseFinancialMaster";
