import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ShieldCheck,
  MapPin,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SiteFooter } from "@/components/SiteFooter";

function fmt(iso?: string | Date) {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapUrl(lat: number, lng: number) {
  const d = 0.08;
  const minlat = lat - d,
    maxlat = lat + d,
    minlon = lng - d,
    maxlon = lng + d;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minlon},${minlat},${maxlon},${maxlat}&layer=mapnik&marker=${lat},${lng}`;
}

export default function Security() {
  const [, setLocation] = useLocation();
  const { data: attempts = [], isLoading } =
    trpc.auth.getLoginAttempts.useQuery(undefined, { staleTime: 15000 });
  const [active, setActive] = useState<number | null>(null);

  const list = attempts as Array<{
    id: number;
    success: boolean;
    device: string | null;
    country: string | null;
    city: string | null;
    ip: string | null;
    lat: string | number | null;
    lng: string | number | null;
    createdAt: string | Date;
  }>;

  const current =
    list[active ?? 0] || list.find(a => a.lat != null && a.lng != null) || null;
  const curLat = current && current.lat != null ? Number(current.lat) : null;
  const curLng = current && current.lng != null ? Number(current.lng) : null;

  return (
    <div
      className="min-h-screen bg-ink-deep text-white flex flex-col font-display"
      dir="rtl"
    >
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-brand-300" /> أمان الحساب
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              سجل محاولات الدخول مع الجهاز والموقع الجغرافي لحماية حسابك.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/app")}
            className="border-white/15 text-white/80 hover:text-white bg-white/5 text-xs h-8 px-3 rounded-lg flex items-center gap-1"
          >
            <span>لوحة التحكم</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <Card className="bg-white/5 border-white/10 text-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-300" /> الموقع الجغرافي
                لآخر دخول
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {curLat != null && curLng != null ? (
                <iframe
                  title="خريطة موقع الدخول"
                  src={mapUrl(curLat, curLng)}
                  className="w-full h-80 border-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-80 flex items-center justify-center text-center text-xs text-slate-400 p-6">
                  لا تتوفر إحداثيات لموقع الدخول بعد.
                  <br />
                  تُسجَّل المواقع تلقائياً من عنوان IP عند كل محاولة دخول.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attempts list */}
          <Card className="bg-white/5 border-white/10 text-white rounded-2xl">
            <CardHeader className="p-4 pb-2">
              <h3 className="text-sm font-bold">سجل محاولات الدخول</h3>
            </CardHeader>
            <CardContent className="p-3 max-h-96 overflow-auto space-y-2">
              {isLoading && (
                <p className="text-xs text-slate-400">جاري التحميل…</p>
              )}
              {!isLoading && list.length === 0 && (
                <p className="text-xs text-slate-400">
                  لا توجد محاولات دخول مسجّلة بعد.
                </p>
              )}
              {list.map((a, i) => {
                const lat = a.lat != null ? Number(a.lat) : null;
                const lng = a.lng != null ? Number(a.lng) : null;
                const hasGeo = lat != null && lng != null;
                return (
                  <button
                    key={a.id}
                    onClick={() => hasGeo && setActive(i)}
                    className={`w-full text-right rounded-xl border p-3 transition-colors ${
                      active === i || (active == null && i === 0)
                        ? "border-brand/50 bg-brand/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          a.success ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {a.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {a.success ? "دخول ناجح" : "محاولة فاشلة"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {fmt(a.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-300">
                      {/جوال/.test(a.device || "") ? (
                        <Smartphone className="w-3.5 h-3.5 text-brand-300" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-brand-300" />
                      )}
                      <span>{a.device || "—"}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {[a.country, a.city].filter(Boolean).join(" · ") || "—"}
                      {a.ip ? ` · ${a.ip}` : ""}
                      {hasGeo ? " · 📍 على الخريطة" : ""}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
