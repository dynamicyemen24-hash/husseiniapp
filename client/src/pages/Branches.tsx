import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Plus, Trash2, GitBranch, ShieldCheck } from "lucide-react";

const PERM_LABELS: { key: string; label: string }[] = [
  { key: "canView", label: "عرض" },
  { key: "canInsert", label: "إدخال" },
  { key: "canApprove", label: "اعتماد" },
  { key: "canPost", label: "ترحيل" },
];

export default function Branches() {
  const { isAdmin } = usePermissions();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<any>(null);

  const { data: branches, isPending } = trpc.modules.branches.list.useQuery(
    undefined,
    {
      placeholderData: (p: any) => p,
    }
  );
  const { data: users } = trpc.modules.rbac.listUsers.useQuery(undefined, {
    placeholderData: (p: any) => p,
  });
  const { data: userPerms } =
    trpc.modules.branches.listUserPermissions.useQuery(undefined, {
      placeholderData: (p: any) => p,
    });

  const createBranch = trpc.modules.branches.create.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الفرع");
      setName("");
      setCode("");
      setCity("");
      utils.modules.branches.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الإضافة")),
  });
  const updateBranch = trpc.modules.branches.update.useMutation({
    onSuccess: () => {
      toast.success("تم التحديث");
      setEditing(null);
      utils.modules.branches.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e, "تعذر التحديث")),
  });
  const assign = trpc.modules.branches.assignUserPermission.useMutation({
    onError: (e: any) => toast.error(friendlyError(e, "تعذر الحفظ")),
  });

  const [selUser, setSelUser] = useState<number | "">("");
  const [permState, setPermState] = useState<
    Record<number, Record<string, boolean>>
  >({});

  // Seed permState from existing userPerms when user/branches change
  useEffect(() => {
    if (selUser === "" || !userPerms) return;
    const map: Record<number, Record<string, boolean>> = {};
    (userPerms as any[])
      .filter(p => p.userId === selUser)
      .forEach(p => {
        map[p.branchId] = {
          canView: !!p.canView,
          canInsert: !!p.canInsert,
          canApprove: !!p.canApprove,
          canPost: !!p.canPost,
        };
      });
    setPermState(map);
  }, [selUser, userPerms]);

  const savePerms = async () => {
    if (selUser === "") {
      toast.error("اختر مستخدماً أولاً");
      return;
    }
    for (const b of branches ?? []) {
      const p = permState[b.id];
      if (!p) continue;
      await assign.mutateAsync({
        userId: Number(selUser),
        branchId: b.id,
        canAccess: !!(p.canView || p.canInsert),
      });
    }
    toast.success("تم حفظ صلاحيات الفروع");
    utils.modules.branches.listUserPermissions.invalidate();
  };

  const submitBranch = () => {
    if (!name.trim() || !code.trim()) {
      toast.error("الاسم والرمز مطلوبان");
      return;
    }
    if (editing) {
      updateBranch.mutate({ id: editing.id, name, address: city });
    } else {
      createBranch.mutate({ name, code, address: city });
    }
  };

  const startEdit = (b: any) => {
    setEditing(b);
    setName(b.name);
    setCode(b.code);
    setCity(b.city ?? "");
  };

  if (!isAdmin) return <DeniedScreen />;

  return (
    <div className="min-h-screen flex">
      <main className="flex-1 bg-muted">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                الفروع والصلاحيات
              </h1>
              <p className="text-sm text-muted-foreground">
                إدارة الفروع وتوزيع الصلاحيات لكل مستخدم حسب الفرع — عزل تشغيلي
                بمعيار عالمي
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
          {/* branches */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitBranch className="h-4 w-4" /> الفروع
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  className="h-9 text-[12px]"
                  placeholder="الاسم"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <Input
                  className="h-9 text-[12px]"
                  placeholder="الرمز"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
                <Input
                  className="h-9 text-[12px]"
                  placeholder="المدينة"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-success text-white hover:bg-emerald-700"
                  onClick={submitBranch}
                  disabled={createBranch.isPending || updateBranch.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {editing ? "تحديث" : "إضافة فرع"}
                </Button>
                {editing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      setName("");
                      setCode("");
                      setCity("");
                    }}
                  >
                    إلغاء
                  </Button>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {isPending ? (
                  <p className="text-[12px] text-muted-foreground">
                    جاري التحميل...
                  </p>
                ) : (branches ?? []).length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">
                    لا توجد فروع بعد.
                  </p>
                ) : (
                  (branches ?? []).map((b: any) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted p-3"
                    >
                      <div>
                        <div className="text-[13px] font-bold text-foreground">
                          {b.name} {b.isMain ? "⭐" : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {b.code} · {b.city || "—"}
                        </div>
                      </div>
                      <button onClick={() => startEdit(b)}>
                        <span className="text-[11px] text-success">تعديل</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* user-branch permissions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> صلاحيات المستخدمين حسب الفرع
              </h2>
              <select
                className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[12px]"
                value={selUser}
                onChange={e =>
                  setSelUser(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">اختر مستخدماً...</option>
                {(users ?? []).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>

              <div className="space-y-2">
                {(branches ?? []).map((b: any) => {
                  const p = permState[b.id] || {};
                  return (
                    <div
                      key={b.id}
                      className="rounded-xl border border-border bg-muted p-2"
                    >
                      <div className="mb-1 text-[12px] font-bold text-foreground">
                        {b.name}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {PERM_LABELS.map(pl => (
                          <label
                            key={pl.key}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground"
                          >
                            <input
                              type="checkbox"
                              checked={!!p[pl.key]}
                              onChange={e =>
                                setPermState(s => ({
                                  ...s,
                                  [b.id]: {
                                    ...(s[b.id] || {}),
                                    [pl.key]: e.target.checked,
                                  },
                                }))
                              }
                            />
                            {pl.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                size="sm"
                className="w-full bg-success text-white hover:bg-emerald-700"
                onClick={savePerms}
                disabled={assign.isPending}
              >
                حفظ صلاحيات الفروع
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
