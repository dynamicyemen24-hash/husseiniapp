import { describe, expect, it, vi, afterEach } from "vitest";
import {
  WorkflowEngine,
  createDefaultWorkflows,
  resolveFieldPath,
  validateRule,
} from "./workflowEngine";

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveFieldPath", () => {
  it("resolves nested paths, array indexes and missing segments", () => {
    const record = {
      customer: { balance: 1500, tags: ["vip"] },
      lines: [{ qty: 2 }, { qty: 5 }],
      status: "draft",
    };
    expect(resolveFieldPath(record, "status")).toBe("draft");
    expect(resolveFieldPath(record, "customer.balance")).toBe(1500);
    expect(resolveFieldPath(record, "lines.0.qty")).toBe(2);
    expect(resolveFieldPath(record, "lines.5.qty")).toBeUndefined();
    expect(resolveFieldPath(record, "customer.missing.deep")).toBeUndefined();
    expect(resolveFieldPath(record, "")).toBeUndefined();
  });
});

describe("evaluateConditions — extended operators", () => {
  const engine = new WorkflowEngine();
  const record = {
    amount: 7500,
    status: "draft",
    region: "riyadh",
    priority: 3,
    customer: { balance: 1500 },
  };

  it("supports gte/lte comparisons", () => {
    expect(
      engine.evaluateConditions(
        [{ field: "amount", operator: "greaterThanOrEqual", value: 7500 }],
        record
      )
    ).toBe(true);
    expect(
      engine.evaluateConditions(
        [{ field: "amount", operator: "lessThanOrEqual", value: 7499 }],
        record
      )
    ).toBe(false);
  });

  it("supports in/notIn membership", () => {
    expect(
      engine.evaluateConditions(
        [{ field: "region", operator: "in", value: ["riyadh", "jeddah"] }],
        record
      )
    ).toBe(true);
    expect(
      engine.evaluateConditions(
        [{ field: "region", operator: "notIn", value: ["riyadh"] }],
        record
      )
    ).toBe(false);
  });

  it("supports between ranges (inclusive)", () => {
    expect(
      engine.evaluateConditions(
        [{ field: "priority", operator: "between", value: [1, 3] }],
        record
      )
    ).toBe(true);
    expect(
      engine.evaluateConditions(
        [{ field: "priority", operator: "between", value: [4, 9] }],
        record
      )
    ).toBe(false);
  });

  it("supports valueField field-to-field comparison", () => {
    const stock = { stockQty: 3, reorderLevel: 10 };
    expect(
      engine.evaluateConditions(
        [
          {
            field: "stockQty",
            operator: "lessThan",
            value: null,
            valueField: "reorderLevel",
          },
        ],
        stock
      )
    ).toBe(true);
    expect(
      engine.evaluateConditions(
        [
          {
            field: "stockQty",
            operator: "lessThan",
            value: null,
            valueField: "reorderLevel",
          },
        ],
        { stockQty: 50, reorderLevel: 10 }
      )
    ).toBe(false);
  });

  it("supports nested dot-paths on the left side", () => {
    expect(
      engine.evaluateConditions(
        [{ field: "customer.balance", operator: "greaterThan", value: 1000 }],
        record
      )
    ).toBe(true);
  });

  it("fails closed on non-numeric comparisons", () => {
    expect(
      engine.evaluateConditions(
        [{ field: "status", operator: "greaterThan", value: 5 }],
        record
      )
    ).toBe(false);
  });
});

