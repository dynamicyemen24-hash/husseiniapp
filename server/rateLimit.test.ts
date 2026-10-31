import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "./_core/rateLimit";

describe("checkRateLimit (sliding window)", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests under the limit", () => {
    const r1 = checkRateLimit("ip:1", 3, 60_000, 1_000);
    const r2 = checkRateLimit("ip:1", 3, 60_000, 2_000);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("blocks the request that exceeds the limit", () => {
    checkRateLimit("ip:2", 2, 60_000, 1_000);
    checkRateLimit("ip:2", 2, 60_000, 2_000);
    const r3 = checkRateLimit("ip:2", 2, 60_000, 3_000);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfterSec).toBeGreaterThan(0);
  });

  it("recovers after the window elapses", () => {
    checkRateLimit("ip:3", 1, 10_000, 1_000);
    const blocked = checkRateLimit("ip:3", 1, 10_000, 5_000);
    expect(blocked.ok).toBe(false);
    const recovered = checkRateLimit("ip:3", 1, 10_000, 12_000);
    expect(recovered.ok).toBe(true);
  });

  it("isolates keys from each other", () => {
    checkRateLimit("ip:a", 1, 60_000, 1_000);
    const other = checkRateLimit("ip:b", 1, 60_000, 1_000);
    expect(other.ok).toBe(true);
  });
});
