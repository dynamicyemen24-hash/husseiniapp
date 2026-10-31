/**
 * composability — Data Composability Layer
 *
 * Enables composing complex data structures from simple, reusable pieces.
 *
 * Features:
 *   - Form composition from field groups (cards)
 *   - Nested form sections with independent validation
 *   - Data merging from multiple sources
 *   - Template-based form creation
 *   - Field inheritance and overrides
 *   - Conditional field rendering
 *   - Dynamic field injection
 *   - Schema versioning
 *
 * Architecture:
 *   Form = Card1 + Card2 + ... + CardN
 *   Card = FieldGroup + Validation + AutoComplete
 *   Field = Value + Dependencies + AI_Suggestions
 */

import type { DataField, DataRecord, DataOption } from "./dataEngine";

// ─── Types ────────────────────────────────────────────────

export interface DataCard {
  id: string;
  title: string;
  titleAr: string;
  description?: string;
  icon?: string;
  fields: DataField[];
  order: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  validation?: CardValidation;
}

export interface CardValidation {
  requireAll?: boolean; // All fields required or just some
  requiredFields?: string[];
  customValidation?: (cardData: Record<string, any>) => boolean | string;
}

export interface DataFormComposition {
  id: string;
  name: string;
  nameAr: string;
  cards: DataCard[];
  template?: string;
  version: string;
  metadata?: Record<string, any>;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface FormMergeResult {
  record: DataRecord;
  sources: string[];
  conflicts: Array<{ field: string; values: any[]; resolved: any }>;
}

export interface Template {
  id: string;
  name: string;
  nameAr: string;
  cardIds: string[];
  defaultValues: Record<string, any>;
  rules: TemplateRule[];
}

export interface TemplateRule {
  field: string;
  condition: string; // e.g., "fieldA=valueB"
  action: "show" | "hide" | "require" | "prefill";
  value?: any;
}

export interface FieldDependency {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "gt" | "lt" | "in";
  value: any;
  then: Record<string, any>; // Field → value to set
}

export interface ComposabilityConfig {
  enableTemplates?: boolean;
  enableMerge?: boolean;
  enableConditional?: boolean;
  enableAutoSave?: boolean;
  cacheSize?: number;
}

// ─── ComposabilityEngine ────────────────────────────────

export class ComposabilityEngine {
  public templates = new Map<string, Template>();
  public cards = new Map<string, DataCard>();
  public forms = new Map<string, DataFormComposition>();
  public mergeCache = new Map<string, DataRecord>();
  public config: ComposabilityConfig;

  constructor(config?: ComposabilityConfig) {
    this.config = config ?? {};
  }

  /**
   * Register a card component.
   */
  registerCard(card: DataCard): void {
    this.cards.set(card.id, card);
  }

  /**
   * Register a form composition.
   */
  registerForm(form: DataFormComposition): void {
    this.forms.set(form.id, form);
  }

  /**
   * Register a template.
   */
  registerTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  /**
   * Build a form from cards.
   */
  buildForm(cardIds: string[], formId: string): DataFormComposition {
    const cards = cardIds
      .map(id => this.cards.get(id))
      .filter(Boolean) as DataCard[];
    cards.sort((a, b) => a.order - b.order);

    const form: DataFormComposition = {
      id: formId,
      name: `Form_${formId}`,
      nameAr: `نموذج_${formId}`,
      cards,
      version: "1.0",
      autoSave: this.config.enableAutoSave ?? true,
    };

    this.forms.set(formId, form);
    return form;
  }

  /**
   * Compose a form from a template with default values.
   */
  composeFromTemplate(
    templateId: string,
    overrides?: Record<string, any>
  ): DataFormComposition | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const cards = template.cardIds
      .map(id => this.cards.get(id))
      .filter(Boolean) as DataCard[];
    const defaultValues = { ...template.defaultValues, ...overrides };

    return {
      id: `template_${templateId}_${Date.now()}`,
      name: template.name,
      nameAr: template.nameAr,
      cards,
      template: templateId,
      version: "1.0",
      metadata: { defaultValues },
    };
  }

  /**
   * Merge data from multiple sources into one record.
   * Conflicts are resolved by priority (last source wins) or custom resolver.
   */
  merge(
    sources: Array<{ id: string; data: DataRecord; priority: number }>
  ): FormMergeResult {
    const sorted = [...sources].sort((a, b) => b.priority - a.priority);
    const merged: DataRecord = { fields: {} };
    const conflicts: FormMergeResult["conflicts"] = [];

    for (const source of sorted) {
      for (const [field, value] of Object.entries(source.data.fields)) {
        if (
          merged.fields[field] !== undefined &&
          merged.fields[field] !== value
        ) {
          // Conflict detected
          conflicts.push({
            field,
            values: [merged.fields[field], value],
            resolved: value, // Last priority wins
          });
        }
        merged.fields[field] = value;
      }
      merged.source = source.id;
    }

    merged.suggestions = {};
    for (const source of sorted) {
      if (source.data.suggestions) {
        merged.suggestions = {
          ...merged.suggestions,
          ...source.data.suggestions,
        };
      }
    }

    return { record: merged, sources: sorted.map(s => s.id), conflicts };
  }

