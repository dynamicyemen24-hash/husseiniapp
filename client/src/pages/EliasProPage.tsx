import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Network,
  Plus,
  RefreshCw,
  Server,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  ELIAS_ENGINE_CATEGORY_LABELS,
  ELIAS_ENGINE_RISK_LABELS,
  ELIAS_HEALTH_LEVEL_LABELS,
  ELIAS_WORK_ORDER_STATUS_LABELS,
  type EliasEngineCategory,
  type EliasHealthLevel,
} from "@shared/eliasPro";

/** Maps a health level to the semantic colour tokens of the design system. */
const LEVEL_CLASS: Record<EliasHealthLevel, string> = {
  excellent: "bg-success-soft text-success",
  good: "bg-success-soft text-success",
  fair: "bg-warning-soft text-warning",
  poor: "bg-warning-soft text-warning",
  critical: "bg-destructive/10 text-destructive",
};

const LEVEL_BAR: Record<"ok" | "warn" | "critical", string> = {
  ok: "bg-success",
  warn: "bg-warning",
  critical: "bg-destructive",
};

const CATEGORY_ICONS: Record<EliasEngineCategory, typeof Cpu> = {
  network: Network,
  system: Activity,
  hardware: Cpu,
  shop: Wrench,
  enterprise: Server,
  ai: Activity,
};

