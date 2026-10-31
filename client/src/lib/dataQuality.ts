/**
 * dataQuality — Enterprise Data Quality Validation Engine.
 *
 * Features:
 *   - Real-time field validation with semantic rules
 *   - Cross-field consistency checks
 *   - Duplicate detection with fuzzy matching
 *   - Data type coercion and normalization
 *   - Range and constraint validation
 *   - Data completeness scoring
 *   - Quality reports and recommendations
 *   - Automatic correction suggestions
 *
 * All validations run client-side for instant feedback,
 * with server-side confirmation on submit.
 */

import type { DataField, DataRecord, ValidationResult } from "./dataEngine";

export type Severity = "error" | "warning" | "info";

export interface QualityIssue {
  field: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  autoFix?: () => any;
}

export interface DataQualityReport {
  record: DataRecord;
  issues: QualityIssue[];
  score: number; // 0-100
  completeness: number;
  accuracy: number;
  consistency: number;
  recommendations: string[];
  isValid: boolean;
}

export interface ValidationRule {
  name: string;
  type:
    | "required"
    | "range"
    | "pattern"
    | "unique"
    | "cross_field"
    | "duplicate"
    | "format"
    | "relationship";
  field?: string;
  params?: Record<string, any>;
  message: string;
  severity: Severity;
}

// ─── Data Quality Engine ──────────────────────────────────

export class DataQualityEngine {
  private rules: ValidationRule[] = [];
  private duplicateCache = new Map<string, Set<string>>();
  private fuzzyThreshold = 0.85;

  /**
   * Add a validation rule.
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Add multiple validation rules.
   */
  addRules(rules: ValidationRule[]): void {
    this.rules.push(...rules);
  }

  /**
   * Validate a record against all rules.
   */
  validate(record: DataRecord, fields: DataField[]): DataQualityReport {
    const issues: QualityIssue[] = [];
    const fieldValues = record.fields;

    // Check each rule
    for (const rule of this.rules) {
      const issue = this.checkRule(rule, record, fields);
      if (issue) issues.push(issue);
    }

    // Cross-field consistency
    const consistencyIssues = this.checkCrossFieldConsistency(record, fields);
    issues.push(...consistencyIssues);

    // Duplicate detection
    const duplicateIssues = this.checkDuplicates(record, fields);
    issues.push(...duplicateIssues);

    // Completeness check
    const completenessIssues = this.checkCompleteness(record, fields);
    issues.push(...completenessIssues);

    // Generate quality report
    const score = this.calculateScore(issues);
    const recommendations = this.generateRecommendations(issues);
    const isValid = !issues.some(i => i.severity === "error");

    return {
      record,
      issues,
      score,
      completeness: this.calculateCompleteness(record, fields),
      accuracy: this.calculateAccuracy(record, fields),
      consistency: this.calculateConsistency(issues),
      recommendations,
      isValid,
    };
  }

