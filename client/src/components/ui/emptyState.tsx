/**
 * Advanced Empty State — Premium empty states with illustrations and actions.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Inbox,
  SearchX,
  FileX,
  PackageOpen,
  ShoppingCart,
  Building2,
  HardHat,
  Users,
  Receipt,
  Truck,
  Plus,
  ArrowUpRight,
} from "lucide-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  variant?: "default" | "search" | "error" | "warning";
}

const iconMap: Record<string, React.ElementType> = {
  default: Inbox,
  search: SearchX,
  error: FileX,
  warning: PackageOpen,
};

const variantColors = {
  default: "text-neutral-400",
  search: "text-violet-400",
  error: "text-red-400",
  warning: "text-amber-400",
};

const variantBgColors = {
  default: "bg-neutral-100 dark:bg-neutral-800",
  search: "bg-violet-50 dark:bg-violet-950/30",
  error: "bg-red-50 dark:bg-red-950/30",
  warning: "bg-amber-50 dark:bg-amber-950/30",
};

/**
 * Premium empty state component with animation and optional actions.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const Component = Icon ?? iconMap[variant];

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 p-12 text-center",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div
        className={cn(
          "mb-6 flex size-24 items-center justify-center rounded-2xl",
          variantBgColors[variant]
        )}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Component className={cn("size-12", variantColors[variant])} />
      </motion.div>

      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <motion.div className="mt-6 flex items-center gap-3">
          {actionLabel && onAction && (
            <motion.button
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {actionLabel}
              <ArrowUpRight className="size-4" />
            </motion.button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <motion.button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-card px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {secondaryActionLabel}
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Pre-built empty states for specific contexts.
 */
export function EmptyInvoices({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Receipt}
      title="لا توجد فواتير"
      description="لم يتم إنشاء أي فواتير بعد. ابدأ بإنشاء فاتورة جديدة لتسجيل معاملاتك المالية."
      actionLabel="إنشاء فاتورة"
      className={className}
    />
  );
}

export function EmptyRequisitions({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Building2}
      title="لا توجد طلبات مستلزمات"
      description="لم يتم تقديم أي طلبات مستلزمات بعد. ابدأ بطلب مستلزمات جديدة لمشروعك."
      actionLabel="طلب مستلزمات"
      className={className}
    />
  );
}

export function EmptyCustomers({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Users}
      title="لا يوجد زبائن"
      description="لم يتم إضافة أي زبائن بعد. أضف زبوناً جديداً لتوسيع قاعدة عملائك."
      actionLabel="إضافة زبون"
      className={className}
    />
  );
}

export function EmptyProducts({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={PackageOpen}
      title="لا توجد منتجات"
      description="لم يتم إضافة أي منتجات بعد. أضف منتجات لبدء إدارة المخزون."
      actionLabel="إضافة منتج"
      className={className}
    />
  );
}

export function EmptySearch({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title="لا توجد نتائج"
      description="لم نتمكن من العثور على أي نتائج تطابق بحثك. حاول تغيير كلمة البحث أو توسيع نطاق البحث."
      secondaryActionLabel="إعادة البحث"
      variant="search"
      className={className}
    />
  );
}

export function EmptyError({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={FileX}
      title="حدث خطأ"
      description="تعذر تحميل البيانات. يرجى المحاولة مرة أخرى أو التواصل مع فريق الدعم."
      actionLabel="إعادة المحاولة"
      variant="error"
      className={className}
    />
  );
}

export function EmptyWarehouse({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Truck}
      title="لا توجد بيانات مستودع"
      description="لم يتم تسجيل أي عمليات مستودع بعد. ابدأ بإضافة عملية استلام أو توريد."
      actionLabel="إضافة عملية"
      className={className}
    />
  );
}
