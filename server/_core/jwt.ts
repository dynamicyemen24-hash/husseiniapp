/**
 * JWT ES256 — Enterprise-grade JWT with ECDSA P-256 signing.
 *
 * Upgrades from HS256 (symmetric) to ES256 (asymmetric ECDSA):
 * - Private key signs, public key verifies (no shared secret exposure)
 * - P-256 curve (NIST-approved, FIPS 140-2 compliant)
 * - Key rotation support with JWKS endpoint
 * - Token binding with device fingerprint
 *
 * Key persistence (fixed): the key pair is no longer generated fresh on
 * every process boot. Resolution order:
 *   1. `JWT_PRIVATE_KEY` + `JWT_PUBLIC_KEY` env (PEM, `\n`-escapes accepted)
 *   2. `.keys/jwt-keys.json` on disk (auto-saved on first generate)
 *   3. In-memory fallback (warns; zero-storage serverless like Vercel Edge)
 *
 * Standards: RFC 7518 (JWA), RFC 7519 (JWT), FIPS 140-2,
 * NIST SP 800-57 (key management).
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import {
  generateKeyPairSync,
  createHash,
  createPublicKey,
  createPrivateKey,
} from "crypto";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";

// ─── Types ──────────────────────────────────────────────────────────
export interface JwtPayload extends JWTPayload {
  sub: string; // OpenID / user identifier
  tenantId?: number; // Multi-tenant scope
  role?: string; // User role
  sessionId?: string; // Session identifier
  deviceFp?: string; // Device fingerprint hash
  jti?: string; // Unique token ID
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

/**
 * Explicit token request — intentionally NOT `Omit<JwtPayload, ...>`.
 * `JWTPayload` carries `[propName: string]: unknown`, and `Omit` over an
 * indexed type widens every named prop (incl. `sub`) to `unknown`.
 */
export interface TokenRequest {
  sub: string;
  tenantId?: number;
  role?: string;
  sessionId?: string;
  deviceFp?: string;
}

export interface KeySet {
  publicKey: string;
  privateKey: string;
  kid: string; // Key ID for rotation
  createdAt: number;
  algorithm: "ES256";
}

// ─── Key Management ─────────────────────────────────────────────────
let currentKeySet: KeySet | null = null;
let previousKeySet: KeySet | null = null; // For graceful rotation

const KEY_FILE = process.env.JWT_KEY_FILE
  ? path.resolve(process.env.JWT_KEY_FILE)
  : path.join(process.cwd(), ".keys", "jwt-keys.json");

function keySetFromPem(publicKey: string, privateKey: string): KeySet {
  const kid = createHash("sha256")
    .update(publicKey)
    .digest("hex")
    .substring(0, 16);
  return {
    publicKey,
    privateKey,
    kid,
    createdAt: Date.now(),
    algorithm: "ES256",
  };
}

function normalizePem(value: string): string {
  // Env vars written as a single quoted line often embed literal "\n".
  return value.replaceAll("\\n", "\n");
}

/**
 * Generate a new ES256 key pair.
 */
export function generateKeyPair(): KeySet {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return keySetFromPem(publicKey, privateKey);
}

function loadKeyPairFromEnv(): KeySet | null {
  const privateKey = process.env.JWT_PRIVATE_KEY;
  const publicKey = process.env.JWT_PUBLIC_KEY;
  if (!privateKey || !publicKey) return null;
  return keySetFromPem(normalizePem(publicKey), normalizePem(privateKey));
}

function loadKeyPairFromDisk(): KeySet | null {
  try {
    if (!fs.existsSync(KEY_FILE)) return null;
    const parsed = JSON.parse(fs.readFileSync(KEY_FILE, "utf8")) as {
      publicKey?: string;
      privateKey?: string;
      previous?: { publicKey?: string; privateKey?: string } | null;
    };
    if (!parsed.publicKey || !parsed.privateKey) return null;
    if (
      parsed.previous &&
      parsed.previous.publicKey &&
      parsed.previous.privateKey
    ) {
      previousKeySet = keySetFromPem(
        parsed.previous.publicKey,
        parsed.previous.privateKey
      );
    } else {
      previousKeySet = null;
    }
    return keySetFromPem(parsed.publicKey, parsed.privateKey);
  } catch {
    return null;
  }
}

