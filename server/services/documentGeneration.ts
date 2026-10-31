/**
 * Document Generation Service
 * Server-side professional document generation for all operational modules.
 * Supports ZATCA-compliant templates, multi-tenant, and customizable headers/footers.
 */

import { type DocumentTemplate } from "@shared/documentTemplate";
import { type COATemplate } from "../../shared/accounting/chartOfAccounts";
import { getCOATemplate } from "../../shared/accounting/chartOfAccounts";
import { settings } from "../../drizzle/schema";

export interface GeneratedDocument {
  html: string;
  css: string;
  title: string;
  documentType: string;
  template: DocumentTemplate;
}

export interface DocumentOptions {
  documentType: string;
  title: string;
  template: DocumentTemplate;
  bodyContent: string;
  pageNumber?: number;
  totalPages?: number;
  showHeader?: boolean;
  showFooter?: boolean;
}

export interface ZATCAPassthroughData {
  uuid: string;
  qrBase64: string;
  hash: string;
  stampedAt: string;
}

/**
 * Generate a complete professional document HTML
 */
export function generateDocument(opts: DocumentOptions): GeneratedDocument {
  const {
    documentType,
    title,
    template,
    bodyContent,
    pageNumber = 1,
    totalPages = 1,
  } = opts;

  const headerHtml = buildHeaderHtml(template);
  const footerHtml = buildFooterHtml(template, pageNumber, totalPages);
  const css = buildDocumentCSS(template);

  const html = `<!DOCTYPE html>
<html lang="${template.language === "ar" ? "ar" : "en"}" dir="${template.rtl ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  ${css}
</head>
<body>
  ${headerHtml}
  ${bodyContent}
  ${footerHtml}
</body>
</html>`;

  return { html, css, title, documentType, template };
}

function buildHeaderHtml(template: DocumentTemplate): string {
  const h = template.header;
  if (
    !h.showCompanyName &&
    !h.showLogo &&
    !h.customTextAbove &&
    !h.customTextBelow
  ) {
    return "";
  }

  const fontSize =
    h.fontSize === "lg" ? "18px" : h.fontSize === "md" ? "14px" : "11px";
  const bgStyle = `background:${h.backgroundColor};color:${h.textColor};font-size:${fontSize};direction:${template.rtl ? "rtl" : "ltr"};text-align:${template.rtl ? "right" : "left"};padding:10px 15px;border-bottom:${h.borderBottom ? "2px solid #b87945" : "none"};margin-bottom:16px;`;

  let inner = "";
  if (h.customTextAbove)
    inner += `<div class="doc-hdr-above">${escHtml(h.customTextAbove)}</div>`;
  if (h.showLogo && h.logoUrl)
    inner += `<img src="${escHtml(h.logoUrl)}" class="doc-hdr-logo" style="width:48px;height:48px;border-radius:8px;" alt="logo"/>`;
  if (h.showCompanyName && h.companyName)
    inner += `<div class="doc-hdr-company" style="font-weight:900;">${escHtml(h.companyName)}</div>`;
  if (h.customTextBelow)
    inner += `<div class="doc-hdr-below">${escHtml(h.customTextBelow)}</div>`;

  return `<div class="doc-header" style="${bgStyle}">${inner}</div>`;
}

function buildFooterHtml(
  template: DocumentTemplate,
  page: number,
  total: number
): string {
  const f = template.footer;
  if (
    !f.showPageNumbers &&
    !f.showDate &&
    !f.showCompanyName &&
    !f.customTextAbove &&
    !f.customTextBelow
  ) {
    return "";
  }

  const fontSize =
    f.fontSize === "lg" ? "14px" : f.fontSize === "md" ? "12px" : "10px";
  const bgStyle = `background:${f.backgroundColor};color:${f.textColor};font-size:${fontSize};direction:${template.rtl ? "rtl" : "ltr"};text-align:${template.rtl ? "right" : "left"};padding:8px 15px;border-top:${f.borderTop ? "1px solid #b87945" : "none"};margin-top:20px;`;

  let inner = "";
  if (f.showPageNumbers)
    inner += `<span class="doc-ft-pages">صفحة ${page} من ${total}</span>`;
  if (f.showDate)
    inner += `<span class="doc-ft-date">${new Date().toLocaleDateString("ar-EG")}</span>`;
  if (f.showCompanyName)
    inner += `<span class="doc-ft-company">${escHtml(template.header.companyName)}</span>`;
  if (f.customTextBelow)
    inner += `<span class="doc-ft-custom">${escHtml(f.customTextBelow)}</span>`;

  return `<div class="doc-footer" style="${bgStyle}">${inner}</div>`;
}

function buildDocumentCSS(template: DocumentTemplate): string {
  return `
    <style>
      @page {
        size: ${template.paperSize === "custom" ? "A4" : template.paperSize} ${template.orientation};
        margin: ${template.marginTop}mm ${template.marginRight}mm ${template.marginBottom}mm ${template.marginLeft}mm;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: ${escHtml(template.fontFamily)};
        direction: ${template.rtl ? "rtl" : "ltr"};
        text-align: ${template.rtl ? "right" : "left"};
        color: #17211f;
        background: #fff;
      }
      .doc-header { transition: all 0.3s ease; }
      .doc-footer { transition: all 0.3s ease; }
      .doc-hdr-above { margin-bottom: 4px; }
      .doc-hdr-company { font-size: 1.2em; letter-spacing: 0.5px; }
      .doc-hdr-logo { object-fit: contain; }
      .doc-hdr-page { margin-top: 4px; opacity: 0.8; }
      .doc-ft-pages { margin-left: 12px; }
      .doc-ft-date { margin-left: 12px; }
      .doc-ft-company { margin-left: 12px; }
      .doc-ft-custom { margin-left: 12px; }
      @media print {
        body { padding: 0; }
        .doc-header, .doc-footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        .doc-header, .doc-footer { break-inside: avoid; }
      }
    </style>
  `;
}

