import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * MessagesButton — الرسائل المباشرة (inbox + thread + composer dialog).
 * Extracted out of AppSidebar so the sidebar stays a pure navigation shell.
 */
export function MessagesButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [withUser, setWithUser] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [toUser, setToUser] = useState<string>("");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: unread } = trpc.modules.messages.unreadCount.useQuery();
  const { data: inbox, isPending: inboxPending } =
    trpc.modules.messages.listInbox.useQuery(undefined, { enabled: open });
  const { data: users } = trpc.modules.rbac.listUsers.useQuery(undefined, {
    enabled: open,
  });
  const { data: thread, isPending: threadPending } =
    trpc.modules.messages.listWith.useQuery(
      { userId: withUser! },
      { enabled: open && !!withUser }
    );
  const markRead = trpc.modules.messages.markRead.useMutation({
    onSuccess: () => {
      utils.modules.messages.unreadCount.invalidate();
      utils.modules.messages.listInbox.invalidate();
    },
  });
  const send = trpc.modules.messages.send.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الرسالة");
      setBody("");
      utils.modules.messages.listInbox.invalidate();
      if (withUser)
        utils.modules.messages.listWith.invalidate({ userId: withUser });
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الإرسال"),
  });

  const me = String(user?.id ?? -1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="الرسائل"
          title="الرسائل"
          className={`relative rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
            compact ? "" : "mr-auto"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {unread ? (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> الرسائل المباشرة
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {/* Inbox */}
          <div className="max-h-80 overflow-y-auto space-y-1 rounded-lg border p-2">
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">
              الوارد
            </p>
            {inboxPending ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                جاري التحميل...
              </p>
            ) : (inbox ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                لا رسائل
              </p>
            ) : (
              (inbox ?? []).map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setWithUser(m.fromUserId);
                    setToUser(m.fromUserId);
                    if (!m.isRead) markRead.mutate({ id: m.id });
                  }}
                  className={`w-full rounded-lg border p-2 text-right transition hover:bg-muted/40 ${
                    m.isRead ? "opacity-60" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-foreground">
                      {m.fromName || m.fromUserId}
                    </span>
                    {!m.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.body}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Conversation */}
          <div className="flex max-h-80 flex-col rounded-lg border p-2">
            {withUser ? (
              <>
                <div className="mb-2 flex-1 space-y-1 overflow-y-auto">
                  {threadPending ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      جاري التحميل...
                    </p>
                  ) : (thread ?? []).length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      لا رسائل بعد
                    </p>
                  ) : (
                    (thread ?? []).map((m: any) => {
                      const mine = String(m.fromUserId) === me;
                      return (
                        <div
                          key={m.id}
                          className={`max-w-[90%] rounded-lg p-2 text-[11px] ${
                            mine
                              ? "ml-auto bg-brand text-ink-deep"
                              : "mr-auto bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="mb-1 text-[10px] text-muted-foreground">
                  المحادثة مع:{" "}
                  {users?.find((u: any) => String(u.id) === withUser)?.name ??
                    withUser}
                </p>
              </>
            ) : (
              <p className="m-auto text-center text-xs text-muted-foreground">
                اختر مرسلاً من الوارد لعرض المحادثة
              </p>
            )}
          </div>
        </div>

        {/* Send box */}
        <div className="space-y-2 border-t pt-2">
          <select
            value={toUser}
            onChange={e => {
              setToUser(e.target.value);
              setWithUser(e.target.value || null);
            }}
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-[12px]"
          >
            <option value="">اختر مستخدماً...</option>
            {(users ?? []).map((u: any) => (
              <option key={u.id} value={String(u.id)}>
                {u.name}
              </option>
            ))}
          </select>
          <textarea
            rows={2}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-[12px]"
          />
          <Button
            size="sm"
            className="w-full bg-brand text-ink-deep"
            disabled={!toUser || !body.trim() || send.isPending}
            onClick={() => send.mutate({ toUserId: toUser, message: body })}
          >
            إرسال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
