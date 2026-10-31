/**
 * Workflow Automation Engine — Rule-based task automation.
 * Defines triggers, conditions, and actions to automate business processes.
 */

export type TriggerType =
  | "onCreate"
  | "onUpdate"
  | "onDelete"
  | "onFieldChange"
  | "onThreshold"
  | "onSchedule"
  | "onApproval";

export type ActionType =
  | "autoNumber"
  | "sendNotification"
  | "updateField"
  | "createDocument"
  | "approve"
  | "reject"
  | "logEvent"
  | "callAPI";

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "contains"
  | "isEmpty"
  | "isNotEmpty"
  | "in"
  | "notIn"
  | "between";

export interface WorkflowCondition {
  /** Dot-path into the record, e.g. "customer.balance" (default: top-level key). */
  field: string;
  operator: ConditionOperator;
  /** Literal to compare against. Ignored when `valueField` is set. */
  value: unknown;
  /**
   * Field-to-field comparison: compare `field` against another field of the
   * same record (e.g. stockQty vs reorderLevel). Takes precedence over `value`.
   */
  valueField?: string;
}

export interface WorkflowAction {
  type: ActionType;
  target?: string;
  value?: unknown;
  delay?: number; // milliseconds
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  entity: string; // e.g., "invoice", "voucher", "requisition"
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  priority: number; // higher = executes first
  createdAt: Date;
  /**
   * When true, the first failing action aborts the remaining actions of the
   * rule (fail-fast for financial postings). Default false = best-effort,
   * every action is attempted and all errors are collected.
   */
  stopOnFailure?: boolean;
}

export type ActionResultStatus =
  | "executed"
  | "scheduled"
  | "failed"
  | "skipped";

export interface WorkflowActionResult {
  action: ActionType;
  status: ActionResultStatus;
  error?: string;
}

export interface WorkflowExecutionResult {
  ruleId: string;
  ruleName: string;
  actionsExecuted: number;
  /** Actions accepted for deferred execution (setTimeout handles). */
  scheduledActions: number;
  actionResults: WorkflowActionResult[];
  errors: string[];
  executedAt: Date;
  /** Wall-clock time spent executing the rule synchronously. */
  durationMs: number;
  success: boolean;
}

/**
 * Resolve a dot-path ("customer.balance", "lines.0.qty") against a record.
 * Returns undefined for missing segments instead of throwing.
 */
export function resolveFieldPath(
  record: Record<string, unknown>,
  path: string
): unknown {
  if (!path) return undefined;
  if (Object.prototype.hasOwnProperty.call(record, path)) {
    return record[path];
  }
  const segments = path.split(".");
  let current: unknown = record;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Coerce to number; non-numeric values become NaN so comparisons fail closed. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

const KNOWN_TRIGGERS: readonly TriggerType[] = [
  "onCreate",
  "onUpdate",
  "onDelete",
  "onFieldChange",
  "onThreshold",
  "onSchedule",
  "onApproval",
];

const KNOWN_ACTIONS: readonly ActionType[] = [
  "autoNumber",
  "sendNotification",
  "updateField",
  "createDocument",
  "approve",
  "reject",
  "logEvent",
  "callAPI",
];

const KNOWN_OPERATORS: readonly ConditionOperator[] = [
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "contains",
  "isEmpty",
  "isNotEmpty",
  "in",
  "notIn",
  "between",
];

/**
 * Validate a rule definition without executing it. Returns a list of human
 * readable problems (empty = valid). Used at registration time and in tests.
 */
export function validateRule(
  rule: Omit<WorkflowRule, "id" | "createdAt">
): string[] {
  const problems: string[] = [];
  if (!rule.name || rule.name.trim().length === 0) {
    problems.push("Rule name is required");
  }
  if (!rule.entity || rule.entity.trim().length === 0) {
    problems.push("Rule entity is required");
  }
  if (!KNOWN_TRIGGERS.includes(rule.trigger)) {
    problems.push(`Unknown trigger: ${String(rule.trigger)}`);
  }
  if (!Number.isFinite(rule.priority)) {
    problems.push("Rule priority must be a finite number");
  }
  if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
    problems.push("Rule must declare at least one action");
  }
  for (const action of rule.actions ?? []) {
    if (!KNOWN_ACTIONS.includes(action.type)) {
      problems.push(`Unknown action type: ${String(action.type)}`);
    }
    if (
      action.delay !== undefined &&
      (!Number.isFinite(action.delay) || action.delay < 0)
    ) {
      problems.push(`Action ${action.type} has an invalid delay`);
    }
  }
  for (const condition of rule.conditions ?? []) {
    if (!condition.field || condition.field.trim().length === 0) {
      problems.push("Condition field is required");
    }
    if (!KNOWN_OPERATORS.includes(condition.operator)) {
      problems.push(`Unknown operator: ${String(condition.operator)}`);
    }
    if (
      condition.operator === "between" &&
      (!Array.isArray(condition.value) || condition.value.length !== 2)
    ) {
      problems.push("The 'between' operator requires a [min, max] value pair");
    }
    if (
      (condition.operator === "in" || condition.operator === "notIn") &&
      !Array.isArray(condition.value)
    ) {
      problems.push(
        `The '${condition.operator}' operator requires an array value`
      );
    }
  }
  return problems;
}