export default function EliasProPage() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("fleet");

  // ─── Queries ───────────────────────────────────────────────────
  const fleet = trpc.eliasPro.fleet.overview.useQuery(undefined, {
    staleTime: 30_000,
  });
  const nodes = trpc.eliasPro.nodes.list.useQuery(undefined, {
    staleTime: 30_000,
  });
  const engines = trpc.eliasPro.engines.list.useQuery(
    { category: undefined, portableOnly: false },
    { staleTime: 5 * 60_000 }
  );
  const diagnostics = trpc.eliasPro.diagnostics.list.useQuery(
    { limit: 50 },
    { staleTime: 30_000 }
  );
  const workOrders = trpc.eliasPro.workOrders.list.useQuery(
    { limit: 50 },
    { staleTime: 20_000 }
  );
  const engineRuns = trpc.eliasPro.engineRuns.useQuery(
    { limit: 25 },
    { staleTime: 20_000 }
  );

  const refreshAll = () => {
    utils.eliasPro.fleet.overview.invalidate();
    utils.eliasPro.nodes.list.invalidate();
    utils.eliasPro.diagnostics.list.invalidate();
    utils.eliasPro.workOrders.list.invalidate();
    utils.eliasPro.engineRuns.invalidate();
  };

  // ─── Node registration ─────────────────────────────────────────
  const [nodeCode, setNodeCode] = useState("");
  const [nodeName, setNodeName] = useState("");
  const [nodeUrl, setNodeUrl] = useState("");
  const [nodeToken, setNodeToken] = useState("");
  const [simulated, setSimulated] = useState(true);

  const registerNode = trpc.eliasPro.nodes.register.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل العقدة بنجاح");
      setNodeCode("");
      setNodeName("");
      setNodeUrl("");
      setNodeToken("");
      refreshAll();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const removeNode = trpc.eliasPro.nodes.remove.useMutation({
    onSuccess: () => {
      toast.success("تم تعطيل العقدة");
      refreshAll();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const capture = trpc.eliasPro.diagnostics.capture.useMutation({
    onSuccess: d => {
      toast.success(`تم التقاط التشخيص — درجة ${d.score}%`);
      refreshAll();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const runEngine = trpc.eliasPro.runEngine.useMutation({
    onSuccess: r => {
      if (r.status === "success") {
        toast.success(`اكتمل تشغيل المحرك ${r.engineLabel}`);
      } else {
        toast.error(r.error ?? "تعذر تشغيل المحرك");
      }
      utils.eliasPro.engineRuns.invalidate();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  // ─── Work order creation ───────────────────────────────────────
  const [woTitle, setWoTitle] = useState("");
  const [woCustomer, setWoCustomer] = useState("");
  const [woNodeId, setWoNodeId] = useState<string>("");

  const createWorkOrder = trpc.eliasPro.workOrders.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء أمر الصيانة");
      setWoTitle("");
      setWoCustomer("");
      utils.eliasPro.workOrders.list.invalidate();
      utils.eliasPro.fleet.overview.invalidate();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const setWorkOrderStatus = trpc.eliasPro.workOrders.setStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة أمر الصيانة");
      utils.eliasPro.workOrders.list.invalidate();
      utils.eliasPro.fleet.overview.invalidate();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const nodeList = useMemo(() => nodes.data ?? [], [nodes.data]);
  const activeNodes = useMemo(
    () => nodeList.filter(n => n.status !== "disabled"),
    [nodeList]
  );

  const overview = fleet.data;

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Header ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Server className="w-6 h-6 text-brand" />
              منظومة الياس برو للصيانة والتشخيص
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              عقد الصيانة، تشخيص صحة الأجهزة، محركات الصيانة وأوامر الإصلاح —
              متكاملة مع سجل التدقيق وعزل المؤسسات
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-brand text-ink-deep font-bold">
              {overview?.nodesTotal ?? 0} عقدة
            </Badge>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="w-4 h-4 ml-1.5" /> تحديث
            </Button>
          </div>
        </div>

        {/* ─── KPI strip ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="العقد المتصلة"
            value={`${overview?.nodesOnline ?? 0}`}
            hint={`من أصل ${overview?.nodesTotal ?? 0}`}
          />
          <KpiCard
            label="متوسط درجة الصحة"
            value={
              overview?.averageScore !== null &&
              overview?.averageScore !== undefined
                ? `${overview.averageScore}%`
                : "—"
            }
            hint={
              overview?.worstLevel
                ? `أسوأ حالة: ${ELIAS_HEALTH_LEVEL_LABELS[overview.worstLevel]}`
                : "لا توجد تشخيصات بعد"
            }
          />
          <KpiCard
            label="أوامر صيانة مفتوحة"
            value={`${overview?.openWorkOrders ?? 0}`}
            hint={`${overview?.criticalWorkOrders ?? 0} حرجة`}
          />
          <KpiCard
            label="التشخيصات المسجلة"
            value={`${overview?.diagnosticsCount ?? 0}`}
            hint="سجل تراكمي"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted p-1 w-full grid grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="fleet">الأسطول</TabsTrigger>
            <TabsTrigger value="nodes">العقد</TabsTrigger>
            <TabsTrigger value="engines">المحركات</TabsTrigger>
            <TabsTrigger value="orders">أوامر الصيانة</TabsTrigger>
          </TabsList>

          {/* ─── Fleet ─── */}
          <TabsContent value="fleet" className="space-y-4">
            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand" /> أحدث نتائج التشخيص
                </CardTitle>
                <CardDescription className="text-xs">
                  لقطات صحة الأجهزة المحفوظة في سجل المؤسسة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(diagnostics.data ?? []).length === 0 && (
                  <EmptyState message="لا توجد تشخيصات بعد — سجّل عقدة ثم التقط تشخيصاً" />
                )}
                {(diagnostics.data ?? []).map(d => (
                  <DiagnosticRow key={d.id} diagnostic={d} />
                ))}
              </CardContent>
            </Card>

            {(overview?.topFindings?.length ?? 0) > 0 && (
              <Card className="surface">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" /> أهم
                    الملاحظات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overview!.topFindings.map(f => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold">{f.titleAr}</p>
                        <Badge
                          variant="outline"
                          className={
                            f.severity === "high"
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : f.severity === "medium"
                                ? "border-warning/30 bg-warning-soft text-warning"
                                : "border-border bg-muted text-muted-foreground"
                          }
                        >
                          {f.severity === "high"
                            ? "خطير"
                            : f.severity === "medium"
                              ? "متوسط"
                              : "منخفض"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {f.detailAr}
                      </p>
                      <p className="text-[11px] text-info mt-1">
                        الإجراء: {f.actionAr}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── Nodes ─── */}
          <TabsContent value="nodes" className="space-y-4">
            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand" /> تسجيل عقدة صيانة
                </CardTitle>
                <CardDescription className="text-xs">
                  العقدة المحاكاة تعمل بلا أجهزة فعلية — مثالية للتجربة والبيئات
                  المعزولة
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Field label="رمز العقدة">
                  <Input
                    value={nodeCode}
                    onChange={e => setNodeCode(e.target.value)}
                    placeholder="NODE-HQ-01"
                    className="h-9 text-xs font-mono"
                  />
                </Field>
                <Field label="الاسم">
                  <Input
                    value={nodeName}
                    onChange={e => setNodeName(e.target.value)}
                    placeholder="عقدة المقر الرئيسي"
                    className="h-9 text-xs"
                  />
                </Field>
                <Field label="عنوان العقدة">
                  <Input
                    value={nodeUrl}
                    onChange={e => setNodeUrl(e.target.value)}
                    placeholder="https://node.example.com"
                    className="h-9 text-xs font-mono"
                    disabled={simulated}
                  />
                </Field>
                <Field label="الرمز السري (اختياري)">
                  <Input
                    type="password"
                    value={nodeToken}
                    onChange={e => setNodeToken(e.target.value)}
                    placeholder="يُشفَّر عند الحفظ"
                    className="h-9 text-xs"
                    disabled={simulated}
                  />
                </Field>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-xs h-9">
                    <input
                      type="checkbox"
                      checked={simulated}
                      onChange={e => setSimulated(e.target.checked)}
                    />
                    عقدة محاكاة
                  </label>
                  <Button
                    className="h-9 flex-1 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
                    disabled={
                      registerNode.isPending ||
                      !nodeCode.trim() ||
                      !nodeName.trim()
                    }
                    onClick={() =>
                      registerNode.mutate({
                        code: nodeCode.trim(),
                        name: nodeName.trim(),
                        baseUrl:
                          nodeUrl.trim() ||
                          `https://simulated.invalid/${nodeCode.trim().toLowerCase()}`,
                        token: nodeToken.trim() || undefined,
                        isSimulated: simulated,
                      })
                    }
                  >
                    تسجيل
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm">سجل العقد</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">الرمز</TableHead>
                      <TableHead className="font-bold">الاسم</TableHead>
                      <TableHead className="font-bold">الحالة</TableHead>
                      <TableHead className="font-bold">آخر فحص</TableHead>
                      <TableHead className="font-bold">الدرجة</TableHead>
                      <TableHead className="font-bold">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodeList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState message="لا توجد عقد مسجلة" />
                        </TableCell>
                      </TableRow>
                    )}
                    {nodeList.map(n => (
                      <TableRow key={n.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">
                          {n.code}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {n.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {n.status === "active"
                              ? "متصل"
                              : n.status === "offline"
                                ? "غير متصل"
                                : n.status === "disabled"
                                  ? "معطّل"
                                  : "خطأ"}
                            {n.isSimulated ? " (محاكاة)" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {n.lastSeenAt
                            ? new Date(n.lastSeenAt).toLocaleString("ar")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {n.latestScore !== null ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${LEVEL_CLASS[n.latestLevel ?? "fair"]}`}
                            >
                              {n.latestScore}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={capture.isPending}
                              onClick={() => capture.mutate({ nodeId: n.id })}
                            >
                              <Cpu className="w-3.5 h-3.5 ml-1" /> تشخيص
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={removeNode.isPending}
                              onClick={() =>
                                removeNode.mutate({ nodeId: n.id })
                              }
                            >
                              تعطيل
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Engines ─── */}
          <TabsContent value="engines" className="space-y-4">
            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-brand" /> كتالوج محركات
                  الصيانة
                </CardTitle>
                <CardDescription className="text-xs">
                  المحركات عالية ومتوسطة الخطورة تتطلب إقراراً صريحاً قبل
                  التنفيذ
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(engines.data ?? []).map(e => {
                  const Icon = CATEGORY_ICONS[e.category] ?? Cpu;
                  const needsAck = e.risk === "medium" || e.risk === "high";
                  return (
                    <div
                      key={e.id}
                      className="rounded-lg border border-border bg-background p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-brand" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{e.labelAr}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {e.code}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            e.risk === "high"
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : e.risk === "medium"
                                ? "border-warning/30 bg-warning-soft text-warning"
                                : "border-border bg-muted text-muted-foreground"
                          }
                        >
                          {ELIAS_ENGINE_RISK_LABELS[e.risk]}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {e.descriptionAr}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {ELIAS_ENGINE_CATEGORY_LABELS[e.category]}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {activeNodes.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={runEngine.isPending}
                              onClick={() => {
                                const nodeId = activeNodes[0].id;
                                if (needsAck) {
                                  if (
                                    !window.confirm(
                                      `المحرك «${e.labelAr}» ${ELIAS_ENGINE_RISK_LABELS[e.risk]} — يغيّر حالة العقدة. هل تريد المتابعة؟`
                                    )
                                  )
                                    return;
                                }
                                runEngine.mutate({
                                  nodeId,
                                  engineId: e.id,
                                  acknowledgeRisk: needsAck,
                                });
                              }}
                            >
                              <HardDrive className="w-3.5 h-3.5 ml-1" /> تشغيل
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm">سجل تشغيل المحركات</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">المحرك</TableHead>
                      <TableHead className="font-bold">الحالة</TableHead>
                      <TableHead className="font-bold">المدة</TableHead>
                      <TableHead className="font-bold">الوقت</TableHead>
                      <TableHead className="font-bold">الخطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(engineRuns.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState message="لم تُشغَّل أي محركات بعد" />
                        </TableCell>
                      </TableRow>
                    )}
                    {(engineRuns.data ?? []).map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {r.engineCode}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.status === "success"
                                ? "bg-success-soft text-success border-success/20"
                                : r.status === "skipped"
                                  ? "bg-warning-soft text-warning border-warning/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">
                          {r.durationMs}ms
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {new Date(r.startedAt).toLocaleString("ar")}
                        </TableCell>
                        <TableCell className="text-[11px] text-destructive">
                          {r.error ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Work orders ─── */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand" /> أمر صيانة جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Field label="العنوان">
                  <Input
                    value={woTitle}
                    onChange={e => setWoTitle(e.target.value)}
                    placeholder="إصلاح جهاز اللابتوب"
                    className="h-9 text-xs"
                  />
                </Field>
                <Field label="العميل">
                  <Input
                    value={woCustomer}
                    onChange={e => setWoCustomer(e.target.value)}
                    placeholder="اسم العميل"
                    className="h-9 text-xs"
                  />
                </Field>
                <Field label="العقدة">
                  <select
                    value={woNodeId}
                    onChange={e => setWoNodeId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">— اختر العقدة —</option>
                    {activeNodes.map(n => (
                      <option key={n.id} value={String(n.id)}>
                        {n.code} — {n.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-end">
                  <Button
                    className="h-9 w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
                    disabled={
                      createWorkOrder.isPending || !woTitle.trim() || !woNodeId
                    }
                    onClick={() =>
                      createWorkOrder.mutate({
                        nodeId: Number(woNodeId),
                        title: woTitle.trim(),
                        customerName: woCustomer.trim() || null,
                      })
                    }
                  >
                    إنشاء
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="surface">
              <CardHeader>
                <CardTitle className="text-sm">أوامر الصيانة</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold">المرجع</TableHead>
                      <TableHead className="font-bold">العنوان</TableHead>
                      <TableHead className="font-bold">العميل</TableHead>
                      <TableHead className="font-bold">الحالة</TableHead>
                      <TableHead className="font-bold">تغيير الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(workOrders.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState message="لا توجد أوامر صيانة" />
                        </TableCell>
                      </TableRow>
                    )}
                    {(workOrders.data ?? []).map(w => (
                      <TableRow key={w.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">
                          {w.externalRef}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {w.title}
                        </TableCell>
                        <TableCell className="text-[11px]">
                          {w.customerName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {ELIAS_WORK_ORDER_STATUS_LABELS[w.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <select
                            value={w.status}
                            disabled={setWorkOrderStatus.isPending}
                            onChange={e =>
                              setWorkOrderStatus.mutate({
                                id: w.id,
                                status: e.target.value as typeof w.status,
                              })
                            }
                            className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
                          >
                            {Object.entries(ELIAS_WORK_ORDER_STATUS_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {String(label)}
                                </option>
                              )
                            )}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Local presentational pieces ──────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="surface p-4">
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-2xl font-black mt-1 font-mono">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-center text-xs text-muted-foreground py-8">{message}</p>
  );
}

function DiagnosticRow({ diagnostic }: { diagnostic: any }) {
  const level = (diagnostic.level ?? "fair") as EliasHealthLevel;
  const report = diagnostic.report ?? { areas: [] };
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold">{diagnostic.deviceLabel}</p>
          <span className="text-[10px] text-muted-foreground font-mono">
            {diagnostic.deviceKey}
          </span>
        </div>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${LEVEL_CLASS[level]}`}
        >
          {diagnostic.score}% — {ELIAS_HEALTH_LEVEL_LABELS[level]}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(report.areas ?? []).map((a: any) => (
          <div key={a.area} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{a.labelAr}</span>
              <span className="font-mono">{a.score}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${LEVEL_BAR[(a.status ?? "warn") as "ok" | "warn" | "critical"]}`}
                style={{ width: `${Math.max(2, Math.min(100, a.score))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {new Date(diagnostic.capturedAt).toLocaleString("ar")} —{" "}
        {diagnostic.source === "browser"
          ? "قياس من المتصفح"
          : "من عقدة الصيانة"}
      </p>
    </div>
  );
}
