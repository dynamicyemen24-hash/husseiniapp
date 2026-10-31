function requireEnv(
  name: string,
  value: string | undefined,
  minLength = 1
): string {
  const v = value ?? "";
  if (process.env.NODE_ENV === "production" && v.length < minLength) {
    throw new Error(
      `[ENV] ${name} is missing or too short (need >=${minLength} chars) — refusing to start in production`
    );
  }
  return v;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: requireEnv("JWT_SECRET", process.env.JWT_SECRET, 32),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  /** النطاق العام للمنصة — تُبنى منه روابط رسائل البريد (تحقق/استعادة). */
  appUrl: process.env.APP_URL ?? "https://alhusainiaye.vercel.app",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  ownerPassword: process.env.OWNER_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "no-reply@alhusainia.local",
  /** Master secret for encrypted backups (AES-256-GCM). Required in production — 16+ chars. */
  backupEncryptionKey: requireEnv(
    "BACKUP_ENCRYPTION_KEY",
    process.env.BACKUP_ENCRYPTION_KEY,
    16
  ),
  /** Local directory for backup blobs when S3 is not configured. */
  backupDir: process.env.BACKUP_DIR ?? "",
  /** Sentry DSN for error tracking and performance monitoring. */
  sentryDsn: process.env.SENTRY_DSN ?? "",
  /** OpenTelemetry collector endpoint for distributed tracing (e.g., https://otel.example.com:4317). */
  otelEndpoint: process.env.OTEL_ENDPOINT ?? "",
  /** Vite-defined app version for health endpoint. */
  appVersion: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev",
  /** ES256 session keys (JWT_PRIVATE_KEY/JWT_PUBLIC_KEY) defined for this process. */
  hasJwtKeys: !!process.env.JWT_PRIVATE_KEY && !!process.env.JWT_PUBLIC_KEY,
  /** Opt-in: reject sessions whose device fingerprint no longer matches. */
  enforceDeviceBinding: process.env.JWT_ENFORCE_DEVICE_BINDING === "true",
};

// Fail-closed warnings for non-blocking but critical secrets
if (ENV.isProduction) {
  if (!ENV.databaseUrl) {
    console.warn(
      "[ENV] DATABASE_URL is not set — health checks will report degraded"
    );
  }
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) {
    console.warn(
      "[ENV] SMTP credentials are not configured — transactional emails will be logged to console only"
    );
  }
  if (!ENV.backupEncryptionKey || ENV.backupEncryptionKey.length < 16) {
    console.warn(
      "[ENV] BACKUP_ENCRYPTION_KEY is missing or <16 chars — encrypted backups are disabled (fail-closed)"
    );
  }
  if (!ENV.hasJwtKeys) {
    console.warn(
      "[ENV] JWT_PRIVATE_KEY/JWT_PUBLIC_KEY are not set — session keys are persisted to .keys/jwt-keys.json only. On serverless cold-start the key is lost and all sessions are invalidated. Generate a durable pair with `node scripts/generate-jwt-keys.mjs`."
    );
  }
  if (!ENV.sentryDsn) {
    console.warn(
      "[ENV] SENTRY_DSN is not set — error tracking and performance monitoring disabled"
    );
  }
}
