import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SlidersHorizontal, Plus, Trash2 } from "lucide-react";
import { CustomFields } from "@/components/CustomFields";

const ENTITY_TYPES = [
  { value: "account", label: "الحسابات" },
  { value: "product", label: "المنتجات" },
  { value: "customer", label: "العملاء" },
  { value: "employee", label: "الموظفون" },
  { value: "journal", label: "القيود المحاسبية" },
  { value: "salesInvoice", label: "فواتير البيع" },
  { value: "purchaseInvoice", label: "فواتير الشراء" },
  { value: "project", label: "المشاريع" },
];

const FIELD_TYPES = [
  { value: "text", label: "نص" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "select", label: "قائمة منسدلة" },
  { value: "checkbox", label: "صح/خطأ" },
];

export default function Customization() {
  const { isAdmin } = usePermissions();
  const utils = trpc.useUtils();
  const [entityType, setEntityType] = useState("account");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);

  const { data: defs, isPending } = trpc.modules.customFields.listDefs.useQuery(
    { entityType },
    { placeholderData: (p: any) => p }
  );

  const createDef = trpc.modules.customFields.createDef.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الحقل المخصص");
      setLabel("");
      setKey("");
      setOptions("");
      utils.modules.customFields.listDefs.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الإضافة")),
  });
  const deleteDef = trpc.modules.customFields.deleteDef.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحقل");
      utils.modules.customFields.listDefs.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الحذف")),
  });

  const addField = () => {
    if (!label.trim()) {
      toast.error("أدخل اسم الحقل");
      return;
    }
    const k = (key.trim() || label.trim())
      .replace(/\s+/g, "_")
      .replace(/[^\w]/g, "")
      .toLowerCase();
    createDef.mutate({
      entityType,
      key: k,
      label: label.trim(),
      type,
      options: type === "select" ? options : undefined,
      required,
    });
  };

  if (!isAdmin) return <DeniedScreen />;

  return (
    <div className="min-h-screen flex">
      <main className="flex-1 bg-muted">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-white">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                التخصيص والحقول الإضافية
              </h1>
              <p className="text-sm text-muted-foreground">
                أضف حقولاً مخصصة لأي كيان تشغيلي دون تعديل هياكل النظام — مرونة
                وتخصيص بحسب نشاطكم
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
          {/* entity selector + defs */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <label className="block text-[11px] font-bold text-muted-foreground">
                  نوع الكيان
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[13px]"
                  value={entityType}
                  onChange={e => setEntityType(e.target.value)}
                >
                  {ENTITY_TYPES.map(e => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>

                <div className="mt-2 space-y-2">
                  {isPending ? (
                    <p className="text-[12px] text-muted-foreground">
                      جاري التحميل...
                    </p>
                  ) : (defs ?? []).length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">
                      لا توجد حقول مخصصة لهذا الكيان بعد.
                    </p>
                  ) : (
                    (defs ?? []).map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted p-3"
                      >
                        <div>
                          <div className="text-[13px] font-bold text-foreground">
                            {d.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {d.key} ·{" "}
                            {FIELD_TYPES.find(t => t.value === d.type)?.label}
                            {d.required ? " · إلزامي" : ""}
                            {d.isActive ? "" : " · معطّل"}
                          </div>
                        </div>
                        <button onClick={() => deleteDef.mutate({ id: d.id })}>
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* add field + preview */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-bold text-foreground">
                  إضافة حقل جديد
                </h3>
                <Input
                  className="h-9 text-[12px]"
                  placeholder="اسم الحقل (مثل: رقم الرخصة)"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                />
                <Input
                  className="h-9 text-[12px]"
                  placeholder="المفتاح (اختياري - يُولّد تلقائياً)"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                />
                <select
                  className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[12px]"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {type === "select" && (
                  <Input
                    className="h-9 text-[12px]"
                    placeholder="الخيارات مفصولة بفاصلة (أ، ب، ج)"
                    value={options}
                    onChange={e => setOptions(e.target.value)}
                  />
                )}
                <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={e => setRequired(e.target.checked)}
                  />
                  حقل إلزامي
                </label>
                <Button
                  size="sm"
                  className="w-full bg-muted text-white hover:bg-muted"
                  onClick={addField}
                  disabled={createDef.isPending}
                >
                  <Plus className="h-4 w-4" /> إضافة الحقل
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="mb-2 text-sm font-bold text-foreground">
                  معاينة حية (
                  {ENTITY_TYPES.find(e => e.value === entityType)?.label})
                </h3>
                <CustomFields entityType={entityType} entityId={0} compact />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
