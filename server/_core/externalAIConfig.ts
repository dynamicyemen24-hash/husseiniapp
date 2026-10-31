import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ENV } from "./env";

export type ExternalAIConfig = {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const key = () => {
  const masterKey = ENV.backupEncryptionKey || ENV.cookieSecret;
  if (!masterKey || masterKey.length < 16)
    throw new Error("مفتاح تشفير الخادم غير مضبوط");
  return createHash("sha256").update(masterKey).digest();
};

export function encryptExternalAIConfig(config: ExternalAIConfig): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(config)),
    cipher.final(),
  ]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptExternalAIConfig(
  value?: string | null
): ExternalAIConfig | null {
  if (!value) return null;
  try {
    const [version, iv, tag, ciphertext] = value.split(":");
    if (version !== "v1" || !iv || !tag || !ciphertext) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    const raw = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.apiKey !== "string" ||
      typeof parsed.model !== "string" ||
      typeof parsed.baseUrl !== "string"
    )
      return null;
    return {
      enabled: parsed.enabled === true,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      apiKey: parsed.apiKey,
    };
  } catch {
    return null;
  }
}

export function safeExternalAIConfig(value?: string | null) {
  const config = decryptExternalAIConfig(value);
  return config
    ? {
        enabled: config.enabled,
        baseUrl: config.baseUrl,
        model: config.model,
        hasApiKey: !!config.apiKey,
      }
    : { enabled: false, baseUrl: "", model: "", hasApiKey: false };
}

export async function validateExternalAIEndpoint(
  baseUrl: string
): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("عنوان المزود غير صالح");
  }
  if (parsed.protocol !== "https:")
    throw new Error("يجب أن يستخدم عنوان المزود HTTPS");
  const host = parsed.hostname.toLowerCase();
  const addressHost = host.replace(/^\[|\]$/g, "");
  const isPrivateAddress = (address: string) => {
    const value = address.toLowerCase();
    return (
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe80:") ||
      /^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(
        value
      ) ||
      value === "0.0.0.0"
    );
  };
  if (
    addressHost === "localhost" ||
    addressHost.endsWith(".localhost") ||
    addressHost.endsWith(".local") ||
    isPrivateAddress(addressHost)
  ) {
    throw new Error("عنوان المزود لا يمكن أن يشير إلى شبكة محلية");
  }
  if (!isIP(addressHost)) {
    try {
      const resolved = await lookup(addressHost, { all: true });
      if (resolved.some(item => isPrivateAddress(item.address)))
        throw new Error("عنوان المزود لا يمكن أن يشير إلى شبكة محلية");
    } catch (error) {
      if (error instanceof Error && error.message.includes("شبكة محلية"))
        throw error;
      throw new Error("تعذر التحقق من نطاق مزود الخدمة", { cause: error });
    }
  }
  const root = parsed.toString().replace(/\/$/, "");
  const path = parsed.pathname.replace(/\/$/, "");
  if (path.endsWith("/chat/completions")) return root;
  if (path.endsWith("/v1")) return `${root}/chat/completions`;
  return `${root}/v1/chat/completions`;
}
