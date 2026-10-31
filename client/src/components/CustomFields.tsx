import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  entityType: string;
  entityId: number | null;
  compact?: boolean;
}

export function CustomFields({ entityType, entityId, compact }: Props) {
  const utils = trpc.useUtils();
  const { data: defs } = trpc.modules.customFields.listDefs.useQuery(
    { entityType },
    { placeholderData: (p: any) => p }
  );
  const { data: values } = trpc.modules.customFields.getValues.useQuery(
    { entityType, entityId: entityId ?? 0 },
    { enabled: entityId != null, placeholderData: (p: any) => p }
  );
  const save = trpc.modules.customFields.saveValues.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الحقول الإضافية");
      utils.modules.customFields.getValues.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الحفظ"),
  });

  const [local, setLocal] = useState<Record<string, string>>({});
  useEffect(() => {
    // Server returns the values as a map: { [fieldKey]: string | null }
    const m: Record<string, string> = {};
    for (const [fieldKey, value] of Object.entries(values ?? {})) {
      m[fieldKey] = value ?? "";
    }
    setLocal(m);
  }, [values]);

  if (!defs || defs.length === 0) return null;

  const submit = () => {
    if (entityId == null) {
      toast.error("احفظ السجل الأساسي أولاً");
      return;
    }
    save.mutate({
      entityType,
      entityId,
      values: Object.entries(local).map(([fieldKey, value]) => ({
        fieldKey,
        value,
      })),
    });
  };

  return (
    <div
      className={
        compact
          ? "space-y-2"
          : "rounded-xl border border-border bg-card p-4 space-y-3"
      }
    >
      {!compact && (
        <h3 className="text-sm font-bold text-foreground">حقول إضافية</h3>
      )}
      {defs.map((d: any) => (
        <div key={d.id}>
          <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
            {d.label}
            {d.required ? " *" : ""}
          </label>
          {d.type === "select" ? (
            <select
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px]"
              value={local[d.key] ?? ""}
              onChange={e => setLocal(s => ({ ...s, [d.key]: e.target.value }))}
            >
              <option value="">—</option>
              {(d.options ? JSON.parse(d.options) : []).map(
                (o: string, i: number) => (
                  <option key={i} value={o}>
                    {o}
                  </option>
                )
              )}
            </select>
          ) : d.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={local[d.key] === "true"}
              onChange={e =>
                setLocal(s => ({
                  ...s,
                  [d.key]: e.target.checked ? "true" : "false",
                }))
              }
            />
          ) : (
            <Input
              className="h-9 text-[12px]"
              type={
                d.type === "number"
                  ? "number"
                  : d.type === "date"
                    ? "date"
                    : "text"
              }
              value={local[d.key] ?? ""}
              onChange={e => setLocal(s => ({ ...s, [d.key]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={submit}
        disabled={save.isPending || entityId == null}
      >
        حفظ الحقول الإضافية
      </Button>
    </div>
  );
}
