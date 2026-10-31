import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  FileText,
  Users,
  Factory,
  Calculator,
  Landmark,
  Download,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

const fmt = (n: number | undefined | null) =>
  Number(n ?? 0).toLocaleString("ar-YE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d: unknown) => {
  if (!d) return "—";
  const date =
    typeof d === "string" || typeof d === "number" ? new Date(d) : (d as Date);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar-YE");
};

type AnyRow = Record<string, any>;

function Header({ cols }: { cols: string[] }) {
  return (
    <TableHeader>
      <TableRow className="bg-panel/60">
        {cols.map(c => (
          <TableHead key={c} className="text-xs font-bold">
            {c}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

function ReportCard({ title, desc, icon, footer, children }: any) {
  return (
    <Card className="panel-premium">
      <CardHeader className="ribbon-premium">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
        {desc && <CardDescription className="text-xs">{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
      {footer && (
        <div className="datagrid-footer text-xs text-muted-foreground font-medium">
          {footer}
        </div>
      )}
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <AlertTriangle className="w-8 h-8 text-muted-foreground" />
      <p className="text-sm font-bold">{text}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="p-4 space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-premium h-9" />
      ))}
    </div>
  );
}

function FilterDates({ from, to, setFrom, setTo }: any) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="space-y-1">
        <Label className="text-[11px] font-bold">من</Label>
        <Input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="h-9 w-40 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] font-bold">إلى</Label>
        <Input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="h-9 w-40 text-xs"
        />
      </div>
    </div>
  );
}

export default function Statements() {
  const [active, setActive] = useState("gl");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");

  const { data: accounts } = trpc.accounting.getAccounts.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: customersData } = trpc.modules.customers.list.useQuery(
    { limit: 100, offset: 0 },
    { staleTime: 60_000 }
  );
  const { data: suppliersData } = trpc.modules.suppliers.list.useQuery(
    { limit: 100, offset: 0 },
    { staleTime: 60_000 }
  );

  const customerList = customersData?.items ?? [];
  const supplierList = suppliersData?.items ?? [];

  const periodInput: AnyRow = {};
  if (from) periodInput.from = from;
  if (to) periodInput.to = to;
  const periodOrUndef = Object.keys(periodInput).length
    ? periodInput
    : undefined;

  const acctId = accountId ? Number(accountId) : undefined;
  const custId = customerId ? Number(customerId) : undefined;
  const supId = supplierId ? Number(supplierId) : undefined;

  const gl = trpc.accountingReports.generalLedger.useQuery(
    acctId && from && to
      ? { accountId: acctId, fromDate: from, toDate: to, includeOpening: true }
      : {
          accountId: 0,
          fromDate: from || new Date().toISOString().slice(0, 10),
          toDate: to || new Date().toISOString().slice(0, 10),
          includeOpening: true,
        },
    { enabled: !!acctId, staleTime: 30_000 }
  );
  const acctSt = trpc.financialReports.accountStatement.useQuery(
    acctId
      ? { accountId: acctId, ...periodInput }
      : { accountId: 0, from: from || undefined, to: to || undefined },
    { enabled: !!acctId, staleTime: 30_000 }
  );
  const custSt = trpc.financialReports.customerStatement.useQuery(
    custId
      ? { customerId: custId, ...periodInput }
      : { customerId: 0, from: from || undefined, to: to || undefined },
    { enabled: !!custId, staleTime: 30_000 }
  );
  const supSt = trpc.financialReports.supplierStatement.useQuery(
    supId
      ? { supplierId: supId, ...periodInput }
      : { supplierId: 0, from: from || undefined, to: to || undefined },
    { enabled: !!supId, staleTime: 30_000 }
  );
  const cc = trpc.financialReports.costCenterSummary.useQuery(periodOrUndef, {
    staleTime: 30_000,
  });
  const vat = trpc.financialReports.vatSummary.useQuery(periodOrUndef, {
    staleTime: 30_000,
  });
  const variance = trpc.financialReports.budgetVariance.useQuery(
    periodOrUndef,
    {
      staleTime: 30_000,
    }
  );

  const exportActive = () => {
    let cols: string[] | undefined;
    let rows: (string | number)[][] | undefined;
    if (active === "gl" && gl.data?.transactions) {
      cols = ["التاريخ", "البيان", "مدين", "دائن", "الرصيد الجاري"];
      rows = gl.data.transactions.map((r: AnyRow) => [
        fmtDate(r.transactionDate),
        r.narration,
        r.type === "debit" ? (r.amount ?? 0) : 0,
        r.type === "credit" ? (r.amount ?? 0) : 0,
        r.runningBalance ?? 0,
      ]);
    } else if (active === "account" && acctSt.data?.lines) {
      cols = ["التاريخ", "البيان", "مدين", "دائن", "الرصيد"];
      rows = acctSt.data.lines.map((r: AnyRow) => [
        fmtDate(r.date),
        r.narration,
        r.debit ?? 0,
        r.credit ?? 0,
        r.balance ?? 0,
      ]);
    } else if (active === "customer" && custSt.data?.lines) {
      cols = ["التاريخ", "المستند", "الوصف", "مدين", "دائن", "الرصيد"];
      rows = custSt.data.lines.map((r: AnyRow) => [
        fmtDate(r.date),
        r.doc,
        r.description,
        r.debit ?? 0,
        r.credit ?? 0,
        r.balance ?? 0,
      ]);
    } else if (active === "supplier" && supSt.data?.lines) {
      cols = ["التاريخ", "المستند", "الوصف", "مدين", "دائن", "الرصيد"];
      rows = supSt.data.lines.map((r: AnyRow) => [
        fmtDate(r.date),
        r.doc,
        r.description,
        r.debit ?? 0,
        r.credit ?? 0,
        r.balance ?? 0,
      ]);
    } else if (active === "cc" && cc.data?.rows) {
      cols = ["الرمز", "مركز التكلفة", "إيرادات", "مصروفات", "الصافي"];
      rows = cc.data.rows.map((r: AnyRow) => [
        r.code,
        r.name,
        r.revenue ?? 0,
        r.expense ?? 0,
        r.net ?? 0,
      ]);
    } else if (active === "vat" && vat.data) {
      cols = ["النوع", "المعدل", "الأساس", "الضريبة", "عدد الفواتير"];
      rows = [
        ...vat.data.output.map((r: AnyRow) => [
          "مبيعات",
          `${r.rate}%`,
          r.base ?? 0,
          r.tax ?? 0,
          r.count ?? 0,
        ]),
        ...vat.data.input.map((r: AnyRow) => [
          "مشتريات",
          `${r.rate}%`,
          r.base ?? 0,
          r.tax ?? 0,
          r.count ?? 0,
        ]),
      ];
    } else if (active === "variance" && variance.data?.rows) {
      cols = [
        "الفترة",
        "مستهدف إيراد",
        "فعلي إيراد",
        "الانحراف",
        "مستهدف مصاريف",
        "فعلي مصاريف",
        "الانحراف",
      ];
      rows = variance.data.rows.map((r: AnyRow) => [
        r.periodName,
        r.targetRevenue ?? 0,
        r.actualRevenue ?? 0,
        r.revenueVariance ?? 0,
        r.targetExpense ?? 0,
        r.actualExpense ?? 0,
        r.expenseVariance ?? 0,
      ]);
    } else {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    if (!cols || !rows) return;
    const n = downloadCsv(
      `${active}_${new Date().toISOString().slice(0, 10)}.csv`,
      cols,
      rows
    );
    toast.success(`تم تصدير ${n} صف`);
  };

  const rateBadge = (r: AnyRow) => (
    <span className="chip text-[10px] bg-brand/10 text-brand border border-brand/20">
      {r.rate}%
    </span>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="ribbon-premium">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip bg-brand/15 text-brand border border-brand/20">
                  كشوف · دفاتر · ضرائب
                </span>
              </div>
              <h1 className="text-xl font-black font-display text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand" />
                الدفاتر والكشوف المحاسبية
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                كشف حساب أي حساب أو عميل أو مورد، دفتر الأستاذ العام، ملخص مراكز
                التكلفة، تسوية ضريبة القيمة المضافة، ومقارنة الموازنة بالفعلي —
                مدارة بالكامل من الخادم.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <FilterDates
                from={from}
                to={to}
                setFrom={setFrom}
                setTo={setTo}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs press-effect"
                onClick={exportActive}
              >
                <Download className="w-3.5 h-3.5 ml-1" /> CSV
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={active} onValueChange={setActive} className="space-y-4">
          <TabsList className="tabs-primary w-full">
            <TabsTrigger value="gl" className="tab-trigger">
              <BookOpen className="w-3.5 h-3.5" /> الأستاذ العام
            </TabsTrigger>
            <TabsTrigger value="account" className="tab-trigger">
              <FileText className="w-3.5 h-3.5" /> كشف حساب
            </TabsTrigger>
            <TabsTrigger value="customer" className="tab-trigger">
              <Users className="w-3.5 h-3.5" /> كشف عميل
            </TabsTrigger>
            <TabsTrigger value="supplier" className="tab-trigger">
              <Factory className="w-3.5 h-3.5" /> كشف مورد
            </TabsTrigger>
            <TabsTrigger value="cc" className="tab-trigger">
              <Calculator className="w-3.5 h-3.5" /> مراكز التكلفة
            </TabsTrigger>
            <TabsTrigger value="vat" className="tab-trigger">
              <Landmark className="w-3.5 h-3.5" /> ضريبة القيمة المضافة
            </TabsTrigger>
            <TabsTrigger value="variance" className="tab-trigger">
              <Scale className="w-3.5 h-3.5" /> الموازنة مقابل الفعلي
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gl" className="space-y-3">
            <Card className="panel-premium p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1 min-w-52">
                  <Label className="text-[11px] font-bold">الحساب</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر حساباً" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accounts ?? []).map((a: AnyRow) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
            {!acctId ? (
              <EmptyState text="اختر حساباً لعرض دفتر الأستاذ العام" />
            ) : gl.isLoading ? (
              <LoadingRows />
            ) : gl.data &&
              gl.data.transactions &&
              gl.data.transactions.length > 0 ? (
              <ReportCard
                title={`دفتر الأستاذ — ${gl.data.account?.name ?? ""}`}
                desc={
                  gl.data.account
                    ? `الكود ${gl.data.account.code} · نوع ${gl.data.account.type}`
                    : ""
                }
                footer={`الرصيد الافتتاحي ${fmt(gl.data.openingBalance?.amount)} · الرصيد الختامي ${fmt(gl.data.closingBalance?.amount)} ${gl.data.closingBalance?.type === "credit" ? "دائن" : "مدين"}`}
              >
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header
                      cols={[
                        "التاريخ",
                        "البيان",
                        "مدين",
                        "دائن",
                        "الرصيد الجاري",
                      ]}
                    />
                    <TableBody>
                      {gl.data.transactions.map((r: AnyRow) => (
                        <TableRow
                          key={r.id}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {fmtDate(r.transactionDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.narration || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-success">
                            {r.type === "debit" ? fmt(r.amount) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-danger">
                            {r.type === "credit" ? fmt(r.amount) : "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.runningBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ReportCard>
            ) : (
              <EmptyState text="لا توجد حركات لمرحّلة لهذا الحساب في هذه الفترة" />
            )}
          </TabsContent>

          <TabsContent value="account" className="space-y-3">
            <Card className="panel-premium p-3">
              <div className="space-y-1 min-w-52">
                <Label className="text-[11px] font-bold">الحساب</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر حساباً" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts ?? []).map((a: AnyRow) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
            {!acctId ? (
              <EmptyState text="اختر حساباً لعرض كشف الحساب" />
            ) : acctSt.isLoading ? (
              <LoadingRows />
            ) : acctSt.data &&
              acctSt.data.lines &&
              acctSt.data.lines.length > 0 ? (
              <ReportCard
                title={`كشف حساب — ${acctSt.data.account?.name ?? ""}`}
                desc={`الكود ${acctSt.data.account?.code ?? "—"}`}
                footer={`الرصيد الافتتاحي ${fmt(acctSt.data.opening)} · الرصيد الختامي ${fmt(acctSt.data.closing)}`}
              >
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header
                      cols={["التاريخ", "البيان", "مدين", "دائن", "الرصيد"]}
                    />
                    <TableBody>
                      {acctSt.data.lines.map((r: AnyRow) => (
                        <TableRow
                          key={r.id}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {fmtDate(r.date)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.narration || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-success">
                            {r.debit ? fmt(r.debit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-danger">
                            {r.credit ? fmt(r.credit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ReportCard>
            ) : (
              <EmptyState text="لا توجد حركات منشورة لهذا الحساب في هذه الفترة" />
            )}
          </TabsContent>

          <TabsContent value="customer" className="space-y-3">
            <Card className="panel-premium p-3">
              <div className="space-y-1 min-w-52">
                <Label className="text-[11px] font-bold">العميل</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر عميلاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerList.map((c: AnyRow) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
            {!custId ? (
              <EmptyState text="اختر عميلاً لعرض كشف الحساب" />
            ) : custSt.isLoading ? (
              <LoadingRows />
            ) : custSt.data &&
              custSt.data.lines &&
              custSt.data.lines.length > 0 ? (
              <ReportCard
                title={`كشف حساب عميل — ${custSt.data.customer?.name ?? ""}`}
                footer={`إجمالي المدين ${fmt(custSt.data.totals?.debit)} · إجمالي الدائن ${fmt(custSt.data.totals?.credit)} · الرصيد ${fmt(custSt.data.totals?.balance)}`}
              >
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header
                      cols={[
                        "التاريخ",
                        "المستند",
                        "الوصف",
                        "مدين",
                        "دائن",
                        "الرصيد",
                      ]}
                    />
                    <TableBody>
                      {custSt.data.lines.map((r: AnyRow, i: number) => (
                        <TableRow
                          key={i}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {fmtDate(r.date)}
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {r.doc}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.description}
                          </TableCell>
                          <TableCell className="font-mono text-success">
                            {r.debit ? fmt(r.debit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-danger">
                            {r.credit ? fmt(r.credit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ReportCard>
            ) : (
              <EmptyState text="لا توجد فواتير أو دفعات لهذا العميل في هذه الفترة" />
            )}
          </TabsContent>

          <TabsContent value="supplier" className="space-y-3">
            <Card className="panel-premium p-3">
              <div className="space-y-1 min-w-52">
                <Label className="text-[11px] font-bold">المورد</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر مورداً" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierList.map((s: AnyRow) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
            {!supId ? (
              <EmptyState text="اختر مورداً لعرض كشف الحساب" />
            ) : supSt.isLoading ? (
              <LoadingRows />
            ) : supSt.data &&
              supSt.data.lines &&
              supSt.data.lines.length > 0 ? (
              <ReportCard
                title={`كشف حساب مورد — ${supSt.data.supplier?.name ?? ""}`}
                footer={`إجمالي المدين ${fmt(supSt.data.totals?.debit)} · إجمالي الدائن ${fmt(supSt.data.totals?.credit)} · الرصيد ${fmt(supSt.data.totals?.balance)}`}
              >
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header
                      cols={[
                        "التاريخ",
                        "المستند",
                        "الوصف",
                        "مدين",
                        "دائن",
                        "الرصيد",
                      ]}
                    />
                    <TableBody>
                      {supSt.data.lines.map((r: AnyRow, i: number) => (
                        <TableRow
                          key={i}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {fmtDate(r.date)}
                          </TableCell>
                          <TableCell className="font-mono text-[11px]">
                            {r.doc}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.description}
                          </TableCell>
                          <TableCell className="font-mono text-success">
                            {r.debit ? fmt(r.debit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-danger">
                            {r.credit ? fmt(r.credit) : "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ReportCard>
            ) : (
              <EmptyState text="لا توجد فواتير أو دفعات لهذا المورد في هذه الفترة" />
            )}
          </TabsContent>

          <TabsContent value="cc" className="space-y-3">
            {cc.isLoading ? (
              <LoadingRows />
            ) : cc.data?.rows?.length ? (
              <ReportCard
                title="ملخص مراكز التكلفة"
                desc="تحليل إيرادات ومصاريف الأبعاد التحليلية (فقط حسابات الإيرادات والمصروفات)"
                footer={`حركات بدون مركز تكلفة: ${cc.data.unassigned ?? 0}`}
              >
                <div className="datagrid overflow-x-auto">
                  <Table>
                    <Header
                      cols={[
                        "الرمز",
                        "مركز التكلفة",
                        "إيرادات",
                        "مصروفات",
                        "الصافي",
                        "عدد الحركات",
                      ]}
                    />
                    <TableBody>
                      {cc.data.rows.map((r: AnyRow) => (
                        <TableRow
                          key={r.costCenterId ?? "u"}
                          className="border-line hover:bg-muted/30"
                        >
                          <TableCell className="font-mono text-[11px]">
                            {r.code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {r.name}
                          </TableCell>
                          <TableCell className="font-mono text-success">
                            {fmt(r.revenue)}
                          </TableCell>
                          <TableCell className="font-mono text-danger">
                            {fmt(r.expense)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {fmt(r.net)}
                          </TableCell>
                          <TableCell>
                            <Badge className="text-[10px]">{r.count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ReportCard>
            ) : (
              <EmptyState text="لا توجد بيانات مراكز تكلفة في هذه الفترة" />
            )}
          </TabsContent>

          <TabsContent value="vat" className="space-y-3">
            {vat.isLoading ? (
              <LoadingRows />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <Card className="stat-card">
                    <p className="text-xs text-muted-foreground">
                      ضريبة مخرجات (مبيعات)
                    </p>
                    <p className="text-lg font-black mt-1 font-mono text-brand">
                      {fmt(vat.data?.totals.outputTax)}
                    </p>
                  </Card>
                  <Card className="stat-card">
                    <p className="text-xs text-muted-foreground">
                      ضريبة مدخلات (مشتريات)
                    </p>
                    <p className="text-lg font-black mt-1 font-mono text-success">
                      {fmt(vat.data?.totals.inputTax)}
                    </p>
                  </Card>
                  <Card className="stat-card border-brand/30 bg-brand/5">
                    <p className="text-xs text-muted-foreground">
                      الصافي المستحق للهيئة
                    </p>
                    <p
                      className={`text-lg font-black mt-1 font-mono ${
                        Number(vat.data?.totals.netPayable) >= 0
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      {fmt(vat.data?.totals.netPayable)}
                    </p>
                  </Card>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <ReportCard
                    title="المبيعات — ضريبة مخرجات (Output Tax)"
                    desc="فواتير المبيعات المؤكدة/المدفوعة/الجزئية"
                  >
                    <div className="datagrid">
                      <Table>
                        <Header
                          cols={["المعدل", "الأساس الخاضع", "الضريبة", "عدد"]}
                        />
                        <TableBody>
                          {vat.data?.output.map((r: AnyRow) => (
                            <TableRow
                              key={`o-${r.rate}`}
                              className="border-line hover:bg-muted/30"
                            >
                              <TableCell>{rateBadge(r)}</TableCell>
                              <TableCell className="font-mono">
                                {fmt(r.base)}
                              </TableCell>
                              <TableCell className="font-mono text-brand">
                                {fmt(r.tax)}
                              </TableCell>
                              <TableCell>
                                <Badge className="text-[10px]">{r.count}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ReportCard>
                  <ReportCard
                    title="المشتريات — ضريبة مدخلات (Input Tax)"
                    desc="فواتير الشراء المؤكدة/المدفوعة/الجزئية"
                  >
                    <div className="datagrid">
                      <Table>
                        <Header
                          cols={["المعدل", "الأساس الخاضع", "الضريبة", "عدد"]}
                        />
                        <TableBody>
                          {vat.data?.input.map((r: AnyRow) => (
                            <TableRow
                              key={`i-${r.rate}`}
                              className="border-line hover:bg-muted/30"
                            >
                              <TableCell>{rateBadge(r)}</TableCell>
                              <TableCell className="font-mono">
                                {fmt(r.base)}
                              </TableCell>
                              <TableCell className="font-mono text-success">
                                {fmt(r.tax)}
                              </TableCell>
                              <TableCell>
                                <Badge className="text-[10px]">{r.count}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ReportCard>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="variance" className="space-y-3">
            {variance.isLoading ? (
              <LoadingRows />
            ) : variance.data?.rows?.length ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <Card className="stat-card">
                    <p className="text-xs text-muted-foreground">
                      الإيراد الفعلي
                    </p>
                    <p className="text-lg font-black mt-1 font-mono text-success">
                      {fmt(variance.data.summary?.revenue)}
                    </p>
                  </Card>
                  <Card className="stat-card">
                    <p className="text-xs text-muted-foreground">
                      المصروفات الفعلية
                    </p>
                    <p className="text-lg font-black mt-1 font-mono text-danger">
                      {fmt(variance.data.summary?.expense)}
                    </p>
                  </Card>
                  <Card className="stat-card">
                    <p className="text-xs text-muted-foreground">عدد الحركات</p>
                    <p className="text-lg font-black mt-1 font-mono">
                      {variance.data.summary?.count ?? "—"}
                    </p>
                  </Card>
                </div>
                <ReportCard
                  title="الموازنة مقابل الفعلي (Variance)"
                  desc="انحراف مناسب = إيراد أعلى من المستهدف أو مصروف أقل"
                >
                  <div className="datagrid overflow-x-auto">
                    <Table>
                      <Header
                        cols={[
                          "الفترة",
                          "مستهدف إيراد",
                          "فعلي إيراد",
                          "الانحراف",
                          "مستهدف مصاريف",
                          "فعلي مصاريف",
                          "الانحراف",
                          "الحالة",
                        ]}
                      />
                      <TableBody>
                        {variance.data.rows.map((r: AnyRow) => (
                          <TableRow
                            key={r.id}
                            className="border-line hover:bg-muted/30"
                          >
                            <TableCell className="font-medium">
                              {r.periodName}
                            </TableCell>
                            <TableCell className="font-mono">
                              {fmt(r.targetRevenue)}
                            </TableCell>
                            <TableCell className="font-mono text-success">
                              {fmt(r.actualRevenue)}
                            </TableCell>
                            <TableCell
                              className={`font-mono ${
                                Number(r.revenueVariance) >= 0
                                  ? "text-success"
                                  : "text-danger"
                              }`}
                            >
                              {fmt(r.revenueVariance)}{" "}
                              <span className="text-[10px]">
                                ({Number(r.revenueVariancePct).toFixed(1)}%)
                              </span>
                            </TableCell>
                            <TableCell className="font-mono">
                              {fmt(r.targetExpense)}
                            </TableCell>
                            <TableCell className="font-mono text-danger">
                              {fmt(r.actualExpense)}
                            </TableCell>
                            <TableCell
                              className={`font-mono ${
                                Number(r.expenseVariance) <= 0
                                  ? "text-success"
                                  : "text-danger"
                              }`}
                            >
                              {fmt(r.expenseVariance)}{" "}
                              <span className="text-[10px]">
                                ({Number(r.expenseVariancePct).toFixed(1)}%)
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`chip text-[10px] ${
                                  r.status === "over_budget"
                                    ? "bg-danger/10 text-danger"
                                    : r.status === "revenue_shortfall"
                                      ? "bg-warning/10 text-warning"
                                      : "bg-success/10 text-success"
                                }`}
                              >
                                {r.status === "over_budget"
                                  ? "تجاوز"
                                  : r.status === "revenue_shortfall"
                                    ? "عجز إيراد"
                                    : "ضمن الموازنة"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ReportCard>
              </>
            ) : (
              <EmptyState text="لا توجد موازنات مضبوطة — أنشئ موازنة من صفحة المحاسبة ثم عاود" />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
