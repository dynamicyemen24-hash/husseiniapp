import React from "react";
import { Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getActiveTenantId, setActiveTenantId } from "@/lib/activeTenant";

/**
 * Super-admin tenant switcher. Only the platform owner (whose `listTenants`
 * call succeeds) sees this control. Selecting a tenant stores it locally and
 * the tRPC client forwards it as `x-tenant-id`, letting the owner operate
 * inside any tenant without re-authentication.
 */
export function TenantSwitcher() {
  const { data, isError } = trpc.system.listTenants.useQuery(undefined, {
    retry: false,
  });
  const [active, setActive] = React.useState<number | null>(
    getActiveTenantId()
  );

  React.useEffect(() => {
    setActive(getActiveTenantId());
  }, [data]);

  if (isError || !data || data.length === 0) return null;

  const current = active ?? data[0]?.id;

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number.parseInt(e.target.value, 10);
    if (Number.isNaN(val)) return;
    setActiveTenantId(val);
    setActive(val);
    // Reload so every cached query re-runs under the new tenant context.
    window.location.reload();
  };

  return (
    <label
      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-brand/30 rounded-md px-2 h-9 text-xs text-brand-300 cursor-pointer"
      title="تبديل المؤسسة (مالك المنصة فقط)"
    >
      <Building2 size={14} />
      <select
        value={current}
        onChange={onChange}
        className="bg-transparent outline-none cursor-pointer max-w-[140px]"
      >
        {data.map(t => (
          <option key={t.id} value={t.id} className="text-ink">
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
