import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { withViewTransition } from "@/lib/viewTransition";
import { Command } from "cmdk";
import {
  Building2,
  Phone,
  FileText,
  Search,
  Package,
  Users,
  BookText,
  ReceiptText,
  Sparkles,
  type LucideIcon,
  AlertCircle,
  Clock,
} from "lucide-react";
import { MODULE_LIST } from "@/lib/design";
import { APP_NAV, UTILITY_LINKS, MARKETING_NAV } from "@/lib/nav";
import { whatsappLink } from "@/lib/brand";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import {
  WORK_COMMANDS,
  filterCommandsForRole,
  groupCommandsByIntent,
} from "@/lib/commands";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  hint?: string;
}

/** التنقل الكامل: صفحات عامة + مساحات العمل + أدوات مساعدة — يتبع nav.ts دائماً. */
const NAV: NavItem[] = [
  ...MARKETING_NAV.filter(i => !i.path.startsWith("/#")).map(i => ({
    label: i.label,
    path: i.path,
    icon: i.icon as unknown as LucideIcon,
    hint: i.description,
  })),
  ...APP_NAV.map(i => ({
    label: i.label,
    path: i.path,
    icon: i.icon as unknown as LucideIcon,
  })),
  ...UTILITY_LINKS.map(i => ({
    label: i.label,
    path: i.path,
    icon: i.icon as unknown as LucideIcon,
  })),
];

interface CommandPaletteFeature {
  label: string;
  icon: LucideIcon;
  action: () => void;
  description?: string;
}

interface SearchResults {
  products: { id: number; name: string; code: string }[];
  customers: { id: number; name: string; code: string }[];
  suppliers: { id: number; name: string; code: string }[];
  accounts: { id: number; name: string; code: string }[];
  transactions: { id: number; name: string; code: string }[];
  suggestions: { label: string; hint: string }[];
}

const EMPTY_RESULTS: SearchResults = {
  products: [],
  customers: [],
  suppliers: [],
  accounts: [],
  transactions: [],
  suggestions: [],
};

/**
 * Global Command Palette (⌘K / Ctrl+K) — the signature navigation surface of
 * world-class SaaS. Lets power users jump to any module, search live products
 * / customers / suppliers, or run an action without leaving the keyboard.
 * Self-contained and mounted once at the app root. Luxury refactor: enhanced
 * styling, quick-action shortcuts, and richer search results.
 */
