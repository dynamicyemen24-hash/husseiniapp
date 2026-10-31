import { describe, expect, it } from "vitest";
import { guideFor, tooltipFor, tooltipsForScreen } from "./tooltips";

describe("tooltipFor", () => {
  it("returns the field-specific entry when the field matches", () => {
    const tip = tooltipFor("catalog", "code");
    expect(tip).not.toBeNull();
    expect(tip?.topic).toBe("catalog");
    expect(tip?.field).toBe("code");
    expect(tip?.title).toBe("\u0627\u0644\u0643\u0648\u062f");
  });

  it("returns a unit tooltip for the unit field", () => {
    expect(tooltipFor("catalog", "unit")?.field).toBe("unit");
  });

  it("returns the general entry when a field has no dedicated tooltip", () => {
    const tip = tooltipFor("payments", "cash");
    expect(tip).not.toBeNull();
    expect(tip?.topic).toBe("payments");
    expect(tip?.field).toBeUndefined();
  });

  it("returns the general entry when no field is given", () => {
    const tip = tooltipFor("invoices");
    expect(tip?.field).toBeUndefined();
    expect(tip?.title).toBe("\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631");
  });

  it("returns null for an unknown topic", () => {
    expect(tooltipFor("definitely-not-a-screen")).toBeNull();
  });

  it("is deterministic across repeated calls", () => {
    expect(tooltipFor("units", "base")).toEqual(tooltipFor("units", "base"));
  });
});

describe("guideFor", () => {
  it("returns how-to bullets for a filled screen", () => {
    const bullets = guideFor("catalog", false);
    expect(bullets.length).toBeGreaterThan(0);
    expect(bullets).toContain(
      "\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 \u0644\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0633\u0639\u0631 \u0623\u0648 \u0627\u0644\u0648\u062d\u062f\u0629."
    );
  });

  it("returns first-time steps for an empty screen", () => {
    const bullets = guideFor("catalog", true);
    expect(bullets).toContain(
      "\u0623\u0636\u0641 \u0623\u0648\u0644 \u0635\u0646\u0641 \u062a\u0628\u064a\u0639\u0647."
    );
    expect(bullets.length).toBeLessThan(guideFor("catalog", true, true).length);
  });

  it("appends an example only when hasExamples is true and the screen is empty", () => {
    expect(guideFor("catalog", true, true).length).toBe(
      guideFor("catalog", true).length + 1
    );
    expect(guideFor("catalog", false, true).length).toBe(
      guideFor("catalog", false).length
    );
  });

  it("uses a deterministic fallback for unknown topics", () => {
    expect(guideFor("whatever", true)).toEqual(guideFor("whatever", true));
    expect(guideFor("whatever", true).length).toBeGreaterThan(0);
  });

  it("returns a fresh array on every call", () => {
    const a = guideFor("invoices", true);
    const b = guideFor("invoices", true);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("tooltipsForScreen", () => {
  it("returns the best tooltip per topic, priority desc then title asc", () => {
    const tips = tooltipsForScreen([
      "catalog",
      "invoices",
      "payments",
      "requests",
      "units",
    ]);
    expect(tips).toHaveLength(5);
    expect(tips.map(t => t.title)).toEqual([
      "\u0627\u0644\u0648\u062d\u062f\u0627\u062a", // priority 46
      "\u0627\u0644\u0637\u0644\u0628\u0627\u062a", // priority 44
      "\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a", // priority 42
      "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631", // priority 40, tie broken by title asc
      "\u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c",
    ]);
  });

  it("deduplicates repeated topics", () => {
    expect(tooltipsForScreen(["catalog", "catalog", "catalog"])).toHaveLength(
      1
    );
  });

  it("skips unknown topics without dropping known ones", () => {
    const tips = tooltipsForScreen(["invoices", "unknown-topic"]);
    expect(tips).toHaveLength(1);
    expect(tips[0].topic).toBe("invoices");
  });

  it("returns an empty array for no topics", () => {
    expect(tooltipsForScreen([])).toEqual([]);
  });
});
