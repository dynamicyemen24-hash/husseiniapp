import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  Calendar,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ClipboardCheck,
  Play,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const formatNum = (n: number) =>
  new Intl.NumberFormat("en-US").format(Math.round(n * 100) / 100);

const statusLabels: Record<string, string> = {
  planned: "مخطط",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  approved: "معتمد",
};

const statusColors: Record<string, string> = {
  planned: "chip bg-info/15 text-info",
  in_progress: "chip bg-warning/15 text-warning",
  completed: "chip bg-success/15 text-success",
  cancelled: "chip bg-rose-500/15 text-rose-600",
  approved: "chip bg-purple-500/15 text-purple-600",
};

const lineStatusLabels: Record<string, string> = {
  pending: "في الانتظار",
  ok: "مطابق",
  variance: "انحراف",
};

const lineStatusColors: Record<string, string> = {
  pending: "chip bg-muted text-muted-foreground",
  ok: "chip bg-success/15 text-success",
  variance: "chip bg-rose-500/15 text-rose-600",
};

interface WarehouseItem {
  id: number;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

interface EmployeeItem {
  id: number;
  fullName: string;
}

interface CycleCountItem {
  id: number;
  countNumber: string;
  warehouseId: number;
  status: string;
  plannedDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  assignedToId: number | null;
  varianceThreshold: string;
  warehouseName: string | null;
  notes: string | null;
}

export function CycleCountingPanel() {
  const { data: warehouses } = trpc.warehouses.list.useQuery();
  const { data: employeesData } = trpc.erp.listEmployees.useQuery(undefined);
  const employees = employeesData || [];

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create cycle count dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    warehouseId: "",
    plannedDate: new Date().toISOString().slice(0, 10),
    assignedToId: "",
    varianceThreshold: "5",
    notes: "",
  });

  // Count dialog state
  const [countDialog, setCountDialog] = useState<{
    open: boolean;
    cycleCountId: number;
    line: any;
  }>({ open: false, cycleCountId: 0, line: null });

  const {
    data: cycleCounts,
    isLoading: loadingCounts,
    refetch: refetchCounts,
  } = trpc.products.cycleCountList.useQuery(
    { status: selectedStatus || undefined },
    { staleTime: 30_000 }
  );

  const createCycleCount = trpc.products.cycleCountCreate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الجرد بنجاح");
      setShowCreateDialog(false);
      setCreateForm({
        warehouseId: "",
        plannedDate: new Date().toISOString().slice(0, 10),
        assignedToId: "",
        varianceThreshold: "5",
        notes: "",
      });
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإنشاء"),
  });

  const startCycleCount = trpc.products.cycleCountStart.useMutation({
    onSuccess: () => {
      toast.success("تم بدء الجرد");
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل البدء"),
  });

  const recordCount = trpc.products.cycleCountRecord.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الجرد");
      setCountDialog({ open: false, cycleCountId: 0, line: null });
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل التسجيل"),
  });

  const cycleCountLines = trpc.products.cycleCountLines.useQuery(
    {
      cycleCountId: countDialog.cycleCountId,
    },
    {
      enabled: !!countDialog.cycleCountId,
    }
  );

  const completeCycleCount = trpc.products.cycleCountComplete.useMutation({
    onSuccess: () => {
      toast.success("تم إكمال الجرد");
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الإكمال"),
  });

  const approveCycleCount = trpc.products.cycleCountApprove.useMutation({
    onSuccess: (r: any) => {
      toast.success(r.success ? "تم اعتماد الجرد" : "فشل الاعتماد");
      refetchCounts();
    },
    onError: (e: any) => toast.error(e?.message || "فشل الاعتماد"),
  });

  // Query for cycle count lines
  const { data: cycleCountLinesData, refetch: refetchLines } =
    trpc.products.cycleCountLines.useQuery(
      { cycleCountId: countDialog.cycleCountId },
      { enabled: countDialog.open && countDialog.cycleCountId > 0 }
    );

  // Track selected line for recording
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [countedQty, setCountedQty] = useState<number>(0);
  const [countNotes, setCountNotes] = useState("");

  const totalCounts = useMemo(() => cycleCounts?.length || 0, [cycleCounts]);
  const plannedCount = useMemo(
    () => cycleCounts?.filter(c => c.status === "planned").length || 0,
    [cycleCounts]
  );
  const inProgressCount = useMemo(
    () => cycleCounts?.filter(c => c.status === "in_progress").length || 0,
    [cycleCounts]
  );
  const completedCount = useMemo(
    () => cycleCounts?.filter(c => c.status === "completed").length || 0,
    [cycleCounts]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">الجرد الدوري</h2>
          <p className="text-xs text-muted-foreground">
            إدارة عمليات الجرد الدوري والمفاجئ للمخازن
          </p>
        </div>
        <Button
          size="sm"
          className="press-effect shine-on-hover text-xs h-8"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-3 h-3 ml-1" /> جرد جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="panel-premium border-0 p-3">
          <p className="text-[10px] text-muted-foreground">إجمالي الجرد</p>
          <p className="font-bold text-lg text-foreground">{totalCounts}</p>
        </Card>
        <Card className="panel-premium border-0 p-3">
          <p className="text-[10px] text-muted-foreground">مخطط</p>
          <p className="font-bold text-lg text-info">{plannedCount}</p>
        </Card>
        <Card className="panel-premium border-0 p-3">
          <p className="text-[10px] text-muted-foreground">قيد التنفيذ</p>
          <p className="font-bold text-lg text-warning">{inProgressCount}</p>
        </Card>
        <Card className="panel-premium border-0 p-3">
          <p className="text-[10px] text-muted-foreground">مكتمل/معتمد</p>
          <p className="font-bold text-lg text-success">{completedCount}</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Select
            value={selectedStatus}
            onValueChange={v => setSelectedStatus(v)}
          >
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <SelectValue placeholder="فلترة بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              <SelectItem value="planned">مخطط</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث برقم الجرد، المخزن، أو الملاحظات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 text-xs pr-10"
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-3 overflow-x-auto">
          {loadingCounts ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-muted/50 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="datagrid rounded-xl border border-line overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-panel/60 text-muted-foreground font-bold text-[10px]">
                    <th className="text-right p-2.5">رقم الجرد</th>
                    <th className="text-right p-2.5">المخزن</th>
                    <th className="text-center p-2.5">الحالة</th>
                    <th className="text-center p-2.5">التاريخ المخطط</th>
                    <th className="text-center p-2.5">تاريخ البدء</th>
                    <th className="text-center p-2.5">تاريخ الإكمال</th>
                    <th className="text-center p-2.5">المسؤول</th>
                    <th className="text-center p-2.5">حد الانحراف %</th>
                    <th className="text-left p-2.5">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {cycleCounts
                    ?.filter(
                      cc =>
                        cc.countNumber
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        cc.warehouseName
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        (cc as any).notes
                          ?.toLowerCase()
                          .includes(searchQuery.toLowerCase())
                    )
                    .map(cc => (
                      <tr
                        key={cc.id}
                        className="border-line hover:bg-muted/30 transition-colors bg-surface"
                      >
                        <td className="p-2.5 font-mono text-[10px] font-bold text-foreground">
                          {cc.countNumber}
                        </td>
                        <td className="p-2.5 text-foreground">
                          {cc.warehouseName}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={
                              statusColors[cc.status] ||
                              "chip bg-muted text-muted-foreground"
                            }
                            variant="outline"
                          >
                            {statusLabels[cc.status] || cc.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-foreground">
                          {cc.plannedDate
                            ? format(new Date(cc.plannedDate), "yyyy/MM/dd")
                            : "-"}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-foreground">
                          {cc.startedAt
                            ? format(new Date(cc.startedAt), "yyyy/MM/dd HH:mm")
                            : "-"}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-foreground">
                          {cc.completedAt
                            ? format(
                                new Date(cc.completedAt),
                                "yyyy/MM/dd HH:mm"
                              )
                            : "-"}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-foreground">
                          {cc.assignedToId ? `موظف #${cc.assignedToId}` : "-"}
                        </td>
                        <td className="p-2.5 text-center font-mono text-foreground">
                          {cc.varianceThreshold}%
                        </td>
                        <td className="p-2.5 text-left flex items-center gap-1">
                          {cc.status === "planned" && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6 text-[10px] text-success hover:bg-success/10"
                              onClick={() =>
                                startCycleCount.mutate({ id: cc.id })
                              }
                              disabled={startCycleCount.isPending}
                              title="بدء الجرد"
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          {cc.status === "in_progress" && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6 text-[10px] text-info hover:bg-info/10"
                              onClick={() =>
                                setCountDialog({
                                  open: true,
                                  cycleCountId: cc.id,
                                  line: null,
                                })
                              }
                              title="تسجيل الجرد"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                            </Button>
                          )}
                          {cc.status === "completed" && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6 text-[10px] text-purple-600 hover:bg-purple-500/10"
                              onClick={() =>
                                approveCycleCount.mutate({
                                  id: cc.id,
                                  applyAdjustments: true,
                                })
                              }
                              disabled={approveCycleCount.isPending}
                              title="اعتماد وتطبيق التسويات"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-[10px] text-gray-600"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {(!cycleCounts || cycleCounts.length === 0) && (
                    <tr>
                      <td colSpan={9} className="text-center py-10">
                        <div className="empty-state flex flex-col items-center gap-2">
                          <ClipboardCheck className="w-8 h-8 text-muted-foreground/50" />
                          <p className="text-sm font-medium text-foreground">
                            لا توجد عمليات جرد
                          </p>
                          <p className="text-xs text-muted-foreground">
                            قم بإنشاء جرد دوري جديد للبدء
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Cycle Count Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء جرد دوري جديد</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              createCycleCount.mutate({
                warehouseId: Number(createForm.warehouseId),
                plannedDate: createForm.plannedDate,
                assignedToId: createForm.assignedToId
                  ? Number(createForm.assignedToId)
                  : undefined,
                varianceThreshold: createForm.varianceThreshold,
                notes: createForm.notes,
              });
            }}
            className="space-y-3"
          >
            <div>
              <Label className="text-[11px]">المخزن *</Label>
              <Select
                value={createForm.warehouseId}
                onValueChange={v =>
                  setCreateForm({ ...createForm, warehouseId: v })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر مخزناً" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map(w => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.code} - {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">التاريخ المخطط *</Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={createForm.plannedDate}
                onChange={e =>
                  setCreateForm({ ...createForm, plannedDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">المسؤول</Label>
              <Select
                value={createForm.assignedToId}
                onValueChange={v =>
                  setCreateForm({ ...createForm, assignedToId: v })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="اختر موظفاً (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map(e => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">حد الانحراف %</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="h-9 text-xs"
                value={createForm.varianceThreshold}
                onChange={e =>
                  setCreateForm({
                    ...createForm,
                    varianceThreshold: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">ملاحظات</Label>
              <Input
                className="h-9 text-xs"
                value={createForm.notes}
                onChange={e =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                placeholder="ملاحظات إضافية"
              />
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep"
                disabled={createCycleCount.isPending}
              >
                {createCycleCount.isPending ? "جاري الإنشاء..." : "إنشاء الجرد"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Count Dialog - shows cycle count lines for review */}
      <Dialog
        open={countDialog.open}
        onOpenChange={v => {
          setCountDialog({ ...countDialog, open: v });
          if (!v) {
            setSelectedLineId(null);
            setCountedQty(0);
            setCountNotes("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>تسجيل نتائج الجرد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
            {!cycleCountLinesData ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 bg-muted/50 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : cycleCountLinesData.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">
                لا توجد بنود مسجلة لهذا الجرد
              </p>
            ) : (
              <div className="datagrid rounded-xl border border-line overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-panel/60 text-muted-foreground font-bold text-[10px]">
                      <th className="text-right p-2">الصنف</th>
                      <th className="text-center p-2">الكمية النظامية</th>
                      <th className="text-center p-2">المُجرّدة</th>
                      <th className="text-center p-2">الكمية المسجلة</th>
                      <th className="text-center p-2">الحالة</th>
                      <th className="text-center p-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycleCountLinesData.map((line: any) => {
                      const isSelected = selectedLineId === line.id;
                      return (
                        <tr
                          key={line.id}
                          className={`border-line ${
                            isSelected ? "bg-info/10" : "bg-surface"
                          } hover:bg-muted/30 transition-colors`}
                        >
                          <td className="p-2 text-[10px]">
                            <div className="font-medium">
                              {line.productName || `#${line.productId}`}
                            </div>
                            <div className="text-muted-foreground">
                              {line.productCode}
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono">
                            {formatNum(Number(line.systemQty || 0))}
                          </td>
                          <td className="p-2 text-center font-mono">
                            {line.countedQty != null
                              ? formatNum(Number(line.countedQty))
                              : "-"}
                          </td>
                          <td className="p-2 text-center">
                            {isSelected ? (
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                className="h-7 text-xs w-20 mx-auto"
                                value={countedQty}
                                onChange={e =>
                                  setCountedQty(Number(e.target.value) || 0)
                                }
                                placeholder="0"
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Badge
                              className={
                                lineStatusColors[line.status] ||
                                "chip bg-muted text-muted-foreground"
                              }
                              variant="outline"
                            >
                              {lineStatusLabels[line.status] || line.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            {isSelected ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px]"
                                onClick={() => setSelectedLineId(null)}
                              >
                                إلغاء
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px]"
                                onClick={() => {
                                  setSelectedLineId(line.id);
                                  setCountedQty(Number(line.countedQty || 0));
                                }}
                              >
                                تسجيل
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedLineId && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <Label className="text-[11px]">ملاحظات</Label>
                <Textarea
                  className="text-xs min-h-[60px]"
                  value={countNotes}
                  onChange={e => setCountNotes(e.target.value)}
                  placeholder="ملاحظات عن الفرق إن وجد"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCountDialog({ ...countDialog, open: false });
                setSelectedLineId(null);
                setCountedQty(0);
                setCountNotes("");
              }}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep"
              disabled={
                recordCount.isPending || !selectedLineId || countedQty < 0
              }
              onClick={() => {
                const line = cycleCountLinesData?.find(
                  (l: any) => l.id === selectedLineId
                );
                if (!line) {
                  toast.error("البند غير موجود");
                  return;
                }
                recordCount.mutate(
                  {
                    cycleCountId: countDialog.cycleCountId,
                    productId: Number(line.productId),
                    warehouseId: Number(line.warehouseId),
                    batchId: line.batchId ? Number(line.batchId) : undefined,
                    countedQty: Number(countedQty),
                    notes: countNotes || undefined,
                  },
                  {
                    onSuccess: () => {
                      setSelectedLineId(null);
                      setCountedQty(0);
                      setCountNotes("");
                      refetchLines();
                    },
                  }
                );
              }}
            >
              {recordCount.isPending ? "جاري الحفظ..." : "حفظ التسجيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
