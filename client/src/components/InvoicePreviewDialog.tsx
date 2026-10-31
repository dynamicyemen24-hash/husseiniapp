import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/modules/pos/utils/currency";

/** سطر قيد المراجعة — نفس شكل بنود الفاتورة المرسلة للحفظ. */
export interface PreviewLine {
  /** معرّف السطر في المصدر (سلة POS) لتمكين المطابقة عند التعديل. */
  id?: string;
  productId: number;
  productName?: string;
  quantity: number;
  /** السعر كنص حتى لا تُفقد الدقة العشرية. */
  unitPrice: string;
  /** خصم السطر كمبلغ. */
  discount: string;
  taxPct?: number;
  unitId?: number;
  unitName?: string;
}

export interface PreviewTotals {
  subtotal: number;
  discountTotal: number;
  lineTaxTotal: number;
  headerTax: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  remaining: number;
  baseGrandTotal: number;
}

export interface PreviewIssue {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  lineIndex?: number;
}

/** اسم بديل شائع الاستخدام في صفحات الفواتير. */
export type InvoicePreviewLine = PreviewLine;

export interface InvoicePreviewHeader {
  discount: string;
  taxRate: string;
  paidAmount: string;
  currency: string;
  currencyRate: string;
  customerId?: number;
  branchId?: number;
  warehouseId?: number | null;
  countryCode?: string;
}

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: "sale" | "purchase" | "order";
  title?: string;
  description?: string;
  lines: PreviewLine[];
  header: InvoicePreviewHeader;
  /** يُستدعى عند تعديل المستخدم لسطر — المصدر الوحيد للحقيقة يبقى في الصفحة. */
  onLinesChange: (lines: PreviewLine[]) => void;
  /** يستقبل البنود بعد التعديل لاستخدامها في الحفظ. */
  onConfirm: (lines: PreviewLine[]) => void;
  onCancel?: () => void;
  isSaving: boolean;
  confirmLabel?: string;
  decimals?: number;
}

const SEVERITY_STYLES: Record<PreviewIssue["severity"], string> = {
  error: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
};

/**
 * نافذة المراجعة قبل الحفظ: تُظهر البنود القابلة للتعديل، تحسب الإجماليات
 * عبر نفس محرك الخادم (invoiceEnhancements.previewSalesInvoice)، وتعرض
 * الأخطاء والتحذيرات قبل أن يسمح زر الحفظ.
 */
