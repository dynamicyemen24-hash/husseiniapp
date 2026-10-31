import { describe, expect, it } from "vitest";
import { getClientIp, parseDevice } from "../_core/geo";

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header (first hop)", () => {
    const req = {
      headers: { "x-forwarded-for": "10.0.0.1, 192.168.1.1, 172.16.0.1" },
    } as any;
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns first IP when x-forwarded-for has multiple values", () => {
    const req = {
      headers: { "x-forwarded-for": "1.2.3.4 , 5.6.7.8" },
    } as any;
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("handles array x-forwarded-for header", () => {
    const req = {
      headers: { "x-forwarded-for": ["203.0.113.5", "10.0.0.1"] },
    } as any;
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip header", () => {
    const req = {
      headers: { "x-real-ip": "198.51.100.42" },
    } as any;
    expect(getClientIp(req)).toBe("198.51.100.42");
  });

  it("falls back to socket remoteAddress", () => {
    const req = {
      headers: {},
      socket: { remoteAddress: "::ffff:192.168.1.100" },
    } as any;
    expect(getClientIp(req)).toBe("::ffff:192.168.1.100");
  });

  it("returns null when no headers or socket present", () => {
    const req = { headers: {} } as any;
    expect(getClientIp(req)).toBeNull();
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = {
      headers: {
        "x-forwarded-for": "203.0.113.99",
        "x-real-ip": "198.51.100.1",
      },
    } as any;
    expect(getClientIp(req)).toBe("203.0.113.99");
  });
});

describe("parseDevice", () => {
  it("returns null for undefined user agent", () => {
    expect(parseDevice(undefined)).toBe("حاسوب — متصفح");
  });

  it("returns null for null user agent", () => {
    expect(parseDevice(null)).toBe("حاسوب — متصفح");
  });

  it("returns null for empty string user agent", () => {
    expect(parseDevice("")).toBe("حاسوب — متصفح");
  });

  it("detects Chrome on desktop", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseDevice(ua)).toBe("حاسوب — Chrome");
  });

  it("detects Edge on desktop", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseDevice(ua)).toBe("حاسوب — Edge");
  });

  it("detects Firefox on desktop", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(parseDevice(ua)).toBe("حاسوب — Firefox");
  });

  it("detects Safari on desktop (not Chrome)", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(parseDevice(ua)).toBe("حاسوب — Safari");
  });

  it("detects Chrome on mobile (Android)", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(parseDevice(ua)).toBe("جوال — Chrome");
  });

  it("detects Safari on mobile (iPhone)", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseDevice(ua)).toBe("جوال — Safari");
  });

  it("detects Opera on desktop", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) OPR/106.0.0.0 (Edition Ubisoft)";
    expect(parseDevice(ua)).toBe("حاسوب — Opera");
  });

  it("detects iPad as mobile", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseDevice(ua)).toBe("جوال — Safari");
  });

  it("defaults to 'متصفح' for unrecognized user agents", () => {
    expect(parseDevice("SomeUnknownBrowser/1.0")).toBe("حاسوب — متصفح");
  });
});
