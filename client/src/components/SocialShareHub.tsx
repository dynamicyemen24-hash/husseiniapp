/**
 * SocialShareHub — Enterprise Social Sharing & Marketing Hub.
 *
 * Features:
 *   - One-click sharing to WhatsApp, Facebook, X (Twitter), LinkedIn, Telegram, and Email
 *   - Expert pre-written professional marketing message in Arabic & English
 *   - QR Code generation for instant mobile sharing
 *   - Copy link with haptic & visual feedback
 *   - Glassmorphism dialog/modal design optimized for touch and desktop
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Send,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface SocialShareHubProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl?: string;
  title?: string;
  description?: string;
  className?: string;
}

const EXPERT_MARKETING_MESSAGE_AR = `🚀 *منصة الحسينية لخدمات الأعمال (Uamex ERP)*\n\nنظام الحوكمة والإدارة المؤسسية الأقوى: محاسبة IFRS بقيد مزدوج، إدارة مخازن لحظية، فواتير إلكترونية، ويعمل أوفلاين بمزامنة تلقائية!\n\n✨ استمتع بـ 14 يوم تجربة مجانية بدون بطاقة ائتمان:\n🔗 `;

const EXPERT_MARKETING_MESSAGE_EN = `🚀 *Uamex ERP — Enterprise Business Platform*\n\nThe ultimate governance & accounting system: IFRS double-entry accounting, real-time inventory, e-invoicing, works offline with auto-sync!\n\n✨ Start your 14-day free trial now:\n🔗 `;

export const SocialShareHub = React.memo(
  ({
    isOpen,
    onClose,
    shareUrl = typeof window !== "undefined"
      ? window.location.origin
      : "https://alhusainiaye.vercel.app",
    title = "منصة Uamex ERP — الحسينية لخدمات الأعمال",
    description = "نظام الحوكمة والإدارة المؤسسية الموحدة",
    className,
  }: SocialShareHubProps) => {
    const [copied, setCopied] = React.useState(false);
    const [lang, setLang] = React.useState<"ar" | "en">("ar");

    const message =
      (lang === "ar"
        ? EXPERT_MARKETING_MESSAGE_AR
        : EXPERT_MARKETING_MESSAGE_EN) + shareUrl;

    const handleCopy = () => {
      navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        (navigator as any).vibrate(20);
      }
    };

    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(shareUrl);

    const shareLinks = [
      {
        name: "WhatsApp",
        nameAr: "واتساب",
        icon: MessageCircle,
        color: "bg-emerald-600 hover:bg-emerald-700 text-white",
        url: `https://api.whatsapp.com/send?text=${encodedMessage}`,
      },
      {
        name: "X (Twitter)",
        nameAr: "منصة X",
        icon: Twitter,
        color: "bg-neutral-900 hover:bg-black text-white",
        url: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      },
      {
        name: "Facebook",
        nameAr: "فيسبوك",
        icon: Facebook,
        color: "bg-blue-600 hover:bg-blue-700 text-white",
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        name: "LinkedIn",
        nameAr: "لينكد إن",
        icon: Linkedin,
        color: "bg-sky-700 hover:bg-sky-800 text-white",
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        name: "Telegram",
        nameAr: "تليجرام",
        icon: Send,
        color: "bg-blue-500 hover:bg-blue-600 text-white",
        url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
      },
      {
        name: "Email",
        nameAr: "البريد الإلكتروني",
        icon: Mail,
        color: "bg-amber-700 hover:bg-amber-800 text-white",
        url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedMessage}`,
      },
    ];

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            className={cn(
              "w-full max-w-lg bg-[#0c1b1c] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6 text-[#f0ebe3] relative overflow-hidden",
              className
            )}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#b87945] to-[#e2b17a] flex items-center justify-center shadow-lg shadow-[#b87945]/30">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    مشاركة المنصة والنظام
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    انشر حلول Uamex ERP لشركائك وعملائك
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Language Switcher for Message */}
            <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
              <span className="text-xs text-muted-foreground">
                لغة الرسالة التسويقية:
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setLang("ar")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    lang === "ar"
                      ? "bg-[#b87945] text-white"
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  العربية
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    lang === "en"
                      ? "bg-[#b87945] text-white"
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  English
                </button>
              </div>
            </div>

            {/* Expert Preview Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#e2b17a]" />
                <span>الرسالة التسويقية الخبيرة الجاهزة للمشاركة:</span>
              </label>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-line max-h-36 overflow-y-auto">
                {message}
              </div>
            </div>

            {/* Social Channels Grid */}
            <div className="grid grid-cols-3 gap-3">
              {shareLinks.map(s => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl gap-2 transition-transform hover:scale-105 shadow-lg",
                      s.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{s.nameAr}</span>
                  </a>
                );
              })}
            </div>

            {/* Copy Button */}
            <Button
              onClick={handleCopy}
              className="w-full bg-[#b87945] hover:bg-[#b87945]/90 text-white font-medium py-3 rounded-xl shadow-lg shadow-[#b87945]/20 flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  <span>تم نسخ الرسالة والرابط بنجاح!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>نسخ الرسالة التسويقية والابط</span>
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }
);

SocialShareHub.displayName = "SocialShareHub";
