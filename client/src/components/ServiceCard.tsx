/**
 * client/src/components/ServiceCard.tsx
 * ============================================================
 * بطاقة الخدمة التسويقية — مكوّن واحد بدل ثلاث نسخ متطابقة.
 *
 * لماذا؟
 *   كان النص التسويقي مكرّراً في ثلاثة مواضع (الهندسة / الاستشارات /
 *   المكتبة) بنفس البنية تماماً، مع اختلاف طفيف في اللون فقط. التكرار يعني:
 *   • ثلاث مواضع لتعديل عند أي تحسين في الطباعة أو الحركة.
 *   • انحراف بصري تدريجي (margins مختلفة، ألوان ناقصة).
 *   component واحد يجعل موضع التحسين واضحاً ومقصوداً.
 *
 * التحسينات المطبّقة:
 *   • طباعة متدرجة (tracking / leading) بدل أحجام عشوائية.
 *   • رفع دقيق (translateY) وظل ناعم عند التحويم + احترام reduced-motion.
 *   • شارة موحّدة الشكّل مع شريط لوني أعلى البطاقة.
 *   • حركات دخول متتابعة عبر `--stagger-delay`.
 */
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ServiceCardData {
  id: string;
  title: string;
  description: string;
  features: string[];
  badge: string;
  /** فئات تدرّج Tailwind لأيقونة البطاقة. */
  color: string;
  icon: LucideIcon;
}

export interface ServiceCardProps {
  service: ServiceCardData;
  /** فئات الشارة — تتحكّم في لون الإطار والخلفية. */
  badgeClassName?: string;
  /** لون علامة الصح. */
  checkClassName?: string;
  /** حجم العنوان (يختلف بين الأقسام). */
  titleClassName?: string;
  /** نص التذييل الصغير. */
  footnote?: string;
  /** تسمية زر الإجراء. */
  actionLabel?: string;
  /** فئات زر الإجراء. */
  actionClassName?: string;
  onAction: () => void;
  /** ترتيب الظهور (تأخير الحركة). */
  index?: number;
}

export function ServiceCard({
  service,
  badgeClassName = "border-brand/40 text-brand-700 bg-amber-50",
  checkClassName = "text-emerald-600",
  titleClassName = "text-base",
  footnote = "حلول مؤسسية موثوقة",
  actionLabel = "طلب الخدمة",
  actionClassName = "bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold",
  onAction,
  index = 0,
}: ServiceCardProps) {
  const Icon = service.icon;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-slate-200 bg-white",
        "shadow-sm transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(14,42,43,0.28)]",
        "hover:border-brand/40",
        "motion-reduce:hover:translate-y-0"
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* شريط لوني علوي يميّز القسم */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-brand via-brand-300 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />

      <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-5">
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "rounded-xl p-3 text-white shadow-sm transition-transform duration-300 group-hover:scale-105",
              service.color
            )}
          >
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] font-bold", badgeClassName)}
          >
            {service.badge}
          </Badge>
        </div>
        <CardTitle
          className={cn(
            "mt-3 font-display font-bold tracking-tight text-slate-900",
            titleClassName
          )}
        >
          {service.title}
        </CardTitle>
        <CardDescription className="mt-1 text-xs leading-relaxed text-slate-600">
          {service.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-5">
        <ul className="space-y-2">
          {service.features.map((feat, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
            >
              <CheckCircle2
                className={cn("mt-0.5 h-4 w-4 shrink-0", checkClassName)}
                aria-hidden="true"
              />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <span className="text-[10px] text-slate-500">{footnote}</span>
          <Button
            size="sm"
            onClick={onAction}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold transition-transform duration-200 hover:scale-[1.03] motion-reduce:hover:scale-100",
              actionClassName
            )}
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ServiceCard;
