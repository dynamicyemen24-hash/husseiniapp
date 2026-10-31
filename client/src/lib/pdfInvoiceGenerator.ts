import { brand } from "@/lib/brand";

// Utility for generating official printable invoice / receipt documents with QR Code

/**
 * XSS-safe HTML escape for user-supplied strings rendered into invoice HTML.
 * Without this, a customer name like `<img src=x onerror=...>` would execute
 * in the popup window. All untrusted fields must be escaped before insertion.
 */
export function escapeHtml(input: unknown): string {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Locale-aware number formatter used across the printable template. */
function fmt(n: number, fractionDigits = 2): string {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Map a status slug to a small visual badge (color swatch + AR label). */
function statusBadge(status?: string): string {
  if (!status) return "";
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: "مدفوعة", color: "#065f46", bg: "#d1fae5" },
    partially_paid: { label: "مدفوعة جزئياً", color: "#92400e", bg: "#fef3c7" },
    pending: { label: "معلقة", color: "#1e40af", bg: "#dbeafe" },
    overdue: { label: "متأخرة", color: "#991b1b", bg: "#fee2e2" },
    posted: { label: "مُرحَّلة", color: "#065f46", bg: "#d1fae5" },
    approved: { label: "معتمدة", color: "#065f46", bg: "#d1fae5" },
    draft: { label: "مسودة", color: "#475569", bg: "#e2e8f0" },
    cancelled: { label: "ملغاة", color: "#991b1b", bg: "#fee2e2" },
  };
  const info = map[status];
  if (!info) {
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#475569;font-size:10px;font-weight:bold;">${escapeHtml(status)}</span>`;
  }
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${info.bg};color:${info.color};font-size:10px;font-weight:bold;">${info.label}</span>`;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  documentType?: "invoice" | "voucher" | "receipt" | "purchase";
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  supplierName?: string;
  supplierTaxId?: string;
  institutionName?: string;
  institutionTaxId?: string;
  institutionAddress?: string;
  institutionPhone?: string;
  currency?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  taxRate?: number;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  status?: string;
  /** Optional free-form tabular section to render below the line items. */
  report?: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  };
}

const TYPE_LABELS: Record<NonNullable<InvoiceData["documentType"]>, string> = {
  invoice: "فاتورة ضريبية",
  voucher: "سند قبض / صرف",
  receipt: "إيصال",
  purchase: "فاتورة مشتريات",
};

