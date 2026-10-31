import { toast } from "sonner";
import { payLabels } from "./status-maps";

const PRINT_STORAGE_KEY = "alhusainia_print_stats";
const getPrintStats = (): {
  total: number;
  byType: Record<string, number>;
  lastPrint: string;
} => {
  try {
    const stored = localStorage.getItem(PRINT_STORAGE_KEY);
    if (!stored) return { total: 0, byType: {}, lastPrint: "" };
    return JSON.parse(stored);
  } catch {
    return { total: 0, byType: {}, lastPrint: "" };
  }
};
const savePrintStats = (stats: {
  total: number;
  byType: Record<string, number>;
  lastPrint: string;
}) => {
  try {
    localStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore localStorage errors
  }
};

export const escHtml = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    m =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m] as string
  );

export const fmtAmt = (v: unknown) =>
  Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtDate = (v: unknown) =>
  v ? new Date(v as string).toLocaleDateString("ar-EG") : "—";

export const openPrintWindow = (
  html: string,
  width = 880,
  height = 720,
  options: { preview?: boolean; title?: string } = {}
) => {
  const { preview = false, title = "فاتورة المبيعات" } = options;
  const stats = getPrintStats();
  stats.total++;
  const typeKey = title.includes("سند قبض")
    ? "receipts"
    : title.includes("فاتورة")
      ? "invoices"
      : "other";
  stats.byType[typeKey] = (stats.byType[typeKey] || 0) + 1;
  stats.lastPrint = new Date().toLocaleString("ar-EG");
  savePrintStats(stats);

  const win = window.open(
    "",
    "_blank",
    `width=${width},height=${height},scrollbars=yes,menubar=no,toolbar=no,location=no,status=no`
  );
  if (!win) {
    toast.error("الرجاء السماح بالنوافذ المنبثقة للطباعة");
    return;
  }
  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
<title>${escHtml(title)}</title>
<style>
  body {font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;margin:20px;color:#17211f;background:#fff;}
  .print-title {text-align:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #b87945;}
  .print-title h1 {margin:0; font-size:24px; color:#102a2b;}
  .print-meta {font-size:12px; color:#777; margin:8px 0;}
  @media print {body {padding:10px;}}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  if (preview) {
    toast.info("يمكنك المعاينة الآن، اضغط طباعة من شاشة المتصفح");
    setTimeout(() => win.print(), 500);
  } else {
    const doPrint = () => {
      win.focus();
      setTimeout(() => win.print(), 400);
    };
    if (win.document.readyState === "complete") doPrint();
    else win.onload = doPrint;
  }
};

export const printPaymentReceipt = async (data: {
  invoice: any;
  amount: string;
  method: string;
  date: string;
  source: "sales" | "purchases";
  utils: any;
}) => {
  try {
    const settings = await data.utils.accounting.getSettings
      .fetch()
      .catch(() => null);
    const institutionName =
      settings?.institutionName ?? "مؤسسة الحسينية لخدمات الأعمال";
    const managerName = settings?.managerName ?? "";
    const currency = settings?.currency ?? "ريال يمني (YER)";

    const isReceipt = data.source === "sales";
    const remaining = Math.max(
      0,
      Number(data.invoice.total) -
        Number(data.invoice.paidAmount ?? 0) -
        Number(data.amount)
    );
    const payDateStr = data.date ? fmtDate(data.date) : fmtDate(new Date());

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${isReceipt ? "سند قبض" : "سند صرف"} ${escHtml(data.invoice.invoiceNumber)}</title>
<style>
*{box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;margin:0;padding:26px;color:#17211f;background:#fff}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #b87945;padding-bottom:14px}
.brand{display:flex;align-items:center;gap:10px}.logo{width:46px;height:46px;border-radius:12px;background:#102a2b;color:#d4a574;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
.brand .b1{font-weight:900;font-size:16px;color:#102a2b}.brand .b2{font-size:11px;color:#7a6a52;margin-top:2px}
.meta{text-align:left}.meta h1{margin:0 0 4px;font-size:20px;color:#102a2b}.meta .m{font-size:11px;color:#555;margin:2px 0}
.amount-box{margin:26px auto;padding:22px;border:2px dashed #b87945;border-radius:14px;text-align:center;max-width:420px;background:#fdf9f2}
.amount-box .lbl{font-size:12px;color:#8a6a4a}.amount-box .val{font-size:30px;font-weight:900;color:#102a2b;margin-top:6px;letter-spacing:1px}
.serial{display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;background:#efefe9;color:#555;font-size:10px;font-family:monospace}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:12px}
.box{border:1px solid #ddd;border-radius:10px;padding:12px}.box h3{margin:0 0 8px;font-size:12px;color:#b87945}.box p{margin:3px 0;color:#333}
.footer{margin-top:52px;display:flex;justify-content:space-between;font-size:11px;color:#777}
.sign{width:38%;text-align:center}.sign .line{border-top:1px dashed #999;padding-top:6px;margin-top:58px}
.note{margin-top:18px;font-size:10px;color:#999;text-align:center}
@media print{body{padding:10px}}
</style></head><body>
<div class="head">
  <div class="brand"><div class="logo">ح</div><div><div class="b1">${escHtml(institutionName)}</div><div class="b2">نظام الحسابات ALHUSAINIA — إدارة مالية متكاملة</div></div></div>
  <div class="meta"><h1>${isReceipt ? "سند قبض" : "سند صرف"}</h1><div class="m">رقم السند: <b>${isReceipt ? "RC" : "PY"}-${String(Date.now()).slice(-8)}</b></div><div class="m">التاريخ: ${payDateStr}</div><div class="m">فاتورة: <b>${escHtml(data.invoice.invoiceNumber)}</b></div></div>
</div>
<div class="amount-box"><div class="lbl">${isReceipt ? "المبلغ المقبوض" : "المبلغ المدفوع"}</div><div class="val">${fmtAmt(data.amount)} ${escHtml(currency)}</div><div class="serial"># ${escHtml(data.invoice.invoiceNumber)}</div></div>
<div class="grid">
  <div class="box"><h3>بيانات السند</h3>
    <p>طريقة الدفع: <b>${payLabels[data.method] || data.method}</b></p>
    <p>تاريخ الدفعة: ${payDateStr}</p>
    <p>نوع السند: <b>${isReceipt ? "تحصيل من عميل" : "سداد لمورد"}</b></p>
  </div>
  <div class="box"><h3>حساب الفاتورة</h3>
    <p>إجمالي الفاتورة: <b>${fmtAmt(data.invoice.total)}</b></p>
    <p>المدفوع سابقاً: <b>${fmtAmt(data.invoice.paidAmount)}</b></p>
    <p>المتبقي بعد هذه الدفعة: <b>${fmtAmt(remaining)}</b></p>
  </div>
</div>
<div class="footer">
  <div class="sign"><div class="line">توقيع المستلم</div></div>
  <div>${escHtml(institutionName)}<br/>${managerName ? "أمين الصندوق: " + escHtml(managerName) : ""}</div>
  <div class="sign"><div class="line">توقيع أمين الصندوق</div></div>
</div>
<div class="note">صدر بواسطة نظام ALHUSAINIA — ${new Date().toLocaleDateString("ar-EG")} — سند صادر بموجب النظام، يُحفظ في ملف السندات.</div>
</body></html>`;

    openPrintWindow(html, 880, 720, {
      preview: true,
      title: `${isReceipt ? "سند قبض" : "سند صرف"} ${escHtml(data.invoice.invoiceNumber)}`,
    });
  } catch (e: any) {
    toast.error("فشل تجهيز السند: " + (e?.message || ""));
  }
};

/**
 * Parse a ZATCA e-invoice stamp (Phase 2 compliance) from raw input.
 * Returns null for missing/invalid stamps. Supports both canonical
 * (`uuid`, `qrBase64`, `hash`, `stampedAt`) and alias (`invoiceUuid`,
 * `qr`, `invoiceHash`) field names.
 */
export function parseZatca(raw: unknown): {
  uuid: string;
  qrBase64: string;
  hash: string;
  stampedAt?: string;
} | null {
  if (typeof raw !== "string") return null;
  if (!raw.trim()) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const uuid = (obj.uuid ?? obj.invoiceUuid) as string | undefined;
    const qrBase64 = (obj.qrBase64 ?? obj.qr) as string | undefined;
    const hash = (obj.hash ?? obj.invoiceHash) as string | undefined;
    if (!uuid || !qrBase64 || !hash) return null;
    const stampedAt = obj.stampedAt as string | undefined;
    return { uuid, qrBase64, hash, ...(stampedAt ? { stampedAt } : {}) };
  } catch {
    return null;
  }
}

export const printSaleInvoice = async (invId: number, utils: any) => {
  try {
    const [detail, settings] = await Promise.all([
      utils.sales.getInvoiceDetails.fetch({ id: invId }),
      utils.accounting.getSettings.fetch().catch(() => null),
    ]);
    if (!detail?.invoice) {
      toast.error("تعذر تحميل تفاصيل الفاتورة");
      return;
    }
    const { invoice, customer, items } = detail as any;
    const institutionName =
      settings?.institutionName ?? "مؤسسة الحسينية لخدمات الأعمال";
    const managerName = settings?.managerName ?? "";
    const currency = settings?.currency ?? "ريال يمني (YER)";

    const statusLabel: Record<string, string> = {
      draft: "مسودة",
      confirmed: "مؤكدة",
      paid: "مدفوعة",
      partial: "مدفوعة جزئياً",
      cancelled: "ملغاة",
    };

    const remaining =
      Number(invoice.total ?? 0) - Number(invoice.paidAmount ?? 0);
    const itemsRows = (items || [])
      .map(
        (it: any, i: number) =>
          `<tr><td class="c">${i + 1}</td><td>${escHtml(it.productName)}</td><td class="c">${it.quantity}</td><td class="c">${fmtAmt(it.unitPrice)}</td><td class="c">${fmtAmt(it.discount)}</td><td class="c">${fmtAmt(it.total)}</td></tr>`
      )
      .join("");
    const parsedZatca = parseZatca(invoice.zatcaStamp);

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>فاتورة ${escHtml(invoice.invoiceNumber)}</title>
<style>
*{box-sizing:border-box}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;margin:0;padding:26px;color:#17211f;background:#fff}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #b87945;padding-bottom:14px}
.brand{display:flex;align-items:center;gap:10px}.logo{width:46px;height:46px;border-radius:12px;background:#102a2b;color:#d4a574;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
.brand .b1{font-weight:900;font-size:16px;color:#102a2b}.brand .b2{font-size:11px;color:#7a6a52;margin-top:2px}
.meta{text-align:left}.meta h1{margin:0 0 4px;font-size:20px;color:#102a2b}.meta .m{font-size:11px;color:#555;margin:2px 0}
.badge{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:999px;background:#f5e9d8;color:#8a5a1e;font-size:11px;font-weight:700}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
.box{border:1px solid #ddd;border-radius:10px;padding:12px;font-size:12px}.box h3{margin:0 0 8px;font-size:13px;color:#b87945}.box p{margin:3px 0;color:#333}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #ddd;padding:8px 10px;text-align:right}th{background:#102a2b;color:#fff;font-size:11px}
td.c{text-align:center}tr:nth-child(even) td{background:#faf6ef}
.totals{display:flex;justify-content:flex-end;margin-top:12px}.totals table{width:320px;margin:0}
.totals td{border:none;padding:5px 10px}.totals tr.total td{font-weight:900;font-size:14px;color:#102a2b;border-top:2px solid #b87945}
.notes{margin-top:14px;font-size:11px;color:#555;border-top:1px dashed #ccc;padding-top:10px}
.footer{margin-top:46px;display:flex;justify-content:space-between;font-size:11px;color:#777}
.sign{width:38%;text-align:center}.sign .line{border-top:1px dashed #999;padding-top:6px;margin-top:58px}
@media print{body{padding:10px}}
</style></head><body>
<div class="head">
  <div class="brand"><div class="logo">ح</div><div><div class="b1">${escHtml(institutionName)}</div><div class="b2">نظام الحسابات ALHUSAINIA — إدارة مالية متكاملة</div></div></div>
  <div class="meta"><h1>فاتورة مبيعات</h1><div class="m">رقم الفاتورة: <b>${escHtml(invoice.invoiceNumber)}</b></div><div class="m">التاريخ: ${fmtDate(invoice.invoiceDate)}</div><div class="m">تاريخ الاستحقاق: ${fmtDate(invoice.dueDate)}</div><span class="badge">${statusLabel[invoice.status] || invoice.status}</span></div>
</div>
<div class="grid2">
  <div class="box"><h3>بيانات العميل</h3>
    <p><b>${escHtml(customer?.name || "عميل نقدي")}</b></p>
    ${customer?.phone ? `<p>هاتف: ${escHtml(customer.phone)}</p>` : ""}
    ${customer?.address ? `<p>العنوان: ${escHtml(customer.address)}</p>` : ""}
    ${customer?.taxNumber ? `<p>الرقم الضريبي: ${escHtml(customer.taxNumber)}</p>` : ""}
  </div>
  <div class="box"><h3>بيانات الدفع</h3>
    <p>طريقة الدفع: <b>${payLabels[invoice.paymentMethod] || invoice.paymentMethod}</b></p>
    <p>المدفوع: <b>${fmtAmt(invoice.paidAmount)} ${escHtml(currency)}</b></p>
    <p>المتبقي: <b>${fmtAmt(remaining)} ${escHtml(currency)}</b></p>
  </div>
</div>
<table><thead><tr><th class="c">#</th><th>الصنف</th><th class="c">الكمية</th><th class="c">سعر الوحدة</th><th class="c">الخصم</th><th class="c">الإجمالي</th></tr></thead><tbody>${itemsRows || '<tr><td colspan="6" class="c">لا توجد أصناف</td></tr>'}</tbody></table>
<div class="totals"><table>
  <tr><td>المجموع الفرعي</td><td class="c">${fmtAmt(invoice.subtotal)}</td></tr>
  ${Number(invoice.discount) > 0 ? `<tr><td>الخصم</td><td class="c">-${fmtAmt(invoice.discount)}</td></tr>` : ""}
  ${Number(invoice.taxRate) > 0 ? `<tr><td>الضريبة (${invoice.taxRate}%)</td><td class="c">${fmtAmt(invoice.taxAmount)}</td></tr>` : ""}
  <tr class="total"><td>الإجمالي النهائي</td><td class="c">${fmtAmt(invoice.total)} ${escHtml(currency)}</td></tr>
</table></div>
${invoice.notes ? `<div class="notes"><b>ملاحظات: </b>${escHtml(invoice.notes)}</div>` : ""}
${
  parsedZatca
    ? `
<div class="zatca-compliance" style="margin:24px 0;border:1px solid #102a2b;border-radius:8px;padding:16px;background:#f8f9fa">
  <h4 style="margin:0 0 12px;color:#102a2b;font-size:13px;">التوافق مع نظام الفوترة الإلكترونية (ZATCA)</h4>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
    <div>
      <p>رقم الفاتورة الموحد (UUID): <span style="color:#333;">${escHtml(parsedZatca.uuid)}</span></p>
      <p>بصمة الهاش: <span style="color:#333;">${escHtml(parsedZatca.hash?.slice(0, 32) || "—")}</span></p>
    </div>
    <div>
      <p>تاريخ الإمضاء: <span style="color:#333;">${parsedZatca.stampedAt ? fmtDate(parsedZatca.stampedAt) : "—"}</span></p>
      <p>رمز الاستجابة السريع: <span style="color:#333;">${parsedZatca.qrBase64 ? "متوفر" : "غير متوفر"}</span></p>
    </div>
  </div>
</div>`
    : ""
}
<div class="footer">
  <div class="sign"><div class="line">توقيع المستلم</div></div>
  <div>${escHtml(institutionName)}<br/>${managerName ? "المدير: " + escHtml(managerName) : ""}<br/>صدر بواسطة نظام ALHUSAINIA — ${new Date().toLocaleDateString("ar-EG")}</div>
  <div class="sign"><div class="line">توقيع البائع</div></div>
</div>
</body></html>`;

    openPrintWindow(html, 920, 760, {
      preview: true,
      title: `فاتورة ${escHtml(invoice.invoiceNumber)}`,
    });
  } catch (e: any) {
    toast.error("فشل تجهيز الفاتورة: " + (e?.message || ""));
  }
};
