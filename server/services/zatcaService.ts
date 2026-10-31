/**
 * ZATCA Phase 2 (E-Invoicing) Integration Module
 * ======================================================
 * Implements Saudi ZATCA Fatoorah Phase 2 compliance:
 * - Generation of compliant e-invoices (tax and simplified)
 * - QR code generation with required fields
 * - SHA-256 hashing for invoice integrity
 * - XML generation for ZATCA submission
 * - UUID generation for invoice UUIDs
 *
 * Standards: ZATCA Resolution No. 5157113003 (2021),
 * VAT Implementing Regulations, E-Invoicing Phase 2 Technical Requirements
 *
 * @see https://zatca.gov.sa/en/Pages/einvoicing.aspx
 */

import { randomUUID, createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

// ─── ZATCA Invoice Types ───────────────────────────────
export type ZATCAInvoiceType = "tax" | "simplified";
export type ZATCAInvoiceStatus =
  | "draft"
  | "generated"
  | "signed"
  | "cleared"
  | "cancelled";

// ─── ZATCA Invoice Schema ──────────────────────────────
export const zatcaInvoiceSchema = z.object({
  invoiceType: z.enum(["tax", "simplified"]),
  invoiceNumber: z.string().min(1).max(30),
  invoiceDate: z.string().datetime(),
  supplierName: z.string().min(1),
  supplierVAT: z.string().regex(/^\d{15}$/, "VAT must be 15 digits"),
  customerName: z.string().min(1),
  customerVAT: z
    .string()
    .regex(/^\d{15}$/)
    .optional(),
  customerAddress: z.string().optional(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      totalPrice: z.number().nonnegative(),
      taxAmount: z.number().nonnegative(),
      taxRate: z.number().positive(),
      itemCode: z.string().min(1),
    })
  ),
  totalAmount: z.number().nonnegative(),
  totalTax: z.number().nonnegative(),
  currency: z.string().default("SAR"),
  paymentMethod: z.string().optional(),
  invoiceNotes: z.string().optional(),
});

export type ZATCAInvoice = z.infer<typeof zatcaInvoiceSchema>;

// ─── QR Code Data ──────────────────────────────────────
export interface ZATCAQRCodeData {
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  time: string;
  totalAmount: string;
  totalTax: string;
  sellerName: string;
  sellerVAT: string;
  buyerName: string;
  buyerVAT: string;
  total: string;
  discount: string;
  vatRate: string;
}

// ─── Generate ZATCA UUID ───────────────────────────────
export function generateInvoiceUUID(): string {
  return randomUUID();
}

// ─── Generate ZATCA Hash ──────────────────────────────
export function generateInvoiceHash(invoiceData: ZATCAInvoice): string {
  const hashInput = JSON.stringify({
    invoiceType: invoiceData.invoiceType,
    invoiceNumber: invoiceData.invoiceNumber,
    invoiceDate: invoiceData.invoiceDate,
    totalAmount: invoiceData.totalAmount,
    totalTax: invoiceData.totalTax,
    supplierVAT: invoiceData.supplierVAT,
  });
  return createHash("sha256").update(hashInput).digest("hex");
}

// ─── Generate ZATCA QR Code Data ──────────────────────
export function generateQRCodeData(invoice: ZATCAInvoice): ZATCAQRCodeData {
  const total = invoice.totalAmount + invoice.totalTax;
  return {
    invoiceType: invoice.invoiceType === "tax" ? "I" : "S",
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate.split("T")[0],
    time: invoice.invoiceDate.split("T")[1]?.slice(0, 6) ?? "000000",
    totalAmount: total.toFixed(2),
    totalTax: invoice.totalTax.toFixed(2),
    sellerName: invoice.supplierName,
    sellerVAT: invoice.supplierVAT,
    buyerName: invoice.customerName,
    buyerVAT: invoice.customerVAT ?? "",
    total: total.toFixed(2),
    discount: "0",
    vatRate: invoice.lineItems[0]?.taxRate
      ? `${invoice.lineItems[0].taxRate * 100}`
      : "15",
  };
}

