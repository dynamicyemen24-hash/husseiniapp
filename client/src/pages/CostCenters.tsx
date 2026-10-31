import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { toast } from "sonner";
import { MapPin, Plus, Trash2, Building2, Layers } from "lucide-react";

export default function CostCenters() {
  const utils = trpc.useUtils();
  const list = trpc.costCenters.list.useQuery(undefined, { staleTime: 30_000 });
  const create = trpc.costCenters.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء مركز التكلفة");
      utils.costCenters.list.invalidate();
      setCode("");
      setName("");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });
  const remove = trpc.costCenters.remove.useMutation({
    onSuccess: () => {
      toast.success("تم الحذف");
      utils.costCenters.list.invalidate();
    },
  });

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">مراكز التكلفة — شجرة هرمية</h1>
            <p className="text-xs text-muted-foreground">
              تُربط بالقيود والمشاريع والفروع — تكامل مع الأدوار وحدود التعامل
            </p>
          </div>
          <Badge className="bg-brand text-ink-deep font-bold">
            {list.data?.length ?? 0} مركزاً
          </Badge>
        </div>

        <Card className="surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4 text-brand" /> إضافة مركز تكلفة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">الكود</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="CC-ADMIN"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الاسم</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="الإدارة العامة"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الأب (اختياري)</Label>
              <select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">— بدون أب (جذر) —</option>
                {(list.data ?? []).map((c: any) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  if (!code.trim() || !name.trim())
                    return toast.error("أدخل الكود والاسم");
                  create.mutate({
                    code: code.trim(),
                    name: name.trim(),
                    parentId: parentId ? Number(parentId) : null,
                  });
                }}
                disabled={create.isPending}
                className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold h-9"
              >
                إضافة
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(list.data ?? []).map((c: any) => (
            <Card key={c.id} className="surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="font-bold text-xs flex items-center gap-1">
                      {c.name}{" "}
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {c.code}
                      </Badge>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {(c as any).type || (c as any).costType || "cost"}{" "}
                      {c.parentId ? `· أب: ${c.parentId}` : "· جذر"}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-red-500"
                  onClick={() => remove.mutate({ id: c.id })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {(c as any).budgetAmount &&
                Number((c as any).budgetAmount) > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    ميزانية: {Number((c as any).budgetAmount).toLocaleString()}{" "}
                    ر.ي
                  </p>
                )}
            </Card>
          ))}
          {list.isLoading && (
            <p className="text-xs text-muted-foreground">جاري التحميل…</p>
          )}
          {!list.isLoading && (list.data ?? []).length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-8">
              <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                لا توجد مراكز بعد — أضف أول مركز لربطه بالقيود
              </p>
            </div>
          )}
        </div>

        <Card className="bg-ink text-white">
          <CardContent className="p-4 flex items-start gap-3">
            <Layers className="w-5 h-5 text-brand-300 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold">تكامل مع الأدوار والأسقف</p>
              <p className="text-white/60">
                كل قيد يُسند إلى مركز تكلفة؛ السقف الاعتمادي لكل دور يُتحقق قبل
                الترحيل — ربط كامل بين الشجرة المحاسبية والصلاحيات.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
