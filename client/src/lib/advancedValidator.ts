/**
 * Advanced Validation System — Smart field-level and form-level validation.
 * Includes AI-powered pattern detection and real-time feedback.
 */

export type ValidationSeverity = "error" | "warning" | "info" | "success";

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  message: string;
  field: string;
  suggestion?: string;
  autoFix?: () => unknown;
}

export interface ValidationRule {
  field: string;
  label: string;
  rules: ValidationFunction[];
  severity: ValidationSeverity;
}

export type ValidationFunction = (
  value: unknown,
  formData?: Record<string, unknown>
) => ValidationResult | null;

/**
 * Validation factory — creates common validation rules.
 */
export const validate = {
  required:
    (label: string): ValidationFunction =>
    value => {
      if (value === undefined || value === null || value === "") {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} مطلوب`,
          field: label,
        };
      }
      return null;
    },

  minLength:
    (min: number, label: string): ValidationFunction =>
    value => {
      if (typeof value === "string" && value.length < min) {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} يجب أن يكون على الأقل ${min} حرف`,
          field: label,
        };
      }
      return null;
    },

  maxLength:
    (max: number, label: string): ValidationFunction =>
    value => {
      if (typeof value === "string" && value.length > max) {
        return {
          valid: false,
          severity: "warning" as const,
          message: `${label} لا يجب أن يتجاوز ${max} حرف`,
          field: label,
        };
      }
      return null;
    },

  pattern:
    (regex: RegExp, patternName: string, label: string): ValidationFunction =>
    value => {
      if (typeof value === "string" && !regex.test(value)) {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} لا يتطابق مع النمط ${patternName}`,
          field: label,
        };
      }
      return null;
    },

  email: (label: string = "البريد الإلكتروني"): ValidationFunction =>
    validate.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "بريد إلكتروني", label),

  numeric:
    (label: string = "الرقم"): ValidationFunction =>
    value => {
      if (isNaN(Number(value)) || value === "") {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} يجب أن يكون رقماً`,
          field: label,
        };
      }
      return null;
    },

  positiveNumber:
    (label: string = "القيمة"): ValidationFunction =>
    value => {
      if (Number(value) <= 0) {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} يجب أن يكون أكبر من صفر`,
          field: label,
        };
      }
      return null;
    },

  minValue:
    (min: number, label: string): ValidationFunction =>
    value => {
      if (Number(value) < min) {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} يجب أن يكون على الأقل ${min}`,
          field: label,
        };
      }
      return null;
    },

  dateNotPast:
    (label: string = "التاريخ"): ValidationFunction =>
    value => {
      if (value instanceof Date && value < new Date()) {
        return {
          valid: false,
          severity: "warning" as const,
          message: `${label} لا يمكن أن يكون تاريخاً سابقاً`,
          field: label,
        };
      }
      return null;
    },

  croatianPhone:
    (label: string = "الهاتف"): ValidationFunction =>
    value => {
      if (typeof value === "string" && !/^(\+967|0)?\d{8}$/.test(value)) {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} غير صالح — استخدم الصيغة: 0XXXXXXXX أو +967XXXXXXXX`,
          field: label,
        };
      }
      return null;
    },

  accountCode:
    (label: string = "كود الحساب"): ValidationFunction =>
    value => {
      if (typeof value === "string" && !/^\d{4}(-\d{2}){0,2}$/.test(value)) {
        return {
          valid: false,
          severity: "error" as const,
          message: `${label} يجب أن يكون بصيغة: XXXX أو XXXX-XX أو XXXX-XX-XX`,
          field: label,
        };
      }
      return null;
    },
};

/**
 * Smart Validator — combines multiple rules and provides AI suggestions.
 */
export class SmartValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private suggestions: Map<string, string[]> = new Map();

  /** Add validation rules for a field */
  addRules(field: string, rules: ValidationRule[]): void {
    const existing = this.rules.get(field) ?? [];
    this.rules.set(field, [...existing, ...rules]);
  }

  /** Validate a single field */
  validateField(
    field: string,
    value: unknown,
    formData?: Record<string, unknown>
  ): ValidationResult[] {
    const fieldRules = this.rules.get(field) ?? [];
    const results: ValidationResult[] = [];

    for (const rule of fieldRules) {
      for (const fn of rule.rules) {
        const result = fn(value, formData);
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /** Validate an entire form */
  validateForm(formData: Record<string, unknown>): {
    errors: ValidationResult[];
    warnings: ValidationResult[];
    isValid: boolean;
  } {
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];

    for (const [field, rules] of this.rules) {
      const results = this.validateField(field, formData[field], formData);
      for (const r of results) {
        if (r.severity === "error") errors.push(r);
        else if (r.severity === "warning") warnings.push(r);
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  /** Add AI suggestion for a field */
  addSuggestion(field: string, suggestion: string): void {
    const existing = this.suggestions.get(field) ?? [];
    this.suggestions.set(field, [...existing, suggestion]);
  }

  /** Get suggestions for a field */
  getSuggestions(field: string): string[] {
    return this.suggestions.get(field) ?? [];
  }

  /** Get field-level validation with auto-fix suggestions */
  validateWithSuggestions(
    field: string,
    value: unknown,
    formData?: Record<string, unknown>
  ): { results: ValidationResult[]; suggestions: string[] } {
    const results = this.validateField(field, value, formData);
    const suggestions = this.getSuggestions(field);
    return { results, suggestions };
  }
}

/**
 * Create a default validator for financial documents.
 */
export function createDefaultValidator(): SmartValidator {
  const validator = new SmartValidator();

  // Invoice validations
  validator.addRules("invoiceNumber", [
    {
      field: "invoiceNumber",
      label: "رقم الفاتورة",
      rules: [
        validate.required("رقم الفاتورة"),
        validate.pattern(/^\d{4,10}$/, "رقم", "رقم الفاتورة"),
      ],
      severity: "error",
    },
  ]);

  validator.addRules("amount", [
    {
      field: "amount",
      label: "المبلغ",
      rules: [
        validate.required("المبلغ"),
        validate.positiveNumber("المبلغ"),
        validate.minValue(0, "المبلغ"),
      ],
      severity: "error",
    },
  ]);

  validator.addRules("customerName", [
    {
      field: "customerName",
      label: "اسم الزبون",
      rules: [
        validate.required("اسم الزبون"),
        validate.minLength(2, "اسم الزبون"),
        validate.maxLength(100, "اسم الزبون"),
      ],
      severity: "error",
    },
  ]);

  validator.addRules("accountCode", [
    {
      field: "accountCode",
      label: "كود الحساب",
      rules: [validate.accountCode("كود الحساب")],
      severity: "error",
    },
  ]);

  validator.addRules("email", [
    {
      field: "email",
      label: "البريد الإلكتروني",
      rules: [validate.email()],
      severity: "error",
    },
  ]);

  // Voucher validations
  validator.addRules("voucherDate", [
    {
      field: "voucherDate",
      label: "تاريخ القيد",
      rules: [validate.required("تاريخ القيد"), validate.dateNotPast()],
      severity: "error",
    },
  ]);

  validator.addRules("description", [
    {
      field: "description",
      label: "الوصف",
      rules: [
        validate.required("الوصف"),
        validate.minLength(5, "الوصف"),
        validate.maxLength(500, "الوصف"),
      ],
      severity: "error",
    },
  ]);

  return validator;
}
