import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  HardHat,
  Building2,
  BookOpen,
  X,
  Sparkles,
  Cpu,
} from "lucide-react";
import { brand, whatsappLink } from "@/lib/brand";

export function FloatingSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenWhatsApp = (topic: string) => {
    const text = `السلام عليكم ${brand.names.legalFull}،\nأود الاستفسار وطلب خدمة بشأن: ${topic}`;
    window.open(whatsappLink(text), "_blank");
  };

  return (
    <div
      className="fixed left-5 z-40 font-display bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      {/* Floating Menu Card */}
      {isOpen && (
        <div className="mb-3 w-72 max-w-[calc(100vw-2.5rem)] bg-ink text-white border border-white/10 rounded-2xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-brand-300">
              <Sparkles className="w-4 h-4 text-brand" />
              المساعدة والدعم المباشر 24/7
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white text-xs p-1 rounded"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-white/70 leading-relaxed">
            مرحباً بك! اختر القسم الذي تود التواصل معه مباشرة عبر الواتساب:
          </p>

          <div className="space-y-1.5 text-xs">
            <button
              onClick={() =>
                handleOpenWhatsApp("استشارات هندسية، مساحة، ومخططات BOQ")
              }
              className="w-full bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl border border-white/10 flex items-center gap-2.5 transition-all text-right"
            >
              <div className="p-1.5 bg-brand rounded-lg text-ink-deep">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  القطاع الهندسي والمقاولات
                </span>
                <span className="text-[10px] text-white/50">
                  مخططات، رفع مساحي، جداول BOQ
                </span>
              </div>
            </button>

            <button
              onClick={() =>
                handleOpenWhatsApp("استشارات نظام الحسابات والمؤسسية")
              }
              className="w-full bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl border border-white/10 flex items-center gap-2.5 transition-all text-right"
            >
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  القطاع المحاسبي والمؤسسي
                </span>
                <span className="text-[10px] text-white/50">
                  حسابات، استشارات إدارية، ERP
                </span>
              </div>
            </button>

            <button
              onClick={() =>
                handleOpenWhatsApp("خدمات المكتبة، الأبحاث، وصيانة الأجهزة")
              }
              className="w-full bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl border border-white/10 flex items-center gap-2.5 transition-all text-right"
            >
              <div className="p-1.5 bg-sky-600 rounded-lg text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  مكتبة الحسينية الحديثة
                </span>
                <span className="text-[10px] text-white/50">
                  أبحاث، تصاميم، صيانة كمبيوتر ولابتوب
                </span>
              </div>
            </button>

            <button
              onClick={() =>
                handleOpenWhatsApp("تجربة ونظام Uamex_erp ERP والحلول البرمجية")
              }
              className="w-full bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl border border-white/10 flex items-center gap-2.5 transition-all text-right"
            >
              <div className="p-1.5 bg-amber-500 rounded-lg text-ink">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block text-white">
                  الحلول البرمجية وتجربة Uamex_erp
                </span>
                <span className="text-[10px] text-white/50">
                  تجربة النظام، الربط البرمجي، السحابة
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Trigger Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="فتح الدعم المباشر"
        className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-black h-12 px-4 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 border-2 border-white/20"
      >
        <MessageSquare className="w-5 h-5 fill-current" />
        <span className="text-xs hidden sm:inline">تواصل معنا المباشر</span>
        <Badge className="bg-emerald-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5">
          متصل
        </Badge>
      </Button>
    </div>
  );
}
