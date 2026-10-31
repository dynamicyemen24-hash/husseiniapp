import React, { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Layers,
  ShoppingCart,
  Building2,
  Users,
  Package,
  DollarSign,
  BarChart3,
  Printer,
  Sparkles,
  Sliders,
} from "lucide-react";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";

export function BusinessLifecycleWizard() {
  const [activeStage, setActiveStage] = useState<
    "setup" | "operations" | "outputs"
  >("setup");

  return (
    <Card
      className="border-2 border-ink/30 bg-card shadow-xl rounded-3xl p-5 sm:p-6 space-y-6 font-sans"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-3">
        <div>
          <Badge className="bg-ink text-brand-300 font-bold text-xs mb-1">
            دورة العمل المؤسسية المعيارية
          </Badge>
          <CardTitle className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand" />
            دورة العمل التجارية المتكاملة للمنشآت والمؤسسات
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            دليل إرشادي وتفاعلي موحد ينظم الانتقال السلس من التهيئة والبيانات
            الأساسية إلى العمليات والمخرجات الرسمية.
          </CardDescription>
        </div>
      </div>

      {/* Stage Stepper Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-muted p-1.5 rounded-2xl border border-border">
        <button
          onClick={() => setActiveStage("setup")}
          className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeStage === "setup"
              ? "bg-ink text-white shadow"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <Settings className="w-4 h-4 text-brand" />
          <span>1. التهيئة والبيانات</span>
        </button>

        <button
          onClick={() => setActiveStage("operations")}
          className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeStage === "operations"
              ? "bg-brand text-ink-deep shadow"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-ink" />
          <span>2. العمليات التشغيلية</span>
        </button>

        <button
          onClick={() => setActiveStage("outputs")}
          className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeStage === "outputs"
              ? "bg-emerald-800 text-white shadow"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>3. المخرجات والتقارير</span>
        </button>
      </div>

      {/* Stage 1: Setup */}
      {activeStage === "setup" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1">
            <h3 className="font-bold text-sm text-ink flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-brand" /> المرحلة الأولى:
              الإعداد والبيانات الأساسية للمؤسسة
            </h3>
            <p className="text-muted-foreground">
              بناء البنية التحتية المحاسبية والتنظيمية قبل بدء المبيعات والحركات
              المالية.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <Card className="p-4 bg-muted border border-border space-y-2">
              <div className="p-2 bg-ink text-white rounded-lg w-fit">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-foreground">
                إعدادات المؤسسة والتثبيت
              </h4>
              <p className="text-muted-foreground text-[11px]">
                تحديد الاسم التجاري، الرقم الضريبي، والعملة المحلية.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/settings")}
                className="w-full bg-ink text-white text-[11px] h-7"
              >
                تعديل الإعدادات
              </Button>
            </Card>

            <Card className="p-4 bg-muted border border-border space-y-2">
              <div className="p-2 bg-brand text-white rounded-lg w-fit">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-foreground">
                دليل الحسابات الشجري
              </h4>
              <p className="text-muted-foreground text-[11px]">
                تهيئة الأصول، الخصوم، الإيرادات، والمصروفات.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/accounting")}
                className="w-full bg-brand text-ink-deep font-bold text-[11px] h-7"
              >
                إدارة الحسابات
              </Button>
            </Card>

            <Card className="p-4 bg-muted border border-border space-y-2">
              <div className="p-2 bg-emerald-700 text-white rounded-lg w-fit">
                <Package className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-foreground">
                دليل الخدمات والأصناف
              </h4>
              <p className="text-muted-foreground text-[11px]">
                ترميز الأصناف والمجموعات الهندسية والمكتبية.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/commercial")}
                className="w-full bg-emerald-800 text-white text-[11px] h-7"
              >
                كتالوج الأصناف
              </Button>
            </Card>

            <Card className="p-4 bg-muted border border-border space-y-2">
              <div className="p-2 bg-blue-700 text-white rounded-lg w-fit">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-foreground">
                سجل العملاء والموردين
              </h4>
              <p className="text-muted-foreground text-[11px]">
                إدخال الأرصدة الافتتاحية وحدود الائتمان.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/commercial")}
                className="w-full bg-blue-800 text-white text-[11px] h-7"
              >
                سجل العملاء
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Stage 2: Operations */}
      {activeStage === "operations" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 space-y-1">
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-emerald-700" /> المرحلة
              الثانية: التنفيذ والعمليات التشغيلية اليومية
            </h3>
            <p className="text-muted-foreground">
              تسجيل الفواتير، المقبوضات، المبيعات، ومتابعة المشاريع الهندسية
              والخدمات.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <Card className="p-4 bg-card border border-border space-y-3">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> فواتير
                المبيعات وسندات الخزينة
              </h4>
              <p className="text-muted-foreground text-[11px]">
                إصدار الفواتير الفورية والربط المباشر بالقيد المزدوج.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/accounting")}
                className="w-full bg-ink text-white text-sm h-10 rounded-lg flex items-center justify-center gap-2 shadow"
              >
                إضافة معاملة مالية
              </Button>
            </Card>

            <Card className="p-4 bg-card border border-border space-y-3">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" /> توريد وعمليات
                المخزون
              </h4>
              <p className="text-muted-foreground text-[11px]">
                تسجيل فواتير الشراء وتعديل الكميات بالمخازن.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/commercial")}
                className="w-full bg-brand text-ink-deep font-bold text-sm h-10 rounded-lg flex items-center justify-center gap-2 shadow"
              >
                إدارة المشتريات
              </Button>
            </Card>

            <Card className="p-4 bg-card border border-border space-y-3">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-sky-600" /> طلبات المتجر
                والتتبع
              </h4>
              <p className="text-muted-foreground text-[11px]">
                استلام وتتبع طلبات الخدمات الهندسية والمكتبية.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/portal")}
                className="w-full bg-sky-800 text-white text-sm h-10 rounded-lg flex items-center justify-center gap-2 shadow"
              >
                بوابة التتبع المباشر
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Stage 3: Outputs */}
      {activeStage === "outputs" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-xs text-purple-900 space-y-1">
            <h3 className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-purple-700" /> المرحلة الثالثة:
              المخرجات والتقارير والتحليلات
            </h3>
            <p className="text-muted-foreground">
              طباعة السندات الرسمية بـ QR Code، استعراض القوائم المالية، ومشاركة
              النتائج.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <Card className="p-4 bg-card border border-border space-y-3">
              <Printer className="w-5 h-5 text-brand" />
              <h4 className="font-bold text-foreground">
                السندات والفواتير بـ QR Code
              </h4>
              <p className="text-muted-foreground text-[11px]">
                توليد مستندات رسمية مروّسة ومختومة قابلة للتنزيل والطباعة.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  openPrintableInvoiceWindow({
                    invoiceNumber: `STG3-DOC-${Date.now().toString().slice(-5)}`,
                    invoiceDate: new Date().toISOString(),
                    customerName: "عميل المؤسسة والمنشأة",
                    institutionName: "مجموعة الحسينية",
                    currency: "ريال يمني (YER)",
                    items: [
                      {
                        description: "سند رسمي مخرج من دورة العمل التجارية",
                        quantity: 1,
                        unitPrice: 50000,
                        totalPrice: 50000,
                      },
                    ],
                    subtotal: 50000,
                    total: 50000,
                    notes: "مخرج رسمي معتمد من المرحلة الثالثة",
                  });
                }}
                className="w-full bg-brand text-ink-deep font-bold text-xs h-8"
              >
                معاينة وطباعة السند
              </Button>
            </Card>

            <Card className="p-4 bg-card border border-border space-y-3">
              <BarChart3 className="w-5 h-5 text-blue-700" />
              <h4 className="font-bold text-foreground">
                التقارير والقوائم المالية
              </h4>
              <p className="text-muted-foreground text-[11px]">
                ميزان المراجعة، قائمة الدخل، والميزانية العمومية.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/reports")}
                className="w-full bg-ink text-white text-xs h-8"
              >
                استعراض التقارير
              </Button>
            </Card>

            <Card className="p-4 bg-card border border-border space-y-3">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <h4 className="font-bold text-foreground">
                المشتركون والتحليلات القيادية
              </h4>
              <p className="text-muted-foreground text-[11px]">
                تحليل الأداء الفوري وتوصيات المستشار المالي.
              </p>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/app")}
                className="w-full bg-purple-900 text-white text-xs h-8"
              >
                تحليلات الذكاء
              </Button>
            </Card>
          </div>
        </div>
      )}
    </Card>
  );
}
