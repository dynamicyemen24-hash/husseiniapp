import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Check, X, PackageCheck, History } from "lucide-react";
import { EntityDocuments } from "@/components/EntityDocuments";

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  received: "مستلمة",
};
const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  received: "bg-brand-50 text-brand-700",
};

export default function Requisitions() {
  const utils = trpc.useUtils();
  const { data: items, isPending } = trpc.erp.listProcurements.useQuery(
    undefined,
    { placeholderData: (p: any) => p }
  );
  const { data: kpis } = trpc.erp.getProcurementKpis.useQuery(undefined, {
    placeholderData: (p: any) => p,
  });
  const list = (items ?? []) as any[];
  const money = (value: unknown) =>
    Number(value ?? 0).toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const { data: users } = trpc.modules.rbac.listUsers.useQuery();
  const { data: me } = trpc.auth.me.useQuery();

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("قطعة");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [currency, setCurrency] = useState("YER");
  const [description, setDescription] = useState("");
  // ─── Multi-step approval (Module A) ───────────────────────────────
  const [approvers, setApprovers] = useState<number[]>([]);

  const [approvalsFor, setApprovalsFor] = useState<number | null>(null);
  const reqForApproval = (list as any[]).find(r => r.id === approvalsFor) as
    | any
    | undefined;
  const { data: approvals } = trpc.erp.listProcurementApprovals.useQuery(
    { procurementId: approvalsFor! },
    { enabled: approvalsFor !== null, placeholderData: (p: any) => p }
  );

  const [receiveFor, setReceiveFor] = useState<number | null>(null);
  const [actualCost, setActualCost] = useState("");

  const create = trpc.erp.createProcurement.useMutation({
    onSuccess: () => {
      utils.erp.listProcurements.invalidate();
      utils.erp.getProcurementKpis.invalidate();
      setItemName("");
      setEstimatedCost("");
      setDescription("");
      setApprovers([]);
    },
  });
  const approve = trpc.erp.approveProcurement.useMutation({
    onSuccess: () => {
      utils.erp.listProcurements.invalidate();
      utils.erp.getProcurementKpis.invalidate();
    },
  });
  const receive = trpc.erp.receiveProcurement.useMutation({
    onSuccess: () => {
      utils.erp.listProcurements.invalidate();
      utils.erp.getProcurementKpis.invalidate();
      setReceiveFor(null);
      setActualCost("");
    },
  });

  return (
    <div className="min-h-screen flex">
      <main className="flex-1 bg-muted">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                طلبات التوريد
              </h1>
              <p className="text-sm text-muted-foreground">
                سير عمل الشراء الداخلي: طلب ← اعتماد ← استلام (يُرحَّل تلقائياً
                إلى الدفتر)
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pt-6 grid grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            ["إجمالي الطلبات", kpis?.total ?? 0, "text-foreground"],
            ["بانتظار الاعتماد", kpis?.pending ?? 0, "text-warning"],
            ["طلبات معتمدة", kpis?.approved ?? 0, "text-info"],
            ["مستلمة", kpis?.received ?? 0, "text-success"],
            [
              "القيمة المفتوحة",
              `${money(kpis?.openValue)} YER`,
              "text-brand-700",
            ],
          ].map(([label, value, tone]) => (
            <Card key={String(label)} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  {label}
                </p>
                <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="p-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Create form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">طلب توريد جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  البند
                </Label>
                <Input
                  className="text-[13px]"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="مثال: أجهزة حاسوب"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    الكمية
                  </Label>
                  <Input
                    className="text-[13px]"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    الوحدة
                  </Label>
                  <Input
                    className="text-[13px]"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    التكلفة التقديرية
                  </Label>
                  <Input
                    className="text-[13px]"
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                    العملة
                  </Label>
                  <Input
                    className="text-[13px]"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  وصف
                </Label>
                <Textarea
                  className="text-[13px]"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              {/* ─── Multi-step approvers (Module A) ─────────────────── */}
              <div>
                <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
                  معتمدون بالترتيب (اختياري)
                </Label>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
                  {(users ?? []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      لا يوجد مستخدمون
                    </p>
                  ) : (
                    (users ?? []).map((u: any) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-[12px] text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={approvers.includes(u.id)}
                          onChange={e =>
                            setApprovers(
                              e.target.checked
                                ? [...approvers, u.id]
                                : approvers.filter(id => id !== u.id)
                            )
                          }
                        />
                        {u.name || `مستخدم ${u.id}`}
                      </label>
                    ))
                  )}
                </div>
                {approvers.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    سيتم الاعتماد بالترتيب:{" "}
                    {approvers
                      .map(
                        id =>
                          (users ?? []).find((u: any) => u.id === id)?.name ||
                          `مستخدم ${id}`
                      )
                      .join(" ← ")}
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-brand text-ink-deep hover:bg-brand-600 hover:text-sand"
                disabled={!itemName || create.isPending}
                onClick={() =>
                  create.mutate({
                    itemName,
                    quantity,
                    unit,
                    estimatedCost,
                    currency,
                    description: description || undefined,
                    approvers: approvers.length ? approvers : undefined,
                  })
                }
              >
                {create.isPending ? "جاري الحفظ..." : "إنشاء الطلب"}
              </Button>
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">الطلبات</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">الرقم</TableHead>
                    <TableHead className="text-[11px]">البند</TableHead>
                    <TableHead className="text-[11px]">الكمية</TableHead>
                    <TableHead className="text-[11px]">التكلفة</TableHead>
                    <TableHead className="text-[11px]">الحالة</TableHead>
                    <TableHead className="text-[11px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : list.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        لا توجد طلبات توريد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-[12px] font-mono text-muted-foreground">
                          {r.requisitionNumber}
                        </TableCell>
                        <TableCell className="text-[13px] font-medium text-foreground">
                          {r.itemName}
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">
                          {r.quantity} {r.unit}
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">
                          {r.estimatedCost} {r.currency}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_TONE[r.status] ?? ""}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => setApprovalsFor(r.id)}
                            >
                              <History className="w-3 h-3 mr-1" /> الاعتمادات
                            </Button>
                            {(!r.approvers ||
                              (r.approvers as any[]).length === 0) &&
                              r.status !== "approved" &&
                              r.status !== "received" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-[11px] bg-success hover:bg-emerald-700"
                                    onClick={() =>
                                      approve.mutate({
                                        id: r.id,
                                        decision: "approved",
                                        level: 1,
                                      })
                                    }
                                  >
                                    <Check className="w-3 h-3 mr-1" /> اعتماد
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] text-destructive border-destructive/20"
                                    onClick={() =>
                                      approve.mutate({
                                        id: r.id,
                                        decision: "rejected",
                                        level: 1,
                                      })
                                    }
                                  >
                                    <X className="w-3 h-3 mr-1" /> رفض
                                  </Button>
                                </>
                              )}
                            {r.status === "approved" && (
                              <Button
                                size="sm"
                                className="h-7 px-2 text-[11px] bg-brand text-ink-deep hover:bg-brand-600 hover:text-sand"
                                onClick={() => {
                                  setActualCost(r.estimatedCost ?? "");
                                  setReceiveFor(r.id);
                                }}
                              >
                                <PackageCheck className="w-3 h-3 mr-1" /> استلام
                              </Button>
                            )}
                            <EntityDocuments
                              entityType="requisition"
                              entityId={r.id}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Approvals dialog */}
      <Dialog
        open={approvalsFor !== null}
        onOpenChange={o => !o && setApprovalsFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">سجل اعتمادات الطلب</DialogTitle>
          </DialogHeader>
          {/* ─── Multi-step progress (Module A) ──────────────────── */}
          {reqForApproval?.approvers &&
            (reqForApproval.approvers as any[]).length > 0 && (
              <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
                <p className="text-[12px] font-bold text-foreground">
                  سير الاعتماد: الخطوة{" "}
                  {(Number(reqForApproval.approvalStep) || 0) + 1} من{" "}
                  {reqForApproval.approvers.length}
                </p>
                <ol className="space-y-1">
                  {(reqForApproval.approvers as any[]).map(
                    (uid: number, i: number) => {
                      const log = (reqForApproval.approvalLog as any[]) || [];
                      const entry = log[i];
                      const name =
                        (users ?? []).find((u: any) => u.id === uid)?.name ||
                        `مستخدم ${uid}`;
                      const state = entry
                        ? entry.action === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                        : i === (Number(reqForApproval.approvalStep) || 0)
                          ? "bg-warning/10 text-warning"
                          : "bg-card text-muted-foreground";
                      return (
                        <li
                          key={i}
                          className={`flex items-center justify-between rounded-md border border-border px-2 py-1 text-[12px] ${state}`}
                        >
                          <span>
                            {i + 1}. {name}
                          </span>
                          <span>
                            {entry
                              ? entry.action === "approved"
                                ? "معتمد"
                                : "مرفوض"
                              : i === (Number(reqForApproval.approvalStep) || 0)
                                ? "بانتظار الاعتماد"
                                : "لم يُبدأ"}
                          </span>
                        </li>
                      );
                    }
                  )}
                </ol>
              </div>
            )}
          <div className="max-h-72 overflow-y-auto space-y-2">
            {(approvals ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد اعتمادات بعد.
              </p>
            ) : (
              (approvals ?? []).map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[12px]"
                >
                  <span className="text-muted-foreground">
                    المستوى {a.level} — {a.note || "بدون ملاحظة"}
                  </span>
                  <Badge
                    className={
                      a.decision === "approved"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {a.decision === "approved" ? "معتمد" : "مرفوض"}
                  </Badge>
                </div>
              ))
            )}
          </div>
          {/* ─── Gate: only current approver may act ─────────────── */}
          {reqForApproval?.approvers &&
            (reqForApproval.approvers as any[]).length > 0 &&
            reqForApproval.status === "pending" && (
              <ApprovalAction
                req={reqForApproval}
                users={users ?? []}
                meId={me?.id}
                onApprove={note =>
                  approve.mutate({
                    id: reqForApproval.id,
                    decision: "approved",
                    note: note || undefined,
                  })
                }
                onReject={note =>
                  approve.mutate({
                    id: reqForApproval.id,
                    decision: "rejected",
                    note: note || undefined,
                  })
                }
                isPending={approve.isPending}
              />
            )}
        </DialogContent>
      </Dialog>

      {/* Receive dialog */}
      <Dialog
        open={receiveFor !== null}
        onOpenChange={o => !o && setReceiveFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">
              استلام التوريد وترحيل القيد
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label className="mb-1 block text-[11px] font-bold text-muted-foreground">
              التكلفة الفعلية (يُرحَّل كالتزام مستحق)
            </Label>
            <Input
              className="text-[13px]"
              value={actualCost}
              onChange={e => setActualCost(e.target.value)}
              placeholder="اتركه فارغاً لاستخدام التكلفة التقديرية"
            />
          </div>
          <DialogFooter>
            <Button
              className="bg-brand text-ink-deep hover:bg-brand-600 hover:text-sand"
              disabled={receive.isPending}
              onClick={() =>
                receive.mutate({
                  id: receiveFor!,
                  actualCost: actualCost || undefined,
                })
              }
            >
              {receive.isPending
                ? "جاري الترحيل..."
                : "تأكيد الاستلام والترحيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Approval action with sequential gate (Module A) ──────────────────────
function ApprovalAction({
  req,
  users,
  meId,
  onApprove,
  onReject,
  isPending,
}: {
  req: any;
  users: any[];
  meId?: number;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  const step = Number(req.approvalStep) || 0;
  const approvers: number[] = req.approvers ?? [];
  const currentApprover = approvers[step];
  const canAct = meId != null && meId === currentApprover;
  const currentName =
    users.find((u: any) => u.id === currentApprover)?.name ||
    `المستخدم ${currentApprover}`;

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-[11px] text-muted-foreground">
        {canAct
          ? `دورك الآن: أنت المعتمد في الخطوة ${step + 1}`
          : `بانتظار اعتماد: ${currentName} (الخطوة ${step + 1})`}
      </p>
      <Input
        className="text-[12px]"
        placeholder="ملاحظة الاعتماد (اختياري)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-success hover:bg-emerald-700 text-white"
          disabled={!canAct || isPending}
          onClick={() => onApprove(note)}
        >
          <Check className="w-3 h-3 mr-1" /> اعتماد الخطوة
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-destructive border-destructive/20"
          disabled={!canAct || isPending}
          onClick={() => onReject(note)}
        >
          <X className="w-3 h-3 mr-1" /> رفض
        </Button>
      </div>
      {!canAct && (
        <p className="text-[10px] text-warning">
          الزر متاح فقط للمعتمد الحالي في هذه الخطوة.
        </p>
      )}
    </div>
  );
}
