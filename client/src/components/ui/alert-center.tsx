import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Bell,
  BellOff,
  ChevronLeft,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Package,
  Users,
  Receipt,
  ShieldCheck,
} from "lucide-react";

/**
 * AlertCenter — enterprise-grade notification & alert panel.
 * Inspired by SAP Fiori notifications + Linear's activity feed.
 * Renders an ordered list of typed alerts with severity, icon, and actions.
 */
export type AlertSeverity = "critical" | "warning" | "info" | "success";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  timestamp?: string; // ISO or relative
  icon?: React.ComponentType<{ className?: string }>;
  /** Primary action button label + onClick. */
  action?: { label: string; onClick?: () => void };
  /** Whether this alert is read/dismissed. */
  read?: boolean;
  /** Module badge (e.g. "المحاسبة", "المخزون"). */
  module?: string;
};

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
    iconClass: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    label: "حرج",
    className:
      "bg-destructive/15 dark:bg-rose-950/20 border-destructive/25 dark:border-rose-800",
    iconClass: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    label: "تحذير",
    className:
      "bg-warning/15 dark:bg-amber-950/20 border-warning/25 dark:border-amber-800",
    iconClass: "text-warning",
  },
  info: {
    icon: Info,
    label: "معلومة",
    className:
      "bg-info/15 dark:bg-sky-950/20 border-info/25 dark:border-sky-800",
    iconClass: "text-info",
  },
  success: {
    icon: CheckCircle2,
    label: "نجاح",
    className:
      "bg-success/15 dark:bg-emerald-950/20 border-success/25 dark:border-emerald-800",
    iconClass: "text-success",
  },
};

/** Built-in alert factories for common business scenarios. */
export const alertFactory = {
  lowStock: (
    product: string,
    quantity: number,
    threshold: number
  ): AlertItem => ({
    id: `low-stock-${product}`,
    severity: quantity === 0 ? "critical" : "warning",
    title: `نفاد مخزون: ${product}`,
    description: `الكمية المتبقية ${quantity} صنف — الحد الأدنى ${threshold}`,
    icon: Package,
    module: "المخزون",
    action: { label: "إعادة تعبئة", onClick: () => {} },
  }),
  overdueReceivable: (
    customer: string,
    amount: number,
    days?: number
  ): AlertItem => ({
    id: `overdue-${customer}`,
    severity:
      days === undefined
        ? "warning"
        : days > 60
          ? "critical"
          : days > 30
            ? "warning"
            : "info",
    title: `تأخر تحصيل: ${customer}`,
    description:
      days === undefined
        ? `مبلغ ${amount.toLocaleString()} YER مستحق التحصيل`
        : `مبلغ ${amount.toLocaleString()} YER متأخر ${days} يوم`,
    icon: TrendingDown,
    module: "المحاسبة",
  }),
  overduePayable: (
    supplier: string,
    amount: number,
    days?: number
  ): AlertItem => ({
    id: `payable-${supplier}`,
    severity: "warning",
    title: `فاتورة مستحقة: ${supplier}`,
    description:
      days === undefined
        ? `${amount.toLocaleString()} YER مستحقة السداد`
        : `${amount.toLocaleString()} YER مستحقة منذ ${days} يوم`,
    icon: TrendingUp,
    module: "المشتريات",
  }),
  newInvoice: (
    number: string,
    customer: string,
    amount: number
  ): AlertItem => ({
    id: `invoice-${number}`,
    severity: "success",
    title: `فاتورة جديدة #${number}`,
    description: `${customer} — ${amount.toLocaleString()} YER`,
    icon: Receipt,
    module: "التجارة",
  }),
  newCustomer: (name: string): AlertItem => ({
    id: `customer-${name}`,
    severity: "info",
    title: `عميل جديد: ${name}`,
    icon: Users,
    module: "التجارة",
  }),
  complianceOk: (standard: string): AlertItem => ({
    id: `compliance-${standard}`,
    severity: "success",
    title: `${standard} — متوافق`,
    icon: ShieldCheck,
    module: "الحوكمة",
  }),
};

function AlertRow({ item }: { item: AlertItem }) {
  const cfg = SEVERITY_CONFIG[item.severity];
  const Icon = item.icon ?? cfg.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm",
        cfg.className,
        item.read && "opacity-55"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", cfg.iconClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-foreground leading-tight">
            {item.title}
          </span>
          {item.module && (
            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground border-0 font-normal">
              {item.module}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
            {item.description}
          </p>
        )}
        {item.timestamp && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-[9px] text-muted-foreground/60">
              {item.timestamp}
            </span>
          </div>
        )}
      </div>
      {item.action && (
        <button
          onClick={item.action.onClick}
          className="shrink-0 text-[10px] font-bold text-brand hover:text-brand-deep transition-colors"
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}

export type AlertCenterProps = {
  alerts: AlertItem[];
  /** Max alerts to show before "show more". Default: 5. */
  limit?: number;
  title?: string;
  showBadge?: boolean;
  onMarkAllRead?: () => void;
  className?: string;
};

export function AlertCenter({
  alerts,
  limit = 6,
  title = "المركز التنبيهي",
  showBadge = true,
  onMarkAllRead,
  className,
}: AlertCenterProps) {
  const unread = alerts.filter(a => !a.read).length;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? alerts : alerts.slice(0, limit);

  return (
    <Card className={cn("surface rounded-2xl overflow-hidden", className)}>
      <CardHeader className="px-4 py-3 border-b border-border/60 flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand" />
          <CardTitle className="text-xs font-bold">{title}</CardTitle>
          {showBadge && unread > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-black text-white bg-destructive rounded-full">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>تحديد الكل مقروء</span>
            </button>
          )}
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
          >
            <ChevronLeft
              className={cn(
                "w-3 h-3 transition-transform",
                expanded && "rotate-90"
              )}
            />
            <span>{expanded ? "عرض أقل" : "الكل"}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <BellOff className="w-6 h-6 opacity-30" />
            <p className="text-xs">لا توجد تنبيهات حديثة</p>
          </div>
        ) : (
          visible.map(alert => <AlertRow key={alert.id} item={alert} />)
        )}
        {!expanded && alerts.length > limit && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-center text-[10px] text-brand hover:text-brand-deep font-bold py-1.5 transition-colors"
          >
            عرض {alerts.length - limit} تنبيهات أخرى
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * NotificationBell — compact header bell that opens AlertCenter in a popover/sheet.
 */
export function NotificationBell({ alerts }: { alerts: AlertItem[] }) {
  const unread = alerts.filter(a => !a.read).length;

  return (
    <button className="relative p-2 rounded-xl hover:bg-accent transition-colors">
      <Bell className="w-4 h-4 text-muted-foreground" />
      {unread > 0 && (
        <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-black text-white bg-destructive rounded-full border border-background">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
