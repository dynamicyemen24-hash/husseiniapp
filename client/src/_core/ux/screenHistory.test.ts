import { describe, expect, it } from "vitest";
import {
  DEFAULT_HISTORY_LIMIT,
  groupSummaries,
  nextScreenFor,
  recentScreens,
  recordVisit,
  shortcutJump,
  type ScreenRef,
} from "./screenHistory";

const voyages: ScreenRef = { key: "voyages", title: "Voyages", group: "ops" };
const catalog: ScreenRef = {
  key: "catalog",
  title: "Catalog",
  group: "catalog",
};
const trialBalance: ScreenRef = {
  key: "trial-balance",
  title: "Trial Balance",
  group: "finance",
};
const closingReport: ScreenRef = {
  key: "closing-report",
  title: "Closing Report",
  group: "reports",
};
const settings: ScreenRef = {
  key: "settings",
  title: "Settings",
  group: "system",
};
const audits: ScreenRef = {
  key: "audit-log",
  title: "Audit Log",
  group: "system",
};

function keys(screens: ScreenRef[]): string[] {
  return screens.map(s => s.key);
}

describe("recordVisit", () => {
  it("prepends a new visit to the front", () => {
    const next = recordVisit([voyages, catalog], trialBalance);
    expect(keys(next)).toEqual(["trial-balance", "voyages", "catalog"]);
  });

  it("dedupes by key and moves the existing entry to the front", () => {
    const next = recordVisit([trialBalance, voyages, catalog], voyages);
    expect(keys(next)).toEqual(["voyages", "trial-balance", "catalog"]);
  });

  it("removes older duplicate entries when the recorded key appears more than once", () => {
    const next = recordVisit([catalog, voyages, catalog], catalog);
    expect(keys(next)).toEqual(["catalog", "voyages"]);
  });

  it("caps the history at the default limit of 12", () => {
    const long = Array.from(
      { length: 15 },
      (_, i): ScreenRef => ({
        key: `screen-${i}`,
        title: `Screen ${i}`,
        group: "ops",
      })
    );
    const next = recordVisit(long, trialBalance);
    expect(next.length).toBe(DEFAULT_HISTORY_LIMIT);
    expect(keys(next)[0]).toBe("trial-balance");
  });

  it("respects a custom maxLen and drops the oldest entries", () => {
    const next = recordVisit(
      [voyages, catalog, trialBalance],
      closingReport,
      2
    );
    expect(keys(next)).toEqual(["closing-report", "voyages"]);
  });

  it("returns an empty array for maxLen 0 or negative", () => {
    expect(recordVisit([voyages], catalog, 0)).toEqual([]);
    expect(recordVisit([voyages], catalog, -3)).toEqual([]);
  });

  it("does not mutate the input history", () => {
    const input = [voyages, catalog];
    const before = keys(input);
    recordVisit(input, trialBalance);
    expect(keys(input)).toEqual(before);
  });
});

describe("recentScreens", () => {
  it("returns the same order without mutating the input", () => {
    const input = [voyages, catalog, trialBalance];
    const result = recentScreens(input);
    expect(keys(result)).toEqual(keys(input));
    expect(result).not.toBe(input);
  });

  it("returns an empty array for an empty history", () => {
    expect(recentScreens([])).toEqual([]);
  });
});

describe("shortcutJump", () => {
  it("moves a present key to the front and reports promoted", () => {
    const input = [voyages, catalog, trialBalance];
    const { history, promoted } = shortcutJump(input, "catalog");
    expect(promoted).toBe(true);
    expect(keys(history)).toEqual(["catalog", "voyages", "trial-balance"]);
  });

  it("promotes the first occurrence when the key repeats", () => {
    const { history, promoted } = shortcutJump(
      [catalog, voyages, catalog],
      "catalog"
    );
    expect(promoted).toBe(true);
    expect(keys(history)).toEqual(["catalog", "voyages", "catalog"]);
  });

  it("returns the unchanged history copy with promoted false when absent", () => {
    const input = [voyages, catalog];
    const { history, promoted } = shortcutJump(input, "missing-key");
    expect(promoted).toBe(false);
    expect(keys(history)).toEqual(keys(input));
    expect(history).not.toBe(input);
  });

  it("does not mutate the input history", () => {
    const input = [voyages, catalog];
    const before = keys(input);
    shortcutJump(input, "catalog");
    expect(keys(input)).toEqual(before);
  });

  it("handles an empty history", () => {
    const { history, promoted } = shortcutJump([], "anything");
    expect(promoted).toBe(false);
    expect(history).toEqual([]);
  });
});

describe("groupSummaries", () => {
  it("counts screens per group", () => {
    const result = groupSummaries([
      voyages,
      catalog,
      trialBalance,
      closingReport,
      settings,
    ]);
    expect(result).toEqual([
      { group: "ops", count: 1 },
      { group: "catalog", count: 1 },
      { group: "finance", count: 1 },
      { group: "reports", count: 1 },
      { group: "system", count: 1 },
    ]);
  });

  it("orders the four known groups first, then others alphabetically", () => {
    const result = groupSummaries([
      audits,
      catalog,
      settings,
      voyages,
      catalog,
    ]);
    expect(result).toEqual([
      { group: "ops", count: 1 },
      { group: "catalog", count: 2 },
      { group: "system", count: 2 },
    ]);
  });

  it("orders three unknown groups alphabetically after the known ones", () => {
    const zGroup: ScreenRef = {
      key: "z",
      title: "Z",
      group: "zeta",
    };
    const aGroup: ScreenRef = {
      key: "a",
      title: "A",
      group: "alpha",
    };
    const result = groupSummaries([aGroup, settings, zGroup, trialBalance]);
    expect(result.map(s => s.group)).toEqual([
      "finance",
      "alpha",
      "system",
      "zeta",
    ]);
  });

  it("returns an empty list for an empty history", () => {
    expect(groupSummaries([])).toEqual([]);
  });

  it("does not mutate the input history", () => {
    const input = [voyages, catalog];
    groupSummaries(input);
    expect(keys(input)).toEqual(["voyages", "catalog"]);
  });
});

describe("nextScreenFor", () => {
  it("returns the screen at each step of a known flow", () => {
    expect(nextScreenFor("advanceTrialBalance", 0)).toEqual({
      key: "voyage-list",
      title: "Voyages",
      group: "ops",
    });
    expect(nextScreenFor("advanceTrialBalance", 1)?.key).toBe(
      "voyage-position"
    );
    expect(nextScreenFor("advanceTrialBalance", 2)?.key).toBe("trial-balance");
    expect(nextScreenFor("advanceTrialBalance", 3)?.key).toBe("closing-report");
  });

  it("supports a second workflow from the internal table", () => {
    expect(nextScreenFor("procurementRequest", 0)?.key).toBe("catalog-search");
    expect(nextScreenFor("procurementRequest", 2)?.key).toBe("approval");
  });

  it("returns null for an unknown flow", () => {
    expect(nextScreenFor("does-not-exist", 0)).toBeNull();
  });

  it("returns null when the step index is out of range", () => {
    expect(nextScreenFor("advanceTrialBalance", 4)).toBeNull();
    expect(nextScreenFor("advanceTrialBalance", -1)).toBeNull();
  });
});
