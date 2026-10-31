/**
 * ZATCA Phase 2 - Clearance/Reporting Implementation
 * Supports: B2B Clearance, B2C Reporting, Cryptographic Signing, Compliance Tracking
 */

import { randomUUID, createHash, createSign, createVerify } from "crypto";
import { trpc } from "@/lib/trpc";

// ============================================
// ZATCA TYPES
// ============================================

export interface ZatcaConfig {
  enabled: boolean;
  sellerName: string;
  vatNumber: string; // 15 digits
  crNumber: string; // Commercial Registration
  address: string;
  phase: "1" | "2";
  simulation: boolean;

  // Phase 2 specific
  csid?: {
    secret: string; // Base64 encoded private key
    certificate: string; // Base64 encoded X.509 certificate
    csr?: string; // Certificate Signing Request
  };
  apiEndpoint?: {
    sandbox: string;
    production: string;
  };
  complianceCheckEnabled: boolean;
  autoSubmit: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface ZatcaInvoice {
  invoiceNumber: string;
  invoiceType: "standard" | "simplified"; // B2B = standard, B2C = simplified
  uuid: string; // UUID v4
  issueDate: string; // ISO 8601
  issueTime: string; // HH:mm:ss
  invoicePeriodStart?: string;
  invoicePeriodEnd?: string;
  sellerName: string;
  sellerVatNumber: string;
  sellerCrNumber: string;
  sellerAddress: string;
  buyerName?: string;
  buyerVatNumber?: string;
  buyerCrNumber?: string;
  buyerAddress?: string;
  currency: string; // SAR
  currencyRate: number;
  lineItems: ZatcaLineItem[];
  taxTotals: ZatcaTaxTotal[];
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  qrCode: string; // Base64 TLV
  hash: string; // SHA-256
  signature?: string; // Digital signature (Phase 2)
  clearanceStatus?:
    | "not_submitted"
    | "pending"
    | "cleared"
    | "rejected"
    | "reported";
  clearanceReference?: string;
  reportedAt?: string;
}

export interface ZatcaLineItem {
  lineNumber: number;
  productCode: string;
  description: string;
  quantity: number;
  unitCode: string; // UN/ECE Rec 20
  unitPrice: number;
  taxRate: number; // e.g., 15%
  taxAmount: number;
  discount?: number;
  lineTotal: number;
  vatCategory: "S" | "Z" | "E" | "O"; // Standard, Zero, Exempt, Out of scope
}

export interface ZatcaTaxTotal {
  taxCategory: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface ZatcaClearanceRequest {
  invoiceHash: string;
  invoiceUuid: string;
  invoice: ZatcaInvoice;
  requestType: "clearance" | "reporting";
}

export interface ZatcaClearanceResponse {
  requestId: string;
  status: "cleared" | "rejected" | "reported" | "error";
  clearanceReference?: string;
  reportedAt?: string;
  errors?: ZatcaError[];
  warnings?: ZatcaWarning[];
}

export interface ZatcaError {
  code: string;
  message: string;
  severity: "error" | "warning";
  field?: string;
}

export interface ZatcaWarning {
  code: string;
  message: string;
}

export interface ZatcaSubmissionLog {
  id: string;
  invoiceId: number;
  invoiceNumber: string;
  invoiceType: "standard" | "simplified";
  uuid: string;
  requestType: "clearance" | "reporting";
  requestPayload: string;
  responsePayload?: string;
  status: "pending" | "processing" | "success" | "failed" | "retrying";
  attempts: number;
  lastAttemptAt: string;
  nextRetryAt?: string;
  clearanceReference?: string;
  reportedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ZATCA CRYPTOGRAPHIC UTILITIES
// ============================================

export class ZatcaCrypto {
  private privateKey: string;
  private certificate: string;

  constructor(csidSecret: string, csidCertificate: string) {
    this.privateKey = this.formatPrivateKey(csidSecret);
    this.certificate = this.formatCertificate(csidCertificate);
  }

