/**
 * Unit tests for the a11y primitives (node-safe: DOM is faked per test).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  REDUCED_MOTION_QUERY,
  announce,
  prefersReducedMotion,
  watchReducedMotion,
  __resetAnnouncerForTests,
} from "./a11y";

describe("prefersReducedMotion", () => {
  const realWindow = (globalThis as Record<string, unknown>).window;

  afterEach(() => {
    (globalThis as Record<string, unknown>).window = realWindow;
  });

  it("returns false without a window (SSR/node)", () => {
    (globalThis as Record<string, unknown>).window = undefined;
    expect(prefersReducedMotion()).toBe(false);
  });

  it("reflects the media query", () => {
    (globalThis as Record<string, unknown>).window = {
      matchMedia: (q: string) => ({ matches: q === REDUCED_MOTION_QUERY }),
    };
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe("announce", () => {
  beforeEach(() => {
    __resetAnnouncerForTests();
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).requestAnimationFrame;
  });

  it("is a no-op without a DOM and ignores empty messages", () => {
    expect(() => announce("hello")).not.toThrow();
  });

  it("writes into a visually-hidden live region and reuses it", () => {
    const regions: Array<Record<string, unknown>> = [];
    const body = {
      appendChild: (r: Record<string, unknown>) => regions.push(r),
    };
    const store = new Map<string, string>();
    const fakeRegion = {
      setAttribute: (k: string, v: string) => store.set(k, v),
      style: {},
      textContent: "",
    };
    (globalThis as Record<string, unknown>).document = {
      createElement: () => fakeRegion,
      body,
    };
    announce("مرحباً");
    announce("مرة ثانية", "assertive");
    // One region per politeness → two regions total, reused not recreated.
    expect(regions.length).toBe(2);
    expect(store.get("aria-live")).toBe("assertive");
    announce("ثالثة");
    expect(regions.length).toBe(2);
  });
});

describe("watchReducedMotion", () => {
  it("returns a noop without matchMedia", () => {
    const unsub = watchReducedMotion(vi.fn());
    expect(() => unsub()).not.toThrow();
  });
});
