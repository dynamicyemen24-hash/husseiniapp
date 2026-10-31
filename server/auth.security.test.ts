/**
 * اختبارات أمان مسار تسجيل المشترك (Subscriber Registration & Auth Journey)
 * تغطي: auth.ownerLogin, auth.login, auth.register, auth.logout, auth.me
 * تستخدم محاكاة (mock) للقاعدة البيانات، Geo-IP، JWT، والبيئة.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbExecute = vi.fn();
const mockDb = {
  select: mockDbSelect,
  insert: mockDbInsert,
  update: mockDbUpdate,
  execute: mockDbExecute,
};

function mockSelectChain(rows: any[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: any) => Promise.resolve(rows).then(resolve),
  };
  mockDbSelect.mockReturnValue(chain);
  return chain;
}

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(mockDb),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./_core/systemRouter", async importOriginal => {
  const actual = await importOriginal<typeof import("./_core/systemRouter")>();
  return {
    ...actual,
    applyAuthSchema: vi.fn().mockResolvedValue(undefined),
    provisionGenericTenant: vi.fn().mockResolvedValue(999),
  };
});
vi.mock("./_core/geo", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  geolocate: vi.fn().mockResolvedValue({
    country: "اليمن",
    city: "صنعاء",
    lat: 15.3547,
    lng: 44.2056,
  }),
  parseDevice: vi.fn().mockReturnValue("حاسوب — متصفح"),
}));
vi.mock("./_core/sdk", () => ({
  sdk: { createSessionToken: vi.fn().mockResolvedValue("mocked-jwt-token") },
}));
vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "dev-owner-001",
    ownerPassword: "pQnrmT8NL3o0cKDtsy9S",
    cookieSecret: "test-secret",
    databaseUrl: "postgresql://test",
    oAuthServerUrl: "http://localhost:4000",
    appId: "test-app",
    isProduction: false,
  },
}));
vi.mock("./_core/jwt", () => ({
  rotateKeys: vi.fn(() => ({
    kid: "rotated-kid-001",
    publicKey: "pk",
    privateKey: "sk",
  })),
  getJwks: vi.fn(() => ({
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        x: "xx",
        y: "yy",
        kid: "rotated-kid-001",
        use: "sig",
      },
    ],
  })),
}));

import { hashPassword } from "./_core/password";
import { appRouter } from "./routers";
import { getClientIp, geolocate, parseDevice } from "./_core/geo";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { provisionGenericTenant } from "./_core/systemRouter";
import { rotateKeys, getJwks } from "./_core/jwt";

function createCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    tenantId: null,
    isSuperAdmin: false,
    req: {
      protocol: "https",
      headers: { "user-agent": "Mozilla/5.0 TestBrowser/1.0" },
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function createAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-open-id",
    tenantId: 1,
    name: "Test User",
    email: "test@example.com",
    loginMethod: "local",
    username: "testuser",
    passwordHash: null,
    role: "admin" as const,
    themePreference: "dark",
    emailNotifications: true,
    whatsappNotifications: true,
    compactMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    currentSessionId: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    passwordChangedAt: new Date(),
    mfaEnabled: false,
    mfaSecret: null,
    ...overrides,
  };
}

// ── auth.ownerLogin ───────────────────────────────────
describe("auth.ownerLogin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs in the platform owner with correct password and sets session cookie", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.ownerLogin({
      password: ENV.ownerPassword!,
    });
    expect(result).toEqual({ success: true });
    expect(ctx.res.cookie).toHaveBeenCalledTimes(1);
    expect(sdk.createSessionToken).toHaveBeenCalledWith(ENV.ownerOpenId, {
      name: "Owner",
    });
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      "app_session_id",
      "mocked-jwt-token",
      expect.objectContaining({ maxAge: expect.any(Number) })
    );
  });

  it("throws FORBIDDEN when ownerPassword env is not configured", async () => {
    const original = ENV.ownerPassword;
    ENV.ownerPassword = "";
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.ownerLogin({ password: "anything" })
    ).rejects.toThrow(TRPCError);
    ENV.ownerPassword = original;
  });

  it("throws UNAUTHORIZED on wrong password", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.ownerLogin({ password: "wrongPassword" })
    ).rejects.toThrow(TRPCError);
  });

  it("rejects empty password via Zod validation", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.auth.ownerLogin({ password: "" })).rejects.toThrow();
  });
});

// ── auth.rotateSessionKeys (ES256 key rotation) ────────
describe("auth.rotateSessionKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rotates keys for the platform owner and returns kid + jwks", async () => {
    const owner = createAuthUser({ openId: ENV.ownerOpenId });
    const ctx = createCtx({ user: owner, tenantId: null });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.rotateSessionKeys();
    expect(result.kid).toBe("rotated-kid-001");
    expect(result.jwks.keys[0]).toMatchObject({
      kid: "rotated-kid-001",
      kty: "EC",
      crv: "P-256",
      use: "sig",
    });
    expect(rotateKeys).toHaveBeenCalledTimes(1);
    expect(getJwks).toHaveBeenCalledTimes(1);
  });

  it("rejects a logged-in non-owner (least privilege)", async () => {
    const ctx = createCtx({
      user: createAuthUser({ openId: "regular-admin" }),
      tenantId: 2,
    });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.rotateSessionKeys()).rejects.toThrow(TRPCError);
    expect(rotateKeys).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.auth.rotateSessionKeys()).rejects.toThrow(TRPCError);
    expect(rotateKeys).not.toHaveBeenCalled();
  });
});

// ── auth.login (local subscriber) ─────────────────────
describe("auth.login (local subscriber)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });
  });

  it("successfully logs in with correct credentials", async () => {
    const password = "subscriberPass123";
    const user = createAuthUser({
      username: "subscriber_a",
      passwordHash: await hashPassword(password),
      openId: "local:subscriber_a",
      loginMethod: "local",
      role: "admin",
    });
    mockSelectChain([user]);
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      username: "subscriber_a",
      password,
    });
    expect(result.ok).toBe(true);
    expect(result.user.id).toBe(user.id);
    expect(result.user.name).toBe(user.name);
    expect(result.user.tenantId).toBe(user.tenantId);
    expect(result.user.role).toBe(user.role);
    expect(ctx.res.cookie).toHaveBeenCalledTimes(1);
    expect(sdk.createSessionToken).toHaveBeenCalledWith(user.openId, {
      name: user.name || user.username,
    });
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("throws NOT_FOUND for unknown username", async () => {
    mockSelectChain([]);
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.login({ username: "nonexistent", password: "whatever" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws UNAUTHORIZED on wrong password", async () => {
    const user = createAuthUser({
      username: "good_user",
      passwordHash: await hashPassword("realpassword"),
      openId: "local:good_user",
    });
    mockSelectChain([user]);
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.login({ username: "good_user", password: "wrongpassword" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws FORBIDDEN (LOCKED) after 5 failed attempts within 15 min", async () => {
    const user = createAuthUser({
      username: "locked_user",
      passwordHash: await hashPassword("realpassword"),
      openId: "local:locked_user",
    });
    mockDbSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([user]),
    }));
    mockDbSelect.mockImplementationOnce(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 5 }]),
    }));
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }));
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.login({ username: "locked_user", password: "wrongpassword" })
    ).rejects.toThrow(/LOCKED/);
  });

  it("records login attempts with geo + device info on success", async () => {
    const password = "testPass123";
    const user = createAuthUser({
      username: "geo_test_user",
      passwordHash: await hashPassword(password),
      openId: "local:geo_test_user",
    });
    mockSelectChain([user]);
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.login({ username: "geo_test_user", password });
    expect(getClientIp).toHaveBeenCalled();
    expect(geolocate).toHaveBeenCalled();
    expect(parseDevice).toHaveBeenCalled();
  });
});

// ── auth.register (self-serve signup) ───────────────
describe("auth.register (self-serve subscriber signup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (provisionGenericTenant as any).mockResolvedValue(999);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });
  });

  it("creates a new tenant + admin user with hashed password and returns session", async () => {
    mockSelectChain([]);
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi
        .fn()
        .mockResolvedValue([
          createAuthUser({ openId: "local:newbiz", username: "newbiz" }),
        ]),
    });
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      name: "شركة جديدة",
      username: "newbiz",
      password: "securePass123",
      country: "اليمن",
      currency: "YER",
      email: "contact@newbiz.example",
      acceptTerms: true,
    });
    expect(result.ok).toBe(true);
    expect(result.tenantId).toBe(999);
    expect(provisionGenericTenant).toHaveBeenCalledWith(
      mockDb,
      expect.objectContaining({
        name: "شركة جديدة",
        code: expect.stringMatching(/^ORG-[A-Z0-9]+$/),
      })
    );
    expect(ctx.res.cookie).toHaveBeenCalledTimes(1);
    expect(sdk.createSessionToken).toHaveBeenCalled();
  });

  it("throws CONFLICT when username is already taken", async () => {
    mockSelectChain([createAuthUser({ username: "taken_name" })]);
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.register({
        name: "Biz",
        username: "taken_name",
        password: "password123",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("validates username format - rejects special characters", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.register({
        name: "Test",
        username: "user@invalid",
        password: "password123",
      })
    ).rejects.toThrow();
  });

  it("validates username minimum length (3 chars)", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.register({
        name: "Test",
        username: "ab",
        password: "password123",
      })
    ).rejects.toThrow();
  });

  it("validates password minimum length (8 chars)", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.register({
        name: "Test",
        username: "valid_user",
        password: "1234567",
      })
    ).rejects.toThrow();
  });

  it("validates name minimum length (2 chars)", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.auth.register({
        name: "X",
        username: "valid_user",
        password: "password123",
      })
    ).rejects.toThrow();
  });

  it("calls provisionGenericTenant on successful signup", async () => {
    mockSelectChain([]);
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        createAuthUser({
          openId: "local:newuser123",
          username: "newuser123",
        }),
      ]),
    });
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.register({
      name: "Test User",
      username: "newuser123",
      password: "password123",
      acceptTerms: true,
    });
    expect(provisionGenericTenant).toHaveBeenCalled();
  });
});

// ── auth.logout ────────────────────────────────────────
describe("auth.logout", () => {
  it("clears the session cookie with secure options", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalledTimes(1);
    expect(ctx.res.clearCookie).toHaveBeenCalledWith(
      "app_session_id",
      expect.objectContaining({
        maxAge: -1,
        secure: true,
        sameSite: "none",
        httpOnly: true,
        path: "/",
      })
    );
  });
});

// ── auth.me ────────────────────────────────────────────
describe("auth.me", () => {
  it("returns the current user from context with sensitive fields stripped", async () => {
    const user = createAuthUser();
    const caller = appRouter.createCaller(createCtx({ user }));
    const result = await caller.auth.me();
    // SECURITY (regression): auth.me must never leak credential or session
    // material — `passwordHash` and `currentSessionId` are explicitly
    // destructured out in the resolver. A re-introduction of the leak must
    // fail the test suite.
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("currentSessionId");
    // The returned object matches the input user minus the stripped fields.
    const { passwordHash, currentSessionId, ...safeUser } = user;
    void passwordHash;
    void currentSessionId;
    expect(result).toEqual(safeUser);
  });

  it("returns null when no user is authenticated", async () => {
    const caller = appRouter.createCaller(createCtx({ user: null }));
    expect(await caller.auth.me()).toBeNull();
  });
});