export function InvoicePreviewDialog({
  open,
  onOpenChange,
  kind = "sale",
  title = "مراجعة الفاتورة قبل الحفظ",
  description = "راجع البنود والإجماليات، عدّل ما يلزم، ثم أكّد الحفظ.",
  lines,
  header,
  onLinesChange,
  onConfirm,
  onCancel,
  isSaving,
  confirmLabel = "حفظ الفاتورة",
  decimals = 2,
}: InvoicePreviewDialogProps) {
  // أحدث نسخة من البنود — تضمن أن الحفظ يستخدم ما عدّله المستخدم فعلياً
  const linesRef = useRef<PreviewLine[]>(lines);
  linesRef.current = lines;
  const previewMutation =
    trpc.invoiceEnhancements.previewSalesInvoice.useMutation();
  const [result, setResult] = useState<{
    totals: PreviewTotals;
    issues: PreviewIssue[];
    canSave: boolean;
  } | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const requestIdRef = useRef(0);

  const payload = useMemo(
    () => ({
      customerId: header.customerId,
      branchId: header.branchId,
      warehouseId: header.warehouseId ?? undefined,
      countryCode: header.countryCode,
      items: lines.map(l => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
        taxPct: l.taxPct,
        unitId: l.unitId,
      })),
      discount: header.discount,
      taxRate: header.taxRate,
      paidAmount: header.paidAmount,
      currency: header.currency,
      currencyRate: header.currencyRate,
    }),
    [lines, header]
  );

  // Debounced server-side validation: every edit re-runs the shared engine.
  useEffect(() => {
    if (!open || lines.length === 0) {
      setResult(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    setCheckFailed(false);
    const timer = setTimeout(() => {
      previewMutation
        .mutateAsync(payload)
        .then(res => {
          if (requestId !== requestIdRef.current) return;
          setResult({
            totals: res.totals,
            issues: res.issues,
            canSave: res.canSave,
          });
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setResult(null);
          setCheckFailed(true);
        });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload]);

  const issues = result?.issues ?? [];
  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");
  const infos = issues.filter(i => i.severity === "info");
  const totals = result?.totals;
  const canSave = result ? result.canSave : !checkFailed;
  const isChecking = previewMutation.isPending || (!result && !checkFailed);

  const fmt = (value: number) =>
    formatCurrency(value, header.currency, decimals, "ar-YE");

  const patchLine = (index: number, patch: Partial<PreviewLine>) => {
    const next = lines.map((line, i) =>
      i === index ? { ...line, ...patch } : line
    );
    onLinesChange(next);
  };

  const removeLine = (index: number) => {
    onLinesChange(lines.filter((_, i) => i !== index));
  };

  const lineIssuesFor = (index: number) =>
    issues.filter(i => i.lineIndex === index && i.severity !== "info");

  // ─── إضافة صنف جديد أثناء المراجعة ───────────────────────────────
  const [addQuery, setAddQuery] = useState("");
  const [debouncedAddQuery, setDebouncedAddQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAddQuery(addQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [addQuery]);

  const productSearch = trpc.products.list.useQuery(
    { search: debouncedAddQuery || undefined, limit: 8, offset: 0 },
    {
      enabled: open && debouncedAddQuery.length >= 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );
  const searchResults = (productSearch.data?.items ?? []) as unknown as Array<{
    id: number;
    name: string;
    code: string;
    type: "goods" | "service";
    salePrice: string | null;
    unitOfMeasure?: string | null;
    currentStock?: number | null;
  }>;

  const addProductLine = (product: (typeof searchResults)[number]) => {
    const taxPct = product.type === "service" ? 0 : Number(header.taxRate) || 0;
    onLinesChange([
      ...lines,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: String(Number(product.salePrice ?? 0) || 0),
        discount: "0",
        taxPct,
        unitName: product.unitOfMeasure ?? undefined,
      },
    ]);
    setAddQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* ─── تنبيهات التحقق ─── */}
        <div className="space-y-1.5">
          {errors.map((issue, i) => (
            <div
              key={`e-${issue.code}-${i}`}
              className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${SEVERITY_STYLES.error}`}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
          {warnings.map((issue, i) => (
            <div
              key={`w-${issue.code}-${i}`}
              className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${SEVERITY_STYLES.warning}`}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
          {infos.map((issue, i) => (
            <div
              key={`i-${issue.code}-${i}`}
              className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${SEVERITY_STYLES.info}`}
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
          {checkFailed && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                تعذّر الاتصال بخدمة التحقق — راجع البنود يدوياً قبل الحفظ.
              </span>
            </div>
          )}
        </div>
        {/* ─── إضافة صنف أثناء المراجعة ─── */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addQuery}
                onChange={e => setAddQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الكود أو الباركود لإضافة صنف..."
                className="h-8 pr-7 text-[11px]"
              />
            </div>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Plus className="h-3 w-3" /> إضافة بند
            </Badge>
          </div>
          {debouncedAddQuery.length >= 1 && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-background">
              {productSearch.isPending ? (
                <p className="px-2 py-2 text-[10px] text-muted-foreground">
                  جاري البحث...
                </p>
              ) : searchResults.length === 0 ? (
                <p className="px-2 py-2 text-[10px] text-muted-foreground">
                  لا نتائج مطابقة
                </p>
              ) : (
                searchResults.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductLine(p)}
                    className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-right text-[11px] hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {p.name}
                      {p.type === "service" && (
                        <span className="mr-1 text-[9px] text-blue-600">
                          · خدمة
                        </span>
                      )}
                      <span className="mr-1 text-[9px] text-muted-foreground">
                        {p.code}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold" dir="ltr">
                      {fmt(Number(p.salePrice ?? 0) || 0)}
                    </span>
                    <Plus className="h-3 w-3 shrink-0 text-emerald-600" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ─── البنود القابلة للتعديل ─── */}
        <ScrollArea className="max-h-[44vh] pr-2">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_60px_96px_84px_72px_28px] gap-2 px-1 text-[10px] font-bold text-muted-foreground">
              <span>الصنف</span>
              <span className="text-center">الكمية</span>
              <span className="text-center">السعر</span>
              <span className="text-center">خصم</span>
              <span className="text-center">إجمالي</span>
              <span />
            </div>
            {lines.map((line, idx) => {
              const qty = Number(line.quantity) || 0;
              const price = Number(line.unitPrice) || 0;
              const discount = Math.min(
                Number(line.discount) || 0,
                qty * price
              );
              const net = qty * price - discount;
              const taxPct = Number(line.taxPct ?? header.taxRate) || 0;
              const lineTotal = net + (net * taxPct) / 100;
              const lineIssues = lineIssuesFor(idx);
              return (
                <div
                  key={line.id ?? `${line.productId}-${idx}`}
                  className="space-y-1"
                >
                  <div
                    className={`grid grid-cols-[1fr_60px_96px_84px_72px_28px] items-center gap-2 rounded-md border px-1.5 py-1 ${
                      lineIssues.length
                        ? "border-red-200 bg-red-50/40"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">
                        {line.productName ?? `صنف #${line.productId}`}
                      </p>
                      {line.unitName && (
                        <p className="truncate text-[9px] text-muted-foreground">
                          {line.unitName}
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={e =>
                        patchLine(idx, {
                          quantity: Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1)
                          ),
                        })
                      }
                      className="h-7 px-1 text-center text-[11px]"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={e =>
                        patchLine(idx, { unitPrice: e.target.value })
                      }
                      className="h-7 px-1 text-[11px]"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.discount}
                      onChange={e =>
                        patchLine(idx, { discount: e.target.value })
                      }
                      className="h-7 px-1 text-[11px]"
                    />
                    <span
                      className="text-center text-[11px] font-bold"
                      dir="ltr"
                    >
                      {fmt(lineTotal)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600"
                      aria-label="حذف البند"
                      onClick={() => removeLine(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {lineIssues.map((issue, i) => (
                    <p key={i} className="px-1 text-[10px] text-red-600">
                      • {issue.message}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* ─── ملخص الإجماليات ─── */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="font-semibold">
              {totals ? fmt(totals.subtotal) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">إجمالي الخصم</span>
            <span className="font-semibold text-red-600">
              {totals ? fmt(totals.discountTotal) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الضريبة</span>
            <span className="font-semibold">
              {totals ? fmt(totals.taxTotal) : "—"}
            </span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between text-[13px]">
            <span className="font-bold">الإجمالي النهائي</span>
            <span className="font-bold text-emerald-700">
              {totals ? fmt(totals.grandTotal) : "—"}
            </span>
          </div>
          {totals && totals.paidAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">المدفوع</span>
              <span className="font-semibold">{fmt(totals.paidAmount)}</span>
            </div>
          )}
          {totals && totals.remaining > 0.009 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">المتبقي (آجل)</span>
              <span className="font-semibold text-amber-700">
                {fmt(totals.remaining)}
              </span>
            </div>
          )}
          {totals && Number(header.currencyRate) !== 1 && (
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>المعادل بالعملة الأساسية (× {header.currencyRate})</span>
              <span dir="ltr">{totals.baseGrandTotal}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {isChecking ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Loader2 className="h-3 w-3 animate-spin" /> جاري التحقق...
              </Badge>
            ) : canSave ? (
              <Badge className="gap-1 bg-emerald-100 text-[10px] text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> جاهز للحفظ
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertTriangle className="h-3 w-3" /> عالج الأخطاء أولاً
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Pencil className="h-3 w-3" /> {lines.length} بند
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
              disabled={isSaving}
            >
              رجوع للتعديل
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={() => onConfirm(linesRef.current)}
              disabled={isSaving || lines.length === 0 || !canSave}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الحفظ...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