/**
 * Central workflow engine that matches events to rules and executes actions.
 */
export class WorkflowEngine {
  private rules: WorkflowRule[] = [];
  private executionLog: WorkflowExecutionResult[] = [];
  private maxLogSize = 1000;
  /** Deferred action timers keyed by rule id (cancellable). */
  private scheduledTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

  /** Cancel deferred actions, optionally scoped to one rule. Returns timers cleared. */
  cancelScheduled(ruleId?: string): number {
    let cleared = 0;
    const scopes =
      ruleId !== undefined ? [ruleId] : Array.from(this.scheduledTimers.keys());
    for (const scope of scopes) {
      const timers = this.scheduledTimers.get(scope) ?? [];
      for (const timer of timers) {
        clearTimeout(timer);
        cleared++;
      }
      this.scheduledTimers.delete(scope);
    }
    return cleared;
  }

  /** Number of deferred actions still pending execution. */
  getScheduledCount(ruleId?: string): number {
    if (ruleId !== undefined) {
      return this.scheduledTimers.get(ruleId)?.length ?? 0;
    }
    let total = 0;
    for (const timers of this.scheduledTimers.values()) total += timers.length;
    return total;
  }

  private trackScheduled(
    ruleId: string,
    timer: ReturnType<typeof setTimeout>
  ): void {
    const timers = this.scheduledTimers.get(ruleId) ?? [];
    timers.push(timer);
    this.scheduledTimers.set(ruleId, timers);
  }

  /** Register a new workflow rule */
  addRule(rule: Omit<WorkflowRule, "id" | "createdAt">): string {
    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullRule: WorkflowRule = {
      ...rule,
      id,
      createdAt: new Date(),
    };
    this.rules.push(fullRule);
    this.rules.sort((a, b) => b.priority - a.priority);
    return id;
  }

