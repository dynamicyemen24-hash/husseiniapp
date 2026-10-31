/**
 * doubleEntryValidator — pure domain service (ISO 25010 maintainability)
 * Validates that a set of journal legs is balanced (sum debits == sum credits)
 * within a configurable tolerance. Pure, no DB, fully testable.
 * Used by server/routers.ts postInvoiceGlEntries and manual journal flows.
 */

export type Leg = { 
  type: "debit" | "credit"; 
  amount: number | string;
  accountId?: number;
  narration?: string;
};

/** Validation result with detailed breakdown */
export interface BalanceResult {
  isBalanced: boolean;
  debitTotal: number;
  creditTotal: number;
  imbalance: number;
  tolerance: number;
  legsCount: number;
  debitCount: number;
  creditCount: number;
  errors: string[];
}

export interface ValidationOptions {
  tolerance?: number;
  minLegs?: number;
  maxLegs?: number;
  requireBothSides?: boolean; // Must have at least one debit AND one credit
  allowZeroAmount?: boolean;
}

/**
 * Validates a set of journal legs with comprehensive checks
 * Returns detailed result instead of just boolean
 */
export function validateBalance(
  legs: Leg[], 
  options: ValidationOptions = {}
): BalanceResult {
  const {
    tolerance = 0.01,
    minLegs = 2,
    maxLegs = 1000,
    requireBothSides = true,
    allowZeroAmount = false,
  } = options;

  const errors: string[] = [];
  let debitTotal = 0;
  let creditTotal = 0;
  let debitCount = 0;
  let creditCount = 0;

  // Check leg count
  if (legs.length < minLegs) {
    errors.push(`Insufficient legs: ${legs.length} (minimum ${minLegs})`);
  }
  if (legs.length > maxLegs) {
    errors.push(`Too many legs: ${legs.length} (maximum ${maxLegs})`);
  }

  // Validate each leg
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    
    // Check type
    if (leg.type !== "debit" && leg.type !== "credit") {
      errors.push(`Leg ${i}: Invalid type "${leg.type}" (must be "debit" or "credit")`);
      continue;
    }

    // Parse amount
    const amount = typeof leg.amount === "string" ? parseFloat(leg.amount) : leg.amount;
    
    if (!Number.isFinite(amount)) {
      errors.push(`Leg ${i}: Amount must be a finite number`);
      continue;
    }
    
    if (amount < 0) {
      errors.push(`Leg ${i}: Amount must be non-negative`);
      continue;
    }
    
    if (amount === 0 && !allowZeroAmount) {
      errors.push(`Leg ${i}: Amount must be positive`);
      continue;
    }

    if (leg.type === "debit") {
      debitTotal += amount;
      debitCount++;
    } else {
      creditTotal += amount;
      creditCount++;
    }
  }

  // Check both sides present
  if (requireBothSides && (debitCount === 0 || creditCount === 0)) {
    errors.push(`Journal must have at least one debit and one credit leg`);
  }

  const imbalance = debitTotal - creditTotal;
  const isBalanced = Math.abs(imbalance) <= tolerance && errors.length === 0;

  return {
    isBalanced,
    debitTotal,
    creditTotal,
    imbalance,
    tolerance,
    legsCount: legs.length,
    debitCount,
    creditCount,
    errors,
  };
}

/**
 * Legacy boolean check for backward compatibility
 * @deprecated Use validateBalance instead
 */
export function isBalanced(legs: Leg[], tolerance = 0.01): boolean {
  return validateBalance(legs, { tolerance }).isBalanced;
}

/**
 * Calculate imbalance amount (positive = more debits, negative = more credits)
 */
export function imbalance(legs: Leg[]): number {
  let d = 0, c = 0;
  for (const l of legs) {
    const v = typeof l.amount === "string" ? parseFloat(l.amount) : l.amount;
    if (!Number.isFinite(v) || v < 0) continue;
    if (l.type === "debit") d += v;
    else c += v;
  }
  return d - c;
}

/**
 * Validates and throws detailed error if unbalanced
 */
export function validateOrThrow(legs: Leg[], context?: string, options?: ValidationOptions): void {
  const result = validateBalance(legs, options);
  if (!result.isBalanced) {
    const details = [
      `Debit: ${result.debitTotal.toFixed(2)}`,
      `Credit: ${result.creditTotal.toFixed(2)}`,
      `Imbalance: ${result.imbalance.toFixed(2)}`,
      `Tolerance: ${result.tolerance}`,
      `Legs: ${result.legsCount} (Dr: ${result.debitCount}, Cr: ${result.creditCount})`,
      ...result.errors,
    ].join("; ");
    
    throw new Error(
      `قيود غير متوازنة${context ? ` (${context})` : ""}: ${details}`
    );
  }
}

/**
 * Validates that a reversal perfectly mirrors the original
 */
export function validateReversal(
  originalLegs: Leg[],
  reversalLegs: Leg[],
  tolerance = 0.01
): BalanceResult {
  if (originalLegs.length !== reversalLegs.length) {
    return {
      isBalanced: false,
      debitTotal: 0,
      creditTotal: 0,
      imbalance: 0,
      tolerance,
      legsCount: 0,
      debitCount: 0,
      creditCount: 0,
      errors: [`Leg count mismatch: original=${originalLegs.length}, reversal=${reversalLegs.length}`],
    };
  }

  // Check each leg is perfectly mirrored
  const errors: string[] = [];
  for (let i = 0; i < originalLegs.length; i++) {
    const orig = originalLegs[i];
    const rev = reversalLegs[i];
    
    if (orig.type === rev.type) {
      errors.push(`Leg ${i}: Type not reversed (both ${orig.type})`);
    }
    
    const origAmt = typeof orig.amount === "string" ? parseFloat(orig.amount) : orig.amount;
    const revAmt = typeof rev.amount === "string" ? parseFloat(rev.amount) : rev.amount;
    
    if (Math.abs(origAmt - revAmt) > tolerance) {
      errors.push(`Leg ${i}: Amount mismatch (orig=${origAmt}, rev=${revAmt})`);
    }
  }

  // Check overall balance
  const balanceResult = validateBalance(reversalLegs, { tolerance });
  balanceResult.errors.push(...errors);
  balanceResult.isBalanced = balanceResult.isBalanced && errors.length === 0;

  return balanceResult;
}