export function generatePrintableInvoiceHtml(data: InvoiceData): string {
  const instName = escapeHtml(data.institutionName || "اسم المنشأة");
  const instPhone = data.institutionPhone
    ? escapeHtml(data.institutionPhone)
    : "";
  const instAddress = data.institutionAddress
    ? escapeHtml(data.institutionAddress)
    : "";
  const instTax = data.institutionTaxId
    ? escapeHtml(data.institutionTaxId)
    : "";
  const currencyStr = escapeHtml(data.currency || "ريال يمني (YER)");
  const formattedDate = data.invoiceDate
    ? new Date(data.invoiceDate).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG");
  const docLabel = data.documentType
    ? TYPE_LABELS[data.documentType]
    : "فاتورة / سند رسمية";

  const itemsTableHtml = data.items
    .map(
      (item, idx) => `
    <tr>
      <td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${escapeHtml(item.description)}</td>
      <td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${fmt(item.quantity, 0)}</td>
      <td style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${fmt(item.unitPrice)}</td>
      ${
        item.discount
          ? `<td style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #e11d48;">-${fmt(item.discount)}</td>`
          : `<td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0; color: #94a3b8;">-</td>`
      }
      ${
        item.taxRate
          ? `<td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${fmt(item.taxRate, 0)}%</td>`
          : `<td style="text-align: center; padding: 8px; border-bottom: 1px solid #e2e8f0; color: #94a3b8;">-</td>`
      }
      <td style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold;">${fmt(item.totalPrice)}</td>
    </tr>
  `
    )
    .join("");

  const hasItemDiscounts = data.items.some(i => i.discount);
  const hasItemTaxes = data.items.some(i => i.taxRate);

  const reportTableHtml = data.report
    ? `
    <h3 style="text-align: center; margin: 4px 0 12px; font-size: 14px; color: #102a2b;">${escapeHtml(data.report.title)}</h3>
    <table class="data-table">
      <thead>
        <tr>
          ${data.report.columns.map(c => `<th>${escapeHtml(c)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.report.rows
          .map(
            (row, i) => `<tr>
          ${row
            .map(
              (cell, ci) =>
                `<td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: ${ci === 0 ? "right" : "center"}; font-family: ${typeof cell === "number" ? "monospace" : "inherit"};">${escapeHtml(cell)}</td>`
            )
            .join("")}
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `
    : "";

  const qrText = encodeURIComponent(
    `ALHUSAINIA-INV:${data.invoiceNumber}|TOTAL:${data.total}|DATE:${data.invoiceDate}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrText}`;

  const partyLabel =
    data.documentType === "purchase"
      ? "بيانات المورِّد"
      : "بيانات العميل / الجهة";
  const partyName =
    data.documentType === "purchase"
      ? data.supplierName || "-"
      : data.customerName;
  const partyTaxId =
    data.documentType === "purchase" ? data.supplierTaxId : data.customerTaxId;

  const remainingAmount =
    data.remainingAmount != null
      ? data.remainingAmount
      : Math.max(0, (data.total || 0) - (data.paidAmount || 0));

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${docLabel} - ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; margin: 0; padding: 24px; color: #102a2b; background: #fff; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #b87945; padding-bottom: 12px; }
    .brand-logo { font-size: 20px; font-weight: 800; color: #102a2b; }
    .brand-sub { font-size: 11px; color: #b87945; margin-top: 4px; line-height: 1.4; }
    .inv-title { text-align: left; }
    .inv-number { font-size: 16px; font-weight: bold; color: #b87945; font-family: monospace; }
    .box-grid { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .info-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; font-size: 12px; }
    .info-box h3 { margin: 0 0 8px 0; font-size: 13px; color: #102a2b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    .info-box p { margin: 4px 0; }
    table.data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    table.data-table th { background: #102a2b; color: #fff; padding: 10px; text-align: right; }
    .totals-area { width: 320px; margin-right: auto; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #fafafa; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .totals-row.final { font-size: 14px; font-weight: bold; color: #b87945; border-bottom: none; padding-top: 8px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-logo">${instName}</div>
        <div class="brand-sub">الاستشارات الهندسية والمؤسسية | الخدمات الطلابية | صيانة الأجهزة</div>
        ${
          instPhone || instAddress || instTax
            ? `<div class="brand-sub">${[instPhone, instAddress, instTax ? `الرقم الضريبي: ${instTax}` : ""].filter(Boolean).join(" • ")}</div>`
            : ""
        }
      </td>
      <td class="inv-title">
        <div style="font-size: 18px; font-weight: bold;">${docLabel}</div>
        <div class="inv-number">رقم: ${escapeHtml(data.invoiceNumber)}</div>
        <div style="font-size: 11px; color: #64748b;">التاريخ: ${formattedDate}</div>
        ${data.reference ? `<div style="font-size: 11px; color: #64748b;">المرجع: ${escapeHtml(data.reference)}</div>` : ""}
        ${data.status ? `<div style="margin-top: 6px;">${statusBadge(data.status)}</div>` : ""}
      </td>
    </tr>
  </table>

  <div class="box-grid">
    <div class="info-box">
      <h3>${escapeHtml(partyLabel)}</h3>
      <p><strong>الاسم:</strong> ${escapeHtml(partyName || "-")}</p>
      ${data.customerPhone ? `<p><strong>الهاتف:</strong> ${escapeHtml(data.customerPhone)}</p>` : ""}
      ${data.customerAddress ? `<p><strong>العنوان:</strong> ${escapeHtml(data.customerAddress)}</p>` : ""}
      ${partyTaxId ? `<p><strong>الرقم الضريبي:</strong> ${escapeHtml(partyTaxId)}</p>` : ""}
    </div>
    <div class="info-box" style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px;">
      <div>
        <img src="${qrUrl}" alt="QR Code" width="110" height="110" style="border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px;" />
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">تحقق رقمي معتمد</div>
      </div>
    </div>
  </div>

  ${
    data.report
      ? reportTableHtml
      : `<table class="data-table">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>البيان / تفاصيل الخدمة</th>
        <th style="width: 70px; text-align: center;">الكمية</th>
        <th style="width: 110px; text-align: left;">سعر الوحدة</th>
        ${hasItemDiscounts ? '<th style="width: 90px; text-align: left;">خصم</th>' : ""}
        ${hasItemTaxes ? '<th style="width: 70px; text-align: center;">ضريبة</th>' : ""}
        <th style="width: 120px; text-align: left;">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${itemsTableHtml}
    </tbody>
  </table>`
  }

  <div class="totals-area">
    <div class="totals-row">
      <span>المجموع الفرعي:</span>
      <span style="font-family: monospace;">${fmt(data.subtotal)} ${currencyStr}</span>
    </div>
    ${
      data.discount
        ? `<div class="totals-row"><span>الخصم:</span><span style="font-family: monospace; color: #e11d48;">-${fmt(data.discount)}</span></div>`
        : ""
    }
    ${
      data.tax
        ? `<div class="totals-row"><span>الضريبة${data.taxRate ? ` (${fmt(data.taxRate, 0)}%)` : ""}:</span><span style="font-family: monospace;">${fmt(data.tax)}</span></div>`
        : ""
    }
    <div class="totals-row final">
      <span>الإجمالي النهائي:</span>
      <span style="font-family: monospace;">${fmt(data.total)} ${currencyStr}</span>
    </div>
    ${
      data.paidAmount != null
        ? `<div class="totals-row"><span>المدفوع:</span><span style="font-family: monospace; color: #065f46;">${fmt(data.paidAmount)}</span></div>`
        : ""
    }
    ${
      data.paidAmount != null
        ? `<div class="totals-row"><span>المتبقي:</span><span style="font-family: monospace; color: ${remainingAmount > 0.005 ? "#991b1b" : "#065f46"};">${fmt(remainingAmount)}</span></div>`
        : ""
    }
  </div>

  ${data.paymentMethod ? `<div style="margin-top: 12px; font-size: 11px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px 10px; border-radius: 6px; color: #1e40af;"><strong>طريقة الدفع:</strong> ${escapeHtml(data.paymentMethod)}</div>` : ""}
  ${data.notes ? `<div style="margin-top: 12px; font-size: 11px; background: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 6px; color: #92400e;"><strong>ملاحظات:</strong> ${escapeHtml(data.notes)}</div>` : ""}

  <div class="footer">
    <div>توقيع المستلم: ___________________</div>
    <div style="text-align: center;">
      <strong>${instName}</strong><br />
      صدر إلكترونياً عبر ${escapeHtml(brand.names.erpDisplay)} — ${formattedDate}
    </div>
    <div>توقيع البائع/الاستشاري: ___________________</div>
  </div>
</body>
</html>
  `;
}

export function openPrintableInvoiceWindow(data: InvoiceData) {
  const html = generatePrintableInvoiceHtml(data);
  const win = window.open("", "_blank", "width=850,height=900");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 400);
  }
}
