import * as React from "react";

/**
 * ─────────────────────────────────────────────────────────────────
 * ALHUSAINIA — Official Icon System (Tajawal-aligned)
 * ─────────────────────────────────────────────────────────────────
 * ليست Lucide عامة مستهلكة، بل رموز هندسية مخصصة للمنصة:
 *  - زوايا 22° (مستوحاة من Tajawal)، شبكة 24×24، سُمك 1.8
 *  - هوية "الدفتر المفتوح + المسطرة" نفس روح الشعار
 *  - كل أيقونة لها معنى وظيفي واحد لا يتكرر
 * تُستخدم حصراً في: الرابط (link) والشريط الرئيسي (header/navbar)
 */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Svg({
  size = 20,
  children,
  className,
  ...props
}: IconProps & { children: React.ReactNode }) {
  const cls = ["hus-icon-apex", className].filter(Boolean).join(" ");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cls}
      {...props}
    >
      {children}
    </svg>
  );
}

// ── الرابط الرسمي: رمز العقدة المترابطة (حلقة وصل) — Apex بلمسة ذهبية ──
export function HusLinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 13.5L13.5 10.5" />
      <path d="M9 10.5A3.5 3.5 0 0 1 13.9 8.6L15.4 7.1A3.5 3.5 0 0 1 20.3 12L18.8 13.5" />
      <path d="M15 13.5A3.5 3.5 0 0 1 10.1 15.4L8.6 16.9A3.5 3.5 0 0 1 3.7 12L5.2 10.5" />
      <circle
        cx="12"
        cy="12"
        r="1.2"
        fill="currentColor"
        stroke="none"
        opacity={0.9}
      />
      <circle cx="12" cy="12" r="3.2" strokeOpacity={0.12} strokeWidth={0.9} />
    </Svg>
  );
}

// ── الرئيسية: بيت هندسي بزاوية Tajawal 22° ──
export function HusHomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 10.8L12 4L20.5 10.8V19.5A1.5 1.5 0 0 1 19 21H15.2V14.2H8.8V21H5A1.5 1.5 0 0 1 3.5 19.5V10.8Z" />
      <path d="M12 7.2V14.2" strokeOpacity={0.5} />
      <rect
        x="10.7"
        y="15.5"
        width="2.6"
        height="2.6"
        rx="0.6"
        fill="currentColor"
        stroke="none"
        opacity={0.12}
      />
    </Svg>
  );
}

// ── قطاعات الأعمال: طبقات متراكبة بمنظور ──
export function HusLayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5L3 8.2L12 13L21 8.2L12 3.5Z" />
      <path d="M3 12L12 16.8L21 12" opacity={0.7} />
      <path d="M3 15.8L12 20.5L21 15.8" opacity={0.45} />
    </Svg>
  );
}

// ── المنصة الموحدة: دفتر مفتوح + مسطرة صاعدة (نفس الشعار مصغر) — Apex ──
export function HusPlatformIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4 7.5C6.4 6 8.8 6 11 8V18C8.8 16 6.4 16 4 18V7.5Z"
        fill="currentColor"
        opacity={0.14}
        strokeWidth={1.5}
      />
      <path
        d="M20 7.5C17.6 6 15.2 6 13 8V18C15.2 16 17.6 16 20 18V7.5Z"
        fill="currentColor"
        opacity={0.14}
        strokeWidth={1.5}
      />
      <path d="M12 8V18" strokeWidth={2} />
      <path d="M6 13.2L9.2 11.5L12 12.6L15.2 10.8L18 9.5" strokeWidth={1.6} />
      <path d="M16.2 9.5H18V11.3" strokeWidth={1.6} />
      <circle
        cx="18"
        cy="9.5"
        r="1"
        fill="currentColor"
        opacity={0.85}
        stroke="none"
      />
    </Svg>
  );
}