function saveKeyPairToDisk(
  keySet: KeySet,
  previous: KeySet | null = null
): void {
  try {
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
    fs.writeFileSync(
      KEY_FILE,
      JSON.stringify(
        {
          publicKey: keySet.publicKey,
          privateKey: keySet.privateKey,
          previous: previous
            ? {
                publicKey: previous.publicKey,
                privateKey: previous.privateKey,
              }
            : null,
        },
        null,
        2
      ),
      { mode: 0o600 }
    );
  } catch {
    // Read-only/ephemeral filesystem (e.g. serverless) — keys remain
    // in-memory for the lifetime of this process. Prefer env-var keys there.
    if (process.env.JWT_KEY_FILE) {
      console.warn(
        "[jwt] Could not persist key file — set JWT_PRIVATE_KEY/JWT_PUBLIC_KEY env vars for durable keys."
      );
    }
  }
}

/**
 * Get or generate the current key set (env → disk → in-memory).
 */
export function getCurrentKeySet(): KeySet {
  if (!currentKeySet) {
    currentKeySet = loadKeyPairFromEnv() ?? loadKeyPairFromDisk();
    if (!currentKeySet) {
      currentKeySet = generateKeyPair();
      saveKeyPairToDisk(currentKeySet);
    }
  }
  return currentKeySet;
}

/**
 * Get the previous key set (for verification during rotation).
 */
export function getPreviousKeySet(): KeySet | null {
  return previousKeySet;
}

/**
 * Rotate keys — move current to previous, generate new.
 * Both key sets are persisted so the previous key survives process restarts
 * (serverless cold starts) and sessions signed before the rotation stay
 * verifiable for the full 30-day lifetime.
 */
export function rotateKeys(): KeySet {
  if (currentKeySet) {
    previousKeySet = currentKeySet;
  }
  currentKeySet = generateKeyPair();
  saveKeyPairToDisk(currentKeySet, previousKeySet);
  return currentKeySet;
}

// ─── Token Generation ───────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "30d";

/**
 * Generate an access + refresh token pair.
 */
export async function generateTokenPair(
  payload: TokenRequest
): Promise<TokenPair> {
  const keySet = getCurrentKeySet();
  const privateKey = await importPrivateKey(keySet.privateKey);

  const accessTokenExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  const refreshTokenExpiry = Math.floor(Date.now() / 1000) + 30 * 24 * 3600; // 30 days

  const accessToken = await new SignJWT({
    ...payload,
    jti: randomBytes(16).toString("hex"),
  } as JwtPayload)
    .setProtectedHeader({ alg: "ES256", kid: keySet.kid })
    .setIssuedAt()
    .setIssuer("alhusainia-platform")
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setSubject(payload.sub)
    .sign(privateKey);

  const refreshToken = await new SignJWT({
    sub: payload.sub,
    tenantId: payload.tenantId,
    sessionId: payload.sessionId,
  } as JwtPayload)
    .setProtectedHeader({ alg: "ES256", kid: keySet.kid })
    .setIssuedAt()
    .setIssuer("alhusainia-platform")
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setSubject(payload.sub)
    .sign(privateKey);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiry,
    refreshTokenExpiry,
  };
}

/**
 * Verify and decode a JWT token.
 * Supports key rotation — tries current key first, then previous.
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const keySet = getCurrentKeySet();
  const publicKey = await importPublicKey(keySet.publicKey);

  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "alhusainia-platform",
      algorithms: ["ES256"],
    });
    return payload as JwtPayload;
  } catch (error) {
    // Try previous key set (during rotation)
    if (previousKeySet) {
      try {
        const prevPublicKey = await importPublicKey(previousKeySet.publicKey);
        const { payload } = await jwtVerify(token, prevPublicKey, {
          issuer: "alhusainia-platform",
          algorithms: ["ES256"],
        });
        return payload as JwtPayload;
      } catch {
        // Fall through to original error
      }
    }
    throw error;
  }
}

/**
 * Decode token without verification (for inspection only).
 */
export function decodeTokenUnsafe(token: string): JwtPayload | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Device Fingerprinting ──────────────────────────────────────────
/**
 * Generate a device fingerprint hash from request attributes.
 */
export function generateDeviceFingerprint(
  userAgent: string,
  acceptLanguage: string,
  ip: string
): string {
  const raw = `${userAgent}|${acceptLanguage}|${ip}`;
  return createHash("sha256").update(raw).digest("hex").substring(0, 32);
}

// ─── Helpers ────────────────────────────────────────────────────────
// Note: WebCrypto `importKey` expects DER/JWK binary formats, NOT PEM text.
// Node's crypto.KeyObject -> JWK bridge keeps the PEM → JWK conversion
// standard-compliant (PKCS8/SPKI ASN.1), matching what jose expects.

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const jwk = createPrivateKey(pem).export({ format: "jwk" });
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const jwk = createPublicKey(pem).export({ format: "jwk" });
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}

interface JwkEntry {
  kty: string;
  crv: string;
  x: string;
  y: string;
  kid: string;
  use: string;
}