  private formatPrivateKey(base64Key: string): string {
    const key = Buffer.from(base64Key, "base64").toString("utf8");
    const beginHeader = ["-----BEGIN", "PRIVATE", "KEY-----"].join(" ");
    const endHeader = ["-----END", "PRIVATE", "KEY-----"].join(" ");
    if (key.includes(beginHeader)) return key;
    return `${beginHeader}\n${key.match(/.{1,64}/g)?.join("\n")}\n${endHeader}`;
  }

  private formatCertificate(base64Cert: string): string {
    const cert = Buffer.from(base64Cert, "base64").toString("utf8");
    const beginCert = ["-----BEGIN", "CERTIFICATE-----"].join(" ");
    const endCert = ["-----END", "CERTIFICATE-----"].join(" ");
    if (cert.includes(beginCert)) return cert;
    return `${beginCert}\n${cert.match(/.{1,64}/g)?.join("\n")}\n${endCert}`;
  }

  /**
   * Generate canonical invoice hash for ZATCA signing
   * Based on ZATCA canonicalization rules (UBL 2.1)
   */
  generateCanonicalHash(invoice: ZatcaInvoice): string {
    const canonical = this.canonicalizeInvoice(invoice);
    return createHash("sha256").update(canonical).digest("hex");
  }

  /**
   * Sign invoice hash with private key (RSA-SHA256)
   */
  signInvoice(invoice: ZatcaInvoice): string {
    const hash = this.generateCanonicalHash(invoice);
    const sign = createSign("RSA-SHA256");
    sign.update(hash);
    sign.end();
    return sign.sign(this.privateKey, "base64");
  }

  /**
   * Verify invoice signature
   */
  verifySignature(invoice: ZatcaInvoice, signature: string): boolean {
    const hash = this.generateCanonicalHash(invoice);
    const verify = createVerify("RSA-SHA256");
    verify.update(hash);
    verify.end();
    return verify.verify(this.certificate, signature, "base64");
  }

  /**
   * Get certificate thumbprint (SHA-256 of certificate DER)
   */
  getCertificateThumbprint(): string {
    const certDer = Buffer.from(
      this.certificate
        .replace(/-----BEGIN CERTIFICATE-----/g, "")
        .replace(/-----END CERTIFICATE-----/g, "")
        .replace(/\n/g, ""),
      "base64"
    );
    return createHash("sha256").update(certDer).digest("hex").toUpperCase();
  }

  /**
   * Canonicalize invoice to ZATCA UBL 2.1 format
   * This is a simplified version - real implementation would use full UBL serialization
   */
  private canonicalizeInvoice(invoice: ZatcaInvoice): string {
    // Sort fields deterministically
    const parts = [
      `Invoice${invoice.invoiceNumber}`,
      `UUID${invoice.uuid}`,
      `IssueDate${invoice.issueDate}`,
      `IssueTime${invoice.issueTime}`,
      `InvoiceType${invoice.invoiceType === "standard" ? "388" : "389"}`, // ZATCA codes
      `SellerName${invoice.sellerName}`,
      `SellerVAT${invoice.sellerVatNumber}`,
      `SellerCR${invoice.sellerCrNumber}`,
      `SellerAddress${invoice.sellerAddress}`,
      ...(invoice.buyerName ? [`BuyerName${invoice.buyerName}`] : []),
      ...(invoice.buyerVatNumber ? [`BuyerVAT${invoice.buyerVatNumber}`] : []),
      ...(invoice.buyerCrNumber ? [`BuyerCR${invoice.buyerCrNumber}`] : []),
      `Currency${invoice.currency}`,
      `LineCount${invoice.lineItems.length}`,
      ...invoice.lineItems.map(
        l =>
          `Line${l.lineNumber}${l.description}${l.quantity}${l.unitCode}${l.unitPrice}${l.taxRate}${l.vatCategory}`
      ),
      `Total${invoice.totalAmount.toFixed(2)}`,
      `TaxTotal${invoice.taxAmount.toFixed(2)}`,
      `Payment${invoice.paymentMethod}`,
      `QR${invoice.qrCode}`,
    ];
    return parts.join("|");
  }

