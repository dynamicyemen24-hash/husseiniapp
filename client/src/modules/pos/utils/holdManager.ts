import type { CartLine } from "@/modules/pos/types";

export interface HeldInvoice {
  holdId: string;
  lines: CartLine[];
  customerId: number | null;
  customerName: string | null;
  paymentMethod: string;
  notes: string;
  globalDiscount: number;
  globalDiscountPercent: number;
  loyaltyPointsRedeemed: number;
  total: number;
  createdAt: string;
}

const STORAGE_KEY = "pos_held_invoices";

export function saveHeldInvoice(invoice: HeldInvoice): void {
  try {
    const existing = getHeldInvoices();
    const updated = [
      ...existing.filter(h => h.holdId !== invoice.holdId),
      invoice,
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn("Failed to save held invoice");
  }
}

export function getHeldInvoices(): HeldInvoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HeldInvoice[];
  } catch {
    return [];
  }
}

export function getHeldInvoice(holdId: string): HeldInvoice | null {
  return getHeldInvoices().find(h => h.holdId === holdId) || null;
}

export function removeHeldInvoice(holdId: string): void {
  try {
    const existing = getHeldInvoices();
    const updated = existing.filter(h => h.holdId !== holdId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn("Failed to remove held invoice");
  }
}

export function clearAllHeldInvoices(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn("Failed to clear held invoices");
  }
}
