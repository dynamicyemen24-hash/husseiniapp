import {
  Copy,
  Download,
  Mail,
  Printer,
  Share2,
  Send,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PurchaseInvoice = {
  invoiceNumber?: string;
  createdAt?: string | Date;
  total?: string | number;
  paidAmount?: string | number;
  status?: string;
  notes?: string | null;
};

function esc(value: unknown) {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  return String(value ?? "").replace(/[&<>"]/g, char => map[char] || char);
}

function invoiceText(invoice: PurchaseInvoice, supplierName: string) {
  return `فاتورة مشتريات ${invoice.invoiceNumber || ""}\nالمورد: ${supplierName}\nالتاريخ: ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("ar-EG") : "—"}\nالإجمالي: ${invoice.total || 0}\nالمدفوع: ${invoice.paidAmount || 0}\nالحالة: ${invoice.status || ""}`;
}

export function ProcurementDocumentTools({
  invoice,
  supplierName,
}: {
  invoice: PurchaseInvoice;
  supplierName: string;
}) {
  const text = invoiceText(invoice, supplierName);
  const print = () => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      toast.error("اسمح بالنوافذ المنبثقة للطباعة");
      return;
    }
    popup.document.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${esc(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#102a2b}h1{color:#8d5c35;border-bottom:2px solid #8d5c35;padding-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:24px}td{border:1px solid #ddd;padding:12px}td:first-child{font-weight:bold;background:#f6f3ef;width:30%}@media print{button{display:none}}</style></head><body><h1>فاتورة مشتريات</h1><table><tr><td>رقم الفاتورة</td><td>${esc(invoice.invoiceNumber)}</td></tr><tr><td>المورد</td><td>${esc(supplierName)}</td></tr><tr><td>التاريخ</td><td>${esc(invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("ar-EG") : "—")}</td></tr><tr><td>الإجمالي</td><td>${esc(invoice.total)}</td></tr><tr><td>المدفوع</td><td>${esc(invoice.paidAmount)}</td></tr><tr><td>الحالة</td><td>${esc(invoice.status)}</td></tr></table><p>${esc(invoice.notes || "")}</p><script>window.onload=()=>window.print()</script></body></html>`
    );
    popup.document.close();
  };
  const download = () => {
    const blob = new Blob([`\ufeff${text}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${invoice.invoiceNumber || "purchase-invoice"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل ملخص الفاتورة");
  };
  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: `فاتورة مشتريات ${invoice.invoiceNumber}`,
          text,
        });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("تم نسخ بيانات الفاتورة للمشاركة");
      }
    } catch {
      /* cancelled by user */
    }
  };
  const email = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`فاتورة مشتريات ${invoice.invoiceNumber || ""}`)}&body=${encodeURIComponent(text)}`;
  };
  const whatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
  return (
    <div
      className="flex items-center gap-1"
      onClick={event => event.stopPropagation()}
    >
      <Button
        title="طباعة"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={print}
      >
        <Printer className="h-3.5 w-3.5" />
      </Button>
      <Button
        title="تنزيل"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={download}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        title="مشاركة"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={share}
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        title="إرسال بالبريد"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={email}
      >
        <Mail className="h-3.5 w-3.5" />
      </Button>
      <Button
        title="إرسال WhatsApp"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-emerald-600"
        onClick={whatsapp}
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </Button>
      <Button
        title="نسخ"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          toast.success("تم نسخ بيانات الفاتورة");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function downloadPurchaseReport(
  rows: PurchaseInvoice[],
  supplierName: (id?: number | null) => string
) {
  const header = [
    "رقم الفاتورة",
    "المورد",
    "التاريخ",
    "الإجمالي",
    "المدفوع",
    "الحالة",
  ];
  const csvRows = rows.map(row => [
    row.invoiceNumber || "",
    supplierName((row as any).supplierId),
    row.createdAt ? new Date(row.createdAt).toLocaleDateString("ar-EG") : "",
    row.total || 0,
    row.paidAmount || 0,
    row.status || "",
  ]);
  const csv = [header, ...csvRows]
    .map(line =>
      line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `purchase-report-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast.success("تم تنزيل تقرير المشتريات");
}
