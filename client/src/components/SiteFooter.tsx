import React, { useState } from "react";
import { useLocation } from "wouter";
import { BrandLogo } from "@/components/BrandLogo";
import { brand, whatsappLink } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Globe,
  ShieldCheck,
  HardHat,
  GraduationCap,
  Cpu,
  ArrowUp,
  CheckCircle2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

/**
 * SiteFooter — World-class marketing footer.
 * Marketing-only component. Does NOT affect the internal ERP system.
 * Includes company contact details, Uamex ERP product identity, and service links.
 */
export function SiteFooter() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSubscribed(true);
      toast.success("تم التسجيل! سنتواصل معك قريباً.");
      setEmail("");
    }
  };

  const navScroll = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setLocation("/");
      setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  };

  return (
    <footer
      className="relative bg-ink-deep text-white/65 font-display overflow-hidden"
      dir="rtl"
    >
      {/* Tech grid background */}
      <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-ink/40 pointer-events-none" />

      {/* CTA Banner before footer */}
      <div className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white font-black text-xl sm:text-2xl mb-1">
              جاهز للبدء؟ فريقنا ينتظر مكالمتك
            </h3>
            <p className="text-white/55 text-sm">
              تواصل معنا لمناقشة احتياجك أو طلب عرض توضيحي لـ Uamex ERP التجريبي
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={whatsappLink(
                "السلام عليكم مؤسسة الحسينية، أود الحصول على استشارة مجانية."
              )}
              target="_blank"
              rel="noopener"
              className="whatsapp-btn text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              واتساب — رد فوري
            </a>
            <a
              href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all"
            >
              <Phone className="w-4 h-4 text-brand-300" />
              {brand.contact.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="cursor-pointer" onClick={() => setLocation("/")}>
              <BrandLogo size={44} />
            </div>
            <p className="text-xs text-white/55 leading-relaxed max-w-xs text-pretty">
              {brand.promise}
            </p>

            {/* Contact info */}
            <div className="space-y-2.5 text-xs">
              <a
                href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 text-white/60 hover:text-brand-300 transition-colors min-h-[24px]"
              >
                <Phone className="w-4 h-4 text-brand shrink-0" />
                <span className="font-mono">{brand.contact.phone}</span>
              </a>
              <a
                href={`tel:${brand.contact.phone2.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 text-white/60 hover:text-brand-300 transition-colors min-h-[24px]"
              >
                <Phone className="w-4 h-4 text-brand/60 shrink-0" />
                <span className="font-mono">{brand.contact.phone2}</span>
              </a>
              <a
                href={`mailto:${brand.contact.email}`}
                className="flex items-center gap-2.5 text-white/60 hover:text-brand-300 transition-colors min-h-[24px]"
              >
                <Mail className="w-4 h-4 text-brand shrink-0" />
                <span>{brand.contact.email}</span>
              </a>
              <div className="flex items-start gap-2.5 text-white/50">
                <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>
                  {brand.contact.address} — {brand.contact.country}
                </span>
              </div>
            </div>

            {/* Social / Action links */}
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={whatsappLink(
                  "السلام عليكم، أود الاستفسار عن خدمات الحسينية."
                )}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                واتساب
              </a>
              <a
                href={brand.contact.website}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 bg-white/5 border border-white/15 hover:bg-white/10 text-white text-[11px] px-3 py-1.5 rounded-full transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                الموقع
              </a>
            </div>
          </div>

          {/* Services Column */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <img
                src="/uamex-favicon-32.png"
                alt=""
                width={18}
                height={18}
                className="rounded-[5px]"
              />
              نظام Uamex ERP
            </h4>
            <ul className="space-y-2">
              {brand.uamex.modules.map(mod => (
                <li key={mod.key}>
                  <button
                    onClick={() => navScroll("uamex")}
                    className="text-xs text-white/50 hover:text-brand-300 transition-colors text-right flex items-center gap-1.5 min-h-[24px]"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand/50 shrink-0" />
                    {mod.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setLocation("/pricing")}
                  className="text-xs text-brand-300 hover:text-brand transition-colors font-bold min-h-[24px]"
                >
                  عرض الأسعار ←
                </button>
              </li>
            </ul>
          </div>

          {/* Sections Column */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <HardHat className="w-3.5 h-3.5 text-brand" />
              الخدمات والمعرفة
            </h4>
            <ul className="space-y-2">
              {[
                { label: "من نحن", path: "/about" },
                { label: "الحلول البرمجية والأتمتة", path: "/solutions" },
                { label: "متابعة وإشراف المشاريع", path: "/governance" },
                { label: "الخدمات الهندسية والمساحة", id: "engineering" },
                { label: "مركز المعرفة والأدلة", path: "/insights" },
                { label: "الحاسبات التقديرية الذكية", path: "/tools" },
                { label: "الأسعار والباقات", path: "/pricing" },
                { label: "تواصل معنا", path: "/contact" },
              ].map((l, i) => (
                <li key={i}>
                  <button
                    onClick={() =>
                      l.id ? navScroll(l.id) : setLocation(l.path!)
                    }
                    className="text-xs text-white/50 hover:text-brand-300 transition-colors text-right flex items-center gap-1.5 min-h-[24px]"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand/50 shrink-0" />
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter column */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-brand" />
              أخبار وعروض
            </h4>
            {subscribed ? (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                تم التسجيل! شكراً لك
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <p className="text-[11px] text-white/45 leading-relaxed">
                  سجّل بريدك لتصلك أخبار Uamex ERP وتحديثات خدماتنا.
                </p>
                <div className="flex flex-col gap-2">
                  <Input
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="بريدك الإلكتروني"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/35 text-xs h-9"
                    dir="ltr"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold text-xs h-9 px-4 rounded-lg w-full"
                  >
                    <Send className="w-3.5 h-3.5 ml-1.5" />
                    اشترك مجاناً
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Section divider */}
        <div className="section-divider my-8" />

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[11px] text-white/45 mb-6">
          {brand.trustBadges.map(b => (
            <span key={b} className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
              {b}
            </span>
          ))}
        </div>

        {/* Legal bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/35 border-t border-white/10 pt-5">
          <p>
            <span className="text-white/55 font-bold">
              {brand.names.legalFull}
            </span>{" "}
            © {new Date().getFullYear()} — جميع الحقوق محفوظة
          </p>
          <div className="flex items-center gap-4">
            <span>Uamex ERP · أحد المنتجات الرقمية للحسينية</span>
            <span className="text-brand/60">·</span>
            <button
              onClick={() => setLocation("/privacy-policy")}
              className="text-white/45 hover:text-brand-300 transition-colors min-h-[24px]"
            >
              سياسة الخصوصية
            </button>
            <span className="text-brand/60">·</span>
            <button
              onClick={() => setLocation("/terms-of-service")}
              className="text-white/45 hover:text-brand-300 transition-colors min-h-[24px]"
            >
              الشروط والأحكام
            </button>
          </div>
        </div>
      </div>

      {/* Floating scroll-to-top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full bg-ink border border-brand/30 text-brand hover:bg-brand hover:text-ink-deep hover:border-brand transition-all hover:scale-110 shadow-xl glow-brand-sm flex items-center justify-center group"
        aria-label="الصعود للأعلى"
      >
        <ArrowUp className="w-4 h-4 bounce-up" />
      </button>
    </footer>
  );
}
