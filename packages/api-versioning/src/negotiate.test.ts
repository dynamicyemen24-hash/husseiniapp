import { describe, it, expect, beforeEach } from "vitest";
import {
  parseVersion,
  compareVersions,
  negotiateVersion,
  extractVersionInfo,
  generateVersionHeaders,
  isDeprecated,
  isSunset,
  getLatestVersion,
  validateRegistry,
  createVersionedKey,
  resolveConfig,
} from "./negotiate";
import type { VersioningConfig, ApiVersion } from "./types";
import { apiVersion } from "./types";

const testConfig: VersioningConfig = {
  defaultVersion: apiVersion("2025-01-01"),
  versions: {
    [apiVersion("2024-01-01")]: {
      version: apiVersion("2024-01-01"),
      status: "deprecated",
      releasedAt: "2024-01-01",
      deprecation: {
        announcedAt: "2024-10-01",
        sunsetAt: "2025-04-01",
        replacement: apiVersion("2025-01-01"),
        migrationGuide: "https://docs.example.com/migration",
        message: "Migrate to 2025-01-01",
      },
    },
    [apiVersion("2024-06-15")]: {
      version: apiVersion("2024-06-15"),
      status: "active",
      releasedAt: "2024-06-15",
    },
    [apiVersion("2025-01-01")]: {
      version: apiVersion("2025-01-01"),
      status: "active",
      releasedAt: "2025-01-01",
    },
    [apiVersion("2025-07-01")]: {
      version: apiVersion("2025-07-01"),
      status: "active",
      releasedAt: "2025-07-01",
    },
    [apiVersion("2023-01-01")]: {
      version: apiVersion("2023-01-01"),
      status: "sunset",
      releasedAt: "2023-01-01",
      deprecation: {
        announcedAt: "2023-06-01",
        sunsetAt: "2024-01-01",
        replacement: apiVersion("2024-01-01"),
      },
    },
  },
  versionHeader: "accept-version",
  clientHeader: "x-client-version",
  negotiate: true,
  strict: false,
};

