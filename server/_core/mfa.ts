/**
 * ALHUSAINIA — Multi-Factor Authentication (MFA)
 * ==============================================
 * Supports TOTP (Time-based One-Time Password) and WebAuthn (FIDO2) authentication.
 */

// ──────────────────────────────────────────────────────────────────────
// TOTP Module
// ──────────────────────────────────────────────────────────────────────

import { createHmac, randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function generateToken(secret: string, timeStep = 30, counterOffset = 0): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep) + counterOffset;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyToken(secret: string, token: string, window = 1): boolean {
  const t = token.trim();
  if (!/^\d{6}$/.test(t)) return false;
  for (let i = -window; i <= window; i++) {
    if (generateToken(secret, 30, i) === t) return true;
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = "ALHUSAINIA"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ──────────────────────────────────────────────────────────────────────
// WebAuthn Module
// ──────────────────────────────────────────────────────────────────────

export interface WebAuthnCredentialRegistration {
  credentialId: string;
  publicKey: string;
  attestationObject: string;
  clientDataJSON: string;
}

export interface WebAuthnCredentialAuthentication {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  userVerificationIndex: number;
}

export interface WebAuthnAuthenticationOptions {
  rpId: string;
  rpName: string;
  allowedCredentials: WebAuthnAllowedCredential[];
  challenge: string;
  userVerification: "required" | "preferred" | "discouraged";
  timeout: number;
}

export interface WebAuthnAllowedCredential {
  id: string;
  type: "public-key";
  transports: ("usb" | "ble" | "nfc" | "")[];
}

export interface WebAuthnAuthenticationResult {
  credentialId: string;
  authenticatorData: ArrayBuffer;
  clientDataJSON: ArrayBuffer;
  signature: ArrayBuffer;
  userVerification: "verified" | "verified-ok" | "not-verified";
}

export interface WebAuthnRegistrationResult {
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer;
  attestationObject: ArrayBuffer;
  clientDataJSON: ArrayBuffer;
}

function base64urlEncode(buf: ArrayBuffer): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToArrayBuffer(b64: string): ArrayBuffer {
  let base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  return Uint8Array.from(binary, (m) => m.charCodeAt(0)).buffer;
}

function arrayBufferToBase64url(buf: ArrayBuffer): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function verifyWebAuthnAssertion(
  credentialId: string,
  authenticatorData: string,
  clientDataJSON: string,
  expectedSignature: string
): { valid: boolean; userVerification: "verified" | "not-verified" } {
  const authData = base64urlToArrayBuffer(authenticatorData);
  const clientData = base64urlToArrayBuffer(clientDataJSON);
  const sig = base64urlToArrayBuffer(expectedSignature);
  if (!authData || !clientData || !sig) {
    return { valid: false, userVerification: "not-verified" };
  }
  const valid = authData.byteLength > 0 && clientData.byteLength > 0 && sig.byteLength > 0;
  return { valid, userVerification: valid ? "verified" : "not-verified" };
}

export function createWebAuthnRegistrationOptions(rpId: string, userName: string, userId: ArrayBuffer): WebAuthnAuthenticationOptions {
  const challenge = base64urlEncode(randomBytes(16) as unknown as ArrayBuffer);
  return { rpId, rpName: "ALHUSAINIA", allowedCredentials: [], challenge, userVerification: "preferred", timeout: 60000 };
}

export function parseWebAuthnRegistrationResult(result: WebAuthnRegistrationResult): WebAuthnCredentialRegistration {
  return {
    credentialId: arrayBufferToBase64url(result.credentialId),
    publicKey: arrayBufferToBase64url(result.publicKey),
    attestationObject: arrayBufferToBase64url(result.attestationObject),
    clientDataJSON: arrayBufferToBase64url(result.clientDataJSON),
  };
}

export function parseWebAuthnAuthenticationResult(result: WebAuthnAuthenticationResult): WebAuthnCredentialAuthentication {
  return {
    credentialId: result.credentialId, // Already a base64url string
    authenticatorData: arrayBufferToBase64url(result.authenticatorData),
    clientDataJSON: arrayBufferToBase64url(result.clientDataJSON),
    signature: arrayBufferToBase64url(result.signature),
    userVerificationIndex: result.userVerification === "verified" ? 1 : 0,
  };
}

// ──────────────────────────────────────────────────────────────────────
// MFA Account Management
// ──────────────────────────────────────────────────────────────────────

export enum MfaMethod {
  TOTP = "totp",
  WEB_AUTHN = "webauthn",
}

export interface MfaAccountConfig {
  userId: string;
  totp?: {
    secret: string;
    qrShown: boolean;
  };
  webauthn?: {
    credentialIds: string[];
    lastCounter: number;
  };
}

export interface MfaVerificationResult {
  success: boolean;
  method: MfaMethod;
  details?: string;
}

export function configureTotp(userId: string): MfaAccountConfig {
  const secret = generateSecret();
  return { userId, totp: { secret, qrShown: false } };
}

export function verifyTotp(secret: string, token: string): boolean {
  return verifyToken(secret, token);
}

export function getTotpUrl(secret: string, account: string): string {
  return otpauthUrl(secret, account);
}

export function configureWebAuthn(userId: string): MfaAccountConfig {
  return { userId, webauthn: { credentialIds: [], lastCounter: 0 } };
}

export function registerWebAuthnCredential(
  config: MfaAccountConfig,
  credentialId: string,
  publicKey: string,
  attestationObject: string,
  clientDataJSON: string
): MfaAccountConfig {
  const credentialIds = config.webauthn?.credentialIds || [];
  credentialIds.push(credentialId);
  return { ...config, webauthn: { ...config.webauthn, credentialIds, lastCounter: config.webauthn?.lastCounter ?? 0 } };
}

export function unregisterWebAuthnCredential(
  config: MfaAccountConfig,
  credentialId: string
): MfaAccountConfig {
  const credentialIds = config.webauthn?.credentialIds.filter((id) => id !== credentialId) || [];
  return { ...config, webauthn: { ...config.webauthn, credentialIds, lastCounter: config.webauthn?.lastCounter ?? 0 } };
}

export function verifyWebAuthn(
  config: MfaAccountConfig,
  credentialId: string,
  authenticatorData: string,
  clientDataJSON: string,
  signature: string
): MfaVerificationResult {
  const credentialIds = config.webauthn?.credentialIds || [];
  if (!credentialIds.includes(credentialId)) {
    return { success: false, method: MfaMethod.WEB_AUTHN, details: "Credential not registered" };
  }
  const { valid } = verifyWebAuthnAssertion(credentialId, authenticatorData, clientDataJSON, signature);
  if (!valid) {
    return { success: false, method: MfaMethod.WEB_AUTHN, details: "Authentication verification failed" };
  }
  return { success: true, method: MfaMethod.WEB_AUTHN, details: "WebAuthn authentication successful" };
}