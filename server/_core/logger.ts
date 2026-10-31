/**
 * Structured logger — 12-factor + ISO 27001 observability
 * - JSON lines to stdout (Vercel log drains ingest JSON)
 * - Redacts secrets/PII via a SINGLE `redact()` entrypoint (never logs
 *   JWT, DB URL, cookies, passwords, tokens, emails, phones, health data)
 * - Correlation via requestId (propagated from x-request-id)
 * - Levels: debug < info < warn < error, controlled by LOG_LEVEL env
 */
type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const level =
  (process.env.LOG_LEVEL as Level) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(l: Level) {
  return order[l] >= order[level as Level];
}

/**
 * SINGLE redaction entrypoint — every log line passes through here.
 *
 * - Key-based: any key matching SENSITIVE_KEY_RE is replaced with "[REDACTED]"
 *   (covers password/token/secret + Arabic PII/health keys like صحة/تشخيص/هاتف).
 * - Value-based: e-mail addresses, long phone-like digit runs, Bearer tokens
 *   and JWT-shaped strings inside free text are masked.
 * - Recursive (arrays/objects, depth-capped, circular-safe) + truncates
 *   huge strings so one row can't blow up the log drain.
 */
const SENSITIVE_KEY_RE =
  /(passw|passwd|secret|token|api[_-]?key|authoriz|cookie|set-cookie|session|jwt|otp|mfa|national|passport|credit|card[_-]?number|cvv|cvc|iban|bank|account[_-]?number|phone|mobile|email|e-mail|address|birth|blood|health|diagnos|disease|allerg|insurance|chronic|patient|prescript|biometr|finger|face[_-]?id|location|latitude|longitude|coordinat|database[_-]?url|connection[_-]?string|dsn|sentry|webhook|private[_-]?key|encryption[_-]?key|smtp[_-]?pass|owner[_-]?password|مرور|كلمة|هاتف|جوال|بريد|عنوان|صحة|تشخيص|حساس|تأمين|مريض|جواز|هوية|وطني|دم|مرض|دواء|وصفة|حيوي|بصمة|\b(pin|ssn|dob|tel|lat|lng|gps|pwd|auth)\b)/i;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9\-._~+/=]{8,}/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
// Long digit runs (phones, national IDs, cards) — numbers embedded in text.
const LONG_DIGITS_RE = /\+?\d[\d\s-]{7,}\d/g;

const MAX_STRING = 4000;
const MAX_DEPTH = 10;

export function redact(
  value: unknown,
  depth = 0,
  seen?: WeakSet<object>
): unknown {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value;
  if (Buffer.isBuffer(value)) return `[BINARY:${value.length}B_REDACTED]`;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ...(value.stack && process.env.NODE_ENV !== "production"
        ? { stack: value.stack }
        : {}),
    };
  }
  if (typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const seenSet = seen ?? new WeakSet<object>();
  if (seenSet.has(obj)) return "[CIRCULAR]";
  seenSet.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(v => redact(v, depth + 1, seenSet));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v, depth + 1, seenSet);
    }
  }
  return out;
}

function redactString(s: string): string {
  let out = s;
  if (out.length > MAX_STRING) out = `${out.slice(0, MAX_STRING)}…[TRUNCATED]`;
  out = out
    .replace(EMAIL_RE, "***@***")
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(JWT_RE, "[REDACTED_JWT]");
  // Mask phone/ID-like runs only when they look like identifiers, not
  // short amounts/latencies (require 9+ digits after stripping separators).
  out = out.replace(LONG_DIGITS_RE, m => {
    const digits = m.replace(/\D/g, "");
    return digits.length >= 9 ? "[PHONE_REDACTED]" : m;
  });
  return out;
}

function safeJson(obj: Record<string, unknown>) {
  return JSON.stringify({
    t: new Date().toISOString(),
    ...(redact(obj) as Record<string, unknown>),
  });
}

export const logger = {
  debug: (msg: string, meta: Record<string, unknown> = {}) => {
    if (shouldLog("debug"))
      console.debug(safeJson({ level: "debug", msg, ...meta }));
  },
  info: (msg: string, meta: Record<string, unknown> = {}) => {
    if (shouldLog("info"))
      console.log(safeJson({ level: "info", msg, ...meta }));
  },
  warn: (msg: string, meta: Record<string, unknown> = {}) => {
    if (shouldLog("warn"))
      console.warn(safeJson({ level: "warn", msg, ...meta }));
  },
  error: (msg: string, meta: Record<string, unknown> = {}) => {
    console.error(safeJson({ level: "error", msg, ...meta }));
  },
};