export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const utils = trpc.useUtils();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { can, ready: permissionsReady } = usePermissions();

  /**
   * نوايا العمل — نفس السجل الذي يغذّي شريط السياق الدائم.
   * مُفلترة حسب صلاحية المستخدم، فتُخفى ما لا يملكه الدور.
   */
  const intentGroups = useMemo(
    () => groupCommandsByIntent(filterCommandsForRole(WORK_COMMANDS, can)),
    [can]
  );

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    withViewTransition(() => setLocation(path));
  };

  const QUICK_ACTIONS: CommandPaletteFeature[] = [
    {
      label: "إنشاء فاتورة مبيعات جديدة",
      icon: FileText,
      action: () => go("/commercial?new=sale"),
      description: "إنشاء فاتورة مبيعات جديدة",
    },
    {
      label: "عرض القائمة الكاملة",
      icon: Building2,
      action: () => go("/commercial"),
      description: "عرض جميع المعاملات التجارية",
    },
    {
      label: "إدارة المخزون",
      icon: Package,
      action: () => go("/inventory"),
      description: "عرض وتحكم في مستويات المخزون",
    },
    {
      label: "فحص التنبيهات",
      icon: AlertCircle,
      action: () => go("/support"),
      description: "عرض التنبيهات التنبؤية والحالة",
    },
    {
      label: "التقارير المجدولة",
      icon: Clock,
      action: () => go("/reports"),
      description: "عرض وإدارة التقارير والجداول المجدولة",
    },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("alh:open-command", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("alh:open-command", onOpenEvent);
    };
  }, []);

  // Debounced live search across products / customers / suppliers.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults(EMPTY_RESULTS);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        // One unified trigram-accelerated call — replaces the old 3-parallel
        // fan-out (products.list / customers.list / suppliers.list) and adds
        // accounts + transactions + smart suggestions. Always tenant-scoped.
        const data = await utils.query.globalSearch.fetch({
          query: q,
          limit: 8,
        });
        const byKind = (kind: string) =>
          (data.items ?? [])
            .filter((x: any) => x.kind === kind)
            .map((x: any) => ({ id: x.id, name: x.name, code: x.code ?? "" }));
        setResults({
          products: byKind("product"),
          customers: byKind("customer"),
          suppliers: byKind("supplier"),
          accounts: byKind("account"),
          transactions: byKind("transaction"),
          suggestions: data.suggestions ?? [],
        });
      } catch {
        // ignore — user may be logged out
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, utils]);

  const handleQuickAction = (action: CommandPaletteFeature) => {
    setOpen(false);
    setQuery("");
    action.action();
  };

  const hasResults =
    results.products.length +
      results.customers.length +
      results.suppliers.length +
      results.accounts.length +
      results.transactions.length >
    0;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      label="لوحة الأوامر"
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-start justify-center pt-[12vh] transition-opacity duration-300"
    >
      <div className="w-full max-w-xl bg-card text-white rounded-3xl shadow-2xl overflow-hidden border border-white/10 backdrop-filter backdrop-blur-md">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="ابحث عن صفحة، منتج، عميل، أو مورد…"
            className="flex-1 h-14 bg-muted text-white outline-none placeholder:text-muted-foreground focus:bg-gray-800 transition-colors"
          />
          <kbd className="text-xs text-muted-foreground border border-gray-700 rounded px-2 py-1 font-mono">
            ESC
          </kbd>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-white transition-colors"
            title="إغلاق (Esc)"
          >
            ✕
          </button>
        </div>

        <Command.List className="max-h-[65vh] overflow-y-auto p-4">
          <Command.Empty className="text-center text-sm text-muted-foreground py-12">
            لا توجد نتائج مطابقة.
          </Command.Empty>

          {hasResults && (
            <Command.Group
              heading="نتائج البحث"
              className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              {" "}
              {results.products.map(p => (
                <Command.Item
                  key={`p-${p.id}`}
                  value={`منتج ${p.name} ${p.code}`}
                  onSelect={() => go("/inventory")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Package className="w-4 h-4 text-brand shrink-0" />
                  <span className="flex-1">{p.name}</span>
                  <span className="text-[10px] opacity-60">{p.code}</span>
                </Command.Item>
              ))}
              {results.customers.map(c => (
                <Command.Item
                  key={`c-${c.id}`}
                  value={`عميل ${c.name} ${c.code}`}
                  onSelect={() => go("/commercial")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Users className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-[10px] opacity-60">{c.code}</span>
                </Command.Item>
              ))}
              {results.suppliers.map(s => (
                <Command.Item
                  key={`s-${s.id}`}
                  value={`مورد ${s.name} ${s.code}`}
                  onSelect={() => go("/commercial")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Building2 className="w-4 h-4 text-ink shrink-0" />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-[10px] opacity-60">{s.code}</span>
                </Command.Item>
              ))}
              {results.accounts.map(a => (
                <Command.Item
                  key={`a-${a.id}`}
                  value={`حساب ${a.name} ${a.code}`}
                  onSelect={() => go("/accounting")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <BookText className="w-4 h-4 text-sky-300 shrink-0" />
                  <span className="flex-1">{a.name}</span>
                  <span className="text-[10px] opacity-60">{a.code}</span>
                </Command.Item>
              ))}
              {results.transactions.map(tx => (
                <Command.Item
                  key={`t-${tx.id}`}
                  value={`قيد ${tx.name} ${tx.code}`}
                  onSelect={() => go("/accounting")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <ReceiptText className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="flex-1">{tx.name}</span>
                  <span className="text-[10px] opacity-60">{tx.code}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/*
            نوايا العمل — أولوية قصوى: الأوامر المفلترة بالدور.
            تظهر دائماً (لا شرط بحث) لأن المستخدم قد يحتاجها بلا كتابة.
          */}
          {permissionsReady &&
            intentGroups.map(group => (
              <Command.Group
                key={group.intent}
                heading={`نوايا ${group.label}`}
                className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
              >
                {group.commands.map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.hint} ${(cmd.keywords ?? []).join(" ")} ${cmd.path}`}
                    onSelect={() => go(cmd.path)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <cmd.icon className="w-4 h-4 text-brand-300 shrink-0" />
                    <span className="flex-1">{cmd.label}</span>
                    <span className="text-[10px] opacity-60">{cmd.hint}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

          <Command.Group
            heading="التنقل السريع"
            className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
          >
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.path}
                  value={`${item.label} ${item.path}`}
                  onSelect={() => go(item.path)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Icon className="w-4 h-4 text-brand shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>

          <Command.Group
            heading="الوحدات التشغيلية"
            className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
          >
            {MODULE_LIST.map(m => {
              const Icon = m.icon;
              return (
                <Command.Item
                  key={m.key}
                  value={`وحدة ${m.label} ${m.en}`}
                  onSelect={() => go("/app")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: m.accent }}
                  />
                  <span className="flex-1">{m.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {m.tagline}
                  </span>
                </Command.Item>
              );
            })}
          </Command.Group>

          {/* SMART SUGGESTIONS — intent-driven quick actions from the search engine */}
          {results.suggestions.length > 0 && (
            <Command.Group
              heading="إجراءات ذكية مقترحة"
              className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              {results.suggestions.map(s => (
                <Command.Item
                  key={s.label}
                  value={`اقتراح ${s.label}`}
                  onSelect={() => go(s.hint)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Sparkles className="w-4 h-4 text-brand-300 shrink-0" />
                  <span className="flex-1">{s.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* QUICK ACTIONS SECTION */}
          {QUICK_ACTIONS.length > 0 && (
            <Command.Group
              heading="الإجراءات السريعة"
              className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              {QUICK_ACTIONS.map(f => (
                <Command.Item
                  key={f.label}
                  value={f.label}
                  onSelect={() => handleQuickAction(f)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <f.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{f.label}</span>
                  <span className="text-[10px] opacity-60 capitalize">
                    {f.description || ""}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading="الإجراءات"
            className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider"
          >
            <Command.Item
              value="تواصل واتساب دعم"
              onSelect={() => {
                setOpen(false);
                setQuery("");
                window.open(
                  whatsappLink("السلام عليكم مؤسسة الحسينية، أحتاج دعماً."),
                  "_blank"
                );
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-200 cursor-pointer hover:bg-gray-800 hover:text-white transition-all duration-200 aria-selected:bg-gray-800 aria-selected:text-white"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Phone className="w-4 h-4 text-brand shrink-0" />
              <span className="flex-1">تواصل واتساب مع الدعم</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
