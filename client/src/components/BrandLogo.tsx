import { brand } from "@/lib/brand";

type BrandLogoProps = {
  /** Pixel size of the square monogram tile. */
  size?: number;
  /** Show the Arabic/English wordmark next to the mark. */
  withWordmark?: boolean;
  /** Wordmark text color (defaults to currentColor). */
  wordmarkClassName?: string;
  /** Force a light wordmark (for dark backgrounds). */
  onDark?: boolean;
  className?: string;
};

/** Official company mark. Keep every public lockup tied to the approved favicon asset. */
export function BrandMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      width={size}
      height={size}
      src={brand.names.siteFavicon}
      aria-label={`${brand.names.siteName} — الرمز المؤسسي`}
      alt={`${brand.names.siteName} — الرمز المؤسسي`}
      className={className}
    />
  );
}

/** Product lockup for authenticated workspaces; the company lockup stays on public and legal surfaces. */
export function ProductLogo({
  size = 36,
  compact = false,
  onDark = true,
  className = "",
}: {
  size?: number;
  compact?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}
      aria-label={`${brand.names.erpDisplay} — ${brand.names.siteName}`}
    >
      <img
        src={brand.names.systemLogo}
        width={size}
        height={size}
        alt=""
        className="shrink-0 rounded-xl object-contain"
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={`truncate text-sm font-extrabold tracking-tight ${onDark ? "text-white" : "text-slate-900"}`}
          >
            {brand.names.erpDisplay}
          </span>
          <span
            className={`truncate text-[10px] ${onDark ? "text-white/60" : "text-slate-500"}`}
          >
            منظومة إدارة الأعمال
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * Full lockup: mark + bilingual wordmark.
 * Arabic name primary, English secondary in letterspaced mono.
 */
export function BrandLogo({
  size = 36,
  withWordmark = true,
  wordmarkClassName,
  onDark = true,
  className,
}: BrandLogoProps) {
  const wordColor = wordmarkClassName ?? (onDark ? "text-white" : "text-ink");
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display font-black tracking-tight text-[13.5px] leading-none ${wordColor}`}
            style={{
              fontFamily: '"Tajawal", system-ui, sans-serif',
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            الحسينية لخدمات الأعمال
          </span>
          <span
            className={`font-display font-bold tracking-[0.18em] text-[8.5px] mt-0.5 ${
              onDark ? "text-brand-300" : "text-brand"
            }`}
            style={{
              fontFamily: '"Tajawal", system-ui, sans-serif',
              fontWeight: 700,
            }}
          >
            ALHUSAINIA BUSINESS SERVICES
          </span>
        </span>
      )}
    </span>
  );
}