// ── الموارد: بوصلة دقيقة بــ 8 اتجاهات ──
export function HusCompassIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path
        d="M15.2 8.8L11 13L8.8 15.2L13 11L15.2 8.8Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M12 8V4.5" opacity={0.35} />
      <path d="M12 19.5V16" opacity={0.35} />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ── المزيد: شبكة 3×3 منظمة ──
export function HusGridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="5.2" height="5.2" rx="1.3" />
      <rect x="14.8" y="4" width="5.2" height="5.2" rx="1.3" />
      <rect x="4" y="14.8" width="5.2" height="5.2" rx="1.3" />
      <rect
        x="14.8"
        y="14.8"
        width="5.2"
        height="5.2"
        rx="1.3"
        opacity={0.45}
      />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ── البحث: عدسة بزاوية 22° مع مقبض ماسي ──
export function HusSearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6L20 20" strokeWidth={2.2} />
      <path d="M8.5 11H13.5" opacity={0.35} />
      <path d="M11 8.5V13.5" opacity={0.35} />
    </Svg>
  );
}

// ── الحماية: درع بصمة هندسية ──
export function HusShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2L18.5 6.2V11.6C18.5 15.1 15.8 18.3 12 20.8C8.2 18.3 5.5 15.1 5.5 11.6V6.2L12 3.2Z" />
      <path d="M9.2 12L11.1 13.9L14.8 9.8" strokeWidth={2} />
    </Svg>
  );
}

// ── المالية: ميزان محاسبي دقيق ──
export function HusScaleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5V19" />
      <path d="M5 8L8.5 12.5L12 8L15.5 12.5L19 8" />
      <path d="M3 19H21" strokeWidth={2} />
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ── عام: ترس هندسي خماسي (ليس الترس العام المستهلك) ──
export function HusSettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 8.2A3.8 3.8 0 1 0 12 15.8A3.8 3.8 0 0 0 12 8.2Z" />
      <path d="M12 3.5V6M12 18V20.5M4.8 7.2L6.6 8.9M17.4 15.1L19.2 16.8M3.5 12H6M18 12H20.5M6.6 15.1L4.8 16.8M19.2 7.2L17.4 8.9" />
    </Svg>
  );
}

// ── Apex إضافية: ماسة دقيقة وهوية رقمية ──
export function HusDiamondIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.2L19.2 9.2L12 20.8L4.8 9.2L12 3.2Z" />
      <path d="M4.8 9.2H19.2" opacity={0.5} />
      <path d="M12 3.2L12 20.8" opacity={0.35} />
      <path d="M8.2 9.2L12 12.8L15.8 9.2" opacity={0.6} />
    </Svg>
  );
}
export function HusSparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 2.5L13.4 8.6L19.5 10L13.4 11.4L12 17.5L10.6 11.4L4.5 10L10.6 8.6L12 2.5Z"
        fill="currentColor"
        stroke="none"
        opacity={0.95}
      />
      <path
        d="M18.5 14.5L19.2 16.2L20.9 16.9L19.2 17.6L18.5 19.3L17.8 17.6L16.1 16.9L17.8 16.2L18.5 14.5Z"
        fill="currentColor"
        stroke="none"
        opacity={0.6}
      />
      <path
        d="M5.5 13.5L6 14.7L7.2 15.2L6 15.7L5.5 16.9L5 15.7L3.8 15.2L5 14.7L5.5 13.5Z"
        fill="currentColor"
        stroke="none"
        opacity={0.45}
      />
    </Svg>
  );
}

export const HusIcons = {
  link: HusLinkIcon,
  home: HusHomeIcon,
  layers: HusLayersIcon,
  platform: HusPlatformIcon,
  compass: HusCompassIcon,
  grid: HusGridIcon,
  search: HusSearchIcon,
  shield: HusShieldIcon,
  scale: HusScaleIcon,
  settings: HusSettingsIcon,
  diamond: HusDiamondIcon,
  spark: HusSparkIcon,
} as const;
