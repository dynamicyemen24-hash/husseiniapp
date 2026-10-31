import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Plus,
  FileText,
  ShoppingCart,
  Package,
  BarChart3,
  X,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * إجراءات سريعة عالمية — تقليل النقرات من 3 إلى 1
 * - FAB ثابت في كل مساحة تشغيلية (ارتفاع 44px للوصولية)
 * - اختصارات لوحة مفاتيح: Ctrl+N (قيد)، Ctrl+Shift+S (مبيعات)، Ctrl+R (تقارير)
 *   أما Ctrl+K فهو ملك لوحة الأوامر (CommandPalette) — ناقل واحد فقط.
 * - a11y: aria-label، تركيز مرئي، إغلاق بـ Escape
 */
const QUICK_ACTIONS = [
  {
    key: "tx",
    label: "قيد سريع — إنشاء مباشر",
    icon: FileText,
    path: "/accounting?new=tx",
    accent: "bg-brand text-ink-deep",
    shortcut: "Ctrl+N",
  },
  {
    key: "sale",
    label: "فاتورة مبيعات — إنشاء مباشر",
    icon: ShoppingCart,
    path: "/commercial?new=sale",
    accent: "bg-emerald-600 text-white",
    shortcut: "Ctrl+Shift+S",
  },
  {
    key: "purchase",
    label: "فاتورة مشتريات — إنشاء مباشر",
    icon: Package,
    path: "/commercial?new=purchase",
    accent: "bg-sky-700 text-white",
    shortcut: "Ctrl+Shift+P",
  },
  {
    key: "report",
    label: "التقارير — عرض فوري",
    icon: BarChart3,
    path: "/reports",
    accent: "bg-ink text-white",
    shortcut: "Ctrl+R",
  },
] as const;

export function GlobalQuickActions() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  // اختصارات لوحة المفاتيح — تقلل النقرات إلى صفر
  // ملاحظة: اختصار Ctrl+K ملكٌ للوحة الأوامر (CommandPalette) وحدها،
  // حتى لا يُفتح اللوحة مرتين أو تتعارض ناقلتا الحدث.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "n" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        setLocation("/accounting");
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        setLocation("/commercial");
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "r" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        setLocation("/reports");
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLocation]);

  // لا تظهر في الصفحات التسويقية العامة
  const [path] = useLocation();
  const isOperational = [
    "/app",
    "/accounting",
    "/commercial",
    "/reports",
    "/analytics",
    "/store",
    "/pos",
  ].some(p => path.startsWith(p));
  if (!isOperational) return null;

  return (
    <>
      {/* زر عائم — 44px حد أدنى للوصولية (WCAG 2.5.5) */}
      <div
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2"
        dir="rtl"
      >
        {open && (
          <div className="flex flex-col gap-2 p-2 rounded-2xl bg-ink-deep/95 backdrop-blur border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => {
                    setOpen(false);
                    setLocation(a.path);
                  }}
                  className={`flex items-center gap-3 h-11 px-4 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${a.accent}`}
                  aria-label={`${a.label} — ${a.shortcut}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{a.label}</span>
                  <span className="text-[10px] opacity-60 font-mono hidden sm:inline">
                    {a.shortcut}
                  </span>
                </button>
              );
            })}
            <div className="flex items-center justify-center gap-1 text-[10px] text-white/40 pt-1 border-t border-white/10">
              <Keyboard className="w-3 h-3" />
              <span>اختصارات لوحة المفاتيح متاحة دائماً</span>
            </div>
          </div>
        )}

        <Button
          onClick={() => setOpen(v => !v)}
          aria-label={
            open
              ? "إغلاق الإجراءات السريعة"
              : "فتح الإجراءات السريعة — إنشاء بنقرة واحدة"
          }
          aria-expanded={open}
          className={`h-12 w-12 rounded-full shadow-xl border border-white/20 p-0 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${open ? "bg-card text-ink-deep" : "bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"}`}
        >
          {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </Button>
      </div>
    </>
  );
}
