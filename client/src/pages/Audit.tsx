import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Search } from "lucide-react";

function fmtDate(d: string | Date) {
  try {
    return new Date(d).toLocaleString("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(d);
  }
}

export default function Audit() {
  const [action, setAction] = useState("");

  const { data, isPending } = trpc.modules.audit.list.useQuery(
    { limit: 60, offset: 0 },
    { placeholderData: (p: any) => p }
  );

  const items = (Array.isArray(data) ? data : []) as any[];

  return (
    <div className="min-h-screen flex">
      <main className="flex-1 bg-muted">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                سجل التدقيق والأثر
              </h1>
              <p className="text-sm text-muted-foreground">
                سجل لا رجعة فيه لكل العمليات الحساسة — قابلية تتبّع وتوافق
                (Compliance) بمعيار مؤسسي
              </p>
            </div>
          </div>
          <div className="mt-4 w-full max-w-sm">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 border-0 bg-transparent text-[13px] focus-visible:ring-0"
                placeholder="بحث في نوع العملية (مثال: قيد، فرع، راتب)..."
                value={action}
                onChange={e => setAction(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b bg-muted text-[11px] text-muted-foreground">
                      <th className="text-right p-3">التاريخ</th>
                      <th className="text-right p-3">المستخدم</th>
                      <th className="text-right p-3">العملية</th>
                      <th className="text-right p-3">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isPending ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-muted-foreground"
                        >
                          جاري التحميل...
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-muted-foreground"
                        >
                          لا توجد سجلات مطابقة.
                        </td>
                      </tr>
                    ) : (
                      items.map((l: any) => (
                        <tr
                          key={l.id}
                          className="border-b last:border-0 hover:bg-muted"
                        >
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {fmtDate(l.createdAt)}
                          </td>
                          <td className="p-3 text-foreground">
                            {l.userName || `مستخدم #${l.userId}`}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-rose-50 text-rose-700">
                              {l.action}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {l.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
