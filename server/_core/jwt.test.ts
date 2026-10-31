/**
 * server/_core/jwt.test.ts
 * ------------------------
 * Unit tests for ES256 JWT signing, verification, key persistence and the
 * public JWKS endpoint payload. Each suite boots a fresh module instance so
 * in-memory key state never leaks between tests.
 */
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let keyFile: string;

const MODULE = "./jwt";
type JwtApi = typeof import("./jwt");

async function fresh(): Promise<JwtApi> {
  vi.resetModules();
  process.env.JWT_KEY_FILE = keyFile;
  return await import(MODULE);
}

function removeKeys() {
  try {
    fs.rmSync(keyFile, { force: true });
    fs.rmSync(path.dirname(keyFile), { recursive: true, force: true });
  } catch {
    /* noop */
  }
}

beforeAll(() => {
  keyFile = path.join(
    os.tmpdir(),
    `opencode-jwt-test-${process.pid}-${Math.random().toString(36).slice(2)}`,
    "jwt-keys.json"
  );
});

afterAll(() => {
  removeKeys();
  delete process.env.JWT_KEY_FILE;
});

describe("token lifecycle", () => {
  it("signs and verifies preserving sub, tenantId, role and sessionId", async () => {
    const { generateTokenPair, verifyToken, getJwks } = await fresh();
    const pair = await generateTokenPair({
      sub: "user-1",
      tenantId: 4,
      role: "admin",
      sessionId: "sess-1",
      deviceFp: "fp-abc",
    });

    expect(pair.accessToken.split(".")).toHaveLength(3);
    expect(pair.refreshToken.split(".")).toHaveLength(3);
    expect(pair.accessTokenExpiry).toBeGreaterThan(Date.now() / 1000);

    const decoded = await verifyToken(pair.accessToken);
    expect(decoded.sub).toBe("user-1");
    expect(decoded.tenantId).toBe(4);
    expect(decoded.role).toBe("admin");
    expect(decoded.sessionId).toBe("sess-1");

    // Access token has jti; refresh token omits role (narrower scope).
    const refresh = await verifyToken(pair.refreshToken);
    expect(refresh.role).toBeUndefined();

    // JWKS coordinates must be real, not empty placeholders.
    const k = getJwks().keys[0];
    expect(k.kty).toBe("EC");
    expect(k.crv).toBe("P-256");
    expect(k.use).toBe("sig");
    expect(k.x.length).toBeGreaterThanOrEqual(40);
    expect(k.y.length).toBeGreaterThanOrEqual(40);
    expect(k.kid).toBeTruthy();
  });

  it("rejects a tampered token", async () => {
    const { generateTokenPair, verifyToken } = await fresh();
    const pair = await generateTokenPair({ sub: "u", tenantId: 1 });
    const [h, p, s] = pair.accessToken.split(".");
    const tampered = `${h}.${p}.${s}AA`; // corrupt signature
    await expect(verifyToken(tampered)).rejects.toThrow();
  });

  it("verifies tokens signed by the previous key during rotation", async () => {
    const { generateTokenPair, verifyToken, rotateKeys } = await fresh();
    const before = await generateTokenPair({ sub: "u", tenantId: 1 });
    rotateKeys();
    const after = await generateTokenPair({ sub: "u", tenantId: 1 });

    await expect(verifyToken(before.accessToken)).resolves.toMatchObject({
      sub: "u",
    });
    await expect(verifyToken(after.accessToken)).resolves.toMatchObject({
      sub: "u",
    });
  });

  it("advertises both current and previous keys in JWKS during rotation", async () => {
    removeKeys();
    const { getJwks, rotateKeys, getCurrentKeySet, getPreviousKeySet } =
      await fresh();
    const before = getJwks();
    expect(before.keys).toHaveLength(1);

    rotateKeys();
    const after = getJwks();
    expect(after.keys).toHaveLength(2);
    const kids = after.keys.map(k => k.kid).sort();
    expect(kids).toEqual(
      [getCurrentKeySet().kid, getPreviousKeySet()!.kid].sort()
    );
    expect(after.keys.every(k => k.kty === "EC" && k.crv === "P-256")).toBe(
      true
    );
    expect(after.keys.every(k => k.x.length >= 40 && k.y.length >= 40)).toBe(
      true
    );
  });
});