function escHtml(v: unknown): string {
  return String(v ?? "").replace(
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
}

/**
 * Generate a ZATCA-compliant invoice document
 */
export function generateZATCAInvoiceDocument(opts: {
  template: DocumentTemplate;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  vatAmount: number;
  sellerName: string;
  sellerVatNumber: string;
  buyerName: string;
  buyerTaxNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  zatcaData: ZATCAPassthroughData;
  paymentMethod: string;
}): GeneratedDocument {
  const {
    template,
    invoiceNumber,
    invoiceDate,
    totalAmount,
    vatAmount,
    sellerName,
    sellerVatNumber,
    buyerName,
    buyerTaxNumber,
    items,
    zatcaData,
    paymentMethod,
  } = opts;

  const itemsHtml = items
    .map(
      (item, i) => `
    <tr>
      <td style="text-align:right;border:1px solid #ddd;padding:8px;">${i + 1}</td>
      <td style="text-align:right;border:1px solid #ddd;padding:8px;">${escHtml(item.name)}</td>
      <td style="text-align:center;border:1px solid #ddd;padding:8px;">${item.quantity}</td>
      <td style="text-align:right;border:1px solid #ddd;padding:8px;">${item.unitPrice.toFixed(2)}</td>
      <td style="text-align:right;border:1px solid #ddd;padding:8px;">${item.total.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const body = `
    <div style="margin:20px 0;">
      <h2 style="text-align:center;font-size:20px;color:#102a2b;">فاتورة مبيعات</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;">
        <div style="border:1px solid #ddd;border-radius:10px;padding:12px;">
          <h3 style="color:#b87945;margin:0 0 8px;font-size:13px;">بيانات البائع</h3>
          <p>${escHtml(sellerName)}</p>
          <p>الرقم الضريبي: ${escHtml(sellerVatNumber)}</p>
        </div>
        <div style="border:1px solid #ddd;border-radius:10px;padding:12px;">
          <h3 style="color:#b87945;margin:0 0 8px;font-size:13px;">بيانات المشتري</h3>
          <p>${escHtml(buyerName)}</p>
          <p>الرقم الضريبي: ${escHtml(buyerTaxNumber)}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;">
        <thead>
          <tr style="background:#102a2b;color:#fff;">
            <th style="text-align:center;padding:8px;">#</th>
            <th style="text-align:right;padding:8px;">الصنف</th>
            <th style="text-align:center;padding:8px;">الكمية</th>
            <th style="text-align:right;padding:8px;">سعر الوحدة</th>
            <th style="text-align:right;padding:8px;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:12px;">
        <table style="width:320px;">
          <tr><td style="border:none;padding:5px 10px;">الإجمالي الفرعي</td><td style="border:none;padding:5px 10px;text-align:right;">${totalAmount.toFixed(2)}</td></tr>
          <tr><td style="border:none;padding:5px 10px;">الضريبة (VAT)</td><td style="border:none;padding:5px 10px;text-align:right;">${vatAmount.toFixed(2)}</td></tr>
          <tr style="font-weight:900;font-size:14px;color:#102a2b;border-top:2px solid #b87945;"><td style="border:none;padding:5px 10px;">الإجمالي النهائي</td><td style="border:none;padding:5px 10px;text-align:right;">${totalAmount.toFixed(2)}</td></tr>
        </table>
      </div>
      ${zatcaData.qrBase64 ? `<div style="margin-top:14px;border:2px solid #102a2b;border-radius:10px;padding:12px;display:flex;gap:16px;align-items:center;"><img src="${zatcaData.qrBase64}" alt="QR" style="width:120px;height:120px;"/><div class="zinfo"><p>UUID: <code>${escHtml(zatcaData.uuid)}</code></p><p>البصمة: <code>${escHtml(zatcaData.hash)}</code></p></div></div>` : ""}
    </div>
  `;

  return generateDocument({
    documentType: "sale_invoice",
    title: `فاتورة ${invoiceNumber}`,
    template,
    bodyContent: body,
  });
}

/**
 * Get document template for a specific tenant
 */
export async function getTenantDocumentTemplate(
  tenantId: number,
  db: any
): Promise<DocumentTemplate> {
  try {
    const row = await db.select().from(settings).where({ tenantId }).limit(1);
    if (row[0]?.documentTemplate) {
      return JSON.parse(row[0].documentTemplate);
    }
    return DEFAULT_DOCUMENT_TEMPLATE;
  } catch {
    return DEFAULT_DOCUMENT_TEMPLATE;
  }
}

// Default template fallback
const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplate = {
  id: "default",
  name: "القالب الافتراضي",
  isDefault: true,
  header: {
    showCompanyName: false,
    showLogo: false,
    companyName: "",
    logoUrl: "",
    customTextAbove: "",
    customTextBelow: "",
    backgroundColor: "#ffffff",
    textColor: "#17211f",
    fontSize: "md",
    borderBottom: false,
  },
  footer: {
    showPageNumbers: true,
    showDate: false,
    showCompanyName: false,
    customTextAbove: "",
    customTextBelow: "",
    backgroundColor: "#ffffff",
    textColor: "#777777",
    fontSize: "sm",
    borderTop: false,
  },
  marginTop: 26,
  marginBottom: 26,
  marginLeft: 26,
  marginRight: 26,
  paperSize: "a4",
  orientation: "portrait",
  fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
  language: "both",
  rtl: true,
};
