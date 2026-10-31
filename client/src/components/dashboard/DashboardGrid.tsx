import * as React from "react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

interface DashboardStat {
  label: string;
  value: string | number;
  delta: string;
  deltaType: "up" | "down" | "neutral";
}

interface DashboardGridProps {
  stats: DashboardStat[];
  className?: string;
}

export function DashboardGrid({ stats, className }: DashboardGridProps) {
  return (
    <div
      data-slot="dashboard-grid"
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="stagger-item"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <StatCard {...stat} />
        </div>
      ))}
    </div>
  );
}

export function DashboardBento({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="dashboard-bento" className={cn("bento-grid", className)}>
      {children}
    </div>
  );
}

export function DashboardBentoCard({
  children,
  span,
  className,
}: {
  children: React.ReactNode;
  span?: 4 | 6 | 8 | 12;
  className?: string;
}) {
  return (
    <div
      data-slot="dashboard-bento-card"
      className={cn("bento-card p-6", span && `bento-span-${span}`, className)}
    >
      {children}
    </div>
  );
}
