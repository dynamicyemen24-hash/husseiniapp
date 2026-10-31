/**
 * Vouchers Page - Standard International Voucher Management
 *
 * Implements:
 * - Payment Vouchers (سندات الصرف)
 * - Receipt Vouchers (سندات القبض)
 * - Journal Vouchers (القيود اليومية)
 * - Adjustment Vouchers (قيود التعديل)
 *
 * Features:
 * - Multi-level approval workflow
 * - Budget validation
 * - Cost center allocation
 * - Multi-currency support
 * - Audit trail
 */

import { useState, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { friendlyError } from "../lib/friendlyErrors";
import { useDebounce } from "../hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/ui/data-grid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRightLeft,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  FileText,
  Send,
  RotateCcw,
  Search,
  Filter,
  ChevronRight,
  Banknote,
  Receipt,
  BookOpen,
  Settings2,
  Copy,
  Printer,
  Download,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { CloneConfirmDialog } from "@/components/CloneConfirmDialog";
import { PrintPreviewDialog } from "@/components/PrintPreviewDialog";
import { QuickActionBar } from "@/components/QuickActionBar";
import { AutoComplete } from "@/components/ui/autocomplete";
import { QUERY_TIERS } from "@/lib/queryTiers";
import { toast } from "sonner";

type VoucherTab = "payment" | "receipt" | "journal" | "adjustment";
type VoucherStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "posted"
  | "cancelled";

interface VoucherLine {
  id?: number;
  accountId: number;
  accountCode: string;
  accountName?: string;
  debitAmount: string;
  creditAmount: string;
  costCenterId?: number;
  description?: string;
}

interface Voucher {
  id: number;
  voucherNumber: string;
  voucherType: string;
  status: VoucherStatus;
  voucherDate: string;
  amount: string;
  counterpartyName?: string;
  description?: string;
  notes?: string;
  approvalLevel?: string;
  createdAt: string;
}

export default function Vouchers() {
  const { can } = usePermissions();
  if (!can("vouchers.view"))
    return <DeniedScreen message="هذه الصفحة متاحة للمحاسبين فقط." />;
  return <VouchersBody />;
}

function VouchersBody() {
  const [activeTab, setActiveTab] = useState<VoucherTab>("payment");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Create form state
  const [createForm, setCreateForm] = useState({
    voucherDate: new Date().toISOString().split("T")[0],
    counterpartyType: "other" as "customer" | "supplier" | "employee" | "other",
    counterpartyName: "",
    counterpartyId: "",
    description: "",
    notes: "",
    bankAccountId: "",
    referenceNo: "",
    departmentId: "",
    projectId: "",
    costCenterId: "",
  });

  const [voucherLines, setVoucherLines] = useState<VoucherLine[]>([
    { accountId: 0, accountCode: "", debitAmount: "", creditAmount: "" },
  ]);

  const [cloneTarget, setCloneTarget] = useState<any>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [printTarget, setPrintTarget] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    desc: string;
    action: () => void;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Voucher | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Queries — no polling: every mutation refetches explicitly below.
  // Reference lists (accounts/customers/suppliers) change rarely, so they
  // stay fresh for 10 minutes instead of refetching on every mount.
  const vouchersQuery = trpc.vouchers.list.useQuery({
    type: activeTab,
    status:
      statusFilter !== "all" ? (statusFilter as VoucherStatus) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  });

  const accountsQuery = trpc.accounting.getAccounts.useQuery(undefined, {
    staleTime: QUERY_TIERS.REFERENCE,
  });
  // Server-driven counterparty search: only the active tab's list loads,
  // 30 rows max per keystroke instead of two unconditional 1000-row pulls.
  const [cpSearch, setCpSearch] = useState("");
  const debouncedCpSearch = useDebounce(cpSearch, 300);
  const customersQuery = trpc.modules.customers.list.useQuery(
    {
      limit: 30,
      offset: 0,
      search: debouncedCpSearch || undefined,
    },
    {
      staleTime: QUERY_TIERS.REFERENCE,
      enabled: createForm.counterpartyType === "customer",
    }
  );
  const suppliersQuery = trpc.modules.suppliers.list.useQuery(
    {
      limit: 30,
      offset: 0,
      search: debouncedCpSearch || undefined,
    },
    {
      staleTime: QUERY_TIERS.REFERENCE,
      enabled: createForm.counterpartyType === "supplier",
    }
  );
  const departmentsQuery = trpc.erp.listDepartments.useQuery();
  const projectsQuery = trpc.erp.listProjects.useQuery();
  const costCentersQuery = trpc.costCenters.list.useQuery();

  // Mutations
  const createVoucher = trpc.vouchers.create.useMutation({
    onSuccess: () => {
      vouchersQuery.refetch();
      setShowCreateDialog(false);
      resetForm();
    },
    onError: error => {
      toast.error(friendlyError(error));
    },
  });

  const submitVoucher = trpc.vouchers.submit.useMutation({
    onSuccess: () => {
      vouchersQuery.refetch();
    },
    onError: error => {
      toast.error(friendlyError(error));
    },
  });

  const approveVoucher = trpc.vouchers.approve.useMutation({
    onSuccess: () => {
      vouchersQuery.refetch();
      setShowViewDialog(false);
    },
    onError: error => {
      toast.error(friendlyError(error));
    },
  });

  const rejectVoucher = trpc.vouchers.reject.useMutation({
    onSuccess: () => {
      vouchersQuery.refetch();
      setShowViewDialog(false);
    },
    onError: error => {
      toast.error(friendlyError(error));
    },
  });

  const postVoucher = trpc.vouchers.post.useMutation({
    onSuccess: () => {
      vouchersQuery.refetch();
      setShowViewDialog(false);
    },
    onError: error => {
      toast.error(friendlyError(error));
    },
  });

  const reverseVoucher = trpc.vouchers.reverse.useMutation({
    onSuccess: () => {
      vouchersQuery.refetch();
      setShowViewDialog(false);
    },
    onError: error => {
      toast.error(friendlyError(error));
    },
  });

  // Computed values
  const totalDebits = useMemo(
    () =>
      voucherLines.reduce(
        (sum, l) => sum + parseFloat(l.debitAmount || "0"),
        0
      ),
    [voucherLines]
  );

  const totalCredits = useMemo(
    () =>
      voucherLines.reduce(
        (sum, l) => sum + parseFloat(l.creditAmount || "0"),
        0
      ),
    [voucherLines]
  );

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const accounts = accountsQuery.data || [];
  const customers = customersQuery.data?.items ?? [];
  const suppliers = suppliersQuery.data?.items ?? [];
  const departments = departmentsQuery.data || [];
  const projects = projectsQuery.data ?? [];
  const costCenters = costCentersQuery.data || [];
  const vouchers = vouchersQuery.data?.items || [];

  function resetForm() {
    setCreateForm({
      voucherDate: new Date().toISOString().split("T")[0],
      counterpartyType: "other",
      counterpartyName: "",
      counterpartyId: "",
      description: "",
      notes: "",
      bankAccountId: "",
      referenceNo: "",
      departmentId: "",
      projectId: "",
      costCenterId: "",
    });
    setVoucherLines([
      { accountId: 0, accountCode: "", debitAmount: "", creditAmount: "" },
    ]);
  }

  function handleCreateVoucher() {
    if (!isBalanced) {
      toast.error("القيود غير متوازنة! مجموع المدين يجب أن يساوي مجموع الدائن");
      return;
    }

    if (voucherLines.length === 0) {
      toast.error("يجب إدخال سطر محاسبي واحد على الأقل");
      return;
    }

    const firstLine = voucherLines[0];
    const amount = firstLine.debitAmount || firstLine.creditAmount;

    createVoucher.mutate({
      voucherType: activeTab,
      voucherDate: createForm.voucherDate,
      amount,
      counterpartyType: createForm.counterpartyType,
      counterpartyName: createForm.counterpartyName || undefined,
      counterpartyId: createForm.counterpartyId
        ? parseInt(createForm.counterpartyId)
        : undefined,
      description: createForm.description || undefined,
      notes: createForm.notes || undefined,
      bankAccountCode: createForm.bankAccountId
        ? accounts.find((a: any) => a.id === parseInt(createForm.bankAccountId))
            ?.code
        : undefined,
      referenceNo: createForm.referenceNo || undefined,
      departmentId: createForm.departmentId
        ? parseInt(createForm.departmentId)
        : undefined,
      projectId: createForm.projectId
        ? parseInt(createForm.projectId)
        : undefined,
      costCenterId: createForm.costCenterId
        ? parseInt(createForm.costCenterId)
        : undefined,
      lines: voucherLines.map(l => ({
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debitAmount: l.debitAmount || "0",
        creditAmount: l.creditAmount || "0",
        description: l.description,
      })),
    });
  }

  function handleSubmit(voucher: Voucher) {
    setConfirmState({
      title: "تقديم القيد للمراجعة",
      desc: `هل تريد تقديم القيد ${voucher.voucherNumber} للمراجعة؟`,
      action: () => submitVoucher.mutate({ id: voucher.id }),
    });
  }

  function handleApprove(voucher: Voucher) {
    approveVoucher.mutate({
      id: voucher.id,
      level: "final",
      comments: "تم الاعتماد",
    });
  }

  function handleReject(voucher: Voucher) {
    setRejectTarget(voucher);
    setRejectReason("");
  }

  function handlePost(voucher: Voucher) {
    setConfirmState({
      title: "ترحيل القيد",
      desc: `هل تريد ترحيل القيد ${voucher.voucherNumber} إلى دفتر الأستاذ؟`,
      action: () => postVoucher.mutate({ id: voucher.id }),
    });
  }

  function handleReverse(voucher: Voucher) {
    setConfirmState({
      title: "قيد معكوس",
      desc: `هل تريد إنشاء قيد معكوس للقيد ${voucher.voucherNumber}؟`,
      action: () =>
        reverseVoucher.mutate({
          id: voucher.id,
          reversalDate: new Date().toISOString().split("T")[0],
        }),
    });
  }

  function handleView(voucher: Voucher) {
    setSelectedVoucher(voucher);
    setShowViewDialog(true);
  }

  const handleCloneVoucher = useCallback((voucher: any) => {
    setCloneTarget(voucher);
    setShowCloneDialog(true);
  }, []);

  const executeClone = useCallback(
    (options: { adjustDate?: boolean; adjustNumber?: boolean }) => {
      if (!cloneTarget) return;
      setCreateForm({
        ...createForm,
        voucherDate: options.adjustDate
          ? new Date().toISOString().split("T")[0]
          : cloneTarget.voucherDate,
        referenceNo: options.adjustNumber ? "" : cloneTarget.referenceNo || "",
        description: cloneTarget.description
          ? `${cloneTarget.description} (نسخة)`
          : "نسخة",
        notes: cloneTarget.notes || "",
      });
      setShowCreateDialog(true);
      setShowCloneDialog(false);
      setCloneTarget(null);
    },
    [cloneTarget, createForm]
  );

  const handlePrintVoucher = useCallback((voucher: any) => {
    setPrintTarget(voucher);
    setShowPrintDialog(true);
  }, []);

  const executePrint = useCallback(() => {
    window.print();
    setShowPrintDialog(false);
  }, []);

  function handleAccountSelect(index: number, accountId: string, account: any) {
    const updated = [...voucherLines];
    updated[index] = {
      ...updated[index],
      accountId: parseInt(accountId),
      accountCode: account.code,
      accountName: account.name,
    };
    setVoucherLines(updated);
  }

  function addLine() {
    setVoucherLines([
      ...voucherLines,
      { accountId: 0, accountCode: "", debitAmount: "", creditAmount: "" },
    ]);
  }

  function removeLine(index: number) {
    if (voucherLines.length > 1) {
      setVoucherLines(voucherLines.filter((_, i) => i !== index));
    }
  }

  function getStatusBadge(status: VoucherStatus) {
    // Theme-aware variants (no hardcoded light palettes — dark/contrast safe).
    const variants: Record<
      VoucherStatus,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      draft: "secondary",
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      posted: "default",
      cancelled: "outline",
    };
    const labels: Record<VoucherStatus, string> = {
      draft: "مسودة",
      pending: "معلق",
      approved: "معتمد",
      rejected: "مرفوض",
      posted: "مرحل",
      cancelled: "ملغي",
    };
    return (
      <Badge
        variant={variants[status]}
        className={status === "cancelled" ? "line-through" : undefined}
      >
        {labels[status]}
      </Badge>
    );
  }

  function getTabIcon(tab: VoucherTab) {
    switch (tab) {
      case "payment":
        return <Banknote className="w-4 h-4" />;
      case "receipt":
        return <Receipt className="w-4 h-4" />;
      case "journal":
        return <BookOpen className="w-4 h-4" />;
      case "adjustment":
        return <Settings2 className="w-4 h-4" />;
    }
  }

  function getTabLabel(tab: VoucherTab) {
    switch (tab) {
      case "payment":
        return "سندات الصرف";
      case "receipt":
        return "سندات القبض";
      case "journal":
        return "القيود اليومية";
      case "adjustment":
        return "قيود التعديل";
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-7xl mx-auto p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              السندات المحاسبية
            </h1>
            <p className="text-sm text-muted-foreground">
              إدارة سندات الصرف والقبض والقيود اليومية
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="press-effect btn-gold"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة قيد جديد
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">بحث</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="رقم القيد، الوصف، الطرف..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
              <div className="w-32">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="posted">مرحل</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </div>
              <div className="w-36">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setFromDate("");
                  setToDate("");
                }}
              >
                <Filter className="w-4 h-4 ml-2" />
                مسح
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs and Table */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as VoucherTab)}
        >
          <TabsList className="tabs-primary w-full sm:w-auto grid grid-cols-4">
            {(
              ["payment", "receipt", "journal", "adjustment"] as VoucherTab[]
            ).map(tab => (
              <TabsTrigger key={tab} value={tab} className="tab-trigger">
                <span className="flex items-center gap-2">
                  {getTabIcon(tab)}
                  <span className="hidden sm:inline">{getTabLabel(tab)}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(
            ["payment", "receipt", "journal", "adjustment"] as VoucherTab[]
          ).map(tab => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {getTabIcon(tab)}
                    {getTabLabel(tab)}
                    <span className="text-muted-foreground font-normal">
                      ({vouchers.length} قيد)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <DataGrid
                    data={vouchers}
                    idKey="id"
                    loading={vouchersQuery.isLoading}
                    error={
                      vouchersQuery.error ? vouchersQuery.error.message : null
                    }
                    onRetry={() => vouchersQuery.refetch()}
                    // DB rows are supersets of Voucher (drizzle `| null`
                    // vs optional fields differ only at type level).
                    onRowClick={v => handleView(v as unknown as Voucher)}
                    pageSize={50}
                    ariaLabel={`جدول ${getTabLabel(tab)}`}
                    emptyTitle="لا توجد قيود"
                    emptyHint="أنشئ قيداً جديداً من زر الإنشاء"
                    emptyAction={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveTab(tab);
                          setShowCreateDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء قيد جديد
                      </Button>
                    }
                    initialSort={{ key: "voucherDate", dir: "desc" }}
                    columns={[
                      {
                        key: "voucherNumber",
                        header: "رقم القيد",
                        sortable: true,
                        render: v => (
                          <span className="font-ledger">{String(v)}</span>
                        ),
                      },
                      {
                        key: "voucherDate",
                        header: "التاريخ",
                        sortable: true,
                        render: v => (
                          <span className="whitespace-nowrap">
                            {new Date(String(v)).toLocaleDateString("ar-SA")}
                          </span>
                        ),
                      },
                      {
                        key: "description",
                        header: "الوصف",
                        sortable: true,
                        accessor: (v: any) => v.description || v.notes || "-",
                      },
                      {
                        key: "counterpartyName",
                        header: "الطرف",
                        sortable: true,
                        accessor: (v: any) => v.counterpartyName || "-",
                      },
                      {
                        key: "amount",
                        header: "المبلغ",
                        sortable: true,
                        numeric: true,
                        render: v => (
                          <span className="font-ledger">
                            {parseFloat(String(v)).toLocaleString("ar-SA", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        header: "الحالة",
                        render: v => getStatusBadge(v as VoucherStatus),
                      },
                      {
                        key: "__actions",
                        header: "إجراءات",
                        render: (_v, row: any) => (
                          <div
                            className="flex items-center gap-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                handleView(row);
                              }}
                              title="عرض"
                              aria-label="عرض السند"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {row.status === "draft" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSubmit(row);
                                }}
                                title="تقديم للمراجعة"
                                aria-label="تقديم للمراجعة"
                              >
                                <Send className="w-4 h-4 text-info" />
                              </Button>
                            )}
                            {row.status === "pending" && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleApprove(row);
                                  }}
                                  title="اعتماد"
                                  aria-label="اعتماد السند"
                                >
                                  <CheckCircle className="w-4 h-4 text-success" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleReject(row);
                                  }}
                                  title="رفض"
                                  aria-label="رفض السند"
                                >
                                  <XCircle className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            {row.status === "approved" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={e => {
                                  e.stopPropagation();
                                  handlePost(row);
                                }}
                                title="ترحيل"
                                aria-label="ترحيل السند"
                              >
                                <ChevronRight className="w-4 h-4 text-success" />
                              </Button>
                            )}
                            {row.status === "posted" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleReverse(row);
                                }}
                                title="تعديل معكوس"
                                aria-label="تعديل معكوس"
                              >
                                <RotateCcw className="w-4 h-4 text-warning" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                handleCloneVoucher(row);
                              }}
                              title="نسخ السند"
                              aria-label="نسخ السند"
                            >
                              <Copy className="w-4 h-4 text-info" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                handlePrintVoucher(row);
                              }}
                              title="طباعة السند"
                              aria-label="طباعة السند"
                            >
                              <Printer className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Create Voucher Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTabIcon(activeTab)}
              إنشاء {getTabLabel(activeTab)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>تاريخ القيد *</Label>
                <Input
                  type="date"
                  value={createForm.voucherDate}
                  onChange={e =>
                    setCreateForm({
                      ...createForm,
                      voucherDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>رقم مرجعي (اختياري)</Label>
                <Input
                  value={createForm.referenceNo}
                  onChange={e =>
                    setCreateForm({
                      ...createForm,
                      referenceNo: e.target.value,
                    })
                  }
                  placeholder="فاتورة، شيك، حوالة..."
                />
              </div>
            </div>

            {/* Counterparty */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>نوع الطرف</Label>
                <Select
                  value={createForm.counterpartyType}
                  onValueChange={v => {
                    setCpSearch("");
                    setCreateForm({
                      ...createForm,
                      counterpartyType: v as typeof createForm.counterpartyType,
                      counterpartyId: "",
                      counterpartyName: "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">عميل</SelectItem>
                    <SelectItem value="supplier">مورد</SelectItem>
                    <SelectItem value="employee">موظف</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الطرف</Label>
                {createForm.counterpartyType === "customer" && (
                  <AutoComplete
                    options={customers.map((c: any) => ({
                      value: String(c.id),
                      label: c.name,
                      description: c.code ? `كود ${c.code}` : undefined,
                    }))}
                    value={
                      customers.find(
                        (c: any) => String(c.id) === createForm.counterpartyId
                      )?.name ?? createForm.counterpartyName
                    }
                    onChange={v => {
                      const customer = customers.find(
                        (c: any) => String(c.id) === v
                      );
                      setCreateForm({
                        ...createForm,
                        counterpartyId: customer ? String(customer.id) : "",
                        counterpartyName: customer?.name || "",
                      });
                    }}
                    onSearch={setCpSearch}
                    loading={customersQuery.isLoading}
                    placeholder="اختر العميل"
                    searchPlaceholder="ابحث بالاسم أو الكود..."
                    emptyMessage="لا يوجد عملاء مطابقون"
                  />
                )}
                {createForm.counterpartyType === "supplier" && (
                  <AutoComplete
                    options={suppliers.map((s: any) => ({
                      value: String(s.id),
                      label: s.name,
                      description: s.code ? `كود ${s.code}` : undefined,
                    }))}
                    value={
                      suppliers.find(
                        (s: any) => String(s.id) === createForm.counterpartyId
                      )?.name ?? createForm.counterpartyName
                    }
                    onChange={v => {
                      const supplier = suppliers.find(
                        (s: any) => String(s.id) === v
                      );
                      setCreateForm({
                        ...createForm,
                        counterpartyId: supplier ? String(supplier.id) : "",
                        counterpartyName: supplier?.name || "",
                      });
                    }}
                    onSearch={setCpSearch}
                    loading={suppliersQuery.isLoading}
                    placeholder="اختر المورد"
                    searchPlaceholder="ابحث بالاسم أو الكود..."
                    emptyMessage="لا يوجد موردون مطابقون"
                  />
                )}
                {createForm.counterpartyType !== "customer" &&
                  createForm.counterpartyType !== "supplier" && (
                    <Input
                      value={createForm.counterpartyName}
                      onChange={e =>
                        setCreateForm({
                          ...createForm,
                          counterpartyName: e.target.value,
                        })
                      }
                      placeholder="اسم الطرف"
                    />
                  )}
              </div>
              <div>
                <Label>الحساب البنكي/النقدي</Label>
                <Select
                  value={createForm.bankAccountId}
                  onValueChange={v =>
                    setCreateForm({ ...createForm, bankAccountId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(
                        (a: any) =>
                          a.type === "asset" &&
                          (a.code.startsWith("1") || a.code.startsWith("11"))
                      )
                      .map((a: any) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Management Accounting */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>القسم</Label>
                <Select
                  value={createForm.departmentId}
                  onValueChange={v =>
                    setCreateForm({ ...createForm, departmentId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المشروع</Label>
                <Select
                  value={createForm.projectId}
                  onValueChange={v =>
                    setCreateForm({ ...createForm, projectId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المشروع" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>مركز التكلفة</Label>
                <Select
                  value={createForm.costCenterId}
                  onValueChange={v =>
                    setCreateForm({ ...createForm, costCenterId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مركز التكلفة" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>الوصف</Label>
              <Input
                value={createForm.description}
                onChange={e =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                placeholder="وصف القيد..."
              />
            </div>

            {/* Voucher Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>القيود المحاسبية *</Label>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="w-3 h-3 ml-1" />
                  إضافة سطر
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">الحساب</TableHead>
                      <TableHead className="w-24">مدين</TableHead>
                      <TableHead className="w-24">دائن</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voucherLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.accountId?.toString() || ""}
                            onValueChange={v => {
                              const account = accounts.find(
                                (a: any) => a.id === parseInt(v)
                              );
                              if (account)
                                handleAccountSelect(index, v, account);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="اختر الحساب" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((a: any) => (
                                <SelectItem key={a.id} value={a.id.toString()}>
                                  {a.code} - {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debitAmount}
                            onChange={e => {
                              const updated = [...voucherLines];
                              updated[index] = {
                                ...updated[index],
                                debitAmount: e.target.value,
                                creditAmount: e.target.value
                                  ? ""
                                  : updated[index].creditAmount,
                              };
                              setVoucherLines(updated);
                            }}
                            className="text-left font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.creditAmount}
                            onChange={e => {
                              const updated = [...voucherLines];
                              updated[index] = {
                                ...updated[index],
                                creditAmount: e.target.value,
                                debitAmount: e.target.value
                                  ? ""
                                  : updated[index].debitAmount,
                              };
                              setVoucherLines(updated);
                            }}
                            className="text-left font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description || ""}
                            onChange={e => {
                              const updated = [...voucherLines];
                              updated[index] = {
                                ...updated[index],
                                description: e.target.value,
                              };
                              setVoucherLines(updated);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeLine(index)}
                            disabled={voucherLines.length === 1}
                          >
                            <XCircle className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="flex justify-end gap-8 p-3 bg-muted/50 border-t">
                  <div className="text-left">
                    <span className="text-sm text-muted-foreground ml-2">
                      المجموع:
                    </span>
                    <span className="font-mono">
                      <span className="text-destructive">
                        {totalDebits.toLocaleString("ar-SA", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="mx-2">|</span>
                      <span className="text-success">
                        {totalCredits.toLocaleString("ar-SA", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                  </div>
                  {!isBalanced && (
                    <Badge variant="destructive">غير متوازن</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={createForm.notes}
                onChange={e =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateVoucher}
              disabled={!isBalanced || createVoucher.isPending}
              className="btn-primary"
            >
              {createVoucher.isPending ? "جاري الإنشاء..." : "حفظ كمسودة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Voucher Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تفاصيل القيد
            </DialogTitle>
          </DialogHeader>

          {selectedVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">
                    رقم القيد:
                  </span>
                  <p className="font-mono font-bold">
                    {selectedVoucher.voucherNumber}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">الحالة:</span>
                  <p className="mt-1">
                    {getStatusBadge(selectedVoucher.status)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    التاريخ:
                  </span>
                  <p>
                    {new Date(selectedVoucher.voucherDate).toLocaleDateString(
                      "ar-SA"
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">المبلغ:</span>
                  <p className="font-mono text-lg">
                    {parseFloat(selectedVoucher.amount).toLocaleString(
                      "ar-SA",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </p>
                </div>
                {selectedVoucher.counterpartyName && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">
                      الطرف:
                    </span>
                    <p>{selectedVoucher.counterpartyName}</p>
                  </div>
                )}
                {selectedVoucher.description && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">
                      الوصف:
                    </span>
                    <p>{selectedVoucher.description}</p>
                  </div>
                )}
                {selectedVoucher.notes && (
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">
                      ملاحظات:
                    </span>
                    <p className="text-sm">{selectedVoucher.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block">الإجراءات المتاحة:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedVoucher.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(selectedVoucher)}
                      disabled={submitVoucher.isPending}
                    >
                      <Send className="w-4 h-4 ml-2" />
                      تقديم للمراجعة
                    </Button>
                  )}
                  {selectedVoucher.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(selectedVoucher)}
                        disabled={approveVoucher.isPending}
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        اعتماد
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(selectedVoucher)}
                        disabled={rejectVoucher.isPending}
                      >
                        <XCircle className="w-4 h-4 ml-2" />
                        رفض
                      </Button>
                    </>
                  )}
                  {selectedVoucher.status === "approved" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handlePost(selectedVoucher)}
                      disabled={postVoucher.isPending}
                    >
                      <ArrowRightLeft className="w-4 h-4 ml-2" />
                      ترحيل إلى دفتر الأستاذ
                    </Button>
                  )}
                  {selectedVoucher.status === "posted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReverse(selectedVoucher)}
                      disabled={reverseVoucher.isPending}
                    >
                      <RotateCcw className="w-4 h-4 ml-2" />
                      إنشاء قيد معكوس
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmState}
        onOpenChange={open => {
          if (!open) setConfirmState(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmState?.title || "تأكيد العملية"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState?.desc || "هل أنت متأكد من تنفيذ هذه العملية؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmState?.action();
                setConfirmState(null);
              }}
            >
              تنفيذ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={open => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              رفض القيد {rejectTarget?.voucherNumber || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">سبب الرفض</Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض..."
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectVoucher.isPending}
              onClick={() => {
                if (rejectTarget && rejectReason.trim()) {
                  rejectVoucher.mutate({
                    id: rejectTarget.id,
                    reason: rejectReason.trim(),
                  });
                  setRejectTarget(null);
                }
              }}
            >
              رفض القيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CloneConfirmDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        entityType="سند"
        entityLabel={cloneTarget?.voucherNumber || ""}
        onClone={executeClone}
      />

      <PrintPreviewDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        title={`سند ${printTarget?.voucherNumber || ""}`}
        content={<div>محتوى السند للطباعة</div>}
        onPrint={executePrint}
      />

      <QuickActionBar
        actions={[
          {
            id: "new",
            label: "سند جديد",
            icon: Plus,
            onClick: () => setShowCreateDialog(true),
            variant: "primary",
          },
          { id: "search", label: "بحث", icon: Search, onClick: () => {} },
          { id: "export", label: "تصدير", icon: Download, onClick: () => {} },
        ]}
      />
    </div>
  );
}