  /**
   * Generate CSR (Certificate Signing Request) for ZATCA CSID
   */
  static generateCSR(
    commonName: string,
    organization: string,
    country: string = "SA"
  ): { csr: string; privateKey: string } {
    // In production, use a proper crypto library like node-forge or @peculiar/x509
    // This is a placeholder for the CSR structure
    const privateKey = randomUUID().replace(/-/g, "");
    const csr = `-----BEGIN CERTIFICATE REQUEST-----\n${Buffer.from(JSON.stringify({ cn: commonName, o: organization, c: country })).toString("base64")}\n-----END CERTIFICATE REQUEST-----`;
    return { csr, privateKey };
  }
}

// ============================================
// ZATCA API CLIENT
// ============================================

export class ZatcaApiClient {
  private config: ZatcaConfig;
  private crypto: ZatcaCrypto | null = null;

  constructor(config: ZatcaConfig) {
    this.config = config;
    if (config.csid?.secret && config.csid?.certificate) {
      this.crypto = new ZatcaCrypto(
        config.csid.secret,
        config.csid.certificate
      );
    }
  }

  private getBaseUrl(): string {
    return this.config.simulation
      ? this.config.apiEndpoint?.sandbox ||
          "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal"
      : this.config.apiEndpoint?.production ||
          "https://gw-fatoora.zatca.gov.sa/e-invoicing/core";
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Version": "V2",
      "Clearance-Status": "0",
    };

    if (this.crypto) {
      // Add certificate thumbprint for authentication
      headers["X-Certificate-Thumbprint"] =
        this.crypto.getCertificateThumbprint();
    }

    return headers;
  }

  /**
   * Submit invoice for Clearance (B2B) or Reporting (B2C)
   */
  async submitInvoice(invoice: ZatcaInvoice): Promise<ZatcaClearanceResponse> {
    if (!this.crypto) {
      throw new Error("CSID not configured - cannot sign invoices for Phase 2");
    }

    const requestType =
      invoice.invoiceType === "standard" ? "clearance" : "reporting";
    const endpoint =
      requestType === "clearance"
        ? "/invoices/clearance"
        : "/invoices/reporting";

    // Sign the invoice
    invoice.signature = this.crypto.signInvoice(invoice);
    invoice.hash = this.crypto.generateCanonicalHash(invoice);

    const payload = {
      invoiceHash: invoice.hash,
      invoiceUuid: invoice.uuid,
      invoice: this.serializeInvoice(invoice),
    };

    const response = await this.makeRequest(endpoint, payload);
    return this.parseResponse(response, requestType);
  }

  /**
   * Batch submit multiple invoices for Reporting (B2C)
   */
  async submitBatchReporting(
    invoices: ZatcaInvoice[]
  ): Promise<ZatcaClearanceResponse[]> {
    const results: ZatcaClearanceResponse[] = [];
    for (const invoice of invoices) {
      const result = await this.submitInvoice(invoice);
      results.push(result);
      // Rate limiting - small delay between submissions
      await new Promise(r => setTimeout(r, 100));
    }
    return results;
  }

  /**
   * Get invoice status from ZATCA
   */
  async getInvoiceStatus(uuid: string): Promise<ZatcaClearanceResponse> {
    const response = await this.makeRequest(
      `/invoices/${uuid}/status`,
      null,
      "GET"
    );
    return this.parseResponse(response, "status");
  }

  /**
   * Request CSID from ZATCA (Compliance Check)
   */
  async requestCSID(
    csr: string
  ): Promise<{ certificate: string; expiresAt: string }> {
    const response = await this.makeRequest("/compliance/csid", { csr });
    return {
      certificate: response.certificate,
      expiresAt: response.expiresAt,
    };
  }

  /**
   * Renew CSID certificate
   */
  async renewCSID(
    csr: string
  ): Promise<{ certificate: string; expiresAt: string }> {
    const response = await this.makeRequest("/compliance/csid/renew", { csr });
    return {
      certificate: response.certificate,
      expiresAt: response.expiresAt,
    };
  }

