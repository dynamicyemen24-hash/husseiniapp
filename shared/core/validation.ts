// ═══════════════════════════════════════════════════════════════
// Pre-Post Validation - قواعد ما قبل الترحيل
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class PrePostValidator {
  static validateJournalBalanced(debitTotal: number, creditTotal: number, tolerance = 0.0001): ValidationResult {
    const diff = Math.abs(debitTotal - creditTotal);
    if (diff > tolerance) {
      return {
        valid: false,
        errors: [`القييد غير متوازن: المدين ≠ الدائن (الفرق: ${diff})`],
      };
    }
    return { valid: true, errors: [] };
  }

  static validateDocumentHasLines(lineCount: number, minLines = 1): ValidationResult {
    if (lineCount < minLines) {
      return {
        valid: false,
        errors: ['يجب إضافة بنود على الأقل للمستند'],
      };
    }
    return { valid: true, errors: [] };
  }

  static validateTotals(total: number, minTotal = 0): ValidationResult {
    if (total < minTotal) {
      return {
        valid: false,
        errors: [`إجمالي المستند ${total} غير صحيح`],
      };
    }
    return { valid: true, errors: [] };
  }
}