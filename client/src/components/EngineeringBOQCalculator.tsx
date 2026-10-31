import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { HardHat, FileSpreadsheet } from "lucide-react";
import { openPrintableInvoiceWindow } from "@/lib/pdfInvoiceGenerator";
import { toast } from "sonner";

export function EngineeringBOQCalculator() {
  const [areaSqM, setAreaSqM] = useState<number>(250);
  const [floors, setFloors] = useState<number>(2);
  const [structureType, setStructureType] = useState<
    "residential" | "commercial" | "villa"
  >("residential");
  const [includeExcavation] = useState<boolean>(true);

  // Structural Math & Quantities Estimations
  const totalBuiltArea = useMemo(() => areaSqM * floors, [areaSqM, floors]);

  // Steel factor: approx 110 kg per m² of total built area for residential, 130 kg for commercial
  const steelRebarTons = useMemo(() => {
    const factorKgPerSqM = structureType === "commercial" ? 130 : 110;
    return Math.round(((totalBuiltArea * factorKgPerSqM) / 1000) * 10) / 10;
  }, [totalBuiltArea, structureType]);

  // Concrete factor: approx 0.4 m³ of concrete per m² of built area
  const concreteCuM = useMemo(() => {
    return Math.round(totalBuiltArea * 0.45);
  }, [totalBuiltArea]);

  // Excavation factor: approx area * 2m depth
  const excavationCuM = useMemo(() => {
    return includeExcavation ? Math.round(areaSqM * 2.2) : 0;
  }, [areaSqM, includeExcavation]);

  // Estimated structural execution cost (approximate estimation)
  const estimatedCostYer = useMemo(() => {
    const ratePerSqM = structureType === "commercial" ? 95000 : 80000;
    return totalBuiltArea * ratePerSqM;
  }, [totalBuiltArea, structureType]);

  const handlePrintBOQEstimate = () => {
    openPrintableInvoiceWindow({
      invoiceNumber: `BOQ-EST-${Date.now().toString().slice(-6)}`,
      invoiceDate: new Date().toISOString(),
      customerName: "تقدير حصر كميات للمقاول / المالك",
      institutionName:
        "مؤسسة الحسينية لخدمات الأعمال — قسم الاستشارات الهندسية",
      currency: "ريال يمني (YER)",
      items: [
        {
          description: `حديد التسليح التقديري (نسبة 110-130 كجم/م²)`,
          quantity: steelRebarTons,
          unitPrice: 0,
          totalPrice: 0,
        },
        {
          description: `الخرسانة المسلحة والعادية التقديرية`,
          quantity: concreteCuM,
          unitPrice: 0,
          totalPrice: 0,
        },
        {
          description: `حجم الحفر والردم وتهيأة الموقع`,
          quantity: excavationCuM,
          unitPrice: 0,
          totalPrice: 0,
        },
      ],
      subtotal: estimatedCostYer,
      total: estimatedCostYer,
      notes: `المساحة الإجمالية للمشروع: ${totalBuiltArea} م² (${floors} أدوار) — نوع البناء: ${structureType}`,
    });
    toast.success("تم توليد تقرير حصر الكميات والتسعير التقديري بنجاح!");
  };

  const handleWhatsAppQuote = () => {
    const msg = encodeURIComponent(
      `السلام عليكم استشاري الحسينية الهندسي،\nأود طلب اعتماد دراسة حصر كميات ومخطط تنفيذي للمشروع:\n- المساحة الأرضية: ${areaSqM} م²\n- عدد الأدوار: ${floors} (${totalBuiltArea} م² مسقوف)\n- كمية الحديد التقديرية: ${steelRebarTons} طن\n- الخرسانات التقديرية: ${concreteCuM} م³\n- التكلفة التقديرية للهيكل: ${estimatedCostYer.toLocaleString()} YER`
    );
    window.open(`https://wa.me/967770000000?text=${msg}`, "_blank");
  };

  return (
    <Card className="border-2 border-brand/40 bg-ink text-white shadow-xl p-5 sm:p-6 rounded-3xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-ink-600 pb-3 gap-2">
        <div>
          <Badge className="bg-brand text-ink-deep font-bold text-[10px] mb-1">
            محرك الحاسبة الإنشائية الذكي
          </Badge>
          <CardTitle className="text-lg font-bold font-display text-white flex items-center gap-2">
            <HardHat className="w-5 h-5 text-brand-300" />
            حاسبة الكميات والهيكل الإنشائي للمقاولين والملاك (BOQ Estimator)
          </CardTitle>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Form Controls */}
        <div className="space-y-3 bg-ink-800 p-4 rounded-2xl border border-ink-600">
          <div className="space-y-1">
            <Label className="text-xs text-slate-300">
              مساحة الأرض / المسقط المعماري ($m^2$)
            </Label>
            <Input
              type="number"
              value={areaSqM}
              onChange={e => setAreaSqM(Math.max(10, Number(e.target.value)))}
              className="h-9 bg-ink border-ink-500 text-white text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">عدد الأدوار</Label>
              <Input
                type="number"
                value={floors}
                onChange={e => setFloors(Math.max(1, Number(e.target.value)))}
                className="h-9 bg-ink border-ink-500 text-white text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">طبيعة المنشأة</Label>
              <select
                value={structureType}
                onChange={(e: any) => setStructureType(e.target.value)}
                className="w-full h-9 bg-ink border border-ink-500 text-white text-xs rounded-md px-2"
              >
                <option value="residential">عمارة / مبنى سكني</option>
                <option value="commercial">مبنى تجاري / استثماري</option>
                <option value="villa">فيلا شخصية</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Estimated Output Cards */}
        <div className="space-y-3 bg-ink-800 p-4 rounded-2xl border border-ink-600">
          <h4 className="text-xs font-bold text-brand-300 border-b border-ink-600 pb-1.5 flex items-center gap-1">
            <FileSpreadsheet className="w-4 h-4" /> التقدير التكتيكي الأولي لحصر
            الكميات:
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-ink p-2.5 rounded-xl border border-ink-500">
              <span className="text-[10px] text-slate-400 block">
                إجمالي المساحة المسقوفة
              </span>
              <strong className="text-sm text-brand-300 font-mono">
                {totalBuiltArea} م²
              </strong>
            </div>

            <div className="bg-ink p-2.5 rounded-xl border border-ink-500">
              <span className="text-[10px] text-slate-400 block">
                حديد التسليح التقديري
              </span>
              <strong className="text-sm text-emerald-400 font-mono">
                ~ {steelRebarTons} طن
              </strong>
            </div>

            <div className="bg-ink p-2.5 rounded-xl border border-ink-500">
              <span className="text-[10px] text-slate-400 block">
                إجمالي الخرسانات المسلحة
              </span>
              <strong className="text-sm text-sky-400 font-mono">
                ~ {concreteCuM} م³
              </strong>
            </div>

            <div className="bg-ink p-2.5 rounded-xl border border-ink-500">
              <span className="text-[10px] text-slate-400 block">
                كمية الحفر والردم 3D
              </span>
              <strong className="text-sm text-amber-400 font-mono">
                ~ {excavationCuM} م³
              </strong>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              onClick={handlePrintBOQEstimate}
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-8 flex-1"
            >
              طباعة كراسة حصر BOQ بـ QR
            </Button>
            <Button
              size="sm"
              onClick={handleWhatsAppQuote}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 flex-1"
            >
              طلب دراسة معتمدة
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
