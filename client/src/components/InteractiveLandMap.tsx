import React, { useState } from "react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Map,
  MapPin,
  Navigation,
  Layers,
  CheckCircle2,
  Share2,
  ExternalLink,
} from "lucide-react";

export function InteractiveLandMap() {
  const [lat, setLat] = useState<string>("15.3694");
  const [lng, setLng] = useState<string>("44.1910");
  const [landAreaSqM, setLandAreaSqM] = useState<number>(500);
  const [parcelNumber, setParcelNumber] = useState<string>("PRC-2026-991");
  const [selectedLayer, setSelectedLayer] = useState<
    "satellite" | "topography" | "boundaries"
  >("satellite");

  const openGoogleMapsLocation = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const handleShareGISLocation = () => {
    const text = encodeURIComponent(
      `موقع الأرض والرفع المساحي الرقمي:\n- رقم القطعة: ${parcelNumber}\n- المساحة: ${landAreaSqM} م²\n- الإحداثيات: Lat ${lat}, Lng ${lng}\n- الخريطة: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Card
      className="border-2 border-brand/40 bg-ink text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 font-sans"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-ink-600 pb-3 gap-2">
        <div>
          <Badge className="bg-brand text-ink-deep font-bold text-[10px] mb-1">
            محرك الخرائط الجغرافية GIS
          </Badge>
          <CardTitle className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Map className="w-5 h-5 text-brand-300" />
            الخريطة التفاعلية لإسقاط الأراضي والمخططات المساحية
          </CardTitle>
          <CardDescription className="text-xs text-slate-300 mt-1">
            إسقاط إحداثيات GPS، معاينة الحدود العقارية، وتوليد بطاقة الموقع
            الجغرافي المعتمدة.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={openGoogleMapsLocation}
            className="bg-ink-600 hover:bg-ink-500 text-white font-bold text-xs h-8 px-3 rounded-xl border border-ink-500 flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5 text-brand-300" />
            فتح في Google Maps
          </Button>

          <Button
            size="sm"
            onClick={handleShareGISLocation}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl flex items-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5" />
            مشاركة الإحداثيات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Visual Map Canvas Representation */}
        <div className="lg:col-span-7 bg-ink-deep border-2 border-ink-600 rounded-2xl p-4 relative min-h-[260px] flex flex-col justify-between overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#b87945_1px,transparent_1px)] [background-size:14px_14px]"></div>

          {/* Top Layer Selector */}
          <div className="relative z-10 flex items-center justify-between bg-ink/90 backdrop-blur p-2 rounded-xl border border-ink-500 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-brand-300">
              <Layers className="w-4 h-4 text-brand" /> الطبقة الجغرافية:
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedLayer("satellite")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${selectedLayer === "satellite" ? "bg-brand text-ink-deep" : "bg-ink-600 text-slate-300"}`}
              >
                اقمار صناعية
              </button>
              <button
                onClick={() => setSelectedLayer("boundaries")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${selectedLayer === "boundaries" ? "bg-brand text-ink-deep" : "bg-ink-600 text-slate-300"}`}
              >
                المحيط والحدود
              </button>
            </div>
          </div>

          {/* Visual Parcel Mock Marker */}
          <div className="relative z-10 my-8 mx-auto bg-ink-600/90 border-2 border-dashed border-brand-300 rounded-2xl p-5 text-center max-w-sm space-y-2 shadow-2xl">
            <div className="w-10 h-10 bg-brand text-ink-deep rounded-full mx-auto flex items-center justify-center font-bold animate-bounce shadow-lg">
              <MapPin className="w-5 h-5 fill-current" />
            </div>
            <h4 className="font-bold text-sm text-white font-mono">
              {parcelNumber}
            </h4>
            <p className="text-xs text-brand-300 font-mono">
              الإحداثيات: {lat}° N, {lng}° E
            </p>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5">
              مُسقط ومثبت مساحياً
            </Badge>
          </div>

          {/* Map Footer Bar */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300 border-t border-ink-600 pt-2">
            <span>
              المساحة:{" "}
              <strong className="text-brand-300 font-mono">
                {landAreaSqM} م²
              </strong>
            </span>
            <span>اعتماد قسم المساحة الهندسية — مؤسسة الحسينية</span>
          </div>
        </div>

        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-3 bg-ink-800 p-4 rounded-2xl border border-ink-600 text-xs">
          <h4 className="font-bold text-sm text-brand-300 border-b border-ink-600 pb-2 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-brand" /> بيانات الأرض
            والإحداثيات
          </h4>

          <div className="space-y-1">
            <Label className="text-slate-300 text-[11px]">
              رقم القطعة / المخطط
            </Label>
            <Input
              value={parcelNumber}
              onChange={e => setParcelNumber(e.target.value)}
              className="h-8 bg-ink border-ink-500 text-white text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-slate-300 text-[11px]">
                خط العرض (Latitude)
              </Label>
              <Input
                value={lat}
                onChange={e => setLat(e.target.value)}
                className="h-8 bg-ink border-ink-500 text-white text-xs font-mono text-left"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-[11px]">
                خط الطول (Longitude)
              </Label>
              <Input
                value={lng}
                onChange={e => setLng(e.target.value)}
                className="h-8 bg-ink border-ink-500 text-white text-xs font-mono text-left"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-slate-300 text-[11px]">
              المساحة الإجمالية (م²)
            </Label>
            <Input
              type="number"
              value={landAreaSqM}
              onChange={e => setLandAreaSqM(Number(e.target.value))}
              className="h-8 bg-ink border-ink-500 text-white text-xs font-mono"
            />
          </div>

          <div className="pt-2 text-[11px] text-slate-300 space-y-1 bg-ink p-3 rounded-xl border border-ink-500">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> تثبيت
              الزوايا بحضور المساح المعتمد.
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> توثيق
              الإحداثيات الرسمية بنظام WGS 84.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
