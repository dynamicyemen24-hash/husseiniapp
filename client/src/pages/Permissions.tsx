import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { DeniedScreen } from "@/components/DeniedScreen";
import { toast } from "sonner";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ShieldCheck, Plus, UserCog } from "lucide-react";

export default function Permissions() {
  const { isAdmin } = usePermissions();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [rolePerms, setRolePerms] = useState("");

  const { data: users, isPending: loadingUsers } =
    trpc.modules.rbac.listUsers.useQuery(undefined, { staleTime: 60_000 });
  const { data: roles, isPending: loadingRoles } =
    trpc.modules.rbac.listRoles.useQuery(undefined, { staleTime: 60_000 });
  const { data: perms } = trpc.modules.rbac.listPermissions.useQuery(
    undefined,
    {
      staleTime: 300_000,
    }
  );

  const createRole = trpc.modules.rbac.createRole.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الدور");
      setRoleName("");
      setRoleCode("");
      setRolePerms("");
      utils.modules.rbac.listRoles.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر الإنشاء"),
  });
  const assignRole = trpc.modules.rbac.assignRole.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين الدور");
      utils.modules.rbac.listUsers.invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "تعذر التعيين"),
  });

  if (!isAdmin) return <DeniedScreen />;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <main className="flex-1 p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              الصلاحيات والأدوار
            </h1>
            <p className="text-[11px] text-muted-foreground">
              إدارة المستخدمين والأدوار والصلاحيات
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="المستخدمون"
            value={users?.length ?? 0}
            tone="info"
            icon={Users}
          />
          <StatCard
            label="الأدوار"
            value={roles?.length ?? 0}
            tone="positive"
            icon={ShieldCheck}
          />
          <StatCard
            label="مفاتيح الصلاحيات"
            value={perms?.length ?? 0}
            tone="neutral"
            icon={UserCog}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={tab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("users")}
          >
            المستخدمون
          </Button>
          <Button
            variant={tab === "roles" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("roles")}
          >
            الأدوار
          </Button>
        </div>

        {tab === "users" ? (
          <div className="rounded-2xl border border-border bg-card p-4 overflow-x-auto">
            {loadingUsers ? (
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-2 text-right">المستخدم</th>
                    <th className="p-2 text-right">البريد</th>
                    <th className="p-2 text-right">الدور الحالي</th>
                    <th className="p-2 text-right">تعيين دور</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u: any) => (
                    <tr key={u.id} className="border-b border-border/60">
                      <td className="p-2 font-bold text-foreground">
                        {u.name}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {u.email ?? "—"}
                      </td>
                      <td className="p-2">
                        <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2">
                        <select
                          className="h-8 rounded-lg border border-border bg-background px-2 text-[12px]"
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value)
                              assignRole.mutate({
                                userId: u.id,
                                roleId: Number(e.target.value),
                              });
                          }}
                        >
                          <option value="">اختر دوراً...</option>
                          {(roles ?? []).map((r: any) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground">
                أدوار المؤسسة
              </h2>
              <div className="space-y-2">
                {(roles ?? []).map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-muted/30 p-2"
                  >
                    <div className="font-bold text-[12px] text-foreground">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.code}
                    </div>
                  </div>
                ))}
                {!roles?.length && (
                  <p className="text-[12px] text-muted-foreground">
                    لا توجد أدوار بعد
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1">
                <Plus className="h-4 w-4" /> دور جديد
              </h2>
              <div>
                <Label className="text-[11px]">الاسم</Label>
                <Input
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  placeholder="مثال: مدير مالي"
                />
              </div>
              <div>
                <Label className="text-[11px]">الرمز (كود)</Label>
                <Input
                  value={roleCode}
                  onChange={e => setRoleCode(e.target.value)}
                  placeholder="finance_manager"
                />
              </div>
              <div>
                <Label className="text-[11px]">الصلاحيات (JSON)</Label>
                <textarea
                  className="h-20 w-full rounded-lg border border-border bg-background p-2 text-[11px]"
                  value={rolePerms}
                  onChange={e => setRolePerms(e.target.value)}
                  placeholder='["view_accounting","post_entries"]'
                />
              </div>
              <Button
                className="w-full bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                disabled={!roleName || !roleCode || createRole.isPending}
                onClick={() =>
                  createRole.mutate({
                    name: roleName,
                    code: roleCode,
                    permissions: rolePerms || undefined,
                  })
                }
              >
                {createRole.isPending ? "جاري الإنشاء..." : "إنشاء الدور"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