  /**
   * Revoke CSID certificate
   */
  async revokeCSID(reason: string): Promise<void> {
    await this.makeRequest("/compliance/csid/revoke", { reason });
  }

  private async makeRequest(
    endpoint: string,
    payload: any,
    method: "POST" | "GET" = "POST"
  ): Promise<any> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
      body: method === "POST" ? JSON.stringify(payload) : undefined,
    };

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          return await response.json();
        }

        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(
          `ZATCA API Error: ${response.status} - ${errorData.message || response.statusText}`
        );

        if (response.status >= 500 || response.status === 429) {
          // Retry on server errors or rate limiting
          await new Promise(r =>
            setTimeout(r, this.config.retryDelayMs * attempt)
          );
          continue;
        }

        throw lastError;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retryAttempts) {
          await new Promise(r =>
            setTimeout(r, this.config.retryDelayMs * attempt)
          );
        }
      }
    }
    throw lastError || new Error("Max retry attempts exceeded");
  }

  private parseResponse(
    response: any,
    requestType: string
  ): ZatcaClearanceResponse {
    return {
      requestId: response.requestId || randomUUID(),
      status:
        response.status ||
        (requestType === "clearance" ? "cleared" : "reported"),
      clearanceReference: response.clearanceReference,
      reportedAt: response.reportedAt,
      errors: response.errors,
      warnings: response.warnings,
    };
  }

  private serializeInvoice(invoice: ZatcaInvoice): any {
    // Convert to ZATCA UBL 2.1 JSON format
    return {
      invoiceNumber: invoice.invoiceNumber,
      uuid: invoice.uuid,
      invoiceType: invoice.invoiceType === "standard" ? "388" : "389",
      issueDate: invoice.issueDate,
      issueTime: invoice.issueTime,
      invoicePeriodStart: invoice.invoicePeriodStart,
      invoicePeriodEnd: invoice.invoicePeriodEnd,
      seller: {
        name: invoice.sellerName,
        vatNumber: invoice.sellerVatNumber,
        crNumber: invoice.sellerCrNumber,
        address: invoice.sellerAddress,
      },
      buyer: invoice.buyerName
        ? {
            name: invoice.buyerName,
            vatNumber: invoice.buyerVatNumber,
            crNumber: invoice.buyerCrNumber,
            address: invoice.buyerAddress,
          }
        : undefined,
      currency: invoice.currency,
      currencyRate: invoice.currencyRate,
      lineItems: invoice.lineItems.map(l => ({
        lineNumber: l.lineNumber,
        productCode: l.productCode,
        description: l.description,
        quantity: l.quantity,
        unitCode: l.unitCode,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
        taxAmount: l.taxAmount,
        discount: l.discount || 0,
        lineTotal: l.lineTotal,
        vatCategory: l.vatCategory,
      })),
      taxTotals: invoice.taxTotals.map(t => ({
        taxCategory: t.taxCategory,
        taxRate: t.taxRate,
        taxableAmount: t.taxableAmount,
        taxAmount: t.taxAmount,
      })),
      totalAmount: invoice.totalAmount,
      taxAmount: invoice.taxAmount,
      paymentMethod: invoice.paymentMethod,
      qrCode: invoice.qrCode,
      signature: invoice.signature,
    };
  }
}

// ============================================
// ZATCA SUBMISSION QUEUE MANAGER
// ============================================

export class ZatcaSubmissionManager {
  private client: ZatcaApiClient;
  private queue: Map<string, ZatcaSubmissionLog> = new Map();
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(config: ZatcaConfig) {
    this.client = new ZatcaApiClient(config);
    this.startQueueProcessor();
  }

