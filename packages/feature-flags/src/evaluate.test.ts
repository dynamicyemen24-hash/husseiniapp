import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateFlag, evaluateAllFlags, createFlagClient, simpleHash } from "./evaluate";
import { loadFlags } from "./config";
import type { FlagDefinition, EvaluationContext, FlagKey } from "./types";
import { flagKey } from "./types";

const testFlags = {
  [flagKey("test-boolean")]: {
    key: flagKey("test-boolean"),
    description: "Test boolean flag",
    defaultValue: false,
    enabled: true,
    targeting: [
      { percentage: 50, userIds: ["user-1"] },
      { roles: ["admin"] },
    ],
  },
  [flagKey("test-string")]: {
    key: flagKey("test-string"),
    description: "Test string flag",
    defaultValue: "default",
    enabled: true,
  },
  [flagKey("disabled-flag")]: {
    key: flagKey("disabled-flag"),
    description: "Disabled flag",
    defaultValue: true,
    enabled: false,
  },
  [flagKey("complex-targeting")]: {
    key: flagKey("complex-targeting"),
    description: "Complex targeting flag",
    defaultValue: "off",
    enabled: true,
    targeting: [
      { percentage: 100, userIds: ["vip-user"], tenantIds: [1, 2] },
      { roles: ["premium"], percentage: 25 },
    ],
  },
} as const;

const baseContext: EvaluationContext = {
  userId: "user-123",
  tenantId: 1,
  role: "user",
  environment: "production",
  requestId: "req-123",
};

describe("Feature Flags - Evaluation Engine", () => {
  describe("simpleHash", () => {
    it("produces deterministic results", () => {
      expect(simpleHash("test")).toBe(simpleHash("test"));
      expect(simpleHash("test")).not.toBe(simpleHash("other"));
    });

    it("handles empty string", () => {
      expect(simpleHash("")).toBe(0);
    });

    it("produces positive integers", () => {
      expect(simpleHash("anything")).toBeGreaterThanOrEqual(0);
    });
  });

  describe("evaluateFlag", () => {
    it("returns default value when no targeting matches", () => {
      const result = evaluateFlag(testFlags["test-string"], baseContext);
      expect(result.value).toBe("default");
      expect(result.reason).toBe("default");
    });

    it("returns default for disabled flag", () => {
      const result = evaluateFlag(testFlags["disabled-flag"], baseContext);
      expect(result.value).toBe(true); // defaultValue
      expect(result.reason).toBe("disabled");
    });

    it("matches userIds targeting", () => {
      const context = { ...baseContext, userId: "user-1" };
      const result = evaluateFlag(testFlags["test-boolean"], context);
      expect(result.reason).toBe("targeting");
      expect(result.value).toBe(false); // defaultValue
    });

    it("matches role targeting", () => {
      const context = { ...baseContext, role: "admin" };
      const result = evaluateFlag(testFlags["test-boolean"], context);
      expect(result.reason).toBe("targeting");
    });

    it("respects percentage rollout", () => {
      const flag: FlagDefinition<boolean> = {
        key: flagKey("percent-flag"),
        description: "Percentage test",
        defaultValue: true,
        enabled: true,
        targeting: [{ percentage: 0 }], // 0% should never match
      };
      const result = evaluateFlag(flag, baseContext);
      expect(result.reason).toBe("default");
      expect(result.value).toBe(true);
    });

    it("applies override over everything", () => {
      const overrides = new Map<FlagKey, any>([[flagKey("test-boolean"), true]]);
      const result = evaluateFlag(testFlags["test-boolean"], baseContext, overrides);
      expect(result.value).toBe(true);
      expect(result.reason).toBe("override");
    });
  });

  describe("evaluateAllFlags", () => {
    it("evaluates all flags", () => {
      const results = evaluateAllFlags(testFlags, baseContext);
      expect(Object.keys(results)).toHaveLength(4);
      expect(results["test-boolean"].reason).toBe("default");
      expect(results["test-string"].reason).toBe("default");
      expect(results["disabled-flag"].reason).toBe("disabled");
    });
  });

  describe("createFlagClient", () => {
    it("provides type-safe access", () => {
      const client = createFlagClient(testFlags, baseContext);

      expect(client.getValue("test-string")).toBe("default");
      expect(client.isEnabled("test-boolean")).toBe(false);
      expect(client.getFlag("test-boolean").reason).toBe("default");
    });

    it("handles overrides", () => {
      const client = createFlagClient(testFlags, baseContext);

      client.setOverride("test-boolean", true);
      expect(client.isEnabled("test-boolean")).toBe(true);

      client.clearOverride("test-boolean");
      expect(client.isEnabled("test-boolean")).toBe(false);
    });

    it("returns all values", () => {
      const client = createFlagClient(testFlags, baseContext);
      const values = client.getAllValues();

      expect(values["test-string"]).toBe("default");
      expect(typeof values["test-boolean"]).toBe("boolean");
    });

    it("debug returns full results", () => {
      const client = createFlagClient(testFlags, baseContext);
      const debug = client.debug();

      expect(debug["test-boolean"].flagKey).toBe("test-boolean");
      expect(debug["test-boolean"].evaluatedAt).toBeInstanceOf(Date);
    });
  });
});

describe("Feature Flags - Configuration", () => {
  it("loads config from file", () => {
    // This would need the actual config file
    // const flags = loadFlags("./feature-flags.config.json");
    // expect(Object.keys(flags)).toContain("new-dashboard-ui");
    expect(true).toBe(true); // Placeholder
  });
});

describe("Feature Flags - Types", () => {
  it("creates branded flag keys", () => {
    const key = flagKey("my-feature");
    expect(typeof key).toBe("string");
    expect(key).toBe("my-feature");
  });
});