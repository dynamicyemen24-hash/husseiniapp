import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CircularProgressProps
  extends React.SVGAttributes<SVGSVGElement> {
  /** Size in pixels (default: 24) */
  size?: number;
  /** Stroke width (default: 2.5) */
  strokeWidth?: number;
  /** Progress value 0-100 (indeterminate if not provided) */
  value?: number;
  /** Variant: 'primary' | 'secondary' | 'inverse' | 'brand' */
  variant?: "primary" | "secondary" | "inverse" | "brand";
  /** Animation speed in ms (default: 1000) */
  speed?: number;
  /** Show percentage label (default: false) */
  showLabel?: boolean;
  /** Accessibility label */
  "aria-label"?: string;
  /** Role (default: 'progressbar') */
  role?: "progressbar" | "status";
}

const VARIANT_CLASSES = {
  primary: "text-brand",
  secondary: "text-muted-foreground/60",
  inverse: "text-white",
  brand: "text-brand",
} as const;

const VARIANT_TRACK = {
  primary: "text-brand/15",
  secondary: "text-muted-foreground/15",
  inverse: "text-white/20",
  brand: "text-brand/15",
} as const;

export const CircularProgress = forwardRef<
  SVGSVGElement,
  CircularProgressProps
>(
  (
    {
      className,
      size = 24,
      strokeWidth = 2.5,
      value,
      variant = "brand",
      speed = 1000,
      showLabel = false,
      "aria-label": ariaLabel = "جاري التحميل",
      role = "progressbar",
      style,
      ...props
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const isIndeterminate = value === undefined || value === null;

    const progressStyle = {
      strokeDasharray: circumference,
      strokeDashoffset: isIndeterminate
        ? 0
        : circumference * (1 - Math.max(0, Math.min(1, value / 100))),
      transition: isIndeterminate ? "none" : "stroke-dashoffset 0.3s ease-out",
      transformOrigin: "center",
    } as React.CSSProperties;

    const trackStyle = {
      strokeDasharray: circumference,
    } as React.CSSProperties;

    const rotationStyle = isIndeterminate
      ? ({
          animation: `huss-circular-rotate ${speed}ms linear infinite`,
          transformOrigin: "center",
        } as React.CSSProperties)
      : {};

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn("huss-circular-progress", className)}
        role={role}
        aria-label={ariaLabel}
        aria-valuemin={isIndeterminate ? undefined : 0}
        aria-valuemax={isIndeterminate ? undefined : 100}
        aria-valuenow={isIndeterminate ? undefined : value}
        style={style}
        {...props}
      >
        <defs>
          <style>{`
            @keyframes huss-circular-rotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes huss-circular-dash {
              0% { stroke-dashoffset: ${circumference}; stroke-dasharray: 1, ${circumference}; }
              50% { stroke-dashoffset: ${circumference / 2}; stroke-dasharray: ${circumference * 0.7}, ${circumference * 0.3}; }
              100% { stroke-dashoffset: 0; stroke-dasarray: ${circumference * 0.1}, ${circumference * 0.9}; }
            }
            .huss-circular-progress[data-indeterminate="true"] .huss-progress-ring {
              animation: huss-circular-dash ${speed * 1.5}ms ease-in-out infinite;
            }
          `}</style>
        </defs>
        <circle
          className={cn("huss-progress-track", VARIANT_TRACK[variant])}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={trackStyle}
        />
        <circle
          className={cn(
            "huss-progress-ring",
            VARIANT_CLASSES[variant],
            isIndeterminate && "huss-indeterminate"
          )}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={progressStyle}
          data-indeterminate={isIndeterminate}
        />
        {showLabel && !isIndeterminate && (
          <text
            x={size / 2}
            y={size / 2 + 3}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.22}
            fontWeight={600}
            fill="currentColor"
            className={VARIANT_CLASSES[variant]}
          >
            {Math.round(value)}%
          </text>
        )}
      </svg>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export interface LoadingOverlayProps {
  /** Show the overlay */
  isOpen: boolean;
  /** Optional progress value 0-100 */
  progress?: number;
  /** Optional message */
  message?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Blur background */
  blur?: boolean;
  /** Click to dismiss */
  onDismiss?: () => void;
}

const SIZE_CONFIG = {
  sm: { progressSize: 28, gap: 8, fontSize: "text-xs", padding: "p-6" },
  md: { progressSize: 40, gap: 12, fontSize: "text-sm", padding: "p-8" },
  lg: { progressSize: 56, gap: 16, fontSize: "text-base", padding: "p-10" },
} as const;

export function LoadingOverlay({
  isOpen,
  progress,
  message,
  size = "md",
  blur = true,
  onDismiss,
}: LoadingOverlayProps) {
  if (!isOpen) return null;

  const cfg = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        blur && "backdrop-blur-sm bg-ink/60",
        !blur && "bg-ink/80"
      )}
      onClick={onDismiss}
      role="status"
      aria-live="polite"
      aria-label={message || "جاري التحميل"}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-2xl shadow-2xl border border-white/10",
          "bg-white/5 dark:bg-ink/90",
          cfg.padding
        )}
        onClick={e => e.stopPropagation()}
      >
        <CircularProgress
          size={cfg.progressSize}
          value={progress}
          variant="brand"
          strokeWidth={3}
          aria-label={message || "جاري التحميل"}
        />
        {message && (
          <p
            className={cn(
              cfg.fontSize,
              "font-medium text-foreground text-center max-w-sm"
            )}
          >
            {message}
          </p>
        )}
        {progress !== undefined && progress > 0 && progress < 100 && (
          <p className={cn("font-mono font-bold text-brand", cfg.fontSize)}>
            {Math.round(progress)}%
          </p>
        )}
      </div>
    </div>
  );
}

export interface InlineLoadingProps {
  /** Show loading state */
  isLoading: boolean;
  /** Optional progress value */
  progress?: number;
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Text when loading */
  loadingText?: string;
  /** Text when done */
  doneText?: string;
  /** Custom children to show when not loading */
  children?: React.ReactNode;
  /** Alignment */
  align?: "center" | "start" | "end";
}

export function InlineLoading({
  isLoading,
  progress,
  size = "sm",
  loadingText = "جاري التحميل...",
  doneText = "تم",
  children,
  align = "center",
}: InlineLoadingProps) {
  const cfg = SIZE_CONFIG[size];
  const alignClasses = {
    center: "justify-center",
    start: "justify-start",
    end: "justify-end",
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3",
          alignClasses[align],
          cfg.padding.replace("p-", "py-").replace("p-", "px-")
        )}
        role="status"
        aria-live="polite"
      >
        <CircularProgress
          size={cfg.progressSize}
          value={progress}
          variant="brand"
          strokeWidth={2.5}
          aria-label={loadingText}
        />
        <span className={cn(cfg.fontSize, "text-muted-foreground")}>
          {progress !== undefined ? `${Math.round(progress)}%` : loadingText}
        </span>
      </div>
    );
  }

  if (children) return <>{children}</>;
  return (
    <span className={cn(cfg.fontSize, "text-emerald-600 font-medium")}>
      {doneText}
    </span>
  );
}
