import {
  AXIOS_TIMEOUT_MS,
  COOKIE_NAME,
  ONE_MONTH_MS,
  decodeOAuthState,
} from "../../shared/const";
import { ForbiddenError } from "../../shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { randomUUID } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { jwtVerify } from "jose";
import { type User, users, loginAttempts } from "../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import {
  generateDeviceFingerprint,
  signSessionToken,
  verifySessionToken,
} from "./jwt";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

/** What a verified session resolves to, regardless of the signing algorithm. */
export type SessionInfo = {
  openId: string;
  appId: string;
  name: string;
  tenantId: number | null;
  role: string | null;
  sessionId: string | null;
  deviceFp: string | null;
  iat: number;
  exp: number;
  /** true when the token is a pre-ES256 HS256 session (transition window). */
  legacy: boolean;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    return decodeOAuthState(state).redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    return signSessionToken(
      {
        openId: payload.openId,
        appId: payload.appId,
        name: payload.name,
        sessionId: randomUUID(),
      },
      options.expiresInMs
    );
  }

  /** Re-issue an existing (verified) session, preserving its identity. */
  private async reissueSession(session: SessionInfo): Promise<string> {
    return signSessionToken({
      openId: session.openId,
      appId: session.appId,
      name: session.name,
      tenantId: session.tenantId ?? undefined,
      role: session.role ?? undefined,
      sessionId: session.sessionId ?? randomUUID(),
      deviceFp: session.deviceFp ?? undefined,
    });
  }

  /** Stable device fingerprint for the request (used for optional binding). */
  private deviceFingerprintFor(req: Request): string {
    const ua =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : "";
    const lang =
      typeof req.headers["accept-language"] === "string"
        ? req.headers["accept-language"]
        : "";
    const ip = typeof req.ip === "string" && req.ip ? req.ip : "unknown";
    return generateDeviceFingerprint(ua, lang, ip);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionInfo | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    // Primary: ES256 sessions (rotation-aware, `kid`-based).
    const es = await verifySessionToken(cookieValue);
    if (es) {
      return {
        ...es,
        role: es.role,
        legacy: false,
      };
    }

    // Legacy fallback: pre-ES256 HS256 cookies + externally-issued cron
    // tokens, so we never force-logout sessions during the transition window.
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      // `openId` is the security-critical claim (the JWT is already signed
      // with JWT_SECRET). `appId`/`name` are contextual: local/self-hosted
      // deployments legitimately issue sessions with an empty appId (the
      // local `auth.login` flow does exactly that), so treating an empty
      // appId as "invalid session" would make every locally-issued session
      // unresolvable — login succeeds yet every protected screen rejects it.
      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing openId");
        return null;
      }

      return {
        openId,
        appId: isNonEmptyString(appId) ? appId : "",
        name: isNonEmptyString(name) ? name : "",
        tenantId: null,
        role: null,
        sessionId: null,
        deviceFp: null,
        iat: Math.floor(Date.now() / 1000),
        exp:
          typeof payload.exp === "number"
            ? payload.exp
            : Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        legacy: true,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async authenticateRequest(
    req: Request,
    res?: Response
  ): Promise<AuthenticatedUser> {
    // 1. Prefer the session cookie (regular OAuth login).
    const cookies = this.parseCookies(req.headers.cookie);
    const fromCookie = cookies.has(COOKIE_NAME);
    let sessionToken = cookies.get(COOKIE_NAME);

    // 2. Fallback to the Authorization header (Preview auto-login via
    //    sessionStorage), used when the browser blocks iframe cookies such as
    //    Safari ITP, private browsing, or iOS/Android WebView.
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    // ES256 sessions: bind the device fingerprint on first touch and re-issue
    // the cookie so subsequent requests carry it (needed for opt-in
    // `JWT_ENFORCE_DEVICE_BINDING`). Legacy HS256 sessions are untouched.
    if (!session.legacy) {
      const fingerprint = this.deviceFingerprintFor(req);

      if (
        ENV.enforceDeviceBinding &&
        session.deviceFp &&
        session.deviceFp !== fingerprint
      ) {
        console.warn("[Auth] Device fingerprint mismatch — rejecting session");
        throw ForbiddenError("Session device mismatch — please log in again");
      }

      if (fromCookie && res) {
        const renewForBinding = !session.deviceFp;
        const ageSec = Math.floor(Date.now() / 1000) - session.iat;
        const lifeSec = Math.max(1, session.exp - session.iat);
        const renewForAge = ageSec > lifeSec / 2;

        if (renewForBinding || renewForAge) {
          const boundSession = renewForBinding
            ? { ...session, deviceFp: fingerprint }
            : session;
          const token = await this.reissueSession(boundSession);
          const cookieOptions = getSessionCookieOptions(req);
          res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_MONTH_MS,
          });
        }
      }
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
      // Owner sessions are issued locally via `auth.ownerLogin` (no external
      // OAuth provider). Create the local admin user instead of syncing.
      if (sessionUserId === ENV.ownerOpenId) {
        await db.upsertUser({
          openId: ENV.ownerOpenId,
          name: "Owner",
          loginMethod: "owner",
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(ENV.ownerOpenId);
      } else {
        // Otherwise sync the user from the OAuth server automatically.
        try {
          const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: signedInAt,
          });
          user = await db.getUserByOpenId(userInfo.openId);
        } catch (error) {
          console.error("[Auth] Failed to sync user from OAuth:", error);
          throw ForbiddenError("Failed to sync user info");
        }
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    // PERFORMANCE: Only update lastSignedIn once per hour to avoid a DB write
    // on every authenticated request (critical for serverless cold starts).
    const lastSignIn = user.lastSignedIn;
    const shouldUpdateSignIn =
      !lastSignIn ||
      Date.now() - new Date(lastSignIn).getTime() > 60 * 60 * 1000;
    if (shouldUpdateSignIn) {
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: signedInAt,
      });
    }

    // Track session activity and enforce session limits
    const MAX_SESSIONS = 3;
    const now = new Date();

    // Update last activity timestamp
    await db.upsertUser({
      openId: user.openId,
      lastActivity: now,
    });

    // Check session count - need to get current count from user
    const database = await db.getDb();
    if (database) {
      const currentUser = await database
        .select()
        .from(users)
        .where(eq(users.openId, sessionUserId))
        .limit(1);
      const sessionUser = currentUser[0];
      const currentSessionCount = sessionUser?.sessionCount ?? 0;

      // If this is a new session (no currentSessionId or session changed), increment count
      const isNewSession =
        !sessionUser?.currentSessionId ||
        sessionUser.currentSessionId !== session.sessionId;

      if (isNewSession && currentSessionCount >= MAX_SESSIONS && sessionUser) {
        // Find oldest active session to revoke (loginAttempts as proxy for active sessions)
        const oldSessions = await database
          .select()
          .from(loginAttempts)
          .where(
            and(
              eq(loginAttempts.userId, sessionUser.id),
              gte(
                loginAttempts.createdAt,
                new Date(Date.now() - 24 * 60 * 60 * 1000)
              )
            )
          )
          .orderBy(loginAttempts.createdAt);

        if (oldSessions.length > 0) {
          // Revoke the oldest session by forcing password change
          await db.upsertUser({
            openId: user.openId,
            passwordChangedAt: new Date(),
          });
          console.warn("[Auth] Session limit exceeded, revoked oldest session");
        }
      }

      // Update session count
      await db.upsertUser({
        openId: user.openId,
        sessionCount: isNewSession
          ? currentSessionCount + 1
          : currentSessionCount,
        currentSessionId: session.sessionId,
      });
    }

    return user;
  }
}

const CRON_OPEN_ID_PREFIX = "cron_";

/** Result of `sdk.authenticateRequest`. Cron callbacks set `isCron=true` and `taskUid`; see `/home/ubuntu/skills/webdev-periodic-updates/SKILL.md`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildCronUser(
  userInfo: GetUserInfoWithJwtResponse
): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? undefined,
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new SDKServer();
