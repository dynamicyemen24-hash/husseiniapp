import React, { useState } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * NotificationBell — الإشعارات (bell + unread badge + read list dialog).
 * Extracted out of AppSidebar so the sidebar stays a pure navigation shell.
 */
export function NotificationBell({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: count } = trpc.modules.notifications.unreadCount.useQuery();
  const { data: items, isPending } = trpc.modules.notifications.list.useQuery(
    undefined,
    { enabled: open }
  );
  const markRead = trpc.modules.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.modules.notifications.unreadCount.invalidate();
      utils.modules.notifications.list.invalidate();
    },
  });
  const markAll = trpc.modules.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.modules.notifications.unreadCount.invalidate();
      utils.modules.notifications.list.invalidate();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="الإشعارات"
          title="الإشعارات"
          className={`relative rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
            compact ? "" : "mr-auto"
          }`}
        >
          <Bell className="h-4 w-4" />
          {count ? (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> الإشعارات
            {count ? (
              <Badge className="bg-rose-100 text-rose-700 text-[10px]">
                {count} غير مقروء
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isPending ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              جاري التحميل...
            </p>
          ) : (items ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا توجد إشعارات
            </p>
          ) : (
            (items ?? []).map((n: any) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead.mutate({ id: n.id });
                  if (n.link) {
                    setLocation(n.link);
                    setOpen(false);
                  }
                }}
                className={`w-full rounded-xl border p-2.5 text-right transition hover:bg-muted/40 ${
                  n.isRead ? "bg-transparent opacity-60" : "bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-foreground">
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {n.body}
                </p>
              </button>
            ))
          )}
        </div>
        {(items ?? []).length > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="w-full rounded-lg bg-brand/10 py-2 text-[11px] font-medium text-brand hover:bg-brand/20"
          >
            تعليم الكل كمقروء
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
