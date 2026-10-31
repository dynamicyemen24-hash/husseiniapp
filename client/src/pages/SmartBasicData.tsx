/**
 * Smart Basic Data Page - World-Class UX with premium components.
 */

import * as React from "react";
import { SmartCombobox } from "@/components/ui/smartCombobox";
import { SmartDataGrid } from "@/components/ui/smartDataGrid";
import { StatusStrip } from "@/components/ui/loading";
import { useCustomerSearch, useProductSearch } from "@/hooks/useSmartSearch";
import { trpc } from "@/lib/trpc";
import {
  GlassPanel,
  GlassCard,
  GlassBadge,
  EmptyCustomers,
  EmptyProducts,
  LoadingSpinner,
  SmartHelp,
  StatusIndicator,
  AnimatedCard,
} from "@/components/ui";
import { Search, Plus, Users, Package, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SmartBasicData() {
  const [activeTab, setActiveTab] = React.useState<"customers" | "products">(
    "customers"
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [query, setQuery] = React.useState("");
  const customerSearch = useCustomerSearch(query);
  const productSearch = useProductSearch(query);

  const utils = trpc.useUtils();

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة العميل بنجاح");
      utils.modules.customers.list.invalidate();
      if (query) customerSearch.refetch();
      setShowCreate(false);
      setForm({ code: "", name: "", phone: "", email: "", address: "" });
    },
    onError: err => toast.error(err.message),
  });

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة المنتج بنجاح");
      utils.modules.products.list.invalidate();
      if (query) productSearch.refetch();
      setShowCreate(false);
      setForm({
        code: "",
        name: "",
        salePrice: "0",
        purchasePrice: "0",
        unit: "قطعة",
      });
    },
    onError: err => toast.error(err.message),
  });

  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState<Record<string, string>>({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    salePrice: "0",
    purchasePrice: "0",
    unit: "قطعة",
  });

  const setF = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submitCreate = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("الرمز والاسم مطلوبان");
      return;
    }
    if (activeTab === "customers") {
      createCustomer.mutate({
        code: form.code.trim(),
        name: form.name.trim(),
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
      });
    } else {
      createProduct.mutate({
        code: form.code.trim(),
        name: form.name.trim(),
        salePrice: form.salePrice || "0",
        purchasePrice: form.purchasePrice || "0",
        unit: form.unit || "قطعة",
      });
    }
  };

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

  const gridData = React.useMemo(() => {
    if (activeTab === "customers") {
      return (customerSearch.data ?? []).map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        details: c.email ?? "",
        status: "active" as const,
      }));
    }
    return (productSearch.data ?? []).map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      details: p.category ?? "",
      status: "active" as const,
    }));
  }, [activeTab, customerSearch.data, productSearch.data]);

  const columns = React.useMemo(
    () => [
      {
        key: "code",
        header: "الرمز",
        width: 80,
        render: (val: string) => (
          <span className="font-mono text-sm">{val}</span>
        ),
      },
      {
        key: "name",
        header: "الاسم",
        width: 200,
        render: (val: string) => <span className="font-medium">{val}</span>,
      },
      {
        key: "details",
        header: "التفاصيل",
      },
      {
        key: "status",
        header: "الحالة",
        width: 100,
        render: (val: string) =>
          val === "active" ? (
            <GlassBadge variant="success">نشط</GlassBadge>
          ) : (
            <GlassBadge variant="default">غير نشط</GlassBadge>
          ),
      },
    ],
    []
  );

  const isLoading = customerSearch.isLoading || productSearch.isLoading;
  const totalCount =
    activeTab === "customers"
      ? customerSearch.data?.length
      : productSearch.data?.length;
  const isCreating =
    activeTab === "customers"
      ? createCustomer.isPending
      : createProduct.isPending;

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
          <div className="flex items-center gap-3">
            {activeTab === "customers" ? (
              <GlassCard padding="p-3" hover={false}>
                <Users className="size-8 text-brand-500" />
              </GlassCard>
            ) : (
              <GlassCard padding="p-3" hover={false}>
                <Package className="size-8 text-brand-500" />
              </GlassCard>
            )}
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {activeTab === "customers" ? "العملاء" : "المنتجات"}
              </h1>
              <p className="text-sm text-neutral-500">
                إدارة البيانات الأساسية
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-600"
          >
            <Plus className="size-4" />
            {showCreate ? "إغلاق" : "إضافة جديد"}
          </button>
        </div>
      </motion.div>

      {/* AI Help */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <SmartHelp
          title="إرشادات إدارة البيانات الأساسية"
          description="استخدم هذه الأدوات لإدارة العملاء والمنتجات بكفاءة"
          steps={[
            "استخدم شريط البحث للعثور على بيانات محددة",
            "يمكنك إضافة عملاء أو منتجات جدد",
            "استخدم جدول البيانات لتصفية وتعديل البيانات",
            "استخدم التصدير لحفظ البيانات كملف CSV",
          ]}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="inline-flex rounded-lg border border-neutral-200 bg-white p-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {[
          { key: "customers" as const, label: "العملاء", icon: Users },
          { key: "products" as const, label: "المنتجات", icon: Package },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
            <StatusIndicator
              status={isLoading ? "loading" : "success"}
              label={
                activeTab === "customers"
                  ? `${customerSearch.data?.length ?? 0}`
                  : `${productSearch.data?.length ?? 0}`
              }
            />
          </button>
        ))}
      </motion.div>

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface rounded-2xl p-5 border border-brand/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-900">
              {activeTab === "customers" ? "عميل جديد" : "منتج جديد"}
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-neutral-400 hover:text-neutral-600"
              aria-label="إغلاق النموذج"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                الرمز *
              </span>
              <input
                value={form.code}
                onChange={e => setF("code")(e.target.value)}
                placeholder="CUST-001"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-neutral-600">
                الاسم *
              </span>
              <input
                value={form.name}
                onChange={e => setF("name")(e.target.value)}
                placeholder="الاسم الكامل"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            {activeTab === "customers" ? (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">
                    الهاتف
                  </span>
                  <input
                    value={form.phone}
                    onChange={e => setF("phone")(e.target.value)}
                    dir="ltr"
                    placeholder="+967..."
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">
                    البريد
                  </span>
                  <input
                    value={form.email}
                    onChange={e => setF("email")(e.target.value)}
                    dir="ltr"
                    placeholder="email@example.com"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-neutral-600">
                    العنوان
                  </span>
                  <input
                    value={form.address}
                    onChange={e => setF("address")(e.target.value)}
                    placeholder="العنوان"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">
                    سعر البيع
                  </span>
                  <input
                    value={form.salePrice}
                    onChange={e => setF("salePrice")(e.target.value)}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">
                    سعر الشراء
                  </span>
                  <input
                    value={form.purchasePrice}
                    onChange={e => setF("purchasePrice")(e.target.value)}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-neutral-600">
                    الوحدة
                  </span>
                  <input
                    value={form.unit}
                    onChange={e => setF("unit")(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              إلغاء
            </button>
            <button
              onClick={submitCreate}
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {isCreating ? "جارِ الإضافة…" : "حفظ"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        className="relative max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          placeholder="بحث سريع..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          aria-label="بحث سريع"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute left-10 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            aria-label="مسح البحث"
          >
            ✕
          </button>
        )}
      </motion.div>

      {/* Data Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div
                  className="h-4 rounded bg-neutral-200 dark:bg-neutral-800"
                  style={{ width: "20%" }}
                />
                <div
                  className="h-4 rounded bg-neutral-200 dark:bg-neutral-800"
                  style={{ width: "15%" }}
                />
                <div
                  className="h-4 rounded bg-neutral-200 dark:bg-neutral-800"
                  style={{ width: "15%" }}
                />
                <div
                  className="h-4 rounded bg-neutral-200 dark:bg-neutral-800"
                  style={{ width: "15%" }}
                />
              </div>
            ))}
          </div>
        ) : gridData.length === 0 ? (
          activeTab === "customers" ? (
            <EmptyCustomers />
          ) : (
            <EmptyProducts />
          )
        ) : (
          <GlassPanel
            header={
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900">
                  {activeTab === "customers"
                    ? "قائمة العملاء"
                    : "قائمة المنتجات"}
                </span>
                <GlassBadge variant="brand">{totalCount} عنصر</GlassBadge>
              </div>
            }
          >
            <SmartDataGrid
              data={gridData}
              columns={columns}
              pageSize={20}
              searchPlaceholder="بحث في البيانات..."
              totalCount={totalCount}
            />
          </GlassPanel>
        )}
      </motion.div>
    </motion.div>
  );
}