describe("key persistence", () => {
  it("persists generated keys and reloads the same kid", async () => {
    removeKeys();
    const first = await fresh();
    const ks = first.getCurrentKeySet();
    expect(fs.existsSync(keyFile)).toBe(true);

    vi.resetModules();
    const second = await import(MODULE);
    expect(second.getCurrentKeySet().kid).toBe(ks.kid);
    expect(second.getCurrentKeySet().publicKey).toBe(ks.publicKey);
  });

  it("survives rotation across a module reload (serverless cold start)", async () => {
    removeKeys();
    const first = await fresh();
    const preToken = await first.signSessionToken({
      openId: "open-pre",
      appId: "app-x",
      sessionId: "stable-session",
    });
    const rotated = first.rotateKeys();
    expect(first.getPreviousKeySet()?.kid).not.toBe(rotated.kid);

    // Simulate a process restart: fresh module state loading from disk.
    vi.resetModules();
    process.env.JWT_KEY_FILE = keyFile;
    const restarted = await import(MODULE);
    expect(restarted.getCurrentKeySet().kid).toBe(rotated.kid);
    expect(restarted.getPreviousKeySet()?.kid).not.toBeNull();

    // A session minted BEFORE the rotation is still verifiable.
    await expect(restarted.verifySessionToken(preToken)).resolves.toMatchObject(
      {
        openId: "open-pre",
        sessionId: "stable-session",
      }
    );

    // And the previous key is advertised in JWKS even after the restart.
    expect(restarted.getJwks().keys.map(k => k.kid)).toContain(
      restarted.getPreviousKeySet()!.kid
    );
  });

  it("prefers env-var keys over the on-disk file", async () => {
    removeKeys();
    const first = await fresh();
    const diskKs = first.getCurrentKeySet();
    expect(fs.existsSync(keyFile)).toBe(true);

    vi.resetModules();
    const { generateKeyPair } = await import(MODULE);
    const envKs = generateKeyPair();
    process.env.JWT_PRIVATE_KEY = envKs.privateKey.replaceAll("\n", "\\n");
    process.env.JWT_PUBLIC_KEY = envKs.publicKey.replaceAll("\n", "\\n");

    const instance = await import(MODULE);
    expect(instance.getCurrentKeySet().kid).toBe(envKs.kid);
    expect(instance.getCurrentKeySet().kid).not.toBe(diskKs.kid);

    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
  });
});

describe("device fingerprint", () => {
  it("is a deterministic 32-hex hash", async () => {
    const { generateDeviceFingerprint } = await fresh();
    const a = generateDeviceFingerprint("UA", "ar-YE", "1.2.3.4");
    const b = generateDeviceFingerprint("UA", "ar-YE", "1.2.3.4");
    const c = generateDeviceFingerprint("UA", "ar-YE", "9.9.9.9");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("session tokens", () => {
  it("signs and verifies a session with openId, tenantId, role and sessionId", async () => {
    const { signSessionToken, verifySessionToken } = await fresh();
    const token = await signSessionToken({
      openId: "open-1",
      appId: "app-x",
      name: "Tester",
      tenantId: 7,
      role: "admin",
      sessionId: "sess-9",
    });

    expect(token.split(".")).toHaveLength(3);
    const session = await verifySessionToken(token);
    expect(session).not.toBeNull();
    expect(session?.openId).toBe("open-1");
    expect(session?.appId).toBe("app-x");
    expect(session?.name).toBe("Tester");
    expect(session?.tenantId).toBe(7);
    expect(session?.role).toBe("admin");
    expect(session?.sessionId).toBe("sess-9");
    expect(session?.exp).toBeGreaterThan(0);
  });

  it("returns null for a tampered or foreign-signed token", async () => {
    const { signSessionToken, verifySessionToken } = await fresh();
    const token = await signSessionToken({ openId: "open-2", appId: "app-x" });
    const [h, p, s] = token.split(".");
    const tampered = `${h}.${p}.${s}AC`;
    await expect(verifySessionToken(tampered)).resolves.toBeNull();

    // Wrong audience: a token built for another issuer must not verify.
    const { generateTokenPair } = await fresh();
    const pair = await generateTokenPair({ sub: "open-2", tenantId: 1 });
    await expect(verifySessionToken(pair.accessToken)).resolves.toBeNull();
  });

  it("survives a key rotation (previous key still verifies sessions)", async () => {
    const { signSessionToken, verifySessionToken, rotateKeys } = await fresh();
    const pre = await signSessionToken({
      openId: "open-3",
      appId: "app-x",
      sessionId: "stable",
    });
    rotateKeys();
    const post = await signSessionToken({
      openId: "open-4",
      appId: "app-x",
      sessionId: "rotated",
    });

    await expect(verifySessionToken(pre)).resolves.toMatchObject({
      openId: "open-3",
      sessionId: "stable",
    });
    await expect(verifySessionToken(post)).resolves.toMatchObject({
      openId: "open-4",
      sessionId: "rotated",
    });
  });
});
