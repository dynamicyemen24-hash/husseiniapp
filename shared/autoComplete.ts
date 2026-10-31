/**
 * Smart Auto-Completion System
 * Provides intelligent field completion based on selections.
 */

export interface AutoCompleteEntry {
  id: string;
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface AutoCompleteGroup {
  label: string;
  entries: AutoCompleteEntry[];
}

export interface CompletionRule {
  sourceField: string;
  targetFields: {
    field: string;
    value: unknown | ((entry: AutoCompleteEntry) => unknown);
  };
}

/**
 * Represents a customer with auto-fillable data
 */
export interface CustomerData {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  city: string;
  balance: number;
  creditLimit: number;
  paymentTerms: string;
  discountPercent: number;
}

/**
 * Represents a product with auto-fillable data
 */
export interface ProductData {
  id: string;
  name: string;
  code: string;
  barcode: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  taxRate: number;
  stock: number;
  minStock: number;
}

/**
 * Represents an account with auto-fillable data
 */
export interface AccountData {
  id: string;
  name: string;
  code: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  parentId: string | null;
  balance: number;
  hasSubAccounts: boolean;
}

/**
 * Represents a cost center with auto-fillable data
 */
export interface CostCenterData {
  id: string;
  name: string;
  code: string;
  department: string;
  manager: string;
  budget: number;
  spent: number;
}

export interface WarehouseData {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
}

/**
 * Calculates the total for a line item
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRate: number = 0
): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  const subtotal = quantity * unitPrice;
  const discount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discount;
  const tax = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + tax;
  return { subtotal, discount, tax, total };
}

/**
 * Calculates document totals from line items
 */
export function calculateDocumentTotals(
  lineItems: Array<{
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    taxRate?: number;
  }>
): {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  itemCount: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const item of lineItems) {
    const result = calculateLineTotal(
      item.quantity,
      item.unitPrice,
      item.discountPercent ?? 0,
      item.taxRate ?? 0
    );
    subtotal += result.subtotal;
    totalDiscount += result.discount;
    totalTax += result.tax;
  }

  return {
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal: subtotal - totalDiscount + totalTax,
    itemCount: lineItems.length,
  };
}

/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number, currency = "SAR"): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a date according to Arabic locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Generates a reference number for related documents
 */
export function generateReference(
  type: "invoice" | "purchase" | "payment" | "receipt",
  sourceDoc: string,
  year?: number
): string {
  const prefix = {
    invoice: "REF-INV",
    purchase: "REF-PRC",
    payment: "REF-PAY",
    receipt: "REF-RCP",
  }[type];
  const yr = year ?? new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999) + 1;
  return `${prefix}-${String(seq).padStart(4, "0")}-${yr}`;
}
