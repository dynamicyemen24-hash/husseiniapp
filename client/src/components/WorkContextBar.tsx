import { useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Command as CommandIcon,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { trpc } from "@/lib/trpc";
import { withViewTransition } from "@/lib/viewTransition";
import { APP_NAV, APP_GROUPS } from "@/lib/nav";
import {
  COMMAND_INTENT_LABELS,
  WORK_COMMANDS,
  filterCommandsForRole,
  groupCommandsByIntent,
  type WorkCommand,
} from "@/lib/commands";
import { ROLE_DEFINITIONS } from "@shared/permissions";
import { cn } from "@/lib/utils";

/**
 * WorkContextBar — شريط السياق الدائم داخل مساحة العمل
 * ============================================================
 * يبقى ظاهراً تحت الترويسة في كل شاشات النظام (41 مساراً)، ويجيب عن
 * ثلاثة أسئلة يطرحها المستخدم باستمرار دون أن يبحث:
 *
 *   1. أين أنا؟      → الوحدة الحالية + المجال (المالية/التجارة/…)
 *   2. من أنا؟       → الدور الفعلي والصلاحيات الممنوحة
 *   3. ما المطلوب؟   → نوايا سريعة مفلترة حسب الدور (intent-based)
 *
 * مبادئ (Fiori / Dynamics — بروح لا بنسخ):
 *   • Role-based    — النوايا تظهر حسب الصلاحية، لا حسب صفحة.
 *   • Intent-based  — زر "تسجيل قيد محاسبي" لا "فتح شاشة القيود".
 *   • Responsive    — على الجوال يتحوّل إلى شريط أفقي قابل للتمرير.
 *   • Command-driven — زر واحد يفتح لوحة الأوامر (Ctrl+K) بدل قوائم متداخلة.
 */
export function WorkContextBar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { can, role, ready } = usePermissions();

  // ─── حالة تشغيلية حيّة (بلا تجميد) ─────────────────────────────
  const operations = trpc.modules.operations.summary.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });

  // ─── فترات العمل: آخر فترة مالية مفتوحة ────────────────────────
  const periods = trpc.fiscalPeriods.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
    enabled: isAuthenticated,
  });

  const currentNav = useMemo(
    () =>
      APP_NAV.find(
        item =>
          location === item.path ||
          (item.path !== "/app" && location.startsWith(item.path))
      ),
    [location]
  );

  const currentGroup = useMemo(
    () =>
      APP_GROUPS.find(g =>
        g.items.some(
          item =>
            location === item.path ||
            (item.path !== "/app" && location.startsWith(item.path))
        )
      ),
    [location]
  );

  const roleLabel = useMemo(() => {
    if (!ready) return null;
    const defs = ROLE_DEFINITIONS as unknown as Record<
      string,
      { label?: string }
    >;
    return defs[role ?? ""]?.label ?? null;
  }, [role, ready]);

  const openPeriod = useMemo(() => {
    const list = (periods.data ?? []) as any[];
    const open = list.find(p => p.status === "open");
    return (open ?? list[0]) as any | undefined;
  }, [periods.data]);

  // ─── النوايا المتاحة لهذا الدور ─────────────────────────────────
  const allowedCommands = useMemo(
    () => filterCommandsForRole(WORK_COMMANDS, can),
    [can]
  );

  const grouped = useMemo(
    () => groupCommandsByIntent(allowedCommands),
    [allowedCommands]
  );

  // نوايا سريعة: أول نية من كل مجال — تغطي التنقّل دون إغراق.
  const quickIntents = useMemo(() => {
    const seen = new Set<string>();
    const out: WorkCommand[] = [];
    for (const g of grouped) {
      const first = g.commands[0];
      if (first && !seen.has(first.intent)) {
        seen.add(first.intent);
        out.push(first);
      }
    }
    return out;
  }, [grouped]);

  const navigate = (path: string) => {
    withViewTransition(() => setLocation(path));
  };

  const openPalette = () => {
    window.dispatchEvent(new Event("alh:open-command"));
  };

  const op = operations.data;

  return (
    <div
      className="sticky top-14 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      dir="rtl"
    >
      <div className="mx-auto flex h-11 max-w-[1600px] items-center gap-2 px-3 lg:px-6">
        {/* ─── موضع العمل: الوحدة والمجال ─── */}
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[10px] font-bold text-brand sm:inline-flex"
            title={currentGroup?.description}
          >
            {currentGroup?.label ?? "النظام"}
          </span>
          <span className="truncate text-[11px] font-bold text-foreground">
            {currentNav?.label ?? "لوحة العمل"}
          </span>
        </div>

        <span
          className="hidden h-4 w-px bg-border sm:block"
          aria-hidden="true"
        />

        {/* ─── الدور: هوية وصلاحية ─── */}
        {roleLabel && (
          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground md:inline-flex"
            title={`الصلاحيات الممنوحة: ${allowedCommands.length} نية عمل`}
          >
            <ShieldCheck className="h-3 w-3" />
            {roleLabel}
          </span>
        )}

        {/* ─── الفترة المالية الجارية ─── */}
        {openPeriod && (
          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground lg:inline-flex"
            title={`الفترة المالية: ${openPeriod.name}`}
          >
            <Gauge className="h-3 w-3" />
            {openPeriod.name}
            {openPeriod.status && openPeriod.status !== "open" && (
              <span className="text-warning">· {openPeriod.status}</span>
            )}
          </span>
        )}

        {/* ─── حالة تشغيلية حيّة ─── */}
        {op && (
          <div className="hidden items-center gap-1.5 xl:flex">
            {op.lowStock > 0 && (
              <StatusPip
                tone="warning"
                value={op.lowStock}
                label="أصناف تحت الحد"
              />
            )}
            {op.pendingOrders > 0 && (
              <StatusPip
                tone="info"
                value={op.pendingOrders}
                label="أوامر معلّقة"
              />
            )}
            {op.overdue > 0 && (
              <StatusPip tone="danger" value={op.overdue} label="متأخرات" />
            )}
            {op.unread > 0 && (
              <StatusPip tone="neutral" value={op.unread} label="إشعارات" />
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* ─── نوايا سريعة حسب الدور ─── */}
        <nav
          aria-label="نوايا سريعة"
          className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex"
        >
          <AnimatePresence initial={false}>
            {quickIntents.map(cmd => (
              <motion.button
                key={cmd.id}
                type="button"
                onClick={() => navigate(cmd.path)}
                title={`${cmd.label} — ${cmd.hint}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-[11px] font-semibold text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <cmd.icon className="h-3.5 w-3.5 text-brand/70 transition-colors group-hover:text-brand" />
                <span className="whitespace-nowrap">{cmd.label}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </nav>

        {/* ─── زر الأوامر: نقطة الدخول الموحّدة ─── */}
        <button
          type="button"
          onClick={openPalette}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 text-[11px] font-bold text-foreground transition-all duration-200 hover:bg-muted hover:shadow-modern-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          title="لوحة الأوامر (Ctrl+K)"
        >
          <CommandIcon className="h-3.5 w-3.5 text-brand" />
          <span className="hidden lg:inline">الأوامر</span>
          <kbd className="hidden rounded border border-border bg-background px-1 font-mono text-[9px] text-muted-foreground lg:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ─── شريط النوايا على الجوال: أفقي قابل للتمرير ─── */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/50 px-3 py-1.5 md:hidden">
        {allowedCommands.slice(0, 8).map(cmd => (
          <button
            key={cmd.id}
            type="button"
            onClick={() => navigate(cmd.path)}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 text-[10px] font-semibold text-foreground"
          >
            <cmd.icon className="h-3 w-3 text-brand" />
            {cmd.label}
          </button>
        ))}
        <span className="ms-auto inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
          {operations.isLoading ? (
            <WifiOff className="h-3 w-3" />
          ) : (
            <Wifi className="h-3 w-3 text-success" />
          )}
          {operations.isLoading ? "جارٍ المزامنة" : "متصل"}
        </span>
      </div>
    </div>
  );
}

/** نقطة حالة صغيرة (قيمة + تسمية) بألوان دلالية. */
function StatusPip({
  tone,
  value,
  label,
}: {
  tone: "warning" | "info" | "danger" | "neutral";
  value: number;
  label: string;
}) {
  const toneClass = {
    warning: "border-warning/30 bg-warning-soft text-warning",
    info: "border-info/30 bg-info-soft text-info",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    neutral: "border-border bg-muted/60 text-muted-foreground",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
        toneClass
      )}
      title={label}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
      {value}
      <span className="sr-only">{label}</span>
    </span>
  );
}
