import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Download, ShieldCheck } from "lucide-react";

export interface DynamicsCommandBarAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive";
  disabled?: boolean;
}

export interface DynamicsLayoutProps {
  title: string;
  subtitle?: string;
  actions?: DynamicsCommandBarAction[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  children: React.ReactNode;
  kpiStrip?: React.ReactNode;
}

export function DynamicsLayout({
  title,
  subtitle,
  actions = [],
  searchQuery,
  onSearchChange,
  onRefresh,
  onExport,
  children,
  kpiStrip,
}: DynamicsLayoutProps) {
  return (
    <div
      className="flex flex-col h-full bg-background text-foreground"
      dir="rtl"
    >
      {/* Enterprise Workspace Header */}
      <div className="border-b bg-card px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> النظام المالي الموحد —
              معتمد وآمن
            </span>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Global Search & Quick Actions */}
        <div className="flex items-center gap-2">
          {onSearchChange !== undefined && (
            <div className="relative w-64">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث سريع في السجلات..."
                value={searchQuery || ""}
                onChange={e => onSearchChange(e.target.value)}
                className="pr-9 h-9 text-sm bg-background border-input"
              />
            </div>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              title="تحديث البيانات"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              title="تصدير إلى Excel"
            >
              <Download className="h-4 w-4 ml-1.5" /> تصدير
            </Button>
          )}
        </div>
      </div>

      {/* Command Bar */}
      <div className="bg-muted/40 border-b px-6 py-2 flex items-center gap-2 overflow-x-auto">
        {actions.map((act, idx) => (
          <Button
            key={idx}
            variant={act.variant || "outline"}
            size="sm"
            onClick={act.onClick}
            disabled={act.disabled}
            className="h-8 text-xs font-medium shadow-none bg-background hover:bg-muted"
          >
            {act.icon && <span className="ml-1.5">{act.icon}</span>}
            {act.label}
          </Button>
        ))}
      </div>

      {/* KPI Strip if provided */}
      {kpiStrip && (
        <div className="px-6 py-4 bg-card/50 border-b">{kpiStrip}</div>
      )}

      {/* Main Workspace Grid / Content */}
      <div className="flex-1 p-6 overflow-auto space-y-4">{children}</div>
    </div>
  );
}

export function DynamicsStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    posted: {
      label: "مرحّل",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    approved: {
      label: "معتمد",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    draft: {
      label: "مسودة",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    cancelled: {
      label: "ملغي",
      className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    completed: {
      label: "مكتمل",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    planned: {
      label: "مخطط",
      className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    in_progress: {
      label: "قيد التنفيذ",
      className: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    },
  };

  const item = map[status] || {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.className}`}
    >
      {item.label}
    </span>
  );
}
