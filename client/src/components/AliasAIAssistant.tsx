/**
 * client/src/components/AliasAIAssistant.tsx — ألياس (ALIAS AI) floating chat.
 *
 * Bilingual smart-assistant widget wired to trpc.aliasAi.chat. Degrades
 * gracefully: shows a clear state when the AI engine is disabled, or when a
 * request fails — it never blocks the app.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ALIAS_SUGGESTED_PROMPTS } from "../../../shared/aliasAi";

/**
 * ألياس (ALIAS AI) — premium floating assistant.
 * Glassmorphism panel, animated typing indicator, auto-scroll, unread badge,
 * auth-aware dual mode, and a global summon channel (CustomEvent "alias:open").
 */

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ActionChip = { labelAr: string; href: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "مرحباً! أنا ألياس (ALIAS AI)، مساعدك الذكي في المنصة.\nاسألني عن المحاسبة، المخزون، أو كيفية استخدام النظام — وأجيبك بالعربية أو الإنجليزية.",
};

export function AliasAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [chips, setChips] = useState<ActionChip[]>([]);
  const [unread, setUnread] = useState(0);
  const [, setLocation] = useLocation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Global summon channel: CustomEvent("alias:open") from any page ──
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("alias:open", open);
    return () => window.removeEventListener("alias:open", open);
  }, []);

  // ── Escape closes + focus input when opened ──
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [isOpen]);

  // ── Auto-scroll to the latest message ──
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  // Auth state decides the mode: tenant expert vs public website expert.
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false });
  const isAuthed = Boolean(meQuery.data);

  const statusQuery = trpc.aliasAi.status.useQuery(undefined, { retry: false });
  const avatar = statusQuery.data?.avatar ?? "/elias-avatar.jpg";
  const avatarSmall = statusQuery.data?.avatarSmall ?? "/elias-avatar-sm.jpg";

  const handleSuccess = (response: {
    content: string;
    suggestions?: ReadonlyArray<{ labelAr: string; href: string }>;
  }) => {
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: response.content },
    ]);
    if (response.suggestions?.length) setChips([...response.suggestions]);
  };

  const handleError = () => {
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content:
          "تعذّر إرسال الرسالة الآن — تحقق من اتصالك ثم أعد المحاولة. لن أخمّن إجابة عن بياناتك المالية.",
      },
    ]);
  };

  const chatMutation = trpc.aliasAi.chat.useMutation({
    onSuccess: handleSuccess,
    onError: handleError,
  });
  const publicMutation = trpc.aliasAi.publicChat.useMutation({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const pending = chatMutation.isPending || publicMutation.isPending;
  const starterPrompts: ActionChip[] = ALIAS_SUGGESTED_PROMPTS.map(p => ({
    labelAr: p,
    href: "",
  }));
  const visibleChips = chips.length > 0 ? chips : starterPrompts;

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const windowed: ChatMessage[] = [...messages, userMsg].slice(-30);
    setMessages(windowed);
    setInput("");
    setChips([]);
    const payload = windowed.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    // Tenant mode gets full grounded data; visitors get the platform expert.
    if (isAuthed) chatMutation.mutate({ messages: payload });
    else
      publicMutation.mutate({
        messages: payload.map(m => ({
          role: m.role,
          content: m.content.slice(0, 4000),
        })),
      });
  };

  const toggle = () => {
    setIsOpen(v => !v);
    setUnread(0);
  };

  return (
    <div
      className="fixed right-5 z-50 font-display bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      {/* Trigger — premium pill with attention halo + unread badge */}
      <button
        onClick={toggle}
        aria-label="فتح المساعد الذكي ألياس"
        className="group relative flex items-center gap-2 h-12 pr-1.5 pl-4 rounded-full shadow-2xl border border-brand-300/40 bg-gradient-to-l from-ink-deep to-ink transition-all duration-300 hover:scale-105 hover:border-brand-300/80"
      >
        <span className="absolute -inset-0.5 rounded-full ring-2 ring-brand-300/20 group-hover:ring-brand-300/45 animate-pulse pointer-events-none" />
        <img
          src={avatarSmall}
          alt=""
          className="relative w-9 h-9 rounded-full object-cover ring-2 ring-brand-300/60 transition-transform duration-300 group-hover:scale-110"
        />
        <span className="absolute top-8 right-10 w-3 h-3 rounded-full bg-emerald-400 border-2 border-ink-deep" />
        <span className="text-xs font-bold text-white hidden sm:inline">
          اسأل ألياس
        </span>
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
            {unread > 9 ? "+9" : unread}
          </span>
        )}
      </button>

      {/* Chat panel — glassmorphism */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[min(380px,calc(100vw-2.5rem))] h-[500px] max-h-[calc(100vh-7rem)] bg-ink-deep/95 backdrop-blur-xl text-white border border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-300">
          {/* Header — gradient identity */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-brand/25 via-transparent to-transparent border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={avatar}
                  alt="ألياس"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-300/60"
                />
                <span className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-ink-deep animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-black text-brand-200 leading-tight">
                  ألياس{" "}
                  <span className="text-[10px] font-mono text-white/40">
                    ALIAS AI
                  </span>
                </div>
                <div className="text-[10px] text-white/50 leading-tight">
                  {isAuthed
                    ? "متصل ببيانات مؤسستك الآن"
                    : "وضع الزائر — خبير المنصة"}
                  {statusQuery.data?.enabled === false && " • وضع محلي"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              aria-label="إغلاق ألياس"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages — auto-scrolled, entrance-animated */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-gradient-to-l from-brand-300 to-brand-300 text-ink-deep font-bold shadow-md rounded-br-sm"
                      : "bg-white/[0.07] border border-white/10 text-white/90 rounded-bl-sm backdrop-blur-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {/* Animated typing indicator */}
            {pending && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-white/[0.07] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Contextual action chips — starter prompts or intent-driven links */}
          {(messages.length <= 1 || chips.length > 0) && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {visibleChips.map((s, i) => (
                <button
                  key={`${s.labelAr}-${i}`}
                  onClick={() => {
                    if (s.href) {
                      setLocation(s.href);
                      setIsOpen(false);
                    } else {
                      send(s.labelAr);
                    }
                  }}
                  disabled={pending}
                  className={`text-[10px] border rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 ${
                    s.href
                      ? "bg-brand-300/10 hover:bg-brand-300/20 border-brand-300/30 text-brand-200"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70"
                  }`}
                >
                  {s.labelAr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-white/10 p-3 flex gap-2 bg-black/20"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب سؤالك لألياس…"
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-300/60 focus:bg-white/[0.09] transition-colors"
              maxLength={4000}
              aria-label="رسالتك إلى ألياس"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || pending}
              className="bg-gradient-to-l from-brand-300 to-brand-300 hover:from-brand-300 hover:to-brand-300 text-ink-deep h-9 w-9 p-0 rounded-xl shadow-md disabled:opacity-30 transition-all"
              aria-label="إرسال"
            >
              <Send className="w-4 h-4 -scale-x-100" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
