/**
 * Smart Voucher Form with Auto-completion and Auto-numbering.
 */

import * as React from "react";
import { calculateDocumentTotals } from "@shared/autoComplete";
import { generateDocNumber } from "@shared/autoNumber";
import { Trash2, Plus } from "lucide-react";

interface LineItem {
  id: string;
  account: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export default function SmartVoucherForm() {
  const [docNumber] = React.useState(() => generateDocNumber("vouchers", 1));
  const [date] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [lines, setLines] = React.useState<LineItem[]>([
    {
      id: "1",
      account: "",
      accountName: "",
      description: "",
      debit: 0,
      credit: 0,
    },
  ]);

  const totals = React.useMemo(
    () =>
      calculateDocumentTotals(
        lines.map(l => ({
          quantity: 1,
          unitPrice: l.debit || l.credit,
          discountPercent: 0,
          taxRate: 0,
        }))
      ),
    [lines]
  );

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: String(Date.now()),
        account: "",
        accountName: "",
        description: "",
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: unknown) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "debit" && Number(value) > 0) updated.credit = 0;
        if (field === "credit" && Number(value) > 0) updated.debit = 0;
        return updated;
      })
    );
  };

  return (
    <div className="doc-frame space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">رقم المستند</label>
          <input
            value={docNumber}
            disabled
            className="w-full rounded-md border px-3 py-2 text-sm font-mono bg-muted"
          />
        </div>
        <div>
          <label className="text-sm font-medium">التاريخ</label>
          <input
            value={date}
            type="date"
            disabled
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">المرجع</label>
          <input
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="رقم المرجع"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">الوصف</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="أدخل وصف المستند..."
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
        />
      </div>

      <div className="flex items-center gap-4 rounded-lg border bg-muted p-3">
        <span className="text-sm text-muted-foreground">إجمالي الأرصدة:</span>
        <span className="font-mono font-bold text-lg">
          {formatCurrency(totals.grandTotal)}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">البيانات</label>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-accent"
          >
            <Plus className="size-4 mr-1" />
            سطر جديد
          </button>
        </div>

        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th className="p-2 text-left text-xs font-semibold">الحساب</th>
                <th className="p-2 text-left text-xs font-semibold">البيان</th>
                <th className="p-2 text-right text-xs font-semibold">دين</th>
                <th className="p-2 text-right text-xs font-semibold">دائن</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr key={line.id} className="border-b hover:bg-accent">
                  <td className="p-2">
                    <input
                      value={line.account}
                      onChange={e =>
                        updateLine(line.id, "account", e.target.value)
                      }
                      placeholder="الحساب..."
                      className="w-32 rounded border px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={line.description}
                      onChange={e =>
                        updateLine(line.id, "description", e.target.value)
                      }
                      placeholder="البيان..."
                      className="w-48 rounded border px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={line.debit || ""}
                      onChange={e =>
                        updateLine(line.id, "debit", Number(e.target.value))
                      }
                      className="w-24 rounded border px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      value={line.credit || ""}
                      onChange={e =>
                        updateLine(line.id, "credit", Number(e.target.value))
                      }
                      className="w-24 rounded border px-2 py-1 text-sm text-right"
                    />
                  </td>
                  <td className="p-2">
                    {lines.length > 1 && (
                      <button
                        onClick={() => removeLine(line.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="rounded-md border px-4 py-2 text-sm">إلغاء</button>
        <button className="rounded-md bg-brand px-4 py-2 text-sm text-brand-foreground">
          حفظ المستند
        </button>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(amount);
}
