import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RUNTIME_USER_INFO_STORAGE_KEY,
  SESSION_MIRROR_STORAGE_KEY,
} from "./auth.constants";
import {
  clearSessionTokenMirror,
  sanitizeRedirectPath,
  writeRuntimeUserInfo,
} from "./index";

// ---------------------------------------------------------------------------
// Minimal Storage stub — the vitest environment is `node`, so window storage
// globals are undefined by default (which is exactly the SSR case).
// ---------------------------------------------------------------------------
function createStorageStub() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    _map: map,
  };
}

const userPayload = { id: 1, name: "Owner", role: "owner" };

describe("auth.storage", () => {
  describe("SSR / unavailable storage", () => {
    it("never throws when localStorage/sessionStorage are undefined", () => {
      expect(() => writeRuntimeUserInfo(userPayload)).not.toThrow();
      expect(() => clearSessionTokenMirror()).not.toThrow();
    });
  });

  describe("available storage", () => {
    let local: ReturnType<typeof createStorageStub>;
    let session: ReturnType<typeof createStorageStub>;

    beforeEach(() => {
      local = createStorageStub();
      session = createStorageStub();
      vi.stubGlobal("localStorage", local);
      vi.stubGlobal("sessionStorage", session);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("writes and clears the runtime user info mirror", () => {
      writeRuntimeUserInfo(userPayload);
      expect(
        JSON.parse(local.getItem(RUNTIME_USER_INFO_STORAGE_KEY) ?? "null")
      ).toEqual(userPayload);

      writeRuntimeUserInfo(null);
      expect(local.getItem(RUNTIME_USER_INFO_STORAGE_KEY)).toBeNull();

      // undefined behaves like null (removes instead of storing "undefined")
      writeRuntimeUserInfo(undefined);
      expect(local.getItem(RUNTIME_USER_INFO_STORAGE_KEY)).toBeNull();
    });

    it("clears the session token mirror on logout cleanup", () => {
      session.setItem(SESSION_MIRROR_STORAGE_KEY, "app_session_id=abc; Path=/");
      clearSessionTokenMirror();
      expect(session.getItem(SESSION_MIRROR_STORAGE_KEY)).toBeNull();
    });

    it("swallows serialization failures (circular payload)", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(() => writeRuntimeUserInfo(circular)).not.toThrow();
      expect(local.getItem(RUNTIME_USER_INFO_STORAGE_KEY)).toBeNull();
    });

    it("swallows throwing storages (quota / private mode)", () => {
      const throwing = {
        setItem: () => {
          throw new DOMException("QuotaExceededError");
        },
        removeItem: () => {
          throw new Error("denied");
        },
      };
      vi.stubGlobal("localStorage", throwing);
      expect(() => writeRuntimeUserInfo(userPayload)).not.toThrow();
      expect(() => writeRuntimeUserInfo(null)).not.toThrow();
    });
  });
});

describe("sanitizeRedirectPath", () => {
  it.each([
    ["/app", "/app"],
    ["/app?tab=settings", "/app?tab=settings"],
    ["/accounting/invoices/42", "/accounting/invoices/42"],
  ])("accepts safe same-origin path %s", (input, expected) => {
    expect(sanitizeRedirectPath(input)).toBe(expected);
  });

  it.each([
    "https://malicious.example",
    "//malicious.example",
    "/\\malicious.example",
    "javascript:alert(1)",
    "data:text/html,<script>",
    "",
    "relative-path",
  ])("rejects unsafe redirect %s", input => {
    expect(sanitizeRedirectPath(input)).toBeNull();
  });

  it("rejects control-character smuggling", () => {
    expect(sanitizeRedirectPath("/app\u0000https://evil.example")).toBeNull();
  });
});