describe("API Versioning - Negotiation Engine", () => {
  describe("parseVersion", () => {
    it("parses date-based versions", () => {
      expect(parseVersion("2024-01-01")).toBe("2024-01-01");
      expect(parseVersion("2025-12-31")).toBe("2025-12-31");
    });

    it("parses semantic versions", () => {
      expect(parseVersion("v1")).toBe("v1");
      expect(parseVersion("v1.0")).toBe("v1.0");
      expect(parseVersion("v2.5.3")).toBe("v2.5.3");
    });

    it("throws on invalid format", () => {
      expect(() => parseVersion("invalid")).toThrow();
      expect(() => parseVersion("2024/01/01")).toThrow();
      expect(() => parseVersion("1.0")).toThrow();
    });
  });

  describe("compareVersions", () => {
    it("compares date-based versions correctly", () => {
      expect(compareVersions("2024-01-01", "2025-01-01")).toBe(-1);
      expect(compareVersions("2025-01-01", "2024-01-01")).toBe(1);
      expect(compareVersions("2024-01-01", "2024-01-01")).toBe(0);
    });

    it("compares semantic versions correctly", () => {
      expect(compareVersions("v1", "v2")).toBe(-1);
      expect(compareVersions("v2.0", "v1.9")).toBe(1);
      expect(compareVersions("v1.0.0", "v1")).toBe(0);
      expect(compareVersions("v1.5", "v1.5.0")).toBe(0);
    });

    it("handles mixed formats with string comparison fallback", () => {
      // Mixed formats fall back to string comparison
      const result = compareVersions("2024-01-01", "v1");
      expect([-1, 1]).toContain(result);
    });
  });

  describe("extractVersionInfo", () => {
    it("extracts version from header", () => {
      const headers = { "accept-version": "2025-01-01" };
      const info = extractVersionInfo(headers, testConfig);
      expect(info.version).toBe("2025-01-01");
      expect(info.explicit).toBe(true);
    });

    it("handles case-insensitive header", () => {
      const headers = { "Accept-Version": "2025-01-01" };
      const info = extractVersionInfo(headers, testConfig);
      expect(info.version).toBe("2025-01-01");
    });

    it("extracts client version", () => {
      const headers = {
        "accept-version": "2025-01-01",
        "x-client-version": "mobile-app/1.2.3",
      };
      const info = extractVersionInfo(headers, testConfig);
      expect(info.clientVersion).toBe("mobile-app/1.2.3");
    });

    it("returns null version when header missing", () => {
      const headers = {};
      const info = extractVersionInfo(headers, testConfig);
      expect(info.version).toBeNull();
      expect(info.explicit).toBe(false);
    });

    it("ignores invalid version format", () => {
      const headers = { "accept-version": "invalid-version" };
      const info = extractVersionInfo(headers, testConfig);
      expect(info.version).toBeNull();
    });
  });

  describe("negotiateVersion", () => {
    it("uses default version when none requested", () => {
      const info = { version: null, explicit: false };
      const result = negotiateVersion(info, testConfig);
      expect(result.version).toBe("2025-01-01");
      expect(result.negotiated).toBe(false);
    });

    it("returns requested version when supported", () => {
      const info = { version: "2024-06-15" as ApiVersion, explicit: true };
      const result = negotiateVersion(info, testConfig);
      expect(result.version).toBe("2024-06-15");
      expect(result.negotiated).toBe(false);
    });

    it("falls back to default for unsupported version", () => {
      const info = { version: "2026-01-01" as ApiVersion, explicit: true };
      const result = negotiateVersion(info, testConfig);
      expect(result.version).toBe("2025-01-01");
      expect(result.negotiated).toBe(true);
      expect(result.warning).toContain("not supported");
    });

    it("throws in strict mode for unsupported version", () => {
      const strictConfig = { ...testConfig, strict: true };
      const info = { version: "2026-01-01" as ApiVersion, explicit: true };
      expect(() => negotiateVersion(info, strictConfig)).toThrow("Unsupported API version");
    });

    it("allows sunset version with warning in non-strict mode", () => {
      const info = { version: "2023-01-01" as ApiVersion, explicit: true };
      const result = negotiateVersion(info, testConfig);
      expect(result.version).toBe("2023-01-01");
      expect(result.warning).toContain("sunset");
    });

    it("throws in strict mode for sunset version", () => {
      const strictConfig = { ...testConfig, strict: true };
      const info = { version: "2023-01-01" as ApiVersion, explicit: true };
      expect(() => negotiateVersion(info, strictConfig)).toThrow("sunset");
    });
  });

  describe("generateVersionHeaders", () => {
    it("includes api-version header", () => {
      const info = { version: "2025-01-01" as ApiVersion, explicit: true };
      const headers = generateVersionHeaders("2025-01-01", testConfig, info);
      expect(headers["api-version"]).toBe("2025-01-01");
    });

    it("includes supported-versions header", () => {
      const info = { version: "2025-01-01" as ApiVersion, explicit: true };
      const headers = generateVersionHeaders("2025-01-01", testConfig, info);
      expect(headers["supported-versions"]).toContain("2024-06-15");
      expect(headers["supported-versions"]).toContain("2025-01-01");
      expect(headers["supported-versions"]).toContain("2025-07-01");
      // Deprecated versions should not be in supported
      expect(headers["supported-versions"]).not.toContain("2024-01-01");
    });

    it("adds deprecation headers for deprecated versions", () => {
      const info = { version: "2024-01-01" as ApiVersion, explicit: true };
      const headers = generateVersionHeaders("2024-01-01", testConfig, info);
      expect(headers.deprecation).toContain("true");
      expect(headers.deprecation).toContain("2024-10-01");
      expect(headers.sunset).toBe("2025-04-01");
      expect(headers.link).toContain("migration-guide");
    });

    it("does not add deprecation headers for active versions", () => {
      const info = { version: "2025-01-01" as ApiVersion, explicit: true };
      const headers = generateVersionHeaders("2025-01-01", testConfig, info);
      expect(headers.deprecation).toBeUndefined();
      expect(headers.sunset).toBeUndefined();
    });
  });

  describe("isDeprecated / isSunset", () => {
    it("identifies deprecated versions", () => {
      expect(isDeprecated("2024-01-01", testConfig)).toBe(true);
      expect(isDeprecated("2024-06-15", testConfig)).toBe(false);
      expect(isDeprecated("2025-01-01", testConfig)).toBe(false);
    });

    it("identifies sunset versions", () => {
      expect(isSunset("2023-01-01", testConfig)).toBe(true);
      expect(isSunset("2024-01-01", testConfig)).toBe(false);
      expect(isSunset("2025-01-01", testConfig)).toBe(false);
    });
  });

  describe("getLatestVersion", () => {
    it("returns latest active version", () => {
      const latest = getLatestVersion(testConfig);
      expect(latest).toBe("2025-07-01");
    });
  });

  describe("validateRegistry", () => {
    it("validates correct registry", () => {
      const result = validateRegistry(testConfig.versions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("catches missing deprecation info", () => {
      const versions = {
        [apiVersion("2024-01-01")]: {
          version: apiVersion("2024-01-01"),
          status: "deprecated" as const,
          releasedAt: "2024-01-01",
        },
      };
      const result = validateRegistry(versions);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Version 2024-01-01: deprecated status requires deprecation info");
    });

    it("catches invalid replacement", () => {
      const versions = {
        [apiVersion("2024-01-01")]: {
          version: apiVersion("2024-01-01"),
          status: "deprecated" as const,
          releasedAt: "2024-01-01",
          deprecation: {
            announcedAt: "2024-10-01",
            replacement: apiVersion("9999-01-01"),
          },
        },
      };
      const result = validateRegistry(versions);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("replacement 9999-01-01 not found");
    });

    it("catches sunset before announced", () => {
      const versions = {
        [apiVersion("2024-01-01")]: {
          version: apiVersion("2024-01-01"),
          status: "deprecated" as const,
          releasedAt: "2024-01-01",
          deprecation: {
            announcedAt: "2024-10-01",
            sunsetAt: "2024-09-01",
          },
        },
      };
      const result = validateRegistry(versions);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("sunsetAt must be after announcedAt");
    });
  });

  describe("createVersionedKey", () => {
    it("creates cache keys with version", () => {
      expect(createVersionedKey("user:123", "2025-01-01")).toBe("user:123:v20250101");
      expect(createVersionedKey("cache:key", "v1.2.3")).toBe("cache:key:v123");
    });
  });

  describe("resolveConfig", () => {
    it("applies defaults", () => {
      const config = resolveConfig({
        defaultVersion: "2025-01-01" as ApiVersion,
        versions: {},
      });
      expect(config.versionHeader).toBe("accept-version");
      expect(config.clientHeader).toBe("x-client-version");
      expect(config.negotiate).toBe(true);
      expect(config.strict).toBe(false);
    });

    it("allows override of defaults", () => {
      const config = resolveConfig({
        defaultVersion: "2025-01-01" as ApiVersion,
        versions: {},
        versionHeader: "x-api-version",
        negotiate: false,
        strict: true,
      });
      expect(config.versionHeader).toBe("x-api-version");
      expect(config.negotiate).toBe(false);
      expect(config.strict).toBe(true);
    });
  });
});