import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, Info, XCircle, Bell } from "lucide-react";

type NotificationType = "success" | "warning" | "info" | "error";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  className?: string;
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; className: string }
> = {
  success: { icon: CheckCircle, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  info: { icon: Info, className: "text-info" },
  error: { icon: XCircle, className: "text-destructive" },
};

export function NotificationList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  className,
}: NotificationListProps) {
  return (
    <div
      data-slot="notification-list"
      className={cn("flex flex-col gap-2", className)}
    >
      {notifications.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm font-medium">الإشعارات</p>
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-brand hover:underline"
          >
            تحديد الكل كمقروء
          </button>
        </div>
      )}
      {notifications.map(notification => {
        const config = typeConfig[notification.type];
        const Icon = config.icon;
        return (
          <button
            key={notification.id}
            onClick={() => onMarkAsRead?.(notification.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-sm",
              notification.read ? "opacity-60" : "bg-card border-border",
              config.className
            )}
          >
            <Icon className="size-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {notification.time}
              </p>
            </div>
            {!notification.read && (
              <span className="size-2 rounded-full bg-brand shrink-0 mt-2" />
            )}
          </button>
        );
      })}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell className="size-8 mb-2 opacity-50" />
          <p className="text-sm">لا توجد إشعارات</p>
        </div>
      )}
    </div>
  );
}