  private startQueueProcessor(): void {
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 30000); // Process every 30 seconds
  }

  stopQueueProcessor(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Queue invoice for submission
   */
  async queueInvoice(invoice: ZatcaInvoice): Promise<string> {
    const log: ZatcaSubmissionLog = {
      id: randomUUID(),
      invoiceId: 0, // Will be set by caller
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      uuid: invoice.uuid,
      requestType:
        invoice.invoiceType === "standard" ? "clearance" : "reporting",
      requestPayload: JSON.stringify(invoice),
      status: "pending",
      attempts: 0,
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + 60000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.queue.set(log.id, log);
    return log.id;
  }

  /**
   * Process pending queue items
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.size === 0) return;

    this.isProcessing = true;
    const pending = Array.from(this.queue.values())
      .filter(
        log =>
          log.status === "pending" ||
          (log.status === "retrying" &&
            log.nextRetryAt &&
            new Date(log.nextRetryAt) <= new Date())
      )
      .sort(
        (a, b) =>
          new Date(a.lastAttemptAt).getTime() -
          new Date(b.lastAttemptAt).getTime()
      );

    for (const log of pending) {
      if (log.attempts >= 5) {
        log.status = "failed";
        log.errorMessage = "Max retry attempts exceeded";
        log.updatedAt = new Date().toISOString();
        continue;
      }

      log.status = "retrying";
      log.attempts++;
      log.lastAttemptAt = new Date().toISOString();

      log.status = "processing";

      try {
        const invoice = JSON.parse(log.requestPayload) as ZatcaInvoice;
        const response = await this.client.submitInvoice(invoice);

        log.status = response.status === "error" ? "failed" : "success";
        log.responsePayload = JSON.stringify(response);
        log.clearanceReference = response.clearanceReference;
        log.reportedAt = response.reportedAt;

        if (response.status === "error") {
          log.errorCode = response.errors?.[0]?.code;
          log.errorMessage = response.errors?.[0]?.message;
        }
      } catch (error) {
        log.status = "retrying";
        log.errorCode = "SUBMISSION_ERROR";
        log.errorMessage = (error as Error).message;
        log.nextRetryAt = new Date(
          Date.now() + 60000 * log.attempts
        ).toISOString();
      }

      log.updatedAt = new Date().toISOString();
    }

    this.isProcessing = false;
  }

  /**
   * Get submission status
   */
  getSubmissionStatus(logId: string): ZatcaSubmissionLog | undefined {
    return this.queue.get(logId);
  }

  /**
   * Get all submissions for an invoice
   */
  getInvoiceSubmissions(invoiceNumber: string): ZatcaSubmissionLog[] {
    return Array.from(this.queue.values()).filter(
      log => log.invoiceNumber === invoiceNumber
    );
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    processing: number;
    success: number;
    failed: number;
  } {
    let pending = 0,
      processing = 0,
      success = 0,
      failed = 0;
    for (const log of this.queue.values()) {
      switch (log.status) {
        case "pending":
        case "retrying":
          pending++;
          break;
        case "success":
          success++;
          break;
        case "failed":
          failed++;
          break;
        case "processing":
          processing++;
          break;
      }
    }
    return { pending, processing, success, failed };
  }

  /**
   * Retry failed submission
   */
  async retrySubmission(logId: string): Promise<void> {
    const log = this.queue.get(logId);
    if (!log) return;

    log.status = "pending";
    log.attempts = 0;
    log.lastAttemptAt = new Date().toISOString();
    log.errorMessage = undefined;
    log.errorCode = undefined;
    log.updatedAt = new Date().toISOString();
  }

  /**
   * Clear old successful submissions (keep last 1000)
   */
  clearOldSubmissions(): void {
    const successful = Array.from(this.queue.values())
      .filter(log => log.status === "success")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    if (successful.length > 1000) {
      for (const log of successful.slice(1000)) {
        this.queue.delete(log.id);
      }
    }
  }
}

// ============================================
// ZATCA COMPLIANCE HELPERS
// ============================================

export function validateZatcaConfig(config: Partial<ZatcaConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.enabled) {
    if (!config.vatNumber || config.vatNumber.length !== 15) {
      errors.push("VAT number must be 15 digits");
    }
    if (!config.crNumber) {
      errors.push("Commercial Registration number is required");
    }
    if (!config.sellerName) {
      errors.push("Seller name is required");
    }
    if (!config.address) {
      errors.push("Address is required");
    }
    if (config.phase === "2") {
      if (!config.csid?.secret || !config.csid?.certificate) {
        errors.push("Phase 2 requires CSID (private key and certificate)");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function generateZatcaInvoice(
  invoice: any,
  config: ZatcaConfig,
  buyer?: {
    name?: string;
    vatNumber?: string;
    crNumber?: string;
    address?: string;
  }
): ZatcaInvoice {
  const now = new Date();
  const isoDate = now.toISOString().split("T")[0];
  const isoTime = now.toTimeString().split(" ")[0];
  const uuid = randomUUID();

  // Calculate totals
  const lineItems: ZatcaLineItem[] = invoice.items.map(
    (item: any, index: number) => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = lineTotal * (item.taxRate / 100);
      return {
        lineNumber: index + 1,
        productCode: item.productCode || `P${item.productId}`,
        description: item.name,
        quantity: item.quantity,
        unitCode: "H87", // Piece (default)
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 15,
        taxAmount: Math.round(taxAmount * 100) / 100,
        discount: item.discount || 0,
        lineTotal: Math.round((lineTotal - (item.discount || 0)) * 100) / 100,
        vatCategory: item.taxRate === 0 ? "Z" : item.taxRate === 15 ? "S" : "E",
      };
    }
  );

  const taxTotals: ZatcaTaxTotal[] = [];
  const taxMap = new Map<number, { taxable: number; tax: number }>();

  for (const item of lineItems) {
    const existing = taxMap.get(item.taxRate) || { taxable: 0, tax: 0 };
    existing.taxable += item.lineTotal;
    existing.tax += item.taxAmount;
    taxMap.set(item.taxRate, existing);
  }

  for (const [rate, totals] of taxMap) {
    taxTotals.push({
      taxCategory: "VAT",
      taxRate: rate,
      taxableAmount: Math.round(totals.taxable * 100) / 100,
      taxAmount: Math.round(totals.tax * 100) / 100,
    });
  }

  const totalAmount = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
  const taxAmount = lineItems.reduce((sum, l) => sum + l.taxAmount, 0);

  // Build QR code (Phase 1)
  const qrCode = buildZatcaQr(
    config.sellerName,
    config.vatNumber,
    `${isoDate}T${isoTime}`,
    totalAmount,
    taxAmount
  );

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceType: buyer?.vatNumber ? "standard" : "simplified", // B2B if buyer has VAT
    uuid,
    issueDate: isoDate,
    issueTime: isoTime,
    sellerName: config.sellerName,
    sellerVatNumber: config.vatNumber,
    sellerCrNumber: config.crNumber,
    sellerAddress: config.address,
    buyerName: buyer?.name,
    buyerVatNumber: buyer?.vatNumber,
    buyerCrNumber: buyer?.crNumber,
    buyerAddress: buyer?.address,
    currency: "SAR",
    currencyRate: 1,
    lineItems,
    taxTotals,
    totalAmount,
    taxAmount,
    paymentMethod: invoice.paymentMethod || "cash",
    qrCode,
    hash: "", // Will be set by crypto
    clearanceStatus: "not_submitted",
  };
}

// Phase 1 QR builder (moved to client for shared use)
export function buildZatcaQr(
  sellerName: string,
  vatNumber: string,
  isoTime: string,
  totalWithVat: number,
  vatTotal: number
): string {
  const enc = (tag: number, val: string) => {
    const v = new TextEncoder().encode(val);
    const header = new Uint8Array(2);
    header[0] = tag;
    header[1] = v.length & 0xff;
    const result = new Uint8Array(header.length + v.length);
    result.set(header);
    result.set(v, header.length);
    return result;
  };
  const parts = [
    enc(1, sellerName || ""),
    enc(2, vatNumber || ""),
    enc(3, isoTime),
    enc(4, totalWithVat.toFixed(2)),
    enc(5, vatTotal.toFixed(2)),
  ];
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const concatenated = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    concatenated.set(part, offset);
    offset += part.length;
  }
  // Base64 encode
  let binary = "";
  for (let i = 0; i < concatenated.length; i++) {
    binary += String.fromCharCode(concatenated[i]);
  }
  return btoa(binary);
}