describe("default workflows — regression locks", () => {
  it("low-stock rule fires on live levels (not the old string literal)", () => {
    const engine = new WorkflowEngine();
    createDefaultWorkflows(engine);
    const [result] = engine.processEvent("onFieldChange", "product", {
      stockQty: 3,
      reorderLevel: 10,
    });
    expect(result.success).toBe(true);
    expect(result.actionsExecuted).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it("low-stock rule stays quiet when stock is healthy", () => {
    const engine = new WorkflowEngine();
    createDefaultWorkflows(engine);
    const [result] = engine.processEvent("onFieldChange", "product", {
      stockQty: 50,
      reorderLevel: 10,
    });
    expect(result.success).toBe(true);
    expect(result.actionsExecuted).toBe(0);
  });

  it("small-invoice auto-approval still works", () => {
    const engine = new WorkflowEngine();
    createDefaultWorkflows(engine);
    const [result] = engine.processEvent("onCreate", "invoice", {
      amount: 1200,
      status: "draft",
    });
    expect(result.success).toBe(true);
    expect(result.actionsExecuted).toBeGreaterThan(0);
  });

  it("all default rules pass validation", () => {
    const engine = new WorkflowEngine();
    createDefaultWorkflows(engine);
    for (const rule of (engine as any).rules as Array<{
      name: string;
      trigger: string;
      entity: string;
      conditions: any[];
      actions: any[];
      enabled: boolean;
      priority: number;
    }>) {
      expect(
        validateRule(rule),
        `default rule "${rule.name}" must be valid`
      ).toEqual([]);
    }
  });
});

describe("deferred actions — scheduling and cancellation", () => {
  it("schedules delayed actions without counting them as executed", () => {
    vi.useFakeTimers();
    const engine = new WorkflowEngine();
    engine.addRule({
      name: "delayed",
      description: "d",
      trigger: "onCreate",
      entity: "invoice",
      conditions: [],
      actions: [{ type: "updateField", target: "x", value: 1, delay: 5000 }],
      enabled: true,
      priority: 1,
    });
    const [result] = engine.processEvent("onCreate", "invoice", {});
    expect(result.success).toBe(true);
    expect(result.actionsExecuted).toBe(0);
    expect(result.scheduledActions).toBe(1);
    expect(result.actionResults).toEqual([
      { action: "updateField", status: "scheduled" },
    ]);
    expect(engine.getScheduledCount()).toBe(1);
    expect(engine.cancelScheduled()).toBe(1);
    expect(engine.getScheduledCount()).toBe(0);
  });

  it("cancelScheduled can be scoped to a single rule", () => {
    vi.useFakeTimers();
    const engine = new WorkflowEngine();
    const a = engine.addRule({
      name: "a",
      description: "d",
      trigger: "onCreate",
      entity: "invoice",
      conditions: [],
      actions: [{ type: "logEvent", target: "a", delay: 1000 }],
      enabled: true,
      priority: 1,
    });
    engine.addRule({
      name: "b",
      description: "d",
      trigger: "onCreate",
      entity: "invoice",
      conditions: [],
      actions: [{ type: "logEvent", target: "b", delay: 1000 }],
      enabled: true,
      priority: 1,
    });
    engine.processEvent("onCreate", "invoice", {});
    expect(engine.getScheduledCount()).toBe(2);
    expect(engine.cancelScheduled(a)).toBe(1);
    expect(engine.getScheduledCount()).toBe(1);
    expect(engine.cancelScheduled()).toBe(1);
  });
});

describe("stopOnFailure and fail-closed actions", () => {
  const flaky = {
    name: "flaky",
    description: "d",
    trigger: "onCreate" as const,
    entity: "invoice",
    conditions: [],
    enabled: true,
    priority: 1,
  };

  it("unknown actions fail closed instead of silently passing", () => {
    const engine = new WorkflowEngine();
    engine.addRule({
      ...flaky,
      actions: [{ type: "teleport" as any }],
    });
    const [result] = engine.processEvent("onCreate", "invoice", {});
    expect(result.success).toBe(false);
    expect(result.actionResults[0].status).toBe("failed");
    expect(result.errors.join(" ")).toContain("Unknown workflow action");
  });

  it("stopOnFailure skips the remaining actions after a failure", () => {
    const engine = new WorkflowEngine();
    engine.addRule({
      ...flaky,
      stopOnFailure: true,
      actions: [
        { type: "updateField", target: "a", value: 1 },
        { type: "teleport" as any },
        { type: "updateField", target: "b", value: 2 },
      ],
    });
    const [result] = engine.processEvent("onCreate", "invoice", {});
    expect(result.success).toBe(false);
    expect(result.actionResults.map(r => r.status)).toEqual([
      "executed",
      "failed",
      "skipped",
    ]);
  });

  it("best-effort mode attempts every action by default", () => {
    const engine = new WorkflowEngine();
    engine.addRule({
      ...flaky,
      actions: [
        { type: "teleport" as any },
        { type: "updateField", target: "b", value: 2 },
      ],
    });
    const [result] = engine.processEvent("onCreate", "invoice", {});
    expect(result.actionResults.map(r => r.status)).toEqual([
      "failed",
      "executed",
    ]);
  });
});

describe("validateRule", () => {
  it("flags unknown triggers, actions and operators", () => {
    const problems = validateRule({
      name: "bad",
      description: "d",
      trigger: "onExplode" as any,
      entity: "invoice",
      conditions: [{ field: "x", operator: "fuzzy" as any, value: 1 }],
      actions: [{ type: "teleport" as any }],
      enabled: true,
      priority: 1,
    });
    expect(problems.join("|")).toContain("Unknown trigger");
    expect(problems.join("|")).toContain("Unknown action type");
    expect(problems.join("|")).toContain("Unknown operator");
  });

  it("requires a [min,max] pair for between and an array for in", () => {
    expect(
      validateRule({
        name: "b",
        description: "d",
        trigger: "onCreate",
        entity: "invoice",
        conditions: [{ field: "x", operator: "between", value: 5 }],
        actions: [{ type: "logEvent" }],
        enabled: true,
        priority: 1,
      })
    ).not.toEqual([]);
    expect(
      validateRule({
        name: "b",
        description: "d",
        trigger: "onCreate",
        entity: "invoice",
        conditions: [{ field: "x", operator: "in", value: "riyadh" }],
        actions: [{ type: "logEvent" }],
        enabled: true,
        priority: 1,
      })
    ).not.toEqual([]);
  });
});