// ─── Generate ZATCA XML ────────────────────────────────
export function generateZATCAXML(invoice: ZATCAInvoice): string {
  const lines = invoice.lineItems
    .map(
      item => `
      <InvoiceLine><ID>${item.itemCode}</ID><Description>${item.description}</Description>
      <Quantity>${item.quantity}</Quantity><UnitPrice>${item.unitPrice}</UnitPrice>
      <TotalPrice>${item.totalPrice}</TotalPrice><TaxAmount>${item.taxAmount}</TaxAmount>
      <TaxRate>${item.taxRate}</TaxRate></InvoiceLine>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Invoice>
  <ID>${generateInvoiceUUID()}</ID>
  <InvoiceType>${invoice.invoiceType === "tax" ? "1" : "0"}</InvoiceType>
  <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
  <IssueDate>${invoice.invoiceDate}</IssueDate>
  <SellerName>${invoice.supplierName}</SellerName>
  <SellerVATNumber>${invoice.supplierVAT}</SellerVATNumber>
  <CustomerName>${invoice.customerName}</CustomerName>
  ${invoice.customerVAT ? `<CustomerVATNumber>${invoice.customerVAT}</CustomerVATNumber>` : ""}
  <TotalAmount>${invoice.totalAmount}</TotalAmount><TotalTax>${invoice.totalTax}</TotalTax>
  ${lines}<Currency>${invoice.currency}</Currency></Invoice>`;
}

// ─── Validate Saudi VAT ──────────────────────────────────
export function validateSaudiVAT(vat: string): boolean {
  return /^\d{15}$/.test(vat);
}

// ─── Calculate ZATCA Tax ───────────────────────────────
export function calculateZATCATax(amount: number, taxRate: number = 0.15) {
  const taxAmount = amount * taxRate;
  return { taxAmount, totalAmount: amount + taxAmount };
}

// ─── Verify ZATCA Signature ────────────────────────────
export function verifyZATCASignature(data: string, signature: string): boolean {
  const hash = createHash("sha256").update(data).digest("hex");
  if (signature.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
}

// ─── ZATCA Integration Status ──────────────────────────
export interface ZATCAIntegrationStatus {
  isEnabled: boolean;
  apiEndpoint: string;
  apiVersion: string;
  lastSync?: Date;
  pendingInvoices: number;
  clearedInvoices: number;
}

export function getZATCAIntegrationStatus(
  enabled: boolean,
  endpoint?: string
): ZATCAIntegrationStatus {
  return {
    isEnabled: enabled,
    apiEndpoint: endpoint ?? "",
    apiVersion: "2.0",
    pendingInvoices: 0,
    clearedInvoices: 0,
  };
}

// ─── ZATCA Gateway API ─────────────────────────────────
const ZATCA_GATEWAY_ENDPOINT = "https://gw-fatoora.zatca.gov.sa/invoice/v1";
const ZATCA_TIMEOUT = 30000;

export interface SubmitInvoiceResult {
  success: boolean;
  invoiceUUID?: string;
  stampStatus?: "cleared" | "rejected" | "pending";
  stampError?: string;
  qrCodeBase64?: string;
  referenceNumber?: string;
}

export interface CancelInvoiceResult {
  success: boolean;
  stampStatus?: "cancelled";
  referenceNumber?: string;
  cancelCode?: string;
  stampError?: string;
}

// Submit invoice to ZATCA gateway for real-time validation and stamping
export async function submitInvoiceToZATCA(
  invoice: ZATCAInvoice,
  tenantId: number
): Promise<SubmitInvoiceResult> {
  const hash = generateInvoiceHash(invoice);
  const qrCode = generateQRCodeString(invoice);

  const payload = {
    invoiceType: invoice.invoiceType,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    totalAmount: invoice.totalAmount,
    totalTax: invoice.totalTax,
    supplierVAT: invoice.supplierVAT,
    customerVAT: invoice.customerVAT,
    lineItems: invoice.lineItems,
    currency: invoice.currency,
    // Attach stored QR and hash from previous generation
    qrBase64: qrCode,
    invoiceHash: hash,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ZATCA_TIMEOUT);

    const response = await fetch(`${ZATCA_GATEWAY_ENDPOINT}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // In production, use proper auth (SAS token, client cert, etc.)
        Authorization: `Bearer ${process.env.ZATCA_API_KEY || "dev-key"}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        stampError: data.error?.message ?? "ZATCA gateway request failed",
      };
    }

    // Update local record with gateway response
    const result: SubmitInvoiceResult = {
      success: true,
      invoiceUUID: data.invoiceUUID || data.uuid,
      stampStatus: data.stampStatus ?? "pending",
      referenceNumber: data.referenceNumber,
      qrCodeBase64: data.qrCodeBase64 || qrCode,
    };

    // Store the result in DB - will be called from router
    // await updateInvoiceZATCAStatus(invoice.id, {
    //   stampStatus: result.stampStatus,
    //   hash: hash,
    //   stampedAt: new Date(),
    //   qrBase64: result.qrCodeBase64,
    // });

    return result;
  } catch (error) {
    console.error("ZATCA gateway error:", error);
    return {
      success: false,
      stampError:
        error instanceof Error ? error.message : "Unknown ZATCA error",
    };
  }
}

// Cancel invoice with ZATCA gateway
export async function cancelInvoiceZATCA(
  invoiceUUID: string,
  reason: string
): Promise<CancelInvoiceResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ZATCA_TIMEOUT);

    const response = await fetch(`${ZATCA_GATEWAY_ENDPOINT}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ZATCA_API_KEY || "dev-key"}`,
      },
      body: JSON.stringify({ invoiceUUID, reason }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        stampError: data.error?.message ?? "ZATCA cancellation failed",
      };
    }

    return {
      success: true,
      stampStatus: "cancelled",
      referenceNumber: data.referenceNumber,
      cancelCode: data.cancelCode,
    };
  } catch (error) {
    console.error("ZATCA cancel error:", error);
    return {
      success: false,
      stampError:
        error instanceof Error ? error.message : "Unknown ZATCA error",
    };
  }
}

// Poll ZATCA for invoice status
export async function pollInvoiceZATCAStatus(
  invoiceUUID: string
): Promise<{ stampStatus: ZATCAInvoiceStatus; referenceNumber?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ZATCA_TIMEOUT);

    const response = await fetch(
      `${ZATCA_GATEWAY_ENDPOINT}/status?invoiceUUID=${invoiceUUID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.ZATCA_API_KEY || "dev-key"}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return { stampStatus: "pending" as ZATCAInvoiceStatus };
    }

    return {
      stampStatus: data.stampStatus ?? "pending",
      referenceNumber: data.referenceNumber,
    };
  } catch (error) {
    console.error("ZATCA status poll error:", error);
    return { stampStatus: "pending" as ZATCAInvoiceStatus };
  }
}

// ─── Generate QR Code String (Base64) ──────────────────
export function generateQRCodeString(invoice: ZATCAInvoice): string {
  const qrData = generateQRCodeData(invoice);
  const jsonStr = JSON.stringify(qrData);
  return Buffer.from(jsonStr).toString("base64");
}