  /**
   * Check a single validation rule.
   */
  private checkRule(
    rule: ValidationRule,
    record: DataRecord,
    fields: DataField[]
  ): QualityIssue | null {
    const value = record.fields[rule.field ?? ""];
    const field = fields.find(f => f.name === rule.field);

    switch (rule.type) {
      case "required":
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          value === 0
        ) {
          return {
            field: rule.field ?? "",
            severity: rule.severity,
            message: rule.message,
          };
        }
        return null;

      case "range": {
        const num = Number(value);
        if (isNaN(num)) return null;
        const { min, max } = rule.params ?? {};
        if (
          (min !== undefined && num < min) ||
          (max !== undefined && num > max)
        ) {
          return {
            field: rule.field ?? "",
            severity: rule.severity,
            message: rule.message,
            suggestion: `القيمة يجب أن تكون بين ${min} و ${max}`,
          };
        }
        return null;
      }

      case "pattern": {
        if (typeof value !== "string") return null;
        const regex = new RegExp(rule.params?.pattern ?? ".*");
        if (!regex.test(value)) {
          return {
            field: rule.field ?? "",
            severity: rule.severity,
            message: rule.message,
          };
        }
        return null;
      }

      case "unique": {
        const existing = this.duplicateCache.get(rule.field ?? "");
        if (existing?.has(value)) {
          return {
            field: rule.field ?? "",
            severity: rule.severity,
            message: rule.message,
            suggestion: "هذا القيمة موجودة مسبقاً - يرجى التحقق",
            autoFix: () => `${value}-${Date.now()}`,
          };
        }
        return null;
      }

      case "cross_field": {
        const { dependsOn, condition } = rule.params ?? {};
        const depValue = record.fields[dependsOn ?? ""];
        if (condition?.(depValue, value)) {
          return {
            field: rule.field ?? "",
            severity: rule.severity,
            message: rule.message,
          };
        }
        return null;
      }

      case "format": {
        const format = rule.params?.format ?? "date";
        if (!this.validateFormat(value, format)) {
          return {
            field: rule.field ?? "",
            severity: rule.severity,
            message: rule.message,
          };
        }
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Check cross-field consistency.
   */
  private checkCrossFieldConsistency(
    record: DataRecord,
    fields: DataField[]
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const fieldValues = record.fields;

    // Check all dependencies
    for (const field of fields) {
      if (field.dependsOn && field.dependsOn.length > 0) {
        const parentValue = fieldValues[field.dependsOn[0]];
        if (parentValue !== undefined && parentValue !== null) {
          const childField = fields.find(f => f.name === field.name);
          if (childField?.options) {
            const validOptions = childField.options.filter(
              opt =>
                opt.metadata?.parentId === parentValue ||
                !opt.metadata?.parentId
            );
            if (
              validOptions.length > 0 &&
              !validOptions.some(opt => opt.value === fieldValues[field.name])
            ) {
              issues.push({
                field: field.name,
                severity: "warning",
                message: `القيمة المحددة غير متاحة للفئة المختارة`,
                suggestion: `القيم المتاحة: ${validOptions.map(o => o.label).join(", ")}`,
                autoFix: () => validOptions[0]?.value,
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check for duplicate values.
   */
  private checkDuplicates(
    record: DataRecord,
    fields: DataField[]
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const fieldValues = record.fields;

    for (const field of fields) {
      if (field.type === "autocomplete" && fieldValues[field.name]) {
        const cache = this.duplicateCache.get(field.name) ?? new Set();
        const value = String(fieldValues[field.name]);

        if (cache.has(value)) {
          issues.push({
            field: field.name,
            severity: "warning",
            message: `قيمة مكررة: ${value}`,
            suggestion: "تحقق من أن هذا الإدخال ليس مكرراً",
            autoFix: () => `${value}-${Date.now()}`,
          });
        }

        cache.add(value);
        this.duplicateCache.set(field.name, cache);
      }
    }

    return issues;
  }

  /**
   * Check completeness of a record.
   */
  private checkCompleteness(
    record: DataRecord,
    fields: DataField[]
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];

    for (const field of fields) {
      if (
        field.required &&
        (record.fields[field.name] === undefined ||
          record.fields[field.name] === "")
      ) {
        issues.push({
          field: field.name,
          severity: "error",
          message: `الحقل "${field.labelAr ?? field.label}" مطلوب`,
          suggestion: "أدخل القيمة المطلوبة",
        });
      }
    }

    return issues;
  }

  /**
   * Validate data format.
   */
  private validateFormat(value: any, format: string): boolean {
    switch (format) {
      case "date":
        return !isNaN(Date.parse(String(value)));
      case "currency":
        return /^\d+(\.\d{1,2})?$/.test(String(value));
      case "percentage":
        return /^\d+(\.\d+)?$/.test(String(value)) && Number(value) <= 100;
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      case "phone":
        return /^[\d\s+()-]{7,20}$/.test(String(value));
      default:
        return true;
    }
  }

  /**
   * Calculate overall quality score (0-100).
   */
  private calculateScore(issues: QualityIssue[]): number {
    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const infos = issues.filter(i => i.severity === "info").length;
    const total = issues.length;
    if (total === 0) return 100;
    const penalty = errors * 15 + warnings * 5 + infos * 2;
    return Math.max(0, 100 - penalty);
  }

  /**
   * Calculate completeness percentage.
   */
  private calculateCompleteness(
    record: DataRecord,
    fields: DataField[]
  ): number {
    let filled = 0;
    for (const field of fields) {
      if (
        record.fields[field.name] !== undefined &&
        record.fields[field.name] !== ""
      )
        filled++;
    }
    return fields.length > 0 ? Math.round((filled / fields.length) * 100) : 100;
  }

  /**
   * Calculate accuracy percentage.
   */
  private calculateAccuracy(record: DataRecord, fields: DataField[]): number {
    let valid = 0;
    let total = 0;
    for (const field of fields) {
      const value = record.fields[field.name];
      if (value === undefined || value === "") continue;
      total++;
      if (this.validateFieldType(value, field.type)) valid++;
    }
    return total > 0 ? Math.round((valid / total) * 100) : 100;
  }

  /**
   * Check if value matches field type.
   */
  private validateFieldType(value: any, type: string): boolean {
    switch (type) {
      case "number":
        return typeof value === "number";
      case "currency":
        return typeof value === "number" && !isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "date":
        return value instanceof Date || !isNaN(Date.parse(String(value)));
      case "percentage":
        return typeof value === "number" && value >= 0 && value <= 100;
      default:
        return typeof value === "string" || typeof value === "number";
    }
  }

  /**
   * Calculate consistency score.
   */
  private calculateConsistency(issues: QualityIssue[]): number {
    const crossFieldIssues = issues.filter(i => i.severity === "warning");
    return Math.max(0, 100 - crossFieldIssues.length * 10);
  }

  /**
   * Generate recommendations based on issues.
   */
  private generateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];
    const autoFixable = issues.filter(i => i.autoFix);
    const errors = issues.filter(i => i.severity === "error");

    if (autoFixable.length > 0) {
      recommendations.push(`${autoFixable.length} مشكلة يمكن تصحيحها تلقائياً`);
    }
    if (errors.length > 0) {
      recommendations.push(`يجب تصحيح ${errors.length} خطأ قبل الحفظ`);
    }
    if (recommendations.length === 0) {
      recommendations.push("البيانات سليمة وجاهزة للحفظ");
    }

    return recommendations;
  }

  /**
   * Auto-correct fixable issues.
   */
  autoCorrect(
    record: DataRecord,
    fields: DataField[]
  ): { record: DataRecord; corrected: string[] } {
    const corrected: string[] = [];
    const issues = this.validate(record, fields).issues;

    for (const issue of issues) {
      if (issue.autoFix) {
        record.fields[issue.field] = issue.autoFix();
        corrected.push(issue.field);
      }
    }

    return { record, corrected };
  }

  /**
   * Normalize field values (trim whitespace, format numbers, etc.).
   */
  normalize(
    fields: Record<string, any>,
    fieldTypes: Record<string, string>
  ): Record<string, any> {
    const normalized = { ...fields };
    for (const [fieldName, type] of Object.entries(fieldTypes)) {
      if (normalized[fieldName] === undefined) continue;
      switch (type) {
        case "text":
          normalized[fieldName] = String(normalized[fieldName]).trim();
          break;
        case "number":
          normalized[fieldName] = Number(normalized[fieldName]);
          break;
        case "currency":
          normalized[fieldName] = parseFloat(
            String(normalized[fieldName]).replace(/,/g, "")
          );
          break;
        case "date":
          normalized[fieldName] = new Date(normalized[fieldName]);
          break;
        case "percentage":
          normalized[fieldName] = parseFloat(String(normalized[fieldName]));
          break;
      }
    }
    return normalized;
  }
}

// ─── React Hook ────────────────────────────────────────────

import { useState, useCallback, useMemo, useEffect } from "react";

export function useDataQuality(
  engine: DataQualityEngine,
  record: DataRecord,
  fields: DataField[]
) {
  const [report, setReport] = useState<DataQualityReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const validate = useCallback(() => {
    setIsProcessing(true);
    // Use setTimeout to avoid blocking
    setTimeout(() => {
      const result = engine.validate(record, fields);
      setReport(result);
      setIsProcessing(false);
    }, 0);
  }, [engine, record, fields]);

  useEffect(() => {
    validate();
  }, [validate]);

  const autoFix = useCallback(() => {
    const { record: fixed, corrected } = engine.autoCorrect(record, fields);
    return { record: fixed, corrected };
  }, [engine, record, fields]);

  return {
    report,
    isProcessing,
    validate,
    autoFix,
    score: report?.score ?? 0,
    completeness: report?.completeness ?? 0,
    accuracy: report?.accuracy ?? 0,
    issues: report?.issues ?? [],
    isValid: report?.isValid ?? false,
  };
}