  /**
   * Apply conditional rules to fields.
   */
  applyConditions(
    form: DataFormComposition,
    formData: Record<string, any>
  ): Record<string, boolean> {
    const visibility: Record<string, boolean> = {};

    for (const card of form.cards) {
      for (const field of card.fields) {
        if (!field.dependsOn) {
          visibility[field.name] = true;
          continue;
        }

        let visible = true;
        for (const dep of field.dependsOn) {
          const depValue = formData[dep];
          if (depValue === undefined || depValue === null) {
            visible = false;
            break;
          }
        }
        visibility[field.name] = visible;
      }
    }

    return visibility;
  }

  /**
   * Evaluate a dependency condition.
   */
  evaluateCondition(
    fieldValue: any,
    operator: string,
    targetValue: any
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === targetValue;
      case "notEquals":
        return fieldValue !== targetValue;
      case "contains":
        return String(fieldValue).includes(String(targetValue));
      case "gt":
        return Number(fieldValue) > Number(targetValue);
      case "lt":
        return Number(fieldValue) < Number(targetValue);
      case "in":
        return Array.isArray(targetValue) && targetValue.includes(fieldValue);
      default:
        return true;
    }
  }

  /**
   * Apply template rules to a form.
   */
  applyTemplateRules(
    form: DataFormComposition,
    formData: Record<string, any>
  ): Record<string, any> {
    const result = { ...formData };

    for (const card of form.cards) {
      for (const field of card.fields) {
        // Check if any template rule applies
        for (const [templateId, template] of this.templates) {
          for (const rule of template.rules) {
            if (rule.field === field.name && field.dependsOn) {
              const depValue = formData[field.dependsOn[0]];
              if (
                this.evaluateCondition(
                  depValue,
                  rule.condition,
                  rule.value ?? null
                )
              ) {
                switch (rule.action) {
                  case "show":
                    break;
                  case "hide":
                    result[field.name] = undefined;
                    break;
                  case "require":
                    // Mark as required
                    break;
                  case "prefill":
                    if (rule.value !== undefined)
                      result[field.name] = rule.value;
                    break;
                }
              }
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Create a template from an existing form.
   */
  createTemplate(
    formId: string,
    name: string,
    nameAr: string
  ): Template | null {
    const form = this.forms.get(formId);
    if (!form) return null;

    return {
      id: `template_${formId}_${Date.now()}`,
      name,
      nameAr,
      cardIds: form.cards.map(c => c.id),
      defaultValues: {},
      rules: [],
    };
  }

  /**
   * Get all card fields as flat array.
   */
  getFormFields(formId: string): DataField[] {
    const form = this.forms.get(formId);
    if (!form) return [];
    return form.cards.flatMap(c => c.fields);
  }

  /**
   * Validate all cards in a form.
   */
  validateForm(
    formId: string,
    formData: Record<string, any>
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const form = this.forms.get(formId);
    if (!form) return errors;

    for (const card of form.cards) {
      const cardErrors = this.validateCard(card, formData);
      Object.assign(errors, cardErrors);
    }

    return errors;
  }

  /**
   * Validate a single card.
   */
  private validateCard(
    card: DataCard,
    formData: Record<string, any>
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const field of card.fields) {
      if (
        field.required &&
        (formData[field.name] === undefined || formData[field.name] === "")
      ) {
        errors[field.name] = [`${field.labelAr ?? field.label} مطلوب`];
      }
    }

    if (card.validation?.customValidation) {
      const result = card.validation.customValidation(formData);
      if (result !== true) {
        // Find which field caused the error
        errors["__card__"] = [String(result)];
      }
    }

    return errors;
  }

  /**
   * Inject a field into a card dynamically.
   */
  injectField(cardId: string, field: DataField): void {
    const card = this.cards.get(cardId);
    if (card) {
      card.fields.push(field);
    }
  }

  /**
   * Remove a field from a card dynamically.
   */
  removeField(cardId: string, fieldName: string): void {
    const card = this.cards.get(cardId);
    if (card) {
      card.fields = card.fields.filter(f => f.name !== fieldName);
    }
  }
}

// ─── React Hook ──────────────────────────────────────────

import { useState, useCallback, useMemo, useEffect } from "react";

export function useComposability(engine: ComposabilityEngine) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const setField = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const setFields = useCallback((fields: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({});
    setActiveCard(null);
  }, []);

  const applyVisibility = useCallback(
    (formId: string) => {
      const form = engine.forms.get(formId);
      if (form) {
        const vis = engine.applyConditions(form, formData);
        setVisibility(vis);
      }
    },
    [engine, formData]
  );

  const getCardFields = useCallback(
    (cardId: string) => {
      const card = engine.cards.get(cardId);
      return card?.fields ?? [];
    },
    [engine]
  );

  return {
    formData,
    setField,
    setFields,
    resetForm,
    activeCard,
    setActiveCard,
    visibility,
    applyVisibility,
    getCardFields,
    isValid: Object.values(formData).every(v => v !== undefined && v !== ""),
  };
}
