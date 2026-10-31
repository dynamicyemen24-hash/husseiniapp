/**
 * Elias Pro — node token vault.
 * ============================================================
 * The EliasPro node agent authenticates the platform with a shared bearer
 * token. The platform must be able to call the node later (health checks,
 * engine runs, work-order sync), so the token has to be recoverable — a plain
 * hash is not enough.
 *
 * DESIGN
 *   • The token is encrypted at rest with AES-256-GCM using the server master
 *     key (same master key as encrypted backups / external AI config).
 *   • A SHA-256 fingerprint (`tokenHash`) is ALSO stored, so the platform can
 *     detect token rotation and can index/compare without decrypting.
 *   • The plaintext token NEVER leaves this module: it is never returned by
 *     any router, never logged, and never sent to the browser.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { ENV } from "../_core/env";

const PREFIX = "v1";

function masterKey(): Buffer {
  const master = ENV.backupEncryptionKey || ENV.cookieSecret || "";
  if (!master || master.length < 16) {
    throw new Error("مفتاح تشفير رموز العقدة غير مضبوط على الخادم");
  }
  return createHash("sha256").update(master).digest();
}

/** SHA-256 fingerprint of the token — safe to store and to compare. */
export function fingerprintToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Encrypts a node token for storage. Returns null for an empty token. */
export function encryptNodeToken(
  token: string | null | undefined
): string | null {
  if (!token) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [
    PREFIX,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/** Decrypts a stored token. Returns null when absent or undecryptable. */
export function decryptNodeToken(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  try {
    const parts = value.split(":");
    if (parts[0] !== PREFIX || !parts[1] || !parts[2] || !parts[3]) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      masterKey(),
      Buffer.from(parts[1], "base64")
    );
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(parts[3], "base64")),
      decipher.final(),
    ]).toString("utf8");
    return plain || null;
  } catch {
    return null;
  }
}
