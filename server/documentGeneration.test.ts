import { describe, it, expect } from "vitest";
import {
  generateDocument,
  generateZATCAInvoiceDocument,
} from "./services/documentGeneration";
import { DEFAULT_DOCUMENT_TEMPLATE } from "../shared/documentTemplate";

describe("documentGeneration", () => {
  it("generates a full HTML document with header and footer", () => {
    const doc = generateDocument({
      documentType: "test_doc",
      title: "مستند اختبار",
      template: {
        ...DEFAULT_DOCUMENT_TEMPLATE,
        header: {
          ...DEFAULT_DOCUMENT_TEMPLATE.header,
          showCompanyName: true,
          companyName: "شركة الاختبار",
        },
        footer: {
          ...DEFAULT_DOCUMENT_TEMPLATE.footer,
          showPageNumbers: true,
        },
      },
      bodyContent: "<p>المحتوى</p>",
      pageNumber: 1,
      totalPages: 3,
    });
    expect(doc.html).toContain("<!DOCTYPE html>");
    expect(doc.html).toContain("شركة الاختبار");
    expect(doc.html).toContain("المحتوى");
    expect(doc.html).toContain("صفحة 1 من 3");
    expect(doc.documentType).toBe("test_doc");
  });

  it("suppresses header and footer when all flags are off", () => {
    const doc = generateDocument({
      documentType: "plain",
      title: "plain",
      template: {
        ...DEFAULT_DOCUMENT_TEMPLATE,
        header: {
          ...DEFAULT_DOCUMENT_TEMPLATE.header,
          showCompanyName: false,
          showLogo: false,
          customTextAbove: "",
          customTextBelow: "",
        },
        footer: {
          ...DEFAULT_DOCUMENT_TEMPLATE.footer,
          showPageNumbers: false,
          showDate: false,
          showCompanyName: false,
          customTextAbove: "",
          customTextBelow: "",
        },
      },
      bodyContent: "<p>فقط المحتوى</p>",
    });
    expect(doc.html).not.toContain('<div class="doc-header"');
    expect(doc.html).not.toContain('<div class="doc-footer"');
    expect(doc.html).toContain("فقط المحتوى");
  });

  it("escapes HTML in company names (XSS-safe)", () => {
    const doc = generateDocument({
      documentType: "xss",
      title: "xss",
      template: {
        ...DEFAULT_DOCUMENT_TEMPLATE,
        header: {
          ...DEFAULT_DOCUMENT_TEMPLATE.header,
          showCompanyName: true,
          companyName: "<script>alert(1)</script>",
        },
      },
      bodyContent: "<p>ok</p>",
    });
    expect(doc.html).not.toContain("<script>alert(1)</script>");
    expect(doc.html).toContain("&lt;script&gt;");
  });

  it("generates a ZATCA invoice with items table and totals", () => {
    const doc = generateZATCAInvoiceDocument({
      template: DEFAULT_DOCUMENT_TEMPLATE,
      invoiceNumber: "SI-001",
      invoiceDate: "2026-09-10",
      totalAmount: 1150,
      vatAmount: 150,
      sellerName: "البائع",
      sellerVatNumber: "123456789",
      buyerName: "المشتري",
      buyerTaxNumber: "987654321",
      items: [{ name: "صنف أ", quantity: 2, unitPrice: 500, total: 1000 }],
      zatcaData: {
        uuid: "uuid-123",
        qrBase64: "data:image/png;base64,AAA",
        hash: "hash-abc",
        stampedAt: "2026-09-10",
      },
      paymentMethod: "cash",
    });
    expect(doc.documentType).toBe("sale_invoice");
    expect(doc.html).toContain("صنف أ");
    expect(doc.html).toContain("1150.00");
    expect(doc.html).toContain("uuid-123");
  });
});
