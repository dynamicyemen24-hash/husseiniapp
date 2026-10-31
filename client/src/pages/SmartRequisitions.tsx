/**
 * Smart Requisitions Page - World-Class UX with premium components.
 */

import * as React from "react";
import { SmartCombobox } from "@/components/ui/smartCombobox";
import { StatusStrip } from "@/components/ui/loading";
import {
  useCustomerSearch,
  useProductSearch,
  useDocumentNumber,
} from "@/hooks/useSmartSearch";
import { formatCurrency } from "@shared/autoComplete";
import { trpc } from "@/lib/trpc";
import {
  GlassCard,
  GlassBadge,
  EmptyRequisitions,
  LoadingSpinner,
  SmartHelp,
  AnimatedCard,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui";
import { Plus, Check, Clock, Search, Users, Package } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SmartRequisitions() {
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [productQuery, setProductQuery] = React.useState("");
  const customerSearch = useCustomerSearch(customerQuery);
  const productSearch = useProductSearch(productQuery);
  const docNumberQuery = useDocumentNumber("requisitions");
  const docNumber = docNumberQuery.data?.number ?? "REQ-…";

  const utils = trpc.useUtils();

  const createProcurement = trpc.erp.createProcurement.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال الطلب بنجاح للموافقة");
      utils.erp.getProcurementKpis.refetch();
      utils.erp.listProcurements.refetch();
      setRows([
        { id: String(Date.now()), product: "", qty: 1, unitPrice: 0, total: 0 },
      ]);
      setSelectedCustomer("");
      setEmployeeName("");
      docNumberQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const customerOptions = React.useMemo(
    () =>
      (customerSearch.data ?? []).map(c => ({
        value: c.id,
        label: c.name,
        code: c.code,
      })),
    [customerSearch.data]
  );

  const productOptions = React.useMemo(
    () =>
      (productSearch.data ?? []).map(p => ({
        value: p.id,
        label: p.name,
        code: p.code,
      })),
    [productSearch.data]
  );

  const [selectedCustomer, setSelectedCustomer] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState("");
  const [rows, setRows] = React.useState([
    { id: "1", product: "", qty: 1, unitPrice: 0, total: 0 },
  ]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { id: String(Date.now()), product: "", qty: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const isLoading = customerSearch.isLoading || productSearch.isLoading;

  const submit = () => {
    const noMarketRows = rows.filter(r => r.product.trim() !== "");
    if (noMarketRows.length === 0) {
      toast.error("أضف منتجاً واحداً على الأقل قبل الإرسال");
      return;
    }
    if (!selectedCustomer) {
      toast.error("اختر الزبون قبل الإرسال");
      return;
    }
    createProcurement.mutate({
      itemName:
        noMarketRows.length === 1
          ? noMarketRows[0].product
          : `طلب شامل (${noMarketRows.length} منتجات)`,
      description: `${employeeName ? `مقدم الطلب: ${employeeName} — ` : ""}${noMarketRows
        .map(r => `${r.product} × ${r.qty}`)
        .join("، ")}`,
      quantity: String(noMarketRows.reduce((s, r) => s + r.qty, 0)),
      estimatedCost: String(grandTotal),
      currency: "YER",
      supplierId: selectedCustomer ? Number(selectedCustomer) : undefined,
    });
  };

  return (
    <motion.div
      className="space-y-6 p-6"
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              طلب مستلزمات
            </h1>
            <p className="text-sm text-neutral-500 mt-1">{docNumber}</p>
          </div>
          <div className="flex gap-2">
            <Tooltip
              id="req-status"
              title="حالة الطلب"
              description="الطلب حاليًا في مرحلة الإعداد والمراجعة"
            >
              <TooltipTrigger>
                <StatusStrip status="warning">
                  <Clock className="size-3 mr-1" />
                  قيد الإعداد
                </StatusStrip>
              </TooltipTrigger>
              <TooltipContent
                title="حالة الطلب"
                description="الطلب حاليًا في مرحلة الإعداد والمراجعة"
              />
            </Tooltip>
            <Tooltip
              id="req-submit"
              title="إرسال الطلب"
              description="اضغط لإرسال طلب المستلزمات للموافقة"
            >
              <TooltipTrigger>
                <button
                  onClick={submit}
                  disabled={createProcurement.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-600 disabled:opacity-50"
                >
                  <Check className="size-4" />
                  {createProcurement.isPending ? "جارِ الإرسال…" : "إرسال"}
                </button>
              </TooltipTrigger>
              <TooltipContent
                title="إرسال الطلب"
                description="سيتم إرسال الطلب للموافقة"
              />
            </Tooltip>
          </div>
        </div>
      </motion.div>

      {/* AI Help Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <SmartHelp
          title="إرشادات طلب المستلزمات"
          description="اتبع الخطوات التالية لإنشاء طلب مستلزمات صحيح"
          steps={[
            "حدد الزبون من القائمة أو ابحث عنه",
            "أضف المنتجات المطلوبة مع الكميات",
            "راجع الإجمالي وتأكد من الأسعار",
            "أرسل الطلب للموافقة",
          ]}
        />
      </motion.div>

      {/* Document Info */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard padding="p-4">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            رقم الطلب
          </label>
          <p className="text-lg font-mono font-bold text-brand mt-1">
            {docNumber}
          </p>
        </GlassCard>
        <GlassCard padding="p-4">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            التاريخ
          </label>
          <p className="text-lg font-bold text-neutral-900 mt-1">
            {new Date().toLocaleDateString("ar-SA")}
          </p>
        </GlassCard>
        <GlassCard padding="p-4">
          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            الإجمالي
          </label>
          <p className="text-lg font-bold text-neutral-900 mt-1">
            {formatCurrency(grandTotal)}
          </p>
        </GlassCard>
      </motion.div>

      {/* Customer Selection */}
      <motion.div
        className="grid grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <GlassCard padding="p-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            الزبون / المورد
          </label>
          <SmartCombobox
            options={customerOptions}
            value={selectedCustomer}
            onChange={val => {
              setSelectedCustomer(val);
              setCustomerQuery("");
            }}
            placeholder="اختر الزبون أو ابحث..."
            searchPlaceholder="بحث عن الزبون..."
            loading={customerSearch.isLoading}
            ariaDescription="اختر الزبون من القائمة أو ابحث بالاسم"
          />
          {customerSearch.data && customerSearch.data.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              {customerSearch.data.length} نتيجة
            </p>
          )}
        </GlassCard>
        <GlassCard padding="p-4">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            الموظف المقدم
          </label>
          <Tooltip
            id="employee-hint"
            title="الموظف المقدم"
            description="أدخل اسم الموظف الذي يقدم الطلب"
          >
            <TooltipTrigger>
              <input
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                placeholder="اسم الموظف..."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
            </TooltipTrigger>
            <TooltipContent
              title="الموظف المقدم"
              description="أدخل اسم الموظف الذي يقدم الطلب"
            />
          </Tooltip>
        </GlassCard>
      </motion.div>

      {/* Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-neutral-700">
            المنتجات المطلوبة
          </label>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-brand-500 hover:text-brand"
          >
            <Plus className="size-4" />
            منتج جديد
          </button>
        </div>

        {rows.length === 0 ? (
          <EmptyRequisitions />
        ) : (
          <AnimatedCard>
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table
                className="w-full"
                role="grid"
                aria-label="المنتجات المطلوبة"
              >
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="p-3 text-left text-xs font-semibold text-neutral-700">
                      المنتج
                    </th>
                    <th className="p-3 text-center text-xs font-semibold text-neutral-700 w-20">
                      الكمية
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-neutral-700">
                      السعر
                    </th>
                    <th className="p-3 text-right text-xs font-semibold text-neutral-700">
                      الإجمالي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      className="border-t border-neutral-100 hover:bg-brand-50/50 transition-colors"
                    >
                      <td className="p-3">
                        <SmartCombobox
                          options={productOptions}
                          value={row.product}
                          onChange={val => {
                            const product = productSearch.data?.find(
                              p => p.id === val
                            );
                            const price = Number(product?.salePrice ?? 0);
                            setRows(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? {
                                      ...r,
                                      product: val,
                                      unitPrice: price,
                                      total: r.qty * price,
                                    }
                                  : r
                              )
                            );
                          }}
                          placeholder="اختر المنتج..."
                          searchPlaceholder="بحث عن المنتج..."
                          loading={productSearch.isLoading}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={row.qty}
                          min={1}
                          onChange={e => {
                            const qty = Math.max(1, Number(e.target.value));
                            setRows(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? { ...r, qty, total: qty * r.unitPrice }
                                  : r
                              )
                            );
                          }}
                          className="w-16 rounded border border-neutral-300 px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="p-3 text-right font-mono text-sm">
                        {formatCurrency(row.unitPrice)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-sm">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        )}
      </motion.div>

      {/* Summary */}
      <motion.div
        className="rounded-xl border border-neutral-200 bg-white p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-neutral-700">
            إجمالي الطلب
          </span>
          <span className="text-2xl font-bold text-brand">
            {formatCurrency(grandTotal)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
          <Search className="size-4" />
          <span>
            {rows.length} منتج
            {rows.length !== 1 ? "ات" : ""}
          </span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex justify-end gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <button className="rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
          حفظ كمسودة
        </button>
        <button
          onClick={submit}
          disabled={createProcurement.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          <Check className="size-4" />
          {createProcurement.isPending ? "جارِ الإرسال…" : "إرسال الطلب"}
        </button>
      </motion.div>
    </motion.div>
  );
}
