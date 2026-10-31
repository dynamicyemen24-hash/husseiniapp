// Type shared between server report builder (modulesRouter.ts) and the client
// session mapper, describing one POS session (shift) X/Z report.
export type SessionReport = {
  invoiceCount: number;
  totalSales: number;
  totalRefunds: number;
  totalDiscounts: number;
  totalTax: number;
  /** Σ paid from payments rows (split-aware, by every method). */
  totalPaid: number;
  cashIn: number;
  cashOut: number;
  /** openingFloat + cash payments + cashIn − cashOut − cash refunds. */
  expectedCash: number;
  paymentBreakdown: Record<string, number>;
  openings: number;
  byUser: Record<string, number>;
};
