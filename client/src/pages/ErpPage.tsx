import { useEffect } from "react";
import { useLocation } from "wouter";
import { StatCard } from "@/components/ui/stat-card";
import { trpc } from "@/lib/trpc";
import { Users, FolderKanban, Truck, Headset, ShieldCheck } from "lucide-react";

/**
 * ErpPage — lightweight module hub.
 *
 * Previously a 2,300-line monolith that re-implemented HR / Projects /
 * Procurement / Support / Quality inline. Those are now first-class pages
 * (./HR, ./Projects, ./Procurement, ./SupportQuality). This hub simply
 * redirects a deep-linked `?module=` to the dedicated page and otherwise
 * presents a directory, so there is a single source of truth per module.
 */

const MODULE_ROUTES: Record<string, string> = {
  hr: "/hr",
  employees: "/hr",
  payroll: "/hr",
  projects: "/projects",
  procurement: "/procurement",
  purchases: "/procurement",
  support: "/support",
  tickets: "/support",
  quality: "/support",
  inspections: "/support",
  accounting: "/accounting",
  commercial: "/commercial",
  inventory: "/inventory",
  reports: "/reports",
  store: "/store",
};

const DIRECTORY: {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  route: string;
}[] = [
  {
    key: "hr",
    label: "الموارد البشرية",
    desc: "الموظفون والحضور والغياب",
    icon: Users,
    route: "/hr",
  },
  {
    key: "projects",
    label: "المشاريع",
    desc: "المشاريع والمهام",
    icon: FolderKanban,
    route: "/projects",
  },
  {
    key: "procurement",
    label: "المشتريات",
    desc: "الموردون وفواتير الشراء",
    icon: Truck,
    route: "/procurement",
  },
  {
    key: "support",
    label: "الدعم والجودة",
    desc: "التذاكر وعمليات التفتيش",
    icon: Headset,
    route: "/support",
  },
  {
    key: "quality",
    label: "الجودة",
    desc: "فحوص الجودة",
    icon: ShieldCheck,
    route: "/support",
  },
];

export default function ErpPage() {
  const [loc, setLocation] = useLocation();
  const params = new URLSearchParams(loc.split("?")[1] || "");
  const requested = params.get("module");

  const dash = trpc.erp.getDashboard.useQuery();

  useEffect(() => {
    if (requested && MODULE_ROUTES[requested]) {
      setLocation(MODULE_ROUTES[requested]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  return (
    <div className="min-h-screen bg-background text-foreground flex" dir="rtl">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black font-display text-ink">
            الوحدات التشغيلية
          </h1>
          <p className="text-xs text-muted mt-1">
            اختر وحدة لتفتح واجهتها الكاملة — كل وحدة صفحة مستقلة متكاملة.
          </p>
        </div>

        {dash.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              label="الموظفون"
              value={dash.data.employees}
              tone="info"
              icon={Users}
            />
            <StatCard
              label="مشاريع نشطة"
              value={dash.data.activeProjects}
              tone="positive"
              icon={FolderKanban}
            />
            <StatCard
              label="تذاكر مفتوحة"
              value={dash.data.openTickets}
              tone="warning"
              icon={Headset}
            />
            <StatCard
              label="طلبات معلّقة"
              value={dash.data.pendingRequisitions}
              tone="info"
              icon={Truck}
            />
            <StatCard
              label="فحوص جودة"
              value={dash.data.inspections}
              tone="positive"
              icon={ShieldCheck}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIRECTORY.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => setLocation(m.route)}
                className="group rounded-2xl border border-line bg-surface/80 p-5 text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_36px_-14px_rgba(15,42,43,0.30)]"
              >
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-bold text-ink">{m.label}</div>
                <div className="text-xs text-muted mt-0.5">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