  /** Remove a rule by ID */
  removeRule(id: string): boolean {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  /** Get all enabled rules for an entity */
  getRulesForEntity(entity: string): WorkflowRule[] {
    return this.rules.filter(r => r.entity === entity && r.enabled);
  }

  /**
   * Evaluate conditions against a record.
   * Returns true if ALL conditions pass. Supports dot-paths on both sides
   * (`field` and `valueField`) so rules can compare two live values, e.g.
   * stockQty < reorderLevel, instead of comparing against a stale literal.
   */
  evaluateConditions(
    conditions: WorkflowCondition[],
    record: Record<string, unknown>
  ): boolean {
    return conditions.every(cond => {
      const fieldValue = resolveFieldPath(record, cond.field);
      const expected =
        cond.valueField !== undefined
          ? resolveFieldPath(record, cond.valueField)
          : cond.value;
      switch (cond.operator) {
        case "equals":
          return fieldValue === expected;
        case "notEquals":
          return fieldValue !== expected;
        case "greaterThan":
          return toNumber(fieldValue) > toNumber(expected);
        case "greaterThanOrEqual":
          return toNumber(fieldValue) >= toNumber(expected);
        case "lessThan":
          return toNumber(fieldValue) < toNumber(expected);
        case "lessThanOrEqual":
          return toNumber(fieldValue) <= toNumber(expected);
        case "contains":
          return String(fieldValue ?? "").includes(String(expected ?? ""));
        case "isEmpty":
          return (
            fieldValue === undefined || fieldValue === null || fieldValue === ""
          );
        case "isNotEmpty":
          return (
            fieldValue !== undefined && fieldValue !== null && fieldValue !== ""
          );
        case "in":
          return Array.isArray(expected) && expected.includes(fieldValue);
        case "notIn":
          return Array.isArray(expected) && !expected.includes(fieldValue);
        case "between": {
          if (!Array.isArray(expected) || expected.length !== 2) return false;
          const n = toNumber(fieldValue);
          return n >= toNumber(expected[0]) && n <= toNumber(expected[1]);
        }
        default:
          return false;
      }
    });
  }

  /**
   * Process an event against matching rules.
   * Returns execution results for all matched rules.
   */
  processEvent(
    trigger: TriggerType,
    entity: string,
    record: Record<string, unknown>
  ): WorkflowExecutionResult[] {
    const results: WorkflowExecutionResult[] = [];
    const matchingRules = this.getRulesForEntity(entity).filter(
      r => r.trigger === trigger
    );

    for (const rule of matchingRules) {
      const result = this.executeRule(rule, record);
      results.push(result);
      this.logExecution(result);
    }

    return results;
  }

  /** Execute a single rule's actions */
  private executeRule(
    rule: WorkflowRule,
    record: Record<string, unknown>
  ): WorkflowExecutionResult {
    const startedAt = Date.now();
    const errors: string[] = [];
    const actionResults: WorkflowActionResult[] = [];
    let actionsExecuted = 0;
    let scheduledActions = 0;

    const finish = (): WorkflowExecutionResult => ({
      ruleId: rule.id,
      ruleName: rule.name,
      actionsExecuted,
      scheduledActions,
      actionResults,
      errors,
      executedAt: new Date(),
      durationMs: Date.now() - startedAt,
      success: errors.length === 0,
    });

    try {
      if (!this.evaluateConditions(rule.conditions, record)) {
        return {
          ...finish(),
          errors: ["Conditions not met"],
          success: true,
        };
      }

      for (const action of rule.actions) {
        try {
          if (action.delay && action.delay > 0) {
            const timer = setTimeout(
              () => this.executeAction(action, record),
              action.delay
            );
            this.trackScheduled(rule.id, timer);
            scheduledActions++;
            actionResults.push({ action: action.type, status: "scheduled" });
          } else {
            this.executeAction(action, record);
            actionsExecuted++;
            actionResults.push({ action: action.type, status: "executed" });
          }
        } catch (err) {
          const message = `Action ${action.type} failed: ${String(err)}`;
          errors.push(message);
          actionResults.push({
            action: action.type,
            status: "failed",
            error: message,
          });
          if (rule.stopOnFailure) {
            for (const remaining of rule.actions.slice(actionResults.length)) {
              actionResults.push({ action: remaining.type, status: "skipped" });
            }
            break;
          }
        }
      }
    } catch (err) {
      errors.push(`Rule execution error: ${String(err)}`);
    }

    return finish();
  }

  /** Execute a single action */
  private executeAction(
    action: WorkflowAction,
    record: Record<string, unknown>
  ): void {
    switch (action.type) {
      case "autoNumber":
        // Handled by the auto-number system
        break;
      case "sendNotification":
        // Handled by notification system
        break;
      case "updateField":
        if (action.target) {
          (record as Record<string, unknown>)[action.target] = action.value;
        }
        break;
      case "createDocument":
        // Handled by document creation system
        break;
      case "approve":
      case "reject":
        // Handled by approval system
        break;
      case "logEvent":
        console.warn(`[Workflow] ${action.target}:`, record);
        break;
      case "callAPI":
        // Handled by API call system
        break;
      default:
        // Fail closed: an unknown action is a configuration error, never a
        // silent no-op. validateRule() flags these before registration.
        throw new Error(
          `Unknown workflow action: ${String((action as WorkflowAction).type)}`
        );
    }
  }

  /** Log execution result */
  private logExecution(result: WorkflowExecutionResult): void {
    this.executionLog.push(result);
    if (this.executionLog.length > this.maxLogSize) {
      this.executionLog.shift();
    }
  }

  /** Get execution log */
  getExecutionLog(): WorkflowExecutionResult[] {
    return [...this.executionLog];
  }

  /** Get statistics */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalExecutions: number;
    successRate: number;
  } {
    const totalExecutions = this.executionLog.length;
    const successExecutions = this.executionLog.filter(r => r.success).length;
    return {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      totalExecutions,
      successRate:
        totalExecutions > 0 ? successExecutions / totalExecutions : 1,
    };
  }

