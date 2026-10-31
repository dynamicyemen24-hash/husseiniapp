import { useLocation } from "wouter";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  FileCheck2,
  FileText,
  ListChecks,
  PackageCheck,
  Settings2,
  ShieldCheck,
  Truck,
  Users2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const sections = [
  {
    title: "البيانات الأساسية",
    description: "الموردون، الأصناف، الوحدات، العملات، مراكز التكلفة والفروع.",
    icon: BookOpenCheck,
    href: "/basic-data",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    title: "الإعدادات والسياسات",
    description:
      "حدود الاعتماد، فصل الصلاحيات، شروط الدفع، الضرائب، وسياسة التوريد.",
    icon: Settings2,
    href: "/settings",
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "طلبات الشراء",
    description:
      "إنشاء الطلب، تحديد المعتمدين، التتبع، الاعتماد والرفض مع سجل تدقيق.",
    icon: ListChecks,
    href: "/requisitions",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "أوامر الشراء",
    description:
      "إنشاء الأوامر واعتمادها وإصدارها، متابعة الكميات والاستلام والإغلاق.",
    icon: FileText,
    href: "/purchase-orders",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    title: "التوريد والاستلام",
    description:
      "سندات الاستلام (GRN)، ترحيل المخزون والقيد المحاسبي، والربط بأوامر الشراء.",
    icon: PackageCheck,
    href: "/goods-receipts",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "الموردون والفواتير",
    description:
      "ملفات الموردين، فواتير الشراء، المدفوعات، الأرصدة والالتزامات.",
    icon: Truck,
    href: "/procurement",
    tone: "bg-orange-50 text-orange-700",
  },
  {
    title: "المستندات والرقابة",
    description: "المرفقات، الموافقات، سجل النشاط، المراجعة والامتثال.",
    icon: ShieldCheck,
    href: "/audit",
    tone: "bg-rose-50 text-rose-700",
  },
];

export default function ProcurementWorkspace() {
  const [, setLocation] = useLocation();
  const { data: requisitions = [] } = trpc.erp.listProcurements.useQuery(
    undefined,
    { staleTime: 30_000 }
  );
  const { data: kpis } = trpc.erp.getProcurementKpis.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { data: suppliers } = trpc.suppliers.list.useQuery(
    { limit: 1 },
    { staleTime: 30_000 }
  );
  const money = (value: unknown) =>
    Number(value ?? 0).toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-ink text-white">
        <div className="mx-auto max-w-7xl px-5 py-7">
          <Button
            variant="ghost"
            className="mb-4 h-9 px-0 text-xs text-slate-300 hover:bg-transparent hover:text-white"
            onClick={() => setLocation("/app")}
          >
            <ArrowLeft className="ml-2 h-4 w-4" /> العودة إلى لوحة العمل
          </Button>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-amber-300">
                <Truck className="h-4 w-4" /> Procurement Control Tower
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Workspace المشتريات
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                مركز تشغيل موحد لدورة الشراء من الاحتياج وحتى الاستلام والسداد
                والتحليل، مع إبقاء كل وظيفة داخل مسارها المحكوم.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setLocation("/requisitions")}
                className="bg-amber-400 text-slate-950 hover:bg-amber-300"
              >
                <ListChecks className="ml-2 h-4 w-4" /> طلب شراء جديد
              </Button>
              <Button
                onClick={() => setLocation("/procurement")}
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <FileText className="ml-2 h-4 w-4" /> الفواتير والموردون
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-5 py-7">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["إجمالي الطلبات", kpis?.total ?? requisitions.length, ""],
            ["بانتظار الاعتماد", kpis?.pending ?? 0, "text-amber-700"],
            ["معتمدة", kpis?.approved ?? 0, "text-sky-700"],
            ["مستلمة", kpis?.received ?? 0, "text-emerald-700"],
            [
              "القيمة المفتوحة",
              `${money(kpis?.openValue)} YER`,
              "text-violet-700",
            ],
          ].map(([label, value, tone]) => (
            <Card key={String(label)} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold text-slate-500">{label}</p>
                <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-amber-600" /> لوحة الرقابة
                اليومية
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">
                  القيمة التقديرية للدورة
                </p>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {money(kpis?.estimatedValue)}{" "}
                  <span className="text-xs font-bold">YER</span>
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-100">
                <p className="text-xs text-slate-500">الموردون المسجلون</p>
                <p className="mt-1 text-2xl font-black text-slate-800">
                  {suppliers?.total ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 sm:col-span-2">
                <p className="text-xs font-bold text-amber-800">
                  إجراء رقابي مقترح
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  راجع الطلبات العالقة في الاعتماد قبل إصدار أي التزام، ثم اربط
                  المستند المؤيد بكل عملية استلام وفاتورة.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="h-5 w-5 text-emerald-600" /> بوابة
                التقارير والتحليل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setLocation("/reports")}
              >
                التقارير المالية والمستندات <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setLocation("/analytics")}
              >
                التحليلات وذكاء الأعمال <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setLocation("/audit")}
              >
                سجل التدقيق والرقابة <ArrowLeft className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">مسارات Workspace</h2>
              <p className="text-xs text-slate-500">
                افتح المجال التشغيلي المطلوب دون مغادرة منظومة المشتريات.
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Users2 className="h-3.5 w-3.5" /> صلاحيات حسب الدور
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map(({ title, description, icon: Icon, href, tone }) => (
              <button
                key={title}
                onClick={() => setLocation(href)}
                className="group rounded-2xl bg-white p-5 text-right shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-black text-slate-800">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {description}
                </p>
                <span className="mt-4 inline-flex items-center text-xs font-bold text-slate-700 group-hover:text-amber-700">
                  فتح المسار <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