/**
 * Convert PEM to JWKS format for public distribution.
 * Coordinates (x, y) are derived from the actual public key — previously
 * this returned empty placeholders, making the JWKS unusable.
 * Includes the previous key (during the rotation grace window) so verifiers
 * can still validate tokens signed with the key that just rotated out.
 */
export function getJwks(): { keys: JwkEntry[] } {
  const entries = [
    getCurrentKeySet(),
    ...(getPreviousKeySet() ? [getPreviousKeySet() as KeySet] : []),
  ];
  const keys = new Map<string, JwkEntry>();
  for (const keySet of entries) {
    if (keys.has(keySet.kid)) continue;
    let x = "";
    let y = "";
    try {
      const jwk = createPublicKey(keySet.publicKey).export({
        format: "jwk",
      }) as { x?: string; y?: string };
      x = jwk.x ?? "";
      y = jwk.y ?? "";
    } catch {
      // Coordinates stay empty only if PEM parsing itself failed.
    }
    keys.set(keySet.kid, {
      kty: "EC",
      crv: "P-256",
      x,
      y,
      kid: keySet.kid,
      use: "sig",
    });
  }
  return { keys: [...keys.values()] };
}

// ─── Session Tokens (cookie / Bearer) ───────────────────────────────
/**
 * Production session signing for `app_session_id`.
 *
 * The runtime auth path (`server/_core/sdk.ts`) signs and verifies browser
 * sessions with ES256 through this module instead of the legacy HS256
 * approach. Keeps every claim (`openId`/`appId`/`name`) the SDK and any
 * external consumer expects, adds `sessionId` + `jti` (audit/trace) and an
 * optional `deviceFp` for opt-in device binding.
 */
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_TOKEN_ISSUER = "alhusainia-platform";

export interface SessionTokenRequest {
  openId: string;
  appId: string;
  name?: string;
  tenantId?: number;
  role?: string;
  sessionId?: string;
  deviceFp?: string;
}

export interface SessionTokenClaims {
  openId: string;
  appId: string;
  name: string;
  tenantId: number | null;
  role: string | null;
  sessionId: string | null;
  deviceFp: string | null;
  jti: string | null;
  iat: number;
  exp: number;
}

export async function signSessionToken(
  body: SessionTokenRequest,
  expiresInMs: number = SESSION_EXPIRY_MS
): Promise<string> {
  const keySet = getCurrentKeySet();
  const privateKey = await importPrivateKey(keySet.privateKey);
  const nowSeconds = Math.floor(Date.now() / 1000);

  return new SignJWT({
    openId: body.openId,
    appId: body.appId,
    name: body.name ?? "",
    tenantId: body.tenantId,
    role: body.role,
    sessionId: body.sessionId,
    deviceFp: body.deviceFp,
    jti: randomBytes(16).toString("hex"),
    sub: body.openId,
  } as JwtPayload)
    .setProtectedHeader({ alg: "ES256", kid: keySet.kid })
    .setIssuedAt(nowSeconds)
    .setIssuer(SESSION_TOKEN_ISSUER)
    .setSubject(body.openId)
    .setExpirationTime(nowSeconds + Math.floor(expiresInMs / 1000))
    .sign(privateKey);
}

/**
 * Verify a session token (ES256, rotation-aware). Returns `null` on any
 * failure so callers can decide a fallback path (e.g. legacy HS256).
 */
export async function verifySessionToken(
  token: string
): Promise<SessionTokenClaims | null> {
  try {
    return sessionClaimsFromPayload(await verifyToken(token));
  } catch {
    return null;
  }
}

function sessionClaimsFromPayload(
  payload: JwtPayload
): SessionTokenClaims | null {
  // Only genuine session tokens carry `openId`; access/refresh pairs do not,
  // so we reject them here instead of falling back to `sub`.
  const openId =
    typeof payload.openId === "string" && payload.openId.length > 0
      ? payload.openId
      : null;
  if (!openId) return null;
  return {
    openId,
    appId: typeof payload.appId === "string" ? payload.appId : "",
    name: typeof payload.name === "string" ? payload.name : "",
    tenantId: typeof payload.tenantId === "number" ? payload.tenantId : null,
    role: typeof payload.role === "string" ? payload.role : null,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : null,
    deviceFp: typeof payload.deviceFp === "string" ? payload.deviceFp : null,
    jti: typeof payload.jti === "string" ? payload.jti : null,
    iat:
      typeof payload.iat === "number"
        ? payload.iat
        : Math.floor(Date.now() / 1000),
    exp: typeof payload.exp === "number" ? payload.exp : 0,
  };
}
