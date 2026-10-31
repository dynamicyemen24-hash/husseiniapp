import { useLocation } from "wouter";
import { StatCard } from "@/components/ui/stat-card";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Boxes,
  ClipboardList,
  CalendarClock,
  AlarmClock,
  Trophy,
  Megaphone,
  ArrowLeft,
  Truck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/**
 * Operations — Unified Operations Dashboard (لوحة العمليات الموحّدة).
 *
 * Aggregates existing module signals into one command-center screen.
 * All KPI counts come from a single tenant-scoped server aggregate
 * (`modules.operations.summary`); each card links into its source module.
 */
export default function Operations() {
  const [, setLocation] = useLocation();
  const { data, isPending } = trpc.modules.operations.summary.useQuery();
  const deliveryQ = trpc.erp.deliveryReport.useQuery();

  const metrics = [
    {
      label: "تنبيهات غير مقروءة",
      value: data?.unread ?? 0,
      tone: "warning" as const,
      icon: Bell,
      hint: "تحتاج متابعة",
      route: "/app",
    },
    {
      label: "منتجات تحت نقطة إعادة الطلب",
      value: data?.lowStock ?? 0,
      tone: "negative" as const,
      icon: Boxes,
      hint: "يجب طلبها",
      route: "/inventory",
    },
    {
      label: "طلبات بانتظار الموافقة",
      value: data?.pendingRequisitions ?? 0,
      tone: "info" as const,
      icon: ClipboardList,
      hint: "خطوات اعتماد",
      route: "/requisitions",
    },
    {
      label: "قيود مجدولة مستحقة قريباً",
      value: data?.dueScheduled ?? 0,
      tone: "info" as const,
      icon: CalendarClock,
      hint: "خلال 7 أيام",
      route: "/journal",
    },
    {
      label: "مستحقات متأخرة",
      value: data?.overdue ?? 0,
      tone: "negative" as const,
      icon: AlarmClock,
      hint: "ذمم مدينة متأخرة",
      route: "/commercial",
    },
    {
      label: "عروض نشطة",
      value: data?.activeOffers ?? 0,
      tone: "positive" as const,
      icon: Megaphone,
      hint: "عروض سارية",
      route: "/commercial",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex" dir="rtl">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black font-display text-ink">
            لوحة العمليات الموحّدة
          </h1>
          <p className="text-xs text-muted mt-1">
            مركز قيادة تشغيلي يجمع مؤشرات الوحدات في شاشة واحدة — كل بطاقة تفتح
            وحدتها.
          </p>
        </div>

        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${
            isPending ? "opacity-60 animate-pulse" : ""
          }`}
        >
          {metrics.map(m => (
            <button
              key={m.label}
              onClick={() => setLocation(m.route)}
              className="text-right focus:outline-none"
            >
              <StatCard
                label={m.label}
                value={m.value}
                tone={m.tone}
                icon={m.icon}
                hint={m.hint}
              />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl border border-line bg-surface/80 p-5">
            <h2 className="font-bold text-ink mb-3">
              إجراءات سريعة حسب الوحدة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {metrics.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.label}
                    onClick={() => setLocation(m.route)}
                    className="group flex items-center justify-between rounded-xl border border-line bg-background/60 p-3 text-right transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-14px_rgba(15,42,43,0.30)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/15 text-brand shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink truncate">
                          {m.label}
                        </div>
                        <div className="text-[11px] text-muted">
                          {m.value} عنصر
                        </div>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted group-hover:text-brand transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface/80 p-5">
            <h2 className="font-bold text-ink mb-3">أعلى مندوب عمولة</h2>
            {data?.topRep ? (
              <div className="space-y-2">
                <div className="text-lg font-black text-brand">
                  {data.topRep.name}
                </div>
                <div className="text-sm text-muted">
                  العمولة:{" "}
                  <span className="font-bold text-ink">
                    {data.topRep.commission.toLocaleString("ar-YE")}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  مبيعات:{" "}
                  <span className="font-bold text-ink">
                    {data.topRep.salesTotal.toLocaleString("ar-YE")}
                  </span>
                </div>
                <button
                  onClick={() => setLocation("/basic-data")}
                  className="mt-2 w-full rounded-lg bg-brand/15 text-brand text-xs font-bold py-2 hover:bg-brand/25 transition-colors"
                >
                  عرض البيانات الأساسية
                </button>
              </div>
            ) : (
              <div className="text-sm text-muted">لا توجد مبيعات بعد.</div>
            )}
          </div>
        </div>

        {/* ── تقرير التوزيع والتسليم ── */}
        <div className="rounded-2xl border border-line bg-surface/80 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold text-ink">
              <Truck className="h-5 w-5 text-brand" />
              تقرير التوزيع والتسليم
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                (deliveryQ.data?.fulfillmentRate ?? 0) >= 90
                  ? "bg-emerald-500/15 text-emerald-600"
                  : (deliveryQ.data?.fulfillmentRate ?? 0) >= 70
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-rose-500/15 text-rose-600"
              }`}
            >
              معدل الإنجاز: {deliveryQ.data?.fulfillmentRate ?? 0}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="تسليمات هذا الأسبوع"
              value={deliveryQ.data?.upcoming.length ?? 0}
              tone="info"
              icon={CalendarClock}
              hint="قادمة خلال 7 أيام"
            />
            <StatCard
              label="تسليمات متأخرة"
              value={deliveryQ.data?.overdue.length ?? 0}
              tone={
                (deliveryQ.data?.overdue.length ?? 0) > 0
                  ? "negative"
                  : "positive"
              }
              icon={AlarmClock}
              hint="تجاوزت تاريخ التسليم"
            />
            <StatCard
              label="طلبات مُسلَّمة"
              value={deliveryQ.data?.deliveredCount ?? 0}
              tone="positive"
              icon={CheckCircle2}
            />
            <StatCard
              label="طلبات ملغاة"
              value={deliveryQ.data?.cancelledCount ?? 0}
              tone="negative"
              icon={AlertCircle}
            />
          </div>

          {(deliveryQ.data?.overdue ?? []).length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-panel/60 text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 text-right">الطلب</th>
                    <th className="px-3 py-2 text-right">العميل</th>
                    <th className="px-3 py-2 text-center">الحالة</th>
                    <th className="px-3 py-2 text-left">الإجمالي</th>
                    <th className="px-3 py-2 text-right">تاريخ التسليم</th>
                  </tr>
                </thead>
                <tbody>
                  {(deliveryQ.data?.overdue ?? []).slice(0, 8).map(o => (
                    <tr key={o.id} className="border-t border-line/60">
                      <td className="px-3 py-2 font-mono font-bold">
                        {o.orderNumber}
                      </td>
                      <td className="px-3 py-2">{o.customerName ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{o.status}</td>
                      <td className="px-3 py-2 text-left font-mono">
                        {Number(o.total).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-rose-600">
                        {o.deliveryDate
                          ? new Date(o.deliveryDate).toLocaleDateString("ar")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
