import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { toast } from "sonner";
import {
  Users,
  Building2,
  Search,
  Plus,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { BeneficiaryAutocomplete } from "@/components/BeneficiaryAutocomplete";

export default function Beneficiaries() {
  const [kind, setKind] = useState<"customer" | "supplier">("customer");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    country: "YE",
    city: "",
    taxNumber: "",
    beneficiaryType: "person" as "person" | "entity",
  });

  const search = trpc.beneficiaries.search.useQuery(
    { q: q || "a", kind: "all", limit: 20 },
    { enabled: !!q, staleTime: 30_000 }
  );
  const upsert = trpc.beneficiaries.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ السجل الموحد — لا تكرار");
      setForm({
        name: "",
        code: "",
        phone: "",
        email: "",
        country: "YE",
        city: "",
        taxNumber: "",
        beneficiaryType: "person",
      });
      search.refetch();
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const unified = search.data ?? [];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Users className="w-6 h-6 text-brand" /> السجل الموحد
              للعميل/المستفيد
            </h1>
            <p className="text-xs text-muted-foreground">
              شخص أو جهة، من أي دولة — سجل واحد، ترابط كامل مع الحسابات
              والطلبات، لا تكرار
            </p>
          </div>
          <Badge className="bg-brand text-ink-deep font-bold">
            {unified.length} نتيجة
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="w-4 h-4 text-brand" /> بحث موحد — اكتمال
                تلقائي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BeneficiaryAutocomplete
                kind={kind}
                value={q}
                onSelect={(b, raw) => {
                  if (b) {
                    setSelected(b);
                    setQ(b.name);
                  } else {
                    setQ(raw);
                    setSelected(null);
                  }
                }}
                country={form.country}
              />
              <div className="flex gap-2">
                <Button
                  variant={kind === "customer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setKind("customer")}
                  className="h-8 text-xs"
                >
                  <Users className="w-3.5 h-3.5" /> عملاء
                </Button>
                <Button
                  variant={kind === "supplier" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setKind("supplier")}
                  className="h-8 text-xs"
                >
                  <Building2 className="w-3.5 h-3.5" /> موردون
                </Button>
              </div>

              <div className="space-y-2 max-h-[45vh] overflow-auto">
                {unified.map((b: any) => (
                  <div
                    key={`${b.kind}-${b.id}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${selected?.id === b.id ? "bg-brand/10 border-brand/30" : "bg-card"}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      {b.kind === "customer" ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">
                        {b.name}{" "}
                        <span className="font-mono text-[10px] text-muted-foreground">
                          · {b.code}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                        {b.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {b.phone}
                          </span>
                        )}
                        {b.country && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {b.country}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {b.kind === "customer" ? "عميل" : "مورد"}
                    </Badge>
                  </div>
                ))}
                {unified.length === 0 && q && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    لا نتائج — سيُنشأ سجل جديد بعد التحقق
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4 text-brand" /> تسجيل مستفيد جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">النوع</Label>
                  <select
                    value={form.beneficiaryType}
                    onChange={e =>
                      setForm({
                        ...form,
                        beneficiaryType: e.target.value as any,
                      })
                    }
                    className="h-9 w-full rounded-md border px-3 text-xs bg-background"
                  >
                    <option value="person">شخص</option>
                    <option value="entity">جهة/شركة</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الدولة</Label>
                  <select
                    value={form.country}
                    onChange={e =>
                      setForm({ ...form, country: e.target.value })
                    }
                    className="h-9 w-full rounded-md border px-3 text-xs bg-background"
                  >
                    <option value="YE">اليمن</option>
                    <option value="SA">السعودية</option>
                    <option value="AE">الإمارات</option>
                    <option value="EG">مصر</option>
                    <option value="JO">الأردن</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الاسم *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="الاسم الكامل أو اسم الجهة"
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">الكود (اختياري)</Label>
                  <Input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="CUST-001"
                    className="h-9 text-xs font-mono"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">المدينة</Label>
                  <Input
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    placeholder="صنعاء"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+967 7xxxxxxxx"
                  className="h-9 text-xs font-mono"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">البريد</Label>
                <Input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com"
                  className="h-9 text-xs"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الرقم الضريبي</Label>
                <Input
                  value={form.taxNumber}
                  onChange={e =>
                    setForm({ ...form, taxNumber: e.target.value })
                  }
                  placeholder="للسعودية 15 رقماً"
                  className="h-9 text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div className="p-2 rounded-lg bg-brand/10 border border-brand/20 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-brand mt-0.5" />
                <span>
                  فحص تلقائي: صيغة الهاتف حسب الدولة، البريد، الضريبي — مع ضمان
                  عدم التكرار (كود/هاتف/بريد/ضريبي)
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => upsert.mutate({ kind, ...form })}
                  disabled={upsert.isPending || !form.name.trim()}
                  className="flex-1 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold h-9 text-xs"
                >
                  {upsert.isPending ? "جاري الحفظ…" : "حفظ سجل موحد"}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> ترابط تلقائي مع الحسابات
                (ذمم) والطلبات — سجل واحد لكل مستفيد
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-ink text-white">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-300 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold">مرونة وكفاءة واعتمادية وأمان</p>
              <p className="text-white/60">
                كل سجل يُفحص قبل الحفظ، لا تكرار، ترابط مع القيود والطلبات،
                ويعمل لأي دولة — شخص أو جهة — بذات الجودة.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
