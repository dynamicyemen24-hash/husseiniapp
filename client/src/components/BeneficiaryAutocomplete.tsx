import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type Beneficiary = {
  id: number;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  taxNumber?: string | null;
};

interface Props {
  kind: "customer" | "supplier";
  label?: string;
  placeholder?: string;
  value: string;
  onSelect: (b: Beneficiary | null, rawName: string) => void;
  country?: string;
}

const COUNTRIES = [
  { code: "YE", label: "اليمن +967", flag: "🇾🇪" },
  { code: "SA", label: "السعودية +966", flag: "🇸🇦" },
  { code: "AE", label: "الإمارات +971", flag: "🇦🇪" },
  { code: "EG", label: "مصر +20", flag: "🇪🇬" },
  { code: "JO", label: "الأردن +962", flag: "🇯🇴" },
  { code: "OTHER", label: "دولي", flag: "🌍" },
];

export function BeneficiaryAutocomplete({
  kind,
  label,
  placeholder,
  value,
  onSelect,
  country = "YE",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);

  // استخدم لقطة كاملة للمستأجر — تُفلتر محلياً بسرعة (لا استعلام جديد لكل حرف)
  const customers = trpc.sync.getFullSnapshot.useQuery(undefined, {
    staleTime: 60_000,
    select: (d: any) => d.customers as Beneficiary[],
  });
  const suppliers = trpc.sync.getFullSnapshot.useQuery(undefined, {
    staleTime: 60_000,
    select: (d: any) => d.suppliers as Beneficiary[],
  });
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const list = (kind === "customer" ? customers.data : suppliers.data) ?? [];
    return list
      .filter(
        b =>
          b.name.toLowerCase().includes(needle) ||
          b.code.toLowerCase().includes(needle) ||
          (b.phone && b.phone.includes(needle))
      )
      .slice(0, 6);
  }, [q, kind, customers.data, suppliers.data]);

  const isUnified = filtered.length > 0;
  const countryMeta = COUNTRIES.find(c => c.code === country) ?? COUNTRIES[0];

  return (
    <div className="space-y-1">
      {label && (
        <Label className="text-xs font-bold flex items-center gap-1">
          {kind === "customer" ? (
            <User className="w-3.5 h-3.5 text-brand" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-brand" />
          )}{" "}
          {label}
        </Label>
      )}
      <div className="relative">
        <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => {
            const v = e.target.value;
            setQ(v);
            setOpen(true);
            onSelect(null, v);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={
            placeholder ||
            (kind === "customer"
              ? "ابحث بالاسم أو الكود أو الهاتف — اكتمال تلقائي"
              : "ابحث عن المورد — اكتمال تلقائي")
          }
          className="pr-8 h-9 text-xs bg-card border-input"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border bg-card shadow-xl max-h-56 overflow-auto">
            {filtered.map(b => (
              <button
                key={b.id}
                type="button"
                onMouseDown={() => {
                  setQ(b.name);
                  setOpen(false);
                  onSelect(b, b.name);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-right hover:bg-muted/50 transition-colors border-b last:border-0"
              >
                <span className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                  {kind === "customer" ? (
                    <User className="w-3.5 h-3.5 text-brand" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-brand" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold truncate">
                    {b.name}{" "}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      · {b.code}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
                  </span>
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* تلميح وحدة السجل — شخص أو جهة، أي دولة */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span>{countryMeta.flag}</span> {countryMeta.label}
        </span>
        <span className="w-px h-3 bg-border" />
        {isUnified ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> سجل موحد — لا تكرار
          </span>
        ) : q.trim().length > 1 ? (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="w-3 h-3" /> سيُنشأ سجل جديد بعد التحقق
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" /> شخص/جهة — أي دولة
          </span>
        )}
      </div>
    </div>
  );
}