  /** Clear execution log */
  clearLog(): void {
    this.executionLog = [];
  }
}

/**
 * Predefined workflow rules for common business scenarios.
 */
export function createDefaultWorkflows(engine: WorkflowEngine): void {
  // Auto-number on invoice creation
  engine.addRule({
    name: "ترقيم الفاتورة التلقائي",
    description: "يُنشئ رقم فاتورة تلقائي عند إنشاء فاتورة جديدة",
    trigger: "onCreate",
    entity: "invoice",
    conditions: [{ field: "status", operator: "equals", value: "draft" }],
    actions: [
      { type: "autoNumber", value: "INV" },
      { type: "updateField", target: "invoiceNumber", value: "AUTO" },
      { type: "logEvent", target: "invoice.created" },
    ],
    enabled: true,
    priority: 10,
  });

  // Auto-approve small invoices
  engine.addRule({
    name: "الموافقة التلقائية للفواتير الصغيرة",
    description: "يُوافق تلقائياً على الفواتير أقل من مبلغ معين",
    trigger: "onCreate",
    entity: "invoice",
    conditions: [
      { field: "amount", operator: "lessThan", value: 5000 },
      { field: "status", operator: "equals", value: "draft" },
    ],
    actions: [
      { type: "approve" },
      {
        type: "sendNotification",
        target: "customer",
        value: "تمت الموافقة التلقائية",
      },
    ],
    enabled: true,
    priority: 8,
  });

  // Low stock notification
  engine.addRule({
    name: "تنبيه المخزون المنخفض",
    description: "يرسل تنبيهاً عند انخفاض المخزون عن الحد الأدنى",
    trigger: "onFieldChange",
    entity: "product",
    conditions: [
      {
        field: "stockQty",
        operator: "lessThan",
        value: null,
        valueField: "reorderLevel",
      },
    ],
    actions: [
      { type: "sendNotification", target: "manager", value: "مخزون منخفض" },
      { type: "createDocument", target: "purchaseOrder" },
    ],
    enabled: true,
    priority: 9,
  });

  // Requisition auto-escalation
  engine.addRule({
    name: "تصعيد الطلبات المُعطّلة",
    description: "يُصعد الطلبات المُعطّلة لأكثر من 48 ساعة",
    trigger: "onSchedule",
    entity: "requisition",
    conditions: [{ field: "pendingHours", operator: "greaterThan", value: 48 }],
    actions: [
      { type: "sendNotification", target: "manager", value: "طلب معطّل" },
      { type: "updateField", target: "status", value: "escalated" },
    ],
    enabled: true,
    priority: 7,
  });

  // Auto-calculate totals on voucher
  engine.addRule({
    name: "حساب الإجمالي التلقائي",
    description: "يحسب الإجمالي والمصاريف والصافي تلقائياً",
    trigger: "onFieldChange",
    entity: "voucher",
    conditions: [{ field: "lines", operator: "isNotEmpty", value: null }],
    actions: [
      { type: "updateField", target: "total", value: "CALCULATED" },
      { type: "updateField", target: "tax", value: "CALCULATED" },
      { type: "updateField", target: "netAmount", value: "CALCULATED" },
    ],
    enabled: true,
    priority: 10,
  });
}

let engineInstance: WorkflowEngine | null = null;

export function getWorkflowEngine(): WorkflowEngine {
  if (!engineInstance) {
    engineInstance = new WorkflowEngine();
    createDefaultWorkflows(engineInstance);
  }
  return engineInstance;
}
